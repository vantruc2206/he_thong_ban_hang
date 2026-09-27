import { useState, createContext, useContext, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, Users, BarChart3,
  Settings, ChevronLeft, ChevronRight, Bell, Moon, Sun,
  Menu, X, ChevronDown, MessageSquare, LogOut, FolderTree
} from "lucide-react";
import { getLowStockItems } from "../../lib/services/inventoryService";
import { getOrders } from "../../lib/services/orderService";
import { getCustomers } from "../../lib/services/customerService";
import { useAuth } from "../../lib/contexts/AuthContext";

const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => { } });
export const useTheme = () => useContext(ThemeContext);

const allNavItems = [
  { path: "/", icon: LayoutDashboard, label: "Tổng quan", badge: null, roles: ["admin"] },
  { path: "/products", icon: Package, label: "Sản phẩm", badge: null, roles: ["admin", "sales", "warehouse"] },
  { path: "/categories", icon: FolderTree, label: "Danh mục", badge: null, roles: ["admin", "sales"] },
  { path: "/inventory", icon: Warehouse, label: "Kho hàng", badge: 3, roles: ["admin", "warehouse"] },
  { path: "/orders", icon: ShoppingCart, label: "Đơn hàng", badge: 15, roles: ["admin", "sales"] },
  { path: "/crm", icon: Users, label: "Khách hàng", badge: 8, roles: ["admin", "sales"] },
  { path: "/analytics", icon: BarChart3, label: "Báo cáo", badge: null, roles: ["admin"] },
  { path: "/settings", icon: Settings, label: "Cài đặt", badge: null, roles: ["admin"] },
];

// SVG logos for each channel — clean, recognizable
const ChannelLogo = ({ id }: { id: string }) => {
  const [error, setError] = useState(false);

  if (!error) {
    return (
      <img
        src={`/images/logos/${id}.png`}
        alt={id}
        style={{ width: 24, height: 24, objectFit: "contain" }}
        onError={() => setError(true)}
      />
    );
  }

  if (id === "shopee") return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: 24, height: 24 }}>
      <rect width="32" height="32" rx="8" fill="#EE4D2D" />
      <path d="M16 7C13.24 7 11 9.24 11 12H9C9 8.13 12.13 5 16 5c3.87 0 7 3.13 7 7h-2c0-2.76-2.24-5-5-5z" fill="white" />
      <rect x="7" y="12" width="18" height="13" rx="2" fill="white" fillOpacity=".95" />
      <circle cx="12" cy="19" r="2" fill="#EE4D2D" />
      <circle cx="20" cy="19" r="2" fill="#EE4D2D" />
      <path d="M14 19h4" stroke="#EE4D2D" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (id === "tiktok") return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: 24, height: 24 }}>
      <rect width="32" height="32" rx="8" fill="#010101" />
      <path d="M21 8h-3v10.5a3.5 3.5 0 01-3.5 3.5A3.5 3.5 0 0111 18.5a3.5 3.5 0 013.5-3.5c.32 0 .63.05.93.13V12.0a6.5 6.5 0 00-.93-.07A6.5 6.5 0 008 18.5 6.5 6.5 0 0014.5 25 6.5 6.5 0 0021 18.5V13a8.48 8.48 0 005 1.6v-3a5.5 5.5 0 01-5-3.6z" fill="white" />
    </svg>
  );
  if (id === "lazada") return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: 24, height: 24 }}>
      <rect width="32" height="32" rx="8" fill="#0F146D" />
      <path d="M8 22V10l4 8 4-8 4 8 4-8v12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (id === "website") return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: 24, height: 24 }}>
      <rect width="32" height="32" rx="8" fill="#2563EB" />
      <circle cx="16" cy="16" r="7" stroke="white" strokeWidth="1.8" />
      <path d="M16 9c-2 0-4 3.13-4 7s2 7 4 7 4-3.13 4-7-2-7-4-7z" stroke="white" strokeWidth="1.8" />
      <path d="M9 16h14M10 12h12M10 20h12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  return null;
};

