import { useState, useEffect, useRef } from "react";
import {
  Plus, Search, Filter, Edit3, Copy, Trash2, Eye, Tag, Package,
  CheckCircle, XCircle, AlertCircle, Upload, Download, ChevronDown,
  Grid, List, BarChart2, Image, Barcode, Loader2
} from "lucide-react";
import { formatVND } from "../../data/mockData";
import { useTheme } from "../Layout";
import {
  getProducts, createProduct, updateProduct, deleteProduct, uploadProductImage,
  type Product
} from "../../../lib/services/productService";
import { getCategories, Category as DynamicCategory } from "../../../lib/services/categoryService";

const categories = ["Tất cả", "Chăm sóc da", "Trang điểm", "Chăm sóc tóc", "Nước hoa"];
const channelIcons: Record<string, { label: string; color: string; name: string }> = {
  shopee: { label: "S", color: "bg-orange-500", name: "Shopee" },
  tiktok: { label: "T", color: "bg-black", name: "TikTok Shop" },
  lazada: { label: "L", color: "bg-indigo-600", name: "Lazada" },
  website: { label: "W", color: "bg-blue-500", name: "Website" },
};

type ProductForm = {
  sku: string; name: string; category: string; category_id?: number;
  sell_price: number; cost_price: number;
  brand_name: string; skin_type: string;
  dynamicAttributes: Record<string, string>;
  channelConfig: Record<string, { status: string; reason?: string }>;
  img_url?: string;
};

