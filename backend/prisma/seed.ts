import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Xóa dữ liệu cũ
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Tạo Admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@toyverse.vn',
      password: '$2b$10$dummyhashedpassword', // TODO: hash thật khi có bcrypt
      name: 'Admin ToyVerse',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Tạo sản phẩm
  const productsData = [
    {
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
    {
      name: 'Kính Hiển Vi Khoa Học Khám Phá Thế Giới STEM',
      brand: 'ScienceKids',
      category: 'stem',
      categoryLabel: 'Giáo dục STEM',
      ageRange: '6-12y',
      ageLabel: '6 - 12 tuổi',
      price: 520000,
      originalPrice: 680000,
      discountPercent: 23,
      rating: 4.7,
      reviewCount: 142,
      soldCount: 650,
      stockCount: 8,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80',
      description: 'Độ phóng đại quang học từ 100x - 1200x, kèm theo 24 mẫu lam kính vi sinh vật.',
      material: 'Kim loại hợp kim chống rỉ & thấu kính quang học HD',
      origin: 'Đức',
      isFeatured: true,
      inStock: true,
    },
    {
      name: 'Xe Đua Địa Hình Monster Truck Điều Khiển Từ Xa 4WD',
      brand: 'SpeedMaster',
      category: 'robot',
      categoryLabel: 'Xe & Robot',
      ageRange: '6-12y',
      ageLabel: '6 - 12 tuổi',
      price: 490000,
      originalPrice: 700000,
      discountPercent: 30,
      rating: 4.9,
      reviewCount: 420,
      soldCount: 1980,
      stockCount: 64,
      image: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&auto=format&fit=crop&q=80',
      description: 'Xe đua bánh lớn chống sốc 4 bánh độc lập, chinh phục mọi địa hình với tốc độ 25km/h.',
      material: 'Khung kim loại hợp kim & Lốp cao su đàn hồi',
      origin: 'Hàn Quốc',
      isFlashSale: true,
      inStock: true,
    },
    {
      name: 'Gấu Bông Khổng Lồ Ôm Ngủ Siêu Mềm Mịn (1m2)',
      brand: 'Teddy World',
      category: 'doll',
      categoryLabel: 'Búp bê & Thú bông',
      ageRange: '1-3y',
      ageLabel: '1 - 3 tuổi',
      price: 380000,
      originalPrice: 480000,
      discountPercent: 21,
      rating: 5.0,
      reviewCount: 512,
      soldCount: 2340,
      stockCount: 29,
      image: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=600&auto=format&fit=crop&q=80',
      description: 'Gấu bông lông xù cao cấp nhập khẩu, an toàn tuyệt đối cho bé sơ sinh.',
      material: 'Bông gòn kháng khuẩn 3D, vỏ nhung tuyết mịn',
      origin: 'Thái Lan',
      inStock: true,
    },
    {
      name: 'Bộ Đồ Chơi Gỗ Xếp Hình Khối Giáo Dục Montessori',
      brand: 'WoodToy Nature',
      category: 'stem',
      categoryLabel: 'Giáo dục STEM',
      ageRange: '1-3y',
      ageLabel: '1 - 3 tuổi',
      price: 290000,
      originalPrice: 380000,
      discountPercent: 24,
      rating: 4.9,
      reviewCount: 380,
      soldCount: 1750,
      stockCount: 52,
      image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=80',
      description: 'Bộ hình khối 100 chi tiết gỗ tự nhiên, sơn màu gốc nước không chì.',
      material: 'Gỗ dẻ gai tự nhiên 100%, sơn an toàn gốc nước',
      origin: 'Việt Nam',
      isFeatured: true,
      inStock: true,
    },
    {
      name: 'Bộ Board Game Mèo Nổ Mở Rộng Cả Nhà Cùng Vui',
      brand: 'FunFamily Games',
      category: 'boardgame',
      categoryLabel: 'Board Game',
      ageRange: '12y+',
      ageLabel: '12+ tuổi',
      price: 199000,
      originalPrice: 250000,
      discountPercent: 20,
      rating: 4.8,
      reviewCount: 620,
      soldCount: 3400,
      stockCount: 80,
      image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&auto=format&fit=crop&q=80',
      description: 'Trò chơi thẻ bài kịch tính, vui nhộn dành cho nhóm 2-8 người.',
      material: 'Giấy cán màng chống nước cao cấp',
      origin: 'Việt Nam',
      inStock: true,
    },
    {
      name: 'Vali Họa Sĩ Nhí 150 Chi Tiết Bút Màu & Đất Nặn',
      brand: 'ArtMaster',
      category: 'craft',
      categoryLabel: 'Mỹ thuật & Sáng tạo',
      ageRange: '3-6y',
      ageLabel: '3 - 6 tuổi',
      price: 250000,
      originalPrice: 350000,
      discountPercent: 28,
      rating: 4.7,
      reviewCount: 210,
      soldCount: 920,
      stockCount: 19,
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80',
      description: 'Hộp vali gỗ cao cấp gồm sáp màu, chì màu, bút lông nước, màu nước và đất nặn không dính tay.',
      material: 'Màu gốc thực vật tự nhiên, dễ lau rửa',
      origin: 'Hàn Quốc',
      inStock: true,
    },
    {
      name: 'Thảm Nhạc Vận Động Đàn Piano Cho Bé Sơ Sinh',
      brand: 'BabyFirst',
      category: 'stem',
      categoryLabel: 'Giáo dục STEM',
      ageRange: '0-1y',
      ageLabel: '0 - 12 tháng',
      price: 340000,
      originalPrice: 450000,
      discountPercent: 24,
      rating: 4.9,
      reviewCount: 330,
      soldCount: 1540,
      stockCount: 30,
      image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&auto=format&fit=crop&q=80',
      description: 'Kèm phím đàn piano cảm ứng bằng chân, lục lạc treo xinh xắn giúp bé phát triển thính giác.',
      material: 'Vải cotton thoáng khí, nhựa ABS an toàn cho bé ngậm nướu',
      origin: 'Nhật Bản',
      isFeatured: true,
      inStock: true,
    },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const product = await prisma.product.create({ data: p });
    createdProducts.push(product);
    console.log(`  ✅ Product: ${product.name}`);
  }

  // Tạo đơn hàng mẫu
  const order1 = await prisma.order.create({
    data: {
      customerName: 'Nguyễn Văn Minh',
      customerPhone: '0988.123.456',
      address: 'Toà R2, Vinhomes Royal City, Thanh Xuân, Hà Nội',
      totalAmount: 1310000,
      status: 'PACKING',
      paymentMethod: 'COD',
      isGiftWrap: true,
      userId: admin.id,
      items: {
        create: [
          { productId: createdProducts[0].id, quantity: 1, price: 890000 },
          { productId: createdProducts[2].id, quantity: 1, price: 420000 },
        ],
      },
    },
  });
  console.log(`  ✅ Order: ${order1.id}`);

  const order2 = await prisma.order.create({
    data: {
      customerName: 'Trần Thị Thu Hà',
      customerPhone: '0912.888.999',
      address: 'Số 45 Lê Duẩn, Hải Châu, Đà Nẵng',
      totalAmount: 650000,
      status: 'SHIPPING',
      paymentMethod: 'MoMo',
      isGiftWrap: true,
      items: {
        create: [
          { productId: createdProducts[1].id, quantity: 1, price: 650000 },
        ],
      },
    },
  });
  console.log(`  ✅ Order: ${order2.id}`);

  const order3 = await prisma.order.create({
    data: {
      customerName: 'Lê Hoàng Nam',
      customerPhone: '0936.555.777',
      address: 'Chung cư Masteri Thảo Điền, Quận 2, TP.HCM',
      totalAmount: 980000,
      status: 'COMPLETED',
      paymentMethod: 'Chuyển khoản',
      isGiftWrap: false,
      items: {
        create: [
          { productId: createdProducts[4].id, quantity: 2, price: 490000 },
        ],
      },
    },
  });
  console.log(`  ✅ Order: ${order3.id}`);

  console.log('\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
