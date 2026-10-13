import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ensureFullSeedData } from './seed';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Password helper using Node.js crypto
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSession(userId: string): Promise<string> {
  const token = 'tk_' + crypto.randomBytes(24).toString('hex');
  await prisma.authSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    },
  });
  return token;
}

function getSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '') || req.headers['x-session-token'];
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

async function getAuthenticatedUser(req: Request) {
  const token = getSessionToken(req);
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { userId: true, expiresAt: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.authSession.delete({ where: { tokenHash: hashSessionToken(token) } });
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });
}

async function ensureDefaultAccounts() {
  try {
    // 1. Ensure Single Supreme Admin Account
    const adminEmail = 'admin@toyverse.vn';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashPassword('admin123'),
          name: 'Quản Trị Viên ToyVerse',
          role: 'ADMIN',
          phone: '0901.888.999',
          points: 9999,
        },
      });
      console.log('✅ Default Single Admin created: admin@toyverse.vn / admin123');
    } else {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashPassword('admin123'),
          role: 'ADMIN',
        },
      });
    }

    // Hạ cấp tất cả tài khoản admin khác (chỉ giữ đúng 1 tài khoản admin duy nhất)
    await prisma.user.updateMany({
      where: {
        role: 'ADMIN',
        NOT: { email: adminEmail },
      },
      data: { role: 'USER' },
    });

    // 2. Ensure Default Customer Account
    const userEmail = 'minh.nguyen@gmail.com';
    const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          email: userEmail,
          password: hashPassword('123456'),
          name: 'Nguyễn Văn Minh',
          phone: '0988.123.456',
          role: 'USER',
          kidName: 'Bé Nguyễn Bảo An',
          kidBirthday: '15/10/2020',
          points: 1450,
        },
      });
      console.log('✅ Default Customer created: minh.nguyen@gmail.com / 123456');
    }
  } catch (err) {
    console.error('Error ensuring default accounts:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'ToyVerse Backend API is healthy and persistent 🚀',
    db: 'SQLite (dev.db)',
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH APIs (Đăng nhập, Đăng ký người dùng)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/register - Đăng ký tài khoản người dùng (KHÔNG CHO PHÉP ADMIN)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role, kidName, kidBirthday } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp đầy đủ: Email, Mật khẩu và Họ tên!',
      });
      return;
    }

    // Chặn đăng ký tài khoản Admin - Hệ thống chỉ duy trì 1 tài khoản Admin duy nhất
    if (role === 'ADMIN' || role === 'admin') {
      res.status(403).json({
        success: false,
        error: 'Hệ thống chỉ duy trì 1 tài khoản Admin duy nhất (admin@toyverse.vn). Không cho phép đăng ký thêm Admin!',
      });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      res.status(409).json({
        success: false,
        error: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.',
      });
      return;
    }

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashPassword(password),
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : null,
        role: 'USER',
        kidName: kidName ? String(kidName).trim() : null,
        kidBirthday: kidBirthday ? String(kidBirthday).trim() : null,
        points: 200, // tặng 200 điểm thưởng thành viên mới
      },
    });

    const token = await createSession(newUser.id);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: 'customer',
      roleRaw: 'USER',
      kidName: newUser.kidName,
      kidBirthday: newUser.kidBirthday,
      points: newUser.points,
      createdAt: newUser.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! 🎉',
      token,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('POST /api/auth/register error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi server khi đăng ký' });
  }
});

// POST /api/auth/login - Đăng nhập tài khoản
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password, requiredRole } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng nhập Email và Mật khẩu!',
      });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Tài khoản không tồn tại. Vui lòng kiểm tra lại email hoặc đăng ký mới!',
      });
      return;
    }

    const hashed = hashPassword(password);
    if (user.password !== hashed && user.password !== password) {
      res.status(401).json({
        success: false,
        error: 'Mật khẩu không chính xác. Vui lòng thử lại!',
      });
      return;
    }

    // Nếu trang đăng nhập yêu cầu quyền ADMIN riêng biệt
    if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Từ chối truy cập! Tài khoản này không có quyền Quản trị viên (Admin).',
      });
      return;
    }

    const token = await createSession(user.id);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role === 'ADMIN' ? 'admin' : 'customer',
      roleRaw: user.role,
      kidName: user.kidName,
      kidBirthday: user.kidBirthday,
      points: user.points,
      createdAt: user.createdAt,
    };

    res.json({
      success: true,
      message: 'Đăng nhập thành công! Chào mừng trở lại.',
      token,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('POST /api/auth/login error:', error);
    res.status(500).json({ success: false, error: 'Lỗi server khi đăng nhập' });
  }
});

