import { db } from './_db';
import type { User } from '@/hooks/use-toy-store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getUserIdFromRequest(request: Request): string | null {
  const token = request.headers.get('x-session-token');
  if (!token) return null;
  const user = db.sessions[token];
  return user ? user.id : null;
}

// ─── GET /api/auth/session ────────────────────────────────────────────────────
// Returns the current logged-in user based on the session token header.

export async function GET(request: Request) {
  const token = request.headers.get('x-session-token');
  if (!token || !db.sessions[token]) {
    return Response.json({ user: null }, { status: 200 });
  }
  return Response.json({ user: db.sessions[token] });
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { email, role?, name?, kidName? }
// Returns: { token, user }

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // Handle logout
    if (action === 'logout') {
      const token = request.headers.get('x-session-token');
      if (token && db.sessions[token]) {
        delete db.sessions[token];
      }
      return Response.json({ success: true, message: 'Đã đăng xuất.' });
    }

    // Default: login
    const body = await request.json();
    const {
      email,
      role = 'customer',
      name,
      kidName = 'Bé Yêu',
    } = body as {
      email: string;
      role?: 'customer' | 'admin';
      name?: string;
      kidName?: string;
    };

    if (!email || !email.trim()) {
      return Response.json({ error: 'Email không được để trống.' }, { status: 400 });
    }

    const resolvedName =
      name?.trim() ||
      (role === 'admin' ? 'Quản Trị Viên ToyLand' : 'Nguyễn Văn Minh');

    const user: User = {
      id: 'u-' + Date.now(),
      name: resolvedName,
      email: email.trim(),
      role,
      kidName: kidName?.trim() || 'Bé Yêu',
      kidBirthday: '15/10/2020',
      points: role === 'admin' ? 9999 : 1450,
    };

    // Create session
    const token = generateToken();
    db.sessions[token] = user;

    // Ensure cart exists for user
    if (!db.carts[user.id]) {
      if (user.id === 'u-demo') {
        // keep demo cart
      } else {
        db.carts[user.id] = [];
      }
    }

    return Response.json({ token, user });
  } catch {
    return Response.json({ error: 'Lỗi máy chủ.' }, { status: 500 });
  }
}
