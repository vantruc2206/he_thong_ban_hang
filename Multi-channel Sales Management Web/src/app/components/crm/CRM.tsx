import { useState, useEffect } from "react";
import {
  Users, MessageSquare, Star, Send, Search, Filter, Gift,
  AlertTriangle, Phone, Mail, ShoppingBag, Clock, Plus,
  ChevronRight, Award, BarChart2, Megaphone, CheckSquare, Bell,
  MapPin, Package, XCircle, Camera, FileText, ChevronDown, CheckCircle, Truck
} from "lucide-react";
import { formatVND } from "../../data/mockData";
import { useTheme } from "../Layout";
import { getCustomers } from "../../../lib/services/customerService";
import { CreateOrderModal } from "../orders/CreateOrderModal";

const segmentColors: Record<string, string> = {
  "VIP": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Loyal": "bg-purple-100 text-purple-700 border-purple-200",
  "Regular": "bg-blue-100 text-blue-700 border-blue-200",
  "New": "bg-green-100 text-green-700 border-green-200",
  "At-Risk": "bg-red-100 text-red-700 border-red-200",
};

const messages = [
  {
    id: 1, customer: "Nguyễn Thị Hoa", channel: "shopee", avatar: "🛍️",
    lastMsg: "Chị ơi serum trà xanh còn hàng không ạ?", time: "2 phút trước", unread: 2, status: "online"
  },
  {
    id: 2, customer: "Trần Văn Minh", channel: "tiktok", avatar: "👤",
    lastMsg: "Ship bao lâu tới HN vậy shop?", time: "15 phút trước", unread: 1, status: "online"
  },
  {
    id: 3, customer: "Lê Thị Mai", channel: "lazada", avatar: "👩",
    lastMsg: "Cảm ơn shop nhé, hàng đẹp lắm ạ 😍", time: "1 giờ trước", unread: 0, status: "away"
  },
  {
    id: 4, customer: "Đặng Thị Hương", channel: "shopee", avatar: "🌸",
    lastMsg: "Cho hỏi son 3CE màu Daffodil còn hàng không shop?", time: "2 giờ trước", unread: 3, status: "offline"
  },
  {
    id: 5, customer: "Bùi Quang Trung", channel: "website", avatar: "👨",
    lastMsg: "Mình muốn hỏi về thành phần kem chống nắng.", time: "3 giờ trước", unread: 0, status: "offline"
  },
];

const quickReplies = [
  "Dạ shop còn hàng ạ! Bạn để lại địa chỉ để shop báo phí ship nhé 😊",
  "Đơn từ HN thường 2-3 ngày nhận ạ! Shop sẽ giao qua GHN nha bạn",
  "Sản phẩm phù hợp với da dầu mụn ạ. Bạn cho biết tình trạng da để shop tư vấn kỹ hơn nha!",
  "Shop đang có sale 20% các dòng Serum đến hết 31/3 ạ! Mua ngay để được giá tốt nha 🎉",
  "Bạn muốn đổi trả hàng mình tạo đơn thu hồi cho bạn ngay nha, hoàn toàn miễn phí ạ!",
];

const reviews = [
  { id: 1, customer: "Nguyễn Thu Hà", rating: 5, product: "Serum HA+ Lana", channel: "shopee", content: "Serum thấm nhanh, cấp ẩm cực tốt cho da khô. Sẽ ủng hộ shop dài dài!", date: "16/03" },
  { id: 2, customer: "Trần Ngọc Anh", rating: 2, product: "Kem Chống Nắng Lana", channel: "lazada", content: "Kem bị vón cục khi bôi lên da, không thẩm thấu tốt như quảng cáo. Rất thất vọng.", date: "15/03" },
  { id: 3, customer: "Lê T.H", rating: 4, product: "Sữa Rửa Mặt Dịu Nhẹ", channel: "tiktok", content: "Sạch sâu nhưng vẫn giữ được độ ẩm, không bị khô căng. Giao hàng nhanh.", date: "14/03" },
  { id: 4, customer: "Phạm Q.H", rating: 5, product: "Chanel No.5", channel: "website", content: "Hương thơm sang trọng, lưu hương lâu. Hàng chính hãng 100%, check code ok.", date: "13/03" },
  { id: 5, customer: "Mai Tuyết", rating: 3, product: "Son Dưỡng Rose Gold", channel: "shopee", content: "Màu đẹp nhưng hơi nhanh trôi, cần thoa lại nhiều lần.", date: "12/03" },
  { id: 6, customer: "Hoàng Gia Bảo", rating: 5, product: "Dior Sauvage", channel: "tiktok", content: "Mùi hương nam tính, rất cuốn hút. Shop đóng gói cẩn thận.", date: "11/03" },
];