// GET /api/auth/me - Lấy thông tin user hiện tại
app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const authenticatedUser = await getAuthenticatedUser(req);
    if (!authenticatedUser) {
      res.status(401).json({ success: false, error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: authenticatedUser.id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role === 'ADMIN' ? 'admin' : 'customer',
        roleRaw: user.role,
        kidName: user.kidName,
        kidBirthday: user.kidBirthday,
        points: user.points,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USER CRUD APIs (Quản lý tài khoản người dùng)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/users - Danh sách toàn bộ tài khoản
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        kidName: true,
        kidBirthday: true,
        points: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      total: users.length,
      data: users.map((u: any) => ({
        ...u,
        roleFormatted: u.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng',
        orderCount: u._count.orders,
      })),
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi lấy danh sách tài khoản' });
  }
});

// POST /api/users - Thêm tài khoản người dùng mới (Chỉ cho phép tạo USER)
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, kidName, points } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng nhập Email, Mật khẩu và Tên người dùng!',
      });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email này đã tồn tại trong hệ thống!' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashPassword(password),
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : null,
        role: 'USER',
        kidName: kidName ? String(kidName).trim() : null,
        points: Number(points) || 500,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Thêm tài khoản thành công! Đã lưu vào database.',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        points: user.points,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('POST /api/users error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi tạo tài khoản' });
  }
});

// PUT /api/users/:id - Sửa thông tin tài khoản
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id).trim();
    const { name, phone, password, points, kidName } = req.body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = String(name).trim();
    if (phone !== undefined) dataToUpdate.phone = phone ? String(phone).trim() : null;
    if (kidName !== undefined) dataToUpdate.kidName = kidName ? String(kidName).trim() : null;
    if (points !== undefined) dataToUpdate.points = Number(points) || 0;
    if (password && String(password).trim().length > 0) {
      dataToUpdate.password = hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json({
      success: true,
      message: 'Cập nhật tài khoản thành công! Dữ liệu đã lưu bền vững.',
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        phone: updated.phone,
        points: updated.points,
      },
    });
  } catch (error: any) {
    console.error('PUT /api/users/:id error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi cập nhật tài khoản' });
  }
});

// DELETE /api/users/:id - Xoá tài khoản (BẢO VỆ ADMIN VÀ CSDL)
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id).trim();
    const targetUser = await prisma.user.findUnique({ where: { id } });

    if (!targetUser) {
      // Nếu đã không tồn tại, trả về thành công an toàn
      res.json({ success: true, message: 'Tài khoản đã không còn tồn tại' });
      return;
    }

    if (targetUser.email === 'admin@toyverse.vn') {
      res.status(403).json({ success: false, error: 'Không thể xóa tài khoản Quản trị viên tối cao duy nhất!' });
      return;
    }

    // Gỡ liên kết khoá ngoại đơn hàng trước khi xóa
    await prisma.order.updateMany({
      where: { userId: id },
      data: { userId: null },
    });

    await prisma.user.deleteMany({ where: { id } });
    res.json({ success: true, message: 'Đã xóa tài khoản thành công!' });
  } catch (error: any) {
    console.error('DELETE /api/users/:id error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi xóa tài khoản' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CRUD APIs (Thêm, Sửa, Xoá, Lấy Sản Phẩm)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/products - Lấy danh sách sản phẩm
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const { category, search, lowStock } = req.query;

    const where: any = {};
    if (lowStock === 'true') {
      where.stockCount = { lt: 5 };
    }
    if (category && category !== 'all') {
      where.category = String(category);
    }
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { brand: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: products, total: products.length });
  } catch (error) {
    console.error('GET /api/products error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi lấy dữ liệu sản phẩm' });
  }
});

