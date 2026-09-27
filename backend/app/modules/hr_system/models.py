import enum
from sqlalchemy import Column, BigInteger, String, Numeric, Boolean, DateTime, Enum, ForeignKey, Text, Integer, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

# --- HR ENUMS & MODELS ---

class EmploymentStatus(str, enum.Enum):
    active = "active"
    on_leave = "on_leave"
    terminated = "terminated"

class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = {"schema": "hr"}

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("iam.users.id"), unique=True, nullable=False, index=True)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    department = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)
    warehouse_id = Column(BigInteger, ForeignKey("inventory.warehouses.id"), nullable=True, index=True)
    id_card_number = Column(String(50), nullable=True)
    hire_date = Column(Date, nullable=False)
    termination_date = Column(Date, nullable=True)
    salary_base = Column(Numeric(14, 2), nullable=True)
    status = Column(Enum(EmploymentStatus, name="employment_status", schema="hr"), nullable=False, default=EmploymentStatus.active)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    attendance_logs = relationship("AttendanceLog", back_populates="employee", cascade="all, delete-orphan")
    performance_records = relationship("EmployeePerformance", back_populates="employee", cascade="all, delete-orphan")

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    __table_args__ = {"schema": "hr"}

    id = Column(BigInteger, primary_key=True, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr.employees.id", ondelete="CASCADE"), nullable=False, index=True)
    check_in = Column(DateTime(timezone=True), nullable=True)
    check_out = Column(DateTime(timezone=True), nullable=True)
    work_date = Column(Date, nullable=False)

    employee = relationship("Employee", back_populates="attendance_logs")

class EmployeePerformance(Base):
    __tablename__ = "employee_performance"
    __table_args__ = {"schema": "hr"}

    id = Column(BigInteger, primary_key=True, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr.employees.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_date = Column(Date, nullable=False)
    orders_packed = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)

    employee = relationship("Employee", back_populates="performance_records")

# --- SYSTEM MODELS ---

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "system"}

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("iam.users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=True)  # e.g., "order_status", "system_alert"
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "system"}

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("iam.users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(BigInteger, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class SystemSetting(Base):
    __tablename__ = "settings"
    __table_args__ = {"schema": "system"}

    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
