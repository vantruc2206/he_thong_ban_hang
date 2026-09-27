from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from app.modules.catalog.models import ProductStatus

# Attribute Schemas
class AttributeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=100)
    data_type: str = Field("string", max_length=50)

class AttributeResponse(BaseModel):
    id: int
    name: str
    code: str
    data_type: str
    created_at: datetime

    class Config:
        from_attributes = True

# Category Attribute Association Schemas
class CategoryAttributeBind(BaseModel):
    attribute_id: int
    is_required: bool = False
    sort_order: int = 0

class CategoryAttributeResponse(BaseModel):
    category_id: int
    attribute_id: int
    is_required: bool
    sort_order: int
    attribute: Optional[AttributeResponse] = None

    class Config:
        from_attributes = True

# Category Schemas
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255)
    parent_id: Optional[int] = None
    is_active: bool = True
    attribute_ids: Optional[List[int]] = []

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None
    attribute_ids: Optional[List[int]] = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    parent_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    category_attributes: List[CategoryAttributeResponse] = []

    class Config:
        from_attributes = True

# Product Image & Media Schemas
class ProductImageCreate(BaseModel):
    image_url: str
    sort_order: int = 0
    is_primary: bool = False

class ProductImageReorderItem(BaseModel):
    image_id: int
    sort_order: int

class ProductImageReorderRequest(BaseModel):
    items: List[ProductImageReorderItem]

class ProductImageResponse(BaseModel):
    id: int
    image_url: str
    sort_order: int
    is_primary: bool

    class Config:
        from_attributes = True

# Product Variant Schemas
class ProductVariantCreate(BaseModel):
    sku: str = Field(..., min_length=3, max_length=100)
    attributes: Optional[Dict[str, Any]] = None  # e.g., {"color": "Màu Đỏ", "size": "XL"}
    price: float = Field(..., ge=0)
    image_url: Optional[str] = None
    is_active: bool = True

class ProductVariantResponse(BaseModel):
    id: int
    sku: str
    attributes: Optional[Dict[str, Any]] = None
    price: float
    image_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Product Schemas
class ProductCreate(BaseModel):
    category_id: Optional[int] = None
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    base_price: float = Field(..., ge=0)
    status: ProductStatus = ProductStatus.active
    variants: List[ProductVariantCreate] = []
    images: List[ProductImageCreate] = []

class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    status: Optional[ProductStatus] = None
    variants: Optional[List[ProductVariantCreate]] = None
    images: Optional[List[ProductImageCreate]] = None

class ProductResponse(BaseModel):
    id: int
    category_id: Optional[int] = None
    name: str
    slug: str
    description: Optional[str] = None
    base_price: float
    status: ProductStatus
    avg_rating: float
    review_count: int
    variants: List[ProductVariantResponse] = []
    images: List[ProductImageResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductDetailResponse(ProductResponse):
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


# ── Review Schemas ────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    author_name: str = Field(..., min_length=1, max_length=255)
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=255)
    content: str = Field(..., min_length=10)

class ReviewResponse(BaseModel):
    id: int
    product_id: int
    user_id: Optional[int] = None
    author_name: str
    rating: int
    title: Optional[str] = None
    content: str
    is_verified_purchase: bool
    helpful_count: int
    is_approved: bool
    created_at: datetime

    class Config:
        from_attributes = True

class RatingSummary(BaseModel):
    avg_rating: float
    review_count: int
    distribution: Dict[int, int]   # {5: 10, 4: 5, 3: 1, 2: 0, 1: 0}
    reviews: List[ReviewResponse]
