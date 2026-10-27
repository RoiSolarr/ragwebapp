import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for Supabase email links (password reset, signup
 * confirmation). Supabase sends the person back here with a one-time
 * `code`, which is exchanged for a session cookie before redirecting to
 * `next`. Without this step the link lands on a page with no session and
 * just bounces to /login.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  // Only ever redirect within this site, so `next` can't be used to send
  // someone to another domain (e.g. `//evil.com` or `/\evil.com`).
  const nextUrl = new URL(searchParams.get("next") ?? "/workspaces", origin);
  const destination = nextUrl.origin === origin ? nextUrl : new URL("/workspaces", origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination);
    console.error("Auth callback error:", error);
  }

  return NextResponse.redirect(new URL("/login", origin));
}
