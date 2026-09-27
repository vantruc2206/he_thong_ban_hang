from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.modules.auth.models import User, Address, RefreshToken, UserRole
from app.modules.auth.schemas import (
    UserRegister, UserLogin, TokenResponse, RefreshTokenRequest,
    UserResponse, AddressCreate, AddressResponse, SocialLoginRequest, UserUpdate
)

router = APIRouter(prefix="/auth", tags=["Authentication & User Management"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency lấy thông tin User hiện tại từ JWT Access Token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise credentials_exception
    return user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Đăng ký tài khoản mới"""
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được sử dụng trong hệ thống"
        )
    
    if user_in.phone:
        existing_phone = db.query(User).filter(User.phone == user_in.phone).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số điện thoại này đã được sử dụng"
            )

    new_user = User(
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        role=UserRole.customer
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Đăng nhập bằng Email & Mật khẩu để nhận JWT Access Token & Refresh Token"""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản đã bị vô hiệu hóa"
        )

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    # Lưu Refresh Token vào Database
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(db_refresh_token)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token_req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Cấp Access Token mới từ Refresh Token hợp lệ"""
    payload = decode_token(token_req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh Token không hợp lệ")

    user_id = payload.get("sub")
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == token_req.refresh_token,
        RefreshToken.revoked == False
    ).first()

    if not db_token:
        raise HTTPException(status_code=401, detail="Refresh Token đã bị thu hồi hoặc không tồn tại")

    new_access_token = create_access_token(subject=user_id)
    return {
        "access_token": new_access_token,
        "refresh_token": token_req.refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Lấy thông tin tài khoản đang đăng nhập"""
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cập nhật thông tin tài khoản (họ tên, số điện thoại)"""
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.phone is not None:
        current_user.phone = user_in.phone
    if user_in.avatar_url is not None:
        current_user.avatar_url = user_in.avatar_url
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/social-login", response_model=TokenResponse)
def social_login(social_in: SocialLoginRequest, db: Session = Depends(get_db)):
    """Upsert user từ Google / Facebook OAuth vào iam.users, trả về JWT token"""
    # Tìm user theo email
    user = db.query(User).filter(User.email == social_in.email).first()

    if not user:
        # Tạo mới - dùng password_hash ngẫu nhiên (user không có password vì dùng OAuth)
        import secrets
        random_pass = f"OAuthPass_{secrets.token_hex(16)}"
        user = User(
            email=social_in.email,
            full_name=social_in.full_name,
            password_hash=hash_password(random_pass),
            avatar_url=social_in.avatar_url,
            role=UserRole.customer,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Cập nhật thông tin nếu có thay đổi
        if social_in.avatar_url and not user.avatar_url:
            user.avatar_url = social_in.avatar_url
        if social_in.full_name and user.full_name != social_in.full_name:
            user.full_name = social_in.full_name
        db.commit()

    access_token = create_access_token(subject=user.id)
    refresh_token_val = create_refresh_token(subject=user.id)

    db_refresh = RefreshToken(
        user_id=user.id,
        token=refresh_token_val,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(db_refresh)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_val,
        "token_type": "bearer"
    }

@router.post("/addresses", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def create_address(
    address_in: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Thêm hoặc cập nhật địa chỉ giao hàng (iam.addresses)"""
    if address_in.is_default:
        db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})

    # Tìm xem user đã có địa chỉ nào chưa
    existing_addr = db.query(Address).filter(Address.user_id == current_user.id).first()
    if existing_addr:
        existing_addr.receiver_name = address_in.receiver_name
        existing_addr.phone = address_in.phone
        existing_addr.province = address_in.province
        existing_addr.district = address_in.district
        existing_addr.ward = address_in.ward
        existing_addr.detail = address_in.detail
        existing_addr.is_default = address_in.is_default
        db.commit()
        db.refresh(existing_addr)
        return existing_addr
    else:
        new_address = Address(
            user_id=current_user.id,
            receiver_name=address_in.receiver_name,
            phone=address_in.phone,
            province=address_in.province,
            district=address_in.district,
            ward=address_in.ward,
            detail=address_in.detail,
            is_default=address_in.is_default
        )
        db.add(new_address)
        db.commit()
        db.refresh(new_address)
        return new_address

@router.get("/addresses", response_model=list[AddressResponse])
def list_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách địa chỉ giao hàng của User hiện tại"""
    return db.query(Address).filter(Address.user_id == current_user.id).all()
