import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        data-slot="textarea"
        className={cn(
          "flex min-h-[5rem] w-full rounded-[0.7rem] border border-input bg-background/55 px-3 py-2.5 text-base leading-relaxed shadow-[inset_0_1px_2px_rgba(0,0,0,.18)] transition-[color,background-color,border-color,box-shadow] duration-150 placeholder:text-muted-foreground/80 hover:border-primary/20 focus-visible:border-primary/55 focus-visible:bg-background/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
