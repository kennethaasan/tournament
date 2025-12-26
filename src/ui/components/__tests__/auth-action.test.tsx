import { render, screen, waitFor } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthAction } from "@/ui/components/auth-action";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/ui/components/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Logg ut</button>,
}));

class TestErrorBoundary extends Component<
  { onError: (error: Error) => void; children: ReactNode },
  { error: Error | null }
> {
  override state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  override render() {
    if (this.state.error) {
      return <div>Boundary error</div>;
    }
    return this.props.children;
  }
}

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("AuthAction", () => {
  it("renders sign-out when a session exists", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ session: { id: "session-1" } }),
    } as Response);

    render(<AuthAction />);

    expect(await screen.findByText("Logg ut")).toBeInTheDocument();
  });

  it("renders login link when the session is empty", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);

    render(<AuthAction />);

    const link = await screen.findByText("Logg inn");
    expect(link).toHaveAttribute("href", "/auth/login");
  });

  it("bubbles errors from session fetch", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      text: async () => "",
    } as Response);

    const errorSpy = vi.fn();

    render(
      <TestErrorBoundary onError={errorSpy}>
        <AuthAction />
      </TestErrorBoundary>,
    );

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(screen.getByText("Boundary error")).toBeInTheDocument();
  });
});