// GET /api/products/:id - Lấy chi tiết 1 sản phẩm
app.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id).trim();
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

// POST /api/products - Thêm sản phẩm mới
app.post('/api/products', async (req: Request, res: Response) => {
  try {
    const {
      name,
      brand,
      category,
      categoryLabel,
      ageRange,
      ageLabel,
      price,
      originalPrice,
      image,
      description,
      material,
      origin,
      discountPercent,
      rating,
      reviewCount,
      soldCount,
      stockCount,
      isFlashSale,
      isFeatured,
      inStock,
    } = req.body;

    if (!name || price === undefined || price === null || price === '') {
      res.status(400).json({
        success: false,
        error: 'Vui lòng nhập tên sản phẩm (name) và giá sản phẩm (price)',
      });
      return;
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ success: false, error: 'Giá sản phẩm không hợp lệ' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        brand: brand ? String(brand).trim() : 'ToyVerse',
        category: category ? String(category).trim() : 'stem',
        categoryLabel: categoryLabel ? String(categoryLabel).trim() : 'Đồ chơi',
        ageRange: ageRange ? String(ageRange).trim() : '6-12y',
        ageLabel: ageLabel ? String(ageLabel).trim() : '6 - 12 tuổi',
        price: parsedPrice,
        originalPrice: originalPrice ? Number(originalPrice) : parsedPrice,
        discountPercent: Number(discountPercent) || 0,
        rating: Number(rating) || 5.0,
        reviewCount: Number(reviewCount) || 0,
        soldCount: Number(soldCount) || 0,
        stockCount: stockCount !== undefined && stockCount !== null && stockCount !== '' ? Number(stockCount) : 50,
        image: image ? String(image).trim() : 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600',
        description: description ? String(description).trim() : `Đồ chơi ${name} chất lượng cao, an toàn cho trẻ em.`,
        material: material ? String(material).trim() : 'Nhựa ABS an toàn',
        origin: origin ? String(origin).trim() : 'Chính hãng',
        isFlashSale: Boolean(isFlashSale),
        isFeatured: Boolean(isFeatured),
        inStock: inStock !== false,
      },
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Thêm sản phẩm thành công! Đã lưu vĩnh viễn vào CSDL SQLite.',
    });
  } catch (error: any) {
    console.error('POST /api/products error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi tạo sản phẩm' });
  }
});

// PUT /api/products/:id - Cập nhật sản phẩm
app.put('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id).trim();
    const updateData = { ...req.body };

    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.originalPrice !== undefined) updateData.originalPrice = Number(updateData.originalPrice);
    if (updateData.stockCount !== undefined) updateData.stockCount = Number(updateData.stockCount);
    if (updateData.discountPercent !== undefined) updateData.discountPercent = Number(updateData.discountPercent);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });
    res.json({
      success: true,
      data: product,
      message: 'Cập nhật sản phẩm thành công! Dữ liệu đã được lưu lại.',
    });
  } catch (error: any) {
    console.error('PUT /api/products/:id error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi cập nhật sản phẩm' });
  }
});

// DELETE /api/products/:id - Xóa sản phẩm an toàn không lỗi
app.delete('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id).trim();
    // Xoá các đơn hàng chi tiết liên quan
    await prisma.orderItem.deleteMany({ where: { productId: id } });
    // Xoá sản phẩm
    await prisma.product.deleteMany({ where: { id } });
    res.json({ success: true, message: 'Đã xóa sản phẩm thành công!' });
  } catch (error: any) {
    console.error('DELETE /api/products/:id error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi xóa sản phẩm' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY & RESTOCK APIs (Quản lý kho & Cảnh báo tồn kho)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/inventory/low-stock - Lấy danh sách sản phẩm sắp hết hàng (< 5)
app.get('/api/inventory/low-stock', async (_req: Request, res: Response) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: { stockCount: { lt: 5 } },
      orderBy: { stockCount: 'asc' },
    });
    res.json({
      success: true,
      data: lowStockProducts,
      total: lowStockProducts.length,
      warning:
        lowStockProducts.length > 0
          ? `Có ${lowStockProducts.length} sản phẩm sắp hết hàng cần nhập kho!`
          : 'Tất cả sản phẩm đều đủ hàng.',
    });
  } catch (error: any) {
    console.error('GET /api/inventory/low-stock error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi kiểm tra tồn kho' });
  }
});

