/**
 * Shared waitlist submission used by the Signal section and the email popup.
 *
 * Each form posts to its own Google Sheet via a separate Apps Script web app
 * so the team can track popup vs on-page signups independently.
 *
 * The Apps Script endpoint answers with a redirect that browsers cannot read
 * cross-origin, so requests go out in `no-cors` mode and a completed request is
 * treated as delivered.
 */

export type WaitlistSource = "signal" | "popup";

const SIGNAL_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzg8d27Er_YUaDhAsDDZGMld9dYLnfndEkL5JRMv22lwvENDpInO5sdIQQJ8e0wLuArdg/exec";

const POPUP_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzwS1Pg8WGDRBJM0KdJZejjwRpBl1ckwZcD2ZgirN9AJQyKo6rdzK03BMc2xHz5NVg6/exec";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getWaitlistEndpoint = (source: WaitlistSource): string => {
  if (source === "popup") {
    return (
      (import.meta.env.PUBLIC_WAITLIST_POPUP_WEBAPP_URL as string | undefined) ||
      POPUP_ENDPOINT
    );
  }

  return (
    (import.meta.env.PUBLIC_WAITLIST_WEBAPP_URL as string | undefined) ||
    SIGNAL_ENDPOINT
  );
};

export const isValidEmail = (value: string): boolean =>
  EMAIL_PATTERN.test(value.trim());

export type WaitlistResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "unconfigured" | "network" };

export const submitWaitlistEmail = async (
  email: string,
  source: WaitlistSource,
): Promise<WaitlistResult> => {
  const cleaned = email.trim();

  if (!isValidEmail(cleaned)) return { ok: false, reason: "invalid" };

  const endpoint = getWaitlistEndpoint(source);
  if (!endpoint) return { ok: false, reason: "unconfigured" };

  try {
    // Apps Script POSTs often hang on a cross-origin redirect. With no-cors we
    // cannot read the result anyway, so cap how long the UI waits while the
    // request keeps finishing in the background.
    const pending = fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        email: cleaned,
        source,
        userAgent: navigator.userAgent,
      }),
    });

    pending.catch(() => {});

    await Promise.race([
      pending,
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 450);
      }),
    ]);

    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
};
