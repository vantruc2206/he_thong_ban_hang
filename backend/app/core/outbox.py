from datetime import datetime
import logging
from sqlalchemy.orm import Session
from app.modules.sales.models import OutboxEvent, OutboxEventStatus
from app.modules.hr_system.models import Notification, AuditLog

logger = logging.getLogger("outbox")

def record_outbox_event(db: Session, event_type: str, payload: dict) -> OutboxEvent:
    """
    Ghi nhận một Outbox Event vào cơ sở dữ liệu cùng transaction với nghiệp vụ chính.
    """
    event = OutboxEvent(
        event_type=event_type,
        payload=payload,
        status=OutboxEventStatus.pending
    )
    db.add(event)
    return event

def process_outbox_event(db: Session, event: OutboxEvent):
    """
    Xử lý một Outbox Event bất đồng bộ: Tạo Notification, Audit Log, hoặc Trigger Sync.
    """
    try:
        if event.event_type == "order_created":
            user_id = event.payload.get("user_id")
            order_id = event.payload.get("order_id")
            total_amount = event.payload.get("total_amount")

            # 1. Gửi thông báo cho khách hàng
            if user_id:
                notif = Notification(
                    user_id=user_id,
                    type="order_status",
                    title="Đặt hàng thành công",
                    content=f"Đơn hàng #{order_id} trị giá {total_amount:,} VNĐ đã được khởi tạo thành công."
                )
                db.add(notif)

            # 2. Ghi nhật ký kiểm toán Audit Log
            audit = AuditLog(
                user_id=user_id,
                action="CREATE_ORDER",
                entity_type="Order",
                entity_id=order_id,
                details=event.payload
            )
            db.add(audit)

        event.status = OutboxEventStatus.processed
        event.processed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        event.status = OutboxEventStatus.failed
        event.error_message = str(e)
        db.add(event)
        db.commit()
        logger.error(f"Error processing outbox event {event.id}: {e}")
