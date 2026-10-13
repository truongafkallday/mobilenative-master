import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useToyStore } from '@/hooks/use-toy-store';

type TabMode = 'user_login' | 'user_register' | 'admin_portal';

export default function LoginScreen() {
  const router = useRouter();
  const isDark = false;
  const theme = Colors.light;

  const { currentUser, login, register, logout, formatVND } = useToyStore();

  const [activeTab, setActiveTab] = useState<TabMode>('user_login');
  const [loading, setLoading] = useState(false);

  // Common Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [kidName, setKidName] = useState('');
  const [kidBirthday, setKidBirthday] = useState('');

  // Admin Portal States
  const [adminEmail, setAdminEmail] = useState('admin@toyverse.vn');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminRegisterMode, setAdminRegisterMode] = useState(false);
  const [adminFullName, setAdminFullName] = useState('');

  // Handle User Login
  const handleUserLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email và Mật khẩu!');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password.trim(), 'USER');
      setLoading(false);
      if (result.success) {
        Alert.alert(
          'Đăng nhập thành công! 🎉',
          `Chào mừng ${result.user?.name || 'bạn'} trở lại ToyVerse!`,
          [{ text: 'Vào mua sắm', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Đăng nhập thất bại', result.error || 'Vui lòng kiểm tra lại email hoặc mật khẩu.');
      }
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Lỗi', e.message || 'Không thể kết nối đến máy chủ.');
    }
  };

  // Handle User Register
  const handleUserRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      Alert.alert('Thông báo', 'Vui lòng điền các trường bắt buộc: Họ tên, Email và Mật khẩu!');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu cần tối thiểu 6 ký tự để đảm bảo an toàn.');
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        email: email.trim(),
        password: password.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        role: 'USER',
        kidName: kidName.trim() || undefined,
        kidBirthday: kidBirthday.trim() || undefined,
      });
      setLoading(false);

      if (result.success) {
        Alert.alert(
          'Đăng ký thành công! 🎁',
          `Tài khoản đã được tạo và lưu vĩnh viễn vào hệ thống! Tặng bạn 200 điểm thưởng thành viên.`,
          [{ text: 'Bắt đầu ngay', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Đăng ký không thành công', result.error || 'Vui lòng thử lại.');
      }
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Lỗi', e.message || 'Lỗi kết nối máy chủ.');
    }
  };

  // Handle Admin Login (Chỉ 1 tài khoản Admin duy nhất)
  const handleAdminAction = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập Email Admin và Mật khẩu quản trị!');
      return;
    }
    setLoading(true);
    const res = await login(adminEmail.trim(), adminPassword.trim(), 'ADMIN');
    setLoading(false);

    if (res.success) {
      if (Platform.OS === 'web') {
        router.replace('/admin' as any);
      } else {
        Alert.alert('Xác thực Admin thành công 🛡️', 'Chào mừng Quản trị viên hệ thống ToyVerse!', [
          { text: 'Vào Trang Quản Trị', onPress: () => router.replace('/admin' as any) },
        ]);
      }
    } else {
      Alert.alert('Từ chối truy cập ❌', res.error || 'Tài khoản không phải Admin hoặc sai mật khẩu!');
    }
  };


  // Nạp tài khoản mẫu nhanh
  const fillQuickCustomer = () => {
    setEmail('minh.nguyen@gmail.com');
    setPassword('123456');
  };

  const fillQuickAdmin = () => {
    setAdminEmail('admin@toyverse.vn');
    setAdminPassword('admin123');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <IconSymbol name="xmark" size={20} color={theme.subtext} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {currentUser ? 'Tài Khoản ToyVerse' : 'Tài Khoản & Đăng Nhập'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* NẾU ĐÃ ĐĂNG NHẬP */}
        {currentUser ? (
          <View style={styles.profileSection}>
            <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: currentUser.role === 'admin' ? '#3B82F6' : theme.primary },
                ]}
              >
                <IconSymbol name="person.fill" size={38} color="#FFFFFF" />
              </View>

              <Text style={[styles.profileName, { color: theme.text }]}>{currentUser.name}</Text>
              <Text style={[styles.profileEmail, { color: theme.subtext }]}>{currentUser.email}</Text>

              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: currentUser.role === 'admin' ? '#EFF6FF' : '#FEF3C7',
                    borderColor: currentUser.role === 'admin' ? '#BFDBFE' : '#FDE68A',
                  },
                ]}
              >
                <IconSymbol
                  name={currentUser.role === 'admin' ? 'shield.checkerboard' : 'star.fill'}
                  size={14}
                  color={currentUser.role === 'admin' ? '#2563EB' : '#D97706'}
                />
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: currentUser.role === 'admin' ? '#1E40AF' : '#B45309' },
                  ]}
                >
                  {currentUser.role === 'admin' ? 'QUẢN TRỊ VIÊN HỆ THỐNG' : 'THÀNH VIÊN TOYVERSE'}
                </Text>
              </View>

              <View style={[styles.infoGrid, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                {currentUser.phone && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>Số điện thoại:</Text>
                    <Text style={[styles.infoVal, { color: theme.text }]}>{currentUser.phone}</Text>
                  </View>
                )}
                {currentUser.kidName && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>Bé yêu:</Text>
                    <Text style={[styles.infoVal, { color: theme.text }]}>{currentUser.kidName}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.subtext }]}>Điểm tích luỹ:</Text>
                  <Text style={[styles.infoVal, { color: '#10B981', fontWeight: 'bold' }]}>
                    {currentUser.points} điểm ⭐
                  </Text>
                </View>
              </View>

              {currentUser.role === 'admin' && (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#1E40AF', marginTop: 16 }]}
                  onPress={() => router.replace('/admin' as any)}
                >
                  <IconSymbol name="chart.bar.xaxis" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Vào Trang Quản Trị Hệ Thống</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.logoutBtn, { borderColor: theme.border, marginTop: 12 }]}
                onPress={() => {
                  logout();
                  Alert.alert('Đã đăng xuất', 'Hẹn gặp lại bạn tại ToyVerse!');
                }}
              >
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={16} color="#EF4444" />
                <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* NẾU CHƯA ĐĂNG NHẬP */
          <View style={styles.authWrapper}>
            {/* Brand Banner */}
            <View style={styles.heroSection}>
              <View style={[styles.brandIconBox, { backgroundColor: theme.primary + '18' }]}>
                <Text style={styles.brandEmoji}>🧸</Text>
              </View>
              <Text style={[styles.heroTitle, { color: theme.text }]}>ToyVerse Premium</Text>
              <Text style={[styles.heroSub, { color: theme.subtext }]}>
                Hệ sinh thái đồ chơi thông minh & phát triển trí tuệ trẻ em
              </Text>
            </View>

            {/* Segmented Control: 3 Tùy Chọn Riêng Biệt */}
            <View style={[styles.segmentContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'user_login' && styles.segmentBtnActive,
                  activeTab === 'user_login' && { backgroundColor: theme.card },
                ]}
                onPress={() => setActiveTab('user_login')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeTab === 'user_login'
                      ? { color: theme.primary, fontWeight: '700' }
                      : { color: theme.subtext },
                  ]}
                >
                  Đăng Nhập
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'user_register' && styles.segmentBtnActive,
                  activeTab === 'user_register' && { backgroundColor: theme.card },
                ]}
                onPress={() => setActiveTab('user_register')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeTab === 'user_register'
                      ? { color: theme.primary, fontWeight: '700' }
                      : { color: theme.subtext },
                  ]}
                >
                  Đăng Ký
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'admin_portal' && styles.segmentBtnActive,
                  activeTab === 'admin_portal' && { backgroundColor: '#DC2626' },
                ]}
                onPress={() => setActiveTab('admin_portal')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <IconSymbol
                    name="shield.checkerboard"
                    size={12}
                    color={activeTab === 'admin_portal' ? '#FFFFFF' : theme.subtext}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      activeTab === 'admin_portal'
                        ? { color: '#FFFFFF', fontWeight: '700' }
                        : { color: theme.subtext },
                    ]}
                  >
                    Admin
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* TAB 1: ĐĂNG NHẬP KHÁCH HÀNG */}
            {activeTab === 'user_login' && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Đăng Nhập Khách Hàng</Text>
                <Text style={[styles.cardSub, { color: theme.subtext }]}>
                  Đăng nhập để theo dõi giỏ hàng, tích điểm quà sinh nhật cho bé
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Email tài khoản</Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: theme.border }]}>
                    <IconSymbol name="envelope.fill" size={18} color={theme.subtext} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="vd: minh.nguyen@gmail.com"
                      placeholderTextColor={theme.subtext}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Mật khẩu</Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: theme.border }]}>
                    <IconSymbol name="lock.fill" size={18} color={theme.subtext} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Nhập mật khẩu..."
                      placeholderTextColor={theme.subtext}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <IconSymbol name={showPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color={theme.subtext} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  onPress={handleUserLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <IconSymbol name="arrow.right.circle.fill" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Đăng Nhập Ngay</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.quickFillBtn} onPress={fillQuickCustomer}>
                  <Text style={[styles.quickFillText, { color: theme.primary }]}>
                    ⚡ Điền nhanh tài khoản khách hàng mẫu
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 2: ĐĂNG KÝ KHÁCH HÀNG */}
            {activeTab === 'user_register' && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Đăng Ký Thành Viên Mới</Text>
                <Text style={[styles.cardSub, { color: theme.subtext }]}>
                  Dữ liệu được lưu trữ vĩnh viễn trên SQLite, không bao giờ mất!
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Họ và tên ba/mẹ *</Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: theme.border }]}>
                    <IconSymbol name="person.fill" size={18} color={theme.subtext} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="vd: Nguyễn Văn Minh"
                      placeholderTextColor={theme.subtext}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Email đăng ký *</Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: theme.border }]}>
                    <IconSymbol name="envelope.fill" size={18} color={theme.subtext} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="vd: contact@email.com"
                      placeholderTextColor={theme.subtext}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Mật khẩu (tối thiểu 6 ký tự) *</Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: theme.border }]}>
                    <IconSymbol name="lock.fill" size={18} color={theme.subtext} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Tạo mật khẩu..."
                      placeholderTextColor={theme.subtext}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <IconSymbol name={showPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color={theme.subtext} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Số điện thoại</Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: theme.border }]}>
                    <IconSymbol name="phone.fill" size={18} color={theme.subtext} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="vd: 0988.123.456"
                      placeholderTextColor={theme.subtext}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Tên bé yêu (để nhận quà)</Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: theme.border }]}>
                    <IconSymbol name="heart.fill" size={18} color="#EF4444" />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="vd: Bé Bon / Bé Bông"
                      placeholderTextColor={theme.subtext}
                      value={kidName}
                      onChangeText={setKidName}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#10B981' }]}
                  onPress={handleUserRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <IconSymbol name="checkmark.circle.fill" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Tạo Tài Khoản & Nhận Quà</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: TRANG ADMIN TÀI KHOẢN MẬT KHẨU RIÊNG BIỆT */}
            {activeTab === 'admin_portal' && (
              <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#FEE2E2', borderWidth: 1 }]}>
                <View style={styles.adminSecurityHeader}>
                  <View style={styles.adminShieldBadge}>
                    <IconSymbol name="shield.checkerboard" size={22} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.adminTitle} numberOfLines={1}>CỔNG QUẢN TRỊ VIÊN</Text>
                    <Text style={styles.adminSubtitle} numberOfLines={1}>Xác thực quản trị độc quyền ToyVerse</Text>
                  </View>
                </View>

                <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' }}>
                  <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                    Hệ thống bảo mật: Chỉ 1 tài khoản Quản trị viên duy nhất
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: '#0F172A' }]}>Email Quản trị (Admin) *</Text>
                  <View style={[styles.inputContainer, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                    <IconSymbol name="shield.fill" size={18} color="#DC2626" />
                    <TextInput
                      style={[styles.input, { color: '#0F172A' }]}
                      placeholder="admin@toyverse.vn"
                      placeholderTextColor="#94A3B8"
                      value={adminEmail}
                      onChangeText={setAdminEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: '#0F172A' }]}>Mật khẩu bảo mật Admin *</Text>
                  <View style={[styles.inputContainer, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                    <IconSymbol name="key.fill" size={18} color="#DC2626" />
                    <TextInput
                      style={[styles.input, { color: '#0F172A' }]}
                      placeholder="Mật khẩu Admin..."
                      placeholderTextColor="#94A3B8"
                      value={adminPassword}
                      onChangeText={setAdminPassword}
                      secureTextEntry={!showAdminPassword}
                    />
                    <TouchableOpacity onPress={() => setShowAdminPassword(!showAdminPassword)}>
                      <IconSymbol
                        name={showAdminPassword ? 'eye.slash.fill' : 'eye.fill'}
                        size={18}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#DC2626', marginTop: 12 }]}
                  onPress={handleAdminAction}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <IconSymbol
                        name={adminRegisterMode ? 'person.crop.circle.badge.plus' : 'lock.open.fill'}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.primaryButtonText}>
                        {adminRegisterMode ? 'Đăng Ký Tài Khoản Admin' : 'Xác Thực & Vào Admin Dashboard'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {!adminRegisterMode && (
                  <TouchableOpacity style={styles.quickFillBtn} onPress={fillQuickAdmin}>
                    <Text style={{ color: '#64748B', textAlign: 'center', fontSize: 13, fontWeight: '500' }}>
                      Mặc định: admin@toyverse.vn / admin123
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  brandIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandEmoji: {
    fontSize: 32,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  authWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  quickFillBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 4,
  },
  quickFillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Admin Portal Styles
  adminSecurityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  adminShieldBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminTitle: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  adminSubtitle: {
    color: '#64748B',
    fontSize: 12,
  },
  adminToggleBox: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  adminToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  adminToggleBtnActive: {
    backgroundColor: '#0F172A',
  },
  adminToggleText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  // Profile Section
  profileSection: {
    width: '100%',
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoGrid: {
    width: '100%',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
