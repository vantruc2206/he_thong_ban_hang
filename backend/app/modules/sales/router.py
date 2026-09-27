from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query, BackgroundTasks
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.outbox import record_outbox_event, process_outbox_event
from app.modules.auth.models import User
from app.modules.auth.router import get_current_user
from app.modules.catalog.models import ProductVariant, Product
from app.modules.inventory.models import Inventory, StockMovement, MovementType
from app.modules.sales.models import (
    Cart, CartItem, Order, OrderItem, OrderStatusHistory, OrderStatus,
    Payment, PaymentStatus, Shipment, ShipmentStatus
)
from app.modules.sales.schemas import (
    CartItemAdd, CartResponse,
    OrderCreate, OrderStatusUpdate, OrderResponse, OrderDetailResponse,
    PaymentCreate, PaymentIPNCallbackRequest, PaymentRefundRequest, PaymentResponse, SepayWebhookPayload,
    ShipmentCreate, ShipmentResponse
)
from app.modules.sales.payment_service import VietQRService, MoMoService, VNPayService, CODService

router = APIRouter(prefix="/sales", tags=["Sales, Orders & Logistics Management"])

CANCELLED_STATUSES = {
    OrderStatus.cancelled_by_user,
    OrderStatus.cancelled_timeout,
    OrderStatus.failed_out_of_stock,
    OrderStatus.payment_failed
}

CONFIRMED_FULFILL_STATUSES = {
    OrderStatus.confirmed,
    OrderStatus.packed,
    OrderStatus.shipping,
    OrderStatus.paid
}

def _enrich_cart_response(cart: Cart, db: Session) -> Dict[str, Any]:
    items_enriched = []
    for item in cart.items:
        variant = db.query(ProductVariant).filter(ProductVariant.sku == item.sku).first()
        prod_name = None
        price = None
        img_url = None
        if variant:
            price = float(variant.price)
            img_url = variant.image_url
            prod = db.query(Product).filter(Product.id == variant.product_id).first()
            if prod:
                prod_name = prod.name
                if not img_url and prod.images:
                    img_url = prod.images[0].image_url
        items_enriched.append({
            "id": item.id,
            "sku": item.sku,
            "quantity": item.quantity,
            "product_name": prod_name or f"Sản phẩm {item.sku}",
            "price": price or 0.0,
            "image_url": img_url or "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80"
        })
    return {
        "id": cart.id,
        "user_id": cart.user_id,
        "items": items_enriched,
        "updated_at": cart.updated_at
    }

# --- CART ENDPOINTS ---

@router.get("/cart", response_model=CartResponse)
def get_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lấy giỏ hàng của User đang đăng nhập"""
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return _enrich_cart_response(cart, db)

_cart_idempotency_cache: Dict[str, Dict[str, Any]] = {}

@router.post("/cart/items", response_model=CartResponse)
def add_to_cart(
    item_in: CartItemAdd,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Thêm hoặc cập nhật số lượng sản phẩm trong giỏ hàng (Hỗ trợ Idempotency Key)"""
    key_to_use = item_in.idempotency_key or idempotency_key
    if key_to_use:
        cache_key = f"{current_user.id}:{key_to_use}"
        if cache_key in _cart_idempotency_cache:
            return _cart_idempotency_cache[cache_key]

    # 1. Tìm theo SKU Variant chuẩn
    variant = db.query(ProductVariant).filter(ProductVariant.sku == item_in.sku).first()
    target_sku = item_in.sku

    if not variant:
        # Fallback 1: Tìm theo case-insensitive SKU
        variant = db.query(ProductVariant).filter(ProductVariant.sku.ilike(item_in.sku)).first()
        if variant:
            target_sku = variant.sku
        else:
            # Fallback 2: Tìm Product theo slug hoặc tên sản phẩm để lấy variant đầu tiên
            slug_clean = item_in.sku.lower().replace(" ", "-")
            prod = db.query(Product).filter(or_(Product.slug.ilike(slug_clean), Product.name.ilike(f"%{item_in.sku}%"))).first()
            if prod and prod.variants:
                variant = prod.variants[0]
                target_sku = variant.sku

    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.flush()

    cart_item = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.sku == target_sku).first()
    if cart_item:
        cart_item.quantity += item_in.quantity
    else:
        cart_item = CartItem(cart_id=cart.id, sku=target_sku, quantity=item_in.quantity)
        db.add(cart_item)

    db.commit()
    db.refresh(cart)
    response_data = _enrich_cart_response(cart, db)

    if key_to_use:
        cache_key = f"{current_user.id}:{key_to_use}"
        _cart_idempotency_cache[cache_key] = response_data
        # Giới hạn kích thước cache đơn giản nếu vượt quá 2000 phần tử
        if len(_cart_idempotency_cache) > 2000:
            _cart_idempotency_cache.clear()

    return response_data

