import React from 'react';
import { Star, ShoppingCart, Eye } from 'lucide-react';
import { Product } from '../services/api';

interface ProductCardProps {
  product: Product;
  rank?: number;
  onSelect: (product: Product) => void;
  onQuickAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  rank,
  onSelect,
  onQuickAddToCart,
}) => {
  const primaryImage =
    product.images && product.images.length > 0
      ? product.images[0].image_url
      : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80';

  // Simulated discount calculation
  const discountPercent = 25; // 25% OFF
  const originalPrice = Math.round(product.base_price * 1.33);

  return (
    <div className="bg-white rounded-3xl border border-[#e5e5e5] overflow-hidden hover-lift group flex flex-col justify-between relative transition-all duration-300">
      
      {/* Top Badges (Rank Badge #1, #2... like LocknLock + Discount Tag) */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        {rank && (
          <div className="w-7 h-7 bg-[#0072bc] text-white font-black text-xs rounded-lg flex items-center justify-center shadow-md">
            {rank}
          </div>
        )}
        <div className="bg-[#e52e2e] text-white font-black text-[10px] uppercase tracking-wider px-2 py-1 rounded-md shadow-xs">
          -{discountPercent}%
        </div>
      </div>

      {/* Image Container */}
      <div
        onClick={() => onSelect(product)}
        className="relative aspect-square bg-[#f9f9f9] p-6 overflow-hidden cursor-pointer flex items-center justify-center"
      >
        <img
          src={primaryImage}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
        />

        {/* Hover Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="w-10 h-10 bg-white text-[#111111] rounded-full flex items-center justify-center hover:bg-[#111111] hover:text-white transition-all shadow-lg cursor-pointer"
            title="Xem chi tiết"
          >
            <Eye className="w-5 h-5" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAddToCart(product);
            }}
            className="w-10 h-10 bg-[#111111] text-white rounded-full flex items-center justify-center hover:bg-[#e52e2e] transition-all shadow-lg cursor-pointer"
            title="Thêm vào giỏ"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Card Content Details */}
      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[#707072]">
            <span className="font-semibold">{product.category?.name || 'Nike Official'}</span>
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{product.avg_rating || 4.9}</span>
            </div>
          </div>

          <h3
            onClick={() => onSelect(product)}
            className="text-sm font-extrabold text-[#111111] hover:text-[#e52e2e] transition-colors cursor-pointer line-clamp-2 leading-tight"
          >
            {product.name}
          </h3>
        </div>

        {/* Pricing Layout with Original Price Strikethrough (LocknLock Style) */}
        <div className="pt-2 border-t border-[#f1f1f1] flex items-end justify-between">
          <div>
            <span className="text-xs text-[#707072] line-through block">
              {originalPrice.toLocaleString('vi-VN')}đ
            </span>
            <span className="text-base font-black text-[#111111]">
              {product.base_price.toLocaleString('vi-VN')}đ
            </span>
          </div>

          <button
            onClick={() => onQuickAddToCart(product)}
            className="text-xs font-bold text-[#0072bc] hover:underline cursor-pointer flex items-center gap-1"
          >
            + Mua ngay
          </button>
        </div>
      </div>

    </div>
  );
};
