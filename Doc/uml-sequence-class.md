# UML - SƠ ĐỒ TUẦN TỰ (Sequence Diagram) & SƠ ĐỒ LỚP (Class Diagram)
## Hệ thống bán hàng online + quản lý đa kênh

> Cú pháp **Mermaid**. Xem hình trực quan tại https://mermaid.live (dán từng khối code), hoặc mở bằng VSCode/Notion/Obsidian có hỗ trợ Mermaid.

---

# PHẦN 1: SƠ ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM)

## 1.1. Đăng ký / Đăng nhập + Refresh Token

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL
    participant R as Redis

    C->>FE: Nhập email/password (Login)
    FE->>API: POST /auth/login
    API->>DB: SELECT user WHERE email=?
    DB-->>API: user record
    API->>API: Bcrypt.check(password, hash)
    alt Sai mật khẩu
        API-->>FE: 401 Unauthorized
    else Đúng mật khẩu
        API->>API: Tạo access_token (JWT, 15 phút)
        API->>API: Tạo refresh_token (random string)
        API->>R: SET refresh:{token} = user_id, TTL 7 ngày
        API-->>FE: 200 {access_token, refresh_token}
        FE->>FE: Lưu token vào bộ nhớ app
    end

    Note over FE,API: Sau 15 phút, access_token hết hạn
    FE->>API: POST /auth/refresh {refresh_token}
    API->>R: GET refresh:{token}
    alt Token không tồn tại/hết hạn
        R-->>API: null
        API-->>FE: 401, yêu cầu login lại
    else Token hợp lệ
        R-->>API: user_id
        API->>API: Tạo access_token mới
        API-->>FE: 200 {access_token mới}
    end
```

---

## 1.2. Đặt hàng - Giữ chỗ tồn kho (Idempotency + Redis)

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as Frontend
    participant API as FastAPI
    participant R as Redis
    participant DB as PostgreSQL
    participant Q as Celery Queue

    C->>FE: Nhấn "Đặt hàng"
    FE->>API: POST /orders (header: Idempotency-Key)
    API->>R: GET idempotency:{key}

    alt Key đã tồn tại (request trùng)
        R-->>API: order_id đã lưu
        API-->>FE: Trả lại kết quả cũ (không tạo đơn mới)
    else Key chưa tồn tại
        loop Với mỗi item trong giỏ hàng
            API->>R: DECR stock:{sku} theo quantity
            alt Không đủ hàng (kết quả < 0)
                API->>R: INCR stock:{sku} (rollback)
                API-->>FE: 409 "SKU hết hàng"
            end
        end
        API->>DB: INSERT order (status=pending_confirm)
        DB-->>API: order_id
        API->>R: SET idempotency:{key} = order_id, TTL 24h
        API->>Q: Push task confirm_order(order_id)
        API-->>FE: 201 {order_id, status: pending_confirm}
    end
```

---

## 1.3. Celery Worker xác nhận đơn (trừ kho thật)

```mermaid
sequenceDiagram
    participant Q as Celery Queue
    participant W as Celery Worker
    participant DB as PostgreSQL
    participant R as Redis
    participant Q2 as Sync Queue

    Q->>W: confirm_order(order_id)
    W->>DB: BEGIN TRANSACTION
    W->>DB: SELECT inventory FOR UPDATE WHERE sku=?
    DB-->>W: quantity thật

    alt Không đủ hàng thật trong DB
        W->>DB: ROLLBACK
        W->>R: INCR stock:{sku} (hoàn lại Redis)
        W->>DB: UPDATE order SET status=failed_out_of_stock
        W->>W: Gửi notification cho khách
    else Đủ hàng
        W->>DB: UPDATE inventory SET quantity -= order_qty
        W->>DB: UPDATE order SET status=confirmed
        W->>DB: COMMIT
        W->>Q2: Push task sync_inventory_to_channels(sku, new_qty)
        W->>W: Push task send_notification(user, "Đơn đã xác nhận")
    end
```

---

## 1.4. Đồng bộ tồn kho sang Shopee/Lazada

