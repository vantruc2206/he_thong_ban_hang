# Giao diện Quản lý bán hàng đa kênh

Đây là bản sao (Mock UI) của ứng dụng Quản lý bán hàng đa kênh.
Dự án này chỉ tập trung vào phần phát triển giao diện (UI) bằng React, Vite, và TailwindCSS, sử dụng các *dữ liệu mẫu* (mock data) hoàn toàn mà chưa cần kết nối đến bất kỳ backend hoặc hệ thống cơ sở dữ liệu (Database) nào.

## Mục đích
- Làm giao diện tĩnh (Static Layout) và các components.
- Cung cấp mockup cho bên thiết kế/bạn bè xem trước luồng làm việc.
- Trình diễn UX/UI không cần cấu hình database môi trường phức tạp.

## Hướng dẫn sử dụng

### 1. Cài đặt các thư viện phụ thuộc (Node Modules)
Sau khi tải hoặc clone dự án về, mở Terminal trong thư mục `giaodien_qlbhdakenh` và chạy:
```bash
npm install
```

### 2. Khởi chạy máy chủ phát triển (Development Server)
```bash
npm run dev
```

Sau khi chạy xong, Terminal sẽ hiển thị đường link local (ví dụ: `http://localhost:5173/`). Các bạn bấm vào link hoặc dán vào trình duyệt để test giao diện.

### 3. Tài khoản đăng nhập (Demo Accounts)
Bạn có thể sử dụng các tài khoản bên dưới để kiểm tra các luồng phân quyền khác nhau:

| Vai trò (Role) | Email | Mật khẩu | Trang hạ cánh (Landing Page) |
| :--- | :--- | :--- | :--- |
| **Quản trị viên** | `admin@hethong.vn` | `123` | Dashboard |
| **Nhân viên CSKH** | `sales@hethong.vn` | `123` | Đơn hàng |
| **Quản lý kho** | `warehouse@hethong.vn` | `123` | Kho hàng |

## Cấu trúc thư mục (Folder Structure)

Dưới đây là sơ đồ các thư mục chính để bạn dễ dàng tìm nơi cần chỉnh sửa:

```text
giaodien_qlbhdakenh/
├── public/                 # Chứa các file tĩnh (ảnh, favicon, ...)
├── src/                    # Thư mục mã nguồn chính
│   ├── app/                # Logic chính của ứng dụng
│   │   ├── components/     # Các thành phần giao diện (UI Components)
│   │   │   ├── dashboard/  # Giao diện Tổng quan
│   │   │   ├── orders/     # Giao diện Quản lý đơn hàng
│   │   │   ├── products/   # Giao diện Quản lý sản phẩm
│   │   │   ├── inventory/  # Giao diện Kho hàng
│   │   │   ├── crm/        # Giao diện Khách hàng
│   │   │   ├── settings/   # Giao diện Cài đặt
│   │   │   ├── ui/         # Các component dùng chung (Button, Input, Card...)
│   │   │   └── Layout.tsx  # Khung giao diện chính (Sidebar, Header)
│   │   ├── data/           # Nơi chứa Mock Data (Dữ liệu mẫu JSON/JS)
│   │   ├── App.tsx         # File component gốc của ứng dụng
│   │   └── routes.ts       # Cấu hình định tuyến (chuyển trang)
│   ├── lib/                # Thư viện tiện ích, cấu hình dùng chung
│   ├── styles/             # Cấu hình CSS và TailwindCSS
│   ├── main.tsx            # Điểm khởi đầu của React (Entry point)
├── .env.example            # File mẫu cấu hình biến môi trường
├── package.json            # Quản lý thư viện và lệnh chạy dự án
└── vite.config.ts          # Cấu hình công cụ build Vite
```

### Bạn nên sửa code ở đâu?
- **Muốn đổi dữ liệu hiển thị**: Vào thư mục `src/app/data/`.
- **Muốn sửa giao diện cụ thể**: Vào `src/app/components/` và tìm thư mục tương ứng với tính năng đó.
- **Muốn đổi màu sắc/font chữ**: Kiểm tra `src/styles/` hoặc file `tailwind.config.js` (nếu có).
- **Muốn thêm trang mới**: Tạo component trong `components/` và đăng ký trong `src/app/routes.ts`.

## Lưu ý
Các biểu mẫu (forms), thao tác CRUD (Thêm, Sửa, Xóa) trên dự án này hiện tại sẽ chỉ làm thay đổi trạng thái giao diện tạm thời bằng Mock Data, khi F5 lại trang dữ liệu sẽ được reset lại như cũ.