export function Products() {
  const { dark } = useTheme();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("Tất cả");
  const [skinTypeFilter, setSkinTypeFilter] = useState("Tất cả");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [stockStatus, setStockStatus] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [pendingImgUrl, setPendingImgUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPrice, setBulkPrice] = useState(0);

  const defaultChannelConfig = {
    shopee: { status: "active" },
    tiktok: { status: "active" },
    lazada: { status: "active" },
    website: { status: "active" }
  };

  // Form state
  const [form, setForm] = useState<ProductForm>({
    sku: "", name: "", category: "Chăm sóc da", category_id: undefined,
    sell_price: 0, cost_price: 0,
    brand_name: "", skin_type: "",
    dynamicAttributes: {},
    channelConfig: defaultChannelConfig
  });

  const [dbCategories, setDbCategories] = useState<DynamicCategory[]>([]);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    const [data, cats] = await Promise.all([getProducts(), getCategories()]);
    setAllProducts(data);
    setDbCategories(cats);
    setLoading(false);
  }

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSec = dark ? "text-gray-400" : "text-gray-500";
  const cardBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const rowHover = dark ? "hover:bg-gray-800" : "hover:bg-gray-50";
  const inputBg = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";

  const filtered = allProducts.filter((p) => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Tất cả" || p.category === category || (p.category_id && dbCategories.find(c => c.id === p.category_id)?.name === category);
    const matchStatus = statusFilter === "all" ||
      (p.channelConfig && Object.values(p.channelConfig).some(c => c?.status === statusFilter)) ||
      (!p.channelConfig && p.status === statusFilter);
    const matchBrand = brandFilter === "Tất cả" || p.brand_name === brandFilter;
    const matchSkinType = skinTypeFilter === "Tất cả" || p.skin_type === skinTypeFilter;
    
    const pMin = minPrice ? Number(minPrice) : 0;
    const pMax = maxPrice ? Number(maxPrice) : Infinity;
    const matchPrice = p.sell_price >= pMin && p.sell_price <= pMax;

    const s = p.stock || 0;
    const matchStock = stockStatus === "all" ||
      (stockStatus === "in_stock" && s > 0) ||
      (stockStatus === "low_stock" && s > 0 && s < 50) ||
      (stockStatus === "out_of_stock" && s <= 0);

    return matchSearch && matchCat && matchStatus && matchBrand && matchSkinType && matchPrice && matchStock;
  });

  const availableBrands = ["Tất cả", ...Array.from(new Set(allProducts.map(p => p.brand_name).filter(Boolean))) as string[]];
  const availableSkinTypes = ["Tất cả", ...Array.from(new Set(allProducts.map(p => p.skin_type).filter(Boolean))) as string[]];

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    const url = await uploadProductImage(file, editProduct?.id ?? "new");
    setPendingImgUrl(url);
    setUploadingImg(false);
  }

  async function handleSave() {
    setSaving(true);
    // Explicitly fallback to existing img_url if pendingImgUrl is not set.
    const finalImgUrl = pendingImgUrl ? pendingImgUrl : editProduct?.img_url;
    const channelsMap = Object.fromEntries(
      Object.entries(form.channelConfig).map(([ch]) => [ch, true])
    );
    const matchedCat = dbCategories.find(c => c.id === form.category_id || c.name === form.category);
    const finalCategoryId = form.category_id || matchedCat?.id || 1;

    const allowedCodes = new Set(
      matchedCat?.category_attributes?.map((ca: any) => ca.attribute?.code).filter(Boolean) || []
    );
    allowedCodes.add("brand_name");
    allowedCodes.add("skin_type");

    const cleanedDynamicAttrs: Record<string, any> = {};
    if (form.dynamicAttributes) {
      Object.keys(form.dynamicAttributes).forEach(k => {
        if (allowedCodes.has(k) && form.dynamicAttributes[k] !== undefined && form.dynamicAttributes[k] !== "") {
          cleanedDynamicAttrs[k] = form.dynamicAttributes[k];
        }
      });
    }
    if (form.brand_name) cleanedDynamicAttrs["brand_name"] = form.brand_name;
    if (form.skin_type) cleanedDynamicAttrs["skin_type"] = form.skin_type;

    const payload = {
      ...form,
      category_id: finalCategoryId,
      img_url: finalImgUrl,
      channels: channelsMap,
      dynamicAttributes: cleanedDynamicAttrs
    };
    if (editProduct) {
      await updateProduct(editProduct.id, { ...payload, sell_price: payload.sell_price, cost_price: payload.cost_price } as any);
    } else {
      await createProduct(payload as any);
    }
    await loadProducts();
    setSaving(false);
    setShowAddModal(false);
    setEditProduct(null);
    setPendingImgUrl(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa sản phẩm này?")) return;
    await deleteProduct(id);
    setAllProducts(prev => prev.filter(p => p.id !== id));
    setSelected(prev => prev.filter(i => i !== id));
  }

  async function handleCopy(p: Product) {
    const copy = {
      ...p,
      sku: p.sku + "-COPY",
      name: p.name + " (Bản sao)",
    };
    const created = await createProduct(copy as any);
    if (created) setAllProducts(prev => [created, ...prev]);
  }

  async function handleBulkDelete() {
    if (!confirm(`Xóa ${selected.length} sản phẩm đã chọn?`)) return;
    for (const id of selected) {
      await deleteProduct(id);
    }
    setAllProducts(prev => prev.filter(p => !selected.includes(p.id)));
    setSelected([]);
  }

  async function handleBulkPriceUpdate() {
    setSaving(true);
    for (const id of selected) {
      await updateProduct(id, { sell_price: bulkPrice });
    }
    await loadProducts();
    setSaving(false);
    setShowBulkPriceModal(false);
    setSelected([]);
  }

  const syncStatusBadge = (s?: string) => {
    if (s === "synced") return <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Đồng bộ</span>;
    if (s === "error") return <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />Lỗi</span>;
    return <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" />Chờ</span>;
  };

  function openAdd() {
    const firstCat = dbCategories.length > 0 ? dbCategories[0] : null;
    setForm({
      sku: "", name: "",
      category: firstCat ? firstCat.name : "Chăm sóc da",
      category_id: firstCat ? firstCat.id : undefined,
      sell_price: 0, cost_price: 0,
      brand_name: "", skin_type: "",
      dynamicAttributes: {},
      channelConfig: defaultChannelConfig
    });
    setPendingImgUrl(null);
    setShowAddModal(true);
  }

  function openEdit(p: Product) {
    const catObj = p.category_id ? dbCategories.find(c => c.id === p.category_id) : dbCategories.find(c => c.name === p.category);
    setForm({
      sku: p.sku, name: p.name,
      category: p.category ?? catObj?.name ?? "Chăm sóc da",
      category_id: p.category_id ?? catObj?.id,
      sell_price: p.sell_price, cost_price: p.cost_price,
      brand_name: p.brand_name || p.dynamicAttributes?.brand_name || "",
      skin_type: p.skin_type || p.dynamicAttributes?.skin_type || "",
      dynamicAttributes: p.dynamicAttributes || {},
      channelConfig: p.channelConfig || defaultChannelConfig,
    });
    setPendingImgUrl(null);
    setEditProduct(p);
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`font-bold text-xl ${textPrimary}`}>Quản lý sản phẩm</h1>
          <p className={`text-sm ${textSec}`}>{allProducts.length} sản phẩm • Đăng đa kênh tập trung</p>
        </div>
        <div className="flex gap-2">
          <button className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"} transition-colors`}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:block">Xuất</span>
          </button>
          <button className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"} transition-colors`}>
            <Upload className="w-4 h-4" />
            <span className="hidden sm:block">Nhập</span>
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      {/* Stats as Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: "all", label: "Tất cả", value: allProducts.length, icon: Package, color: "text-blue-500" },
          { id: "active", label: "Đang hoạt động", value: allProducts.filter(p => (p.channelConfig && Object.values(p.channelConfig).some(c => c?.status === "active")) || (!p.channelConfig && p.status === "active")).length, icon: CheckCircle, color: "text-green-500" },
          { id: "inactive", label: "Tạm dừng", value: allProducts.filter(p => (p.channelConfig && Object.values(p.channelConfig).some(c => c?.status === "inactive")) || (!p.channelConfig && p.status === "inactive")).length, icon: XCircle, color: "text-gray-400" },
          { id: "violation", label: "Vi phạm", value: allProducts.filter(p => (p.channelConfig && Object.values(p.channelConfig).some(c => c?.status === "violation")) || (!p.channelConfig && p.status === "violation")).length, icon: AlertCircle, color: "text-red-500" },
          { id: "pending", label: "Chờ duyệt", value: allProducts.filter(p => (p.channelConfig && Object.values(p.channelConfig).some(c => c?.status === "pending")) || (!p.channelConfig && p.status === "pending")).length, icon: Package, color: "text-yellow-500" },
        ].map((s, i) => (
          <button
            key={i}
            onClick={() => setStatusFilter(s.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${statusFilter === s.id
                ? dark ? "border-pink-500 bg-pink-900/20" : "border-pink-500 bg-pink-50"
                : cardBg
              } ${rowHover}`}
          >
            <s.icon className={`w-5 h-5 flex-shrink-0 ${s.color}`} />
            <div>
              <div className={`font-bold text-lg ${textPrimary}`}>{s.value}</div>
              <div className={`text-xs ${textSec} truncate`}>{s.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className={`rounded-2xl border p-4 ${cardBg}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border ${inputBg}`}>
            <Search className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm tên sản phẩm, SKU, barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                showAdvancedFilters 
                  ? "bg-pink-600 border-pink-600 text-white" 
                  : dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:block">Lọc nâng cao</span>
            </button>
            <div className={`flex rounded-xl border overflow-hidden ${dark ? "border-gray-700" : "border-gray-200"}`}>
              <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-pink-600 text-white" : dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-50"}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-pink-600 text-white" : dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-50"}`}>
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className={`mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${dark ? "border-gray-800" : "border-gray-100"}`}>
            <div>
              <label className={`block text-xs font-semibold mb-2 ${textSec}`}>Thương hiệu</label>
              <select
                value={brandFilter}
                onChange={e => setBrandFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
              >
                {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-2 ${textSec}`}>Loại da / Tóc phù hợp</label>
              <select
                value={skinTypeFilter}
                onChange={e => setSkinTypeFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
              >
                {availableSkinTypes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-2 ${textSec}`}>Giá bán (Min - Max)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                />
                <span className={textSec}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-2 ${textSec}`}>Tình trạng kho</label>
              <select
                value={stockStatus}
                onChange={e => setStockStatus(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
              >
                <option value="all">Tất cả</option>
                <option value="in_stock">Còn hàng</option>
                <option value="low_stock">Sắp hết hàng (&lt;50)</option>
                <option value="out_of_stock">Hết hàng</option>
              </select>
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <button 
                onClick={() => { 
                  setBrandFilter("Tất cả"); 
                  setSkinTypeFilter("Tất cả"); 
                  setCategory("Tất cả"); 
                  setSearch(""); 
                  setMinPrice(""); 
                  setMaxPrice(""); 
                  setStockStatus("all"); 
                }}
                className="px-4 py-2 text-xs font-medium text-pink-600 hover:bg-pink-50 rounded-xl transition-colors border border-transparent hover:border-pink-200"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === c
                  ? "bg-pink-600 text-white"
                  : dark ? "bg-gray-800 text-gray-400 hover:text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${dark ? "bg-blue-950/30 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
          <span className={`text-sm font-medium ${dark ? "text-blue-300" : "text-blue-700"}`}>Đã chọn {selected.length} sản phẩm</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => { setBulkPrice(0); setShowBulkPriceModal(true); }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Sửa giá hàng loạt</button>
            <button onClick={() => setSelected([])} className="px-3 py-1.5 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600">Bỏ chọn</button>
            <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">Xóa</button>
          </div>
        </div>
      )}

      {/* loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Products Table */}
      {!loading && viewMode === "list" ? (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${dark ? "border-gray-800 bg-gray-800/50" : "border-gray-100 bg-gray-50"}`}>
                  <th className="p-3 text-left">
                    <input type="checkbox" onChange={e => setSelected(e.target.checked ? allProducts.map(p => p.id) : [])} className="rounded" />
                  </th>
                  <th className={`p-3 text-left text-xs font-semibold ${textSec}`}>Sản phẩm</th>
                  <th className={`p-3 text-left text-xs font-semibold ${textSec} hidden lg:table-cell`}>SKU</th>
                  <th className={`p-3 text-left text-xs font-semibold ${textSec}`}>Giá bán</th>
                  <th className={`p-3 text-left text-xs font-semibold ${textSec} hidden md:table-cell`}>Tồn kho khả dụng</th>
                  <th className={`p-3 text-left text-xs font-semibold ${textSec} hidden xl:table-cell`}>Đã bán</th>
                  <th className={`p-3 text-left text-xs font-semibold ${textSec} hidden sm:table-cell`}>Kênh bán</th>
                  <th className={`p-3 text-left text-xs font-semibold ${textSec} hidden lg:table-cell`}>Đồng bộ</th>
                  <th className={`p-3 text-left text-xs font-semibold ${textSec}`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  // Giả lập lấy Tồn kho khả dụng (Available = Total - Pending) từ Kho cho SKU tương ứng, hoặc dùng stock mặc định
                  // Thực tế sẽ join từ database, ở đây dùng mock logic để minh họa
                  const invItem = (window as any).__MOCK_INVENTORY__?.find((inv: any) => inv.sku === p.sku);
                  const availableStock = invItem ? invItem.available : (p.stock ?? 0);
                  
                  return (
                  <tr key={p.id} className={`border-b last:border-0 ${dark ? "border-gray-800" : "border-gray-50"} ${rowHover} transition-colors`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={(p as any).img_url || (p as any).img || ""}
                          alt={p.name}
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                          style={{ border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e5e7ef" }}
                          onError={e => { const t = e.currentTarget; t.style.display = 'none'; (t.nextElementSibling as HTMLElement).style.display = 'flex'; }}
                        />
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${dark ? "bg-gray-800" : "bg-gray-100"}`} style={{ display: 'none' }}>
                          <Image className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${textPrimary}`}>{p.name}</div>
                          <div className={`text-xs ${textSec}`}>{p.category} • {(p as any).brand_name || "Lana Beauty"} • {(p as any).skin_type || "Mọi loại da"}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`p-3 hidden lg:table-cell`}>
                      <span className={`text-xs font-mono px-2 py-1 rounded-lg ${dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                        {p.sku}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className={`text-sm font-semibold ${textPrimary}`}>{formatVND(p.sell_price)}</div>
                      <div className={`text-xs ${textSec}`}>Vốn: {formatVND(p.cost_price)}</div>
                    </td>
                    <td className={`p-3 hidden md:table-cell`}>
                      <span className={`text-sm font-medium ${availableStock < 30 ? "text-red-500" : availableStock < 60 ? "text-yellow-500" : "text-green-500"}`}>
                        {availableStock}
                      </span>
                      <span className={`text-xs ${textSec}`}> đơn vị</span>
                    </td>
                    <td className={`p-3 hidden xl:table-cell`}>
                      {p.status === "active" ? (
                        <>
                          <div className={`text-sm font-medium ${textPrimary}`}>{p.sold_this_month || 0}</div>
                          <div className={`text-xs ${textSec}`}>sản phẩm</div>
                        </>
                      ) : (
                        <div className={`text-sm ${textSec}`}>—</div>
                      )}
                    </td>
                    <td className={`p-3 hidden sm:table-cell`}>
                      <div className="flex gap-1.5">
                        {Object.entries(channelIcons).map(([ch]) => {
                          const channelsMap = p.channels ?? {};
                          const config = p.channelConfig?.[ch];

                          // If it has channelConfig, it is listed according to channelConfig.
                          // If no channelConfig (legacy), defer to channelsMap.
                          // If neither, default to unlisted.
                          const isListed = config ? true : (ch in channelsMap ? channelsMap[ch] !== false : false);

                          if (!isListed) return null;

                          const status = config?.status || (p.status || "active");
                          const isViolating = status === "violation";
                          const isPending = status === "pending";
                          const isInactive = status === "inactive";
                          const isActive = status === "active";

                          let extraClasses = "";
                          if (isActive) {
                            extraClasses = "opacity-100";
                          } else {
                            extraClasses = "opacity-60";
                            if (isInactive) extraClasses += " ring-2 ring-gray-500 ring-offset-1";
                            else if (isViolating) extraClasses += " ring-2 ring-red-500 ring-offset-1";
                            else if (isPending) extraClasses += " ring-2 ring-yellow-400 ring-offset-1";
                          }

                          return (
                            <div key={ch} className="relative group">
                              <div
                                className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold transition-all
                                  ${channelIcons[ch].color} ${extraClasses}`}
                              >
                                {channelIcons[ch].label}
                              </div>
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-gray-900 text-white text-xs rounded-lg py-1.5 px-2.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                <div className="font-semibold mb-0.5">{channelIcons[ch].name}</div>
                                {!isListed && <span className="text-gray-400">Chưa đăng bán</span>}
                                {isViolating && <span className="text-red-400">Vi phạm: {config?.reason || "Không rõ lý do"}</span>}
                                {isPending && <span className="text-yellow-400">Tình trạng: Kiểm duyệt...</span>}
                                {isActive && <span className="text-green-400">Đang hoạt động bình thường</span>}
                                {isInactive && <span className="text-gray-400">Trạng thái: Tạm dừng</span>}
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className={`p-3 hidden lg:table-cell`}>
                      {syncStatusBadge(p.sync_status)}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className={`p-1.5 rounded-lg transition-colors ${dark ? "text-gray-400 hover:bg-gray-700 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleCopy(p)} className={`p-1.5 rounded-lg transition-colors ${dark ? "text-gray-400 hover:bg-gray-700 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`} title="Nhân đôi sản phẩm">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className={`p-1.5 rounded-lg transition-colors text-gray-400 hover:bg-red-50 hover:text-red-500`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className={`text-center py-12 ${textSec}`}>
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Không tìm thấy sản phẩm nào</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(p => (
            <div key={p.id} onClick={() => openEdit(p)} className={`rounded-2xl border p-4 ${cardBg} ${rowHover} transition-colors cursor-pointer`}>
              <div className={`w-full aspect-square rounded-xl mb-3 overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
                {(p as any).img_url || (p as any).img
                  ? <img src={(p as any).img_url || (p as any).img} alt={p.name} className="w-full h-full object-cover" />
                  : <Image className="w-10 h-10 text-gray-300 m-auto" />}
              </div>
              <div className={`text-xs font-mono mb-1 ${textSec}`}>{p.sku}</div>
              <div className={`text-sm font-medium mb-1 ${textPrimary} line-clamp-2`}>{p.name}</div>
              <div className={`text-sm font-bold ${textPrimary}`}>{formatVND(p.sell_price)}</div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${(p.stock ?? 0) < 30 ? "text-red-500 font-medium" : textSec}`}>Kho: {p.stock ?? 0}</span>
                {syncStatusBadge(p.sync_status)}
              </div>
              <div className="flex gap-1.5 mt-2">
                {Object.entries(channelIcons).map(([ch]) => {
                  const channelsMap = p.channels ?? {};
                  const config = p.channelConfig?.[ch];

                  const isListed = config ? true : (ch in channelsMap ? channelsMap[ch] !== false : false);
                  if (!isListed) return null;

                  const status = config?.status || (p.status || "active");
                  const isViolating = status === "violation";
                  const isPending = status === "pending";
                  const isInactive = status === "inactive";
                  const isActive = status === "active";

                  let extraClasses = "";
                  if (isActive) {
                    extraClasses = "opacity-100";
                  } else {
                    extraClasses = "opacity-60";
                    if (isInactive) extraClasses += " ring-2 ring-gray-500 ring-offset-1";
                    else if (isViolating) extraClasses += " ring-2 ring-red-500 ring-offset-1";
                    else if (isPending) extraClasses += " ring-2 ring-yellow-400 ring-offset-1";
                  }

                  return (
                    <div key={ch} className="relative group">
                      <div className={`w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold transition-all ${channelIcons[ch].color} ${extraClasses}`}>
                        {channelIcons[ch].label}
                      </div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-gray-900 text-white text-xs rounded-lg py-1.5 px-2.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        <div className="font-semibold mb-0.5">{channelIcons[ch].name}</div>
                        {!isListed && <span className="text-gray-400">Chưa đăng bán</span>}
                        {isViolating && <span className="text-red-400">Vi phạm: {config?.reason || "Không rõ lý do"}</span>}
                        {isPending && <span className="text-yellow-400">Tình trạng: Kiểm duyệt...</span>}
                        {isActive && <span className="text-green-400">Đang hoạt động bình thường</span>}
                        {isInactive && <span className="text-gray-400">Trạng thái: Tạm dừng</span>}
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editProduct) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className={`flex items-center justify-between p-5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <h2 className={`font-semibold ${textPrimary}`}>{editProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
              <button onClick={() => { setShowAddModal(false); setEditProduct(null); }} className={`p-1 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"}`}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Image upload */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${textSec}`}>Ảnh sản phẩm</label>
                <div className="flex gap-3 items-center">
                  {(pendingImgUrl || editProduct?.img_url) ? (
                    <img key="preview-img" src={pendingImgUrl || editProduct?.img_url} alt="preview"
                      className="w-16 h-16 rounded-xl object-cover border" />
                  ) : null}
                  <button
                    key="upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImg}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    {uploadingImg
                      ? <Loader2 key="loader" className="w-4 h-4 animate-spin" />
                      : <Upload key="upload" className="w-4 h-4" />
                    }
                    <span key="btn-text">{uploadingImg ? "Đang upload..." : "Chọn ảnh"}</span>
                  </button>
                  <input
                    key="file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    onClick={(e) => {
                      // Reset value so onChange triggers again for the same file
                      (e.target as HTMLInputElement).value = '';
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Tên sản phẩm *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    type="text" placeholder="Nhập tên sản phẩm" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Mã SKU *</label>
                  <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    type="text" placeholder="VD: AO-POLO-001" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Giá bán</label>
                  <input value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: Number(e.target.value) }))}
                    type="number" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Giá vốn</label>
                  <input value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: Number(e.target.value) }))}
                    type="number" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                </div>
                 <div>
                  <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Danh mục</label>
                  <select
                    value={form.category}
                    onChange={e => {
                      const catName = e.target.value;
                      const matchedCat = dbCategories.find(c => c.name === catName);
                      const allowedCodes = new Set(
                        matchedCat?.category_attributes?.map(ca => ca.attribute?.code).filter(Boolean) || []
                      );
                      allowedCodes.add("brand_name");
                      allowedCodes.add("skin_type");

                      setForm(f => {
                        const cleanedAttrs: Record<string, any> = {};
                        Object.keys(f.dynamicAttributes || {}).forEach(k => {
                          if (allowedCodes.has(k)) {
                            cleanedAttrs[k] = f.dynamicAttributes[k];
                          }
                        });
                        return {
                          ...f,
                          category: catName,
                          category_id: matchedCat?.id,
                          dynamicAttributes: cleanedAttrs
                        };
                      });
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                  >
                    {dbCategories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Thương hiệu</label>
                  <input value={form.brand_name} onChange={e => setForm(f => ({ ...f, brand_name: e.target.value, dynamicAttributes: { ...f.dynamicAttributes, brand_name: e.target.value } }))}
                    type="text" placeholder="VD: Lana Beauty" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Loại da / Tóc phù hợp</label>
                  <input value={form.skin_type} onChange={e => setForm(f => ({ ...f, skin_type: e.target.value, dynamicAttributes: { ...f.dynamicAttributes, skin_type: e.target.value } }))}
                    type="text" placeholder="VD: Da dầu, Tóc khô..." className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                </div>
              </div>

              {/* Dynamic Category Attributes Section */}
              {(() => {
                const selectedCatObj = dbCategories.find(c => c.id === form.category_id || c.name === form.category);
                const catAttrs = selectedCatObj?.category_attributes || [];
                return (
                  <div className={`mt-4 pt-4 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <label className={`block text-xs font-semibold ${textPrimary}`}>
                        Thuộc tính danh mục: <span className="text-pink-600 font-bold">{selectedCatObj?.name || form.category}</span>
                      </label>
                      <span className="text-[11px] text-gray-400 font-medium">({catAttrs.length} thuộc tính động)</span>
                    </div>
                    {catAttrs.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {catAttrs.map(ca => {
                          const attr = ca.attribute;
                          if (!attr) return null;
                          const attrCode = attr.code;
                          // Avoid duplicating fixed brand_name / skin_type inputs if already rendered above
                          if (attrCode === "brand_name" || attrCode === "skin_type") return null;

                          return (
                            <div key={attr.id}>
                              <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>
                                {attr.name} {ca.is_required && <span className="text-red-500">*</span>}
                              </label>
                              <input
                                type={attr.data_type === "number" ? "number" : "text"}
                                value={form.dynamicAttributes[attrCode] ?? ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  setForm(f => ({
                                    ...f,
                                    dynamicAttributes: {
                                      ...f.dynamicAttributes,
                                      [attrCode]: val
                                    }
                                  }));
                                }}
                                placeholder={`VD: 36, 37, 38 hoặc Đỏ, Xanh...`}
                                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                              />
                              <p className="text-[10px] text-gray-400 mt-1">
                                💡 Nhập nhiều giá trị phân cách bằng dấu phẩy (VD: 36, 37, 38 hoặc Đỏ, Xanh)
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`p-3 rounded-xl border border-dashed text-xs text-center ${dark ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-500"}`}>
                        Danh mục này chưa gắn thêm thuộc tính động trong <span className="font-semibold text-pink-600">Danh mục & Thuộc tính</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Channel Config */}
              <div className={`mt-4 pt-4 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
                <label className={`block text-xs font-semibold mb-3 ${textPrimary}`}>Cấu hình trạng thái đa kênh</label>
                <div className="space-y-3">
                  {Object.entries(channelIcons).map(([ch, info]) => {
                    const cConfig = form.channelConfig[ch] || { status: "active" };
                    return (
                      <div key={ch} className={`p-3 rounded-xl border flex items-center gap-3 ${inputBg}`}>
                        <div className={`w-8 h-8 rounded-full text-white text-sm flex items-center justify-center font-bold flex-shrink-0 ${info.color}`}>
                          {info.label}
                        </div>
                        <div className="flex-1 font-medium text-sm w-24 truncate">{info.name}</div>

                        <select
                          value={cConfig.status}
                          onChange={e => setForm(f => ({
                            ...f,
                            channelConfig: {
                              ...f.channelConfig,
                              [ch]: { ...f.channelConfig[ch], status: e.target.value }
                            }
                          }))}
                          className={`px-3 py-1.5 rounded-lg border text-sm outline-none ${dark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                        >
                          <option value="active">Đang bán</option>
                          <option value="inactive">Tạm dừng</option>
                          <option value="violation">Vi phạm</option>
                          <option value="pending">Chờ duyệt</option>
                        </select>

                        {cConfig.status === "violation" && (
                          <input
                            type="text"
                            placeholder="Nhập lý do vi phạm..."
                            value={cConfig.reason || ""}
                            onChange={e => setForm(f => ({
                              ...f,
                              channelConfig: {
                                ...f.channelConfig,
                                [ch]: { ...f.channelConfig[ch], reason: e.target.value }
                              }
                            }))}
                            className={`flex-1 px-3 py-1.5 rounded-lg border text-sm outline-none ${dark ? "bg-gray-900 border-red-900/50 text-red-200 placeholder-red-800" : "bg-red-50 border-red-200 text-red-700 placeholder-red-300"}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className={`flex gap-3 p-5 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <button onClick={() => { setShowAddModal(false); setEditProduct(null); }}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                Hủy
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editProduct ? "Cập nhật" : "Thêm & Đồng bộ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Price Edit Modal */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-sm ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className={`flex items-center justify-between p-5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <h2 className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Sửa giá hàng loạt</h2>
              <button onClick={() => setShowBulkPriceModal(false)} className={`p-1 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"}`}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Áp dụng cho <strong>{selected.length}</strong> sản phẩm đã chọn</p>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Giá bán mới (VND)</label>
                <input
                  type="number"
                  value={bulkPrice}
                  onChange={e => setBulkPrice(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                  placeholder="Nhập giá mới..."
                />
              </div>
            </div>
            <div className={`flex gap-3 p-5 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <button onClick={() => setShowBulkPriceModal(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>Hủy</button>
              <button onClick={handleBulkPriceUpdate} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Cập nhật giá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
