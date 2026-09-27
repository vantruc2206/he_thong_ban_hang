import { useState, useEffect } from "react";
import {
  Shield, Bell, Truck, Warehouse, Users, Globe, Moon, Sun,
  Key, Lock, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle,
  Printer, Database, Smartphone, Plus, Edit3, Trash2, Save,
  Building, RefreshCw, Languages
} from "lucide-react";
import { useTheme } from "../Layout";
import { getRoles, addRole as serviceAddRole, getWarehouses, addWarehouse as serviceAddWarehouse } from "../../../lib/services/settingsService";

const auditLogs = [
  { time: "17/03 10:25", user: "Nguyễn Admin", action: "Sửa giá hàng loạt 12 sản phẩm", ip: "192.168.1.5", type: "edit" },
  { time: "17/03 09:10", user: "Trần Kho A", action: "Xác nhận phiếu nhập kho PO-2403-001", ip: "192.168.1.8", type: "add" },
  { time: "16/03 16:45", user: "Lê CSKH B", action: "Thêm khách vào blacklist: Võ T.L", ip: "192.168.1.12", type: "add" },
  { time: "16/03 14:20", user: "Nguyễn Admin", action: "Xóa sản phẩm SKU: TEST-999", ip: "192.168.1.5", type: "delete" },
  { time: "15/03 11:30", user: "Phạm CSKH D", action: "Cập nhật hồ sơ khách: Nguyễn T.H", ip: "192.168.1.15", type: "edit" },
];

const shippingCarriers = [
  { id: "ghn", name: "GHN (Giao Hàng Nhanh)", connected: true, shopId: "SH-123456", apiKey: "****-****-****-abcd", lastSync: "17/03 10:30" },
  { id: "ghtk", name: "GHTK (Giao Hàng Tiết Kiệm)", connected: true, shopId: "SH-654321", apiKey: "****-****-****-efgh", lastSync: "17/03 10:28" },
  { id: "vtp", name: "Viettel Post", connected: false, shopId: "", apiKey: "", lastSync: "—" },
  { id: "jt", name: "J&T Express", connected: false, shopId: "", apiKey: "", lastSync: "—" },
];

const ecommercePlatforms = [
  { id: "shopee", name: "Shopee", connected: true, shopId: "SP-987654", apiKey: "****-****-****-1111", lastSync: "17/03 10:45" },
  { id: "tiktok", name: "TikTok Shop", connected: true, shopId: "TK-123987", apiKey: "****-****-****-2222", lastSync: "17/03 10:40" },
  { id: "lazada", name: "Lazada", connected: true, shopId: "LZ-555666", apiKey: "****-****-****-9999", lastSync: "17/03 10:48" },
  { id: "website", name: "Website Cửa hàng", connected: true, shopId: "WEB-001", apiKey: "****-****-****-3333", lastSync: "17/03 10:50" },
];