@router.put("/cart/items/{sku}", response_model=CartResponse)
def update_cart_item_quantity(
    sku: str,
    quantity: int = Query(..., ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cập nhật số lượng sản phẩm trong giỏ hàng (+/-), xóa nếu quantity <= 0"""
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if cart:
        cart_item = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.sku == sku).first()
        if cart_item:
            if quantity <= 0:
                db.delete(cart_item)
            else:
                cart_item.quantity = quantity
            db.commit()
            db.refresh(cart)
    return _enrich_cart_response(cart, db)

@router.delete("/cart/items/{sku}", response_model=CartResponse)
def remove_from_cart(
    sku: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Xóa sản phẩm khỏi giỏ hàng"""
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.sku == sku).delete()
        db.commit()
        db.refresh(cart)
    return _enrich_cart_response(cart, db)

# --- ORDER ENDPOINTS ---

@router.post("/orders", response_model=OrderDetailResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    background_tasks: BackgroundTasks,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tạo đơn hàng mới:
    1. Kiểm tra Idempotency Key (chống gửi trùng).
    2. Khóa dòng và Giữ chỗ tồn kho bằng Pessimistic Lock (`with_for_update()`).
    3. Ghi vết `Order`, `OrderItem` và `OrderStatusHistory`.
    4. Ghi `OutboxEvent` và phát sự kiện bất đồng bộ.
    """
    key_to_use = order_in.idempotency_key or idempotency_key
    if key_to_use:
        existing_order = db.query(Order).filter(Order.idempotency_key == key_to_use).first()
        if existing_order:
            return existing_order

    total_amount = 0
    order_items_data = []

    for item in order_in.items:
        variant = db.query(ProductVariant).filter(ProductVariant.sku == item.sku).first()
        if variant:
            product = db.query(Product).filter(Product.id == variant.product_id).first()
            product_name = product.name if product else (item.product_name or item.sku)
            item_price = float(variant.price)
        else:
            product_name = item.product_name or f"Sản phẩm {item.sku}"
            item_price = float(item.price) if item.price is not None else 1500000.0

        # Khóa dòng và Giữ chỗ tồn kho an toàn bằng Pessimistic Lock (SELECT FOR UPDATE)
        inv = db.query(Inventory).filter(Inventory.sku == item.sku).with_for_update().first()
        if inv:
            available = max(0, inv.quantity - inv.reserved_quantity)
            if available < item.quantity:
                raise HTTPException(status_code=400, detail=f"Sản phẩm SKU '{item.sku}' không đủ tồn kho khả dụng (Còn {available})")
            inv.reserved_quantity += item.quantity
            inv.version += 1

            movement = StockMovement(
                warehouse_id=inv.warehouse_id,
                sku=item.sku,
                movement_type=MovementType.reserve,
                quantity_change=item.quantity,
                reference_id=key_to_use or "ORDER_NEW"
            )
            db.add(movement)

        item_total = item_price * item.quantity
        total_amount += item_total
        order_items_data.append({
            "sku": item.sku,
            "product_name": product_name,
            "quantity": item.quantity,
            "price_at_order": item_price
        })

    new_order = Order(
        user_id=current_user.id,
        source="web",
        status=OrderStatus.pending_confirm,
        total_amount=total_amount,
        idempotency_key=key_to_use,
        shipping_address_id=order_in.shipping_address_id,
        note=order_in.note
    )
    db.add(new_order)
    db.flush()

    for oi in order_items_data:
        db_item = OrderItem(
            order_id=new_order.id,
            sku=oi["sku"],
            product_name=oi["product_name"],
            quantity=oi["quantity"],
            price_at_order=oi["price_at_order"]
        )
        db.add(db_item)

    history = OrderStatusHistory(
        order_id=new_order.id,
        status=OrderStatus.pending_confirm,
        changed_by=current_user.id,
        note="Đơn hàng được khởi tạo thành công"
    )
    db.add(history)

    # 4. Outbox Pattern: Ghi sự kiện bất đồng bộ
    outbox_event = record_outbox_event(db, "order_created", {
        "order_id": new_order.id,
        "user_id": current_user.id,
        "total_amount": float(total_amount),
        "items": order_items_data
    })

    db.commit()
    db.refresh(new_order)

    # Đưa tác vụ xử lý sự kiện bất đồng bộ vào BackgroundTasks
    background_tasks.add_task(process_outbox_event, db, outbox_event)

    return new_order

@router.get("/orders", response_model=List[OrderResponse])
def list_orders(
    status_filter: Optional[OrderStatus] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách đơn hàng của User đang đăng nhập (hoặc tất cả nếu là Admin)"""
    query = db.query(Order)
    if current_user.role.value == "customer":
        query = query.filter(Order.user_id == current_user.id)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    return query.order_by(Order.created_at.desc()).all()

@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
def get_order_detail(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Xem chi tiết đơn hàng (kèm sản phẩm & lịch sử trạng thái)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return order

@router.post("/orders/{order_id}/cancel", response_model=OrderDetailResponse)
def cancel_order(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Khách hàng tự hủy đơn hàng (Giải phóng giữ chỗ tồn kho)"""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    if order.status in CANCELLED_STATUSES or order.status == OrderStatus.delivered:
        raise HTTPException(status_code=400, detail=f"Không thể hủy đơn hàng đang ở trạng thái {order.status.value}")

    for item in order.items:
        inv = db.query(Inventory).filter(Inventory.sku == item.sku).first()
        if inv and inv.reserved_quantity >= item.quantity:
            inv.reserved_quantity -= item.quantity
            movement = StockMovement(
                warehouse_id=inv.warehouse_id,
                sku=item.sku,
                movement_type=MovementType.release,
                quantity_change=-item.quantity,
                reference_id=str(order.id)
            )
            db.add(movement)

    order.status = OrderStatus.cancelled_by_user
    history = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.cancelled_by_user,
        changed_by=current_user.id,
        note="Khách hàng hủy đơn hàng"
    )
    db.add(history)
    db.commit()
    db.refresh(order)
    return order

@router.patch("/orders/{order_id}/status", response_model=OrderDetailResponse)
def update_order_status(
    order_id: int,
    status_in: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cập nhật trạng thái đơn hàng (Duyệt, Đóng gói, Vận chuyển, Giao thành công, Hủy, Trả hàng)
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    old_status = order.status
    new_status = status_in.status

    if old_status != new_status:
        if new_status in CANCELLED_STATUSES and old_status not in CANCELLED_STATUSES:
            for item in order.items:
                inv = db.query(Inventory).filter(Inventory.sku == item.sku).first()
                if inv:
                    inv.reserved_quantity = max(0, inv.reserved_quantity - item.quantity)
                    movement = StockMovement(
                        warehouse_id=inv.warehouse_id,
                        sku=item.sku,
                        movement_type=MovementType.release,
                        quantity_change=-item.quantity,
                        reference_id=str(order.id)
                    )
                    db.add(movement)

        elif new_status in CONFIRMED_FULFILL_STATUSES and old_status == OrderStatus.pending_confirm:
            for item in order.items:
                inv = db.query(Inventory).filter(Inventory.sku == item.sku).first()
                if inv:
                    inv.quantity = max(0, inv.quantity - item.quantity)
                    inv.reserved_quantity = max(0, inv.reserved_quantity - item.quantity)
                    movement = StockMovement(
                        warehouse_id=inv.warehouse_id,
                        sku=item.sku,
                        movement_type=MovementType.export_order,
                        quantity_change=-item.quantity,
                        reference_id=str(order.id)
                    )
                    db.add(movement)

        elif new_status == OrderStatus.returned and old_status != OrderStatus.returned:
            for item in order.items:
                inv = db.query(Inventory).filter(Inventory.sku == item.sku).first()
                if inv:
                    inv.quantity += item.quantity
                    movement = StockMovement(
                        warehouse_id=inv.warehouse_id,
                        sku=item.sku,
                        movement_type=MovementType.import_stock,
                        quantity_change=item.quantity,
                        reference_id=f"RETURN_{order.id}"
                    )
                    db.add(movement)

        order.status = new_status
        history = OrderStatusHistory(
            order_id=order.id,
            status=new_status,
            changed_by=current_user.id,
            note=status_in.note or f"Chuyển trạng thái từ {old_status.value} sang {new_status.value}"
        )
        db.add(history)

    db.commit()
    db.refresh(order)
    return order

# --- PAYMENT & SHIPMENT ENDPOINTS ---

@router.get("/orders/{order_id}/payments", response_model=List[PaymentResponse])
def list_order_payments(order_id: int, db: Session = Depends(get_db)):
    """Xem danh sách các giao dịch thanh toán của một đơn hàng"""
    return db.query(Payment).filter(Payment.order_id == order_id).order_by(Payment.created_at.desc()).all()

@router.post("/orders/{order_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    order_id: int,
    payment_in: PaymentCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db)
):
    """Khởi tạo giao dịch thanh toán mới cho đơn hàng (COD, VietQR, MoMo, VNPay) với hỗ trợ Idempotency Key"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    key_to_use = payment_in.idempotency_key or idempotency_key
    provider = payment_in.provider.lower()

    if key_to_use:
        existing_payment = db.query(Payment).filter(Payment.idempotency_key == key_to_use).first()
        if existing_payment:
            pay_dict = {
                "id": existing_payment.id,
                "order_id": existing_payment.order_id,
                "provider": existing_payment.provider,
                "transaction_id": existing_payment.transaction_id,
                "amount": float(existing_payment.amount),
                "status": existing_payment.status,
                "paid_at": existing_payment.paid_at,
                "created_at": existing_payment.created_at,
                "qr_code_url": None,
                "payment_url": None,
                "instructions": None
            }
            if provider == "vietqr":
                vqr_info = VietQRService.generate_qr(amount=order.total_amount, order_id=order.id)
                pay_dict.update(vqr_info)
            elif provider == "momo":
                momo_info = MoMoService.generate_payment(amount=order.total_amount, order_id=order.id, transaction_id=existing_payment.transaction_id)
                pay_dict.update(momo_info)
            elif provider == "vnpay":
                vnp_info = VNPayService.generate_payment_url(amount=order.total_amount, order_id=order.id, transaction_id=existing_payment.transaction_id)
                pay_dict.update(vnp_info)
            elif provider == "cod":
                cod_info = CODService.generate_payment(amount=order.total_amount, order_id=order.id)
                pay_dict.update(cod_info)
            return pay_dict

    tx_id = payment_in.transaction_id or f"TX_{provider.upper()}_{order_id}_{int(datetime.utcnow().timestamp())}"

    new_payment = Payment(
        order_id=order.id,
        provider=provider,
        transaction_id=tx_id,
        idempotency_key=key_to_use,
        amount=payment_in.amount,
        status=PaymentStatus.pending
    )
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)

    # Sinh dữ liệu thanh toán động dựa trên Provider
    pay_dict = {
        "id": new_payment.id,
        "order_id": new_payment.order_id,
        "provider": new_payment.provider,
        "transaction_id": new_payment.transaction_id,
        "amount": float(new_payment.amount),
        "status": new_payment.status,
        "paid_at": new_payment.paid_at,
        "created_at": new_payment.created_at,
        "qr_code_url": None,
        "payment_url": None,
        "instructions": None
    }

    if provider == "vietqr":
        vqr_info = VietQRService.generate_qr(amount=order.total_amount, order_id=order.id)
        pay_dict.update({
            "qr_code_url": vqr_info["qr_code_url"],
            "payment_url": vqr_info["payment_url"],
            "instructions": vqr_info["instructions"]
        })
    elif provider == "momo":
        momo_info = MoMoService.generate_payment(amount=order.total_amount, order_id=order.id, transaction_id=tx_id)
        pay_dict.update({
            "qr_code_url": momo_info["qr_code_url"],
            "payment_url": momo_info["payment_url"],
            "instructions": momo_info["instructions"]
        })
    elif provider == "vnpay":
        vnp_info = VNPayService.generate_payment_url(amount=order.total_amount, order_id=order.id, transaction_id=tx_id)
        pay_dict.update({
            "qr_code_url": vnp_info["qr_code_url"],
            "payment_url": vnp_info["payment_url"],
            "instructions": vnp_info["instructions"]
        })
    elif provider == "cod":
        cod_info = CODService.generate_payment(amount=order.total_amount, order_id=order.id)
        pay_dict.update({
            "instructions": cod_info["instructions"]
        })

    return pay_dict

@router.post("/payments/ipn-callback", response_model=PaymentResponse)
def handle_payment_ipn_callback(
    ipn_in: PaymentIPNCallbackRequest,
    db: Session = Depends(get_db)
):
    """
    Tiếp nhận Webhook / IPN Callback từ cổng thanh toán (VNPay / MoMo / ZaloPay / COD).
    - IPN báo `success`: Cập nhật `PaymentStatus = success`, `paid_at = now()`, tự động chuyển `Order.status = paid`.
    - IPN báo `failed`: Cập nhật `PaymentStatus = failed`, tự động chuyển `Order.status = payment_failed` và giải phóng kho.
    """
    payment = db.query(Payment).filter(Payment.id == ipn_in.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin giao dịch thanh toán")

    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng liên quan")

    payment.status = ipn_in.status
    if ipn_in.transaction_id:
        payment.transaction_id = ipn_in.transaction_id

    if ipn_in.status == PaymentStatus.success:
        payment.paid_at = datetime.utcnow()
        if order.status == OrderStatus.pending_confirm:
            order.status = OrderStatus.paid
            # Khấu trừ kho thực tế (Savepoint an toàn)
            try:
                with db.begin_nested():
                    for item in order.items:
                        inv = db.query(Inventory).filter(Inventory.sku == item.sku).first()
                        if inv:
                            inv.quantity = max(0, inv.quantity - item.quantity)
                            inv.reserved_quantity = max(0, inv.reserved_quantity - item.quantity)
                            movement = StockMovement(
                                warehouse_id=inv.warehouse_id,
                                sku=item.sku,
                                movement_type=MovementType.export_order,
                                quantity_change=-item.quantity,
                                reference_id=str(order.id)
                            )
                            db.add(movement)
            except Exception:
                pass

            history = OrderStatusHistory(
                order_id=order.id,
                status=OrderStatus.paid,
                note=f"Thanh toán thành công qua cổng {payment.provider}. Mã GD: {payment.transaction_id}"
            )
            db.add(history)

    elif ipn_in.status == PaymentStatus.failed:
        order.status = OrderStatus.payment_failed
        # Giải phóng giữ chỗ kho (Savepoint an toàn)
        try:
            with db.begin_nested():
                for item in order.items:
                    inv = db.query(Inventory).filter(Inventory.sku == item.sku).first()
                    if inv:
                        inv.reserved_quantity = max(0, inv.reserved_quantity - item.quantity)
                        movement = StockMovement(
                            warehouse_id=inv.warehouse_id,
                            sku=item.sku,
                            movement_type=MovementType.release,
                            quantity_change=-item.quantity,
                            reference_id=str(order.id)
                        )
                        db.add(movement)
        except Exception:
            pass

        history = OrderStatusHistory(
            order_id=order.id,
            status=OrderStatus.payment_failed,
            note=f"Thanh toán thất bại qua cổng {payment.provider}"
        )
        db.add(history)

    db.commit()
    db.refresh(payment)
    return payment

@router.post("/payments/sepay-webhook")
def handle_sepay_webhook(
    payload: SepayWebhookPayload,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Endpoint tiếp nhận thông báo biến động số dư từ SePay.vn.
    Tự động khớp đơn hàng qua mã DH{order_id} và đổi trạng thái sang PAID.
    """
    import re
    order_id = None
    match = re.search(r'DH(\d+)', payload.content, re.IGNORECASE)
    if match:
        order_id = int(match.group(1))
    elif payload.code and payload.code.upper().startswith("DH"):
        try:
            order_id = int(payload.code.upper().replace("DH", ""))
        except ValueError:
            pass

    if not order_id:
        return {"status": "ignored", "reason": "Không tìm thấy mã đơn hàng trong nội dung chuyển khoản"}

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"status": "error", "reason": f"Không tìm thấy đơn hàng #{order_id}"}

    if payload.transferAmount < float(order.total_amount):
        return {"status": "ignored", "reason": f"Số tiền chuyển ({payload.transferAmount:,} VNĐ) nhỏ hơn tổng đơn hàng #{order_id} ({float(order.total_amount):,} VNĐ)"}

    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if not payment:
        payment = Payment(
            order_id=order.id,
            provider="vietqr",
            transaction_id=payload.referenceCode or f"SEPAY_{payload.id}",
            amount=payload.transferAmount,
            status=PaymentStatus.success,
            paid_at=datetime.utcnow()
        )
        db.add(payment)
    else:
        payment.status = PaymentStatus.success
        payment.transaction_id = payload.referenceCode or f"SEPAY_{payload.id}"
        payment.paid_at = datetime.utcnow()

    if order.status == OrderStatus.pending_confirm:
        order.status = OrderStatus.paid
        try:
            with db.begin_nested():
                for item in order.items:
                    inv = db.query(Inventory).filter(Inventory.sku == item.sku).first()
                    if inv:
                        inv.quantity = max(0, inv.quantity - item.quantity)
                        inv.reserved_quantity = max(0, inv.reserved_quantity - item.quantity)
                        movement = StockMovement(
                            warehouse_id=inv.warehouse_id,
                            sku=item.sku,
                            movement_type=MovementType.export_order,
                            quantity_change=-item.quantity,
                            reference_id=str(order.id)
                        )
                        db.add(movement)
        except Exception:
            pass

        history = OrderStatusHistory(
            order_id=order.id,
            status=OrderStatus.paid,
            note=f"Thanh toán thành công qua SePay Webhook. Mã GD: {payment.transaction_id}"
        )
        db.add(history)

    db.commit()
    return {"status": "success", "message": f"Đã tự động cập nhật đơn hàng #{order_id} thành PAID!"}

@router.get("/payments/{payment_id}", response_model=PaymentResponse)
def get_payment_status(
    payment_id: int,
    db: Session = Depends(get_db)
):
    """Lấy trạng thái giao dịch thanh toán real-time"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch thanh toán")
    return payment

@router.post("/payments/{payment_id}/refund", response_model=PaymentResponse)
def refund_payment(
    payment_id: int,
    refund_in: PaymentRefundRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Hoàn tiền cho giao dịch thanh toán (Cập nhật PaymentStatus = refunded)"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch thanh toán")

    if payment.status != PaymentStatus.success:
        raise HTTPException(status_code=400, detail="Chỉ có thể hoàn tiền cho giao dịch đã thanh toán thành công")

    payment.status = PaymentStatus.refunded
    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if order:
        history = OrderStatusHistory(
            order_id=order.id,
            status=order.status,
            changed_by=current_user.id,
            note=f"Đã hoàn tiền thành công ({refund_in.reason})"
        )
        db.add(history)

    db.commit()
    db.refresh(payment)
    return payment

# --- SHIPMENT ENDPOINTS ---

@router.post("/orders/{order_id}/shipments", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
def create_shipment(
    order_id: int,
    shipment_in: ShipmentCreate,
    db: Session = Depends(get_db)
):
    """Khởi tạo vận đơn giao hàng"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    new_shipment = Shipment(
        order_id=order.id,
        provider=shipment_in.provider,
        tracking_code=shipment_in.tracking_code,
        shipping_fee=shipment_in.shipping_fee,
        status=ShipmentStatus.pending
    )
    db.add(new_shipment)
    db.commit()
    db.refresh(new_shipment)
    return new_shipment