const channels = [
  { id: "shopee", name: "Shopee", connected: true },
  { id: "tiktok", name: "TikTok", connected: true },
  { id: "lazada", name: "Lazada", connected: true },
  { id: "website", name: "Web", connected: true },
];

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Auth integration

  // Filter Nav Items Based on Role
  const navItems = allNavItems.filter(item => user && item.roles.includes(user.role));

  const [notifications, setNotifications] = useState([
    { id: 1 as any, msg: "15 đơn hàng cần xử lý gấp", time: "5 phút trước", unread: true },
    { id: 3 as any, msg: "Shopee cập nhật chính sách phí ship mới", time: "1 giờ trước", unread: true },
    { id: 4 as any, msg: "8 tin nhắn khách hàng chưa trả lời", time: "2 giờ trước", unread: false },
  ]);

  const [navCounts, setNavCounts] = useState({ inventory: 0, orders: 0, crm: 0 });

  useEffect(() => {
    async function loadAlerts() {
      const all = await getLowStockItems();
      const lowStockParams = all.map(p => ({
        id: `low_${p.id}` as any,
        msg: `Sắp hết hàng: ${p.name} (Chỉ còn ${p.available})`,
        time: "Cảnh báo hệ thống",
        unread: true
      }));
      setNotifications(prev => {
        const nonLow = prev.filter(n => typeof n.id === "number");
        return [...lowStockParams, ...nonLow];
      });

      const orders = await getOrders();
      const customers = await getCustomers();
      setNavCounts({
        inventory: all.length,
        orders: orders.filter((o: any) => o.status === "pending").length,
        crm: customers.length,
      });
    }
    loadAlerts();
  }, []);

  const handleLogout = () => {
      logout();
      navigate('/login', { replace: true });
  }

  // Light/dark tokens
  const sideBg = dark ? "#111827" : "#ffffff";
  const sideBorder = dark ? "rgba(255,255,255,0.07)" : "#f0f0f5";
  const sideText = dark ? "#94a3b8" : "#64748b";
  const sideActiveText = dark ? "#e2e8f5" : "#1e293b";
  const sideActiveBg = dark ? "rgba(99,102,241,0.12)" : "#f0f1ff";
  const mainBg = dark ? "#0f172a" : "#f8f9fc";
  const headerBg = dark ? "rgba(17,24,39,0.97)" : "rgba(255,255,255,0.97)";
  const headerBorder = dark ? "rgba(255,255,255,0.06)" : "#ebebf0";

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(!dark) }}>
      <div className={`flex h-screen overflow-hidden ${dark ? "dark" : ""}`} style={{ background: mainBg }}>
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`fixed lg:relative z-50 flex flex-col h-full transition-all duration-300 ${collapsed ? "w-[64px]" : "w-[220px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
          style={{ background: sideBg, borderRight: `1px solid ${sideBorder}` }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0" style={{ borderBottom: `1px solid ${sideBorder}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm bg-blue-600 text-white font-bold text-lg">
              OS
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold tracking-wider text-[15px]" style={{ color: dark ? "#f8fafc" : "#1e293b" }}>OMNI SALES</span>
                <span className="text-[10px] font-semibold tracking-[.15em] uppercase -mt-1" style={{ color: "#2563eb" }}>Hệ Thống Đa Kênh</span>
              </div>
            )}
            <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden" style={{ color: sideText }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Channels */}
          {!collapsed && (
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${sideBorder}` }}>
              <p className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "#94a3b8" }}>Kênh</p>
              <div className="flex items-center gap-2.5">
                {channels.map(ch => (
                  <div key={ch.id} className="relative" title={ch.name}>
                    <ChannelLogo id={ch.id} />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ background: "#22c55e", border: `2px solid ${sideBg}` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 px-2 py-2 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {navItems.map(({ path, icon: Icon, label, badge }) => {
              let displayBadge = badge;
              if (path === "/inventory" && navCounts.inventory > 0) displayBadge = navCounts.inventory;
              if (path === "/orders" && navCounts.orders > 0) displayBadge = navCounts.orders;
              if (path === "/crm" && navCounts.crm > 0) displayBadge = navCounts.crm;
              if (path === "/inventory" && navCounts.inventory === 0) displayBadge = null;
              if (path === "/orders" && navCounts.orders === 0) displayBadge = null;
              if (path === "/crm" && navCounts.crm === 0) displayBadge = null;

              return (
                <NavLink key={path} to={path} end={path === "/"} onClick={() => {
                  setMobileOpen(false);
                  if (path === "/orders") setNavCounts(prev => ({ ...prev, orders: 0 }));
                  if (path === "/inventory") setNavCounts(prev => ({ ...prev, inventory: 0 }));
                  if (path === "/crm") setNavCounts(prev => ({ ...prev, crm: 0 }));
                }}>
                  {({ isActive }) => (
                    <div
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 relative cursor-pointer transition-all duration-150"
                      style={{
                        background: isActive ? sideActiveBg : "transparent",
                        color: isActive ? "#6366f1" : sideText,
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = dark ? "rgba(255,255,255,0.04)" : "#f8f8fc"; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Icon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: isActive ? "#6366f1" : sideText }}
                      />
                      {!collapsed && (
                        <>
                          <span className="text-[11px] font-medium flex-1 truncate" style={{ color: isActive ? "#6366f1" : sideActiveText }}>
                            {label}
                          </span>
                          {displayBadge !== null && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full text-white text-[8px] flex items-center justify-center font-semibold"
                              style={{ background: isActive ? "#6366f1" : "#ef4444" }}>
                              {(displayBadge as number) > 99 ? "99+" : displayBadge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && displayBadge !== null && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                    </div>
                  )}
                </NavLink>
              )
            })}
          </nav>



          {/* Collapse */}
          <div className="px-3 py-2 flex-shrink-0" style={{ borderTop: `1px solid ${sideBorder}` }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] transition-all"
              style={{ color: sideText }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = dark ? "rgba(255,255,255,0.04)" : "#f5f5fa"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              {collapsed
                ? <ChevronRight className="w-3.5 h-3.5" />
                : <><ChevronLeft className="w-3.5 h-3.5" /><span>Thu gọn</span></>
              }
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="flex items-center gap-3 px-5 flex-shrink-0"
            style={{
              background: headerBg,
              borderBottom: `1px solid ${headerBorder}`,
              height: 56,
              backdropFilter: "blur(10px)",
            }}>
            <button onClick={() => setMobileOpen(true)} className="lg:hidden" style={{ color: sideText }}>
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mr-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              PostgreSQL Multi-Schema Connected
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1 ml-auto">
              {/* Messages */}
              <button 
                onClick={() => user?.role === 'admin' || user?.role === 'sales' ? navigate("/crm") : null}
                className={`relative p-2 rounded-lg transition-all ${user?.role === 'warehouse' ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ color: "#94a3b8" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = dark ? "#1e293b" : "#f5f5fa"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <MessageSquare style={{ width: 17, height: 17 }} />
                {user?.role !== 'warehouse' && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-400" />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-lg transition-all"
                  style={{ color: "#94a3b8" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = dark ? "#1e293b" : "#f5f5fa"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <Bell style={{ width: 17, height: 17 }} />
                  {notifications.some(n => n.unread) && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"
                      style={{ border: `2px solid ${headerBg}` }} />
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl overflow-hidden z-50 animate-in slide-in-from-top-2"
                    style={{
                      background: dark ? "#1e293b" : "#fff",
                      border: `1px solid ${headerBorder}`,
                      boxShadow: "0 16px 48px rgba(0,0,0,0.12)"
                    }}>
                    <div className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: `1px solid ${headerBorder}` }}>
                      <span className="font-bold text-[11px]" style={{ color: dark ? "#e2e8f5" : "#1e293b" }}>
                        Thông báo
                      </span>
                      <span
                        className="text-[10px] font-semibold cursor-pointer transition-opacity hover:opacity-70"
                        style={{ color: "#6366f1" }}
                        onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                      >
                        Đánh dấu đã đọc
                      </span>
                    </div>
                    {notifications.map(n => (
                      <div key={n.id} className="flex gap-3 px-4 py-3 cursor-pointer"
                        style={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5fa"}`, background: n.unread ? (dark ? "rgba(99,102,241,0.05)" : "#fafbff") : "transparent" }}
                        onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x))}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = dark ? "rgba(255,255,255,0.04)" : "#f5f5fa"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.unread ? (dark ? "rgba(99,102,241,0.05)" : "#fafbff") : "transparent"}>
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: n.unread ? "#6366f1" : "transparent" }} />
                        <div>
                          <p className="text-[13px]" style={{ color: dark ? "#e2e8f5" : "#1e293b" }}>{n.msg}</p>
                          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dark mode */}
              <button onClick={() => setDark(!dark)}
                className="p-2 rounded-lg transition-all"
                style={{ color: dark ? "#fbbf24" : "#94a3b8" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = dark ? "#1e293b" : "#f5f5fa"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                {dark ? <Sun style={{ width: 17, height: 17 }} /> : <Moon style={{ width: 17, height: 17 }} />}
              </button>

              <div className="w-px h-5 mx-1" style={{ background: headerBorder }} />

              {/* User Dropdown */}
              <div className="relative">
                <div 
                  className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = dark ? "#1e293b" : "#f5f5fa"}
                  onMouseLeave={e => { if(!userMenuOpen) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                  style={{ background: userMenuOpen ? (dark ? "#1e293b" : "#f5f5fa") : "transparent" }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    <span className="text-[11px] text-white font-bold">{user?.avatar || "U"}</span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-[10px] font-semibold leading-tight" style={{ color: dark ? "#e2e8f5" : "#1e293b" }}>
                      {user?.name || "Người dùng"}
                    </div>
                    <div className="text-[9px] leading-tight" style={{ color: "#94a3b8" }}>
                      {user?.role === "admin" ? "Quản trị viên" : user?.role === "sales" ? "Nhân viên CSKH" : "Quản lý kho"}
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3 hidden sm:block" style={{ color: "#94a3b8" }} />
                </div>
                
                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div 
                    className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border overflow-hidden z-50 animate-in slide-in-from-top-2"
                    style={{ background: dark ? "#1e293b" : "#ffffff", borderColor: headerBorder }}
                  >
                    <div className="px-4 py-3 border-b" style={{ borderColor: headerBorder }}>
                      <p className="text-sm font-medium" style={{ color: dark ? "#e2e8f5" : "#1e293b" }}>{user?.name}</p>
                      <p className="text-xs truncate" style={{ color: "#94a3b8" }}>{user?.email}</p>
                    </div>
                    <div className="p-1.5">
                      <button 
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>

            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto" style={{ background: mainBg }}>
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

