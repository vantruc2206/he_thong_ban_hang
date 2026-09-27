from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.modules.sales.models import OrderStatus, PaymentStatus, ShipmentStatus

# --- CART SCHEMAS ---
class CartItemAdd(BaseModel):
    sku: str = Field(..., min_length=3, max_length=100)
    quantity: int = Field(..., gt=0)
    idempotency_key: Optional[str] = None

class CartItemResponse(BaseModel):
    id: int
    sku: str
    quantity: int
    product_name: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

class CartResponse(BaseModel):
    id: int
    user_id: int
    items: List[CartItemResponse] = []
    updated_at: datetime

    class Config:
        from_attributes = True

# --- ORDER SCHEMAS ---
class OrderItemCreate(BaseModel):
    sku: str = Field(..., min_length=1, max_length=100)
    quantity: int = Field(..., gt=0)
    product_name: Optional[str] = None
    price: Optional[float] = None

class OrderItemResponse(BaseModel):
    id: int
    sku: str
    product_name: str
    quantity: int
    price_at_order: float

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    shipping_address_id: Optional[int] = None
    note: Optional[str] = None
    items: List[OrderItemCreate] = Field(..., min_items=1)
    idempotency_key: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    note: Optional[str] = None

class OrderStatusHistoryResponse(BaseModel):
    id: int
    status: OrderStatus
    changed_by: Optional[int] = None
    note: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    source: str
    external_order_id: Optional[str] = None
    status: OrderStatus
    total_amount: float
    shipping_address_id: Optional[int] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OrderDetailResponse(OrderResponse):
    items: List[OrderItemResponse] = []
    status_history: List[OrderStatusHistoryResponse] = []

    class Config:
        from_attributes = True

# --- LOGISTICS & PAYMENT SCHEMAS ---
class PaymentCreate(BaseModel):
    provider: str = Field(..., example="vnpay")  # vnpay, momo, zalopay, cod
    transaction_id: Optional[str] = None
    amount: float = Field(..., ge=0)
    idempotency_key: Optional[str] = None

class PaymentIPNCallbackRequest(BaseModel):
    payment_id: int
    order_id: int
    status: PaymentStatus  # success, failed
    transaction_id: Optional[str] = None
    provider: Optional[str] = None

class SepayWebhookPayload(BaseModel):
    id: int
    gateway: str
    transactionDate: str
    accountNumber: str
    code: Optional[str] = None  # Mã đơn hàng (ví dụ: DH123)
    content: str
    transferAmount: float
    referenceCode: Optional[str] = None

class PaymentRefundRequest(BaseModel):
    reason: Optional[str] = "Khách hàng yêu cầu hoàn tiền"

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    provider: str
    transaction_id: Optional[str] = None
    amount: float
    status: PaymentStatus
    paid_at: Optional[datetime] = None
    created_at: datetime
    qr_code_url: Optional[str] = None
    payment_url: Optional[str] = None
    instructions: Optional[str] = None

    class Config:
        from_attributes = True

class ShipmentCreate(BaseModel):
    provider: Optional[str] = Field(None, example="ghn")
    tracking_code: Optional[str] = None
    shipping_fee: float = 0.00

class ShipmentResponse(BaseModel):
    id: int
    order_id: int
    provider: Optional[str] = None
    tracking_code: Optional[str] = None
    status: ShipmentStatus
    shipping_fee: float
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
