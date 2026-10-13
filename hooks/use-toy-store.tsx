import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  authApi,
  cartApi,
  checkoutApi,
  productsApi,
  ordersApi,
  usersApi,
  inventoryApi,
  reviewsApi,
  ProductReview,
  setSessionToken,
  getSessionToken,
  getCachedUser,
  ApiRequestError,
} from './api-client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ToyProduct {
  id: string;
  name: string;
  brand: string;
  category: 'lego' | 'robot' | 'doll' | 'stem' | 'boardgame' | 'craft' | string;
  categoryLabel: string;
  ageRange: '0-1y' | '1-3y' | '3-6y' | '6-12y' | '12y+' | string;
  ageLabel: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  image: string;
  description: string;
  material: string;
  origin: string;
  isFlashSale?: boolean;
  isFeatured?: boolean;
  inStock: boolean;
  stockCount?: number;
}

export interface CartItem {
  product: ToyProduct;
  quantity: number;
}

export interface StoreBranch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  hours: string;
  hasPlayZone: boolean;
  distance: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  roleRaw?: string;
  kidName?: string;
  kidBirthday?: string;
  points: number;
  orderCount?: number;
  createdAt?: string;
}

export type OrderStatus = 'pending' | 'packing' | 'shipping' | 'completed' | 'cancelled' | 'PENDING' | 'PACKING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: CartItem[];
  total: number;
  totalAmount?: number;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: string;
  isGiftWrap: boolean;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial fallback data
// ─────────────────────────────────────────────────────────────────────────────

export const INITIAL_TOYS: ToyProduct[] = [
  {
    id: 'toy-1',
    name: 'Bộ Xếp Hình LEGO City Trạm Cứu Hỏa Hiện Đại',
    brand: 'LEGO',
    category: 'lego',
    categoryLabel: 'Xếp hình LEGO',
    ageRange: '6-12y',
    ageLabel: '6 - 12 tuổi',
    price: 890000,
    originalPrice: 1250000,
    discountPercent: 29,
    rating: 4.9,
    reviewCount: 318,
    soldCount: 1420,
    stockCount: 45,
    image: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=600&auto=format&fit=crop&q=80',
    description: 'Bộ lắp ráp trạm cứu hỏa gồm 540 chi tiết tinh xảo, xe thang cứu hỏa cơ động và 5 mô hình lính cứu hỏa dũng cảm.',
    material: 'Nhựa nguyên sinh ABS cao cấp, không độc hại',
    origin: 'Đan Mạch',
    isFlashSale: true,
    isFeatured: true,
    inStock: true,
  },
  {
    id: 'toy-2',
    name: 'Robot Biến Hình Thông Minh AI Điều Khiển Giọng Nói',
    brand: 'RoboKid Tech',
    category: 'robot',
    categoryLabel: 'Xe & Robot',
    ageRange: '6-12y',
    ageLabel: '6 - 12 tuổi',
    price: 650000,
    originalPrice: 950000,
    discountPercent: 32,
    rating: 4.8,
    reviewCount: 195,
    soldCount: 880,
    stockCount: 12,
    image: 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=600&auto=format&fit=crop&q=80',
    description: 'Robot thông minh có thể nhảy theo nhạc, phát âm tiếng Anh chuẩn, nhận diện cử chỉ tay.',
    material: 'Nhựa ABS & Linh kiện điện tử đạt chuẩn CR',
    origin: 'Nhật Bản',
    isFlashSale: true,
    isFeatured: true,
    inStock: true,
  },
  {
    id: 'toy-3',
    name: 'Búp Bê Công Chúa Xứ Sở Thần Thoại Kèm Tủ Đồ',
    brand: 'Barbie Dream',
    category: 'doll',
    categoryLabel: 'Búp bê & Thú bông',
    ageRange: '3-6y',
    ageLabel: '3 - 6 tuổi',
    price: 420000,
    originalPrice: 550000,
    discountPercent: 24,
    rating: 4.9,
    reviewCount: 264,
    soldCount: 1105,
    stockCount: 38,
    image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600&auto=format&fit=crop&q=80',
    description: 'Búp bê váy dạ hội lấp lánh kèm theo 12 bộ trang phục thời trang, vương miện và phụ kiện.',
    material: 'Vải lụa cao cấp, nhựa mềm an toàn không mùi',
    origin: 'Mỹ',
    isFeatured: true,
    inStock: true,
  },
];

