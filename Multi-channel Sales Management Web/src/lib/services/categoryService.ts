import { fetchApi } from "./apiClient";

export interface Attribute {
  id: number;
  name: string;
  code: string;
  data_type: string;
  created_at?: string;
}

export interface CategoryAttribute {
  category_id: number;
  attribute_id: number;
  is_required: boolean;
  sort_order: number;
  attribute?: Attribute;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  is_active: boolean;
  created_at?: string;
  category_attributes?: CategoryAttribute[];
}

export async function getCategories(includeInactive: boolean = true): Promise<Category[]> {
  const data = await fetchApi<Category[]>(`/catalog/categories?include_inactive=${includeInactive}`);
  return data || [];
}

export async function createCategory(data: {
  name: string;
  slug: string;
  parent_id?: number | null;
  is_active: boolean;
  attribute_ids?: number[];
}): Promise<Category | null> {
  return await fetchApi<Category>("/catalog/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: number, data: {
  name?: string;
  slug?: string;
  parent_id?: number | null;
  is_active?: boolean;
  attribute_ids?: number[];
}): Promise<Category | null> {
  return await fetchApi<Category>(`/catalog/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: number): Promise<boolean> {
  const res = await fetchApi<{ status: string }>(`/catalog/categories/${id}`, {
    method: "DELETE",
  });
  return res?.status === "success";
}

export async function getAttributes(): Promise<Attribute[]> {
  const data = await fetchApi<Attribute[]>("/catalog/attributes");
  return data || [];
}

export async function createAttribute(data: {
  name: string;
  code: string;
  data_type?: string;
}): Promise<Attribute | null> {
  return await fetchApi<Attribute>("/catalog/attributes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteAttribute(id: number): Promise<boolean> {
  const res = await fetchApi<{ status: string }>(`/catalog/attributes/${id}`, {
    method: "DELETE",
  });
  return res?.status === "success";
}
