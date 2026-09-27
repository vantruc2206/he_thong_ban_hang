import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, ArrowRight, Gift, Award, Tag, Percent } from 'lucide-react';
import { api } from '../services/api';
import { loginWithGoogleOAuth, loginWithFacebookOAuth } from '../utils/oauth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  initialTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialTab = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMessage('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setErrorMessage('Vui lòng nhập tên đăng nhập/email và mật khẩu');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    try {
      await api.login(username, password);
      const currentUser = await api.getCurrentUser();
      onLoginSuccess(currentUser);
      onClose();
    } catch (err: any) {
      console.error('Lỗi đăng nhập Backend:', err);
      setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'Google' | 'Facebook') => {
    setLoading(true);
    setErrorMessage('');
    try {
      let oauthUser;
      if (provider === 'Google') {
        oauthUser = await loginWithGoogleOAuth();
      } else {
        oauthUser = await loginWithFacebookOAuth();
      }
      // Gọi Backend để upsert user vào iam.users Supabase và nhận JWT thật
      const tokenData = await api.socialLogin(oauthUser.email, oauthUser.full_name, oauthUser.avatar_url, oauthUser.provider);
      api.setToken(tokenData.access_token);
      const currentUser = await api.getCurrentUser();
      onLoginSuccess(currentUser);
      onClose();
    } catch (err: any) {
      console.error(`Lỗi xác thực ${provider} OAuth:`, err);
      setErrorMessage(err.message || `Đăng nhập ${provider} thất bại. Vui lòng thử lại.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !registerPassword) {
      setErrorMessage('Vui lòng điền đầy đủ thông tin đăng ký');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    try {
      const registeredUser = await api.register(email, registerPassword, fullName);
      // Tự động đăng nhập sau khi đăng ký thành công trên Backend & Supabase
      await api.login(email, registerPassword);
      const currentUser = await api.getCurrentUser();
      onLoginSuccess(currentUser || registeredUser);
      onClose();
    } catch (err: any) {
      console.error('Lỗi đăng ký Backend Supabase:', err);
      setErrorMessage(err.message || 'Đăng ký thất bại. Email có thể đã được sử dụng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-[#e5e5e5] animate-scale-up grid grid-cols-1 md:grid-cols-12 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 bg-white/80 hover:bg-white text-[#111111] rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: Member Benefits Poster */}
        <div className="md:col-span-5 bg-linear-to-br from-[#111111] via-[#28282a] to-[#000000] text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-[#0072bc]/30 rounded-full blur-2xl"></div>

          <div className="space-y-6 relative z-10">
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#0072bc] uppercase bg-[#0072bc]/20 px-2.5 py-1 rounded-full border border-[#0072bc]/30">
                ƯU ĐÃI ĐỘC QUYỀN THÀNH VIÊN
              </span>
              <h3 className="text-2xl font-black tracking-tight mt-3">
                Thành Viên OMNISTORE
              </h3>
              <p className="text-xs text-white/70 mt-1">
                Tạo tài khoản mua sắm tích điểm, nhận voucher ưu đãi và quản lý đơn hàng thông minh.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 space-y-1">
                <Percent className="w-5 h-5 text-amber-400" />
                <h4 className="text-xs font-bold">Voucher Giảm Giá</h4>
                <p className="text-[10px] text-white/70">Mỗi tháng</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 space-y-1">
                <Award className="w-5 h-5 text-emerald-400" />
                <h4 className="text-xs font-bold">Tích Điểm Mua Sắm</h4>
                <p className="text-[10px] text-white/70">Đổi điểm & Tận hưởng</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 space-y-1">
                <Tag className="w-5 h-5 text-blue-400" />
                <h4 className="text-xs font-bold">Giảm Giá Trực Tiếp</h4>
                <p className="text-[10px] text-white/70">Trên từng đơn hàng</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 space-y-1">
                <Gift className="w-5 h-5 text-purple-400" />
                <h4 className="text-xs font-bold">Quà Tặng Sinh Nhật</h4>
                <p className="text-[10px] text-white/70">Đặc quyền VIP</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-white/50 pt-6 relative z-10 border-t border-white/10">
            Hỗ trợ Google & Meta Facebook OAuth 2.0 chuẩn ISO/IEC 27001.
          </div>
        </div>

        {/* Right Column: Auth Form */}
        <div className="md:col-span-7 p-8 space-y-6 flex flex-col justify-center">

          {/* Tab Switcher */}
          <div className="flex items-center gap-6 border-b border-[#e5e5e5] pb-3">
            <button
              onClick={() => { setActiveTab('login'); setErrorMessage(''); }}
              className={`text-base font-black tracking-tight transition-colors cursor-pointer pb-1 relative ${
                activeTab === 'login' ? 'text-[#111111]' : 'text-[#707072] hover:text-[#111111]'
              }`}
            >
              Đăng Nhập
              {activeTab === 'login' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#111111]"></div>}
            </button>

            <button
              onClick={() => { setActiveTab('register'); setErrorMessage(''); }}
              className={`text-base font-black tracking-tight transition-colors cursor-pointer pb-1 relative ${
                activeTab === 'register' ? 'text-[#111111]' : 'text-[#707072] hover:text-[#111111]'
              }`}
            >
              Đăng Ký Mới
              {activeTab === 'register' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#111111]"></div>}
            </button>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">Email / Tên Đăng Nhập</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="nhap.email@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-[#f5f5f5] text-xs text-[#111111] pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white focus:outline-hidden"
                  />
                  <User className="w-4 h-4 text-[#707072] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">Mật Khẩu</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-[#f5f5f5] text-xs text-[#111111] pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white focus:outline-hidden"
                  />
                  <Lock className="w-4 h-4 text-[#707072] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-200">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 text-xs font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Social Login Options */}
              <div className="pt-4 border-t border-[#e5e5e5] space-y-3">
                <div className="text-center text-[11px] text-[#707072] uppercase font-bold tracking-wider">
                  — Đăng nhập OAuth 2.0 với —
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('Google')}
                    disabled={loading}
                    className="py-3 px-4 bg-white border border-[#e5e5e5] rounded-xl text-xs font-bold text-[#111111] hover:bg-[#f5f5f5] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Google
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialLogin('Facebook')}
                    disabled={loading}
                    className="py-3 px-4 bg-[#1877f2] text-white rounded-xl text-xs font-bold hover:bg-[#165ebc] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">Họ và Tên</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-[#f5f5f5] text-xs text-[#111111] pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white focus:outline-hidden"
                  />
                  <User className="w-4 h-4 text-[#707072] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">Địa chỉ Email</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="nhap.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#f5f5f5] text-xs text-[#111111] pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white focus:outline-hidden"
                  />
                  <Mail className="w-4 h-4 text-[#707072] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">Mật Khẩu</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    className="w-full bg-[#f5f5f5] text-xs text-[#111111] pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-[#111111] focus:bg-white focus:outline-hidden"
                  />
                  <Lock className="w-4 h-4 text-[#707072] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-200">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#111111] text-white py-3.5 rounded-xl text-xs font-bold hover:bg-[#e52e2e] transition-colors cursor-pointer shadow-lg disabled:opacity-50"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản Thành Viên Ngay'}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
