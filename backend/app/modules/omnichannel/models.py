import enum
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, Enum, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class SyncStatusType(str, enum.Enum):
    synced = "synced"
    pending = "pending"
    failed = "failed"
    out_of_sync = "out_of_sync"

class Channel(Base):
    __tablename__ = "channels"
    __table_args__ = {"schema": "omnichannel"}

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # Shopee, Lazada, TikTok Shop
    api_credentials_encrypted = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    channel_products = relationship("ChannelProduct", back_populates="channel", cascade="all, delete-orphan")
    sync_logs = relationship("SyncLog", back_populates="channel")

class ChannelProduct(Base):
    __tablename__ = "channel_products"
    __table_args__ = {"schema": "omnichannel"}

    id = Column(BigInteger, primary_key=True, index=True)
    channel_id = Column(BigInteger, ForeignKey("omnichannel.channels.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), ForeignKey("catalog.product_variants.sku", ondelete="CASCADE"), nullable=False, index=True)
    channel_sku = Column(String(100), nullable=True)
    sync_status = Column(Enum(SyncStatusType, name="sync_status_type", schema="omnichannel"), nullable=False, default=SyncStatusType.pending)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)

    channel = relationship("Channel", back_populates="channel_products")

class SyncLog(Base):
    __tablename__ = "sync_logs"
    __table_args__ = {"schema": "omnichannel"}

    id = Column(BigInteger, primary_key=True, index=True)
    channel_id = Column(BigInteger, ForeignKey("omnichannel.channels.id", ondelete="SET NULL"), nullable=True, index=True)
    sku = Column(String(100), nullable=True)
    action = Column(String(50), nullable=True)  # e.g., "sync_stock", "sync_price"
    status = Column(String(20), nullable=True)  # e.g., "success", "failed"
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    channel = relationship("Channel", back_populates="sync_logs")

class WebhookLog(Base):
    __tablename__ = "webhook_logs"
    __table_args__ = (
        Index("idx_webhook_logs_source_ext", "source", "external_id", unique=True),
        {"schema": "omnichannel"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    source = Column(String(50), nullable=False)  # Shopee, Lazada, TikTok
    external_id = Column(String(100), nullable=False)  # Event ID hoặc Order ID từ sàn
    payload_hash = Column(String(255), nullable=True)
    processed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
