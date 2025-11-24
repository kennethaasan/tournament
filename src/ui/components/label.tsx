import * as React from "react";
import { cn } from "@/lib/utils/cn";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, htmlFor, children, ...props }, ref) => (
  <label
    ref={ref}
    htmlFor={htmlFor}
    className={cn(
      "text-sm font-medium leading-none text-foreground",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  >
    {children}
  </label>
));
Label.displayName = "Label";

export { Label };
