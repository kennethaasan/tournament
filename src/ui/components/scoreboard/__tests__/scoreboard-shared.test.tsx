import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  CountdownBadge,
  EmptyState,
  MatchRowSkeleton,
  SearchInput,
  Skeleton,
  StandingsRowSkeleton,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeadRow,
  TableRow,
} from "@/ui/components/scoreboard/scoreboard-shared";

afterEach(() => {
  cleanup();
});

describe("StatusBadge", () => {
  test("renders in_progress status with Live label", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  test("renders disputed status with Tvist label", () => {
    render(<StatusBadge status="disputed" />);
    expect(screen.getByText("Tvist")).toBeInTheDocument();
  });

  test("renders finalized status with Ferdig label", () => {
    render(<StatusBadge status="finalized" />);
    expect(screen.getByText("Ferdig")).toBeInTheDocument();
  });

  test("renders scheduled status with Planlagt label", () => {
    render(<StatusBadge status="scheduled" />);
    expect(screen.getByText("Planlagt")).toBeInTheDocument();
  });

  test("renders compact mode with output element", () => {
    render(<StatusBadge status="in_progress" compact />);
    const output = screen.getByRole("status");
    expect(output).toHaveAttribute("aria-label", "Live");
  });

  test("renders full mode with span element", () => {
    const { container } = render(<StatusBadge status="in_progress" />);
    const span = container.querySelector("span");
    expect(span).not.toHaveAttribute("aria-label");
  });
});

describe("EmptyState", () => {
  test("renders with title", () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  test("renders with description", () => {
    render(<EmptyState title="No data" description="Check back later" />);
    expect(screen.getByText("Check back later")).toBeInTheDocument();
  });

  test("does not render description when not provided", () => {
    const { container } = render(<EmptyState title="No data" />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(1);
  });

  test("renders matches icon by default", () => {
    const { container } = render(<EmptyState title="No data" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  test("renders standings icon", () => {
    const { container } = render(
      <EmptyState title="No data" icon="standings" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  test("renders scorers icon", () => {
    const { container } = render(<EmptyState title="No data" icon="scorers" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});

describe("Skeleton", () => {
  test("renders with animate-pulse class", () => {
    const { container } = render(<Skeleton />);
    const div = container.querySelector("div");
    expect(div).toHaveClass("animate-pulse");
  });

  test("applies custom className", () => {
    const { container } = render(<Skeleton className="h-4 w-12" />);
    const div = container.querySelector("div");
    expect(div).toHaveClass("h-4", "w-12");
  });

  test("is hidden from assistive technology", () => {
    const { container } = render(<Skeleton />);
    const div = container.querySelector("div");
    expect(div).toHaveAttribute("aria-hidden", "true");
  });
});

describe("MatchRowSkeleton", () => {
  test("renders multiple skeleton elements", () => {
    const { container } = render(<MatchRowSkeleton />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(1);
  });
});

describe("StandingsRowSkeleton", () => {
  test("renders multiple skeleton elements", () => {
    const { container } = render(<StandingsRowSkeleton />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(1);
  });
});

describe("CountdownBadge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders 'Starter nå' when target is in the past", () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    const pastDate = new Date("2025-01-01T11:00:00Z");
    render(<CountdownBadge targetDate={pastDate} />);
    expect(screen.getByText("Starter nå")).toBeInTheDocument();
  });

  test("renders 'Starter nå' when target equals current time", () => {
    const now = new Date("2025-01-01T12:00:00Z");
    vi.setSystemTime(now);
    render(<CountdownBadge targetDate={now} />);
    expect(screen.getByText("Starter nå")).toBeInTheDocument();
  });

  test("renders high urgency for <= 15 minutes", () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    const targetDate = new Date("2025-01-01T12:10:00Z"); // 10 minutes from now
    const { container } = render(<CountdownBadge targetDate={targetDate} />);

    expect(screen.getByText("Om 10 min")).toBeInTheDocument();
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-orange-500/20");
  });

  test("renders medium urgency for 16-60 minutes", () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    const targetDate = new Date("2025-01-01T12:45:00Z"); // 45 minutes from now
    const { container } = render(<CountdownBadge targetDate={targetDate} />);

    expect(screen.getByText("Om 45 min")).toBeInTheDocument();
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-yellow-500/20");
  });

  test("renders low urgency for 1-24 hours", () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    const targetDate = new Date("2025-01-01T15:30:00Z"); // 3h 30min from now
    const { container } = render(<CountdownBadge targetDate={targetDate} />);

    expect(screen.getByText("Om 3t 30m")).toBeInTheDocument();
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-white/10");
  });

  test("renders days for > 24 hours", () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    const targetDate = new Date("2025-01-03T15:00:00Z"); // 2 days 3 hours from now
    const { container } = render(<CountdownBadge targetDate={targetDate} />);

    expect(screen.getByText("Om 2d 3t")).toBeInTheDocument();
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-white/10");
  });

  test("renders exactly 15 minutes as high urgency", () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    const targetDate = new Date("2025-01-01T12:15:00Z"); // exactly 15 minutes
    const { container } = render(<CountdownBadge targetDate={targetDate} />);

    expect(screen.getByText("Om 15 min")).toBeInTheDocument();
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-orange-500/20");
  });

  test("renders exactly 60 minutes as medium urgency", () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    const targetDate = new Date("2025-01-01T13:00:00Z"); // exactly 60 minutes
    const { container } = render(<CountdownBadge targetDate={targetDate} />);

    expect(screen.getByText("Om 60 min")).toBeInTheDocument();
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-yellow-500/20");
  });
});

describe("SearchInput", () => {
  test("renders with value", () => {
    render(<SearchInput value="test" onChange={vi.fn()} />);
    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue("test");
  });

  test("calls onChange when input changes", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "new value" } });

    expect(onChange).toHaveBeenCalledWith("new value");
  });

  test("renders with custom placeholder", () => {
    render(
      <SearchInput value="" onChange={vi.fn()} placeholder="Find something" />,
    );
    expect(screen.getByPlaceholderText("Find something")).toBeInTheDocument();
  });

  test("renders with default placeholder", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Søk...")).toBeInTheDocument();
  });
});