export const STORE_BRANCHES: StoreBranch[] = [
  {
    id: 'b-1',
    name: 'ToyVerse Vincom Mega Mall Thảo Điền',
    address: 'Tầng 3, 161 Xa Lộ Hà Nội, P. Thảo Điền, TP. Thủ Đức',
    city: 'Hồ Chí Minh',
    phone: '028.7300.9991',
    hours: '09:30 - 22:00',
    hasPlayZone: true,
    distance: '1.2 km',
  },
  {
    id: 'b-2',
    name: 'ToyVerse Landmark 81',
    address: 'Tầng B1, 720A Điện Biên Phủ, P. 22, Q. Bình Thạnh',
    city: 'Hồ Chí Minh',
    phone: '028.7300.9992',
    hours: '09:00 - 22:00',
    hasPlayZone: true,
    distance: '3.5 km',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Context Interface
// ─────────────────────────────────────────────────────────────────────────────

interface ToyStoreContextType {
  toys: ToyProduct[];
  cart: CartItem[];
  addToCart: (product: ToyProduct, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  discountVoucher: string;
  discountPercent: number;
  applyVoucher: (code: string) => { success: boolean; message: string };
  shippingFee: number;
  finalTotal: number;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  branches: StoreBranch[];
  selectedToy: ToyProduct | null;
  setSelectedToy: (toy: ToyProduct | null) => void;
  formatVND: (amount: number) => string;

  // User & Auth
  currentUser: User | null;
  login: (email: string, password?: string, requiredRole?: 'ADMIN' | 'USER') => Promise<{ success: boolean; error?: string; user?: any }>;
  register: (payload: { email: string; password: string; name: string; phone?: string; role?: 'ADMIN' | 'USER'; kidName?: string; kidBirthday?: string }) => Promise<{ success: boolean; error?: string; user?: any }>;
  logout: () => void;

  // Admin User CRUD
  users: User[];
  fetchUsers: () => Promise<void>;
  addUser: (payload: any) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, payload: any) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Orders Management
  orders: Order[];
  fetchOrders: () => Promise<void>;
  createOrder: (payload: {
    customerName: string;
    customerPhone: string;
    address: string;
    items?: Array<{ productId: string; quantity: number; price: number }>;
    totalAmount?: number;
    paymentMethod?: string;
    isGiftWrap?: boolean;
    userId?: string;
  }) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean; error?: string }>;
  deleteOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;

  // Products CRUD (Admin) & Inventory
  fetchToys: () => Promise<void>;
  addToy: (toy: Omit<ToyProduct, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateToy: (id: string, updated: Partial<ToyProduct>) => Promise<{ success: boolean; error?: string }>;
  deleteToy: (id: string) => Promise<{ success: boolean; error?: string }>;
  restockToy: (id: string, amount?: number, newStock?: number) => Promise<{ success: boolean; error?: string }>;

  // Reviews & Ratings
  fetchProductReviews: (productId: string) => Promise<ProductReview[]>;
  submitReview: (productId: string, payload: { rating: number; comment: string; photos?: string; userName?: string; orderId?: string }) => Promise<{ success: boolean; data?: any; error?: string }>;
}

const ToyStoreContext = createContext<ToyStoreContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Cart Persistence Helpers (AsyncStorage + localStorage + Backend sync)
// ─────────────────────────────────────────────────────────────────────────────
const CART_STORAGE_KEY = '@toyverse_cart_v1';

async function loadLocalCart(): Promise<CartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // ignore
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [];
}

async function saveLocalCart(items: CartItem[]) {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    // ignore
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }
}

