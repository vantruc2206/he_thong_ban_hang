import pytest
from app.modules.inventory.models import Inventory, ImportStatus

def test_warehouse_and_supplier_creation(client):
    # 1. Tạo kho hàng
    wh_resp = client.post("/api/v1/inventory/warehouses", json={
        "name": "Kho Tổng Hà Nội",
        "code": "WH-HN-01",
        "address": "123 Phố Huế, Hai Bà Trưng, Hà Nội"
    })
    assert wh_resp.status_code == 201
    wh = wh_resp.json()
    assert wh["code"] == "WH-HN-01"

    # 2. Tạo nhà cung cấp
    sup_resp = client.post("/api/v1/inventory/suppliers", json={
        "name": "Công ty TNHH Apple Việt Nam",
        "code": "SUP-APPLE-VN",
        "phone": "02439998888",
        "email": "contact@apple.vn"
    })
    assert sup_resp.status_code == 201
    sup = sup_resp.json()
    assert sup["code"] == "SUP-APPLE-VN"

def test_stock_import_flow(client):
    # 1. Tạo kho và NCC
    wh = client.post("/api/v1/inventory/warehouses", json={"name": "Kho HCM", "code": "WH-HCM-01"}).json()
    sup = client.post("/api/v1/inventory/suppliers", json={"name": "Nhà cung cấp A", "code": "SUP-A"}).json()

    # 2. Tạo phiếu nhập kho
    import_payload = {
        "code": "IMP-20231001-001",
        "supplier_id": sup["id"],
        "warehouse_id": wh["id"],
        "items": [
            {"sku": "TEST-SKU-100", "quantity": 50, "unit_cost": 10000000.0},
            {"sku": "TEST-SKU-200", "quantity": 30, "unit_cost": 15000000.0}
        ]
    }
    imp_resp = client.post("/api/v1/inventory/stock-imports", json=import_payload)
    assert imp_resp.status_code == 201
    imp = imp_resp.json()
    assert imp["status"] == "draft"

    # 3. Hoàn tất phiếu nhập kho
    complete_resp = client.patch(f"/api/v1/inventory/stock-imports/{imp['id']}/complete")
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "completed"

    # 4. Kiểm tra tồn kho khả dụng
    inv_resp = client.get(f"/api/v1/inventory/stock?warehouse_id={wh['id']}")
    assert inv_resp.status_code == 200
    stocks = inv_resp.json()
    assert len(stocks) == 2
    sku_100_stock = next(s for s in stocks if s["sku"] == "TEST-SKU-100")
    assert sku_100_stock["quantity"] == 50
    assert sku_100_stock["available_quantity"] == 50
