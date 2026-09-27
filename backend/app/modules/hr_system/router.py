from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_user
from app.modules.hr_system.models import (
    Employee, AttendanceLog, EmployeePerformance, Notification, AuditLog, SystemSetting
)
from app.modules.hr_system.schemas import (
    EmployeeCreate, EmployeeResponse, AttendanceLogResponse,
    NotificationResponse, AuditLogResponse,
    SystemSettingCreate, SystemSettingResponse
)

router = APIRouter(prefix="/hr-system", tags=["HR & System Administration"])

# --- HR ENDPOINTS ---

@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả nhân viên trong hệ thống"""
    return db.query(Employee).all()

@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(emp_in: EmployeeCreate, db: Session = Depends(get_db)):
    """Tạo hồ sơ nhân viên mới"""
    existing_code = db.query(Employee).filter(Employee.employee_code == emp_in.employee_code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Mã nhân viên này đã tồn tại")
    
    new_emp = Employee(
        user_id=emp_in.user_id,
        employee_code=emp_in.employee_code,
        department=emp_in.department,
        position=emp_in.position,
        warehouse_id=emp_in.warehouse_id,
        id_card_number=emp_in.id_card_number,
        hire_date=emp_in.hire_date,
        salary_base=emp_in.salary_base,
        status=emp_in.status
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    return new_emp

@router.post("/employees/{employee_id}/check-in", response_model=AttendanceLogResponse)
def check_in(employee_id: int, db: Session = Depends(get_db)):
    """Thực hiện chấm công Vào làm cho nhân viên"""
    today = date.today()
    log = db.query(AttendanceLog).filter(
        AttendanceLog.employee_id == employee_id,
        AttendanceLog.work_date == today
    ).first()

    if not log:
        log = AttendanceLog(
            employee_id=employee_id,
            check_in=datetime.utcnow(),
            work_date=today
        )
        db.add(log)
    else:
        log.check_in = datetime.utcnow()

    db.commit()
    db.refresh(log)
    return log

@router.post("/employees/{employee_id}/check-out", response_model=AttendanceLogResponse)
def check_out(employee_id: int, db: Session = Depends(get_db)):
    """Thực hiện chấm công Ra về cho nhân viên"""
    today = date.today()
    log = db.query(AttendanceLog).filter(
        AttendanceLog.employee_id == employee_id,
        AttendanceLog.work_date == today
    ).first()

    if not log:
        raise HTTPException(status_code=400, detail="Nhân viên chưa thực hiện Check-in ngày hôm nay")

    log.check_out = datetime.utcnow()
    db.commit()
    db.refresh(log)
    return log

# --- SYSTEM ENDPOINTS ---

@router.get("/notifications", response_model=List[NotificationResponse])
def get_user_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lấy danh sách thông báo của người dùng đang đăng nhập"""
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()

@router.patch("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(notification_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Đánh dấu thông báo là đã đọc"""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Lấy nhật ký kiểm toán hành động hệ thống (Audit Logs)"""
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()

@router.get("/settings", response_model=List[SystemSettingResponse])
def get_system_settings(db: Session = Depends(get_db)):
    """Lấy toàn bộ cài đặt cấu hình hệ thống chung"""
    return db.query(SystemSetting).all()

@router.post("/settings", response_model=SystemSettingResponse)
def update_system_setting(setting_in: SystemSettingCreate, db: Session = Depends(get_db)):
    """Thêm hoặc cập nhật một cấu hình hệ thống"""
    setting = db.query(SystemSetting).filter(SystemSetting.key == setting_in.key).first()
    if not setting:
        setting = SystemSetting(key=setting_in.key, value=setting_in.value)
        db.add(setting)
    else:
        setting.value = setting_in.value

    db.commit()
    db.refresh(setting)
    return setting
