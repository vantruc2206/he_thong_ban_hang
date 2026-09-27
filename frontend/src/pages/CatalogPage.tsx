import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Search, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, Category, api } from '../services/api';
import { ProductCard } from '../components/ProductCard';

interface CatalogPageProps {
  categories: Category[];
  onSelectProduct: (product: Product) => void;
  onQuickAddToCart: (product: Product) => void;
  initialSearch?: string;
}

const SORT_OPTIONS = [
  { value: 'default', label: 'Nổi bật nhất' },
  { value: 'price_asc', label: 'Giá: Thấp đến Cao' },
  { value: 'price_desc', label: 'Giá: Cao đến Thấp' },
  { value: 'name_asc', label: 'Tên: A → Z' },
];

export const CatalogPage: React.FC<CatalogPageProps> = ({
  categories,
  onSelectProduct,
  onQuickAddToCart,
  initialSearch = '',
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategories, setActiveCategories] = useState<Category[]>(categories);

  // UI state
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [sortBy, setSortBy] = useState('default');
  const [sortOpen, setSortOpen] = useState(false);

  // Collapsible filter sections
  const [catOpen, setCatOpen] = useState(true);
  const [attrOpen, setAttrOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);

  // Filter state
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [attrKey, setAttrKey] = useState<string>('');
  const [attrValue, setAttrValue] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  useEffect(() => {
    api.getCategories().then(cats => {
      if (cats && cats.length > 0) setActiveCategories(cats);
    }).catch(console.error);
  }, [categories]);

  const fetchFilteredProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({
        category_id: selectedCategory,
        search: search || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        attr_key: attrKey || undefined,
        attr_value: attrValue || undefined,
      });
      setProducts(data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách sản phẩm:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSearch) {
      const matchedCat = activeCategories.find(
        (c) => c.name.toLowerCase() === initialSearch.toLowerCase()
      );
      if (matchedCat) {
        setSelectedCategory(matchedCat.id);
        setSearch('');
      } else {
        setSearch(initialSearch);
      }
    } else {
      setSearch('');
    }
  }, [initialSearch, activeCategories]);

  useEffect(() => {
    fetchFilteredProducts();
  }, [search, selectedCategory, attrKey, attrValue]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredProducts();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory(undefined);
    setAttrKey('');
    setAttrValue('');
    setMinPrice('');
    setMaxPrice('');
    api.getProducts().then(setProducts);
  };

  const getDynamicAttributeOptions = (attrCode: string): string[] => {
    const extracted = new Set<string>();
    const codeLower = attrCode.toLowerCase();
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.attributes) {
          Object.entries(v.attributes).forEach(([k, val]) => {
            if (k.toLowerCase() === codeLower && val !== undefined && val !== null) {
              const rawVal = String(val);
              rawVal.split(/[,;/]+/).map((s) => s.trim()).filter(Boolean).forEach((vItem) => extracted.add(vItem));
            }
          });
        }
      });
    });
    return Array.from(extracted).filter(Boolean);
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price_asc') return (a.base_price || 0) - (b.base_price || 0);
    if (sortBy === 'price_desc') return (b.base_price || 0) - (a.base_price || 0);
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    return 0;
  });

  const selectedCatObj = activeCategories.find((c) => c.id === selectedCategory);
  const catAttrs = selectedCatObj?.category_attributes || [];

  const pageTitle = selectedCatObj ? selectedCatObj.name : 'Tất cả sản phẩm';

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* Full-width Hero Banner */}
      <div className="relative w-full overflow-hidden" style={{ height: 320 }}>
        <img
          src="/images/catalog_hero_banner.png"
          alt="Catalog Hero"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
      </div>

      {/* Nike-style Toolbar: Title + Count | Sort + Hide Filters */}
      <div className="flex items-center justify-between py-4 border-b border-[#e5e5e5]">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-black text-[#111111]">{pageTitle}</h1>
          <span className="text-sm text-[#707072]">({sortedProducts.length})</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 text-sm font-bold text-[#111111] hover:text-[#707072] transition-colors cursor-pointer"
            >
              Sắp xếp {sortOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-8 bg-white border border-[#e5e5e5] rounded-xl shadow-xl z-50 min-w-[180px] overflow-hidden">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                      sortBy === opt.value ? 'bg-[#111111] text-white font-bold' : 'text-[#111111] hover:bg-[#f5f5f5]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hide/Show Filters */}
          <button
            onClick={() => setFiltersVisible(!filtersVisible)}
            className="flex items-center gap-2 text-sm font-bold text-[#111111] hover:text-[#707072] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {filtersVisible ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </button>
        </div>
      </div>

      {/* Main Content: optional sidebar + product grid */}
      <div className={`flex gap-8 py-6 items-start`}>

        {/* Left Sidebar — collapsible like Nike */}
        {filtersVisible && (
          <aside className="w-60 shrink-0 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar space-y-0">

            {/* Search */}
            <div className="pb-5 border-b border-[#e5e5e5]">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Tìm sản phẩm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#f5f5f5] text-sm text-[#111111] pl-9 pr-3 py-2.5 rounded-lg border border-transparent focus:border-[#111111] focus:bg-white outline-none"
                />
                <Search className="w-4 h-4 text-[#707072] absolute left-3 top-1/2 -translate-y-1/2" />
              </form>
            </div>

            {/* Category Filter */}
            <div className="border-b border-[#e5e5e5]">
              <button
                onClick={() => setCatOpen(!catOpen)}
                className="w-full flex items-center justify-between py-4 text-sm font-bold text-[#111111] cursor-pointer hover:text-[#707072] transition-colors"
              >
                Danh mục
                {catOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {catOpen && (
                <div className="pb-4 space-y-1">
                  <button
                    onClick={() => setSelectedCategory(undefined)}
                    className={`block w-full text-left text-sm py-1.5 transition-colors cursor-pointer ${
                      selectedCategory === undefined ? 'font-black text-[#111111]' : 'text-[#707072] hover:text-[#111111]'
                    }`}
                  >
                    Tất cả ({activeCategories.length})
                  </button>
                  {activeCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setAttrKey('');
                        setAttrValue('');
                      }}
                      className={`block w-full text-left text-sm py-1.5 transition-colors cursor-pointer ${
                        selectedCategory === cat.id ? 'font-black text-[#111111]' : 'text-[#707072] hover:text-[#111111]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Attribute Filters */}
            {catAttrs.length > 0 && (
              <div className="border-b border-[#e5e5e5]">
                <button
                  onClick={() => setAttrOpen(!attrOpen)}
                  className="w-full flex items-center justify-between py-4 text-sm font-bold text-[#111111] cursor-pointer hover:text-[#707072] transition-colors"
                >
                  Thuộc tính
                  {attrOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {attrOpen && (
                  <div className="pb-4 space-y-4">
                    {catAttrs.map((ca) => {
                      const attrCode = ca.attribute?.code || '';
                      const attrName = ca.attribute?.name || `Thuộc tính #${ca.attribute_id}`;
                      const options = getDynamicAttributeOptions(attrCode);
                      return (
                        <div key={ca.attribute_id} className="space-y-2">
                          <p className="text-xs font-bold text-[#111111] uppercase tracking-wider">{attrName}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => { setAttrKey(''); setAttrValue(''); }}
                              className={`text-xs px-3 py-1 rounded-full border cursor-pointer transition-all ${
                                attrKey !== attrCode ? 'border-[#111111] bg-[#111111] text-white font-bold' : 'border-[#e5e5e5] text-[#707072] hover:border-[#111111] hover:text-[#111111]'
                              }`}
                            >
                              Tất cả
                            </button>
                            {options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => { setAttrKey(attrCode); setAttrValue(opt); }}
                                className={`text-xs px-3 py-1 rounded-full border cursor-pointer transition-all ${
                                  attrKey === attrCode && attrValue === opt
                                    ? 'border-[#111111] bg-[#111111] text-white font-bold'
                                    : 'border-[#e5e5e5] text-[#707072] hover:border-[#111111] hover:text-[#111111]'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Price Range */}
            <div className="border-b border-[#e5e5e5]">
              <button
                onClick={() => setPriceOpen(!priceOpen)}
                className="w-full flex items-center justify-between py-4 text-sm font-bold text-[#111111] cursor-pointer hover:text-[#707072] transition-colors"
              >
                Khoảng Giá
                {priceOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {priceOpen && (
                <div className="pb-4 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Từ"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full bg-[#f5f5f5] text-xs text-[#111111] px-3 py-2 rounded-lg border border-transparent focus:border-[#111111] focus:bg-white outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Đến"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full bg-[#f5f5f5] text-xs text-[#111111] px-3 py-2 rounded-lg border border-transparent focus:border-[#111111] focus:bg-white outline-none"
                    />
                  </div>
                  <button
                    onClick={fetchFilteredProducts}
                    className="w-full bg-[#111111] hover:bg-[#333] text-white text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>
              )}
            </div>

            {/* Reset */}
            {(selectedCategory !== undefined || attrKey || minPrice || maxPrice || search) && (
              <button
                onClick={handleResetFilters}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-[#707072] hover:text-[#111111] pt-4 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Xóa tất cả bộ lọc
              </button>
            )}
          </aside>
        )}

        {/* Product Grid */}
        <main className="flex-1 min-w-0">
          {loading ? (
            <div className={`grid gap-4 ${filtersVisible ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-[#f5f5f5] rounded-xl h-80 animate-pulse" />
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="py-24 text-center space-y-4">
              <p className="text-[#707072] text-sm">Không tìm thấy sản phẩm nào phù hợp.</p>
              <button onClick={handleResetFilters} className="text-xs font-bold underline text-[#111111] cursor-pointer">
                Xóa tất cả bộ lọc
              </button>
            </div>
          ) : (
            <div className={`grid gap-4 ${filtersVisible ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
              {sortedProducts.map((prod, index) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  rank={index + 1}
                  onSelect={onSelectProduct}
                  onQuickAddToCart={onQuickAddToCart}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
