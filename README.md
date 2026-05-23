# LaChick — Premium Dating Platform

> *Where men present themselves, women choose.*

LaChick is a LinkedIn-meets-Tinder dating platform built for the African market. Men create rich profiles; women browse and initiate contact. Monetisation is driven by tiered M-Pesa subscription packages that unlock visibility, chat, photo sharing, and posting privileges.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Monetisation Model](#monetisation-model)
5. [SEO Strategy](#seo-strategy)
6. [Backend Setup](#backend-setup)
7. [Frontend Setup](#frontend-setup)
8. [Environment Variables](#environment-variables)
9. [API Reference](#api-reference)
10. [M-Pesa Integration](#mpesa-integration)
11. [Deployment](#deployment)

---

## Project Overview

**LaChick** is a two-sided marketplace:

| Role | What they do |
|------|-------------|
| **Men** | Create profiles, upload photos, write bios, buy packages for visibility |
| **Women** | Browse men's profiles for free, initiate chats with paying men |

### Key Features
- Profile creation with photos, bio, interests, career info
- Tiered visibility (free → bronze → silver → gold)
- M-Pesa STK Push payments (Safaricom Daraja API)
- Real-time chat (Django Channels / WebSocket)
- Photo sharing inside chat (silver & gold tiers)
- Post/story feed (gold tier)
- SEO-optimised public profile pages

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.x + Django REST Framework |
| Database | PostgreSQL |
| Cache / Broker | Redis |
| Real-time | Django Channels (WebSockets) |
| Payments | Safaricom Daraja API (M-Pesa STK Push) |
| Storage | AWS S3 (or Cloudinary) for media |
| Frontend | React 18 + Vite |
| Styling | Bootstrap 5 + Bootstrap Icons + custom CSS |
| Deployment | Railway / Render (backend), Vercel (frontend) |

---

## Architecture

```
lachick/
├── backend/
│   ├── lachick/              # Django project root
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py           # WebSocket support
│   │   └── wsgi.py
│   └── core/                 # Single core application
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── consumers.py      # WebSocket chat
│       ├── mpesa.py          # Daraja helpers
│       ├── tasks.py          # Celery tasks
│       └── admin.py
└── frontend/
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── utils/api.js
    │   ├── styles/main.css
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── ProfileCard.jsx
    │   │   ├── PackageBadge.jsx
    │   │   ├── ChatWindow.jsx
    │   │   ├── PhotoUpload.jsx
    │   │   └── PostCard.jsx
    │   └── pages/
    │       ├── Home.jsx
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── ProfileDetail.jsx
    │       ├── EditProfile.jsx
    │       ├── Packages.jsx
    │       ├── Chat.jsx
    │       ├── Feed.jsx
    │       └── Dashboard.jsx
    └── package.json
```

---

## Monetisation Model

### Subscription Packages (M-Pesa)

| Package | Price | Duration | Benefits |
|---------|-------|----------|----------|
| **Basic** | KES 99 | 3 days | Profile visible in search, receive messages |
| **Weekly** | KES 299 | 7 days | All Basic + send messages + appear in Top Picks |
| **Monthly** | KES 799 | 30 days | All Weekly + photo sharing in chat + post on feed |
| **Gold** | KES 1,499 | 30 days | All Monthly + top of search results + verified badge + analytics |

### Revenue Streams
1. **Subscriptions** — core M-Pesa recurring revenue
2. **Boost Credits** — one-time KES 50 to appear at top for 24 hours
3. **Super Like** — KES 20 per super like (notifies woman prominently)
4. **Profile Review** — KES 200 for AI-assisted profile writing tips
5. **Affiliate partnerships** — lifestyle brands targeting young professionals

---

## SEO Strategy

LaChick is architected for SEO from the ground up:

### Technical SEO
- **Public profile pages** are server-side rendered with React meta tags via `react-helmet-async`
- Each male profile has a unique, crawlable URL: `/profiles/{username}/`
- Sitemap auto-generated at `/sitemap.xml` listing all public profiles
- `robots.txt` configured to allow profile indexing
- Open Graph + Twitter Card meta tags on every profile page (photo, name, city, interests)
- Canonical URLs to avoid duplicate content

### Content SEO
- Location-based landing pages: `/dating/nairobi/`, `/dating/mombasa/`, `/dating/kampala/`
- Interest-based pages: `/dating/professionals/`, `/dating/christians/` etc.
- Blog section (`/blog/`) for dating tips — targets long-tail keywords
- Schema.org `Person` markup on profiles for rich snippets

### On-page Optimisation
- Profile titles: `{Name}, {Age} — {City} | LaChick`
- Meta description auto-generated from bio + interests
- Alt text on all photos
- Fast load times (lazy image loading, CDN, Gzip)

### Local SEO
- Google Business Profile for LaChick
- Target keywords: *"dating site Kenya"*, *"meet singles Nairobi"*, *"online dating Mombasa"*

---

## Backend Setup

```bash
# 1. Clone and create virtual environment
git clone https://github.com/yourname/lachick.git
cd lachick/backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install django djangorestframework djangorestframework-simplejwt \
    django-cors-headers channels channels-redis psycopg2-binary \
    pillow boto3 django-storages celery redis requests python-decouple \
    django-sitemaps

# 3. Copy env file
cp .env.example .env   # Fill in your values

# 4. Run migrations
python manage.py makemigrations core
python manage.py migrate

# 5. Create superuser
python manage.py createsuperuser

# 6. Run server
python manage.py runserver
```

---

## Frontend Setup

```bash
cd lachick/frontend
npm install
npm run dev        # Development
npm run build      # Production build
```

---

## Environment Variables

```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lachick

# Redis
REDIS_URL=redis://localhost:6379/0

# M-Pesa Daraja
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback/
MPESA_ENV=sandbox   # or production

# AWS S3 (media storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=lachick-media
AWS_S3_REGION_NAME=af-south-1

# Frontend
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register/` | No | Register user |
| POST | `/api/auth/login/` | No | Get JWT tokens |
| POST | `/api/auth/refresh/` | No | Refresh token |
| GET | `/api/profiles/` | Optional | Browse male profiles |
| GET | `/api/profiles/{username}/` | No | Public profile (SEO) |
| PUT | `/api/profiles/me/` | Yes | Edit own profile |
| POST | `/api/profiles/me/photos/` | Yes (paid) | Upload photo |
| GET | `/api/packages/` | No | List packages |
| POST | `/api/packages/subscribe/` | Yes | Initiate M-Pesa payment |
| POST | `/api/mpesa/callback/` | No | Daraja callback |
| GET | `/api/chat/rooms/` | Yes (paid) | List chat rooms |
| GET | `/api/chat/rooms/{id}/messages/` | Yes (paid) | Get messages |
| GET | `/api/feed/posts/` | Yes | Browse posts |
| POST | `/api/feed/posts/` | Yes (gold) | Create post |
| POST | `/api/boost/` | Yes | Boost profile 24h |

---

## M-Pesa Integration

LaChick uses **Safaricom Daraja API** (STK Push):

1. User selects a package → enters phone number
2. Backend calls Daraja → user gets STK Push on phone
3. User enters M-Pesa PIN → Daraja sends callback to backend
4. Backend validates → activates subscription → user notified via WebSocket

**Sandbox test numbers**: Use `254708374149` with PIN `1234` for testing.

---

## Deployment

### Backend (Railway)
```bash
railway login
railway init
railway up
```

### Frontend (Vercel)
```bash
vercel --prod
```

### Environment
- Set all `.env` variables in Railway/Vercel dashboards
- Point `MPESA_CALLBACK_URL` to your live domain
- Run `python manage.py collectstatic` before deploy

---

## License

MIT — built with ICT Steve  for the African dating market.