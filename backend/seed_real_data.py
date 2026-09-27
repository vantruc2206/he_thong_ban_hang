import sys
import os
from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.auth.models import User, UserRole
from app.modules.catalog.models import Category, Product, ProductStatus, ProductVariant, ProductImage
from app.modules.inventory.models import Warehouse, Inventory
from app.modules.omnichannel.models import Channel, SyncStatusType

def seed_database():
    db = SessionLocal()
    try:
        print("--- Seeding Real Multi-Image Database Data ---")

        # 1. Seed Demo Users
        users_data = [
            {"email": "admin@hethong.vn", "full_name": "Quản Trị Viên (Admin)", "role": UserRole.admin},
            {"email": "sales@hethong.vn", "full_name": "Nhân Viên Bán Hàng", "role": UserRole.order_manager},
            {"email": "warehouse@hethong.vn", "full_name": "Nhân Viên Quản Lý Kho", "role": UserRole.warehouse_staff},
        ]
        
        for u in users_data:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    password_hash=hash_password("123"),
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True
                )
                db.add(user)
                print(f"Created user: {u['email']}")
        db.commit()

        # 2. Seed Warehouse
        wh = db.query(Warehouse).first()
        if not wh:
            wh = Warehouse(name="Kho Trung Tâm TP.HCM", code="WH-HCM-01", address="123 Nguyễn Huệ, Q.1, TP.HCM", is_active=True)
            db.add(wh)
            db.commit()
            db.refresh(wh)
            print("Created central warehouse.")

        # 3. Seed Category
        cat = db.query(Category).filter(Category.slug == "thoi-trang-nam").first()
        if not cat:
            cat = Category(name="Thời Trang Nam", slug="thoi-trang-nam")
            db.add(cat)
            db.commit()
            db.refresh(cat)

        # 4. Seed Products with Real Multi-Images in catalog.product_images
        products_seed = [
            {
                "name": "Áo Polo Nam Premium Cotton 100%",
                "slug": "ao-polo-nam-premium",
                "price": 299000,
                "sku": "POLO-PREMIUM-01",
                "qty": 150,
                "images": [
                    {"url": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1000&auto=format&fit=crop&q=80", "is_primary": True, "sort": 0},
                    {"url": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 1},
                    {"url": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 2},
                    {"url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 3}
                ]
            },
            {
                "name": "Quần Jean Nam Slimfit Co Giãn",
                "slug": "quan-jean-nam-slimfit",
                "price": 450000,
                "sku": "JEAN-SLIM-02",
                "qty": 80,
                "images": [
                    {"url": "https://images.unsplash.com/photo-1542272604-780c96856592?w=1000&auto=format&fit=crop&q=80", "is_primary": True, "sort": 0},
                    {"url": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 1},
                    {"url": "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 2},
                    {"url": "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 3}
                ]
            },
            {
                "name": "Giày Sneaker Thể Thao Nam Trắng",
                "slug": "giay-sneaker-the-thao-nam",
                "price": 690000,
                "sku": "SNK-WHITE-03",
                "qty": 45,
                "images": [
                    {"url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1000&auto=format&fit=crop&q=80", "is_primary": True, "sort": 0},
                    {"url": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 1},
                    {"url": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 2},
                    {"url": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 3},
                    {"url": "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 4}
                ]
            },
            {
                "name": "Áo Sơ Mi Nam Tay Dài Chống Nhăn",
                "slug": "ao-so-mi-nam-tay-dai",
                "price": 380000,
                "sku": "SOMI-LONG-04",
                "qty": 120,
                "images": [
                    {"url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&auto=format&fit=crop&q=80", "is_primary": True, "sort": 0},
                    {"url": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 1},
                    {"url": "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 2},
                    {"url": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1000&auto=format&fit=crop&q=80", "is_primary": False, "sort": 3}
                ]
            }
        ]

        for p_data in products_seed:
            p_exist = db.query(Product).filter(Product.slug == p_data["slug"]).first()
            if not p_exist:
                p = Product(
                    name=p_data["name"],
                    slug=p_data["slug"],
                    description=f"Mô tả sản phẩm {p_data['name']}",
                    category_id=cat.id,
                    base_price=p_data["price"],
                    status=ProductStatus.active
                )
                db.add(p)
                db.commit()
                db.refresh(p)

                v = ProductVariant(
                    product_id=p.id,
                    sku=p_data["sku"],
                    price=p_data["price"],
                    image_url=p_data["images"][0]["url"],
                    is_active=True
                )
                db.add(v)

                inv = Inventory(
                    sku=p_data["sku"],
                    warehouse_id=wh.id,
                    quantity=p_data["qty"],
                    reserved_quantity=0
                )
                db.add(inv)

                for img_info in p_data["images"]:
                    p_img = ProductImage(
                        product_id=p.id,
                        image_url=img_info["url"],
                        sort_order=img_info["sort"],
                        is_primary=img_info["is_primary"]
                    )
                    db.add(p_img)

                db.commit()
                print(f"Created Product: {p_data['name']} with {len(p_data['images'])} real images in DB")
            else:
                # Update existing product images if empty
                existing_imgs = db.query(ProductImage).filter(ProductImage.product_id == p_exist.id).all()
                if not existing_imgs:
                    for img_info in p_data["images"]:
                        p_img = ProductImage(
                            product_id=p_exist.id,
                            image_url=img_info["url"],
                            sort_order=img_info["sort"],
                            is_primary=img_info["is_primary"]
                        )
                        db.add(p_img)
                    db.commit()
                    print(f"Updated Product: {p_data['name']} with {len(p_data['images'])} real images in DB")

        # 5. Seed Omnichannel Channels
        channels_seed = ["Shopee", "TikTok Shop", "Lazada", "Website"]
        for ch_name in channels_seed:
            ch_exist = db.query(Channel).filter(Channel.name == ch_name).first()
            if not ch_exist:
                ch = Channel(name=ch_name, is_active=True)
                db.add(ch)
                print(f"Created Channel: {ch_name}")
        db.commit()

        print("--- SEEDING COMPLETED SUCCESSFULLY ---")

    except Exception as e:
        print(f"Seeding Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
