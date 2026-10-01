# श्रम सारथी (Shram Sarathi)

A digital marketplace connecting skilled/unskilled workers with customers.

## 🎉 Latest Update: Complete Authentication System

✅ **User Signup & Login with Password + 2FA (OTP)** is now fully implemented!

- User registration with phone number and password
- Secure login with password verification
- Two-Factor Authentication (2FA) using OTP
- JWT token-based authentication
- Bilingual support (Hindi/English)

📖 **Documentation:**
- [AUTH_FLOW.md](./AUTH_FLOW.md) - Technical documentation
- [SETUP_GUIDE_HI.md](./SETUP_GUIDE_HI.md) - Hindi setup guide
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - Test cases
- [FLOW_DIAGRAM.md](./FLOW_DIAGRAM.md) - Visual flow diagrams
- [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md) - Feature summary

## Tech Stack
- **Backend (FastAPI)**: FastAPI + PostgreSQL + Redis *(original — kept as backup)*
- **Backend (Laravel)**: Laravel 11 + PostgreSQL + Redis *(new — production ready)*
- **Mobile**: React Native + TypeScript (Expo)
- **Web Admin (React)**: React.js + TypeScript + Vite *(original — kept as backup)*
- **Web Admin (Blade)**: Laravel Blade + Tailwind CSS *(new — integrated with Laravel)*
- **Telephony**: Exotel (IVR + Number Masking)
- **Payment**: Razorpay
- **Cache/Geo**: Redis (OTP + GeoSpatial)
- **Auth**: JWT + Bcrypt + 2FA (OTP)

## Features

### Authentication 🔐
- ✅ User signup with phone + password
- ✅ Login with password verification
- ✅ Two-Factor Authentication (OTP)
- ✅ JWT token-based sessions
- ✅ Secure password hashing (bcrypt)
- ✅ OTP expiry (5 minutes)
- ✅ Bilingual UI (Hindi/English)

### Core Features 🚀
- 📱 Mobile app for customers and service providers
- 🗺️ Geo-spatial provider search
- 💳 Razorpay payment integration
- 📞 Exotel cloud telephony with IVR
- 🎁 Reward system
- 👥 Role-based access control

## Project Structure
```
shram-sarathi/
├── backend/              # FastAPI backend (ORIGINAL — backup)
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Exotel, Razorpay
│   │   └── utils/        # JWT, OTP, Phone
│   └── requirements.txt
│
├── laravel/              # Laravel 11 backend + Blade Admin (NEW)
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Admin/        # Blade admin panel controller
│   │   │   │   └── Api/          # REST API controllers
│   │   │   └── Middleware/       # JWT, AdminAuth, Role, Permission
│   │   ├── Models/               # Eloquent models
│   │   ├── Services/             # JWT, OTP, Redis, Exotel, Razorpay, Polly
│   │   └── Providers/
│   ├── database/
│   │   ├── migrations/           # All 12 table migrations
│   │   └── seeders/              # AdminSeeder
│   ├── resources/views/admin/    # Blade admin panel views
│   │   ├── layouts/app.blade.php
│   │   ├── login.blade.php
│   │   ├── verify-otp.blade.php
│   │   ├── dashboard.blade.php
│   │   ├── users.blade.php
│   │   ├── bookings.blade.php
│   │   ├── payments.blade.php
│   │   ├── commissions.blade.php
│   │   ├── rewards.blade.php
│   │   ├── tickets.blade.php
│   │   ├── broadcast.blade.php
│   │   └── print-label.blade.php
│   ├── routes/
│   │   ├── api.php               # REST API routes
│   │   └── web.php               # Admin panel web routes
│   ├── .env.example
│   ├── composer.json
│   └── run.bat                   # Quick start script
│
├── mobile/               # React Native app (UNCHANGED)
│   └── src/
│
├── admin/                # React.js admin (ORIGINAL — backup)
│   └── src/
│
└── docker-compose.yml    # All services
```

