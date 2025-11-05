from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os
import logging
import uuid
import bcrypt
import jwt
from authlib.integrations.starlette_client import OAuth
from itsdangerous import URLSafeTimedSerializer
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
import aiofiles
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import cm
from bson import ObjectId

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 30  # 30 days

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.environ.get('MAIL_USERNAME'),
    MAIL_PASSWORD=os.environ.get('MAIL_PASSWORD'),
    MAIL_FROM=os.environ.get('MAIL_FROM'),
    MAIL_PORT=int(os.environ.get('MAIL_PORT', 587)),
    MAIL_SERVER=os.environ.get('MAIL_SERVER'),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

fastmail = FastMail(conf)

# Password Reset Serializer
serializer = URLSafeTimedSerializer(JWT_SECRET)

# OAuth Configuration
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# Register Turkish font for PDF
font_path = ROOT_DIR / 'static' / 'fonts' / 'DejaVuSans.ttf'
try:
    if font_path.exists():
        pdfmetrics.registerFont(TTFont('DejaVuSans', str(font_path)))
except Exception as e:
    logger.warning(f"Could not load Turkish font: {e}. Using default font.")

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    age: Optional[int] = None
    subject: Optional[str] = None

class UserRegister(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    role: str = "teacher"  # teacher, admin
    created_at: str

class StudentBase(BaseModel):
    full_name: str
    grade: Optional[str] = None
    hourly_rate: Optional[float] = None
    last_topic: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_email: Optional[EmailStr] = None
    guardian_phone: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class Student(StudentBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    teacher_id: str
    created_at: str

class LessonBase(BaseModel):
    student_id: str
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str  # HH:MM format
    end_time: str
    topic: Optional[str] = None
    status: str = "scheduled"  # scheduled, completed, cancelled, not_attended
    note: Optional[str] = None  # Note for missed lessons

class LessonCreate(LessonBase):
    pass

class Lesson(LessonBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    teacher_id: str
    created_at: str

class SessionBase(BaseModel):
    lesson_id: str
    student_id: str
    date: str  # YYYY-MM-DD
    start_time: str
    end_time: str
    topic: Optional[str] = None
    note: Optional[str] = None
    evaluation: Optional[str] = None
    status: str = "completed"
    material_path: Optional[str] = None

class SessionCreate(SessionBase):
    pass

class Session(SessionBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    teacher_id: str
    created_at: str

class PaymentBase(BaseModel):
    student_id: str
    amount: float
    date: str  # YYYY-MM-DD
    status: str = "Beklemede"  # Ödendi, Beklemede

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    teacher_id: str
    created_at: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class DashboardStats(BaseModel):
    students_count: int
    weekly_lessons: int
    pending_payments: float
    today_lessons: List[dict]

# ============ SOCIAL MODELS ============

class PostBase(BaseModel):
    content: str
    media: List[str] = []
    visibility: str = "public"  # public, followers, private

class PostCreate(PostBase):
    pass

class Post(PostBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    author_id: str
    author_name: str
    author_username: Optional[str] = None
    author_avatar: Optional[str] = None
    created_at: str

class NewsBase(BaseModel):
    title: str
    body: str
    tags: List[str] = []
    status: str = "draft"  # draft, published

class NewsCreate(NewsBase):
    pass

class News(NewsBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    author_id: str
    published_at: Optional[str] = None
    created_at: str
    updated_at: str

class ThreadBase(BaseModel):
    participants: List[str]

class Thread(ThreadBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    last_message_at: Optional[str] = None
    created_at: str

class MessageBase(BaseModel):
    body: str
    media: List[str] = []

class MessageCreate(MessageBase):
    recipient_id: str

class Message(MessageBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    thread_id: str
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str] = None
    read_by: List[str] = []
    created_at: str

# Likes and Comments
class Like(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    post_id: Optional[str] = None
    news_id: Optional[str] = None
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    created_at: str
    
class CommentCreate(BaseModel):
    text: str
    parent_id: str | None = None

class CommentBase(BaseModel):
    content: str

class Comment(CommentBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    post_id: Optional[str] = None
    news_id: Optional[str] = None
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    created_at: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str  # notification recipient
    type: str  # like, comment, follow
    actor_id: str  # who did the action
    actor_name: str
    actor_username: Optional[str] = None
    actor_avatar: Optional[str] = None
    post_id: Optional[str] = None
    content: Optional[str] = None
    read: bool = False
    created_at: str

# ============ HELPER FUNCTIONS ============

# ---------- One-time reschedule helpers ----------
class OneTimeRescheduleRequest(BaseModel):
    # The original occurrence date that was missed (YYYY-MM-DD)
    original_date: str
    # New occurrence date/time (must be SAME ISO WEEK as original_date)
    new_date: str
    new_start_time: str  # "HH:MM"
    new_end_time: str    # "HH:MM"
    reason: str = Field(min_length=1, max_length=500)

class NotAttendedAndMaybeReschedule(BaseModel):
    # Bugünkü dersin "haftalık plan içindeki o occurrence tarihi"
    original_date: str  # YYYY-MM-DD (ISO hafta anahtarı için şart)
    # Öğretmenin girdiği mazeret (yapılmadı gerekçesi)
    reason: str = Field(min_length=1, max_length=500)

    # Eğer aynı hafta içinde bir kereliğe mahsus erteleme istiyorsa:
    reschedule: bool = False
    new_date: Optional[str] = None       # YYYY-MM-DD (original_date ile aynı ISO hafta)
    new_start_time: Optional[str] = None # "HH:MM"
    new_end_time: Optional[str] = None   # "HH:MM"


def _to_minutes(hhmm: str) -> int:
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m

def _iso_week_key(date_str: str) -> str:
    d = datetime.strptime(date_str, "%Y-%m-%d").date()
    y, w, _ = d.isocalendar()  # (year, week, weekday)
    return f"{y}-W{w:02d}"

def _same_iso_week(date_a: str, date_b: str) -> bool:
    return _iso_week_key(date_a) == _iso_week_key(date_b)

async def _has_time_conflict_for_teacher(db, teacher_id: str, target_date: str,
                                         start_time: str, end_time: str,
                                         exclude_lesson_id: Optional[str] = None) -> bool:
    """
    Check conflicts against:
    1) Regular weekly lessons of the teacher on the same weekday
    2) Other one-time overrides on the same exact date
    """
    start_min = _to_minutes(start_time)
    end_min = _to_minutes(end_time)
    if end_min <= start_min:
        # zero or negative duration is not valid
        return True

    # weekday: 0=Monday ... 6=Sunday
    weekday = datetime.strptime(target_date, "%Y-%m-%d").weekday()

    # Check regular lessons on that weekday
    q_lessons = {
        "teacher_id": teacher_id,
        "day_of_week": weekday
    }
    if exclude_lesson_id:
        q_lessons["id"] = {"$ne": exclude_lesson_id}

    lessons_same_day = await db.lessons.find(q_lessons, {"_id": 0}).to_list(1000)
    for ex in lessons_same_day:
        ex_start = _to_minutes(ex["start_time"])
        ex_end = _to_minutes(ex["end_time"])
        # overlap if (start < ex_end) and (end > ex_start)
        if start_min < ex_end and end_min > ex_start:
            return True

    # Check other overrides on the SAME DATE
    overrides_same_date = await db.lesson_overrides.find({
        "teacher_id": teacher_id,
        "new_date": target_date
    }, {"_id": 0}).to_list(1000)

    for ov in overrides_same_date:
        if exclude_lesson_id and ov.get("lesson_id") == exclude_lesson_id:
            # the same lesson may have the same override (ignore self)
            continue
        ov_start = _to_minutes(ov["new_start_time"])
        ov_end = _to_minutes(ov["new_end_time"])
        if start_min < ov_end and end_min > ov_start:
            return True

    return False

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Geçersiz token")
        
        user = await db.users.find_one({'id': user_id}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
        
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Geçersiz token")

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kullanılıyor")
    
    # Generate username from name
    base_username = user_data.full_name.lower().replace(' ', '_')
    username = base_username
    counter = 1
    while await db.users.find_one({'username': username}):
        username = f"{base_username}{counter}"
        counter += 1
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['id'] = str(uuid.uuid4())
    user_dict['username'] = username
    user_dict['bio'] = None
    user_dict['role'] = 'teacher'
    user_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    user_dict['avatar'] = None
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token(user_dict['id'], user_dict['email'])
    
    return {
        'token': token,
        'user': User(**{k: v for k, v in user_dict.items() if k != 'password'})
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")
    
    token = create_access_token(user['id'], user['email'])
    
    return {
        'token': token,
        'user': User(**{k: v for k, v in user.items() if k != 'password'})
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    user = await db.users.find_one({'email': request.email})
    if not user:
        # Don't reveal if email exists
        return {"message": "Şifre sıfırlama bağlantısı email adresinize gönderildi"}
    
    # Generate reset token
    token = serializer.dumps(request.email, salt='password-reset-salt')
    
    # Send email
    reset_link = f"http://localhost:3000/reset-password/{token}"
    
    message = MessageSchema(
        subject="Mentra - Şifre Sıfırlama",
        recipients=[request.email],
        body=f"""
        Merhaba,
        
        Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:
        {reset_link}
        
        Bu bağlantı 1 saat geçerlidir.
        
        Eğer bu isteği siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.
        
        Saygılarımızla,
        Mentra Ekibi
        """,
        subtype="plain"
    )
    
    try:
        await fastmail.send_message(message)
    except Exception as e:
        logger.error(f"Email gönderme hatası: {e}")
    
    return {"message": "Şifre sıfırlama bağlantısı email adresinize gönderildi"}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    try:
        email = serializer.loads(request.token, salt='password-reset-salt', max_age=3600)
    except:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş token")
    
    user = await db.users.find_one({'email': email})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Update password
    new_password_hash = hash_password(request.new_password)
    await db.users.update_one(
        {'email': email},
        {'$set': {'password': new_password_hash}}
    )
    
    return {"message": "Şifreniz başarıyla güncellendi"}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({'id': current_user.id})
    if not user or not verify_password(request.current_password, user['password']):
        raise HTTPException(status_code=401, detail="Mevcut şifre hatalı")
    
    # Update password
    new_password_hash = hash_password(request.new_password)
    await db.users.update_one(
        {'id': current_user.id},
        {'$set': {'password': new_password_hash}}
    )
    
    return {"message": "Şifreniz başarıyla değiştirildi"}

@api_router.get("/auth/google/login")
async def google_login():
    redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:3000/auth/google/callback')
    return {
        "auth_url": f"https://accounts.google.com/o/oauth2/v2/auth?client_id={os.environ.get('GOOGLE_CLIENT_ID')}&redirect_uri={redirect_uri}&response_type=code&scope=openid%20email%20profile"
    }

@api_router.get("/auth/google/callback")
async def google_callback(code: str):
    try:
        # Exchange code for token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": os.environ.get('GOOGLE_CLIENT_ID'),
            "client_secret": os.environ.get('GOOGLE_CLIENT_SECRET'),
            "redirect_uri": os.environ.get('GOOGLE_REDIRECT_URI'),
            "grant_type": "authorization_code"
        }
        
        import httpx
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            token_json = token_response.json()
            
            if "access_token" not in token_json:
                raise HTTPException(status_code=400, detail="Token alınamadı")
            
            # Get user info
            user_info_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_json['access_token']}"}
            )
            user_info = user_info_response.json()
            
            # Check if user exists
            user = await db.users.find_one({'email': user_info['email']})
            
            if not user:
                # Create new user
                user_dict = {
                    'id': str(uuid.uuid4()),
                    'email': user_info['email'],
                    'full_name': user_info.get('name', user_info['email']),
                    'password': '',  # No password for OAuth users
                    'age': None,
                    'subject': None,
                    'avatar': None,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(user_dict)
                user = user_dict
            
            # Create token
            token = create_access_token(user['id'], user['email'])
            
            # Redirect to frontend with token
            frontend_url = "https://mentra-social.preview.emergentagent.com"
            return {
                "redirect": f"{frontend_url}/auth/google/success?token={token}"
            }
            
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        raise HTTPException(status_code=400, detail="Google girişi başarısız")

# ============ TEACHER ROUTES ============

@api_router.get("/teacher/dashboard", response_model=DashboardStats)
async def get_dashboard(current_user: User = Depends(get_current_user)):
    # Counts
    students_count = await db.students.count_documents({'teacher_id': current_user.id})
    weekly_lessons = await db.lessons.count_documents({
        'teacher_id': current_user.id,
        'status': {'$in': ['scheduled', 'completed']}
    })

    # Pending payments
    pending_payments_cursor = db.payments.find({
        'teacher_id': current_user.id,
        'status': 'Beklemede'
    })
    pending_payments = sum([p['amount'] async for p in pending_payments_cursor])

    # Today context
    today_dt = datetime.now(timezone.utc)
    today_str = today_dt.strftime('%Y-%m-%d')
    weekday = today_dt.weekday()  # 0=Mon .. 6=Sun
    week_key = _iso_week_key(today_str)

    # Fetch overrides for THIS week
    overrides_this_week = await db.lesson_overrides.find({
        "teacher_id": current_user.id,
        "week_key": week_key
    }, {"_id": 0}).to_list(1000)

    # Build sets for filtering
    moved_from_today_ids = set([ov["lesson_id"] for ov in overrides_this_week if ov.get("original_date") == today_str])
    moved_to_today = [ov for ov in overrides_this_week if ov.get("new_date") == today_str]

    # Base today's lessons (regular schedule)
    base_today_cursor = db.lessons.find({
        'teacher_id': current_user.id,
        'day_of_week': weekday,
        'status': {'$in': ['scheduled', 'completed']}
    }, {'_id': 0})
    base_today_lessons = []
    async for lesson in base_today_cursor:
        if lesson['id'] in moved_from_today_ids:
            # This lesson was rescheduled away from today -> skip
            continue
        student = await db.students.find_one({'id': lesson['student_id']}, {'_id': 0})
        if student:
            base_today_lessons.append({
                'lesson_id': lesson['id'],
                'student_name': student['full_name'],
                'start_time': lesson['start_time'],
                'end_time': lesson['end_time'],
                'topic': lesson.get('topic', 'Konu belirtilmemiş'),
                'status': lesson['status']
            })

    # Add lessons moved TO today via overrides
    for ov in moved_to_today:
        # Get original lesson to fetch student/topic
        lesson = await db.lessons.find_one({'id': ov['lesson_id']}, {'_id': 0})
        if not lesson:
            continue
        student = await db.students.find_one({'id': lesson['student_id']}, {'_id': 0})
        if not student:
            continue
        base_today_lessons.append({
            'lesson_id': lesson['id'],
            'student_name': student['full_name'],
            'start_time': ov['new_start_time'],
            'end_time': ov['new_end_time'],
            'topic': lesson.get('topic', 'Konu belirtilmemiş'),
            'status': 'rescheduled'  # visual hint for UI
        })

    # Sort by start_time (HH:MM)
    def _key_start(item):
        h, m = map(int, item['start_time'].split(':'))
        return h * 60 + m

    base_today_lessons.sort(key=_key_start)

    return DashboardStats(
        students_count=students_count,
        weekly_lessons=weekly_lessons,
        pending_payments=pending_payments,
        today_lessons=base_today_lessons
    )

@api_router.put("/teacher/profile")
async def update_profile(full_name: Optional[str] = None, age: Optional[int] = None, 
                        subject: Optional[str] = None, current_user: User = Depends(get_current_user)):
    update_data = {}
    if full_name:
        update_data['full_name'] = full_name
    if age:
        update_data['age'] = age
    if subject:
        update_data['subject'] = subject
    
    if update_data:
        await db.users.update_one(
            {'id': current_user.id},
            {'$set': update_data}
        )
    
    updated_user = await db.users.find_one({'id': current_user.id}, {'_id': 0})
    return User(**{k: v for k, v in updated_user.items() if k != 'password'})

@api_router.post("/teacher/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    # Save file
    file_extension = file.filename.split('.')[-1]
    filename = f"{current_user.id}.{file_extension}"
    file_path = ROOT_DIR / 'static' / 'uploads' / 'avatars' / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    avatar_url = f"/static/uploads/avatars/{filename}"
    
    await db.users.update_one(
        {'id': current_user.id},
        {'$set': {'avatar': avatar_url}}
    )
    
    return {"avatar": avatar_url}

# ============ STUDENT ROUTES ============

@api_router.post("/students", response_model=Student)
async def create_student(student_data: StudentCreate, current_user: User = Depends(get_current_user)):
    student_dict = student_data.model_dump()
    student_dict['id'] = str(uuid.uuid4())
    student_dict['teacher_id'] = current_user.id
    student_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.students.insert_one(student_dict)
    return Student(**student_dict)

@api_router.get("/students", response_model=List[Student])
async def get_students(current_user: User = Depends(get_current_user)):
    students = await db.students.find({'teacher_id': current_user.id}, {'_id': 0}).to_list(1000)
    return [Student(**s) for s in students]

@api_router.get("/students/{student_id}", response_model=Student)
async def get_student(student_id: str, current_user: User = Depends(get_current_user)):
    student = await db.students.find_one({'id': student_id, 'teacher_id': current_user.id}, {'_id': 0})
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı")
    return Student(**student)

@api_router.put("/students/{student_id}", response_model=Student)
async def update_student(student_id: str, student_data: StudentCreate, current_user: User = Depends(get_current_user)):
    result = await db.students.update_one(
        {'id': student_id, 'teacher_id': current_user.id},
        {'$set': student_data.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı")
    
    updated_student = await db.students.find_one({'id': student_id}, {'_id': 0})
    return Student(**updated_student)

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str, current_user: User = Depends(get_current_user)):
    # Delete student
    result = await db.students.delete_one({'id': student_id, 'teacher_id': current_user.id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı")
    
    # Cascade delete related data
    await db.lessons.delete_many({'student_id': student_id, 'teacher_id': current_user.id})
    await db.sessions.delete_many({'student_id': student_id, 'teacher_id': current_user.id})
    await db.payments.delete_many({'student_id': student_id, 'teacher_id': current_user.id})
    
    return {"message": "Öğrenci ve ilgili tüm veriler silindi"}

# ============ LESSON ROUTES ============

@api_router.get("/weeks/days")
async def get_iso_week_days(original_date: str):
    """
    original_date'in (YYYY-MM-DD) ait olduğu ISO haftanın
    Pazartesi..Pazar günlerini YYYY-MM-DD olarak döner.
    """
    base = datetime.strptime(original_date, "%Y-%m-%d").date()
    iso_year, iso_week, iso_weekday = base.isocalendar()  # 1..7 (Mon..Sun)
    # Pazartesi'ye git
    monday = base - timedelta(days=iso_weekday - 1)
    days = [(monday + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    return {"week_key": f"{iso_year}-W{iso_week:02d}", "days": days}

@api_router.post("/lessons", response_model=Lesson)
async def create_lesson(lesson_data: LessonCreate, current_user: User = Depends(get_current_user)):
    # Check for time conflicts
    start_time = lesson_data.start_time
    end_time = lesson_data.end_time
    day_of_week = lesson_data.day_of_week
    
    # Parse times
    start_h, start_m = map(int, start_time.split(':'))
    end_h, end_m = map(int, end_time.split(':'))
    start_minutes = start_h * 60 + start_m
    end_minutes = end_h * 60 + end_m
    
    # Check existing lessons for this teacher on the same day
    existing_lessons = await db.lessons.find({
        'teacher_id': current_user.id,
        'day_of_week': day_of_week
    }, {'_id': 0}).to_list(1000)
    
    for existing in existing_lessons:
        ex_start_h, ex_start_m = map(int, existing['start_time'].split(':'))
        ex_end_h, ex_end_m = map(int, existing['end_time'].split(':'))
        ex_start_minutes = ex_start_h * 60 + ex_start_m
        ex_end_minutes = ex_end_h * 60 + ex_end_m
        
        # Check if times overlap
        if (start_minutes < ex_end_minutes and end_minutes > ex_start_minutes):
            raise HTTPException(
                status_code=400, 
                detail=f"Bu saatte zaten bir dersiniz var ({existing['start_time']}-{existing['end_time']}). Lütfen farklı bir saat seçin."
            )
    
    lesson_dict = lesson_data.model_dump()
    lesson_dict['id'] = str(uuid.uuid4())
    lesson_dict['teacher_id'] = current_user.id
    lesson_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.lessons.insert_one(lesson_dict)
    return Lesson(**lesson_dict)

@api_router.get("/lessons", response_model=List[Lesson])
async def get_lessons(student_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {'teacher_id': current_user.id}
    if student_id:
        query['student_id'] = student_id
    
    lessons = await db.lessons.find(query, {'_id': 0}).to_list(1000)
    return [Lesson(**l) for l in lessons]

@api_router.put("/lessons/{lesson_id}", response_model=Lesson)
async def update_lesson(lesson_id: str, lesson_data: LessonCreate, current_user: User = Depends(get_current_user)):
    # Check for time conflicts (excluding current lesson)
    start_time = lesson_data.start_time
    end_time = lesson_data.end_time
    day_of_week = lesson_data.day_of_week
    
    # Parse times
    start_h, start_m = map(int, start_time.split(':'))
    end_h, end_m = map(int, end_time.split(':'))
    start_minutes = start_h * 60 + start_m
    end_minutes = end_h * 60 + end_m
    
    # Check existing lessons for this teacher on the same day (excluding current lesson)
    existing_lessons = await db.lessons.find({
        'teacher_id': current_user.id,
        'day_of_week': day_of_week,
        'id': {'$ne': lesson_id}
    }, {'_id': 0}).to_list(1000)
    
    for existing in existing_lessons:
        ex_start_h, ex_start_m = map(int, existing['start_time'].split(':'))
        ex_end_h, ex_end_m = map(int, existing['end_time'].split(':'))
        ex_start_minutes = ex_start_h * 60 + ex_start_m
        ex_end_minutes = ex_end_h * 60 + ex_end_m
        
        # Check if times overlap
        if (start_minutes < ex_end_minutes and end_minutes > ex_start_minutes):
            raise HTTPException(
                status_code=400, 
                detail=f"Bu saatte zaten bir dersiniz var ({existing['start_time']}-{existing['end_time']}). Lütfen farklı bir saat seçin."
            )
    
    result = await db.lessons.update_one(
        {'id': lesson_id, 'teacher_id': current_user.id},
        {'$set': lesson_data.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")
    
    updated_lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    return Lesson(**updated_lesson)

@api_router.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, current_user: User = Depends(get_current_user)):
    result = await db.lessons.delete_one({'id': lesson_id, 'teacher_id': current_user.id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")
    
    return {"message": "Ders silindi"}

@api_router.post("/lessons/{lesson_id}/complete-with-details")
async def complete_lesson_with_details(
    lesson_id: str, 
    topic: str = "",
    weaknesses: str = "",
    homework: str = "",
    note: str = "",
    current_user: User = Depends(get_current_user)
):
    # Get lesson
    lesson = await db.lessons.find_one({'id': lesson_id, 'teacher_id': current_user.id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")
    
    # Mark lesson as completed
    await db.lessons.update_one(
        {'id': lesson_id},
        {'$set': {'status': 'completed'}}
    )
    
    # Create session record
    session_dict = {
        'id': str(uuid.uuid4()),
        'lesson_id': lesson_id,
        'student_id': lesson['student_id'],
        'teacher_id': current_user.id,
        'date': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        'start_time': lesson['start_time'],
        'end_time': lesson['end_time'],
        'topic': topic,
        'note': note,
        'evaluation': f"Eksikler: {weaknesses}\nÖdev: {homework}",
        'status': 'completed',
        'material_path': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.sessions.insert_one(session_dict)
    
    # Add debt to student (calculate from hourly rate and lesson duration)
    student = await db.students.find_one({'id': lesson['student_id']})
    if student and student.get('hourly_rate'):
        # Calculate lesson duration in hours
        start_h, start_m = map(int, lesson['start_time'].split(':'))
        end_h, end_m = map(int, lesson['end_time'].split(':'))
        duration_hours = (end_h * 60 + end_m - start_h * 60 - start_m) / 60
        
        amount = student['hourly_rate'] * duration_hours
        
        # Create payment record as pending
        payment_dict = {
            'id': str(uuid.uuid4()),
            'student_id': lesson['student_id'],
            'teacher_id': current_user.id,
            'amount': amount,
            'date': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            'status': 'Beklemede',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.payments.insert_one(payment_dict)
    
    return {"message": "Ders tamamlandı ve kaydedildi", "session_id": session_dict['id']}

@api_router.post("/lessons/{lesson_id}/mark-not-attended")
async def mark_lesson_not_attended(lesson_id: str, note: str = "", current_user: User = Depends(get_current_user)):
    result = await db.lessons.update_one(
        {'id': lesson_id, 'teacher_id': current_user.id},
        {'$set': {'status': 'not_attended', 'note': note}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")
    
    return {"message": "Ders yapılmadı olarak işaretlendi"}

@api_router.post("/lessons/{lesson_id}/not-attended-and-reschedule")
async def not_attended_and_maybe_reschedule(
    lesson_id: str,
    payload: NotAttendedAndMaybeReschedule,
    current_user: User = Depends(get_current_user)
):
    # 1) Yetki ve ders doğrulama
    lesson = await db.lessons.find_one({'id': lesson_id, 'teacher_id': current_user.id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")

    # 2) Dersi 'yapılmadı' olarak işaretle, not alanına mazereti yaz
    await db.lessons.update_one(
        {'id': lesson_id, 'teacher_id': current_user.id},
        {'$set': {'status': 'not_attended', 'note': payload.reason}}
    )

    result = {
        "message": "Ders yapılmadı olarak işaretlendi",
        "rescheduled": False
    }

    # 3) Erteleme istenmiyorsa burada biter
    if not payload.reschedule:
        return result

    # 4) Erteleme isteniyorsa alan kontrolü
    if not (payload.new_date and payload.new_start_time and payload.new_end_time):
        raise HTTPException(status_code=400, detail="Erteleme için tarih ve saat alanları zorunlu")

    # 5) Aynı ISO hafta kontrolü
    if not _same_iso_week(payload.original_date, payload.new_date):
        raise HTTPException(status_code=400, detail="Erteleme aynı hafta içinde yapılmalı")

    # 6) Bu ders için aynı hafta içinde daha önce override var mı?
    week_key = _iso_week_key(payload.original_date)
    existing = await db.lesson_overrides.find_one({
        "lesson_id": lesson_id,
        "week_key": week_key
    })
    if existing:
        raise HTTPException(status_code=409, detail="Bu ders için bu haftada zaten bir erteleme yapılmış")

    # 7) Çakışma (öğretmenin diğer dersleri/override'ları ile) kontrolü
    conflict = await _has_time_conflict_for_teacher(
        db=db,
        teacher_id=current_user.id,
        target_date=payload.new_date,
        start_time=payload.new_start_time,
        end_time=payload.new_end_time,
        exclude_lesson_id=lesson_id  # aynı dersin asıl saatiyle kıyaslarken dışla
    )
    if conflict:
        # Frontend bu hatayı yakalayacak ve "bu slot dolu" şeklinde uyarı gösterecek
        raise HTTPException(status_code=409, detail="Seçtiğiniz tarih/saatte başka bir dersiniz var")

    # 8) Override kaydını oluştur
    override_doc = {
        "id": str(uuid.uuid4()),
        "lesson_id": lesson_id,
        "teacher_id": current_user.id,
        "student_id": lesson["student_id"],
        "week_key": week_key,
        "original_date": payload.original_date,
        "new_date": payload.new_date,
        "new_start_time": payload.new_start_time,
        "new_end_time": payload.new_end_time,
        "reason": payload.reason,  # mazereti override içine de yaz
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lesson_overrides.insert_one(override_doc)

    # 9) Dashboard zaten override’ları bu hafta için okuyup,
    #    'moved_from_today' ve 'moved_to_today' mantığıyla gösteriyor.
    result.update({
        "message": "Ders yapılmadı olarak işaretlendi ve aynı hafta içinde 1 kerelik ertelendi",
        "rescheduled": True,
        "override_id": override_doc["id"]
    })
    return result


@api_router.post("/lessons/{lesson_id}/reschedule-once")
async def reschedule_lesson_once(
    lesson_id: str,
    payload: OneTimeRescheduleRequest,
    current_user: User = Depends(get_current_user)
):
    # 1) Check lesson ownership
    lesson = await db.lessons.find_one({'id': lesson_id, 'teacher_id': current_user.id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")

    # 2) Same ISO week rule
    if not _same_iso_week(payload.original_date, payload.new_date):
        raise HTTPException(status_code=400, detail="Erteleme aynı hafta içinde yapılmalı")

    # 3) Prevent duplicate override for the same lesson-week
    week_key = _iso_week_key(payload.original_date)
    existing = await db.lesson_overrides.find_one({
        "lesson_id": lesson_id,
        "week_key": week_key
    })
    if existing:
        raise HTTPException(status_code=409, detail="Bu ders için bu haftada zaten bir erteleme yapılmış")

    # 4) Check conflicts (regular lessons and other overrides)
    conflict = await _has_time_conflict_for_teacher(
        db=db,
        teacher_id=current_user.id,
        target_date=payload.new_date,
        start_time=payload.new_start_time,
        end_time=payload.new_end_time,
        exclude_lesson_id=lesson_id
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Seçtiğiniz tarih/saatte başka bir dersiniz var")

    # 5) Create override document
    override_doc = {
        "id": str(uuid.uuid4()),
        "lesson_id": lesson_id,
        "teacher_id": current_user.id,
        "student_id": lesson["student_id"],
        "week_key": week_key,
        "original_date": payload.original_date,
        "new_date": payload.new_date,
        "new_start_time": payload.new_start_time,
        "new_end_time": payload.new_end_time,
        "reason": payload.reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lesson_overrides.insert_one(override_doc)

    return {"message": "Ders aynı hafta içinde 1 kerelik ertelendi", "override_id": override_doc["id"]}

# ============ SESSION ROUTES ============

@api_router.post("/sessions", response_model=Session)
async def create_session(session_data: SessionCreate, current_user: User = Depends(get_current_user)):
    session_dict = session_data.model_dump()
    session_dict['id'] = str(uuid.uuid4())
    session_dict['teacher_id'] = current_user.id
    session_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.sessions.insert_one(session_dict)
    return Session(**session_dict)

@api_router.get("/sessions", response_model=List[Session])
async def get_sessions(student_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {'teacher_id': current_user.id}
    if student_id:
        query['student_id'] = student_id
    
    sessions = await db.sessions.find(query, {'_id': 0}).to_list(1000)
    return [Session(**s) for s in sessions]

@api_router.post("/sessions/upload-material")
async def upload_material(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = ROOT_DIR / 'static' / 'uploads' / 'materials' / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    material_url = f"/static/uploads/materials/{filename}"
    return {"material_path": material_url}

# ============ PAYMENT ROUTES ============

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: User = Depends(get_current_user)):
    payment_dict = payment_data.model_dump()
    payment_dict['id'] = str(uuid.uuid4())
    payment_dict['teacher_id'] = current_user.id
    payment_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.payments.insert_one(payment_dict)
    return Payment(**payment_dict)

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(student_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {'teacher_id': current_user.id}
    if student_id:
        query['student_id'] = student_id
    
    payments = await db.payments.find(query, {'_id': 0}).to_list(1000)
    return [Payment(**p) for p in payments]

@api_router.put("/payments/{payment_id}", response_model=Payment)
async def update_payment(payment_id: str, payment_data: PaymentCreate, current_user: User = Depends(get_current_user)):
    result = await db.payments.update_one(
        {'id': payment_id, 'teacher_id': current_user.id},
        {'$set': payment_data.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")
    
    updated_payment = await db.payments.find_one({'id': payment_id}, {'_id': 0})
    return Payment(**updated_payment)

@api_router.patch("/payments/{payment_id}/status")
async def update_payment_status(payment_id: str, status: str, current_user: User = Depends(get_current_user)):
    result = await db.payments.update_one(
        {'id': payment_id, 'teacher_id': current_user.id},
        {'$set': {'status': status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")
    
    updated_payment = await db.payments.find_one({'id': payment_id}, {'_id': 0})
    return Payment(**updated_payment)

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: User = Depends(get_current_user)):
    result = await db.payments.delete_one({'id': payment_id, 'teacher_id': current_user.id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")
    
    return {"message": "Ödeme silindi"}

# ============ REPORT ROUTES ============

@api_router.get("/reports/pdf/{student_id}")
async def generate_pdf_report(student_id: str, start_date: str = Query(...), end_date: str = Query(...), 
                             current_user: User = Depends(get_current_user)):
    # Get student
    student = await db.students.find_one({'id': student_id, 'teacher_id': current_user.id}, {'_id': 0})
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı")
    
    # Get lessons in date range
    lessons = await db.lessons.find({
        'student_id': student_id,
        'teacher_id': current_user.id
    }, {'_id': 0}).to_list(1000)
    
    # Get sessions in date range
    sessions = await db.sessions.find({
        'student_id': student_id,
        'teacher_id': current_user.id,
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(1000)
    
    # Get payments in date range
    payments = await db.payments.find({
        'student_id': student_id,
        'teacher_id': current_user.id,
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(1000)
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Check if Turkish font is available
    try:
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontName='DejaVuSans',
            fontSize=20,
            textColor=colors.HexColor('#9333ea'),
            spaceAfter=30,
            alignment=1  # Center
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontName='DejaVuSans',
            fontSize=10
        )
        
        table_style_font = 'DejaVuSans'
    except:
        # Fallback to Helvetica if DejaVuSans not available
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#9333ea'),
            spaceAfter=30,
            alignment=1
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10
        )
        
        table_style_font = 'Helvetica'
    
    # Title
    title = Paragraph(f"Veli Raporu — {student['full_name']}", title_style)
    elements.append(title)
    
    # Date range
    date_text = Paragraph(f"Tarih Aralığı: {start_date} - {end_date}", normal_style)
    elements.append(date_text)
    elements.append(Spacer(1, 0.5*cm))
    
    # Student info
    info_text = Paragraph(f"<b>Öğrenci:</b> {student['full_name']}<br/><b>Sınıf:</b> {student.get('grade', 'Belirtilmemiş')}", normal_style)
    elements.append(info_text)
    elements.append(Spacer(1, 0.5*cm))
    
    # Lessons table
    if lessons:
        elements.append(Paragraph("<b>Dersler ve Notlar</b>", normal_style))
        elements.append(Spacer(1, 0.3*cm))
        
        lesson_data = [['Gün', 'Saat', 'Konu', 'Durum', 'Not']]
        days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
        
        for lesson in lessons:
            status_text = ''
            if lesson['status'] == 'completed':
                status_text = 'Tamamlandı'
            elif lesson['status'] == 'not_attended':
                status_text = 'Yapılmadı'
            elif lesson['status'] == 'cancelled':
                status_text = 'İptal'
            else:
                status_text = 'Planlandı'
                
            lesson_data.append([
                days[lesson['day_of_week']],
                f"{lesson['start_time']}-{lesson['end_time']}",
                lesson.get('topic', '-'),
                status_text,
                lesson.get('note', '-')
            ])
        
        lesson_table = Table(lesson_data, colWidths=[2.5*cm, 2.5*cm, 4*cm, 2.5*cm, 5*cm])
        lesson_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#9333ea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), table_style_font),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(lesson_table)
        elements.append(Spacer(1, 0.5*cm))
    
    # Sessions table
    if sessions:
        elements.append(Paragraph("<b>Ders Detayları</b>", normal_style))
        elements.append(Spacer(1, 0.3*cm))
        
        session_data = [['Tarih', 'Konu', 'Değerlendirme']]
        for session in sessions:
            session_data.append([
                session['date'],
                session.get('topic', '-'),
                session.get('evaluation', '-')
            ])
        
        session_table = Table(session_data, colWidths=[3*cm, 7*cm, 7*cm])
        session_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#db2777')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), table_style_font),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(session_table)
        elements.append(Spacer(1, 0.5*cm))
    
    # Summary
    total_lessons = len([l for l in lessons if l['status'] in ['completed', 'not_attended']])
    total_paid = sum([p['amount'] for p in payments if p['status'] == 'Ödendi'])
    total_pending = sum([p['amount'] for p in payments if p['status'] == 'Beklemede'])
    
    summary_text = f"""<b>Özet</b><br/>
    Toplam Ders: {total_lessons}<br/>
    Ödenen: {total_paid} TL<br/>
    Bekleyen: {total_pending} TL
    """
    elements.append(Paragraph(summary_text, normal_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    # Use ASCII-safe filename
    from urllib.parse import quote
    filename = f"rapor_{student['id']}.pdf"
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"
        }
    )

@api_router.post("/reports/email/{student_id}")
async def email_report(student_id: str, start_date: str = Query(...), end_date: str = Query(...),
                      current_user: User = Depends(get_current_user)):
    # Get student
    student = await db.students.find_one({'id': student_id, 'teacher_id': current_user.id}, {'_id': 0})
    if not student or not student.get('guardian_email'):
        raise HTTPException(status_code=400, detail="Öğrenci bulunamadı veya veli email adresi yok")
    
    # Generate PDF (reuse the logic)
    lessons = await db.lessons.find({
        'student_id': student_id,
        'teacher_id': current_user.id
    }, {'_id': 0}).to_list(1000)
    
    sessions = await db.sessions.find({
        'student_id': student_id,
        'teacher_id': current_user.id,
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(1000)
    
    payments = await db.payments.find({
        'student_id': student_id,
        'teacher_id': current_user.id,
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(1000)
    
    total_lessons = len([l for l in lessons if l['status'] in ['completed', 'not_attended']])
    total_paid = sum([p['amount'] for p in payments if p['status'] == 'Ödendi'])
    total_pending = sum([p['amount'] for p in payments if p['status'] == 'Beklemede'])
    
    # Create lessons summary with notes
    lessons_text = ""
    days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
    for lesson in lessons:
        status_text = 'Tamamlandı' if lesson['status'] == 'completed' else 'Yapılmadı' if lesson['status'] == 'not_attended' else 'Planlandı'
        lessons_text += f"\n{days[lesson['day_of_week']]} {lesson['start_time']}-{lesson['end_time']}: {lesson.get('topic', 'Konu yok')} - {status_text}"
        if lesson.get('note'):
            lessons_text += f" (Not: {lesson['note']})"
    
    email_body = f"""
    Sayın {student.get('guardian_name', 'Veli')},
    
    {student['full_name']} için {start_date} - {end_date} tarih aralığındaki rapor:
    
    DERSLER:{lessons_text if lessons_text else " Henüz ders kaydı yok"}
    
    ÖZET:
    Toplam Ders: {total_lessons}
    Ödenen: {total_paid} TL
    Bekleyen Ödeme: {total_pending} TL
    
    Detaylı rapor için lütfen öğretmeniniz ile iletişime geçin.
    
    Saygılarımızla,
    {current_user.full_name}
    Mentra
    """
    
    message = MessageSchema(
        subject=f"Mentra - {student['full_name']} Öğrenci Raporu",
        recipients=[student['guardian_email']],
        body=email_body,
        subtype="plain"
    )
    
    try:
        await fastmail.send_message(message)
        return {"message": "Rapor veliye email ile gönderildi"}
    except Exception as e:
        logger.error(f"Email gönderme hatası: {e}")
        raise HTTPException(status_code=500, detail="Email gönderilemedi")

# ============ SOCIAL FEATURES ============

# Posts
@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, current_user: User = Depends(get_current_user)):
    post_dict = post_data.model_dump()
    post_dict['id'] = str(uuid.uuid4())
    post_dict['author_id'] = current_user.id
    post_dict['author_name'] = current_user.full_name
    post_dict['author_username'] = current_user.username
    post_dict['author_avatar'] = current_user.avatar
    post_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.posts.insert_one(post_dict)
    return Post(**post_dict)

@api_router.get("/posts", response_model=List[Post])
async def get_posts(username: Optional[str] = None, limit: int = 20):
    query = {}
    if username:
        user = await db.users.find_one({'username': username}, {'_id': 0})
        if user:
            query['author_id'] = user['id']
    
    posts = await db.posts.find(query, {'_id': 0}).sort('created_at', -1).limit(limit).to_list(limit)
    return [Post(**p) for p in posts]

@api_router.get("/posts/{post_id}", response_model=Post)
async def get_post_detail(post_id: str, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({'id': post_id}, {'_id': 0})
    if not post:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı")
    return Post(**post)

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: User = Depends(get_current_user)):
    result = await db.posts.delete_one({'id': post_id, 'author_id': current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post bulunamadı veya yetkiniz yok")
    return {"message": "Post silindi"}

# Feed (Posts + News)
@api_router.get("/feed")
async def get_feed(type: str = "all", limit: int = 20, current_user: User = Depends(get_current_user)):
    feed_items = []
    
    if type in ["all", "posts"]:
        posts = await db.posts.find({}, {'_id': 0}).sort('created_at', -1).limit(limit).to_list(limit)
        for post in posts:
            # Get likes and comments count
            likes_count = await db.likes.count_documents({'post_id': post['id']})
            comments_count = await db.comments.count_documents({'post_id': post['id']})
            feed_items.append({**post, 'type': 'post', 'likes_count': likes_count, 'comments_count': comments_count})
    
    if type in ["all", "news"]:
        news = await db.news.find({'status': 'published'}, {'_id': 0}).sort('published_at', -1).limit(limit).to_list(limit)
        for item in news:
            # Get likes and comments count for news
            likes_count = await db.likes.count_documents({'news_id': item['id']})
            comments_count = await db.comments.count_documents({'news_id': item['id']})
            feed_items.append({**item, 'type': 'news', 'likes_count': likes_count, 'comments_count': comments_count})
    
    # Sort by date
    feed_items.sort(key=lambda x: x.get('created_at') or x.get('published_at'), reverse=True)
    
    return feed_items[:limit]

# Search Users
@api_router.get("/search/users")
async def search_users(q: str):
    if not q or len(q) < 2:
        return []
    
    # Search by name or username
    users = await db.users.find({
        '$or': [
            {'full_name': {'$regex': q, '$options': 'i'}},
            {'username': {'$regex': q, '$options': 'i'}}
        ]
    }, {'_id': 0, 'password': 0}).limit(10).to_list(10)
    
    return users

# Profile
@api_router.get("/users/{username}")
async def get_user_profile(username: str):
    user = await db.users.find_one({'username': username}, {'_id': 0, 'password': 0})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Get user's posts
    posts = await db.posts.find({'author_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(20)
    
    # Get follower count
    follower_count = await db.follows.count_documents({'followed_id': user['id']})
    following_count = await db.follows.count_documents({'follower_id': user['id']})
    
    return {
        'user': user,
        'posts': posts,
        'follower_count': follower_count,
        'following_count': following_count
    }

@api_router.get("/users/{user_id}/followers")
async def get_user_followers(user_id: str):
    # Get all followers
    follows = await db.follows.find({'followed_id': user_id}, {'_id': 0}).to_list(1000)
    
    # Get follower user details
    followers = []
    for follow in follows:
        user = await db.users.find_one({'id': follow['follower_id']}, {'_id': 0, 'password': 0})
        if user:
            followers.append(user)
    
    return followers

@api_router.get("/users/{user_id}/following")
async def get_user_following(user_id: str):
    # Get all following
    follows = await db.follows.find({'follower_id': user_id}, {'_id': 0}).to_list(1000)
    
    # Get following user details
    following = []
    for follow in follows:
        user = await db.users.find_one({'id': follow['followed_id']}, {'_id': 0, 'password': 0})
        if user:
            following.append(user)
    
    return following

@api_router.patch("/users/me")
async def update_profile(bio: Optional[str] = None, current_user: User = Depends(get_current_user)):
    update_data = {}
    if bio is not None:
        update_data['bio'] = bio
    
    if update_data:
        await db.users.update_one({'id': current_user.id}, {'$set': update_data})
    
    updated_user = await db.users.find_one({'id': current_user.id}, {'_id': 0, 'password': 0})
    return updated_user

# Follow System
@api_router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, current_user: User = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendinizi takip edemezsiniz")
    
    # Check if already following
    existing = await db.follows.find_one({
        'follower_id': current_user.id,
        'followed_id': user_id
    })
    
    if existing:
        return {"message": "Zaten takip ediyorsunuz"}
    
    follow_dict = {
        'id': str(uuid.uuid4()),
        'follower_id': current_user.id,
        'followed_id': user_id,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.follows.insert_one(follow_dict)
    
    # Create notification
    notification_dict = {
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'type': 'follow',
        'actor_id': current_user.id,
        'actor_name': current_user.full_name,
        'actor_username': current_user.username,
        'actor_avatar': current_user.avatar,
        'post_id': None,
        'content': None,
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_dict)
    
    return {"message": "Takip edildi"}

@api_router.delete("/users/{user_id}/follow")
async def unfollow_user(user_id: str, current_user: User = Depends(get_current_user)):
    result = await db.follows.delete_one({
        'follower_id': current_user.id,
        'followed_id': user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Takip bulunamadı")
    
    return {"message": "Takipten çıkıldı"}

@api_router.get("/users/{user_id}/is-following")
async def check_following(user_id: str, current_user: User = Depends(get_current_user)):
    follow = await db.follows.find_one({
        'follower_id': current_user.id,
        'followed_id': user_id
    })
    return {"is_following": follow is not None}

# Messaging
@api_router.get("/threads")
async def get_threads(current_user: User = Depends(get_current_user)):
    threads = await db.threads.find({
        'participants': current_user.id
    }, {'_id': 0}).sort('last_message_at', -1).to_list(50)
    
    # Get last message for each thread
    for thread in threads:
        last_msg = await db.messages.find_one(
            {'thread_id': thread['id']},
            {'_id': 0},
            sort=[('created_at', -1)]
        )
        thread['last_message'] = last_msg
        
        # Get other participant info
        other_id = [p for p in thread['participants'] if p != current_user.id][0]
        other_user = await db.users.find_one({'id': other_id}, {'_id': 0, 'password': 0})
        thread['other_user'] = other_user
    
    return threads

@api_router.post("/threads")
async def create_or_get_thread(recipient_id: str, current_user: User = Depends(get_current_user)):
    if recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendinize mesaj gönderemezsiniz")
    
    # Check if thread already exists
    existing = await db.threads.find_one({
        'participants': {'$all': [current_user.id, recipient_id]}
    }, {'_id': 0})
    
    if existing:
        return existing
    
    # Create new thread
    thread_dict = {
        'id': str(uuid.uuid4()),
        'participants': [current_user.id, recipient_id],
        'last_message_at': datetime.now(timezone.utc).isoformat(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.threads.insert_one(thread_dict)
    return thread_dict

@api_router.get("/threads/{thread_id}/messages", response_model=List[Message])
async def get_messages(thread_id: str, current_user: User = Depends(get_current_user)):
    # Verify user is participant
    thread = await db.threads.find_one({'id': thread_id})
    if not thread or current_user.id not in thread['participants']:
        raise HTTPException(status_code=403, detail="Bu konuşmaya erişim yetkiniz yok")
    
    messages = await db.messages.find({'thread_id': thread_id}, {'_id': 0}).sort('created_at', 1).to_list(100)
    return [Message(**m) for m in messages]

@api_router.post("/threads/{thread_id}/messages", response_model=Message)
async def send_message(thread_id: str, message_data: MessageBase, current_user: User = Depends(get_current_user)):
    # Verify thread
    thread = await db.threads.find_one({'id': thread_id})
    if not thread or current_user.id not in thread['participants']:
        raise HTTPException(status_code=403, detail="Bu konuşmaya erişim yetkiniz yok")
    
    message_dict = message_data.model_dump()
    message_dict['id'] = str(uuid.uuid4())
    message_dict['thread_id'] = thread_id
    message_dict['sender_id'] = current_user.id
    message_dict['sender_name'] = current_user.full_name
    message_dict['sender_avatar'] = current_user.avatar
    message_dict['read_by'] = [current_user.id]
    message_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.messages.insert_one(message_dict)
    
    # Update thread last_message_at
    await db.threads.update_one(
        {'id': thread_id},
        {'$set': {'last_message_at': message_dict['created_at']}}
    )
    
    return Message(**message_dict)

@api_router.post("/threads/{thread_id}/read")
async def mark_as_read(thread_id: str, current_user: User = Depends(get_current_user)):
    await db.messages.update_many(
        {'thread_id': thread_id, 'sender_id': {'$ne': current_user.id}},
        {'$addToSet': {'read_by': current_user.id}}
    )
    return {"message": "Mesajlar okundu olarak işaretlendi"}

# Admin News
@api_router.get("/admin/news")
async def get_all_news(current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekli")
    
    news = await db.news.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return news

@api_router.post("/admin/news", response_model=News)
async def create_news(news_data: NewsCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekli")
    
    news_dict = news_data.model_dump()
    news_dict['id'] = str(uuid.uuid4())
    news_dict['author_id'] = current_user.id
    news_dict['published_at'] = datetime.now(timezone.utc).isoformat() if news_dict['status'] == 'published' else None
    news_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    news_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.news.insert_one(news_dict)
    return News(**news_dict)

@api_router.patch("/admin/news/{news_id}", response_model=News)
async def update_news(news_id: str, news_data: NewsCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekli")
    
    update_dict = news_data.model_dump()
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_dict['status'] == 'published':
        existing = await db.news.find_one({'id': news_id})
        if existing and not existing.get('published_at'):
            update_dict['published_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.news.update_one({'id': news_id}, {'$set': update_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Haber bulunamadı")
    
    updated_news = await db.news.find_one({'id': news_id}, {'_id': 0})
    return News(**updated_news)

@api_router.delete("/admin/news/{news_id}")
async def delete_news(news_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekli")
    
    result = await db.news.delete_one({'id': news_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Haber bulunamadı")
    
    return {"message": "Haber silindi"}

@api_router.get("/news/{news_id}")
async def get_news_detail(news_id: str):
    news = await db.news.find_one({'id': news_id, 'status': 'published'}, {'_id': 0})
    if not news:
        raise HTTPException(status_code=404, detail="Haber bulunamadı")
    return News(**news)

# ============ LIKES & COMMENTS ============

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, current_user: User = Depends(get_current_user)):
    # Check if already liked
    existing = await db.likes.find_one({'post_id': post_id, 'user_id': current_user.id})
    if existing:
        # Unlike
        await db.likes.delete_one({'post_id': post_id, 'user_id': current_user.id})
        return {"message": "Beğeni kaldırıldı", "liked": False}
    
    # Like
    like_dict = {
        'id': str(uuid.uuid4()),
        'post_id': post_id,
        'user_id': current_user.id,
        'user_name': current_user.full_name,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.likes.insert_one(like_dict)
    
    # Create notification for post author
    post = await db.posts.find_one({'id': post_id})
    if post and post['author_id'] != current_user.id:
        notification_dict = {
            'id': str(uuid.uuid4()),
            'user_id': post['author_id'],
            'type': 'like',
            'actor_id': current_user.id,
            'actor_name': current_user.full_name,
            'actor_username': current_user.username,
            'actor_avatar': current_user.avatar,
            'post_id': post_id,
            'content': None,
            'read': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_dict)
    
    return {"message": "Beğenildi", "liked": True}

@api_router.get("/posts/{post_id}/likes")
async def get_post_likes(post_id: str):
    likes = await db.likes.find({'post_id': post_id}, {'_id': 0}).to_list(1000)
    return likes

@api_router.post("/posts/{post_id}/comments")
async def create_comment(post_id: str, comment: CommentBase, current_user: User = Depends(get_current_user)):
    comment_dict = {
        'id': str(uuid.uuid4()),
        'post_id': post_id,
        'user_id': current_user.id,
        'user_name': current_user.full_name,
        'user_avatar': current_user.avatar,
        'content': comment.content,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment_dict)
    
    # Create notification for post author
    post = await db.posts.find_one({'id': post_id})
    if post and post['author_id'] != current_user.id:
        notification_dict = {
            'id': str(uuid.uuid4()),
            'user_id': post['author_id'],
            'type': 'comment',
            'actor_id': current_user.id,
            'actor_name': current_user.full_name,
            'actor_username': current_user.username,
            'actor_avatar': current_user.avatar,
            'post_id': post_id,
            'content': comment.content[:50],
            'read': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_dict)
    
    return Comment(**comment_dict)

@api_router.get("/posts/{post_id}/comments")
async def get_post_comments(post_id: str):
    comments = await db.comments.find({'post_id': post_id}, {'_id': 0}).sort('created_at', 1).to_list(1000)
    return [Comment(**c) for c in comments]

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    result = await db.comments.delete_one({'id': comment_id, 'user_id': current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    return {"message": "Yorum silindi"}

# News Likes & Comments
@api_router.post("/news/{news_id}/like")
async def like_news(news_id: str, current_user: User = Depends(get_current_user)):
    # Check if already liked
    existing = await db.likes.find_one({'user_id': current_user.id, 'news_id': news_id})
    
    if existing:
        # Unlike
        await db.likes.delete_one({'user_id': current_user.id, 'news_id': news_id})
        return {"message": "Beğeni kaldırıldı"}
    
    # Like
    like_dict = {
        'id': str(uuid.uuid4()),
        'user_id': current_user.id,
        'user_name': current_user.full_name,
        'user_avatar': current_user.avatar,
        'news_id': news_id,
        'post_id': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.likes.insert_one(like_dict)
    return {"message": "Beğenildi"}

@api_router.get("/news/{news_id}/likes")
async def get_news_likes(news_id: str):
    likes = await db.likes.find({'news_id': news_id}, {'_id': 0}).to_list(10000)
    return likes

@api_router.post("/news/{news_id}/comments")
async def create_news_comment(news_id: str, comment: CommentCreate, current_user: User = Depends(get_current_user)):
    comment_dict = {
        'id': str(uuid.uuid4()),
        'user_id': current_user.id,
        'user_name': current_user.full_name,
        'user_avatar': current_user.avatar,
        'news_id': news_id,
        'post_id': None,
        'content': comment.text,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment_dict)
    return Comment(**comment_dict)

@api_router.get("/news/{news_id}/comments")
async def get_news_comments(news_id: str):
    comments = await db.comments.find({'news_id': news_id}, {'_id': 0}).sort('created_at', 1).to_list(1000)
    return [Comment(**c) for c in comments]

# ============ NOTIFICATIONS ============

@api_router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {'user_id': current_user.id},
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    return notifications

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    await db.notifications.update_one(
        {'id': notification_id, 'user_id': current_user.id},
        {'$set': {'read': True}}
    )
    return {"message": "Okundu"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    await db.notifications.update_many(
        {'user_id': current_user.id, 'read': False},
        {'$set': {'read': True}}
    )
    return {"message": "Tümü okundu"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: User = Depends(get_current_user)):
    count = await db.notifications.count_documents({'user_id': current_user.id, 'read': False})
    return {"count": count}

# ============ SETUP ============

app.mount("/static", StaticFiles(directory=str(ROOT_DIR / "static")), name="static")
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def ensure_indexes():
    try:
        await db.lesson_overrides.create_index([("lesson_id", 1), ("week_key", 1)], unique=True)
        await db.lesson_overrides.create_index([("teacher_id", 1), ("new_date", 1)])
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()