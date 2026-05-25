from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, date

DATABASE_URL = "sqlite:///./sydney_tours.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ─────────────────────────────────────────────────────────────
#  MODELS
# ─────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    full_name = Column(String)
    password_hash = Column(String, nullable=False)
    level = Column(Integer, default=1)   # 1=Data Entry, 2=Accountant, 3=Manager
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Period(Base):
    __tablename__ = "periods"
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer)
    month = Column(Integer)
    type_period = Column(String, default="شهري")
    is_closed = Column(Boolean, default=False)


class CostCenter(Base):
    __tablename__ = "cost_centers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("cost_centers.id"), nullable=True)


class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    account_type = Column(String)   # asset, liability, revenue, expense
    parent_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    balance = Column(Float, default=0.0)


class Receipt(Base):
    __tablename__ = "receipts"
    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String, unique=True)
    type = Column(String)    # قبض / صرف
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    account_name_manual = Column(String, nullable=True)   # ← NEW: اسم الحساب يدوي
    cost_center_id = Column(Integer, ForeignKey("cost_centers.id"), nullable=True)
    period_id = Column(Integer, ForeignKey("periods.id"))
    amount = Column(Float)
    description = Column(Text)
    payment_method = Column(String, default="cash")
    check_no = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    bank_account = Column(String, nullable=True)
    due_date = Column(Date, nullable=True)
    ref_no = Column(String, nullable=True)
    wallet_no = Column(String, nullable=True)
    wallet_provider = Column(String, nullable=True)
    payee = Column(String)
    receipt_date = Column(Date, default=date.today)
    is_accepted = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    seller_id = Column(Integer, ForeignKey("employees.id"), nullable=True)   # ← NEW: البائع
    seller_commission = Column(Float, default=0.0)                           # ← NEW: عمولة البيع
    created_at = Column(DateTime, default=datetime.utcnow)


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id = Column(Integer, primary_key=True, index=True)
    doc_no = Column(String)
    doc_type = Column(String)     # REC / PAY / TKT / SAL / HAJJ / JRN
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    account_name_manual = Column(String, nullable=True)   # ← NEW: اسم الحساب يدوي
    cost_center_id = Column(Integer, ForeignKey("cost_centers.id"), nullable=True)
    period_id = Column(Integer, ForeignKey("periods.id"), nullable=True)
    description = Column(Text)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    entry_date = Column(Date, default=date.today)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_posted = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    pnr = Column(String, unique=True)
    airline = Column(String)   # free-text
    passenger_name = Column(String)
    route = Column(String)
    cost_price = Column(Float)
    sell_price = Column(Float)
    ticket_type = Column(String, default="اقتصادي")
    ticket_date = Column(Date, default=date.today)
    period_id = Column(Integer, ForeignKey("periods.id"))
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    status = Column(String, default="مباعة")
    user_id = Column(Integer, ForeignKey("users.id"))
    seller_id = Column(Integer, ForeignKey("employees.id"), nullable=True)   # ← NEW
    seller_commission = Column(Float, default=0.0)                           # ← NEW
    created_at = Column(DateTime, default=datetime.utcnow)


class HajjTrip(Base):
    __tablename__ = "hajj_trips"
    id = Column(Integer, primary_key=True, index=True)
    trip_name = Column(String, nullable=False)
    type = Column(String, default="عمرة")
    hotel_makkah = Column(String)
    hotel_madinah = Column(String)
    nights_makkah = Column(Integer, default=7)
    nights_madinah = Column(Integer, default=4)
    departure_date = Column(Date)
    return_date = Column(Date)
    price_per_person = Column(Float)
    cost_per_person = Column(Float)
    max_pilgrims = Column(Integer, default=45)
    status = Column(String, default="قيد التسجيل")
    period_id = Column(Integer, ForeignKey("periods.id"))
    seller_id = Column(Integer, ForeignKey("employees.id"), nullable=True)   # ← NEW
    pilgrims = relationship("HajjPilgrim", back_populates="trip")


class HajjPilgrim(Base):
    __tablename__ = "hajj_pilgrims"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("hajj_trips.id"))
    full_name = Column(String)
    passport_no = Column(String)
    national_id = Column(String)
    phone = Column(String)
    total_price = Column(Float, default=0.0)    # ← NEW: إجمالي المبلغ المطلوب
    amount_paid = Column(Float, default=0.0)    # المبلغ المدفوع
    is_fully_paid = Column(Boolean, default=False)  # ← NEW: هل دفع الكل؟
    is_accepted = Column(Boolean, default=False)
    trip = relationship("HajjTrip", back_populates="pilgrims")


class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    job_title = Column(String)
    base_salary = Column(Float, default=0.0)
    commission_rate = Column(Float, default=0.0)   # ← NEW: نسبة العمولة الافتراضية %
    is_active = Column(Boolean, default=True)
    salaries = relationship("Salary", back_populates="employee")


class Salary(Base):
    __tablename__ = "salaries"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    period_id = Column(Integer, ForeignKey("periods.id"))
    base_salary = Column(Float, default=0.0)
    bonus = Column(Float, default=0.0)          # مكافآت / بدلات
    commission = Column(Float, default=0.0)     # عمولات (تُحسب تلقائياً)
    deductions = Column(Float, default=0.0)     # خصومات / سلف
    guarantee = Column(Float, default=0.0)      # عهدة / كفالة
    net_salary = Column(Float, default=0.0)
    is_paid = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)         # ← NEW: ملاحظات
    employee = relationship("Employee", back_populates="salaries")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
