"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import {
  editionStagesQueryKey,
  fetchEditionStages,
  type Stage,
} from "@/lib/api/stages-client";

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

export function ScheduleDashboard({ editionId }: ScheduleDashboardProps) {
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

      const venues = venueInputs
        .map((venue) => venue.value.trim())
        .filter((venue) => venue.length > 0);

      if (venues.length === 0) {
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
                venues: venues.map((venueId) => ({ venue_id: venueId })),
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
    <main className="min-h-screen bg-card/60 pb-16">
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-12">
        <header className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Utgave · Kampoppsett
          </p>
          <h1 className="text-3xl font-bold text-zinc-900 md:text-4xl">
            Planlegg stadier og kampoppsett
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Opprett gruppespill og sluttspill, legg inn lag per gruppe, og
            generer kampoppsett for turneringen. Når du er fornøyd, kan du
            publisere kampene og varsle lagene.
          </p>
        </header>

        <section className="mb-12 space-y-6 rounded-2xl border border-border bg-white p-8 shadow-sm">
          <header>
            <h2 className="text-xl font-semibold text-zinc-900">
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
              className="block rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            >
              {stageFormSuccess}
            </output>
          )}

          {stageFormError && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {stageFormError}
            </div>
          )}

          <form onSubmit={handleStageSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="stage-name"
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="stage-type"
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="group">Gruppespill</option>
                  <option value="knockout">Sluttspill</option>
                </select>
              </div>
            </div>

            {stageForm.stageType === "group" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-800">
                    Grupper
                  </h3>
                  <button
                    type="button"
                    onClick={addGroupRow}
                    className="inline-flex items-center justify-center rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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
                          className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                            updateGroupRow(
                              group.key,
                              "name",
                              event.target.value,
                            )
                          }
                          placeholder="Eksempel: Pulje Nord"
                          className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => removeGroupRow(group.key)}
                          className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreatingStage ? "Lagrer …" : "Lagre stadium"}
              </button>
            </div>
          </form>
        </section>

        <section className="mb-12 space-y-4">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-900">
              Registrerte stadier
            </h2>
            <p className="text-sm text-muted-foreground">
              Oversikt over strukturen for denne utgaven. Etter at kampene er
              generert, kan du publisere dem fra kampadministrasjonen.
            </p>
          </header>

          {isLoadingStages ? (
            <div className="rounded-xl border border-border bg-white p-8 text-sm text-muted-foreground shadow-sm">
              Laster stadier …
            </div>
          ) : stageLoadError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm"
            >
              {stageLoadError}
            </div>
          ) : stages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white p-8 text-sm text-muted-foreground shadow-sm">
              Det er ingen stadier ennå. Opprett et gruppespill eller sluttspill
              for å komme i gang.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {stages.map((stage) => (
                <article
                  key={stage.id}
                  className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                        {stage.stageType === "group"
                          ? "Gruppespill"
                          : "Sluttspill"}
                      </p>
                      <h3 className="text-lg font-semibold text-zinc-900">
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
                            <span className="text-xs font-semibold uppercase text-blue-600">
                              Gruppe {group.code}
                            </span>
                            {group.name ? (
                              <span>{group.name}</span>
                            ) : (
                              <span className="text-xs text-zinc-500">
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
                    <p className="text-xs text-green-600">
                      Publisert{" "}
                      {new Date(stage.publishedAt).toLocaleString("no-NB")}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">Ikke publisert ennå</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6 rounded-2xl border border-border bg-white p-8 shadow-sm">
          <header>
            <h2 className="text-xl font-semibold text-zinc-900">
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
              className="block rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            >
              {generationSuccess}
            </output>
          )}

          {generationError && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {generationError}
            </div>
          )}

          <form onSubmit={handleGenerateMatches} className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="stage-selection"
                  className="text-sm font-medium text-zinc-800"
                >
                  Stadium
                </label>
                <select
                  id="stage-selection"
                  value={generationStageId}
                  onChange={(event) => setGenerationStageId(event.target.value)}
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name} ·{" "}
                      {stage.stageType === "group"
                        ? "Gruppespill"
                        : "Sluttspill"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="start-at"
                  className="text-sm font-medium text-zinc-800"
                >
                  Første kamp starter
                </label>
                <input
                  id="start-at"
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                  required
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="match-duration"
                  className="text-sm font-medium text-zinc-800"
                >
                  Kamptid (minutter)
                </label>
                <input
                  id="match-duration"
                  type="number"
                  min={10}
                  value={matchDuration}
                  onChange={(event) => setMatchDuration(event.target.value)}
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="break-minutes"
                  className="text-sm font-medium text-zinc-800"
                >
                  Pause mellom kamper (minutter)
                </label>
                <input
                  id="break-minutes"
                  type="number"
                  min={0}
                  value={breakMinutes}
                  onChange={(event) => setBreakMinutes(event.target.value)}
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-800">
                  Baner / haller
                </h3>
                <button
                  type="button"
                  onClick={addVenueRow}
                  className="inline-flex items-center justify-center rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  Legg til bane
                </button>
              </div>

              <div className="space-y-3">
                {venueInputs.map((venue, index) => (
                  <div key={venue.key} className="flex gap-3">
                    <input
                      type="text"
                      value={venue.value}
                      onChange={(event) =>
                        updateVenue(index, event.target.value)
                      }
                      placeholder="F.eks. venue-id eller banenavn"
                      className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeVenueRow(index)}
                      className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={venueInputs.length <= 1}
                    >
                      Fjern
                    </button>
                  </div>
                ))}
                <p className="text-xs text-zinc-500">
                  Bruk interne bane- eller hall-IDer slik de er definert i
                  administrasjonen. Minst én bane er påkrevd.
                </p>
              </div>
            </div>

            {selectedStage?.stageType === "group" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-800">
                    Lag per gruppe
                  </h3>
                  <p className="text-xs text-zinc-500">
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
                        className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                    <h3 className="text-sm font-semibold text-zinc-800">
                      Seeding
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Oppgi lag i seed-rekkefølge. Tomme felt tolkes som bye.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addSeedRow}
                    className="inline-flex items-center justify-center rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    Legg til seed
                  </button>
                </div>

                <div className="space-y-3">
                  {seedRows.map((row) => (
                    <div
                      key={row.key}
                      className="grid gap-3 rounded border border-border p-4 md:grid-cols-[120px,1fr,auto]"
                    >
                      <div className="space-y-2">
                        <label
                          htmlFor={`seed-number-${row.key}`}
                          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                        >
                          Seed
                        </label>
                        <input
                          id={`seed-number-${row.key}`}
                          type="number"
                          min={1}
                          value={row.seed}
                          onChange={(event) =>
                            updateSeedRow(row.key, "seed", event.target.value)
                          }
                          className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`seed-entry-${row.key}`}
                          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                        >
                          Lag-ID (valgfritt)
                        </label>
                        <input
                          id={`seed-entry-${row.key}`}
                          type="text"
                          value={row.entryId}
                          onChange={(event) =>
                            updateSeedRow(
                              row.key,
                              "entryId",
                              event.target.value,
                            )
                          }
                          placeholder="entry-id"
                          className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => removeSeedRow(row.key)}
                          className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={seedRows.length <= 2}
                        >
                          Fjern
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={includeThirdPlace}
                    onChange={(event) =>
                      setIncludeThirdPlace(event.target.checked)
                    }
                    className="h-4 w-4 rounded border border-border text-blue-600 focus:ring-blue-500"
                  />
                  Opprett bronsefinale automatisk
                </label>
              </div>
            )}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isGenerating || stages.length === 0}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isGenerating ? "Genererer …" : "Generer kamper"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function createStageFormGroup(code: string): StageFormGroup {
  return {
    key: createKey(),
    code,
    name: "",
  };
}

function nextGroupCode(position: number): string {
  const ascii = 65 + position;
  if (ascii > 90) {
    return `G${position + 1}`;
  }
  return String.fromCharCode(ascii);
}

function createKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
