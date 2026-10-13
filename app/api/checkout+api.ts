import { db, VALID_VOUCHERS } from './_db';
import type { Order } from '@/hooks/use-toy-store';

// ─── Helper ───────────────────────────────────────────────────────────────────

function getUserFromToken(request: Request) {
  const token = request.headers.get('x-session-token');
  if (!token) return null;
  return db.sessions[token] ?? null;
}

// ─── POST /api/checkout ───────────────────────────────────────────────────────
// Body: { action: 'voucher', code: string }
//   → validate voucher, returns { success, discountPercent, message }
//
// Body: { action: 'order', customerName, customerPhone, address,
//         paymentMethod, isGiftWrap }
//   → create order from current cart, clear cart
//   → returns { success, order }

export async function POST(request: Request) {
  try {
    const user = getUserFromToken(request);
    const userId = user?.id ?? 'u-demo';

    const body = await request.json();

    // ── Voucher validation ────────────────────────────────────────────────────
    if (body.action === 'voucher') {
      const code = (body.code as string)?.trim().toUpperCase();
      if (!code) {
        return Response.json({
          success: false,
          message: 'Mã voucher không được để trống.',
        });
      }

      const discountPercent = VALID_VOUCHERS[code];
      if (discountPercent !== undefined) {
        return Response.json({
          success: true,
          discountPercent,
          code,
          message: `Áp dụng mã giảm giá ${discountPercent}% thành công! 🎉`,
        });
      }

      return Response.json({
        success: false,
        discountPercent: 0,
        message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn.',
      });
    }

    // ── Place order ───────────────────────────────────────────────────────────
    if (body.action === 'order') {
      const cart = db.carts[userId] ?? [];
      if (cart.length === 0) {
        return Response.json(
          { success: false, error: 'Giỏ hàng đang trống.' },
          { status: 400 }
        );
      }

      const {
        customerName = user?.name ?? 'Khách',
        customerPhone = '0900.000.000',
        address = 'Việt Nam',
        paymentMethod = 'COD',
        isGiftWrap = false,
        discountPercent = 0,
      } = body as {
        customerName?: string;
        customerPhone?: string;
        address?: string;
        paymentMethod?: string;
        isGiftWrap?: boolean;
        discountPercent?: number;
      };

      const cartTotal = cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      const shippingFee = cartTotal >= 300000 ? 0 : 30000;
      const discountAmount = (cartTotal * discountPercent) / 100;
      const total = Math.max(0, cartTotal - discountAmount + shippingFee);

      const now = new Date();
      const createdAt = now.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      let orderId = 'TL-' + (9826 + db.orders.length);
      
      let mysqlOrder = null;
      try {
        const res = await fetch('http://localhost:3001/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName, customerPhone, address, paymentMethod, isGiftWrap,
            items: cart.map(item => ({
              productId: item.product.id,
              quantity: item.quantity,
              price: item.product.price,
            }))
          }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          mysqlOrder = json.data;
          orderId = mysqlOrder.id; // Lấy ID thật từ MySQL
        }
      } catch (e) {
        console.error('Lỗi khi lưu Order xuống MySQL:', e);
      }

      const newOrder: Order = {
        id: orderId,
        customerName,
        customerPhone,
        address,
        items: [...cart],
        total,
        status: 'pending',
        paymentMethod,
        createdAt: mysqlOrder?.createdAt || createdAt,
        isGiftWrap,
      };

      db.orders.unshift(newOrder);
      db.carts[userId] = []; // Clear cart after order

      return Response.json({ success: true, order: newOrder });
    }

    return Response.json({ error: 'Action không hợp lệ.' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Lỗi máy chủ.' }, { status: 500 });
  }
}
