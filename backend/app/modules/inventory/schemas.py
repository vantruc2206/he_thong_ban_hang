from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.modules.inventory.models import ImportStatus, MovementType

# Warehouse Schemas
class WarehouseCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    address: Optional[str] = None
    is_active: bool = True

class WarehouseResponse(BaseModel):
    id: int
    name: str
    code: str
    address: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Supplier Schemas
class SupplierCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True

class SupplierResponse(BaseModel):
    id: int
    name: str
    code: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Inventory Schemas
class InventoryResponse(BaseModel):
    id: int
    warehouse_id: int
    sku: str
    quantity: int
    reserved_quantity: int
    available_quantity: int = 0
    updated_at: datetime

    class Config:
        from_attributes = True

# Stock Import Item Schemas
class StockImportItemCreate(BaseModel):
    sku: str = Field(..., min_length=3, max_length=100)
    quantity: int = Field(..., gt=0)
    unit_cost: float = Field(..., ge=0)

class StockImportItemResponse(BaseModel):
    id: int
    sku: str
    quantity: int
    unit_cost: float

    class Config:
        from_attributes = True

# Stock Import Schemas
class StockImportCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=100)
    supplier_id: Optional[int] = None
    warehouse_id: int
    items: List[StockImportItemCreate] = Field(..., min_items=1)

class StockImportResponse(BaseModel):
    id: int
    code: str
    supplier_id: Optional[int] = None
    warehouse_id: int
    status: ImportStatus
    total_amount: float
    items: List[StockImportItemResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Stock Movement Schemas
class StockMovementResponse(BaseModel):
    id: int
    warehouse_id: int
    sku: str
    movement_type: MovementType
    quantity_change: int
    reference_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
