from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import socketio
import resend
import asyncio
import secrets
import string
import uuid
import aiofiles
from jose import JWTError, jwt
from passlib.context import CryptContext
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

UPLOAD_DIR = Path(__file__).parent / "uploads" / "events"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'secret')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
resend.api_key = RESEND_API_KEY

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    username: str
    email: EmailStr
    bio: Optional[str] = ""
    profile_pic: Optional[str] = ""
    cover_pic: Optional[str] = ""
    wallet_balance: float = 0.0
    unique_payment_reference: str
    online_status: str = "offline"
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    role: int = 0
    email_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    bio: Optional[str] = None
    profile_pic: Optional[str] = None
    cover_pic: Optional[str] = None

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    post_id: str
    user_id: str
    username: str
    profile_pic: Optional[str] = ""
    content: str
    image_base64: Optional[str] = ""
    reaction_count: int = 0
    comment_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PostCreate(BaseModel):
    content: str
    image_base64: Optional[str] = ""

class Reaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reaction_id: str
    post_id: str
    user_id: str
    username: str
    reaction_type: str = "like"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReactionCreate(BaseModel):
    reaction_type: str = "like"

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    comment_id: str
    post_id: str
    user_id: str
    username: str
    profile_pic: Optional[str] = ""
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    content: str

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str
    user_id: str
    username: str
    title: str
    description: str
    date: datetime
    city: str
    entry_fee: float
    is_official: bool = False
    image_base64: Optional[str] = ""
    status: str = "pending"
    highlighted: bool = False
    highlighted_pending: bool = False
    going_count: int = 0
    not_going_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    title: str
    description: str
    date: datetime
    city: str
    entry_fee: float
    is_official: bool = False
    image_base64: Optional[str] = ""

class RSVP(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rsvp_id: str
    event_id: str
    user_id: str
    status: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RSVPCreate(BaseModel):
    status: str

class FriendRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str
    from_user_id: str
    to_user_id: str
    from_username: str
    to_username: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_id: str
    user_id: str
    username: str
    amount: float
    payment_method: str
    unique_reference: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    amount: float
    payment_method: str

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str
    from_user_id: str
    to_user_id: str
    content: str
    read_status: bool = False
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def generate_unique_reference():
    return 'AUTO-' + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

def generate_user_id():
    return 'user_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != 1:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
fastapi_app = FastAPI()

# Mount static files for uploaded images
fastapi_app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

active_users = {}

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    if sid in active_users:
        user_id = active_users[sid]
        del active_users[sid]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"online_status": "offline", "last_seen": datetime.now(timezone.utc).isoformat()}}
        )
        await sio.emit('user_status_change', {"user_id": user_id, "status": "offline"}, skip_sid=sid)
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    user_id = data.get("user_id")
    if not user_id:
        return
    active_users[sid] = user_id
    await sio.enter_room(sid, user_id)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"online_status": "online"}}
    )
    await sio.emit('user_status_change', {"user_id": user_id, "status": "online"}, skip_sid=sid)
    logger.info(f"User {user_id} joined room")

@sio.event
async def send_message(sid, data):
    from_user_id = data.get("from_user_id")
    to_user_id = data.get("to_user_id")
    content = data.get("content")
    
    message_id = 'msg_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    message_data = {
        "message_id": message_id,
        "from_user_id": from_user_id,
        "to_user_id": to_user_id,
        "content": content,
        "read_status": False,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(message_data.copy())
    await sio.emit('receive_message', message_data, room=to_user_id)
    await sio.emit('receive_message', message_data, room=from_user_id)

@sio.event
async def typing(sid, data):
    to_user_id = data.get("to_user_id")
    from_user_id = data.get("from_user_id")
    await sio.emit('typing_indicator', {"from_user_id": from_user_id}, room=to_user_id)

