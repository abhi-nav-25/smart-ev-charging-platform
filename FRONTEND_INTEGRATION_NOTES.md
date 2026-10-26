# Frontend Integration Notes: Smart EV Charging Platform

> **Project:** Cloud-Based Smart EV Charging and Reservation Platform with Real-Time Monitoring  
> **Backend Architecture:** Node.js 22 LTS, Express.js (ES Modules), Supabase (Auth + PostgreSQL), PM2, AWS EC2 (Amazon Linux 2023)  
> **Frontend Stack:** React 19, Vite, React Router DOM v7, Leaflet / React-Leaflet, Axios, Lucide Icons  
> **Document Purpose:** Complete backend analysis, verified API contracts, data models, authentication mechanisms, and integration guidelines for frontend development.

---

## 1. Stack Overview & Backend Structure

The backend repository (`backend/`) is structured with clear separation of concerns (Routes $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Supabase client):

```
backend/
├── database/
│   ├── schema.sql         # PostgreSQL schema, GiST exclusion constraint, RLS policies, RPCs
│   └── seed.sql           # Seed data (5 stations, 17 charging slots in Bangalore)
├── src/
│   ├── app.js             # Express app: Helmet, CORS, Rate Limiting, JSON parsing, routes
│   ├── server.js          # HTTP server listening on 0.0.0.0, graceful shutdown handlers
│   ├── config/
│   │   ├── supabase.js    # Supabase public & service-role client initialization
│   │   └── validateEnv.js # Startup environment verification without credential leakage
│   ├── controllers/
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── booking.controller.js
│   │   ├── payment.controller.js
│   │   └── station.controller.js
│   ├── middleware/
│   │   ├── authenticate.js# Supabase JWT validator & DB profile loader (req.user)
│   │   ├── errorHandler.js# Centralized error handler & 404 handler
│   │   └── requireAdmin.js# Role-based access control guard (role === 'admin')
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
│       ├── response.js    # Standard success/error JSON response envelopes
│       └── validator.js   # UUID, ISO-8601, email, and required-field validators
├── tests/
│   ├── api.test.js        # Route and status code integration tests
│   ├── unit.test.js       # Middleware, RBAC, and error handler unit tests
│   └── validation.test.js # Input sanitization tests
├── .env.example           # Environment template
├── ARCHITECTURE.md        # Cloud architecture specification
└── package.json           # Dependencies and scripts (ES modules)
```

---

## 2. How to Run the Backend Locally

