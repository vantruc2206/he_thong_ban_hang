import pytest

def test_attributes_crud(client):
    # 1. Tạo Attribute
    attr_resp = client.post("/api/v1/catalog/attributes", json={
        "name": "Dung lượng RAM",
        "code": "ram_size",
        "data_type": "string"
    })
    assert attr_resp.status_code == 201
    attr = attr_resp.json()
    assert attr["code"] == "ram_size"

    # 2. List Attributes
    list_resp = client.get("/api/v1/catalog/attributes")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

def test_category_with_attributes(client):
    # 1. Tạo attribute
    attr_resp = client.post("/api/v1/catalog/attributes", json={
        "name": "Kích thước màn hình",
        "code": "screen_size",
        "data_type": "string"
    })
    attr_id = attr_resp.json()["id"]

    # 2. Tạo Category gắn attribute_ids
    cat_resp = client.post("/api/v1/catalog/categories", json={
        "name": "Laptop Gaming",
        "slug": "laptop-gaming",
        "is_active": True,
        "attribute_ids": [attr_id]
    })
    assert cat_resp.status_code == 201
    cat = cat_resp.json()
    assert cat["name"] == "Laptop Gaming"
    assert len(cat["attributes"]) == 1
    assert cat["attributes"][0]["attribute"]["code"] == "screen_size"

def test_product_and_variants(client):
    # 1. Tạo danh mục
    cat_resp = client.post("/api/v1/catalog/categories", json={
        "name": "Điện thoại",
        "slug": "dien-thoai",
        "is_active": True
    })
    cat_id = cat_resp.json()["id"]

    # 2. Tạo sản phẩm với 2 biến thể
    prod_payload = {
        "category_id": cat_id,
        "name": "iPhone 15 Pro",
        "slug": "iphone-15-pro",
        "description": "Siêu phẩm Apple 2023",
        "variants": [
            {
                "sku": "IP15P-128-BLK",
                "attributes": {"color": "Black", "storage": "128GB"},
                "price": 28000000.0
            },
            {
                "sku": "IP15P-256-GLD",
                "attributes": {"color": "Gold", "storage": "256GB"},
                "price": 31000000.0
            }
        ]
    }
    prod_resp = client.post("/api/v1/catalog/products", json=prod_payload)
    assert prod_resp.status_code == 201
    prod = prod_resp.json()
    assert prod["name"] == "iPhone 15 Pro"
    assert len(prod["variants"]) == 2

    # 3. Lấy variant options theo category
    opt_resp = client.get(f"/api/v1/catalog/products/variant-options?category_id={cat_id}")
    assert opt_resp.status_code == 200
    options = opt_resp.json()
    assert "color" in options or "storage" in options
