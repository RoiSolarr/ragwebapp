"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import { buttonClass } from "@/components/ui/button";
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
  return <div className="flex items-center gap-3 text-lg font-bold tracking-tight text-white"><span className="brand-mark grid h-9 w-9 place-items-center rounded-xl text-xl font-black">N</span><span>{SITE.name}</span></div>;
}

function isActiveRoute(pathname: string, href: string, label: string) {
  if (label === "Chat") return pathname === "/chat";
  if (href === "/workspaces") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ variant = "marketing" }: SiteHeaderProps) {
  const pathname = usePathname();
  if (variant === "app") return <aside className="app-sidebar fixed inset-y-0 left-0 z-20 flex w-[278px] flex-col px-5 py-7"><Brand /><nav className="mt-12 space-y-2">{navItems.map(([icon, label, href]) => { const active = isActiveRoute(pathname, href, label); return <Link key={label} href={href} className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all ${active ? "bg-gradient-to-r from-[#4c43ce] to-[#332a9b] text-white shadow-[0_8px_22px_rgba(74,67,220,.28)]" : "text-ink-muted hover:bg-white/[.06] hover:text-white"}`}><span className="w-5 shrink-0 text-center text-lg text-[#a4b8ff]">{icon}</span><span className="truncate">{label}</span></Link>; })}</nav><div className="mt-auto flex items-center justify-between border-t border-line pt-4"><form action={signOut}><button className="text-xs font-semibold text-signal hover:text-white" type="submit">Log out</button></form></div></aside>;
  return <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8"><Brand />{variant === "marketing" && <nav className="flex items-center gap-2 sm:gap-4"><Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:text-white">Sign in</Link><Link href="/signup" className={buttonClass({ size: "sm", className: "gradient-button border-0" })}>Get started <span aria-hidden>↗</span></Link></nav>}</header>;
}
