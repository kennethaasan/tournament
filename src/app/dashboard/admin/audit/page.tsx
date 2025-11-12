import { type AuditLogEntry, listAuditLogs } from "@/modules/admin/service";
import { auditScopeTypeEnum } from "@/server/db/schema/shared";

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
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14">
        <header className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Administrasjon · Revisjon
          </p>
          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Revisjonslogg og endringshistorikk
          </h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Filtrer hendelser basert på konkurranse, utgave eller andre
            domenetyper for å forstå hvem som gjorde endringer og når de ble
            gjennomført.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="grid gap-4 md:grid-cols-4" method="get">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Omfangstype
              <select
                name="scopeType"
                defaultValue={scopeType ?? ""}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Alle</option>
                {scopeTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {scopeTypeLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
              Omfang-ID
              <input
                type="text"
                name="scopeId"
                defaultValue={scopeId ?? ""}
                placeholder="UUID"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Antall rader
              <input
                type="number"
                name="limit"
                min={10}
                max={200}
                step={10}
                defaultValue={limit}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <div className="md:col-span-4">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                Filtrer logg
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Hendelser
              </h2>
              <p className="text-sm text-slate-600">
                Viser {numberFormatter.format(auditEntries.length)} siste
                hendelser.
              </p>
            </div>
          </header>

          {auditEntries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              Ingen hendelser funnet for det valgte filteret.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm text-slate-700">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
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
                      className="align-top rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-900">
                        {timestampFormatter.format(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {entry.actor.name ?? "System"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {entry.actor.email ?? "ingen e-post"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {scopeTypeLabel(entry.scopeType)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {entry.scopeId ?? "Ingen scope ID"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {actionLabel(entry.action)} ·{" "}
                          {entityLabel(entry.entityType)}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
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
        </section>
      </div>
    </main>
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
    <details className="rounded-lg border border-slate-200 bg-white/70 p-3 text-xs text-slate-600">
      <summary className="cursor-pointer text-slate-800">Vis detaljer</summary>
      <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
        {content}
      </pre>
    </details>
  );
}
