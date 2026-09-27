# THIẾT KẾ HỆ THỐNG BÁN HÀNG ONLINE + QUẢN LÝ ĐA KÊNH

**Quy mô mục tiêu:** ~20.000 người dùng (không đồng thời)
**Mô hình:** Modular Monolith, sẵn sàng tách microservice khi cần scale

---

## 1. Kiến trúc tổng thể

```
Client (Web bán hàng / Web quản lý / Shopee-Lazada webhook)
        │
     Nginx (SSL, reverse proxy, CDN cho ảnh)
        │
  FastAPI (async, 2-3 instance qua Gunicorn+Uvicorn)
        │
   ┌────┴────┐
 Redis    PostgreSQL (Primary)
(cache+queue)   │
   │
Celery Workers (sync đa kênh, quét đơn quá hạn, cảnh báo tồn kho)
```

**Chưa cần ở quy mô này:** Go service riêng, Kubernetes, Read Replica, Elasticsearch, Kafka/RabbitMQ.
**Hạ tầng đề xuất:** 1 VPS 4–8 core / 8–16GB RAM + Docker Compose.

**Nguyên tắc thiết kế module:** mỗi module không truy cập thẳng DB của module khác, chỉ gọi qua service function nội bộ → dễ tách thành microservice riêng sau này mà không phải viết lại logic nghiệp vụ.

---

## 2. Hai giao diện Frontend riêng biệt

| Giao diện | Đối tượng dùng | Mục đích |
|---|---|---|
| **Storefront** (Web bán hàng) | Customer | Duyệt sản phẩm, giỏ hàng, đặt hàng, xem đơn, đánh giá |
| **Admin Panel** (Web quản lý) | Nhân viên nội bộ (nhiều role) | Quản lý sản phẩm, kho, đơn hàng, kênh bán, nhân sự, báo cáo |

Cả hai dùng chung 1 Backend API, phân biệt bằng role/permission trong JWT.

---

## 3. Danh sách Module hệ thống

| Module | Vai trò |
|---|---|
| `auth/` | Đăng ký, login, JWT, refresh token |
| `users/` | Tài khoản đăng nhập, địa chỉ, RBAC |
| `products/` | Catalog, biến thể, danh mục |
| `inventory/` | Tồn kho, reserve/release |
| `warehouse_management/` | Nhập kho, xuất kho, nhà cung cấp, lịch sử biến động tồn kho |
| `cart/` | Giỏ hàng |
| `orders/` | Đơn hàng, trạng thái |
| `payment/` | Cổng thanh toán, webhook callback |
| `shipping/` | Tích hợp vận chuyển, tracking |
| `channels/` | Kết nối & đồng bộ Shopee/Lazada |
| `promotion/` | Voucher, khuyến mãi |
| `review/` | Đánh giá sản phẩm |
| `notification/` | Email/SMS/push |
| `hr_management/` | Hồ sơ nhân sự, chấm công, hiệu suất |
| `analytics/` | Báo cáo cho Admin |
| `audit_log/` | Log ai làm gì (Admin/Staff) |
| `settings/` | Cấu hình hệ thống |
| `cms/` (tuỳ chọn) | Banner, nội dung marketing |

---

## 4. Phân quyền (RBAC / Permission-based)

### Role đề xuất (linh hoạt theo quy mô team vận hành thực tế)

| Role | Trách nhiệm |
|---|---|
| **Customer** | Mua hàng, xem đơn của mình, đánh giá |
| **Admin** (Super Admin) | Toàn quyền, cấu hình hệ thống, phân quyền |
| **Product_Manager** | Quản lý sản phẩm, danh mục, giá |
| **Warehouse_Staff** | Nhập/xuất kho, đóng gói, cập nhật ship |
| **Order_Manager / CSKH** | Xử lý đơn, hỗ trợ khách, khiếu nại/hoàn trả |
| **Channel_Manager** | Cấu hình Shopee/Lazada, theo dõi sync log |
| **Accountant** (tuỳ chọn) | Xem báo cáo doanh thu, đối soát thanh toán |

