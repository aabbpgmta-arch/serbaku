import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

// Pasang sekali di root: simpan UTM/referrer pengunjung saat landing.
export function AttributionCapture() {
  useEffect(() => { captureAttribution(); }, []);
  return null;
}
