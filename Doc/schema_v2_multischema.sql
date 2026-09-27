-- ============================================================
-- DATABASE SCHEMA V2: HỆ THỐNG BÁN HÀNG ONLINE + QUẢN LÝ ĐA KÊNH
-- Architecture: Multi-Schema (PostgreSQL 14+)
-- ============================================================

-- 1. TẠO CÁC SCHEMA CHUYÊN BIỆT
CREATE SCHEMA IF NOT EXISTS iam;            -- Người dùng & Phân quyền (Thay cho 'auth' để tránh xung đột với Supabase)
CREATE SCHEMA IF NOT EXISTS catalog;        -- Danh mục, Sản phẩm, Tồn kho
CREATE SCHEMA IF NOT EXISTS inventory_mgmt; -- Nhập xuất kho & Nhà cung cấp
CREATE SCHEMA IF NOT EXISTS sales;          -- Giỏ hàng & Đơn hàng
CREATE SCHEMA IF NOT EXISTS logistics;      -- Thanh toán & Vận chuyển
CREATE SCHEMA IF NOT EXISTS omnichannel;    -- Tích hợp sàn Đa kênh (Shopee, Lazada, TikTok...)
CREATE SCHEMA IF NOT EXISTS marketing;      -- Khuyến mãi (Voucher) & Đánh giá (Review)
CREATE SCHEMA IF NOT EXISTS hr;             -- Nhân sự & Chấm công
CREATE SCHEMA IF NOT EXISTS system;         -- Nhật ký hệ thống, Thông báo & Cấu hình

-- Cấu hình search_path để mặc định ưu tiên tìm kiếm trên các Schema này
SET search_path TO iam, catalog, inventory_mgmt, sales, logistics, omnichannel, marketing, hr, system, public;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1. SCHEMA: iam (NGƯỜI DÙNG & PHÂN QUYỀN)
-- ============================================================
CREATE TYPE iam.user_role AS ENUM (
    'customer', 'admin', 'product_manager', 'warehouse_staff',
    'order_manager', 'channel_manager', 'accountant'
);

CREATE TABLE iam.users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            iam.user_role NOT NULL DEFAULT 'customer',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url      VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON iam.users(email);
CREATE INDEX idx_users_role ON iam.users(role);

CREATE TABLE iam.addresses (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    receiver_name   VARCHAR(255) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    province        VARCHAR(100) NOT NULL,
    district        VARCHAR(100) NOT NULL,
    ward            VARCHAR(100) NOT NULL,
    detail          VARCHAR(500) NOT NULL,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user ON iam.addresses(user_id);

CREATE TABLE iam.refresh_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    token           VARCHAR(500) UNIQUE NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON iam.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON iam.refresh_tokens(token);

CREATE TABLE iam.permissions (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(100) UNIQUE NOT NULL,
    description     VARCHAR(255)
);

CREATE TABLE iam.role_permissions (
    role            iam.user_role NOT NULL,
    permission_id   BIGINT NOT NULL REFERENCES iam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_id)
);


-- ============================================================
-- 2. SCHEMA: catalog (SẢN PHẨM & TỒN KHO)
-- ============================================================
CREATE TYPE catalog.product_status AS ENUM ('draft', 'active', 'inactive', 'deleted');

