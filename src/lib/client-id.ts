const CLIENT_ID_KEY = "the-digest-client-id";
const CLIENT_ID_COOKIE = "the_digest_client_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function randomFallbackId(): string {
  return `client_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function persistCookie(clientId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CLIENT_ID_COOKIE}=${clientId}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "anonymous";

  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing && existing.trim().length > 0) {
      persistCookie(existing);
      return existing;
    }

    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : randomFallbackId();

    localStorage.setItem(CLIENT_ID_KEY, generated);
    persistCookie(generated);
    return generated;
  } catch {
    const fallback = randomFallbackId();
    persistCookie(fallback);
    return fallback;
  }
}
