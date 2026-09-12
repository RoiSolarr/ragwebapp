/**
 * Parses a fetch Response as JSON, raising a clear error instead of the
 * cryptic "Unexpected token '<'" that comes from calling response.json() on
 * an HTML page -- which is what you get back if a route 404s (e.g. a
 * newly-added API route the dev server hasn't picked up yet) or a 500
 * error page is served instead of JSON.
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (response.status === 404) {
      throw new Error(
        "That API route returned a 404 page instead of JSON. If you just added or changed it, restart your dev server so it picks up the new route."
      );
    }
    throw new Error(`Unexpected server response (status ${response.status}).`);
  }

  const payload = (await response.json()) as T;

  if (!response.ok) {
    const message = (payload as { error?: string } | null)?.error ?? `Request failed (status ${response.status}).`;
    throw new Error(message);
  }

  return payload;
}