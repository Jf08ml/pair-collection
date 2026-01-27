/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

function decodeHtml(s: string | null) {
  if (!s) return s;
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function pickMeta(html: string, prop: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  return html.match(re)?.[1]?.trim() ?? null;
}

function safeUrl(url: string) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u;
  } catch {
    return null;
  }
}

async function tryTikTokOEmbed(url: string) {
  try {
    const r = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; PairCollectionPreview/1.0)",
          accept: "application/json,text/plain,*/*",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!r.ok) return null;

    const data: any = await r.json();

    return {
      url,
      title: decodeHtml(data?.title ?? null),
      description: null,
      image: decodeHtml(data?.thumbnail_url ?? null),
      siteName: "TikTok",
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  const safe = safeUrl(url);

  if (!safe) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const safeStr = safe.toString();
  const host = safe.hostname.replace(/^www\./, "").toLowerCase();

  // ✅ TikTok: oEmbed primero (más confiable que parsear HTML)
  if (host.endsWith("tiktok.com")) {
    const oembed = await tryTikTokOEmbed(safeStr);
    if (oembed) return NextResponse.json(oembed);
    // si falla, cae al flujo normal
  }

  try {
    const res = await fetch(safeStr, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; PairCollectionPreview/1.0; +https://example.com)",
        accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 3600 },
    });

    const html = await res.text();

    const ogTitle = decodeHtml(pickMeta(html, "og:title"));
    const ogDesc = decodeHtml(pickMeta(html, "og:description"));
    const ogImage = decodeHtml(pickMeta(html, "og:image"));
    const siteName = decodeHtml(pickMeta(html, "og:site_name"));

    const titleTag =
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;

    return NextResponse.json({
      url: safeStr,
      title: ogTitle || titleTag,
      description: ogDesc,
      image: ogImage,
      siteName,
    });
  } catch {
    return NextResponse.json(
      { url: safeStr, title: null, description: null, image: null, siteName: null },
      { status: 200 }
    );
  }
}
