import pytest
from app.modules.inventory.models import Inventory
from app.core.outbox import OutboxEvent

def test_order_creation_and_outbox(client, db_session):
    # 1. Đăng ký & đăng nhập user
    reg = client.post("/api/v1/auth/register", json={
        "email": "buyer@example.com",
        "password": "Password123!",
        "full_name": "Người mua Hàng"
    }).json()

    login = client.post("/api/v1/auth/login", data={
        "username": "buyer@example.com",
        "password": "Password123!"
    }).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}

    # 2. Tạo kho & Nạp 10 sản phẩm SKU 'MACBOOK-M3'
    wh = client.post("/api/v1/inventory/warehouses", json={"name": "Kho Macbook", "code": "WH-MB-01"}).json()
    inv = Inventory(warehouse_id=wh["id"], sku="MACBOOK-M3", quantity=10, reserved_quantity=0)
    db_session.add(inv)
    db_session.commit()

    # 3. Đặt đơn hàng 3 chiếc Macbook (Truyền Idempotency Key)
    order_payload = {
        "items": [
            {"sku": "MACBOOK-M3", "quantity": 3, "price": 45000000.0, "product_name": "Macbook Pro M3"}
        ],
        "note": "Giao hàng giờ hành chính"
    }
    headers_with_key = {**headers, "Idempotency-Key": "IDEM-ORDER-001"}
    resp = client.post("/api/v1/sales/orders", json=order_payload, headers=headers_with_key)
    assert resp.status_code == 201
    order = resp.json()
    assert order["status"] == "pending_confirm"
    assert order["total_amount"] == 135000000.0

    # 4. Kiểm tra Idempotency: Gửi lại request với cùng key trả về cùng kết quả
    resp_dup = client.post("/api/v1/sales/orders", json=order_payload, headers=headers_with_key)
    assert resp_dup.status_code == 201
    assert resp_dup.json()["id"] == order["id"]

    # 5. Kiểm tra Tồn kho bị reserved 3
    db_session.refresh(inv)
    assert inv.reserved_quantity == 3
    assert (inv.quantity - inv.reserved_quantity) == 7

    # 6. Kiểm tra Outbox Event đã được ghi
    events = db_session.query(OutboxEvent).filter(OutboxEvent.event_type == "order_created").all()
    assert len(events) >= 1
    assert events[0].payload["order_id"] == order["id"]

def test_out_of_stock_rejection(client, db_session):
    # Đăng nhập user
    client.post("/api/v1/auth/register", json={
        "email": "buyer2@example.com",
        "password": "Password123!",
        "full_name": "Người mua Hàng 2"
    })
    login = client.post("/api/v1/auth/login", data={
        "username": "buyer2@example.com",
        "password": "Password123!"
    }).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}

    # Tạo tồn kho chỉ còn 2 chiếc
    wh = client.post("/api/v1/inventory/warehouses", json={"name": "Kho Đồ Gia Dụng", "code": "WH-GD-01"}).json()
    inv = Inventory(warehouse_id=wh["id"], sku="AIR-FRYER", quantity=2, reserved_quantity=0)
    db_session.add(inv)
    db_session.commit()

    # Thử đặt 5 chiếc -> Kỳ vọng lỗi 400 Bad Request không đủ tồn kho
    order_payload = {
        "items": [{"sku": "AIR-FRYER", "quantity": 5, "price": 2000000.0}]
    }
    resp = client.post("/api/v1/sales/orders", json=order_payload, headers=headers)
    assert resp.status_code == 400
    assert "không đủ tồn kho" in resp.json()["detail"]
