import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QueryProvider } from "@/ui/providers/query-client";

describe("QueryProvider", () => {
  it("renders children inside the query client provider", () => {
    render(
      <QueryProvider>
        <div>Query child</div>
      </QueryProvider>,
    );

    expect(screen.getByText("Query child")).toBeInTheDocument();
  });
});
