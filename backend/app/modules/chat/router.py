from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import decode_token
from app.modules.auth.models import User
from app.modules.chat.models import ChatMessage
from app.modules.chat.schemas import ChatMessageCreate, ChatMessageResponse, ChatSessionSummary

router = APIRouter(prefix="/chat", tags=["Live Chat & Messaging"])

def get_optional_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[User]:
    """Dependency lấy user optional nếu có JWT Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == int(user_id)).first()

@router.post("/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    msg_in: ChatMessageCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Gửi tin nhắn mới (từ Storefront hoặc Admin CRM)"""
    user_id = current_user.id if current_user else None
    sender_name = msg_in.sender_name
    if current_user and msg_in.sender_type == "customer":
        sender_name = current_user.full_name or msg_in.sender_name

    new_msg = ChatMessage(
        session_id=msg_in.session_id,
        user_id=user_id,
        sender_type=msg_in.sender_type,
        sender_name=sender_name,
        message=msg_in.message,
        is_read=False if msg_in.sender_type == "customer" else True
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

@router.get("/messages/{session_id}", response_model=List[ChatMessageResponse])
def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Lấy danh sách tin nhắn theo session_id"""
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

@router.get("/sessions", response_model=List[ChatSessionSummary])
def list_chat_sessions(
    db: Session = Depends(get_db)
):
    """Lấy danh sách tất cả các phiên chat cho Admin Panel (CRM)"""
    # Tìm tất cả session_id duy nhất
    session_ids = [row[0] for row in db.query(ChatMessage.session_id).distinct().all()]

    result = []
    for s_id in session_ids:
        last_msg = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == s_id)
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        if not last_msg:
            continue

        unread_count = (
            db.query(func.count(ChatMessage.id))
            .filter(
                ChatMessage.session_id == s_id,
                ChatMessage.sender_type == "customer",
                ChatMessage.is_read == False
            )
            .scalar() or 0
        )

        # Lấy customer_name từ tin nhắn đầu tiên hoặc gần nhất của customer
        cust_msg = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == s_id, ChatMessage.sender_type == "customer")
            .order_by(ChatMessage.created_at.asc())
            .first()
        )
        u_id = cust_msg.user_id if cust_msg and cust_msg.user_id else last_msg.user_id
        
        cust_email = None
        cust_phone = None
        is_reg = False

        if u_id:
            user_obj = db.query(User).filter(User.id == u_id).first()
            if user_obj:
                cust_name = user_obj.full_name or cust_name
                cust_email = user_obj.email
                cust_phone = user_obj.phone
                is_reg = True

        if not is_reg and (not cust_name or cust_name == "Khách hàng" or cust_name == "chào"):
            cust_name = f"Khách vãng lai ({s_id[-6:]})"

        result.append(ChatSessionSummary(
            session_id=s_id,
            last_message=last_msg.message,
            last_message_at=last_msg.created_at,
            unread_count=unread_count,
            customer_name=cust_name,
            customer_email=cust_email,
            customer_phone=cust_phone,
            is_registered=is_reg,
            user_id=u_id
        ))

    # Sắp xếp cuộc trò chuyện mới nhất lên đầu
    result.sort(key=lambda x: x.last_message_at, reverse=True)
    return result

@router.put("/sessions/{session_id}/read")
def mark_session_read(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Đánh dấu tất cả tin nhắn từ khách hàng trong phiên chat là đã đọc"""
    db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.sender_type == "customer",
        ChatMessage.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "success", "session_id": session_id}

@router.delete("/cleanup")
def cleanup_old_messages(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Tự động dọn dẹp các tin nhắn chat cũ hơn `days` ngày (mặc định 30 ngày)"""
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    deleted_count = db.query(ChatMessage).filter(ChatMessage.created_at < cutoff).delete(synchronize_session=False)
    db.commit()
    return {
        "status": "success",
        "message": f"Đã xóa {deleted_count} tin nhắn cũ hơn {days} ngày",
        "deleted_count": deleted_count,
        "cutoff_date": cutoff.isoformat()
    }

