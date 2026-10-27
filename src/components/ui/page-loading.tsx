import { SiteHeader } from "@/components/site-header";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

type PageLoadingProps = {
  title: string;
  description: string;
};

/**
 * Rendered by every app route's `loading.tsx` (Next.js shows this
 * automatically while the target page's server component is still
 * fetching data). Keeping the same sidebar + shell here as the real
 * pages avoids a layout jump when the real content swaps in; the
 * skeleton underneath is blurred by the blocking overlay on top.
 */
export function PageLoading({ title, description }: PageLoadingProps) {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader variant="app" />
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-6 sm:pt-12" aria-hidden="true">
        <div className="border-b border-line pb-8">
          <div className="h-3 w-32 rounded-full bg-white/[.08]" />
          <div className="mt-4 h-10 w-64 max-w-full rounded-xl bg-white/[.08]" />
          <div className="mt-4 h-3 w-80 max-w-full rounded-full bg-white/[.06]" />
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="dark-panel h-28 rounded-2xl" />
          ))}
        </div>
        <div className="dark-panel mt-5 h-64 rounded-2xl" />
      </main>
      <LoadingOverlay title={title} description={description} />
    </div>
  );
}
