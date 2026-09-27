import { useState, useEffect } from "react";
import {
  Warehouse, AlertTriangle, TrendingDown, ArrowUpDown, Plus, Search,
  Download, Printer, QrCode, Package, RefreshCw, CheckCircle, XCircle,
  ChevronUp, ChevronDown, Truck, RotateCcw, Activity, Image, Calendar, ChevronRight
} from "lucide-react";
import { formatVND } from "../../data/mockData";
import { useTheme } from "../Layout";
import { getInventory, adjustStock, saveStocktake } from "../../../lib/services/inventoryService";

const stockMovements = [
  { time: "15/03 09:15", sku: "LANA-SRM-001", name: "Sữa Rửa Mặt", type: "out", qty: -24, reason: "Đơn Shopee #SPE-2403150001", remaining: 245 },
  { time: "15/03 08:40", sku: "LANA-SERUM-002", name: "Serum Cấp Ẩm", type: "in", qty: +200, reason: "Nhập hàng từ NCC Lana Lab", remaining: 182 },
  { time: "14/03 16:20", sku: "LANA-KCN-003", name: "Kem Chống Nắng", type: "out", qty: -18, reason: "Đơn Lazada #LZD-2403140003", remaining: 67 },
  { time: "14/03 14:05", sku: "LANA-SON-004", name: "Son Dưỡng Rose", type: "out", qty: -12, reason: "Đơn TikTok #TTK-2403140004", remaining: 134 },
];

const purchaseOrders = [
  { id: "PO-2403-001", supplier: "Xưởng Minh Hà", items: 3, qty: 450, total: 28500000, status: "delivered", date: "15/03/2026", eta: "—" },
  { id: "PO-2403-002", supplier: "Kho Thiên Hòa", items: 2, qty: 200, total: 14800000, status: "shipping", date: "14/03/2026", eta: "17/03/2026" },
  { id: "PO-2403-003", supplier: "NCC Phong Phú", items: 5, qty: 600, total: 42000000, status: "pending", date: "16/03/2026", eta: "20/03/2026" },
  { id: "PO-2403-004", supplier: "Xưởng Bảo Châu", items: 1, qty: 100, total: 8900000, status: "cancelled", date: "13/03/2026", eta: "—" },
];

