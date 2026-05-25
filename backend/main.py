from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import shutil
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import hashlib
import os

from database import (
    get_db, create_tables,
    User, Period, Account, CostCenter,
    Receipt, JournalEntry, Ticket,
    HajjTrip, HajjPilgrim, Employee, Salary,
    db_path, application_path
)
import sys

app = FastAPI(title="Sydney Tours Accounting API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── SERVE FRONTEND ───────────────────────────────────────────
if getattr(sys, 'frozen', False):
    frontend_dist = os.path.join(sys._MEIPASS, "dist")
else:
    frontend_dist = os.path.join(os.path.dirname(__file__), "..", "dist")

@app.on_event("startup")
def startup():
    create_tables()
    migrate_columns()
    seed_initial_data()

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

# ─── MIGRATION (add new columns safely) ──────────────────────
def migrate_columns():
    """Add new columns to existing DB without dropping data."""
    from sqlalchemy import text
    migrations = [
        ("receipts",       "account_name_manual", "TEXT"),
        ("receipts",       "seller_id",           "INTEGER"),
        ("receipts",       "seller_commission",   "REAL DEFAULT 0"),
        ("journal_entries","account_name_manual", "TEXT"),
        ("tickets",        "seller_id",           "INTEGER"),
        ("tickets",        "seller_commission",   "REAL DEFAULT 0"),
        ("hajj_trips",     "seller_id",           "INTEGER"),
        ("hajj_pilgrims",  "total_price",         "REAL DEFAULT 0"),
        ("hajj_pilgrims",  "is_fully_paid",       "INTEGER DEFAULT 0"),
        ("employees",      "commission_rate",     "REAL DEFAULT 0"),
        ("salaries",       "notes",               "TEXT"),
    ]
    from sqlalchemy import inspect
    insp = inspect(app.state.engine if hasattr(app.state, 'engine') else __import__('database').engine)
    with __import__('database').engine.connect() as conn:
        for table, col, col_type in migrations:
            try:
                existing = [c["name"] for c in insp.get_columns(table)]
                if col not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                    conn.commit()
            except Exception:
                pass

# ─── SEED ─────────────────────────────────────────────────────
def seed_initial_data():
    db = next(get_db())
    try:
        if db.query(User).count() > 0:
            return
        db.add_all([
            User(username="admin",      full_name="مصطفى المدير",  password_hash=hash_pw("admin123"), level=3),
            User(username="accountant", full_name="أحمد المحاسب", password_hash=hash_pw("acc123"),   level=2),
        ])
        today = date.today()
        db.add(Period(year=today.year, month=today.month, type_period="شهري"))
        main = CostCenter(name="المركز الرئيسي"); db.add(main); db.flush()
        db.add_all([
            CostCenter(name="قسم الطيران",      parent_id=main.id),
            CostCenter(name="قسم الحج والعمرة", parent_id=main.id),
            CostCenter(name="قسم الفنادق",      parent_id=main.id),
        ])
        assets = Account(name="الأصول", account_type="asset"); db.add(assets); db.flush()
        db.add_all([
            Account(name="الخزينة الرئيسية",  account_type="asset",   parent_id=assets.id, balance=200000),
            Account(name="بنك الأهلي المصري", account_type="asset",   parent_id=assets.id, balance=500000),
            Account(name="بنك CIB",           account_type="asset",   parent_id=assets.id, balance=150000),
            Account(name="محفظة فودافون",     account_type="asset",   parent_id=assets.id, balance=15000),
            Account(name="رصيد انستا باي",    account_type="asset",   parent_id=assets.id, balance=8000),
            Account(name="العملاء والوكلاء",  account_type="asset",   parent_id=assets.id, balance=45000),
        ])
        liabilities = Account(name="الخصوم", account_type="liability"); db.add(liabilities); db.flush()
        db.add_all([
            Account(name="الموردين - شركات الطيران", account_type="liability", parent_id=liabilities.id, balance=-30000),
            Account(name="الموردين - الفنادق",       account_type="liability", parent_id=liabilities.id, balance=-20000),
            Account(name="عهد الموظفين",             account_type="liability", parent_id=liabilities.id, balance=-5000),
        ])
        revenue = Account(name="الإيرادات", account_type="revenue"); db.add(revenue); db.flush()
        db.add_all([
            Account(name="إيرادات الطيران",      account_type="revenue", parent_id=revenue.id, balance=-80000),
            Account(name="إيرادات الحج والعمرة", account_type="revenue", parent_id=revenue.id, balance=-170000),
            Account(name="إيرادات الفنادق",      account_type="revenue", parent_id=revenue.id, balance=-25000),
        ])
        expenses = Account(name="المصروفات", account_type="expense"); db.add(expenses); db.flush()
        db.add_all([
            Account(name="مصروفات الرواتب",      account_type="expense", parent_id=expenses.id, balance=35000),
            Account(name="مصروفات إيجار المكتب", account_type="expense", parent_id=expenses.id, balance=12000),
            Account(name="مصروفات عمومية",       account_type="expense", parent_id=expenses.id, balance=8000),
        ])
        db.add_all([
            Employee(name="مصطفى أحمد", job_title="محاسب",           base_salary=8000, commission_rate=2.0),
            Employee(name="محمد علي",   job_title="مندوب الجوازات",   base_salary=6500, commission_rate=3.0),
            Employee(name="عمر خالد",   job_title="موظف حجز تذاكر",  base_salary=7000, commission_rate=2.5),
        ])
        db.add_all([
            Ticket(pnr="RX89Y2", airline="مصر للطيران",      passenger_name="محمد السيد علي",  route="CAI→JED", cost_price=8500,  sell_price=9200,  status="مباعة",   user_id=1),
            Ticket(pnr="AB34KL", airline="الخطوط السعودية", passenger_name="أحمد محمود",      route="CAI→RUH", cost_price=12000, sell_price=12800, status="مباعة",   user_id=1),
        ])
        db.add_all([
            Receipt(receipt_no="REC-1001", type="قبض", account_name_manual="شركة الأفق للسياحة", amount=45000, description="دفعة مقدمة - رحلة عمرة رجب", payment_method="instapay", payee="شركة الأفق للسياحة", is_accepted=True, user_id=1),
            Receipt(receipt_no="PAY-1001", type="صرف", account_name_manual="أحمد محمود السيد", amount=8500, description="استرجاع تذكرة طيران", payment_method="cash", payee="أحمد محمود السيد", is_accepted=True, user_id=1),
        ])
        trip = HajjTrip(trip_name="عمرة رجب ١٤٤٦", type="عمرة", hotel_makkah="فندق الإيمان الكبير", hotel_madinah="فندق الإشراق", nights_makkah=10, nights_madinah=5, departure_date=date(2026,2,1), return_date=date(2026,2,15), price_per_person=21000, cost_per_person=17000, max_pilgrims=45, status="مكتملة")
        db.add(trip); db.flush()
        db.add_all([
            HajjPilgrim(trip_id=trip.id, full_name="حسن إبراهيم عبدالله",  passport_no="A1234567", national_id="28001011234567", phone="01012345678", total_price=21000, amount_paid=21000, is_fully_paid=True,  is_accepted=True),
            HajjPilgrim(trip_id=trip.id, full_name="سمية محمد خالد",        passport_no="B9876543", national_id="29005109876543", phone="01198765432", total_price=21000, amount_paid=10000, is_fully_paid=False, is_accepted=False),
        ])
        db.commit()
        print("✅ Database seeded v3.0")
    except Exception as e:
        db.rollback(); print(f"Seed skipped: {e}")
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════
#  SCHEMAS
# ═══════════════════════════════════════════════════════════════
class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    level: int = 1

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    level: Optional[int] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class ReceiptCreate(BaseModel):
    type: str
    account_id: Optional[int] = None
    account_name_manual: Optional[str] = None   # ← اسم الحساب يدوي
    cost_center_id: Optional[int] = None
    period_id: Optional[int] = 1
    amount: float
    description: str
    payment_method: str = "cash"
    check_no: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    due_date: Optional[date] = None
    ref_no: Optional[str] = None
    wallet_no: Optional[str] = None
    wallet_provider: Optional[str] = None
    payee: str
    receipt_date: Optional[date] = None
    user_id: int = 1
    seller_id: Optional[int] = None
    seller_commission: float = 0.0

class ReceiptUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    payee: Optional[str] = None
    payment_method: Optional[str] = None
    account_name_manual: Optional[str] = None

class TicketCreate(BaseModel):
    pnr: str
    airline: str
    passenger_name: str
    route: str
    cost_price: float
    sell_price: float
    ticket_type: str = "اقتصادي"
    ticket_date: Optional[date] = None
    period_id: Optional[int] = 1
    user_id: int = 1
    seller_id: Optional[int] = None
    seller_commission: float = 0.0

class TicketUpdate(BaseModel):
    airline: Optional[str] = None
    passenger_name: Optional[str] = None
    route: Optional[str] = None
    cost_price: Optional[float] = None
    sell_price: Optional[float] = None
    status: Optional[str] = None
    seller_id: Optional[int] = None
    seller_commission: Optional[float] = None

class JournalLineCreate(BaseModel):
    doc_no: str
    doc_type: str = "JRN"
    description: str
    account_id: Optional[int] = None
    account_name_manual: Optional[str] = None
    debit: float = 0.0
    credit: float = 0.0
    entry_date: Optional[date] = None
    user_id: int = 1

class EmployeeCreate(BaseModel):
    name: str
    job_title: str
    base_salary: float
    commission_rate: float = 0.0

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    job_title: Optional[str] = None
    base_salary: Optional[float] = None
    commission_rate: Optional[float] = None
    is_active: Optional[bool] = None

class HajjTripCreate(BaseModel):
    trip_name: str
    type: str = "عمرة"
    hotel_makkah: Optional[str] = None
    hotel_madinah: Optional[str] = None
    nights_makkah: int = 7
    nights_madinah: int = 4
    departure_date: Optional[date] = None
    return_date: Optional[date] = None
    price_per_person: float
    cost_per_person: float
    max_pilgrims: int = 45
    seller_id: Optional[int] = None

class PilgrimCreate(BaseModel):
    trip_id: int
    full_name: str
    passport_no: str
    national_id: Optional[str] = None
    phone: Optional[str] = None
    total_price: float = 0.0
    amount_paid: float = 0.0
    is_fully_paid: bool = False

class PilgrimUpdate(BaseModel):
    full_name: Optional[str] = None
    passport_no: Optional[str] = None
    phone: Optional[str] = None
    total_price: Optional[float] = None
    amount_paid: Optional[float] = None
    is_fully_paid: Optional[bool] = None
    is_accepted: Optional[bool] = None

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[float] = None

class SalaryUpdate(BaseModel):
    bonus: Optional[float] = None
    commission: Optional[float] = None
    deductions: Optional[float] = None
    guarantee: Optional[float] = None
    is_paid: Optional[bool] = None
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════
def next_receipt_no(db, prefix):
    count = db.query(Receipt).filter(Receipt.receipt_no.like(f"{prefix}-%")).count()
    return f"{prefix}-{1000 + count + 1}"

def post_journal(db, doc_no, doc_type, debit_acc_id, credit_acc_id, amount, description, user_id,
                 debit_acc_name=None, credit_acc_name=None):
    db.add(JournalEntry(
        doc_no=doc_no, doc_type=doc_type,
        account_id=debit_acc_id, account_name_manual=debit_acc_name,
        description=description, debit=amount, credit=0, user_id=user_id
    ))
    db.add(JournalEntry(
        doc_no=doc_no, doc_type=doc_type,
        account_id=credit_acc_id, account_name_manual=credit_acc_name,
        description=description, debit=0, credit=amount, user_id=user_id
    ))

def require_admin(user_id: int, db: Session):
    u = db.query(User).filter(User.id == user_id).first()
    if not u or u.level < 3:
        raise HTTPException(403, "هذه العملية تتطلب صلاحيات المدير")

def acc_display(db, entry):
    if entry.account_name_manual:
        return entry.account_name_manual
    if entry.account_id:
        a = db.query(Account).filter(Account.id == entry.account_id).first()
        return a.name if a else f"#{entry.account_id}"
    return "-"

def get_treasury(db):
    return db.query(Account).filter(Account.name == "الخزينة الرئيسية").first()


# ═══════════════════════════════════════════════════════════════
#  AUTH
# ═══════════════════════════════════════════════════════════════
@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or user.password_hash != hash_pw(req.password):
        raise HTTPException(401, "اسم المستخدم أو كلمة المرور غير صحيحة")
    if not user.is_active:
        raise HTTPException(403, "هذا الحساب موقوف من قِبل المدير")
    return {"id": user.id, "username": user.username, "full_name": user.full_name, "level": user.level}


# ═══════════════════════════════════════════════════════════════
#  DASHBOARD
# ═══════════════════════════════════════════════════════════════
@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    treasury       = get_treasury(db)
    pending        = db.query(func.count(Receipt.id)).filter(Receipt.is_accepted == False).scalar()
    tickets_sold   = db.query(func.count(Ticket.id)).filter(Ticket.status == "مباعة").scalar()
    ticket_revenue = db.query(func.sum(Ticket.sell_price - Ticket.cost_price)).filter(Ticket.status == "مباعة").scalar() or 0
    recent         = db.query(JournalEntry).order_by(JournalEntry.created_at.desc()).limit(10).all()
    return {
        "treasury_balance": treasury.balance if treasury else 0,
        "tickets_sold": tickets_sold, "ticket_profit": ticket_revenue,
        "pending_receipts": pending,
        "recent_journal": [{"id": e.id, "doc_no": e.doc_no, "doc_type": e.doc_type,
                            "description": e.description, "debit": e.debit, "credit": e.credit,
                            "account": acc_display(db, e),
                            "date": str(e.entry_date)} for e in recent],
    }


# ═══════════════════════════════════════════════════════════════
#  USERS
# ═══════════════════════════════════════════════════════════════
@app.get("/api/users")
def list_users(db: Session = Depends(get_db)):
    return [{"id": u.id, "username": u.username, "full_name": u.full_name,
             "level": u.level, "is_active": u.is_active} for u in db.query(User).all()]

@app.post("/api/users")
def create_user(data: UserCreate, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "اسم المستخدم مستخدم بالفعل")
    u = User(username=data.username, full_name=data.full_name,
             password_hash=hash_pw(data.password), level=data.level)
    db.add(u); db.commit(); db.refresh(u)
    return {"id": u.id}

@app.put("/api/users/{uid}")
def update_user(uid: int, data: UserUpdate, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    u = db.query(User).filter(User.id == uid).first()
    if not u: raise HTTPException(404, "المستخدم غير موجود")
    if data.full_name  is not None: u.full_name     = data.full_name
    if data.level      is not None: u.level         = data.level
    if data.is_active  is not None: u.is_active     = data.is_active
    if data.password   is not None: u.password_hash = hash_pw(data.password)
    db.commit()
    return {"status": "updated"}

@app.delete("/api/users/{uid}")
def delete_user(uid: int, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    if uid == caller_id: raise HTTPException(400, "لا يمكنك حذف حسابك الخاص")
    u = db.query(User).filter(User.id == uid).first()
    if not u: raise HTTPException(404, "المستخدم غير موجود")
    db.delete(u); db.commit()
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════
#  RECEIPTS
# ═══════════════════════════════════════════════════════════════
@app.get("/api/receipts")
def list_receipts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = db.query(Receipt).order_by(Receipt.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for r in items:
        seller = db.query(Employee).filter(Employee.id == r.seller_id).first() if r.seller_id else None
        acc_name = r.account_name_manual or (db.query(Account).filter(Account.id == r.account_id).first().name if r.account_id else "-")
        result.append({
            "id": r.id, "receipt_no": r.receipt_no, "type": r.type,
            "amount": r.amount, "payee": r.payee, "description": r.description,
            "payment_method": r.payment_method, "is_accepted": r.is_accepted,
            "date": str(r.receipt_date), "account_name": acc_name,
            "seller_name": seller.name if seller else None,
            "seller_commission": r.seller_commission or 0,
        })
    return result

@app.post("/api/receipts")
def create_receipt(data: ReceiptCreate, db: Session = Depends(get_db)):
    if not data.account_id and not data.account_name_manual:
        raise HTTPException(400, "يجب تحديد الحساب أو كتابة اسمه يدوياً")
    prefix = "REC" if data.type == "قبض" else "PAY"
    rec_no = next_receipt_no(db, prefix)

    r = Receipt(
        receipt_no=rec_no, type=data.type,
        account_id=data.account_id, account_name_manual=data.account_name_manual,
        amount=data.amount, description=data.description,
        payment_method=data.payment_method, payee=data.payee,
        check_no=data.check_no, bank_name=data.bank_name,
        wallet_no=data.wallet_no, wallet_provider=data.wallet_provider,
        period_id=data.period_id or 1, user_id=data.user_id,
        seller_id=data.seller_id, seller_commission=data.seller_commission,
        receipt_date=data.receipt_date or date.today(),
    )
    db.add(r); db.flush()

    treasury = get_treasury(db)
    acc_label = data.account_name_manual or f"حساب #{data.account_id}"
    if data.type == "قبض":
        post_journal(db, rec_no, "REC", treasury.id if treasury else None, data.account_id,
                     data.amount, data.description, data.user_id,
                     debit_acc_name="الخزينة الرئيسية", credit_acc_name=acc_label)
    else:
        post_journal(db, rec_no, "PAY", data.account_id, treasury.id if treasury else None,
                     data.amount, data.description, data.user_id,
                     debit_acc_name=acc_label, credit_acc_name="الخزينة الرئيسية")

    db.commit(); db.refresh(r)
    return {"id": r.id, "receipt_no": r.receipt_no}

@app.put("/api/receipts/{rid}")
def update_receipt(rid: int, data: ReceiptUpdate, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    r = db.query(Receipt).filter(Receipt.id == rid).first()
    if not r: raise HTTPException(404, "السند غير موجود")
    if data.amount             is not None: r.amount              = data.amount
    if data.description        is not None: r.description         = data.description
    if data.payee              is not None: r.payee               = data.payee
    if data.payment_method     is not None: r.payment_method      = data.payment_method
    if data.account_name_manual is not None: r.account_name_manual = data.account_name_manual
    db.commit()
    return {"status": "updated"}

@app.delete("/api/receipts/{rid}")
def delete_receipt(rid: int, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    r = db.query(Receipt).filter(Receipt.id == rid).first()
    if not r: raise HTTPException(404, "السند غير موجود")
    db.query(JournalEntry).filter(JournalEntry.doc_no == r.receipt_no).delete()
    db.delete(r); db.commit()
    return {"status": "deleted"}

@app.patch("/api/receipts/{rid}/accept")
def accept_receipt(rid: int, db: Session = Depends(get_db)):
    r = db.query(Receipt).filter(Receipt.id == rid).first()
    if not r: raise HTTPException(404, "السند غير موجود")
    r.is_accepted = True; db.commit()
    return {"status": "accepted"}


# ═══════════════════════════════════════════════════════════════
#  JOURNAL
# ═══════════════════════════════════════════════════════════════
@app.get("/api/journal")
def list_journal(from_date: Optional[date]=None, to_date: Optional[date]=None,
                 account_id: Optional[int]=None, search: Optional[str]=None,
                 skip: int=0, limit: int=200, db: Session=Depends(get_db)):
    q = db.query(JournalEntry)
    if from_date:  q = q.filter(JournalEntry.entry_date >= from_date)
    if to_date:    q = q.filter(JournalEntry.entry_date <= to_date)
    if account_id: q = q.filter(JournalEntry.account_id == account_id)
    if search:     q = q.filter(
        JournalEntry.description.contains(search) |
        JournalEntry.doc_no.contains(search) |
        JournalEntry.account_name_manual.contains(search)
    )
    total = q.count()
    items = q.order_by(JournalEntry.entry_date.desc(), JournalEntry.id.desc()).offset(skip).limit(limit).all()
    td = db.query(func.sum(JournalEntry.debit)).scalar()  or 0
    tc = db.query(func.sum(JournalEntry.credit)).scalar() or 0
    return {
        "total": total, "total_debit": td, "total_credit": tc,
        "items": [{
            "id": e.id, "date": str(e.entry_date), "doc_no": e.doc_no,
            "doc_type": e.doc_type, "account": acc_display(db, e),
            "account_id": e.account_id,
            "description": e.description, "debit": e.debit, "credit": e.credit
        } for e in items]
    }

@app.post("/api/journal")
def create_manual_journal(entries: List[JournalLineCreate], db: Session = Depends(get_db)):
    td = sum(e.debit for e in entries)
    tc = sum(e.credit for e in entries)
    if round(td, 2) != round(tc, 2):
        raise HTTPException(400, f"القيد غير متزن! المدين ({td:,.2f}) ≠ الدائن ({tc:,.2f})")
    for e in entries:
        db.add(JournalEntry(
            doc_no=e.doc_no, doc_type=e.doc_type,
            account_id=e.account_id, account_name_manual=e.account_name_manual,
            description=e.description, debit=e.debit, credit=e.credit,
            entry_date=e.entry_date or date.today(), user_id=e.user_id
        ))
    db.commit()
    return {"status": "success", "message": "تم حفظ القيد بنجاح"}

@app.delete("/api/journal/{jid}")
def delete_journal_entry(jid: int, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    e = db.query(JournalEntry).filter(JournalEntry.id == jid).first()
    if not e: raise HTTPException(404, "القيد غير موجود")
    db.delete(e); db.commit()
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════
#  TICKETS
# ═══════════════════════════════════════════════════════════════
@app.get("/api/tickets/stats")
def tickets_stats(db: Session = Depends(get_db)):
    sold         = db.query(func.count(Ticket.id)).filter(Ticket.status == "مباعة").scalar()
    ret          = db.query(func.count(Ticket.id)).filter(Ticket.status == "مرتجعة").scalar()
    total_profit = db.query(func.sum(Ticket.sell_price - Ticket.cost_price)).filter(Ticket.status == "مباعة").scalar() or 0
    return {"sold": sold, "returned": ret, "total_profit": total_profit}

@app.get("/api/tickets")
def list_tickets(db: Session = Depends(get_db)):
    items = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    result = []
    for t in items:
        seller = db.query(Employee).filter(Employee.id == t.seller_id).first() if t.seller_id else None
        result.append({
            "id": t.id, "pnr": t.pnr, "airline": t.airline,
            "passenger_name": t.passenger_name, "route": t.route,
            "cost_price": t.cost_price, "sell_price": t.sell_price,
            "profit": t.sell_price - t.cost_price,
            "status": t.status, "ticket_type": t.ticket_type,
            "date": str(t.ticket_date),
            "seller_name": seller.name if seller else None,
            "seller_commission": t.seller_commission or 0,
        })
    return result

@app.get("/api/tickets/airlines")
def list_airlines(db: Session = Depends(get_db)):
    """Return distinct airline names for suggestions."""
    rows = db.query(Ticket.airline).distinct().all()
    return [r[0] for r in rows if r[0]]

@app.post("/api/tickets")
def create_ticket(data: TicketCreate, db: Session = Depends(get_db)):
    if db.query(Ticket).filter(Ticket.pnr == data.pnr).first():
        raise HTTPException(400, f"رقم الحجز {data.pnr} موجود بالفعل")
    t = Ticket(**data.model_dump()); db.add(t); db.commit(); db.refresh(t)
    return {"id": t.id, "pnr": t.pnr}

@app.put("/api/tickets/{tid}")
def update_ticket(tid: int, data: TicketUpdate, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    t = db.query(Ticket).filter(Ticket.id == tid).first()
    if not t: raise HTTPException(404, "التذكرة غير موجودة")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    db.commit()
    return {"status": "updated"}

@app.delete("/api/tickets/{tid}")
def delete_ticket(tid: int, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    t = db.query(Ticket).filter(Ticket.id == tid).first()
    if not t: raise HTTPException(404, "التذكرة غير موجودة")
    db.delete(t); db.commit()
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════
#  HAJJ & UMRAH
# ═══════════════════════════════════════════════════════════════
@app.get("/api/hajj-trips")
def list_trips(db: Session = Depends(get_db)):
    trips = db.query(HajjTrip).all()
    result = []
    for t in trips:
        cnt         = db.query(func.count(HajjPilgrim.id)).filter(HajjPilgrim.trip_id == t.id).scalar()
        collected   = db.query(func.sum(HajjPilgrim.amount_paid)).filter(HajjPilgrim.trip_id == t.id).scalar() or 0
        fully_paid  = db.query(func.count(HajjPilgrim.id)).filter(HajjPilgrim.trip_id == t.id, HajjPilgrim.is_fully_paid == True).scalar()
        seller = db.query(Employee).filter(Employee.id == t.seller_id).first() if t.seller_id else None
        result.append({
            "id": t.id, "trip_name": t.trip_name, "type": t.type,
            "hotel_makkah": t.hotel_makkah, "hotel_madinah": t.hotel_madinah,
            "nights_makkah": t.nights_makkah, "nights_madinah": t.nights_madinah,
            "price_per_person": t.price_per_person, "cost_per_person": t.cost_per_person,
            "max_pilgrims": t.max_pilgrims, "registered": cnt, "collected": collected,
            "fully_paid_count": fully_paid,
            "expected_revenue": t.price_per_person * cnt,
            "expected_profit": (t.price_per_person - t.cost_per_person) * cnt,
            "status": t.status,
            "seller_name": seller.name if seller else None,
            "departure_date": str(t.departure_date) if t.departure_date else None,
        })
    return result

@app.post("/api/hajj-trips")
def create_trip(data: HajjTripCreate, db: Session = Depends(get_db)):
    t = HajjTrip(**data.model_dump()); db.add(t); db.commit(); db.refresh(t)
    return {"id": t.id}

@app.delete("/api/hajj-trips/{tid}")
def delete_trip(tid: int, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    t = db.query(HajjTrip).filter(HajjTrip.id == tid).first()
    if not t: raise HTTPException(404, "الرحلة غير موجودة")
    db.query(HajjPilgrim).filter(HajjPilgrim.trip_id == tid).delete()
    db.delete(t); db.commit()
    return {"status": "deleted"}

@app.get("/api/hajj-trips/{trip_id}/pilgrims")
def list_pilgrims(trip_id: int, db: Session = Depends(get_db)):
    items = db.query(HajjPilgrim).filter(HajjPilgrim.trip_id == trip_id).all()
    return [{
        "id": p.id, "full_name": p.full_name, "passport_no": p.passport_no,
        "national_id": p.national_id, "phone": p.phone,
        "total_price": p.total_price or 0,
        "amount_paid": p.amount_paid or 0,
        "remaining": (p.total_price or 0) - (p.amount_paid or 0),
        "is_fully_paid": bool(p.is_fully_paid),
        "is_accepted": p.is_accepted
    } for p in items]

@app.post("/api/hajj-trips/pilgrims")
def add_pilgrim(data: PilgrimCreate, db: Session = Depends(get_db)):
    # Auto-set is_fully_paid
    is_full = data.amount_paid >= data.total_price if data.total_price > 0 else False
    p = HajjPilgrim(
        trip_id=data.trip_id, full_name=data.full_name,
        passport_no=data.passport_no, national_id=data.national_id,
        phone=data.phone, total_price=data.total_price,
        amount_paid=data.amount_paid, is_fully_paid=data.is_fully_paid or is_full
    )
    db.add(p); db.commit(); db.refresh(p)
    return {"id": p.id}

@app.put("/api/hajj-trips/pilgrims/{pid}")
def update_pilgrim(pid: int, data: PilgrimUpdate, db: Session = Depends(get_db)):
    p = db.query(HajjPilgrim).filter(HajjPilgrim.id == pid).first()
    if not p: raise HTTPException(404, "المعتمر غير موجود")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    # Auto-update is_fully_paid
    if p.total_price and p.total_price > 0:
        p.is_fully_paid = p.amount_paid >= p.total_price
    db.commit()
    return {"status": "updated"}

@app.delete("/api/hajj-trips/pilgrims/{pid}")
def delete_pilgrim(pid: int, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    p = db.query(HajjPilgrim).filter(HajjPilgrim.id == pid).first()
    if not p: raise HTTPException(404)
    db.delete(p); db.commit()
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════
#  EMPLOYEES & PAYROLL
# ═══════════════════════════════════════════════════════════════
@app.get("/api/employees")
def list_employees(db: Session = Depends(get_db)):
    return [{
        "id": e.id, "name": e.name, "job_title": e.job_title,
        "base_salary": e.base_salary, "commission_rate": e.commission_rate or 0,
        "is_active": e.is_active
    } for e in db.query(Employee).all()]

@app.post("/api/employees")
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    e = Employee(**data.model_dump()); db.add(e); db.commit(); db.refresh(e)
    return {"id": e.id}

@app.put("/api/employees/{eid}")
def update_employee(eid: int, data: EmployeeUpdate, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    e = db.query(Employee).filter(Employee.id == eid).first()
    if not e: raise HTTPException(404, "الموظف غير موجود")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(e, k, v)
    db.commit()
    return {"status": "updated"}

@app.delete("/api/employees/{eid}")
def delete_employee(eid: int, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    e = db.query(Employee).filter(Employee.id == eid).first()
    if not e: raise HTTPException(404, "الموظف غير موجود")
    e.is_active = False; db.commit()
    return {"status": "deactivated"}

@app.get("/api/employees/{eid}/commissions")
def get_employee_commissions(eid: int, year: int = None, month: int = None, db: Session = Depends(get_db)):
    """Calculate total commissions for an employee from tickets and receipts."""
    today = date.today()
    y = year or today.year
    m = month or today.month

    ticket_comm = db.query(func.sum(Ticket.seller_commission)).filter(
        Ticket.seller_id == eid,
        func.strftime('%Y', Ticket.ticket_date) == str(y),
        func.strftime('%m', Ticket.ticket_date) == f"{m:02d}"
    ).scalar() or 0

    receipt_comm = db.query(func.sum(Receipt.seller_commission)).filter(
        Receipt.seller_id == eid,
        func.strftime('%Y', Receipt.receipt_date) == str(y),
        func.strftime('%m', Receipt.receipt_date) == f"{m:02d}"
    ).scalar() or 0

    return {
        "employee_id": eid,
        "ticket_commissions": ticket_comm,
        "receipt_commissions": receipt_comm,
        "total": ticket_comm + receipt_comm
    }

@app.get("/api/salaries")
def list_salaries(period_id: int = 1, db: Session = Depends(get_db)):
    items = db.query(Salary).filter(Salary.period_id == period_id).all()
    result = []
    for s in items:
        emp = db.query(Employee).filter(Employee.id == s.employee_id).first()
        result.append({
            "id": s.id, "employee_id": s.employee_id,
            "employee_name": emp.name if emp else "-",
            "job_title": emp.job_title if emp else "-",
            "base_salary": s.base_salary, "bonus": s.bonus,
            "commission": s.commission, "deductions": s.deductions,
            "guarantee": s.guarantee, "net_salary": s.net_salary,
            "is_paid": s.is_paid, "notes": s.notes or ""
        })
    return result

@app.post("/api/salaries/run-payroll")
def run_payroll(period_id: int = 1, auto_commissions: bool = True, db: Session = Depends(get_db)):
    """Create salary records for all active employees. Optionally pull commissions automatically."""
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    created = 0
    period = db.query(Period).filter(Period.id == period_id).first()
    for emp in employees:
        existing = db.query(Salary).filter(Salary.employee_id == emp.id, Salary.period_id == period_id).first()
        if not existing:
            commission = 0.0
            if auto_commissions and period:
                # Sum commissions from tickets & receipts in this period's month/year
                tc = db.query(func.sum(Ticket.seller_commission)).filter(
                    Ticket.seller_id == emp.id,
                    func.strftime('%Y', Ticket.ticket_date) == str(period.year),
                    func.strftime('%m', Ticket.ticket_date) == f"{period.month:02d}"
                ).scalar() or 0
                rc = db.query(func.sum(Receipt.seller_commission)).filter(
                    Receipt.seller_id == emp.id,
                    func.strftime('%Y', Receipt.receipt_date) == str(period.year),
                    func.strftime('%m', Receipt.receipt_date) == f"{period.month:02d}"
                ).scalar() or 0
                commission = tc + rc
            net = emp.base_salary + commission
            db.add(Salary(employee_id=emp.id, period_id=period_id,
                         base_salary=emp.base_salary, commission=commission, net_salary=net))
            created += 1
    db.commit()
    return {"created": created, "message": f"تم إنشاء {created} سجل راتب"}

@app.put("/api/salaries/{sid}")
def update_salary(sid: int, data: SalaryUpdate, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    s = db.query(Salary).filter(Salary.id == sid).first()
    if not s: raise HTTPException(404)
    if data.bonus      is not None: s.bonus      = data.bonus
    if data.commission is not None: s.commission = data.commission
    if data.deductions is not None: s.deductions = data.deductions
    if data.guarantee  is not None: s.guarantee  = data.guarantee
    if data.notes      is not None: s.notes      = data.notes
    if data.is_paid    is not None:
        s.is_paid = data.is_paid
        if data.is_paid:
            # Post salary journal entry automatically
            salary_acc = db.query(Account).filter(Account.name == "مصروفات الرواتب").first()
            treasury   = get_treasury(db)
            emp        = db.query(Employee).filter(Employee.id == s.employee_id).first()
            if salary_acc and treasury:
                doc = f"SAL-{s.id}"
                desc = f"راتب {emp.name if emp else 'موظف'}"
                post_journal(db, doc, "SAL", salary_acc.id, treasury.id,
                             s.net_salary, desc, caller_id)
    s.net_salary = s.base_salary + s.bonus + s.commission - s.deductions - s.guarantee
    db.commit()
    return {"status": "updated", "net_salary": s.net_salary}


# ═══════════════════════════════════════════════════════════════
#  ACCOUNTS & PERIODS
# ═══════════════════════════════════════════════════════════════
@app.get("/api/accounts")
def list_accounts(db: Session = Depends(get_db)):
    return [{"id": a.id, "name": a.name, "type": a.account_type,
             "balance": a.balance, "parent_id": a.parent_id}
            for a in db.query(Account).all()]

@app.put("/api/accounts/{aid}")
def update_account(aid: int, data: AccountUpdate, caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    a = db.query(Account).filter(Account.id == aid).first()
    if not a: raise HTTPException(404)
    if data.name    is not None: a.name    = data.name
    if data.balance is not None: a.balance = data.balance
    db.commit()
    return {"status": "updated"}

@app.get("/api/periods")
def list_periods(db: Session = Depends(get_db)):
    return [{"id": p.id, "year": p.year, "month": p.month,
             "type": p.type_period, "is_closed": p.is_closed}
            for p in db.query(Period).all()]


# ═══════════════════════════════════════════════════════════════
#  BACKUP & RESTORE
# ═══════════════════════════════════════════════════════════════
@app.get("/api/backup")
def download_backup(caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    if not os.path.exists(db_path):
        raise HTTPException(404, "ملف قاعدة البيانات غير موجود")
    return FileResponse(db_path, media_type="application/octet-stream", filename=f"sydney_tours_backup_{date.today()}.db")

@app.post("/api/restore")
async def restore_backup(file: UploadFile = File(...), caller_id: int = 1, db: Session = Depends(get_db)):
    require_admin(caller_id, db)
    if not file.filename.endswith(".db"):
        raise HTTPException(400, "يجب أن يكون الملف بامتداد .db")
    
    # Close connections if possible, though SQLite handles it okay usually if we just replace it
    try:
        with open(db_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"status": "success", "message": "تم استعادة النسخة الاحتياطية بنجاح! قد تحتاج لإعادة تشغيل السيرفر."}
    except Exception as e:
        raise HTTPException(500, f"حدث خطأ أثناء الاستعادة: {str(e)}")


# ═══════════════════════════════════════════════════════════════
#  SERVE REACT FRONTEND (must be last)
# ═══════════════════════════════════════════════════════════════
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")

    @app.exception_handler(404)
    async def spa_fallback(request, __):
        idx = os.path.join(frontend_dist, "index.html")
        if os.path.exists(idx):
            return FileResponse(idx)
        return __
