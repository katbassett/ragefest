declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export const GTM_CONTAINER_ID = "GTM-59JL8WMN";

export const pushDataLayer = (payload: Record<string, unknown>): void => {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
};
