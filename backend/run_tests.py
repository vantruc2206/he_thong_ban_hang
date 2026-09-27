import sys
import unittest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Import toàn bộ models để SQLAlchemy nhận diện tất cả 9 Schemas
from app.modules.auth.models import *
from app.modules.catalog.models import *
from app.modules.inventory.models import *
from app.modules.sales.models import *
from app.modules.omnichannel.models import *
from app.modules.marketing.models import *
from app.modules.hr_system.models import *
from app.core.outbox import *

from app.core.database import Base, engine, SessionLocal, get_db
from app.main import app

class BaseTestCase(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()

        def _override_get_db():
            try:
                yield self.db
            finally:
                pass

        app.dependency_overrides[get_db] = _override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.rollback()
        self.db.close()

class TestAuthModule(BaseTestCase):
    def test_password_and_token(self):
        from app.core.security import hash_password, verify_password, create_access_token
        h = hash_password("Password123!")
        self.assertTrue(verify_password("Password123!", h))
        self.assertFalse(verify_password("Wrong", h))
        t = create_access_token(subject=1)
        self.assertTrue(len(t) > 20)

    def test_register_login_me(self):
        import uuid
        email = f"test_{uuid.uuid4().hex[:6]}@example.com"
        reg = self.client.post("/api/v1/auth/register", json={
            "email": email,
            "password": "Password123!",
            "full_name": "Nguyễn Văn A"
        })
        self.assertEqual(reg.status_code, 201)
        self.assertEqual(reg.json()["email"], email)

        login = self.client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "Password123!"
        })
        self.assertEqual(login.status_code, 200)
        token = login.json()["access_token"]

        me = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], email)

class TestCatalogModule(BaseTestCase):
    def test_attributes_and_categories(self):
        import uuid
        code = f"ram_{uuid.uuid4().hex[:4]}"
        attr = self.client.post("/api/v1/catalog/attributes", json={
            "name": f"RAM {code}", "code": code, "data_type": "string"
        }).json()
        self.assertEqual(attr["code"], code)

        slug = f"laptop_{uuid.uuid4().hex[:4]}"
        cat = self.client.post("/api/v1/catalog/categories", json={
            "name": "Laptop", "slug": slug, "attribute_ids": [attr["id"]]
        }).json()
        self.assertEqual(cat["name"], "Laptop")
        self.assertTrue(len(cat["category_attributes"]) >= 1)

    def test_products_and_variants(self):
        import uuid
        slug = f"phone_{uuid.uuid4().hex[:4]}"
        cat = self.client.post("/api/v1/catalog/categories", json={"name": "Phone", "slug": slug}).json()
        sku = f"IP15-{uuid.uuid4().hex[:4]}"
        prod = self.client.post("/api/v1/catalog/products", json={
            "category_id": cat["id"],
            "name": "iPhone 15",
            "slug": f"iphone-15-{slug}",
            "base_price": 22000000.0,
            "variants": [{"sku": sku, "attributes": {"color": "Black"}, "price": 22000000.0}]
        }).json()
        self.assertEqual(prod["name"], "iPhone 15")
        self.assertEqual(len(prod["variants"]), 1)

class TestInventoryModule(BaseTestCase):
    def test_warehouse_supplier_import(self):
        import uuid
        wh_code = f"WH_{uuid.uuid4().hex[:4]}"
        wh = self.client.post("/api/v1/inventory/warehouses", json={"name": "Kho Test", "code": wh_code}).json()
        sup_code = f"SUP_{uuid.uuid4().hex[:4]}"
        sup = self.client.post("/api/v1/inventory/suppliers", json={"name": "NCC Test", "code": sup_code}).json()
        self.assertEqual(wh["code"], wh_code)

        imp_code = f"IMP_{uuid.uuid4().hex[:4]}"
        sku = f"SKU_{uuid.uuid4().hex[:4]}"
        imp = self.client.post("/api/v1/inventory/stock-imports", json={
            "code": imp_code, "supplier_id": sup["id"], "warehouse_id": wh["id"],
            "items": [{"sku": sku, "quantity": 100, "unit_cost": 50000.0}]
        }).json()
        self.assertEqual(imp["status"], "draft")

        comp = self.client.patch(f"/api/v1/inventory/stock-imports/{imp['id']}/complete")
        self.assertEqual(comp.status_code, 200)
        self.assertEqual(comp.json()["status"], "completed")

        inv = self.client.get(f"/api/v1/inventory/stock?warehouse_id={wh['id']}").json()
        target_inv = next(i for i in inv if i["sku"] == sku)
        self.assertEqual(target_inv["quantity"], 100)

