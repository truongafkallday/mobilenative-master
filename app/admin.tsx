import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useToyStore, ToyProduct, User, Order } from '@/hooks/use-toy-store';
import { RevenueByDay, statsApi } from '@/hooks/api-client';

type AdminTab = 'dashboard' | 'inventory' | 'orders' | 'users';

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

export default function AdminScreen() {
  const router = useRouter();

  const {
    toys,
    orders,
    users,
    logout,
    formatVND,
    fetchToys,
    fetchOrders,
    fetchUsers,
    addToy,
    updateToy,
    deleteToy,
    updateOrderStatus,
    deleteOrder,
    addUser,
    updateUser,
    deleteUser,
    restockToy,
  } = useToyStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [revenueByDay, setRevenueByDay] = useState<RevenueByDay[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState(0);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // ── CSV Export Helper (Works on both Web and Native iOS/Android) ──────────
  const exportCSV = useCallback(
    async (filename: string, rows: (string | number)[][]) => {
      try {
        setIsExporting(true);
        const escape = (v: string | number) => {
          const s = String(v ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
            ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csvContent = '\uFEFF' + rows.map((r) => r.map(escape).join(',')).join('\r\n');

        // Web platform: Native browser download via Blob
        if (Platform.OS === 'web') {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return;
        }

        // Native iOS / Android: FileSystem and Sharing
        const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
        const fileUri = baseDir + filename;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const canShare = await Sharing.isAvailableAsync().catch(() => false);
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: `Chia sẻ ${filename}`,
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Đã lưu file', `File được lưu tại:\n${fileUri}`);
        }
      } catch (e: any) {
        console.error('Lỗi xuất file CSV:', e);
        if (Platform.OS === 'web') {
          alert('Lỗi xuất file: ' + (e?.message || 'Không thể xuất file CSV'));
        } else {
          Alert.alert('Lỗi xuất file', e?.message || 'Không thể xuất file CSV');
        }
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  const handleExportOrdersCSV = useCallback(async () => {
    const headers = [
      'Mã Đơn', 'Ngày Đặt', 'Khách Hàng', 'SĐT', 'Địa Chỉ',
      'Đồ Chơi', 'Tổng Tiền', 'Phương Thức', 'Gói Quà', 'Trạng Thái',
    ];
    const rows = orders.map((o) => {
      const items = (o.items || [])
        .map((it: any) => `${it.product?.name || it.name || '?'} x${it.quantity}`)
        .join(' | ');
      return [
        '#' + String(o.id).slice(0, 8).toUpperCase(),
        String(o.createdAt || ''),
        o.customerName || o.user?.name || 'Khách Hàng',
        o.customerPhone || o.user?.phone || '—',
        o.address || '—',
        items,
        o.totalAmount ?? o.total ?? 0,
        o.paymentMethod || 'COD',
        o.isGiftWrap ? 'Có' : 'Không',
        String(o.status ?? 'PENDING'),
      ];
    });
    const date = new Date().toISOString().slice(0, 10);
    await exportCSV(`ToyVerse_DonHang_${date}.csv`, [headers, ...rows]);
  }, [orders, exportCSV]);

  const handleExportProductsCSV = useCallback(async () => {
    const headers = [
      'Mã SP', 'Tên Sản Phẩm', 'Thương Hiệu', 'Danh Mục',
      'Giá Bán', 'Tồn Kho', 'Đã Bán', 'Đánh Giá', 'Lượt Đánh Giá',
    ];
    const rows = toys.map((t) => [
      t.id,
      t.name,
      t.brand,
      t.categoryLabel || t.category,
      t.price,
      t.stockCount ?? 0,
      t.soldCount ?? 0,
      t.rating ?? 0,
      t.reviewCount ?? 0,
    ]);
    const date = new Date().toISOString().slice(0, 10);
    await exportCSV(`ToyVerse_TonKho_${date}.csv`, [headers, ...rows]);
  }, [toys, exportCSV]);

  const handleExportUsersCSV = useCallback(async () => {
    const headers = [
      'Mã KH', 'Họ Và Tên', 'Email', 'SĐT',
      'Vai Trò', 'Bé Yêu', 'Ngày Sinh Bé', 'Điểm Thưởng', 'Số Đơn', 'Ngày Tạo',
    ];
    const rows = users.map((u) => [
      u.id,
      u.name,
      u.email,
      u.phone || '—',
      u.role === 'admin' ? 'Quản trị viên' : 'Khách hàng',
      u.kidName || '—',
      u.kidBirthday || '—',
      u.points ?? 0,
      u.orderCount ?? 0,
      String(u.createdAt || ''),
    ]);
    const date = new Date().toISOString().slice(0, 10);
    await exportCSV(`ToyVerse_KhachHang_${date}.csv`, [headers, ...rows]);
  }, [users, exportCSV]);

  // ── Refresh All Data ──────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [, , , stats] = await Promise.all([
        fetchToys(),
        fetchOrders(),
        fetchUsers(),
        statsApi.get(),
      ]);
      setRevenueByDay(stats.data.revenueByDay);
      setWeeklyRevenue(stats.data.weeklyRevenue);
    } catch (error) {
      console.error('Failed to refresh admin dashboard statistics:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchToys, fetchOrders, fetchUsers]);

  useEffect(() => {
    const refreshTask = setTimeout(() => {
      void handleRefresh();
    }, 0);
    return () => clearTimeout(refreshTask);
  }, [handleRefresh]);

  const handlePrintInvoice = () => {
    if (Platform.OS === 'web') {
      window.print();
    } else {
      Alert.alert('In phiếu giao hàng', 'Đã chuyển phiếu giao hàng sang thiết bị in.');
    }
  };

  // ── CUSTOMER DETAIL & PURCHASE HISTORY MODAL ──────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [showContactDetails, setShowContactDetails] = useState(false);

  // ── PRODUCT MODALS ────────────────────────────────────────────────────────
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ToyProduct | null>(null);

  const [pName, setPName] = useState('');
  const [pBrand, setPBrand] = useState('ToyVerse');
  const [pCategory, setPCategory] = useState('lego');
  const [pCategoryLabel, setPCategoryLabel] = useState('Xếp hình LEGO');
  const [pPrice, setPPrice] = useState('450000');
  const [pOriginalPrice, setPOriginalPrice] = useState('550000');
  const [pStock, setPStock] = useState('40');
  const [pImage, setPImage] = useState('https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=600');
  const [pDesc, setPDesc] = useState('Đồ chơi cao cấp chính hãng an toàn cho bé.');

  const resetProductForm = () => {
    setPName('');
    setPBrand('ToyVerse');
    setPCategory('lego');
    setPCategoryLabel('Xếp hình LEGO');
    setPPrice('450000');
    setPOriginalPrice('550000');
    setPStock('40');
    setPImage('https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=600');
    setPDesc('Đồ chơi cao cấp chính hãng an toàn cho bé.');
    setEditingProduct(null);
  };

  const handleSaveProduct = async () => {
    if (!pName.trim()) {
      if (Platform.OS === 'web') alert('Vui lòng nhập tên sản phẩm!');
      else Alert.alert('Lỗi', 'Vui lòng nhập tên sản phẩm!');
      return;
    }

    const priceNum = Number(pPrice) || 100000;
    const originalNum = Number(pOriginalPrice) || priceNum;
    const stockNum = Number(pStock) || 30;

    if (editingProduct) {
      const res = await updateToy(editingProduct.id, {
        name: pName.trim(),
        brand: pBrand.trim(),
        category: pCategory,
        categoryLabel: pCategoryLabel,
        price: priceNum,
        originalPrice: originalNum,
        stockCount: stockNum,
        image: pImage.trim(),
        description: pDesc.trim(),
      });
      if (res.success) {
        if (Platform.OS === 'web') alert('Đã cập nhật sản phẩm thành công!');
        else Alert.alert('Thành công', 'Đã cập nhật sản phẩm vào CSDL!');
        setShowAddProductModal(false);
        resetProductForm();
      }
    } else {
      const res = await addToy({
        name: pName.trim(),
        brand: pBrand.trim(),
        category: pCategory,
        categoryLabel: pCategoryLabel,
        ageRange: '6-12y',
        ageLabel: '6 - 12 tuổi',
        price: priceNum,
        originalPrice: originalNum,
        discountPercent: Math.round(((originalNum - priceNum) / originalNum) * 100) || 0,
        rating: 5.0,
        reviewCount: 0,
        soldCount: 0,
        stockCount: stockNum,
        image: pImage.trim(),
        description: pDesc.trim(),
        material: 'Nhựa ABS an toàn',
        origin: 'Chính hãng',
        inStock: true,
      });
      if (res.success) {
        if (Platform.OS === 'web') alert('Đã thêm sản phẩm mới thành công!');
        else Alert.alert('Thành công', 'Đã thêm sản phẩm mới vào hệ thống!');
        setShowAddProductModal(false);
        resetProductForm();
      }
    }
  };

  const openEditProduct = (toy: ToyProduct) => {
    setEditingProduct(toy);
    setPName(toy.name);
    setPBrand(toy.brand || 'ToyVerse');
    setPCategory(toy.category || 'lego');
    setPCategoryLabel(toy.categoryLabel || 'Đồ chơi');
    setPPrice(String(toy.price));
    setPOriginalPrice(String(toy.originalPrice || toy.price));
    setPStock(String(toy.stockCount ?? 30));
    setPImage(toy.image);
    setPDesc(toy.description || '');
    setShowAddProductModal(true);
  };

  const confirmDeleteProduct = async (id: string, name: string) => {
    if (Platform.OS === 'web') {
      const ok = window.confirm(`Bạn có chắc muốn xoá sản phẩm "${name}" khỏi database?`);
      if (ok) {
        await deleteToy(id);
        alert('Đã xoá sản phẩm thành công!');
      }
      return;
    }

    Alert.alert('Xác nhận xoá', `Bạn có chắc muốn xoá sản phẩm "${name}" khỏi database?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá vĩnh viễn',
        style: 'destructive',
        onPress: async () => {
          await deleteToy(id);
          Alert.alert('Đã xoá', 'Sản phẩm đã được gỡ bỏ khỏi cơ sở dữ liệu.');
        },
      },
    ]);
  };

  // ── USER MANAGEMENT MODALS ────────────────────────────────────────────────
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uName, setUName] = useState('');
  const [uPhone, setUPhone] = useState('');
  const [uRole, setURole] = useState<'USER' | 'ADMIN'>('USER');

  const resetUserForm = () => {
    setUEmail('');
    setUPassword('');
    setUName('');
    setUPhone('');
    setURole('USER');
    setEditingUser(null);
  };

  const openAddUser = () => {
    resetUserForm();
    setShowUserModal(true);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUEmail(user.email);
    setUPassword('');
    setUName(user.name);
    setUPhone(user.phone || '');
    setURole(user.role === 'admin' || user.roleRaw === 'ADMIN' ? 'ADMIN' : 'USER');
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!uEmail.trim() || !uName.trim()) {
      if (Platform.OS === 'web') alert('Email và Họ tên không được để trống!');
      else Alert.alert('Lỗi', 'Email và Họ tên không được để trống!');
      return;
    }

    if (editingUser) {
      const res = await updateUser(editingUser.id, {
        name: uName.trim(),
        phone: uPhone.trim() || null,
        role: uRole,
        password: uPassword.trim() ? uPassword.trim() : undefined,
      });

      if (res.success) {
        if (Platform.OS === 'web') alert('Đã cập nhật thông tin tài khoản!');
        else Alert.alert('Thành công', 'Đã cập nhật thông tin tài khoản!');
        setShowUserModal(false);
        resetUserForm();
      } else {
        if (Platform.OS === 'web') alert(res.error || 'Vui lòng thử lại');
        else Alert.alert('Lỗi cập nhật', res.error || 'Vui lòng thử lại');
      }
    } else {
      if (!uPassword.trim()) {
        if (Platform.OS === 'web') alert('Vui lòng nhập mật khẩu cho tài khoản mới!');
        else Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu cho tài khoản mới!');
        return;
      }
      const res = await addUser({
        email: uEmail.trim(),
        password: uPassword.trim(),
        name: uName.trim(),
        phone: uPhone.trim() || undefined,
        role: uRole,
        points: 500,
      });

      if (res.success) {
        if (Platform.OS === 'web') alert('Đã thêm tài khoản mới thành công!');
        else Alert.alert('Thành công', 'Đã thêm tài khoản mới thành công!');
        setShowUserModal(false);
        resetUserForm();
      } else {
        if (Platform.OS === 'web') alert(res.error || 'Email có thể đã tồn tại.');
        else Alert.alert('Lỗi tạo tài khoản', res.error || 'Email có thể đã tồn tại.');
      }
    }
  };

  const confirmDeleteUser = async (user: User) => {
    if (user.email === 'admin@toyverse.vn') {
      if (Platform.OS === 'web') alert('Không thể xoá tài khoản Admin duy nhất của hệ thống!');
      else Alert.alert('Cảnh báo', 'Không thể xoá tài khoản Admin duy nhất của hệ thống!');
      return;
    }

    if (Platform.OS === 'web') {
      const ok = window.confirm(`Bạn có chắc muốn xoá tài khoản "${user.name}"?`);
      if (ok) {
        const res = await deleteUser(user.id);
        if (res.success) alert('Đã xoá tài khoản thành công!');
        else alert(res.error || 'Lỗi khi xoá tài khoản');
      }
      return;
    }

    Alert.alert('Xác nhận xoá tài khoản', `Bạn có chắc muốn xoá tài khoản "${user.name}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá vĩnh viễn',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteUser(user.id);
          if (res.success) {
            Alert.alert('Đã xoá', 'Tài khoản đã được gỡ khỏi cơ sở dữ liệu.');
          } else {
            Alert.alert('Lỗi xoá', res.error || 'Không thể xoá tài khoản.');
          }
        },
      },
    ]);
  };

  const confirmDeleteOrder = async (orderId: string) => {
    if (Platform.OS === 'web') {
      const ok = window.confirm('Bạn có chắc muốn xoá đơn hàng này khỏi database?');
      if (ok) {
        await deleteOrder(orderId);
        alert('Đã xoá đơn hàng thành công!');
      }
      return;
    }
    Alert.alert('Xác nhận xoá', 'Bạn có chắc muốn xoá đơn hàng này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá vĩnh viễn',
        style: 'destructive',
        onPress: async () => {
          await deleteOrder(orderId);
          Alert.alert('Đã xoá', 'Đã xoá đơn hàng thành công!');
        },
      },
    ]);
  };

  const filteredToys = toys.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLowStock = !showLowStockOnly || (t.stockCount ?? 99) < 5;
    return matchSearch && matchLowStock;
  });

  const lowStockToysCount = toys.filter((t) => (t.stockCount ?? 99) < 5).length;
  const outOfStockToysCount = toys.filter((t) => (t.stockCount ?? 99) === 0).length;


  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery))
  );

  // ── STATS CALCULATION ─────────────────────────────────────────────────────
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount ?? o.total ?? 0), 0);
  const totalProductsCount = toys.length;
  const totalOrdersCount = orders.length;
  const totalUsersCount = users.length;

  // ── REVENUE CHART DATA (BAR CHART) ────────────────────────────────────────
  const revenueChartData = useMemo(() => {
    const maxAmount = Math.max(...revenueByDay.map((day) => day.amount), 500000);
    return revenueByDay.map((day) => ({
      label: day.label,
      amount: day.amount,
      heightPercent: Math.min(100, Math.max(14, Math.round((day.amount / maxAmount) * 100))),
    }));
  }, [revenueByDay]);

  // Orders status distribution for chart
  const statusStats = useMemo(() => {
    const counts = { PENDING: 0, PACKING: 0, SHIPPING: 0, COMPLETED: 0, CANCELLED: 0 };
    orders.forEach((o) => {
      const s = (o.status || 'PENDING').toUpperCase() as keyof typeof counts;
      if (counts[s] !== undefined) counts[s]++;
      else counts.PENDING++;
    });
    return counts;
  }, [orders]);

  // Selected Customer's Purchase History
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(
      (o) =>
        (o.userId && o.userId === selectedCustomer.id) ||
        (o.user && o.user.id === selectedCustomer.id) ||
        (selectedCustomer.phone && o.customerPhone && o.customerPhone.trim() === selectedCustomer.phone.trim()) ||
        (selectedCustomer.name && o.customerName && o.customerName.toLowerCase() === selectedCustomer.name.toLowerCase())
    );
  }, [orders, selectedCustomer]);

  const selectedCustomerTotalSpent = useMemo(() => {
    return selectedCustomerOrders.reduce((sum, o) => sum + (o.totalAmount ?? o.total ?? 0), 0);
  }, [selectedCustomerOrders]);

  return (
    <View style={styles.container}>
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TOP ADMIN HEADER (White & Red Theme)                                          */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandBadge}>
            <IconSymbol name="shield.checkerboard" size={18} color="#DC2626" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>ToyVerse</Text>
              <View style={styles.adminTag}>
                <Text style={styles.adminTagText}>ADMIN</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Quản Trị Bán Hàng & Kho Hàng</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <IconSymbol name="arrow.clockwise" size={16} color="#DC2626" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
            onPress={() => {
              logout();
              router.replace('/login' as any);
            }}
          >
            <IconSymbol name="arrow.right.square" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* NAVIGATION TABS (Red & White Segmented Controls)                              */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <View style={styles.navBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navBarContent}>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'dashboard' && styles.navTabActive]}
            onPress={() => setActiveTab('dashboard')}
          >
            <IconSymbol
              name="chart.bar.fill"
              size={14}
              color={activeTab === 'dashboard' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.navTabText, activeTab === 'dashboard' && styles.navTabTextActive]}>
              Tổng Quan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'inventory' && styles.navTabActive]}
            onPress={() => setActiveTab('inventory')}
          >
            <IconSymbol
              name="shippingbox.fill"
              size={14}
              color={activeTab === 'inventory' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.navTabText, activeTab === 'inventory' && styles.navTabTextActive]}>
              Kho Hàng ({toys.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'orders' && styles.navTabActive]}
            onPress={() => setActiveTab('orders')}
          >
            <IconSymbol
              name="cart.fill"
              size={14}
              color={activeTab === 'orders' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.navTabText, activeTab === 'orders' && styles.navTabTextActive]}>
              Đơn Hàng ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'users' && styles.navTabActive]}
            onPress={() => setActiveTab('users')}
          >
            <IconSymbol
              name="person.fill"
              size={14}
              color={activeTab === 'users' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.navTabText, activeTab === 'users' && styles.navTabTextActive]}>
              Khách Hàng ({users.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mainScroll}>
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: TỔNG QUAN & BIỂU ĐỒ DOANH THU                                      */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <View style={styles.tabContent}>
            {/* Top Metric Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: '#DC2626', borderLeftWidth: 4 }]}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Doanh Thu Thu Được</Text>
                  <IconSymbol name="tag.fill" size={16} color="#DC2626" />
                </View>
                <Text style={[styles.statValue, { color: '#DC2626' }]}>{formatVND(totalRevenue)}</Text>
                <Text style={styles.statSubText}>Tính trên toàn bộ đơn đặt hàng</Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#2563EB', borderLeftWidth: 4 }]}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Tổng Đơn Hàng</Text>
                  <IconSymbol name="cart.fill" size={16} color="#2563EB" />
                </View>
                <Text style={[styles.statValue, { color: '#1E293B' }]}>{totalOrdersCount}</Text>
                <Text style={styles.statSubText}>
                  {statusStats.COMPLETED} thành công • {statusStats.PENDING} chờ xử lý
                </Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#16A34A', borderLeftWidth: 4 }]}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Sản Phẩm Trong Kho</Text>
                  <IconSymbol name="shippingbox.fill" size={16} color="#16A34A" />
                </View>
                <Text style={[styles.statValue, { color: '#1E293B' }]}>{totalProductsCount}</Text>
                <Text style={styles.statSubText}>Mặt hàng đang kinh doanh</Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#D97706', borderLeftWidth: 4 }]}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Tài Khoản Thành Viên</Text>
                  <IconSymbol name="person.fill" size={16} color="#D97706" />
                </View>
                <Text style={[styles.statValue, { color: '#1E293B' }]}>{totalUsersCount}</Text>
                <Text style={styles.statSubText}>Khách hàng đã đăng ký</Text>
              </View>
            </View>

            {/* ── BIỂU ĐỒ DOANH THU (REVENUE BAR CHART) ────────────────────────── */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleBox}>
                  <Text style={styles.chartTitle} numberOfLines={1}>Biểu Đồ Doanh Thu</Text>
                  <Text style={styles.chartSubtitle} numberOfLines={1}>Biến động doanh thu theo tuần</Text>
                </View>
                <View style={styles.chartTotalBadge}>
                  <Text style={styles.chartTotalBadgeText} numberOfLines={1}>{formatVND(weeklyRevenue)}</Text>
                </View>
              </View>

              {/* Bar Chart Columns */}
              <View style={styles.barChartContainer}>
                {revenueChartData.map((item, idx) => (
                  <View key={idx} style={styles.barColumn}>
                    {/* Amount tooltip above bar */}
                    <Text style={styles.barAmountText} numberOfLines={1}>
                      {item.amount >= 1000000
                        ? `${(item.amount / 1000000).toFixed(1)}M`
                        : item.amount > 0
                        ? `${Math.round(item.amount / 1000)}k`
                        : '0'}
                    </Text>

                    {/* Bar Pillar */}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: `${item.heightPercent}%` },
                          idx === 3 || item.heightPercent > 50
                            ? { backgroundColor: '#DC2626' }
                            : { backgroundColor: '#F87171' },
                        ]}
                      />
                    </View>

                    {/* Day label */}
                    <Text style={styles.barDayLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── PHÂN BỐ TRẠNG THÁI ĐƠN HÀNG ──────────────────────────────────── */}
            <View style={styles.statusBreakdownCard}>
              <Text style={styles.statusBreakdownTitle}>Tỷ Lệ Xử Lý Đơn Hàng</Text>
              <Text style={styles.statusBreakdownSub}>Theo dõi tiến độ hoàn thành các đơn hàng</Text>

              {/* Segmented Distribution Bar */}
              <View style={styles.segmentedProgressBar}>
                <View
                  style={{
                    flex: Math.max(statusStats.COMPLETED, 1),
                    backgroundColor: '#16A34A',
                    height: '100%',
                  }}
                />
                <View
                  style={{
                    flex: Math.max(statusStats.SHIPPING, 1),
                    backgroundColor: '#2563EB',
                    height: '100%',
                  }}
                />
                <View
                  style={{
                    flex: Math.max(statusStats.PACKING, 1),
                    backgroundColor: '#7C3AED',
                    height: '100%',
                  }}
                />
                <View
                  style={{
                    flex: Math.max(statusStats.PENDING, 1),
                    backgroundColor: '#D97706',
                    height: '100%',
                  }}
                />
                <View
                  style={{
                    flex: Math.max(statusStats.CANCELLED, 0.5),
                    backgroundColor: '#DC2626',
                    height: '100%',
                  }}
                />
              </View>

              {/* Legend Grid */}
              <View style={styles.legendGrid}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
                  <Text style={styles.legendText}>Hoàn tất: {statusStats.COMPLETED}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                  <Text style={styles.legendText}>Đang giao: {statusStats.SHIPPING}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#7C3AED' }]} />
                  <Text style={styles.legendText}>Đóng gói: {statusStats.PACKING}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
                  <Text style={styles.legendText}>Chờ duyệt: {statusStats.PENDING}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
                  <Text style={styles.legendText}>Đã hủy: {statusStats.CANCELLED}</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsCard}>
              <Text style={styles.quickActionsTitle}>Tác Vụ Quản Trị Nhanh</Text>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: '#DC2626' }]}
                  onPress={() => {
                    resetProductForm();
                    setShowAddProductModal(true);
                  }}
                >
                  <IconSymbol name="plus" size={14} color="#FFFFFF" />
                  <Text style={styles.quickActionBtnText}>Thêm Đồ Chơi</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: '#1E293B' }]}
                  onPress={openAddUser}
                >
                  <IconSymbol name="plus" size={14} color="#FFFFFF" />
                  <Text style={styles.quickActionBtnText}>Thêm Tài Khoản</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: QUẢN LÝ KHO HÀNG (PRODUCTS)                                        */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'inventory' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Danh Mục Đồ Chơi</Text>
                <Text style={styles.sectionSubtitle}>Cập nhật giá, kho và thông tin sản phẩm</Text>
              </View>

              <TouchableOpacity
                style={styles.primaryRedBtn}
                onPress={() => {
                  resetProductForm();
                  setShowAddProductModal(true);
                }}
              >
                <IconSymbol name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.primaryRedBtnText}>Thêm Đồ Chơi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportCsvBtn}
                onPress={handleExportProductsCSV}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size={12} color="#059669" />
                ) : (
                  <Text style={styles.exportCsvBtnText}>📥 Xuất CSV</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Low Stock Alert Banner */}
            {lowStockToysCount > 0 && (
              <View style={styles.lowStockAlertBanner}>
                <View style={styles.lowStockAlertLeft}>
                  <Text style={styles.lowStockAlertIcon}>⚠️</Text>
                  <View>
                    <Text style={styles.lowStockAlertTitle}>
                      Cảnh Báo Kho Sắp Hết Hàng
                    </Text>
                    <Text style={styles.lowStockAlertSub}>
                      {lowStockToysCount} sản phẩm stockCount &lt; 5 •{' '}
                      {outOfStockToysCount} hết hàng hoàn toàn
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.lowStockFilterPill,
                    showLowStockOnly && { backgroundColor: '#DC2626' },
                  ]}
                  onPress={() => setShowLowStockOnly(!showLowStockOnly)}
                >
                  <Text
                    style={[
                      styles.lowStockFilterPillText,
                      showLowStockOnly && { color: '#FFFFFF' },
                    ]}
                  >
                    {showLowStockOnly ? '✓ Sắp hết' : 'Lọc sắp hết'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Search Box */}
            <View style={styles.searchBox}>
              <IconSymbol name="magnifyingglass" size={16} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm theo tên đồ chơi, thương hiệu..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Product Cards */}
            <View style={{ gap: 10 }}>
              {filteredToys.map((toy) => {
                const isLowStock = (toy.stockCount ?? 99) < 5;
                const isOutOfStock = (toy.stockCount ?? 99) === 0;
                return (
                  <View
                    key={toy.id}
                    style={[
                      styles.productCard,
                      isLowStock && {
                        borderWidth: 1.5,
                        borderColor: isOutOfStock ? '#DC2626' : '#F59E0B',
                      },
                    ]}
                  >
                    <Image source={{ uri: toy.image }} style={styles.productImg} contentFit="cover" />

                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {toy.name}
                      </Text>
                      <Text style={styles.productBrand}>
                        {toy.brand} • {toy.categoryLabel || toy.category}
                      </Text>

                      <View style={styles.productPriceRow}>
                        <Text style={styles.productPrice}>{formatVND(toy.price)}</Text>
                        {isOutOfStock ? (
                          <View style={[styles.productStockBadge, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={[styles.productStockText, { color: '#DC2626' }]}>
                              ❌ Hết hàng
                            </Text>
                          </View>
                        ) : isLowStock ? (
                          <View style={[styles.productStockBadge, { backgroundColor: '#FEF3C7' }]}>
                            <Text style={[styles.productStockText, { color: '#D97706' }]}>
                              ⚠️ Còn {toy.stockCount}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.productStockBadge}>
                            <Text style={styles.productStockText}>Kho: {toy.stockCount ?? 20}</Text>
                          </View>
                        )}
                      </View>

                      {/* Quick Restock Row for low-stock items */}
                      {isLowStock && (
                        <View style={styles.restockRow}>
                          <Text style={styles.restockLabel}>Nhập thêm nhanh:</Text>
                          <TouchableOpacity
                            style={styles.restockBtn}
                            onPress={() => restockToy(toy.id, 10).then(() => fetchToys())}
                          >
                            <Text style={styles.restockBtnText}>+10</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.restockBtn, { backgroundColor: '#2563EB' }]}
                            onPress={() => restockToy(toy.id, 30).then(() => fetchToys())}
                          >
                            <Text style={styles.restockBtnText}>+30</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={styles.productActions}>
                      <TouchableOpacity
                        style={styles.editActionBtn}
                        onPress={() => openEditProduct(toy)}
                      >
                        <IconSymbol name="pencil" size={14} color="#2563EB" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteActionBtn}
                        onPress={() => confirmDeleteProduct(toy.id, toy.name)}
                      >
                        <IconSymbol name="trash.fill" size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: QUẢN LÝ ĐƠN HÀNG (ORDERS)                                          */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Quản Lý Đơn Hàng</Text>
                <Text style={styles.sectionSubtitle}>Duyệt và cập nhật trạng thái đơn của khách</Text>
              </View>
              <TouchableOpacity
                style={styles.exportCsvBtn}
                onPress={handleExportOrdersCSV}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size={12} color="#059669" />
                ) : (
                  <Text style={styles.exportCsvBtnText}>📥 Xuất CSV</Text>
                )}
              </TouchableOpacity>
            </View>

            {orders.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <IconSymbol name="shippingbox.fill" size={32} color="#94A3B8" />
                <Text style={styles.emptyStateText}>Chưa có đơn hàng nào trong hệ thống</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {orders.map((order) => {
                  const upperStatus = String(order.status).toUpperCase();

                  const getStatusBadgeStyle = () => {
                    switch (upperStatus) {
                      case 'COMPLETED':
                        return { bg: '#DCFCE7', text: '#15803D', label: 'Hoàn Tất' };
                      case 'SHIPPING':
                        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Đang Giao' };
                      case 'PACKING':
                        return { bg: '#EDE9FE', text: '#6B21A8', label: 'Đang Đóng Gói' };
                      case 'CANCELLED':
                        return { bg: '#FEE2E2', text: '#B91C1C', label: 'Đã Hủy' };
                      default:
                        return { bg: '#FEF3C7', text: '#92400E', label: 'Chờ Xử Lý' };
                    }
                  };

                  const badge = getStatusBadgeStyle();

                  return (
                    <View key={order.id} style={styles.orderCard}>
                      {/* Order Code & Status Badge */}
                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={styles.orderCode}>
                            #{order.id.slice(0, 8).toUpperCase()}
                          </Text>
                          <Text style={styles.orderDate}>{order.createdAt}</Text>
                        </View>

                        <View style={[styles.orderStatusBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.orderStatusBadgeText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>

                      {/* Customer Info */}
                      <View style={styles.orderCustomerSection}>
                        <View style={styles.orderInfoLine}>
                          <Text style={styles.orderInfoLabel}>Khách hàng:</Text>
                          <Text style={styles.orderInfoValue} numberOfLines={1}>
                            {order.customerName || order.user?.name || 'Khách Hàng'} ({order.customerPhone || order.user?.phone || 'Chưa có SĐT'})
                          </Text>
                        </View>

                        <View style={styles.orderInfoLine}>
                          <Text style={styles.orderInfoLabel}>Địa chỉ:</Text>
                          <Text style={styles.orderInfoValue} numberOfLines={2}>
                            {order.address}
                          </Text>
                        </View>

                        {order.isGiftWrap && (
                          <View style={styles.giftWrappedTag}>
                            <Text style={styles.giftWrappedTagText}>
                              Yêu cầu gói quà nghệ thuật & thiệp mừng
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Items List */}
                      {order.items && order.items.length > 0 && (
                        <View style={styles.orderItemsBox}>
                          <Text style={styles.orderItemsTitle}>
                            Đồ chơi trong đơn ({order.items.length} món):
                          </Text>
                          {order.items.map((it, idx) => (
                            <View key={idx} style={styles.orderItemLine}>
                              <Text style={styles.orderItemName} numberOfLines={1}>
                                • {it.product?.name || 'Sản phẩm'}
                              </Text>
                              <Text style={styles.orderItemQtyPrice}>
                                x{it.quantity} ({formatVND(it.product?.price || 0)})
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Total */}
                      <View style={styles.orderTotalLine}>
                        <Text style={styles.orderTotalLabel}>
                          Tổng tiền ({order.paymentMethod}):
                        </Text>
                        <Text style={styles.orderTotalValue}>
                          {formatVND(order.totalAmount ?? order.total ?? 0)}
                        </Text>
                      </View>

                      {/* Status Action Buttons (REDESIGNED: Clean, High Contrast) */}
                      <View style={styles.statusActionSection}>
                        <Text style={styles.statusActionTitle}>Chuyển trạng thái đơn:</Text>

                        <View style={styles.statusPillsRow}>
                          <TouchableOpacity
                            style={[
                              styles.statusPill,
                              upperStatus === 'PENDING' && styles.statusPillActivePending,
                            ]}
                            onPress={() => updateOrderStatus(order.id, 'PENDING')}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                upperStatus === 'PENDING' && { color: '#92400E', fontWeight: 'bold' },
                              ]}
                            >
                              Chờ xử lý
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.statusPill,
                              upperStatus === 'PACKING' && styles.statusPillActivePacking,
                            ]}
                            onPress={() => updateOrderStatus(order.id, 'PACKING')}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                upperStatus === 'PACKING' && { color: '#6B21A8', fontWeight: 'bold' },
                              ]}
                            >
                              Đóng gói
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.statusPill,
                              upperStatus === 'SHIPPING' && styles.statusPillActiveShipping,
                            ]}
                            onPress={() => updateOrderStatus(order.id, 'SHIPPING')}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                upperStatus === 'SHIPPING' && { color: '#1E40AF', fontWeight: 'bold' },
                              ]}
                            >
                              Giao hàng
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.statusPill,
                              upperStatus === 'COMPLETED' && styles.statusPillActiveCompleted,
                            ]}
                            onPress={() => updateOrderStatus(order.id, 'COMPLETED')}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                upperStatus === 'COMPLETED' && { color: '#15803D', fontWeight: 'bold' },
                              ]}
                            >
                              Hoàn tất
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.statusPill,
                              upperStatus === 'CANCELLED' && styles.statusPillActiveCancelled,
                            ]}
                            onPress={() => updateOrderStatus(order.id, 'CANCELLED')}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                upperStatus === 'CANCELLED' && { color: '#B91C1C', fontWeight: 'bold' },
                              ]}
                            >
                              Hủy đơn
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.printInvoicePill}
                            onPress={() => setInvoiceOrder(order)}
                          >
                            <Text style={styles.printInvoicePillText}>🖨️ In Phiếu</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deleteOrderPill}
                            onPress={() => confirmDeleteOrder(order.id)}
                          >
                            <IconSymbol name="trash.fill" size={13} color="#DC2626" />
                            <Text style={styles.deleteOrderPillText}>Xóa</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: QUẢN LÝ KHÁCH HÀNG (CRM & PRIVACY & PURCHASE HISTORY)              */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Danh Sách Khách Hàng</Text>
                <Text style={styles.sectionSubtitle}>
                  Bảo mật thông tin • Bấm để xem toàn bộ lịch sử mua hàng
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.primaryRedBtn} onPress={openAddUser}>
                  <IconSymbol name="plus" size={14} color="#FFFFFF" />
                  <Text style={styles.primaryRedBtnText}>Thêm Tài Khoản</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportCsvBtn}
                  onPress={handleExportUsersCSV}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <ActivityIndicator size={12} color="#059669" />
                  ) : (
                    <Text style={styles.exportCsvBtnText}>📥 Xuất CSV</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Box */}
            <View style={styles.searchBox}>
              <IconSymbol name="magnifyingglass" size={16} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm theo họ tên hoặc ID khách hàng..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Customer List (PRIVACY PROTECTED) */}
            <View style={{ gap: 12 }}>
              {filteredUsers.map((u) => {
                const isAdmin = u.role === 'admin' || u.roleRaw === 'ADMIN';

                // Find this customer's total orders & spend
                const uOrders = orders.filter(
                  (o) =>
                    (o.userId && o.userId === u.id) ||
                    (o.user && o.user.id === u.id) ||
                    (u.phone && o.customerPhone && o.customerPhone.trim() === u.phone.trim()) ||
                    (u.name && o.customerName && o.customerName.toLowerCase() === u.name.toLowerCase())
                );
                const uSpent = uOrders.reduce((sum, o) => sum + (o.totalAmount ?? o.total ?? 0), 0);

                return (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.customerCard}
                    activeOpacity={0.88}
                    onPress={() => {
                      setSelectedCustomer(u);
                      setShowContactDetails(false);
                    }}
                  >
                    <View style={styles.customerCardMain}>
                      {/* Avatar */}
                      <View style={[styles.customerAvatar, isAdmin && { backgroundColor: '#DC2626' }]}>
                        <Text style={styles.customerAvatarText}>
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={styles.customerInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.customerName}>{u.name}</Text>
                          <View
                            style={[
                              styles.customerRoleBadge,
                              isAdmin ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#F1F5F9' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.customerRoleBadgeText,
                                isAdmin ? { color: '#DC2626' } : { color: '#475569' },
                              ]}
                            >
                              {isAdmin ? 'QUẢN TRỊ' : 'KHÁCH HÀNG'}
                            </Text>
                          </View>
                        </View>

                        {/* Privacy: Masked Contact Line */}
                        <Text style={styles.customerMaskedContact}>
                          Liên hệ: {maskPhone(u.phone)} • {maskEmail(u.email)}
                        </Text>

                        {/* Orders count and total spent */}
                        <View style={styles.customerStatsRow}>
                          <Text style={styles.customerOrdersCount}>
                            Đã mua: <Text style={{ fontWeight: 'bold' }}>{uOrders.length} đơn</Text>
                          </Text>
                          <Text style={styles.customerTotalSpent}>
                            Tổng chi: <Text style={{ fontWeight: 'bold', color: '#DC2626' }}>{formatVND(uSpent)}</Text>
                          </Text>
                        </View>
                      </View>

                      {/* Arrow / Tap Indicator */}
                      <View style={styles.customerHistoryChevron}>
                        <Text style={styles.customerHistoryChevronText}>Xem lịch sử</Text>
                        <IconSymbol name="chevron.right" size={14} color="#DC2626" />
                      </View>
                    </View>

                    {/* Quick Admin Actions (Edit/Delete) */}
                    <View style={styles.customerCardActionsRow}>
                      <TouchableOpacity
                        style={styles.customerActionSmallBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          openEditUser(u);
                        }}
                      >
                        <IconSymbol name="pencil" size={13} color="#2563EB" />
                        <Text style={[styles.customerActionSmallText, { color: '#2563EB' }]}>Sửa</Text>
                      </TouchableOpacity>

                      {!isAdmin && (
                        <TouchableOpacity
                          style={styles.customerActionSmallBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            confirmDeleteUser(u);
                          }}
                        >
                          <IconSymbol name="trash.fill" size={13} color="#DC2626" />
                          <Text style={[styles.customerActionSmallText, { color: '#DC2626' }]}>Xóa</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: IN PHIẾU GIAO HÀNG & HÓA ĐƠN BÁN LẺ                               */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!invoiceOrder} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.historyModalCard, { maxHeight: '92%' }]}>
            <View style={styles.historyModalHeader}>
              <View>
                <Text style={styles.historyModalTitle}>📄 Phiếu Giao Hàng & Hóa Đơn</Text>
                <Text style={styles.historyModalSub}>
                  ToyVerse Store • Đồ Chơi Thông Minh Chính Hãng
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setInvoiceOrder(null)}
              >
                <IconSymbol name="xmark" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {invoiceOrder && (
              <ScrollView style={{ marginTop: 12 }}>
                <View style={styles.invoiceSheet}>
                  {/* Store Header & Metadata */}
                  <View style={styles.invoiceHeader}>
                    <Text style={styles.invoiceBrand}>🧸 TOYVERSE VIỆT NAM</Text>
                    <Text style={styles.invoiceBrandSub}>
                      Hotline: 1900 6868 • Email: support@toyverse.vn • Web: toyverse.vn
                    </Text>
                    <View style={styles.invoiceDivider} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text style={styles.invoiceMetaKey}>Mã Đơn Hàng:</Text>
                      <Text style={styles.invoiceMetaVal}>
                        #{String(invoiceOrder.id).slice(0, 10).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={styles.invoiceMetaKey}>Ngày Đặt Hàng:</Text>
                      <Text style={styles.invoiceMetaVal}>{String(invoiceOrder.createdAt || '')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={styles.invoiceMetaKey}>Trạng Thái:</Text>
                      <Text style={[styles.invoiceMetaVal, { color: '#059669', fontWeight: 'bold' }]}>
                        {String(invoiceOrder.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Customer Details */}
                  <View style={styles.invoiceSection}>
                    <Text style={styles.invoiceSectionTitle}>Thông Tin Nhận Hàng</Text>
                    <Text style={styles.invoiceText}>
                      👤 Người nhận:{' '}
                      <Text style={{ fontWeight: 'bold' }}>
                        {invoiceOrder.customerName || invoiceOrder.user?.name || 'Khách Hàng'}
                      </Text>
                    </Text>
                    <Text style={styles.invoiceText}>
                      📞 Số điện thoại:{' '}
                      <Text style={{ fontWeight: 'bold' }}>
                        {invoiceOrder.customerPhone || invoiceOrder.user?.phone || '—'}
                      </Text>
                    </Text>
                    <Text style={styles.invoiceText}>
                      📍 Địa chỉ: {invoiceOrder.address || '—'}
                    </Text>
                    <Text style={styles.invoiceText}>
                      💳 Phương thức:{' '}
                      <Text style={{ fontWeight: 'bold' }}>{invoiceOrder.paymentMethod || 'COD'}</Text>
                    </Text>
                    {invoiceOrder.isGiftWrap && (
                      <Text style={[styles.invoiceText, { color: '#DC2626', fontWeight: 'bold', marginTop: 2 }]}>
                        🎁 Gói quà nghệ thuật & Thiệp chúc mừng (+30.000đ)
                      </Text>
                    )}
                  </View>

                  {/* Products Table */}
                  <View style={styles.invoiceSection}>
                    <Text style={styles.invoiceSectionTitle}>Chi Tiết Đồ Chơi</Text>
                    {(invoiceOrder.items || []).map((it: any, idx: number) => (
                      <View key={idx} style={styles.invoiceItemRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.invoiceItemName}>• {it.product?.name || 'Sản phẩm'}</Text>
                          <Text style={styles.invoiceItemSub}>
                            Số lượng: {it.quantity} x {formatVND(it.product?.price || 0)}
                          </Text>
                        </View>
                        <Text style={styles.invoiceItemPrice}>
                          {formatVND((it.product?.price || 0) * it.quantity)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Total Box */}
                  <View style={styles.invoiceTotalBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.invoiceTotalLabel}>TỔNG TIỀN PHẢI THU:</Text>
                      <Text style={styles.invoiceTotalVal}>
                        {formatVND(invoiceOrder.totalAmount ?? invoiceOrder.total ?? 0)}
                      </Text>
                    </View>
                  </View>

                  {/* Signature Section */}
                  <View style={styles.invoiceFooterRow}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.invoiceSignLabel}>Người Giao Hàng</Text>
                      <Text style={styles.invoiceSignSub}>(Ký và ghi rõ họ tên)</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.invoiceSignLabel}>Người Nhận Hàng</Text>
                      <Text style={styles.invoiceSignSub}>(Ký xác nhận đã kiểm hàng)</Text>
                    </View>
                  </View>
                </View>

                {/* Print & Close Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 20 }}>
                  <TouchableOpacity
                    style={[styles.primaryRedBtn, { flex: 1, justifyContent: 'center' }]}
                    onPress={handlePrintInvoice}
                  >
                    <Text style={styles.primaryRedBtnText}>🖨️ In Phiếu Ngay</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.exportCsvBtn, { flex: 1, justifyContent: 'center' }]}
                    onPress={() => setInvoiceOrder(null)}
                  >
                    <Text style={styles.exportCsvBtnText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CHI TIẾT & LỊCH SỬ MUA HÀNG CỦA KHÁCH HÀNG                        */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!selectedCustomer} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.historyModalCard}>
            {/* Modal Header */}
            <View style={styles.historyModalHeader}>
              <View>
                <Text style={styles.historyModalTitle}>Lịch Sử Mua Hàng</Text>
                <Text style={styles.historyModalSub}>
                  Chi tiết các đơn hàng của {selectedCustomer?.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedCustomer(null)}
              >
                <IconSymbol name="xmark" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Customer Summary Bar */}
            <View style={styles.customerSummaryBox}>
              <View style={styles.customerSummaryLeft}>
                <Text style={styles.summaryCustomerName}>{selectedCustomer?.name}</Text>
                {showContactDetails ? (
                  <View style={{ gap: 2, marginTop: 4 }}>
                    <Text style={styles.summaryContactVal}>Email: {selectedCustomer?.email}</Text>
                    <Text style={styles.summaryContactVal}>SĐT: {selectedCustomer?.phone || 'Chưa có'}</Text>
                  </View>
                ) : (
                  <Text style={styles.summaryContactVal}>
                    Thông tin đã ẩn ({maskPhone(selectedCustomer?.phone)})
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.toggleContactBtn}
                onPress={() => setShowContactDetails(!showContactDetails)}
              >
                <Text style={styles.toggleContactBtnText}>
                  {showContactDetails ? 'Ẩn liên hệ' : 'Hiện liên hệ'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Total Spent Stat Bar */}
            <View style={styles.historyStatBanner}>
              <View style={styles.historyStatCol}>
                <Text style={styles.historyStatLabel}>Tổng Đơn Hàng</Text>
                <Text style={styles.historyStatVal}>{selectedCustomerOrders.length} đơn</Text>
              </View>
              <View style={styles.historyStatDivider} />
              <View style={styles.historyStatCol}>
                <Text style={styles.historyStatLabel}>Tổng Chi Tiêu</Text>
                <Text style={[styles.historyStatVal, { color: '#DC2626' }]}>
                  {formatVND(selectedCustomerTotalSpent)}
                </Text>
              </View>
            </View>

            {/* Order History List */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.historyOrdersScroll}>
              {selectedCustomerOrders.length === 0 ? (
                <View style={styles.emptyHistoryState}>
                  <IconSymbol name="cart.fill" size={28} color="#CBD5E1" />
                  <Text style={styles.emptyHistoryText}>
                    Khách hàng này chưa có đơn mua nào trong hệ thống.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, paddingBottom: 16 }}>
                  {selectedCustomerOrders.map((ord) => (
                    <View key={ord.id} style={styles.historyOrderCard}>
                      <View style={styles.historyOrderHeader}>
                        <Text style={styles.historyOrderCode}>
                          #{ord.id.slice(0, 8).toUpperCase()}
                        </Text>
                        <View style={styles.historyStatusPill}>
                          <Text style={styles.historyStatusPillText}>{ord.status}</Text>
                        </View>
                      </View>

                      <Text style={styles.historyOrderDate}>{ord.createdAt}</Text>
                      <Text style={styles.historyOrderAddr} numberOfLines={1}>
                        Địa chỉ: {ord.address}
                      </Text>

                      {/* Items */}
                      <View style={styles.historyItemsList}>
                        {(ord.items || []).map((it, idx) => (
                          <Text key={idx} style={styles.historyItemLine} numberOfLines={1}>
                            • {it.product?.name || 'Đồ chơi'} x{it.quantity}
                          </Text>
                        ))}
                      </View>

                      <View style={styles.historyOrderTotalRow}>
                        <Text style={styles.historyOrderTotalLabel}>Thanh toán:</Text>
                        <Text style={styles.historyOrderTotalVal}>
                          {formatVND(ord.totalAmount ?? ord.total ?? 0)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Close */}
            <View style={styles.historyModalFooter}>
              <TouchableOpacity
                style={styles.closeHistoryBtn}
                onPress={() => setSelectedCustomer(null)}
              >
                <Text style={styles.closeHistoryBtnText}>Đóng Cửa Sổ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: THÊM / SỬA SẢN PHẨM                                                */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showAddProductModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.formModalCard}>
            <View style={styles.formModalHeader}>
              <Text style={styles.formModalTitle}>
                {editingProduct ? 'Sửa Đồ Chơi' : 'Thêm Đồ Chơi Mới'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddProductModal(false)}>
                <IconSymbol name="xmark" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <Text style={styles.inputLabel}>Tên đồ chơi *</Text>
              <TextInput
                style={styles.textInput}
                value={pName}
                onChangeText={setPName}
                placeholder="vd: Siêu xe điều khiển từ xa"
              />

              <Text style={styles.inputLabel}>Thương hiệu</Text>
              <TextInput
                style={styles.textInput}
                value={pBrand}
                onChangeText={setPBrand}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Giá bán (VNĐ) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={pPrice}
                    onChangeText={setPPrice}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Giá gốc (VNĐ)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={pOriginalPrice}
                    onChangeText={setPOriginalPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Số lượng tồn kho</Text>
              <TextInput
                style={styles.textInput}
                value={pStock}
                onChangeText={setPStock}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>URL Hình ảnh</Text>
              <TextInput
                style={styles.textInput}
                value={pImage}
                onChangeText={setPImage}
              />

              <Text style={styles.inputLabel}>Mô tả đồ chơi</Text>
              <TextInput
                style={[styles.textInput, { height: 70 }]}
                value={pDesc}
                onChangeText={setPDesc}
                multiline
              />
            </ScrollView>

            <View style={styles.formModalFooter}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setShowAddProductModal(false)}
              >
                <Text style={styles.btnCancelText}>Huỷ</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnSubmitRed} onPress={handleSaveProduct}>
                <Text style={styles.btnSubmitRedText}>Lưu Sản Phẩm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: THÊM / SỬA TÀI KHOẢN                                               */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showUserModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.formModalCard}>
            <View style={styles.formModalHeader}>
              <Text style={styles.formModalTitle}>
                {editingUser ? 'Sửa Tài Khoản' : 'Thêm Tài Khoản Mới'}
              </Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <IconSymbol name="xmark" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel}>Email đăng nhập *</Text>
              <TextInput
                style={[styles.textInput, editingUser ? { backgroundColor: '#F1F5F9' } : {}]}
                value={uEmail}
                onChangeText={setUEmail}
                placeholder="vd: khachhang@gmail.com"
                editable={!editingUser}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Họ và tên *</Text>
              <TextInput
                style={styles.textInput}
                value={uName}
                onChangeText={setUName}
                placeholder="vd: Nguyễn Văn Minh"
              />

              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <TextInput
                style={styles.textInput}
                value={uPhone}
                onChangeText={setUPhone}
                placeholder="vd: 0988.123.456"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>
                {editingUser ? 'Mật khẩu mới (bỏ trống nếu không đổi)' : 'Mật khẩu *'}
              </Text>
              <TextInput
                style={styles.textInput}
                value={uPassword}
                onChangeText={setUPassword}
                placeholder="Nhập mật khẩu..."
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Vai trò hệ thống</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={[styles.roleSelectBtn, uRole === 'USER' && styles.roleSelectBtnActive]}
                  onPress={() => setURole('USER')}
                >
                  <Text style={[styles.roleSelectText, uRole === 'USER' && styles.roleSelectTextActive]}>
                    Khách Hàng (USER)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleSelectBtn, uRole === 'ADMIN' && styles.roleSelectBtnActive]}
                  onPress={() => setURole('ADMIN')}
                >
                  <Text style={[styles.roleSelectText, uRole === 'ADMIN' && styles.roleSelectTextActive]}>
                    Quản Trị (ADMIN)
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.formModalFooter}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setShowUserModal(false)}
              >
                <Text style={styles.btnCancelText}>Huỷ</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnSubmitRed} onPress={handleSaveUser}>
                <Text style={styles.btnSubmitRedText}>Lưu Tài Khoản</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* Header */
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  adminTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Nav Tabs */
  navBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navBarContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  navTabActive: {
    backgroundColor: '#DC2626',
  },
  navTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  navTabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  /* Main Scroll */
  mainScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
  },

  /* Stats Grid */
  statsGrid: {
    gap: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  statSubText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  /* Revenue Bar Chart */
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitleBox: {
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chartTotalBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 0,
    maxWidth: '45%',
  },
  chartTotalBadgeText: {
    color: '#DC2626',
    fontWeight: '900',
    fontSize: 11,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 16,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barAmountText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  barTrack: {
    width: 22,
    height: 90,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barDayLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },

  /* Status Breakdown */
  statusBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  statusBreakdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statusBreakdownSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  segmentedProgressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#475569',
  },

  /* Quick Actions */
  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  quickActionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  primaryRedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryRedBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  /* Search Box */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },

  /* Products */
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productImg: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  productBrand: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  productStockBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  productStockText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    gap: 6,
  },
  editActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Orders */
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 13,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  orderDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderStatusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  orderCustomerSection: {
    gap: 4,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  orderInfoLine: {
    flexDirection: 'row',
    gap: 6,
  },
  orderInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    width: 75,
  },
  orderInfoValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  giftWrappedTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  giftWrappedTagText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  orderItemsBox: {
    gap: 4,
    paddingHorizontal: 4,
  },
  orderItemsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  orderItemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemName: {
    fontSize: 12,
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  orderItemQtyPrice: {
    fontSize: 11,
    color: '#64748B',
  },
  orderTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  orderTotalLabel: {
    fontSize: 12,
    color: '#475569',
  },
  orderTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#DC2626',
  },
  statusActionSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    gap: 6,
  },
  statusActionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statusPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusPillActivePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusPillActivePacking: {
    backgroundColor: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  statusPillActiveShipping: {
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
  },
  statusPillActiveCompleted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusPillActiveCancelled: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  statusPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  deleteOrderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  deleteOrderPillText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: 'bold',
  },

  /* Customer CRM Cards */
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  customerCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  customerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  customerRoleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customerRoleBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  customerMaskedContact: {
    fontSize: 11,
    color: '#64748B',
  },
  customerStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  customerOrdersCount: {
    fontSize: 11,
    color: '#334155',
  },
  customerTotalSpent: {
    fontSize: 11,
    color: '#334155',
  },
  customerHistoryChevron: {
    alignItems: 'center',
    gap: 2,
  },
  customerHistoryChevronText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
  },
  customerCardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  customerActionSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  customerActionSmallText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Customer Purchase History Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  historyModalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  historyModalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  customerSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerSummaryLeft: {
    flex: 1,
  },
  summaryCustomerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  summaryContactVal: {
    fontSize: 11,
    color: '#64748B',
  },
  toggleContactBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleContactBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  historyStatBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  historyStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  historyStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#FECACA',
  },
  historyStatLabel: {
    fontSize: 11,
    color: '#991B1B',
  },
  historyStatVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 2,
  },
  historyOrdersScroll: {
    maxHeight: 280,
  },
  emptyHistoryState: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  historyOrderCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 4,
  },
  historyOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyOrderCode: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  historyStatusPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyStatusPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155',
  },
  historyOrderDate: {
    fontSize: 10,
    color: '#64748B',
  },
  historyOrderAddr: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  historyItemsList: {
    marginVertical: 4,
    gap: 2,
  },
  historyItemLine: {
    fontSize: 11,
    color: '#1E293B',
  },
  historyOrderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    marginTop: 2,
  },
  historyOrderTotalLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  historyOrderTotalVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  historyModalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  closeHistoryBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeHistoryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },

  /* Form Modals */
  formModalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  roleSelectBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleSelectBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  roleSelectText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  roleSelectTextActive: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  formModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  btnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnCancelText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  btnSubmitRed: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnSubmitRedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  lowStockAlertBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  lowStockAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  lowStockAlertIcon: {
    fontSize: 20,
  },
  lowStockAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  lowStockAlertSub: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 1,
  },
  lowStockFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  lowStockFilterPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  restockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  restockLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  restockBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#16A34A',
  },
  restockBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  exportCsvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  exportCsvBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  printInvoicePill: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  printInvoicePillText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: 'bold',
  },
  invoiceSheet: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  invoiceHeader: {
    marginBottom: 12,
  },
  invoiceBrand: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  invoiceBrandSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
  },
  invoiceMetaKey: {
    fontSize: 12,
    color: '#64748B',
  },
  invoiceMetaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  invoiceSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  invoiceSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  invoiceText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  invoiceItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  invoiceItemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  invoiceItemPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  invoiceTotalBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  invoiceTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  invoiceTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#DC2626',
  },
  invoiceFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  invoiceSignLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  invoiceSignSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});
