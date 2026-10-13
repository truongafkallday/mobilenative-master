import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useToyStore, ToyProduct } from '@/hooks/use-toy-store';

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: 'sparkles' },
  { id: 'lego', label: 'LEGO', icon: 'gift.fill' },
  { id: 'robot', label: 'Xe & Robot', icon: 'sparkles' },
  { id: 'doll', label: 'Búp bê', icon: 'heart.fill' },
  { id: 'stem', label: 'STEM', icon: 'shield.checkerboard' },
  { id: 'boardgame', label: 'Board Game', icon: 'star.fill' },
  { id: 'craft', label: 'Mỹ thuật', icon: 'tag.fill' },
];

const AGE_GROUPS = [
  { id: 'all', label: 'Tất cả tuổi' },
  { id: '0-1y', label: '0 - 1 tuổi' },
  { id: '1-3y', label: '1 - 3 tuổi' },
  { id: '3-6y', label: '3 - 6 tuổi' },
  { id: '6-12y', label: '6 - 12 tuổi' },
  { id: '12y+', label: '12+ tuổi' },
];

export default function HomeScreen() {
  const router = useRouter();
  const isDark = false;
  const theme = Colors.light;
  const { width: windowWidth } = useWindowDimensions();

  const {
    toys,
    cartCount,
    addToCart,
    favorites,
    toggleFavorite,
    setSelectedToy,
    formatVND,
    currentUser,
  } = useToyStore();

  const [selectedAge, setSelectedAge] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  const handleAddToCart = (toy: ToyProduct) => {
    addToCart(toy, 1);
    setAddedMessage(`Đã thêm "${toy.name}" vào giỏ!`);
    setTimeout(() => {
      setAddedMessage(null);
    }, 2000);
  };

  const handleOpenDetail = (toy: ToyProduct) => {
    setSelectedToy(toy);
    router.push('/(tabs)/products');
  };

  // Filter toys
  const filteredToys = toys.filter((toy) => {
    const matchesCategory = selectedCategory === 'all' || toy.category === selectedCategory;
    const matchesAge = selectedAge === 'all' || toy.ageRange === selectedAge;
    const matchesSearch =
      searchQuery.trim() === '' ||
      toy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toy.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesAge && matchesSearch;
  });

  const flashSaleToys = toys.filter((t) => t.isFlashSale);

  // Responsive Grid Calculations (2 cols on mobile, up to 4 on tablet/desktop)
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
          <View style={styles.brandRow}>
            <Text style={[styles.brandLogo, { color: theme.primary }]}>ToyVerse</Text>
            <View style={styles.officialBadge}>
              <Text style={styles.officialBadgeText}>Official</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {currentUser?.role === 'admin' && (
              <TouchableOpacity
                style={styles.adminPortalBtn}
                onPress={() => router.push('/admin' as any)}
              >
                <IconSymbol name="shield.checkerboard" size={13} color="#2563EB" />
                <Text style={styles.adminPortalText}>Admin</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
              ]}
              onPress={() => router.push('/login' as any)}
            >
              <IconSymbol
                name="person.fill"
                size={16}
                color={currentUser ? theme.primary : '#64748B'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' },
              ]}
              onPress={() => router.push({ pathname: '/modal', params: { tab: 'orders' } } as any)}
            >
              <IconSymbol
                name="shippingbox.fill"
                size={16}
                color="#3B82F6"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}
              onPress={() => router.push('/modal')}
            >
              <IconSymbol name="cart.fill" size={16} color="#EF4444" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
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
            placeholder="Tìm LEGO, robot, xe cộ, boardgame..."
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
      </View>

      {/* Toast Feedback */}
      {addedMessage && (
        <View style={styles.toast}>
          <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
          <Text style={styles.toastText} numberOfLines={1}>
            {addedMessage}
          </Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Compact Promo Banner ─────────────────────────────────────────── */}
        <View style={[styles.heroBanner, { backgroundColor: '#1E293B' }]}>
          <View style={styles.heroTextContent}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>🔥 SIÊU HỘI ĐỒ CHƠI</Text>
            </View>
            <Text style={styles.heroTitle}>Thế Giới Sáng Tạo{'\n'}Giảm Đến 40%</Text>
            <Text style={styles.heroSub}>Đồ chơi chính hãng an toàn tuyệt đối cho bé</Text>
          </View>
          <Image
            source="https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=400&auto=format&fit=crop&q=80"
            style={styles.heroImage}
            contentFit="cover"
          />
        </View>

        {/* ── Categories Bar ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
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
                <IconSymbol
                  name={cat.icon as any}
                  size={13}
                  color={active ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.categoryPillText,
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

        {/* ── Age Filter Pills ────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ageScroll}
        >
          {AGE_GROUPS.map((age) => {
            const active = selectedAge === age.id;
            return (
              <TouchableOpacity
                key={age.id}
                style={[
                  styles.agePill,
                  {
                    backgroundColor: active ? '#EFF6FF' : 'transparent',
                    borderColor: active ? '#3B82F6' : isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
                onPress={() => setSelectedAge(age.id)}
              >
                <Text
                  style={[
                    styles.agePillText,
                    { color: active ? '#2563EB' : '#94A3B8', fontWeight: active ? '700' : '500' },
                  ]}
                >
                  {age.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Section Title ───────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeading, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
            {selectedCategory === 'all' && selectedAge === 'all'
              ? 'Tất Cả Sản Phẩm'
              : `Tìm Thấy ${filteredToys.length} Sản Phẩm`}
          </Text>
          <Text style={styles.sectionCount}>({filteredToys.length} món)</Text>
        </View>

        {/* ── RESPONSIVE 2-COLUMN GRID (KHÔNG BỊ KÉO DÀI HÌNH ẢNH) ─────────── */}
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
                onPress={() => handleOpenDetail(toy)}
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
                      onPress={() => handleAddToCart(toy)}
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
              Không tìm thấy đồ chơi phù hợp
            </Text>
            <Text style={styles.emptySub}>
              Thử tìm từ khoá khác hoặc xoá bớt bộ lọc danh mục
            </Text>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLogo: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  officialBadge: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  officialBadgeText: {
    color: '#854D0E',
    fontSize: 10,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminPortalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  adminPortalText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
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
  heroBanner: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroTextContent: {
    flex: 1,
    paddingRight: 10,
  },
  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  heroPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  heroSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
  },
  heroImage: {
    width: 76,
    height: 76,
    borderRadius: 10,
  },
  categoryScroll: {
    gap: 6,
    paddingBottom: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  categoryPillText: {
    fontSize: 12,
  },
  ageScroll: {
    gap: 6,
    paddingBottom: 10,
  },
  agePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  agePillText: {
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionCount: {
    fontSize: 12,
    color: '#64748B',
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
});