// PATCH /api/products/:id/restock - Nhập thêm số lượng tồn kho nhanh
app.patch('/api/products/:id/restock', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id).trim();
    const { amount, newStock } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại' });
      return;
    }

    let finalStock = existing.stockCount;
    if (newStock !== undefined && newStock !== null) {
      finalStock = Math.max(0, Number(newStock));
    } else if (amount !== undefined && amount !== null) {
      finalStock = Math.max(0, existing.stockCount + Number(amount));
    } else {
      finalStock = existing.stockCount + 10;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        stockCount: finalStock,
        inStock: finalStock > 0,
      },
    });

    res.json({
      success: true,
      data: updated,
      message: `Đã cập nhật tồn kho sản phẩm "${updated.name}" thành công! Số lượng hiện tại: ${finalStock}.`,
    });
  } catch (error: any) {
    console.error('PATCH /api/products/:id/restock error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi nhập kho' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW & RATING APIs (Đánh giá và bình luận sản phẩm thật)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/products/:id/reviews - Lấy danh sách đánh giá của sản phẩm
app.get('/api/products/:id/reviews', async (req: Request, res: Response) => {
  try {
    const productId = String(req.params.id).trim();
    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumRating = 0;
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      starCounts[star] = (starCounts[star] || 0) + 1;
      sumRating += r.rating;
    });

    const averageRating = reviews.length > 0 ? Math.round((sumRating / reviews.length) * 10) / 10 : 5.0;

    res.json({
      success: true,
      data: reviews,
      total: reviews.length,
      averageRating,
      starCounts,
    });
  } catch (error: any) {
    console.error('GET /api/products/:id/reviews error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi lấy đánh giá sản phẩm' });
  }
});

// POST /api/products/:id/reviews - Khách hàng tạo đánh giá mới
app.post('/api/products/:id/reviews', async (req: Request, res: Response) => {
  try {
    const productId = String(req.params.id).trim();
    const { rating, comment, photos, userName, userAvatar, orderId } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại' });
      return;
    }

    if (!comment || String(comment).trim().length === 0) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập nội dung đánh giá!' });
      return;
    }

    const user = await getAuthenticatedUser(req);
    const numRating = Math.min(5, Math.max(1, Number(rating) || 5));

    let reviewerName = userName ? String(userName).trim() : '';
    if (!reviewerName && user) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      reviewerName = dbUser ? dbUser.name : 'Khách Hàng ToyVerse';
    }
    if (!reviewerName) {
      reviewerName = 'Khách Hàng ToyVerse';
    }

    const newReview = await prisma.review.create({
      data: {
        productId,
        userId: user ? user.id : null,
        orderId: orderId ? String(orderId).trim() : null,
        userName: reviewerName,
        userAvatar: userAvatar ? String(userAvatar).trim() : null,
        rating: numRating,
        comment: String(comment).trim(),
        photos: photos ? (typeof photos === 'string' ? photos : JSON.stringify(photos)) : null,
        isVerifiedPurchase: true,
      },
    });

    // Tự động tính toán lại điểm rating trung bình và reviewCount của Product
    const agg = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const newAvg = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : numRating;
    const newCount = agg._count.id || 1;

    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: newAvg,
        reviewCount: newCount,
      },
    });

    res.status(201).json({
      success: true,
      data: newReview,
      productRating: newAvg,
      reviewCount: newCount,
      message: 'Cảm ơn bạn đã gửi đánh giá! Đánh giá đã được lưu vào CSDL.',
    });
  } catch (error: any) {
    console.error('POST /api/products/:id/reviews error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi gửi đánh giá' });
  }
});

// GET /api/reviews - Lấy toàn bộ reviews trên hệ thống (cho Admin)
app.get('/api/reviews', async (_req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, image: true, price: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ success: true, data: reviews, total: reviews.length });
  } catch (error: any) {
    console.error('GET /api/reviews error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi lấy danh sách đánh giá' });
  }
});

