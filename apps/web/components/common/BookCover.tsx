"use client";

import { useEffect, useState } from "react";
import type { ImgHTMLAttributes, SyntheticEvent } from "react";

export const DEFAULT_BOOK_COVER = "/generated/default-book-cover.png";

type BookCoverProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
};

export function BookCover({ src, alt, fallbackSrc = DEFAULT_BOOK_COVER, onError, ...props }: BookCoverProps) {
  const requestedSrc = src?.trim() || "";
  const [displaySrc, setDisplaySrc] = useState(fallbackSrc);

  useEffect(() => {
    if (!requestedSrc) {
      setDisplaySrc(fallbackSrc);
      return;
    }

    let cancelled = false;
    setDisplaySrc(fallbackSrc);

    const image = new Image();
    image.onload = () => {
      if (!cancelled) setDisplaySrc(requestedSrc);
    };
    image.onerror = () => {
      if (!cancelled) setDisplaySrc(fallbackSrc);
    };
    image.src = requestedSrc;

    return () => {
      cancelled = true;
    };
  }, [requestedSrc, fallbackSrc]);

  function handleError(event: SyntheticEvent<HTMLImageElement, Event>) {
    onError?.(event);
    setDisplaySrc(fallbackSrc);
  }

  return <img {...props} src={displaySrc} alt={alt} onError={handleError} />;
}
