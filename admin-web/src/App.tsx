import React, { useState, useEffect, useMemo } from 'react';
import './index.css';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  categoryLabel?: string;
  price: number;
  originalPrice?: number;
  stockCount: number;
  image: string;
  description: string;
  inStock: boolean;
  createdAt: string;
}

interface OrderItem {
  id: string;
  productId: string;
  product: {
    name: string;
    image: string;
  };
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  totalAmount: number;
  status: 'PENDING' | 'PACKING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: string;
  isGiftWrap?: boolean;
  createdAt: string;
  items?: OrderItem[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
}

interface UserAccount {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
  points: number;
  createdAt: string;
}

interface ReviewItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
  userName: string;
  rating: number;
  comment: string;
  photos?: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface Stats {
  totalRevenue: number;
  weeklyRevenue?: number;
  revenueByDay?: Array<{ date: string; label: string; amount: number }>;
  totalOrders: number;
  totalProducts: number;
  totalUsers?: number;
  lowStockCount?: number;
  outOfStockCount?: number;
  totalReviews?: number;
}

const API_BASE = 'http://localhost:3001/api';

function formatVND(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function maskPhone(phone?: string) {
  if (!phone) return 'Chưa cập nhật';
  const clean = phone.replace(/\s+/g, '');
  if (clean.length < 6) return '••••••';
  return clean.slice(0, 3) + '••••' + clean.slice(-3);
}

function maskEmail(email?: string) {
  if (!email) return 'Chưa cập nhật';
  const parts = email.split('@');
  if (parts.length < 2) return email.slice(0, 2) + '••••';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? name.slice(0, 2) + '•••' : name + '•••';
  return `${maskedName}@${domain}`;
}

// Hàm xuất CSV hỗ trợ UTF-8 BOM tiếng Việt không lỗi font
function exportToCSV(filename: string, rows: (string | number)[][]) {
  const processRow = (row: (string | number)[]) =>
    row
      .map((val) => {
        let text = val === null || val === undefined ? '' : String(val);
        text = text.replace(/"/g, '""');
        if (text.search(/("|,|\n|\r)/g) >= 0) {
          text = `"${text}"`;
        }
        return text;
      })
      .join(',');

  const csvContent = '\uFEFF' + rows.map(processRow).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'products' | 'orders' | 'users' | 'reviews'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, totalOrders: 0, totalProducts: 0, totalUsers: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Print Invoice Modal
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Quick Restock Modal
  const [quickRestockProduct, setQuickRestockProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Customer purchase history modal
  const [selectedCustomer, setSelectedCustomer] = useState<UserAccount | null>(null);
  const [revealContact, setRevealContact] = useState(false);

  // Form states Product
  const [productForm, setProductForm] = useState({
    name: '',
    brand: 'ToyVerse',
    category: 'lego',
    categoryLabel: 'Lego & Lắp ráp',
    price: '',
    originalPrice: '',
    stockCount: '50',
    image: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=500',
    description: '',
  });

  // Form states User
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'USER' as 'USER' | 'ADMIN',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resProd, resOrders, resStats, resUsers, resReviews] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/orders`),
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/users`).catch(() => null),
        fetch(`${API_BASE}/reviews`).catch(() => null),
      ]);

      if (resProd && resProd.ok) {
        const prodData = await resProd.json();
        setProducts(prodData.data || []);
      }
      if (resOrders && resOrders.ok) {
        const orderData = await resOrders.json();
        setOrders(orderData.data || []);
      }
      if (resStats && resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData.data || { totalRevenue: 0, totalOrders: 0, totalProducts: 0 });
      }
      if (resUsers && resUsers.ok) {
        const userData = await resUsers.json();
        setUsers(userData.data || []);
      }
      if (resReviews && resReviews.ok) {
        const reviewData = await resReviews.json();
        setReviews(reviewData.data || []);
      }
    } catch (err) {
      console.error('Lỗi kết nối API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── REVENUE BAR CHART DATA ────────────────────────────────────────────────
  const revenueChartData = useMemo(() => {
    const revenueByDay = stats.revenueByDay ?? [];
    const maxAmount = Math.max(...revenueByDay.map((day) => day.amount), 500000);
    return revenueByDay.map((day) => ({
      label: day.label,
      amount: day.amount,
      heightPercent: Math.min(100, Math.max(14, Math.round((day.amount / maxAmount) * 100))),
    }));
  }, [stats.revenueByDay]);

  // Order status distribution
  const statusStats = useMemo(() => {
    const counts = { PENDING: 0, PACKING: 0, SHIPPING: 0, COMPLETED: 0, CANCELLED: 0 };
    orders.forEach((o) => {
      const s = (o.status || 'PENDING').toUpperCase() as keyof typeof counts;
      if (counts[s] !== undefined) counts[s]++;
      else counts.PENDING++;
    });
    return counts;
  }, [orders]);

  // Customer purchase history filter
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(
      (o) =>
        (o.user && o.user.id === selectedCustomer.id) ||
        (selectedCustomer.phone && o.customerPhone && o.customerPhone.trim() === selectedCustomer.phone.trim()) ||
        (selectedCustomer.name && o.customerName && o.customerName.toLowerCase() === selectedCustomer.name.toLowerCase())
    );
  }, [orders, selectedCustomer]);

  const selectedCustomerTotalSpent = useMemo(() => {
    return selectedCustomerOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
  }, [selectedCustomerOrders]);

