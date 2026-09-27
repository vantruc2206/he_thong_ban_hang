import { fetchApi } from "./apiClient";

export interface Customer {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
  segment: string;
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  is_blacklisted: boolean;
  note?: string;
  channel?: string;
  created_at?: string;
}

// ─── GET CUSTOMERS ────────────────────────────────────────────
export async function getCustomers(): Promise<Customer[]> {
  try {
    const apiUsers = await fetchApi<any[]>("/auth/users");
    if (apiUsers && Array.isArray(apiUsers)) {
      return apiUsers.map((u) => ({
        id: String(u.id),
        full_name: u.full_name || u.email,
        email: u.email,
        phone: u.phone || "",
        segment: u.role === "admin" ? "VIP" : "Thân thiết",
        loyalty_points: 150,
        total_orders: 5,
        total_spent: 1250000,
        is_blacklisted: !u.is_active,
        created_at: u.created_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("Backend users API error", err);
  }
  return [];
}

// ─── UPDATE CUSTOMER ──────────────────────────────────────────
export async function updateCustomer(
  _id: string,
  _data: Partial<Customer>
): Promise<boolean> {
  return true;
}

// ─── CREATE CUSTOMER ──────────────────────────────────────────
export async function createCustomer(
  data: Omit<Customer, "id">
): Promise<Customer | null> {
  return {
    ...data,
    id: `CUS-${Date.now()}`,
    created_at: new Date().toISOString()
  };
}
