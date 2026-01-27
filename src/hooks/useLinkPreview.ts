// src/hooks/useLinkPreview.ts
"use client";

import { useEffect, useState } from "react";

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

type PreviewCache = Record<string, LinkPreview | null>;

export function useLinkPreview(
  url?: string | null,
  cache?: PreviewCache,
  setCache?: React.Dispatch<React.SetStateAction<PreviewCache>>,
) {
  const [local, setLocal] = useState<LinkPreview | null | undefined>(undefined);

  const cached = url && cache ? cache[url] : undefined;
  const preview = cached !== undefined ? cached : local;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const u = (url || "").trim();
      if (!u) return;

      // Si hay cache compartida y ya existe valor (incluso null), no hagas fetch
      if (cache && cached !== undefined) return;

      // Si NO hay cache compartida, evita refetch con estado local
      if (!cache && local !== undefined) return;

      try {
        const r = await fetch(`/api/link-preview?url=${encodeURIComponent(u)}`);
        const data = await r.json();
        const value = data?.error ? null : (data as LinkPreview);

        if (cancelled) return;

        if (setCache) {
          setCache((prev) => ({ ...prev, [u]: value }));
        } else {
          setLocal(value);
        }
      } catch {
        if (cancelled) return;

        if (setCache) {
          setCache((prev) => ({ ...prev, [u]: null }));
        } else {
          setLocal(null);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return preview; // undefined=cargando, null=sin preview, object=preview
}
