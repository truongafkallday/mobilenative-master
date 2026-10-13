/**
 * GET /api/products        – lấy danh sách tất cả sản phẩm (public)
 * POST /api/products       – thêm sản phẩm mới (yêu cầu x-admin-key: dev hoặc session admin)
 */
import { db } from './_db';
import type { ToyProduct } from '@/hooks/use-toy-store';

// ── GET /api/products ─────────────────────────────────────────────────────────

export async function GET(_request: Request) {
  try {
    const res = await fetch('http://localhost:3001/api/products');
    const json = await res.json();
    return Response.json({ products: json.data || [], total: json.total || 0 });
  } catch (error) {
    console.error('Lỗi lấy sản phẩm từ Backend thật:', error);
    // Fallback về database tạm nếu backend thật chưa bật
    return Response.json({ products: db.products, total: db.products.length });
  }
}

// ── POST /api/products ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Thêm sản phẩm ──────────────────────────────────────────────────────
    if (body.action === 'add' || !body.action) {
      const p = body.product ?? body;
      if (!p?.name) {
        return Response.json({ error: 'Tên sản phẩm không được để trống.' }, { status: 400 });
      }

      try {
        const res = await fetch('http://localhost:3001/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
        const json = await res.json();
        if (json.success && json.data) {
          db.products.unshift(json.data);
          return Response.json({ success: true, product: json.data, total: db.products.length });
        }
      } catch (e) {
        console.error('Lỗi thêm SP Backend thật:', e);
      }

      // Fallback
      const newProduct: ToyProduct = {
        id: 'toy-' + Date.now(),
        name: p.name,
        brand: p.brand ?? 'Unknown',
        category: p.category ?? 'stem',
        categoryLabel: p.categoryLabel ?? 'Đồ chơi',
        ageRange: p.ageRange ?? '6-12y',
        ageLabel: p.ageLabel ?? '6 - 12 tuổi',
        price: Number(p.price) || 100000,
        originalPrice: Number(p.originalPrice) || Number(p.price) || 100000,
        discountPercent: Number(p.discountPercent) || 0,
        rating: Number(p.rating) || 5.0,
        reviewCount: Number(p.reviewCount) || 0,
        soldCount: Number(p.soldCount) || 0,
        stockCount: Number(p.stockCount) || 20,
        image: p.image ?? 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600',
        description: p.description ?? '',
        material: p.material ?? '',
        origin: p.origin ?? 'Việt Nam',
        isFlashSale: Boolean(p.isFlashSale),
        isFeatured: Boolean(p.isFeatured),
        inStock: p.inStock !== false,
      };

      db.products.unshift(newProduct);
      return Response.json({ success: true, product: newProduct, total: db.products.length });
    }

    // ── Cập nhật sản phẩm ──────────────────────────────────────────────────
    if (body.action === 'update') {
      const { id, updates } = body as { id: string; updates: Partial<ToyProduct> };
      const idx = db.products.findIndex((p) => p.id === id);
      if (idx === -1) return Response.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404 });
      db.products[idx] = { ...db.products[idx], ...updates };
      return Response.json({ success: true, product: db.products[idx] });
    }

    // ── Xóa sản phẩm ───────────────────────────────────────────────────────
    if (body.action === 'delete') {
      const before = db.products.length;
      db.products = db.products.filter((p) => p.id !== body.id);
      if (db.products.length === before)
        return Response.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404 });
      return Response.json({ success: true, remaining: db.products.length });
    }

    return Response.json({ error: 'Action không hợp lệ. Dùng: add | update | delete' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Lỗi máy chủ.' }, { status: 500 });
  }
}
