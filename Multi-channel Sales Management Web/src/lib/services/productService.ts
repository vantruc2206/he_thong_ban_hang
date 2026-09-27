import { fetchApi } from "./apiClient";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: number;
  category?: string;
  cost_price: number;
  sell_price: number;
  weight?: number;
  barcode?: string;
  status?: string;
  img_url?: string;
  sync_status?: string;
  stock?: number;
  sold_this_month?: number;
  channels?: Record<string, boolean>;
  channelConfig?: Record<string, { status: string; reason?: string }>;
  variants?: string[];
  brand_name?: string;
  skin_type?: string;
  dynamicAttributes?: Record<string, string>;
}

// ─── GET ALL PRODUCTS ────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  try {
    const apiProducts = await fetchApi<any[]>("/catalog/products");
    if (apiProducts && Array.isArray(apiProducts)) {
      return apiProducts.map(p => ({
        id: String(p.id),
        sku: p.slug ? p.slug.toUpperCase() : `SKU-${p.id}`,
        name: p.name,
        cost_price: Math.round((p.base_price || 0) * 0.6),
        sell_price: p.base_price || 0,
        status: p.status || "active",
        img_url: p.images && p.images.length > 0 ? p.images[0].image_url : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80",
        stock: p.variants ? p.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) : 100,
        channels: { shopee: true, tiktok: true, lazada: true, website: true },
        channelConfig: {
          shopee: { status: "active" },
          tiktok: { status: "active" },
          lazada: { status: "active" },
          website: { status: "active" },
        },
        category_id: p.category_id,
        category: p.category_id ? `Danh mục #${p.category_id}` : "Gia dụng",
        sync_status: "synced",
        sold_this_month: 0,
        barcode: `8938516${p.id}4567`,
        dynamicAttributes: p.variants && p.variants.length > 0 && p.variants[0].attributes ? p.variants[0].attributes : {},
      }));
    }
  } catch (err) {
    console.warn("Backend API error fetching products", err);
  }
  return [];
}

// ─── CREATE PRODUCT ──────────────────────────────────────────
export async function createProduct(
  data: Partial<Product> & { channelIds?: number[] }
): Promise<Product | null> {
  try {
    const slug = (data.sku || data.name || `prod-${Date.now()}`).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const payload = {
      name: data.name || "Sản phẩm mới",
      slug,
      description: data.description || "Mô tả sản phẩm",
      base_price: data.sell_price || 100000,
      status: data.status || "active",
      category_id: data.category_id || 1,
      variants: [
        {
          sku: data.sku || `SKU-${Date.now()}`,
          price: data.sell_price || 100000,
          is_active: true,
          attributes: data.dynamicAttributes || {
            ...(data.brand_name ? { brand_name: data.brand_name } : {}),
            ...(data.skin_type ? { skin_type: data.skin_type } : {})
          }
        }
      ],
      images: [
        {
          image_url: data.img_url || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80",
          sort_order: 1,
          is_primary: true
        }
      ]
    };
    const res = await fetchApi<any>("/catalog/products", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (res && res.id) {
      return {
        id: String(res.id),
        sku: data.sku || `SKU-${res.id}`,
        name: res.name,
        cost_price: data.cost_price || Math.round(res.base_price * 0.6),
        sell_price: res.base_price,
        status: res.status,
        img_url: data.img_url || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80",
        stock: 100,
        sync_status: "synced",
        category_id: res.category_id,
        dynamicAttributes: data.dynamicAttributes || {}
      };
    }
  } catch (err) {
    console.warn("Backend createProduct error", err);
  }
  return null;
}

// ─── UPDATE PRODUCT ──────────────────────────────────────────
export async function updateProduct(id: string, data: Partial<Product>): Promise<boolean> {
  try {
    if (data.status && Object.keys(data).length === 1) {
      await fetchApi(`/catalog/products/${id}/status?status=${data.status}`, {
        method: "PATCH"
      });
      return true;
    }

    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.category_id !== undefined) payload.category_id = data.category_id;
    if (data.sell_price !== undefined) payload.base_price = data.sell_price;
    if (data.description !== undefined) payload.description = data.description;
    if (data.status !== undefined) payload.status = data.status;

    if (data.dynamicAttributes || data.sell_price !== undefined || data.sku !== undefined) {
      payload.variants = [
        {
          sku: data.sku || `SKU-${id}`,
          price: data.sell_price || 0,
          is_active: true,
          attributes: data.dynamicAttributes || {}
        }
      ];
    }

    const res = await fetchApi(`/catalog/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    return !!res;
  } catch (err) {
    console.warn("Backend updateProduct error", err);
  }
  return false;
}

// ─── DELETE PRODUCT ──────────────────────────────────────────
export async function deleteProduct(id: string): Promise<boolean> {
  try {
    await fetchApi(`/catalog/products/${id}/status?status=deleted`, {
      method: "PATCH"
    });
    return true;
  } catch (err) {
    console.warn("Backend deleteProduct error", err);
  }
  return false;
}

// ─── UPLOAD IMAGE ────────────────────────────────────────────
export async function uploadProductImage(file: File, _productId: string): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// ─── GET TOP PRODUCTS ─────────────────────────────────────────
export async function getTopProducts() {
  const all = await getProducts();
  return all.slice(0, 5).map((p, i) => ({
    rank: i + 1,
    sku: p.sku,
    name: p.name,
    img: p.img_url || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80",
    sold: p.sold_this_month ?? 0,
    revenue: (p.sold_this_month ?? 0) * (p.sell_price || 0),
    trend: "+0%",
  }));
}
