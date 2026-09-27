import pytest
from app.modules.auth.models import User, RoleType
from app.modules.auth.service import get_password_hash, verify_password, create_access_token

def test_password_hashing():
    password = "SecretPassword123!"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_creation():
    data = {"sub": "testuser@example.com", "role": "admin"}
    token = create_access_token(data)
    assert isinstance(token, str)
    assert len(token) > 20

def test_register_and_login_user(client):
    # 1. Đăng ký tài khoản
    reg_payload = {
        "email": "user1@example.com",
        "password": "Password123!",
        "full_name": "Nguyễn Văn A",
        "phone": "0987654321"
    }
    response = client.post("/api/v1/auth/register", json=reg_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "user1@example.com"
    assert data["full_name"] == "Nguyễn Văn A"

    # 2. Đăng nhập lấy JWT Access Token
    login_payload = {
        "username": "user1@example.com",
        "password": "Password123!"
    }
    response = client.post("/api/v1/auth/login", data=login_payload)
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # 3. Gọi API Lấy thông tin cá nhân me
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "user1@example.com"
