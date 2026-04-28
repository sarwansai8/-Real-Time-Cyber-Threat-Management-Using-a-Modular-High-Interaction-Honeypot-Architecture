<![CDATA[# 🏥 HealthGov — Enterprise Healthcare Management Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)
![Security](https://img.shields.io/badge/Security_Layers-28-red?style=for-the-badge&logo=shield)
![HIPAA](https://img.shields.io/badge/HIPAA-Compliant-purple?style=for-the-badge)

**A HIPAA-compliant, zero-trust healthcare management system with 28 active security layers, AI-powered threat intelligence, and military-grade encryption.**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Security Architecture](#-security-architecture-28-layers)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Security Testing](#-security-testing)
- [Environment Variables](#-environment-variables)
- [Security Policy](#-security-policy)

---

## 🌟 Overview

HealthGov is a full-stack healthcare management platform designed for enterprise-grade security. It provides patient registration, appointment scheduling, medical record management, vaccination tracking, and administrative dashboards — all protected by a multi-layered cybersecurity architecture that detects and blocks sophisticated attacks in real time.

### Core Capabilities

| Module | Features |
|--------|----------|
| 🧑‍⚕️ **Patient Portal** | Registration, medical records, appointments, vaccinations, prescriptions |
| 👨‍💼 **Admin Dashboard** | User management, analytics, health updates CMS, security monitoring |
| 🔐 **Auth System** | JWT + refresh tokens, 2FA (TOTP), device binding, session management |
| 🛡️ **Security Suite** | 28 active layers — WAF, honeypots, bot detection, DLP, encryption |
| 📊 **Monitoring** | Live attack map, threat timeline, penetration test simulator |

---

## 🚀 Key Features

### Patient Management
- ✅ Patient registration with complete profile (demographics, blood type, emergency contact)
- ✅ Medical record CRUD with SHA-256 integrity verification
- ✅ Appointment scheduling and management
- ✅ Vaccination record tracking
- ✅ Prescription management
- ✅ Data export (PDF/CSV)

### Admin Panel
- ✅ User management (view, edit, delete, role assignment)
- ✅ Health updates CMS (create, publish, manage articles)
- ✅ Analytics dashboard with real-time metrics
- ✅ Security monitoring dashboard
- ✅ Penetration test simulator
- ✅ Active sessions manager

---

## 🛡️ Security Architecture (28 Layers)

### Layer 1 — Authentication & Access Control

| # | Feature | File | Description |
|---|---------|------|-------------|
| 1 | **JWT + Refresh Tokens** | `advanced-security.ts` | Short-lived access tokens (5min) + device-bound refresh tokens (7 days) |
| 2 | **Two-Factor Auth (TOTP)** | `totp-auth.ts` | RFC 6238 compatible — Google Authenticator, Authy, Microsoft Authenticator |
| 3 | **CSRF Protection** | `advanced-security.ts` | Double-submit cookie pattern with cryptographic tokens |
| 4 | **Brute Force / Account Lockout** | `advanced-security.ts` | Progressive lockout after failed attempts |
| 5 | **IP Whitelisting (Admin)** | `advanced-security.ts` | Admin routes restricted to approved IP ranges |
| 6 | **Token Rotation + Device Binding** | `token-rotation.ts` | Refresh tokens bound to device fingerprint, auto-rotate on use |

### Layer 2 — Input Validation & Injection Prevention

| # | Feature | File | Description |
|---|---------|------|-------------|
| 7 | **SQL/NoSQL Injection Shield** | `injection-shield.ts` | Blocks MongoDB operators (`$gt`, `$where`, `$regex`), SQL keywords |
| 8 | **XSS / Code Injection Detection** | `injection-shield.ts` | Sanitizes `<script>`, `javascript:`, event handlers |
| 9 | **Password Strength Validator** | `advanced-security.ts` | Entropy-based scoring, common password rejection |
| 10 | **Timing-Safe Comparison** | `advanced-security.ts` | Prevents timing side-channel attacks on token validation |

### Layer 3 — Bot Detection & Behavioral Analysis

| # | Feature | File | Description |
|---|---------|------|-------------|
| 11 | **Device Fingerprinting** | `bot-detection.ts` | Canvas, WebGL, Audio API, font fingerprinting |
| 12 | **Behavioral Biometrics** | `behavioral-biometrics.ts` | Keystroke dynamics, mouse jitter, interaction rhythm analysis |
| 13 | **Headless Browser Detection** | `honeypot-intelligence.ts` | WebDriver flag, PhantomJS, Nightmare, Selenium detection |
| 14 | **Mobile Spoofing Detection** | `advanced-honeypot.ts` | Detects desktop bots claiming mobile User-Agent |

### Layer 4 — Honeypot Deception Network

| # | Feature | File | Description |
|---|---------|------|-------------|
| 15 | **Invisible Field Traps (15 fields)** | `honeypot.tsx` | 10 hiding strategies (CSS, DOM, aria-hidden) |
| 16 | **Decoy API Endpoints (27 traps)** | `honeypot-network.ts` | Fake admin panels, config files, GraphQL, CMS probes |
| 17 | **Canary Tokens** | `honeypot-intelligence.ts` | Fake credentials that alert when used |
| 18 | **DOM Mutation Honeypot** | `honeypot-intelligence.ts` | Hidden admin form — alerts when bots interact |
| 19 | **Tarpitting** | `honeypot-intelligence.ts` | Deliberately slows responses to waste attacker resources |
| 20 | **Attacker Profiling** | `honeypot-intelligence.ts` | Identifies 20+ attack tools, assigns sophistication score (1-10) |

### Layer 5 — Network & Protocol Security

| # | Feature | File | Description |
|---|---------|------|-------------|
| 21 | **WAF Rules Engine** | `waf.ts` | 10 configurable rules — scanner blocking, path traversal, payload limits |
| 22 | **Rate Limiting** | `rate-limit.ts` | Per-IP request throttling (200 req/min) |
| 23 | **Security Headers** | `security-headers.ts` | CSP, HSTS, X-Frame-Options, Permissions-Policy |
| 24 | **Geo-IP Blocking** | `geo-ip.ts` | Impossible travel detection, Tor/VPN blocking, Haversine analysis |

### Layer 6 — Data Protection & Compliance

| # | Feature | File | Description |
|---|---------|------|-------------|
| 25 | **AES-256-GCM Encryption at Rest** | `field-encryption.ts` | Per-user encryption keys via PBKDF2 (100K iterations) |
| 26 | **SHA-256 Record Integrity** | `record-integrity.ts` | HMAC-SHA-256 hashing, Merkle tree, tamper detection |
| 27 | **DLP Scanner** | `dlp-scanner.ts` | Detects 17 PII patterns (SSN, credit cards, Aadhaar), auto-redacts |
| 28 | **HIPAA Audit Logging** | `audit-logger.ts` | Comprehensive audit trail for all data access |

### Layer 7 — Monitoring & Intelligence

| Feature | File | Description |
|---------|------|-------------|
| **AI Threat Intelligence** | `threat-intelligence.ts` | ML-inspired risk scoring, dynamic blocklist, pattern recognition |
| **Dark Web Breach Monitor** | `breach-monitor.ts` | HIBP k-anonymity API — checks passwords against known breaches |
| **Session Anomaly Detection** | `session-anomaly.ts` | Continuous fingerprint validation, hijacking prevention |
| **Security Notifications** | `security-notifications.ts` | 12 alert types — login events, breaches, record access |
| **Live Attack Map** | `attack-map.tsx` | Real-time Canvas visualization of blocked threats |
| **Penetration Test Simulator** | `pentest-runner.ts` | 14 automated security tests with grading (A+ to F) |

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Database** | MongoDB Atlas + Mongoose |
| **Authentication** | JWT (jsonwebtoken) + TOTP (RFC 6238) |
| **Encryption** | AES-256-GCM, HMAC-SHA-256, PBKDF2, bcrypt |
| **UI** | React 19, Tailwind CSS, shadcn/ui, Lucide Icons |
| **Charts** | Recharts |
| **Validation** | Zod |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- MongoDB Atlas account (or local MongoDB)

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd code

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables section)

# 4. Run development server
npm run dev
```

The app will be available at **http://localhost:3000**

### Default Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@healthportal.com` | `Admin123!` |
| Patient | `demo@example.com` | `password123` |

---

## 📂 Project Structure

```
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication (login, register, 2FA)
│   │   ├── admin/                # Admin endpoints
│   │   ├── appointments/         # Appointment CRUD
│   │   ├── medical-records/      # Medical record CRUD
│   │   ├── vaccinations/         # Vaccination tracking
│   │   ├── sessions/             # Session management
│   │   └── security/             # Breach check, pen test APIs
│   ├── admin/                    # Admin pages
│   │   ├── security/             # Security dashboard
│   │   ├── pentest/              # Penetration test simulator
│   │   └── users/                # User management
│   ├── auth/                     # Login, register, forgot password
│   └── dashboard/                # Patient dashboard
│
├── components/                   # React components
│   ├── attack-map.tsx            # Live attack visualization
│   ├── breach-alert.tsx          # Breach check UI
│   ├── honeypot.tsx              # Invisible bot traps
│   ├── integrity-badge.tsx       # Record verification badge
│   ├── security-alerts.tsx       # Notification bell
│   └── security-dashboard.tsx    # Security monitoring
│
├── lib/                          # Core libraries (40 modules)
│   ├── auth.ts                   # JWT authentication
│   ├── totp-auth.ts              # Two-factor authentication
│   ├── field-encryption.ts       # AES-256 encryption
│   ├── record-integrity.ts       # SHA-256 integrity
│   ├── breach-monitor.ts         # HIBP integration
│   ├── advanced-honeypot.ts      # Behavioral honeypot
│   ├── honeypot-network.ts       # Decoy API network
│   ├── honeypot-intelligence.ts  # Intelligence engine
│   ├── bot-detection.ts          # Device fingerprinting
│   ├── behavioral-biometrics.ts  # Keystroke/mouse analysis
│   ├── injection-shield.ts       # SQL/XSS protection
│   ├── threat-intelligence.ts    # AI threat scoring
│   ├── waf.ts                    # Web Application Firewall
│   ├── dlp-scanner.ts            # Data Loss Prevention
│   ├── geo-ip.ts                 # Geolocation intelligence
│   ├── session-anomaly.ts        # Session hijacking detection
│   ├── security-notifications.ts # Alert system
│   ├── pentest-runner.ts         # Automated pen testing
│   ├── token-rotation.ts         # Token lifecycle
│   ├── rate-limit.ts             # Request throttling
│   ├── security-headers.ts       # HTTP security headers
│   ├── advanced-security.ts      # CSRF, brute force, lockout
│   └── audit-logger.ts           # HIPAA audit trail
│
└── .env.local                    # Environment configuration
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/auth/register` | User registration |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/2fa` | Get 2FA status |
| `POST` | `/api/auth/2fa` | Setup / Verify / Disable 2FA |

### Patient Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/medical-records` | Medical records CRUD |
| `GET/POST` | `/api/appointments` | Appointments CRUD |
| `GET/POST` | `/api/vaccinations` | Vaccinations CRUD |

### Security
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/security/breach-check` | Check password/email in breaches |
| `POST` | `/api/security/pentest` | Run penetration tests |
| `GET/DELETE` | `/api/sessions` | View/terminate active sessions |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/PATCH/DELETE` | `/api/admin/users` | User management |
| `GET` | `/api/admin/analytics` | Dashboard analytics |
| `GET/POST` | `/api/health-updates` | CMS content management |

---

## 🧪 Security Testing

### Built-in Penetration Test Simulator

Navigate to `/admin/pentest` to run 14 automated security tests:

- ✅ SQL Injection protection
- ✅ XSS (Cross-Site Scripting) protection
- ✅ Path Traversal protection
- ✅ CSRF protection
- ✅ Rate Limiting verification
- ✅ Security Headers (CSP, HSTS, X-Frame, Referrer-Policy)
- ✅ Authentication bypass prevention
- ✅ Sensitive file exposure check
- ✅ HTTP method restriction
- ✅ Error information disclosure check

### Honeypot Testing

Trigger honeypot traps to verify they work:

```bash
# Config trap — returns fake DB credentials with canary tokens
curl http://localhost:3000/api/admin/config

# GraphQL introspection trap — returns fake schema
curl -X POST http://localhost:3000/graphql

# WordPress probe trap
curl http://localhost:3000/wp-admin

# Breach check API
curl -X POST http://localhost:3000/api/security/breach-check \
  -H "Content-Type: application/json" \
  -d '{"type": "password", "value": "password123"}'
```

---

## ⚙️ Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/healthgov

# Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Encryption (auto-generates from JWT_SECRET if not set)
ENCRYPTION_MASTER_KEY=your-256-bit-hex-key

# Optional: Breach monitoring
HIBP_API_KEY=your-hibp-api-key

# Optional: Honeypot
ENABLE_HONEYPOT=true
```

---

## 🔒 Security Policy

Please refer to [SECURITY.md](SECURITY.md) for our vulnerability disclosure policy and supported versions.

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<div align="center">

**Built with 🔐 security-first architecture**

*28 Active Security Layers • Zero-Trust • HIPAA Compliant*

</div>
]]>
