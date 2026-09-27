from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.modules.omnichannel.models import SyncStatusType

class ChannelCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, example="Shopee Official")
    api_credentials_encrypted: Optional[str] = None
    is_active: bool = True

class ChannelResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ChannelProductMap(BaseModel):
    sku: str = Field(..., min_length=3, max_length=100)
    channel_sku: Optional[str] = None

class ChannelProductResponse(BaseModel):
    id: int
    channel_id: int
    sku: str
    channel_sku: Optional[str] = None
    sync_status: SyncStatusType
    last_synced_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SyncLogResponse(BaseModel):
    id: int
    channel_id: Optional[int] = None
    sku: Optional[str] = None
    action: Optional[str] = None
    status: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class WebhookLogCreate(BaseModel):
    source: str = Field(..., example="Shopee")
    external_id: str = Field(..., example="ORDER123456")
    payload_hash: Optional[str] = None

class WebhookLogResponse(BaseModel):
    id: int
    source: str
    external_id: str
    payload_hash: Optional[str] = None
    processed_at: datetime

    class Config:
        from_attributes = True
