import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[120px] w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
        "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "placeholder:text-muted-foreground/70",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
