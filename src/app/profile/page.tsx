import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { ProfileForm } from "@/components/account/profile-form";
import { buttonClass } from "@/components/ui/button";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="min-h-screen bg-paper"><SiteHeader variant="app" /><main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-6 sm:px-6 sm:pt-10"><Link className={buttonClass({ variant: "ghost", size: "sm", className: "-ml-3" })} href="/workspaces"><span aria-hidden="true">←</span> Dashboard</Link><section className="reveal mt-8 rounded-[1.5rem] border border-line bg-paper-raised p-6 shadow-[0_12px_30px_rgba(19,44,58,.08)] sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo">Account</p><h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-.03em] text-ink">Account security</h1><p className="mt-3 max-w-lg text-sm leading-6 text-ink-muted">Update the password used to sign in to your NexaBase account.</p><div className="mt-8 border-t border-line pt-8"><ProfileForm email={user.email ?? ""} /></div></section></main></div>;
}
