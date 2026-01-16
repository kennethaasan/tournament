"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { apiClient } from "@/lib/api/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/components/form";
import { Input } from "@/ui/components/input";

type StageListItem = {
  id: string;
  name: string;
  stageType: "group" | "knockout";
  groups: { id: string; code: string; name: string | null }[];
};

type Venue = {
  id: string;
  name: string;
};

const generateMatchesSchema = z.object({
  stageId: z.string().min(1, "Velg et stadium."),
  startAt: z.string().min(1, "Sett starttidspunkt."),
  matchDuration: z.number().min(1, "Kamptiden må være positiv."),
  breakMinutes: z.number().min(0, "Pausen må være ikke-negativ."),
  venues: z
    .array(
      z.object({
        value: z.string().min(1, "Velg arena"),
      }),
    )
    .min(1, "Velg minst én arena."),
  groupEntries: z
    .array(
      z.object({
        groupId: z.string(),
        entries: z.string(),
      }),
    )
    .default([]),
  seeds: z
    .array(
      z.object({
        seed: z.number(),
        entryId: z.string().optional(),
        label: z.string().max(120, "Navnet kan være maks 120 tegn.").optional(),
      }),
    )
    .default([]),
  includeThirdPlace: z.boolean().default(true),
});

type GenerateMatchesFormValues = z.infer<typeof generateMatchesSchema>;

type GenerateMatchesFormProps = {
  editionId: string;
  stages: StageListItem[];
  availableVenues: Venue[];
  onSuccess: () => void;
};

