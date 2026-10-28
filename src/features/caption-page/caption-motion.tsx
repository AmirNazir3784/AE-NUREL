"use client";
import { useEffect } from "react";

export function CaptionMotion() {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>(".cap-reveal");
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("cap-entered"); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    items.forEach(item => { item.classList.add("cap-will-reveal"); observer.observe(item); });
    return () => { observer.disconnect(); items.forEach(item => item.classList.remove("cap-will-reveal")); };
  }, []);
  return null;
}
