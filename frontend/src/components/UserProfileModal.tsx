import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Phone, MapPin, Shield, Edit3, Save, Package, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onUpdateUser: (updatedUser: any) => void;
  onOpenMyOrders: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onOpenMyOrders,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address fields according to iam.addresses
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [province, setProvince] = useState('TP. Hồ Chí Minh');
  const [district, setDistrict] = useState('Quận 1');
  const [ward, setWard] = useState('Phường Bến Nghé');
  const [detailAddress, setDetailAddress] = useState('123 Nguyễn Huệ');
  
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (currentUser && isOpen) {
      setFullName(currentUser.full_name || currentUser.username || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');

      // Load địa chỉ thật từ Supabase Backend
      api.getAddresses().then((addresses) => {
        if (addresses && addresses.length > 0) {
          const defaultAddr = addresses.find((a: any) => a.is_default) || addresses[0];
          setReceiverName(defaultAddr.receiver_name || currentUser.full_name || '');
          setReceiverPhone(defaultAddr.phone || currentUser.phone || '');
          setProvince(defaultAddr.province || 'TP. Hồ Chí Minh');
          setDistrict(defaultAddr.district || 'TP. Thủ Đức');
          setWard(defaultAddr.ward || 'Phường Cát Lái');
          setDetailAddress(defaultAddr.detail || '');
        } else {
          setReceiverName(currentUser.full_name || '');
          setReceiverPhone(currentUser.phone || '');
          setProvince('TP. Hồ Chí Minh');
          setDistrict('TP. Thủ Đức');
          setWard('Phường Cát Lái');
          setDetailAddress('');
        }
      }).catch((err) => {
        console.error('Không thể lấy địa chỉ:', err);
      });
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Cập nhật iam.users
      await api.updateProfile({
        full_name: fullName,
        phone: phone,
      });

      // 2. Cập nhật iam.addresses
      await api.saveAddress({
        receiver_name: receiverName,
        phone: receiverPhone,
        province,
        district,
        ward,
        detail: detailAddress,
        is_default: true,
      });

      // 3. Lấy lại profile mới nhất từ DB
      const latestUser = await api.getCurrentUser();
      onUpdateUser(latestUser);

      setIsEditing(false);
      setSuccessMessage('Đã lưu thông tin & địa chỉ vào CSDL Supabase thành công!');

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      console.error('Lỗi khi lưu thông tin:', err);
      alert('Không thể lưu thông tin vào CSDL: ' + (err.message || err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="bg-[#111111] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0072bc] flex items-center justify-center font-black text-lg text-white shadow-inner">
              {(fullName[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">THÔNG TIN CÁ NHÂN</h2>
              <p className="text-[11px] text-white/70">Quản lý hồ sơ & sổ địa chỉ nhận hàng (iam.users)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Quick Action Navigation Bar */}
          <div className="flex items-center justify-between bg-[#f8f9fa] p-3 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <Shield className="w-4 h-4 text-[#0072bc]" />
              <span>Vai trò: <span className="uppercase text-[#0072bc] font-black">{currentUser.role || 'CUSTOMER'}</span></span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenMyOrders();
              }}
              className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#0072bc] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Xem Đơn Hàng Đã Mua</span>
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Section 1: Personal Account Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h3 className="text-xs font-black uppercase text-gray-900 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-[#0072bc]" />
                  Thông Tin Tài Khoản
                </h3>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-bold text-[#0072bc] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Chỉnh sửa
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-600">Đang chế độ chỉnh sửa</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Họ và Tên
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#0072bc] focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled={!isEditing}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#0072bc] focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Số Điện Thoại Đăng Ký
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Nhập số điện thoại..."
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#0072bc] focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Default Delivery Address (iam.addresses) */}
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-xs font-black uppercase text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0072bc]" />
                  Địa Chỉ Giao Hàng Mặc Định (iam.addresses)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Tên Người Nhận
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#0072bc] focus:bg-white disabled:opacity-70 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Số Điện Thoại Nhận Hàng
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#0072bc] focus:bg-white disabled:opacity-70 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Tỉnh / Thành Phố
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#0072bc] focus:bg-white disabled:opacity-70 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Quận / Huyện
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#0072bc] focus:bg-white disabled:opacity-70 transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Địa Chỉ Chi Tiết (Số nhà, tên đường, Phường/Xã)
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#0072bc] focus:bg-white disabled:opacity-70 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-[#0072bc] hover:bg-[#005a96] text-white text-xs font-extrabold px-5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            )}

          </form>

        </div>

      </div>
    </div>
  );
};