export function Settings() {
  const { dark, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<"rbac" | "audit" | "shipping" | "ecommerce" | "warehouse" | "system">("rbac");
  const [show2FA, setShow2FA] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [autoBackup, setAutoBackup] = useState(true);
  const [notifications, setNotifications] = useState({ order: true, stock: true, message: true, system: false });
  const [language, setLanguage] = useState("vi");
  const [rolesData, setRolesData] = useState<any[]>([]);
  const [warehousesData, setWarehousesData] = useState<any[]>([]);
  const [carriersData, setCarriersData] = useState(shippingCarriers);
  const [platformsData, setPlatformsData] = useState(ecommercePlatforms);

  useEffect(() => {
    getRoles().then(setRolesData);
    getWarehouses().then(setWarehousesData);
  }, []);

  // Add Role modal
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "", permissions: "" });

  // Add Warehouse modal
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: "", address: "", capacity: 100 });

  // Connect states
  const [carrierInputs, setCarrierInputs] = useState<Record<string, { shopId: string; apiKey: string }>>({});
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const [platformInputs, setPlatformInputs] = useState<Record<string, { shopId: string; apiKey: string }>>({});
  const [connectPlatformSuccess, setConnectPlatformSuccess] = useState<string | null>(null);

  async function handleAddRole() {
    if (!newRole.name.trim()) return;
    const r = await serviceAddRole({
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions.split(",").map(p => p.trim()).filter(Boolean),
      color: "bg-gray-100 text-gray-700 border-gray-200",
      users: 0
    });
    setRolesData(prev => [...prev, r]);
    setNewRole({ name: "", description: "", permissions: "" });
    setShowAddRole(false);
  }

  async function handleAddWarehouse() {
    if (!newWarehouse.name.trim()) return;
    const w = await serviceAddWarehouse({
      name: newWarehouse.name,
      address: newWarehouse.address,
      type: "branch",
      capacity: newWarehouse.capacity,
      used: 0
    });
    setWarehousesData(prev => [...prev, w]);
    setNewWarehouse({ name: "", address: "", capacity: 100 });
    setShowAddWarehouse(false);
  }

  function handleCarrierConnect(carrierId: string) {
    const input = carrierInputs[carrierId];
    if (!input?.shopId || !input?.apiKey) return;
    setCarriersData(prev => prev.map(c =>
      c.id === carrierId ? { ...c, connected: true, shopId: input.shopId, apiKey: input.apiKey, lastSync: new Date().toLocaleString("vi-VN") } : c
    ));
    setConnectSuccess(carrierId);
    setTimeout(() => setConnectSuccess(null), 3000);
  }

  function handlePlatformConnect(platformId: string) {
    const input = platformInputs[platformId];
    if (!input?.shopId || !input?.apiKey) return;
    setPlatformsData(prev => prev.map(c =>
      c.id === platformId ? { ...c, connected: true, shopId: input.shopId, apiKey: input.apiKey, lastSync: new Date().toLocaleString("vi-VN") } : c
    ));
    setConnectPlatformSuccess(platformId);
    setTimeout(() => setConnectPlatformSuccess(null), 3000);
  }

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSec = dark ? "text-gray-400" : "text-gray-500";
  const cardBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const divider = dark ? "border-gray-800" : "border-gray-100";
  const rowHover = dark ? "hover:bg-gray-800" : "hover:bg-gray-50";

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-blue-600" : dark ? "bg-gray-600" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className={`font-bold text-xl ${textPrimary}`}>Quản trị hệ thống</h1>
        <p className={`text-sm ${textSec}`}>Cấu hình, bảo mật và quản lý hệ thống</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-900">
        {[
          { id: "rbac", label: "Phân quyền", icon: Shield },
          { id: "audit", label: "Nhật ký hệ thống", icon: Eye },
          { id: "shipping", label: "Vận chuyển", icon: Truck },
          { id: "ecommerce", label: "Sàn TMĐT", icon: Globe },
          { id: "warehouse", label: "Kho hàng", icon: Warehouse },
          { id: "system", label: "Hệ thống", icon: Key },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? "bg-blue-600 text-white shadow-sm" : dark ? "text-gray-400 hover:text-white bg-gray-900" : "text-gray-600 hover:text-gray-900 bg-gray-100"}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* RBAC Tab */}
      {activeTab === "rbac" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-bold ${textPrimary}`}>Phân quyền chi tiết theo vai trò</h2>
            <button 
              onClick={() => setShowAddRole(true)} 
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> Thêm vai trò
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {rolesData.map(role => (
              <div key={role.id} className={`p-6 rounded-3xl border transition-all ${cardBg} hover:shadow-xl hover:shadow-gray-200/50 group`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] px-3 py-1 rounded-full border font-bold uppercase tracking-wider ${
                        role.name === "Quản trị viên" ? "bg-red-50 text-red-600 border-red-100" :
                        role.name === "Quản lý kho" ? "bg-blue-50 text-blue-600 border-blue-100" :
                        role.name === "Nhân viên CSKH" ? "bg-green-50 text-green-600 border-green-100" :
                        "bg-gray-50 text-gray-600 border-gray-100"
                      }`}>
                        {role.name}
                      </span>
                      <span className={`text-xs font-medium ${textSec}`}>{role.users} người dùng</span>
                    </div>
                    <p className={`text-sm mt-2 font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>
                      {role.description}
                    </p>
                  </div>
                  <button className={`p-2 rounded-xl transition-colors ${dark ? "text-gray-600 hover:bg-gray-800 hover:text-gray-300" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}>
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {role.permissions.map((perm: string) => (
                    <span 
                      key={perm} 
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                        dark 
                          ? "bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800" 
                          : "bg-gray-50/50 border-gray-100 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={`p-6 rounded-[2rem] border-2 transition-all ${
            dark 
              ? "bg-blue-950/20 border-blue-900/50 shadow-inner" 
              : "bg-[#f0f7ff] border-[#e1effe] shadow-sm"
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                dark ? "bg-blue-900/50 text-blue-400" : "bg-white text-blue-600"
              }`}>
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`text-base font-bold ${dark ? "text-blue-300" : "text-blue-700"}`}>
                    Xác thực 2 lớp (2FA)
                  </h3>
                </div>
                <p className={`text-sm mb-5 ${dark ? "text-blue-400/80" : "text-blue-600/80"}`}>
                  Bảo vệ tài khoản chủ shop bằng mã OTP qua điện thoại
                </p>
                <button
                  onClick={() => setShow2FA(true)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${
                    show2FA 
                      ? "bg-green-600 text-white shadow-lg shadow-green-500/20" 
                      : "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  {show2FA ? "Kích hoạt 2FA ✓" : "Kích hoạt 2FA"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === "audit" && (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <div className={`flex items-center justify-between p-4 border-b ${divider}`}>
            <h2 className={`font-semibold ${textPrimary}`}>Nhật ký hệ thống (Audit Trail)</h2>
            <span className={`text-xs ${textSec}`}>Truy vết mọi hành động trong hệ thống</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {auditLogs.map((log, i) => (
              <div key={i} className={`flex items-center gap-4 p-4 ${rowHover} transition-colors`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${log.type === "delete" ? "bg-red-100 text-red-600" :
                    log.type === "add" ? "bg-green-100 text-green-600" :
                      "bg-blue-100 text-blue-600"
                  }`}>
                  {log.type === "delete" ? <Trash2 className="w-3.5 h-3.5" /> :
                    log.type === "add" ? <Plus className="w-3.5 h-3.5" /> :
                      <Edit3 className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${textPrimary}`}>{log.user}</span>
                  <span className={`text-sm ${textSec}`}> • {log.action}</span>
                  <div className={`text-xs ${textSec} mt-0.5`}>IP: {log.ip}</div>
                </div>
                <div className={`text-xs ${textSec} flex-shrink-0`}>{log.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipping Tab */}
      {activeTab === "shipping" && (
        <div className="space-y-4">
          <h2 className={`font-semibold ${textPrimary}`}>Kết nối đơn vị vận chuyển</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {carriersData.map(carrier => (
              <div key={carrier.id} className={`p-4 rounded-2xl border ${cardBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className={`w-5 h-5 ${carrier.connected ? "text-green-500" : "text-gray-400"}`} />
                    <span className={`text-sm font-medium ${textPrimary}`}>{carrier.name}</span>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${carrier.connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {carrier.connected ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {carrier.connected ? "Đã kết nối" : "Chưa kết nối"}
                  </span>
                </div>
                {carrier.connected ? (
                  <div className="space-y-2">
                    <div>
                      <div className={`text-xs ${textSec}`}>Shop ID</div>
                      <div className={`text-sm font-mono ${textPrimary}`}>{carrier.shopId}</div>
                    </div>
                    <div>
                      <div className={`text-xs ${textSec}`}>API Key</div>
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-mono ${textPrimary}`}>
                          {showPasswords[carrier.id] ? carrier.apiKey.replace(/\*/g, "x") : carrier.apiKey}
                        </div>
                        <button onClick={() => setShowPasswords(p => ({ ...p, [carrier.id]: !p[carrier.id] }))} className={`p-1 rounded ${dark ? "text-gray-400 hover:bg-gray-700" : "text-gray-400 hover:bg-gray-100"}`}>
                          {showPasswords[carrier.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div className={`flex items-center justify-between text-xs ${textSec} pt-2 border-t ${divider}`}>
                      <span>Đồng bộ cuối: {carrier.lastSync}</span>
                      <button className="flex items-center gap-1 text-blue-500 hover:underline">
                        <RefreshCw className="w-3 h-3" />Đồng bộ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectSuccess === carrier.id && <div className="text-xs text-green-600 font-medium">✓ Kết nối thành công!</div>}
                    <input
                      type="text"
                      placeholder="Shop ID / Account ID"
                      value={carrierInputs[carrier.id]?.shopId || ""}
                      onChange={e => setCarrierInputs(p => ({ ...p, [carrier.id]: { ...p[carrier.id], shopId: e.target.value, apiKey: p[carrier.id]?.apiKey || "" } }))}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                    />
                    <input
                      type="password"
                      placeholder="API Key / Token"
                      value={carrierInputs[carrier.id]?.apiKey || ""}
                      onChange={e => setCarrierInputs(p => ({ ...p, [carrier.id]: { ...p[carrier.id], apiKey: e.target.value, shopId: p[carrier.id]?.shopId || "" } }))}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                    />
                    <button onClick={() => handleCarrierConnect(carrier.id)} className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Kết nối</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ecommerce Tab */}
      {activeTab === "ecommerce" && (
        <div className="space-y-4">
          <h2 className={`font-semibold ${textPrimary}`}>Kết nối sàn thương mại điện tử</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {platformsData.map(platform => (
              <div key={platform.id} className={`p-4 rounded-2xl border ${cardBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className={`w-5 h-5 ${platform.connected ? "text-blue-500" : "text-gray-400"}`} />
                    <span className={`text-sm font-medium ${textPrimary}`}>{platform.name}</span>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${platform.connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {platform.connected ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {platform.connected ? "Đã kết nối" : "Chưa kết nối"}
                  </span>
                </div>
                {platform.connected ? (
                  <div className="space-y-2">
                    <div>
                      <div className={`text-xs ${textSec}`}>Shop ID</div>
                      <div className={`text-sm font-mono ${textPrimary}`}>{platform.shopId}</div>
                    </div>
                    <div>
                      <div className={`text-xs ${textSec}`}>API Key</div>
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-mono ${textPrimary}`}>
                          {showPasswords[platform.id] ? platform.apiKey.replace(/\*/g, "x") : platform.apiKey}
                        </div>
                        <button onClick={() => setShowPasswords(p => ({ ...p, [platform.id]: !p[platform.id] }))} className={`p-1 rounded ${dark ? "text-gray-400 hover:bg-gray-700" : "text-gray-400 hover:bg-gray-100"}`}>
                          {showPasswords[platform.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div className={`flex items-center justify-between text-xs ${textSec} pt-2 border-t ${divider}`}>
                      <span>Đồng bộ cuối: {platform.lastSync}</span>
                      <button className="flex items-center gap-1 text-blue-500 hover:underline">
                        <RefreshCw className="w-3 h-3" />Đồng bộ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectPlatformSuccess === platform.id && <div className="text-xs text-green-600 font-medium">✓ Kết nối thành công!</div>}
                    <input
                      type="text"
                      placeholder="Shop ID / Account ID"
                      value={platformInputs[platform.id]?.shopId || ""}
                      onChange={e => setPlatformInputs(p => ({ ...p, [platform.id]: { ...p[platform.id], shopId: e.target.value, apiKey: p[platform.id]?.apiKey || "" } }))}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                    />
                    <input
                      type="password"
                      placeholder="API Key / Token"
                      value={platformInputs[platform.id]?.apiKey || ""}
                      onChange={e => setPlatformInputs(p => ({ ...p, [platform.id]: { ...p[platform.id], apiKey: e.target.value, shopId: p[platform.id]?.shopId || "" } }))}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
                    />
                    <button onClick={() => handlePlatformConnect(platform.id)} className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Kết nối</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

          {/* Warehouse Tab */}
          {activeTab === "warehouse" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`font-semibold ${textPrimary}`}>Quản lý kho hàng & chi nhánh</h2>
                <button onClick={() => setShowAddWarehouse(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                  <Plus className="w-4 h-4" />Thêm kho
                </button>
              </div>
              {warehousesData.map(wh => (
                <div key={wh.id} className={`p-5 rounded-2xl border ${cardBg}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-5 h-5 text-blue-500" />
                        <span className={`font-semibold ${textPrimary}`}>{wh.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${wh.type === "main" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {wh.type === "main" ? "Kho chính" : "Chi nhánh"}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 text-sm ${textSec}`}>
                        <Building className="w-3.5 h-3.5" />{wh.address}
                      </div>
                    </div>
                    <button className={`p-2 rounded-xl ${dark ? "text-gray-400 hover:bg-gray-700" : "text-gray-400 hover:bg-gray-100"}`}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className={`text-sm ${textSec}`}>Sức chứa sử dụng</span>
                      <span className={`text-sm font-medium ${textPrimary}`}>{wh.used}/{wh.capacity} SKU ({Math.round(wh.used / wh.capacity * 100)}%)</span>
                    </div>
                    <div className={`h-2.5 rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
                      <div
                        className={`h-full rounded-full transition-all ${wh.used / wh.capacity > 0.8 ? "bg-red-500" : wh.used / wh.capacity > 0.6 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${(wh.used / wh.capacity) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* System Tab */}
          {activeTab === "system" && (
            <div className="space-y-4">
              {/* Appearance */}
              <div className={`p-5 rounded-2xl border ${cardBg}`}>
                <h2 className={`font-semibold mb-4 ${textPrimary}`}>Giao diện & Ngôn ngữ</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm font-medium ${textPrimary}`}>Chế độ tối (Dark Mode)</div>
                      <div className={`text-xs ${textSec}`}>Giúp nhân viên làm việc đêm đỡ mỏi mắt</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-yellow-500" />
                      <Toggle value={dark} onChange={toggle} />
                      <Moon className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                  <div className={`border-t ${divider}`} />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm font-medium ${textPrimary}`}>Ngôn ngữ hệ thống</div>
                      <div className={`text-xs ${textSec}`}>Hỗ trợ đa ngôn ngữ cho kinh doanh xuyên biên giới</div>
                    </div>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className={`px-3 py-1.5 rounded-xl border text-sm outline-none ${inputBg}`}>
                      <option value="vi">🇻🇳 Tiếng Việt</option>
                      <option value="en">🇺🇸 English</option>
                      <option value="zh">🇨🇳 中文</option>
                      <option value="th">🇹🇭 ภาษาไทย</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className={`p-5 rounded-2xl border ${cardBg}`}>
                <h2 className={`font-semibold mb-4 ${textPrimary}`}>Cài đặt thông báo</h2>
                <div className="space-y-3">
                  {[
                    { key: "order", label: "Đơn hàng mới", sub: "Nhận ngay khi có đơn từ bất kỳ kênh nào" },
                    { key: "stock", label: "Cảnh báo tồn kho", sub: "Khi hàng xuống dưới mức tối thiểu" },
                    { key: "message", label: "Tin nhắn khách hàng", sub: "Có tin nhắn mới từ khách chưa trả lời" },
                    { key: "system", label: "Thông báo hệ thống", sub: "Cập nhật chính sách từ các sàn TMĐT" },
                  ].map(n => (
                    <div key={n.key} className="flex items-center justify-between">
                      <div>
                        <div className={`text-sm font-medium ${textPrimary}`}>{n.label}</div>
                        <div className={`text-xs ${textSec}`}>{n.sub}</div>
                      </div>
                      <Toggle
                        value={notifications[n.key as keyof typeof notifications]}
                        onChange={() => setNotifications(p => ({ ...p, [n.key]: !p[n.key as keyof typeof p] }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Backup */}
              <div className={`p-5 rounded-2xl border ${cardBg}`}>
                <h2 className={`font-semibold mb-4 ${textPrimary}`}>Sao lưu & Bảo mật dữ liệu</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm font-medium ${textPrimary}`}>Tự động sao lưu hàng ngày</div>
                      <div className={`text-xs ${textSec}`}>Lưu trữ an toàn trên Cloud • Lịch: 02:00 SA mỗi ngày</div>
                    </div>
                    <Toggle value={autoBackup} onChange={() => setAutoBackup(!autoBackup)} />
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "bg-green-950/30 border border-green-900" : "bg-green-50 border border-green-200"}`}>
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div>
                      <div className={`text-sm font-medium ${dark ? "text-green-300" : "text-green-700"}`}>Sao lưu gần nhất thành công</div>
                      <div className={`text-xs ${dark ? "text-green-400" : "text-green-600"}`}>17/03/2026 02:00 • 247 MB • Cloud Storage</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                      <Database className="w-4 h-4" />Sao lưu ngay
                    </button>
                    <button className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      <RefreshCw className="w-4 h-4" />Khôi phục
                    </button>
                  </div>
                </div>
              </div>

              {/* Print template */}
              <div className={`p-5 rounded-2xl border ${cardBg}`}>
                <h2 className={`font-semibold mb-4 ${textPrimary}`}>Tùy chỉnh mẫu in</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Phiếu giao hàng", sub: "Tùy chỉnh logo và thông tin thương hiệu" },
                    { label: "Hóa đơn điện tử", sub: "Xuất file hóa đơn cho khách doanh nghiệp" },
                    { label: "Tem nhãn SKU", sub: "Tự động tạo và in tem dán sản phẩm" },
                    { label: "Phiếu đóng gói", sub: "Checklist đóng gói cho nhân viên kho" },
                  ].map((t, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"} cursor-pointer ${rowHover} transition-colors`}>
                      <Printer className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className={`text-sm font-medium ${textPrimary}`}>{t.label}</div>
                        <div className={`text-xs ${textSec}`}>{t.sub}</div>
                      </div>
                      <Edit3 className="w-4 h-4 text-gray-400 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Add Role Modal */}
          {showAddRole && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className={`rounded-2xl border w-full max-w-md ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className={`flex items-center justify-between p-5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
                  <h2 className={`font-semibold ${textPrimary}`}>Thêm vai trò mới</h2>
                  <button onClick={() => setShowAddRole(false)} className={`p-1 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"}`}>✕</button>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Tên vai trò *</label>
                    <input value={newRole.name} onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))} type="text" placeholder="VD: Quản lý marketing" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Mô tả</label>
                    <input value={newRole.description} onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))} type="text" placeholder="Mô tả ngắn về vai trò" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Quyền hạn (phân cách bằng dấu phẩy)</label>
                    <input value={newRole.permissions} onChange={e => setNewRole(p => ({ ...p, permissions: e.target.value }))} type="text" placeholder="VD: Xem đơn hàng, Chỉnh sửa sản phẩm" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                  </div>
                </div>
                <div className={`flex gap-3 p-5 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
                  <button onClick={() => setShowAddRole(false)} className={`flex-1 py-2.5 rounded-xl border text-sm ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>Hủy</button>
                  <button onClick={handleAddRole} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Thêm vai trò</button>
                </div>
              </div>
            </div>
          )}

          {/* Add Warehouse Modal */}
          {showAddWarehouse && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className={`rounded-2xl border w-full max-w-md ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className={`flex items-center justify-between p-5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
                  <h2 className={`font-semibold ${textPrimary}`}>Thêm kho mới</h2>
                  <button onClick={() => setShowAddWarehouse(false)} className={`p-1 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"}`}>✕</button>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Tên kho *</label>
                    <input value={newWarehouse.name} onChange={e => setNewWarehouse(p => ({ ...p, name: e.target.value }))} type="text" placeholder="VD: Kho phụ - Đà Nẵng" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Địa chỉ</label>
                    <input value={newWarehouse.address} onChange={e => setNewWarehouse(p => ({ ...p, address: e.target.value }))} type="text" placeholder="Số nhà, đường, quận, tỉnh" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Sức chứa (SKU)</label>
                    <input value={newWarehouse.capacity} onChange={e => setNewWarehouse(p => ({ ...p, capacity: Number(e.target.value) }))} type="number" min={1} className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                  </div>
                </div>
                <div className={`flex gap-3 p-5 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
                  <button onClick={() => setShowAddWarehouse(false)} className={`flex-1 py-2.5 rounded-xl border text-sm ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>Hủy</button>
                  <button onClick={handleAddWarehouse} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Thêm kho</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
}
