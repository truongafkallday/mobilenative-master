import type { OrderStatus, ToyProduct } from '@/hooks/use-toy-store';
import { db } from './_db';

// ─── Helper ───────────────────────────────────────────────────────────────────

function getUserFromToken(request: Request) {
  const token = request.headers.get('x-session-token');
  if (!token) return null;
  return db.sessions[token] ?? null;
}

function isAdmin(request: Request): boolean {
  // Dev bypass: pass x-admin-key: dev to skip session check during hot-reload
  if (request.headers.get('x-admin-key') === 'dev') return true;
  const user = getUserFromToken(request);
  return user?.role === 'admin';
}

// ─── GET /api/admin ───────────────────────────────────────────────────────────
// ?tab=dashboard  → revenue stats
// ?tab=orders     → all orders
// ?tab=products   → all products

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const tab = url.searchParams.get('tab') ?? 'dashboard';

  // ── Dashboard ─────────────────────────────────────────────────────────────
  if (tab === 'dashboard') {
    try {
      const statsRes = await fetch('http://localhost:3001/api/stats');
      const statsJson = await statsRes.json();
      
      const ordersRes = await fetch('http://localhost:3001/api/orders');
      const ordersJson = await ordersRes.json();
      
      if (statsJson.success && ordersJson.success) {
        const stats = statsJson.data;
        
        const getStatusCount = (status: string) => {
          const s = stats.ordersByStatus.find((o: any) => o.status === status);
          return s ? s.count : 0;
        };

        const mappedRecentOrders = (ordersJson.data || []).slice(0, 5).map((o: any) => ({
          ...o,
          total: o.totalAmount,
          status: String(o.status).toLowerCase(),
          createdAt: new Date(o.createdAt).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        }));

        return Response.json({
          totalRevenue: stats.totalRevenue,
          totalOrders: stats.totalOrders,
          pendingOrders: getStatusCount('PENDING'),
          packingOrders: getStatusCount('PACKING'),
          shippingOrders: getStatusCount('SHIPPING'),
          totalProducts: stats.totalProducts,
          lowStockProducts: db.products.filter((p) => (p.stockCount ?? 0) < 10).length, // Dùng tạm memory cho chi tiết
          totalSoldUnits: db.products.reduce((sum, p) => sum + (p.soldCount ?? 0), 0),
          recentOrders: mappedRecentOrders,
        });
      }
    } catch (e) {
      console.error('Lỗi lấy Dashboard từ MySQL:', e);
    }
    
    // Fallback:
    const completedOrders = db.orders.filter((o) => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = db.orders.length;
    const pendingOrders = db.orders.filter((o) => o.status === 'pending').length;
    const packingOrders = db.orders.filter((o) => o.status === 'packing').length;
    const shippingOrders = db.orders.filter((o) => o.status === 'shipping').length;
    const totalProducts = db.products.length;
    const lowStockProducts = db.products.filter((p) => (p.stockCount ?? 0) < 10).length;
    const totalSoldUnits = db.products.reduce((sum, p) => sum + (p.soldCount ?? 0), 0);
    const recentOrders = db.orders.slice(0, 5);

    return Response.json({
      totalRevenue, totalOrders, pendingOrders, packingOrders, shippingOrders,
      totalProducts, lowStockProducts, totalSoldUnits, recentOrders,
    });
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  if (tab === 'orders') {
    try {
      const res = await fetch('http://localhost:3001/api/orders');
      const json = await res.json();
      if (json.success && json.data) {
        // Map data MySQL sang format Frontend
        const mappedOrders = json.data.map((o: any) => ({
          ...o,
          total: o.totalAmount, // Frontend dùng `total`
          status: String(o.status).toLowerCase(), // Frontend dùng chữ thường
          createdAt: new Date(o.createdAt).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        }));
        return Response.json({ orders: mappedOrders });
      }
    } catch (e) {
      console.error('Lỗi lấy Orders MySQL:', e);
    }
    return Response.json({ orders: db.orders });
  }
  // ── Products ──────────────────────────────────────────────────────────────
  if (tab === 'products') {
    return Response.json({ products: db.products });
  }

  return Response.json({ error: 'Tab không hợp lệ.' }, { status: 400 });
}

// ─── POST /api/admin ──────────────────────────────────────────────────────────
// Body: { action: 'addProduct', product: Omit<ToyProduct,'id'> }
// Body: { action: 'updateProduct', id, updates: Partial<ToyProduct> }
// Body: { action: 'deleteProduct', id }
// Body: { action: 'updateOrderStatus', orderId, status: OrderStatus }

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // ── Add product ───────────────────────────────────────────────────────────
    if (body.action === 'addProduct') {
      const product = body.product as Omit<ToyProduct, 'id'>;
      if (!product?.name) {
        return Response.json({ error: 'Tên sản phẩm không được để trống.' }, { status: 400 });
      }

      try {
        // Gửi lên Backend MySQL thật
        const res = await fetch('http://localhost:3001/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        });
        const json = await res.json();
        
        if (json.success && json.data) {
          // Lưu vào db tạm trong RAM luôn để giao diện admin & giỏ hàng không bị lỗi (nếu chúng vẫn dùng db tạm)
          db.products.unshift(json.data);
          return Response.json({ success: true, product: json.data });
        } else {
          return Response.json({ error: json.error || 'Lỗi thêm SP' }, { status: 400 });
        }
      } catch (err) {
        // Fallback khi backend thật chết
        const newProduct: ToyProduct = {
          ...product,
          id: 'toy-' + Date.now(),
          rating: product.rating ?? 5.0,
          reviewCount: product.reviewCount ?? 1,
          soldCount: product.soldCount ?? 0,
          stockCount: product.stockCount ?? 20,
          discountPercent: product.discountPercent ?? 0,
        };
        db.products.unshift(newProduct);
        return Response.json({ success: true, product: newProduct });
      }
    }

    // ── Update product ────────────────────────────────────────────────────────
    if (body.action === 'updateProduct') {
      const { id, updates } = body as { id: string; updates: Partial<ToyProduct> };
      
      try {
        await fetch(`http://localhost:3001/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.error('Lỗi khi update SP lên MySQL', err);
      }

      const idx = db.products.findIndex((p) => p.id === id);
      if (idx === -1) {
        return Response.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404 });
      }
      db.products[idx] = { ...db.products[idx], ...updates };
      return Response.json({ success: true, product: db.products[idx] });
    }

    // ── Delete product ────────────────────────────────────────────────────────
    if (body.action === 'deleteProduct') {
      const { id } = body as { id: string };
      
      try {
        await fetch(`http://localhost:3001/api/products/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Lỗi khi xóa SP trên MySQL', err);
      }

      const before = db.products.length;
      db.products = db.products.filter((p) => p.id !== id);
      if (db.products.length === before) {
        return Response.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404 });
      }
      return Response.json({ success: true });
    }

    // ── Update order status ───────────────────────────────────────────────────
    if (body.action === 'updateOrderStatus') {
      const { orderId, status } = body as { orderId: string; status: OrderStatus };
      
      try {
        await fetch(`http://localhost:3001/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: String(status).toUpperCase() })
        });
      } catch (err) {
        console.error('Lỗi khi update status order lên MySQL', err);
      }

      const idx = db.orders.findIndex((o) => o.id === orderId);
      if (idx === -1) {
        return Response.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
      }
      db.orders[idx] = { ...db.orders[idx], status };
      return Response.json({ success: true, order: db.orders[idx] });
    }

    return Response.json({ error: 'Action không hợp lệ.' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Lỗi máy chủ.' }, { status: 500 });
  }
}
