from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey,
    Numeric, Text, Boolean, Enum
)
from sqlalchemy.orm import relationship
from .database import Base


class UserRole(str, PyEnum):
    admin = "admin"
    chef = "chef"
    mekaniker = "mekaniker"
    lager = "lager"


class WorkOrderStatus(str, PyEnum):
    ny = "ny"
    planerad = "planerad"
    pagaende = "pagaende"
    klar = "klar"
    fakturerad = "fakturerad"


class TimeEntryType(str, PyEnum):
    felsökning = "felsökning"
    reparation = "reparation"
    provkörning = "provkörning"
    övrigt = "övrigt"


class StockTransactionType(str, PyEnum):
    in_ = "in"
    out = "out"
    justering = "justering"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.mekaniker, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    time_entries = relationship("TimeEntry", back_populates="user")
    assigned_orders = relationship(
        "WorkOrder", back_populates="assigned_to_user",
        foreign_keys="WorkOrder.assigned_to"
    )


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    org_number = Column(String)
    email = Column(String)
    phone = Column(String)
    address = Column(String)
    city = Column(String)
    postal_code = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicles = relationship("Vehicle", back_populates="customer")
    work_orders = relationship("WorkOrder", back_populates="customer")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    license_plate = Column(String, nullable=False, index=True)
    vin = Column(String)
    make = Column(String)
    model = Column(String)
    year = Column(Integer)
    engine = Column(String)
    gearbox = Column(String)
    odometer = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="vehicles")
    work_orders = relationship("WorkOrder", back_populates="vehicle")


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    description = Column(Text, nullable=False)
    status = Column(Enum(WorkOrderStatus), default=WorkOrderStatus.ny, nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"))
    scheduled_date = Column(DateTime)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    internal_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))

    customer = relationship("Customer", back_populates="work_orders")
    vehicle = relationship("Vehicle", back_populates="work_orders")
    assigned_to_user = relationship(
        "User", back_populates="assigned_orders",
        foreign_keys=[assigned_to]
    )
    creator = relationship("User", foreign_keys=[created_by])
    lines = relationship(
        "WorkOrderLine", back_populates="work_order",
        cascade="all, delete-orphan", order_by="WorkOrderLine.id"
    )
    time_entries = relationship(
        "TimeEntry", back_populates="work_order",
        cascade="all, delete-orphan", order_by="TimeEntry.start_time"
    )


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    article_number = Column(String, index=True)
    barcode = Column(String, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    unit = Column(String, default="st")
    price = Column(Numeric(10, 2), default=0)
    stock_quantity = Column(Numeric(10, 2), default=0)
    min_stock = Column(Numeric(10, 2), default=0)
    location = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    work_order_lines = relationship("WorkOrderLine", back_populates="article")
    stock_transactions = relationship("StockTransaction", back_populates="article")


class WorkOrderLine(Base):
    __tablename__ = "work_order_lines"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    article_id = Column(Integer, ForeignKey("articles.id"))
    description = Column(String, nullable=False)
    quantity = Column(Numeric(10, 2), default=1, nullable=False)
    unit = Column(String, default="st")
    unit_price = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    work_order = relationship("WorkOrder", back_populates="lines")
    article = relationship("Article", back_populates="work_order_lines")


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    duration_minutes = Column(Integer)
    description = Column(String)
    entry_type = Column(Enum(TimeEntryType), default=TimeEntryType.övrigt)
    created_at = Column(DateTime, default=datetime.utcnow)

    work_order = relationship("WorkOrder", back_populates="time_entries")
    user = relationship("User", back_populates="time_entries")


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    transaction_type = Column(Enum(StockTransactionType), nullable=False)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("Article", back_populates="stock_transactions")
