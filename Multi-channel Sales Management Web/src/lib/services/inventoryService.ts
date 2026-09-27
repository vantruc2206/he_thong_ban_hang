import { fetchApi } from "./apiClient";

export interface Batch {
  batch_number: string;
  mfg_date: string;
  exp_date: string;
  quantity: number;
}

export interface InventoryItem {
  id: string | number;
  product_id?: string;
  sku: string;
  name: string;
  img?: string;
  available: number;
  pending: number;
  total: number;
  location?: string;
  min_stock: number;
  status: string;
  last_in?: string;
  value?: number;
  batches?: Batch[];
}

// ─── GET INVENTORY ────────────────────────────────────────────
export async function getInventory(): Promise<InventoryItem[]> {
  try {
    const apiStock = await fetchApi<any[]>("/inventory/stock");
    if (apiStock && Array.isArray(apiStock)) {
      return apiStock.map((inv, idx) => ({
        id: inv.id || `INV-${idx}`,
        sku: inv.sku,
        name: inv.sku,
        available: inv.available_quantity || (inv.quantity - (inv.reserved_quantity || 0)),
        pending: inv.reserved_quantity || 0,
        total: inv.quantity || 0,
        min_stock: 10,
        status: (inv.quantity || 0) <= 0 ? "critical" : ((inv.quantity || 0) <= 10 ? "warning" : "ok"),
        location: `Kho #${inv.warehouse_id || 1}`,
      }));
    }
  } catch (err) {
    console.warn("Backend inventory API error", err);
  }
  return [];
}

// ─── ADJUST STOCK ─────────────────────────────────────────────
export async function adjustStock(
  productIdOrName: string,
  delta: number,
  reason?: string
): Promise<boolean> {
  try {
    const payload = {
      sku: productIdOrName,
      warehouse_id: 1,
      quantity_change: delta,
      movement_type: delta > 0 ? "import" : "export",
      reference_doc: reason || "Manual Adjustment"
    };
    await fetchApi("/inventory/movements", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.warn("Backend adjustStock error", err);
  }
  return false;
}

// ─── GET LOW STOCK ────────────────────────────────────────────
export async function getLowStockItems(): Promise<InventoryItem[]> {
  return (await getInventory()).filter((i) => i.available <= i.min_stock);
}

// ─── SAVE STOCKTAKE ───────────────────────────────────────────
export async function saveStocktake(records: Record<string, number>): Promise<boolean> {
  try {
    for (const [sku, qty] of Object.entries(records)) {
      await adjustStock(sku, qty, "Stocktake Adjustment");
    }
    return true;
  } catch (err) {
    console.warn("Backend saveStocktake error", err);
  }
  return false;
}
