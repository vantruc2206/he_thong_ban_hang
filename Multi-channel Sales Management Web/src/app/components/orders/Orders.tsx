import { useState, useEffect } from "react";
import {
  ShoppingCart, Search, Filter, CheckCircle, Printer, Truck,
  RotateCcw, AlertTriangle, Package, Clock, XCircle, Eye,
  ChevronDown, Star, Camera, DollarSign, MapPin, Phone, FileText,
  TrendingUp, RefreshCw, Plus
} from "lucide-react";
import { formatVND } from "../../data/mockData";
import { useTheme } from "../Layout";
import { getOrders, updateOrderStatus } from "../../../lib/services/orderService";
import { CreateOrderModal } from "./CreateOrderModal";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  processing: { label: "Đã xác nhận", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Package },
  shipping: { label: "Đang giao hàng", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Truck },
  delivered: { label: "Hoàn tất", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  returned: { label: "Chuyển hoàn", color: "bg-orange-100 text-orange-700 border-orange-200", icon: RotateCcw },
  cancelled: { label: "Hủy", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const channelConfig: Record<string, { label: string; color: string; bg: string }> = {
  shopee: { label: "Shopee", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  tiktok: { label: "TikTok", color: "text-gray-800", bg: "bg-gray-100 border-gray-300" },
  lazada: { label: "Lazada", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  website: { label: "Website", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
};

const deliveryStatusConfig: Record<string, { label: string; color: string }> = {
  waiting_pickup: { label: "Chờ lấy hàng", color: "bg-yellow-50 text-yellow-800 border-yellow-200" },
  shipping: { label: "Đang giao hàng", color: "bg-blue-50 text-blue-700 border-blue-200" },
  delivered: { label: "Đã giao hàng", color: "bg-green-50 text-green-700 border-green-200" },
  no_contact: { label: "Không gặp khách", color: "bg-orange-50 text-orange-700 border-orange-200" },
  waiting_return: { label: "Chờ chuyển hoàn", color: "bg-purple-50 text-purple-700 border-purple-200" },
  returning: { label: "Chuyển hoàn", color: "bg-red-50 text-red-700 border-red-200" },
  cancelled_delivery: { label: "Hủy giao hàng", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Chờ xử lý", color: "bg-gray-100 text-gray-600 border-gray-200" },
  partial_payment: { label: "Thanh toán một phần", color: "bg-blue-50 text-blue-600 border-blue-100" },
  paid: { label: "Đã thanh toán", color: "bg-green-100 text-green-700 border-green-200" },
  partial_refund: { label: "Hoàn trả một phần", color: "bg-orange-50 text-orange-600 border-orange-200" },
  refunded: { label: "Đã hoàn trả", color: "bg-orange-100 text-orange-700 border-orange-200" },
  cancelled_payment: { label: "Đã hủy", color: "bg-red-50 text-red-600 border-red-200" },
};

const logisticsStats = [
  { carrier: "GHN", success: 96.2, total: 4820, onTime: 94.1, color: "bg-orange-500" },
  { carrier: "GHTK", success: 94.8, total: 3215, onTime: 91.3, color: "bg-green-500" },
  { carrier: "Viettel Post", success: 91.5, total: 1890, onTime: 87.6, color: "bg-red-500" },
];

// Remove type Order = typeof orders[0];

export function Orders() {
  const { dark } = useTheme();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "returns" | "logistics">("orders");
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    getOrders().then(data => {
      setOrdersData(data.map(o => ({
        id: o.id || o.order_code,
        customer: o.customer_name || "",
        phone: o.customer_phone || "",
        product: o.product_summary || "",
        note: o.note,
        total: o.total,
        channel: o.channel || "website",
        status: o.status,
        carrier: o.carrier || "—",
        trackingCode: o.tracking_code || "—",
        address: o.shipping_addr || "—",
        date: o.ordered_at || "",
        priority: o.is_priority,
        cod: o.cod_amount || 0,
        deliveryStatus: o.delivery_status || o.status,
        paymentStatus: o.payment_status || o.status
      })));
    });
  }, []);

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSec = dark ? "text-gray-400" : "text-gray-500";
  const cardBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const rowHover = dark ? "hover:bg-gray-800" : "hover:bg-gray-50";
  const inputBg = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const divider = dark ? "border-gray-800" : "border-gray-100";

  const filtered = ordersData.filter(o => {
    const matchSearch = !search || o.id.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchChannel = channelFilter === "all" || o.channel === channelFilter;
    return matchSearch && matchStatus && matchChannel;
  });

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const statusCounts = Object.keys(statusConfig).reduce((acc, s) => {
    acc[s] = ordersData.filter(o => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const returnOrders = ordersData.filter(o => o.status === "returned");

  async function handleBulkConfirm() {
    setUpdatingStatus(true);
    const pendingSelected = selected.filter(id => {
      const o = ordersData.find(o => o.id === id);
      return o && o.status === "pending";
    });
    for (const id of pendingSelected) {
      await updateOrderStatus(id, "processing");
    }
    setOrdersData(prev => prev.map(o =>
      pendingSelected.includes(o.id) ? { ...o, status: "processing" } : o
    ));
    setUpdatingStatus(false);
    setSelected([]);
  }

  async function handleBulkShip() {
    setUpdatingStatus(true);
    const valid = selected.filter(id => {
      const o = ordersData.find(o => o.id === id);
      return o && (o.status === "pending" || o.status === "processing");
    });
    for (const id of valid) {
      await updateOrderStatus(id, "shipping");
    }
    setOrdersData(prev => prev.map(o =>
      valid.includes(o.id) ? { ...o, status: "shipping" } : o
    ));
    setUpdatingStatus(false);
    setSelected([]);
  }

  function handleBulkPrint() {
    alert(`Đang xuất bảng in vận đơn cho ${selected.length} đơn hàng...`);
  }


  async function handleStatusChange(orderId: string, field: "status" | "deliveryStatus" | "paymentStatus", newValue: string) {
    setUpdatingStatus(true);
    // Note: updateOrderStatus currently only supports main status, but we optimisticly update local state
    if (field === "status") await updateOrderStatus(orderId, newValue);

    setOrdersData(prev => prev.map(o => o.id === orderId ? { ...o, [field]: newValue } : o));
    if (detailOrder?.id === orderId) setDetailOrder((prev: any) => prev ? { ...prev, [field]: newValue } : prev);
    setUpdatingStatus(false);
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`font-bold text-xl ${textPrimary}`}>Xử lý đơn hàng</h1>
          <p className={`text-sm ${textSec}`}>Quản lý tập trung từ tất cả kênh • 2.501 đơn hàng</p>
        </div>
        <div className="flex gap-2">
          <button className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-100"}`}>
            <span className="font-medium">Xuất dữ liệu</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={() => setShowOrderModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 shadow-sm transition-colors font-medium">
            <Plus className="w-4 h-4" />
            Tạo đơn
          </button>
        </div>
      </div>



      {/* Tabs */}
      {/* Filters & Tabs */}
      <div className={`flex gap-6 border-b outline-none select-none ${dark ? "border-gray-800" : "border-gray-200"}`}>
        {[
          { id: "all", label: "Tất cả" },
          { id: "website", label: "Website" },
          { id: "shopee", label: "Shopee" },
          { id: "lazada", label: "Lazada" },
          { id: "tiktok", label: "TikTok" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setChannelFilter(tab.id)}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 outline-none ${channelFilter === tab.id ? "border-blue-600 text-blue-600" : `border-transparent ${dark ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-900"}`}`}
          >
            {tab.label} {tab.id === "all" && <ChevronDown className="w-3 h-3 ml-1 opacity-50" />}
          </button>
        ))}
      </div>

      {activeTab === "orders" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border focus-within:ring-2 focus-within:ring-blue-500/20 transition-all ${inputBg}`}>
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm" className="flex-1 text-sm bg-transparent outline-none" />
            </div>
            ;
            <button className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
              Bộ lọc <Plus className="w-3 h-3 text-gray-400 border rounded-sm" />
            </button>
          </div>

          {/* Bulk actions */}
          {selected.length > 0 && (
            <div className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "bg-blue-950/30 border border-blue-800" : "bg-blue-50 border border-blue-200"}`}>
              <span className={`text-sm font-medium ${dark ? "text-blue-300" : "text-blue-700"}`}>Đã chọn {selected.length} đơn</span>
              <div className="flex gap-2 ml-auto flex-wrap">
                <button onClick={handleBulkConfirm} disabled={updatingStatus} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />Xác nhận hàng loạt
                </button>
                <button onClick={handleBulkPrint} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                  <Printer className="w-3 h-3" />In vận đơn
                </button>
                <button onClick={handleBulkShip} disabled={updatingStatus} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1">
                  <Truck className="w-3 h-3" />Giao shipper
                </button>
                <button onClick={() => setSelected([])} className="px-3 py-1.5 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600">Bỏ chọn</button>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${dark ? "border-gray-800 bg-gray-800/50" : "border-gray-100 bg-gray-50"}`}>
                    <th className="p-3 text-left">
                      <input type="checkbox" onChange={e => setSelected(e.target.checked ? ordersData.map(o => o.id) : [])} className="rounded" />
                    </th>
                    {["Mã đơn hàng", "Ngày tạo", "Kênh", "Khách hàng", "Trạng thái", "Thanh toán", "Giao hàng", "Tổng tiền"].map(h => (
                      <th key={h} className={`px-2 py-3 text-left text-xs font-semibold ${textSec} whitespace-nowrap align-middle`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => {
                    const s = statusConfig[order.status] || { label: order.status, color: "bg-gray-100 text-gray-600 border-gray-100", icon: Clock };
                    const ch = channelConfig[order.channel] || { label: order.channel, color: "text-gray-600", bg: "bg-gray-100 border-gray-100" };
                    return (
                      <tr key={order.id} className={`border-b last:border-0 ${dark ? "border-gray-800" : "border-gray-50"} ${rowHover} transition-colors group`}>
                        <td className="px-2 py-3 align-middle">
                          <input type="checkbox" checked={selected.includes(order.id)} onChange={() => toggleSelect(order.id)} className="rounded cursor-pointer" />
                        </td>
                        <td className="px-2 py-2.5 align-middle max-w-[100px]">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={`text-[11px] font-medium break-all ${dark ? "text-blue-400" : "text-blue-600"}`}>{order.id}</span>
                            {order.priority && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                            <FileText className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0" />
                          </div>
                        </td>
                        <td className="px-2 py-2.5 align-middle whitespace-nowrap">
                          <span className={`text-[11px] ${textSec}`}>
                            {order.date || (order.ordered_at ? new Date(order.ordered_at).toLocaleString("vi-VN", { dateStyle: 'short', timeStyle: 'short' }) : "Hôm nay")}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${ch?.bg || "bg-gray-100"} ${ch?.color || "text-gray-600"}`}>
                              {order.channel[0].toUpperCase()}
                            </div>
                            <span className={`text-[11px] ${textSec}`}>{ch?.label || order.channel}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 align-middle">
                          <span className={`text-[11px] font-medium ${textPrimary} line-clamp-2`}>{order.customer || order.customer_name || "Khách vãng lai"}</span>
                        </td>
                        <td className="px-2 py-2.5 align-middle">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${s.color}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 align-middle">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${paymentStatusConfig[order.paymentStatus]?.color || "bg-gray-100 text-gray-600"
                            }`}>
                            {paymentStatusConfig[order.paymentStatus]?.label || "Chờ xử lý"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 align-middle">
                          <span className={`flex w-fit items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${deliveryStatusConfig[order.deliveryStatus]?.color || "border-gray-200 text-gray-700 bg-gray-50"
                            }`}>
                            {deliveryStatusConfig[order.deliveryStatus]?.label || "Chờ lấy hàng"}
                            {order.status !== "pending" && <CheckCircle className="w-3 h-3 opacity-80 flex-shrink-0" />}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 align-middle relative group/price">
                          <div className="flex items-center gap-1">
                            <span className={`text-[11px] font-semibold whitespace-nowrap ${textPrimary}`}>{formatVND(order.total)}</span>
                          </div>

                          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/price:opacity-100 bg-white shadow rounded p-1 flex gap-1 border border-gray-100">
                            <button onClick={() => setDetailOrder(order)} className="p-0.5 text-gray-500 hover:text-blue-600"><Eye className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination Component */}
            <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-end gap-3 ${divider}`}>
              <div className="flex items-center gap-1">
                <button disabled className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"}`}>
                  Trước
                </button>
                <button className={`px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white shadow-sm`}>
                  1
                </button>
                <button className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                  2
                </button>
                <button className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                  3
                </button>
                <span className={`px-2 text-sm ${textSec}`}>...</span>
                <button className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                  80
                </button>
                <button className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                  Tiếp
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Returns Tab */}
      {activeTab === "returns" && (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          {returnOrders.length === 0 ? (
            <div className={`text-center py-16 ${textSec}`}>
              <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Không có đơn hoàn nào</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {returnOrders.map((order, i) => (
                <div key={order.id || i} className={`p-4 rounded-xl border ${dark ? "border-gray-700 bg-gray-800" : "border-orange-100 bg-orange-50/30"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-semibold ${dark ? "text-orange-400" : "text-orange-600"}`}>{order.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium border border-orange-200">Đã hoàn</span>
                      </div>
                      <div className={`text-sm mt-1 ${textPrimary}`}>{order.customer} • {order.product}</div>
                      <div className={`text-xs ${textSec} mt-0.5`}>{order.note}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${textPrimary}`}>{formatVND(order.total)}</div>
                      <div className={`text-xs ${textSec}`}>{order.date}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Tiếp nhận hoàn</button>
                    <button className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Nhập lại kho</button>
                    <button className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">Hàng lỗi</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logistics Tab */}
      {activeTab === "logistics" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {logisticsStats.map(carrier => (
            <div key={carrier.carrier} className={`rounded-2xl border p-5 ${cardBg}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${carrier.color} flex items-center justify-center`}>
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className={`font-semibold ${textPrimary}`}>{carrier.carrier}</div>
                  <div className={`text-xs ${textSec}`}>{carrier.total.toLocaleString()} đơn</div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className={`text-xs ${textSec}`}>Tỷ lệ giao thành công</span>
                    <span className={`text-xs font-bold ${carrier.success >= 95 ? "text-green-500" : carrier.success >= 92 ? "text-yellow-500" : "text-red-500"}`}>{carrier.success}%</span>
                  </div>
                  <div className={`h-2 rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
                    <div className={`h-full rounded-full ${carrier.color}`} style={{ width: `${carrier.success}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className={`text-xs ${textSec}`}>Giao đúng hạn</span>
                    <span className={`text-xs font-bold ${carrier.onTime >= 93 ? "text-green-500" : carrier.onTime >= 89 ? "text-yellow-500" : "text-red-500"}`}>{carrier.onTime}%</span>
                  </div>
                  <div className={`h-2 rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
                    <div className={`h-full rounded-full ${carrier.color} opacity-70`} style={{ width: `${carrier.onTime}%` }} />
                  </div>
                </div>
              </div>
              <div className={`mt-4 pt-3 border-t ${dark ? "border-gray-700" : "border-gray-100"} grid grid-cols-2 gap-2 text-center`}>
                <div>
                  <div className={`text-lg font-bold ${textPrimary}`}>{Math.round(carrier.total * carrier.success / 100).toLocaleString()}</div>
                  <div className={`text-xs ${textSec}`}>Giao thành công</div>
                </div>
                <div>
                  <div className={`text-lg font-bold text-red-500`}>{Math.round(carrier.total * (1 - carrier.success / 100)).toLocaleString()}</div>
                  <div className={`text-xs ${textSec}`}>Thất bại / hoàn</div>
                </div>
              </div>
            </div>
          ))}

          {/* COD Reconciliation */}
          <div className={`lg:col-span-3 rounded-2xl border p-5 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-500" />
              <h2 className={`font-semibold ${textPrimary}`}>Đối soát COD (Thu hộ)</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Tổng COD cần thu", value: "248.5M", color: "text-blue-500" },
                { label: "Đã đối soát", value: "195.2M", color: "text-green-500" },
                { label: "Chưa đối soát", value: "53.3M", color: "text-orange-500" },
                { label: "Số tiền chênh lệch", value: "1.2M", color: "text-red-500" },
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className={`text-xl font-bold ${item.color}`}>{item.value}đ</div>
                  <div className={`text-xs mt-0.5 ${textSec}`}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className={`flex items-center justify-between p-5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <div>
                <h2 className={`font-semibold ${textPrimary}`}>{detailOrder.id}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusConfig[detailOrder.status]?.color || "bg-gray-100 text-gray-600 border-gray-100"}`}>
                  {statusConfig[detailOrder.status]?.label || detailOrder.status}
                </span>
              </div>
              <button onClick={() => setDetailOrder(null)} className={`p-1 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"}`}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div><div className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Kênh bán</div><div className={`text-sm font-medium ${dark ? "text-white" : "text-gray-900"}`}>{channelConfig[detailOrder.channel]?.label || detailOrder.channel}</div></div>
                <div><div className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Ngày đặt</div><div className={`text-sm font-medium ${dark ? "text-white" : "text-gray-900"}`}>{detailOrder.date}</div></div>
              </div>
              {/* Status change */}
              <div>
                <div className={`text-xs font-semibold mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>CẬP NHẬT TRẠNG THÁI</div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={`text-[11px] font-medium mb-1 block ${textSec}`}>Trạng thái đơn hàng</label>
                    <select
                      value={detailOrder.status}
                      onChange={e => handleStatusChange(detailOrder.id, "status", e.target.value)}
                      disabled={updatingStatus}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                    >
                      {Object.entries(statusConfig).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[11px] font-medium mb-1 block ${textSec}`}>Trạng thái thanh toán</label>
                    <select
                      value={detailOrder.paymentStatus}
                      onChange={e => handleStatusChange(detailOrder.id, "paymentStatus", e.target.value)}
                      disabled={updatingStatus}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                    >
                      {Object.entries(paymentStatusConfig).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[11px] font-medium mb-1 block ${textSec}`}>Trạng thái giao hàng</label>
                    <select
                      value={detailOrder.deliveryStatus}
                      onChange={e => handleStatusChange(detailOrder.id, "deliveryStatus", e.target.value)}
                      disabled={updatingStatus}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                    >
                      {Object.entries(deliveryStatusConfig).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <div className={`text-xs font-semibold mb-2 ${textSec}`}>THÔNG TIN KHÁCH HÀNG</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className={`text-sm ${textPrimary}`}>{detailOrder.customer} • {detailOrder.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className={`text-sm ${textSec}`}>{detailOrder.address}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className={`text-xs font-semibold mb-2 ${textSec}`}>SẢN PHẨM</div>
                <div className={`p-3 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className={`text-sm ${textPrimary}`}>{detailOrder.product}</div>
                  <div className={`text-sm font-bold mt-1 ${textPrimary}`}>{formatVND(detailOrder.total)}</div>
                </div>
              </div>
              <div>
                <div className={`text-xs font-semibold mb-2 ${textSec}`}>VẬN CHUYỂN</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className={`text-sm ${textSec}`}>ĐVVC</span>
                    <span className={`text-sm font-medium ${textPrimary}`}>{detailOrder.carrier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${textSec}`}>Mã vận đơn</span>
                    <span className={`text-sm font-mono font-medium ${dark ? "text-blue-400" : "text-blue-600"}`}>{detailOrder.trackingCode}</span>
                  </div>
                </div>
              </div>
              {detailOrder.note && (
                <div className={`p-3 rounded-xl ${dark ? "bg-yellow-950/30 border border-yellow-900" : "bg-yellow-50 border border-yellow-200"}`}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-yellow-500" />
                    <span className={`text-sm ${dark ? "text-yellow-300" : "text-yellow-700"}`}>{detailOrder.note}</span>
                  </div>
                </div>
              )}
            </div>
            <div className={`flex gap-2 p-5 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <button className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                <Printer className="w-4 h-4" />In vận đơn
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                <Camera className="w-4 h-4" />Xác nhận đóng gói
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrderModal && (
        <CreateOrderModal onClose={() => setShowOrderModal(false)} />
      )}
    </div>
  );
}
