"use client";

import { useState } from "react";

// Logo della fonte (favicon auto-ospitata) con fallback alle iniziali.
export default function SourceLogo({ src, alt, fallback }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <span className="text-xs font-medium text-lazio-blue dark:text-sky-400">{fallback}</span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="h-full w-full object-cover"
    />
  );
}
