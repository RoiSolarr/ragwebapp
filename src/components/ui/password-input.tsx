"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

function EyeIcon({ closed = false }: { closed?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={
          closed
            ? "m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 8.5 4 9.5 6-.4.8-1.5 2.3-3.1 3.6M6.2 6.2C4.6 7.3 3.5 8.8 2.5 10c1 2 4.5 6 9.5 6 1 0 1.9-.2 2.7-.5"
            : "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        }
      />
      {!closed && <circle cx="12" cy="12" r="2.5" />}
    </svg>
  );
}

/**
 * Same visual styling as `Input`, plus a show/hide toggle button so the
 * person can check what they typed before submitting. `className` applies
 * to the outer wrapper (for spacing like `mt-2`), matching how `Input` is
 * used elsewhere.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <span className={cn("relative block", className)}>
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className="w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 pr-11 text-sm text-ink shadow-[0_1px_2px_rgba(19,44,58,0.04)] outline-none transition-all duration-150 placeholder:text-ink-muted/60 hover:border-ink/25 focus:border-indigo focus:ring-4 focus:ring-indigo/10 disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-muted transition hover:text-indigo"
        >
          <EyeIcon closed={!visible} />
        </button>
      </span>
    );
  }
);
PasswordInput.displayName = "PasswordInput";