class TestSalesConcurrencyAndOutbox(BaseTestCase):
    def test_order_creation_with_pessimistic_lock_and_outbox(self):
        import uuid
        email = f"buyer_{uuid.uuid4().hex[:6]}@test.com"
        reg = self.client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "Buyer"})
        self.assertEqual(reg.status_code, 201)
        token = self.client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"}).json()["access_token"]
        idemp_key = f"IDEMP_{uuid.uuid4().hex[:6]}"
        headers = {"Authorization": f"Bearer {token}", "Idempotency-Key": idemp_key}

        wh_code = f"WH_S_{uuid.uuid4().hex[:4]}"
        wh = self.client.post("/api/v1/inventory/warehouses", json={"name": "Kho Sales", "code": wh_code}).json()
        sku = f"SKU_ORD_{uuid.uuid4().hex[:4]}"
        inv_item = Inventory(warehouse_id=wh["id"], sku=sku, quantity=10, reserved_quantity=0)
        self.db.add(inv_item)
        self.db.commit()

        order_res = self.client.post("/api/v1/sales/orders", json={
            "items": [{"sku": sku, "quantity": 4, "price": 100000.0}]
        }, headers=headers)
        self.assertEqual(order_res.status_code, 201)
        order = order_res.json()
        self.assertEqual(order["status"], "pending_confirm")

        # Check reserved quantity
        self.db.refresh(inv_item)
        self.assertEqual(inv_item.reserved_quantity, 4)

        # Check outbox event created & processed
        events = self.db.query(OutboxEvent).filter(OutboxEvent.event_type == "order_created").all()
        self.assertGreaterEqual(len(events), 1)
        for ev in events:
            process_outbox_event(self.db, ev)
            self.assertEqual(ev.status, OutboxEventStatus.processed)

    def test_insufficient_stock_rejection(self):
        import uuid
        email = f"buyer2_{uuid.uuid4().hex[:6]}@test.com"
        reg = self.client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "Buyer 2"})
        self.assertEqual(reg.status_code, 201)
        token = self.client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"}).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        wh_code = f"WH_L_{uuid.uuid4().hex[:4]}"
        wh = self.client.post("/api/v1/inventory/warehouses", json={"name": "Kho Low Stock", "code": wh_code}).json()
        sku = f"SKU_LOW_{uuid.uuid4().hex[:4]}"
        inv_item = Inventory(warehouse_id=wh["id"], sku=sku, quantity=1, reserved_quantity=0)
        self.db.add(inv_item)
        self.db.commit()

        err_res = self.client.post("/api/v1/sales/orders", json={
            "items": [{"sku": sku, "quantity": 5, "price": 100000.0}]
        }, headers=headers)
        self.assertEqual(err_res.status_code, 400)
        self.assertIn("không đủ tồn kho", err_res.json()["detail"])

class TestRemainingModules(BaseTestCase):
    def test_logistics_marketing_omnichannel_hr(self):
        import uuid
        code = f"KM_{uuid.uuid4().hex[:4]}"
        v_create = self.client.post("/api/v1/marketing/vouchers", json={
            "code": code, "discount_type": "percent", "discount_value": 10.0
        })
        self.assertEqual(v_create.status_code, 201)
        promo = v_create.json()
        self.assertEqual(promo["code"], code)

        v_res = self.client.post("/api/v1/marketing/vouchers/apply", json={
            "code": code, "order_amount": 500000.0
        })
        self.assertEqual(v_res.json()["discount_applied"], 50000.0)

        # Omnichannel Webhook Idempotency
        ext_id = f"EXT_{uuid.uuid4().hex[:6]}"
        wh1 = self.client.post("/api/v1/omnichannel/webhooks/shopee", json={
            "source": "shopee", "external_id": ext_id, "payload_hash": "hash100"
        }).json()
        wh2 = self.client.post("/api/v1/omnichannel/webhooks/shopee", json={
            "source": "shopee", "external_id": ext_id, "payload_hash": "hash100"
        }).json()
        self.assertEqual(wh1["id"], wh2["id"])

        # HR Employee & Attendance
        emp_email = f"emp_{uuid.uuid4().hex[:6]}@company.com"
        reg = self.client.post("/api/v1/auth/register", json={"email": emp_email, "password": "Password123!", "full_name": "Nhân viên B"})
        user_id = reg.json()["id"]

        emp_code = f"NV_{uuid.uuid4().hex[:4]}"
        emp_res = self.client.post("/api/v1/hr-system/employees", json={
            "user_id": user_id,
            "employee_code": emp_code,
            "hire_date": "2023-01-01",
            "salary_base": 15000000.0
        })
        self.assertEqual(emp_res.status_code, 201)
        emp = emp_res.json()
        self.assertEqual(emp["employee_code"], emp_code)

        check_in_res = self.client.post(f"/api/v1/hr-system/employees/{emp['id']}/check-in")
        self.assertEqual(check_in_res.status_code, 200)

if __name__ == "__main__":
    unittest.main()
