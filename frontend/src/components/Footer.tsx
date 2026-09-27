import React from 'react';
import { Phone, MessageSquare, ShieldCheck, ChevronUp, Facebook, Instagram, Youtube, Globe } from 'lucide-react';

interface FooterProps {
  onOpenChat?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenChat }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#f5f5f5] text-[#111111] border-t border-[#e5e5e5] pt-12 pb-8 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b border-[#e5e5e5]">
          
          {/* Cột 1: Thông tin Doanh nghiệp */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#111111] text-white font-black px-3 py-1 text-xl rounded-md tracking-tighter">
                NIKE
              </div>
              <span className="font-extrabold text-xl tracking-tight text-[#111111]">
                STORE<span className="text-[#e52e2e]">.</span>
              </span>
            </div>

            <div className="text-xs text-[#707072] space-y-1.5 leading-relaxed max-w-lg pt-2">
              <p className="font-semibold text-[#111111]">Tên doanh nghiệp: CÔNG TY TNHH NIKE STORE VIỆT NAM</p>
              <p>GCN ĐKDN: 0309921077 cấp ngày 17/03/2010</p>
              <p>Nơi cấp: Phòng Đăng ký kinh doanh - Sở Kế hoạch và Đầu tư Tp.HCM</p>
              <p>Địa chỉ: Số 77, đường Hoàng Văn Thái, P. Tân Mỹ, Q.7, Tp.HCM</p>
              <p>SĐT: 028 3713 5750 (HCM) line 462 / 024 6293 9370 (Hà Nội)</p>
            </div>

            {/* Dấu Chứng nhận Bộ Công Thương */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 bg-[#0072bc] text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xs">
                <ShieldCheck className="w-5 h-5" />
                <div className="text-[10px] leading-tight">
                  <span className="block font-black tracking-wider">ĐÃ THÔNG BÁO</span>
                  <span className="block font-medium opacity-90">BỘ CÔNG THƯƠNG</span>
                </div>
              </div>
              <p className="text-[11px] text-[#707072] mt-2">© 2026 Nike Store Inc. Tất cả quyền được bảo lưu.</p>
            </div>
          </div>

          {/* Cột 2: Hotline & Hỗ trợ Khách hàng */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-sm font-semibold text-[#707072]">Hotline Hỗ Trợ</span>
              <h3 className="text-3xl font-black tracking-tight text-[#111111] mt-1">1900 5351</h3>
              <p className="text-sm font-medium text-[#111111] mt-1">Từ 09:00 - 18:00 (Thứ 2 - Chủ nhật)</p>
            </div>

            {/* Buttons Hỗ trợ 1:1 & Trò chuyện */}
            <div className="flex flex-wrap items-center gap-3">
              <button className="px-5 py-2.5 bg-white border border-[#111111] rounded-full text-xs font-bold text-[#111111] hover:bg-[#111111] hover:text-white transition-all cursor-pointer shadow-xs">
                1:1 Inquiry
              </button>
              <button
                onClick={onOpenChat}
                className="px-5 py-2.5 bg-white border border-[#111111] rounded-full text-xs font-bold text-[#111111] hover:bg-[#111111] hover:text-white transition-all cursor-pointer shadow-xs flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-[#e52e2e]" />
                Trò chuyện trực tuyến
              </button>
            </div>

            {/* Điều khoản sử dụng & Chính sách */}
            <div className="space-y-2 pt-2 border-t border-[#e5e5e5]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Điều khoản sử dụng</h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#707072]">
                <a href="#" className="hover:text-[#111111] hover:underline">Chính sách bảo mật</a>
                <span>/</span>
                <a href="#" className="hover:text-[#111111] hover:underline">Chính sách giao hàng, đổi trả</a>
                <span>/</span>
                <a href="#" className="hover:text-[#111111] hover:underline">Điều khoản dịch vụ</a>
                <span>/</span>
                <a href="#" className="hover:text-[#111111] hover:underline">Chính sách bảo hành sản phẩm</a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Social Icons & Language Switcher */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="#" className="w-9 h-9 rounded-full bg-white border border-[#e5e5e5] flex items-center justify-center text-[#111111] hover:bg-[#111111] hover:text-white transition-colors">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="#" className="w-9 h-9 rounded-full bg-white border border-[#e5e5e5] flex items-center justify-center text-[#111111] hover:bg-[#111111] hover:text-white transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="#" className="w-9 h-9 rounded-full bg-white border border-[#e5e5e5] flex items-center justify-center text-[#111111] hover:bg-[#111111] hover:text-white transition-colors">
              <Youtube className="w-4 h-4" />
            </a>
          </div>

          {/* Switcher Ngôn ngữ */}
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#e5e5e5] text-xs font-bold text-[#111111] cursor-pointer hover:border-[#111111] transition-colors">
            <Globe className="w-4 h-4 text-[#0072bc]" />
            <span>🇻🇳 TIẾNG VIỆT</span>
          </div>
        </div>
      </div>

      {/* Floating Back to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 w-11 h-11 bg-white border border-[#e5e5e5] rounded-full shadow-lg flex items-center justify-center text-[#111111] hover:bg-[#111111] hover:text-white transition-all z-40 cursor-pointer"
        title="Về đầu trang"
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </footer>
  );
};
