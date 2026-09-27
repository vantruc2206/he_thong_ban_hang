import { useState, useEffect } from "react";
import { X, Search, Package, MapPin, Truck, CheckCircle } from "lucide-react";
import { createOrder } from "../../../lib/services/orderService";
import { getInventory, InventoryItem } from "../../../lib/services/inventoryService";

interface CreateOrderModalProps {
  onClose: () => void;
  initialCustomer?: {
    name: string;
    phone?: string;
    address?: string;
    channel?: string;
  };
}

export function CreateOrderModal({ onClose, initialCustomer }: CreateOrderModalProps) {
  const [customerInfo, setCustomerInfo] = useState({
    name: initialCustomer?.name || "",
    phone: initialCustomer?.phone || "",
    address: initialCustomer?.address || "",
  });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getInventory().then(setInventory);
  }, []);

  const total = selectedProduct ? (selectedProduct.value || 250000) * quantity : 0;

  async function handleCreateOrder() {
    if (!customerInfo.name || !selectedProduct) return alert("Vui lòng nhập tên KH và chọn sản phẩm!");
    setIsSubmitting(true);
    
    // Simulate mapping channel name to an ID for the backend
    const channelMap: Record<string, number> = {
      website: 1, shopee: 3, tiktok: 4, lazada: 5
    };
    const cId = channelMap[initialCustomer?.channel || "website"] || 1;

    const res = await createOrder({
      order_code: "ORD-" + Math.floor(100000 + Math.random() * 900000),
      channel_id: cId,
      customer_name: customerInfo.name,
      customer_phone: customerInfo.phone,
      shipping_addr: customerInfo.address,
      product_summary: `${quantity}x ${selectedProduct.name} (PID:${selectedProduct.product_id || selectedProduct.sku})`,
      total: total + 30000, // 30k shipping
      is_priority: false,
    });

    setIsSubmitting(false);
    if (res) {
      setSuccess(true);
      setTimeout(onClose, 1500);
    } else {
      alert("Có lỗi xảy ra khi tạo đơn hàng.");
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center shadow-2xl">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tạo đơn thành công!</h2>
          <p className="text-sm text-gray-500">Đơn hàng đã được lưu vào hệ thống.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" /> Tạo đơn hàng mới
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Nguồn khách hàng auto-fill */}
          {initialCustomer && (
            <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2 border border-blue-100">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold block mb-0.5">Auto-fill từ Hội thoại</span>
                Dữ liệu tạo đơn được trích xuất tự động từ khách hàng <b>{initialCustomer.name}</b>.
              </div>
            </div>
          )}

          {/* Thông tin khách hàng */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" /> Thông tin giao hàng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tên khách hàng *</label>
                <input 
                  type="text" 
                  value={customerInfo.name}
                  onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Số điện thoại</label>
                <input 
                  type="text" 
                  value={customerInfo.phone}
                  onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                  placeholder="VD: 0901234567"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Địa chỉ chi tiết</label>
                <input 
                  type="text" 
                  value={customerInfo.address}
                  onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                  placeholder="Số nhà, Đường, Quận/Huyện, Tỉnh/TP"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Chọn sản phẩm */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" /> Sản phẩm mua
            </h3>
            
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select 
                  className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none bg-white"
                  onChange={e => {
                    const prod = inventory.find(i => i.sku === e.target.value);
                    setSelectedProduct(prod || null);
                  }}
                  value={selectedProduct?.sku || ""}
                >
                  <option value="" disabled>Tìm / Chọn sản phẩm từ kho...</option>
                  {inventory.map(item => (
                    <option key={item.sku} value={item.sku}>
                      {item.sku} - {item.name} (Tồn: {item.available})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <input 
                  type="number" 
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-center" 
                />
              </div>
            </div>

            {selectedProduct && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-gray-900">{selectedProduct.name}</div>
                  <div className="text-xs text-gray-500">SKU: {selectedProduct.sku}</div>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {((selectedProduct.value || 250000) * quantity).toLocaleString()} đ
                </div>
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Tổng kết */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tạm tính ({quantity} sản phẩm)</span>
              <span>{total.toLocaleString()} đ</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Phí giao hàng</span>
              <span>30,000 đ</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Khách phải trả</span>
              <span className="text-blue-600">{(total + 30000).toLocaleString()} đ</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">
            Hủy
          </button>
          <button 
            onClick={handleCreateOrder}
            disabled={isSubmitting || !selectedProduct}
            className="px-6 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            {isSubmitting ? "Đang xử lý..." : "Tạo đơn hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}
