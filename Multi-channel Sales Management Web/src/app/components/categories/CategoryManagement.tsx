import { useState, useEffect } from "react";
import {
  FolderTree, Plus, Edit3, Trash2, Check, X, Tag, Settings2,
  ChevronRight, Layers, Sliders, AlertCircle, Loader2, Sparkles
} from "lucide-react";
import { useTheme } from "../Layout";
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getAttributes, createAttribute, deleteAttribute,
  Category, Attribute
} from "../../../lib/services/categoryService";

export function CategoryManagement() {
  const { dark } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"categories" | "attributes">("categories");

  // Category Modal Form
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catParentId, setCatParentId] = useState<number | undefined>(undefined);
  const [catActive, setCatActive] = useState(true);
  const [selectedAttrIds, setSelectedAttrIds] = useState<number[]>([]);
  const [savingCat, setSavingCat] = useState(false);

  // Attribute Modal Form
  const [showAttrModal, setShowAttrModal] = useState(false);
  const [attrName, setAttrName] = useState("");
  const [attrCode, setAttrCode] = useState("");
  const [attrDataType, setAttrDataType] = useState("string");
  const [savingAttr, setSavingAttr] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [catsData, attrsData] = await Promise.all([
      getCategories(true),
      getAttributes(),
    ]);
    setCategories(catsData);
    setAttributes(attrsData);
    setLoading(false);
  }

  // Theme styling helpers
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSec = dark ? "text-gray-400" : "text-gray-500";
  const cardBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const rowHover = dark ? "hover:bg-gray-800/60" : "hover:bg-gray-50";

  // Category Actions
  function openAddCat(parent_id?: number) {
    setEditingCat(null);
    setCatName("");
    setCatSlug("");
    setCatParentId(parent_id);
    setCatActive(true);
    setSelectedAttrIds([]);
    setShowCatModal(true);
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatParentId(cat.parent_id ?? undefined);
    setCatActive(cat.is_active);
    const attrIds = cat.category_attributes?.map(ca => ca.attribute_id) || [];
    setSelectedAttrIds(attrIds);
    setShowCatModal(true);
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/([^0-9a-z-\s])/g, "")
      .replace(/(\s+)/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  async function handleSaveCat() {
    if (!catName.trim()) return alert("Vui lòng nhập tên danh mục");
    setSavingCat(true);
    const slug = catSlug.trim() || generateSlug(catName);

    if (editingCat) {
      await updateCategory(editingCat.id, {
        name: catName,
        slug,
        parent_id: catParentId || 0,
        is_active: catActive,
        attribute_ids: selectedAttrIds,
      });
    } else {
      await createCategory({
        name: catName,
        slug,
        parent_id: catParentId,
        is_active: catActive,
        attribute_ids: selectedAttrIds,
      });
    }

    await loadData();
    setSavingCat(false);
    setShowCatModal(false);
  }

  async function handleDeleteCat(id: number, name: string) {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục '${name}'?`)) return;
    await deleteCategory(id);
    await loadData();
  }

  // Attribute Actions
  async function handleSaveAttr() {
    if (!attrName.trim() || !attrCode.trim()) return alert("Vui lòng nhập tên và mã thuộc tính");
    setSavingAttr(true);
    await createAttribute({
      name: attrName,
      code: attrCode.toLowerCase().trim(),
      data_type: attrDataType,
    });
    await loadData();
    setSavingAttr(false);
    setShowAttrModal(false);
    setAttrName("");
    setAttrCode("");
  }

  async function handleDeleteAttr(id: number, name: string) {
    if (!confirm(`Xóa thuộc tính '${name}' khỏi hệ thống?`)) return;
    await deleteAttribute(id);
    await loadData();
  }

  // Build tree hierarchy
  const parentCategories = categories.filter(c => !c.parent_id);
  const getSubCategories = (parentId: number) => categories.filter(c => c.parent_id === parentId);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-pink-600" />
            <h1 className={`font-bold text-xl ${textPrimary}`}>Quản lý Danh mục & Thuộc tính động</h1>
          </div>
          <p className={`text-sm mt-1 ${textSec}`}>Tùy chỉnh danh mục sản phẩm và gán bộ thuộc tính động (RAM, Size, Màu sắc, Chất liệu...)</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "categories" ? (
            <button
              onClick={() => openAddCat()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm danh mục mới</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAttrModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm thuộc tính mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeTab === "categories"
              ? "border-pink-600 text-pink-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Danh mục sản phẩm ({categories.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("attributes")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeTab === "attributes"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Thuộc tính hệ thống ({attributes.length})</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
        </div>
      )}

      {/* CATEGORIES TREE VIEW */}
      {!loading && activeTab === "categories" && (
        <div className="space-y-4">
          {parentCategories.map(parent => {
            const subs = getSubCategories(parent.id);
            const parentAttrs = parent.category_attributes || [];

            return (
              <div key={parent.id} className={`rounded-2xl border ${cardBg} overflow-hidden shadow-sm`}>
                {/* Parent Row */}
                <div className={`p-4 flex items-center justify-between border-b ${dark ? "border-gray-800 bg-gray-800/40" : "border-gray-100 bg-gray-50/80"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-950/60 text-pink-600 flex items-center justify-center font-bold text-sm">
                      {parent.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-base ${textPrimary}`}>{parent.name}</span>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${dark ? "bg-gray-800 text-gray-400" : "bg-gray-200 text-gray-600"}`}>
                          /{parent.slug}
                        </span>
                        {!parent.is_active && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Ẩn</span>
                        )}
                      </div>
                      
                      {/* Attached Attributes List */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs text-gray-400 font-medium">Thuộc tính động:</span>
                        {parentAttrs.length > 0 ? (
                          parentAttrs.map(ca => (
                            <span key={ca.attribute_id} className="text-[11px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-medium border border-indigo-100 dark:border-indigo-900">
                              {ca.attribute?.name || `Attr #${ca.attribute_id}`}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa gắn</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAddCat(parent.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-950/40 dark:text-pink-300 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm danh mục con
                    </button>
                    <button
                      onClick={() => openEditCat(parent)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCat(parent.id, parent.name)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub Categories List */}
                {subs.length > 0 && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {subs.map(sub => {
                      const subAttrs = sub.category_attributes || [];
                      return (
                        <div key={sub.id} className={`pl-12 pr-4 py-3 flex items-center justify-between ${rowHover} transition-colors`}>
                          <div className="flex items-center gap-2.5">
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm ${textPrimary}`}>{sub.name}</span>
                                <span className={`text-[11px] font-mono ${textSec}`}>/{sub.slug}</span>
                                {!sub.is_active && (
                                  <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.2 rounded-full font-medium">Ẩn</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {subAttrs.length > 0 ? (
                                  subAttrs.map(ca => (
                                    <span key={ca.attribute_id} className="text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 px-1.5 py-0.2 rounded font-medium border border-purple-100 dark:border-purple-900">
                                      {ca.attribute?.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-gray-400 italic">Thừa hưởng từ cấp cha</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditCat(sub)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCat(sub.id, sub.name)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ATTRIBUTES LIST VIEW */}
      {!loading && activeTab === "attributes" && (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${dark ? "border-gray-800 bg-gray-800/50" : "border-gray-100 bg-gray-50"}`}>
                <th className={`p-4 text-left text-xs font-semibold ${textSec}`}>ID</th>
                <th className={`p-4 text-left text-xs font-semibold ${textSec}`}>Tên hiển thị</th>
                <th className={`p-4 text-left text-xs font-semibold ${textSec}`}>Mã định danh (Code)</th>
                <th className={`p-4 text-left text-xs font-semibold ${textSec}`}>Kiểu dữ liệu</th>
                <th className={`p-4 text-left text-xs font-semibold ${textSec}`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {attributes.map(attr => (
                <tr key={attr.id} className={`${rowHover} transition-colors`}>
                  <td className="p-4 text-sm font-mono text-gray-400">#{attr.id}</td>
                  <td className={`p-4 text-sm font-semibold ${textPrimary}`}>{attr.name}</td>
                  <td className="p-4">
                    <span className="text-xs font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md font-semibold border border-indigo-100 dark:border-indigo-900">
                      {attr.code}
                    </span>
                  </td>
                  <td className="p-4 text-sm capitalize text-gray-500">{attr.data_type}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleDeleteAttr(attr.id, attr.name)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto ${cardBg} p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
              <h3 className={`font-bold text-lg ${textPrimary}`}>
                {editingCat ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
              </h3>
              <button onClick={() => setShowCatModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textSec}`}>Tên danh mục *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={e => {
                    setCatName(e.target.value);
                    if (!editingCat) setCatSlug(generateSlug(e.target.value));
                  }}
                  placeholder="Ví dụ: Giày Chạy Bộ"
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textSec}`}>Slug đường dẫn</label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={e => setCatSlug(e.target.value)}
                  placeholder="giay-chay-bo"
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textSec}`}>Danh mục cấp cha</label>
                <select
                  value={catParentId || 0}
                  onChange={e => setCatParentId(Number(e.target.value) || undefined)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                >
                  <option value={0}>-- Danh mục gốc (Cấp 1) --</option>
                  {parentCategories.filter(c => !editingCat || c.id !== editingCat.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Attributes selection checkboxes */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${textSec}`}>Bộ thuộc tính động được áp dụng</label>
                <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-3 rounded-xl border border-pink-200/60 dark:border-gray-800 bg-pink-50/20 dark:bg-gray-950/30">
                  {attributes.map(attr => {
                    const isChecked = selectedAttrIds.includes(attr.id);
                    return (
                      <label
                        key={attr.id}
                        className={`flex items-start gap-2.5 text-xs cursor-pointer p-2.5 rounded-xl border transition-all ${
                          isChecked
                            ? "bg-pink-50 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800 font-medium"
                            : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) setSelectedAttrIds(prev => [...prev, attr.id]);
                            else setSelectedAttrIds(prev => prev.filter(id => id !== attr.id));
                          }}
                          className="mt-0.5 rounded text-pink-600 focus:ring-pink-500 shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs leading-snug ${textPrimary}`}>{attr.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">({attr.code})</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={catActive}
                  onChange={e => setCatActive(e.target.checked)}
                  className="rounded text-pink-600 focus:ring-pink-500"
                />
                <label htmlFor="catActive" className={`text-sm font-medium ${textPrimary}`}>Hiển thị công khai trên Storefront</label>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t dark:border-gray-800">
              <button
                onClick={() => setShowCatModal(false)}
                className="flex-1 py-2 rounded-xl border text-sm font-medium border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveCat}
                disabled={savingCat}
                className="flex-1 py-2 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 flex items-center justify-center gap-2"
              >
                {savingCat && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingCat ? "Cập nhật" : "Tạo mới"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATTRIBUTE MODAL */}
      {showAttrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-md ${cardBg} p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
              <h3 className={`font-bold text-lg ${textPrimary}`}>Thêm thuộc tính động mới</h3>
              <button onClick={() => setShowAttrModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textSec}`}>Tên thuộc tính *</label>
                <input
                  type="text"
                  value={attrName}
                  onChange={e => {
                    setAttrName(e.target.value);
                    setAttrCode(generateSlug(e.target.value));
                  }}
                  placeholder="Ví dụ: Dung lượng RAM"
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textSec}`}>Mã định danh (Code) *</label>
                <input
                  type="text"
                  value={attrCode}
                  onChange={e => setAttrCode(e.target.value)}
                  placeholder="ram"
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textSec}`}>Kiểu dữ liệu</label>
                <select
                  value={attrDataType}
                  onChange={e => setAttrDataType(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                >
                  <option value="string">Văn bản (String / Select)</option>
                  <option value="number">Số (Number)</option>
                  <option value="boolean">Đúng / Sai (Boolean)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t dark:border-gray-800">
              <button
                onClick={() => setShowAttrModal(false)}
                className="flex-1 py-2 rounded-xl border text-sm font-medium border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveAttr}
                disabled={savingAttr}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                {savingAttr && <Loader2 className="w-4 h-4 animate-spin" />}
                Lưu thuộc tính
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
