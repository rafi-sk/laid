# Laid Dating App - Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Git installed

## Quick Start

### 1. Database Setup

```bash
# Create database
createdb laid_db

# Run schema
psql -d laid_db -f packages/backend/src/db/schema.sql
```

### 2. Environment Configuration

```bash
# Backend environment
cp packages/backend/.env.example packages/backend/.env
```

Edit `packages/backend/.env` with your settings:
- Set `DB_PASSWORD` to your PostgreSQL password
- Set `JWT_SECRET` to a random secure string
- Configure SMTP settings for email (or use a service like Gmail)

```bash
# Frontend environment
cp packages/frontend/.env.example packages/frontend/.env
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Servers

```bash
npm run dev
```

This will start:
- Backend API on http://localhost:3000
- Frontend on http://localhost:5173

## Features Implemented

✅ User Authentication (Register, Login, Email Verification)
✅ Profile Creation with Photos
✅ Swipe-based Discovery Feed
✅ Matching System
✅ Real-time Messaging
✅ Match Management

## Usage Flow

1. Register a new account
2. Verify email (check console for verification link in development)
3. Complete profile setup (name, age, bio, photos)
4. Start swiping on the discover page
5. View matches and start chatting

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login
- POST `/api/auth/verify-email` - Verify email
- POST `/api/auth/refresh-token` - Refresh access token
- POST `/api/auth/logout` - Logout

### Profile
- GET `/api/profile/me` - Get own profile
- PUT `/api/profile/me` - Update profile
- POST `/api/profile/photos` - Upload photo

### Discovery
- GET `/api/discovery/feed` - Get discovery feed
- POST `/api/discovery/swipe` - Swipe on profile

### Matches
- GET `/api/matches` - Get all matches
- DELETE `/api/matches/:matchId` - Unmatch

### Messages
- GET `/api/messages/:matchId` - Get messages for match
- POST `/api/messages/:matchId` - Send message

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT Authentication
- Bcrypt for password hashing

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- React Router

## Development Notes

- Email verification links are logged to console in development
- Use placeholder image URLs for profile photos during testing
- Messages refresh every 3 seconds (consider WebSockets for production)

## Production Deployment

1. Set `NODE_ENV=production` in backend
2. Configure production database
3. Set up proper SMTP service
4. Configure CORS for production domain
5. Build frontend: `npm run build --workspace=packages/frontend`
6. Serve frontend build with a web server
7. Deploy backend to a Node.js hosting service

## Troubleshooting

**Database connection fails:**
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `psql -l`

**Email not sending:**
- Check SMTP credentials
- For Gmail, use App Password, not regular password
- Check console logs for email verification links in development

**Frontend can't connect to backend:**
- Ensure backend is running on port 3000
- Check CORS settings in backend
- Verify `VITE_API_URL` in frontend `.env`
