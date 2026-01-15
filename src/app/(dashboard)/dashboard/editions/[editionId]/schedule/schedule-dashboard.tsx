"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  deleteEntry,
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

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) => deleteEntry(entryId),
    onSuccess: (_, entryId) => {
      queryClient.setQueryData(
        editionEntriesQueryKey(editionId),
        (current: EntryReview[] | undefined) =>
          current?.filter((item) => item.entry.id !== entryId),
      );
      setEntryReviewMessage("Påmeldingen er slettet.");
      setEntryReviewError(null);
    },
    onError: (error) => {
      setEntryReviewError(
        error instanceof Error
          ? error.message
          : "Kunne ikke slette påmeldingen.",
      );
    },
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

  async function handleEntryDelete(entryId: string) {
    if (!confirm("Er du sikker på at du vil slette denne påmeldingen?")) {
      return;
    }

    setEntryReviewError(null);
    setEntryReviewMessage(null);

    try {
      await deleteEntryMutation.mutateAsync(entryId);
    } catch (error) {
      setEntryReviewError(
        error instanceof Error
          ? error.message
          : "Kunne ikke slette påmeldingen.",
      );
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

  function statusLabel(status: string) {
    if (status === "approved") return "Godkjent";
    if (status === "rejected") return "Avvist";
    if (status === "pending") return "Venter";
    if (status === "withdrawn") return "Trukket";
    return status;
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
                    {(entry.status === "rejected" ||
                      entry.status === "withdrawn") && (
                      <button
                        type="button"
                        onClick={() => handleEntryDelete(entry.id)}
                        disabled={deleteEntryMutation.isPending}
                        className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleteEntryMutation.isPending
                          ? "Sletter ..."
                          : "Slett permanent"}
                      </button>
                    )}
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
