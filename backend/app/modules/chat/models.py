from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.sql import func
from app.core.database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (
        Index("idx_chat_session_created", "session_id", "created_at"),
        Index("idx_chat_session_unread", "session_id", "is_read", "sender_type"),
        Index("idx_chat_user", "user_id"),
        {"schema": "omnichannel"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    session_id = Column(String(100), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("iam.users.id", ondelete="SET NULL"), nullable=True)

    sender_type = Column(String(20), nullable=False, default="customer")  # "customer" or "admin"
    sender_name = Column(String(255), nullable=False, default="Khách hàng")
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