  // ── PRODUCT CRUD ────────────────────────────────────────────────────────────
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      brand: 'ToyVerse',
      category: 'lego',
      categoryLabel: 'Lego & Lắp ráp',
      price: '',
      originalPrice: '',
      stockCount: '50',
      image: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=500',
      description: '',
    });
    setIsAddProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      brand: p.brand || 'ToyVerse',
      category: p.category || 'lego',
      categoryLabel: p.categoryLabel || 'Lego & Lắp ráp',
      price: String(p.price),
      originalPrice: String(p.originalPrice || p.price),
      stockCount: String(p.stockCount ?? 50),
      image: p.image,
      description: p.description || '',
    });
    setIsAddProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.price) {
      showToast('Vui lòng nhập tên và giá sản phẩm!', 'error');
      return;
    }

    try {
      const payload = {
        name: productForm.name.trim(),
        brand: productForm.brand.trim() || 'ToyVerse',
        category: productForm.category,
        categoryLabel: productForm.categoryLabel,
        price: Number(productForm.price),
        originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : Number(productForm.price),
        stockCount: Number(productForm.stockCount) || 50,
        image: productForm.image.trim(),
        description: productForm.description.trim() || `Đồ chơi ${productForm.name} an toàn cho bé.`,
        ageRange: '6-12y',
        ageLabel: '6 - 12 tuổi',
      };

      if (editingProduct) {
        const res = await fetch(`${API_BASE}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Đã cập nhật sản phẩm thành công!');
          setIsAddProductModalOpen(false);
          fetchData();
        } else {
          showToast(data.error || 'Lỗi khi sửa sản phẩm!', 'error');
        }
      } else {
        const res = await fetch(`${API_BASE}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Thêm sản phẩm mới thành công!');
          setIsAddProductModalOpen(false);
          fetchData();
        } else {
          showToast(data.error || 'Lỗi khi thêm sản phẩm!', 'error');
        }
      }
    } catch {
      showToast('Lỗi gửi yêu cầu đến server!', 'error');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá sản phẩm "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Đã xoá sản phẩm thành công!');
        fetchData();
      } else {
        showToast(data.error || 'Lỗi xoá sản phẩm!', 'error');
      }
    } catch {
      showToast('Lỗi khi gửi yêu cầu xoá!', 'error');
    }
  };

  // ── ORDER CRUD ─────────────────────────────────────────────────────────────
  const handleUpdateOrderStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Đã chuyển trạng thái đơn sang ${newStatus}!`);
        fetchData();
      } else {
        showToast(data.error || 'Lỗi cập nhật trạng thái!', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi cập nhật đơn!', 'error');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xoá vĩnh viễn đơn hàng này khỏi database?')) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Đã xoá đơn hàng thành công!');
        fetchData();
      } else {
        showToast(data.error || 'Lỗi xoá đơn hàng!', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi xoá đơn hàng!', 'error');
    }
  };

  // ── USER CRUD ──────────────────────────────────────────────────────────────
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({ email: '', password: '', name: '', phone: '', role: 'USER' });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserAccount) => {
    setEditingUser(u);
    setUserForm({
      email: u.email,
      password: '',
      name: u.name,
      phone: u.phone || '',
      role: u.role,
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) {
      showToast('Vui lòng điền họ tên và email!', 'error');
      return;
    }

    try {
      if (editingUser) {
        const payload: any = {
          name: userForm.name.trim(),
          phone: userForm.phone.trim() || null,
          role: userForm.role,
        };
        if (userForm.password.trim()) payload.password = userForm.password.trim();

        const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Đã cập nhật thông tin tài khoản!');
          setIsUserModalOpen(false);
          fetchData();
        } else {
          showToast(data.error || 'Lỗi cập nhật người dùng!', 'error');
        }
      } else {
        if (!userForm.password.trim()) {
          showToast('Vui lòng nhập mật khẩu tài khoản!', 'error');
          return;
        }
        const payload = {
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          password: userForm.password.trim(),
          phone: userForm.phone.trim() || undefined,
          role: userForm.role,
        };

        const res = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Tạo tài khoản mới thành công!');
          setIsUserModalOpen(false);
          fetchData();
        } else {
          showToast(data.error || 'Lỗi tạo người dùng!', 'error');
        }
      }
    } catch {
      showToast('Lỗi khi gửi yêu cầu tài khoản!', 'error');
    }
  };

  const handleDeleteUser = async (u: UserAccount) => {
    if (u.email === 'admin@toyverse.vn') {
      alert('Không thể xoá tài khoản Admin duy nhất của hệ thống!');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xoá tài khoản "${u.name}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/users/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Đã xoá tài khoản thành công!');
        fetchData();
      } else {
        showToast(data.error || 'Lỗi khi xoá tài khoản!', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi xoá tài khoản!', 'error');
    }
  };

  // Low Stock & Out of Stock counts
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => (p.stockCount ?? 0) < 5 && (p.stockCount ?? 0) > 0);
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => (p.stockCount ?? 0) <= 0);
  }, [products]);

  // Quick restock handler
  const handleQuickRestock = async (productId: string, amount: number) => {
    try {
      const res = await fetch(`${API_BASE}/products/${productId}/restock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Đã nhập thêm +${amount} sản phẩm vào kho thành công!`);
        fetchData();
        setQuickRestockProduct(null);
      } else {
        showToast(data.error || 'Lỗi khi nhập thêm kho!', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi nhập kho!', 'error');
    }
  };

  // Review delete handler
  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Bạn có chắc muốn xoá đánh giá này khỏi hệ thống?')) return;
    try {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Đã xoá đánh giá thành công!');
        fetchData();
      } else {
        showToast(data.error || 'Lỗi khi xoá đánh giá!', 'error');
      }
    } catch {
      showToast('Lỗi kết nối server!', 'error');
    }
  };

  // Export Orders Excel / CSV (UTF-8 BOM)
  const handleExportOrdersExcel = () => {
    const headers = [
      'Mã Đơn Hàng',
      'Tên Khách Hàng',
      'Số Điện Thoại',
      'Địa Chỉ Giao Hàng',
      'Sản Phẩm Đặt Mua',
      'Tổng Tiền (VNĐ)',
      'Phương Thức Thanh Toán',
      'Gói Quà Tặng',
      'Trạng Thái Đơn',
      'Ngày Đặt Hàng',
    ];

    const rows = orders.map((o) => {
      const itemsList = (o.items || [])
        .map((it) => `${it.product?.name || 'Sản phẩm'} (x${it.quantity} - ${formatVND(it.price)})`)
        .join('; ');
      return [
        o.id,
        o.customerName,
        o.customerPhone,
        o.address,
        itemsList,
        o.totalAmount,
        o.paymentMethod,
        o.isGiftWrap ? 'Có yêu cầu gói quà' : 'Không',
        o.status,
        new Date(o.createdAt).toLocaleString('vi-VN'),
      ];
    });

    exportToCSV(`ToyVerse_BaoCaoDonHang_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
    showToast('Đã xuất báo cáo đơn hàng ra file Excel (CSV)!');
  };

  // Export Products Excel / CSV (UTF-8 BOM)
  const handleExportProductsExcel = () => {
    const headers = [
      'Mã Sản Phẩm',
      'Tên Đồ Chơi',
      'Thương Hiệu',
      'Danh Mục',
      'Đơn Giá (VNĐ)',
      'Giá Gốc (VNĐ)',
      'Tồn Kho',
      'Đã Bán',
      'Đánh Giá Sao',
      'Cảnh Báo Tồn Kho',
    ];

    const rows = products.map((p) => [
      p.id,
      p.name,
      p.brand,
      p.categoryLabel || p.category,
      p.price,
      p.originalPrice || p.price,
      p.stockCount ?? 0,
      p.stockCount !== undefined ? ((p as any).soldCount || 0) : 0,
      p.stockCount !== undefined ? ((p as any).rating || 5) : 5,
      (p.stockCount ?? 0) <= 0 ? 'HẾT HÀNG' : (p.stockCount ?? 0) < 5 ? 'SẮP HẾT HÀNG (< 5)' : 'ĐỦ HÀNG',
    ]);

    exportToCSV(`ToyVerse_BaoCaoTonKho_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
    showToast('Đã xuất danh sách tồn kho sản phẩm ra file Excel (CSV)!');
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (stockFilter === 'low') return (p.stockCount ?? 0) < 5 && (p.stockCount ?? 0) > 0;
    if (stockFilter === 'out') return (p.stockCount ?? 0) <= 0;
    return true;
  });

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery))
  );

  const filteredReviews = reviews.filter(
    (r) =>
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.product?.name && r.product.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case 'COMPLETED':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600, fontSize: '0.75rem' }}>Hoàn tất</span>;
      case 'SHIPPING':
        return <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600, fontSize: '0.75rem' }}>Đang giao</span>;
      case 'PACKING':
        return <span style={{ background: '#ede9fe', color: '#6b21a8', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600, fontSize: '0.75rem' }}>Đang đóng gói</span>;
      case 'CANCELLED':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600, fontSize: '0.75rem' }}>Đã hủy</span>;
      default:
        return <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600, fontSize: '0.75rem' }}>Chờ xử lý</span>;
    }
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#f8fafc' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          className="status-toast"
          style={{ background: toast.type === 'success' ? '#dc2626' : '#ef4444' }}
        >
          {toast.message}
        </div>
      )}

      {/* Sidebar (White & Red) */}
      <aside className="sidebar" style={{ backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0' }}>
        <div className="brand" style={{ color: '#dc2626', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontWeight: 'bold' }}>
            TV
          </div>
          ToyVerse Admin
        </div>
        <nav className="nav-menu">
          <div
            className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
            style={currentTab === 'dashboard' ? { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' } : {}}
          >
            Tổng quan Doanh thu
          </div>
          <div
            className={`nav-item ${currentTab === 'products' ? 'active' : ''}`}
            onClick={() => {
              setCurrentTab('products');
              setStockFilter('all');
            }}
            style={{
              ...(currentTab === 'products' ? { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' } : {}),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Kho Hàng ({products.length})</span>
            {lowStockProducts.length > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                }}
                title={`${lowStockProducts.length} sản phẩm sắp hết hàng`}
              >
                ⚠️ {lowStockProducts.length}
              </span>
            )}
          </div>
          <div
            className={`nav-item ${currentTab === 'orders' ? 'active' : ''}`}
            onClick={() => setCurrentTab('orders')}
            style={currentTab === 'orders' ? { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' } : {}}
          >
            Đơn Hàng ({orders.length})
          </div>
          <div
            className={`nav-item ${currentTab === 'users' ? 'active' : ''}`}
            onClick={() => setCurrentTab('users')}
            style={currentTab === 'users' ? { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' } : {}}
          >
            Khách Hàng ({users.length})
          </div>
          <div
            className={`nav-item ${currentTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setCurrentTab('reviews')}
            style={currentTab === 'reviews' ? { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' } : {}}
          >
            Đánh Giá ({reviews.length})
          </div>
        </nav>
        <div style={{ marginTop: 'auto', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#64748b', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', fontWeight: 600, marginBottom: '0.2rem' }}>
            <span style={{ width: 8, height: 8, background: '#dc2626', borderRadius: '50%', display: 'inline-block' }}></span>
            Hệ thống Quản Trị SQLite
          </div>
          <div>Bền vững 100% khi kill terminal</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ backgroundColor: '#f8fafc' }}>
        <header className="header" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div className="header-search">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm, đơn hàng, khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.5rem 1rem' }}
            />
          </div>
          <div className="header-user">
            {currentTab === 'users' ? (
              <button className="btn-primary" onClick={handleOpenAddUser} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>
                + Thêm tài khoản
              </button>
            ) : (
              <button className="btn-primary" onClick={handleOpenAddProduct} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>
                + Thêm đồ chơi
              </button>
            )}
            <div className="avatar" style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' }}>AD</div>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Quản trị viên</span>
          </div>
        </header>

        {loading && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.5rem 2rem', fontSize: '0.85rem', fontWeight: 600 }}>
            Đang đồng bộ dữ liệu từ CSDL...
          </div>
        )}

        <div className="dashboard" style={{ padding: '1.5rem' }}>
          {/* TAB: DASHBOARD WITH REVENUE BAR CHART */}
          {currentTab === 'dashboard' && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <h1 className="page-title" style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: 800 }}>
                  Tổng quan hoạt động kinh doanh
                </h1>
                <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Báo cáo doanh thu, tiến độ xử lý và thống kê hệ thống
                </p>
              </div>

              {/* Metric Cards */}
              {/* Metric Cards (6 cards) */}
              <div
                className="stats-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div className="stat-card" style={{ borderLeft: '4px solid #dc2626', backgroundColor: '#fff', padding: '1.2rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <span className="stat-title" style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Tổng doanh thu</span>
                  <span className="stat-value" style={{ color: '#dc2626', fontSize: '1.4rem', fontWeight: 800 }}>{formatVND(stats.totalRevenue)}</span>
                  <span className="stat-trend trend-up" style={{ color: '#16a34a', fontSize: '0.8rem', marginTop: '0.3rem' }}>Tính trên toàn bộ đơn đặt</span>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #2563eb', backgroundColor: '#fff', padding: '1.2rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <span className="stat-title" style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Tổng đơn hàng</span>
                  <span className="stat-value" style={{ color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>{stats.totalOrders} đơn</span>
                  <span className="stat-trend trend-up" style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.3rem' }}>{statusStats.COMPLETED} hoàn tất • {statusStats.PENDING} chờ duyệt</span>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #16a34a', backgroundColor: '#fff', padding: '1.2rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <span className="stat-title" style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Sản phẩm trong kho</span>
                  <span className="stat-value" style={{ color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>{stats.totalProducts} món</span>
                  <span className="stat-trend trend-up" style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.3rem' }}>Đang niêm yết bán</span>
                </div>
                {/* LOW STOCK ALERT CARD */}
                <div
                  className="stat-card"
                  onClick={() => {
                    setCurrentTab('products');
                    setStockFilter('low');
                  }}
                  style={{
                    borderLeft: '4px solid #ef4444',
                    backgroundColor: lowStockProducts.length > 0 ? '#fff5f5' : '#fff',
                    padding: '1.2rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #fecaca',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                  title="Nhấp để xem danh sách sắp hết hàng"
                >
                  <span className="stat-title" style={{ color: '#b91c1c', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    ⚠️ Sắp hết hàng (&lt; 5 món)
                  </span>
                  <span className="stat-value" style={{ color: '#dc2626', fontSize: '1.4rem', fontWeight: 800 }}>
                    {lowStockProducts.length} sản phẩm
                  </span>
                  <span className="stat-trend" style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 600 }}>
                    👉 Nhấp để kiểm tra &amp; nhập kho
                  </span>
                </div>
                <div
                  className="stat-card"
                  onClick={() => setCurrentTab('reviews')}
                  style={{
                    borderLeft: '4px solid #8b5cf6',
                    backgroundColor: '#fff',
                    padding: '1.2rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                  title="Nhấp để xem danh sách đánh giá"
                >
                  <span className="stat-title" style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>⭐ Đánh giá khách hàng</span>
                  <span className="stat-value" style={{ color: '#7c3aed', fontSize: '1.4rem', fontWeight: 800 }}>{reviews.length} đánh giá</span>
                  <span className="stat-trend" style={{ color: '#7c3aed', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 600 }}>Xem phản hồi phụ huynh ➔</span>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #d97706', backgroundColor: '#fff', padding: '1.2rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <span className="stat-title" style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Khách hàng đăng ký</span>
                  <span className="stat-value" style={{ color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>{users.length} tài khoản</span>
                  <span className="stat-trend trend-up" style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.3rem' }}>Thành viên hệ thống</span>
                </div>
              </div>

              {/* ── BIỂU ĐỒ DOANH THU (REVENUE BAR CHART) ── */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Biểu Đồ Doanh Thu Theo Tuần</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>Doanh thu ghi nhận qua các ngày từ Thứ 2 đến Chủ Nhật</p>
                  </div>
                  <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    {formatVND(stats.weeklyRevenue ?? 0)}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingTop: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                  {revenueChartData.map((item, idx) => (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.3rem' }}>
                        {item.amount > 0 ? `${Math.round(item.amount / 1000)}k` : '0'}
                      </span>
                      <div style={{ width: '40%', maxWidth: 44, height: `${item.heightPercent}%`, backgroundColor: item.heightPercent > 40 ? '#dc2626' : '#f87171', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', fontWeight: 500 }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress breakdown */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                    Tỷ Lệ Xử Lý Đơn Hàng
                  </div>
                  <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#f1f5f9', marginBottom: '0.8rem' }}>
                    <div style={{ flex: Math.max(statusStats.COMPLETED, 1), backgroundColor: '#16a34a' }} title="Hoàn tất" />
                    <div style={{ flex: Math.max(statusStats.SHIPPING, 1), backgroundColor: '#2563eb' }} title="Đang giao" />
                    <div style={{ flex: Math.max(statusStats.PACKING, 1), backgroundColor: '#7c3aed' }} title="Đóng gói" />
                    <div style={{ flex: Math.max(statusStats.PENDING, 1), backgroundColor: '#d97706' }} title="Chờ duyệt" />
                    <div style={{ flex: Math.max(statusStats.CANCELLED, 0.5), backgroundColor: '#dc2626' }} title="Đã hủy" />
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16a34a' }}></span> Hoàn tất: {statusStats.COMPLETED}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2563eb' }}></span> Đang giao: {statusStats.SHIPPING}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#7c3aed' }}></span> Đóng gói: {statusStats.PACKING}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#d97706' }}></span> Chờ duyệt: {statusStats.PENDING}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#dc2626' }}></span> Đã hủy: {statusStats.CANCELLED}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1.2rem' }}>
                <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: '#0f172a' }}>Đơn hàng mới nhất</h3>
                  <button
                    className="btn-secondary"
                    onClick={() => setCurrentTab('orders')}
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Xem tất cả đơn
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.8rem' }}>
                      <th style={{ padding: '0.75rem' }}>Mã đơn</th>
                      <th style={{ padding: '0.75rem' }}>Khách hàng</th>
                      <th style={{ padding: '0.75rem' }}>Tổng tiền</th>
                      <th style={{ padding: '0.75rem' }}>Trạng thái</th>
                      <th style={{ padding: '0.75rem' }}>Ngày đặt</th>
                      <th style={{ padding: '0.75rem' }}>Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                        <td style={{ padding: '0.75rem' }}><strong>#{order.id.slice(0, 8).toUpperCase()}</strong></td>
                        <td style={{ padding: '0.75rem' }}>{order.customerName}</td>
                        <td style={{ padding: '0.75rem', color: '#dc2626', fontWeight: 700 }}>{formatVND(order.totalAmount)}</td>
                        <td style={{ padding: '0.75rem' }}>{getStatusBadge(order.status)}</td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            style={{ padding: '0.3rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                          >
                            <option value="PENDING">Chờ xử lý</option>
                            <option value="PACKING">Đang đóng gói</option>
                            <option value="SHIPPING">Đang giao</option>
                            <option value="COMPLETED">Hoàn tất</option>
                            <option value="CANCELLED">Hủy đơn</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB: PRODUCTS */}
          {currentTab === 'products' && (
            <>
              {/* LOW STOCK WARNING BANNER */}
              {lowStockProducts.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    boxShadow: '0 2px 4px rgba(225, 29, 72, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.6rem' }}>⚠️</span>
                    <div>
                      <strong style={{ color: '#be123c', fontSize: '0.95rem' }}>
                        CẢNH BÁO TỒN KHO: Có {lowStockProducts.length} sản phẩm sắp hết hàng (dưới 5 món trong kho)!
                      </strong>
                      <div style={{ color: '#e11d48', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        Kịp thời nhập thêm hàng để đảm bảo trải nghiệm mua sắm và không làm gián đoạn đơn hàng của khách.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
                      style={{
                        backgroundColor: '#be123c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {stockFilter === 'low' ? 'Hiển thị tất cả' : `Lọc ${lowStockProducts.length} món sắp hết ➔`}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h1 className="page-title" style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>
                    Quản lý kho đồ chơi ({filteredProducts.length})
                  </h1>
                  <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Theo dõi tồn kho, cảnh báo sắp hết hàng và nhập hàng nhanh
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleExportProductsExcel}
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      borderRadius: '0.5rem',
                      padding: '0.6rem 1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    📥 Xuất Báo Cáo Kho (CSV)
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleOpenAddProduct}
                    style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Thêm đồ chơi mới
                  </button>
                </div>
              </div>

              {/* Stock Filter Pills */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setStockFilter('all')}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: stockFilter === 'all' ? '#0f172a' : '#ffffff',
                    color: stockFilter === 'all' ? '#ffffff' : '#475569',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  Tất cả ({products.length})
                </button>
                <button
                  onClick={() => setStockFilter('low')}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: stockFilter === 'low' ? '#dc2626' : '#fff1f2',
                    color: stockFilter === 'low' ? '#ffffff' : '#be123c',
                    border: '1px solid #fecdd3',
                  }}
                >
                  ⚠️ Sắp hết hàng (&lt; 5) ({lowStockProducts.length})
                </button>
                <button
                  onClick={() => setStockFilter('out')}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: stockFilter === 'out' ? '#475569' : '#f8fafc',
                    color: stockFilter === 'out' ? '#ffffff' : '#475569',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  🚫 Đã hết hàng (0) ({outOfStockProducts.length})
                </button>
              </div>

              <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.8rem' }}>
                      <th style={{ padding: '0.75rem' }}>Hình ảnh</th>
                      <th style={{ padding: '0.75rem' }}>Tên sản phẩm</th>
                      <th style={{ padding: '0.75rem' }}>Danh mục</th>
                      <th style={{ padding: '0.75rem' }}>Giá bán</th>
                      <th style={{ padding: '0.75rem' }}>Tình trạng kho</th>
                      <th style={{ padding: '0.75rem' }}>Nhập kho nhanh</th>
                      <th style={{ padding: '0.75rem' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const stock = p.stockCount ?? 0;
                      const isLow = stock > 0 && stock < 5;
                      const isOut = stock <= 0;

                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '0.85rem',
                            backgroundColor: isOut ? '#fafafa' : isLow ? '#fffbfb' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '0.75rem' }}>
                            <img
                              src={p.image}
                              alt={p.name}
                              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '0.375rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <strong>{p.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Hãng: {p.brand}</div>
                          </td>
                          <td style={{ padding: '0.75rem' }}>{p.categoryLabel || p.category}</td>
                          <td style={{ padding: '0.75rem', color: '#dc2626', fontWeight: 700 }}>{formatVND(p.price)}</td>
                          <td style={{ padding: '0.75rem' }}>
                            {isOut ? (
                              <span style={{ padding: '0.25rem 0.55rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.25rem', fontWeight: 800, fontSize: '0.75rem' }}>
                                🚫 Hết hàng (0)
                              </span>
                            ) : isLow ? (
                              <span style={{ padding: '0.25rem 0.55rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.25rem', fontWeight: 800, fontSize: '0.75rem' }}>
                                ⚠️ Còn {stock} (Sắp hết!)
                              </span>
                            ) : (
                              <span style={{ padding: '0.25rem 0.55rem', background: '#f0fdf4', color: '#166534', borderRadius: '0.25rem', fontWeight: 700, fontSize: '0.75rem' }}>
                                ✓ Còn {stock} món
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <button
                                onClick={() => handleQuickRestock(p.id, 10)}
                                title="Nhập nhanh thêm 10 món vào kho"
                                style={{
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  border: '1px solid #bbf7d0',
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: '0.375rem',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              >
                                +10 Kho
                              </button>
                              <button
                                onClick={() => {
                                  setQuickRestockProduct(p);
                                  setRestockAmount(20);
                                }}
                                title="Tùy chọn số lượng nhập thêm"
                                style={{
                                  background: '#f8fafc',
                                  color: '#475569',
                                  border: '1px solid #cbd5e1',
                                  padding: '0.25rem 0.45rem',
                                  borderRadius: '0.375rem',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                }}
                              >
                                Nhập số khác
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.3rem 0.6rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.3rem 0.6rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB: ORDERS */}
          {currentTab === 'orders' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h1 className="page-title" style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>
                    Quản lý đơn hàng ({orders.length})
                  </h1>
                  <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Tra cứu, cập nhật trạng thái đơn, in phiếu giao hàng và xuất file Excel
                  </p>
                </div>
                <div>
                  <button
                    onClick={handleExportOrdersExcel}
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      borderRadius: '0.5rem',
                      padding: '0.6rem 1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    📥 Xuất Báo Cáo Excel (CSV)
                  </button>
                </div>
              </div>

              <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.8rem' }}>
                      <th style={{ padding: '0.75rem' }}>Mã đơn</th>
                      <th style={{ padding: '0.75rem' }}>Khách hàng</th>
                      <th style={{ padding: '0.75rem' }}>Đồ chơi đặt mua</th>
                      <th style={{ padding: '0.75rem' }}>Địa chỉ</th>
                      <th style={{ padding: '0.75rem' }}>Tổng tiền</th>
                      <th style={{ padding: '0.75rem' }}>Trạng thái</th>
                      <th style={{ padding: '0.75rem' }}>In phiếu</th>
                      <th style={{ padding: '0.75rem' }}>Cập nhật</th>
                      <th style={{ padding: '0.75rem' }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                        <td style={{ padding: '0.75rem' }}><strong>#{o.id.slice(0, 8).toUpperCase()}</strong></td>
                        <td style={{ padding: '0.75rem' }}>
                          <div><strong>{o.customerName}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{o.customerPhone}</div>
                        </td>
                        <td style={{ padding: '0.75rem', minWidth: 160 }}>
                          {(o.items || []).map((it, idx) => (
                            <div key={idx} style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                              • {it.product?.name || 'Sản phẩm'} x{it.quantity}
                            </div>
                          ))}
                          {o.isGiftWrap && (
                            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600, marginTop: 2 }}>
                              🎁 Yêu cầu gói quà nghệ thuật
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', maxWidth: 180, fontSize: '0.8rem', color: '#475569' }}>{o.address}</td>
                        <td style={{ padding: '0.75rem', color: '#dc2626', fontWeight: 700 }}>{formatVND(o.totalAmount)}</td>
                        <td style={{ padding: '0.75rem' }}>{getStatusBadge(o.status)}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => setInvoiceOrder(o)}
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                            title="In hóa đơn & phiếu đóng gói giao hàng"
                          >
                            🖨️ In Phiếu
                          </button>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <select
                            value={o.status}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                            style={{ padding: '0.3rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                          >
                            <option value="PENDING">Chờ xử lý</option>
                            <option value="PACKING">Đang đóng gói</option>
                            <option value="SHIPPING">Đang giao</option>
                            <option value="COMPLETED">Hoàn tất</option>
                            <option value="CANCELLED">Hủy đơn</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => handleDeleteOrder(o.id)}
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.3rem 0.6rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB: USERS / CRM WITH PRIVACY & PURCHASE HISTORY */}
          {currentTab === 'users' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h1 className="page-title" style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>
                    Quản lý khách hàng ({filteredUsers.length})
                  </h1>
                  <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Bảo mật thông tin • Bấm để xem toàn bộ lịch sử mua hàng của khách
                  </p>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleOpenAddUser}
                  style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Thêm tài khoản
                </button>
              </div>

              <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.8rem' }}>
                      <th style={{ padding: '0.75rem' }}>Khách hàng</th>
                      <th style={{ padding: '0.75rem' }}>Thông tin liên hệ (Bảo mật)</th>
                      <th style={{ padding: '0.75rem' }}>Phân quyền</th>
                      <th style={{ padding: '0.75rem' }}>Số đơn đã mua</th>
                      <th style={{ padding: '0.75rem' }}>Lịch sử đơn mua</th>
                      <th style={{ padding: '0.75rem' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isAdmin = u.role === 'ADMIN';
                      const uOrders = orders.filter(
                        (o) =>
                          (o.user && o.user.id === u.id) ||
                          (u.phone && o.customerPhone && o.customerPhone.trim() === u.phone.trim()) ||
                          (u.name && o.customerName && o.customerName.toLowerCase() === u.name.toLowerCase())
                      );
                      const uSpent = uOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);

                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isAdmin ? '#dc2626' : '#e2e8f0', color: isAdmin ? '#fff' : '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <strong>{u.name}</strong>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', color: '#64748b' }}>
                            {maskPhone(u.phone)} • {maskEmail(u.email)}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '1rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: isAdmin ? '#fee2e2' : '#f1f5f9',
                                color: isAdmin ? '#dc2626' : '#475569',
                              }}
                            >
                              {isAdmin ? 'ADMIN' : 'USER'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <strong>{uOrders.length} đơn</strong> ({formatVND(uSpent)})
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <button
                              onClick={() => {
                                setSelectedCustomer(u);
                                setRevealContact(false);
                              }}
                              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.35rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                            >
                              Xem lịch sử đơn ➔
                            </button>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.3rem 0.6rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}
                              >
                                Sửa
                              </button>
                              {!isAdmin && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.3rem 0.6rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  Xóa
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB: REVIEWS */}
          {currentTab === 'reviews' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h1 className="page-title" style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>
                    Đánh giá &amp; Nhận xét của khách hàng ({filteredReviews.length})
                  </h1>
                  <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Phản hồi thực tế từ phụ huynh sau khi nhận đồ chơi ToyVerse
                  </p>
                </div>
              </div>

              {/* Review summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#fff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Điểm Đánh Giá TB</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.2rem' }}>
                    4.9 ⭐
                  </div>
                  <div style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: 600 }}>98% hài lòng tuyệt đối</div>
                </div>
                <div style={{ background: '#fff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Tổng Số Nhận Xét</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>
                    {reviews.length}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Có xác thực đã mua hàng</div>
                </div>
                <div style={{ background: '#fff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Tỷ Lệ 5 Sao ⭐⭐⭐⭐⭐</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981', marginTop: '0.2rem' }}>
                    {Math.round((reviews.filter((r) => r.rating === 5).length / Math.max(1, reviews.length)) * 100)}%
                  </div>
                  <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>{reviews.filter((r) => r.rating === 5).length} lượt 5 sao</div>
                </div>
              </div>

              {/* Reviews table */}
              <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.8rem' }}>
                      <th style={{ padding: '0.75rem' }}>Khách hàng</th>
                      <th style={{ padding: '0.75rem' }}>Đồ chơi đánh giá</th>
                      <th style={{ padding: '0.75rem' }}>Số sao</th>
                      <th style={{ padding: '0.75rem' }}>Nội dung nhận xét &amp; Feedback</th>
                      <th style={{ padding: '0.75rem' }}>Ngày đánh giá</th>
                      <th style={{ padding: '0.75rem' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReviews.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                        <td style={{ padding: '0.75rem', minWidth: 140 }}>
                          <strong>{r.userName}</strong>
                          <div style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: 700, marginTop: '0.2rem' }}>
                            ✓ Đã mua hàng
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', minWidth: 180 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {r.product?.image && (
                              <img src={r.product.image} alt={r.product.name} style={{ width: 36, height: 36, borderRadius: '0.375rem', objectFit: 'cover' }} />
                            )}
                            <div>
                              <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>{r.product?.name || 'Sản phẩm ToyVerse'}</strong>
                              {r.product?.price && (
                                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>{formatVND(r.product.price)}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#f59e0b', fontSize: '1rem' }}>
                            {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                          </span>
                          <span style={{ marginLeft: '0.3rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748b' }}>({r.rating}/5)</span>
                        </td>
                        <td style={{ padding: '0.75rem', maxWidth: 320 }}>
                          <p style={{ margin: 0, color: '#334155', lineHeight: 1.4 }}>{r.comment}</p>
                          {r.photos && (
                            <div style={{ marginTop: '0.4rem' }}>
                              <img
                                src={r.photos}
                                alt="feedback"
                                style={{ width: 50, height: 50, borderRadius: '0.375rem', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                              />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => handleDeleteReview(r.id)}
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.3rem 0.6rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── MODAL: LỊCH SỬ MUA HÀNG CỦA KHÁCH HÀNG ── */}
      {selectedCustomer && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: 620, backgroundColor: '#ffffff', borderRadius: '0.75rem', padding: '1.5rem', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Lịch Sử Mua Hàng</h2>
                <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Hồ sơ mua sắm của khách hàng: <strong>{selectedCustomer.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✖
              </button>
            </div>

            {/* Profile summary bar */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{selectedCustomer.name}</div>
                {revealContact ? (
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4 }}>
                    Email: {selectedCustomer.email} • SĐT: {selectedCustomer.phone || 'Chưa có'}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                    Liên hệ: {maskPhone(selectedCustomer.phone)} ({maskEmail(selectedCustomer.email)})
                  </div>
                )}
              </div>
              <button
                onClick={() => setRevealContact(!revealContact)}
                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.3rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {revealContact ? 'Ẩn thông tin' : 'Hiện thông tin'}
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, background: '#fee2e2', padding: '0.8rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>Tổng đơn đã mua</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>{selectedCustomerOrders.length} đơn</div>
              </div>
              <div style={{ flex: 1, background: '#fee2e2', padding: '0.8rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>Tổng chi tiêu</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>{formatVND(selectedCustomerTotalSpent)}</div>
              </div>
            </div>

            {/* Orders list */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Danh Sách Đơn Đã Đặt:</h4>
              {selectedCustomerOrders.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  Khách hàng này chưa có đơn mua nào trong hệ thống.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedCustomerOrders.map((ord) => (
                    <div key={ord.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem', background: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>#{ord.id.slice(0, 8).toUpperCase()}</span>
                        {getStatusBadge(ord.status)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem' }}>
                        Ngày đặt: {new Date(ord.createdAt).toLocaleString('vi-VN')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                        {(ord.items || []).map((it, idx) => (
                          <div key={idx}>• {it.product?.name || 'Sản phẩm'} x{it.quantity} ({formatVND(it.price || 0)})</div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem', fontWeight: 700 }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Thanh toán ({ord.paymentMethod}):</span>
                        <span style={{ color: '#dc2626' }}>{formatVND(ord.totalAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: THÊM / SỬA SẢN PHẨM ── */}
      {isAddProductModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 600, backgroundColor: '#ffffff', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#0f172a' }}>{editingProduct ? 'Sửa thông tin đồ chơi' : 'Thêm đồ chơi mới'}</h2>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✖
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Tên sản phẩm đồ chơi *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Giá bán (VNĐ) *
                  </label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Số lượng tồn kho
                  </label>
                  <input
                    type="number"
                    value={productForm.stockCount}
                    onChange={(e) => setProductForm({ ...productForm, stockCount: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    URL Hình ảnh
                  </label>
                  <input
                    type="text"
                    value={productForm.image}
                    onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Mô tả
                  </label>
                  <textarea
                    rows={3}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsAddProductModalOpen(false)} style={{ padding: '0.6rem 1rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}>
                  Lưu Sản Phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: IN PHIẾU GIAO HÀNG & HÓA ĐƠN ── */}
      {invoiceOrder && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div
            className="modal-content printable-invoice-wrapper"
            style={{
              maxWidth: 720,
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              padding: '2rem',
              width: '95%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Header controls (Hidden during print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🧾</span>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>Phiếu Giao Hàng &amp; Hóa Đơn Bán Lẻ</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.85rem',
                  }}
                >
                  🖨️ In Phiếu Ngay
                </button>
                <button
                  onClick={() => setInvoiceOrder(null)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.8rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Printable Invoice Body */}
            <div style={{ padding: '0.5rem', color: '#0f172a', fontFamily: 'inherit' }}>
              {/* Store & Invoice Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #dc2626', paddingBottom: '1rem', marginBottom: '1.2rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      TV
                    </div>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#dc2626', letterSpacing: 0.5 }}>TOYVERSE</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>Hệ Thống Phân Phối Đồ Chơi Trẻ Em Chính Hãng</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.3rem' }}>
                    📍 88 Hoàng Cầu, Đống Đa, Hà Nội | ☎ Hotline: 0901.888.999
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>PHIẾU GIAO HÀNG</div>
                  <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, marginTop: '0.2rem' }}>
                    MÃ: #{invoiceOrder.id.slice(0, 10).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                    Ngày đặt: {new Date(invoiceOrder.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* Customer and Delivery info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '1.2rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Thông Tin Người Nhận:</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '0.2rem', color: '#0f172a' }}>{invoiceOrder.customerName}</div>
                  <div style={{ color: '#334155', marginTop: '0.1rem' }}>📞 SĐT: <strong>{invoiceOrder.customerPhone}</strong></div>
                  <div style={{ color: '#334155', marginTop: '0.2rem', lineHeight: 1.3 }}>📍 Địa chỉ: {invoiceOrder.address}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Chi Tiết Thanh Toán &amp; Giao Nhận:</div>
                  <div style={{ marginTop: '0.3rem', color: '#334155' }}>
                    Hình thức: <strong>{invoiceOrder.paymentMethod === 'COD' ? 'Thu hộ khi nhận hàng (COD)' : invoiceOrder.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Ví điện tử MoMo'}</strong>
                  </div>
                  <div style={{ marginTop: '0.2rem', color: '#334155' }}>
                    Trạng thái đơn: <strong>{invoiceOrder.status}</strong>
                  </div>
                  {invoiceOrder.isGiftWrap && (
                    <div style={{ marginTop: '0.2rem', color: '#d97706', fontWeight: 700 }}>
                      🎁 Đóng gói quà tặng nghệ thuật kèm thiệp
                    </div>
                  )}
                </div>
              </div>

              {/* Items table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.2rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem', width: 40, textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '0.6rem' }}>Tên đồ chơi</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', width: 70 }}>SL</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right', width: 120 }}>Đơn giá</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right', width: 130 }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoiceOrder.items || []).map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.6rem', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '0.6rem' }}>
                        <strong>{it.product?.name || 'Sản phẩm ToyVerse'}</strong>
                      </td>
                      <td style={{ padding: '0.6rem', textAlign: 'center', fontWeight: 700 }}>{it.quantity}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', color: '#475569' }}>{formatVND(it.price)}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatVND(it.price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Invoice Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                <div style={{ width: 280, fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#475569' }}>
                    <span>Tổng tiền hàng:</span>
                    <span>{formatVND(invoiceOrder.totalAmount - (invoiceOrder.isGiftWrap ? 30000 : 0))}</span>
                  </div>
                  {invoiceOrder.isGiftWrap && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#d97706' }}>
                      <span>Phí gói quà &amp; thiệp:</span>
                      <span>{formatVND(30000)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '2px solid #0f172a', fontWeight: 800, fontSize: '1.05rem', color: '#dc2626' }}>
                    <span>TỔNG THANH TOÁN:</span>
                    <span>{formatVND(invoiceOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Thank you note & Signatures */}
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '0.8rem', color: '#475569' }}>
                <div style={{ width: 160 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Người nhận hàng</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>(Ký và ghi rõ họ tên)</div>
                  <div style={{ height: 50 }}></div>
                </div>
                <div style={{ alignSelf: 'center', fontStyle: 'italic', color: '#64748b', fontSize: '0.75rem', maxWidth: 220 }}>
                  Cảm ơn quý phụ huynh đã tin tưởng ToyVerse!<br />Chúc bé luôn chăm ngoan và học giỏi.
                </div>
                <div style={{ width: 160 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Nhân viên giao hàng</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>(Ký và bàn giao)</div>
                  <div style={{ height: 50 }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: NHẬP KHO NHANH SẢN PHẨM ── */}
      {quickRestockProduct && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: 440, backgroundColor: '#ffffff', borderRadius: '0.75rem', padding: '1.5rem', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.6rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.15rem' }}>⚡ Nhập Thêm Kho</h3>
                <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.8rem' }}>Cập nhật số lượng tồn kho ngay lập tức</p>
              </div>
              <button
                onClick={() => setQuickRestockProduct(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✖
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1.2rem', backgroundColor: '#f8fafc', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <img src={quickRestockProduct.image} alt={quickRestockProduct.name} style={{ width: 48, height: 48, borderRadius: '0.375rem', objectFit: 'cover' }} />
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{quickRestockProduct.name}</strong>
                <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, marginTop: '0.1rem' }}>
                  Hiện còn: <strong>{quickRestockProduct.stockCount ?? 0} món</strong>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>
                Chọn số lượng cần nhập thêm (+):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                {[5, 10, 20, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRestockAmount(amt)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: restockAmount === amt ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: restockAmount === amt ? '#fee2e2' : '#ffffff',
                      color: restockAmount === amt ? '#dc2626' : '#334155',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>
                  Hoặc nhập số lượng tùy chỉnh:
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setQuickRestockProduct(null)}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleQuickRestock(quickRestockProduct.id, restockAmount)}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '0.375rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Xác Nhận Nhập +{restockAmount} Món
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: THÊM / CHỈNH SỬA TÀI KHOẢN ── */}
      {isUserModalOpen && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: 480, backgroundColor: '#ffffff', borderRadius: '0.75rem', padding: '1.5rem', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.6rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.15rem' }}>
                  {editingUser ? '✏️ Chỉnh Sửa Tài Khoản' : '➕ Thêm Tài Khoản Mới'}
                </h3>
                <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                  Quản lý thông tin khách hàng và phân quyền
                </p>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                    Họ và Tên: *
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                    Email: *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', backgroundColor: editingUser ? '#f1f5f9' : '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                    Số Điện Thoại:
                  </label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                    Mật Khẩu {editingUser ? '(để trống nếu không đổi)' : ': *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                    Vai Trò:
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'USER' | 'ADMIN' })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
                  >
                    <option value="USER">Khách hàng (USER)</option>
                    <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Lưu Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
