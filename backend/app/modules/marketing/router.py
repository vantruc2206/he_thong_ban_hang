from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_user
from app.modules.marketing.models import (
    Voucher, OrderVoucher, Review, ReviewImage, ReviewReply, DiscountType, ReviewStatus
)
from app.modules.marketing.schemas import (
    VoucherCreate, VoucherResponse, VoucherApplyRequest, VoucherApplyResponse,
    ReviewCreate, ReviewResponse, ReviewReplyCreate, ReviewReplyResponse
)

router = APIRouter(prefix="/marketing", tags=["Marketing (Vouchers) & Product Reviews"])

# --- VOUCHER ENDPOINTS ---

@router.get("/vouchers", response_model=List[VoucherResponse])
def list_vouchers(db: Session = Depends(get_db)):
    """Lấy danh sách các mã giảm giá Voucher đang hoạt động"""
    now = datetime.utcnow()
    return db.query(Voucher).filter(
        Voucher.is_active == True,
        (Voucher.expires_at == None) | (Voucher.expires_at >= now)
    ).all()

@router.post("/vouchers", response_model=VoucherResponse, status_code=status.HTTP_201_CREATED)
def create_voucher(voucher_in: VoucherCreate, db: Session = Depends(get_db)):
    """Tạo mã giảm giá mới (Admin/Manager)"""
    existing_code = db.query(Voucher).filter(Voucher.code == voucher_in.code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Mã giảm giá này đã tồn tại")
    
    new_voucher = Voucher(
        code=voucher_in.code,
        discount_type=voucher_in.discount_type,
        discount_value=voucher_in.discount_value,
        min_order_amount=voucher_in.min_order_amount,
        usage_limit=voucher_in.usage_limit,
        expires_at=voucher_in.expires_at,
        is_active=voucher_in.is_active
    )
    db.add(new_voucher)
    db.commit()
    db.refresh(new_voucher)
    return new_voucher

@router.post("/vouchers/apply", response_model=VoucherApplyResponse)
def apply_voucher(apply_in: VoucherApplyRequest, db: Session = Depends(get_db)):
    """Kiểm tra và tính số tiền được giảm khi áp dụng Voucher vào giá trị đơn hàng"""
    voucher = db.query(Voucher).filter(Voucher.code == apply_in.code, Voucher.is_active == True).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Mã giảm giá không tồn tại hoặc đã hết hạn")

    if voucher.expires_at and voucher.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Mã giảm giá đã quá hạn sử dụng")

    if voucher.usage_limit and voucher.used_count >= voucher.usage_limit:
        raise HTTPException(status_code=400, detail="Mã giảm giá đã hết số lượt sử dụng")

    if apply_in.order_amount < float(voucher.min_order_amount):
        raise HTTPException(status_code=400, detail=f"Đơn hàng phải tối thiểu {voucher.min_order_amount} VNĐ để áp dụng mã này")

    if voucher.discount_type == DiscountType.percent:
        discount = apply_in.order_amount * (float(voucher.discount_value) / 100.0)
    else:
        discount = float(voucher.discount_value)

    discount_applied = min(discount, apply_in.order_amount)
    final_amount = apply_in.order_amount - discount_applied

    return VoucherApplyResponse(
        voucher_id=voucher.id,
        code=voucher.code,
        discount_applied=discount_applied,
        final_order_amount=final_amount
    )

# --- REVIEW ENDPOINTS ---

@router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    review_in: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gửi đánh giá sản phẩm (yêu cầu người dùng đã đăng nhập)"""
    existing_review = db.query(Review).filter(
        Review.order_id == review_in.order_id,
        Review.product_id == review_in.product_id
    ).first()
    if existing_review:
        raise HTTPException(status_code=400, detail="Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi")

    new_review = Review(
        product_id=review_in.product_id,
        user_id=current_user.id,
        order_id=review_in.order_id,
        rating=review_in.rating,
        comment=review_in.comment,
        status=ReviewStatus.approved  # Tự động phê duyệt mẫu
    )
    db.add(new_review)
    db.flush()

    for url in review_in.image_urls:
        img = ReviewImage(review_id=new_review.id, image_url=url)
        db.add(img)

    db.commit()
    db.refresh(new_review)
    return new_review

@router.get("/products/{product_id}/reviews", response_model=List[ReviewResponse])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các đánh giá đã phê duyệt của một sản phẩm"""
    return db.query(Review).filter(
        Review.product_id == product_id,
        Review.status == ReviewStatus.approved
    ).all()

@router.post("/reviews/{review_id}/reply", response_model=ReviewReplyResponse, status_code=status.HTTP_201_CREATED)
def reply_to_review(
    review_id: int,
    reply_in: ReviewReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Phản hồi đánh giá của khách hàng (Shop/Admin)"""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")

    new_reply = ReviewReply(
        review_id=review.id,
        replied_by=current_user.id,
        content=reply_in.content
    )
    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)
    return new_reply
