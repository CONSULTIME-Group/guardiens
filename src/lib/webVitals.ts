import type { Metric } from "web-vitals";

/**
 * Lightweight Web Vitals reporter.
 * Logs CLS, LCP, FID, FCP, TTFB to the console in dev,
 * and can be extended to send to an analytics endpoint in prod.
 */
const reportWebVitals = (onPerfEntry?: (metric: Metric) => void) => {
  if (typeof window === "undefined") return;

  import("web-vitals").then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
    const handler = onPerfEntry ?? logMetric;
    onCLS(handler);
    onINP(handler);
    onFCP(handler);
    onLCP(handler);
    onTTFB(handler);
  });
};

function logMetric(metric: Metric) {
  if (import.meta.env.DEV) {
    console.log(`[WebVital] ${metric.name}: ${Math.round(metric.value)}ms (rating: ${metric.rating})`);
  }
  // In production, you can send to an analytics endpoint:
  // navigator.sendBeacon("/api/vitals", JSON.stringify(metric));
}

export default reportWebVitals;
