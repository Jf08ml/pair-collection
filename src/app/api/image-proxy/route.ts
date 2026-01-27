import { NextResponse } from "next/server";

function safeUrl(url: string) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  const safe = safeUrl(url);
  if (!safe) return NextResponse.json({ error: "Invalid url" }, { status: 400 });

  const res = await fetch(safe, {
    headers: {
      // algunos CDNs reaccionan mejor con referer/ua
      "user-agent": "Mozilla/5.0 (compatible; PairCollectionPreview/1.0)",
      referer: "https://www.instagram.com/",
      accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const bytes = await res.arrayBuffer();

  return new NextResponse(bytes, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=3600",
    },
  });
}
