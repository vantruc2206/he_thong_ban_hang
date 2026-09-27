from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class ChatMessageCreate(BaseModel):
    session_id: str
    sender_type: str = "customer"  # "customer" or "admin"
    sender_name: str = "Khách hàng"
    message: str

class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str
    user_id: Optional[int] = None
    sender_type: str
    sender_name: str
    message: str
    is_read: bool
    created_at: datetime

class ChatSessionSummary(BaseModel):
    session_id: str
    last_message: str
    last_message_at: datetime
    unread_count: int
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    is_registered: bool = False
    user_id: Optional[int] = None

