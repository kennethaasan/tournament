import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils/cn";
import { Label } from "./label";

type FormFieldProps = {
  htmlFor: string;
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function FormField({
  htmlFor,
  label,
  description,
  children,
  className,
}: FormFieldProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;

  const enhancedChild = isValidElement(children)
    ? cloneElement(children as ReactElement, {
        "aria-describedby":
          [children.props["aria-describedby"], descriptionId]
            .filter(Boolean)
            .join(" ") || undefined,
      })
    : children;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {enhancedChild}
      {description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
