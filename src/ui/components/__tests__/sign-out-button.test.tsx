import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SignOutButton } from "@/ui/components/sign-out-button";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignOut = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  signOut: () => mockSignOut(),
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SignOutButton", () => {
  beforeEach(() => {
    mockSignOut.mockResolvedValue({});
  });

  test("renders button with default text", () => {
    render(<SignOutButton />);
    expect(screen.getByRole("button", { name: "Logg ut" })).toBeInTheDocument();
  });

  test("renders button with custom children", () => {
    render(<SignOutButton>Sign Out</SignOutButton>);
    expect(
      screen.getByRole("button", { name: "Sign Out" }),
    ).toBeInTheDocument();
  });

  test("applies custom className", () => {
    render(<SignOutButton className="custom-class" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  test("calls signOut and redirects on success", async () => {
    mockSignOut.mockResolvedValue({});

    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  test("is disabled while submitting", async () => {
    // Make signOut never resolve to keep the button disabled
    mockSignOut.mockReturnValue(new Promise(() => {}));

    render(<SignOutButton />);
    const button = screen.getByRole("button");

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  test("throws error when signOut returns error", async () => {
    mockSignOut.mockResolvedValue({
      error: { message: "Auth error" },
    });

    const errorSpy = vi.fn();

    render(
      <TestErrorBoundary onError={errorSpy}>
        <SignOutButton />
      </TestErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });
    expect(screen.getByText("Boundary error")).toBeInTheDocument();
  });

  test("throws error with default message when signOut error has no message", async () => {
    mockSignOut.mockResolvedValue({
      error: {},
    });

    const errorSpy = vi.fn();

    render(
      <TestErrorBoundary onError={errorSpy}>
        <SignOutButton />
      </TestErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
      const error = errorSpy.mock.calls[0]?.[0] as Error;
      expect(error.message).toBe("Kunne ikke logge ut.");
    });
  });

  test("throws generic error when signOut throws non-Error", async () => {
    mockSignOut.mockRejectedValue("string error");

    const errorSpy = vi.fn();

    render(
      <TestErrorBoundary onError={errorSpy}>
        <SignOutButton />
      </TestErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
      const error = errorSpy.mock.calls[0]?.[0] as Error;
      expect(error.message).toBe("Kunne ikke logge ut. Prøv igjen.");
    });
  });

  test("throws original error when signOut throws Error", async () => {
    mockSignOut.mockRejectedValue(new Error("Network error"));

    const errorSpy = vi.fn();

    render(
      <TestErrorBoundary onError={errorSpy}>
        <SignOutButton />
      </TestErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
      const error = errorSpy.mock.calls[0]?.[0] as Error;
      expect(error.message).toBe("Network error");
    });
  });

  test("ignores clicks when already submitting", async () => {
    let resolveSignOut: (() => void) | undefined;
    mockSignOut.mockReturnValue(
      new Promise<object>((resolve) => {
        resolveSignOut = () => resolve({});
      }),
    );

    render(<SignOutButton />);
    const button = screen.getByRole("button");

    // First click
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    // Second click while still submitting
    fireEvent.click(button);

    // Should still be only 1 call
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Resolve to clean up
    resolveSignOut?.();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });
});
