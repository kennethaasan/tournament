"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import {
  editionEntriesQueryKey,
  fetchEditionEntries,
} from "@/lib/api/entries-client";
import {
  type CreateMatchInput,
  createMatch,
  editionMatchesQueryKey,
} from "@/lib/api/matches-client";
import {
  deleteStage,
  editionStagesQueryKey,
  fetchEditionStages,
  type Stage,
} from "@/lib/api/stages-client";
import {
  editionVenuesQueryKey,
  fetchEditionVenues,
} from "@/lib/api/venues-client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/components/form";
import { Input } from "@/ui/components/input";
import { EditionHeader } from "../edition-dashboard";
import { CreateStageForm } from "./create-stage-form";
import { GenerateMatchesForm } from "./generate-matches-form";

type StageGroup = {
  id: string;
  code: string;
  name: string | null;
};

type StageListItem = {
  id: string;
  name: string;
  stageType: "group" | "knockout";
  order: number;
  publishedAt: string | null;
  groups: StageGroup[];
};

type ScheduleDashboardProps = {
  editionId: string;
};

type KickoffScheduleInput = {
  startAt: string;
  matchDurationMinutes: number;
  breakMinutes: number;
  concurrentMatches: number;
  matchCount: number;
};

const MINUTES_IN_MS = 60_000;

export function buildKickoffSchedule({
  startAt,
  matchDurationMinutes,
  breakMinutes,
  concurrentMatches,
  matchCount,
}: KickoffScheduleInput): Date[] {
  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime()) || matchCount <= 0) {
    return [];
  }

  const normalizedMatchMinutes = Math.max(matchDurationMinutes, 1);
  const normalizedBreakMinutes = Math.max(breakMinutes, 0);
  const slotMinutes = normalizedMatchMinutes + normalizedBreakMinutes;
  const matchesPerSlot = Math.max(concurrentMatches, 1);

  return Array.from({ length: matchCount }, (_, index) => {
    const slotIndex = Math.floor(index / matchesPerSlot);
    const offsetMinutes = slotIndex * slotMinutes;
    return new Date(startDate.getTime() + offsetMinutes * MINUTES_IN_MS);
  });
}

