# Cloud-Based Smart EV Charging and Reservation Platform with Real-Time Monitoring

**College Project:** Cloud Architecture and Design (CAD)  
**Target Deployment Environment:** Amazon Web Services (AWS) EC2 — **Amazon Linux 2023 (t3.micro)**  
**Tech Stack:** Node.js, Express.js (ES Modules), Supabase PostgreSQL, Supabase Auth, PM2, GitHub  

---

## 🏗️ Architecture Overview

```
                      +------------------------------------------+
                      |         React.js Frontend Client         |
                      |   (Vite / CRA - Driver & Admin UI)       |
                      +--------------------+---------------------+
                                           |
                                           | HTTP/HTTPS REST API Calls
                                           | Header: Authorization: Bearer <JWT>
                                           v
                      +------------------------------------------+
                      |       Amazon EC2 (Amazon Linux 2023)     |
                      |       Instance: t3.micro (1 GiB RAM)     |
                      |                                          |
                      |   +----------------------------------+   |
                      |   |      PM2 Process Supervisor      |   |
                      |   |   +--------------------------+   |   |
                      |   |   | Express.js API Server    |   |   |
                      |   |   | (Helmet, CORS, RateLimit)|   |   |
                      |   |   +------------+-------------+   |   |
                      |   +----------------+-----------------+   |
                      +--------------------+---------------------+
                                           |
                     +---------------------+---------------------+
                     |                                           |
                     v (Auth & Tokens)                           v (Queries & RPC)
        +-------------------------+                 +-------------------------+
        |   Supabase Auth Engine  |                 |   Supabase PostgreSQL   |
        |  (User & Session Mgmt)  |                 |  (GiST Lock, RLS, Trigs)|
        +-------------------------+                 +-------------------------+
```

*For complete architectural specifications, component boundaries, and scaling roadmaps, see [ARCHITECTURE.md](ARCHITECTURE.md).*

---

## 📂 Project Directory Structure

```
backend/
├── database/
│   ├── schema.sql         # Production PostgreSQL schema, GiST exclusion constraints, and RLS policies
│   └── seed.sql           # Realistic charging stations and connector slots
├── src/
│   ├── app.js             # Express app setup, security headers, CORS, rate limiting
│   ├── server.js          # HTTP server bootstrap and graceful shutdown
│   ├── config/
│   │   ├── supabase.js    # Supabase Client and Service Role initialization
│   │   └── validateEnv.js # Startup environment verification without credential leakage
│   ├── controllers/
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── booking.controller.js
│   │   ├── payment.controller.js
│   │   └── station.controller.js
│   ├── middleware/
│   │   ├── authenticate.js# Supabase JWT token verification
│   │   ├── errorHandler.js# Centralized error handler & 404 handler
│   │   └── requireAdmin.js# DB-enforced role verification
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── booking.routes.js
│   │   ├── payment.routes.js
│   │   └── station.routes.js
│   ├── services/
│   │   ├── booking.service.js
│   │   ├── payment.service.js
│   │   └── station.service.js
│   └── utils/
│       ├── response.js    # Uniform JSON response utility
│       └── validator.js   # UUID, ISO date, email validators
├── tests/
│   ├── api.test.js        # Automated route and status code tests
│   ├── unit.test.js       # Middleware, authorization, and error handling unit tests
│   └── validation.test.js # Input sanitization and edge-case tests
├── .env.example           # Environment template (NO SECRETS)
├── .gitignore             # Git exclusions (.env, node_modules)
├── ARCHITECTURE.md        # Detailed CAD architecture specification
├── package.json           # Dependencies and scripts (ES modules)
├── postman_collection.json# Complete API test collection
└── README.md              # Project documentation
```

---

## ⚡ Quick Start for Teammates (Local Development)

### 1. Prerequisites
- **Node.js**: v18.x, v20.x, or v22.x LTS installed.
- **Git** installed.

### 2. Setup Steps
```bash
# Clone the repository
git clone <YOUR_GITHUB_REPO_URL>
cd cad_proj/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 3. Configure Your `.env` File
Open `.env` and fill in your Supabase project keys:
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 4. Run Automated Tests
```bash
npm test
```
*Runs all 26 automated unit and route integration tests. No live database connection is required for basic unit validation.*

### 5. Start Local Server
```bash
# Development mode with watch mode
npm run dev