> Nếu team nhỏ (1–2 người vận hành), có thể gộp lại còn 3–4 role. Chia nhỏ role chỉ thực sự cần khi nhiều người khác nhau cùng thao tác trên hệ thống.

### Thiết kế permission-based (khuyến nghị thay vì hardcode role)

```sql
permissions (id, code)          -- vd: "product.edit", "order.view", "channel.config"
role_permissions (role, permission_id)
```

```python
def require_permission(permission_code):
    def checker(user = Depends(get_current_user)):
        if permission_code not in get_permissions_of_role(user.role):
            raise HTTPException(403)
        return user
    return checker
```

→ Thêm role mới sau này chỉ cần cấu hình DB, không sửa code từng endpoint.

---

## 5. Database Schema (PostgreSQL)

### 5.1. Users & Auth
```sql
CREATE TYPE user_role AS ENUM ('customer', 'warehouse_staff', 'admin', 'product_manager', 'order_manager', 'channel_manager', 'accountant');

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    province VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    ward VARCHAR(100) NOT NULL,
    detail VARCHAR(500) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.2. Products & Inventory
```sql
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE product_status AS ENUM ('draft', 'active', 'inactive', 'deleted');

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    base_price NUMERIC(14,2) NOT NULL CHECK (base_price >= 0),
    status product_status NOT NULL DEFAULT 'draft',
    avg_rating NUMERIC(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    search_vector tsvector,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

CREATE TABLE product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',
    price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE warehouses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE inventory (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL REFERENCES product_variants(sku) ON DELETE CASCADE,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    version INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (sku, warehouse_id)
);
-- available = quantity - reserved_quantity (tính khi query)
```

### 5.3. Nhập/Xuất kho
```sql
CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE import_status AS ENUM ('draft', 'pending_approval', 'approved', 'completed', 'cancelled');

CREATE TABLE stock_imports (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT REFERENCES suppliers(id),
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    status import_status NOT NULL DEFAULT 'draft',
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_by BIGINT NOT NULL REFERENCES users(id),
    approved_by BIGINT REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE stock_import_items (
    id BIGSERIAL PRIMARY KEY,
    stock_import_id BIGINT NOT NULL REFERENCES stock_imports(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL REFERENCES product_variants(sku),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0),
    subtotal NUMERIC(14,2) NOT NULL
);

CREATE TYPE export_reason AS ENUM ('damaged', 'transfer', 'return_to_supplier', 'other');

CREATE TABLE stock_exports (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    reason export_reason NOT NULL,
    created_by BIGINT NOT NULL REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stock_export_items (
    id BIGSERIAL PRIMARY KEY,
    stock_export_id BIGINT NOT NULL REFERENCES stock_exports(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL REFERENCES product_variants(sku),
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TYPE stock_movement_type AS ENUM ('import', 'export', 'order_reserved', 'order_confirmed', 'order_cancelled', 'adjustment');

CREATE TABLE stock_movements (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    movement_type stock_movement_type NOT NULL,
    quantity_change INTEGER NOT NULL,
    reference_id BIGINT,
    reference_type VARCHAR(50),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_movements_sku ON stock_movements(sku, created_at);
```

### 5.4. Cart & Orders
```sql
CREATE TABLE carts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL REFERENCES product_variants(sku),
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TYPE order_status AS ENUM ('pending_confirm', 'confirmed', 'paid', 'packed', 'shipping', 'delivered', 'cancelled_timeout', 'failed_out_of_stock', 'payment_failed', 'returned');

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    source VARCHAR(50) NOT NULL DEFAULT 'web',  -- web/shopee/lazada
    external_order_id VARCHAR(100),
    status order_status NOT NULL DEFAULT 'pending_confirm',
    total_amount NUMERIC(14,2) NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE,
    shipping_address_id BIGINT REFERENCES addresses(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_order NUMERIC(14,2) NOT NULL
);

CREATE TABLE order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status order_status NOT NULL,
    changed_by BIGINT REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.5. Payment & Shipping
```sql
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    provider VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) UNIQUE,
    amount NUMERIC(14,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    paid_at TIMESTAMPTZ
);

CREATE TABLE shipments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    provider VARCHAR(50),
    tracking_code VARCHAR(100),
    status VARCHAR(50),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);
```

### 5.6. Đa kênh
```sql
CREATE TABLE channels (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,  -- shopee/lazada/tiktok
    api_credentials_encrypted TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE channel_products (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT NOT NULL REFERENCES channels(id),
    sku VARCHAR(100) NOT NULL REFERENCES product_variants(sku),
    channel_sku VARCHAR(100),
    sync_status VARCHAR(50) DEFAULT 'synced',  -- synced/failed/out_of_sync
    last_synced_at TIMESTAMPTZ
);

CREATE TABLE sync_logs (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT REFERENCES channels(id),
    sku VARCHAR(100),
    action VARCHAR(50),
    status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_logs (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    payload_hash VARCHAR(255),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source, external_id)
);
```

### 5.7. Promotion & Review
```sql
CREATE TABLE vouchers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- percent/fixed
    discount_value NUMERIC(14,2) NOT NULL,
    min_order_amount NUMERIC(14,2) DEFAULT 0,
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ
);

CREATE TABLE order_vouchers (
    order_id BIGINT REFERENCES orders(id),
    voucher_id BIGINT REFERENCES vouchers(id),
    discount_applied NUMERIC(14,2),
    PRIMARY KEY (order_id, voucher_id)
);

CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    order_id BIGINT NOT NULL REFERENCES orders(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_id, product_id)
);

CREATE TABLE review_images (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL
);
```

### 5.8. Nhân sự
```sql
CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'terminated');

CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    warehouse_id BIGINT REFERENCES warehouses(id),
    id_card_number VARCHAR(50),
    hire_date DATE NOT NULL,
    termination_date DATE,
    salary_base NUMERIC(14,2),
    status employment_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    work_date DATE NOT NULL,
    UNIQUE (employee_id, work_date)
);

CREATE TABLE employee_performance (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    metric_date DATE NOT NULL,
    orders_packed INTEGER DEFAULT 0,
    notes TEXT
);
```

### 5.9. Khác
```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(50),
    title VARCHAR(255),
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE role_permissions (
    role user_role NOT NULL,
    permission_id BIGINT REFERENCES permissions(id),
    PRIMARY KEY (role, permission_id)
);
```

---

## 6. API Endpoints (tóm tắt theo module)

```
# Auth
POST /auth/register | /auth/login | /auth/refresh | /auth/logout

# Products (public + admin)
GET /products | GET /products/{id}
POST/PUT/DELETE /admin/products, /admin/products/{id}/variants

# Kho hàng
GET/POST /admin/suppliers
GET/POST /admin/stock-imports
PATCH /admin/stock-imports/{id}/approve | /complete
POST /admin/stock-exports
GET /admin/inventory/{sku}/movements
GET /admin/inventory?low_stock=true

# Cart & Orders
GET/POST/PATCH/DELETE /cart, /cart/items
POST /orders (Idempotency-Key) | GET /orders | PATCH /orders/{id}/cancel
GET /warehouse/orders?status= | PATCH /warehouse/orders/{id}/pack | /ship

# Payment
POST /orders/{id}/payment
POST /webhooks/payment/{provider}/callback

# Đa kênh
POST/GET /admin/channels
POST /admin/channels/{id}/sync-products
POST /webhooks/{channel}/order | /product-update
GET /admin/sync-logs?status=failed

# Promotion / Review
GET /vouchers/validate?code= | POST /admin/vouchers
POST/GET /products/{id}/reviews

# Nhân sự
GET/POST/PUT /admin/employees | PATCH /admin/employees/{id}/terminate
POST /admin/attendance/check-in | /check-out
GET /admin/employees/{id}/performance

# Notification / Analytics
GET/PATCH /notifications
GET /admin/analytics/revenue | /top-products | /inventory-alerts
```

---

## 7. Các luồng xử lý chính (Pseudo-code)

### 7.1. Đặt hàng (giữ chỗ tồn kho)
```
POST /orders (Idempotency-Key)
1. Check Redis idempotency:{key} đã xử lý chưa → có thì trả lại kết quả cũ
2. Với mỗi item: Redis DECR("stock:"+sku, qty)
   → âm thì INCR lại (rollback) + trả lỗi hết hàng
3. Tạo order status=pending_confirm trong Postgres
4. Redis SET idempotency:{key}=order_id, TTL 24h
5. Push Celery task: confirm_order(order_id)
6. Trả response ngay, không chờ Celery
```

### 7.2. Celery confirm_order (trừ kho thật)
```
1. BEGIN TRANSACTION
2. SELECT inventory FOR UPDATE WHERE sku=?
3. Nếu không đủ hàng thật → ROLLBACK, hoàn Redis, status=failed_out_of_stock
4. UPDATE inventory quantity -= qty
5. UPDATE order status=confirmed
6. COMMIT
7. Push task sync_inventory_to_channels + send_notification
```

### 7.3. Nhập kho hoàn tất
```
PATCH /admin/stock-imports/{id}/complete
1. BEGIN TRANSACTION
2. Với mỗi item: SELECT inventory FOR UPDATE → quantity += qty
3. Insert stock_movements (type=import)
4. UPDATE stock_import status=completed
5. COMMIT
6. Push task sync_inventory_to_channels (báo tăng tồn kho sang Shopee/Lazada)
```

### 7.4. Đồng bộ tồn kho đa kênh
```
TASK sync_inventory_to_channels(sku, new_quantity):
  Với mỗi channel active bán SKU này:
    TRY: gọi API update stock, log thành công
    CATCH: log lỗi, retry exponential backoff (1s→5s→30s→2p→10p, tối đa 5 lần)
           hết retry → đánh dấu sync_status=out_of_sync, cảnh báo Admin
  # Lỗi 1 kênh không chặn kênh khác
```

### 7.5. Webhook nhận đơn từ Shopee/Lazada
```
POST /webhooks/{channel}/order
1. Verify chữ ký HMAC → sai thì trả 401
2. Check Redis/webhook_logs đã xử lý external_order_id chưa → có thì trả 200 ngay
3. Đánh dấu đang xử lý (Redis SET, TTL 24h)
4. Parse & map đơn về format nội bộ
5. Thực hiện luồng giữ chỗ tồn kho như 7.1, nguồn = channel
6. Trả 200 OK nhanh, xử lý nặng đẩy qua Celery
```

### 7.6. Thanh toán + callback
```
POST /orders/{id}/payment → gọi API cổng thanh toán, trả payment_url

POST /webhooks/payment/callback
1. Verify chữ ký
2. Check dedup theo transaction_id
3. success → order.status=paid, chuyển kho xử lý đóng gói
4. failed → order.status=payment_failed, rollback tồn kho (Redis INCR + Postgres +=)
```

### 7.7. Voucher khi checkout
```
1. SELECT voucher FOR UPDATE WHERE code=? AND expires_at>now()
2. Check used_count < usage_limit, total_amount >= min_order_amount
3. UPDATE used_count += 1, tính discount, insert order_vouchers
   (cùng transaction với tạo order — fail thì rollback hết)
```

### 7.8. Celery Beat (định kỳ)
```
- check_low_stock (mỗi giờ): cảnh báo Admin khi quantity < threshold
- cancel_expired_orders (mỗi 5 phút): huỷ order pending_confirm quá 30 phút,
  rollback tồn kho, gửi notification cho khách
- update_product_rating: tính lại avg_rating sau khi có review mới (async)
```

---

## 8. Error Handling

**Format lỗi chuẩn:**
```json
{ "error": { "code": "OUT_OF_STOCK", "message": "...", "details": {} } }
```

**4 tầng xử lý:**
1. **Validation** (input sai) → HTTP 400, Pydantic tự validate
2. **Business logic** (hết hàng, voucher hết hạn...) → HTTP 409/404, custom exception + exception handler
3. **External API lỗi** (Shopee/Lazada/Payment) → không throw lỗi cho user, log + đẩy retry queue, không chặn luồng chính
4. **Unexpected errors** → HTTP 500, log Sentry, ẩn stack trace với user

**Retry pattern:** exponential backoff (1s→5s→30s→2p→10p, tối đa 5 lần) → hết vẫn lỗi thì đánh dấu failed cho Admin xử lý tay.

---

## 9. Review (Đánh giá sản phẩm)

- Chỉ cho review khi đã mua **và** đơn ở status `delivered`
- `UNIQUE(order_id, product_id)` chống review trùng
- Có kiểm duyệt (status pending/approved/rejected) chống spam
- `avg_rating` tính lại bất đồng bộ qua Celery, cache vào bảng `products`
- Tuỳ chọn mở rộng: ảnh đính kèm (`review_images`), phản hồi từ shop (`review_replies`)

---

## 10. Sơ đồ màn hình Admin Panel

```
Admin Panel
├── Dashboard (doanh thu, đơn hàng, cảnh báo)
├── Sản phẩm (CRUD, danh mục, biến thể)
├── Kho hàng
│   ├── Tồn kho hiện tại (theo kho, theo SKU)
│   ├── Phiếu nhập hàng (tạo/duyệt/hoàn tất)
│   ├── Phiếu xuất hàng (huỷ hỏng, chuyển kho)
│   ├── Lịch sử biến động tồn kho
│   └── Nhà cung cấp
├── Đơn hàng
│   ├── Danh sách đơn (trạng thái, kênh)
│   ├── Xử lý đóng gói/ship
│   └── Đơn hoàn trả/khiếu nại
├── Đa kênh (kết nối Shopee/Lazada, log đồng bộ)
├── Khuyến mãi (voucher)
├── Nhân sự
│   ├── Danh sách nhân viên
│   ├── Chấm công (tuỳ chọn)
│   └── Phân quyền (role/permission)
├── Báo cáo (doanh thu, top sản phẩm, hiệu suất kho)
└── Cấu hình hệ thống
```

---

## 11. Thứ tự triển khai (tự dev, vertical slice BE → FE theo module)

```
Giai đoạn 1 — Core:
  auth → products/inventory → cart/orders

Giai đoạn 2 — Vận hành:
  payment → warehouse flow (pack/ship) → nhập kho cơ bản → notification cơ bản

Giai đoạn 3 — Đa kênh (khó nhất, làm sau khi core ổn):
  channels config → webhook nhận đơn → sync tồn kho 2 chiều → sync trạng thái đơn

Giai đoạn 4 — Mở rộng:
  promotion/voucher → review → nhân sự (employees cơ bản)
  → analytics → audit_log → Celery Beat → chấm công/KPI (nếu cần)
```

**Nguyên tắc làm việc:** code BE trước, test qua Swagger (`/docs`), rồi làm FE ngay cho module đó (vertical slice) — không tách hẳn "hết BE mới FE" để thấy kết quả sớm và giảm rủi ro phải sửa lại nhiều lần.

---

## 12. Việc còn để dành thiết kế chi tiết cùng nhau sau

- Rà soát và tinh chỉnh schema DB đầy đủ (constraint, index tối ưu theo dữ liệu thực tế)
- Chi tiết luồng hoàn trả/đổi hàng (return/refund)
- Chi tiết tính năng chấm công/KPI nhân sự (nếu team lớn dần)