@fastapi_app.post("/api/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"$or": [{"email": user_data.email}, {"username": user_data.username}]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email vagy felhasználónév már létezik")
    
    user_id = generate_user_id()
    payment_ref = generate_unique_reference()
    verification_token = secrets.token_urlsafe(32)
    
    user_doc = {
        "user_id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "bio": "",
        "profile_pic": "",
        "cover_pic": "",
        "wallet_balance": 0.0,
        "unique_payment_reference": payment_ref,
        "online_status": "offline",
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "role": 0,
        "email_verified": False,
        "verification_token": verification_token,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc.copy())
    
    verification_link = f"https://car-social-4.preview.emergentagent.com/api/auth/verify-email/{verification_token}"
    email_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Üdvözlünk a TuningTalálkozón!</h2>
        <p>Köszönjük a regisztrációt. Kattints az alábbi linkre az email cím megerősítéséhez:</p>
        <a href="{verification_link}" style="display: inline-block; padding: 10px 20px; background: #FF5722; color: white; text-decoration: none; border-radius: 5px;">Email megerősítése</a>
        <p>Ha nem te regisztráltál, kérjük figyelmen kívül hagyni ezt az emailt.</p>
        <p>Üdvözlettel,<br>TuningTalálkozó csapata</p>
    </body>
    </html>
    """
    
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [user_data.email],
            "subject": "Email megerősítés - TuningTalálkozó",
            "html": email_html
        })
    except Exception as e:
        logger.error(f"Email küldési hiba: {e}")
    
    token = create_access_token({"sub": user_id})
    return {"token": token, "user_id": user_id, "unique_payment_reference": payment_ref}

@fastapi_app.get("/api/auth/verify-email/{token}")
async def verify_email(token: str):
    from fastapi.responses import RedirectResponse
    
    user = await db.users.find_one({"verification_token": token}, {"_id": 0})
    if not user:
        # Redirect to frontend with error
        return RedirectResponse(url="https://car-social-4.preview.emergentagent.com/?verified=error")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"email_verified": True}, "$unset": {"verification_token": ""}}
    )
    
    # Redirect to frontend login page with success message
    return RedirectResponse(url="https://car-social-4.preview.emergentagent.com/?verified=success")

@fastapi_app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Hibás email vagy jelszó")
    
    if not user.get("email_verified", False):
        raise HTTPException(status_code=403, detail="Email cím nincs megerősítve. Kérjük ellenőrizd az email fiókodat!")
    
    token = create_access_token({"sub": user["user_id"]})
    user.pop("password_hash", None)
    user.pop("verification_token", None)
    return {"token": token, "user": user}

@fastapi_app.get("/api/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@fastapi_app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0, "verification_token": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    return User(**user)

@fastapi_app.put("/api/users/profile")
async def update_profile(update_data: UserProfileUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        return {"message": "Nincs frissítendő adat"}
    
    await db.users.update_one({"user_id": current_user.user_id}, {"$set": update_dict})
    return {"message": "Profil frissítve"}

@fastapi_app.get("/api/users/search/{query}")
async def search_users(query: str, current_user: User = Depends(get_current_user)):
    users = await db.users.find(
        {"username": {"$regex": query, "$options": "i"}},
        {"_id": 0, "user_id": 1, "username": 1, "profile_pic": 1}
    ).limit(10).to_list(10)
    
    # Add friendship status for each user
    for user in users:
        if user["user_id"] == current_user.user_id:
            user["friendship_status"] = "self"
        else:
            friend_request = await db.friend_requests.find_one({
                "$or": [
                    {"from_user_id": current_user.user_id, "to_user_id": user["user_id"]},
                    {"from_user_id": user["user_id"], "to_user_id": current_user.user_id}
                ]
            }, {"_id": 0, "status": 1})
            
            if friend_request:
                user["friendship_status"] = friend_request["status"]
            else:
                user["friendship_status"] = "none"
    
    return users

@fastapi_app.post("/api/friends/request")
async def send_friend_request(to_user_id: str, current_user: User = Depends(get_current_user)):
    if to_user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Nem küldhetsz ismerős kérést önmagadnak")
    
    # Check if already friends
    already_friends = await db.friend_requests.find_one({
        "$or": [
            {"from_user_id": current_user.user_id, "to_user_id": to_user_id, "status": "accepted"},
            {"from_user_id": to_user_id, "to_user_id": current_user.user_id, "status": "accepted"}
        ]
    }, {"_id": 0})
    
    if already_friends:
        raise HTTPException(status_code=400, detail="Már ismerősök vagytok")
    
    existing = await db.friend_requests.find_one({
        "$or": [
            {"from_user_id": current_user.user_id, "to_user_id": to_user_id, "status": "pending"},
            {"from_user_id": to_user_id, "to_user_id": current_user.user_id, "status": "pending"}
        ]
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Már létezik függőben lévő kérés")
    
    to_user = await db.users.find_one({"user_id": to_user_id}, {"_id": 0, "username": 1})
    if not to_user:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    request_id = 'req_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    request_doc = {
        "request_id": request_id,
        "from_user_id": current_user.user_id,
        "to_user_id": to_user_id,
        "from_username": current_user.username,
        "to_username": to_user["username"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.friend_requests.insert_one(request_doc.copy())
    return {"message": "Ismerős kérés elküldve", "request_id": request_id}

@fastapi_app.put("/api/friends/accept/{request_id}")
async def accept_friend_request(request_id: str, current_user: User = Depends(get_current_user)):
    request = await db.friend_requests.find_one({"request_id": request_id, "to_user_id": current_user.user_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Kérés nem található")
    
    await db.friend_requests.update_one({"request_id": request_id}, {"$set": {"status": "accepted"}})
    return {"message": "Ismerős elfogadva"}

@fastapi_app.put("/api/friends/reject/{request_id}")
async def reject_friend_request(request_id: str, current_user: User = Depends(get_current_user)):
    request = await db.friend_requests.find_one({"request_id": request_id, "to_user_id": current_user.user_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Kérés nem található")
    
    await db.friend_requests.update_one({"request_id": request_id}, {"$set": {"status": "rejected"}})
    return {"message": "Ismerős elutasítva"}

@fastapi_app.get("/api/friends/pending")
async def get_pending_requests(current_user: User = Depends(get_current_user)):
    requests = await db.friend_requests.find(
        {"to_user_id": current_user.user_id, "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    return requests

@fastapi_app.get("/api/friends/list")
async def get_friends(current_user: User = Depends(get_current_user)):
    requests = await db.friend_requests.find(
        {
            "$or": [
                {"from_user_id": current_user.user_id, "status": "accepted"},
                {"to_user_id": current_user.user_id, "status": "accepted"}
            ]
        },
        {"_id": 0}
    ).to_list(1000)
    
    friend_ids = []
    for req in requests:
        if req["from_user_id"] == current_user.user_id:
            friend_ids.append(req["to_user_id"])
        else:
            friend_ids.append(req["from_user_id"])
    
    friends = await db.users.find(
        {"user_id": {"$in": friend_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "profile_pic": 1, "online_status": 1, "last_seen": 1}
    ).to_list(1000)
    
    return friends

@fastapi_app.get("/api/friends/status/{target_user_id}")
async def get_friendship_status(target_user_id: str, current_user: User = Depends(get_current_user)):
    """Get friendship status between current user and target user"""
    if target_user_id == current_user.user_id:
        return {"status": "self"}
    
    friend_request = await db.friend_requests.find_one({
        "$or": [
            {"from_user_id": current_user.user_id, "to_user_id": target_user_id},
            {"from_user_id": target_user_id, "to_user_id": current_user.user_id}
        ]
    }, {"_id": 0, "status": 1})
    
    if friend_request:
        return {"status": friend_request["status"]}
    return {"status": "none"}

@fastapi_app.post("/api/posts", response_model=Post)
async def create_post(post_data: PostCreate, current_user: User = Depends(get_current_user)):
    post_id = 'post_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    post_doc = {
        "post_id": post_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "profile_pic": current_user.profile_pic,
        "content": post_data.content,
        "image_base64": post_data.image_base64,
        "reaction_count": 0,
        "comment_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posts.insert_one(post_doc.copy())
    if isinstance(post_doc["created_at"], str):
        post_doc["created_at"] = datetime.fromisoformat(post_doc["created_at"])
    return Post(**post_doc)

@fastapi_app.get("/api/posts/feed", response_model=List[Post])
async def get_feed(current_user: User = Depends(get_current_user)):
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    for post in posts:
        if isinstance(post["created_at"], str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
    return [Post(**post) for post in posts]

@fastapi_app.get("/api/posts/user/{user_id}", response_model=List[Post])
async def get_user_posts(user_id: str, current_user: User = Depends(get_current_user)):
    posts = await db.posts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for post in posts:
        if isinstance(post["created_at"], str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
    return [Post(**post) for post in posts]

@fastapi_app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Bejegyzés nem található")
    
    if post["user_id"] != current_user.user_id and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    
    await db.posts.delete_one({"post_id": post_id})
    await db.reactions.delete_many({"post_id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    return {"message": "Bejegyzés törölve"}

@fastapi_app.post("/api/posts/{post_id}/react")
async def react_to_post(post_id: str, reaction_data: ReactionCreate, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Bejegyzés nem található")
    
    existing = await db.reactions.find_one({"post_id": post_id, "user_id": current_user.user_id}, {"_id": 0})
    
    if existing:
        await db.reactions.update_one(
            {"post_id": post_id, "user_id": current_user.user_id},
            {"$set": {"reaction_type": reaction_data.reaction_type}}
        )
        return {"message": "Reakció frissítve"}
    else:
        reaction_id = 'react_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
        reaction_doc = {
            "reaction_id": reaction_id,
            "post_id": post_id,
            "user_id": current_user.user_id,
            "username": current_user.username,
            "reaction_type": reaction_data.reaction_type,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.reactions.insert_one(reaction_doc.copy())
        
        count = await db.reactions.count_documents({"post_id": post_id})
        await db.posts.update_one({"post_id": post_id}, {"$set": {"reaction_count": count}})
        
        return {"message": "Reakció hozzáadva", "reaction_id": reaction_id}

@fastapi_app.get("/api/posts/{post_id}/reactions")
async def get_post_reactions(post_id: str, current_user: User = Depends(get_current_user)):
    reactions = await db.reactions.find({"post_id": post_id}, {"_id": 0}).to_list(1000)
    return reactions

@fastapi_app.post("/api/posts/{post_id}/comment", response_model=Comment)
async def add_comment(post_id: str, comment_data: CommentCreate, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Bejegyzés nem található")
    
    comment_id = 'comment_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    comment_doc = {
        "comment_id": comment_id,
        "post_id": post_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "profile_pic": current_user.profile_pic,
        "content": comment_data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.comments.insert_one(comment_doc.copy())
    
    count = await db.comments.count_documents({"post_id": post_id})
    await db.posts.update_one({"post_id": post_id}, {"$set": {"comment_count": count}})
    
    if isinstance(comment_doc["created_at"], str):
        comment_doc["created_at"] = datetime.fromisoformat(comment_doc["created_at"])
    return Comment(**comment_doc)

@fastapi_app.get("/api/posts/{post_id}/comments", response_model=List[Comment])
async def get_post_comments(post_id: str, current_user: User = Depends(get_current_user)):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    for comment in comments:
        if isinstance(comment["created_at"], str):
            comment["created_at"] = datetime.fromisoformat(comment["created_at"])
    return [Comment(**comment) for comment in comments]

@fastapi_app.delete("/api/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    comment = await db.comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Komment nem található")
    
    if comment["user_id"] != current_user.user_id and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    
    await db.comments.delete_one({"comment_id": comment_id})
    
    count = await db.comments.count_documents({"post_id": comment["post_id"]})
    await db.posts.update_one({"post_id": comment["post_id"]}, {"$set": {"comment_count": count}})
    
    return {"message": "Komment törölve"}

@fastapi_app.post("/api/events", response_model=Event)
async def create_event(event_data: EventCreate, current_user: User = Depends(get_current_user)):
    event_id = 'event_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    event_doc = {
        "event_id": event_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "title": event_data.title,
        "description": event_data.description,
        "date": event_data.date.isoformat(),
        "city": event_data.city,
        "entry_fee": event_data.entry_fee,
        "is_official": event_data.is_official,
        "image_base64": event_data.image_base64,
        "status": "pending",
        "highlighted": False,
        "highlighted_pending": False,
        "going_count": 0,
        "not_going_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.events.insert_one(event_doc.copy())
    if isinstance(event_doc["date"], str):
        event_doc["date"] = datetime.fromisoformat(event_doc["date"])
    if isinstance(event_doc["created_at"], str):
        event_doc["created_at"] = datetime.fromisoformat(event_doc["created_at"])
    return Event(**event_doc)

@fastapi_app.get("/api/events", response_model=List[Event])
async def get_events(current_user: User = Depends(get_current_user)):
    if current_user.role == 1:
        events = await db.events.find({}, {"_id": 0}).sort("date", 1).to_list(100)
    else:
        events = await db.events.find({"status": "approved"}, {"_id": 0}).sort("date", 1).to_list(100)
    
    for event in events:
        if isinstance(event["date"], str):
            event["date"] = datetime.fromisoformat(event["date"])
        if isinstance(event["created_at"], str):
            event["created_at"] = datetime.fromisoformat(event["created_at"])
    return [Event(**event) for event in events]

@fastapi_app.get("/api/events/highlighted", response_model=List[Event])
async def get_highlighted_events(current_user: User = Depends(get_current_user)):
    events = await db.events.find(
        {"status": "approved", "highlighted": True},
        {"_id": 0}
    ).sort("date", 1).limit(5).to_list(5)
    
    for event in events:
        if isinstance(event["date"], str):
            event["date"] = datetime.fromisoformat(event["date"])
        if isinstance(event["created_at"], str):
            event["created_at"] = datetime.fromisoformat(event["created_at"])
    return [Event(**event) for event in events]

@fastapi_app.get("/api/events/{event_id}", response_model=Event)
async def get_event(event_id: str, current_user: User = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található")
    
    if event["status"] != "approved" and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Esemény még nem jóváhagyott")
    
    if isinstance(event["date"], str):
        event["date"] = datetime.fromisoformat(event["date"])
    if isinstance(event["created_at"], str):
        event["created_at"] = datetime.fromisoformat(event["created_at"])
    return Event(**event)

@fastapi_app.post("/api/events/{event_id}/rsvp")
async def rsvp_event(event_id: str, rsvp_data: RSVPCreate, current_user: User = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id, "status": "approved"}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található")
    
    existing = await db.rsvps.find_one({"event_id": event_id, "user_id": current_user.user_id}, {"_id": 0})
    
    if existing:
        await db.rsvps.update_one(
            {"event_id": event_id, "user_id": current_user.user_id},
            {"$set": {"status": rsvp_data.status}}
        )
    else:
        rsvp_id = 'rsvp_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
        rsvp_doc = {
            "rsvp_id": rsvp_id,
            "event_id": event_id,
            "user_id": current_user.user_id,
            "status": rsvp_data.status,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.rsvps.insert_one(rsvp_doc.copy())
    
    going_count = await db.rsvps.count_documents({"event_id": event_id, "status": "going"})
    not_going_count = await db.rsvps.count_documents({"event_id": event_id, "status": "not_going"})
    
    await db.events.update_one(
        {"event_id": event_id},
        {"$set": {"going_count": going_count, "not_going_count": not_going_count}}
    )
    
    return {"message": "RSVP rögzítve"}

@fastapi_app.post("/api/events/{event_id}/highlight")
async def highlight_event(event_id: str, current_user: User = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id, "user_id": current_user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található vagy nincs jogosultság")
    
    if event["highlighted"] or event["highlighted_pending"]:
        raise HTTPException(status_code=400, detail="Esemény már kiemelt vagy kiemelés alatt áll")
    
    if current_user.wallet_balance < 2000:
        raise HTTPException(status_code=400, detail="Nincs elegendő egyenleg (2000 Ft szükséges)")
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$inc": {"wallet_balance": -2000}}
    )
    
    await db.events.update_one(
        {"event_id": event_id},
        {"$set": {"highlighted_pending": True}}
    )
    
    return {"message": "Kiemelés kérelem elküldve, admin jóváhagyásra vár"}

@fastapi_app.get("/api/wallet/balance")
async def get_wallet_balance(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "wallet_balance": 1, "unique_payment_reference": 1})
    return user

@fastapi_app.post("/api/wallet/topup")
async def topup_wallet(payment_data: PaymentCreate, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "unique_payment_reference": 1})
    
    payment_id = 'pay_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    payment_doc = {
        "payment_id": payment_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "amount": payment_data.amount,
        "payment_method": payment_data.payment_method,
        "unique_reference": user["unique_payment_reference"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment_doc.copy())
    return {"message": "Fizetés kérelem elküldve, admin jóváhagyásra vár", "payment_id": payment_id, "unique_reference": user["unique_payment_reference"]}

@fastapi_app.get("/api/wallet/transactions")
async def get_wallet_transactions(current_user: User = Depends(get_current_user)):
    payments = await db.payments.find({"user_id": current_user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments

@fastapi_app.get("/api/admin/users")
async def admin_get_users(admin: User = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "verification_token": 0}).to_list(1000)
    return users

@fastapi_app.delete("/api/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: User = Depends(get_admin_user)):
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Nem törölheted saját magad")
    
    await db.users.delete_one({"user_id": user_id})
    await db.posts.delete_many({"user_id": user_id})
    await db.comments.delete_many({"user_id": user_id})
    await db.reactions.delete_many({"user_id": user_id})
    await db.events.delete_many({"user_id": user_id})
    return {"message": "Felhasználó törölve"}

@fastapi_app.put("/api/admin/users/{user_id}/role")
async def admin_update_role(user_id: str, role: int, admin: User = Depends(get_admin_user)):
    if role not in [0, 1]:
        raise HTTPException(status_code=400, detail="Érvénytelen role érték")
    
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": role}})
    return {"message": "Role frissítve"}

@fastapi_app.put("/api/admin/users/{user_id}/verify-email")
async def admin_verify_email(user_id: str, admin: User = Depends(get_admin_user)):
    """Admin manually verifies a user's email"""
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"email_verified": True}, "$unset": {"verification_token": ""}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    return {"message": "Email megerősítve"}

