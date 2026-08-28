import { foundingAccessItemId, ticketShop } from "../data/ticket-shop";
import { pushDataLayer } from "./gtm";
import { submitWaitlistEmail } from "./waitlist";

const PURCHASE_TRACKED_PREFIX = "rf-purchase-tracked:";
const FOUNDING_ACCESS_NAME = "Founding Access";
const DEFAULT_CURRENCY = "USD";
/** Gross-ish default for Founding Access when Loop1 does not pass a total. */
const DEFAULT_FOUNDING_VALUE = 63.87;

export type PurchaseParams = {
  orderCode?: string;
  email?: string;
  error?: string;
  value?: number;
  currency?: string;
  itemId?: string;
  itemName?: string;
};

const readParam = (params: URLSearchParams, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
};

const readNumber = (params: URLSearchParams, keys: string[]): number | undefined => {
  const raw = readParam(params, keys);
  if (!raw) return undefined;

  const parsed = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parsePurchaseParams = (search: string): PurchaseParams => {
  const params = new URLSearchParams(search);

  return {
    orderCode: readParam(params, ["order", "code", "order_code"]),
    email: readParam(params, ["email", "buyer_email"]),
    error: readParam(params, ["error", "payment_error"]),
    value: readNumber(params, ["total", "value", "amount"]),
    currency: readParam(params, ["currency"]) || DEFAULT_CURRENCY,
    itemId: readParam(params, ["item", "item_id"]) || foundingAccessItemId,
    itemName: readParam(params, ["item_name"]) || FOUNDING_ACCESS_NAME,
  };
};

const purchaseDedupeKey = (params: PurchaseParams): string =>
  params.orderCode || params.email || "unknown";

export const trackTicketPurchase = (params: PurchaseParams): boolean => {
  if (params.error) return false;

  const dedupeKey = `${PURCHASE_TRACKED_PREFIX}${purchaseDedupeKey(params)}`;

  try {
    if (sessionStorage.getItem(dedupeKey) === "1") return false;
    sessionStorage.setItem(dedupeKey, "1");
  } catch {
    /* sessionStorage unavailable */
  }

  const value = params.value ?? DEFAULT_FOUNDING_VALUE;
  const transactionId =
    params.orderCode || `founding-${Date.now().toString(36)}`;

  pushDataLayer({ ecommerce: null });

  pushDataLayer({
    event: "ticket_purchase",
    purchase_source: "ragefest_site",
    order_code: params.orderCode || null,
    ticket_item_id: params.itemId || foundingAccessItemId,
    ticket_item_name: params.itemName || FOUNDING_ACCESS_NAME,
    ticket_shop_event: ticketShop.eventUrl,
  });

  pushDataLayer({
    event: "purchase",
    ecommerce: {
      transaction_id: transactionId,
      value,
      currency: params.currency || DEFAULT_CURRENCY,
      items: [
        {
          item_id: params.itemId || foundingAccessItemId,
          item_name: params.itemName || FOUNDING_ACCESS_NAME,
          price: value,
          quantity: 1,
        },
      ],
    },
  });

  return true;
};

export const handlePostPurchase = async (
  params: PurchaseParams,
): Promise<{ tracked: boolean; addedToSignal: boolean }> => {
  if (params.error) {
    return { tracked: false, addedToSignal: false };
  }

  const tracked = trackTicketPurchase(params);
  let addedToSignal = false;

  if (params.email) {
    const result = await submitWaitlistEmail(params.email, "purchase");
    addedToSignal = result.ok;
  }

  return { tracked, addedToSignal };
};

const TRUSTED_ORIGINS = ["loop1tickets.com", "pretix.eu"];

export const initTicketWidgetTracking = (): void => {
  if (typeof window === "undefined") return;

  const existing = window.pretixWidgetCallback;
  window.pretixWidgetCallback = function pretixWidgetCallback() {
    existing?.();

    if (!window.PretixWidget) return;

    window.PretixWidget.addCloseListener(() => {
      pushDataLayer({
        event: "ticket_checkout_closed",
        purchase_source: "ragefest_widget",
      });
    });
  };

  window.addEventListener("message", (event: MessageEvent) => {
    const origin = event.origin || "";
    if (!TRUSTED_ORIGINS.some((host) => origin.includes(host))) return;

    const payload =
      typeof event.data === "string"
        ? (() => {
            try {
              return JSON.parse(event.data) as Record<string, unknown>;
            } catch {
              return null;
            }
          })()
        : (event.data as Record<string, unknown> | null);

    if (!payload || typeof payload !== "object") return;

    const action = String(payload.action || payload.event || payload.type || "");

    if (
      action.includes("order.placed") ||
      action.includes("order.paid") ||
      action.includes("purchase")
    ) {
      pushDataLayer({
        event: "ticket_purchase",
        purchase_source: "ragefest_widget_postmessage",
        order_code: payload.code || payload.order || null,
      });
    }
  });
};

declare global {
  interface Window {
    pretixWidgetCallback?: () => void;
    PretixWidget?: {
      addCloseListener: (callback: () => void) => void;
      addLoadListener: (callback: () => void) => void;
    };
  }
}
