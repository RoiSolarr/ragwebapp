"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";
import { buttonClass } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { signOut } from "@/app/actions/profile-actions";

type SiteHeaderProps = { variant?: "marketing" | "app" | "minimal" };

const navItems = [
  ["⌂", "Dashboard", "/workspaces"],
  ["▣", "Documents", "/documents"],
  ["✧", "Knowledge Base", "/knowledge-base"],
  ["⌕", "Workspace History", "/search"],
  ["▱", "Chat", "/chat"],
  ["⚙", "Account", "/profile"],
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-3 text-lg font-bold tracking-tight text-white">
      <span className="brand-mark grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xl font-black">
        N
      </span>
      <span>{SITE.name}</span>
    </div>
  );
}

function isActiveRoute(pathname: string, href: string, label: string) {
  if (label === "Chat") return pathname === "/chat";
  if (href === "/workspaces") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {navItems.map(([icon, label, href]) => {
        const active = isActiveRoute(pathname, href, label);
        return (
          <Link
            key={label}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              active
                ? "bg-gradient-to-r from-[#4c43ce] to-[#332a9b] text-white shadow-[0_8px_22px_rgba(74,67,220,.28)]"
                : "text-ink-muted hover:bg-white/[.06] hover:text-white"
            }`}
          >
            <span className="w-5 shrink-0 text-center text-lg text-[#a4b8ff]">{icon}</span>
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </>
  );
}

function LogoutForm({ className }: { className?: string }) {
  return (
    <form action={signOut} className={className}>
      <SubmitButton
        className="text-xs font-semibold text-signal hover:text-white"
        pendingChildren="Logging out…"
        spinnerClassName="h-3 w-3"
      >
        Log out
      </SubmitButton>
    </form>
  );
}

function AppSidebar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  // Close the mobile dropdown whenever the route changes, so it never
  // stays open behind whatever page the person just navigated to. This
  // adjusts state during render (comparing against the previous pathname)
  // rather than in an effect, since an effect here would set state
  // unconditionally on every run and trigger an extra render each time.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  // Let Escape close the dropdown too, same as clicking the backdrop.
  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-20 flex w-[278px] flex-col px-5 py-7">
      <div className="flex items-center justify-between gap-3">
        <Brand />
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar-dropdown"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="app-sidebar-toggle hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line text-lg text-white transition hover:border-indigo hover:text-indigo"
        >
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      <nav className="app-sidebar-nav mt-12 space-y-2">
        <NavLinks pathname={pathname} />
      </nav>

      <div className="app-sidebar-footer mt-auto flex items-center justify-between border-t border-line pt-4">
        <LogoutForm />
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-10 bg-black/50"
          />
          <div
            id="app-sidebar-dropdown"
            className="app-sidebar-dropdown absolute left-0 right-0 top-full z-20 border-b border-line bg-paper px-4 pb-4 pt-3 shadow-[0_24px_48px_rgba(0,0,0,.4)]"
          >
            <nav className="space-y-1">
              <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </nav>
            <LogoutForm className="mt-3 border-t border-line pt-3" />
          </div>
        </>
      ) : null}
    </aside>
  );
}

export function SiteHeader({ variant = "marketing" }: SiteHeaderProps) {
  if (variant === "app") return <AppSidebar />;

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
      {variant === "minimal" ? (
        <Link href="/" className="transition-opacity hover:opacity-80" aria-label="Back to homepage">
          <Brand />
        </Link>
      ) : (
        <Brand />
      )}
      {variant === "marketing" ? (
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={buttonClass({ size: "sm", className: "gradient-button border-0" })}
          >
            Get started <span aria-hidden>↗</span>
          </Link>
        </nav>
      ) : null}
    </header>
  );
}