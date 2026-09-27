import { useState, useEffect } from "react";
import {
  TrendingUp, ShoppingCart, XCircle,
  AlertTriangle, RefreshCw, Plus,
  Eye, ArrowUpRight, ArrowDownRight, Activity, MapPin, BarChart2, DollarSign
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { useTheme } from "../Layout";
import { getProducts, getTopProducts } from "../../../lib/services/productService";
import { createOrder, getOrders } from "../../../lib/services/orderService";

const formatCurrency = (value: number) => {
  if (!value) return "0đ";
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} tỷ`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} triệu`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)} nghìn`;
  return value.toLocaleString("vi-VN");
};

const heatmapData = [
  { region: "TP. Hồ Chí Minh", orders: 0, percent: 0 },
  { region: "Hà Nội", orders: 0, percent: 0 },
  { region: "Đà Nẵng", orders: 0, percent: 0 },
];

const todoItems = [
  { id: 1, message: "Đơn hàng chờ xác nhận", count: 15 },
  { id: 2, message: "Sản phẩm sắp hết hàng trong kho", count: 3 },
  { id: 3, message: "Đơn hàng khiếu nại / hoàn trả", count: 2 },
  { id: 4, message: "Cần xử lý đồng bộ đa kênh", count: 1 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#fff",
        border: "1px solid #e5e7ef",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        fontSize: 12
      }}>
        <p style={{ fontWeight: 600, color: "#0f1117", marginBottom: 8 }}>{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
            <span style={{ color: "#6b7280" }}>{p.name}: </span>
            <span style={{ fontWeight: 600, color: "#0f1117" }}>{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const { dark } = useTheme();
  const [chartView, setChartView] = useState<"area" | "bar">("area");
  const [topProductsData, setTopProductsData] = useState<any[]>([]);
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [quickOrderForm, setQuickOrderForm] = useState({ customer: "", product: "", channel: "shopee", note: "" });
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [dynamicKPIs, setDynamicKPIs] = useState<any[]>([]);
  const [dynamicChart, setDynamicChart] = useState<any[]>([]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const monthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

  async function handleQuickOrder() {
    if (!quickOrderForm.customer || !quickOrderForm.product) {
      alert("Vui lòng nhập định danh khách hàng và sản phẩm.");
      return;
    }
    setIsCreatingOrder(true);
    const success = await createOrder({
      customer_name: quickOrderForm.customer,
      product_summary: quickOrderForm.product,
      channel: quickOrderForm.channel,
      note: quickOrderForm.note,
    });
    setIsCreatingOrder(false);
    if (success) {
      alert(`Đã tạo đơn cho ${quickOrderForm.customer} thành công!`);
      setShowQuickOrder(false);
      setQuickOrderForm({ customer: "", product: "", channel: "shopee", note: "" });
    } else {
      alert("Lỗi khi tạo đơn hàng.");
    }
  }

  useEffect(() => {
    async function loadData() {
      // Fetch real products & orders from backend APIs
      const [prods, ords] = await Promise.all([getProducts(), getOrders()]);

      // Calculate Top Products dynamically from DB products
      const topProds = prods.slice(0, 5).map((p, i) => ({
        rank: i + 1,
        sku: p.sku,
        name: p.name,
        img: p.img_url || "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80",
        sold: p.sold_this_month || 0,
        revenue: (p.sold_this_month || 0) * (p.sell_price || 0),
        trend: "0%",
      }));
      setTopProductsData(topProds);

      // Compute KPIs dynamically from DB orders & products
      const totalRevenue = ords.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalOrdersCount = ords.length;
      const aov = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
      const ml = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

      setDynamicKPIs([
        { label: "Doanh thu thực tế", value: formatCurrency(totalRevenue), change: "0%", trend: "up", good: true, icon: DollarSign, accent: "#2563eb", accentBg: "rgba(37,99,235,0.1)", sub: `Tổng ${ml} • DB Realtime` },
        { label: "Đơn hàng mới", value: totalOrdersCount.toLocaleString(), change: "0%", trend: "up", good: true, icon: ShoppingCart, accent: "#10b981", accentBg: "rgba(16,185,129,0.1)", sub: `Tổng ${ml}` },
        { label: "Tỷ lệ hủy đơn", value: "0%", change: "0%", trend: "down", good: true, icon: XCircle, accent: "#ef4444", accentBg: "rgba(239,68,68,0.1)", sub: "Tỷ lệ hủy" },
        { label: "Tổng sản phẩm", value: prods.length.toLocaleString(), change: "0%", trend: "up", good: true, icon: TrendingUp, accent: "#ec4899", accentBg: "rgba(236,72,153,0.1)", sub: `Kênh catalog DB` },
        { label: "Giá trị TB đơn ", value: formatCurrency(aov), change: "0%", trend: "up", good: true, icon: Activity, accent: "#f59e0b", accentBg: "rgba(245,158,11,0.1)", sub: "AOV trung bình" },
      ]);

      setDynamicChart([]);
    }
    loadData();
  }, []);

  const cardBg = dark ? "#111827" : "#ffffff";
  const cardBorder = dark ? "rgba(255,255,255,0.07)" : "#e5e7ef";
  const textPrimary = dark ? "#e2e8f5" : "#0f1117";
  const textMuted = dark ? "#8892a4" : "#6b7280";
  const divBg = dark ? "rgba(255,255,255,0.04)" : "#f8f9fc";

  const cardStyle = {
    background: cardBg,
    border: `1px solid ${cardBorder}`,
    borderRadius: 12,
    boxShadow: dark ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em", margin: 0 }}>
            Tổng quan {monthLabel}
          </h1>
          <p style={{ fontSize: 10, color: textMuted, marginTop: 3 }}>
            {dateStr} &nbsp;·&nbsp; Cập nhật lúc {timeStr}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowQuickOrder(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
              borderRadius: 8, background: "#be185d", color: "#fff", border: "none",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(190,24,93,0.35)"
            }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Tạo đơn nhanh
          </button>
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        {dynamicKPIs.map((kpi, i) => (
          <div key={i} style={{ ...cardStyle, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, minHeight: 34 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: textMuted, flex: 1, paddingRight: 4 }}>{kpi.label}</span>
              <span style={{
                display: "flex", alignItems: "center", gap: 2,
                fontSize: 10, fontWeight: 600,
                color: kpi.good ? "#10b981" : "#ef4444",
                background: kpi.good ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                padding: "2px 7px", borderRadius: 20,
                height: "fit-content"
              }}>
                {kpi.trend === "up" ? <ArrowUpRight style={{ width: 11, height: 11 }} /> : <ArrowDownRight style={{ width: 11, height: 11 }} />}
                {kpi.change}
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: textPrimary, letterSpacing: "-0.03em", marginBottom: 6 }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: dark ? "#4b5680" : "#94a3b8", minHeight: 14 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* Revenue Chart */}
        <div style={{ ...cardStyle, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 12, fontWeight: 600, color: textPrimary, margin: 0 }}>Doanh thu đa kênh</h2>
              <p style={{ fontSize: 9, color: textMuted, marginTop: 3 }}>15 ngày gần đây</p>
            </div>
            <div style={{ display: "flex", gap: 4, background: divBg, padding: 4, borderRadius: 8 }}>
              <button
                onClick={() => setChartView("area")}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10,
                  background: chartView === "area" ? "#be185d" : "transparent",
                  color: chartView === "area" ? "#fff" : textMuted,
                  display: "flex", alignItems: "center", gap: 4, fontWeight: 500
                }}
              >
                <Activity style={{ width: 13, height: 13 }} />Đường
              </button>
              <button
                onClick={() => setChartView("bar")}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10,
                  background: chartView === "bar" ? "#be185d" : "transparent",
                  color: chartView === "bar" ? "#fff" : textMuted,
                  display: "flex", alignItems: "center", gap: 4, fontWeight: 500,
                  transition: "all 0.2s"
                }}
              >
                <BarChart2 style={{ width: 13, height: 13 }} />Cột
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {chartView === "area" ? (
              <AreaChart data={dynamicChart} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  {[
                    { id: "shopee", color: "#EE4D2D" },
                    { id: "tiktok", color: "#6b7280" },
                    { id: "lazada", color: "#6366f1" },
                    { id: "website", color: "#10b981" },
                  ].map(g => (
                    <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={g.color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f3f9"} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: dark ? "#4b5680" : "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: dark ? "#4b5680" : "#94a3b8" }} tickFormatter={(v) => formatCurrency(v)} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="shopee" name="Shopee" stroke="#EE4D2D" fill="url(#shopee)" strokeWidth={2} />
                <Area type="monotone" dataKey="tiktok" name="TikTok" stroke="#6b7280" fill="url(#tiktok)" strokeWidth={2} />
                <Area type="monotone" dataKey="lazada" name="Lazada" stroke="#6366f1" fill="url(#lazada)" strokeWidth={2} />
                <Area type="monotone" dataKey="website" name="Website" stroke="#10b981" fill="url(#website)" strokeWidth={2} />
              </AreaChart>
            ) : (
              <BarChart data={dynamicChart} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f3f9"} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: dark ? "#4b5680" : "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: dark ? "#4b5680" : "#94a3b8" }} tickFormatter={(v) => formatCurrency(v)} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="shopee" name="Shopee" fill="#EE4D2D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tiktok" name="TikTok" fill="#6b7280" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lazada" name="Lazada" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="website" name="Website" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Todo + API Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Todo */}
          <div style={{ ...cardStyle, padding: "16px 18px", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontSize: 11, fontWeight: 600, color: textPrimary, margin: 0 }}>Việc cần làm</h2>
              <span style={{ fontSize: 9, color: "#6366f1", cursor: "pointer", fontWeight: 500 }}>Xem tất cả</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {todoItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                    borderRadius: 8, background: divBg, cursor: "pointer"
                  }}
                >
                  <span style={{ fontSize: 11, flex: 1, color: textPrimary, fontWeight: 600 }}>{item.message}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* Top Products */}
        <div style={{ ...cardStyle, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 12, fontWeight: 600, color: textPrimary, margin: 0 }}>Top sản phẩm bán chạy</h2>
              <p style={{ fontSize: 9, color: textMuted, marginTop: 3 }}>{monthLabel}</p>
            </div>
            <button style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
              <Eye style={{ width: 13, height: 13 }} />Xem thêm
            </button>
          </div>
          <div>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "28px 1fr 80px 90px 70px",
              padding: "0 8px 10px",
              borderBottom: `1px solid ${cardBorder}`,
              gap: 8
            }}>
              {["#", "Sản phẩm", "Đã bán", "Doanh thu", "Xu hướng"].map(h => (
                <span key={h} style={{ fontSize: 9, fontWeight: 600, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
              ))}
            </div>
            {topProductsData.map((p, idx) => (
              <div
                key={p.rank}
                style={{
                  display: "grid", gridTemplateColumns: "28px 1fr 80px 90px 70px",
                  padding: "10px 8px",
                  borderBottom: idx < topProductsData.length - 1 ? `1px solid ${cardBorder}` : "none",
                  gap: 8,
                  alignItems: "center",
                  cursor: "pointer",
                  borderRadius: 8,
                  transition: "background 0.15s"
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = divBg}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: p.rank === 1 ? "rgba(250,204,21,0.15)" : p.rank === 2 ? "rgba(156,163,175,0.15)" : p.rank === 3 ? "rgba(249,115,22,0.15)" : divBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                  color: p.rank === 1 ? "#d97706" : p.rank === 2 ? "#6b7280" : p.rank === 3 ? "#ea580c" : textMuted
                }}>{p.rank}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <img src={p.img} alt={p.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: `1px solid ${cardBorder}` }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                    <div style={{ fontSize: 8, color: textMuted }}>{p.sku}</div>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: textMuted }}>{p.sold.toLocaleString()}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: textPrimary }}>{formatCurrency(p.revenue)}đ</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#10b981" }}>{p.trend}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: heatmap */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Heatmap */}
          <div style={{ ...cardStyle, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <MapPin style={{ width: 14, height: 14, color: "#6366f1" }} />
              <h2 style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: 0 }}>Phân bố đơn hàng</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {heatmapData.map((item, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: textPrimary }}>{item.region}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: textMuted }}>{item.orders.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: dark ? "rgba(255,255,255,0.05)" : "#f1f3f9" }}>
                    <div style={{
                      width: `${item.percent}%`,
                      background: `linear-gradient(90deg, #6366f1, #8b5cf6)`
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Order Modal */}
      {showQuickOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: dark ? "#111827" : "#fff", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e5e7ef"}`, borderRadius: 16, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "#e5e7ef"}` }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: dark ? "#e2e8f5" : "#0f1117" }}>⚡ Tạo đơn nhanh</span>
              <button onClick={() => setShowQuickOrder(false)} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#8892a4" : "#6b7280", fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Khách hàng *", key: "customer", placeholder: "Tên hoặc số điện thoại" },
                { label: "Sản phẩm *", key: "product", placeholder: "Tên sản phẩm / SKU" },
                { label: "Ghi chú", key: "note", placeholder: "Ghi chú cho đơn hàng..." },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: dark ? "#8892a4" : "#6b7280", marginBottom: 6 }}>{f.label}</label>
                  <input
                    value={quickOrderForm[f.key as keyof typeof quickOrderForm]}
                    onChange={e => setQuickOrderForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e5e7ef"}`, background: dark ? "rgba(255,255,255,0.04)" : "#f8f9fc", color: dark ? "#e2e8f5" : "#0f1117", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: dark ? "#8892a4" : "#6b7280", marginBottom: 6 }}>Kênh bán</label>
                <select
                  value={quickOrderForm.channel}
                  onChange={e => setQuickOrderForm(p => ({ ...p, channel: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e5e7ef"}`, background: dark ? "rgba(255,255,255,0.04)" : "#f8f9fc", color: dark ? "#e2e8f5" : "#0f1117", fontSize: 13, outline: "none" }}
                >
                  <option value="shopee">Shopee</option>
                  <option value="tiktok">TikTok Shop</option>
                  <option value="lazada">Lazada</option>
                  <option value="website">Website</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "14px 22px", borderTop: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "#e5e7ef"}` }}>
              <button onClick={() => setShowQuickOrder(false)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e5e7ef"}`, background: "none", color: dark ? "#8892a4" : "#6b7280", fontSize: 13, cursor: "pointer" }}>Hủy</button>
              <button
                disabled={isCreatingOrder}
                onClick={handleQuickOrder}
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 600, cursor: isCreatingOrder ? "not-allowed" : "pointer", opacity: isCreatingOrder ? 0.7 : 1 }}
              >
                {isCreatingOrder ? "Đang tạo..." : "Tạo đơn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
