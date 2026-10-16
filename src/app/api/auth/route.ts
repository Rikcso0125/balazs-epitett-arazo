import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'opensky_auth_session';
const AUTH_COOKIE_VALUE = 'opensky_balazs_0125_authenticated_v1';

function isValidUsername(u: string): boolean {
  const clean = (u || '').trim().toLowerCase();
  return clean === 'balázs0125' || clean === 'balazs0125';
}

function isValidPassword(p: string): boolean {
  return (p || '').trim() === 'Pergola0125';
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token === AUTH_COOKIE_VALUE) {
    return NextResponse.json({
      authenticated: true,
      user: 'Balázs0125',
    });
  }
  return NextResponse.json({
    authenticated: false,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body as {
      username?: string;
      password?: string;
    };

    if (isValidUsername(username || '') && isValidPassword(password || '')) {
      const res = NextResponse.json({
        ok: true,
        authenticated: true,
        user: 'Balázs0125',
      });
      res.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return res;
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Hibás felhasználónév vagy jelszó!',
      },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Érvénytelen kérés.',
      },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, authenticated: false });
  res.cookies.delete(AUTH_COOKIE_NAME);
  return res;
}
