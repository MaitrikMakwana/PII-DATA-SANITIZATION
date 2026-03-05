import * as React from "react";
import { cn } from "./utils";

function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field" className={cn("flex flex-col gap-2", className)} {...props} />;
}

function FieldLabel({ className, htmlFor, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      htmlFor={htmlFor}
      className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Field, FieldLabel, FieldDescription };