# Or standard production mode
npm start
```
Verify the server in browser or terminal:
```bash
curl http://localhost:5000/api/health
```

---

## 🗄️ Database Setup (Supabase)

### 1. Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a project.
2. Under **Project Settings** -> **API**, copy:
   - **Project URL**
   - **anon public key**
   - **service_role secret key**

### 2. Execute SQL Schema
1. Open the **SQL Editor** in the Supabase Dashboard.
2. Click **New query**, paste the entire content of [`database/schema.sql`](database/schema.sql), and click **Run**.
3. **What this creates**:
   - Tables: `profiles`, `stations`, `charging_slots`, `bookings`, `payments`.
   - Extensions: `uuid-ossp`, `pgcrypto`, `btree_gist`.
   - **PostgreSQL Exclusion Constraint**: Prevents two simultaneous users from booking the same slot for overlapping time windows at the database level (`no_double_booking_exclusion`).
   - Stored Procedure `create_booking_atomic`: Uses transactional advisory locking (`pg_advisory_xact_lock`) to serialize concurrent reservations for the same physical connector.
   - Procedure `cleanup_expired_pending_bookings`: Automatically flushes unpaid bookings older than 15 minutes.
   - Row Level Security (RLS) policies on all tables.
   - Automatic user profile trigger on registration.

### 3. Execute Seed Data
1. Open a new query in the SQL Editor.
2. Paste the contents of [`database/seed.sql`](database/seed.sql) and click **Run**.
3. Seeds 5 realistic EV charging stations with 17 physical charging slots.

### 4. Create the First Administrator Securely
Client-supplied roles are never trusted. To create an admin:
1. Register a user via `POST /api/auth/register` or the Supabase Auth UI (e.g., `admin@evplatform.com`).
2. Run this query in the Supabase SQL Editor:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'admin@evplatform.com';
   ```
3. Log in with that email. The returned JWT now possesses admin permissions.

---

## 🖥️ Frontend Integration Contract

For the frontend team developing the React application:

### 1. Base URL Configuration
Create a `.env` in the React frontend:
```env
# For local development
VITE_API_URL=http://localhost:5000/api

# For EC2 deployment
VITE_API_URL=http://<YOUR_EC2_PUBLIC_IP>:5000/api
```

### 2. HTTP Headers
All authenticated endpoints require:
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### 3. Unified API Response Envelope
Every response from the backend follows a strict standard format:

#### Success Response (HTTP 200, 201)
```json
{
  "success": true,
  "message": "Human-readable description of the action",
  "data": { ... }
}
```

#### Error Response (HTTP 400, 401, 403, 404, 409, 500)
```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "errors": { ... }
}
```

---

## 📡 API Reference

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | GET | Public | Uptime, health status, and ISO timestamp for monitoring |
| `/api/auth/register` | POST | Public | Register new user with email & password |
| `/api/auth/login` | POST | Public | Authenticate user; returns JWT session and role |
| `/api/auth/me` | GET | User | Get authenticated user's profile |
| `/api/stations` | GET | Public | List all stations with live computed `available_slots` |
| `/api/stations?search=`| GET | Public | Search stations by name or address |
| `/api/stations/:id` | GET | Public | Detailed station view with real-time slot states |
| `/api/bookings` | POST | User | Reserve a charging slot (concurrency-safe) |
| `/api/bookings/my` | GET | User | Retrieve current user's reservations |
| `/api/bookings/:id` | GET | User | Retrieve specific booking by ID (ownership verified) |
| `/api/bookings/:id/cancel` | PATCH | User | Cancel booking and release slot immediately |
| `/api/payments/simulate`| POST | User | Simulate checkout (success/failed); confirms booking |
| `/api/admin/stats` | GET | Admin | System stats (stations, slots, bookings, revenue) |
| `/api/admin/bookings` | GET | Admin | Inspect all system bookings across all users |
| `/api/admin/stations` | POST | Admin | Add a new charging station and slots |
| `/api/admin/stations/:id`| PATCH | Admin | Update charging station details |

---

## ☁️ Amazon Linux 2023 EC2 Deployment Guide

Follow this guide to deploy onto a single Amazon EC2 instance running **Amazon Linux 2023**.

### ⚠️ Cloud Cost & Architecture Advisory
- **Potentially Chargeable AWS Resources**:
  - AWS charges **$0.005/hour (~$3.60/month)** for in-use public IPv4 addresses across all instance types, including the Free Tier.
  - EBS root volumes above 30 GB incur standard storage costs (the default 8 GB is within Free Tier limits).
  - Stop the instance when not in use to minimize public IP and compute hours.
- **Do NOT provision**:
  - AWS RDS (we use managed Supabase PostgreSQL).
  - Application Load Balancers (ALB) or NAT Gateways (incur high hourly charges).
  - Elastic IPs (charges apply if idle).

---

