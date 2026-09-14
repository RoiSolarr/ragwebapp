import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  label?: string;
};

/**
 * A small inline loading spinner. Uses `currentColor`, so it always
 * matches the text color of whatever it's placed inside (a button,
 * a status line, etc). `label` is read by screen readers even though
 * the spinner itself is visual-only.
 */
export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
      />
    </svg>
  );
}