import enum
from sqlalchemy import Column, BigInteger, String, Numeric, Boolean, DateTime, Enum, ForeignKey, Text, Integer, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

# --- SALES ENUMS & MODELS ---

class OrderStatus(str, enum.Enum):
    pending_confirm = "pending_confirm"
    confirmed = "confirmed"
    paid = "paid"
    packed = "packed"
    shipping = "shipping"
    delivered = "delivered"
    cancelled_timeout = "cancelled_timeout"
    failed_out_of_stock = "failed_out_of_stock"
    payment_failed = "payment_failed"
    returned = "returned"
    cancelled_by_user = "cancelled_by_user"

class OutboxEventStatus(str, enum.Enum):
    pending = "pending"
    processed = "processed"
    failed = "failed"

class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    __table_args__ = (
        Index("idx_outbox_status_created", "status", "created_at"),
        {"schema": "sales"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)  # e.g., "order_created", "inventory_reserved"
    payload = Column(JSON, nullable=False)
    status = Column(Enum(OutboxEventStatus, name="outbox_event_status", schema="sales"), nullable=False, default=OutboxEventStatus.pending)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)

class Cart(Base):
    __tablename__ = "carts"
    __table_args__ = {"schema": "sales"}

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("iam.users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = {"schema": "sales"}

    id = Column(BigInteger, primary_key=True, index=True)
    cart_id = Column(BigInteger, ForeignKey("sales.carts.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), ForeignKey("catalog.product_variants.sku"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    cart = relationship("Cart", back_populates="items")

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("idx_orders_user_status", "user_id", "status"),
        Index("idx_orders_status_created", "status", "created_at"),
        Index("idx_orders_user_created", "user_id", "created_at"),
        Index("idx_orders_created_at", "created_at"),
        {"schema": "sales"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("iam.users.id", ondelete="SET NULL"), nullable=True, index=True)
    source = Column(String(50), nullable=False, default="web")
    external_order_id = Column(String(100), nullable=True)
    status = Column(Enum(OrderStatus, name="order_status", schema="sales"), nullable=False, default=OrderStatus.pending_confirm)
    total_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    idempotency_key = Column(String(100), unique=True, nullable=True)
    shipping_address_id = Column(BigInteger, ForeignKey("iam.addresses.id", ondelete="SET NULL"), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    shipments = relationship("Shipment", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = {"schema": "sales"}

    id = Column(BigInteger, primary_key=True, index=True)
    order_id = Column(BigInteger, ForeignKey("sales.orders.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), nullable=False, index=True)
    product_name = Column(String(500), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_order = Column(Numeric(14, 2), nullable=False)

    order = relationship("Order", back_populates="items")

class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"
    __table_args__ = {"schema": "sales"}

    id = Column(BigInteger, primary_key=True, index=True)
    order_id = Column(BigInteger, ForeignKey("sales.orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(OrderStatus, name="order_status", schema="sales"), nullable=False)
    changed_by = Column(BigInteger, ForeignKey("iam.users.id", ondelete="SET NULL"), nullable=True)
    note = Column(String(500), nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order = relationship("Order", back_populates="status_history")

# --- LOGISTICS ENUMS & MODELS ---

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"
    refunded = "refunded"

class ShipmentStatus(str, enum.Enum):
    pending = "pending"
    picked_up = "picked_up"
    in_transit = "in_transit"
    delivered = "delivered"
    failed = "failed"
    returned = "returned"

class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": "logistics"}

    id = Column(BigInteger, primary_key=True, index=True)
    order_id = Column(BigInteger, ForeignKey("sales.orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)  # e.g., "vnpay", "momo", "cod"
    transaction_id = Column(String(100), unique=True, nullable=True)
    idempotency_key = Column(String(100), unique=True, nullable=True)
    amount = Column(Numeric(14, 2), nullable=False)
    status = Column(Enum(PaymentStatus, name="payment_status", schema="logistics"), nullable=False, default=PaymentStatus.pending)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order = relationship("Order", back_populates="payments")

class Shipment(Base):
    __tablename__ = "shipments"
    __table_args__ = {"schema": "logistics"}

    id = Column(BigInteger, primary_key=True, index=True)
    order_id = Column(BigInteger, ForeignKey("sales.orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    provider = Column(String(50), nullable=True)  # e.g., "ghn", "ghtk"
    tracking_code = Column(String(100), nullable=True)
    status = Column(Enum(ShipmentStatus, name="shipment_status", schema="logistics"), nullable=False, default=ShipmentStatus.pending)
    shipping_fee = Column(Numeric(14, 2), nullable=True, default=0.00)
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order = relationship("Order", back_populates="shipments")
