import React from 'react';
import { X, Trash2, ArrowRight, ShoppingBag, ChevronRight } from 'lucide-react';
import { CartItem } from '../services/api';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (sku: string) => void;
  onUpdateQuantity?: (sku: string, quantity: number) => void;
  onProceedToCheckout: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onUpdateQuantity,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => {
    const price = item.price ?? item.product?.base_price ?? item.variant?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-left">
        
        {/* Top Header */}
        <div className="p-6 border-b border-[#e5e5e5] bg-[#111111] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-[#e52e2e]" />
            <h3 className="text-lg font-black tracking-tight uppercase">Giỏ Hàng Của Bạn</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepped Breadcrumb (LocknLock Style) */}
        <div className="bg-[#f5f5f5] px-6 py-2.5 border-b border-[#e5e5e5] flex items-center gap-2 text-[11px] font-bold">
          <span className="text-[#0072bc] uppercase">GIỎ HÀNG</span>
          <ChevronRight className="w-3 h-3 text-[#707072]" />
          <span className="text-[#707072] uppercase">THANH TOÁN</span>
          <ChevronRight className="w-3 h-3 text-[#707072]" />
          <span className="text-[#707072] uppercase">THÀNH CÔNG</span>
        </div>

        {/* Cart Items List / Empty State */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            /* Empty Cart State (LocknLock Layout 2) */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="w-20 h-20 bg-[#f5f5f5] rounded-full flex items-center justify-center text-[#707072]">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-black uppercase text-[#111111] tracking-tight">GIỎ HÀNG TRỐNG</h4>
                <p className="text-xs text-[#707072] mt-1 max-w-xs mx-auto">
                  Sẵn sàng mua sắm chưa? Hãy khám phá những sản phẩm chất lượng của Nike Store!
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-[#0072bc] text-white rounded-full text-xs font-bold hover:bg-[#005c99] transition-all cursor-pointer shadow-md uppercase tracking-wider"
              >
                ĐẾN SẢN PHẨM BÁN CHẠY
              </button>
            </div>
          ) : (
            items.map((item) => {
              const productName = item.product_name || item.product?.name || 'Sản Phẩm';
              const price = item.price ?? item.product?.base_price ?? item.variant?.price ?? 0;
              const imgUrl = item.image_url || item.product?.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80';

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5] hover:border-[#111111] transition-all"
                >
                  <div className="w-16 h-16 bg-white rounded-xl overflow-hidden shrink-0 border border-[#e5e5e5] p-1">
                    <img
                      src={imgUrl}
                      alt={productName}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-[#111111] truncate">{productName}</h4>
                    <p className="text-[10px] text-[#707072] mt-0.5">SKU: {item.sku}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-black text-[#111111]">
                        {price.toLocaleString('vi-VN')}đ
                      </span>
                      
                      {/* Quantity Controls (+ / -) */}
                      <div className="flex items-center border border-[#e5e5e5] rounded-lg bg-white px-1.5 py-0.5">
                        <button
                          onClick={() => onUpdateQuantity ? onUpdateQuantity(item.sku, item.quantity - 1) : onRemoveItem(item.sku)}
                          className="w-5 h-5 font-bold text-xs text-[#707072] hover:text-[#111111] flex items-center justify-center cursor-pointer"
                          title="Giảm"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold text-[#111111]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity && onUpdateQuantity(item.sku, item.quantity + 1)}
                          className="w-5 h-5 font-bold text-xs text-[#707072] hover:text-[#111111] flex items-center justify-center cursor-pointer"
                          title="Tăng"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.sku)}
                    className="p-2 text-[#707072] hover:text-[#e52e2e] rounded-full hover:bg-white transition-colors cursor-pointer shrink-0"
                    title="Xóa sản phẩm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Proceed CTA */}
        {items.length > 0 && (
          <div className="p-6 border-t border-[#e5e5e5] bg-[#f9f9f9] space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-[#707072]">TỔNG TIỀN DỰ KIẾN:</span>
              <span className="font-black text-xl text-[#111111]">
                {totalAmount.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full bg-[#111111] text-white py-4 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#e52e2e] transition-colors cursor-pointer shadow-lg flex items-center justify-center gap-2"
            >
              TIẾN HÀNH THANH TOÁN
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
