import React, { useState } from 'react';
import { Flame, Sparkles, Tag, Calendar, MapPin, Award, ChevronRight } from 'lucide-react';
import { Category } from '../services/api';

interface MegaMenuProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (categoryName?: string) => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({
  categories,
  isOpen,
  onClose,
  onSelectCategory,
}) => {
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  if (!isOpen) return null;

  const parentCats = categories.filter((c) => !c.parent_id);
  const menuSections = parentCats.map((parent) => ({
    id: parent.id,
    title: parent.name,
    category_attributes: parent.category_attributes || [],
    children: categories.filter((c) => c.parent_id === parent.id),
  }));

  return (
    <div
      className="absolute top-full left-0 w-full bg-white border-b border-[#e5e5e5] shadow-2xl z-50 animate-fade-in"
      onMouseLeave={onClose}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Main Category Tree Columns */}
          <div className="col-span-9 grid grid-cols-3 sm:grid-cols-4 gap-6 border-r border-[#e5e5e5] pr-6 max-h-[70vh] overflow-y-auto no-scrollbar">
            {menuSections.map((section) => (
              <div key={section.id} className="space-y-3 bg-[#fafafa] p-3.5 rounded-2xl border border-[#f0f0f0] hover:border-[#111111] transition-all group/card">
                <button
                  onClick={() => {
                    onSelectCategory(section.title);
                    onClose();
                  }}
                  className="text-xs font-black uppercase tracking-wider text-[#111111] hover:text-[#0072bc] border-b border-[#e5e5e5] pb-2 text-left w-full flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <span className="truncate">{section.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 text-[#0072bc] transition-all group-hover:translate-x-0.5" />
                </button>

                {section.children.length > 0 ? (
                  <ul className="space-y-1.5 text-xs">
                    {section.children.map((child) => (
                      <li key={child.id}>
                        <button
                          onClick={() => {
                            onSelectCategory(child.name);
                            onClose();
                          }}
                          className="text-[#707072] hover:text-[#111111] hover:font-bold transition-all text-left flex items-center justify-between w-full group py-0.5 cursor-pointer"
                        >
                          <span className="truncate">{child.name}</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#111111] transition-opacity" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* Dynamic Attributes Chips if defined */}
                {section.category_attributes && section.category_attributes.length > 0 && (
                  <div className="pt-2 border-t border-[#e5e5e5] space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0072bc] flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Thuộc tính nổi bật
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {section.category_attributes.map((ca) => (
                        <button
                          key={ca.attribute_id}
                          onClick={() => {
                            onSelectCategory(section.title);
                            onClose();
                          }}
                          className="bg-white hover:bg-[#111111] hover:text-white text-[10px] font-medium text-[#111111] px-2 py-0.5 rounded-md border border-[#e5e5e5] transition-all cursor-pointer"
                        >
                          {ca.attribute?.name || 'Thuộc tính'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {section.children.length === 0 && (!section.category_attributes || section.category_attributes.length === 0) && (
                  <button
                    onClick={() => {
                      onSelectCategory(section.title);
                      onClose();
                    }}
                    className="w-full mt-1 text-[11px] font-bold text-[#0072bc] bg-blue-50 hover:bg-[#0072bc] hover:text-white px-3 py-1.5 rounded-xl transition-all text-left flex items-center justify-between cursor-pointer"
                  >
                    <span>Khám phá ngay</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Price Range Side Panel */}
          <div className="col-span-3 space-y-4 pl-4 border-l border-[#e5e5e5]">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#111111] border-b border-[#e5e5e5] pb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              Khoảng Giá (VND)
            </h4>

            <div className="space-y-3 bg-[#fafafa] p-3.5 rounded-2xl border border-[#f0f0f0]">
              <div>
                <label className="text-[11px] font-bold text-[#707072] block mb-1">
                  Giá tối thiểu
                </label>
                <input
                  type="number"
                  placeholder="Từ... (VD: 50.000)"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-white text-xs text-[#111111] px-3 py-2 rounded-xl border border-[#e5e5e5] focus:border-[#111111] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#707072] block mb-1">
                  Giá tối đa
                </label>
                <input
                  type="number"
                  placeholder="Đến... (VD: 500.000)"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-white text-xs text-[#111111] px-3 py-2 rounded-xl border border-[#e5e5e5] focus:border-[#111111] outline-none"
                />
              </div>

              <button
                onClick={() => {
                  onSelectCategory();
                  onClose();
                }}
                className="w-full bg-[#111111] hover:bg-[#0072bc] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Áp Dụng Khoảng Giá
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
