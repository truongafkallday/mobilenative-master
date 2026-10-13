import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ToyProduct, useToyStore } from '@/hooks/use-toy-store';

const CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'lego', label: 'LEGO' },
  { id: 'robot', label: 'Xe & Robot' },
  { id: 'doll', label: 'Búp bê' },
  { id: 'stem', label: 'STEM' },
  { id: 'boardgame', label: 'Board Game' },
  { id: 'craft', label: 'Mỹ thuật' },
];

const AGE_FILTERS = [
  { id: 'all', label: 'Mọi lứa tuổi' },
  { id: '0-1y', label: '0 - 1 tuổi' },
  { id: '1-3y', label: '1 - 3 tuổi' },
  { id: '3-6y', label: '3 - 6 tuổi' },
  { id: '6-12y', label: '6 - 12 tuổi' },
  { id: '12y+', label: '12+ tuổi' },
];

export default function ProductsScreen() {
  const router = useRouter();
  const isDark = false;
  const theme = Colors.light;
  const { width: windowWidth } = useWindowDimensions();

  const {
    toys,
    addToCart,
    favorites,
    toggleFavorite,
    selectedToy,
    setSelectedToy,
    formatVND,
    cartCount,
    fetchProductReviews,
  } = useToyStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAge, setSelectedAge] = useState('all');
  const [modalQuantity, setModalQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    if (selectedToy?.id) {
      let isMounted = true;
      setIsLoadingReviews(true);
      fetchProductReviews(selectedToy.id)
        .then((data) => {
          if (isMounted) setProductReviews(data || []);
        })
        .catch(() => {
          if (isMounted) setProductReviews([]);
        })
        .finally(() => {
          if (isMounted) setIsLoadingReviews(false);
        });
      return () => {
        isMounted = false;
      };
    } else {
      setProductReviews([]);
    }
  }, [selectedToy?.id, fetchProductReviews]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleAddToCart = (toy: ToyProduct, qty: number = 1) => {
    addToCart(toy, qty);
    triggerToast(`Đã thêm "${toy.name}" vào giỏ!`);
  };

  // Filter toys
  const filteredToys = toys.filter((toy) => {
    const matchCat = selectedCategory === 'all' || toy.category === selectedCategory;
    const matchAge = selectedAge === 'all' || toy.ageRange === selectedAge;
    const matchSearch =
      searchQuery.trim() === '' ||
      toy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toy.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchAge && matchSearch;
  });

  // Responsive Grid
  const isMobile = windowWidth < 680;
  const numCols = isMobile ? 2 : Math.min(4, Math.floor(windowWidth / 220));
  const cardGap = 10;
  const containerPadding = 12;
  const cardWidth = Math.floor(
    (windowWidth - containerPadding * 2 - cardGap * (numCols - 1)) / numCols
  );
  const cardImageHeight = Math.min(150, Math.floor(cardWidth * 0.85));

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderBottomColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            Kho Đồ Chơi ({filteredToys.length})
          </Text>

          <TouchableOpacity
            style={styles.cartIconBtn}
            onPress={() => router.push('/modal')}
          >
            <IconSymbol name="cart.fill" size={17} color="#EF4444" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <IconSymbol name="magnifyingglass" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Tìm theo tên đồ chơi, thương hiệu..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol name="xmark" size={14} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active
                      ? theme.primary
                      : isDark
                      ? '#1E293B'
                      : '#FFFFFF',
                    borderColor: active
                      ? theme.primary
                      : isDark
                      ? '#334155'
                      : '#E2E8F0',
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: active ? '#FFFFFF' : isDark ? '#E2E8F0' : '#475569',
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Toast Feedback */}
      {toastMessage && (
        <View style={styles.toast}>
          <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
          <Text style={styles.toastText} numberOfLines={1}>
            {toastMessage}
          </Text>
        </View>
      )}

      {/* ── Main Product Grid (Clean, Responsive, Không Bị Kéo Dài) ─────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.productGrid, { gap: cardGap }]}>
          {filteredToys.map((toy) => {
            const isFav = favorites.includes(toy.id);
            return (
              <TouchableOpacity
                key={toy.id}
                style={[
                  styles.productCard,
                  {
                    width: cardWidth,
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
                onPress={() => {
                  setSelectedToy(toy);
                  setModalQuantity(1);
                }}
                activeOpacity={0.88}
              >
                {/* Image Container with Badges */}
                <View
                  style={[
                    styles.imageContainer,
                    {
                      height: cardImageHeight,
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    },
                  ]}
                >
                  {toy.discountPercent > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>-{toy.discountPercent}%</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.favBtn}
                    onPress={() => toggleFavorite(toy.id)}
                  >
                    <IconSymbol
                      name={isFav ? 'heart.fill' : 'heart'}
                      size={14}
                      color={isFav ? '#EF4444' : '#94A3B8'}
                    />
                  </TouchableOpacity>

                  <Image
                    source={toy.image}
                    style={styles.productThumb}
                    contentFit="contain"
                    transition={200}
                  />
                </View>

                {/* Details Container */}
                <View style={styles.productMeta}>
                  <Text style={[styles.brandText, { color: theme.primary }]}>
                    {toy.brand}
                  </Text>
                  <Text
                    style={[styles.productTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                    numberOfLines={2}
                  >
                    {toy.name}
                  </Text>

                  {/* Rating & Sold Row */}
                  <View style={styles.ratingRow}>
                    <IconSymbol name="star.fill" size={11} color="#F59E0B" />
                    <Text style={styles.ratingNumber}>{toy.rating}</Text>
                    <Text style={styles.soldText}>• Đã bán {toy.soldCount}</Text>
                  </View>

                  {/* Price Row & Add Button */}
                  <View style={styles.priceRow}>
                    <View style={styles.priceColumn}>
                      <Text style={[styles.finalPrice, { color: '#EF4444' }]}>
                        {formatVND(toy.price)}
                      </Text>
                      {toy.originalPrice > toy.price && (
                        <Text style={styles.originPrice}>
                          {formatVND(toy.originalPrice)}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.addCartBtn, { backgroundColor: theme.primary }]}
                      onPress={() => handleAddToCart(toy, 1)}
                    >
                      <IconSymbol name="cart.badge.plus" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {filteredToys.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 36 }}>🧸</Text>
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              Không tìm thấy đồ chơi nào
            </Text>
            <Text style={styles.emptySub}>
              Vui lòng thử tìm từ khoá khác hoặc xoá bộ lọc
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Product Detail Modal ────────────────────────────────────────────── */}
      {selectedToy && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text
                  style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                  numberOfLines={1}
                >
                  {selectedToy.name}
                </Text>
                <TouchableOpacity onPress={() => setSelectedToy(null)}>
                  <IconSymbol name="xmark" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                <View style={styles.modalImageWrapper}>
                  <Image
                    source={selectedToy.image}
                    style={styles.modalImage}
                    contentFit="contain"
                  />
                </View>

                <View style={styles.modalDetails}>
                  <Text style={[styles.modalBrand, { color: theme.primary }]}>
                    {selectedToy.brand} • {selectedToy.categoryLabel}
                  </Text>
                  <Text
                    style={[styles.modalName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                  >
                    {selectedToy.name}
                  </Text>

                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalPrice}>{formatVND(selectedToy.price)}</Text>
                    {selectedToy.originalPrice > selectedToy.price && (
                      <Text style={styles.modalOldPrice}>
                        {formatVND(selectedToy.originalPrice)}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.modalDesc}>{selectedToy.description}</Text>

                  <View style={[styles.specsBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Chất liệu:</Text>
                      <Text style={[styles.specVal, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                        {selectedToy.material}
                      </Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Xuất xứ:</Text>
                      <Text style={[styles.specVal, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                        {selectedToy.origin}
                      </Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Tồn kho:</Text>
                      {(selectedToy.stockCount ?? 50) === 0 ? (
                        <Text style={[styles.specVal, { color: '#DC2626', fontWeight: 'bold' }]}>
                          ❌ Hết hàng tạm thời
                        </Text>
                      ) : (selectedToy.stockCount ?? 50) < 5 ? (
                        <Text style={[styles.specVal, { color: '#D97706', fontWeight: 'bold' }]}>
                          ⚠️ Chỉ còn {selectedToy.stockCount} sản phẩm (Sắp hết hàng)
                        </Text>
                      ) : (
                        <Text style={[styles.specVal, { color: '#10B981', fontWeight: 'bold' }]}>
                          ✓ Còn {selectedToy.stockCount} sản phẩm sẵn có
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Customer Reviews Section */}
                  <View style={styles.reviewsSection}>
                    <View style={styles.reviewsHeaderRow}>
                      <View>
                        <Text style={[styles.reviewsSectionTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                          Đánh Giá & Nhận Xét Từ Phụ Huynh
                        </Text>
                        <Text style={[styles.reviewsSectionSub, { color: '#64748B' }]}>
                          ⭐ {selectedToy.rating?.toFixed(1) || '4.9'} / 5.0 • ({productReviews.length || selectedToy.reviewCount || 0} lượt phản hồi)
                        </Text>
                      </View>
                    </View>

                    {isLoadingReviews ? (
                      <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#DC2626" />
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                          Đang tải nhận xét từ khách hàng...
                        </Text>
                      </View>
                    ) : productReviews.length === 0 ? (
                      <View style={styles.noReviewsBox}>
                        <Text style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                          Chưa có nhận xét nào. Khách hàng đã hoàn thành đơn có thể viết nhận xét tại mục Đơn Hàng.
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 10, marginTop: 8 }}>
                        {productReviews.map((rev, rIdx) => (
                          <View
                            key={rev.id || rIdx}
                            style={[
                              styles.reviewCardItem,
                              { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
                            ]}
                          >
                            <View style={styles.reviewUserRow}>
                              <View style={styles.reviewAvatar}>
                                <Text style={styles.reviewAvatarText}>
                                  {(rev.userName || rev.user?.name || 'K').charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text
                                    style={[
                                      styles.reviewUserName,
                                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                                    ]}
                                  >
                                    {rev.userName || rev.user?.name || 'Khách hàng ToyVerse'}
                                  </Text>
                                  <View style={styles.verifiedBadge}>
                                    <Text style={styles.verifiedBadgeText}>✓ Đã mua hàng</Text>
                                  </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                  <Text style={styles.reviewStarsText}>
                                    {'★'.repeat(rev.rating || 5)}
                                    {'☆'.repeat(5 - (rev.rating || 5))}
                                  </Text>
                                  <Text style={styles.reviewDateText}>
                                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <Text
                              style={[
                                styles.reviewCommentText,
                                { color: isDark ? '#CBD5E1' : '#334155' },
                              ]}
                            >
                              {rev.comment}
                            </Text>

                            {rev.photos ? (
                              <View style={{ marginTop: 8 }}>
                                <Image
                                  source={rev.photos}
                                  style={styles.reviewFeedbackImg}
                                  contentFit="cover"
                                />
                              </View>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>

              {/* Quantity and Actions */}
              <View style={styles.modalFooter}>
                <View style={styles.quantityPicker}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.qtyNumber, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {modalQuantity}
                  </Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => setModalQuantity(modalQuantity + 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.buyBtn,
                    {
                      backgroundColor:
                        selectedToy.stockCount === 0 ? '#94A3B8' : theme.primary,
                    },
                  ]}
                  disabled={selectedToy.stockCount === 0}
                  onPress={() => {
                    handleAddToCart(selectedToy, modalQuantity);
                    setSelectedToy(null);
                  }}
                >
                  <IconSymbol
                    name={
                      selectedToy.stockCount === 0
                        ? 'xmark.circle'
                        : 'cart.badge.plus'
                    }
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.buyBtnText}>
                    {selectedToy.stockCount === 0
                      ? 'Hết hàng tạm thời'
                      : 'Thêm vào giỏ hàng'}
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
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  cartIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterScroll: {
    gap: 6,
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  productCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 6,
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 6,
  },
  productThumb: {
    width: '90%',
    height: '90%',
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  favBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  productMeta: {
    padding: 8,
  },
  brandText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    height: 32,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  ratingNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  soldText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceColumn: {
    flex: 1,
  },
  finalPrice: {
    fontSize: 13,
    fontWeight: '800',
  },
  originPrice: {
    fontSize: 9,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  addCartBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 18,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    paddingRight: 10,
  },
  modalImageWrapper: {
    height: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalImage: {
    width: '90%',
    height: '90%',
  },
  modalDetails: {
    gap: 6,
  },
  modalBrand: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalName: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EF4444',
  },
  modalOldPrice: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },
  specsBox: {
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  specVal: {
    fontSize: 11,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  quantityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  qtyNumber: {
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  buyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  reviewsSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewsSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  reviewsSectionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  noReviewsBox: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  reviewCardItem: {
    padding: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  reviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  reviewUserName: {
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: '#065F46',
    fontSize: 9,
    fontWeight: 'bold',
  },
  reviewStarsText: {
    fontSize: 12,
    color: '#F59E0B',
  },
  reviewDateText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  reviewCommentText: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  reviewFeedbackImg: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
});