## Quick Start

### Laravel Backend + Blade Admin (NEW — Recommended)
```bash
cd laravel

# One-command setup and start:
run.bat

# Server: http://localhost:8001
# Admin:  http://localhost:8001/admin
# API:    http://localhost:8001/api/docs (not available — use /api/health)

# Default admin credentials:
#   Phone:    9999999999
#   Password: admin123
#   OTP:      123456 (dev mode)
```

### FastAPI Backend (Original — Backup)
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Setup database
createdb shram_sarathi
alembic upgrade head

# Create .env file
cp .env.example .env
# Edit .env with your settings

# Run server
uvicorn app.main:app --reload
```

Backend will run on `http://localhost:8000`
API docs: `http://localhost:8000/docs`

### 2. Redis Setup
```bash
# Start Redis server
redis-server

# Verify
redis-cli ping  # Should return PONG
```

### 3. Mobile App Setup
```bash
cd mobile

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit EXPO_PUBLIC_API_URL if needed

# Start Expo
npm start

# Then press:
# 'a' for Android
# 'i' for iOS
# 'w' for Web
```

### 4. Admin Dashboard Setup
```bash
cd admin

# Install dependencies
npm install

# Run dev server
npm run dev
```

Admin will run on `http://localhost:5173`

## Testing Authentication

### Development Mode
In development, OTP is always `123456` for easy testing.

### Test Signup
1. Open mobile app
2. Click "Sign Up"
3. Enter:
   - Name: "Test User"
   - Phone: "9876543210"
   - Password: "test123"
4. Enter OTP: `123456`
5. ✅ Account created!

### Test Login
1. Open mobile app
2. Enter phone: "9876543210"
3. Enter password: "test123"
4. Enter OTP: `123456`
5. ✅ Logged in!

## API Endpoints

### Authentication
```
POST /api/auth/signup           # Register new user
POST /api/auth/verify-signup    # Verify signup OTP
POST /api/auth/login            # Login with password
POST /api/auth/verify-otp       # Verify login OTP (2FA)
GET  /api/auth/me               # Get current user
```

### Other Endpoints
```
GET  /api/categories            # Get service categories
POST /api/customer/book         # Create booking
POST /api/payment/create        # Create payment
POST /api/call/initiate         # Initiate call
```

Full API documentation: `http://localhost:8000/docs`

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/shram_sarathi
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
```

### Mobile (.env)
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000  # Android emulator
# EXPO_PUBLIC_API_URL=http://localhost:8000  # iOS simulator
# EXPO_PUBLIC_API_URL=http://192.168.1.x:8000  # Physical device
```

## Troubleshooting

### Backend not connecting
- Check if backend is running: `http://localhost:8000/docs`
- Check PostgreSQL: `psql -U postgres -d shram_sarathi`
- Check Redis: `redis-cli ping`

### OTP not received
- In dev mode, OTP is shown in alert (123456)
- Check backend logs for errors
- Verify Redis is running

### Database errors
```bash
cd backend
alembic upgrade head
```

### Module not found
```bash
# Backend
pip install -r requirements.txt

# Mobile
npm install
```

## Production Deployment

### Backend
1. Set `ENVIRONMENT=production` in .env
2. Use strong `SECRET_KEY`
3. Setup production database
4. Configure SMS gateway (MSG91/Twilio)
5. Enable HTTPS
6. Setup monitoring

### Mobile App
1. Update API URL to production
2. Configure app signing
3. Build release APK/IPA
4. Submit to Play Store/App Store

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is proprietary software for MGV Project.

## Support

For issues and questions:
- Check documentation in project root
- Review [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
- See [SETUP_GUIDE_HI.md](./SETUP_GUIDE_HI.md) for Hindi guide

---

**Status:** ✅ Authentication feature complete and working  
**Last Updated:** May 21, 2026  
**Version:** 1.0.0
