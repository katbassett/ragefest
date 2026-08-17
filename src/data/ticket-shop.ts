/**
 * Ticket shop embed.
 *
 * Staging currently uses pretix’s public demo so we can design the widget
 * before Loop1 goes live. Switch `useDemoShop` to false before launch.
 */
export const useDemoShop = true;

const LOOP1_EVENT = "https://loop1tickets.com/Ragefest/Ragefest2027/";
const DEMO_EVENT = "https://pretix.eu/demo/democon/";

export const ticketShop = useDemoShop
  ? {
      eventUrl: DEMO_EVENT,
      cssUrl: "https://pretix.eu/demo/democon/widget/v2.css",
      jsUrl: "https://pretix.eu/widget/v2.en.js",
      productListUrl: `${DEMO_EVENT}widget/product_list`,
    }
  : {
      eventUrl: LOOP1_EVENT,
      cssUrl: `${LOOP1_EVENT}widget/v1.css`,
      jsUrl: "https://loop1tickets.com/widget/v1.en.js",
      productListUrl: `${LOOP1_EVENT}widget/product_list`,
    };
