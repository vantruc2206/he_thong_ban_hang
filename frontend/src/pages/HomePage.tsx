import React from 'react';
import { ArrowRight, ShieldCheck, Truck, RotateCcw, Zap } from 'lucide-react';
import { Product, Category } from '../services/api';
import { ProductCard } from '../components/ProductCard';

interface HomePageProps {
  products: Product[];
  categories: Category[];
  onSelectProduct: (product: Product) => void;
  onQuickAddToCart: (product: Product) => void;
  onNavigateCatalog: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  categories,
  onSelectProduct,
  onQuickAddToCart,
  onNavigateCatalog,
}) => {
  const MOCK_PRODUCTS: Product[] = [
    {
      id: 1,
      name: "Bình Giữ Nhiệt LocknLock Energetic One Touch 550ml",
      slug: "binh-giu-nhiet-locknlock-550ml",
      base_price: 349000,
      status: "active",
      avg_rating: 4.9,
      review_count: 128,
      created_at: new Date().toISOString(),
      variants: [{ id: 101, sku: "LOCK-BINH-550-BLU", price: 349000, is_active: true, attributes: { MauSac: "Xanh Navy", DungTich: "550ml" } }],
      images: [{ id: 1, image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80", sort_order: 0, is_primary: true }]
    },
    {
      id: 2,
      name: "Nồi Chiên Không Dầu LocknLock 5.5L Điện Tử 1800W",
      slug: "noi-chien-khong-dau-locknlock-5-5l",
      base_price: 1890000,
      status: "active",
      avg_rating: 4.8,
      review_count: 95,
      created_at: new Date().toISOString(),
      variants: [{ id: 102, sku: "LOCK-NOICHIEN-55L", price: 1890000, is_active: true, attributes: { MauSac: "Đen Nhám", CongSuat: "1800W" } }],
      images: [{ id: 2, image_url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80", sort_order: 0, is_primary: true }]
    },
    {
      id: 3,
      name: "Bộ 4 Hộp Thủy Tinh Chịu Nhiệt LocknLock Glass Container",
      slug: "bo-4-hop-thuy-tinh-locknlock",
      base_price: 420000,
      status: "active",
      avg_rating: 5.0,
      review_count: 210,
      created_at: new Date().toISOString(),
      variants: [{ id: 103, sku: "LOCK-HOP-GLASS-4PC", price: 420000, is_active: true, attributes: { ChatLieu: "Thủy Tinh Borosilicate", SoLuong: "4 Hộp" } }],
      images: [{ id: 3, image_url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80", sort_order: 0, is_primary: true }]
    },
    {
      id: 4,
      name: "Cân Điện Tử Sức Khỏe LocknLock Smart Body Scale",
      slug: "can-dien-tu-locknlock-smart",
      base_price: 299000,
      status: "active",
      avg_rating: 4.7,
      review_count: 64,
      created_at: new Date().toISOString(),
      variants: [{ id: 104, sku: "LOCK-CAN-SMART", price: 299000, is_active: true, attributes: { MauSac: "Trắng Tuyết" } }],
      images: [{ id: 4, image_url: "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=600&q=80", sort_order: 0, is_primary: true }]
    }
  ];

  const displayProducts = products || [];
  const featuredProducts = displayProducts.slice(0, 6);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Banner Section */}
      <section className="relative bg-[#111111] text-white rounded-3xl overflow-hidden shadow-2xl mx-4 sm:mx-6 lg:mx-8 mt-6">
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-10" />
        <img
          src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1600&q=80"
          alt="Nike Hero Banner"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />

        <div className="relative z-20 max-w-3xl px-6 py-20 sm:px-12 sm:py-28 lg:px-16 flex flex-col items-start gap-6">
          <span className="bg-[#e52e2e] text-white text-xs font-black px-3.5 py-1.5 rounded-full tracking-widest uppercase shadow-md">
            BOOST YOUR SPEED
          </span>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white">
            JUST DO IT<span className="text-[#e52e2e]">.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#707072] font-medium max-w-xl">
            Khám phá bộ sưu tập giày thể thao, trang phục và phụ kiện chính hãng nâng tầm phong cách sống năng động của bạn.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={onNavigateCatalog}
              className="btn-primary bg-white text-[#111111] hover:bg-[#e52e2e] hover:text-white px-8 py-4 text-base font-bold transition-all shadow-lg cursor-pointer"
            >
              Khám Phá Ngay
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Feature Badges */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] flex items-center gap-4 hover-lift">
          <div className="p-3 bg-[#f5f5f5] text-[#111111] rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#111111]">Giao Hàng Siêu Tốc</h4>
            <p className="text-xs text-[#707072]">Nội thành chỉ trong 24h</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] flex items-center gap-4 hover-lift">
          <div className="p-3 bg-[#f5f5f5] text-[#111111] rounded-xl">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#111111]">Đổi Trả Dễ Dàng</h4>
            <p className="text-xs text-[#707072]">30 ngày đổi trả miễn phí</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] flex items-center gap-4 hover-lift">
          <div className="p-3 bg-[#f5f5f5] text-[#111111] rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#111111]">Cam Kết 100% Chính Hãng</h4>
            <p className="text-xs text-[#707072]">Hoàn 200% nếu phát hiện giả</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] flex items-center gap-4 hover-lift">
          <div className="p-3 bg-[#f5f5f5] text-[#111111] rounded-xl">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#111111]">Thanh Toán Cổng VNPay/MoMo</h4>
            <p className="text-xs text-[#707072]">Xác nhận tức thì qua IPN</p>
          </div>
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#707072]">TRENDING NOW</span>
            <h2 className="text-3xl font-black text-[#111111] tracking-tight mt-1">Sản Phẩm Nổi Bật</h2>
          </div>
          <button
            onClick={onNavigateCatalog}
            className="text-sm font-bold text-[#111111] hover:text-[#707072] flex items-center gap-1 cursor-pointer transition-colors"
          >
            Xem Tất Cả ({products.length})
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-[#e5e5e5]">
            <p className="text-[#707072] text-sm">Chưa có sản phẩm nào trong hệ thống. Vui lòng kết nối CSDL hoặc khởi chạy API Backend.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {featuredProducts.map((prod, index) => (
              <ProductCard
                key={prod.id}
                product={prod}
                rank={index + 1}
                onSelect={onSelectProduct}
                onQuickAddToCart={onQuickAddToCart}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
