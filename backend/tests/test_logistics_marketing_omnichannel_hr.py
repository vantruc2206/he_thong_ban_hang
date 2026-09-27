import pytest

def test_payments_and_shipments(client, db_session):
    # Đăng ký user
    client.post("/api/v1/auth/register", json={"email": "logistics@example.com", "password": "Password123!", "full_name": "NV Logistics"})
    login = client.post("/api/v1/auth/login", data={"username": "logistics@example.com", "password": "Password123!"}).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}

    # Tạo đơn hàng
    order = client.post("/api/v1/sales/orders", json={
        "items": [{"sku": "SKU-LOGISTICS-01", "quantity": 1, "price": 500000.0}]
    }, headers=headers).json()

    # 1. Tạo thanh toán VietQR
    pay_resp = client.post("/api/v1/sales/payments", json={
        "order_id": order["id"],
        "payment_method": "vietqr",
        "amount": 500000.0
    }, headers=headers)
    assert pay_resp.status_code == 201
    pay = pay_resp.json()
    assert pay["payment_method"] == "vietqr"

    # 2. Tạo vận đơn giao hàng
    ship_resp = client.post("/api/v1/sales/shipments", json={
        "order_id": order["id"],
        "carrier_code": "GHN",
        "tracking_code": "GHN123456789VN",
        "shipping_fee": 30000.0
    }, headers=headers)
    assert ship_resp.status_code == 201
    ship = ship_resp.json()
    assert ship["carrier_code"] == "GHN"
    assert ship["status"] == "ready_to_pick"

def test_marketing_promotions_and_vouchers(client):
    # 1. Tạo chương trình khuyến mãi (Promotion)
    promo_resp = client.post("/api/v1/marketing/promotions", json={
        "name": "Giảm giá Mùa Hè 2024",
        "code": "SUMMER2024",
        "discount_type": "percent",
        "discount_value": 15.0
    })
    assert promo_resp.status_code == 201
    promo = promo_resp.json()
    assert promo["code"] == "SUMMER2024"

    # 2. Áp dụng mã Voucher
    apply_resp = client.post("/api/v1/marketing/vouchers/apply", json={
        "code": "SUMMER2024",
        "order_amount": 1000000.0
    })
    assert apply_resp.status_code == 200
    applied = apply_resp.json()
    assert applied["discount_amount"] == 150000.0
    assert applied["final_amount"] == 850000.0

def test_omnichannel_webhooks(client):
    # 1. Tiếp nhận Webhook từ Shopee
    wh_payload = {
        "external_id": "SHOPEE-EVT-998877",
        "payload_hash": "a1b2c3d4e5f6"
    }
    resp1 = client.post("/api/v1/omnichannel/webhooks/shopee", json=wh_payload)
    assert resp1.status_code == 201
    wh1 = resp1.json()
    assert wh1["source"] == "shopee"

    # 2. Gửi trùng Webhook -> Kiểm tra Idempotency
    resp2 = client.post("/api/v1/omnichannel/webhooks/shopee", json=wh_payload)
    assert resp2.status_code == 201
    assert resp2.json()["id"] == wh1["id"]

def test_hr_employees_and_payroll(client):
    # 1. Thêm nhân viên mới
    emp_resp = client.post("/api/v1/hr/employees", json={
        "code": "NV-2023-001",
        "full_name": "Lê Văn Cường",
        "department": "Kinh doanh",
        "position": "Trưởng phòng",
        "base_salary": 20000000.0
    })
    assert emp_resp.status_code == 201
    emp = emp_resp.json()
    assert emp["code"] == "NV-2023-001"

    # 2. Tính lương bảng lương tháng 10/2023
    payroll_resp = client.post("/api/v1/hr/payrolls/calculate", json={
        "employee_id": emp["id"],
        "month": 10,
        "year": 2023,
        "working_days": 22,
        "actual_working_days": 22,
        "bonus": 2000000.0
    })
    assert payroll_resp.status_code == 201
    pay = payroll_resp.json()
    assert pay["net_salary"] == 22000000.0
