import React, { useState, useEffect } from 'react';
import { X, Package, Clock, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Order, api } from '../services/api';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrderForPayment?: (order: Order) => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({
  isOpen,
  onClose,
  onSelectOrderForPayment,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-black border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã Thanh Toán (PAID)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[11px] font-black border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Chờ Thanh Toán
          </span>
        );
      case 'payment_failed':
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[11px] font-black border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Thanh Toán Thất Bại
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full text-[11px] font-black border border-gray-200">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-[#e5e5e5] animate-scale-up flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 bg-[#111111] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-[#e52e2e]" />
            <h3 className="font-black text-lg uppercase tracking-tight">Đơn Hàng Của Tôi</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="space-y-3 py-8">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-[#f5f5f5] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Package className="w-12 h-12 text-[#707072] mx-auto" />
              <h4 className="font-black text-base text-[#111111]">Chưa có đơn hàng nào</h4>
              <p className="text-xs text-[#707072]">
                Bạn chưa đặt mua đơn hàng nào. Hãy chọn sản phẩm và tiến hành thanh toán nhé!
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="bg-[#f9f9f9] rounded-2xl p-5 border border-[#e5e5e5] hover:border-[#111111] transition-all space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                  <div>
                    <span className="text-xs font-black text-[#111111]">Đơn Hàng #{order.id}</span>
                    <span className="text-[11px] text-[#707072] block">
                      Ngày đặt: {new Date(order.created_at || Date.now()).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Items preview */}
                <div className="space-y-1 text-xs text-[#111111]">
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#707072]">SKU: {item.sku} (x{item.quantity})</span>
                      <span className="font-bold">{((item.price_at_order || item.price || 0) * item.quantity).toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#e5e5e5] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#707072] block">TỔNG TIỀN</span>
                    <span className="text-base font-black text-[#111111]">
                      {order.total_amount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  {order.status === 'pending' && onSelectOrderForPayment && (
                    <button
                      onClick={() => {
                        onClose();
                        onSelectOrderForPayment(order);
                      }}
                      className="px-4 py-2 bg-[#0072bc] text-white rounded-xl text-xs font-bold hover:bg-[#005c99] transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      Thanh Toán Ngay
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
