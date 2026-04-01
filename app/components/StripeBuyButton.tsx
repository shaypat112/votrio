"use client";

import { useEffect, useRef } from "react";

export default function StripeBuyButton({
  buyButtonId,
  publishableKey,
  className,
}: {
  buyButtonId: string;
  publishableKey: string;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Ensure stripe script is loaded
    const scriptId = "stripe-buy-button-script";
    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.async = true;
      s.src = "https://js.stripe.com/v3/buy-button.js";
      document.body.appendChild(s);
    }

    // Create the custom element and append
    const el = document.createElement("stripe-buy-button");
    el.setAttribute("buy-button-id", buyButtonId);
    el.setAttribute("publishable-key", publishableKey);
    if (className) el.setAttribute("class", className);

    mountRef.current.innerHTML = ""; // clear
    mountRef.current.appendChild(el);

    return () => {
      // clean up
      if (mountRef.current && mountRef.current.contains(el)) {
        mountRef.current.removeChild(el);
      }
    };
  }, [buyButtonId, publishableKey, className]);

  return <div ref={mountRef} />;
}
