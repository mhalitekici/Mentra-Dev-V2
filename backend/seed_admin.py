import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import uuid
import bcrypt
from datetime import datetime, timezone

# Load environment variables
load_dotenv()

async def seed_admin():
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check if admin exists
    existing_admin = await db.users.find_one({'email': 'devmentra@gmail.com'})
    
    if existing_admin:
        print("Admin user already exists!")
        return
    
    # Create admin user
    password = 'Halit02400*'
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    admin_dict = {
        'id': str(uuid.uuid4()),
        'email': 'devmentra@gmail.com',
        'password': hashed_password,
        'full_name': 'Mentra Admin',
        'username': 'admin_mentra',
        'role': 'admin',
        'age': None,
        'subject': None,
        'bio': 'Mentra Platform Administrator',
        'avatar': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_dict)
    print("Admin user created successfully!")
    print(f"Email: devmentra@gmail.com")
    print(f"Password: Halit02400*")
    print(f"Role: admin")

if __name__ == "__main__":
    asyncio.run(seed_admin())