```mermaid
sequenceDiagram
    participant W as Celery Worker
    participant Shopee as Shopee API
    participant Lazada as Lazada API
    participant DB as PostgreSQL

    W->>DB: SELECT channels active bán SKU này
    DB-->>W: [Shopee, Lazada]

    par Đồng bộ song song từng kênh
        W->>Shopee: Update stock(sku, quantity)
        alt Thành công
            Shopee-->>W: 200 OK
            W->>DB: INSERT sync_log (status=success)
        else Lỗi/timeout
            Shopee--xW: Timeout
            W->>W: Retry (backoff 1s→5s→30s→2p→10p, tối đa 5 lần)
            W->>DB: INSERT sync_log (status=failed)
            W->>DB: UPDATE channel_products SET sync_status=out_of_sync
        end
    and
        W->>Lazada: Update stock(sku, quantity)
        Lazada-->>W: 200 OK
        W->>DB: INSERT sync_log (status=success)
    end

    Note over W: Lỗi 1 kênh không chặn kênh còn lại
```

---

## 1.5. Nhận Webhook đơn hàng từ Shopee

```mermaid
sequenceDiagram
    participant Shopee as Shopee
    participant API as FastAPI
    participant R as Redis
    participant DB as PostgreSQL
    participant Q as Celery Queue

    Shopee->>API: POST /webhooks/shopee/order (payload + signature)
    API->>API: Verify HMAC signature

    alt Sai chữ ký
        API-->>Shopee: 401 Unauthorized
    else Đúng chữ ký
        API->>R: GET webhook:{external_order_id}
        alt Đã xử lý trước đó (Shopee gọi lại do retry)
            R-->>API: đã tồn tại
            API-->>Shopee: 200 OK (không xử lý lại)
        else Chưa xử lý
            API->>R: SET webhook:{external_order_id}, TTL 24h
            API->>API: Parse & map đơn sang format nội bộ
            API->>DB: Giữ chỗ tồn kho + tạo order (source=shopee)
            API->>Q: Push task confirm_order(order_id)
            API-->>Shopee: 200 OK (trả nhanh, xử lý nặng ở Celery)
        end
    end
```

---

## 1.6. Thanh toán + Callback

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as Frontend
    participant API as FastAPI
    participant PG as Payment Gateway
    participant DB as PostgreSQL
    participant R as Redis

    C->>FE: Chọn thanh toán
    FE->>API: POST /orders/{id}/payment
    API->>DB: Kiểm tra order status=confirmed
    API->>PG: Tạo giao dịch (order_id, amount)
    PG-->>API: payment_url
    API-->>FE: {payment_url}
    FE->>C: Redirect sang cổng thanh toán
    C->>PG: Nhập thông tin & xác nhận thanh toán

    PG->>API: POST /webhooks/payment/callback (signature)
    API->>API: Verify signature
    API->>R: Check dedup theo transaction_id

    alt Đã xử lý rồi
        API-->>PG: 200 OK
    else Chưa xử lý
        alt Thanh toán thành công
            API->>DB: UPDATE order SET status=paid
            API->>DB: INSERT payment (status=success)
            API->>API: Push task chuyển đơn cho kho đóng gói
        else Thanh toán thất bại
            API->>DB: UPDATE order SET status=payment_failed
            API->>R: INCR stock (rollback giữ chỗ)
            API->>DB: UPDATE inventory += quantity (rollback)
        end
        API-->>PG: 200 OK
    end
```

---

## 1.7. Nhập kho (Warehouse Staff)

```mermaid
sequenceDiagram
    actor WS as Warehouse Staff
    participant FE as Admin Panel
    participant API as FastAPI
    participant DB as PostgreSQL
    participant Q as Celery Queue

    WS->>FE: Tạo phiếu nhập (chọn NCC, SKU, số lượng)
    FE->>API: POST /admin/stock-imports
    API->>DB: INSERT stock_import (status=draft) + items
    API-->>FE: 201 {import_id}

    WS->>FE: Gửi duyệt
    FE->>API: PATCH /admin/stock-imports/{id}/approve
    API->>DB: UPDATE status=approved
    API-->>FE: 200 OK

    Note over WS: Hàng về kho thực tế
    WS->>FE: Xác nhận hoàn tất nhập
    FE->>API: PATCH /admin/stock-imports/{id}/complete
    API->>DB: BEGIN TRANSACTION
    loop Với mỗi item
        API->>DB: SELECT inventory FOR UPDATE
        API->>DB: UPDATE quantity += item.quantity
        API->>DB: INSERT stock_movements (type=import)
    end
    API->>DB: UPDATE stock_import status=completed
    API->>DB: COMMIT
    API->>Q: Push task sync_inventory_to_channels (báo tăng kho)
    API-->>FE: 200 OK
