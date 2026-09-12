"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProfileFormState = { error?: string; success?: boolean };
const initialState: ProfileFormState = {};

export function ProfileForm({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState<ProfileFormState, FormData>(updateProfile, initialState);
  return <form action={formAction} className="space-y-5"><label className="block text-sm font-semibold text-ink">Email<Input className="mt-2 bg-paper-raised" type="email" value={email} readOnly aria-readonly="true" /><span className="mt-1.5 block text-xs font-normal text-ink-muted">Your sign-in email cannot be changed here.</span></label><label className="block text-sm font-semibold text-ink">Password<Input className="mt-2" name="password" type="password" minLength={6} placeholder="At least 6 characters" autoComplete="new-password" required /></label><label className="block text-sm font-semibold text-ink">Confirm Password<Input className="mt-2" name="confirmPassword" type="password" minLength={6} placeholder="Re-enter your password" autoComplete="new-password" required /></label>{state.error ? <p role="alert" className="rounded-xl border border-signal/25 bg-signal/10 px-3.5 py-3 text-sm text-signal">{state.error}</p> : null}{state.success ? <p role="status" className="rounded-xl border border-indigo/20 bg-mint px-3.5 py-3 text-sm text-indigo">Password updated.</p> : null}<Button type="submit" disabled={isPending} className="bg-gradient-to-r from-[#4c43ce] to-[#35d7ff] text-white shadow-[0_8px_20px_rgba(53,215,255,.18)] hover:bg-gradient-to-r hover:from-[#5c53e0] hover:to-[#55ddff]">{isPending ? "Updating…" : "Update password"}</Button></form>;
}