function toLocalDatetimeString(date: Date | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatGroupLabel(group: StageGroup): string {
  return `Gruppe ${group.code}${group.name ? ` – ${group.name}` : ""}`;
}

const manualMatchItemSchema = z.object({
  homeEntryId: z.string().optional(),
  awayEntryId: z.string().optional(),
  groupId: z.string().optional(),
  venueId: z.string().optional(),
  code: z.string().max(50, "Kampkode kan maks være 50 tegn.").optional(),
});

const createMatchSchema = z.object({
  stageId: z.string().min(1, "Velg et stadium for kampen."),
  groupId: z.string().optional(),
  venueId: z.string().optional(),
  startAt: z
    .string()
    .min(1, "Sett starttidspunkt for første kamp.")
    .refine(
      (val) => !Number.isNaN(new Date(val).getTime()),
      "Starttidspunkt må være en gyldig dato og tid.",
    ),
  matchDuration: z.coerce.number().min(1, "Kamptid må være minst ett minutt."),
  breakMinutes: z.coerce.number().min(0, "Pausen må være null eller mer."),
  concurrentMatches: z.coerce.number().min(1, "Velg minst én samtidig kamp."),
  matches: z.array(manualMatchItemSchema).min(1, "Legg til minst én kamp."),
});

type CreateMatchFormValues = z.infer<typeof createMatchSchema>;

export function ScheduleDashboard({ editionId }: ScheduleDashboardProps) {
  const queryClient = useQueryClient();

  // Manual match creation state
  const [manualMatchError, setManualMatchError] = useState<string | null>(null);
  const [manualMatchSuccess, setManualMatchSuccess] = useState<string | null>(
    null,
  );

  const form = useForm<CreateMatchFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: align resolver types with RHF
    resolver: zodResolver(createMatchSchema) as any,
    defaultValues: {
      stageId: "",
      groupId: "",
      venueId: "",
      startAt: "",
      matchDuration: 60,
      breakMinutes: 15,
      concurrentMatches: 1,
      matches: [
        {
          homeEntryId: "",
          awayEntryId: "",
          groupId: "",
          venueId: "",
          code: "",
        },
      ],
    },
  });

  const {
    fields: matchFields,
    append: appendMatch,
    remove: removeMatch,
  } = useFieldArray({
    control: form.control,
    name: "matches",
  });

  const createMatchesMutation = useMutation({
    mutationFn: async (values: CreateMatchFormValues) => {
      const kickoffSchedule = buildKickoffSchedule({
        startAt: values.startAt,
        matchDurationMinutes: values.matchDuration,
        breakMinutes: values.breakMinutes,
        concurrentMatches: values.concurrentMatches,
        matchCount: values.matches.length,
      });

      if (kickoffSchedule.length !== values.matches.length) {
        throw new Error("Kunne ikke beregne avspark for kampene.");
      }

      const createdMatches = [] as Awaited<ReturnType<typeof createMatch>>[];
      for (const [index, match] of values.matches.entries()) {
        const kickoffAt = kickoffSchedule[index];
        if (!kickoffAt) {
          throw new Error("Kunne ikke beregne avspark for kampene.");
        }

        const payload: CreateMatchInput = {
          stageId: values.stageId,
          kickoffAt: kickoffAt.toISOString(),
          homeEntryId: match.homeEntryId || null,
          awayEntryId: match.awayEntryId || null,
          venueId: match.venueId || values.venueId || null,
          groupId: match.groupId || values.groupId || null,
          code: match.code?.trim() || null,
        };
        createdMatches.push(await createMatch(editionId, payload));
      }

      return createdMatches;
    },
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({
        queryKey: editionMatchesQueryKey(editionId),
      });
      const matchCount = values.matches.length;
      setManualMatchSuccess(
        matchCount === 1
          ? "Kampen ble opprettet."
          : `${matchCount} kamper ble opprettet.`,
      );
      setManualMatchError(null);
      form.reset({
        stageId: values.stageId,
        groupId: values.groupId ?? "",
        venueId: values.venueId ?? "",
        startAt: values.startAt,
        matchDuration: values.matchDuration,
        breakMinutes: values.breakMinutes,
        concurrentMatches: values.concurrentMatches,
        matches: [
          {
            homeEntryId: "",
            awayEntryId: "",
            groupId: "",
            venueId: "",
            code: "",
          },
        ],
      });
    },
    onError: (error) => {
      setManualMatchError(
        error instanceof Error ? error.message : "Kunne ikke opprette kampene.",
      );
      setManualMatchSuccess(null);
    },
  });

  const entriesQuery = useQuery({
    queryKey: editionEntriesQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionEntries(editionId, { signal }),
    staleTime: 30_000,
  });

  const deleteStageMutation = useMutation({
    mutationFn: (stageId: string) => deleteStage(editionId, stageId),
    onSuccess: (_, stageId) => {
      queryClient.setQueryData(
        editionStagesQueryKey(editionId),
        (current: StageListItem[] | undefined) =>
          current?.filter((item) => item.id !== stageId),
      );
      queryClient.invalidateQueries({
        queryKey: editionStagesQueryKey(editionId),
      });
    },
    onError: (error) => {
      setManualMatchError(
        error instanceof Error ? error.message : "Kunne ikke slette stadiet.",
      );
    },
  });

  const stagesQuery = useQuery({
    queryKey: editionStagesQueryKey(editionId),
    queryFn: ({ signal }) =>
      fetchEditionStages(editionId, { signal }).then((payload) =>
        payload
          .map(toStageListItem)
          .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
      ),
  });

  const stages = stagesQuery.data ?? [];
  const isLoadingStages = stagesQuery.isLoading;
  const stageLoadError =
    stagesQuery.error instanceof Error ? stagesQuery.error.message : null;

  const venuesQuery = useQuery({
    queryKey: editionVenuesQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionVenues(editionId, { signal }),
    staleTime: 30_000,
  });
  const availableVenues = venuesQuery.data ?? [];

  const entries = entriesQuery.data ?? [];

  // Manual match defaults
  const stageId = form.watch("stageId");
  const groupId = form.watch("groupId");
  const venueId = form.watch("venueId");
  const startAt = form.watch("startAt");
  const matchDuration = form.watch("matchDuration");
  const breakMinutes = form.watch("breakMinutes");
  const concurrentMatches = form.watch("concurrentMatches");
  const groupTouched = form.formState.touchedFields.groupId;
  const venueTouched = form.formState.touchedFields.venueId;
  const matchDurationValue = Number(matchDuration) || 0;
  const breakMinutesValue = Number(breakMinutes) || 0;
  const concurrentMatchesValue = Number(concurrentMatches) || 0;

  useEffect(() => {
    if (!stageId && stages.length > 0) {
      form.setValue("stageId", stages[0]?.id ?? "");
    }
  }, [stages, stageId, form]);

  const manualMatchStage = useMemo(
    () => stages.find((stage) => stage.id === stageId) ?? null,
    [stages, stageId],
  );

  useEffect(() => {
    if (manualMatchStage?.stageType !== "group") {
      if (groupId) {
        form.setValue("groupId", "");
      }
      return;
    }

    if (
      groupId &&
      !manualMatchStage.groups.some((group) => group.id === groupId)
    ) {
      form.setValue("groupId", "");
      return;
    }

    if (!groupId && !groupTouched && manualMatchStage.groups.length === 1) {
      form.setValue("groupId", manualMatchStage.groups[0]?.id ?? "");
    }
  }, [groupId, groupTouched, manualMatchStage, form]);

  useEffect(() => {
    if (!venueId && !venueTouched && availableVenues.length === 1) {
      form.setValue("venueId", availableVenues[0]?.id ?? "");
    }
  }, [availableVenues, venueId, venueTouched, form]);

  const defaultGroupOptionLabel = useMemo(() => {
    if (manualMatchStage?.stageType !== "group" || !groupId) {
      return "Ingen gruppe";
    }
    const selectedGroup = manualMatchStage.groups.find(
      (group) => group.id === groupId,
    );
    if (!selectedGroup) {
      return "Ingen gruppe";
    }
    return `Standardgruppe (${formatGroupLabel(selectedGroup)})`;
  }, [groupId, manualMatchStage]);

  const defaultVenueOptionLabel = useMemo(() => {
    if (!venueId) {
      return "Ingen arena";
    }
    const selectedVenue = availableVenues.find((venue) => venue.id === venueId);
    if (!selectedVenue) {
      return "Ingen arena";
    }
    return `Standardarena (${selectedVenue.name})`;
  }, [availableVenues, venueId]);

  useEffect(() => {
    if (!manualMatchStage) {
      return;
    }
    const validGroupIds =
      manualMatchStage.stageType === "group"
        ? new Set(manualMatchStage.groups.map((group) => group.id))
        : null;
    matchFields.forEach((_, index) => {
      const matchGroupId = form.getValues(`matches.${index}.groupId`);
      if (
        matchGroupId &&
        (!validGroupIds || !validGroupIds.has(matchGroupId))
      ) {
        form.setValue(`matches.${index}.groupId`, "");
      }
    });
  }, [manualMatchStage, matchFields, form]);

  const kickoffSchedule = useMemo(
    () =>
      buildKickoffSchedule({
        startAt,
        matchDurationMinutes: matchDurationValue,
        breakMinutes: breakMinutesValue,
        concurrentMatches: concurrentMatchesValue,
        matchCount: matchFields.length,
      }),
    [
      startAt,
      matchDurationValue,
      breakMinutesValue,
      concurrentMatchesValue,
      matchFields.length,
    ],
  );

  const kickoffLabels = useMemo(
    () => kickoffSchedule.map((date) => toLocalDatetimeString(date)),
    [kickoffSchedule],
  );

  const approvedEntries = useMemo(
    () => entries.filter((e) => e.entry.status === "approved"),
    [entries],
  );

  const matchesError =
    (
      form.formState.errors.matches as
        | { root?: { message?: string }; message?: string }
        | undefined
    )?.root?.message ??
    (form.formState.errors.matches as { message?: string } | undefined)
      ?.message;

  async function onManualMatchSubmit(data: CreateMatchFormValues) {
    setManualMatchError(null);
    setManualMatchSuccess(null);

    try {
      await createMatchesMutation.mutateAsync(data);
    } catch {
      // Error handled by mutation
    }
  }

  async function handleStageDelete(stageId: string) {
    if (
      !confirm(
        "Er du sikker på at du vil slette dette stadiet? Alle tilhørende grupper vil også bli slettet. Du kan ikke slette et stadie som har kamper.",
      )
    ) {
      return;
    }

    try {
      await deleteStageMutation.mutateAsync(stageId);
    } catch (error) {
      setManualMatchError(
        error instanceof Error ? error.message : "Kunne ikke slette stadiet.",
      );
    }
  }

  function toStageListItem(stage: Stage): StageListItem {
    return {
      id: stage.id,
      name: stage.name,
      stageType: stage.stage_type === "bracket" ? "knockout" : "group",
      order: stage.order ?? 0,
      publishedAt: stage.published_at ?? null,
      groups: (stage.groups ?? []).map((group) => ({
        id: group.id,
        code: group.code,
        name: group.name ?? null,
      })),
    };
  }

  return (
    <div className="space-y-10">
      <EditionHeader
        editionId={editionId}
        pageTitle="Planlegg stadier og kampoppsett"
        pageDescription="Opprett gruppespill og sluttspill, legg inn lag per gruppe, og generer kampoppsett for turneringen. Når du er fornøyd, kan du publisere kampene og varsle lagene."
      />

      <section className="mb-12 space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <header>
          <h2 className="text-xl font-semibold text-foreground">
            Opprett nytt stadium
          </h2>
          <p className="text-sm text-muted-foreground">
            Start med å definere struktur for turneringen. Gruppespill krever
            minst én gruppe, mens sluttspill automatisk håndterer byer og
            tredjeplass-kamp hvis du ønsker det.
          </p>
        </header>

        <CreateStageForm
          editionId={editionId}
          onSuccess={() => stagesQuery.refetch()}
        />
      </section>

      <section className="mb-12 space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            Registrerte stadier
          </h2>
          <p className="text-sm text-muted-foreground">
            Oversikt over strukturen for denne utgaven. Etter at kampene er
            generert, kan du publisere dem fra kampadministrasjonen.
          </p>
        </header>

        {isLoadingStages ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground shadow-sm">
            Laster stadier …
          </div>
        ) : stageLoadError ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive shadow-sm"
          >
            {stageLoadError}
          </div>
        ) : stages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground shadow-sm">
            Det er ingen stadier ennå. Opprett et gruppespill eller sluttspill
            for å komme i gang.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {stages.map((stage) => (
              <article
                key={stage.id}
                className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {stage.stageType === "group"
                        ? "Gruppespill"
                        : "Sluttspill"}
                    </p>
                    <h3 className="text-lg font-semibold text-foreground">
                      {stage.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStageDelete(stage.id)}
                      disabled={deleteStageMutation.isPending}
                      className="rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      title="Slett stadium"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <title>Slett stadium</title>
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                    <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                      Rekkefølge #{stage.order}
                    </span>
                  </div>
                </div>

                {stage.stageType === "group" ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Grupper
                    </p>
                    <ul className="grid grid-cols-2 gap-2 text-sm text-foreground">
                      {stage.groups.map((group) => (
                        <li
                          key={group.id}
                          className="flex flex-col rounded border border-border px-3 py-2"
                        >
                          <span className="text-xs font-semibold uppercase text-primary">
                            Gruppe {group.code}
                          </span>
                          {group.name ? (
                            <span>{group.name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Ingen visningsnavn
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sluttspillet håndterer automatisk byer og rangerer
                    semifinaletapere til bronsefinalen dersom du velger det i
                    kampgeneratoren.
                  </p>
                )}

                {stage.publishedAt ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">
                    Publisert{" "}
                    {new Date(stage.publishedAt).toLocaleString("no-NB")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ikke publisert ennå
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <header>
          <h2 className="text-xl font-semibold text-foreground">
            Generer kampoppsett
          </h2>
          <p className="text-sm text-muted-foreground">
            Velg et stadium og generer kamper automatisk. Du kan finjustere
            tidspunkt, baner og lag i etterkant via kampadministrasjonen.
          </p>
        </header>

        <GenerateMatchesForm
          editionId={editionId}
          stages={stages}
          availableVenues={availableVenues}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: editionMatchesQueryKey(editionId),
            });
          }}
        />
      </section>

      <section className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <header className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Opprett kamper manuelt
          </h2>
          <p className="text-sm text-muted-foreground">
            Sett felles detaljer én gang og legg inn flere kamper med automatisk
            avspark.
          </p>
        </header>

        {manualMatchSuccess && (
          <output
            aria-live="polite"
            className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          >
            {manualMatchSuccess}
          </output>
        )}

        {manualMatchError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {manualMatchError}
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onManualMatchSubmit)}
            className="space-y-8"
          >
            <div className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="stageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stadium</FormLabel>
                      <select
                        {...field}
                        className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Velg stadium</option>
                        {stages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name} ·{" "}
                            {stage.stageType === "group"
                              ? "Gruppespill"
                              : "Sluttspill"}
                          </option>
                        ))}
                      </select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {manualMatchStage?.stageType === "group" &&
                  manualMatchStage.groups.length > 0 && (
                    <FormField
                      control={form.control}
                      name="groupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Standardgruppe (valgfritt)</FormLabel>
                          <select
                            {...field}
                            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="">Ingen standardgruppe</option>
                            {manualMatchStage.groups.map((group) => (
                              <option key={group.id} value={group.id}>
                                {formatGroupLabel(group)}
                              </option>
                            ))}
                          </select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                <FormField
                  control={form.control}
                  name="venueId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standardarena (valgfritt)</FormLabel>
                      <select
                        {...field}
                        className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Ingen standardarena</option>
                        {availableVenues.map((venue) => (
                          <option key={venue.id} value={venue.id}>
                            {venue.name}
                          </option>
                        ))}
                      </select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Første avspark</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          placeholder="Velg starttidspunkt"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="matchDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kamptid (minutter)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="breakMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pause mellom kamper (minutter)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="concurrentMatches"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Samtidige kamper</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Avspark for hver kamp fylles automatisk basert på starttid,
                kamptid, pause og antall samtidige kamper.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Kamper
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    appendMatch({
                      homeEntryId: "",
                      awayEntryId: "",
                      groupId: "",
                      venueId: "",
                      code: "",
                    })
                  }
                  className="inline-flex items-center justify-center rounded-md border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-primary/10"
                >
                  Legg til kamp
                </button>
              </div>

              {matchFields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      Kamp {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeMatch(index)}
                      disabled={matchFields.length <= 1}
                      className="rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition hover:border-destructive/60 hover:bg-destructive/10 disabled:opacity-60"
                    >
                      Fjern
                    </button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`matches.${index}.homeEntryId`}
                      render={({ field: matchField }) => (
                        <FormItem>
                          <FormLabel>Hjemmelag (valgfritt)</FormLabel>
                          <select
                            {...matchField}
                            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="">Ikke satt</option>
                            {approvedEntries.map((item) => (
                              <option key={item.entry.id} value={item.entry.id}>
                                {item.team.name}
                              </option>
                            ))}
                          </select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`matches.${index}.awayEntryId`}
                      render={({ field: matchField }) => (
                        <FormItem>
                          <FormLabel>Bortelag (valgfritt)</FormLabel>
                          <select
                            {...matchField}
                            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="">Ikke satt</option>
                            {approvedEntries.map((item) => (
                              <option key={item.entry.id} value={item.entry.id}>
                                {item.team.name}
                              </option>
                            ))}
                          </select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {manualMatchStage?.stageType === "group" &&
                      manualMatchStage.groups.length > 0 && (
                        <FormField
                          control={form.control}
                          name={`matches.${index}.groupId`}
                          render={({ field: matchField }) => (
                            <FormItem>
                              <FormLabel>Gruppe (overstyr)</FormLabel>
                              <select
                                {...matchField}
                                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                              >
                                <option value="">
                                  {defaultGroupOptionLabel}
                                </option>
                                {manualMatchStage.groups.map((group) => (
                                  <option key={group.id} value={group.id}>
                                    {formatGroupLabel(group)}
                                  </option>
                                ))}
                              </select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                    <FormField
                      control={form.control}
                      name={`matches.${index}.venueId`}
                      render={({ field: matchField }) => (
                        <FormItem>
                          <FormLabel>Arena (overstyr)</FormLabel>
                          <select
                            {...matchField}
                            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="">{defaultVenueOptionLabel}</option>
                            {availableVenues.map((venue) => (
                              <option key={venue.id} value={venue.id}>
                                {venue.name}
                              </option>
                            ))}
                          </select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel>Avspark (auto)</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          readOnly
                          value={kickoffLabels[index] ?? ""}
                          placeholder="Velg starttidspunkt"
                        />
                      </FormControl>
                    </FormItem>

                    <FormField
                      control={form.control}
                      name={`matches.${index}.code`}
                      render={({ field: matchField }) => (
                        <FormItem>
                          <FormLabel>Kampkode (valgfritt)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="f.eks. A-01 eller Semifinale 1"
                              {...matchField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              {matchesError && (
                <p className="text-sm text-destructive">{matchesError}</p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={
                  createMatchesMutation.isPending ||
                  stages.length === 0 ||
                  matchFields.length === 0
                }
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {createMatchesMutation.isPending
                  ? "Oppretter …"
                  : `Opprett ${matchFields.length} ${
                      matchFields.length === 1 ? "kamp" : "kamper"
                    }`}
              </button>
            </div>
          </form>
        </Form>
      </section>
    </div>
  );
}
