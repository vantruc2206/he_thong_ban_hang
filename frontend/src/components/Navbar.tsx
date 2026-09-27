import React, { useState } from 'react';
import { Search, ShoppingBag, User as UserIcon, Menu as MenuIcon, LogOut, ChevronDown, Sparkles, Flame, Tag, Package } from 'lucide-react';
import { MegaMenu } from './MegaMenu';
import { Category } from '../services/api';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onSearch: (query: string) => void;
  onNavigateHome: () => void;
  onNavigateCatalog: () => void;
  currentUser?: any;
  onLogout?: () => void;
  categories?: Category[];
  onOpenMyOrders?: () => void;
  onOpenProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  onOpenAuth,
  onSearch,
  onNavigateHome,
  onNavigateCatalog,
  currentUser,
  onLogout,
  categories = [],
  onOpenMyOrders,
  onOpenProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#e5e5e5] shadow-xs">
      {/* Top Utility Bar */}
      <div className="bg-[#111111] text-white text-[11px] font-semibold py-1.5 px-4 text-center tracking-wider flex items-center justify-between">
        <div className="hidden sm:block text-[10px] text-white/70">HOTLINE HỖ TRỢ: 1900 5351 (09:00 - 18:00)</div>
        <div className="mx-auto sm:mx-0">
          ⚡ BIG SALE - VOUCHER GIẢM 25% CHO ĐƠN TỪ 899K | ĐỔI TRẢ TRONG 30 NGÀY
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[10px] text-white/80">
          <button onClick={onOpenMyOrders || onNavigateCatalog} className="hover:text-white transition-colors cursor-pointer flex items-center gap-1">
            <Package className="w-3 h-3 text-amber-400" />
            Tra cứu đơn hàng
          </button>
          <span>|</span>
          <button onClick={onNavigateCatalog} className="hover:text-white transition-colors cursor-pointer">Cửa hàng</button>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4 sm:gap-8">
          
          {/* Logo Brand */}
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
          >
            <div className="bg-[#111111] text-white font-black px-3 py-1 text-xl rounded-md tracking-tighter group-hover:bg-[#0072bc] transition-colors">
              OMNI
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#111111]">
              STORE<span className="text-[#0072bc]">.</span>
            </span>
          </button>

          {/* Search Input Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative hidden md:block">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm, bình nước, thiết bị gia dụng, đồ điện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f5f5f5] text-xs text-[#111111] placeholder-[#707072] pl-4 pr-10 py-2.5 rounded-full border border-transparent focus:border-[#111111] focus:bg-white focus:outline-hidden transition-all shadow-xs"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] hover:text-[#0072bc] p-1 cursor-pointer transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* User Auth & Cart Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-1.5 bg-[#111111] text-white hover:bg-[#0072bc] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs group"
                  title="Thông tin cá nhân & Địa chỉ"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#0072bc] group-hover:text-white transition-colors" />
                  <span className="max-w-[100px] truncate">{currentUser.full_name || currentUser.username}</span>
                </button>
                <button
                  onClick={onOpenMyOrders}
                  className="p-2 text-[#707072] hover:text-[#0072bc] rounded-full hover:bg-[#f5f5f5] transition-colors cursor-pointer"
                  title="Đơn hàng của tôi"
                >
                  <Package className="w-4 h-4" />
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 text-[#707072] hover:text-[#e52e2e] rounded-full hover:bg-[#f5f5f5] transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold">
                <button
                  onClick={onOpenAuth}
                  className="text-[#111111] hover:text-[#0072bc] py-1 px-2 cursor-pointer transition-colors"
                >
                  Đăng nhập
                </button>
                <span className="text-[#e5e5e5]">|</span>
                <button
                  onClick={onOpenAuth}
                  className="text-[#707072] hover:text-[#111111] py-1 px-2 cursor-pointer transition-colors"
                >
                  Đăng ký
                </button>
              </div>
            )}

            {/* Cart Icon Button with Counter */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 text-[#111111] hover:bg-[#f5f5f5] rounded-full transition-colors cursor-pointer"
              title="Giỏ hàng"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#0072bc] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Secondary Category Navigation Bar */}
        <div className="flex items-center gap-6 py-2.5 text-xs font-bold text-[#111111] border-t border-[#f1f1f1] overflow-x-auto no-scrollbar relative">
          
          {/* Mega Menu Toggle Button */}
          <button
            onMouseEnter={() => setIsMegaMenuOpen(true)}
            onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
            className="flex items-center gap-2 bg-[#111111] text-white px-4 py-1.5 rounded-full hover:bg-[#0072bc] transition-colors cursor-pointer shrink-0"
          >
            <MenuIcon className="w-4 h-4" />
            <span>Danh Mục & Bộ Lọc</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <button onClick={() => onSearch('Bán Chạy')} className="hover:text-[#0072bc] flex items-center gap-1.5 shrink-0 transition-colors">
            <Flame className="w-3.5 h-3.5 text-[#e52e2e]" />
            <span>Bán Chạy</span>
          </button>

          <button onClick={() => onSearch('Mới')} className="hover:text-[#0072bc] flex items-center gap-1.5 shrink-0 transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Sản Phẩm Mới</span>
          </button>

          <button onClick={() => onSearch('Khuyến Mãi')} className="hover:text-[#0072bc] flex items-center gap-1.5 shrink-0 transition-colors">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Khuyến Mãi</span>
          </button>

          <button onClick={() => onSearch('Sự Kiện')} className="hover:text-[#0072bc] shrink-0 transition-colors">
            Sự Kiện
          </button>

          <button onClick={() => onNavigateCatalog()} className="hover:text-[#0072bc] shrink-0 transition-colors">
            Cửa Hàng
          </button>

          <div className="ml-auto hidden lg:flex items-center gap-1 font-black text-[#111111] shrink-0">
            <span>OMNISTORE</span>
            <span className="text-[#0072bc] uppercase text-[10px] tracking-wider ml-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Rewards
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Mega Menu Dropdown */}
      <MegaMenu
        categories={categories}
        isOpen={isMegaMenuOpen}
        onClose={() => setIsMegaMenuOpen(false)}
        onSelectCategory={(query) => {
          if (query !== undefined) {
            onSearch(query);
          } else {
            onNavigateCatalog();
          }
        }}
      />
    </header>
  );
};