export function ToyStoreProvider({ children }: { children: React.ReactNode }) {
  const [toys, setToys] = useState<ToyProduct[]>(INITIAL_TOYS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>(['toy-1', 'toy-2']);
  const [discountVoucher, setDiscountVoucher] = useState<string>('TOYFUN20');
  const [discountPercent, setDiscountPercent] = useState<number>(20);
  const [selectedToy, setSelectedToy] = useState<ToyProduct | null>(null);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = getCachedUser();
    if (cached && !cached.id?.startsWith('u-') && cached.name !== 'Khách Hàng') {
      return cached;
    }
    return null;
  });

  // Hydrate cart on mount (from local storage + backend sync)
  useEffect(() => {
    let isMounted = true;
    async function initCart() {
      // 1. Khôi phục tức thì từ bộ nhớ máy (kể cả khi kill terminal hay tắt app)
      const localItems = await loadLocalCart();
      if (isMounted && localItems.length > 0) {
        setCart(localItems);
      }

      // 2. Đồng bộ với CSDL / Backend
      try {
        const serverCart = await cartApi.get(currentUser?.id);
        if (isMounted) {
          if (Array.isArray(serverCart) && serverCart.length > 0) {
            setCart(serverCart);
            saveLocalCart(serverCart);
          } else if (localItems.length > 0) {
            // Đồng bộ dữ liệu local lên server để lưu vào cart_store.json
            cartApi.save(localItems, currentUser?.id);
          }
        }
      } catch (err) {
        // Fallback local items đã được load thành công
      }
    }

    initCart();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // Fetch Toys from backend
  const fetchToys = useCallback(async () => {
    try {
      const res = await productsApi.get();
      if (res && res.data && res.data.length > 0) {
        setToys(res.data);
      }
    } catch (err) {
      console.log('fetchToys error, using local fallback:', err);
    }
  }, []);

  // Fetch Orders from backend
  const fetchOrders = useCallback(async () => {
    try {
      const res = await ordersApi.getAll();
      if (res && res.data) {
        const mappedOrders: Order[] = res.data.map((o: any) => ({
          id: o.id,
          customerName:
            o.user?.name && (o.customerName === 'Khách Hàng' || !o.customerName)
              ? o.user.name
              : o.customerName || o.user?.name || 'Khách Hàng',
          customerPhone:
            o.user?.phone && (!o.customerPhone || o.customerPhone === '0988.123.456')
              ? o.user.phone
              : o.customerPhone || o.user?.phone || '',
          address: o.address,
          total: o.totalAmount ?? o.total ?? 0,
          totalAmount: o.totalAmount ?? o.total ?? 0,
          status: o.status,
          paymentMethod: o.paymentMethod,
          createdAt: new Date(o.createdAt).toLocaleString('vi-VN'),
          isGiftWrap: Boolean(o.isGiftWrap),
          userId: o.userId,
          user: o.user || null,
          items: (o.items || []).map((it: any) => ({
            product: it.product || { name: 'Sản phẩm', price: it.price, image: '' },
            quantity: it.quantity,
          })),
        }));
        setOrders(mappedOrders);
      }
    } catch (err) {
      console.log('fetchOrders error:', err);
    }
  }, []);

  // Verify the saved session before loading its orders.
  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;

    authApi
      .session()
      .then((res) => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
          setSessionToken(token, res.user);
          fetchOrders();
        }
      })
      .catch((error: unknown) => {
        if (error instanceof ApiRequestError && error.status === 401) {
          if (getSessionToken() === token) {
            setSessionToken(null, null);
            setCurrentUser(null);
            fetchOrders();
          }
          return;
        }
        console.error('Session verification failed:', error);
      });
  }, [fetchOrders]);

  // Fetch Users from backend (Admin)
  const fetchUsers = useCallback(async () => {
    try {
      const res = await usersApi.getAll();
      if (res && res.data) {
        setUsers(
          res.data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role === 'ADMIN' ? 'admin' : 'customer',
            roleRaw: u.role,
            kidName: u.kidName,
            kidBirthday: u.kidBirthday,
            points: u.points,
            orderCount: u.orderCount,
            createdAt: new Date(u.createdAt).toLocaleDateString('vi-VN'),
          }))
        );
      }
    } catch (err) {
      console.log('fetchUsers error:', err);
    }
  }, []);

  // Load initial backend data
  useEffect(() => {
    fetchToys();
    fetchUsers();
    fetchOrders();
  }, [fetchToys, fetchUsers, fetchOrders]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string = '123456', requiredRole?: 'ADMIN' | 'USER') => {
      try {
        const res = await authApi.login({ email, password, requiredRole });
        if (res.success && res.user) {
          setSessionToken(res.token, res.user);
          setCurrentUser(res.user);
          await fetchOrders();
          return { success: true, user: res.user };
        }
        return { success: false, error: res.message || 'Đăng nhập không thành công' };
      } catch (err: any) {
        console.error('Login error:', err);
        return { success: false, error: err.message || 'Lỗi khi đăng nhập' };
      }
    },
    [fetchOrders]
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      role?: 'ADMIN' | 'USER';
      kidName?: string;
      kidBirthday?: string;
    }) => {
      try {
        const res = await authApi.register(payload);
        if (res.success && res.user) {
          setSessionToken(res.token, res.user);
          setCurrentUser(res.user);
          await fetchOrders();
          await fetchUsers();
          return { success: true, user: res.user };
        }
        return { success: false, error: res.message || 'Đăng ký không thành công' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi khi đăng ký' };
      }
    },
    [fetchUsers, fetchOrders]
  );

  const logout = useCallback(() => {
    authApi.logout();
    setSessionToken(null, null);
    setCurrentUser(null);
    setOrders([]);
    setCart([]);
    saveLocalCart([]);
    cartApi.clear();
  }, []);

  // ── Admin User Management ─────────────────────────────────────────────────

  const addUser = useCallback(
    async (payload: any) => {
      try {
        const res = await usersApi.create(payload);
        if (res.success) {
          await fetchUsers();
          return { success: true };
        }
        return { success: false, error: res.message };
      } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi khi thêm người dùng' };
      }
    },
    [fetchUsers]
  );

  const updateUser = useCallback(
    async (id: string, payload: any) => {
      try {
        const res = await usersApi.update(id, payload);
        if (res.success) {
          await fetchUsers();
          return { success: true };
        }
        return { success: false, error: res.message };
      } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi khi sửa tài khoản' };
      }
    },
    [fetchUsers]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      try {
        const res = await usersApi.delete(id);
        if (res.success) {
          setUsers((prev) => prev.filter((u) => u.id !== id));
          return { success: true };
        }
        return { success: false, error: res.message };
      } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi khi xóa người dùng' };
      }
    },
    []
  );

  // ── Cart ──────────────────────────────────────────────────────────────────

  const addToCart = useCallback(
    (product: ToyProduct, quantity: number = 1) => {
      setCart((prevCart) => {
        const existing = prevCart.find((item) => item.product.id === product.id);
        const updated = existing
          ? prevCart.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          : [...prevCart, { product, quantity }];
        saveLocalCart(updated);
        cartApi.save(updated, currentUser?.id);
        return updated;
      });
    },
    [currentUser?.id]
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      setCart((prev) => {
        const updated = prev.filter((item) => item.product.id !== productId);
        saveLocalCart(updated);
        cartApi.save(updated, currentUser?.id);
        return updated;
      });
    },
    [currentUser?.id]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      setCart((prev) => {
        const updated =
          quantity <= 0
            ? prev.filter((item) => item.product.id !== productId)
            : prev.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
              );
        saveLocalCart(updated);
        cartApi.save(updated, currentUser?.id);
        return updated;
      });
    },
    [currentUser?.id]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    saveLocalCart([]);
    cartApi.clear(currentUser?.id);
  }, [currentUser?.id]);

  // ── Voucher ───────────────────────────────────────────────────────────────

  const applyVoucher = useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    if (['TOYFUN20', 'KIDS20'].includes(clean)) {
      setDiscountVoucher(clean);
      setDiscountPercent(20);
      return { success: true, message: 'Áp dụng mã giảm giá 20% thành công! 🎉' };
    }
    if (['FREESHIP', 'TOY10'].includes(clean)) {
      setDiscountVoucher(clean);
      setDiscountPercent(10);
      return { success: true, message: 'Áp dụng mã giảm 10% thành công! 🚀' };
    }
    return { success: false, message: 'Mã giảm giá không hợp lệ.' };
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  const cartCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const shippingFee = useMemo(
    () => (cartTotal === 0 ? 0 : cartTotal >= 300000 ? 0 : 30000),
    [cartTotal]
  );

  const finalTotal = useMemo(() => {
    if (cartTotal === 0) return 0;
    const discountAmount = (cartTotal * discountPercent) / 100;
    return Math.max(0, cartTotal - discountAmount + shippingFee);
  }, [cartTotal, discountPercent, shippingFee]);

  const formatVND = (amount: number) => amount.toLocaleString('vi-VN') + ' đ';

  // ── Products CRUD (Admin) ─────────────────────────────────────────────────

  const addToy = useCallback(
    async (toyData: Omit<ToyProduct, 'id'>) => {
      try {
        const res = await productsApi.create(toyData);
        if (res.success && res.data) {
          setToys((prev) => [res.data, ...prev]);
          return { success: true };
        }
        return { success: false, error: 'Không thể thêm sản phẩm' };
      } catch (err: any) {
        // Fallback optimistic
        const optimistic: ToyProduct = { ...toyData, id: 'toy-' + Date.now() };
        setToys((prev) => [optimistic, ...prev]);
        return { success: true };
      }
    },
    []
  );

  const updateToy = useCallback(
    async (id: string, updated: Partial<ToyProduct>) => {
      try {
        setToys((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
        await productsApi.update(id, updated);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    []
  );

  const deleteToy = useCallback(
    async (id: string) => {
      try {
        setToys((prev) => prev.filter((t) => t.id !== id));
        await productsApi.delete(id);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    []
  );

  // ── Orders Management ─────────────────────────────────────────────────────

  const createOrder = useCallback(
    async (payload: {
      customerName: string;
      customerPhone: string;
      address: string;
      items?: Array<{ productId: string; quantity: number; price: number }>;
      totalAmount?: number;
      paymentMethod?: string;
      isGiftWrap?: boolean;
      userId?: string;
    }) => {
      try {
        const orderItems =
          payload.items && payload.items.length > 0
            ? payload.items
            : cart.map((c) => ({
                productId: c.product.id,
                quantity: c.quantity,
                price: c.product.price,
              }));

        const orderPayload = {
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          address: payload.address,
          items: orderItems,
          totalAmount: payload.totalAmount !== undefined ? payload.totalAmount : finalTotal,
          paymentMethod: payload.paymentMethod || 'COD',
          isGiftWrap: Boolean(payload.isGiftWrap),
          userId: payload.userId || currentUser?.id,
        };

        const res = await ordersApi.create(orderPayload);
        if (res.success && res.data) {
          await Promise.all([fetchOrders(), fetchToys()]);
          return { success: true, data: res.data };
        }
        return { success: false, error: res.message || 'Không thể tạo đơn hàng' };
      } catch (err: any) {
        console.error('createOrder error:', err);
        if (err instanceof ApiRequestError && err.status === 401) {
          setSessionToken(null, null);
          setCurrentUser(null);
          setOrders([]);
          return {
            success: false,
            error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại trước khi đặt hàng.',
          };
        }
        return { success: false, error: err.message || 'Lỗi khi đặt hàng' };
      }
    },
    [cart, finalTotal, currentUser, fetchOrders, fetchToys]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      const upperStatus = String(status).toUpperCase() as OrderStatus;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: upperStatus } : o))
      );
      try {
        const res = await ordersApi.updateStatus(orderId, upperStatus);
        await fetchOrders();
        return { success: true, data: res?.data };
      } catch (err: any) {
        console.log('Lỗi cập nhật trạng thái đơn hàng:', err);
        await fetchOrders();
        return { success: false, error: err.message || 'Lỗi khi cập nhật trạng thái' };
      }
    },
    [fetchOrders]
  );

  const deleteOrder = useCallback(
    async (orderId: string) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      try {
        await ordersApi.delete(orderId);
        await fetchOrders();
        return { success: true };
      } catch (err: any) {
        console.log('Lỗi xoá đơn hàng:', err);
        await fetchOrders();
        return { success: false, error: err.message || 'Lỗi khi xóa đơn hàng' };
      }
    },
    [fetchOrders]
  );

  // ── Favorites ─────────────────────────────────────────────────────────────

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  // ── Inventory Restock ──────────────────────────────────────────────────────
  const restockToy = useCallback(
    async (id: string, amount: number = 10, newStock?: number) => {
      try {
        const res = await inventoryApi.restock(id, amount, newStock);
        if (res.success) {
          await fetchToys();
          return { success: true };
        }
        return { success: false, error: res.message };
      } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi khi nhập thêm kho' };
      }
    },
    [fetchToys]
  );

  // ── Reviews & Ratings ──────────────────────────────────────────────────────
  const fetchProductReviews = useCallback(async (productId: string) => {
    try {
      const res = await reviewsApi.getByProduct(productId);
      return res.data || [];
    } catch {
      return [];
    }
  }, []);

  const submitReview = useCallback(
    async (
      productId: string,
      payload: { rating: number; comment: string; photos?: string; userName?: string; orderId?: string }
    ) => {
      try {
        const res = await reviewsApi.create(productId, {
          ...payload,
          userName: payload.userName || currentUser?.name || 'Khách Hàng ToyVerse',
        });
        if (res.success) {
          await fetchToys();
          return { success: true, data: res.data };
        }
        return { success: false, error: res.message };
      } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi khi gửi đánh giá' };
      }
    },
    [currentUser?.name, fetchToys]
  );

  return (
    <ToyStoreContext.Provider
      value={{
        toys,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        discountVoucher,
        discountPercent,
        applyVoucher,
        shippingFee,
        finalTotal,
        favorites,
        toggleFavorite,
        branches: STORE_BRANCHES,
        selectedToy,
        setSelectedToy,
        formatVND,
        currentUser,
        login,
        register,
        logout,
        users,
        fetchUsers,
        addUser,
        updateUser,
        deleteUser,
        orders,
        fetchOrders,
        createOrder,
        updateOrderStatus,
        deleteOrder,
        fetchToys,
        addToy,
        updateToy,
        deleteToy,
        restockToy,
        fetchProductReviews,
        submitReview,
      }}
    >
      {children}
    </ToyStoreContext.Provider>
  );
}

export function useToyStore() {
  const context = useContext(ToyStoreContext);
  if (!context) {
    throw new Error('useToyStore must be used within a ToyStoreProvider');
  }
  return context;
}
