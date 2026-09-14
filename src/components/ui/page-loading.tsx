import { SiteHeader } from "@/components/site-header";
import { Spinner } from "@/components/ui/spinner";

/**
 * Rendered by every app route's `loading.tsx` (Next.js shows this
 * automatically while the target page's server component is still
 * fetching data). Keeping the same sidebar + shell here as the real
 * pages avoids a layout jump when the real content swaps in.
 */
export function PageLoading() {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader variant="app" />
      <main className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 text-ink-muted">
          <Spinner className="h-8 w-8" label="Loading page" />
          <p className="text-sm">Loading…</p>
        </div>
      </main>
    </div>
  );
}