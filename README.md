# Laid - Dating App

A stylish and simple dating app with modern design and intuitive user experience.

## 🚀 Quick Start

See [SETUP.md](SETUP.md) for detailed setup instructions.

```bash
# 1. Create database
createdb laid_db
psql -d laid_db -f packages/backend/src/db/schema.sql

# 2. Configure environment
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# 3. Install and run
npm install
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3000

## ✨ Features

- 🔐 Secure authentication with email verification
- 👤 Rich user profiles with multiple photos
- 💕 Swipe-based discovery interface
- ✨ Real-time matching system
- 💬 In-app messaging
- 🎨 Beautiful, responsive UI

## 🛠 Tech Stack

**Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion  
**Backend:** Node.js, Express, PostgreSQL, JWT

## 📱 App Flow

1. Register → 2. Verify Email → 3. Setup Profile → 4. Discover → 5. Match → 6. Chat

## 📄 License

MIT License
