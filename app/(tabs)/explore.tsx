import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Collapsible } from '@/components/ui/collapsible';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useToyStore, StoreBranch } from '@/hooks/use-toy-store';

export default function StoreExploreScreen() {
  const router = useRouter();
  const theme = Colors.light;

  const { branches, currentUser } = useToyStore();
  const [selectedCity, setSelectedCity] = useState<'all' | 'Hà Nội' | 'TP. Hồ Chí Minh' | 'Đà Nẵng'>('all');

  const filteredBranches = branches.filter(
    (b) => selectedCity === 'all' || b.city === selectedCity
  );

  const handleCallBranch = (phone: string, name: string) => {
    Alert.alert(
      'Liên Hệ Cửa Hàng',
      `Bạn có muốn gọi đến ${name} (${phone})?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gọi ngay',
          onPress: () => {
            Linking.openURL(`tel:${phone.replace(/[^0-9]/g, '')}`);
          },
        },
      ]
    );
  };

  const handleDirections = (branch: StoreBranch) => {
    Alert.alert(
      'Chỉ Đường',
      `Đang mở định vị dẫn đường tới: ${branch.address}`,
      [{ text: 'Đóng' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Screen Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Hệ Thống Cửa Hàng</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
              Chuỗi cửa hàng đồ chơi & không gian trải nghiệm toàn quốc
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.accountBtn, { backgroundColor: theme.badge }]}
            onPress={() => router.push('/login' as any)}
          >
            <IconSymbol name="person.fill" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* KidClub Loyalty Card */}
        <View style={styles.cardSection}>
          <View style={styles.vipCard}>
            <View style={styles.vipTopRow}>
              <View>
                <Text style={styles.vipBrand}>ToyLand KidClub</Text>
                <Text style={styles.vipTier}>⭐ Thẻ Thành Viên Vàng</Text>
              </View>
              <View style={styles.vipLogoBadge}>
                <IconSymbol name="gift.fill" size={20} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.vipMiddle}>
              <Text style={styles.vipKidName}>{currentUser?.kidName ?? 'Bé Nguyễn Bảo An'}</Text>
              <Text style={styles.vipMemberId}>
                {currentUser ? `Mã TV: #${currentUser.id.toUpperCase()}` : 'Mã TV: #TL-889920'}
              </Text>
            </View>

            <View style={styles.vipBottomRow}>
              <View>
                <Text style={styles.vipPointsLabel}>Điểm tích lũy</Text>
                <Text style={styles.vipPointsVal}>{currentUser?.points ?? 1450} Điểm</Text>
              </View>
              <TouchableOpacity
                style={styles.vipPerkBadge}
                onPress={() => router.push('/login' as any)}
              >
                <Text style={styles.vipPerkText}>
                  {currentUser ? '🎂 Quà sinh nhật tháng 10' : 'Đăng nhập để tích điểm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Admin Quick Jump Banner if User is Admin */}
          {currentUser?.role === 'admin' && (
            <TouchableOpacity
              style={styles.adminBanner}
              onPress={() => router.push('/admin' as any)}
              activeOpacity={0.88}
            >
              <View style={styles.adminBannerIcon}>
                <IconSymbol name="shield.checkerboard" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.adminBannerText}>
                <Text style={styles.adminBannerTitle}>Trang Quản Trị Cửa Hàng (Admin)</Text>
                <Text style={styles.adminBannerDesc}>Quản lý kho đồ chơi, cập nhật đơn hàng & báo cáo</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color="#3A86FF" />
            </TouchableOpacity>
          )}
        </View>

        {/* City Filter Pills */}
        <View style={styles.cityFilterContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Chi Nhánh Gần Bạn</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityScroll}>
            {(['all', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng'] as const).map((city) => {
              const active = selectedCity === city;
              return (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.cityPill,
                    {
                      backgroundColor: active ? theme.primary : theme.card,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedCity(city)}
                >
                  <Text
                    style={[
                      styles.cityPillText,
                      { color: active ? '#FFFFFF' : theme.text },
                      active && { fontWeight: 'bold' },
                    ]}
                  >
                    {city === 'all' ? 'Tất cả chi nhánh' : city}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Branch Cards */}
        <View style={styles.branchList}>
          {filteredBranches.map((branch) => (
            <View
              key={branch.id}
              style={[styles.branchCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.branchCardHeader}>
                <View style={styles.branchTitleRow}>
                  <Text style={[styles.branchName, { color: theme.text }]}>{branch.name}</Text>
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{branch.distance}</Text>
                  </View>
                </View>
                {branch.hasPlayZone && (
                  <View style={styles.playZoneTag}>
                    <IconSymbol name="sparkles" size={13} color="#D97706" />
                    <Text style={styles.playZoneText}>Khu trải nghiệm LEGO & Đua xe miễn phí</Text>
                  </View>
                )}
              </View>

              <View style={styles.branchDetails}>
                <View style={styles.detailRow}>
                  <IconSymbol name="location.fill" size={16} color={theme.primary} />
                  <Text style={[styles.detailText, { color: theme.text }]} numberOfLines={2}>
                    {branch.address}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <IconSymbol name="clock.fill" size={16} color={theme.subtext} />
                  <Text style={[styles.detailText, { color: theme.subtext }]}>{branch.hours}</Text>
                </View>

                <View style={styles.detailRow}>
                  <IconSymbol name="phone.fill" size={16} color={theme.subtext} />
                  <Text style={[styles.detailText, { color: theme.subtext }]}>{branch.phone}</Text>
                </View>
              </View>

              <View style={[styles.branchActions, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.border }]}
                  onPress={() => handleCallBranch(branch.phone, branch.name)}
                >
                  <IconSymbol name="phone.fill" size={16} color={theme.primary} />
                  <Text style={[styles.actionBtnText, { color: theme.primary }]}>Gọi hotline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => handleDirections(branch)}
                >
                  <IconSymbol name="paperplane.fill" size={16} color="#FFFFFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Chỉ đường</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Store Services Highlights */}
        <View style={styles.servicesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>
            Dịch Vụ Độc Quyền Tại ToyLand
          </Text>

          <View style={[styles.serviceItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.serviceIconBox, { backgroundColor: '#FEE2E2' }]}>
              <IconSymbol name="gift.fill" size={24} color="#EF4444" />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={[styles.serviceTitle, { color: theme.text }]}>
                Gói Quà Nghệ Thuật Miễn Phí
              </Text>
              <Text style={[styles.serviceDesc, { color: theme.subtext }]}>
                Hơn 20 mẫu giấy gói quà hoạt hình độc quyền cùng thiệp chúc mừng thiết kế riêng cho bé.
              </Text>
            </View>
          </View>

          <View style={[styles.serviceItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.serviceIconBox, { backgroundColor: '#DBEAFE' }]}>
              <IconSymbol name="sparkles" size={24} color="#3A86FF" />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={[styles.serviceTitle, { color: theme.text }]}>
                Workshop Lắp Ráp & STEM Cuối Tuần
              </Text>
              <Text style={[styles.serviceDesc, { color: theme.subtext }]}>
                Mỗi thứ Bảy & Chủ Nhật, các bé được tham gia thử thách lắp robot và nhận huy hiệu nhà sáng chế.
              </Text>
            </View>
          </View>

          <View style={[styles.serviceItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.serviceIconBox, { backgroundColor: '#D1FAE5' }]}>
              <IconSymbol name="shield.checkerboard" size={24} color="#10B981" />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={[styles.serviceTitle, { color: theme.text }]}>
                Bảo Hành & Đổi Mới Chi Tiết Lạc
              </Text>
              <Text style={[styles.serviceDesc, { color: theme.subtext }]}>
                Hỗ trợ tìm và bù mảnh LEGO bị thất lạc miễn phí trọn đời cho khách hàng thân thiết.
              </Text>
            </View>
          </View>
        </View>

        {/* Safety & Care FAQ */}
        <View style={styles.faqSection}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>
            Cẩm Nang An Toàn Cho Ba Mẹ
          </Text>

          <Collapsible title="Tiêu chuẩn an toàn đồ chơi tại ToyLand ra sao?">
            <Text style={[styles.faqAnswer, { color: theme.subtext }]}>
              Toàn bộ đồ chơi tại ToyLand đều được nhập khẩu chính ngạch, có tem hợp quy CR của Bộ KH&CN và chứng chỉ an toàn quốc tế EN71 (Châu Âu) & ASTM (Hoa Kỳ), cam kết không chì, không hạt vi nhựa độc hại.
            </Text>
          </Collapsible>

          <Collapsible title="Cách vệ sinh đồ chơi kháng khuẩn đúng cách cho trẻ nhỏ?">
            <Text style={[styles.faqAnswer, { color: theme.subtext }]}>
              Đối với đồ chơi nhựa ABS như LEGO, ba mẹ nên ngâm rửa với nước ấm dưới 40°C pha nước rửa bình sữa trẻ em, phơi nơi râm mát. Đồ chơi gỗ lau bằng khăn ẩm pha giấm loãng, tránh phơi nắng gắt làm cong vênh gỗ.
            </Text>
          </Collapsible>

          <Collapsible title="Chính sách bảo hành và đổi trả thế nào?">
            <Text style={[styles.faqAnswer, { color: theme.subtext }]}>
              ToyLand hỗ trợ 1 đổi 1 trong vòng 30 ngày đối với mọi sản phẩm có lỗi từ nhà sản xuất. Với robot và xe điều khiển từ xa, chúng tôi bảo hành động cơ và pin chính hãng trong 6 tháng.
            </Text>
          </Collapsible>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  cardSection: {
    padding: 16,
    gap: 12,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  adminBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3A86FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBannerText: {
    flex: 1,
  },
  adminBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  adminBannerDesc: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  vipCard: {
    borderRadius: 20,
    backgroundColor: '#8338EC',
    padding: 20,
    shadowColor: '#8338EC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  vipTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vipBrand: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  vipTier: {
    color: '#FCD34D',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  vipLogoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vipMiddle: {
    marginTop: 20,
    marginBottom: 20,
  },
  vipKidName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  vipMemberId: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  vipBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  vipPointsLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  vipPointsVal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 1,
  },
  vipPerkBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  vipPerkText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cityFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cityScroll: {
    gap: 8,
  },
  cityPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  cityPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  branchList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  branchCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  branchCardHeader: {
    marginBottom: 12,
  },
  branchTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  branchName: {
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  distanceBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  distanceText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: 'bold',
  },
  playZoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  playZoneText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  branchDetails: {
    gap: 8,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  branchActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  servicesSection: {
    paddingHorizontal: 16,
    marginTop: 26,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  serviceIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  faqSection: {
    paddingHorizontal: 16,
    marginTop: 22,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 6,
  },
});
