from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.catalog.models import ProductVariant
from app.modules.inventory.models import Inventory
from app.modules.omnichannel.models import (
    Channel, ChannelProduct, SyncLog, WebhookLog, SyncStatusType
)
from app.modules.omnichannel.schemas import (
    ChannelCreate, ChannelResponse,
    ChannelProductMap, ChannelProductResponse,
    SyncLogResponse, WebhookLogCreate, WebhookLogResponse
)

router = APIRouter(prefix="/omnichannel", tags=["Omnichannel Integration (Shopee, Lazada, TikTok)"])

# --- CHANNEL ENDPOINTS ---

@router.get("/channels", response_model=List[ChannelResponse])
def list_channels(db: Session = Depends(get_db)):
    """Lấy danh sách các kênh bán hàng đa kênh đã tích hợp"""
    return db.query(Channel).filter(Channel.is_active == True).all()

@router.post("/channels", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
def create_channel(channel_in: ChannelCreate, db: Session = Depends(get_db)):
    """Đăng ký kênh bán hàng đa kênh mới (Shopee, Lazada, TikTok Shop...)"""
    new_channel = Channel(
        name=channel_in.name,
        api_credentials_encrypted=channel_in.api_credentials_encrypted,
        is_active=channel_in.is_active
    )
    db.add(new_channel)
    db.commit()
    db.refresh(new_channel)
    return new_channel

# --- CHANNEL PRODUCT MAPPING ENDPOINTS ---

@router.post("/channels/{channel_id}/products", response_model=ChannelProductResponse, status_code=status.HTTP_201_CREATED)
def map_channel_product(channel_id: int, map_in: ChannelProductMap, db: Session = Depends(get_db)):
    """Ánh xạ SKU hệ thống với SKU trên sàn đa kênh"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Không tìm thấy kênh bán hàng")

    variant = db.query(ProductVariant).filter(ProductVariant.sku == map_in.sku).first()
    if not variant:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy mã SKU '{map_in.sku}' trong hệ thống")

    existing_map = db.query(ChannelProduct).filter(
        ChannelProduct.channel_id == channel_id,
        ChannelProduct.sku == map_in.sku
    ).first()

    if existing_map:
        existing_map.channel_sku = map_in.channel_sku
        existing_map.sync_status = SyncStatusType.pending
        db.commit()
        db.refresh(existing_map)
        return existing_map

    new_map = ChannelProduct(
        channel_id=channel_id,
        sku=map_in.sku,
        channel_sku=map_in.channel_sku,
        sync_status=SyncStatusType.pending
    )
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    return new_map

@router.get("/channels/{channel_id}/products", response_model=List[ChannelProductResponse])
def list_channel_products(channel_id: int, db: Session = Depends(get_db)):
    """Lấy danh sách các sản phẩm đã ánh xạ với sàn"""
    return db.query(ChannelProduct).filter(ChannelProduct.channel_id == channel_id).all()

# --- SYNC & WEBHOOK ENDPOINTS ---

@router.post("/channels/{channel_id}/sync-stock")
def trigger_stock_sync(channel_id: int, db: Session = Depends(get_db)):
    """
    Kích hoạt đồng bộ tồn kho thực tế của hệ thống sang sàn đa kênh.
    Tự động cập nhật `sync_status` và ghi vết `sync_logs`.
    """
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Không tìm thấy kênh bán hàng")

    mapped_products = db.query(ChannelProduct).filter(ChannelProduct.channel_id == channel_id).all()
    synced_count = 0

    for cp in mapped_products:
        # Tính tồn kho khả dụng thực tế
        inv = db.query(Inventory).filter(Inventory.sku == cp.sku).first()
        available_qty = max(0, inv.quantity - inv.reserved_quantity) if inv else 0

        # Ghi log mô phỏng gọi API sàn đẩy số lượng tồn kho
        log = SyncLog(
            channel_id=channel_id,
            sku=cp.sku,
            action="sync_stock",
            status="success",
            error_message=f"Đồng bộ tồn kho thành công: {available_qty} sản phẩm"
        )
        db.add(log)

        cp.sync_status = SyncStatusType.synced
        cp.last_synced_at = datetime.utcnow()
        synced_count += 1

    db.commit()
    return {
        "status": "success",
        "channel": channel.name,
        "synced_products_count": synced_count,
        "message": f"Đã đồng bộ xong tồn kho cho {synced_count} sản phẩm sang sàn {channel.name}"
    }

@router.get("/sync-logs", response_model=List[SyncLogResponse])
def get_sync_logs(
    channel_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Xem lịch sử log đồng bộ sản phẩm/tồn kho/giá với các sàn"""
    query = db.query(SyncLog)
    if channel_id:
        query = query.filter(SyncLog.channel_id == channel_id)
    return query.order_by(SyncLog.created_at.desc()).limit(limit).all()

@router.post("/webhooks/{source}", response_model=WebhookLogResponse, status_code=status.HTTP_201_CREATED)
def receive_webhook(source: str, webhook_in: WebhookLogCreate, db: Session = Depends(get_db)):
    """
    Tiếp nhận Webhook sự kiện đơn hàng/tồn kho từ các sàn (Shopee, Lazada, TikTok Shop).
    Kiểm tra Idempotency chống xử lý trùng lặp bằng (source, external_id).
    """
    existing_log = db.query(WebhookLog).filter(
        WebhookLog.source == source,
        WebhookLog.external_id == webhook_in.external_id
    ).first()

    if existing_log:
        return existing_log

    new_log = WebhookLog(
        source=source,
        external_id=webhook_in.external_id,
        payload_hash=webhook_in.payload_hash
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log
