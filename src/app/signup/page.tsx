"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { SiteHeader } from "@/components/site-header";
import { Spinner } from "@/components/ui/spinner";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const { data, error: signUpError } = await createClient().auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    if (data.session) {
      router.push("/workspaces");
      router.refresh();
      return;
    }

    setMessage("Account created. Check your email to confirm your account, then sign in.");
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#061229]">
      <SiteHeader variant="minimal" />
      <main className="mx-auto grid min-h-[calc(100vh-90px)] max-w-7xl items-center gap-16 px-5 pb-12 sm:px-8 lg:grid-cols-[minmax(420px,510px)_1fr]">
        <section className="neon-glow reveal rounded-2xl border border-[#223663] bg-[#091532]/90 p-7 sm:p-10">
          <div className="text-center">
            <span className="brand-mark mx-auto grid h-12 w-12 place-items-center rounded-2xl text-2xl font-black">
              N
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Create your account</h1>
            <p className="mt-2 text-sm text-ink-muted">Build your personal AI-powered knowledge base.</p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-white">
              Email address
              <input
                className="mt-2 h-12 w-full rounded-xl border border-[#29416f] bg-[#0a1836] px-4 text-sm outline-none focus:border-[#6675ff]"
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-white">
              Password
              <input
                className="mt-2 h-12 w-full rounded-xl border border-[#29416f] bg-[#0a1836] px-4 text-sm outline-none focus:border-[#6675ff]"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>

            <label className="block text-sm font-semibold text-white">
              Confirm password
              <input
                className="mt-2 h-12 w-full rounded-xl border border-[#29416f] bg-[#0a1836] px-4 text-sm outline-none focus:border-[#6675ff]"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
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
              className="gradient-button flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Creating account…
                </>
              ) : (
                <>Create account&nbsp;&nbsp;→</>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-ink-muted">
            Already have an account?{" "}
            <Link className="font-semibold text-[#7f74ff]" href="/login">
              Sign in →
            </Link>
          </p>
        </section>

        <section className="hidden lg:block">
          <div className="mx-auto max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[.24em] text-[#55cfff]">
              Your knowledge layer
            </p>
            <h2 className="mt-5 text-5xl font-bold leading-tight text-white">
              Everything you know,
              <br />
              <span className="text-[#8566ff]">finally connected.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-8 text-ink-muted">
              Bring your documents together, ask better questions, and turn scattered
              information into clear next steps.
            </p>
            <div className="mt-12 space-y-4">
              <div className="dark-panel flex items-center gap-4 rounded-2xl p-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#1b2d76] text-xl text-[#55cfff]">
                  ✦
                </span>
                <div>
                  <b className="text-white">Grounded answers</b>
                  <p className="text-sm text-ink-muted">Citations linked to your source material.</p>
                </div>
              </div>
              <div className="dark-panel flex items-center gap-4 rounded-2xl p-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#1b2d76] text-xl text-[#8f76ff]">
                  ▤
                </span>
                <div>
                  <b className="text-white">One focused workspace</b>
                  <p className="text-sm text-ink-muted">Organize, search, and share your knowledge.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}