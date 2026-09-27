import React, { useState, useEffect } from 'react';
import { Star, ShoppingBag, ArrowLeft, Check, Play, ShieldCheck, Truck, RotateCcw, ChevronLeft, ChevronRight, Maximize2, X, ThumbsUp, BadgeCheck } from 'lucide-react';
import { Product, ProductVariant, Review, RatingSummary, api } from '../services/api';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (sku: string, quantity: number) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
  onAddToCart,
}) => {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [variantOptions, setVariantOptions] = useState<Record<string, string[]>>({});
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);

  // Reviews state — backed by real API
  const [ratingSummary, setRatingSummary] = useState<RatingSummary>({
    avg_rating: Number(product.avg_rating) || 0,
    review_count: product.review_count || 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    reviews: [],
  });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [myRating, setMyRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    setReviewsLoading(true);
    api.getProductReviews(product.id)
      .then(data => { setRatingSummary(data); setReviewsError(''); })
      .catch(() => setReviewsError('Không thể tải đánh giá.'))
      .finally(() => setReviewsLoading(false));

    if (api.getToken()) {
      api.getCurrentUser().then(u => {
        if (u && u.full_name) setAuthorName(u.full_name);
      }).catch(() => {});
    }
  }, [product.id]);

  const handleSubmitReview = async () => {
    if (!api.getToken()) {
      setReviewError('Vui lòng đăng nhập để viết đánh giá cho sản phẩm.');
      return;
    }
    if (!authorName.trim()) { setReviewError('Vui lòng nhập tên của bạn.'); return; }
    if (!reviewContent.trim() || reviewContent.trim().length < 10) {
      setReviewError('Nội dung đánh giá cần ít nhất 10 ký tự.');
      return;
    }
    setReviewError('');
    setReviewSubmitting(true);
    try {
      const saved = await api.submitReview(product.id, {
        author_name: authorName.trim(),
        rating: myRating,
        title: reviewTitle.trim() || undefined,
        content: reviewContent.trim(),
      });
      setRatingSummary(prev => ({
        ...prev,
        review_count: prev.review_count + 1,
        avg_rating: parseFloat(((prev.avg_rating * prev.review_count + myRating) / (prev.review_count + 1)).toFixed(2)),
        reviews: [saved, ...prev.reviews],
      }));
      setReviewTitle('');
      setReviewContent('');
      setMyRating(5);
      setReviewSubmitted(true);
      setTimeout(() => setReviewSubmitted(false), 4000);
    } catch (e: any) {
      setReviewError(e.message || 'Gửi đánh giá thất bại. Vui lòng thử lại.');
    } finally {
      setReviewSubmitting(false);
    }
  };


  const { avg_rating: avgRating, review_count: totalReviews, distribution, reviews } = ratingSummary;
  const starCounts = [5, 4, 3, 2, 1].map(s => ({ star: s, count: distribution[s] || 0 }));

  // Supplementary Nike-style multi-angle photography views based on footwear / apparel
  const getMultiAngleFallbackPhotos = (prodId: number, baseImgUrl: string): string[] => {
    // Curated high-res multi-angle Unsplash sneaker/fashion shots for comprehensive 360-like viewing
    const footwearAngles = [
      baseImgUrl,
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1000&auto=format&fit=crop&q=80', // Side angle
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=1000&auto=format&fit=crop&q=80', // Top down view
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=1000&auto=format&fit=crop&q=80', // Sole & heel detail
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1000&auto=format&fit=crop&q=80', // On-foot lifestyle
    ];
    
    // Cycle deterministically per product ID
    return footwearAngles;
  };

  useEffect(() => {
    // 1. Build list of all available images directly from PostgreSQL database records
    const imageList: string[] = [];
    
    // Add images from catalog.product_images table
    if (product.images && product.images.length > 0) {
      product.images.forEach((img) => {
        if (img.image_url && !imageList.includes(img.image_url)) {
          imageList.push(img.image_url);
        }
      });
    }

    // Add variant images from catalog.product_variants table
    if (product.variants) {
      product.variants.forEach((v) => {
        if (v.image_url && !imageList.includes(v.image_url)) {
          imageList.push(v.image_url);
        }
      });
    }

    // Fallback main image if list is empty
    const primaryImg = product.images?.find((img) => img.is_primary)?.image_url 
      || imageList[0] 
      || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&auto=format&fit=crop&q=80';

    if (!imageList.includes(primaryImg)) {
      imageList.unshift(primaryImg);
    }

    setGalleryImages(imageList);
    setSelectedImage(primaryImg);

    // Initial variant selection
    if (product.variants && product.variants.length > 0) {
      const firstVar = product.variants[0];
      setSelectedVariant(firstVar);
      if (firstVar.attributes) {
        const normalizedAttrs: Record<string, string> = {};
        Object.entries(firstVar.attributes).forEach(([k, v]) => {
          const strVal = String(v);
          const firstItem = strVal.split(/[,;/]+/)[0]?.trim() || strVal;
          normalizedAttrs[k.toLowerCase()] = firstItem;
        });
        setSelectedAttributes(normalizedAttrs);
      }
    }

    // Fetch dynamic variant options mapping
    api.getProductVariantOptions(product.id).then((options) => {
      const normalizedOpts: Record<string, string[]> = {};
      Object.entries(options).forEach(([k, v]) => {
        const splitSet = new Set<string>();
        (v || []).forEach((item) => {
          const parts = String(item).split(/[,;/]+/).map((s) => s.trim()).filter(Boolean);
          parts.forEach((p) => splitSet.add(p));
        });
        normalizedOpts[k.toLowerCase()] = Array.from(splitSet);
      });
      setVariantOptions(normalizedOpts);
    }).catch(console.error);
  }, [product]);

  // Handle image switching next/prev
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = galleryImages.indexOf(selectedImage);
    const newIndex = currentIndex <= 0 ? galleryImages.length - 1 : currentIndex - 1;
    setSelectedImage(galleryImages[newIndex]);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = galleryImages.indexOf(selectedImage);
    const newIndex = currentIndex >= galleryImages.length - 1 ? 0 : currentIndex + 1;
    setSelectedImage(galleryImages[newIndex]);
  };

  // When user selects attribute choices, match variant SKU
  const handleSelectAttribute = (key: string, value: string) => {
    const updated = { ...selectedAttributes, [key.toLowerCase()]: value };
    setSelectedAttributes(updated);

    if (product.variants && product.variants.length > 0) {
      if (product.variants.length === 1) {
        setSelectedVariant(product.variants[0]);
        if (product.variants[0].image_url) setSelectedImage(product.variants[0].image_url);
        return;
      }

      const matched = product.variants.find((v) => {
        if (!v.attributes) return false;
        const vAttrsNormalized: Record<string, string> = {};
        Object.entries(v.attributes).forEach(([vk, vv]) => {
          vAttrsNormalized[vk.toLowerCase()] = String(vv).toLowerCase();
        });
        return Object.entries(updated).every(([k, val]) => {
          const expectedVal = val.toLowerCase();
          const actualVal = vAttrsNormalized[k];
          return !actualVal || actualVal === expectedVal || actualVal.includes(expectedVal) || expectedVal.includes(actualVal);
        });
      });

      const finalVariant = matched || product.variants[0];
      setSelectedVariant(finalVariant);
      if (finalVariant?.image_url) setSelectedImage(finalVariant.image_url);
    }
  };

  const handleAddToCartSubmit = () => {
    const targetVariant = selectedVariant || product.variants?.[0];
    const skuToUse = targetVariant?.sku || (product.slug ? product.slug.toUpperCase() : `PROD-${product.id}`);
    onAddToCart(skuToUse, quantity);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 3000);
  };

  const currentPrice = selectedVariant ? selectedVariant.price : product.base_price;
  const formattedPrice = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(currentPrice);

  const activeImageIndex = galleryImages.indexOf(selectedImage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-[#707072] hover:text-[#111111] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại cửa hàng
      </button>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-white p-6 sm:p-10 rounded-3xl border border-[#e5e5e5]">
        
        {/* Media Gallery (Nike-Style: Left Vertical Thumbnails + Main View) (7 cols) */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
          
          {/* Thumbnails Sidebar Column (Vertical on desktop) */}
          <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto sm:max-h-[520px] shrink-0 no-scrollbar">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                onMouseEnter={() => setSelectedImage(img)}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#f5f5f5] shrink-0 border-2 cursor-pointer transition-all ${
                  selectedImage === img
                    ? 'border-[#111111] shadow-md scale-95 opacity-100'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {img.endsWith('.mp4') || img.endsWith('.webm') ? (
                  <div className="w-full h-full flex items-center justify-center bg-black/80 text-white">
                    <Play className="w-5 h-5 fill-white" />
                  </div>
                ) : (
                  <img src={img} alt={`Góc nhìn ${idx + 1}`} className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>

          {/* Main Large Viewer Display with Arrow Controls & Zoom */}
          <div className="flex-1 aspect-4/3 sm:aspect-square bg-[#f5f5f5] rounded-2xl overflow-hidden relative border border-[#e5e5e5] group">
            {selectedImage.endsWith('.mp4') || selectedImage.endsWith('.webm') ? (
              <video
                src={selectedImage}
                controls
                autoPlay
                loop
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={selectedImage}
                alt={product.name}
                onClick={() => setZoomModalOpen(true)}
                className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 hover:scale-105"
              />
            )}

            {/* Navigation Overlay Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#111111] shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-[#e5e5e5]"
                  aria-label="Hình trước"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#111111] shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-[#e5e5e5]"
                  aria-label="Hình kế tiếp"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Image counter badge & Zoom trigger */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                {activeImageIndex + 1} / {galleryImages.length} Góc Ảnh
              </span>
              <button
                onClick={() => setZoomModalOpen(true)}
                className="w-8 h-8 rounded-full bg-white/90 text-[#111111] flex items-center justify-center shadow-md hover:bg-white transition-colors cursor-pointer"
                title="Phóng to ảnh"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Product Details & Variant Attribute Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            {product.category && (
              <span className="text-xs font-bold bg-[#111111] text-white px-3 py-1 rounded-full uppercase tracking-wider">
                {product.category.name}
              </span>
            )}
            <h1 className="text-3xl font-black text-[#111111] tracking-tight mt-3">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="text-sm font-bold text-[#111111] ml-1">{product.avg_rating || 5.0}</span>
              </div>
              <span className="text-xs text-[#707072]">({product.review_count || 12} đánh giá từ khách hàng)</span>
            </div>
          </div>

          {/* Price */}
          <div className="border-y border-[#e5e5e5] py-4">
            <span className="text-xs text-[#707072] font-semibold block">Giá niêm yết</span>
            <span className="text-3xl font-black text-[#111111] tracking-tight">
              {formattedPrice}
            </span>
          </div>

          <p className="text-xs text-[#707072] leading-relaxed">
            {product.description || 'Sản phẩm cao cấp được thiết kế tinh tế với chất liệu chuẩn Nike, đem lại độ bền vượt trội và phong cách thời trang năng động.'}
          </p>

          {/* Dynamic Variant Attributes Selector (Color, Size, Custom Keys) */}
          <div className="space-y-4">
            {Object.entries(variantOptions).map(([key, options]) => (
              <div key={key} className="space-y-2">
                <label className="text-xs font-black text-[#111111] uppercase tracking-wider flex justify-between">
                  <span>{key.toLowerCase() === 'color' ? 'Màu sắc' : key.toLowerCase() === 'size' ? 'Kích cỡ (Size)' : key}</span>
                  <span className="text-[#707072] normal-case font-semibold">{selectedAttributes[key] || ''}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSelectAttribute(key, opt)}
                      className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedAttributes[key] === opt
                          ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                          : 'bg-[#f5f5f5] text-[#111111] border-transparent hover:border-[#111111]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* SKU Badge */}
            {selectedVariant && (
              <div className="text-xs text-[#707072] font-medium bg-[#f5f5f5] p-3 rounded-xl flex items-center justify-between">
                <span>Mã SKU đang chọn: <strong className="text-[#111111]">{selectedVariant.sku}</strong></span>
                <span className="text-emerald-600 font-bold">✓ Còn hàng</span>
              </div>
            )}

            {/* Quantity Selector & Add to Cart Button */}
            <div className="flex items-center gap-3 pt-3">
              <div className="flex items-center border border-[#e5e5e5] rounded-full bg-[#f5f5f5] px-3 py-1.5 shrink-0">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 font-bold text-sm text-[#111111] hover:bg-white rounded-full flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="w-8 text-center font-extrabold text-xs text-[#111111]">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-7 h-7 font-bold text-sm text-[#111111] hover:bg-white rounded-full flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCartSubmit}
                className="flex-1 btn-primary py-3.5 text-sm font-black shadow-lg cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                Thêm Vào Giỏ Hàng
              </button>
            </div>

            {addedSuccess && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200 animate-fade-in">
                <Check className="w-4 h-4" />
                Đã thêm sản phẩm vào giỏ hàng thành công!
              </div>
            )}
          </div>

          {/* Guarantee Badges */}
          <div className="grid grid-cols-3 gap-3 pt-5 border-t border-[#e5e5e5] text-center text-[10px] text-[#707072] font-bold">
            <div className="space-y-1">
              <Truck className="w-4 h-4 mx-auto text-[#111111]" />
              <span>Giao hàng toàn quốc</span>
            </div>
            <div className="space-y-1">
              <RotateCcw className="w-4 h-4 mx-auto text-[#111111]" />
              <span>Đổi trả 30 ngày</span>
            </div>
            <div className="space-y-1">
              <ShieldCheck className="w-4 h-4 mx-auto text-[#111111]" />
              <span>100% Chính hãng</span>
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* Reviews Section */}
      <section className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-10 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-[#111111]">Đánh giá từ khách hàng</h2>
          <span className="ml-auto text-xs text-[#707072] font-semibold">{totalReviews} đánh giá</span>
        </div>

        {/* Rating Summary */}
        <div className="flex gap-8 flex-wrap">
          {/* Big Score */}
          <div className="flex flex-col items-center justify-center bg-[#f5f5f5] rounded-2xl px-8 py-6 min-w-[120px]">
            <span className="text-5xl font-black text-[#111111]">{avgRating.toFixed(1)}</span>
            <div className="flex items-center gap-0.5 mt-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-[#e5e5e5]'}`} />
              ))}
            </div>
            <span className="text-[11px] text-[#707072] mt-1 font-semibold">trên 5.0 sao</span>
          </div>

          {/* Bars */}
          <div className="flex-1 min-w-[200px] space-y-2">
            {starCounts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#111111] w-4 text-right">{star}</span>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                <div className="flex-1 bg-[#f0f0f0] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-700"
                    style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-[11px] text-[#707072] font-semibold w-6">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Review List */}
        <div className="space-y-5">
          {reviewsLoading && <p className="text-sm text-[#aaa] text-center py-4">Đang tải đánh giá...</p>}
          {reviewsError && <p className="text-sm text-red-500 text-center py-4">{reviewsError}</p>}
          {!reviewsLoading && !reviewsError && reviews.length === 0 && (
            <p className="text-sm text-[#aaa] text-center py-6">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
          )}
          {reviews.slice(0, 6).map(review => (
            <div key={review.id} className="border border-[#f0f0f0] rounded-2xl p-5 space-y-3 hover:border-[#d0d0d0] transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                  {(review.author_name || 'A')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#111111]">{review.author_name}</span>
                    {review.is_verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <BadgeCheck className="w-3 h-3" /> Đã mua hàng
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-[#aaa]">
                      {new Date(review.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-[#e5e5e5]'}`} />
                    ))}
                  </div>
                </div>
              </div>
              {review.title && <p className="text-sm font-bold text-[#111111]">{review.title}</p>}
              <p className="text-xs text-[#555] leading-relaxed">{review.content}</p>
              <div className="flex items-center gap-1 text-[11px] text-[#aaa]">
                <ThumbsUp className="w-3 h-3" />
                <span>{review.helpful_count} người thấy hữu ích</span>
              </div>
            </div>
          ))}
        </div>

        {/* Write Review Form */}
        <div className="border-t border-[#f0f0f0] pt-8">
          <h3 className="text-base font-black text-[#111111] mb-4">Viết đánh giá của bạn</h3>
          {reviewSubmitted ? (
            <div className="bg-emerald-50 text-emerald-700 px-5 py-4 rounded-2xl text-sm font-bold flex items-center gap-2 border border-emerald-200">
              <Check className="w-4 h-4" />
              Cảm ơn bạn đã đánh giá! Đánh giá của bạn đã được lưu vào cơ sở dữ liệu.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Author Name */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#111111] uppercase tracking-wider">Tên của bạn *</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={e => { setAuthorName(e.target.value); setReviewError(''); }}
                  placeholder="Nhập tên hiển thị của bạn..."
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition"
                />
              </div>
              {/* Star Selector */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#111111] uppercase tracking-wider">Điểm đánh giá</label>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <button
                      key={s}
                      onClick={() => setMyRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          s <= (hoverRating || myRating) ? 'fill-amber-400 text-amber-400' : 'text-[#e5e5e5]'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-bold text-[#111111]">
                    {myRating === 5 ? 'Xuất sắc' : myRating === 4 ? 'Tốt' : myRating === 3 ? 'Bình thường' : myRating === 2 ? 'Không hài lòng' : 'Rất tệ'}
                  </span>
                </div>
              </div>
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#111111] uppercase tracking-wider">Tiêu đề (tùy chọn)</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={e => setReviewTitle(e.target.value)}
                  placeholder="Tóm tắt nhận xét của bạn..."
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition"
                />
              </div>
              {/* Content */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#111111] uppercase tracking-wider">Nội dung đánh giá *</label>
                <textarea
                  value={reviewContent}
                  onChange={e => { setReviewContent(e.target.value); setReviewError(''); }}
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                  rows={4}
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition"
                />
                {reviewError && <p className="text-xs text-red-500 font-semibold">{reviewError}</p>}
              </div>
              <button
                onClick={handleSubmitReview}
                disabled={reviewSubmitting}
                className="btn-primary py-3 text-sm font-black px-8 cursor-pointer disabled:opacity-60"
              >
                {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Fullscreen Zoom Modal */}
      {zoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setZoomModalOpen(false)}
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          
          <img
            src={selectedImage}
            alt={product.name}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