```

---

## 1.8. Đánh giá sản phẩm (Review)

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL
    participant Q as Celery Queue

    C->>FE: Viết đánh giá cho sản phẩm đã mua
    FE->>API: POST /products/{id}/reviews
    API->>DB: Kiểm tra order đã delivered & thuộc user này chưa
    alt Chưa mua/chưa nhận hàng
        API-->>FE: 403 "Bạn cần nhận hàng trước khi đánh giá"
    else Hợp lệ
        API->>DB: Kiểm tra UNIQUE(order_id, product_id)
        alt Đã review rồi
            API-->>FE: 409 "Đã đánh giá đơn này"
        else Chưa review
            API->>DB: INSERT review (status=pending)
            API->>Q: Push task update_product_rating(product_id)
            API-->>FE: 201 Created
        end
    end
```

---

# PHẦN 2: SƠ ĐỒ LỚP (CLASS DIAGRAM)

## 2.1. Nhóm Người dùng & Phân quyền

```mermaid
classDiagram
    class User {
        +int id
        +string email
        +string phone
        -string password_hash
        +string full_name
        +UserRole role
        +bool is_active
        +register(email, password) User
        +login(email, password) Token
        +checkPermission(code) bool
    }

    class UserRole {
        <<enumeration>>
        CUSTOMER
        ADMIN
        PRODUCT_MANAGER
        WAREHOUSE_STAFF
        ORDER_MANAGER
        CHANNEL_MANAGER
        ACCOUNTANT
    }

    class Address {
        +int id
        +string receiverName
        +string phone
        +string province
        +string district
        +string ward
        +string detail
        +bool isDefault
    }

    class RefreshToken {
        +int id
        +string token
        +datetime expiresAt
        +bool revoked
        +revoke() void
    }

    class Permission {
        +int id
        +string code
    }

    User "1" --> "*" Address : has
    User "1" --> "*" RefreshToken : owns
    User --> UserRole
    User "*" --> "*" Permission : role grants
```

---

## 2.2. Nhóm Sản phẩm & Tồn kho

```mermaid
classDiagram
    class Category {
        +int id
        +string name
        +string slug
        +Category parent
        +getFullPath() string
    }

    class Product {
        +int id
        +string name
        +string slug
        +string description
        +decimal basePrice
        +ProductStatus status
        +decimal avgRating
        +int reviewCount
        +addVariant(variant) void
        +calculateAvgRating() decimal
    }

    class ProductStatus {
        <<enumeration>>
        DRAFT
        ACTIVE
        INACTIVE
        DELETED
    }

    class ProductVariant {
        +int id
        +string sku
        +json attributes
        +decimal price
        +string imageUrl
        +bool isActive
        +getAvailableStock(warehouseId) int
    }

    class Warehouse {
        +int id
        +string name
        +string address
        +bool isActive
    }

    class Inventory {
        +int id
        +string sku
        +int quantity
        +int reservedQuantity
        +int version
        +reserve(qty) bool
        +release(qty) void
        +confirmDeduct(qty) bool
    }

    Category "1" --> "*" Category : parent-child
    Category "1" --> "*" Product : contains
    Product "1" --> "*" ProductVariant : has
    Product --> ProductStatus
    ProductVariant "1" --> "*" Inventory : stocked in
    Warehouse "1" --> "*" Inventory : manages
```

---

## 2.3. Nhóm Đơn hàng & Giỏ hàng

```mermaid
classDiagram
    class Cart {
        +int id
        +addItem(sku, qty) void
        +removeItem(sku) void
        +getTotal() decimal
        +checkout() Order
    }

    class CartItem {
        +int id
        +string sku
        +int quantity
    }

    class Order {
        +int id
        +string source
        +string externalOrderId
        +OrderStatus status
        +decimal totalAmount
        +string idempotencyKey
        +confirm() void
        +cancel() void
        +applyVoucher(voucher) void
    }

    class OrderStatus {
        <<enumeration>>
        PENDING_CONFIRM
        CONFIRMED
        PAID
        PACKED
        SHIPPING
        DELIVERED
        CANCELLED_TIMEOUT
        FAILED_OUT_OF_STOCK
        PAYMENT_FAILED
        RETURNED
    }

    class OrderItem {
        +int id
        +string sku
        +string productName
        +int quantity
        +decimal priceAtOrder
    }

    class OrderStatusHistory {
        +int id
        +OrderStatus status
        +datetime changedAt
    }

    Cart "1" --> "*" CartItem : contains
    Cart "1" ..> "1" Order : checkout creates
    Order "1" --> "*" OrderItem : contains
    Order "1" --> "*" OrderStatusHistory : tracks
    Order --> OrderStatus
```

---