### Step 1: Launch EC2 Instance (Amazon Linux 2023)
1. **AMI**: Amazon Linux 2023 AMI (64-bit x86).
2. **Instance Type**: `t3.micro` (1 vCPU, 1 GiB RAM).
3. **Key Pair**: Select or create an SSH key pair (e.g. `ev-key.pem`).
4. **Storage**: 8 GiB gp3 (default).

---

### Step 2: Configure EC2 Security Group Safely
In the **Network settings**, configure these inbound rules:

| Type | Port Range | Protocol | Source | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | `22` | TCP | `My IP` | Secure terminal access (do NOT use 0.0.0.0/0) |
| **Custom TCP** | `5000` | TCP | `0.0.0.0/0` | Direct backend API access |
| **HTTP** | `80` | TCP | `0.0.0.0/0` | Web traffic (if using reverse proxy) |
| **Outbound** | `All` | All | `0.0.0.0/0` | Required to reach Supabase and npm registries |

---

### Step 3: Connect via SSH
On your local machine:
```bash
chmod 400 ev-key.pem
ssh -i ev-key.pem ec2-user@<YOUR_EC2_PUBLIC_IP>
```
*(Notice the username is `ec2-user` for Amazon Linux 2023).*

---

### Step 4: System Update & Memory Optimization for 1 GiB RAM
Because `t3.micro` has 1 GiB RAM, create a 1 GiB swap file so npm and build operations never fail due to Out-Of-Memory (OOM):
```bash
# 1. Update Amazon Linux 2023 packages using dnf
sudo dnf update -y

# 2. Configure 1 GiB swap file
sudo dd if=/dev/zero of=/swapfile bs=128M count=8
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

---

### Step 5: Install Node.js LTS and Git on Amazon Linux 2023
Amazon Linux 2023 includes Node.js in its official repository:
```bash
# Install Node.js, npm, and git
sudo dnf install -y nodejs npm git

# Verify installation
node -v
npm -v
```

---

### Step 6: Clone Repository & Install Production Dependencies
Run strictly as `ec2-user` (do NOT run as root):
```bash
# Clone the repository
git clone <YOUR_GITHUB_REPO_URL>
cd cad_proj/backend

# Install production dependencies only
npm install --omit=dev
```

---

### Step 7: Configure Production Environment
```bash
nano .env
```
Paste your production settings:
```env
PORT=5000
NODE_ENV=production
CORS_ORIGIN=*

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
```
Save with `Ctrl+O`, `Enter`, then exit with `Ctrl+X`.

---

### Step 8: Keep Backend Running with PM2
PM2 acts as a process supervisor, auto-restarting the application if it crashes or the server reboots:

```bash
# 1. Install PM2 globally
sudo npm install -g pm2

# 2. Start the backend with memory threshold protection
pm2 start src/server.js --name "ev-backend" --max-memory-restart 300M

# 3. Verify running status
pm2 status

# 4. Configure auto-start on EC2 system reboot
pm2 startup systemd
# Run the exact command displayed on screen (e.g., sudo env PATH=... pm2 startup systemd -u ec2-user ...)
pm2 save
```

---

### Step 9: Operational Maintenance Commands

```bash
# View live streaming logs
pm2 logs ev-backend

# Real-time resource monitor (CPU / RAM)
pm2 monit

# Restart application (after git pull or .env update)
pm2 restart ev-backend

# Stop application
pm2 stop ev-backend
```

---

### Step 10: Verify Deployment
From your local computer:
```bash
curl http://<YOUR_EC2_PUBLIC_IP>:5000/api/health
```
You will receive:
```json
{
  "success": true,
  "message": "Server is running and operational.",
  "data": {
    "status": "healthy",
    "uptime": "0h 15m 32s",
    "uptime_seconds": 932,
    "timestamp": "2026-10-25T11:00:00.000Z",
    "service": "Smart EV Charging & Reservation API",
    "version": "1.0.0",
    "environment": "production"
  }
}
```

---

## 🔒 Security Best Practices Implemented

1. **Zero Secret Exposure**: Secrets and service-role keys are kept in environment variables on the EC2 instance and never committed to Git.
2. **Database Concurrency Guarantee**: PostgreSQL `btree_gist` exclusion constraint prevents double-bookings mathematically.
3. **15-Minute Expiry**: Stale unpaid reservations are automatically released.
4. **Hardened RBAC**: Roles are checked against `public.profiles.role` in PostgreSQL; client-supplied role values are rejected.
5. **Rate Limiting & Helmet**: Protects against brute-force attacks and cross-site scripting vulnerabilities.