const channelColor: Record<string, string> = {
  shopee: "text-orange-500",
  tiktok: "text-gray-700",
  lazada: "text-indigo-500",
  website: "text-blue-500",
};

// Remove type Customer = typeof customers[0];

export function CRM() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState<"chat" | "customers" | "reviews" | "broadcast">("chat");
  
  // Real API Chat states
  const [apiSessions, setApiSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [currentSessionMessages, setCurrentSessionMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoValue, setPromoValue] = useState("");
  const [customersData, setCustomersData] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("Tất cả phân khúc");
  const [customerNote, setCustomerNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Fetch Chat Sessions
  const fetchSessions = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/chat/sessions");
      if (res.ok) {
        const data = await res.json();
        setApiSessions(data);
        if (data.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data[0].session_id);
        }
      }
    } catch (e) {
      console.warn("Could not fetch real chat sessions:", e);
    }
  };

  // Fetch Messages for selected session
  const fetchMessages = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/chat/messages/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentSessionMessages(data);
      }
      // Mark as read
      fetch(`http://localhost:8000/api/v1/chat/sessions/${sessionId}/read`, { method: "PUT" });
    } catch (e) {
      console.warn("Could not fetch session messages:", e);
    }
  };

  useEffect(() => {
    if (activeTab === "chat") {
      fetchSessions();
      const interval = setInterval(() => {
        fetchSessions();
        if (selectedSessionId) {
          fetchMessages(selectedSessionId);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedSessionId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchMessages(selectedSessionId);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    getCustomers().then(data => {
      setCustomersData(data.map(c => ({
        id: c.id,
        name: c.full_name,
        phone: c.phone || "—",
        email: c.email || "—",
        segment: c.segment || "New",
        loyaltyPoints: c.loyalty_points || 0,
        totalOrders: c.total_orders || 0,
        totalSpent: c.total_spent || 0,
        blacklist: c.is_blacklisted || false,
        note: c.note || "",
        channel: c.channel || "website",
        lastOrder: "Gần đây"
      })));
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        setShowOrderModal(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredCustomers = customersData.filter(c => {
    const matchSearch = !customerSearch ||
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch) ||
      (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase()));
    const matchSegment = segmentFilter === "Tất cả phân khúc" || c.segment === segmentFilter;
    return matchSearch && matchSegment;
  });

  async function sendChat() {
    if (!chatInput.trim() || !selectedSessionId) return;
    const msgText = chatInput.trim();
    setChatInput("");
    try {
      const res = await fetch("http://localhost:8000/api/v1/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSessionId,
          sender_type: "admin",
          sender_name: "NV Tư Vấn",
          message: msgText
        })
      });
      if (res.ok) {
        fetchMessages(selectedSessionId);
        fetchSessions();
      }
    } catch (e) {
      console.error("Failed to send chat message:", e);
    }
  }

  async function saveCustomerNote() {
    if (!selectedCustomer) return;
    setCustomersData(prev => prev.map(c =>
      c.id === selectedCustomer.id ? { ...c, note: customerNote } : c
    ));
    await import('../../../lib/services/customerService').then(m =>
      m.updateCustomer(selectedCustomer.id, { note: customerNote })
    );
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSec = dark ? "text-gray-400" : "text-gray-500";
  const cardBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const rowHover = dark ? "hover:bg-gray-800" : "hover:bg-gray-50";
  const inputBg = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const divider = dark ? "border-gray-800" : "border-gray-100";

  // Danh sách hiển thị: kết hợp API sessions và mock data nếu API chưa có dữ liệu
  const displaySessions = apiSessions.length > 0 ? apiSessions : messages.map(m => ({
    session_id: `mock-${m.id}`,
    customer_name: m.customer,
    last_message: m.lastMsg,
    last_message_at: m.time,
    unread_count: m.unread,
    user_id: null
  }));

  const activeSessionObj = displaySessions.find(s => s.session_id === selectedSessionId) || displaySessions[0];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`font-bold text-xl ${textPrimary}`}>Chăm sóc khách hàng</h1>
          <p className={`text-sm ${textSec}`}>Chat đa kênh tập trung • {customersData.length} khách hàng</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl ${dark ? "bg-gray-900 border border-gray-800" : "bg-gray-100"}`}>
        {[
          { id: "chat", label: "Chat đa kênh", icon: MessageSquare },
          { id: "customers", label: "Hồ sơ khách hàng", icon: Users },
          { id: "reviews", label: "Đánh giá", icon: Star },
          { id: "broadcast", label: "Gửi hàng loạt", icon: Megaphone },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 flex-1 justify-center py-2 px-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? "bg-pink-600 text-white shadow-sm" : dark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Tab - 3 Column Layout */}
      {activeTab === "chat" && (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`} style={{ height: 600 }}>
          <div className="flex h-full">
            
            {/* COLUMN 1: Message list sidebar */}
            <div className={`w-80 flex-shrink-0 border-r ${divider} flex flex-col ${dark ? "bg-gray-900" : "bg-white"}`}>
              <div className={`p-3 border-b ${divider}`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${textPrimary}`}>Danh sách cuộc trò chuyện</span>
                  </div>
                  <button className={`p-1.5 rounded-lg text-xs ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border focus-within:ring-2 focus-within:ring-blue-500/20 transition-all ${inputBg}`}>
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input type="text" placeholder="Tìm kiếm phiên chat..." className="flex-1 text-xs bg-transparent outline-none" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {displaySessions.map(sess => (
                  <div
                    key={sess.session_id}
                    onClick={() => setSelectedSessionId(sess.session_id)}
                    className={`flex gap-3 p-3 cursor-pointer border-b last:border-0 ${divider} transition-colors ${
                      selectedSessionId === sess.session_id ? dark ? "bg-blue-950/40" : "bg-blue-50" : rowHover
                    }`}
                  >
                    <div className="relative flex-shrink-0 mt-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border border-gray-100 ${dark ? "bg-gray-800 text-gray-200" : "bg-blue-100 text-blue-700"}`}>
                        {sess.customer_name?.charAt(0) || "K"}
                      </div>
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${dark ? "border-gray-900 bg-blue-600" : "bg-blue-500"} text-white`}>
                        <MessageSquare className="w-2 h-2" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold truncate ${textPrimary}`}>{sess.customer_name}</span>
                        {sess.unread_count > 0 ? (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {sess.unread_count}
                          </span>
                        ) : sess.is_registered ? (
                          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">
                            Thành viên
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-gray-200">
                            Khách vãng lai
                          </span>
                        )}
                      </div>
                      {sess.customer_email && (
                        <div className="text-[10px] text-gray-400 truncate mb-0.5">
                          {sess.customer_email} {sess.customer_phone ? `| ${sess.customer_phone}` : ""}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className={`text-xs truncate ${sess.unread_count ? `${textPrimary} font-medium` : textSec}`}>
                          {sess.last_message}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 2: Chat area */}
            <div className={`flex-1 flex flex-col ${dark ? "bg-gray-900" : "bg-gray-50/30"}`}>
              {/* Chat header */}
              <div className={`flex items-center justify-between p-3 border-b ${divider} bg-white dark:bg-gray-900`}>
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border border-gray-100 ${
                    activeSessionObj?.is_registered ? "bg-emerald-100 text-emerald-800" : (dark ? "bg-gray-800 text-gray-200" : "bg-blue-100 text-blue-700")
                  }`}>
                    {activeSessionObj?.customer_name?.charAt(0) || "K"}
                  </span>
                  <div>
                    <div className={`text-sm font-bold ${textPrimary} flex items-center gap-2`}>
                      {activeSessionObj?.customer_name || "Khách hàng"} 
                      {activeSessionObj?.is_registered ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Thành viên đã đăng ký
                        </span>
                      ) : (
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          Khách vãng lai (Web)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs mt-0.5">
                      {activeSessionObj?.customer_email && (
                        <span className="text-gray-500">📧 {activeSessionObj.customer_email}</span>
                      )}
                      {activeSessionObj?.customer_phone && (
                        <span className="text-gray-500">📞 {activeSessionObj.customer_phone}</span>
                      )}
                      <span className="text-green-600 flex items-center gap-1 font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Mã phiên: #{activeSessionObj?.session_id?.slice(-8)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentSessionMessages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-10">
                    Chưa có tin nhắn trong phiên chat này.
                  </div>
                ) : (
                  currentSessionMessages.map((msg, i) => {
                    const isAdmin = msg.sender_type === "admin";
                    return (
                      <div key={msg.id || i} className={`flex ${isAdmin ? "justify-end" : "justify-start"} gap-2`}>
                        {!isAdmin && (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm bg-gray-200 text-gray-700 flex-shrink-0`}>
                            {msg.sender_name?.charAt(0) || "K"}
                          </div>
                        )}
                        <div className="max-w-[70%] flex flex-col">
                          <div className={`p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap break-words inline-block w-fit ${
                            isAdmin 
                              ? "bg-pink-600 text-white rounded-tr-sm self-end" 
                              : dark ? "bg-gray-800 text-gray-200 rounded-tl-sm self-start" : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm self-start"
                          }`}>
                            {msg.message}
                          </div>
                          <div className={`text-[10px] text-gray-400 mt-1 ${isAdmin ? "text-right mr-1" : "ml-1"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm bg-pink-600 flex-shrink-0`}>
                            NV
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input area */}
              <div className={`p-3 bg-white border-t ${divider} dark:bg-gray-900`}>
                <div className={`flex items-end gap-2 p-1 rounded-xl border focus-within:ring-2 focus-within:ring-pink-500/20 transition-all ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendChat()}
                      placeholder="Nhập tin nhắn tư vấn... Nhấn Enter để gửi"
                      className="w-full px-3 py-2 text-sm bg-transparent outline-none h-10"
                    />
                  </div>
                  <button
                    onClick={sendChat}
                    className="p-2 mb-1 mr-1 rounded-lg bg-pink-600 text-white hover:bg-pink-700 transition-colors shadow-sm flex items-center gap-1 font-medium text-xs px-4"
                  >
                    Gửi <Send className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === "customers" && (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <div className={`flex items-center gap-3 p-4 border-b ${divider}`}>
            <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border ${inputBg}`}>
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Tìm khách hàng..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none"
              />
            </div>
            <select
              value={segmentFilter}
              onChange={e => setSegmentFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}
            >
              <option>Tất cả phân khúc</option>
              <option>VIP</option>
              <option>Loyal</option>
              <option>Regular</option>
              <option>New</option>
              <option>At-Risk</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${dark ? "border-gray-800 bg-gray-800/50" : "border-gray-100 bg-gray-50"}`}>
                  {["Khách hàng", "SĐT / Email", "Kênh", "Tổng đơn", "Tổng chi tiêu", "Điểm thưởng", "Phân khúc", "Thao tác"].map(h => (
                    <th key={h} className={`p-3 text-left text-xs font-semibold ${textSec} whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr key={c.id} className={`border-b last:border-0 ${dark ? "border-gray-800" : "border-gray-50"} ${rowHover} transition-colors ${c.blacklist ? dark ? "bg-red-950/20" : "bg-red-50/50" : ""}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {c.blacklist && <span title="Blacklist"><AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /></span>}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"}`}>
                          {c.name[0]}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${textPrimary}`}>{c.name}</div>
                          <div className={`text-xs ${textSec}`}>Lần cuối: {c.lastOrder}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className={`text-sm ${textPrimary}`}>{c.phone}</div>
                      <div className={`text-xs ${textSec}`}>{c.email}</div>
                    </td>
                    <td className={`p-3 text-sm capitalize ${channelColor[c.channel]}`}>{c.channel}</td>
                    <td className={`p-3 text-sm font-medium ${textPrimary}`}>{c.totalOrders}</td>
                    <td className={`p-3 text-sm font-semibold ${textPrimary}`}>{formatVND(c.totalSpent)}</td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${dark ? "text-yellow-400" : "text-yellow-600"}`}>
                        <Star className="w-3 h-3 fill-current" />{c.loyaltyPoints} điểm
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${segmentColors[c.segment]}`}>{c.segment}</span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => setSelectedCustomer(c)} className={`p-1.5 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-700" : "text-gray-400 hover:bg-gray-100"}`}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className={`p-4 rounded-2xl border ${cardBg}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"}`}>
                    {review.customer[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${textPrimary}`}>{review.customer}</span>
                      <span className={`text-xs capitalize ${channelColor[review.channel]}`}>[{review.channel}]</span>
                      <span className={`text-xs ${textSec}`}>{review.date}</span>
                    </div>
                    <div className="flex gap-0.5 my-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                      ))}
                    </div>
                    <div className={`text-xs ${textSec} mb-1`}>Sản phẩm: {review.product}</div>
                    <p className={`text-sm ${textPrimary}`}>{review.content}</p>
                  </div>
                </div>
                {review.rating <= 2 && (
                  <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full border border-red-200 flex-shrink-0">
                    <AlertTriangle className="w-3 h-3" />Cần phản hồi
                  </span>
                )}
              </div>
              {review.rating <= 2 && (
                <div className={`mt-3 pt-3 border-t ${divider} flex gap-2`}>
                  <input type="text" placeholder="Nhập phản hồi công khai..." className={`flex-1 px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`} />
                  <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Gửi</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Tab */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`p-5 rounded-2xl border ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>📢 Gửi tin nhắn hàng loạt</h3>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Phân khúc khách hàng</label>
                <select className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${inputBg}`}>
                  <option>Tất cả khách hàng ({customersData.length} người)</option>
                  <option>Khách VIP (48 người)</option>
                  <option>Khách thân thiết (125 người)</option>
                  <option>Khách chưa mua 30 ngày (87 người)</option>
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Kênh gửi</label>
                <div className="flex gap-3">
                  {["Shopee", "TikTok", "Website"].map(ch => (
                    <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className={`text-sm ${textSec}`}>{ch}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Nội dung tin nhắn</label>
                <textarea
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  rows={4}
                  placeholder="VD: 🎉 Chào [Tên khách hàng]! Shop đang có chương trình TRI ÂN KHÁCH HÀNG..."
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Đính kèm mã giảm giá</label>
                <div className="flex gap-2">
                  <div className={`flex-[1.5] flex items-center gap-2 px-3 py-2 rounded-xl border ${inputBg}`}>
                    <Gift className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input 
                      type="text" 
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      placeholder="VD: TRIANVIP20" 
                      className="flex-1 text-sm bg-transparent outline-none" 
                    />
                  </div>
                  <div className={`flex-[2.5] flex items-center gap-2 px-3 py-2 rounded-xl border ${inputBg}`}>
                    <Award className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input 
                      type="text" 
                      value={promoValue}
                      onChange={e => setPromoValue(e.target.value)}
                      placeholder="Chi tiết: Giảm 20% cho đơn 500k..." 
                      className="flex-1 text-sm bg-transparent outline-none" 
                    />
                  </div>
                </div>
              </div>
              <button className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                <Megaphone className="w-4 h-4" />Gửi chiến dịch
              </button>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>🏆 Hệ thống tích điểm (Loyalty)</h3>
            <div className="space-y-3">
              {[
                { label: "Tổng điểm đã phát hành", value: "125,840 điểm", icon: Star, color: "text-yellow-500" },
                { label: "Khách đang tích điểm", value: `${customersData.length} khách`, icon: Users, color: "text-blue-500" },
                { label: "Điểm sắp hết hạn (30 ngày)", value: "8,240 điểm", icon: Clock, color: "text-orange-500" },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <div className="flex-1">
                    <div className={`text-sm ${textSec}`}>{item.label}</div>
                  </div>
                  <div className={`text-sm font-bold ${textPrimary}`}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className={`mt-4 pt-4 border-t ${dark ? "border-gray-700" : "border-gray-200"}`}>
              <h4 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Top khách hàng trung thành</h4>
              {customersData.filter(c => !c.blacklist).sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, 4).map((c, i) => (
                <div key={c.id || i} className={`flex items-center gap-3 py-2 border-b last:border-0 ${dark ? "border-gray-800" : "border-gray-100"}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : dark ? "bg-gray-700 text-gray-400" : "bg-gray-50 text-gray-500"}`}>{i + 1}</span>
                  <span className={`flex-1 text-sm ${textPrimary}`}>{c.name}</span>
                  <span className={`text-xs font-medium ${dark ? "text-yellow-400" : "text-yellow-600"}`}>{c.loyaltyPoints.toLocaleString()} điểm</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${segmentColors[c.segment]}`}>{c.segment}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className={`flex items-center justify-between p-5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <h2 className={`font-semibold ${textPrimary}`}>Hồ sơ khách hàng</h2>
              <button onClick={() => setSelectedCustomer(null)} className={`p-1 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"}`}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"}`}>
                  {selectedCustomer.name[0]}
                </div>
                <div>
                  <div className={`font-bold text-lg ${textPrimary}`}>{selectedCustomer.name}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${segmentColors[selectedCustomer.segment]}`}>{selectedCustomer.segment}</span>
                  {selectedCustomer.blacklist && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">⚠️ Blacklist</span>}
                </div>
              </div>
              <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div><div className={`text-xs ${textSec}`}>SĐT</div><div className={`text-sm font-medium ${textPrimary}`}>{selectedCustomer.phone}</div></div>
                <div><div className={`text-xs ${textSec}`}>Email</div><div className={`text-sm ${textPrimary}`}>{selectedCustomer.email}</div></div>
                <div><div className={`text-xs ${textSec}`}>Kênh</div><div className={`text-sm font-medium capitalize ${channelColor[selectedCustomer.channel]}`}>{selectedCustomer.channel}</div></div>
                <div><div className={`text-xs ${textSec}`}>Lần cuối mua</div><div className={`text-sm ${textPrimary}`}>{selectedCustomer.lastOrder}</div></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Đơn hàng", value: selectedCustomer.totalOrders },
                  { label: "Chi tiêu", value: formatVND(selectedCustomer.totalSpent) },
                  { label: "Điểm thưởng", value: `${selectedCustomer.loyaltyPoints}đ` },
                ].map((s, i) => (
                  <div key={i} className={`text-center p-3 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <div className={`font-bold ${textPrimary}`}>{s.value}</div>
                    <div className={`text-xs ${textSec}`}>{s.label}</div>
                  </div>
                ))}
              </div>
              {selectedCustomer.note && (
                <div className={`p-3 rounded-xl ${dark ? "bg-yellow-950/30 border border-yellow-900" : "bg-yellow-50 border border-yellow-200"}`}>
                  <div className={`text-xs font-medium mb-1 ${dark ? "text-yellow-400" : "text-yellow-700"}`}>Ghi chú nội bộ</div>
                  <p className={`text-sm ${textSec}`}>{selectedCustomer.note}</p>
                </div>
              )}
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSec}`}>Thêm ghi chú</label>
                <textarea
                  rows={2}
                  value={customerNote}
                  onChange={e => setCustomerNote(e.target.value)}
                  placeholder="Ghi chú về khách hàng này..."
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${inputBg}`}
                />
                <button
                  onClick={saveCustomerNote}
                  className={`mt-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    noteSaved
                      ? "bg-green-600 text-white"
                      : "bg-pink-600 text-white hover:bg-pink-700"
                  }`}
                >
                  {noteSaved ? "✓ Đã lưu" : "Lưu ghi chú"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOrderModal && (
        <CreateOrderModal 
          onClose={() => setShowOrderModal(false)}
          initialCustomer={{
            name: activeSessionObj?.customer_name || selectedCustomer?.name,
            phone: selectedCustomer?.phone !== "—" ? selectedCustomer?.phone : "",
            channel: selectedCustomer?.channel || "website"
          }}
        />
      )}
    </div>
  );
}