## 2.4. Nhóm Thanh toán, Vận chuyển & Đa kênh

```mermaid
classDiagram
    class Payment {
        +int id
        +string provider
        +string transactionId
        +decimal amount
        +PaymentStatus status
        +processCallback(payload) void
    }

    class PaymentStatus {
        <<enumeration>>
        PENDING
        SUCCESS
        FAILED
        REFUNDED
    }

    class Shipment {
        +int id
        +string provider
        +string trackingCode
        +ShipmentStatus status
        +createShippingOrder() void
        +trackStatus() ShipmentStatus
    }

    class Channel {
        +int id
        +string name
        -string apiCredentials
        +bool isActive
        +syncProduct(sku) void
        +syncStock(sku, qty) void
        +receiveWebhookOrder(payload) Order
    }

    class ChannelProduct {
        +int id
        +string channelSku
        +SyncStatus syncStatus
        +datetime lastSyncedAt
    }

    class SyncLog {
        +int id
        +string action
        +string status
        +string errorMessage
    }

    class Order

    Order "1" --> "*" Payment : paid via
    Order "1" --> "1" Shipment : shipped via
    Channel "1" --> "*" ChannelProduct : lists
    Channel "1" --> "*" SyncLog : logs
    Channel ..> Order : creates via webhook
```

---

## 2.5. Nhóm Nhập/Xuất kho & Nhân sự

```mermaid
classDiagram
    class Supplier {
        +int id
        +string name
        +string contactName
        +string phone
    }

    class StockImport {
        +int id
        +string code
        +ImportStatus status
        +decimal totalAmount
        +approve() void
        +complete() void
    }

    class ImportStatus {
        <<enumeration>>
        DRAFT
        PENDING_APPROVAL
        APPROVED
        COMPLETED
        CANCELLED
    }

    class StockImportItem {
        +int id
        +string sku
        +int quantity
        +decimal unitCost
    }

    class StockMovement {
        +int id
        +string sku
        +MovementType movementType
        +int quantityChange
    }

    class Employee {
        +int id
        +string employeeCode
        +string department
        +string position
        +EmploymentStatus status
        +checkIn() void
        +checkOut() void
    }

    class AttendanceLog {
        +int id
        +datetime checkIn
        +datetime checkOut
        +date workDate
    }

    Supplier "1" --> "*" StockImport : supplies
    StockImport "1" --> "*" StockImportItem : contains
    StockImport --> ImportStatus
    StockImportItem ..> StockMovement : triggers
    Employee "1" --> "*" AttendanceLog : logs
```

---

## 2.6. Nhóm Khuyến mãi & Đánh giá

```mermaid
classDiagram
    class Voucher {
        +int id
        +string code
        +DiscountType discountType
        +decimal discountValue
        +int usageLimit
        +int usedCount
        +datetime expiresAt
        +validate(orderAmount) bool
        +applyTo(order) decimal
    }

    class DiscountType {
        <<enumeration>>
        PERCENT
        FIXED
    }

    class Review {
        +int id
        +int rating
        +string comment
        +ReviewStatus status
        +approve() void
        +reject() void
    }

    class ReviewStatus {
        <<enumeration>>
        PENDING
        APPROVED
        REJECTED
    }

    class ReviewImage {
        +int id
        +string imageUrl
    }

    class ReviewReply {
        +int id
        +string content
    }

    class Order
    class Product

    Voucher "1" --> "*" Order : applied to
    Product "1" --> "*" Review : receives
    Review "1" --> "*" ReviewImage : has
    Review "1" --> "*" ReviewReply : has
    Review --> ReviewStatus
    Order "1" --> "0..1" Review : generates
```

---

## Ghi chú ký hiệu Mermaid

**Sequence Diagram:**
| Ký hiệu | Ý nghĩa |
|---|---|
| `->>` | Gọi đồng bộ (request) |
| `-->>` | Trả về (response) |
| `--x` | Lỗi/timeout |
| `alt/else` | Rẽ nhánh điều kiện |
| `loop` | Lặp |
| `par/and` | Chạy song song |
| `Note over` | Ghi chú |

**Class Diagram:**
| Ký hiệu | Ý nghĩa |
|---|---|
| `+` | public |
| `-` | private |
| `"1" --> "*"` | Quan hệ 1 - nhiều |
| `..>` | Quan hệ phụ thuộc (dependency) |
| `<<enumeration>>` | Kiểu liệt kê (enum) |

**Cách xem hình:** copy từng khối ` ```mermaid ` dán vào https://mermaid.live để render trực quan ngay.