### Prerequisites
- **Node.js:** v18.x, v20.x, or v22.x LTS (Node 22 LTS recommended)
- **Supabase Project:** Free tier instance at [supabase.com](https://supabase.com)

### Step-by-Step Setup

1. **Navigate to the backend directory and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Create the environment file:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Configure `.env` with Supabase project keys (from Supabase Dashboard $\rightarrow$ Project Settings $\rightarrow$ API):
   ```env
   PORT=5000
   NODE_ENV=development
   CORS_ORIGIN=*

   SUPABASE_URL=https://<your-project-id>.supabase.co
   SUPABASE_ANON_KEY=<your_supabase_anon_key>
   SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>

   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=100
   ```

3. **Initialize Database Tables & Seed Data:**
   - In Supabase Dashboard $\rightarrow$ **SQL Editor**, run the entire contents of [`backend/database/schema.sql`](backend/database/schema.sql).
   - Next, run [`backend/database/seed.sql`](backend/database/seed.sql) to populate 5 sample stations and 17 charging slots.

4. **Run the Test Suite (Verifies setup without connecting to live DB):**
   ```bash
   npm test
   ```

5. **Start the Backend Server:**
   - Development (watch mode):
     ```bash
     npm run dev
     ```
   - Standard start:
     ```bash
     npm start
     ```

6. **Verify Server Health:**
   ```bash
   curl http://localhost:5000/api/health
   ```
   Expected response:
   ```json
   {
     "success": true,
     "message": "Server is running and operational.",
     "data": {
       "status": "healthy",
       "uptime": "0h 0m 15s",
       "uptime_seconds": 15,
       "timestamp": "2026-10-25T17:30:00.000Z",
       "service": "Smart EV Charging & Reservation API",
       "version": "1.0.0",
       "environment": "development"
     }
   }
   ```

---

## 3. Authentication & Authorization Mechanism

### Core Principles
1. **Supabase Auth Engine as Identity Provider:**
   The backend delegates password hashing (bcrypt), token issuance, and user record management in `auth.users` to Supabase.
2. **Database-Driven Role Verification (Zero Trust for Client Roles):**
   Client requests never dictate user roles. User role (`user` vs `admin`) is always fetched from PostgreSQL table `public.profiles`.
3. **Auto-Profile Synchronization:**
   A PostgreSQL trigger (`on_auth_user_created`) automatically creates a row in `public.profiles` whenever a user signs up. The controller also executes an upsert fallback for resilience.

### Authentication Flow
```
Frontend (React)                     Backend (Express)                    Supabase
      |                                      |                               |
      | 1. POST /api/auth/login              |                               |
      |    { email, password }               |                               |
      | -----------------------------------> | 2. signInWithPassword()       |
      |                                      | ----------------------------> |
      |                                      | 3. Returns Session + JWT      |
      |                                      | <---------------------------- |
      |                                      | 4. Query public.profiles      |
      |                                      | ----------------------------> |
      | 5. Return access_token & user profile|                               |
      | <----------------------------------- |                               |
      |                                      |                               |
      | 6. Request with Header:              |                               |
      |    Authorization: Bearer <token>     |                               |
      | -----------------------------------> | 7. authenticate middleware    |
      |                                      |    calls auth.getUser(token)  |
      |                                      | ----------------------------> |
      |                                      | 8. Resolves req.user with role|
      |                                      | 9. requireAdmin (if admin URL)|
```

### Authorization Middleware Rules
- **`authenticate` middleware:**
  - Extracts `Bearer <token>` from `Authorization` header.
  - Validates cryptographic signature via `supabase.auth.getUser(token)`.
  - Queries `public.profiles` by `user.id` to read `role`, `email`, and `full_name`.
  - Attaches `req.user = { id, email, role, profile }`.
  - Returns HTTP 401 if token is absent, empty, malformed, or expired.
- **`requireAdmin` middleware:**
  - Checks `req.user.role === 'admin'`.
  - Returns HTTP 403 (`Access denied: Administrator privileges are required...`) if the user does not possess the `admin` role.

### Creating an Admin User
Since the registration API sets `role: 'user'` by default, admin status must be granted directly in the database:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

---

## 4. Complete API Endpoint Reference

All endpoints return a uniform JSON envelope:
- **Success:** `{ "success": true, "message": "...", "data": <payload> }`
- **Error:** `{ "success": false, "message": "...", "errors": <optional_details> }`

Base Path: `/api` (or `/` for root status)

| # | Method | Path | Auth | Access Role | Description |
|---|---|---|---|---|---|
| **1** | `GET` | `/` | None | Public | Root welcome message and API metadata |
| **2** | `GET` | `/api/health` | None | Public | Health monitoring probe, uptime, and timestamp (excluded from rate limiter) |
| **3** | `POST` | `/api/auth/register` | None | Public | Register new user account with email & password |
| **4** | `POST` | `/api/auth/login` | None | Public | Authenticate user; returns JWT session and role |
| **5** | `GET` | `/api/auth/me` | Bearer Token | Authenticated (`user` or `admin`) | Get current authenticated user profile |
| **6** | `GET` | `/api/stations` | None | Public | List all stations with dynamically computed `available_slots`. Supports `?search=` |
| **7** | `GET` | `/api/stations/:id` | None | Public | Detailed station view with enriched physical `charging_slots` and occupancy states |
| **8** | `POST` | `/api/bookings` | Bearer Token | Authenticated (`user` or `admin`) | Reserve a slot (concurrency-safe atomic booking, sets status to `pending`) |
| **9** | `GET` | `/api/bookings/my` | Bearer Token | Authenticated (`user` or `admin`) | Get all bookings of the currently logged-in user |
| **10** | `GET` | `/api/bookings/:id` | Bearer Token | Authenticated (Owner or Admin) | Get single booking details by ID (enforces ownership) |
| **11** | `PATCH`| `/api/bookings/:id/cancel`| Bearer Token | Authenticated (Owner or Admin) | Cancel reservation, immediate slot release, refunds simulated payment |
| **12** | `POST` | `/api/payments/simulate`| Bearer Token | Authenticated (Booking Owner) | Simulate card/UPI payment; confirms booking on success, cancels on failure |
| **13** | `GET` | `/api/admin/stats` | Bearer Token | Admin only | System-wide statistics, active charging slots, revenue metrics |
| **14** | `GET` | `/api/admin/bookings` | Bearer Token | Admin only | View all system reservations with `?status=`, `?station_id=`, `?limit=`, `?offset=` |
| **15** | `POST` | `/api/admin/stations` | Bearer Token | Admin only | Create new charging station and auto-generate or specify slots |
| **16** | `PATCH`| `/api/admin/stations/:id`| Bearer Token | Admin only | Update station details (pricing, status, address, name) |

---

## 5. Detailed Domain Functionality & Contracts

### 5.1 Stations & Charging Slots

#### List Stations: `GET /api/stations`
- **Query Params:** `?search=<term>` (matches station `name` or `address` case-insensitively).
- **Available Slots Calculation:** Available slot count is not a static number in the database. The backend calculates `available_slots` dynamically by checking slots marked `'available'` and subtracting slots with active reservations (`status = 'confirmed'` or unpaid `status = 'pending'` within 15 minutes) intersecting the current timestamp.
- **Item Schema:**
  ```json
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Tech Park HyperCharge Hub",
    "address": "Building 4, Electronic City Phase 1, Bangalore, Karnataka",
    "latitude": 12.8399,
    "longitude": 77.6770,
    "connector_type": "CCS2 / Type 2",
    "price_per_kwh": 18.5,
    "total_slots": 4,
    "available_slots": 3,
    "status": "active",
    "created_at": "2026-10-25T10:00:00Z"
  }
  ```

#### Station Details: `GET /api/stations/:id`
- Returns station details along with nested `charging_slots` array.
- **Slot Object Schema:**
  ```json
  {
    "id": "a1111111-1111-1111-1111-111111111111",
    "slot_number": 1,
    "connector_type": "CCS2 DC Fast",
    "power_output_kw": 60,
    "status": "available",
    "is_currently_occupied": false,
    "real_time_status": "available"
  }
  ```
  *(Status values: `available`, `occupied`, `maintenance`)*

---

### 5.2 Bookings & Concurrency Protection

#### Create Booking: `POST /api/bookings`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "station_id": "11111111-1111-1111-1111-111111111111",
    "slot_id": "a1111111-1111-1111-1111-111111111111",
    "booking_date": "2026-10-26",
    "start_time": "2026-10-26T10:00:00.000Z",
    "end_time": "2026-10-26T11:30:00.000Z"
  }
  ```
- **Validation Rules:**
  - All IDs must be valid UUIDs.
  - `start_time` and `end_time` must be valid ISO-8601 timestamps.
  - `end_time > start_time`.
  - Duration must be $\ge 15$ minutes and $\le 24$ hours (1440 minutes).
  - Slot must exist, belong to `station_id`, and not be in `maintenance`.
- **Pricing Calculation:**
  The backend calculates the price server-side to prevent client parameter tampering:
  $$\text{durationHours} = \frac{\text{endTime} - \text{startTime}}{3600000}$$
  $$\text{calculatedAmount} = \text{durationHours} \times 25\text{ kWh} \times \text{price\_per\_kwh}$$
- **Concurrency & Double-Booking Prevention:**
  1. Executes PostgreSQL RPC `create_booking_atomic` with `pg_advisory_xact_lock(hashtext(p_slot_id::text))`.
  2. Enforced at PostgreSQL engine level via `btree_gist` exclusion constraint:
     ```sql
     EXCLUDE USING gist (
       slot_id WITH =,
       timestamptz_to_utc_tsrange(start_time, end_time) WITH &&
     ) WHERE (status IN ('pending', 'confirmed'))
     ```
  3. If another user books the slot concurrently, the backend responds with HTTP 409 Conflict:
     ```json
     {
       "success": false,
       "message": "The selected charging slot is already reserved for this time window"
     }
     ```
- **Booking Initial State:** Status is created as `'pending'`. The driver has **15 minutes** to complete simulated payment, or it is automatically released.

#### Get User Bookings: `GET /api/bookings/my`
- Returns an array of reservations for the logged-in user, sorted by `created_at DESC`.
- Includes nested `station`, `slot`, and `payments` objects.

#### Cancel Booking: `PATCH /api/bookings/:id/cancel`
- Ownership is verified (`user_id === req.user.id` or user is `admin`).
- Cannot cancel if already `cancelled` or `completed`.
- Regular users cannot cancel historical bookings whose time window has already elapsed (`end_time <= now`).
- Sets status to `cancelled`. Because the GiST constraint only locks `status IN ('pending', 'confirmed')`, cancelling immediately frees the slot for other drivers.
- If the booking was previously `confirmed`, any successful payment record is updated to `refunded`.

---

### 5.3 Simulated Payment

#### Payment Simulation: `POST /api/payments/simulate`
- **Request Body:**
  ```json
  {
    "booking_id": "9369ebcb-7042-491b-8526-896899ffb737",
    "status": "success",
    "payment_method": "simulated_card"
  }
  ```
  *(Status can be `"success"` or `"failed"`; default `payment_method` is `"simulated_card"`, can also pass `"simulated_upi"`).*
- **Business Logic:**
  - Verifies booking exists and belongs to the authenticated user.
  - Verifies booking is not already `confirmed` or `cancelled`.
  - Rejects duplicate payments.
  - Verifies booking age is $\le 15$ minutes. If older than 15 minutes, automatically cancels the booking and throws HTTP 400.
  - On `"success"`:
    - Inserts record into `payments` table with unique transaction reference `SIM-TXN-<timestamp>-<rand>`.
    - Updates booking status to `'confirmed'`.
    - Returns HTTP 200 with payment and updated booking details.
  - On `"failed"`:
    - Inserts payment record with `payment_status: 'failed'`.
    - Transitions booking status from `'pending'` to `'cancelled'` so that failed payments release the slot immediately.
    - Returns HTTP 402 with updated booking and disclaimer.

---

### 5.4 Administrator Functionality

All admin routes require `Authorization: Bearer <token>` AND `role === 'admin'`.

#### Admin Stats: `GET /api/admin/stats`
- Returns high-level metrics for dashboard cards and charts:
  ```json
  {
    "success": true,
    "message": "System operational statistics retrieved successfully.",
    "data": {
      "total_stations": 5,
      "total_bookings": 18,
      "confirmed_bookings": 14,
      "available_slots": 12,
      "metrics": {
        "total_slots": 17,
        "slots_in_maintenance": 1,
        "slots_currently_charging": 4,
        "simulated_revenue": 4900.00
      }
    }
  }
  ```

#### All Bookings Inspection: `GET /api/admin/bookings`
- Query parameters:
  - `?status=pending|confirmed|cancelled|completed`
  - `?station_id=<uuid>`
  - `?limit=50`
  - `?offset=0`
- Returns all bookings across all users with station and connector details.

#### Create Station: `POST /api/admin/stations`
- **Request Body:**
  ```json
  {
    "name": "Outer Ring Road High Speed Station",
    "address": "Bellandur Junction, Bangalore",
    "latitude": 12.9260,
    "longitude": 77.6762,
    "connector_type": "CCS2 Ultra-Fast",
    "price_per_kwh": 19.50,
    "total_slots": 4,
    "status": "active",
    "slots": [
      { "connector_type": "CCS2 Ultra-Fast", "power_output_kw": 120, "status": "available" }
    ]
  }
  ```
  *(If `slots` array is omitted, backend auto-generates slots 1 through `total_slots` with default 50 kW power output).*

#### Update Station: `PATCH /api/admin/stations/:id`
- Allows modifying `name`, `address`, `latitude`, `longitude`, `connector_type`, `price_per_kwh`, `total_slots`, and `status` (`'active'`, `'maintenance'`, `'inactive'`).

---

## 6. Database Schema & Data Models

### Tables Summary

| Table | Primary Key | Key Foreign Keys | Notable Constraints |
|---|---|---|---|
| `profiles` | `id UUID` | `id` $\rightarrow$ `auth.users(id)` | `role IN ('user', 'admin')` |
| `stations` | `id UUID` | None | `price_per_kwh >= 0`, `status IN ('active', 'maintenance', 'inactive')` |
| `charging_slots`| `id UUID` | `station_id` $\rightarrow$ `stations(id)` | `UNIQUE(station_id, slot_number)`, `status IN ('available', 'occupied', 'maintenance')` |
| `bookings` | `id UUID` | `user_id` $\rightarrow$ `auth.users(id)`, `station_id`, `slot_id` | `end_time > start_time`, GiST `no_double_booking_exclusion` on `(slot_id, tsrange)` |
| `payments` | `id UUID` | `booking_id` $\rightarrow$ `bookings(id)`, `user_id` | `payment_status IN ('success', 'failed', 'refunded')`, `transaction_reference UNIQUE` |

---

## 7. Frontend Integration Contract & Guidelines

### 7.1 Environment Configuration
In the `frontend/` directory, create `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```
When deploying to AWS EC2:
```env
VITE_API_URL=http://<EC2_PUBLIC_IP>:5000/api
```

### 7.2 Axios / HTTP Client Setup
Create an API client instance (e.g. `src/services/api.js`) that automatically injects the token:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### 7.3 Response Handling Convention
Because all backend endpoints return `{ success, message, data, errors }`, frontend API handlers should unpack `res.data.data` on success, and display `error.response?.data?.message` on errors.

### 7.4 Price Estimate Formula Alignment
To ensure the estimated price shown in the booking dialog matches what the backend will record, the frontend should calculate:
```javascript
const durationHours = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
const estimatedAmount = Number((durationHours * 25 * station.price_per_kwh).toFixed(2));
```

### 7.5 Real-Time Monitoring Strategy (Client Implementation)
Since WebSockets/SSE are not implemented on the Express server, the frontend should implement polling for real-time monitoring:
1. **Station Availability (Map / List view):** Poll `GET /api/stations` every 15–30 seconds when the user is actively viewing the map.
2. **Station Detail & Slot Occupancy:** Poll `GET /api/stations/:id` every 10–15 seconds on the booking/station detail page.
3. **Pending Payment Countdown:** Display a 15-minute countdown timer on the payment screen based on `booking.created_at`.

---

## 8. Missing Functionality & Frontend Workaround Matrix

The following table documents backend gaps that the frontend team must account for:

| Area | Missing Backend Functionality | Impact on Frontend | Recommended Frontend Handling / Workaround |
|---|---|---|---|
| **Real-Time Updates** | No WebSockets, Socket.io, or Server-Sent Events (SSE) implemented in Express | Slot availability cannot be pushed to client automatically | Implement polling intervals (`setInterval` / TanStack React Query `refetchInterval` of 15s) on active views. |
| **Token Refresh** | No `POST /api/auth/refresh` route in Express backend | When Supabase JWT expires (default 1 hr), API calls fail with 401 | On 401 response interceptor, redirect to `/login` with an expiration prompt, or store session timestamp to prompt re-login. |
| **Logout Endpoint** | No `POST /api/auth/logout` endpoint in backend | Backend does not track token invalidation | Client-side logout: clear stored token/profile from `localStorage` / state and redirect to `/login`. |
| **User Profile Updates** | No `PATCH /api/auth/me` or `/api/auth/profile` route | User cannot update their `full_name`, `phone`, or EV vehicle info | Keep profile page read-only for now, displaying data from `GET /api/auth/me`. |
| **Direct Slot Management** | No `PATCH /api/admin/slots/:id` or `POST /api/admin/slots` | Admin cannot directly set an individual slot to `maintenance` | Admin can toggle station-level status to `maintenance` via `PATCH /api/admin/stations/:id`, which affects all slots. |
| **Delete Operations** | No `DELETE /api/admin/stations/:id` or slot delete route | Admin cannot permanently delete stations | Admin can mark station status as `'inactive'` via `PATCH /api/admin/stations/:id`. |
| **Booking Lifecycle** | No endpoint to mark booking as `'completed'` after charging finishes | Booking stays `'confirmed'` indefinitely in historical list | Frontend can visually classify confirmed bookings whose `end_time < now` as "Completed" in UI logic. |
| **User History Pagination**| `GET /api/bookings/my` has no `limit`/`offset` query params | All historical bookings return at once | Perform client-side pagination or slicing for the user booking list. |

---

## 9. Verification Status: Verified vs Unknown

### Verified Facts (Confirmed via Codebase Inspection)
1. Backend runs on **Node.js 22 LTS / Express (ES Modules)** with `server.js` and `app.js`.
2. Fully functional test suite in `tests/` covering routes, middleware, RBAC, and validation.
3. 16 distinct Express routes across 5 route files (`auth`, `stations`, `bookings`, `payments`, `admin`).
4. Strict Supabase JWT validation in `authenticate.js` and role checking against `public.profiles`.
5. Database schema contains 5 tables (`profiles`, `stations`, `charging_slots`, `bookings`, `payments`) with GiST exclusion constraint preventing overlapping reservations.
6. 15-minute expiration logic for unpaid pending bookings exists in both database SQL functions and backend services.
7. Simulated payment workflow generates unique reference numbers and handles success/failure gracefully.
8. Seed data provides 5 charging stations and 17 slots in Bangalore with realistic coordinates and pricing.

### Unknowns & External Dependencies
1. **Supabase Instance Status:** Whether the live Supabase database instance has already been created and migrated with `schema.sql` and `seed.sql` by your teammate, or if credentials still need to be placed in `backend/.env`.
2. **Supabase Email Confirmation Setting:** If email confirmation is enabled in the Supabase dashboard, users registering via `POST /api/auth/register` will not be able to log in until verifying their email address. If disabled (standard for academic demos), users can log in immediately.
3. **EC2 Deployment State:** Whether the AWS EC2 instance is currently active or if local testing (`http://localhost:5000`) will be used during the initial frontend build phase.
