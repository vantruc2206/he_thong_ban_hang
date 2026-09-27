import enum
from sqlalchemy import Column, BigInteger, String, Numeric, Boolean, DateTime, Enum, ForeignKey, Text, Integer, JSON, Index, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ProductStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    inactive = "inactive"
    deleted = "deleted"

class Category(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": "catalog"}

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    parent_id = Column(BigInteger, ForeignKey("catalog.categories.id", ondelete="SET NULL"), nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    parent = relationship("Category", remote_side=[id], backref="children")
    products = relationship("Product", back_populates="category")
    category_attributes = relationship("CategoryAttribute", back_populates="category", cascade="all, delete-orphan")

class Attribute(Base):
    __tablename__ = "attributes"
    __table_args__ = {"schema": "catalog"}

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True)
    data_type = Column(String(50), nullable=False, default="string")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class CategoryAttribute(Base):
    __tablename__ = "category_attributes"
    __table_args__ = {"schema": "catalog"}

    category_id = Column(BigInteger, ForeignKey("catalog.categories.id", ondelete="CASCADE"), primary_key=True)
    attribute_id = Column(BigInteger, ForeignKey("catalog.attributes.id", ondelete="CASCADE"), primary_key=True)
    is_required = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)

    # Relationships
    category = relationship("Category", back_populates="category_attributes")
    attribute = relationship("Attribute")

class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("idx_products_cat_status", "category_id", "status"),
        Index("idx_products_status_created", "status", "created_at"),
        Index("idx_products_status_rating", "status", "avg_rating"),
        Index("idx_products_cat_status_price", "category_id", "status", "base_price"),
        {"schema": "catalog"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    category_id = Column(BigInteger, ForeignKey("catalog.categories.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    base_price = Column(Numeric(15, 2), nullable=False, default=0.00)
    status = Column(Enum(ProductStatus, name="product_status", schema="catalog"), nullable=False, default=ProductStatus.active)
    avg_rating = Column(Numeric(3, 2), nullable=False, default=0.00)
    review_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("ProductReview", back_populates="product", cascade="all, delete-orphan")

class ProductVariant(Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        Index("idx_product_variants_prod_sku", "product_id", "sku"),
        {"schema": "catalog"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    product_id = Column(BigInteger, ForeignKey("catalog.products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    attributes = Column(JSON, nullable=True)  # vd: {"color": "Đỏ", "size": "XL"}
    price = Column(Numeric(15, 2), nullable=False)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    product = relationship("Product", back_populates="variants")

class ProductImage(Base):
    __tablename__ = "product_images"
    __table_args__ = {"schema": "catalog"}

    id = Column(BigInteger, primary_key=True, index=True)
    product_id = Column(BigInteger, ForeignKey("catalog.products.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_primary = Column(Boolean, nullable=False, default=False)

    # Relationships
    product = relationship("Product", back_populates="images")


class ProductReview(Base):
    __tablename__ = "product_reviews"
    __table_args__ = (
        Index("idx_reviews_product_id", "product_id"),
        Index("idx_reviews_user_product", "user_id", "product_id"),
        Index("idx_reviews_prod_approved", "product_id", "is_approved", "created_at"),
        CheckConstraint("rating BETWEEN 1 AND 5", name="chk_review_rating"),
        {"schema": "catalog"}
    )

    id = Column(BigInteger, primary_key=True, index=True)
    product_id = Column(BigInteger, ForeignKey("catalog.products.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("iam.users.id", ondelete="SET NULL"), nullable=True)  # nullable = guest reviews
    author_name = Column(String(255), nullable=False)   # tên hiển thị
    rating = Column(Integer, nullable=False)             # 1-5
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    is_verified_purchase = Column(Boolean, nullable=False, default=False)
    helpful_count = Column(Integer, nullable=False, default=0)
    is_approved = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    product = relationship("Product", back_populates="reviews")
