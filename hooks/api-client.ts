/**
 * API client kết nối trực tiếp Frontend với Backend ToyVerse (Express + SQLite).
 * Hỗ trợ Web, iOS, Android (10.0.2.2) với đầy đủ CRUD và Auth.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001/api';
  }
  // Khi chạy trên điện thoại thật hoặc máy ảo qua Expo Go
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3001/api`;
  }
  // Fallback IP máy tính trong mạng LAN
  return 'http://192.168.0.148:3001/api';
}

let sessionToken: string | null = null;
let cachedCurrentUser: any = null;

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// Khởi tạo từ localStorage nếu ở Web
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    sessionToken = window.localStorage.getItem('toyverse_token');
    const savedUser = window.localStorage.getItem('toyverse_user');
    if (savedUser) cachedCurrentUser = JSON.parse(savedUser);
  } catch {}
}

export function setSessionToken(token: string | null, user?: any) {
  sessionToken = token;
  if (user !== undefined) cachedCurrentUser = user;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (token) {
        window.localStorage.setItem('toyverse_token', token);
      } else {
        window.localStorage.removeItem('toyverse_token');
      }
      if (user) {
        window.localStorage.setItem('toyverse_user', JSON.stringify(user));
      } else if (user === null) {
        window.localStorage.removeItem('toyverse_user');
      }
    } catch {}
  }
}

export function getSessionToken(): string | null {
  return sessionToken;
}

export function getCachedUser(): any {
  return cachedCurrentUser;
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
    headers['x-session-token'] = sessionToken;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiRequestError(data.error || data.message || `Lỗi HTTP ${res.status}`, res.status);
  }

  return data as T;
}

// ─── AUTH APIs ───────────────────────────────────────────────────────────────

export const authApi = {
  login: (payload: {
    email: string;
    password?: string;
    requiredRole?: 'ADMIN' | 'USER';
  }) =>
    request<{ success: boolean; token: string; user: any; message: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  register: (payload: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: 'ADMIN' | 'USER';
    kidName?: string;
    kidBirthday?: string;
  }) =>
    request<{ success: boolean; token: string; user: any; message: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  session: () =>
    request<{ success: boolean; user: any }>('/auth/me'),

  logout: async () => {
    setSessionToken(null, null);
    return { success: true };
  },
};

// ─── USER MANAGEMENT CRUD (ADMIN) ───────────────────────────────────────────

export const usersApi = {
  getAll: () =>
    request<{ success: boolean; total: number; data: any[] }>('/users'),

  create: (user: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: 'ADMIN' | 'USER';
    kidName?: string;
    points?: number;
  }) =>
    request<{ success: boolean; data: any; message: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    }),

  update: (id: string, updates: any) =>
    request<{ success: boolean; data: any; message: string }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),
};

// ─── PRODUCTS CRUD APIs ─────────────────────────────────────────────────────

export const productsApi = {
  get: (params?: { category?: string; search?: string }) => {
    let query = '';
    if (params) {
      const q = new URLSearchParams();
      if (params.category && params.category !== 'all') q.append('category', params.category);
      if (params.search) q.append('search', params.search);
      query = q.toString() ? `?${q.toString()}` : '';
    }
    return request<{ success: boolean; data: any[]; total: number }>(`/products${query}`);
  },

  getById: (id: string) =>
    request<{ success: boolean; data: any }>(`/products/${id}`),

  create: (product: any) =>
    request<{ success: boolean; data: any; message: string }>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  update: (id: string, updates: any) =>
    request<{ success: boolean; data: any; message: string }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/products/${id}`, {
      method: 'DELETE',
    }),
};

// ─── ORDERS CRUD APIs ───────────────────────────────────────────────────────

export const ordersApi = {
  getAll: () =>
    request<{ success: boolean; data: any[]; total: number }>('/orders'),

  getById: (id: string) =>
    request<{ success: boolean; data: any }>(`/orders/${id}`),

  create: (payload: {
    customerName: string;
    customerPhone: string;
    address: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
    totalAmount?: number;
    paymentMethod: string;
    isGiftWrap?: boolean;
    userId?: string;
  }) =>
    request<{ success: boolean; data: any; message: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStatus: (id: string, status: string) =>
    request<{ success: boolean; data: any; message: string }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/orders/${id}`, {
      method: 'DELETE',
    }),
};

// ─── STATS API ──────────────────────────────────────────────────────────────

export interface RevenueByDay {
  date: string;
  label: string;
  amount: number;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId?: string | null;
  orderId?: string | null;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  comment: string;
  photos?: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
  product?: { id: string; name: string; image: string; price: number } | null;
}

export const statsApi = {
  get: () =>
    request<{
      success: boolean;
      data: {
        totalProducts: number;
        totalOrders: number;
        totalUsers: number;
        totalRevenue: number;
        weeklyRevenue: number;
        lowStockCount: number;
        outOfStockCount: number;
        totalReviews: number;
        revenueByDay: RevenueByDay[];
        ordersByStatus: Array<{ status: string; count: number }>;
      };
    }>('/stats'),
};

export const inventoryApi = {
  getLowStock: () =>
    request<{
      success: boolean;
      data: any[];
      total: number;
      warning: string;
    }>('/inventory/low-stock'),
  restock: (id: string, amount: number = 10, newStock?: number) =>
    request<{
      success: boolean;
      data: any;
      message: string;
    }>(`/products/${id}/restock`, {
      method: 'PATCH',
      body: JSON.stringify({ amount, newStock }),
    }),
};

export const reviewsApi = {
  getByProduct: (productId: string) =>
    request<{
      success: boolean;
      data: ProductReview[];
      total: number;
      averageRating: number;
      starCounts: Record<number, number>;
    }>(`/products/${productId}/reviews`),
  create: (productId: string, payload: { rating: number; comment: string; photos?: string; userName?: string; orderId?: string }) =>
    request<{
      success: boolean;
      data: ProductReview;
      productRating: number;
      reviewCount: number;
      message: string;
    }>(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAll: () =>
    request<{
      success: boolean;
      data: ProductReview[];
      total: number;
    }>('/reviews'),
  delete: (id: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/reviews/${id}`, {
      method: 'DELETE',
    }),
};

// ─── Legacy compatibility shim for hooks ────────────────────────────────────

export const adminApi = {
  dashboard: async () => {
    const [statsRes, ordersRes] = await Promise.all([
      statsApi.get().catch(() => null),
      ordersApi.getAll().catch(() => null),
    ]);
    const d = statsRes?.data;
    return {
      totalRevenue: d?.totalRevenue ?? 0,
      totalOrders: d?.totalOrders ?? 0,
      pendingOrders: d?.ordersByStatus?.find((s) => s.status === 'PENDING')?.count ?? 0,
      packingOrders: d?.ordersByStatus?.find((s) => s.status === 'PACKING')?.count ?? 0,
      shippingOrders: d?.ordersByStatus?.find((s) => s.status === 'SHIPPING')?.count ?? 0,
      totalProducts: d?.totalProducts ?? 0,
      lowStockProducts: 2,
      totalSoldUnits: 120,
      recentOrders: ordersRes?.data ?? [],
    };
  },
  orders: async () => {
    const res = await ordersApi.getAll();
    return { orders: res.data };
  },
  products: async () => {
    const res = await productsApi.get();
    return { products: res.data };
  },
  addProduct: (product: any) => productsApi.create(product),
  updateProduct: (id: string, updates: any) => productsApi.update(id, updates),
  deleteProduct: (id: string) => productsApi.delete(id),
  updateOrderStatus: (orderId: string, status: string) =>
    ordersApi.updateStatus(orderId, status),
};

export const cartApi = {
  get: async (userId?: string) => {
    try {
      const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const res = await request<{ success: boolean; cart: any[] }>(`/cart${q}`);
      return res.cart || [];
    } catch {
      return [];
    }
  },
  save: async (cart: any[], userId?: string) => {
    try {
      return await request<{ success: boolean; message: string }>('/cart', {
        method: 'POST',
        body: JSON.stringify({ cart, userId: userId || 'guest' }),
      });
    } catch {
      return { success: false, message: 'Offline save' };
    }
  },
  clear: async (userId?: string) => {
    try {
      const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      return await request<{ success: boolean; message: string }>(`/cart${q}`, {
        method: 'DELETE',
      });
    } catch {
      return { success: false, message: 'Offline clear' };
    }
  },
};

export const checkoutApi = {
  applyVoucher: async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (['TOYFUN20', 'KIDS20'].includes(clean)) {
      return { success: true, discountPercent: 20, code: clean, message: 'Giảm 20% thành công' };
    }
    return { success: false, discountPercent: 0, code: '', message: 'Mã không hợp lệ' };
  },
  placeOrder: async (payload: any) => ordersApi.create(payload),
};
