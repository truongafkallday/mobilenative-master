import { db } from './_db';
import type { CartItem, ToyProduct } from '@/hooks/use-toy-store';

// ─── Helper ───────────────────────────────────────────────────────────────────

function getUserFromToken(request: Request) {
  const token = request.headers.get('x-session-token');
  if (!token) return null;
  return db.sessions[token] ?? null;
}

// ─── GET /api/cart ────────────────────────────────────────────────────────────
// Returns the cart items for the current user.

export async function GET(request: Request) {
  const user = getUserFromToken(request);
  const userId = user?.id ?? 'u-demo';

  const cart: CartItem[] = db.carts[userId] ?? [];
  return Response.json({ cart });
}

// ─── POST /api/cart ───────────────────────────────────────────────────────────
// Body: { product: ToyProduct, quantity?: number }  → add/update item
// Body: { action: 'remove', productId: string }      → remove item
// Body: { action: 'clear' }                          → clear cart
// Body: { action: 'updateQuantity', productId, quantity } → set quantity

export async function POST(request: Request) {
  try {
    const user = getUserFromToken(request);
    const userId = user?.id ?? 'u-demo';

    if (!db.carts[userId]) {
      db.carts[userId] = [];
    }

    const body = await request.json();

    // Clear cart
    if (body.action === 'clear') {
      db.carts[userId] = [];
      return Response.json({ cart: [] });
    }

    // Remove single item
    if (body.action === 'remove') {
      const { productId } = body as { productId: string };
      db.carts[userId] = db.carts[userId].filter(
        (item) => item.product.id !== productId
      );
      return Response.json({ cart: db.carts[userId] });
    }

    // Update quantity
    if (body.action === 'updateQuantity') {
      const { productId, quantity } = body as {
        productId: string;
        quantity: number;
      };
      if (quantity <= 0) {
        db.carts[userId] = db.carts[userId].filter(
          (item) => item.product.id !== productId
        );
      } else {
        db.carts[userId] = db.carts[userId].map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        );
      }
      return Response.json({ cart: db.carts[userId] });
    }

    // Add to cart (default)
    const { product, quantity = 1 } = body as {
      product: ToyProduct;
      quantity?: number;
    };

    if (!product?.id) {
      return Response.json({ error: 'Thiếu thông tin sản phẩm.' }, { status: 400 });
    }

    const existing = db.carts[userId].find(
      (item) => item.product.id === product.id
    );
    if (existing) {
      db.carts[userId] = db.carts[userId].map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      db.carts[userId].push({ product, quantity });
    }

    return Response.json({ cart: db.carts[userId] });
  } catch {
    return Response.json({ error: 'Lỗi máy chủ.' }, { status: 500 });
  }
}
