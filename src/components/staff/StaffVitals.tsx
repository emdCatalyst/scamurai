"use client";

import { useReportWebVitals } from "next/web-vitals";
import { sendTelemetry } from "@/lib/telemetry";

/** Page speed as the worker's own phone experiences it (LCP, INP, CLS…), sent to the logs. */
export default function StaffVitals() {
  useReportWebVitals((metric) => {
    sendTelemetry({ type: "vitals", name: metric.name, value: metric.value, rating: metric.rating });
  });
  return null;
}
