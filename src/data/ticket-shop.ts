/**
 * Ticket shop embed.
 *
 * `useDemoShop` points at pretix’s public demo. Keep this false to use Loop1.
 */
export const useDemoShop = false;

const LOOP1_EVENT = "https://loop1tickets.com/Ragefest/Ragefest2027/";
const DEMO_EVENT = "https://pretix.eu/demo/democon/";

/** Loop1 item id for the live Founding Access product (not VIP). */
export const foundingAccessItemId = "15751";

export const ticketShop = useDemoShop
  ? {
      eventUrl: DEMO_EVENT,
      cssUrl: "https://pretix.eu/demo/democon/widget/v2.css",
      jsUrl: "https://pretix.eu/widget/v2.en.js",
      productListUrl: `${DEMO_EVENT}widget/product_list`,
      foundingAccessItemId: undefined as string | undefined,
    }
  : {
      eventUrl: LOOP1_EVENT,
      cssUrl: `${LOOP1_EVENT}widget/v1.css`,
      jsUrl: "https://loop1tickets.com/widget/v1.en.js",
      productListUrl: `${LOOP1_EVENT}widget/product_list`,
      foundingAccessItemId,
    };
