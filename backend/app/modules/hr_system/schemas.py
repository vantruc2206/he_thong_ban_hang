from datetime import datetime, date
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from app.modules.hr_system.models import EmploymentStatus

# --- HR SCHEMAS ---
class EmployeeCreate(BaseModel):
    user_id: int
    employee_code: str = Field(..., min_length=2, max_length=50, example="EMP001")
    department: Optional[str] = None
    position: Optional[str] = None
    warehouse_id: Optional[int] = None
    id_card_number: Optional[str] = None
    hire_date: date
    salary_base: Optional[float] = None
    status: EmploymentStatus = EmploymentStatus.active

class EmployeeResponse(BaseModel):
    id: int
    user_id: int
    employee_code: str
    department: Optional[str] = None
    position: Optional[str] = None
    warehouse_id: Optional[int] = None
    hire_date: date
    salary_base: Optional[float] = None
    status: EmploymentStatus
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceLogResponse(BaseModel):
    id: int
    employee_id: int
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    work_date: date

    class Config:
        from_attributes = True

class EmployeePerformanceResponse(BaseModel):
    id: int
    employee_id: int
    metric_date: date
    orders_packed: int
    notes: Optional[str] = None

    class Config:
        from_attributes = True

# --- SYSTEM SCHEMAS ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SystemSettingCreate(BaseModel):
    key: str = Field(..., min_length=2, max_length=100)
    value: Dict[str, Any]

class SystemSettingResponse(BaseModel):
    key: str
    value: Dict[str, Any]
    updated_at: datetime

    class Config:
        from_attributes = True
