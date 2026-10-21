import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RateResult {
  rate: number; // egész Ft, ezzel számol az árazó
  exact: number; // pontos középárfolyam
  source: string;
  rateDate: string | null; // a jegyzés napja (MNB)
  updatedAt: string;
}

// Az MNB naponta egyszer jegyez, 15 perces gyorsítótár bőven elég
const CACHE_MS = 15 * 60 * 1000;
let cached: { at: number; result: RateResult } | null = null;

const isPlausible = (v: number) => v > 250 && v < 600;

function result(exact: number, source: string, rateDate: string | null): RateResult {
  return {
    rate: Math.round(exact),
    exact: Number(exact.toFixed(2)),
    source,
    rateDate,
    updatedAt: new Date().toISOString(),
  };
}

// 1. Hivatalos MNB webszolgáltatás (SOAP): aktuális hivatalos devizaárfolyamok
async function fromMnbSoap(): Promise<RateResult | null> {
  const body =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.mnb.hu/webservices/">' +
    '<soap:Body><web:GetCurrentExchangeRates/></soap:Body></soap:Envelope>';
  const res = await fetch('http://www.mnb.hu/arfolyamok.asmx', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: '"http://www.mnb.hu/webservices/MNBArfolyamServiceSoap/GetCurrentExchangeRates"',
    },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  // A válasz egy escape-elt XML-t tartalmaz: &lt;Rate unit="1" curr="EUR"&gt;363,29000&lt;/Rate&gt;
  const xml = (await res.text()).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const rateMatch = xml.match(/<Rate unit="(\d+)" curr="EUR">([\d.,]+)<\/Rate>/);
  if (!rateMatch) return null;
  const exact = parseFloat(rateMatch[2].replace(',', '.')) / Number(rateMatch[1] || 1);
  if (!isPlausible(exact)) return null;
  const date = xml.match(/<Day date="([\d-]+)">/)?.[1] || null;
  return result(exact, 'MNB hivatalos középárfolyam', date);
}

// 2. napiarfolyam.hu MNB adat
async function fromNapiArfolyam(): Promise<RateResult | null> {
  const res = await fetch('http://api.napiarfolyam.hu/?valuta=eur&bank=mnb', {
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return null;
  const xml = await res.text();
  const match = xml.match(/<kozep>([\d.,]+)<\/kozep>/i);
  if (!match) return null;
  const exact = parseFloat(match[1].replace(',', '.'));
  if (!isPlausible(exact)) return null;
  const date = xml.match(/<datum>([\d.-]+)<\/datum>/i)?.[1] || null;
  return result(exact, 'MNB (napiarfolyam.hu)', date);
}

// 3. Piaci árfolyam, ha az MNB nem elérhető
async function fromMarket(): Promise<RateResult | null> {
  const res = await fetch('https://open.er-api.com/v6/latest/EUR', {
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const huf = Number(data?.rates?.HUF);
  if (!isPlausible(huf)) return null;
  return result(huf, 'Piaci árfolyam (MNB nem elérhető)', null);
}

export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.result);
  }

  for (const source of [fromMnbSoap, fromNapiArfolyam, fromMarket]) {
    try {
      const r = await source();
      if (r) {
        cached = { at: Date.now(), result: r };
        return NextResponse.json(r);
      }
    } catch {
      // következő forrás
    }
  }

  // 4. Végső tartalék: a Beállításokban megadott alapértelmezett árfolyam
  const fallback = Number(getDb().config.defaultEurHufRate) || 400;
  return NextResponse.json(result(fallback, 'Alapértelmezett (Beállítások)', null));
}