@fastapi_app.delete("/api/admin/posts/{post_id}")
async def admin_delete_post(post_id: str, admin: User = Depends(get_admin_user)):
    await db.posts.delete_one({"post_id": post_id})
    await db.reactions.delete_many({"post_id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    return {"message": "Bejegyzés törölve"}

@fastapi_app.delete("/api/admin/comments/{comment_id}")
async def admin_delete_comment(comment_id: str, admin: User = Depends(get_admin_user)):
    comment = await db.comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if comment:
        await db.comments.delete_one({"comment_id": comment_id})
        count = await db.comments.count_documents({"post_id": comment["post_id"]})
        await db.posts.update_one({"post_id": comment["post_id"]}, {"$set": {"comment_count": count}})
    return {"message": "Komment törölve"}

@fastapi_app.delete("/api/admin/events/{event_id}")
async def admin_delete_event(event_id: str, admin: User = Depends(get_admin_user)):
    # Get event to check for image
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if event and event.get("image_base64") and event["image_base64"].startswith("/api/uploads/"):
        # Delete the uploaded image file
        filename = event["image_base64"].split("/")[-1]
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()
    
    await db.events.delete_one({"event_id": event_id})
    await db.rsvps.delete_many({"event_id": event_id})
    return {"message": "Esemény törölve"}

@fastapi_app.put("/api/admin/events/{event_id}/approve")
async def admin_approve_event(event_id: str, admin: User = Depends(get_admin_user)):
    await db.events.update_one({"event_id": event_id}, {"$set": {"status": "approved"}})
    return {"message": "Esemény jóváhagyva"}

@fastapi_app.put("/api/admin/events/{event_id}/reject")
async def admin_reject_event(event_id: str, admin: User = Depends(get_admin_user)):
    await db.events.update_one({"event_id": event_id}, {"$set": {"status": "rejected"}})
    return {"message": "Esemény elutasítva"}

@fastapi_app.put("/api/admin/events/{event_id}/highlight-approve")
async def admin_approve_highlight(event_id: str, admin: User = Depends(get_admin_user)):
    await db.events.update_one(
        {"event_id": event_id},
        {"$set": {"highlighted": True, "highlighted_pending": False}}
    )
    return {"message": "Kiemelés jóváhagyva"}

@fastapi_app.put("/api/admin/events/{event_id}/highlight-reject")
async def admin_reject_highlight(event_id: str, admin: User = Depends(get_admin_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if event:
        await db.users.update_one(
            {"user_id": event["user_id"]},
            {"$inc": {"wallet_balance": 2000}}
        )
    
    await db.events.update_one(
        {"event_id": event_id},
        {"$set": {"highlighted_pending": False}}
    )
    return {"message": "Kiemelés elutasítva, egyenleg visszatérítve"}

@fastapi_app.get("/api/admin/payments")
async def admin_get_payments(admin: User = Depends(get_admin_user)):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return payments

@fastapi_app.put("/api/admin/payments/{payment_id}/approve")
async def admin_approve_payment(payment_id: str, admin: User = Depends(get_admin_user)):
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Fizetés nem található")
    
    if payment["status"] != "pending":
        raise HTTPException(status_code=400, detail="Fizetés már feldolgozva")
    
    await db.users.update_one(
        {"user_id": payment["user_id"]},
        {"$inc": {"wallet_balance": payment["amount"]}}
    )
    
    await db.payments.update_one(
        {"payment_id": payment_id},
        {"$set": {"status": "approved"}}
    )
    
    return {"message": "Fizetés jóváhagyva, egyenleg frissítve"}

@fastapi_app.put("/api/admin/payments/{payment_id}/reject")
async def admin_reject_payment(payment_id: str, admin: User = Depends(get_admin_user)):
    await db.payments.update_one(
        {"payment_id": payment_id},
        {"$set": {"status": "rejected"}}
    )
    return {"message": "Fizetés elutasítva"}

@fastapi_app.put("/api/admin/wallet/{user_id}/adjust")
async def admin_adjust_wallet(user_id: str, amount: float, admin: User = Depends(get_admin_user)):
    await db.users.update_one(
        {"user_id": user_id},
        {"$inc": {"wallet_balance": amount}}
    )
    return {"message": f"Egyenleg módosítva: {amount} Ft"}

@fastapi_app.get("/api/messages/{friend_id}")
async def get_messages(friend_id: str, current_user: User = Depends(get_current_user)):
    messages = await db.messages.find(
        {
            "$or": [
                {"from_user_id": current_user.user_id, "to_user_id": friend_id},
                {"from_user_id": friend_id, "to_user_id": current_user.user_id}
            ]
        },
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    await db.messages.update_many(
        {"from_user_id": friend_id, "to_user_id": current_user.user_id, "read_status": False},
        {"$set": {"read_status": True}}
    )
    
    return messages

class MessageSend(BaseModel):
    to_user_id: str
    content: str

@fastapi_app.post("/api/messages/send")
async def send_message(msg_data: MessageSend, current_user: User = Depends(get_current_user)):
    """Send a message via HTTP (polling-based alternative to Socket.IO)"""
    message_id = 'msg_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    message_doc = {
        "message_id": message_id,
        "from_user_id": current_user.user_id,
        "to_user_id": msg_data.to_user_id,
        "content": msg_data.content,
        "read_status": False,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(message_doc.copy())
    return {"message": "Üzenet elküldve", "message_id": message_id}

@fastapi_app.post("/api/upload/event-image")
async def upload_event_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload an image for an event"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Nem támogatott fájlformátum. Engedélyezett: jpg, jpeg, png, gif, webp")
    
    # Read file content to check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="A fájl mérete maximum 5MB lehet")
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Return the URL path to the image
    image_url = f"/api/uploads/{unique_filename}"
    return {"image_url": image_url, "filename": unique_filename}

@fastapi_app.delete("/api/upload/event-image/{filename}")
async def delete_event_image(filename: str, current_user: User = Depends(get_current_user)):
    """Delete an uploaded event image"""
    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        file_path.unlink()
        return {"message": "Kép törölve"}
    raise HTTPException(status_code=404, detail="Kép nem található")

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Scheduler for automatic event cleanup
scheduler = AsyncIOScheduler()

async def delete_expired_events():
    """Delete events that have passed their date"""
    try:
        now = datetime.now(timezone.utc)
        result = await db.events.delete_many({
            "date": {"$lt": now.isoformat()}
        })
        if result.deleted_count > 0:
            logger.info(f"Deleted {result.deleted_count} expired events")
    except Exception as e:
        logger.error(f"Error deleting expired events: {e}")

# Schedule to run every day at 2 AM
scheduler.add_job(
    delete_expired_events,
    CronTrigger(hour=2, minute=0),
    id='delete_expired_events',
    replace_existing=True
)

@fastapi_app.on_event("startup")
async def startup_event():
    scheduler.start()
    logger.info("Event cleanup scheduler started")
    # Run cleanup on startup as well
    await delete_expired_events()

@fastapi_app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()

# Simple FastAPI app without Socket.IO (using polling for messages)
app = fastapi_app
