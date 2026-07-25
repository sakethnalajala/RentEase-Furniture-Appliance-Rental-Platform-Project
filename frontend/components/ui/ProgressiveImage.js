'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';

// Product metadata (name/price/etc.) is already in hand the moment the API responds — only
// the image bytes are slow. This renders the card immediately and keeps a skeleton over just
// the image area until it finishes loading, with the browser deferring the fetch itself
// (`loading="lazy"`) until the card scrolls near the viewport — so 1000+ product images never
// compete for bandwidth at once, but the data behind them is never blocked on images at all.
export default function ProgressiveImage({ src, alt, className = '', imgClassName = '' }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5 ${className}`}>
        <ImageOff size={28} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <div className="skeleton absolute inset-0" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
      />
    </div>
  );
}
