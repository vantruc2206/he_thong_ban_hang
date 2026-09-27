import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, MapPin, Tag, Truck, Check, ChevronDown, ChevronUp, Lock, ArrowRight } from 'lucide-react';
import { CartItem, Order, Payment, api } from '../services/api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderCreated: (order: Order, payment: Payment) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderCreated,
}) => {
  // Step Accordion state: 1 = Delivery Address & Contact, 2 = Payment Method
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express' | 'pickup'>('standard');

  // Payment method
  const [provider, setProvider] = useState<'vietqr' | 'momo' | 'vnpay' | 'cod'>('vietqr');
  
  // Voucher
  const [voucherCode, setVoucherCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherOpen, setVoucherOpen] = useState(false);

  // UI state
  const [itemsOpen, setItemsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const rawSubtotal = items.reduce((sum, item) => {
    const price = item.price ?? item.variant?.price ?? item.product?.base_price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const finalTotal = Math.max(0, rawSubtotal - discountAmount);

  const handleApplyVoucher = () => {
    if (voucherCode.toUpperCase() === 'NIKE100') {
      setDiscountAmount(100000);
      setErrorMessage('');
    } else if (voucherCode.toUpperCase() === 'VIP20') {
      setDiscountAmount(rawSubtotal * 0.2);
      setErrorMessage('');
    } else {
      setErrorMessage('Mã Voucher không hợp lệ (Gợi ý: NIKE100 hoặc VIP20)');
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      if (!fullName.trim() || !phone.trim() || !address.trim()) {
        setErrorMessage('Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng.');
        return;
      }
      setErrorMessage('');
      setCurrentStep(2);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const fullDeliveryInfo = `[${fullName} - ${phone} - ${email}] ${address}, ${city}. Ghi chú: ${deliveryNote || 'Không'}`;
      const orderItems = items.map((i) => ({ sku: i.sku, quantity: i.quantity }));
      
      // 1. Create Order
      const order = await api.createOrder(orderItems, fullDeliveryInfo);

      // 2. Initialize Payment
      const payment = await api.createPayment(order.id, provider, finalTotal);

      onOrderCreated(order, payment);
    } catch (err: any) {
      console.error('Lỗi khởi tạo đơn hàng:', err);
      setErrorMessage(err.message || 'Không thể khởi tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up border border-[#e5e5e5] max-h-[88vh] flex flex-col">
        
        {/* Header - Nike Style Top Bar */}
        <div className="px-5 py-3 bg-[#111111] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#e52e2e] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              NIKE CHECKOUT
            </span>
            <h2 className="text-base font-black tracking-tight">Thanh Toán Đơn Hàng</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Content - 2 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1 divide-y lg:divide-y-0 lg:divide-x divide-[#e5e5e5]">
          
          {/* Left Column: Multi-Step Form Flow (7 Cols) */}
          <form onSubmit={handleCheckoutSubmit} className="lg:col-span-7 p-4 sm:p-5 space-y-4">
            
            {/* STEP 1: Delivery Address & Contact Details */}
            <div className={`border rounded-xl transition-all ${currentStep === 1 ? 'border-[#111111] shadow-xs' : 'border-[#e5e5e5] bg-[#fdfdfd]'}`}>
              <div 
                onClick={() => setCurrentStep(1)}
                className="p-3 flex items-center justify-between cursor-pointer border-b border-[#f0f0f0]"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                    currentStep === 1 ? 'bg-[#111111] text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#111111]">Tùy Chọn Giao Hàng & Địa Chỉ</h3>
                    {currentStep > 1 && fullName && (
                      <p className="text-xs text-[#707072] mt-0.5 truncate max-w-xs">{fullName} • {phone} • {address}</p>
                    )}
                  </div>
                </div>
                {currentStep > 1 && (
                  <button type="button" className="text-xs font-bold text-[#0072bc] hover:underline cursor-pointer">
                    Chỉnh sửa
                  </button>
                )}
              </div>

              {currentStep === 1 && (
                <div className="p-4 space-y-4">
                  {/* Delivery Option Toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'standard', name: 'Giao hàng tận nơi', desc: 'Miễn phí vận chuyển (2-3 ngày)', icon: Truck },
                      { id: 'express', name: 'Giao hàng hỏa tốc', desc: 'Nhận trong 2 giờ (+30k)', icon: Truck },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setDeliveryMethod(opt.id as any)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            deliveryMethod === opt.id
                              ? 'border-[#111111] bg-gray-50/80 font-bold'
                              : 'border-[#e5e5e5] hover:border-[#111111]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-[#111111]" />
                            <span className="text-xs font-extrabold text-[#111111]">{opt.name}</span>
                          </div>
                          <span className="text-[11px] text-[#707072] block mt-1">{opt.desc}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Input Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wider block mb-1">
                        Họ và Tên *
                      </label>
                      <input
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#f5f5f5] text-xs text-[#111111] px-3 py-2.5 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wider block mb-1">
                        Số Điện Thoại *
                      </label>
                      <input
                        type="tel"
                        placeholder="0901234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-[#f5f5f5] text-xs text-[#111111] px-3 py-2.5 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wider block mb-1">
                      Email (Nhận thông báo đơn hàng)
                    </label>
                    <input
                      type="email"
                      placeholder="customer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#f5f5f5] text-xs text-[#111111] px-3 py-2.5 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wider block mb-1">
                        Địa Chỉ Nhận Hàng *
                      </label>
                      <input
                        type="text"
                        placeholder="Số nhà, tên đường..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-[#f5f5f5] text-xs text-[#111111] px-3 py-2.5 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wider block mb-1">
                        Tỉnh / Thành Phố
                      </label>
                      <input
                        type="text"
                        placeholder="TP. Hồ Chí Minh"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-[#f5f5f5] text-xs text-[#111111] px-3 py-2.5 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wider block mb-1">
                      Ghi Chú Giao Hàng
                    </label>
                    <input
                      type="text"
                      placeholder="Giao giờ hành chính, gọi trước khi giao..."
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      className="w-full bg-[#f5f5f5] text-xs text-[#111111] px-3 py-2.5 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!fullName.trim() || !phone.trim() || !address.trim()) {
                        setErrorMessage('Vui lòng điền Họ tên, Số điện thoại và Địa chỉ nhận hàng.');
                        return;
                      }
                      setErrorMessage('');
                      setCurrentStep(2);
                    }}
                    className="w-full bg-[#111111] hover:bg-[#333] text-white font-black text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    Tiếp Tục Đến Thanh Toán
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* STEP 2: Payment Method */}
            <div className={`border rounded-2xl transition-all ${currentStep === 2 ? 'border-[#111111] shadow-xs' : 'border-[#e5e5e5] bg-[#fdfdfd]'}`}>
              <div 
                onClick={() => setCurrentStep(2)}
                className="p-4 flex items-center justify-between cursor-pointer border-b border-[#f0f0f0]"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                    currentStep === 2 ? 'bg-[#111111] text-white' : 'bg-gray-200 text-[#707072]'
                  }`}>
                    2
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#111111]">Phương Thức Thanh Toán</h3>
                    {currentStep === 2 && (
                      <p className="text-xs text-[#707072] mt-0.5">Chọn kênh thanh toán bảo mật tức thì</p>
                    )}
                  </div>
                </div>
              </div>

              {currentStep === 2 && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'vietqr', name: 'VietQR (MB Bank)', desc: 'Tự động mở App Ngân Hàng', tag: 'KHUYÊN DÙNG', color: 'border-blue-600 bg-blue-50/40' },
                      { id: 'momo', name: 'Ví Điện Tử MoMo', desc: 'Quét mã QR MoMo cực nhanh', tag: 'POPULAR', color: 'border-pink-500 bg-pink-50/40' },
                      { id: 'vnpay', name: 'VNPay QR', desc: 'Hỗ trợ 40+ Ngân Hàng Việt Nam', tag: '', color: 'border-emerald-500 bg-emerald-50/40' },
                      { id: 'cod', name: 'Thanh Toán COD', desc: 'Thanh toán tiền mặt khi nhận hàng', tag: '', color: 'border-gray-600 bg-gray-50/40' },
                    ].map((gate) => (
                      <div
                        key={gate.id}
                        onClick={() => setProvider(gate.id as any)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                          provider === gate.id
                            ? `${gate.color} font-black`
                            : 'border-[#e5e5e5] bg-white hover:border-[#111111]'
                        }`}
                      >
                        {gate.tag && (
                          <span className="absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#111111] text-white">
                            {gate.tag}
                          </span>
                        )}
                        <span className="text-xs font-extrabold text-[#111111] block">{gate.name}</span>
                        <span className="text-[11px] text-[#707072] font-normal block mt-1">{gate.desc}</span>
                      </div>
                    ))}
                  </div>

                  {errorMessage && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-200">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#111111] hover:bg-[#333] text-white text-sm font-black py-4 rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    {loading ? 'Đang tạo đơn hàng...' : `Đặt Hàng & Thanh Toán Qua ${provider.toUpperCase()}`}
                  </button>
                </div>
              )}
            </div>

            {/* Security Guarantee Badges */}
            <div className="pt-2 flex items-center justify-around border-t border-[#e5e5e5] text-[#707072] text-[11px] font-medium">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Bảo mật SSL 256-bit</span>
              <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-blue-600" /> Giao hàng 2H</span>
              <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-purple-600" /> 100% Chính hãng</span>
            </div>
          </form>

          {/* Right Column: Order Summary Sidebar (5 Cols) */}
          <div className="lg:col-span-5 bg-[#fafafa] p-6 space-y-5">
            
            {/* Header: Item Preview Toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <h3 className="font-extrabold text-sm text-[#111111]">Tóm Tắt Đơn Hàng ({items.length})</h3>
              <button
                type="button"
                onClick={() => setItemsOpen(!itemsOpen)}
                className="text-xs font-bold text-[#707072] hover:text-[#111111] flex items-center gap-1 cursor-pointer"
              >
                {itemsOpen ? 'Ẩn chi tiết' : 'Hiện chi tiết'}
                {itemsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Items List */}
            {itemsOpen && (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                {items.map((item) => {
                  const price = item.price ?? item.variant?.price ?? item.product?.base_price ?? 0;
                  const imgUrl = item.variant?.image_url || item.product?.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
                  
                  return (
                    <div key={item.id} className="flex gap-3 bg-white p-2.5 rounded-xl border border-[#e5e5e5]">
                      <img
                        src={imgUrl}
                        alt={item.product?.name || item.sku}
                        className="w-14 h-14 object-cover rounded-lg shrink-0 bg-gray-100"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-extrabold text-[#111111] truncate">{item.product?.name || item.sku}</h4>
                          <span className="text-[10px] text-[#707072] font-semibold">SKU: {item.sku} • SL: {item.quantity}</span>
                        </div>
                        <span className="text-xs font-black text-[#111111]">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Promo Code Accordion */}
            <div className="border border-[#e5e5e5] rounded-xl bg-white p-3 space-y-2">
              <button
                type="button"
                onClick={() => setVoucherOpen(!voucherOpen)}
                className="w-full flex items-center justify-between text-xs font-extrabold text-[#111111] cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-red-500" />
                  Mã Khuyến Mãi / Voucher
                </span>
                {voucherOpen ? <ChevronUp className="w-3.5 h-3.5 text-[#707072]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#707072]" />}
              </button>

              {(voucherOpen || discountAmount > 0) && (
                <div className="pt-2 space-y-2 border-t border-[#f0f0f0]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Mã: NIKE100 / VIP20"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      className="flex-1 bg-[#f5f5f5] text-xs font-bold text-[#111111] px-3 py-2 rounded-lg border border-transparent focus:border-[#111111] focus:bg-white outline-none uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      className="bg-[#111111] hover:bg-[#333] text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-all"
                    >
                      Áp Dụng
                    </button>
                  </div>
                  {discountAmount > 0 && (
                    <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Đã áp dụng giảm {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountAmount)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 text-xs text-[#707072] font-medium pt-2 border-t border-[#e5e5e5]">
              <div className="flex justify-between">
                <span>Tạm tính hàng hoá:</span>
                <span className="font-bold text-[#111111]">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rawSubtotal)}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Giảm giá Voucher:</span>
                  <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Phí vận chuyển dự kiến:</span>
                <span className="font-bold text-emerald-600">Miễn Phí</span>
              </div>

              <div className="flex justify-between text-[#111111] font-black text-base pt-3 border-t border-[#e5e5e5]">
                <span>Tổng cộng:</span>
                <span className="text-[#e52e2e]">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalTotal)}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
