import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { Order, useToyStore } from "@/hooks/use-toy-store";

export default function ToyCartModal() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ tab?: string }>();
  const isDark = false;
  const theme = Colors.light;

  const {
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
    formatVND,
    currentUser,
    createOrder,
    orders,
    fetchOrders,
    updateOrderStatus,
    submitReview,
    fetchToys,
  } = useToyStore();

  const [activeTab, setActiveTab] = useState<"cart" | "orders">(
    searchParams.tab === "orders" ? "orders" : "cart",
  );

  useEffect(() => {
    if (searchParams.tab === "orders") {
      setActiveTab("orders");
    }
  }, [searchParams.tab]);

  // Cart / Checkout Form state
  const [customerName, setCustomerName] = useState(currentUser?.name || "");
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || "");
  const [address, setAddress] = useState(
    "Số 45, Đường Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  const [voucherInput, setVoucherInput] = useState(discountVoucher);
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);
  const [isGiftWrap, setIsGiftWrap] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "momo" | "bank">(
    "cod",
  );
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Tracking tab filter & search state
  const [trackingSearch, setTrackingSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "PACKING" | "SHIPPING" | "COMPLETED"
  >("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Reviews & Rating Modal state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [selectedReviewProduct, setSelectedReviewProduct] = useState<{ id: string; name: string; image?: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhoto, setReviewPhoto] = useState("https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Invoice Slip Modal state
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  const openReviewModal = (ord: Order) => {
    setReviewOrder(ord);
    const firstItem = ord.items?.[0];
    if (firstItem?.product) {
      setSelectedReviewProduct({
        id: firstItem.product.id,
        name: firstItem.product.name,
        image: firstItem.product.image,
      });
    }
    setReviewRating(5);
    setReviewComment("Bé nhà mình thích mê! Đồ chơi an toàn, hoàn thiện sắc sảo, giao hàng rất nhanh và đóng gói có tâm.");
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedReviewProduct) {
      if (Platform.OS === "web") alert("Vui lòng chọn sản phẩm để đánh giá!");
      else Alert.alert("Thông báo", "Vui lòng chọn sản phẩm để đánh giá!");
      return;
    }
    if (!reviewComment.trim()) {
      if (Platform.OS === "web") alert("Vui lòng nhập lời nhận xét của bạn!");
      else Alert.alert("Thông báo", "Vui lòng nhập lời nhận xét của bạn!");
      return;
    }

    try {
      setIsSubmittingReview(true);
      const res = await submitReview(selectedReviewProduct.id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
        photos: reviewPhoto.trim() || undefined,
        userName: currentUser?.name || customerName || "Khách hàng ToyVerse",
        orderId: reviewOrder?.id,
      });

      if (res.success) {
        if (Platform.OS === "web") alert("Cảm ơn bạn! Đánh giá & hình ảnh đã được ghi nhận thành công ⭐⭐⭐⭐⭐");
        else Alert.alert("Thành công", "Cảm ơn bạn! Đánh giá & hình ảnh đã được ghi nhận thành công ⭐⭐⭐⭐⭐");
        setReviewModalVisible(false);
        fetchToys();
      } else {
        if (Platform.OS === "web") alert(res.error || "Gửi đánh giá thất bại");
        else Alert.alert("Lỗi", res.error || "Gửi đánh giá thất bại");
      }
    } catch (err: any) {
      if (Platform.OS === "web") alert(err.message || "Lỗi gửi đánh giá");
      else Alert.alert("Lỗi", err.message || "Lỗi gửi đánh giá");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const openInvoiceModal = (ord: Order) => {
    setInvoiceOrder(ord);
    setInvoiceModalVisible(true);
  };

  const handlePrintInvoice = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
    } else {
      Alert.alert("In Phiếu", "Lệnh in hóa đơn đã được chuyển tới máy in!");
    }
  };

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setCustomerName(currentUser.name);
      if (currentUser.phone) setCustomerPhone(currentUser.phone);
    }
  }, [currentUser]);

  const handleApplyVoucher = () => {
    if (!voucherInput.trim()) return;
    const res = applyVoucher(voucherInput);
    setVoucherMsg(res.message);
    setTimeout(() => {
      setVoucherMsg(null);
    }, 3000);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      if (Platform.OS === "web") alert("Vui lòng nhập họ tên người nhận hàng!");
      else
        Alert.alert("Thiếu thông tin", "Vui lòng nhập họ tên người nhận hàng!");
      return;
    }
    if (!customerPhone.trim()) {
      if (Platform.OS === "web")
        alert("Vui lòng nhập số điện thoại nhận hàng!");
      else
        Alert.alert(
          "Thiếu thông tin",
          "Vui lòng nhập số điện thoại nhận hàng!",
        );
      return;
    }
    if (!address.trim()) {
      if (Platform.OS === "web")
        alert("Vui lòng nhập địa chỉ giao hàng chi tiết!");
      else
        Alert.alert(
          "Thiếu thông tin",
          "Vui lòng nhập địa chỉ giao hàng chi tiết!",
        );
      return;
    }

    try {
      setIsSubmitting(true);
      const fullAddress =
        address.trim() + (note.trim() ? ` (Ghi chú: ${note.trim()})` : "");
      const res = await createOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        address: fullAddress,
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
          price: c.product.price,
        })),
        totalAmount: finalTotal,
        paymentMethod: paymentMethod.toUpperCase(),
        isGiftWrap,
        userId: currentUser?.id,
      });

      if (res.success && res.data) {
        setPlacedOrder(res.data);
        clearCart();
        setOrderSuccess(true);
        fetchOrders();
      } else {
        if (Platform.OS === "web")
          alert(res.error || "Đặt hàng không thành công");
        else
          Alert.alert("Lỗi đặt hàng", res.error || "Đặt hàng không thành công");
      }
    } catch (err: any) {
      if (Platform.OS === "web") alert(err.message || "Lỗi gửi đơn hàng");
      else Alert.alert("Lỗi gửi đơn", err.message || "Lỗi gửi đơn hàng");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishOrder = () => {
    setOrderSuccess(false);
    setPlacedOrder(null);
    router.replace("/(tabs)");
  };

  const handleGoToTracking = () => {
    setOrderSuccess(false);
    setActiveTab("orders");
    fetchOrders();
  };

  const handleRefreshOrders = async () => {
    try {
      setIsRefreshing(true);
      await fetchOrders();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const confirmAction = async () => {
      const res = await updateOrderStatus(orderId, "CANCELLED");
      if (res.success) {
        if (Platform.OS === "web") alert("Đã hủy đơn hàng thành công");
        else Alert.alert("Thành công", "Đã hủy đơn hàng thành công");
        fetchOrders();
      } else {
        if (Platform.OS === "web") alert(res.error || "Không thể hủy đơn hàng");
        else Alert.alert("Lỗi", res.error || "Không thể hủy đơn hàng");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) {
        await confirmAction();
      }
    } else {
      Alert.alert(
        "Xác nhận hủy đơn",
        "Bạn có chắc chắn muốn hủy đơn hàng này không?",
        [
          { text: "Quay lại", style: "cancel" },
          { text: "Hủy đơn", style: "destructive", onPress: confirmAction },
        ],
      );
    }
  };

  // Filtered orders for user
  const userOrders = useMemo(() => {
    if (!currentUser || !orders || orders.length === 0) return [];

    let list =
      currentUser.role === "admin"
        ? [...orders]
        : orders.filter(
          (order) =>
            order.userId === currentUser.id || order.user?.id === currentUser.id,
        );

    // Filter by search query (order ID or phone or customer name)
    if (trackingSearch.trim()) {
      const q = trackingSearch.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customerPhone && o.customerPhone.toLowerCase().includes(q)) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)),
      );
    }

    // Filter by status tab
    if (statusFilter !== "ALL") {
      list = list.filter((o) => o.status?.toUpperCase() === statusFilter);
    }

    return list;
  }, [orders, currentUser, trackingSearch, statusFilter]);

  const getStatusBadge = (status: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "PENDING":
        return {
          label: "Chờ Xác Nhận",
          bg: "#FEF3C7",
          color: "#92400E",
          step: 1,
          icon: "🕒",
        };
      case "PACKING":
        return {
          label: "Đang Đóng Gói",
          bg: "#EDE9FE",
          color: "#5B21B6",
          step: 2,
          icon: "📦",
        };
      case "SHIPPING":
        return {
          label: "Đang Vận Chuyển",
          bg: "#DBEAFE",
          color: "#1E40AF",
          step: 3,
          icon: "🚚",
        };
      case "COMPLETED":
        return {
          label: "Giao Thành Công",
          bg: "#D1FAE5",
          color: "#065F46",
          step: 4,
          icon: "✅",
        };
      case "CANCELLED":
        return {
          label: "Đã Hủy Đơn",
          bg: "#FEE2E2",
          color: "#991B1B",
          step: 0,
          icon: "❌",
        };
      default:
        return {
          label: s,
          bg: "#F1F5F9",
          color: "#475569",
          step: 1,
          icon: "📋",
        };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Segmented Top Header Bar */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[
              styles.tabSwitcherBtn,
              activeTab === "cart" && { backgroundColor: theme.primary },
            ]}
            onPress={() => setActiveTab("cart")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabSwitcherText,
                { color: activeTab === "cart" ? "#FFFFFF" : theme.text },
              ]}
            >
              🛒 Giỏ Hàng {cartCount > 0 ? `(${cartCount})` : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabSwitcherBtn,
              activeTab === "orders" && { backgroundColor: theme.primary },
            ]}
            onPress={() => {
              setActiveTab("orders");
              fetchOrders();
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabSwitcherText,
                { color: activeTab === "orders" ? "#FFFFFF" : theme.text },
              ]}
            >
              📦 Theo Dõi Đơn{" "}
              {userOrders.length > 0 ? `(${userOrders.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "cart" && cart.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              if (Platform.OS === "web") {
                if (
                  window.confirm(
                    "Bạn có chắc chắn muốn xóa toàn bộ đồ chơi trong giỏ?",
                  )
                ) {
                  clearCart();
                }
              } else {
                Alert.alert(
                  "Xóa Giỏ Hàng",
                  "Bạn có chắc chắn muốn xóa toàn bộ đồ chơi trong giỏ?",
                  [
                    { text: "Hủy", style: "cancel" },
                    {
                      text: "Xóa hết",
                      style: "destructive",
                      onPress: clearCart,
                    },
                  ],
                );
              }
            }}
          >
            <Text style={[styles.clearBtnText, { color: theme.sale }]}>
              Xóa tất cả
            </Text>
          </TouchableOpacity>
        )}

        {activeTab === "orders" && (
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefreshOrders}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <View style={styles.refreshRow}>
                <IconSymbol
                  name="arrow.clockwise"
                  size={15}
                  color={theme.primary}
                />
                <Text style={[styles.refreshText, { color: theme.primary }]}>
                  Làm mới
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: ORDER TRACKING TAB */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "orders" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.trackingScrollContent}
        >
          {/* Tracking Search & Status Filter */}
          <View
            style={[
              styles.trackingSearchCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.trackingSearchRow}>
              <IconSymbol
                name="magnifyingglass"
                size={18}
                color={theme.subtext}
              />
              <TextInput
                style={[styles.trackingSearchInput, { color: theme.text }]}
                placeholder="Tra cứu theo mã đơn (#...) hoặc số điện thoại"
                placeholderTextColor={theme.subtext}
                value={trackingSearch}
                onChangeText={setTrackingSearch}
              />
              {trackingSearch.length > 0 && (
                <TouchableOpacity onPress={() => setTrackingSearch("")}>
                  <IconSymbol name="xmark" size={16} color={theme.subtext} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterPillsScroll}
            >
              <View style={styles.filterPillsRow}>
                {(
                  [
                    { key: "ALL", label: "Tất cả" },
                    { key: "PENDING", label: "🕒 Chờ xác nhận" },
                    { key: "PACKING", label: "📦 Đóng gói" },
                    { key: "SHIPPING", label: "🚚 Đang giao" },
                    { key: "COMPLETED", label: "✅ Đã giao" },
                  ] as const
                ).map((tab) => {
                  const isSelected = statusFilter === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: isSelected
                            ? theme.primary
                            : isDark
                              ? "#262E3D"
                              : "#F1F5F9",
                          borderColor: isSelected
                            ? theme.primary
                            : theme.border,
                        },
                      ]}
                      onPress={() => setStatusFilter(tab.key)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: isSelected ? "#FFFFFF" : theme.text },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* User Account Info Bar */}
          {currentUser ? (
            <View
              style={[
                styles.userBadgeBar,
                {
                  backgroundColor: isDark ? "#1E293B" : "#EFF6FF",
                  borderColor: "#BFDBFE",
                },
              ]}
            >
              <IconSymbol name="person.circle.fill" size={18} color="#2563EB" />
              <Text style={[styles.userBadgeText, { color: "#1E40AF" }]}>
                Đang hiển thị đơn hàng của:{" "}
                <Text style={{ fontWeight: "bold" }}>{currentUser.name}</Text> (
                {currentUser.phone || currentUser.email})
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.userBadgeBar,
                {
                  backgroundColor: isDark ? "#2D281E" : "#FFFBEB",
                  borderColor: "#FDE68A",
                },
              ]}
            >
              <IconSymbol
                name="shield.checkerboard"
                size={18}
                color="#D97706"
              />
              <Text style={[styles.userBadgeText, { color: "#92400E" }]}>
                Mẹo: Hãy đăng nhập để đồng bộ và lưu lịch sử đơn hàng tiện lợi
                nhất!
              </Text>
            </View>
          )}

          {/* Orders List */}
          {userOrders.length === 0 ? (
            <View style={styles.trackingEmptyState}>
              <Text style={styles.trackingEmptyEmoji}>📦</Text>
              <Text style={[styles.trackingEmptyTitle, { color: theme.text }]}>
                Chưa Có Đơn Hàng Nào
              </Text>
              <Text style={[styles.trackingEmptySub, { color: theme.subtext }]}>
                {trackingSearch
                  ? `Không tìm thấy đơn hàng nào khớp với "${trackingSearch}". Hãy kiểm tra lại mã đơn hoặc số điện thoại.`
                  : "Khi bạn đặt mua đồ chơi, quy trình đóng gói và vận chuyển sẽ được cập nhật trực tiếp tại đây từng bước!"}
              </Text>
              <TouchableOpacity
                style={[
                  styles.browseBtn,
                  { backgroundColor: theme.primary, marginTop: 12 },
                ]}
                onPress={() => setActiveTab("cart")}
              >
                <Text style={styles.browseBtnText}>
                  {cart.length > 0
                    ? "Xem Giỏ Hàng 🛒"
                    : "Khám Phá Đồ Chơi Ngay"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.ordersListContainer}>
              {userOrders.map((ord: Order) => {
                const badge = getStatusBadge(ord.status);
                const isExpanded = expandedOrderId === ord.id;
                const itemsCount = (ord.items || []).reduce(
                  (acc, it) => acc + (it.quantity || 1),
                  0,
                );

                return (
                  <View
                    key={ord.id}
                    style={[
                      styles.orderCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    {/* Order Card Header */}
                    <View style={styles.orderCardHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={styles.orderCodeRow}>
                          <Text
                            style={[
                              styles.orderCodeText,
                              { color: theme.primary },
                            ]}
                          >
                            #{ord.id.slice(0, 8).toUpperCase()}
                          </Text>
                          {ord.isGiftWrap && (
                            <View style={styles.giftBadgeSmall}>
                              <Text style={styles.giftBadgeSmallText}>
                                🎁 Quà Tặng
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.orderDateText,
                            { color: theme.subtext },
                          ]}
                        >
                          {ord.createdAt}
                        </Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: badge.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: badge.color },
                          ]}
                        >
                          {badge.icon} {badge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Visual 4-Step Progress Stepper */}
                    {ord.status?.toUpperCase() !== "CANCELLED" ? (
                      <View
                        style={[
                          styles.stepperContainer,
                          { backgroundColor: "#F8FAFC" },
                        ]}
                      >
                        <View style={styles.stepperTrack}>
                          {/* Progress Line */}
                          <View
                            style={[
                              styles.stepperProgressBar,
                              {
                                width:
                                  badge.step === 1
                                    ? "12%"
                                    : badge.step === 2
                                      ? "42%"
                                      : badge.step === 3
                                        ? "75%"
                                        : "100%",
                                backgroundColor: "#DC2626",
                              },
                            ]}
                          />

                          {/* Step 1 */}
                          <View style={styles.stepNode}>
                            <View
                              style={[
                                styles.stepCircle,
                                badge.step >= 1 && styles.stepCircleActive,
                                badge.step === 1 && {
                                  borderColor: "#DC2626",
                                  borderWidth: 2,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.stepCircleText,
                                  badge.step >= 1 && { color: "#FFFFFF" },
                                ]}
                              >
                                1
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.stepNodeLabel,
                                {
                                  color:
                                    badge.step >= 1 ? "#DC2626" : "#64748B",
                                },
                                badge.step === 1 && { fontWeight: "bold" },
                              ]}
                            >
                              Nhận đơn
                            </Text>
                          </View>

                          {/* Step 2 */}
                          <View style={styles.stepNode}>
                            <View
                              style={[
                                styles.stepCircle,
                                badge.step >= 2 && styles.stepCircleActive,
                                badge.step === 2 && {
                                  borderColor: "#DC2626",
                                  borderWidth: 2,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.stepCircleText,
                                  badge.step >= 2 && { color: "#FFFFFF" },
                                ]}
                              >
                                2
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.stepNodeLabel,
                                {
                                  color:
                                    badge.step >= 2 ? "#DC2626" : "#64748B",
                                },
                                badge.step === 2 && { fontWeight: "bold" },
                              ]}
                            >
                              Đóng gói
                            </Text>
                          </View>

                          {/* Step 3 */}
                          <View style={styles.stepNode}>
                            <View
                              style={[
                                styles.stepCircle,
                                badge.step >= 3 && styles.stepCircleActive,
                                badge.step === 3 && {
                                  borderColor: "#DC2626",
                                  borderWidth: 2,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.stepCircleText,
                                  badge.step >= 3 && { color: "#FFFFFF" },
                                ]}
                              >
                                3
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.stepNodeLabel,
                                {
                                  color:
                                    badge.step >= 3 ? "#DC2626" : "#64748B",
                                },
                                badge.step === 3 && { fontWeight: "bold" },
                              ]}
                            >
                              Giao hàng
                            </Text>
                          </View>

                          {/* Step 4 */}
                          <View style={styles.stepNode}>
                            <View
                              style={[
                                styles.stepCircle,
                                badge.step >= 4 && {
                                  backgroundColor: "#DC2626",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.stepCircleText,
                                  badge.step >= 4 && { color: "#FFFFFF" },
                                ]}
                              >
                                ✓
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.stepNodeLabel,
                                {
                                  color:
                                    badge.step >= 4 ? "#DC2626" : "#64748B",
                                },
                                badge.step === 4 && { fontWeight: "bold" },
                              ]}
                            >
                              Đã giao
                            </Text>
                          </View>
                        </View>

                        {/* Current Stage Note */}
                        <View style={styles.stepNoteBox}>
                          <Text
                            style={[
                              styles.stepNoteText,
                              { color: theme.subtext },
                            ]}
                          >
                            {badge.step === 1 &&
                              "🕒 Shop đã ghi nhận đơn và đang kiểm tra tồn kho & chuẩn bị sản phẩm."}
                            {badge.step === 2 &&
                              "📦 Đồ chơi đang được đóng hộp cẩn thận, bọc chống sốc và kèm nơ thiệp quà tặng."}
                            {badge.step === 3 &&
                              "🚚 Đơn vị vận chuyển đã nhận kiện hàng và đang trên đường giao tới bạn."}
                            {badge.step === 4 &&
                              "🎉 Đơn hàng đã giao thành công. Chúc bé có những giờ chơi thật bổ ích và vui vẻ!"}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.cancelledBanner}>
                        <Text style={styles.cancelledBannerText}>
                          Đơn hàng này đã bị hủy. Nếu có nhầm lẫn, vui lòng liên
                          hệ tổng đài ToyVerse để được hỗ trợ.
                        </Text>
                      </View>
                    )}

                    {/* Order Details Brief */}
                    <View style={styles.orderDetailsBrief}>
                      <View style={styles.detailRow}>
                        <Text
                          style={[styles.detailLabel, { color: theme.subtext }]}
                        >
                          Người nhận:
                        </Text>
                        <Text
                          style={[styles.detailVal, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {ord.customerName} ({ord.customerPhone})
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text
                          style={[styles.detailLabel, { color: theme.subtext }]}
                        >
                          Địa chỉ giao:
                        </Text>
                        <Text
                          style={[styles.detailVal, { color: theme.text }]}
                          numberOfLines={2}
                        >
                          {ord.address}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text
                          style={[styles.detailLabel, { color: theme.subtext }]}
                        >
                          Thanh toán:
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.text }]}>
                          {ord.paymentMethod === "COD"
                            ? "💵 Thu hộ khi nhận (COD)"
                            : ord.paymentMethod === "MOMO"
                              ? "📱 Ví MoMo"
                              : "🏦 Chuyển khoản VietQR"}
                        </Text>
                      </View>
                    </View>

                    {/* Toggle Items Button */}
                    <TouchableOpacity
                      style={[
                        styles.toggleItemsBtn,
                        { borderTopColor: theme.border },
                      ]}
                      onPress={() =>
                        setExpandedOrderId(isExpanded ? null : ord.id)
                      }
                    >
                      <Text
                        style={[
                          styles.toggleItemsText,
                          { color: theme.primary },
                        ]}
                      >
                        {isExpanded
                          ? "Thu gọn danh sách đồ chơi ▲"
                          : `Xem ${itemsCount} đồ chơi trong đơn (${(ord.items || []).length} loại) ▼`}
                      </Text>
                    </TouchableOpacity>

                    {/* Expanded Items List */}
                    {isExpanded && (
                      <View
                        style={[
                          styles.expandedItemsBox,
                          { borderTopColor: theme.border },
                        ]}
                      >
                        {(ord.items || []).map((it, idx) => (
                          <View key={idx} style={styles.orderItemRow}>
                            {it.product?.image ? (
                              <Image
                                source={it.product.image}
                                style={styles.orderItemImg}
                                contentFit="cover"
                              />
                            ) : (
                              <View
                                style={[
                                  styles.orderItemImgFallback,
                                  {
                                    backgroundColor: isDark
                                      ? "#334155"
                                      : "#E2E8F0",
                                  },
                                ]}
                              >
                                <Text style={{ fontSize: 16 }}>🧸</Text>
                              </View>
                            )}
                            <View style={styles.orderItemInfo}>
                              <Text
                                style={[
                                  styles.orderItemName,
                                  { color: theme.text },
                                ]}
                                numberOfLines={2}
                              >
                                {it.product?.name || "Đồ chơi ToyVerse"}
                              </Text>
                              <View style={styles.orderItemSub}>
                                <Text
                                  style={[
                                    styles.orderItemQty,
                                    { color: theme.subtext },
                                  ]}
                                >
                                  x{it.quantity}
                                </Text>
                                <Text
                                  style={[
                                    styles.orderItemPrice,
                                    { color: theme.text },
                                  ]}
                                >
                                  {formatVND(it.product?.price || 0)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Bottom Summary Bar */}
                    <View
                      style={[
                        styles.orderCardFooter,
                        { borderTopColor: theme.border },
                      ]}
                    >
                      <View>
                        <Text
                          style={[
                            styles.footerTotalLabel,
                            { color: theme.subtext },
                          ]}
                        >
                          Tổng thanh toán:
                        </Text>
                        <Text
                          style={[
                            styles.footerTotalPrice,
                            { color: theme.primary },
                          ]}
                        >
                          {formatVND(ord.totalAmount ?? ord.total ?? 0)}
                        </Text>
                      </View>

                      {/* Action buttons */}
                      <View style={styles.cardActionsRow}>
                        {ord.status?.toUpperCase() === "PENDING" && (
                          <TouchableOpacity
                            style={styles.cancelOrderBtn}
                            onPress={() => handleCancelOrder(ord.id)}
                          >
                            <Text style={styles.cancelOrderBtnText}>
                              Hủy Đơn
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.invoiceBtn}
                          onPress={() => openInvoiceModal(ord)}
                        >
                          <Text style={styles.invoiceBtnText}>📄 Hóa Đơn</Text>
                        </TouchableOpacity>

                        {ord.status?.toUpperCase() === "COMPLETED" && (
                          <TouchableOpacity
                            style={styles.reviewOrderBtn}
                            onPress={() => openReviewModal(ord)}
                          >
                            <Text style={styles.reviewOrderBtnText}>
                              ⭐ Đánh Giá
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[
                            styles.reorderBtn,
                            { backgroundColor: theme.primary },
                          ]}
                          onPress={() => {
                            (ord.items || []).forEach((it) => {
                              if (it.product && it.product.id) {
                                addToCart(it.product as any, it.quantity || 1);
                              }
                            });
                            setActiveTab("cart");
                          }}
                        >
                          <Text style={styles.reorderBtnText}>Mua Lại</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
        /* ───────────────────────────────────────────────────────────────────────────── */
        /* VIEW: CART & CHECKOUT TAB */
        /* ───────────────────────────────────────────────────────────────────────────── */
        <>
          {/* Success View Overlay */}
          {orderSuccess ? (
            <View style={styles.successWrapper}>
              <View
                style={[
                  styles.successCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={styles.successEmoji}>🎉🎁</Text>
                <Text style={[styles.successTitle, { color: theme.text }]}>
                  Đặt Hàng Thành Công!
                </Text>
                <Text style={[styles.successDesc, { color: theme.subtext }]}>
                  ToyVerse đã nhận đơn hàng của bạn. Bạn có thể theo dõi hành
                  trình giao đồ chơi tới bé theo thời gian thực!
                </Text>

                <View
                  style={[
                    styles.orderInfoBox,
                    { backgroundColor: isDark ? "#262E3D" : "#F8FAFC" },
                  ]}
                >
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>
                      Mã đơn hàng:
                    </Text>
                    <Text
                      style={[
                        styles.infoVal,
                        { color: "#3B82F6", fontWeight: "bold" },
                      ]}
                    >
                      #
                      {placedOrder?.id
                        ? placedOrder.id.slice(0, 8).toUpperCase()
                        : "TV-2026"}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>
                      Trạng thái đơn:
                    </Text>
                    <View
                      style={[
                        styles.statusMiniBadge,
                        { backgroundColor: "#FEF3C7" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusMiniBadgeText,
                          { color: "#92400E" },
                        ]}
                      >
                        {placedOrder?.status || "PENDING"} (CHỜ XÁC NHẬN)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>
                      Người nhận:
                    </Text>
                    <Text
                      style={[styles.infoVal, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {placedOrder?.customerName || customerName} (
                      {placedOrder?.customerPhone || customerPhone})
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>
                      Địa chỉ giao:
                    </Text>
                    <Text
                      style={[
                        styles.infoVal,
                        { color: theme.text, flex: 1, textAlign: "right" },
                      ]}
                      numberOfLines={2}
                    >
                      {placedOrder?.address || address}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>
                      Hình thức:
                    </Text>
                    <Text style={[styles.infoVal, { color: theme.text }]}>
                      {paymentMethod === "cod"
                        ? "Thanh toán COD khi nhận hàng"
                        : paymentMethod === "momo"
                          ? "Ví điện tử MoMo"
                          : "Chuyển khoản Ngân hàng"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.infoRow,
                      {
                        borderTopWidth: 1,
                        borderTopColor: theme.border,
                        paddingTop: 8,
                        marginTop: 4,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.infoLabel,
                        { color: theme.text, fontWeight: "bold" },
                      ]}
                    >
                      Tổng thanh toán:
                    </Text>
                    <Text
                      style={[
                        styles.infoVal,
                        {
                          color: theme.primary,
                          fontWeight: "900",
                          fontSize: 15,
                        },
                      ]}
                    >
                      {formatVND(placedOrder?.totalAmount ?? finalTotal)}
                    </Text>
                  </View>
                </View>

                <View style={{ width: "100%", gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.homeBtn, { backgroundColor: "#3B82F6" }]}
                    onPress={handleGoToTracking}
                  >
                    <Text style={styles.homeBtnText}>
                      Theo Dõi Tiến Trình Đơn Hàng 🚚
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.homeBtn, { backgroundColor: theme.primary }]}
                    onPress={handleFinishOrder}
                  >
                    <Text style={styles.homeBtnText}>Quay Về Trang Chủ</Text>
                  </TouchableOpacity>

                  {currentUser?.role === "admin" && (
                    <TouchableOpacity
                      style={[styles.homeBtn, { backgroundColor: "#10B981" }]}
                      onPress={() => {
                        handleFinishOrder();
                        router.push("/admin" as any);
                      }}
                    >
                      <Text style={styles.homeBtnText}>
                        Xem Đơn Hàng Trong Admin 🚀
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ) : cart.length === 0 ? (
            /* Empty Cart State */
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🧸</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Giỏ hàng đồ chơi trống
              </Text>
              <Text style={[styles.emptySub, { color: theme.subtext }]}>
                Bé và ba mẹ chưa chọn món đồ chơi nào. Hãy ghé danh mục để khám
                phá thế giới LEGO, Robot và Búp bê nhé!
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={[styles.browseBtn, { backgroundColor: theme.primary }]}
                  onPress={() => router.back()}
                >
                  <Text style={styles.browseBtnText}>Khám Phá Đồ Chơi</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.browseBtn, { backgroundColor: "#3B82F6" }]}
                  onPress={() => setActiveTab("orders")}
                >
                  <Text style={styles.browseBtnText}>Theo Dõi Đơn 📦</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Cart List and Checkout Steps */
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Cart Items List */}
              <View style={styles.itemsSection}>
                {cart.map((item) => (
                  <View
                    key={item.product.id}
                    style={[
                      styles.cartItemCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Image
                      source={item.product.image}
                      style={styles.itemImg}
                      contentFit="cover"
                    />

                    <View style={styles.itemInfo}>
                      <View style={styles.itemHeaderRow}>
                        <Text
                          style={[styles.itemBrand, { color: theme.primary }]}
                          numberOfLines={1}
                        >
                          {item.product.brand}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeFromCart(item.product.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <IconSymbol
                            name="trash.fill"
                            size={18}
                            color="#EF4444"
                          />
                        </TouchableOpacity>
                      </View>

                      <Text
                        style={[styles.itemName, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {item.product.name}
                      </Text>

                      <View style={styles.itemPriceRow}>
                        <Text
                          style={[styles.itemPrice, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {formatVND(item.product.price)}
                        </Text>

                        {/* Quantity Stepper */}
                        <View
                          style={[
                            styles.itemStepper,
                            { borderColor: theme.border },
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.itemStepBtn}
                            onPress={() =>
                              updateQuantity(item.product.id, item.quantity - 1)
                            }
                          >
                            <IconSymbol
                              name="minus"
                              size={14}
                              color={theme.text}
                            />
                          </TouchableOpacity>
                          <Text
                            style={[styles.itemStepVal, { color: theme.text }]}
                          >
                            {item.quantity}
                          </Text>
                          <TouchableOpacity
                            style={styles.itemStepBtn}
                            onPress={() =>
                              updateQuantity(item.product.id, item.quantity + 1)
                            }
                          >
                            <IconSymbol
                              name="plus"
                              size={14}
                              color={theme.text}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Gift Wrapping Option (FIXED OVERFLOW CONTAINER) */}
              <TouchableOpacity
                style={[
                  styles.giftWrapBox,
                  {
                    backgroundColor: theme.card,
                    borderColor: isGiftWrap ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setIsGiftWrap(!isGiftWrap)}
                activeOpacity={0.8}
              >
                <View style={styles.giftLeft}>
                  <View
                    style={[styles.giftIcon, { backgroundColor: "#FEF3C7" }]}
                  >
                    <IconSymbol name="gift.fill" size={20} color="#D97706" />
                  </View>
                  <View style={styles.giftTextWrap}>
                    <Text
                      style={[styles.giftTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      Gói Quà Sinh Nhật Nghệ Thuật
                    </Text>
                    <Text
                      style={[styles.giftDesc, { color: theme.subtext }]}
                      numberOfLines={2}
                    >
                      Kèm nơ lụa cao cấp & thiệp chúc mừng thiết kế riêng (Miễn
                      phí)
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isGiftWrap ? theme.primary : theme.border,
                      backgroundColor: isGiftWrap
                        ? theme.primary
                        : "transparent",
                    },
                  ]}
                >
                  {isGiftWrap && (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={14}
                      color="#FFFFFF"
                    />
                  )}
                </View>
              </TouchableOpacity>

              {/* Voucher Section */}
              <View
                style={[
                  styles.voucherCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.voucherHeader}>
                  <IconSymbol name="tag.fill" size={16} color={theme.primary} />
                  <Text style={[styles.voucherTitle, { color: theme.text }]}>
                    Mã Ưu Đãi ToyLand
                  </Text>
                </View>

                <View style={styles.voucherInputRow}>
                  <TextInput
                    style={[
                      styles.voucherInput,
                      {
                        color: theme.text,
                        backgroundColor: isDark ? "#262E3D" : "#F1F5F9",
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="Nhập mã (VD: TOYFUN20)"
                    placeholderTextColor={theme.subtext}
                    value={voucherInput}
                    onChangeText={setVoucherInput}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[
                      styles.voucherApplyBtn,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={handleApplyVoucher}
                  >
                    <Text style={styles.voucherApplyText}>Áp dụng</Text>
                  </TouchableOpacity>
                </View>

                {voucherMsg && (
                  <Text
                    style={[
                      styles.voucherFeedback,
                      {
                        color: voucherMsg.includes("thành công")
                          ? "#10B981"
                          : "#EF4444",
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {voucherMsg}
                  </Text>
                )}

                {discountPercent > 0 && (
                  <View style={styles.appliedPill}>
                    <Text style={styles.appliedPillText} numberOfLines={2}>
                      🎉 Đang áp dụng mã: {discountVoucher} (-{discountPercent}
                      %)
                    </Text>
                  </View>
                )}
              </View>

              {/* Shipping Address & Recipient Details Section */}
              <View
                style={[
                  styles.shippingCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.shippingHeader}>
                  <IconSymbol name="location.fill" size={18} color="#3B82F6" />
                  <Text style={[styles.shippingTitle, { color: theme.text }]}>
                    Thông Tin Nhận Hàng Của Bé
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: theme.subtext }]}>
                    Họ và tên người nhận *
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        color: theme.text,
                        backgroundColor: isDark ? "#262E3D" : "#F8FAFC",
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="vd: Nguyễn Văn Minh"
                    placeholderTextColor={theme.subtext}
                    value={customerName}
                    onChangeText={setCustomerName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: theme.subtext }]}>
                    Số điện thoại liên hệ *
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        color: theme.text,
                        backgroundColor: isDark ? "#262E3D" : "#F8FAFC",
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="vd: 0988.123.456"
                    placeholderTextColor={theme.subtext}
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: theme.subtext }]}>
                    Địa chỉ giao hàng chi tiết *
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        color: theme.text,
                        backgroundColor: isDark ? "#262E3D" : "#F8FAFC",
                        borderColor: theme.border,
                        minHeight: 46,
                      },
                    ]}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, TP..."
                    placeholderTextColor={theme.subtext}
                    value={address}
                    onChangeText={setAddress}
                    multiline
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: theme.subtext }]}>
                    Ghi chú giao hàng (tuỳ chọn)
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        color: theme.text,
                        backgroundColor: isDark ? "#262E3D" : "#F8FAFC",
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="vd: Giao giờ hành chính, gọi trước khi đến..."
                    placeholderTextColor={theme.subtext}
                    value={note}
                    onChangeText={setNote}
                  />
                </View>
              </View>

              {/* Payment Method Selector */}
              <View
                style={[
                  styles.paymentCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.paymentTitle, { color: theme.text }]}>
                  Phương Thức Thanh Toán
                </Text>

                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === "cod" && {
                      borderColor: theme.primary,
                      backgroundColor: theme.badge,
                    },
                  ]}
                  onPress={() => setPaymentMethod("cod")}
                >
                  <Text style={styles.paymentIcon}>💵</Text>
                  <View style={styles.paymentTextInfo}>
                    <Text
                      style={[styles.paymentMethodName, { color: theme.text }]}
                    >
                      Thanh toán khi nhận hàng (COD)
                    </Text>
                    <Text
                      style={[
                        styles.paymentMethodDesc,
                        { color: theme.subtext },
                      ]}
                    >
                      Kiểm tra đồ chơi nguyên vẹn trước khi thanh toán
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === "momo" && {
                      borderColor: theme.primary,
                      backgroundColor: theme.badge,
                    },
                  ]}
                  onPress={() => setPaymentMethod("momo")}
                >
                  <Text style={styles.paymentIcon}>📱</Text>
                  <View style={styles.paymentTextInfo}>
                    <Text
                      style={[styles.paymentMethodName, { color: theme.text }]}
                    >
                      Ví MoMo / ZaloPay
                    </Text>
                    <Text
                      style={[
                        styles.paymentMethodDesc,
                        { color: theme.subtext },
                      ]}
                    >
                      Quét mã QR tiện lợi & bảo mật
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === "bank" && {
                      borderColor: theme.primary,
                      backgroundColor: theme.badge,
                    },
                  ]}
                  onPress={() => setPaymentMethod("bank")}
                >
                  <Text style={styles.paymentIcon}>🏦</Text>
                  <View style={styles.paymentTextInfo}>
                    <Text
                      style={[styles.paymentMethodName, { color: theme.text }]}
                    >
                      Chuyển khoản Ngân hàng
                    </Text>
                    <Text
                      style={[
                        styles.paymentMethodDesc,
                        { color: theme.subtext },
                      ]}
                    >
                      Hỗ trợ VietQR 24/7 không mất phí
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Pricing Breakdown */}
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.summaryTitle, { color: theme.text }]}>
                  Tóm Tắt Đơn Hàng
                </Text>

                <View style={styles.priceLine}>
                  <Text
                    style={[styles.priceLineLabel, { color: theme.subtext }]}
                  >
                    Tạm tính:
                  </Text>
                  <Text style={[styles.priceLineVal, { color: theme.text }]}>
                    {formatVND(cartTotal)}
                  </Text>
                </View>

                {discountPercent > 0 && (
                  <View style={styles.priceLine}>
                    <Text style={[styles.priceLineLabel, { color: "#10B981" }]}>
                      Giảm giá voucher ({discountPercent}%):
                    </Text>
                    <Text
                      style={[
                        styles.priceLineVal,
                        { color: "#10B981", fontWeight: "bold" },
                      ]}
                    >
                      -{formatVND((cartTotal * discountPercent) / 100)}
                    </Text>
                  </View>
                )}

                <View style={styles.priceLine}>
                  <Text
                    style={[styles.priceLineLabel, { color: theme.subtext }]}
                  >
                    Phí vận chuyển:
                  </Text>
                  <Text
                    style={[
                      styles.priceLineVal,
                      { color: shippingFee === 0 ? "#10B981" : theme.text },
                    ]}
                  >
                    {shippingFee === 0
                      ? "Miễn phí giao hàng"
                      : formatVND(shippingFee)}
                  </Text>
                </View>

                {cartTotal < 300000 && (
                  <Text style={styles.freeShipHint}>
                    💡 Mua thêm {formatVND(300000 - cartTotal)} để được MIỄN PHÍ
                    vận chuyển toàn quốc!
                  </Text>
                )}

                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />

                <View style={styles.totalLine}>
                  <View>
                    <Text style={[styles.totalLabel, { color: theme.text }]}>
                      Tổng thanh toán:
                    </Text>
                    <Text style={[styles.vatNote, { color: theme.subtext }]}>
                      Đã bao gồm VAT
                    </Text>
                  </View>
                  <Text
                    style={[styles.finalTotalVal, { color: theme.primary }]}
                  >
                    {formatVND(finalTotal)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Bottom Sticky Checkout Button */}
          {!orderSuccess && cart.length > 0 && (
            <View
              style={[
                styles.checkoutBar,
                { backgroundColor: theme.card, borderTopColor: theme.border },
              ]}
            >
              <View>
                <Text style={[styles.barTotalLabel, { color: theme.subtext }]}>
                  Tổng tiền:
                </Text>
                <Text style={[styles.barTotalPrice, { color: theme.primary }]}>
                  {formatVND(finalTotal)}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.checkoutBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: isSubmitting ? 0.7 : 1,
                  },
                ]}
                onPress={handlePlaceOrder}
                disabled={isSubmitting}
                activeOpacity={0.88}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.checkoutBtnText}>
                      Xác Nhận Đặt Hàng
                    </Text>
                    <IconSymbol
                      name="chevron.right"
                      size={16}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* ── Review & Rating Modal ────────────────────────────────────────── */}
      {reviewModalVisible && reviewOrder && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setReviewModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.reviewDialog,
                { backgroundColor: theme.card },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.reviewDialogHeader}>
                <View>
                  <Text
                    style={[
                      styles.reviewDialogTitle,
                      { color: theme.text },
                    ]}
                  >
                    ⭐ Đánh Giá & Nhận Xét
                  </Text>
                  <Text
                    style={[
                      styles.reviewDialogSub,
                      { color: theme.subtext },
                    ]}
                  >
                    Đơn hàng #{reviewOrder.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.dialogCloseBtn}
                  onPress={() => setReviewModalVisible(false)}
                >
                  <IconSymbol name="xmark" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 480 }}
              >
                {/* Product Selection if multiple items */}
                {reviewOrder.items && reviewOrder.items.length > 1 && (
                  <View style={styles.reviewSection}>
                    <Text
                      style={[
                        styles.reviewSectionLabel,
                        { color: theme.text },
                      ]}
                    >
                      Chọn đồ chơi muốn đánh giá:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: 6 }}
                    >
                      {reviewOrder.items.map((it, idx) => {
                        const isSelected =
                          selectedReviewProduct?.id === it.product?.id;
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.reviewProductPill,
                              isSelected && styles.reviewProductPillActive,
                            ]}
                            onPress={() =>
                              it.product &&
                              setSelectedReviewProduct({
                                id: it.product.id,
                                name: it.product.name,
                                image: it.product.image,
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.reviewProductPillText,
                                isSelected && {
                                  color: "#FFFFFF",
                                  fontWeight: "bold",
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {it.product?.name || `Món ${idx + 1}`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Selected Product Card */}
                {selectedReviewProduct && (
                  <View
                    style={[
                      styles.reviewSelectedCard,
                      { backgroundColor: isDark ? "#1E293B" : "#F8FAFC" },
                    ]}
                  >
                    {selectedReviewProduct.image ? (
                      <Image
                        source={selectedReviewProduct.image}
                        style={styles.reviewSelectedImg}
                        contentFit="cover"
                      />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.reviewSelectedName,
                          { color: theme.text },
                        ]}
                        numberOfLines={2}
                      >
                        {selectedReviewProduct.name}
                      </Text>
                      <Text
                        style={[
                          styles.reviewVerifiedBadge,
                          { color: "#16A34A" },
                        ]}
                      >
                        ✓ Đã mua hàng tại ToyVerse
                      </Text>
                    </View>
                  </View>
                )}

                {/* Interactive Star Picker */}
                <View style={styles.starPickerBox}>
                  <Text
                    style={[
                      styles.reviewSectionLabel,
                      { color: theme.text },
                    ]}
                  >
                    Mức độ hài lòng của bé và bạn:
                  </Text>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        style={styles.starTouch}
                        onPress={() => setReviewRating(star)}
                      >
                        <Text
                          style={[
                            styles.starIconText,
                            {
                              color:
                                star <= reviewRating
                                  ? "#F59E0B"
                                  : "#CBD5E1",
                            },
                          ]}
                        >
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.starRatingDesc}>
                    {reviewRating === 5 &&
                      "Tuyệt vời! Bé cực kỳ thích và cả nhà hài lòng"}
                    {reviewRating === 4 &&
                      "Hài lòng, chất lượng đồ chơi rất tốt và sắc sảo"}
                    {reviewRating === 3 &&
                      "Bình thường, sản phẩm đúng như mô tả"}
                    {reviewRating === 2 && "Chưa thực sự ưng ý"}
                    {reviewRating === 1 && "Rất không hài lòng"}
                  </Text>
                </View>

                {/* Quick tags */}
                <View style={styles.quickTagsRow}>
                  {[
                    "Chất liệu cao cấp ✨",
                    "Giao hàng nhanh 🚀",
                    "Bé chơi say mê 🧸",
                    "Đóng gói đẹp 📦",
                  ].map((tag, tIdx) => (
                    <TouchableOpacity
                      key={tIdx}
                      style={styles.quickTagBtn}
                      onPress={() => {
                        setReviewComment((prev) =>
                          prev ? `${prev} ${tag}` : tag,
                        );
                      }}
                    >
                      <Text style={styles.quickTagText}>+{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Comment input */}
                <View style={styles.commentInputBox}>
                  <Text
                    style={[
                      styles.reviewSectionLabel,
                      { color: theme.text },
                    ]}
                  >
                    Nhận xét thực tế:
                  </Text>
                  <TextInput
                    style={[
                      styles.reviewCommentInput,
                      {
                        color: theme.text,
                        backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                      },
                    ]}
                    multiline
                    numberOfLines={4}
                    placeholder="Chia sẻ trải nghiệm về đồ chơi, sự an toàn, thiết kế và cảm xúc của bé..."
                    placeholderTextColor="#94A3B8"
                    value={reviewComment}
                    onChangeText={setReviewComment}
                  />
                </View>

                {/* Photos input & sample picker */}
                <View style={styles.photoSelectBox}>
                  <Text
                    style={[
                      styles.reviewSectionLabel,
                      { color: theme.text },
                    ]}
                  >
                    Ảnh feedback thực tế (Link URL):
                  </Text>
                  <TextInput
                    style={[
                      styles.photoUrlInput,
                      {
                        color: theme.text,
                        backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                      },
                    ]}
                    placeholder="https://..."
                    placeholderTextColor="#94A3B8"
                    value={reviewPhoto}
                    onChangeText={setReviewPhoto}
                  />

                  {/* Sample photo previews */}
                  <View style={styles.samplePhotoRow}>
                    {[
                      "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600",
                      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600",
                      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600",
                    ].map((sampleUrl, sIdx) => (
                      <TouchableOpacity
                        key={sIdx}
                        style={[
                          styles.samplePhotoThumb,
                          reviewPhoto === sampleUrl &&
                          styles.samplePhotoThumbActive,
                        ]}
                        onPress={() => setReviewPhoto(sampleUrl)}
                      >
                        <Image
                          source={sampleUrl}
                          style={styles.sampleThumbImg}
                          contentFit="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Action buttons */}
              <View style={styles.reviewDialogActions}>
                <TouchableOpacity
                  style={styles.reviewCancelBtn}
                  onPress={() => setReviewModalVisible(false)}
                >
                  <Text style={styles.reviewCancelBtnText}>Hủy Bỏ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.reviewSubmitBtn,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleSubmitReview}
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.reviewSubmitBtnText}>
                      Gửi Đánh Giá ⭐
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Invoice / Packing Slip Modal ──────────────────────────────────── */}
      {invoiceModalVisible && invoiceOrder && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setInvoiceModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[styles.invoiceDialog, { backgroundColor: "#FFFFFF" }]}
            >
              {/* Header */}
              <View style={styles.invoiceHeaderBar}>
                <View>
                  <Text style={styles.invoiceBrand}>TOYVERSE VIỆT NAM</Text>
                  <Text style={styles.invoiceSubBrand}>
                    Hệ thống Siêu Thị Đồ Chơi Trẻ Em Hàng Đầu • Hotline: 1900 6868
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.dialogCloseBtn}
                  onPress={() => setInvoiceModalVisible(false)}
                >
                  <IconSymbol name="xmark" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 520, paddingHorizontal: 16 }}
              >
                <View style={styles.invoiceTitleWrap}>
                  <Text style={styles.invoiceMainTitle}>
                    PHIẾU GIAO HÀNG & HÓA ĐƠN BÁN LẺ
                  </Text>
                  <Text style={styles.invoiceCodeText}>
                    Mã đơn: #{invoiceOrder.id.slice(0, 8).toUpperCase()} • Ngày:{" "}
                    {invoiceOrder.createdAt}
                  </Text>
                </View>

                {/* Recipient info */}
                <View style={styles.invoiceBoxGroup}>
                  <Text style={styles.invoiceBoxHeading}>
                    THÔNG TIN NGƯỜI NHẬN HÀNG
                  </Text>
                  <View style={styles.invoiceInfoRow}>
                    <Text style={styles.invoiceInfoKey}>Họ và tên:</Text>
                    <Text style={styles.invoiceInfoVal}>
                      {invoiceOrder.customerName}
                    </Text>
                  </View>
                  <View style={styles.invoiceInfoRow}>
                    <Text style={styles.invoiceInfoKey}>Số điện thoại:</Text>
                    <Text style={styles.invoiceInfoVal}>
                      {invoiceOrder.customerPhone}
                    </Text>
                  </View>
                  <View style={styles.invoiceInfoRow}>
                    <Text style={styles.invoiceInfoKey}>Địa chỉ giao:</Text>
                    <Text style={styles.invoiceInfoVal}>
                      {invoiceOrder.address}
                    </Text>
                  </View>
                  <View style={styles.invoiceInfoRow}>
                    <Text style={styles.invoiceInfoKey}>Phương thức:</Text>
                    <Text style={styles.invoiceInfoVal}>
                      {invoiceOrder.paymentMethod === "COD"
                        ? "Thu hộ tiền mặt khi nhận hàng (COD)"
                        : invoiceOrder.paymentMethod === "MOMO"
                          ? "Ví điện tử MoMo"
                          : "Chuyển khoản VietQR"}
                    </Text>
                  </View>
                </View>

                {/* Table of items */}
                <View style={styles.invoiceBoxGroup}>
                  <Text style={styles.invoiceBoxHeading}>
                    DANH SÁCH ĐỒ CHƠI GIAO HÀNG
                  </Text>
                  <View style={styles.invoiceTableHeader}>
                    <Text style={[styles.invoiceTh, { flex: 3 }]}>Sản phẩm</Text>
                    <Text
                      style={[styles.invoiceTh, { flex: 1, textAlign: "center" }]}
                    >
                      SL
                    </Text>
                    <Text
                      style={[styles.invoiceTh, { flex: 2, textAlign: "right" }]}
                    >
                      Đơn giá
                    </Text>
                    <Text
                      style={[styles.invoiceTh, { flex: 2, textAlign: "right" }]}
                    >
                      T.Tiền
                    </Text>
                  </View>
                  {(invoiceOrder.items || []).map((it, idx) => (
                    <View key={idx} style={styles.invoiceTableRow}>
                      <Text
                        style={[styles.invoiceTd, { flex: 3 }]}
                        numberOfLines={2}
                      >
                        {it.product?.name || "Đồ chơi ToyVerse"}
                      </Text>
                      <Text
                        style={[
                          styles.invoiceTd,
                          { flex: 1, textAlign: "center" },
                        ]}
                      >
                        {it.quantity}
                      </Text>
                      <Text
                        style={[
                          styles.invoiceTd,
                          { flex: 2, textAlign: "right" },
                        ]}
                      >
                        {formatVND((it as any).price || it.product?.price || 0)}
                      </Text>
                      <Text
                        style={[
                          styles.invoiceTd,
                          { flex: 2, textAlign: "right", fontWeight: "bold" },
                        ]}
                      >
                        {formatVND(
                          ((it as any).price || it.product?.price || 0) *
                          (it.quantity || 1),
                        )}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Total breakdown */}
                <View style={styles.invoiceTotalBox}>
                  <View style={styles.invoiceTotalRow}>
                    <Text style={styles.invoiceTotalKey}>Phí vận chuyển:</Text>
                    <Text style={styles.invoiceTotalVal}>Miễn phí (0đ)</Text>
                  </View>
                  {invoiceOrder.isGiftWrap && (
                    <View style={styles.invoiceTotalRow}>
                      <Text style={styles.invoiceTotalKey}>
                        Gói quà sinh nhật nghệ thuật:
                      </Text>
                      <Text style={styles.invoiceTotalVal}>
                        Miễn phí (Tặng kèm thiệp nơ)
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.invoiceTotalRow,
                      {
                        marginTop: 6,
                        paddingTop: 6,
                        borderTopWidth: 1,
                        borderColor: "#E2E8F0",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.invoiceTotalKey,
                        { fontWeight: "bold", fontSize: 13 },
                      ]}
                    >
                      TỔNG THANH TOÁN:
                    </Text>
                    <Text
                      style={[
                        styles.invoiceTotalVal,
                        { color: "#DC2626", fontWeight: "900", fontSize: 16 },
                      ]}
                    >
                      {formatVND(
                        invoiceOrder.totalAmount ?? invoiceOrder.total ?? 0,
                      )}
                    </Text>
                  </View>
                </View>

                {/* Signatures */}
                <View style={styles.invoiceSignRow}>
                  <View style={styles.invoiceSignCol}>
                    <Text style={styles.invoiceSignTitle}>Người lập phiếu</Text>
                    <Text style={styles.invoiceSignSub}>(Ký, họ tên)</Text>
                    <Text style={styles.invoiceSignSign}>ToyVerse</Text>
                  </View>
                  <View style={styles.invoiceSignCol}>
                    <Text style={styles.invoiceSignTitle}>Nhân viên giao</Text>
                    <Text style={styles.invoiceSignSub}>(Ký, họ tên)</Text>
                    <Text style={styles.invoiceSignSign}>Shipper TV</Text>
                  </View>
                  <View style={styles.invoiceSignCol}>
                    <Text style={styles.invoiceSignTitle}>Người nhận hàng</Text>
                    <Text style={styles.invoiceSignSub}>(Ký, họ tên)</Text>
                    <Text style={styles.invoiceSignSign}>
                      {invoiceOrder.customerName}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceFooterNote}>
                  <Text style={styles.invoiceFooterNoteText}>
                    Cảm ơn quý khách đã mua sắm tại ToyVerse! Quý khách vui lòng
                    kiểm tra kỹ hàng trước khi nhận. Đổi trả miễn phí trong 7
                    ngày nếu lỗi sản xuất.
                  </Text>
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.invoiceActionRow}>
                <TouchableOpacity
                  style={styles.invoiceCloseBtn}
                  onPress={() => setInvoiceModalVisible(false)}
                >
                  <Text style={styles.invoiceCloseBtnText}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.invoicePrintBtn}
                  onPress={handlePrintInvoice}
                >
                  <Text style={styles.invoicePrintBtnText}>
                    🖨️ In Phiếu Giao Hàng
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 16 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#0F172A15",
    borderRadius: 20,
    padding: 3,
    flex: 1,
  },
  tabSwitcherBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabSwitcherText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 160,
  },
  itemsSection: {
    gap: 12,
    marginBottom: 16,
  },
  cartItemCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    alignItems: "center",
  },
  itemImg: {
    width: 80,
    height: 80,
    borderRadius: 12,
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  itemBrand: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    flex: 1,
    marginRight: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 8,
  },
  itemPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    flexShrink: 1,
    marginRight: 8,
  },
  itemStepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  itemStepBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  itemStepVal: {
    width: 28,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 12,
  },
  giftWrapBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    overflow: "hidden",
  },
  giftLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  giftIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  giftTextWrap: {
    flex: 1,
    flexShrink: 1,
  },
  giftTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  giftDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  voucherCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  voucherHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  voucherTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  voucherInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minWidth: 0,
  },
  voucherApplyBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  voucherApplyText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  voucherFeedback: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
  },
  appliedPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  appliedPillText: {
    color: "#065F46",
    fontSize: 11,
    fontWeight: "bold",
  },
  shippingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  shippingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  shippingTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  formGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  paymentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  paymentIcon: {
    fontSize: 22,
  },
  paymentTextInfo: {
    flex: 1,
    minWidth: 0,
  },
  paymentMethodName: {
    fontSize: 13,
    fontWeight: "600",
  },
  paymentMethodDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
  },
  priceLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  priceLineLabel: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  priceLineVal: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  freeShipHint: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "600",
    backgroundColor: "#FFFBEB",
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "bold",
  },
  vatNote: {
    fontSize: 10,
  },
  finalTotalVal: {
    fontSize: 20,
    fontWeight: "900",
  },
  checkoutBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
  },
  barTotalLabel: {
    fontSize: 11,
  },
  barTotalPrice: {
    fontSize: 18,
    fontWeight: "900",
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 6,
  },
  checkoutBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  browseBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
  },
  browseBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  successWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  successEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  successDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  orderInfoBox: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "600",
  },
  homeBtn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 22,
    alignItems: "center",
  },
  homeBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  statusMiniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusMiniBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
  },

  /* ── Order Tracking Styles ── */
  trackingScrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  trackingSearchCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  trackingSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 6,
  },
  trackingSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
  },
  filterPillsScroll: {
    flexGrow: 0,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  userBadgeBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  userBadgeText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  trackingEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  trackingEmptyEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  trackingEmptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  trackingEmptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  ordersListContainer: {
    gap: 16,
  },
  orderCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  orderCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  orderCodeText: {
    fontSize: 15,
    fontWeight: "900",
  },
  giftBadgeSmall: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  giftBadgeSmallText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#92400E",
  },
  orderDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },

  /* Stepper */
  stepperContainer: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  stepperTrack: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    marginVertical: 4,
  },
  stepperProgressBar: {
    position: "absolute",
    left: "10%",
    height: 3,
    top: 13,
    borderRadius: 2,
    zIndex: 1,
    backgroundColor: "#DC2626",
  },
  stepNode: {
    alignItems: "center",
    zIndex: 2,
    width: 65,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: "#DC2626",
  },
  stepCircleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  stepNodeLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  stepNoteBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#CBD5E140",
  },
  stepNoteText: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
  cancelledBanner: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    marginHorizontal: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  cancelledBannerText: {
    color: "#991B1B",
    fontSize: 12,
    lineHeight: 17,
  },
  orderDetailsBrief: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    width: 90,
  },
  detailVal: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  toggleItemsBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
  },
  toggleItemsText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  expandedItemsBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  orderItemImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  orderItemImgFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  orderItemSub: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  orderItemQty: {
    fontSize: 11,
  },
  orderItemPrice: {
    fontSize: 11,
    fontWeight: "bold",
  },
  orderCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerTotalLabel: {
    fontSize: 11,
  },
  footerTotalPrice: {
    fontSize: 16,
    fontWeight: "900",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelOrderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
  },
  cancelOrderBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "bold",
  },
  reorderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  reorderBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  invoiceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  invoiceBtnText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  reviewOrderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  reviewOrderBtnText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  reviewDialog: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  reviewDialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#E2E8F0",
  },
  reviewDialogTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  reviewDialogSub: {
    fontSize: 12,
    marginTop: 2,
  },
  dialogCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  reviewSection: {
    marginBottom: 12,
  },
  reviewSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  reviewProductPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxWidth: 200,
  },
  reviewProductPillActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  reviewProductPillText: {
    fontSize: 12,
    color: "#475569",
  },
  reviewSelectedCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    gap: 10,
  },
  reviewSelectedImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  reviewSelectedName: {
    fontSize: 13,
    fontWeight: "600",
  },
  reviewVerifiedBadge: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
  },
  starPickerBox: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  starRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
  },
  starTouch: {
    padding: 4,
  },
  starIconText: {
    fontSize: 30,
    fontWeight: "bold",
  },
  starRatingDesc: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B45309",
    marginTop: 2,
  },
  quickTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  quickTagBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  quickTagText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "500",
  },
  commentInputBox: {
    marginBottom: 12,
  },
  reviewCommentInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    textAlignVertical: "top",
    minHeight: 80,
  },
  photoSelectBox: {
    marginBottom: 14,
  },
  photoUrlInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 8,
  },
  samplePhotoRow: {
    flexDirection: "row",
    gap: 8,
  },
  samplePhotoThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  samplePhotoThumbActive: {
    borderColor: "#DC2626",
  },
  sampleThumbImg: {
    width: "100%",
    height: "100%",
  },
  reviewDialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#E2E8F0",
  },
  reviewCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  reviewCancelBtnText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  reviewSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  reviewSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  invoiceDialog: {
    width: "100%",
    maxWidth: 580,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  invoiceHeaderBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  invoiceBrand: {
    fontSize: 15,
    fontWeight: "900",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  invoiceSubBrand: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  invoiceTitleWrap: {
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  invoiceMainTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  invoiceCodeText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },
  invoiceBoxGroup: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  invoiceBoxHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  invoiceInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  invoiceInfoKey: {
    fontSize: 11,
    color: "#64748B",
    width: 90,
  },
  invoiceInfoVal: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
    textAlign: "right",
  },
  invoiceTableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 4,
  },
  invoiceTh: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#475569",
  },
  invoiceTableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#E2E8F0",
  },
  invoiceTd: {
    fontSize: 11,
    color: "#1E293B",
  },
  invoiceTotalBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  invoiceTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  invoiceTotalKey: {
    fontSize: 11,
    color: "#64748B",
  },
  invoiceTotalVal: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0F172A",
  },
  invoiceSignRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    marginBottom: 8,
  },
  invoiceSignCol: {
    alignItems: "center",
    flex: 1,
  },
  invoiceSignTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1E293B",
  },
  invoiceSignSub: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 1,
  },
  invoiceSignSign: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#475569",
    marginTop: 20,
  },
  invoiceFooterNote: {
    paddingVertical: 8,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  invoiceFooterNoteText: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "center",
    fontStyle: "italic",
  },
  invoiceActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
  },
  invoiceCloseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  invoiceCloseBtnText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "bold",
  },
  invoicePrintBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#DC2626",
  },
  invoicePrintBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});
