from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.inventory.models import (
    Warehouse, Inventory, Supplier, StockImport, StockImportItem, StockMovement,
    ImportStatus, MovementType
)
from app.modules.inventory.schemas import (
    WarehouseCreate, WarehouseResponse,
    SupplierCreate, SupplierResponse,
    InventoryResponse,
    StockImportCreate, StockImportResponse,
    StockMovementResponse
)

router = APIRouter(prefix="/inventory", tags=["Inventory & Warehouse Management"])

# --- WAREHOUSE ENDPOINTS ---

@router.get("/warehouses", response_model=List[WarehouseResponse])
def list_warehouses(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các kho hàng đang hoạt động"""
    return db.query(Warehouse).filter(Warehouse.is_active == True).all()

@router.post("/warehouses", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
def create_warehouse(wh_in: WarehouseCreate, db: Session = Depends(get_db)):
    """Tạo kho hàng mới"""
    existing_code = db.query(Warehouse).filter(Warehouse.code == wh_in.code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Mã kho hàng này đã tồn tại")
    
    new_wh = Warehouse(
        name=wh_in.name,
        code=wh_in.code,
        address=wh_in.address,
        is_active=wh_in.is_active
    )
    db.add(new_wh)
    db.commit()
    db.refresh(new_wh)
    return new_wh

# --- SUPPLIER ENDPOINTS ---

@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    """Lấy danh sách nhà cung cấp"""
    return db.query(Supplier).filter(Supplier.is_active == True).all()

@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(sup_in: SupplierCreate, db: Session = Depends(get_db)):
    """Tạo thông tin nhà cung cấp mới"""
    existing_code = db.query(Supplier).filter(Supplier.code == sup_in.code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Mã nhà cung cấp này đã tồn tại")
    
    new_sup = Supplier(
        name=sup_in.name,
        code=sup_in.code,
        contact_name=sup_in.contact_name,
        phone=sup_in.phone,
        email=sup_in.email,
        address=sup_in.address,
        is_active=sup_in.is_active
    )
    db.add(new_sup)
    db.commit()
    db.refresh(new_sup)
    return new_sup

# --- INVENTORY ENDPOINTS ---

@router.get("/stock", response_model=List[InventoryResponse])
def list_stock(
    warehouse_id: Optional[int] = Query(None, description="Lọc theo kho"),
    sku: Optional[str] = Query(None, description="Lọc theo mã SKU"),
    db: Session = Depends(get_db)
):
    """Kiểm tra số lượng tồn kho (khả dụng = tổng - giữ chỗ)"""
    query = db.query(Inventory)
    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)
    if sku:
        query = query.filter(Inventory.sku == sku)
        
    inventories = query.all()
    res = []
    for inv in inventories:
        inv_dict = InventoryResponse.from_orm(inv)
        inv_dict.available_quantity = max(0, inv.quantity - inv.reserved_quantity)
        res.append(inv_dict)
    return res

# --- STOCK IMPORT ENDPOINTS ---

@router.post("/stock-imports", response_model=StockImportResponse, status_code=status.HTTP_201_CREATED)
def create_stock_import(import_in: StockImportCreate, db: Session = Depends(get_db)):
    """Tạo phiếu nhập kho (trạng thái Nháp / Draft)"""
    existing_code = db.query(StockImport).filter(StockImport.code == import_in.code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Mã phiếu nhập kho này đã tồn tại")
    
    # Tính tổng tiền phiếu nhập
    total_amount = sum(item.quantity * item.unit_cost for item in import_in.items)

    new_import = StockImport(
        code=import_in.code,
        supplier_id=import_in.supplier_id,
        warehouse_id=import_in.warehouse_id,
        status=ImportStatus.draft,
        total_amount=total_amount
    )
    db.add(new_import)
    db.flush()

    for item in import_in.items:
        new_item = StockImportItem(
            import_id=new_import.id,
            sku=item.sku,
            quantity=item.quantity,
            unit_cost=item.unit_cost
        )
        db.add(new_item)

    db.commit()
    db.refresh(new_import)
    return new_import

@router.get("/stock-imports", response_model=List[StockImportResponse])
def list_stock_imports(
    warehouse_id: Optional[int] = Query(None),
    status_filter: Optional[ImportStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách các phiếu nhập kho"""
    query = db.query(StockImport)
    if warehouse_id:
        query = query.filter(StockImport.warehouse_id == warehouse_id)
    if status_filter:
        query = query.filter(StockImport.status == status_filter)
    return query.all()

@router.patch("/stock-imports/{import_id}/complete", response_model=StockImportResponse)
def complete_stock_import(import_id: int, db: Session = Depends(get_db)):
    """
    Xác nhận hoàn tất nhập kho:
    1. Đổi trạng thái phiếu nhập thành `completed`.
    2. Tự động cộng số lượng vào bảng tồn kho `inventory`.
    3. Ghi vết biến động kho vào bảng `stock_movements`.
    """
    stock_import = db.query(StockImport).filter(StockImport.id == import_id).first()
    if not stock_import:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập kho")
    
    if stock_import.status == ImportStatus.completed:
        raise HTTPException(status_code=400, detail="Phiếu nhập kho này đã được hoàn tất trước đó")

    # 1. Cập nhật tồn kho cho từng item
    for item in stock_import.items:
        inv = db.query(Inventory).filter(
            Inventory.warehouse_id == stock_import.warehouse_id,
            Inventory.sku == item.sku
        ).with_for_update().first()

        if not inv:
            # Tạo mới bản ghi tồn kho nếu SKU chưa từng tồn tại ở kho này
            inv = Inventory(
                warehouse_id=stock_import.warehouse_id,
                sku=item.sku,
                quantity=item.quantity,
                reserved_quantity=0
            )
            db.add(inv)
        else:
            # Cộng dồn tồn kho
            inv.quantity += item.quantity
            inv.version += 1

        # 2. Ghi vết biến động kho
        movement = StockMovement(
            warehouse_id=stock_import.warehouse_id,
            sku=item.sku,
            movement_type=MovementType.import_stock,
            quantity_change=item.quantity,
            reference_id=stock_import.code
        )
        db.add(movement)

    stock_import.status = ImportStatus.completed
    db.commit()
    db.refresh(stock_import)
    return stock_import
