import { useState } from "react";
import {
  BarChart3, TrendingUp, DollarSign, Download,
  Users, Star, ArrowUpRight, ArrowDownRight,
  ShoppingBag, Percent, Package, Activity
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart as RechartPie, Pie, Cell,
  AreaChart, Area
} from "recharts";
import { useTheme } from "../Layout";

const formatCurrency = (value: number) => {
  if (!value) return "0đ";
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} tỷ`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} triệu`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)} nghìn`;
  return value.toLocaleString("vi-VN");
};

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

// ─── DYNAMIC CONSISTENT MOCK DATA ────────────────────────────────────────────
const PERIOD_DATA: Record<string, any> = {
  "Tháng 4/2026": {
    PL: {
      revenue: 847_200_000,
      cogs: 320_400_000,
      grossProfit: 526_800_000,
      platformFees: 84_720_000,
      shippingCost: 42_360_000,
      marketingCost: 33_888_000,
      netProfit: 365_832_000,
      margin: 43.2,
    },
    channelFees: [
      { channel: "Shopee", commission: 8, payment: 2.5, fixed: 0, total: 38_360_000, revenue: 383_600_000 },
      { channel: "TikTok Shop", commission: 4, payment: 2.5, fixed: 0, total: 25_416_000, revenue: 254_160_000 },
      { channel: "Lazada", commission: 8, payment: 2.5, fixed: 0, total: 16_944_000, revenue: 169_440_000 },
      { channel: "Website", commission: 0, payment: 2.5, fixed: 0, total: 1_000_000, revenue: 40_000_000 },
    ],
    employeeStats: [
      { name: "Nguyễn Văn A", role: "Đóng gói", orders: 1284, messages: 0, accuracy: 99.2, color: "#3b82f6" },
      { name: "Trần Thị B", role: "CSKH", orders: 0, messages: 846, accuracy: 98.9, color: "#10b981" },
      { name: "Lê Văn C", role: "Đóng gói", orders: 1055, messages: 0, accuracy: 97.8, color: "#a855f7" },
      { name: "Phạm Thị D", role: "CSKH", orders: 0, messages: 632, accuracy: 99.5, color: "#f59e0b" },
    ]
  },
  "Tháng 3/2026": {
    PL: {
      revenue: 580_000_000,
      cogs: 230_000_000,
      grossProfit: 350_000_000,
      platformFees: 58_000_000,
      shippingCost: 30_000_000,
      marketingCost: 25_000_000,
      netProfit: 237_000_000,
      margin: 40.8,
    },
    channelFees: [
      { channel: "Shopee", commission: 8, payment: 2.5, fixed: 0, total: 26_000_000, revenue: 260_000_000 },
      { channel: "TikTok Shop", commission: 4, payment: 2.5, fixed: 0, total: 17_400_000, revenue: 174_000_000 },
      { channel: "Lazada", commission: 8, payment: 2.5, fixed: 0, total: 11_600_000, revenue: 116_000_000 },
      { channel: "Website", commission: 0, payment: 2.5, fixed: 0, total: 750_000, revenue: 30_000_000 },
    ],
    employeeStats: [
      { name: "Nguyễn Văn A", role: "Đóng gói", orders: 852, messages: 0, accuracy: 98.5, color: "#3b82f6" },
      { name: "Trần Thị B", role: "CSKH", orders: 0, messages: 512, accuracy: 98.0, color: "#10b981" },
      { name: "Lê Văn C", role: "Đóng gói", orders: 741, messages: 0, accuracy: 96.5, color: "#a855f7" },
      { name: "Phạm Thị D", role: "CSKH", orders: 0, messages: 420, accuracy: 99.0, color: "#f59e0b" },
    ]
  },
  "Q1/2026": {
    PL: {
      revenue: 1_620_000_000,
      cogs: 650_000_000,
      grossProfit: 970_000_000,
      platformFees: 162_000_000,
      shippingCost: 85_000_000,
      marketingCost: 70_000_000,
      netProfit: 653_000_000,
      margin: 40.3,
    },
    channelFees: [
      { channel: "Shopee", commission: 8, payment: 2.5, fixed: 0, total: 73_000_000, revenue: 730_000_000 },
      { channel: "TikTok Shop", commission: 4, payment: 2.5, fixed: 0, total: 48_600_000, revenue: 486_000_000 },
      { channel: "Lazada", commission: 8, payment: 2.5, fixed: 0, total: 32_400_000, revenue: 324_000_000 },
      { channel: "Website", commission: 0, payment: 2.5, fixed: 0, total: 2_000_000, revenue: 80_000_000 },
    ],
    employeeStats: [
      { name: "Nguyễn Văn A", role: "Đóng gói", orders: 2514, messages: 0, accuracy: 99.0, color: "#3b82f6" },
      { name: "Trần Thị B", role: "CSKH", orders: 0, messages: 1540, accuracy: 98.5, color: "#10b981" },
      { name: "Lê Văn C", role: "Đóng gói", orders: 2120, messages: 0, accuracy: 97.2, color: "#a855f7" },
      { name: "Phạm Thị D", role: "CSKH", orders: 0, messages: 1210, accuracy: 99.2, color: "#f59e0b" },
    ]
  },
  "Năm 2026": {
    PL: {
      revenue: 2_467_200_000,
      cogs: 970_400_000,
      grossProfit: 1_496_800_000,
      platformFees: 246_720_000,
      shippingCost: 127_360_000,
      marketingCost: 103_888_000,
      netProfit: 1_018_832_000,
      margin: 41.3,
    },
    channelFees: [
      { channel: "Shopee", commission: 8, payment: 2.5, fixed: 0, total: 111_360_000, revenue: 1_113_600_000 },
      { channel: "TikTok Shop", commission: 4, payment: 2.5, fixed: 0, total: 74_016_000, revenue: 740_160_000 },
      { channel: "Lazada", commission: 8, payment: 2.5, fixed: 0, total: 49_344_000, revenue: 493_440_000 },
      { channel: "Website", commission: 0, payment: 2.5, fixed: 0, total: 3_000_000, revenue: 120_000_000 },
    ],
    employeeStats: [
      { name: "Nguyễn Văn A", role: "Đóng gói", orders: 3798, messages: 0, accuracy: 99.1, color: "#3b82f6" },
      { name: "Trần Thị B", role: "CSKH", orders: 0, messages: 2386, accuracy: 98.6, color: "#10b981" },
      { name: "Lê Văn C", role: "Đóng gói", orders: 3175, messages: 0, accuracy: 97.4, color: "#a855f7" },
      { name: "Phạm Thị D", role: "CSKH", orders: 0, messages: 1842, accuracy: 99.3, color: "#f59e0b" },
    ]
  }
};

const monthlyGrowth = [
  { month: "T12/2025", lastYear: 520_000_000, thisYear: 610_000_000 },
  { month: "T01/2026", lastYear: 480_000_000, thisYear: 590_000_000 },
  { month: "T02/2026", lastYear: 450_000_000, thisYear: 520_000_000 },
  { month: "T03/2026", lastYear: 580_000_000, thisYear: 847_200_000 },
];

const customerSegment = [
  { name: "Khách VIP", value: 15, color: "#f59e0b" },
  { name: "Thân thiết", value: 25, color: "#10b981" },
  { name: "Phổ thông", value: 30, color: "#3b82f6" },
  { name: "Khách mới", value: 20, color: "#ec4899" },
  { name: "Nguy cơ rời bỏ", value: 10, color: "#ef4444" },
];

const returnReasons = [
  { reason: "Kích ứng da / Dị ứng", count: 120, percent: 40 },
  { reason: "Bể vỡ / Tràn màng seal", count: 60, percent: 20 },
  { reason: "Giao sai màu son / loại", count: 90, percent: 30 },
  { reason: "Lý do khác", count: 30, percent: 10 },
];

const topCategories = [
  { name: "Chăm sóc da", revenue: 380_000_000, percent: 45, color: "#ec4899" },
  { name: "Trang điểm", revenue: 200_000_000, percent: 24, color: "#a855f7" },
  { name: "Nước hoa", revenue: 170_000_000, percent: 20, color: "#3b82f6" },
  { name: "Chăm sóc tóc", revenue: 97_200_000, percent: 11, color: "#10b981" },
];

// ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xl text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 flex-1">{p.name}:</span>
          <span className="font-semibold text-gray-800">
            {typeof p.value === "number" && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── COMPONENT ──────────────────────────────────────────────────────────────
export function Analytics() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState<"pl" | "channels" | "growth">("pl");
  const [period, setPeriod] = useState("Tháng 4/2026");

  const currentData = PERIOD_DATA[period] || PERIOD_DATA["Tháng 4/2026"];
  const { PL, channelFees, employeeStats } = currentData;

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSec = dark ? "text-gray-400" : "text-gray-500";
  const cardBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900";
  const divider = dark ? "border-gray-800" : "border-gray-100";
  const subtleBg = dark ? "bg-gray-800" : "bg-gray-50";

  const tabs = [
    { id: "pl", label: "Báo cáo kết quả kinh doanh", icon: DollarSign },
    { id: "channels", label: "Phí sàn TMĐT", icon: BarChart3 },
    { id: "growth", label: "Tăng trưởng", icon: TrendingUp },
  ];

  const tabAccent: Record<string, string> = {
    pl: "bg-pink-600",
    channels: "bg-orange-500",
    growth: "bg-blue-600",
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`font-bold text-xl ${textPrimary}`}>Báo cáo &amp; Phân tích</h1>
          <p className={`text-sm ${textSec}`}>{period} • Dữ liệu tổng hợp toàn kênh</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
          >
            <option>Tháng 4/2026</option>
            <option>Tháng 3/2026</option>
            <option>Q1/2026</option>
            <option>Năm 2026</option>
          </select>
          <button className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:block">Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* ── KPI SUMMARY ROW ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Doanh thu thuần", value: formatCurrency(PL.revenue), icon: DollarSign, color: "text-pink-600", bg: dark ? "bg-pink-950/30" : "bg-pink-50" },
          { label: "Lợi nhuận gộp", value: formatCurrency(PL.grossProfit), icon: TrendingUp, color: "text-green-600", bg: dark ? "bg-green-950/30" : "bg-green-50" },
          { label: "Phí sàn TMĐT", value: formatCurrency(PL.platformFees), icon: Percent, color: "text-orange-600", bg: dark ? "bg-orange-950/30" : "bg-orange-50" },
          { label: "Lợi nhuận ròng", value: formatCurrency(PL.netProfit), icon: Activity, color: "text-purple-600", bg: dark ? "bg-purple-950/30" : "bg-purple-50" },
        ].map((kpi, i) => (
          <div key={i} className={`p-4 lg:p-5 rounded-2xl border ${cardBg}`}>
            <div className={`text-sm font-bold mb-2 ${kpi.color}`}>
              {kpi.label}
            </div>
            <div className={`text-2xl font-bold ${textPrimary}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ─────────────────────────────────────────────────── */}
      <div className={`flex gap-1 p-1 rounded-xl ${dark ? "bg-gray-900 border border-gray-800" : "bg-gray-100"}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 flex-1 justify-center py-2 px-2 rounded-lg text-xs font-medium transition-all
              ${activeTab === tab.id
                ? `${tabAccent[tab.id]} text-white shadow-sm`
                : dark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB: P&L
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "pl" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* P&L Waterfall card */}
          <div className={`lg:col-span-3 rounded-2xl border p-5 ${cardBg}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className={`font-semibold ${textPrimary}`}>Báo cáo kết quả kinh doanh – {period}</h2>
                <p className={`text-xs mt-0.5 ${textSec}`}>Lợi nhuận &amp; Chi phí toàn kênh</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold border border-green-200">✓ Đang có lãi</span>
            </div>

            {/* Margin bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className={textSec}>Biên lợi nhuận ròng</span>
                <span className="font-bold text-pink-600">{PL.margin}%</span>
              </div>
              <div className={`h-2.5 rounded-full ${subtleBg} overflow-hidden`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                  style={{ width: `${PL.margin}%` }}
                />
              </div>
            </div>

            {/* P&L rows */}
            <div className="space-y-1.5">
              {[
                { label: "Doanh thu thuần", value: PL.revenue, type: "plus", indent: false },
                { label: "(-) Giá vốn hàng bán", value: PL.cogs, type: "minus", indent: false },
                { label: "= Lợi nhuận gộp", value: PL.grossProfit, type: "total", indent: false },
                { label: "(-) Phí sàn TMĐT", value: PL.platformFees, type: "minus", indent: true },
                { label: "(-) Chi phí vận chuyển", value: PL.shippingCost, type: "minus", indent: true },
                { label: "(-) Chi phí marketing", value: PL.marketingCost, type: "minus", indent: true },
                { label: "= Lợi nhuận ròng", value: PL.netProfit, type: "final", indent: false },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center py-2 border-b last:border-0 ${divider} ${row.indent ? "pl-5" : ""} ${row.type === "total" || row.type === "final" ? `rounded-lg px-3 ${subtleBg}` : ""}`}
                >
                  <span className={`text-sm ${row.type === "total" || row.type === "final" ? `font-semibold ${textPrimary}` : textSec}`}>
                    {row.label}
                  </span>
                  <span className={`text-sm font-semibold tabular-nums ${row.type === "final" ? "text-purple-600 text-base font-bold" :
                      row.type === "total" ? "text-green-600" :
                        row.type === "minus" ? "text-red-500" : "text-blue-600"
                    }`}>
                    {row.type === "minus" ? "-" : "+"}{formatVND(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Donut: Customer Segments */}
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
              <h3 className={`font-semibold mb-3 ${textPrimary}`}>Phân khúc khách hàng</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartPie>
                  <Pie
                    data={customerSegment}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={60}
                    dataKey="value"
                    paddingAngle={3}
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {customerSegment.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartPie>
              </ResponsiveContainer>
            </div>

            {/* Return reasons */}
            <div className={`rounded-2xl border p-5 ${cardBg} flex-1`}>
              <h3 className={`font-semibold mb-3 ${textPrimary}`}>Lý do hoàn/hủy đơn</h3>
              <div className="space-y-3">
                {returnReasons.map((r, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-xs ${textSec}`}>{r.reason}</span>
                      <span className={`text-xs font-semibold ${textPrimary}`}>{r.count} đơn ({r.percent}%)</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${subtleBg}`}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${r.percent}%`, background: ["#ec4899", "#a855f7", "#3b82f6", "#94a3b8"][i] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: CHANNEL FEES
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "channels" && (
        <div className="space-y-4">

          {/* Summary cards per channel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {channelFees.map((f, i) => {
              const feeRate = ((f.total / f.revenue) * 100).toFixed(1);
              const colors = ["#EE4D2D", "#010101", "#0F146D"];
              const bgs = [dark ? "from-orange-950/40 to-transparent" : "from-orange-50 to-white",
              dark ? "from-gray-800/70 to-transparent" : "from-gray-50 to-white",
              dark ? "from-indigo-950/40 to-transparent" : "from-indigo-50 to-white"];
              return (
                <div key={i} className={`rounded-2xl border p-4 bg-gradient-to-br ${bgs[i]} ${cardBg}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: colors[i] }} />
                    <span className={`text-sm font-semibold ${textPrimary}`}>{f.channel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className={`text-xs ${textSec} mb-0.5`}>Doanh thu kênh</div>
                      <div className={`text-sm font-bold ${textPrimary}`}>{formatCurrency(f.revenue)}</div>
                    </div>
                    <div>
                      <div className={`text-xs ${textSec} mb-0.5`}>Tổng phí sàn</div>
                      <div className="text-sm font-bold text-red-500">{formatCurrency(f.total)}</div>
                    </div>
                    <div>
                      <div className={`text-xs ${textSec} mb-0.5`}>Hoa hồng</div>
                      <div className={`text-sm font-medium ${textPrimary}`}>{f.commission}%</div>
                    </div>
                    <div>
                      <div className={`text-xs ${textSec} mb-0.5`}>% trên doanh thu</div>
                      <div className="text-sm font-bold text-orange-500">{feeRate}%</div>
                    </div>
                  </div>
                  <div className={`mt-3 h-1.5 rounded-full ${subtleBg}`}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${feeRate}%`, background: colors[i] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed table */}
          <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
            <div className={`px-5 py-3 border-b ${divider}`}>
              <h3 className={`font-semibold ${textPrimary}`}>Chi tiết phí sàn – {period}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${dark ? "border-gray-800 bg-gray-800/50" : "border-gray-100 bg-gray-50"}`}>
                    {["Sàn TMĐT", "Doanh thu kênh", "Hoa hồng (%)", "Phí thanh toán (%)", "Tổng phí", "% trên doanh thu kênh"].map(h => (
                      <th key={h} className={`p-3 text-left text-xs font-semibold ${textSec} whitespace-nowrap`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {channelFees.map(fee => {
                    const feePercent = ((fee.total / fee.revenue) * 100).toFixed(1);
                    return (
                      <tr key={fee.channel} className={`border-b last:border-0 ${dark ? "border-gray-800 hover:bg-gray-800" : "border-gray-50 hover:bg-gray-50"} transition-colors`}>
                        <td className={`p-3 font-semibold ${textPrimary}`}>{fee.channel}</td>
                        <td className={`p-3 text-sm font-medium ${dark ? "text-blue-400" : "text-blue-600"}`}>{formatVND(fee.revenue)}</td>
                        <td className={`p-3 text-sm ${textSec}`}>{fee.commission}%</td>
                        <td className={`p-3 text-sm ${textSec}`}>{fee.payment}%</td>
                        <td className="p-3 text-sm font-semibold text-red-500">{formatVND(fee.total)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`h-1.5 w-16 rounded-full ${subtleBg}`}>
                              <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(100, Number(feePercent))}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-orange-600">{feePercent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className={`border-t-2 ${dark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                    <td className={`p-3 font-bold ${textPrimary}`}>Tổng cộng</td>
                    <td className={`p-3 font-bold ${dark ? "text-blue-400" : "text-blue-600"}`}>{formatVND(channelFees.reduce((s, f) => s + f.revenue, 0))}</td>
                    <td colSpan={2} />
                    <td className="p-3 font-bold text-red-500">{formatVND(channelFees.reduce((s, f) => s + f.total, 0))}</td>
                    <td className="p-3 text-xs font-semibold text-orange-600">
                      {((channelFees.reduce((s, f) => s + f.total, 0) / channelFees.reduce((s, f) => s + f.revenue, 0)) * 100).toFixed(1)}% avg
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar chart */}
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>So sánh phí sàn vs doanh thu theo kênh</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={channelFees} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1F2937" : "#F3F4F6"} />
                <XAxis dataKey="channel" tick={{ fontSize: 12, fill: dark ? "#9CA3AF" : "#6B7280" }} />
                <YAxis tick={{ fontSize: 11, fill: dark ? "#9CA3AF" : "#6B7280" }} tickFormatter={v => formatCurrency(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="total" name="Tổng phí" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: GROWTH
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "growth" && (
        <div className="space-y-4">

          {/* Growth cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {monthlyGrowth.map((m, i) => {
              return (
                <div key={i} className={`p-4 rounded-2xl border ${cardBg}`}>
                  <div className={`text-xs font-medium mb-2 ${textSec}`}>{m.month}</div>
                  <div className={`text-lg font-bold ${textPrimary}`}>{formatCurrency(m.thisYear)}</div>
                  <div className={`text-xs mt-1 ${textSec}`}>Cùng kỳ: {formatCurrency(m.lastYear)}</div>
                </div>
              );
            })}
          </div>

          {/* Area chart */}
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`font-semibold ${textPrimary}`}>So sánh tăng trưởng – Năm 2026 vs 2025</h3>
                <p className={`text-xs mt-0.5 ${textSec}`}>So sánh doanh thu cùng kỳ năm ngoái</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyGrowth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="g26" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g25" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1F2937" : "#F3F4F6"} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: dark ? "#9CA3AF" : "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: dark ? "#9CA3AF" : "#6B7280" }} tickFormatter={v => formatCurrency(v)} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="thisYear" name="Năm 2026" stroke="#3b82f6" fill="url(#g26)" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} />
                <Area type="monotone" dataKey="lastYear" name="Năm 2025" stroke="#9ca3af" fill="url(#g25)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: "#9ca3af" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top categories */}
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Doanh thu theo danh mục sản phẩm</h3>
            <div className="space-y-3">
              {topCategories.map((cat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm font-medium ${textPrimary}`}>{cat.name}</span>
                      <span className={`text-sm font-semibold ${textPrimary}`}>{formatCurrency(cat.revenue)}</span>
                    </div>
                    <div className={`h-2 rounded-full ${subtleBg}`}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${cat.percent}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                  <span className={`text-xs font-semibold w-8 text-right ${textSec}`}>{cat.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
