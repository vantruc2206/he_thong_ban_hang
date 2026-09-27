import os
import re
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String, func as sa_func
from app.core.database import get_db
from app.modules.catalog.models import Category, Attribute, CategoryAttribute, Product, ProductVariant, ProductImage, ProductStatus, ProductReview
from app.modules.catalog.schemas import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    AttributeCreate, AttributeResponse, CategoryAttributeResponse,
    ProductCreate, ProductUpdate, ProductResponse, ProductDetailResponse,
    ProductVariantCreate, ProductVariantResponse,
    ProductImageResponse, ProductImageReorderRequest,
    ReviewCreate, ReviewResponse, RatingSummary
)
from app.modules.auth.router import get_current_user
from app.modules.auth.models import User
from app.modules.sales.models import Order, OrderItem

router = APIRouter(prefix="/catalog", tags=["Catalog & Product Management"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"}

# --- ATTRIBUTE ENDPOINTS ---

@router.get("/attributes", response_model=List[AttributeResponse])
def list_attributes(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các thuộc tính dùng chung (RAM, Màu sắc, Size, Màn hình...)"""
    return db.query(Attribute).order_by(Attribute.id.asc()).all()

@router.post("/attributes", response_model=AttributeResponse, status_code=status.HTTP_201_CREATED)
def create_attribute(attr_in: AttributeCreate, db: Session = Depends(get_db)):
    """Tạo thuộc tính mới hệ thống (Ví dụ: RAM, Màu sắc, Chất liệu...)"""
    existing_code = db.query(Attribute).filter(Attribute.code == attr_in.code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail=f"Mã thuộc tính '{attr_in.code}' đã tồn tại")
    
    new_attr = Attribute(
        name=attr_in.name,
        code=attr_in.code,
        data_type=attr_in.data_type
    )
    db.add(new_attr)
    db.commit()
    db.refresh(new_attr)
    return new_attr

@router.delete("/attributes/{attribute_id}")
def delete_attribute(attribute_id: int, db: Session = Depends(get_db)):
    """Xóa một thuộc tính hệ thống"""
    attr = db.query(Attribute).filter(Attribute.id == attribute_id).first()
    if not attr:
        raise HTTPException(status_code=404, detail="Không tìm thấy thuộc tính")
    db.delete(attr)
    db.commit()
    return {"status": "success", "message": f"Đã xóa thuộc tính ID {attribute_id}"}


# --- CATEGORY ENDPOINTS ---

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    include_inactive: bool = Query(False, description="Lấy cả danh mục ẩn"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách tất cả danh mục sản phẩm kèm thuộc tính liên kết"""
    query = db.query(Category)
    if not include_inactive:
        query = query.filter(Category.is_active == True)
    return query.order_by(Category.id.asc()).all()

@router.get("/categories/{category_id}", response_model=CategoryResponse)
def get_category_detail(category_id: int, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết của 1 danh mục"""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    return cat

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(category_in: CategoryCreate, db: Session = Depends(get_db)):
    """Tạo danh mục sản phẩm mới và gắn danh sách thuộc tính (Attribute IDs)"""
    existing_slug = db.query(Category).filter(Category.slug == category_in.slug).first()
    if existing_slug:
        raise HTTPException(status_code=400, detail="Slug danh mục này đã tồn tại")
    
    new_cat = Category(
        name=category_in.name,
        slug=category_in.slug,
        parent_id=category_in.parent_id,
        is_active=category_in.is_active
    )
    db.add(new_cat)
    db.flush()
    
    if category_in.attribute_ids:
        for idx, attr_id in enumerate(category_in.attribute_ids):
            cat_attr = CategoryAttribute(
                category_id=new_cat.id,
                attribute_id=attr_id,
                sort_order=idx
            )
            db.add(cat_attr)
            
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category_in: CategoryUpdate, db: Session = Depends(get_db)):
    """Cập nhật danh mục và thay đổi danh sách thuộc tính liên kết"""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    
    if category_in.name is not None:
        cat.name = category_in.name
    if category_in.slug is not None:
        existing_slug = db.query(Category).filter(Category.slug == category_in.slug, Category.id != category_id).first()
        if existing_slug:
            raise HTTPException(status_code=400, detail="Slug danh mục này đã tồn tại")
        cat.slug = category_in.slug
    if category_in.parent_id is not None:
        cat.parent_id = category_in.parent_id if category_in.parent_id > 0 else None
    if category_in.is_active is not None:
        cat.is_active = category_in.is_active

    if category_in.attribute_ids is not None:
        # Clear existing bindings and re-add
        db.query(CategoryAttribute).filter(CategoryAttribute.category_id == category_id).delete()
        for idx, attr_id in enumerate(category_in.attribute_ids):
            cat_attr = CategoryAttribute(
                category_id=cat.id,
                attribute_id=attr_id,
                sort_order=idx
            )
            db.add(cat_attr)
            
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Xóa danh mục sản phẩm"""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    db.delete(cat)
    db.commit()
    return {"status": "success", "message": f"Đã xóa danh mục ID {category_id}"}

# --- PRODUCT ENDPOINTS ---

@router.get("/products", response_model=List[ProductResponse])
def list_products(
    category_id: Optional[int] = Query(None, description="Lọc theo ID danh mục"),
    status_filter: Optional[ProductStatus] = Query(None, alias="status", description="Lọc theo trạng thái"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc mô tả"),
    min_price: Optional[float] = Query(None, ge=0, description="Giá tối thiểu"),
    max_price: Optional[float] = Query(None, ge=0, description="Giá tối đa"),
    color: Optional[str] = Query(None, description="Lọc nhanh theo Màu sắc"),
    size: Optional[str] = Query(None, description="Lọc nhanh theo Kích cỡ Size"),
    pattern: Optional[str] = Query(None, description="Lọc nhanh theo Mẫu mã Pattern"),
    attr_key: Optional[str] = Query(None, description="Tên thuộc tính động tùy chỉnh (Ví dụ: ram, storage, material, volume)"),
    attr_value: Optional[str] = Query(None, description="Giá trị thuộc tính tương ứng (Ví dụ: 16GB, Gỗ sồi, 50ml)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách sản phẩm với bộ lọc thuộc tính ĐỘNG tùy chỉnh do Người bán tự do quy định:
    - Tìm kiếm Tên/Mô tả, Khoảng Giá, Danh mục, Trạng thái.
    - Bộ lọc Thuộc tính Động linh hoạt (Màu sắc, Size, Mẫu mã HOẶC bất kỳ attr_key & attr_value tùy chỉnh nào).
    """
    query = db.query(Product)
    
    if status_filter:
        query = query.filter(Product.status == status_filter)
    else:
        query = query.filter(Product.status != ProductStatus.deleted)
        
    if category_id:
        query = query.filter(Product.category_id == category_id)

    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%")
            )
        )

    if min_price is not None:
        query = query.filter(Product.base_price >= min_price)
    if max_price is not None:
        query = query.filter(Product.base_price <= max_price)

    # Bộ lọc Thuộc tính Biến thể Động (Attributes: Color, Size, Pattern hoặc Custom attr_key & attr_value)
    if color or size or pattern or (attr_key and attr_value):
        variant_query = db.query(ProductVariant.product_id)
        if color:
            variant_query = variant_query.filter(cast(ProductVariant.attributes['color'], String).ilike(f"%{color}%"))
        if size:
            variant_query = variant_query.filter(cast(ProductVariant.attributes['size'], String).ilike(f"%{size}%"))
        if pattern:
            variant_query = variant_query.filter(cast(ProductVariant.attributes['pattern'], String).ilike(f"%{pattern}%"))
        if attr_key and attr_value:
            variant_query = variant_query.filter(
                or_(
                    cast(ProductVariant.attributes[attr_key], String).ilike(f"%{attr_value}%"),
                    cast(ProductVariant.attributes[attr_key.lower()], String).ilike(f"%{attr_value}%"),
                    cast(ProductVariant.attributes[attr_key.capitalize()], String).ilike(f"%{attr_value}%"),
                    cast(ProductVariant.attributes[attr_key.upper()], String).ilike(f"%{attr_value}%")
                )
            )

        matching_product_ids = [r[0] for r in variant_query.distinct().all()]
        query = query.filter(Product.id.in_(matching_product_ids))

    return query.offset(skip).limit(limit).all()

@router.get("/products/{slug}", response_model=ProductDetailResponse)
def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết sản phẩm theo Slug (kèm danh mục, biến thể SKU, hình ảnh)"""
    product = db.query(Product).filter(Product.slug == slug, Product.status != ProductStatus.deleted).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return product

@router.get("/products/{product_id}/variant-options", response_model=Dict[str, List[str]])
def get_product_variant_options(product_id: int, db: Session = Depends(get_db)):
    """
    Tự động quét và tổng hợp TẤT CẢ các thuộc tính động do Người bán tự thêm vào sản phẩm (Màu sắc, Size, RAM, Chất liệu, Thể tích...).
    Ví dụ trả về: `{"ram": ["16GB", "32GB"], "color": ["Màu Đỏ", "Màu Xanh"], "material": ["Gỗ sồi"]}`
    """
    product = db.query(Product).filter(Product.id == product_id, Product.status != ProductStatus.deleted).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    variants = db.query(ProductVariant).filter(ProductVariant.product_id == product_id, ProductVariant.is_active == True).all()
    
    options: Dict[str, set] = {}
    for var in variants:
        if var.attributes and isinstance(var.attributes, dict):
            for key, val in var.attributes.items():
                if val:
                    key_lower = str(key).lower()
                    if key_lower not in options:
                        options[key_lower] = set()
                    
                    if isinstance(val, str):
                        parts = [p.strip() for p in re.split(r'[,;/]+', val) if p.strip()]
                        for p in parts:
                            options[key_lower].add(p)
                    else:
                        options[key_lower].add(str(val))

    return {key: sorted(list(values)) for key, values in options.items()}

@router.post("/products", response_model=ProductDetailResponse, status_code=status.HTTP_201_CREATED)
def create_product(product_in: ProductCreate, db: Session = Depends(get_db)):
    """
    Tạo sản phẩm mới cùng các biến thể SKU.
    Người bán có thể tự do thêm bất kỳ tập thuộc tính tùy chỉnh nào (Attributes) dưới dạng JSON key-value không giới hạn!
    """
    existing_slug = db.query(Product).filter(Product.slug == product_in.slug).first()
    if existing_slug:
        raise HTTPException(status_code=400, detail="Slug sản phẩm này đã tồn tại")
    
    new_product = Product(
        category_id=product_in.category_id,
        name=product_in.name,
        slug=product_in.slug,
        description=product_in.description,
        base_price=product_in.base_price,
        status=product_in.status
    )
    db.add(new_product)
    db.flush()
    
    for var in product_in.variants:
        existing_sku = db.query(ProductVariant).filter(ProductVariant.sku == var.sku).first()
        if existing_sku:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Mã SKU '{var.sku}' đã tồn tại trong hệ thống")
        
        new_variant = ProductVariant(
            product_id=new_product.id,
            sku=var.sku,
            attributes=var.attributes,
            price=var.price,
            image_url=var.image_url,
            is_active=var.is_active
        )
        db.add(new_variant)
        
    for img in product_in.images:
        new_img = ProductImage(
            product_id=new_product.id,
            image_url=img.image_url,
            sort_order=img.sort_order,
            is_primary=img.is_primary
        )
        db.add(new_img)
        
    db.commit()
    db.refresh(new_product)
    return new_product

@router.put("/products/{product_id}", response_model=ProductDetailResponse)
def update_product(product_id: int, product_in: ProductUpdate, db: Session = Depends(get_db)):
    """
    Cập nhật thông tin chi tiết sản phẩm bao gồm Danh mục (category_id), Tên, Giá bán và Thuộc tính biến thể.
    """
    product = db.query(Product).filter(Product.id == product_id, Product.status != ProductStatus.deleted).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    if product_in.name is not None:
        product.name = product_in.name
    if product_in.category_id is not None:
        product.category_id = product_in.category_id
    if product_in.description is not None:
        product.description = product_in.description
    if product_in.base_price is not None:
        product.base_price = product_in.base_price
    if product_in.status is not None:
        product.status = product_in.status

    if product_in.variants and len(product_in.variants) > 0:
        existing_variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.id).all()
        first_var = product_in.variants[0]
        if existing_variants:
            primary_var = existing_variants[0]
            primary_var.attributes = first_var.attributes
            primary_var.price = first_var.price
            if first_var.image_url:
                primary_var.image_url = first_var.image_url
            primary_var.is_active = True

            # Purge extra stale variants for this product so old test attributes are removed from DB
            for extra_var in existing_variants[1:]:
                db.delete(extra_var)
        else:
            new_var = ProductVariant(
                product_id=product.id,
                sku=first_var.sku,
                attributes=first_var.attributes,
                price=first_var.price,
                image_url=first_var.image_url,
                is_active=True
            )
            db.add(new_var)

    db.commit()
    db.refresh(product)
    return product

@router.patch("/products/{product_id}/status", response_model=ProductResponse)
def update_product_status(product_id: int, status: ProductStatus, db: Session = Depends(get_db)):
    """Đổi trạng thái vòng đời sản phẩm (draft, active, inactive, deleted)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    
    product.status = status
    db.commit()
    db.refresh(product)
    return product

@router.delete("/products/{product_id}", response_model=ProductResponse)
def soft_delete_product(product_id: int, db: Session = Depends(get_db)):
    """Xóa mềm sản phẩm (chuyển status sang 'deleted')"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    
    product.status = ProductStatus.deleted
    db.commit()
    db.refresh(product)
    return product

# --- PRODUCT VARIANT ENDPOINTS ---

@router.post("/products/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
def add_product_variant(product_id: int, variant_in: ProductVariantCreate, db: Session = Depends(get_db)):
    """
    Thêm biến thể SKU mới cho sản phẩm có sẵn.
    Người bán tự do truyền dictionary `attributes` bất kỳ (Ví dụ: `{"ram": "32GB", "color": "Silver"}`).
    """
    product = db.query(Product).filter(Product.id == product_id, Product.status != ProductStatus.deleted).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    
    existing_sku = db.query(ProductVariant).filter(ProductVariant.sku == variant_in.sku).first()
    if existing_sku:
        raise HTTPException(status_code=400, detail=f"Mã SKU '{variant_in.sku}' đã tồn tại")

    new_var = ProductVariant(
        product_id=product.id,
        sku=variant_in.sku,
        attributes=variant_in.attributes,
        price=variant_in.price,
        image_url=variant_in.image_url,
        is_active=variant_in.is_active
    )
    db.add(new_var)
    db.commit()
    db.refresh(new_var)
    return new_var

# --- PRODUCT MEDIA & FILE UPLOADS ENDPOINTS ---

@router.post("/products/{product_id}/images/upload", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED)
def upload_product_media(
    product_id: int,
    file: UploadFile = File(...),
    is_primary: bool = Query(False, description="Đặt làm ảnh đại diện chính"),
    db: Session = Depends(get_db)
):
    """Upload tệp Hình ảnh (PNG, JPG, WEBP) hoặc Video (MP4, WEBM) cho sản phẩm từ máy tính/điện thoại."""
    product = db.query(Product).filter(Product.id == product_id, Product.status != ProductStatus.deleted).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Định dạng tệp '{ext}' không được hỗ trợ. Vui lòng chọn ảnh (jpg, png, webp) hoặc video (mp4, webm).")

    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "uploads", "products")
    os.makedirs(uploads_dir, exist_ok=True)

    filename = f"prod_{product_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(uploads_dir, filename)

    with open(file_path, "wb") as f:
        f.write(file.file.read())

    media_url = f"/static/uploads/products/{filename}"

    if is_primary:
        db.query(ProductImage).filter(ProductImage.product_id == product_id).update({"is_primary": False})

    new_img = ProductImage(
        product_id=product.id,
        image_url=media_url,
        sort_order=len(product.images),
        is_primary=is_primary
    )
    db.add(new_img)
    db.commit()
    db.refresh(new_img)
    return new_img

@router.patch("/products/{product_id}/images/{image_id}/primary", response_model=ProductImageResponse)
def set_primary_product_media(product_id: int, image_id: int, db: Session = Depends(get_db)):
    """Đặt làm Ảnh đại diện chính (Primary Thumbnail) cho sản phẩm"""
    img = db.query(ProductImage).filter(ProductImage.id == image_id, ProductImage.product_id == product_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp media của sản phẩm")

    db.query(ProductImage).filter(ProductImage.product_id == product_id).update({"is_primary": False})
    img.is_primary = True
    db.commit()
    db.refresh(img)
    return img

@router.patch("/products/{product_id}/images/reorder", response_model=List[ProductImageResponse])
def reorder_product_media(product_id: int, reorder_in: ProductImageReorderRequest, db: Session = Depends(get_db)):
    """Cập nhật thứ tự hiển thị (`sort_order`) của các tệp ảnh/video sản phẩm"""
    for item in reorder_in.items:
        db.query(ProductImage).filter(
            ProductImage.id == item.image_id,
            ProductImage.product_id == product_id
        ).update({"sort_order": item.sort_order})

    db.commit()
    return db.query(ProductImage).filter(ProductImage.product_id == product_id).order_by(ProductImage.sort_order.asc()).all()

@router.delete("/products/{product_id}/images/{image_id}")
def delete_product_media(product_id: int, image_id: int, db: Session = Depends(get_db)):
    """Xóa tệp Ảnh/Video khỏi sản phẩm và xóa tệp vật lý trên ổ đĩa"""
    img = db.query(ProductImage).filter(ProductImage.id == image_id, ProductImage.product_id == product_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp media của sản phẩm")

    if img.image_url.startswith("/static/uploads/"):
        rel_path = img.image_url.replace("/static/uploads/", "")
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "uploads")
        full_path = os.path.join(uploads_dir, rel_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except Exception:
                pass

    db.delete(img)
    db.commit()
    return {"status": "success", "message": f"Đã xóa thành công tệp media ID {image_id}"}


# ── Review Endpoints ──────────────────────────────────────────────────────────

@router.get("/products/{product_id}/reviews", response_model=RatingSummary)
def get_product_reviews(
    product_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Lấy danh sách đánh giá và thống kê sao của sản phẩm"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    base_q = db.query(ProductReview).filter(
        ProductReview.product_id == product_id,
        ProductReview.is_approved == True
    )

    # Distribution: số lượng review theo từng mức sao
    dist_rows = (
        db.query(ProductReview.rating, sa_func.count(ProductReview.id))
        .filter(ProductReview.product_id == product_id, ProductReview.is_approved == True)
        .group_by(ProductReview.rating)
        .all()
    )
    distribution = {i: 0 for i in range(1, 6)}
    for rating, cnt in dist_rows:
        distribution[rating] = cnt

    reviews = (
        base_q
        .order_by(ProductReview.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return RatingSummary(
        avg_rating=float(product.avg_rating),
        review_count=product.review_count,
        distribution=distribution,
        reviews=reviews
    )


@router.post("/products/{product_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_product_review(
    product_id: int,
    review_in: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gửi đánh giá mới cho sản phẩm (Yêu cầu đăng nhập JWT & Tự động kiểm tra Đã mua hàng)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    # Kiểm tra xem user có đơn hàng hợp lệ chứa sản phẩm này hay không
    # Order status hợp lệ: paid, confirmed, packed, shipping, delivered
    valid_statuses = ["paid", "confirmed", "packed", "shipping", "delivered"]
    user_orders = (
        db.query(Order.id)
        .filter(Order.user_id == current_user.id, Order.status.in_(valid_statuses))
        .all()
    )
    user_order_ids = [o.id for o in user_orders]

    is_verified = False
    if user_order_ids:
        # Kiểm tra OrderItem trong các đơn hàng này có biến thể thuộc product_id không
        product_skus = [v.sku for v in (product.variants or [])]
        if product_skus:
            purchased_item = (
                db.query(OrderItem.id)
                .filter(OrderItem.order_id.in_(user_order_ids), OrderItem.sku.in_(product_skus))
                .first()
            )
            if purchased_item:
                is_verified = True

    author_name = review_in.author_name or current_user.full_name or "Khách hàng"

    new_review = ProductReview(
        product_id=product_id,
        user_id=current_user.id,
        author_name=author_name,
        rating=review_in.rating,
        title=review_in.title,
        content=review_in.content,
        is_verified_purchase=is_verified,
        is_approved=True
    )
    db.add(new_review)
    db.flush()  # get id without full commit

    # Recompute avg_rating & review_count
    agg = (
        db.query(sa_func.avg(ProductReview.rating), sa_func.count(ProductReview.id))
        .filter(ProductReview.product_id == product_id, ProductReview.is_approved == True)
        .one()
    )
    product.avg_rating = round(float(agg[0] or 0), 2)
    product.review_count = agg[1]

    db.commit()
    db.refresh(new_review)
    return new_review
