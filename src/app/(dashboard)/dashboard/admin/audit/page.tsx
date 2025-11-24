import { type AuditLogEntry, listAuditLogs } from "@/modules/admin/service";
import { auditScopeTypeEnum } from "@/server/db/schema/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { NavigationGrid } from "@/ui/components/navigation-links";
import { PageHero } from "@/ui/components/page-hero";

export const dynamic = "force-dynamic";

type AuditSearchParams = {
  scopeType?: string;
  scopeId?: string;
  limit?: string;
};

const scopeTypeOptions = auditScopeTypeEnum.enumValues;
type ScopeType = (typeof scopeTypeOptions)[number];
const numberFormatter = new Intl.NumberFormat("nb-NO");
const timestampFormatter = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "medium",
  timeStyle: "medium",
});

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams?: AuditSearchParams;
}) {
  const scopeType = parseScopeType(searchParams?.scopeType);
  const scopeId = sanitizeInput(searchParams?.scopeId);
  const limit = parseLimit(searchParams?.limit);

  const auditEntries = await listAuditLogs({
    scopeType,
    scopeId: scopeId ?? undefined,
    limit,
  });

  return (
    <div className="space-y-10">
      <PageHero
        eyebrow="Administrasjon · Revisjon"
        title="Revisjonslogg og endringshistorikk"
        description="Filtrer hendelser basert på konkurranse, utgave eller andre domenetyper for å forstå hvem som gjorde endringer og når."
      />

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle className="text-foreground">Filtrer hendelser</CardTitle>
          <CardDescription>
            Avgrens loggen på tvers av omfangstype, spesifikk ID og antall
            linjer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" method="get">
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Omfangstype
              <select
                name="scopeType"
                defaultValue={scopeType ?? ""}
                className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.04)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Alle</option>
                {scopeTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {scopeTypeLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-foreground md:col-span-2">
              Omfang-ID
              <input
                type="text"
                name="scopeId"
                defaultValue={scopeId ?? ""}
                placeholder="UUID"
                className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.04)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Antall rader
              <input
                type="number"
                name="limit"
                min={10}
                max={200}
                step={10}
                defaultValue={limit}
                className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.04)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>

            <div className="md:col-span-4">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90"
              >
                Filtrer logg
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-foreground">Hendelser</CardTitle>
          <CardDescription>
            Viser {numberFormatter.format(auditEntries.length)} hendelser basert
            på filtrene over.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auditEntries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Ingen hendelser funnet for det valgte filteret.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm text-muted-foreground">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2">Tidspunkt</th>
                    <th className="px-4 py-2">Aktør</th>
                    <th className="px-4 py-2">Omfang</th>
                    <th className="px-4 py-2">Handling</th>
                    <th className="px-4 py-2">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="align-top rounded-xl border border-border/70 bg-card/60"
                    >
                      <td className="px-4 py-3 text-foreground">
                        {timestampFormatter.format(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {entry.actor.name ?? "System"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.actor.email ?? "ingen e-post"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {scopeTypeLabel(entry.scopeType)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.scopeId ?? "Ingen scope ID"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {actionLabel(entry.action)} ·{" "}
                          {entityLabel(entry.entityType)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {entry.entityId}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <MetadataPreview entry={entry} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Navigasjon
        </p>
        <NavigationGrid />
      </section>
    </div>
  );
}

function parseScopeType(value?: string): ScopeType | undefined {
  if (!value) {
    return undefined;
  }

  return scopeTypeOptions.includes(value as ScopeType)
    ? (value as ScopeType)
    : undefined;
}

function sanitizeInput(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function parseLimit(limitParam: string | undefined): number {
  const fallback = 50;
  if (!limitParam) {
    return fallback;
  }

  const parsed = Number.parseInt(limitParam, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 10), 200);
}

function scopeTypeLabel(scope: string): string {
  switch (scope) {
    case "competition":
      return "Konkurranse";
    case "edition":
      return "Utgave";
    case "team":
      return "Lag";
    case "match":
      return "Kamp";
    case "user":
      return "Bruker";
    default:
      return scope;
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case "created":
      return "Opprettet";
    case "updated":
      return "Oppdatert";
    case "deleted":
      return "Slettet";
    default:
      return action;
  }
}

function entityLabel(entity: string): string {
  switch (entity) {
    case "match":
      return "Kamp";
    case "match_event":
      return "Kamp-hendelse";
    case "entry":
      return "Påmelding";
    case "notification":
      return "Varsel";
    default:
      return entity;
  }
}

function MetadataPreview({ entry }: { entry: AuditLogEntry }) {
  const content = JSON.stringify(entry.metadata, null, 2);

  return (
    <details className="rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer text-foreground">Vis detaljer</summary>
      <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
        {content}
      </pre>
    </details>
  );
}
