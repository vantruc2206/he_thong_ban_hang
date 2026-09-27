import enum
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, Enum, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class UserRole(str, enum.Enum):
    customer = "customer"
    admin = "admin"
    product_manager = "product_manager"
    warehouse_staff = "warehouse_staff"
    order_manager = "order_manager"
    channel_manager = "channel_manager"
    accountant = "accountant"

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_role_status", "role", "is_active"),
        {"schema": "iam"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, name="user_role", schema="iam"), nullable=False, default=UserRole.customer)
    is_active = Column(Boolean, nullable=False, default=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

class Address(Base):
    __tablename__ = "addresses"
    __table_args__ = (
        Index("idx_addresses_user_default", "user_id", "is_default"),
        {"schema": "iam"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("iam.users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    province = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    ward = Column(String(100), nullable=False)
    detail = Column(String(500), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="addresses")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (
        Index("idx_refresh_tokens_user_expires", "user_id", "expires_at", "revoked"),
        {"schema": "iam"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("iam.users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="refresh_tokens")

class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = {"schema": "iam"}

    id = Column(BigInteger, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