// DELETE /api/reviews/:id - Xóa đánh giá (Admin)
app.delete('/api/reviews/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id).trim();
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Đánh giá không tồn tại' });
      return;
    }

    const prodId = existing.productId;
    await prisma.review.delete({ where: { id } });

    // Tính lại rating của sản phẩm
    const agg = await prisma.review.aggregate({
      where: { productId: prodId },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.product.update({
      where: { id: prodId },
      data: {
        rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 5.0,
        reviewCount: agg._count.id || 0,
      },
    });

    res.json({ success: true, message: 'Đã xóa đánh giá thành công!' });
  } catch (error: any) {
    console.error('DELETE /api/reviews/:id error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi xóa đánh giá' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDER CRUD APIs (Quản lý đơn hàng)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/orders - Admin xem tất cả, khách hàng chỉ xem đơn của mình
app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    // Nếu là khách hàng thông thường đăng nhập thì lọc theo userId; Admin hoặc Bảng quản trị xem tất cả
    const where = user && user.role !== 'ADMIN' ? { userId: user.id } : undefined;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: true },
        },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders, total: orders.length });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi lấy dữ liệu đơn hàng' });
  }
});

// GET /api/orders/:id - Lấy chi tiết đơn hàng
app.get('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const id = String(req.params.id).trim();
    const where = user && user.role !== 'ADMIN' ? { id, userId: user.id } : { id };

    const order = await prisma.order.findFirst({
      where,
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!order) {
      res.status(404).json({ success: false, error: 'Đơn hàng không tồn tại' });
      return;
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

// POST /api/orders - Tạo đơn hàng mới
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { customerName, customerPhone, address, items, paymentMethod, isGiftWrap, userId, totalAmount } = req.body;

    const token = getSessionToken(req);
    const authenticatedUser = await getAuthenticatedUser(req);
    if (token && !authenticatedUser) {
      res.status(401).json({ success: false, error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ' });
      return;
    }
    if (userId && (!authenticatedUser || userId !== authenticatedUser.id)) {
      res.status(403).json({ success: false, error: 'Không thể tạo đơn hàng cho tài khoản khác' });
      return;
    }

    const validUserId = authenticatedUser?.id ?? null;
    let actualCustomerName = customerName ? String(customerName).trim() : '';
    let actualCustomerPhone = customerPhone ? String(customerPhone).trim() : '';

    if (authenticatedUser) {
      const account = await prisma.user.findUnique({ where: { id: authenticatedUser.id } });
      if (account) {
        if (!actualCustomerName || actualCustomerName === 'Khách Hàng') {
          actualCustomerName = account.name;
        }
        if (!actualCustomerPhone || actualCustomerPhone === '0988.123.456') {
          actualCustomerPhone = account.phone || actualCustomerPhone || '0988.123.456';
        }
      }
    }

    if (!actualCustomerName) actualCustomerName = 'Khách Hàng';
    if (!actualCustomerPhone) actualCustomerPhone = '0988.123.456';

    if (!address || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp đầy đủ: Địa chỉ nhận hàng và ít nhất 1 sản phẩm trong giỏ hàng!',
      });
      return;
    }

    // Resolve valid product IDs from database to ensure no foreign key failure
    const dbProducts = await prisma.product.findMany();
    const fallbackProduct = dbProducts[0];

    const validItems: Array<{ productId: string; quantity: number; price: number }> = [];

    for (const item of items) {
      const targetId = item.productId || item.product?.id || item.id;
      const targetName = item.name || item.product?.name;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const itemPrice = Number(item.price) || Number(item.product?.price) || 0;

      let matched = dbProducts.find((p: any) => p.id === targetId);
      if (!matched && targetName) {
        matched = dbProducts.find((p: any) => p.name.trim().toLowerCase() === String(targetName).trim().toLowerCase());
      }
      if (!matched) {
        matched = fallbackProduct;
      }

      if (matched) {
        validItems.push({
          productId: matched.id,
          quantity: qty,
          price: itemPrice > 0 ? itemPrice : matched.price,
        });

        // Giảm số lượng tồn kho và tăng số lượng đã bán
        await prisma.product.update({
          where: { id: matched.id },
          data: {
            stockCount: Math.max(0, matched.stockCount - qty),
            soldCount: matched.soldCount + qty,
          },
        });
      }
    }

    if (validItems.length === 0) {
      res.status(400).json({ success: false, error: 'Không tìm thấy sản phẩm hợp lệ trong giỏ hàng!' });
      return;
    }

    const calculatedTotal = validItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const finalAmount = totalAmount !== undefined && Number(totalAmount) >= 0 ? Number(totalAmount) : calculatedTotal;

    // Tích điểm thưởng cho thành viên (10.000đ = 1 điểm)
    if (validUserId) {
      const bonusPoints = Math.max(10, Math.floor(finalAmount / 10000));
      await prisma.user.update({
        where: { id: validUserId },
        data: { points: { increment: bonusPoints } },
      });
    }

    const order = await prisma.order.create({
      data: {
        customerName: actualCustomerName,
        customerPhone: actualCustomerPhone,
        address: String(address).trim(),
        totalAmount: finalAmount,
        status: 'PENDING',
        paymentMethod: paymentMethod ? String(paymentMethod).toUpperCase() : 'COD',
        isGiftWrap: Boolean(isGiftWrap),
        userId: validUserId,
        items: {
          create: validItems.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Đặt hàng thành công! Đơn hàng đã được lưu trữ vĩnh viễn vào CSDL SQLite.',
    });
  } catch (error: any) {
    console.error('POST /api/orders error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi tạo đơn hàng' });
  }
});

// PATCH & PUT /api/orders/:id/status - Cập nhật trạng thái đơn hàng
const handleStatusUpdate = async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);

    const id = String(req.params.id).trim();
    const rawStatus = req.body.status;
    if (!rawStatus) {
      res.status(400).json({ success: false, error: 'Thiếu trường status cần cập nhật' });
      return;
    }

    const validStatuses = ['PENDING', 'PACKING', 'SHIPPING', 'COMPLETED', 'CANCELLED'];
    const normalizedStatus = String(rawStatus).toUpperCase();

    if (!validStatuses.includes(normalizedStatus)) {
      res.status(400).json({
        success: false,
        error: `Trạng thái không hợp lệ. Phải là một trong: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
    if (!existingOrder) {
      res.status(404).json({ success: false, error: 'Đơn hàng không tồn tại' });
      return;
    }
    // Nếu là tài khoản khách hàng thông thường thì chỉ được phép hủy đơn PENDING của chính mình
    if (
      user &&
      user.role !== 'ADMIN' &&
      (existingOrder.userId !== user.id ||
        normalizedStatus !== 'CANCELLED' ||
        existingOrder.status !== 'PENDING')
    ) {
      res.status(403).json({ success: false, error: 'Bạn chỉ có thể hủy đơn đang chờ của mình' });
      return;
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: normalizedStatus },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      success: true,
      data: order,
      message: `Đã cập nhật trạng thái đơn hàng sang: ${normalizedStatus}!`,
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi cập nhật trạng thái' });
  }
};

app.patch('/api/orders/:id/status', handleStatusUpdate);
app.put('/api/orders/:id/status', handleStatusUpdate);

// PUT /api/orders/:id - Cập nhật toàn diện đơn hàng
app.put('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (user && user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Chỉ quản trị viên mới được cập nhật đơn hàng' });
      return;
    }

    const id = String(req.params.id).trim();
    const { status, address, customerName, customerPhone, paymentMethod } = req.body;
    const updateData: any = {};

    if (status) updateData.status = String(status).toUpperCase();
    if (address) updateData.address = String(address).trim();
    if (customerName) updateData.customerName = String(customerName).trim();
    if (customerPhone) updateData.customerPhone = String(customerPhone).trim();
    if (paymentMethod) updateData.paymentMethod = String(paymentMethod).toUpperCase();

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ success: true, data: order, message: 'Đã cập nhật thông tin đơn hàng!' });
  } catch (error: any) {
    console.error('PUT /api/orders/:id error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi cập nhật đơn hàng' });
  }
});

// DELETE /api/orders/:id - Xóa đơn hàng an toàn
app.delete('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (user && user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Chỉ quản trị viên mới được xóa đơn hàng' });
      return;
    }

    const id = String(req.params.id).trim();
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.order.deleteMany({ where: { id } });
    res.json({ success: true, message: 'Đã xóa đơn hàng thành công khỏi CSDL SQLite!' });
  } catch (error: any) {
    console.error('DELETE /api/orders/:id error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi xóa đơn hàng' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const totalProducts = await prisma.product.count();
    const totalOrders = await prisma.order.count();
    const totalUsers = await prisma.user.count();

    const revenueResult = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'COMPLETED' },
    });
    const totalRevenue = revenueResult._sum.totalAmount || 0;

    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mondayOffset = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const completedOrdersThisWeek = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: weekStart, lt: weekEnd },
      },
      select: { createdAt: true, totalAmount: true },
    });
    const weekdayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const revenueByDay = weekdayLabels.map((label, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const amount = completedOrdersThisWeek.reduce((sum, order) => {
        const orderDate = order.createdAt;
        const orderDateKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
        return orderDateKey === dateKey ? sum + order.totalAmount : sum;
      }, 0);
      return { date: dateKey, label, amount };
    });
    const weeklyRevenue = revenueByDay.reduce((sum, day) => sum + day.amount, 0);

    const lowStockCount = await prisma.product.count({ where: { stockCount: { lt: 5 } } });
    const outOfStockCount = await prisma.product.count({ where: { stockCount: { lte: 0 } } });
    const totalReviews = await prisma.review.count();

    res.json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue,
        weeklyRevenue,
        lowStockCount,
        outOfStockCount,
        totalReviews,
        revenueByDay,
        ordersByStatus: ordersByStatus.map((o: any) => ({
          status: o.status,
          count: o._count.id,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Lỗi khi lấy thống kê' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CART PERSISTENCE APIS (Lưu trữ giỏ hàng bền vững cả khi tắt terminal)
// ─────────────────────────────────────────────────────────────────────────────
const CART_STORE_FILE = path.join(__dirname, '../prisma/cart_store.json');

function readCartStore(): Record<string, any[]> {
  try {
    if (fs.existsSync(CART_STORE_FILE)) {
      const content = fs.readFileSync(CART_STORE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Lỗi khi đọc file cart_store.json:', err);
  }
  return {};
}

function writeCartStore(data: Record<string, any[]>) {
  try {
    const dir = path.dirname(CART_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CART_STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Lỗi khi ghi file cart_store.json:', err);
  }
}

// GET /api/cart - Lấy giỏ hàng đã lưu
app.get('/api/cart', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'guest';
    const store = readCartStore();
    const cart = store[userId] || store['guest'] || [];
    res.json({ success: true, cart });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, cart: [] });
  }
});

// POST /api/cart - Lưu giỏ hàng (Ghi ngay vào đĩa / file JSON)
app.post('/api/cart', (req: Request, res: Response) => {
  try {
    const { userId = 'guest', cart = [] } = req.body;
    const store = readCartStore();
    store[userId] = cart;
    if (userId !== 'guest') {
      store['guest'] = cart;
    }
    writeCartStore(store);
    res.json({ success: true, message: 'Đã lưu giỏ hàng bền vững!', count: cart.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/cart - Xóa giỏ hàng
app.delete('/api/cart', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || req.body?.userId || 'guest';
    const store = readCartStore();
    delete store[userId];
    if (userId !== 'guest') {
      delete store['guest'];
    }
    writeCartStore(store);
    res.json({ success: true, message: 'Đã xóa giỏ hàng thành công!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Khởi động server
// ─────────────────────────────────────────────────────────────────────────────
ensureDefaultAccounts()
  .then(() => ensureFullSeedData(prisma))
  .then(() => {
    app.listen(port, () => {
      console.log(`\n🧸 ToyVerse Backend API is running!`);
      console.log(`   Local:  http://localhost:${port}`);
      console.log(`   DB:     SQLite (prisma/dev.db) — BỀN VỮNG 100%`);
      console.log(`   Admin:  admin@toyverse.vn (Duy nhất 1 tài khoản Admin)\n`);
    });
  })
  .catch((err) => {
    console.error('Lỗi khi khởi động server:', err);
  });