export function GenerateMatchesForm({
  editionId,
  stages,
  availableVenues,
  onSuccess,
}: GenerateMatchesFormProps) {
  const form = useForm<GenerateMatchesFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: Need to bypass type mismatch between Zod resolver and RHF
    resolver: zodResolver(generateMatchesSchema) as any,
    defaultValues: {
      stageId: "",
      startAt: "",
      matchDuration: 60,
      breakMinutes: 15,
      venues: [{ value: "" }],
      includeThirdPlace: true,
      groupEntries: [],
      seeds: Array.from({ length: 4 }).map((_, i) => ({
        seed: i + 1,
        entryId: "",
        label: "",
      })),
    },
  });

  const {
    fields: venueFields,
    append: appendVenue,
    remove: removeVenue,
  } = useFieldArray({
    control: form.control,
    name: "venues",
  });

  const {
    fields: seedFields,
    append: appendSeed,
    remove: removeSeed,
  } = useFieldArray({
    control: form.control,
    name: "seeds",
  });

  const stageId = form.watch("stageId");
  const selectedStage = useMemo(
    () => stages.find((s) => s.id === stageId),
    [stages, stageId],
  );

  useEffect(() => {
    if (!stageId && stages.length > 0) {
      form.setValue("stageId", stages[0]?.id ?? "");
    }
  }, [stages, stageId, form]);

  useEffect(() => {
    if (selectedStage?.stageType === "group") {
      const currentEntries = form.getValues("groupEntries") || [];
      const newEntries =
        selectedStage?.groups.map((g) => {
          const existing = currentEntries.find((e) => e.groupId === g.id);
          return { groupId: g.id, entries: existing?.entries || "" };
        }) ?? [];
      form.setValue("groupEntries", newEntries);
    }
  }, [selectedStage, form]);

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateMatchesFormValues) => {
      const venueIds = data.venues.map((v) => v.value).filter(Boolean);
      if (venueIds.length === 0) throw new Error("Ingen arenaer valgt.");

      const startAtDate = new Date(data.startAt);
      if (Number.isNaN(startAtDate.getTime())) throw new Error("Ugyldig dato.");

      if (!selectedStage) throw new Error("Ingen stadium valgt.");

      if (selectedStage.stageType === "group") {
        const groupsPayload = data.groupEntries?.map((g) => {
          const entryIds = g.entries
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (entryIds.length < 2)
            throw new Error("Hver gruppe må ha minst 2 lag.");
          return { group_id: g.groupId, entry_ids: entryIds };
        });

        if (!groupsPayload || groupsPayload.length === 0)
          throw new Error("Ingen grupper definert.");

        const response = await apiClient.POST(
          "/api/editions/{edition_id}/matches/bulk",
          {
            params: { path: { edition_id: editionId } },
            body: {
              stage_id: selectedStage.id,
              algorithm: "round_robin_circle",
              options: {
                start_at: startAtDate.toISOString(),
                match_duration_minutes: data.matchDuration,
                break_minutes: data.breakMinutes,
                venues: venueIds.map((id) => ({ venue_id: id })),
                groups: groupsPayload,
              },
            },
          },
        );
        if (response.error)
          throw new Error(response.error.title ?? "Feil ved generering.");
        return response.data;
      } else {
        // Knockout
        const seeds =
          data.seeds?.map((s) => ({
            seed: s.seed,
            entry_id: s.entryId?.trim() || null,
            label: s.label?.trim() || null,
          })) || [];
        const filled = seeds.filter((s) => s.entry_id || s.label);
        if (filled.length < 2)
          throw new Error("Minst 2 seed må ha lag eller visningsnavn.");

        const response = await apiClient.POST(
          "/api/editions/{edition_id}/matches/bulk",
          {
            params: { path: { edition_id: editionId } },
            body: {
              stage_id: selectedStage.id,
              algorithm: "knockout_seeded",
              options: {
                seeds,
                third_place_match: data.includeThirdPlace,
              },
            },
          },
        );
        if (response.error)
          throw new Error(response.error.title ?? "Feil ved generering.");
        return response.data;
      }
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  function onSubmit(data: GenerateMatchesFormValues) {
    generateMutation.mutate(data);
  }

  return (
    <div className="space-y-6">
      {generateMutation.isSuccess && (
        <output className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          Kamper generert.
        </output>
      )}
      {generateMutation.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {generateMutation.error.message}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="stageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stadium</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ·{" "}
                          {s.stageType === "group"
                            ? "Gruppespill"
                            : "Sluttspill"}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Første kamp starter</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
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
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Baner / haller
              </h3>
              <button
                type="button"
                onClick={() => appendVenue({ value: "" })}
                className="inline-flex items-center justify-center rounded-md border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-primary/10"
              >
                Legg til bane
              </button>
            </div>

            {venueFields.map((field, index) => (
              <div key={field.id} className="flex gap-3">
                <FormField
                  control={form.control}
                  name={`venues.${index}.value`}
                  render={({ field: inputField }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <select
                          {...inputField}
                          className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="">Velg arena</option>
                          {availableVenues.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <button
                  type="button"
                  onClick={() => removeVenue(index)}
                  disabled={venueFields.length <= 1}
                  className="inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive transition hover:border-destructive/60 hover:bg-destructive/10 disabled:opacity-60"
                >
                  Fjern
                </button>
              </div>
            ))}
            {form.formState.errors.venues?.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.venues.root.message}
              </p>
            )}
          </div>

          {selectedStage?.stageType === "group" &&
            selectedStage.groups.map((group, index) => {
              return (
                <div key={group.id} className="space-y-2">
                  <FormField
                    control={form.control}
                    name={`groupEntries.${index}.entries`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Gruppe {group.code}
                        </FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            placeholder="entry-id-1, entry-id-2"
                            rows={3}
                            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <input
                    type="hidden"
                    {...form.register(`groupEntries.${index}.groupId`)}
                    value={group.id}
                  />
                </div>
              );
            })}

          {selectedStage?.stageType === "knockout" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Seeding
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    appendSeed({
                      seed: seedFields.length + 1,
                      entryId: "",
                      label: "",
                    })
                  }
                  className="inline-flex items-center justify-center rounded-md border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-primary/10"
                >
                  Legg til seed
                </button>
              </div>

              {seedFields.map((field, index) => (
                <div key={field.id} className="flex flex-wrap gap-3">
                  <FormField
                    control={form.control}
                    name={`seeds.${index}.seed`}
                    render={({ field }) => (
                      <FormItem className="w-20">
                        <FormControl>
                          <Input type="number" {...field} placeholder="#" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`seeds.${index}.entryId`}
                    render={({ field }) => (
                      <FormItem className="min-w-[200px] flex-1">
                        <FormControl>
                          <Input {...field} placeholder="Lag-ID" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`seeds.${index}.label`}
                    render={({ field }) => (
                      <FormItem className="min-w-[200px] flex-1">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Visningsnavn (valgfritt)"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => removeSeed(index)}
                    disabled={seedFields.length <= 2}
                    className="inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive transition hover:border-destructive/60 hover:bg-destructive/10 disabled:opacity-60"
                  >
                    Fjern
                  </button>
                </div>
              ))}

              <FormField
                control={form.control}
                name="includeThirdPlace"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Inkluder bronsefinale
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={generateMutation.isPending}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
          >
            {generateMutation.isPending ? "Genererer …" : "Generer kamper"}
          </button>
        </form>
      </Form>
    </div>
  );
}
