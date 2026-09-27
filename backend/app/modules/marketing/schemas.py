from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.modules.marketing.models import DiscountType, ReviewStatus

# --- VOUCHER SCHEMAS ---
class VoucherCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=50, example="SUMMER2026")
    discount_type: DiscountType
    discount_value: float = Field(..., gt=0)
    min_order_amount: float = 0.00
    usage_limit: Optional[int] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True

class VoucherResponse(BaseModel):
    id: int
    code: str
    discount_type: DiscountType
    discount_value: float
    min_order_amount: float
    usage_limit: Optional[int] = None
    used_count: int
    expires_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class VoucherApplyRequest(BaseModel):
    code: str
    order_amount: float

class VoucherApplyResponse(BaseModel):
    voucher_id: int
    code: str
    discount_applied: float
    final_order_amount: float

# --- REVIEW SCHEMAS ---
class ReviewImageResponse(BaseModel):
    id: int
    image_url: str

    class Config:
        from_attributes = True

class ReviewReplyCreate(BaseModel):
    content: str = Field(..., min_length=2)

class ReviewReplyResponse(BaseModel):
    id: int
    replied_by: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    product_id: int
    order_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    image_urls: List[str] = []

class ReviewResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    order_id: int
    rating: int
    comment: Optional[str] = None
    status: ReviewStatus
    created_at: datetime
    images: List[ReviewImageResponse] = []
    replies: List[ReviewReplyResponse] = []

    class Config:
        from_attributes = True
