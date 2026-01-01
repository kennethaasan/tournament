import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ConfirmDialog, Dialog } from "@/ui/components/dialog";

// Mock HTMLDialogElement methods which are not available in JSDOM
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Dialog", () => {
  test("renders children and title", () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()} title="Test Dialog">
        <p>Dialog content</p>
      </Dialog>,
    );

    expect(screen.getByText("Test Dialog")).toBeInTheDocument();
    expect(screen.getByText("Dialog content")).toBeInTheDocument();
  });

  test("calls showModal when open is true", () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()} title="Test">
        Content
      </Dialog>,
    );

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  test("calls close when open is false", () => {
    const { rerender } = render(
      <Dialog open={true} onOpenChange={vi.fn()} title="Test">
        Content
      </Dialog>,
    );

    rerender(
      <Dialog open={false} onOpenChange={vi.fn()} title="Test">
        Content
      </Dialog>,
    );

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  test("calls onOpenChange when close button is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange} title="Test">
        Content
      </Dialog>,
    );

    // Dialog elements are hidden in JSDOM, use hidden: true
    const closeButton = screen.getByRole("button", {
      name: "Lukk",
      hidden: true,
    });
    fireEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("calls onOpenChange when escape key is pressed", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Dialog open={true} onOpenChange={onOpenChange} title="Test">
        Content
      </Dialog>,
    );

    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    fireEvent.keyDown(dialog!, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("does not call onOpenChange for non-escape keys", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Dialog open={true} onOpenChange={onOpenChange} title="Test">
        Content
      </Dialog>,
    );

    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    fireEvent.keyDown(dialog!, { key: "Enter" });

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test("calls onOpenChange when backdrop is clicked", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Dialog open={true} onOpenChange={onOpenChange} title="Test">
        Content
      </Dialog>,
    );

    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    // Simulate clicking on the dialog element itself (backdrop)
    fireEvent.click(dialog!);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("does not call onOpenChange when content is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange} title="Test">
        <button type="button">Inner button</button>
      </Dialog>,
    );

    const innerButton = screen.getByText("Inner button");
    fireEvent.click(innerButton);

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test("handles onClose event from dialog", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Dialog open={true} onOpenChange={onOpenChange} title="Test">
        Content
      </Dialog>,
    );

    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    fireEvent(dialog!, new Event("close"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("ConfirmDialog", () => {
  test("renders title and description", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
      />,
    );

    expect(screen.getByText("Confirm Action")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to proceed?"),
    ).toBeInTheDocument();
  });

  test("renders default button labels", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Test"
        description="Test description"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Bekreft", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Avbryt", hidden: true }),
    ).toBeInTheDocument();
  });

  test("renders custom button labels", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Test"
        description="Test description"
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Yes, delete", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "No, keep", hidden: true }),
    ).toBeInTheDocument();
  });

  test("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        title="Test"
        description="Test description"
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: "Bekreft",
      hidden: true,
    });
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalled();
  });

  test("calls onOpenChange with false when cancel button is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        title="Test"
        description="Test description"
      />,
    );

    const cancelButton = screen.getByRole("button", {
      name: "Avbryt",
      hidden: true,
    });
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("disables buttons when isLoading is true", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Test"
        description="Test description"
        isLoading={true}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Vennligst vent …", hidden: true }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Avbryt", hidden: true }),
    ).toBeDisabled();
  });

  test("shows loading text when isLoading is true", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Test"
        description="Test description"
        isLoading={true}
      />,
    );

    expect(screen.getByText("Vennligst vent …")).toBeInTheDocument();
  });

  test("applies danger variant styling", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Test"
        description="Test description"
        variant="danger"
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: "Bekreft",
      hidden: true,
    });
    expect(confirmButton).toHaveClass("bg-destructive");
  });

  test("applies default variant styling", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Test"
        description="Test description"
        variant="default"
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: "Bekreft",
      hidden: true,
    });
    expect(confirmButton).toHaveClass("bg-primary");
  });
});
