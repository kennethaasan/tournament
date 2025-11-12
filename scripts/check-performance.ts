import "dotenv/config";
import { performance } from "node:perf_hooks";

type EndpointDefinition = {
  label: string;
  path: string;
  budgetMs: number;
};

type EndpointResult = {
  label: string;
  url: string;
  budgetMs: number;
  samples: number[];
  statuses: number[];
  passed: boolean;
};

type CliOptions = {
  runs: number;
  json: boolean;
};

const BASE_URL =
  process.env.PERF_BASE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

const COMPETITION_SLUG = process.env.PERF_COMPETITION_SLUG || "oslo-cup";
const EDITION_SLUG = process.env.PERF_EDITION_SLUG || "2025";

const ENDPOINTS: EndpointDefinition[] = [
  {
    label: "Scoreboard",
    path: `/api/public/editions/${COMPETITION_SLUG}/${EDITION_SLUG}/scoreboard`,
    budgetMs: Number(process.env.PERF_SCOREBOARD_BUDGET_MS ?? 250),
  },
  {
    label: "Event feed",
    path: "/api/public/events",
    budgetMs: Number(process.env.PERF_EVENT_FEED_BUDGET_MS ?? 200),
  },
];

function parseCliOptions(): CliOptions {
  const defaults: CliOptions = {
    runs: Number(process.env.PERF_RUNS ?? 3),
    json: false,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === "--json") {
      defaults.json = true;
    } else if (arg.startsWith("--runs=")) {
      const value = Number(arg.split("=")[1]);
      if (!Number.isNaN(value) && value > 0) {
        defaults.runs = value;
      }
    }
  }

  return defaults;
}

async function main() {
  const options = parseCliOptions();
  const results: EndpointResult[] = [];

  for (const endpoint of ENDPOINTS) {
    const url = `${BASE_URL}${endpoint.path}`;
    const samples: number[] = [];
    const statuses: number[] = [];

    for (let index = 0; index < options.runs; index += 1) {
      const timerStart = performance.now();
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "performance-check/1.0",
        },
      });
      const duration = performance.now() - timerStart;

      samples.push(duration);
      statuses.push(response.status);
      await response.body?.cancel();
    }

    results.push({
      label: endpoint.label,
      url,
      budgetMs: endpoint.budgetMs,
      samples,
      statuses,
      passed:
        samples.every((duration) => duration <= endpoint.budgetMs) &&
        statuses.every((status) => status >= 200 && status < 300),
    });
  }

  const hasFailures = results.some((result) => !result.passed);

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          baseUrl: BASE_URL,
          runs: options.runs,
          results: results.map((result) => ({
            label: result.label,
            url: result.url,
            budgetMs: result.budgetMs,
            samples: result.samples.map((duration) =>
              Number(duration.toFixed(2)),
            ),
            statuses: result.statuses,
            avgMs: Number(avg(result.samples).toFixed(2)),
            maxMs: Number(Math.max(...result.samples).toFixed(2)),
            passed: result.passed,
          })),
        },
        null,
        2,
      )}\n`,
    );
  } else {
    printTable(results, options.runs);
  }

  if (hasFailures) {
    process.exitCode = 1;
  } else if (!options.json) {
    info("Performance budgets satisfied ✨");
  }
}

function avg(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function printTable(results: EndpointResult[], runs: number) {
  const header = [
    "| Endpoint       | Status | Avg (ms) | P95 (ms) | Max (ms) | Budget (ms) |",
    "|----------------|--------|----------|----------|----------|-------------|",
  ];

  const rows = results.map((result) => {
    const maxDuration = Math.max(...result.samples);
    const p95 = percentile(result.samples, 0.95);
    const statusSummary = summarizeStatuses(result.statuses);
    const statusIcon = result.passed ? "✓" : "✗";

    return `| ${result.label.padEnd(14)} | ${statusIcon} ${statusSummary.padEnd(
      5,
    )} | ${formatNumber(avg(result.samples))} | ${formatNumber(
      p95,
    )} | ${formatNumber(maxDuration)} | ${result.budgetMs
      .toFixed(0)
      .padStart(11)} |`;
  });

  const meta = `\nRuns: ${runs} · Base URL: ${BASE_URL}\n`;
  info([...header, ...rows, meta].join("\n"));
}

function summarizeStatuses(statuses: number[]): string {
  const unique = Array.from(new Set(statuses));
  return unique.length === 1 ? `${unique[0]}` : unique.join(",");
}

function formatNumber(value: number) {
  return value.toFixed(1).padStart(8);
}

function percentile(values: number[], fraction: number) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * fraction) - 1,
  );
  return sorted[index] ?? 0;
}

const info = (message: string) => {
  process.stdout.write(`${message}\n`);
};

main().catch((err) => {
  process.stderr.write(
    `Performance check crashed: ${
      err instanceof Error ? err.message : String(err)
    }\n`,
  );
  process.exitCode = 1;
});
