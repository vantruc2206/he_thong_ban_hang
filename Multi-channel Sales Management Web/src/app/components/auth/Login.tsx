import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../../../lib/contexts/AuthContext";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  // Staggered entrance animation trigger
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Redirect already-logged-in users (safe in useEffect)
  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/", { replace: true });
      else if (user.role === "sales") navigate("/orders", { replace: true });
      else navigate("/inventory", { replace: true });
    }
  }, [user, navigate]);

  if (user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pass) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }
    setError("");
    setLoading(true);

    setTimeout(async () => {
      const success = await login(email, pass);
      if (success) {
        const saved = localStorage.getItem("system_auth_user");
        if (saved) {
          const u = JSON.parse(saved);
          if (from === "/" || from === "/login") {
            if (u.role === "admin") navigate("/", { replace: true });
            else if (u.role === "sales") navigate("/orders", { replace: true });
            else navigate("/inventory", { replace: true });
          } else {
            navigate(from, { replace: true });
          }
        }
      } else {
        setError("Email hoặc mật khẩu không chính xác");
        setLoading(false);
      }
    }, 400);
  };

  return (
    <>
      {/* Fonts & Keyframe Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        .login-root         { font-family: 'Inter', system-ui, sans-serif; }
        .font-serif-italic  { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; }

        @keyframes lanaFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lanaShimmer {
          0%   { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(320%) skewX(-20deg); }
        }

        .anim-0 { animation: lanaFadeUp 0.72s cubic-bezier(.22,1,.36,1) 0.08s both; }
        .anim-1 { animation: lanaFadeUp 0.72s cubic-bezier(.22,1,.36,1) 0.22s both; }
        .anim-2 { animation: lanaFadeUp 0.72s cubic-bezier(.22,1,.36,1) 0.38s both; }
        .anim-3 { animation: lanaFadeUp 0.72s cubic-bezier(.22,1,.36,1) 0.52s both; }

        .btn-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent);
          animation: lanaShimmer 2.2s infinite;
          transform: skewX(-20deg);
        }
      `}</style>

      <div className="login-root relative min-h-screen overflow-hidden bg-white flex items-center justify-center">

        {/* ── Background video — vertically flipped per ui.md ── */}
        <video
          autoPlay muted loop playsInline
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ transform: "scaleY(-1)" }}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4"
        />

        {/* ── White gradient overlay — per ui.md exact spec ── */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(255,255,255,0) 26.416%, rgba(255,255,255,1) 66.943%)"
          }}
        />

        {/* ── Additional frosted film to keep text readable ── */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />

        {/* ── Brand mark — top left ── */}
        <div className="absolute top-7 left-8 z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm flex items-center justify-center">
            <span style={{ fontWeight: 800, fontSize: 18, color: "#2563eb" }}>OS</span>
          </div>
          <div>
            <span style={{ fontWeight: 700, letterSpacing: "0.12em", fontSize: 15, color: "#1e293b" }}>OMNI</span>
            <span style={{ fontWeight: 700, letterSpacing: "0.12em", fontSize: 15, color: "#2563eb" }}>SALES</span>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#64748b", marginTop: -2 }}>Hệ Thống Đa Kênh</div>
          </div>
        </div>

        {/* ── Main content wrapper ── */}
        <div
          className={`relative z-10 w-full mx-4 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
          style={{ maxWidth: 440 }}
        >
          {/* Headline */}
          <div className="mb-10 text-center anim-0">
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#2563eb", marginBottom: 16 }}>
              Hệ thống bán hàng & quản lý đa kênh
            </p>
            <h1 style={{ fontSize: 52, lineHeight: 1.05, fontWeight: 500, letterSpacing: "-0.04em", color: "#0f0f0f", margin: 0 }}>
              Chào mừng<br />
              <span className="font-serif-italic" style={{ fontSize: 64, color: "#2563eb" }}>trở lại</span>
            </h1>
            <p style={{ marginTop: 16, fontSize: 15, color: "rgba(55,58,70,0.8)", maxWidth: 340, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
              Đăng nhập để quản lý đơn hàng, tồn kho<br />và đồng bộ sản phẩm đa kênh của bạn.
            </p>
          </div>

          {/* Form card */}
          <div
            className="anim-1"
            style={{
              background: "#fcfcfc",
              borderRadius: 28,
              border: "1px solid #f0f0f0",
              padding: "28px 28px 48px",
              boxShadow: "0px 10px 40px 5px rgba(194,194,194,0.25)",
            }}
          >
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Email field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 8 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@hethong.vn"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "12px 16px", fontSize: 14,
                    background: "#fff", border: "1px solid #e5e7eb",
                    borderRadius: 16, outline: "none", transition: "border-color 0.2s",
                    color: "#1f2937",
                  }}
                  onFocus={e => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {/* Password field */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>
                    Mật khẩu
                  </label>
                  <button type="button" style={{ fontSize: 11, color: "#2563eb", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
                    Quên mật khẩu?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "12px 44px 12px 16px", fontSize: 14,
                      background: "#fff", border: "1px solid #e5e7eb",
                      borderRadius: 16, outline: "none", transition: "border-color 0.2s",
                      color: "#1f2937",
                    }}
                    onFocus={e => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                    onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#d1d5db", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div style={{ fontSize: 12, color: "#ef4444", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 12, padding: "10px 14px" }}>
                  {error}
                </div>
              )}

              {/* CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-shimmer"
                style={{
                  position: "relative", overflow: "hidden",
                  width: "100%", marginTop: 4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px 24px", borderRadius: 16,
                  background: "linear-gradient(135deg, #1e293b 0%, #2563eb 100%)",
                  boxShadow: "0 4px 20px rgba(37,99,235,0.25)",
                  color: "#fff", fontSize: 14, fontWeight: 600,
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  transition: "transform 0.15s, opacity 0.15s",
                }}
                onMouseDown={e => (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <>
                      <span>Đăng nhập</span>
                      <ArrowRight size={16} />
                    </>
                }
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="anim-3" style={{ marginTop: 28, textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.06em" }}>
              Hệ Thống Bán Hàng Đa Kênh © 2026 · Quản lý nội bộ
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
