import * as React from "react";
import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink shadow-[0_1px_2px_rgba(19,44,58,0.04)] outline-none transition-all duration-150 placeholder:text-ink-muted/60 hover:border-ink/25 focus:border-indigo focus:ring-4 focus:ring-indigo/10 disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";