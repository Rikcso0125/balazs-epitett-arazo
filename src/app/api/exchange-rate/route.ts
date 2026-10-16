import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('http://api.napiarfolyam.hu/?valuta=eur&bank=mnb', {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const xml = await res.text();
      const match = xml.match(/<kozep>([\d.,]+)<\/kozep>/i);
      if (match && match[1]) {
        const val = Math.round(parseFloat(match[1].replace(',', '.')));
        if (val > 250 && val < 600) {
          return NextResponse.json({
            rate: val,
            exact: parseFloat(match[1].replace(',', '.')),
            source: 'MNB (napiarfolyam.hu)',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch {
    // Fallback below
  }

  try {
    const res2 = await fetch('https://open.er-api.com/v6/latest/EUR', {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (res2.ok) {
      const data = await res2.json();
      const huf = data?.rates?.HUF;
      if (huf) {
        return NextResponse.json({
          rate: Math.round(huf),
          exact: Number(huf.toFixed(2)),
          source: 'Market EUR/HUF',
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    rate: 400,
    exact: 400.0,
    source: 'Alapértelmezett árfolyam',
    updatedAt: new Date().toISOString(),
  });
}
