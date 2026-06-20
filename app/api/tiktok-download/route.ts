import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'no url' }, { status: 400 });

  const res = await fetch(url);
  const buf = await res.arrayBuffer();

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="tiktok-slide.png"',
    },
  });
}
