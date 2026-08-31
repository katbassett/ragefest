/**
 * Ticket shop embed.
 *
 * `useDemoShop` points at pretix’s public demo. Keep this false to use Loop1.
 *
 * Post-purchase:
 * - Thank-you page: ticketThankYouUrl
 * - Loop1 admin: enable “Redirection from order page” → that base URL
 * - Webhook: scripts/google-apps-ticket-webhook.js
 */
export const useDemoShop = false;

const LOOP1_EVENT = "https://loop1tickets.com/Ragefest/Ragefest2027/";
const DEMO_EVENT = "https://pretix.eu/demo/democon/";

/** Loop1 item id for the live Founding Access product (not VIP). */
export const foundingAccessItemId = "15751";

/** Loop1 item id for VIP — add when the VIP product is live in Loop1. */
export const vipItemId = undefined as string | undefined;

const SITE_ORIGIN =
  (import.meta.env.PUBLIC_SITE_URL as string | undefined) ||
  "https://ragefestspi.com";

/** Configure Loop1 “Redirection from order page” to this URL. */
export const ticketThankYouUrl = `${SITE_ORIGIN.replace(/\/$/, "")}/tickets/thank-you/`;

/** Used by the Apps Script webhook when fetching order details. */
export const loop1Organizer = "Ragefest";
export const loop1EventSlug = "Ragefest2027";

export const ticketShop = useDemoShop
  ? {
      eventUrl: DEMO_EVENT,
      cssUrl: "https://pretix.eu/demo/democon/widget/v2.css",
      jsUrl: "https://pretix.eu/widget/v2.en.js",
      productListUrl: `${DEMO_EVENT}widget/product_list`,
      foundingAccessItemId,
      vipItemId,
    }
  : {
      eventUrl: LOOP1_EVENT,
      cssUrl: `${LOOP1_EVENT}widget/v1.css`,
      jsUrl: "https://loop1tickets.com/widget/v1.en.js",
      productListUrl: `${LOOP1_EVENT}widget/product_list`,
      foundingAccessItemId,
      vipItemId,
    };
