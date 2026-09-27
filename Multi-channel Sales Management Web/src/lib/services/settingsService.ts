const defaultRoles: Role[] = [
  {
    id: 1, name: "Quản trị viên", description: "Toàn quyền hệ thống. Sau đăng nhập vào Dashboard.",
    permissions: ["Tổng quan", "Sản phẩm", "Kho hàng", "Đơn hàng", "Khách hàng", "Báo cáo", "Cài đặt"],
    color: "bg-red-100 text-red-700 border-red-200", users: 1
  },
  {
    id: 2, name: "Quản lý kho", description: "Quản lý tồn kho và đóng gói. Sau đăng nhập vào Kho hàng.",
    permissions: ["Sản phẩm", "Kho hàng"],
    color: "bg-blue-100 text-blue-700 border-blue-200", users: 6
  },
  {
    id: 3, name: "Nhân viên CSKH", description: "Chăm sóc và tư vấn khách hàng. Sau đăng nhập vào Đơn hàng.",
    permissions: ["Sản phẩm", "Đơn hàng", "Khách hàng"],
    color: "bg-green-100 text-green-700 border-green-200", users: 3
  },
];

const defaultWarehouses: Warehouse[] = [
  { id: 1, name: "Kho chính - HCM", address: "123 Nguyễn Văn Linh, Q.7, TP.HCM", type: "main", capacity: 500, used: 387 },
  { id: 2, name: "Kho phụ - Hà Nội", address: "456 Giải Phóng, Hoàng Mai, Hà Nội", type: "branch", capacity: 200, used: 142 },
];

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  users: number;
}

export interface Warehouse {
  id: number;
  name: string;
  address: string;
  type: string;
  capacity: number;
  used: number;
}

// Ensure localStorage has data or fallback
function loadLsRoles(): Role[] {
  const data = localStorage.getItem("omnisell_roles");
  if (data) {
    try {
      let roles: Role[] = JSON.parse(data);
      // Migration: merge Packer into Warehouse if Packer still exists OR sync to new rules
      const packerIndex = roles.findIndex(r => r.id === 4 || r.name === "Nhân viên đóng gói");
      const needsSync = roles.some(r => r.name === "Quản lý kho" && r.permissions.length > 2);
      
      if (packerIndex !== -1 || needsSync) {
        // If we found the old roles, just reset to new defaults for this demo
        roles = defaultRoles;
        localStorage.setItem("omnisell_roles", JSON.stringify(roles));
      }
      return roles;
    } catch {}
  }
  return defaultRoles;
}

function saveLsRoles(roles: Role[]) {
  localStorage.setItem("omnisell_roles", JSON.stringify(roles));
}

function loadLsWarehouses(): Warehouse[] {
  const data = localStorage.getItem("omnisell_warehouses");
  if (data) {
    try {
      return JSON.parse(data);
    } catch {}
  }
  return defaultWarehouses;
}

function saveLsWarehouses(whs: Warehouse[]) {
  localStorage.setItem("omnisell_warehouses", JSON.stringify(whs));
}

// ─── ROLES ───────────────────────────────────────────────────
export async function getRoles(): Promise<Role[]> {
  return loadLsRoles();
}

export async function addRole(role: Omit<Role, "id">): Promise<Role> {
  const roles = loadLsRoles();
  const newRole = {
    ...role,
    id: roles.length > 0 ? Math.max(...roles.map(r => r.id)) + 1 : 1,
  };
  roles.push(newRole);
  saveLsRoles(roles);
  return newRole;
}

import { fetchApi } from "./apiClient";

// ─── WAREHOUSES ───────────────────────────────────────────────
export async function getWarehouses(): Promise<Warehouse[]> {
  try {
    const res = await fetchApi<any[]>("/inventory/warehouses");
    if (res && Array.isArray(res)) {
      return res.map((w: any) => ({
        id: w.id,
        name: w.name,
        address: w.address || "Chưa cập nhật địa chỉ",
        type: w.code?.includes("MAIN") || w.code?.includes("HCM") ? "main" : "branch",
        capacity: 500,
        used: 120
      }));
    }
  } catch (err) {
    console.warn("Backend getWarehouses error", err);
  }
  return loadLsWarehouses();
}

export async function addWarehouse(warehouse: Omit<Warehouse, "id">): Promise<Warehouse> {
  try {
    const code = `WH-${Date.now().toString().slice(-4)}`;
    const res = await fetchApi<any>("/inventory/warehouses", {
      method: "POST",
      body: JSON.stringify({
        name: warehouse.name,
        code,
        address: warehouse.address,
        is_active: true
      })
    });
    if (res && res.id) {
      return {
        id: res.id,
        name: res.name,
        address: res.address,
        type: warehouse.type,
        capacity: warehouse.capacity,
        used: 0
      };
    }
  } catch (err) {
    console.warn("Backend addWarehouse error", err);
  }
  const whs = loadLsWarehouses();
  const newWh = {
    ...warehouse,
    id: whs.length > 0 ? Math.max(...whs.map(w => w.id)) + 1 : 1,
  };
  whs.push(newWh);
  saveLsWarehouses(whs);
  return newWh;
}
