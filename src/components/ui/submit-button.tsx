"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingChildren?: React.ReactNode;
  className?: string;
  spinnerClassName?: string;
  /** When set, a full-screen blocking LoadingOverlay is shown while pending. */
  overlay?: { title: string; description?: string };
};

/**
 * A submit button for forms whose `action` is a React/Next.js Server
 * Action. `useFormStatus` only reports `pending` for that kind of form
 * submission (not for plain `method="get"`/`method="post"` HTML forms),
 * so this is meant for `<form action={someServerAction}>` specifically.
 *
 * Disabling the button while `pending` is what stops a slow request
 * (e.g. creating a workspace, signing out) from being triggered more
 * than once by an impatient extra click.
 */
export function SubmitButton({
  children,
  pendingChildren,
  className,
  spinnerClassName,
  overlay,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <>
      {pending && overlay ? <LoadingOverlay title={overlay.title} description={overlay.description} /> : null}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={cn(
          "inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70",
          className
        )}
      >
        {pending ? (
          <>
            <Spinner className={spinnerClassName} />
            {pendingChildren ?? children}
          </>
        ) : (
          children
        )}
      </button>
    </>
  );
}
