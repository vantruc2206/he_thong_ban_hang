import enum
from sqlalchemy import Column, BigInteger, String, Numeric, Boolean, DateTime, Enum, ForeignKey, Text, Integer, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ImportStatus(str, enum.Enum):
    draft = "draft"
    pending_approval = "pending_approval"
    approved = "approved"
    completed = "completed"
    cancelled = "cancelled"

class MovementType(str, enum.Enum):
    import_stock = "import"
    export_order = "export"
    adjust = "adjust"
    reserve = "reserve"
    release = "release"

class Warehouse(Base):
    __tablename__ = "warehouses"
    __table_args__ = {"schema": "inventory"}

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    address = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    inventories = relationship("Inventory", back_populates="warehouse", cascade="all, delete-orphan")
    stock_imports = relationship("StockImport", back_populates="warehouse")

class Inventory(Base):
    __tablename__ = "inventories"
    __table_args__ = (
        Index("idx_inventory_wh_sku", "warehouse_id", "sku"),
        {"schema": "inventory"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    warehouse_id = Column(BigInteger, ForeignKey("inventory.warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=0)
    reserved_quantity = Column(Integer, nullable=False, default=0)
    version = Column(Integer, nullable=False, default=1)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    warehouse = relationship("Warehouse", back_populates="inventories")

class Supplier(Base):
    __tablename__ = "suppliers"
    __table_args__ = {"schema": "inventory"}

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    contact_name = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    stock_imports = relationship("StockImport", back_populates="supplier")

class StockImport(Base):
    __tablename__ = "stock_imports"
    __table_args__ = {"schema": "inventory"}

    id = Column(BigInteger, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    supplier_id = Column(BigInteger, ForeignKey("inventory.suppliers.id", ondelete="SET NULL"), nullable=True, index=True)
    warehouse_id = Column(BigInteger, ForeignKey("inventory.warehouses.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(Enum(ImportStatus, name="import_status", schema="inventory"), nullable=False, default=ImportStatus.draft)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0.00)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    supplier = relationship("Supplier", back_populates="stock_imports")
    warehouse = relationship("Warehouse", back_populates="stock_imports")
    items = relationship("StockImportItem", back_populates="stock_import", cascade="all, delete-orphan")

class StockImportItem(Base):
    __tablename__ = "stock_import_items"
    __table_args__ = {"schema": "inventory"}

    id = Column(BigInteger, primary_key=True, index=True)
    import_id = Column(BigInteger, ForeignKey("inventory.stock_imports.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(15, 2), nullable=False)

    stock_import = relationship("StockImport", back_populates="items")

class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        Index("idx_stock_movements_sku_created", "sku", "created_at"),
        {"schema": "inventory"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    warehouse_id = Column(BigInteger, ForeignKey("inventory.warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), nullable=False, index=True)
    movement_type = Column(Enum(MovementType, name="movement_type", schema="inventory"), nullable=False)
    quantity_change = Column(Integer, nullable=False)
    reference_id = Column(String(100), nullable=True)  # Mã phiếu nhập hoặc mã đơn hàng
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