describe("Table components", () => {
  test("Table renders with normal variant", () => {
    const { container } = render(
      <Table>
        <tbody>
          <tr>
            <td>Cell</td>
          </tr>
        </tbody>
      </Table>,
    );
    const table = container.querySelector("table");
    expect(table).toHaveClass("text-sm");
  });

  test("Table renders with compact variant", () => {
    const { container } = render(
      <Table variant="compact">
        <tbody>
          <tr>
            <td>Cell</td>
          </tr>
        </tbody>
      </Table>,
    );
    const table = container.querySelector("table");
    expect(table).toHaveClass("text-sm");
  });

  test("Table renders with fixed layout", () => {
    const { container } = render(
      <Table fixed>
        <tbody>
          <tr>
            <td>Cell</td>
          </tr>
        </tbody>
      </Table>,
    );
    const table = container.querySelector("table");
    expect(table).toHaveClass("table-fixed");
  });

  test("TableHead renders with sticky positioning", () => {
    const { container } = render(
      <table>
        <TableHead sticky>
          <tr>
            <th>Header</th>
          </tr>
        </TableHead>
      </table>,
    );
    const thead = container.querySelector("thead");
    expect(thead).toHaveClass("sticky", "top-0", "backdrop-blur");
  });

  test("TableHead renders without sticky by default", () => {
    const { container } = render(
      <table>
        <TableHead>
          <tr>
            <th>Header</th>
          </tr>
        </TableHead>
      </table>,
    );
    const thead = container.querySelector("thead");
    expect(thead).not.toHaveClass("sticky");
  });

  test("TableHeadRow renders with compact variant", () => {
    const { container } = render(
      <table>
        <thead>
          <TableHeadRow variant="compact">
            <th>Header</th>
          </TableHeadRow>
        </thead>
      </table>,
    );
    const tr = container.querySelector("tr");
    expect(tr).toHaveClass("text-[0.65rem]");
  });

  test("TableHeaderCell renders with center alignment", () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell align="center">Header</TableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    const th = container.querySelector("th");
    expect(th).toHaveClass("text-center");
  });

  test("TableHeaderCell renders with right alignment", () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell align="right">Header</TableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    const th = container.querySelector("th");
    expect(th).toHaveClass("text-right");
  });

  test("TableHeaderCell renders with width", () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell width="100px">Header</TableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    const th = container.querySelector("th");
    expect(th).toHaveStyle({ width: "100px" });
  });

  test("TableBody renders children", () => {
    render(
      <table>
        <TableBody>
          <tr>
            <td>Cell content</td>
          </tr>
        </TableBody>
      </table>,
    );
    expect(screen.getByText("Cell content")).toBeInTheDocument();
  });

  test("TableRow renders with zebra striping for even index", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRow index={0}>
            <td>Cell</td>
          </TableRow>
        </tbody>
      </table>,
    );
    const tr = container.querySelector("tr");
    expect(tr).toHaveClass("bg-white/[0.02]");
  });

  test("TableRow renders without zebra for odd index", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRow index={1}>
            <td>Cell</td>
          </TableRow>
        </tbody>
      </table>,
    );
    const tr = container.querySelector("tr");
    expect(tr).not.toHaveClass("bg-white/[0.02]");
  });

  test("TableRow renders with highlight", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRow highlight>
            <td>Cell</td>
          </TableRow>
        </tbody>
      </table>,
    );
    const tr = container.querySelector("tr");
    expect(tr).toHaveClass("bg-red-500/15");
  });

  test("TableRow renders with aria-current when current", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRow current>
            <td>Cell</td>
          </TableRow>
        </tbody>
      </table>,
    );
    const tr = container.querySelector("tr");
    expect(tr).toHaveAttribute("aria-current", "true");
  });

  test("TableCell renders with compact variant", () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <TableCell variant="compact">Cell</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const td = container.querySelector("td");
    expect(td).toHaveClass("px-1.5", "py-0.5");
  });

  test("TableCell renders muted", () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <TableCell muted>Cell</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const td = container.querySelector("td");
    expect(td).toHaveClass("text-white/70");
  });

  test("TableCell renders bold", () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <TableCell bold>Cell</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const td = container.querySelector("td");
    expect(td).toHaveClass("font-bold");
  });

  test("TableCell renders truncated", () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <TableCell truncate>Long text here</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const td = container.querySelector("td");
    expect(td).toHaveClass("truncate");
  });

  test("TableCell renders with colSpan", () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <TableCell colSpan={3}>Spanning cell</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const td = container.querySelector("td");
    expect(td).toHaveAttribute("colspan", "3");
  });

  test("TableCell renders with center alignment", () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <TableCell align="center">Centered</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const td = container.querySelector("td");
    expect(td).toHaveClass("text-center");
  });

  test("TableCell renders with right alignment", () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <TableCell align="right">Right</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const td = container.querySelector("td");
    expect(td).toHaveClass("text-right");
  });
});
