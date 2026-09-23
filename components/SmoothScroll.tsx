"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import "lenis/dist/lenis.css";

// Subtle smooth scrolling with Lenis. lerp 0.2 is about twice as responsive
// as Lenis's default (0.1): the page still feels native, just softened.
// Raise it towards 1 for less effect. Touch devices keep native scrolling
// (Lenis's default), and it stays off for people who ask for reduced motion.
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.2, anchors: true, autoRaf: true });
    return () => lenis.destroy();
  }, []);
  return null;
}