CREATE TABLE catalog.categories (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    parent_id       BIGINT REFERENCES catalog.categories(id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_parent ON catalog.categories(parent_id);

-- 1. Bảng định nghĩa các thuộc tính (ví dụ: RAM, Màu sắc, Chất liệu, Kích thước màn hình...)
CREATE TABLE catalog.attributes (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL, -- Tên hiển thị (Ví dụ: "Dung lượng RAM")
    code        VARCHAR(100) UNIQUE NOT NULL, -- Mã định danh dùng cho code (Ví dụ: "ram")
    data_type   VARCHAR(50) NOT NULL DEFAULT 'string', -- Kiểu dữ liệu: string, number, boolean, select...
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Bảng liên kết: Mỗi danh mục sẽ có bộ thuộc tính riêng nào
CREATE TABLE catalog.category_attributes (
    category_id BIGINT NOT NULL REFERENCES catalog.categories(id) ON DELETE CASCADE,
    attribute_id BIGINT NOT NULL REFERENCES catalog.attributes(id) ON DELETE CASCADE,
    is_required BOOLEAN NOT NULL DEFAULT FALSE, -- Thuộc tính này có bắt buộc nhập khi tạo sản phẩm không?
    sort_order  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (category_id, attribute_id)
);
CREATE INDEX idx_cat_attrs_category ON catalog.category_attributes(category_id);

CREATE TABLE catalog.products (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(500) NOT NULL,
    slug            VARCHAR(500) UNIQUE NOT NULL,
    description     TEXT,
    category_id     BIGINT REFERENCES catalog.categories(id) ON DELETE SET NULL,
    base_price      NUMERIC(14,2) NOT NULL CHECK (base_price >= 0),
    status          catalog.product_status NOT NULL DEFAULT 'draft',
    avg_rating      NUMERIC(3,2) NOT NULL DEFAULT 0,
    review_count    INTEGER NOT NULL DEFAULT 0,
    search_vector   tsvector,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON catalog.products(category_id);
CREATE INDEX idx_products_status ON catalog.products(status);
CREATE INDEX idx_products_search ON catalog.products USING GIN(search_vector);

CREATE OR REPLACE FUNCTION catalog.products_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('simple', coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,''));
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_vector
BEFORE INSERT OR UPDATE ON catalog.products
FOR EACH ROW EXECUTE FUNCTION catalog.products_search_vector_update();

CREATE TABLE catalog.product_images (
    id              BIGSERIAL PRIMARY KEY,
    product_id      BIGINT NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    image_url       VARCHAR(500) NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON catalog.product_images(product_id);

CREATE TABLE catalog.product_variants (
    id              BIGSERIAL PRIMARY KEY,
    product_id      BIGINT NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    sku             VARCHAR(100) UNIQUE NOT NULL,
    attributes      JSONB NOT NULL DEFAULT '{}',
    price           NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    image_url       VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_variants_product ON catalog.product_variants(product_id);
CREATE INDEX idx_variants_sku ON catalog.product_variants(sku);

CREATE TABLE catalog.warehouses (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    address         VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE catalog.inventory (
    id                  BIGSERIAL PRIMARY KEY,
    sku                 VARCHAR(100) NOT NULL REFERENCES catalog.product_variants(sku) ON DELETE CASCADE,
    warehouse_id        BIGINT NOT NULL REFERENCES catalog.warehouses(id),
    quantity            INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    version             INTEGER NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (sku, warehouse_id)
);
CREATE INDEX idx_inventory_sku ON catalog.inventory(sku);
CREATE INDEX idx_inventory_warehouse ON catalog.inventory(warehouse_id);


-- ============================================================
-- 3. SCHEMA: inventory_mgmt (NHẬP XUẤT KHO)
-- ============================================================
CREATE TYPE inventory_mgmt.import_status AS ENUM ('draft', 'pending_approval', 'approved', 'completed', 'cancelled');
CREATE TYPE inventory_mgmt.export_reason AS ENUM ('damaged', 'transfer', 'return_to_supplier', 'other');
CREATE TYPE inventory_mgmt.stock_movement_type AS ENUM (
    'import', 'export', 'order_reserved', 'order_confirmed',
    'order_cancelled', 'adjustment'
);

CREATE TABLE inventory_mgmt.suppliers (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    contact_name    VARCHAR(255),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_mgmt.stock_imports (
    id              BIGSERIAL PRIMARY KEY,
    supplier_id     BIGINT REFERENCES inventory_mgmt.suppliers(id),
    warehouse_id    BIGINT NOT NULL REFERENCES catalog.warehouses(id),
    code            VARCHAR(50) UNIQUE NOT NULL,
    status          inventory_mgmt.import_status NOT NULL DEFAULT 'draft',
    total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_by      BIGINT NOT NULL REFERENCES iam.users(id),
    approved_by     BIGINT REFERENCES iam.users(id),
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);
CREATE INDEX idx_stock_imports_status ON inventory_mgmt.stock_imports(status);
CREATE INDEX idx_stock_imports_warehouse ON inventory_mgmt.stock_imports(warehouse_id);

CREATE TABLE inventory_mgmt.stock_import_items (
    id                  BIGSERIAL PRIMARY KEY,
    stock_import_id     BIGINT NOT NULL REFERENCES inventory_mgmt.stock_imports(id) ON DELETE CASCADE,
    sku                 VARCHAR(100) NOT NULL REFERENCES catalog.product_variants(sku),
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost           NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0),
    subtotal            NUMERIC(14,2) NOT NULL
);
CREATE INDEX idx_stock_import_items_import ON inventory_mgmt.stock_import_items(stock_import_id);

CREATE TABLE inventory_mgmt.stock_exports (
    id              BIGSERIAL PRIMARY KEY,
    warehouse_id    BIGINT NOT NULL REFERENCES catalog.warehouses(id),
    reason          inventory_mgmt.export_reason NOT NULL,
    created_by      BIGINT NOT NULL REFERENCES iam.users(id),
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_mgmt.stock_export_items (
    id              BIGSERIAL PRIMARY KEY,
    stock_export_id BIGINT NOT NULL REFERENCES inventory_mgmt.stock_exports(id) ON DELETE CASCADE,
    sku             VARCHAR(100) NOT NULL REFERENCES catalog.product_variants(sku),
    quantity        INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX idx_stock_export_items_export ON inventory_mgmt.stock_export_items(stock_export_id);

CREATE TABLE inventory_mgmt.stock_movements (
    id              BIGSERIAL PRIMARY KEY,
    sku             VARCHAR(100) NOT NULL,
    warehouse_id    BIGINT NOT NULL REFERENCES catalog.warehouses(id),
    movement_type   inventory_mgmt.stock_movement_type NOT NULL,
    quantity_change INTEGER NOT NULL,
    reference_id    BIGINT,
    reference_type  VARCHAR(50),
    created_by      BIGINT REFERENCES iam.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_movements_sku ON inventory_mgmt.stock_movements(sku, created_at);


-- ============================================================
-- 4. SCHEMA: sales (GIỎ HÀNG & ĐƠN HÀNG)
-- ============================================================
CREATE TYPE sales.order_status AS ENUM (
    'pending_confirm', 'confirmed', 'paid', 'packed', 'shipping',
    'delivered', 'cancelled_timeout', 'failed_out_of_stock',
    'payment_failed', 'returned', 'cancelled_by_user'
);

CREATE TABLE sales.carts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE REFERENCES iam.users(id) ON DELETE CASCADE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sales.cart_items (
    id              BIGSERIAL PRIMARY KEY,
    cart_id         BIGINT NOT NULL REFERENCES sales.carts(id) ON DELETE CASCADE,
    sku             VARCHAR(100) NOT NULL REFERENCES catalog.product_variants(sku),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    UNIQUE (cart_id, sku)
);

CREATE TABLE sales.orders (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT REFERENCES iam.users(id),
    source                  VARCHAR(50) NOT NULL DEFAULT 'web',
    external_order_id       VARCHAR(100),
    status                  sales.order_status NOT NULL DEFAULT 'pending_confirm',
    total_amount            NUMERIC(14,2) NOT NULL,
    idempotency_key         VARCHAR(100) UNIQUE,
    shipping_address_id     BIGINT REFERENCES iam.addresses(id),
    note                    TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source, external_order_id)
);
CREATE INDEX idx_orders_user_status ON sales.orders(user_id, status);
CREATE INDEX idx_orders_status ON sales.orders(status);
CREATE INDEX idx_orders_source ON sales.orders(source);
CREATE INDEX idx_orders_created ON sales.orders(created_at);

CREATE TABLE sales.order_items (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL REFERENCES sales.orders(id) ON DELETE CASCADE,
    sku             VARCHAR(100) NOT NULL,
    product_name    VARCHAR(500) NOT NULL,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    price_at_order  NUMERIC(14,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON sales.order_items(order_id);
CREATE INDEX idx_order_items_sku ON sales.order_items(sku);

CREATE TABLE sales.order_status_history (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL REFERENCES sales.orders(id) ON DELETE CASCADE,
    status          sales.order_status NOT NULL,
    changed_by      BIGINT REFERENCES iam.users(id),
    note            VARCHAR(500),
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_status_history_order ON sales.order_status_history(order_id);


-- ============================================================
-- 5. SCHEMA: logistics (THANH TOÁN & VẬN CHUYỂN)
-- ============================================================
CREATE TYPE logistics.payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE logistics.shipment_status AS ENUM ('pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned');

CREATE TABLE logistics.payments (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL REFERENCES sales.orders(id),
    provider        VARCHAR(50) NOT NULL,
    transaction_id  VARCHAR(100) UNIQUE,
    amount          NUMERIC(14,2) NOT NULL,
    status          logistics.payment_status NOT NULL DEFAULT 'pending',
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_order ON logistics.payments(order_id);

CREATE TABLE logistics.shipments (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL REFERENCES sales.orders(id),
    provider        VARCHAR(50),
    tracking_code   VARCHAR(100),
    status          logistics.shipment_status NOT NULL DEFAULT 'pending',
    shipping_fee    NUMERIC(14,2) DEFAULT 0,
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shipments_order ON logistics.shipments(order_id);


-- ============================================================
-- 6. SCHEMA: omnichannel (TÍCH HỢP ĐA KÊNH SÀN)
-- ============================================================
CREATE TYPE omnichannel.sync_status_type AS ENUM ('synced', 'pending', 'failed', 'out_of_sync');

CREATE TABLE omnichannel.channels (
    id                          BIGSERIAL PRIMARY KEY,
    name                        VARCHAR(50) NOT NULL,
    api_credentials_encrypted   TEXT,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE omnichannel.channel_products (
    id              BIGSERIAL PRIMARY KEY,
    channel_id      BIGINT NOT NULL REFERENCES omnichannel.channels(id) ON DELETE CASCADE,
    sku             VARCHAR(100) NOT NULL REFERENCES catalog.product_variants(sku) ON DELETE CASCADE,
    channel_sku     VARCHAR(100),
    sync_status     omnichannel.sync_status_type NOT NULL DEFAULT 'pending',
    last_synced_at  TIMESTAMPTZ,
    UNIQUE (channel_id, sku)
);
CREATE INDEX idx_channel_products_sku ON omnichannel.channel_products(sku);
CREATE INDEX idx_channel_products_sync_status ON omnichannel.channel_products(sync_status);

CREATE TABLE omnichannel.sync_logs (
    id              BIGSERIAL PRIMARY KEY,
    channel_id      BIGINT REFERENCES omnichannel.channels(id),
    sku             VARCHAR(100),
    action          VARCHAR(50),
    status          VARCHAR(20),
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_logs_channel ON omnichannel.sync_logs(channel_id, created_at);

CREATE TABLE omnichannel.webhook_logs (
    id              BIGSERIAL PRIMARY KEY,
    source          VARCHAR(50) NOT NULL,
    external_id     VARCHAR(100) NOT NULL,
    payload_hash    VARCHAR(255),
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source, external_id)
);


-- ============================================================
-- 7. SCHEMA: marketing (KHUYẾN MÃI & ĐÁNH GIÁ)
-- ============================================================
CREATE TYPE marketing.discount_type AS ENUM ('percent', 'fixed');
CREATE TYPE marketing.review_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE marketing.vouchers (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(50) UNIQUE NOT NULL,
    discount_type       marketing.discount_type NOT NULL,
    discount_value      NUMERIC(14,2) NOT NULL,
    min_order_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    usage_limit         INTEGER,
    used_count          INTEGER NOT NULL DEFAULT 0,
    expires_at          TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE marketing.order_vouchers (
    order_id            BIGINT NOT NULL REFERENCES sales.orders(id) ON DELETE CASCADE,
    voucher_id          BIGINT NOT NULL REFERENCES marketing.vouchers(id),
    discount_applied    NUMERIC(14,2) NOT NULL,
    PRIMARY KEY (order_id, voucher_id)
);

CREATE TABLE marketing.reviews (
    id              BIGSERIAL PRIMARY KEY,
    product_id      BIGINT NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES iam.users(id),
    order_id        BIGINT NOT NULL REFERENCES sales.orders(id),
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    status          marketing.review_status NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_id, product_id)
);
CREATE INDEX idx_reviews_product ON marketing.reviews(product_id, status);

CREATE TABLE marketing.review_images (
    id              BIGSERIAL PRIMARY KEY,
    review_id       BIGINT NOT NULL REFERENCES marketing.reviews(id) ON DELETE CASCADE,
    image_url       VARCHAR(500) NOT NULL
);

CREATE TABLE marketing.review_replies (
    id              BIGSERIAL PRIMARY KEY,
    review_id       BIGINT NOT NULL REFERENCES marketing.reviews(id) ON DELETE CASCADE,
    replied_by      BIGINT NOT NULL REFERENCES iam.users(id),
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 8. SCHEMA: hr (NHÂN SỰ)
-- ============================================================
CREATE TYPE hr.employment_status AS ENUM ('active', 'on_leave', 'terminated');

CREATE TABLE hr.employees (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE REFERENCES iam.users(id),
    employee_code       VARCHAR(50) UNIQUE NOT NULL,
    department          VARCHAR(100),
    position            VARCHAR(100),
    warehouse_id        BIGINT REFERENCES catalog.warehouses(id),
    id_card_number      VARCHAR(50),
    hire_date           DATE NOT NULL,
    termination_date    DATE,
    salary_base         NUMERIC(14,2),
    status              hr.employment_status NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_employees_warehouse ON hr.employees(warehouse_id);

CREATE TABLE hr.attendance_logs (
    id              BIGSERIAL PRIMARY KEY,
    employee_id     BIGINT NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
    check_in        TIMESTAMPTZ,
    check_out       TIMESTAMPTZ,
    work_date       DATE NOT NULL,
    UNIQUE (employee_id, work_date)
);

CREATE TABLE hr.employee_performance (
    id              BIGSERIAL PRIMARY KEY,
    employee_id     BIGINT NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
    metric_date     DATE NOT NULL,
    orders_packed   INTEGER NOT NULL DEFAULT 0,
    notes           TEXT,
    UNIQUE (employee_id, metric_date)
);


-- ============================================================
-- 9. SCHEMA: system (HỆ THỐNG CHUNG)
-- ============================================================
CREATE TABLE system.notifications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    type            VARCHAR(50),
    title           VARCHAR(255),
    content         TEXT,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON system.notifications(user_id, is_read);

CREATE TABLE system.audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES iam.users(id),
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       BIGINT,
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON system.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON system.audit_logs(user_id, created_at);

CREATE TABLE system.settings (
    key             VARCHAR(100) PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- SEED DATA CƠ BẢN
-- ============================================================
INSERT INTO iam.permissions (code, description) VALUES
    ('product.view', 'Xem sản phẩm'),
    ('product.edit', 'Sửa/thêm sản phẩm'),
    ('product.delete', 'Xoá sản phẩm'),
    ('inventory.view', 'Xem tồn kho'),
    ('inventory.import', 'Tạo phiếu nhập kho'),
    ('inventory.approve', 'Duyệt phiếu nhập kho'),
    ('order.view', 'Xem đơn hàng'),
    ('order.process', 'Xử lý đóng gói/ship đơn'),
    ('order.cancel', 'Huỷ đơn hàng'),
    ('channel.config', 'Cấu hình kênh bán'),
    ('channel.view_logs', 'Xem log đồng bộ'),
    ('voucher.manage', 'Quản lý voucher'),
    ('employee.manage', 'Quản lý nhân sự'),
    ('analytics.view', 'Xem báo cáo'),
    ('settings.manage', 'Cấu hình hệ thống');

INSERT INTO catalog.warehouses (name, address) VALUES
    ('Kho chính', 'Kho trung tâm');

INSERT INTO iam.role_permissions (role, permission_id)
SELECT 'admin', id FROM iam.permissions;

INSERT INTO iam.role_permissions (role, permission_id)
SELECT 'warehouse_staff', id FROM iam.permissions
WHERE code IN ('inventory.view', 'inventory.import', 'order.view', 'order.process');

INSERT INTO iam.role_permissions (role, permission_id)
SELECT 'product_manager', id FROM iam.permissions
WHERE code IN ('product.view', 'product.edit', 'product.delete', 'inventory.view');
