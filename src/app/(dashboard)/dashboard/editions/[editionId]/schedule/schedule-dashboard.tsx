"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import {
  type EntryReview,
  editionEntriesQueryKey,
  fetchEditionEntries,
  updateEntryStatus,
} from "@/lib/api/entries-client";
import {
  type CreateMatchInput,
  createMatch,
  editionMatchesQueryKey,
} from "@/lib/api/matches-client";
import {
  editionScoreboardQueryKey,
  fetchEditionScoreboard,
  updateEditionScoreboard,
} from "@/lib/api/scoreboard-client";
import {
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

type StageFormGroup = {
  key: string;
  code: string;
  name: string;
};

type StageFormState = {
  name: string;
  stageType: "group" | "knockout";
  groups: StageFormGroup[];
};

type SeedRow = {
  key: string;
  seed: number;
  entryId: string;
};

type ScheduleDashboardProps = {
  editionId: string;
};

const createMatchSchema = z.object({
  stageId: z.string().min(1, "Velg et stadium for kampen."),
  groupId: z.string().optional(),
  kickoffAt: z
    .string()
    .min(1, "Sett avspark-tidspunkt for kampen.")
    .refine(
      (val) => !Number.isNaN(new Date(val).getTime()),
      "Avspark må være en gyldig dato og tid.",
    ),
  venueId: z.string().optional(),
  homeEntryId: z.string().optional(),
  awayEntryId: z.string().optional(),
  code: z.string().max(50, "Kampkode kan maks være 50 tegn.").optional(),
});

type CreateMatchFormValues = z.infer<typeof createMatchSchema>;

export function ScheduleDashboard({ editionId }: ScheduleDashboardProps) {
  const queryClient = useQueryClient();
  const [stageForm, setStageForm] = useState<StageFormState>({
    name: "",
    stageType: "group",
    groups: [createStageFormGroup("A")],
  });
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [stageFormError, setStageFormError] = useState<string | null>(null);
  const [stageFormSuccess, setStageFormSuccess] = useState<string | null>(null);

  const [generationStageId, setGenerationStageId] = useState<string>("");
  const [startAt, setStartAt] = useState<string>("");
  const [matchDuration, setMatchDuration] = useState<string>("60");
  const [breakMinutes, setBreakMinutes] = useState<string>("15");
  const [venueInputs, setVenueInputs] = useState<
    Array<{ key: string; value: string }>
  >(() => [{ key: createKey(), value: "" }]);
  const [groupEntryInputs, setGroupEntryInputs] = useState<
    Record<string, string>
  >({});
  const [seedRows, setSeedRows] = useState<SeedRow[]>(() =>
    Array.from({ length: 4 }, (_, index) => ({
      key: createKey(),
      seed: index + 1,
      entryId: "",
    })),
  );
  const [includeThirdPlace, setIncludeThirdPlace] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(
    null,
  );

  const [entryLockMessage, setEntryLockMessage] = useState<string | null>(null);
  const [entryLockError, setEntryLockError] = useState<string | null>(null);
  const [entryReviewMessage, setEntryReviewMessage] = useState<string | null>(
    null,
  );
  const [entryReviewError, setEntryReviewError] = useState<string | null>(null);
  const [decisionReasons, setDecisionReasons] = useState<
    Record<string, string>
  >({});
  const [reviewingEntryId, setReviewingEntryId] = useState<string | null>(null);

  // Manual match creation state
  const [manualMatchError, setManualMatchError] = useState<string | null>(null);
  const [manualMatchSuccess, setManualMatchSuccess] = useState<string | null>(
    null,
  );

  const form = useForm<CreateMatchFormValues>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      stageId: "",
      groupId: "",
      kickoffAt: "",
      venueId: "",
      homeEntryId: "",
      awayEntryId: "",
      code: "",
    },
  });

  const createMatchMutation = useMutation({
    mutationFn: (input: CreateMatchInput) => createMatch(editionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: editionMatchesQueryKey(editionId),
      });
      setManualMatchSuccess("Kampen ble opprettet.");
      setManualMatchError(null);
      form.reset({
        stageId: form.getValues("stageId"), // Keep stage selected
        groupId: "",
        kickoffAt: "",
        venueId: "",
        homeEntryId: "",
        awayEntryId: "",
        code: "",
      });
    },
    onError: (error) => {
      setManualMatchError(
        error instanceof Error ? error.message : "Kunne ikke opprette kampen.",
      );
      setManualMatchSuccess(null);
    },
  });

  const scoreboardQuery = useQuery({
    queryKey: editionScoreboardQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionScoreboard(editionId, { signal }),
    staleTime: 30_000,
  });

  const lockMutation = useMutation({
    mutationFn: (lock: boolean) =>
      updateEditionScoreboard(editionId, {
        entries_locked: lock,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(editionScoreboardQueryKey(editionId), data);
      setEntryLockMessage(
        data.edition.entries_locked_at
          ? "Påmeldinger er låst for denne utgaven."
          : "Påmeldinger er åpnet igjen.",
      );
      setEntryLockError(null);
    },
    onError: (error) => {
      setEntryLockError(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere påmeldingslåsen.",
      );
    },
  });

  const entriesQuery = useQuery({
    queryKey: editionEntriesQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionEntries(editionId, { signal }),
    staleTime: 30_000,
  });

  const entryReviewMutation = useMutation({
    mutationFn: (payload: {
      entryId: string;
      status: "approved" | "rejected";
      reason?: string;
    }) =>
      updateEntryStatus(payload.entryId, {
        status: payload.status,
        ...(payload.reason ? { reason: payload.reason } : {}),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        editionEntriesQueryKey(editionId),
        (current: EntryReview[] | undefined) =>
          current?.map((item) =>
            item.entry.id === updated.id
              ? { ...item, entry: { ...item.entry, ...updated } }
              : item,
          ),
      );
      setEntryReviewMessage("Påmeldingen er oppdatert.");
      setEntryReviewError(null);
    },
    onError: (error) => {
      setEntryReviewError(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere påmeldingen.",
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
  const venuesLoading = venuesQuery.isLoading;
  const venuesError =
    venuesQuery.error instanceof Error ? venuesQuery.error.message : null;

  const entries = entriesQuery.data ?? [];
  const entriesLoading = entriesQuery.isLoading;
  const entriesError =
    entriesQuery.error instanceof Error ? entriesQuery.error.message : null;

  const scoreboardLoadError =
    scoreboardQuery.error instanceof Error
      ? scoreboardQuery.error.message
      : null;
  const entriesLockedAt =
    scoreboardQuery.data?.edition.entries_locked_at ?? null;
  const entriesLockedAtDate = entriesLockedAt
    ? new Date(entriesLockedAt)
    : null;
  const isLockingEntries = lockMutation.isPending;

  const selectedStage = useMemo(
    () => stages.find((stage) => stage.id === generationStageId) ?? null,
    [stages, generationStageId],
  );

  useEffect(() => {
    if (!generationStageId && stages.length > 0) {
      setGenerationStageId(stages[0]?.id ?? "");
    }
  }, [stages, generationStageId]);

  useEffect(() => {
    if (selectedStage?.stageType === "group") {
      setGroupEntryInputs((previous) => {
        const next: Record<string, string> = {};
        for (const group of selectedStage.groups) {
          next[group.id] = previous[group.id] ?? "";
        }
        return next;
      });
    } else {
      setGroupEntryInputs({});
    }
  }, [selectedStage]);

  // Manual match: set default stage when stages load
  const stageId = form.watch("stageId");
  useEffect(() => {
    if (!stageId && stages.length > 0) {
      form.setValue("stageId", stages[0]?.id ?? "");
    }
  }, [stages, stageId, form]);

  const manualMatchStage = useMemo(
    () => stages.find((stage) => stage.id === stageId) ?? null,
    [stages, stageId],
  );

  const approvedEntries = useMemo(
    () => entries.filter((e) => e.entry.status === "approved"),
    [entries],
  );

  async function onManualMatchSubmit(data: CreateMatchFormValues) {
    setManualMatchError(null);
    setManualMatchSuccess(null);

    const kickoffDate = new Date(data.kickoffAt);

    try {
      await createMatchMutation.mutateAsync({
        stageId: data.stageId,
        kickoffAt: kickoffDate.toISOString(),
        homeEntryId: data.homeEntryId || null,
        awayEntryId: data.awayEntryId || null,
        venueId: data.venueId || null,
        groupId: data.groupId || null,
        code: data.code || null,
      });
    } catch {
      // Error handled by mutation
    }
  }

  async function handleEntryLockChange(lock: boolean) {
    setEntryLockError(null);
    setEntryLockMessage(null);

    try {
      await lockMutation.mutateAsync(lock);
    } catch (error) {
      setEntryLockError(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere påmeldingslåsen.",
      );
    }
  }

  async function handleEntryDecision(
    entryId: string,
    status: "approved" | "rejected",
  ) {
    setEntryReviewError(null);
    setEntryReviewMessage(null);
    setReviewingEntryId(entryId);

    try {
      const reason = decisionReasons[entryId]?.trim();
      await entryReviewMutation.mutateAsync({
        entryId,
        status,
        reason: reason ? reason : undefined,
      });
      setDecisionReasons((prev) => ({
        ...prev,
        [entryId]: "",
      }));
    } catch (error) {
      setEntryReviewError(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere påmeldingen.",
      );
    } finally {
      setReviewingEntryId(null);
    }
  }

  function statusLabel(status: string) {
    if (status === "approved") return "Godkjent";
    if (status === "rejected") return "Avvist";
    if (status === "pending") return "Venter";
    if (status === "withdrawn") return "Trukket";
    return status;
  }

  function updateStageForm<K extends keyof StageFormState>(
    field: K,
    value: StageFormState[K],
  ) {
    setStageForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "stageType" && value === "group" && prevGroupsEmpty()) {
      setStageForm((prev) => ({
        ...prev,
        groups: [createStageFormGroup("A")],
      }));
    }

    function prevGroupsEmpty() {
      return stageForm.groups.length === 0;
    }
  }

  function updateGroupRow(key: string, field: "code" | "name", value: string) {
    setStageForm((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.key === key ? { ...group, [field]: value } : group,
      ),
    }));
  }

  function addGroupRow() {
    setStageForm((prev) => ({
      ...prev,
      groups: [
        ...prev.groups,
        createStageFormGroup(nextGroupCode(prev.groups.length)),
      ],
    }));
  }

  function removeGroupRow(key: string) {
    setStageForm((prev) => {
      if (prev.groups.length <= 1) {
        return prev;
      }

      return {
        ...prev,
        groups: prev.groups.filter((group) => group.key !== key),
      };
    });
  }

  async function handleStageSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingStage(true);
    setStageFormError(null);
    setStageFormSuccess(null);

    try {
      const trimmedName = stageForm.name.trim();
      if (!trimmedName) {
        throw new Error("Gi stadiet et navn før du lagrer.");
      }

      let groupsPayload: Array<{ code: string; name: string }> | undefined;

      if (stageForm.stageType === "group") {
        if (stageForm.groups.length === 0) {
          throw new Error("Legg til minst én gruppe for gruppespillstadier.");
        }

        groupsPayload = stageForm.groups.map((group) => {
          const code = group.code.trim().toUpperCase();
          if (!code) {
            throw new Error(
              "Alle grupper må ha en kode, for eksempel A eller B.",
            );
          }

          return {
            code,
            name: group.name.trim() || code,
          };
        });
      }

      const response = await apiClient.POST(
        "/api/editions/{edition_id}/stages",
        {
          params: {
            path: {
              edition_id: editionId,
            },
          },
          body: {
            name: trimmedName,
            stage_type:
              stageForm.stageType === "knockout" ? "bracket" : "group",
            groups: groupsPayload,
          },
        },
      );

      if (response.error) {
        throw new Error(
          response.error.title ?? "Kunne ikke opprette nytt stadium.",
        );
      }

      setStageFormSuccess(
        `Stadiet ${response.data?.name ?? trimmedName} ble opprettet.`,
      );
      setStageForm({
        name: "",
        stageType: stageForm.stageType,
        groups:
          stageForm.stageType === "group" ? [createStageFormGroup("A")] : [],
      });
      await stagesQuery.refetch();
    } catch (error) {
      setStageFormError(
        error instanceof Error ? error.message : "Klarte ikke å lagre stadiet.",
      );
    } finally {
      setIsCreatingStage(false);
    }
  }

  function updateVenue(index: number, value: string) {
    setVenueInputs((prev) =>
      prev.map((venue, idx) => (idx === index ? { ...venue, value } : venue)),
    );
  }

  function addVenueRow() {
    setVenueInputs((prev) => [...prev, { key: createKey(), value: "" }]);
  }

  function removeVenueRow(index: number) {
    setVenueInputs((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }

  function updateGroupEntry(groupId: string, value: string) {
    setGroupEntryInputs((prev) => ({
      ...prev,
      [groupId]: value,
    }));
  }

  function updateSeedRow(
    key: string,
    field: "seed" | "entryId",
    value: string,
  ) {
    setSeedRows((prev) =>
      prev.map((row) =>
        row.key === key
          ? {
              ...row,
              [field]:
                field === "seed" ? Number.parseInt(value, 10) || 0 : value,
            }
          : row,
      ),
    );
  }

  function addSeedRow() {
    setSeedRows((prev) => [
      ...prev,
      {
        key: createKey(),
        seed: prev.length + 1,
        entryId: "",
      },
    ]);
  }

  function removeSeedRow(key: string) {
    setSeedRows((prev) => {
      if (prev.length <= 2) {
        return prev;
      }
      return prev.filter((row) => row.key !== key);
    });
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

  async function handleGenerateMatches(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      if (!selectedStage) {
        throw new Error("Velg et stadium før du genererer kamper.");
      }

      if (!startAt) {
        throw new Error("Sett starttidspunkt for den første kampen.");
      }

      const startAtDate = new Date(startAt);
      if (Number.isNaN(startAtDate.getTime())) {
        throw new Error("Starttidspunktet må være en gyldig dato.");
      }

      const venueIds = venueInputs
        .map((venue) => venue.value.trim())
        .filter((venue) => venue.length > 0);

      if (venueIds.length === 0) {
        throw new Error("Oppgi minst én bane eller hall for kampene.");
      }

      const matchDurationMinutes = Number.parseInt(matchDuration, 10);
      const breakMinutesValue = Number.parseInt(breakMinutes, 10);

      if (!Number.isFinite(matchDurationMinutes) || matchDurationMinutes <= 0) {
        throw new Error("Kamptiden må være et positivt antall minutter.");
      }

      if (!Number.isFinite(breakMinutesValue) || breakMinutesValue < 0) {
        throw new Error("Pausen må være et ikke-negativt antall minutter.");
      }

      if (selectedStage.stageType === "group") {
        const groupsPayload = selectedStage.groups.map((group) => {
          const raw = groupEntryInputs[group.id] ?? "";
          const entryIds = raw
            .split(/[\s,]+/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);

          if (entryIds.length < 2) {
            throw new Error(
              `Gruppe ${group.code} må ha minst to lag før du kan generere kamper.`,
            );
          }

          return {
            group_id: group.id,
            entry_ids: entryIds,
          };
        });

        const response = await apiClient.POST(
          "/api/editions/{edition_id}/matches/bulk",
          {
            params: {
              path: {
                edition_id: editionId,
              },
            },
            body: {
              stage_id: selectedStage.id,
              algorithm: "round_robin_circle",
              options: {
                start_at: startAtDate.toISOString(),
                match_duration_minutes: matchDurationMinutes,
                break_minutes: breakMinutesValue,
                venues: venueIds.map((venueId) => ({ venue_id: venueId })),
                groups: groupsPayload,
              },
            },
          },
        );

        if (response.error) {
          throw new Error(
            response.error.title ??
              "Kunne ikke generere kamper for gruppespillet.",
          );
        }

        setGenerationSuccess(
          "Round-robin-kamper er generert. Du finner dem under kampoversikten.",
        );
      } else {
        const seeds = seedRows.map((row) => ({
          seed: row.seed || 0,
          entry_id: row.entryId.trim() || null,
        }));

        const filledSeeds = seeds.filter((seed) => seed.entry_id !== null);
        if (filledSeeds.length < 2) {
          throw new Error("Legg inn minst to lag for sluttspillet.");
        }

        const response = await apiClient.POST(
          "/api/editions/{edition_id}/matches/bulk",
          {
            params: {
              path: {
                edition_id: editionId,
              },
            },
            body: {
              stage_id: selectedStage.id,
              algorithm: "knockout_seeded",
              options: {
                seeds,
                third_place_match: includeThirdPlace,
              },
            },
          },
        );

        if (response.error) {
          throw new Error(
            response.error.title ?? "Kunne ikke generere sluttspillskamper.",
          );
        }

        setGenerationSuccess(
          "Sluttspillskamper er registrert. Husk å kontrollere tider og baner.",
        );
      }
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Kunne ikke generere kamper akkurat nå.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Utgave · Kampoppsett
        </p>
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          Planlegg stadier og kampoppsett
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Opprett gruppespill og sluttspill, legg inn lag per gruppe, og generer
          kampoppsett for turneringen. Når du er fornøyd, kan du publisere
          kampene og varsle lagene.
        </p>
      </header>

      <section className="mb-12 space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            Påmeldingslås
          </h2>
          <p className="text-sm text-muted-foreground">
            Lås nye påmeldinger når kampoppsettet er i ferd med å publiseres for
            å unngå endringer i laglisten.
          </p>
        </header>

        {entryLockMessage && (
          <output
            aria-live="polite"
            className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          >
            {entryLockMessage}
          </output>
        )}

        {entryLockError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {entryLockError}
          </div>
        )}

        {scoreboardQuery.isLoading ? (
          <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            Laster påmeldingsstatus …
          </div>
        ) : scoreboardLoadError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {scoreboardLoadError}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Status:{" "}
              <span className="font-medium">
                {entriesLockedAtDate
                  ? `Låst ${entriesLockedAtDate.toLocaleString("no-NB")}`
                  : "Åpen"}
              </span>
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleEntryLockChange(false)}
                disabled={!entriesLockedAtDate || isLockingEntries}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-card/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Åpne påmeldinger
              </button>
              <button
                type="button"
                onClick={() => handleEntryLockChange(true)}
                disabled={Boolean(entriesLockedAtDate) || isLockingEntries}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Lås påmeldinger
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mb-12 space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            Påmeldingsforespørsler
          </h2>
          <p className="text-sm text-muted-foreground">
            Godkjenn eller avvis nye påmeldinger før kampoppsettet publiseres.
          </p>
        </header>

        {entryReviewMessage && (
          <output
            aria-live="polite"
            className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          >
            {entryReviewMessage}
          </output>
        )}

        {entryReviewError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {entryReviewError}
          </div>
        )}

        {entriesLoading ? (
          <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            Laster påmeldinger …
          </div>
        ) : entriesError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {entriesError}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            Ingen påmeldinger tilgjengelig ennå.
          </div>
        ) : (
          <div className="grid gap-4">
            {entries.map((item) => {
              const entry = item.entry;
              const isPending = entry.status === "pending";
              const isReviewing = reviewingEntryId === entry.id;
              return (
                <article
                  key={entry.id}
                  className="rounded-xl border border-border/80 bg-card/50 p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {item.team.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Lag-ID: {item.team.id}
                      </p>
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground">
                      {statusLabel(entry.status)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                    <div>
                      Påmeldt:{" "}
                      {entry.submitted_at
                        ? new Date(entry.submitted_at).toLocaleString("no-NB")
                        : "—"}
                    </div>
                    <div>
                      Notat: {entry.notes ? entry.notes : "Ingen notat"}
                    </div>
                  </div>

                  {isPending ? (
                    <div className="mt-4 space-y-2">
                      <label
                        htmlFor={`decision-${entry.id}`}
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Begrunnelse (valgfritt)
                      </label>
                      <textarea
                        id={`decision-${entry.id}`}
                        value={decisionReasons[entry.id] ?? ""}
                        onChange={(event) =>
                          setDecisionReasons((prev) => ({
                            ...prev,
                            [entry.id]: event.target.value,
                          }))
                        }
                        rows={2}
                        className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  ) : entry.decision_reason ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Begrunnelse: {entry.decision_reason}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleEntryDecision(entry.id, "approved")}
                      disabled={!isPending || isReviewing}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isReviewing ? "Oppdaterer ..." : "Godkjenn"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEntryDecision(entry.id, "rejected")}
                      disabled={!isPending || isReviewing}
                      className="rounded-md border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive shadow-sm transition hover:border-destructive/60 hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Avvis
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

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

        {stageFormSuccess && (
          <output
            aria-live="polite"
            className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          >
            {stageFormSuccess}
          </output>
        )}

        {stageFormError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {stageFormError}
          </div>
        )}

        <form onSubmit={handleStageSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="stage-name"
                className="text-sm font-medium text-foreground"
              >
                Stadienavn
              </label>
              <input
                id="stage-name"
                type="text"
                value={stageForm.name}
                onChange={(event) =>
                  updateStageForm("name", event.target.value)
                }
                placeholder="Eksempel: Gruppespill A"
                required
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="stage-type"
                className="text-sm font-medium text-foreground"
              >
                Stadietype
              </label>
              <select
                id="stage-type"
                value={stageForm.stageType}
                onChange={(event) =>
                  updateStageForm(
                    "stageType",
                    event.target.value as StageFormState["stageType"],
                  )
                }
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="group">Gruppespill</option>
                <option value="knockout">Sluttspill</option>
              </select>
            </div>
          </div>

          {stageForm.stageType === "group" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Grupper
                </h3>
                <button
                  type="button"
                  onClick={addGroupRow}
                  className="inline-flex items-center justify-center rounded-md border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Legg til gruppe
                </button>
              </div>

              <div className="space-y-4">
                {stageForm.groups.map((group, index) => (
                  <div
                    key={group.key}
                    className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-[120px,1fr,auto]"
                  >
                    <div className="space-y-2">
                      <label
                        htmlFor={`group-code-${group.key}`}
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Kode
                      </label>
                      <input
                        id={`group-code-${group.key}`}
                        type="text"
                        value={group.code}
                        onChange={(event) =>
                          updateGroupRow(
                            group.key,
                            "code",
                            event.target.value.toUpperCase(),
                          )
                        }
                        placeholder={String.fromCharCode(65 + index)}
                        maxLength={4}
                        required
                        className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`group-name-${group.key}`}
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Navn (valgfritt)
                      </label>
                      <input
                        id={`group-name-${group.key}`}
                        type="text"
                        value={group.name}
                        onChange={(event) =>
                          updateGroupRow(group.key, "name", event.target.value)
                        }
                        placeholder="Eksempel: Pulje Nord"
                        className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => removeGroupRow(group.key)}
                        className="inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive transition hover:border-destructive/60 hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={stageForm.groups.length <= 1}
                      >
                        Fjern
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isCreatingStage}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreatingStage ? "Lagrer …" : "Lagre stadium"}
            </button>
          </div>
        </form>
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
                  <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                    Rekkefølge #{stage.order}
                  </span>
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

        {generationSuccess && (
          <output
            aria-live="polite"
            className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          >
            {generationSuccess}
          </output>
        )}

        {generationError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {generationError}
          </div>
        )}

        <form onSubmit={handleGenerateMatches} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="stage-selection"
                className="text-sm font-medium text-foreground"
              >
                Stadium
              </label>
              <select
                id="stage-selection"
                value={generationStageId}
                onChange={(event) => setGenerationStageId(event.target.value)}
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name} ·{" "}
                    {stage.stageType === "group" ? "Gruppespill" : "Sluttspill"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="start-at"
                className="text-sm font-medium text-foreground"
              >
                Første kamp starter
              </label>
              <input
                id="start-at"
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                required
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="match-duration"
                className="text-sm font-medium text-foreground"
              >
                Kamptid (minutter)
              </label>
              <input
                id="match-duration"
                type="number"
                min={10}
                value={matchDuration}
                onChange={(event) => setMatchDuration(event.target.value)}
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="break-minutes"
                className="text-sm font-medium text-foreground"
              >
                Pause mellom kamper (minutter)
              </label>
              <input
                id="break-minutes"
                type="number"
                min={0}
                value={breakMinutes}
                onChange={(event) => setBreakMinutes(event.target.value)}
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Baner / haller
              </h3>
              <button
                type="button"
                onClick={addVenueRow}
                className="inline-flex items-center justify-center rounded-md border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Legg til bane
              </button>
            </div>

            <div className="space-y-3">
              {venuesLoading ? (
                <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                  Laster arenaer …
                </div>
              ) : venuesError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {venuesError}
                </div>
              ) : availableVenues.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
                  Ingen arenaer registrert. Opprett arenaer før du genererer
                  kampoppsett.
                </div>
              ) : (
                venueInputs.map((venue, index) => (
                  <div key={venue.key} className="flex gap-3">
                    <select
                      value={venue.value}
                      onChange={(event) =>
                        updateVenue(index, event.target.value)
                      }
                      className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Velg arena</option>
                      {availableVenues.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeVenueRow(index)}
                      className="inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive transition hover:border-destructive/60 hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={venueInputs.length <= 1}
                    >
                      Fjern
                    </button>
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground">
                Velg minst én arena. Disse brukes som kampsteder i
                kampoppsettet.
              </p>
            </div>
          </div>

          {selectedStage?.stageType === "group" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Lag per gruppe
                </h3>
                <p className="text-xs text-muted-foreground">
                  Skriv inn lag-IDer separert med komma eller mellomrom. Minst
                  to lag per gruppe er nødvendig.
                </p>
              </div>

              <div className="space-y-4">
                {selectedStage.groups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <label
                      htmlFor={`group-entry-${group.id}`}
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Gruppe {group.code}
                    </label>
                    <textarea
                      id={`group-entry-${group.id}`}
                      value={groupEntryInputs[group.id] ?? ""}
                      onChange={(event) =>
                        updateGroupEntry(group.id, event.target.value)
                      }
                      placeholder="entry-id-1, entry-id-2, entry-id-3"
                      rows={3}
                      className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedStage?.stageType === "knockout" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Seeding
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Legg inn lag-ID eller placeholder for seeding.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSeedRow}
                  className="inline-flex items-center justify-center rounded-md border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Legg til seed
                </button>
              </div>

              <div className="space-y-3">
                {seedRows.map((row) => (
                  <div key={row.key} className="flex gap-3">
                    <div className="w-20">
                      <input
                        type="number"
                        value={row.seed}
                        onChange={(event) =>
                          updateSeedRow(row.key, "seed", event.target.value)
                        }
                        placeholder="Seed #"
                        className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={row.entryId}
                        onChange={(event) =>
                          updateSeedRow(row.key, "entryId", event.target.value)
                        }
                        placeholder="Lag-ID"
                        className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSeedRow(row.key)}
                      className="inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive transition hover:border-destructive/60 hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={seedRows.length <= 2}
                    >
                      Fjern
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="third-place"
                  type="checkbox"
                  checked={includeThirdPlace}
                  onChange={(event) =>
                    setIncludeThirdPlace(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label
                  htmlFor="third-place"
                  className="text-sm text-foreground"
                >
                  Inkluder bronsefinale
                </label>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGenerating ? "Genererer …" : "Generer kamper"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <header>
          <h2 className="text-xl font-semibold text-foreground">
            Opprett enkelt-kamp manuelt
          </h2>
          <p className="text-sm text-muted-foreground">
            Legg til én kamp direkte uten å bruke den automatiske
            kampgeneratoren. Nyttig for playoff-kamper eller tilleggskamper.
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
            className="space-y-6"
          >
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
                        <FormLabel>Gruppe (valgfritt)</FormLabel>
                        <select
                          {...field}
                          className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="">Ingen gruppe</option>
                          {manualMatchStage.groups.map((group) => (
                            <option key={group.id} value={group.id}>
                              Gruppe {group.code}
                              {group.name ? ` – ${group.name}` : ""}
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
                name="kickoffAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avspark</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        placeholder="Velg tidspunkt"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="venueId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arena (valgfritt)</FormLabel>
                    <select
                      {...field}
                      className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Velg arena</option>
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
                name="homeEntryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hjemmelag (valgfritt)</FormLabel>
                    <select
                      {...field}
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
                name="awayEntryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bortelag (valgfritt)</FormLabel>
                    <select
                      {...field}
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
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kampkode (valgfritt)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="f.eks. A-01 eller Semifinale 1"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={createMatchMutation.isPending || stages.length === 0}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {createMatchMutation.isPending ? "Oppretter …" : "Opprett kamp"}
              </button>
            </div>
          </form>
        </Form>
      </section>
    </div>
  );
}

function createKey() {
  return Math.random().toString(36).substring(2, 9);
}

function createStageFormGroup(code: string): StageFormGroup {
  return {
    key: createKey(),
    code,
    name: "",
  };
}

function nextGroupCode(count: number) {
  return String.fromCharCode(65 + count);
}
