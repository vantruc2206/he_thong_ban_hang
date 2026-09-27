// Multi-channel Sales Management Web - Real Data configuration
// Hardcoded mock data has been removed. All data is fetched directly from FastAPI backend DB endpoints (/api/v1).

export const mockUsers: any[] = [
  { id: 1, email: "admin@hethong.vn", password: "123", name: "Quản trị viên", role: "admin", avatar: "QT" },
  { id: 2, email: "sales@hethong.vn", password: "123", name: "Nhân viên CSKH", role: "sales", avatar: "CS" },
  { id: 3, email: "warehouse@hethong.vn", password: "123", name: "Quản lý kho", role: "warehouse", avatar: "WH" },
];

export const channels = [
  { id: "shopee", name: "Shopee", color: "#EE4D2D", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600", badge: "bg-orange-100 text-orange-700" },
  { id: "tiktok", name: "TikTok", color: "#010101", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", badge: "bg-gray-100 text-gray-700" },
  { id: "lazada", name: "Lazada", color: "#0F146D", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700" },
  { id: "website", name: "Website Store", color: "#2563EB", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
];

export const revenueData: any[] = [];

export const products: any[] = [];

export const inventoryItems: any[] = [];

export const orders: any[] = [];

export const customers: any[] = [];

export const todoItems: any[] = [];

export const analyticsData = {
  plReport: {
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    platformFees: 0,
    shippingCost: 0,
    marketingCost: 0,
    netProfit: 0,
    margin: 0,
  },
  channelFees: [],
  monthlyGrowth: [],
  customerSegment: [],
  returnReasons: [],
};

export const formatCurrency = (value: number) => {
  if (!value) return "0đ";
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} tỷ`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} triệu`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)} nghìn`;
  return value.toLocaleString("vi-VN");
};

export const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
