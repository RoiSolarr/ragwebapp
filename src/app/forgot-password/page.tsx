"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { SiteHeader } from "@/components/site-header";
import { Spinner } from "@/components/ui/spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("If an account exists for this email, a reset link is on its way.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#061229]">
      <SiteHeader variant="minimal" />
      <main className="mx-auto flex min-h-[calc(100vh-90px)] max-w-7xl items-center justify-center px-5 pb-12">
        <section className="neon-glow w-full max-w-[510px] rounded-2xl border border-[#223663] bg-[#091532]/90 p-8 sm:p-10">
          <div className="text-center">
            <span className="brand-mark mx-auto grid h-12 w-12 place-items-center rounded-2xl text-2xl font-black">
              N
            </span>
            <h1 className="mt-5 text-3xl font-bold text-white">Reset your password</h1>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              Enter your email and we&apos;ll send you a secure link to get back into
              NexaBase.
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold text-white">
              Email address
              <input
                className="mt-2 h-12 w-full rounded-xl border border-[#29416f] bg-[#0a1836] px-4 text-sm outline-none focus:border-[#6675ff]"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
              />
            </label>

            {error ? (
              <p role="alert" className="rounded-xl border border-signal/30 bg-signal/10 px-3 py-2 text-sm text-signal">
                {error}
              </p>
            ) : null}

            {message ? (
              <p role="status" className="rounded-xl border border-[#2aa5d0]/30 bg-[#102d5b] px-3 py-2 text-sm text-[#55cfff]">
                {message}
              </p>
            ) : null}

            <button
              className="gradient-button flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Sending…
                </>
              ) : (
                <>Send reset link&nbsp;&nbsp;→</>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-ink-muted">
            <Link href="/login" className="font-semibold text-[#7f74ff]">
              ← Back to sign in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}