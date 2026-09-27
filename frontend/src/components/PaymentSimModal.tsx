import React, { useState } from 'react';
import { X, CheckCircle, XCircle, QrCode, Copy, ExternalLink, RefreshCw, ShieldCheck, Banknote } from 'lucide-react';
import { Order, Payment, api } from '../services/api';

interface PaymentSimModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  payment: Payment;
  onPaymentComplete: () => void;
}

export const PaymentSimModal: React.FC<PaymentSimModalProps> = ({
  isOpen,
  onClose,
  order,
  payment,
  onPaymentComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentStatusResult, setPaymentStatusResult] = useState<'success' | 'failed' | null>(null);

  React.useEffect(() => {
    if (!isOpen || payment.provider === 'cod' || paymentStatusResult) return;

    // Real Polling (2 giây/lần) liên tục lắng nghe Webhook từ Ngân Hàng / SePay / MoMo
    const pollInterval = setInterval(async () => {
      try {
        const currentPay = await api.getPaymentStatus(payment.id);
        if (currentPay.status === 'success' || currentPay.status === 'paid') {
          setPaymentStatusResult('success');
          setTimeout(() => onPaymentComplete(), 2000);
        }
      } catch (err) {
        console.error('Lỗi auto-polling payment:', err);
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [isOpen, payment.id, payment.provider, paymentStatusResult]);

  if (!isOpen) return null;

  const formattedAmount = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(payment.amount);

  const providerName = 
    payment.provider === 'vietqr' ? 'Chuyển Khoản VietQR (MB Bank)' :
    payment.provider === 'momo' ? 'Ví Điện Tử MoMo' :
    payment.provider === 'vnpay' ? 'Cổng Thanh Toán VNPay' :
    'Thanh Toán Khi Nhận Hàng (COD)';

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSimulateIPN = async (status: 'success' | 'failed') => {
    setLoading(true);
    try {
      const txnId = payment.transaction_id || `TXN_${payment.provider.toUpperCase()}_${Date.now().toString().slice(-6)}`;
      await api.sendPaymentIPN(payment.id, order.id, status, txnId);
      setPaymentStatusResult(status);
      setTimeout(() => {
        onPaymentComplete();
      }, 2000);
    } catch (err) {
      console.error('Lỗi xác nhận IPN callback:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#e5e5e5] animate-scale-up">
        {/* Header */}
        <div className="p-5 bg-[#111111] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {payment.provider === 'cod' ? (
              <Banknote className="w-5 h-5 text-emerald-400" />
            ) : (
              <QrCode className="w-5 h-5 text-[#e52e2e]" />
            )}
            <h3 className="font-black text-base tracking-tight">
              {providerName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          {paymentStatusResult === 'success' ? (
            <div className="py-6 space-y-3 animate-fade-in">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
              <h2 className="text-2xl font-black text-[#111111]">Thanh Toán Thành Công!</h2>
              <p className="text-xs text-[#707072] font-medium">
                Giao dịch của bạn đã được hệ thống xác nhận. Đơn hàng #{order.id} chuyển sang trạng thái <strong className="text-emerald-600">PAID</strong>.
              </p>
            </div>
          ) : paymentStatusResult === 'failed' ? (
            <div className="py-6 space-y-3 animate-fade-in">
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h2 className="text-2xl font-black text-[#111111]">Thanh Toán Thất Bại!</h2>
              <p className="text-xs text-[#707072] font-medium">
                Giao dịch hủy hoặc gặp sự cố. Đơn hàng #{order.id} chuyển sang <strong className="text-red-600">PAYMENT_FAILED</strong>.
              </p>
            </div>
          ) : (
            <>
              {/* Total Amount Header */}
              <div className="bg-[#f5f5f5] p-3.5 rounded-2xl border border-[#e5e5e5]">
                <span className="text-[11px] text-[#707072] font-bold block uppercase tracking-wider">Tổng Số Tiền Cần Thanh Toán</span>
                <span className="text-2xl font-black text-[#e52e2e] tracking-tight">{formattedAmount}</span>
                <span className="text-[11px] text-[#707072] block mt-0.5 font-medium">Mã đơn hàng: #{order.id}</span>
              </div>

              {/* VietQR / MoMo / VNPay QR Code Display */}
              {payment.provider !== 'cod' ? (
                <div className="space-y-4">
                  {/* QR Image */}
                  <div className="p-3 bg-white border border-[#e5e5e5] rounded-2xl shadow-sm inline-block relative">
                    <img
                      src={payment.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=DH${order.id}`}
                      alt="VietQR Payment Code"
                      className="w-48 h-48 mx-auto rounded-xl object-contain"
                    />
                    <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      ⚡ Tự động kiểm tra giao dịch real-time từ ngân hàng...
                    </span>
                  </div>

                  {/* VietQR Details table with copy buttons */}
                  {payment.provider === 'vietqr' && (
                    <div className="bg-[#f8f9fa] p-3 rounded-xl border border-[#e5e5e5] space-y-2 text-left text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#707072] font-medium">Ngân hàng:</span>
                        <span className="font-extrabold text-[#111111]">Vietcombank (VCB)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#707072] font-medium">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[#111111]">1045947985</span>
                          <button
                            type="button"
                            onClick={() => handleCopy('1045947985', 'stk')}
                            className="p-1 text-[#707072] hover:text-[#111111] bg-white rounded border border-[#e5e5e5] cursor-pointer"
                          >
                            {copiedField === 'stk' ? '✓' : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#707072] font-medium">Chủ tài khoản:</span>
                        <span className="font-bold text-[#111111]">KIEN VAN TRUC</span>
                      </div>
                      <div className="flex items-center justify-between bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <span className="text-amber-800 font-bold">Nội dung CK:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-amber-900">DH{order.id}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(`DH${order.id}`, 'memo')}
                            className="p-1 text-amber-800 hover:text-amber-950 bg-white rounded border border-amber-300 cursor-pointer"
                          >
                            {copiedField === 'memo' ? '✓' : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* External Redirect Link if VNPay/MoMo payment_url exists */}
                  {payment.payment_url && (
                    <a
                      href={payment.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full btn-secondary py-2.5 px-4 text-xs flex items-center justify-center gap-2 border border-[#111111] hover:bg-[#111111] hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Mở Trang Thanh Toán {payment.provider.toUpperCase()}
                    </a>
                  )}
                </div>
              ) : (
                /* COD Display Instructions */
                <div className="py-6 space-y-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 text-center">
                  <Banknote className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="font-black text-sm text-[#111111]">Thanh Toán Khi Nhận Hàng (COD)</h4>
                  <p className="text-xs text-[#707072] leading-relaxed">
                    Đơn hàng của bạn đã được ghi nhận ở trạng thái <strong>Chờ Xác Nhận</strong>. Bạn sẽ thanh toán số tiền <strong className="text-emerald-700">{formattedAmount}</strong> cho nhân viên giao hàng khi nhận sản phẩm.
                  </p>
                </div>
              )}

              {/* Confirm / IPN Callback buttons */}
              <div className="space-y-2 pt-1 border-t border-[#e5e5e5]">
                <button
                  onClick={() => handleSimulateIPN('success')}
                  disabled={loading}
                  className="w-full p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {payment.provider === 'cod' ? 'Xác Nhận Đặt Đơn COD' : 'Đã Chuyển Khoản / Xác Nhận Thanh Toán'}
                </button>

                {payment.provider !== 'cod' && (
                  <button
                    onClick={() => handleSimulateIPN('failed')}
                    disabled={loading}
                    className="w-full p-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Báo lỗi / Hủy Giao Dịch
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
