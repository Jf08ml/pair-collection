import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const url = String(form.get("url") || "");
  const title = String(form.get("title") || "");
  const text = String(form.get("text") || "");

  const redirectUrl =
    `/` +
    `?sharedUrl=${encodeURIComponent(url)}` +
    `&sharedTitle=${encodeURIComponent(title)}` +
    `&sharedText=${encodeURIComponent(text)}`;

  return NextResponse.redirect(new URL(redirectUrl, req.url), 303);
}