export function Inventory() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState<"stock" | "movements" | "po">("stock");
  const [search, setSearch] = useState("");
  const [showStocktake, setShowStocktake] = useState(false);
  const [inventoryItemsData, setInventoryItemsData] = useState<any[]>([]);
  const [stockModal, setStockModal] = useState<{ item: any; type: "in" | "out" } | null>(null);
  const [stockQty, setStockQty] = useState(0);
  const [stockReason, setStockReason] = useState("");
  const [stocktakeValues, setStocktakeValues] = useState<Record<string, number>>({});

  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());

  const toggleExpand = (sku: string) => {
    const next = new Set(expandedSkus);
    if (next.has(sku)) next.delete(sku);
    else next.add(sku);
    setExpandedSkus(next);
  };

  async function loadInventory() {
    const items = await getInventory();
    setInventoryItemsData(items);
    const initValues: Record<string, number> = {};
    items.forEach(i => { initValues[i.sku] = i.available; });
    setStocktakeValues(initValues);
  }

  useEffect(() => {
    loadInventory();
  }, []);

  async function applyStockAdjust() {
    if (!stockModal) return;
    const delta = stockModal.type === "in" ? stockQty : -stockQty;
    setIsUpdating(true);
    const success = await adjustStock(stockModal.item.product_id, delta, stockReason);
    setIsUpdating(false);
    if (success) {
      alert(`Đã ${stockModal.type === "in" ? "nhập" : "xuất"} kho thành công!`);
      setStockModal(null);
      setStockQty(0);
      setStockReason("");
      loadInventory();
    } else {
      alert("Lỗi khi điều chỉnh tồn kho.");
    }
  }

  async function applyStocktake() {
    setIsUpdating(true);
    const success = await saveStocktake(stocktakeValues);
    setIsUpdating(false);
    if (success) {
      alert("Đã lưu kết quả kiểm kê!");
      setShowStocktake(false);
      loadInventory();
    } else {
      alert("Lỗi khi lưu phần chuẩn kiểm kê.");
    }
  }

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSec = dark ? "text-gray-400" : "text-gray-500";
  const cardBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const rowHover = dark ? "hover:bg-gray-800" : "hover:bg-gray-50";
  const inputBg = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const divider = dark ? "border-gray-800" : "border-gray-100";

  const filtered = inventoryItemsData.filter(item =>
    !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = inventoryItemsData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const criticalCount = inventoryItemsData.filter(i => i.status === "critical").length;
  const warningCount = inventoryItemsData.filter(i => i.status === "warning").length;

  const statusBadge = (s: string) => {
    if (s === "ok") return <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-600">Bình thường</span>;
    if (s === "warning") return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-50 text-yellow-600 font-medium">Sắp hết</span>;
    return <span className="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 font-medium animate-pulse">Nguy hiểm</span>;
  };

  const poStatusBadge = (s: string) => {
    const map: Record<string, string> = {
      delivered: "bg-green-100 text-green-700",
      shipping: "bg-blue-100 text-blue-700",
      pending: "bg-yellow-100 text-yellow-700",
      cancelled: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      delivered: "Đã nhận", shipping: "Đang giao", pending: "Chờ xử lý", cancelled: "Đã hủy"
    };
    return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${map[s]}`}>{labels[s]}</span>;
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`font-bold text-xl ${textPrimary}`}>Quản lý kho thông minh</h1>
          <p className={`text-sm ${textSec}`}>Đồng bộ tồn kho tức thời</p>
        </div>
        <div className="flex gap-2">
          <button className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <Printer className="w-4 h-4" />
            <span className="hidden sm:block">In tem SKU</span>
          </button>
          <button onClick={() => setShowStocktake(true)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:block">Kiểm kê kho</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700">
            <Plus className="w-4 h-4" />
            <span>Phiếu nhập kho</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Giá trị tổng kho", value: formatVND(totalValue), icon: Warehouse, color: "text-blue-500", sub: "Vốn hàng tồn" },
          { label: "SKU đang quản lý", value: inventoryItemsData.length, icon: Package, color: "text-green-500", sub: "Master SKU" },
          { label: "Cảnh báo sắp hết", value: `${criticalCount + warningCount} SKU`, icon: AlertTriangle, color: "text-orange-500", sub: `${criticalCount} nguy hiểm, ${warningCount} sắp hết` },
          { label: "Hàng tồn > 90 ngày", value: "2 SKU", icon: TrendingDown, color: "text-red-500", sub: "Cần xem xét giảm giá" },
        ].map((s, i) => (
          <div key={i} className={`p-4 rounded-2xl border ${cardBg}`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className={`text-xs ${textSec}`}>{s.label}</span>
            </div>
            <div className={`font-bold text-lg ${textPrimary}`}>{s.value}</div>
            <div className={`text-xs mt-0.5 ${textSec}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl border ${dark ? "bg-gray-900 border-gray-800" : "bg-gray-100 border-gray-200"}`}>
        {[
          { id: "stock", label: "Tồn kho", icon: Warehouse },
          { id: "movements", label: "Lịch sử nhập/xuất", icon: Activity },
          { id: "po", label: "Phiếu nhập kho (PO)", icon: Truck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 flex-1 justify-center py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-pink-600 text-white shadow-sm" : dark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Stock Tab */}
      {activeTab === "stock" && (
        <>
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${inputBg}`}>
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm SKU, tên sản phẩm, vị trí kho..." className="flex-1 text-sm bg-transparent outline-none" />
            <button className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg ${dark ? "bg-gray-700 text-gray-300" : "bg-white border border-gray-200 text-gray-600"}`}>
              <Download className="w-3 h-3" />Xuất Excel
            </button>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${dark ? "border-gray-800 bg-gray-800/50" : "border-gray-100 bg-gray-50"}`}>
                    {["", "SKU / Tên sản phẩm", "Vị trí kho", "Khả dụng", "Đang xử lý", "Tổng kho", "Giá trị", "Trạng thái"].map(h => (
                      <th key={h} className={`p-3 text-left text-xs font-semibold ${textSec} whitespace-nowrap`}>{h}</th>
                    ))}
                    <th className={`p-3 text-left text-xs font-semibold ${textSec}`}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <>
                    <tr key={item.sku} className={`border-b last:border-0 ${dark ? "border-gray-800" : "border-gray-50"} ${rowHover} transition-colors ${item.status === "critical" ? dark ? "bg-red-950/20" : "bg-red-50/50" : ""}`}>
                      <td className="p-3">
                        <button
                          onClick={() => toggleExpand(item.sku)}
                          className={`p-1 rounded-lg transition-transform ${expandedSkus.has(item.sku) ? "rotate-90" : ""} ${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                        >
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={(item as any).img || ""}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                            style={{ border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e5e7ef" }}
                            onError={e => { const t = e.currentTarget; t.style.display='none'; (t.nextElementSibling as HTMLElement).style.display='flex'; }}
                          />
                          <div className={`w-10 h-10 rounded-xl items-center justify-center flex-shrink-0 ${dark ? "bg-gray-800" : "bg-gray-100"}`} style={{display:'none'}}>
                            <Image className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${textPrimary}`}>{item.name}</div>
                            <div className={`text-xs font-mono ${textSec}`}>{item.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`p-3 text-sm font-mono ${dark ? "text-blue-400" : "text-blue-600"}`}>{item.location}</td>
                       <td className="p-3">
                        <span className={`text-sm font-bold ${
                          item.status === "critical" ? "text-red-500" :
                          item.status === "warning" ? "text-yellow-500" : "text-green-500"
                        }`}>
                          {item.available}
                        </span>
                      </td>
                      <td className={`p-3 text-sm ${textSec}`}>{item.pending}</td>
                      <td className={`p-3 text-sm font-medium ${textPrimary}`}>{item.total}</td>
                      <td className={`p-3 text-sm ${textPrimary}`}>{formatVND(Number(item.value) || 0)}</td>
                      <td className="p-3">{statusBadge(item.status)}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setStockModal({ item, type: "in" }); setStockQty(0); setStockReason(""); }}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 text-xs" title="Nhập kho">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setStockModal({ item, type: "out" }); setStockQty(0); setStockReason(""); }}
                            className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 text-xs" title="Xuất kho">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedSkus.has(item.sku) && item.batches && item.batches.length > 0 && (
                      <tr className={`${dark ? "bg-gray-800/30" : "bg-gray-50/50"}`}>
                        <td colSpan={9} className="p-4 pt-0">
                          <div className={`rounded-xl border ${dark ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-white"} overflow-hidden shadow-inner`}>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className={`border-b ${dark ? "border-gray-800 bg-gray-800/50" : "border-gray-100 bg-gray-50"}`}>
                                  <th className={`p-2 px-4 text-left font-semibold ${textSec}`}>Số Lô (Batch)</th>
                                  <th className={`p-2 px-4 text-left font-semibold ${textSec}`}>Ngày sản xuất</th>
                                  <th className={`p-2 px-4 text-left font-semibold ${textSec}`}>Hạn sử dụng</th>
                                  <th className={`p-2 px-4 text-right font-semibold ${textSec}`}>Số lượng</th>
                                  <th className={`p-2 px-4 text-center font-semibold ${textSec}`}>Tình trạng</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(item.batches as any[]).map((b, idx) => {
                                  // Simple logic to detect "near expiry" (less than 6 months for demo)
                                  const expParts = b.exp_date.split('/');
                                  const expDate = new Date(Number(expParts[2]), Number(expParts[1]) - 1, Number(expParts[0]));
                                  const today = new Date();
                                  const diffMonths = (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
                                  const isExpiring = diffMonths < 6;

                                  return (
                                    <tr key={idx} className={`border-b last:border-0 ${dark ? "border-gray-800" : "border-gray-100"}`}>
                                      <td className={`p-2 px-4 font-mono font-medium ${textPrimary}`}>{b.batch_number}</td>
                                      <td className={`p-2 px-4 ${textSec}`}>{b.mfg_date}</td>
                                      <td className={`p-2 px-4 ${isExpiring ? "text-red-500 font-medium" : textSec}`}>
                                        <div className="flex items-center gap-1.5">
                                          <Calendar className="w-3 h-3" />
                                          {b.exp_date}
                                        </div>
                                      </td>
                                      <td className={`p-2 px-4 text-right font-bold ${textPrimary}`}>{b.quantity}</td>
                                      <td className="p-2 px-4 text-center">
                                        {isExpiring ? (
                                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium text-[10px]">Cận hạn</span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium text-[10px]">Ổn định</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


        </>
      )}

      {/* Movements Tab */}
      {activeTab === "movements" && (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${dark ? "border-gray-800 bg-gray-800/50" : "border-gray-100 bg-gray-50"}`}>
                  {["Thời gian", "SKU", "Tên sản phẩm", "Loại", "Số lượng", "Lý do", "Tồn sau"].map(h => (
                    <th key={h} className={`p-3 text-left text-xs font-semibold ${textSec}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockMovements.map((m, i) => (
                  <tr key={i} className={`border-b last:border-0 ${dark ? "border-gray-800" : "border-gray-50"} ${rowHover} transition-colors`}>
                    <td className={`p-3 text-xs ${textSec}`}>{m.time}</td>
                    <td className={`p-3 text-xs font-mono ${dark ? "text-blue-400" : "text-blue-600"}`}>{m.sku}</td>
                    <td className={`p-3 text-sm ${textPrimary}`}>{m.name}</td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${m.type === "in" ? "bg-green-100 text-green-700" :
                        m.type === "out" ? "bg-blue-100 text-blue-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                        {m.type === "in" ? <ChevronUp className="w-3 h-3" /> : m.type === "out" ? <ChevronDown className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {m.type === "in" ? "Nhập kho" : m.type === "out" ? "Xuất kho" : "Hàng lỗi"}
                      </span>
                    </td>
                    <td className={`p-3 text-sm font-bold ${m.qty > 0 ? "text-green-500" : "text-red-500"}`}>
                      {m.qty > 0 ? "+" : ""}{m.qty}
                    </td>
                    <td className={`p-3 text-xs ${textSec}`}>{m.reason}</td>
                    <td className={`p-3 text-sm font-medium ${textPrimary}`}>{m.remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PO Tab */}
      {activeTab === "po" && (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${dark ? "border-gray-800 bg-gray-800/50" : "border-gray-100 bg-gray-50"}`}>
                  {["Mã PO", "Nhà cung cấp", "Số mặt hàng", "Tổng số lượng", "Tổng tiền", "Ngày đặt", "Dự kiến nhận", "Trạng thái"].map(h => (
                    <th key={h} className={`p-3 text-left text-xs font-semibold ${textSec} whitespace-nowrap`}>{h}</th>
                  ))}
                  <th className={`p-3 text-xs font-semibold ${textSec}`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => (
                  <tr key={po.id} className={`border-b last:border-0 ${dark ? "border-gray-800" : "border-gray-50"} ${rowHover} transition-colors`}>
                    <td className={`p-3 text-sm font-mono font-medium ${dark ? "text-blue-400" : "text-blue-600"}`}>{po.id}</td>
                    <td className={`p-3 text-sm ${textPrimary}`}>{po.supplier}</td>
                    <td className={`p-3 text-sm ${textSec}`}>{po.items} SKU</td>
                    <td className={`p-3 text-sm font-medium ${textPrimary}`}>{po.qty.toLocaleString()}</td>
                    <td className={`p-3 text-sm font-semibold ${textPrimary}`}>{formatVND(po.total)}</td>
                    <td className={`p-3 text-sm ${textSec}`}>{po.date}</td>
                    <td className={`p-3 text-sm ${textSec}`}>{po.eta}</td>
                    <td className="p-3">{poStatusBadge(po.status)}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button className={`p-1.5 rounded-lg text-xs ${dark ? "text-gray-400 hover:bg-gray-700" : "text-gray-400 hover:bg-gray-100"}`}>
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        {po.status === "shipping" && (
                          <button className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 text-xs" title="Xác nhận nhận hàng">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stocktake Modal */}
      {showStocktake && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-md ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className={`flex items-center justify-between p-5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <h2 className={`font-semibold ${textPrimary}`}>Kiểm kê kho</h2>
              <button onClick={() => setShowStocktake(false)} className={`p-1 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"}`}>✕</button>
            </div>
            <div className="p-5">
              <p className={`text-sm mb-4 ${textSec}`}>Đối soát định kỳ để cập nhật số lượng thực tế. Sử dụng app điện thoại để quét mã khi kiểm.</p>
              <div className="space-y-3">
                {inventoryItemsData.slice(0, 4).map(item => (
                  <div key={item.sku} className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <QrCode className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${textPrimary}`}>{item.name}</div>
                      <div className={`text-xs ${textSec}`}>Hệ thống: {item.total} đơn vị</div>
                    </div>
                    <input
                      type="number"
                      defaultValue={item.total}
                      value={stocktakeValues[item.sku] ?? item.total}
                      onChange={e => setStocktakeValues(prev => ({ ...prev, [item.sku]: Number(e.target.value) }))}
                      className={`w-20 px-2 py-1 rounded-lg border text-sm text-center outline-none ${dark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className={`flex gap-3 p-5 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <button onClick={() => setShowStocktake(false)} className={`flex-1 py-2.5 rounded-xl border text-sm ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>Hủy</button>
              <button
                onClick={applyStocktake}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium disabled:opacity-50"
                disabled={isUpdating}
              >
                {isUpdating ? "Đang lưu..." : "Lưu kiểm kê"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-sm ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className={`flex items-center justify-between p-5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <h2 className={`font-semibold ${textPrimary}`}>{stockModal.type === "in" ? "📥 Nhập kho" : "📤 Xuất kho"}</h2>
              <button onClick={() => setStockModal(null)} className={`p-1 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"}`}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className={`p-3 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className={`text-sm font-medium ${textPrimary}`}>{stockModal.item.name}</div>
                <div className={`text-xs ${textSec}`}>SKU: {stockModal.item.sku} • Hiện tại: {stockModal.item.available} đơn vị</div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Số lượng {stockModal.type === "in" ? "nhập" : "xuất"}</label>
                <input
                  type="number"
                  min={1}
                  max={stockModal.type === "out" ? stockModal.item.available : undefined}
                  value={stockQty}
                  onChange={e => setStockQty(Math.max(0, Number(e.target.value)))}
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Lý do</label>
                <input
                  type="text"
                  value={stockReason}
                  onChange={e => setStockReason(e.target.value)}
                  placeholder={stockModal.type === "in" ? "VD: Nhập từ NCC Minh Hà" : "VD: Xuất cho đơn hàng #123"}
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                />
              </div>
            </div>
            <div className={`flex gap-3 p-5 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <button onClick={() => setStockModal(null)} className={`flex-1 py-2.5 rounded-xl border text-sm ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>Hủy</button>
              <button
                onClick={applyStockAdjust}
                disabled={stockQty <= 0 || isUpdating}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium ${stockModal.type === "in" ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-500 hover:bg-orange-600"} disabled:opacity-50`}
              >
                {isUpdating ? "Đang xử lý..." : stockModal.type === "in" ? "Xác nhận nhập" : "Xác nhận xuất"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
