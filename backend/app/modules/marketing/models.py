import enum
from sqlalchemy import Column, BigInteger, String, Numeric, Boolean, DateTime, Enum, ForeignKey, Text, Integer, SmallInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class DiscountType(str, enum.Enum):
    percent = "percent"
    fixed = "fixed"

class ReviewStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class Voucher(Base):
    __tablename__ = "vouchers"
    __table_args__ = {"schema": "marketing"}

    id = Column(BigInteger, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_type = Column(Enum(DiscountType, name="discount_type", schema="marketing"), nullable=False)
    discount_value = Column(Numeric(14, 2), nullable=False)
    min_order_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    usage_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order_vouchers = relationship("OrderVoucher", back_populates="voucher")

class OrderVoucher(Base):
    __tablename__ = "order_vouchers"
    __table_args__ = {"schema": "marketing"}

    order_id = Column(BigInteger, ForeignKey("sales.orders.id", ondelete="CASCADE"), primary_key=True)
    voucher_id = Column(BigInteger, ForeignKey("marketing.vouchers.id"), primary_key=True)
    discount_applied = Column(Numeric(14, 2), nullable=False)

    voucher = relationship("Voucher", back_populates="order_vouchers")

class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = {"schema": "marketing"}

    id = Column(BigInteger, primary_key=True, index=True)
    product_id = Column(BigInteger, ForeignKey("catalog.products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("iam.users.id"), nullable=False)
    order_id = Column(BigInteger, ForeignKey("sales.orders.id"), nullable=False)
    rating = Column(SmallInteger, nullable=False)  # 1 đến 5 sao
    comment = Column(Text, nullable=True)
    status = Column(Enum(ReviewStatus, name="review_status", schema="marketing"), nullable=False, default=ReviewStatus.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    images = relationship("ReviewImage", back_populates="review", cascade="all, delete-orphan")
    replies = relationship("ReviewReply", back_populates="review", cascade="all, delete-orphan")

class ReviewImage(Base):
    __tablename__ = "review_images"
    __table_args__ = {"schema": "marketing"}

    id = Column(BigInteger, primary_key=True, index=True)
    review_id = Column(BigInteger, ForeignKey("marketing.reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)

    review = relationship("Review", back_populates="images")

class ReviewReply(Base):
    __tablename__ = "review_replies"
    __table_args__ = {"schema": "marketing"}

    id = Column(BigInteger, primary_key=True, index=True)
    review_id = Column(BigInteger, ForeignKey("marketing.reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    replied_by = Column(BigInteger, ForeignKey("iam.users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    review = relationship("Review", back_populates="replies")
