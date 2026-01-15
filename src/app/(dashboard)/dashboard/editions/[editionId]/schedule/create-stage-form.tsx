"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
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

const createStageSchema = z
  .object({
    name: z.string().min(1, "Gi stadiet et navn."),
    stageType: z.enum(["group", "knockout"]),
    groups: z
      .array(
        z.object({
          code: z.string().min(1, "Kode er påkrevd."),
          name: z.string().optional(),
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.stageType === "group") {
      if (!data.groups || data.groups.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Legg til minst én gruppe for gruppespillstadier.",
          path: ["groups"],
        });
      }
    }
  });

type CreateStageFormValues = z.infer<typeof createStageSchema>;

type CreateStageFormProps = {
  editionId: string;
  onSuccess: () => void;
};

export function CreateStageForm({
  editionId,
  onSuccess,
}: CreateStageFormProps) {
  const form = useForm<CreateStageFormValues>({
    resolver: zodResolver(createStageSchema),
    defaultValues: {
      name: "",
      stageType: "group",
      groups: [{ code: "A", name: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "groups",
  });

  const stageType = form.watch("stageType");

  useEffect(() => {
    if (stageType === "group" && fields.length === 0) {
      append({ code: "A", name: "" });
    }
  }, [stageType, fields.length, append]);

  const createStageMutation = useMutation({
    mutationFn: async (data: CreateStageFormValues) => {
      const groupsPayload =
        data.stageType === "group"
          ? data.groups?.map((g) => ({
              code: g.code.toUpperCase(),
              name: g.name || g.code.toUpperCase(),
            }))
          : undefined;

      const response = await apiClient.POST(
        "/api/editions/{edition_id}/stages",
        {
          params: { path: { edition_id: editionId } },
          body: {
            name: data.name,
            stage_type: data.stageType === "knockout" ? "bracket" : "group",
            groups: groupsPayload,
          },
        },
      );

      if (response.error) {
        throw new Error(response.error.title ?? "Kunne ikke opprette stadium.");
      }
      return response.data;
    },
    onSuccess: () => {
      form.reset({
        name: "",
        stageType: "group",
        groups: [{ code: "A", name: "" }],
      });
      onSuccess();
    },
  });

  function onSubmit(data: CreateStageFormValues) {
    createStageMutation.mutate(data);
  }

  function nextGroupCode(count: number) {
    return String.fromCharCode(65 + count);
  }

  return (
    <div className="space-y-6">
      {createStageMutation.isSuccess && (
        <output className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          Stadiet ble opprettet.
        </output>
      )}
      {createStageMutation.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {createStageMutation.error.message}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stadienavn</FormLabel>
                  <FormControl>
                    <Input placeholder="Eksempel: Gruppespill A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stadietype</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="group">Gruppespill</option>
                      <option value="knockout">Sluttspill</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {stageType === "group" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Grupper
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    append({ code: nextGroupCode(fields.length), name: "" })
                  }
                  className="inline-flex items-center justify-center rounded-md border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-primary/10"
                >
                  Legg til gruppe
                </button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-[120px,1fr,auto]"
                  >
                    <FormField
                      control={form.control}
                      name={`groups.${index}.code`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase text-muted-foreground">
                            Kode
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              maxLength={4}
                              className="uppercase"
                              onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`groups.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase text-muted-foreground">
                            Navn (valgfritt)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Eksempel: Pulje Nord"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        className="inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive transition hover:border-destructive/60 hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Fjern
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={createStageMutation.isPending}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
          >
            {createStageMutation.isPending ? "Lagrer …" : "Lagre stadium"}
          </button>
        </form>
      </Form>
    </div>
  );
}
