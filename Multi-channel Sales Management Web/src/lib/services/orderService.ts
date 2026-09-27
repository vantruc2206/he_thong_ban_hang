import { fetchApi } from "./apiClient";

export interface Order {
  id: string;
  order_code: string;
  channel: string;
  customer_name: string;
  customer_phone?: string;
  product_summary: string;
  total: number;
  status: string;
  delivery_status?: string;
  payment_status?: string;
  carrier?: string;
  tracking_code?: string;
  shipping_addr?: string;
  note?: string;
  is_priority: boolean;
  cod_amount?: number;
  ordered_at: string;
}

// ─── GET ORDERS ───────────────────────────────────────────────
export async function getOrders(filters?: {
  channel?: string;
  status?: string;
}): Promise<Order[]> {
  try {
    const apiOrders = await fetchApi<any[]>("/sales/orders");
    if (apiOrders && Array.isArray(apiOrders)) {
      let mapped: Order[] = apiOrders.map(o => ({
        id: String(o.id),
        order_code: `ORD-${o.id}`,
        channel: o.source || "website",
        customer_name: o.user_id ? `Khách hàng #${o.user_id}` : "Khách lẻ",
        product_summary: o.items && o.items.length > 0 ? `${o.items[0].product_name || o.items[0].sku} x${o.items[0].quantity}` : "Đơn hàng tổng hợp",
        total: o.total_amount || 0,
        status: o.status === "pending_confirm" ? "pending" : (o.status === "paid" ? "delivered" : o.status),
        delivery_status: o.status,
        payment_status: o.status === "paid" ? "paid" : "pending_payment",
        is_priority: false,
        ordered_at: o.created_at ? new Date(o.created_at).toLocaleDateString("vi-VN") : "Hôm nay",
        shipping_addr: o.note || "Địa chỉ giao hàng",
      }));
      if (filters?.channel && filters.channel !== "all") {
        mapped = mapped.filter((o) => o.channel === filters.channel);
      }
      if (filters?.status) {
        mapped = mapped.filter((o) => o.status === filters.status);
      }
      return mapped;
    }
  } catch (err) {
    console.warn("Backend orders API error", err);
  }

  return [];
}

// ─── UPDATE ORDER STATUS ──────────────────────────────────────
export async function updateOrderStatus(
  id: string,
  status: string
): Promise<boolean> {
  try {
    const numericId = id.replace(/[^0-9]/g, "");
    if (numericId) {
      const backendStatus = status === "pending" ? "pending_confirm" : (status === "delivered" ? "paid" : status);
      await fetchApi(`/sales/orders/${numericId}/status?status=${backendStatus}`, {
        method: "PATCH"
      });
      return true;
    }
  } catch (err) {
    console.warn("Backend updateOrderStatus error", err);
  }
  return false;
}

// ─── CREATE ORDER ─────────────────────────────────────────────
export async function createOrder(
  data: Partial<Order>
): Promise<Order | null> {
  try {
    const payload = {
      items: [
        {
          sku: "AO-POLO-01",
          quantity: 1
        }
      ],
      note: data.note || `Đơn tạo từ Admin panel cho ${data.customer_name || "Khách lẻ"}`
    };
    const res = await fetchApi<any>("/sales/orders", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (res && res.id) {
      return {
        id: String(res.id),
        order_code: `ORD-${res.id}`,
        channel: data.channel || "website",
        customer_name: data.customer_name || "Khách lẻ",
        product_summary: data.product_summary || "Sản phẩm chọn mua x1",
        total: res.total_amount || 0,
        status: "pending",
        delivery_status: "waiting_pickup",
        payment_status: "pending_payment",
        is_priority: false,
        ordered_at: new Date().toISOString(),
        shipping_addr: data.shipping_addr || "Việt Nam",
      };
    }
  } catch (err) {
    console.warn("Backend createOrder error", err);
  }
  return null;
}

// ─── ORDER COUNTS BY STATUS ───────────────────────────────────
export async function getOrderStatusCounts(): Promise<Record<string, number>> {
  const all = await getOrders();
  const counts: Record<string, number> = {};
  all.forEach((o) => {
    counts[o.status] = (counts[o.status] || 0) + 1;
  });
  return counts;
}
