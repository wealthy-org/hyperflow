"use client";

import { useEffect } from "react";
import { initLanding } from "@/lib/landing-effects";

export function LandingEffects() {
  useEffect(() => initLanding(), []);
  return null;
}
