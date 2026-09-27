import React from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Products } from "./components/products/Products";
import { Inventory } from "./components/inventory/Inventory";
import { Orders } from "./components/orders/Orders";
import { CRM } from "./components/crm/CRM";
import { Analytics } from "./components/analytics/Analytics";
import { Settings } from "./components/settings/Settings";
import { CategoryManagement } from "./components/categories/CategoryManagement";
import { Login } from "./components/auth/Login";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

type Role = "admin" | "sales" | "warehouse";

// Wrapper: protect a page with optional role restriction
function Protected({ Component, allowedRoles }: { Component: React.ElementType; allowedRoles?: Role[] }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Component />
    </ProtectedRoute>
  );
}

// Named auth guard for the root Layout — avoids recreating component on every render
function AuthLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: AuthLayout,
    children: [
      { index: true, element: <Protected Component={Dashboard} allowedRoles={["admin"]} /> },
      { path: "products", element: <Protected Component={Products} allowedRoles={["admin", "sales", "warehouse"]} /> },
      { path: "categories", element: <Protected Component={CategoryManagement} allowedRoles={["admin", "sales"]} /> },
      { path: "inventory", element: <Protected Component={Inventory} allowedRoles={["admin", "warehouse"]} /> },
      { path: "orders", element: <Protected Component={Orders} allowedRoles={["admin", "sales"]} /> },
      { path: "crm", element: <Protected Component={CRM} allowedRoles={["admin", "sales"]} /> },
      { path: "analytics", element: <Protected Component={Analytics} allowedRoles={["admin"]} /> },
      { path: "settings", element: <Protected Component={Settings} allowedRoles={["admin"]} /> },
    ],
  },
]);

