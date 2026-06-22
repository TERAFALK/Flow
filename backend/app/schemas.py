from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr
from .models import UserRole, WorkOrderStatus, TimeEntryType, StockTransactionType


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ── Users ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole = UserRole.mekaniker


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


# ── Customers ─────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    org_number: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(CustomerCreate):
    name: Optional[str] = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    org_number: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    city: Optional[str]
    postal_code: Optional[str]
    notes: Optional[str]
    created_at: datetime


# ── Vehicles ──────────────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    customer_id: int
    license_plate: str
    vin: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    engine: Optional[str] = None
    gearbox: Optional[str] = None
    odometer: Optional[int] = None
    notes: Optional[str] = None


class VehicleUpdate(BaseModel):
    customer_id: Optional[int] = None
    license_plate: Optional[str] = None
    vin: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    engine: Optional[str] = None
    gearbox: Optional[str] = None
    odometer: Optional[int] = None
    notes: Optional[str] = None


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    license_plate: str
    vin: Optional[str]
    make: Optional[str]
    model: Optional[str]
    year: Optional[int]
    engine: Optional[str]
    gearbox: Optional[str]
    odometer: Optional[int]
    notes: Optional[str]
    created_at: datetime
    customer: Optional[CustomerOut] = None


# ── Articles ──────────────────────────────────────────────────────────────────

class ArticleCreate(BaseModel):
    article_number: Optional[str] = None
    barcode: Optional[str] = None
    name: str
    description: Optional[str] = None
    unit: str = "st"
    price: Decimal = Decimal("0")
    stock_quantity: Decimal = Decimal("0")
    min_stock: Decimal = Decimal("0")
    location: Optional[str] = None


class ArticleUpdate(BaseModel):
    article_number: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[Decimal] = None
    stock_quantity: Optional[Decimal] = None
    min_stock: Optional[Decimal] = None
    location: Optional[str] = None


class ArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    article_number: Optional[str]
    barcode: Optional[str]
    name: str
    description: Optional[str]
    unit: str
    price: Decimal
    stock_quantity: Decimal
    min_stock: Decimal
    location: Optional[str]
    created_at: datetime


# ── Work Order Lines ──────────────────────────────────────────────────────────

class WorkOrderLineCreate(BaseModel):
    article_id: Optional[int] = None
    description: str
    quantity: Decimal = Decimal("1")
    unit: str = "st"
    unit_price: Decimal = Decimal("0")


class WorkOrderLineUpdate(BaseModel):
    description: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    unit_price: Optional[Decimal] = None


class WorkOrderLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_order_id: int
    article_id: Optional[int]
    description: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    created_at: datetime
    article: Optional[ArticleOut] = None


# ── Time Entries ──────────────────────────────────────────────────────────────

class TimeEntryCreate(BaseModel):
    work_order_id: int
    description: Optional[str] = None
    entry_type: TimeEntryType = TimeEntryType.övrigt


class TimeEntryStop(BaseModel):
    description: Optional[str] = None
    entry_type: Optional[TimeEntryType] = None


class TimeEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_order_id: int
    user_id: int
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: Optional[int]
    description: Optional[str]
    entry_type: TimeEntryType
    created_at: datetime
    user: Optional[UserOut] = None


# ── Work Orders ───────────────────────────────────────────────────────────────

class WorkOrderCreate(BaseModel):
    customer_id: int
    vehicle_id: Optional[int] = None
    description: str
    assigned_to: Optional[int] = None
    scheduled_date: Optional[datetime] = None
    internal_notes: Optional[str] = None


class WorkOrderUpdate(BaseModel):
    customer_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    description: Optional[str] = None
    status: Optional[WorkOrderStatus] = None
    assigned_to: Optional[int] = None
    scheduled_date: Optional[datetime] = None
    internal_notes: Optional[str] = None


class WorkOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    customer_id: int
    vehicle_id: Optional[int]
    description: str
    status: WorkOrderStatus
    assigned_to: Optional[int]
    scheduled_date: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    internal_notes: Optional[str]
    created_at: datetime
    customer: Optional[CustomerOut] = None
    vehicle: Optional[VehicleOut] = None
    assigned_to_user: Optional[UserOut] = None
    lines: List[WorkOrderLineOut] = []
    time_entries: List[TimeEntryOut] = []


class WorkOrderListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    customer_id: int
    vehicle_id: Optional[int]
    description: str
    status: WorkOrderStatus
    assigned_to: Optional[int]
    scheduled_date: Optional[datetime]
    created_at: datetime
    customer: Optional[CustomerOut] = None
    vehicle: Optional[VehicleOut] = None
    assigned_to_user: Optional[UserOut] = None


# ── Scanner ───────────────────────────────────────────────────────────────────

class ScanResult(BaseModel):
    article: ArticleOut
    line: WorkOrderLineOut
    stock_warning: bool
    stock_quantity: Decimal


# ── Stock Transactions ────────────────────────────────────────────────────────

class StockTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    article_id: int
    quantity: Decimal
    transaction_type: StockTransactionType
    work_order_id: Optional[int]
    notes: Optional[str]
    created_at: datetime


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_open: int
    by_status: dict
    scheduled_today: int
    active_timers: int
    recent_orders: List[WorkOrderListItem]


Token.model_rebuild()
