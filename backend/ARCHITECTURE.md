# Cloud Architecture and Design Specification

## Project Title
**Cloud-Based Smart EV Charging and Reservation Platform with Real-Time Monitoring**

---

## 1. System Architecture Diagram

```
+-------------------------------------------------------------------------+
|                  Client Layer (React.js Frontend SPA)                   |
|   - Driver Portal: Station discovery, slot reservation, simulated pay   |
|   - Admin Dashboard: Station management, system analytics, metrics      |
+-------------------------------------------------------------------------+
                                     |
                                     | HTTPS / HTTP REST API
                                     | Header: Authorization: Bearer <JWT>
                                     v
+-------------------------------------------------------------------------+
|                   Compute Layer (Amazon EC2 Instance)                   |
|                   Operating System: Amazon Linux 2023                    |
|                   Instance Type:    t3.micro (1 vCPU, 1 GiB RAM)        |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                 PM2 Process Supervisor & Daemon                   |  |
|  |  +-------------------------------------------------------------+  |  |
|  |  |                 Node.js + Express.js API Server             |  |  |
|  |  |  - Security: Helmet (HTTP Headers), CORS, Express Rate Limit|  |  |
|  |  |  - Auth Middleware: Supabase Token Validation               |  |  |
|  |  |  - Admin Guard: Database-verified Role-Based Access Control |  |  |
|  |  |  - Health Probe: GET /api/health (Uptime, Status, Time)     |  |  |
|  |  +-------------------------------------------------------------+  |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
                                     |
                                     | Secure TLS (HTTPS / WSS / PostgreSQL)
                                     v
+-------------------------------------------------------------------------+
|                    Managed Cloud Backend (Supabase)                     |
|                                                                         |
|  +----------------------------------+  +-----------------------------+  |
|  |     Supabase Auth Engine         |  |   Supabase PostgreSQL DB    |  |
|  |  - User registration & sign-in   |  |  - Profiles, Stations, Slots|  |
|  |  - Cryptographic JWT issuance    |  |  - GiST Exclusion Constraint|  |
|  |  - Password hashing (bcrypt)     |  |  - Atomic Locking Procedure |  |
|  |  - Auto-profile DB trigger       |  |  - Row Level Security (RLS) |  |
|  +----------------------------------+  +-----------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 2. Component Responsibilities

### 2.1 React Frontend (Client Layer)
- Developed separately by the frontend team.
- Consumes the Express REST API using standard `fetch` or `axios`.
- Stores the Supabase `access_token` in memory or secure web storage.
- Attaches `Authorization: Bearer <access_token>` to all protected endpoints.
- Communicates with the backend at `http://<EC2_PUBLIC_IP>:5000/api` or via custom domain.

### 2.2 Node.js & Express API (Compute Layer on Amazon EC2)
- **Runtime**: Node.js 22 LTS on Amazon Linux 2023.
- **Process Supervisor**: PM2 for auto-restart, background daemonization, and boot persistence.
- **Traffic Protection**:
  - `helmet`: Sets HTTP security headers (prevents clickjacking, MIME-sniffing, XSS).
  - `cors`: Restricts cross-origin browser requests based on `.env` configuration.
  - `express-rate-limit`: Prevents brute-force attacks and denial-of-service on API endpoints.
- **Business Logic & Orchestration**:
  - Validates all request payloads (UUID format, timestamps, email syntax, numeric limits).
  - Calculates pricing dynamically based on duration and station rates.
  - Bridges the client to the database securely without ever exposing the `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- **Monitoring & Health**: Exposes `GET /api/health` returning system uptime, status, and environment.

### 2.3 Supabase Auth & PostgreSQL (Database & Identity Layer)
- **Identity Provider**: Supabase Auth securely manages users, password hashing, and token issuance.
- **Relational Data Storage**: PostgreSQL manages profiles, stations, charging slots, bookings, and payment records.
- **Database-Level Concurrency Control**: PostgreSQL `btree_gist` exclusion constraint prevents duplicate or overlapping reservations mathematically at the database layer.
- **Row Level Security (RLS)**: Enforces table-level access rules directly inside PostgreSQL.

---

## 3. Authentication & Authorization Flow

```
User / Driver                   Node.js Express Backend                 Supabase Auth & DB
     |                                    |                                     |
     | 1. POST /api/auth/login            |                                     |
     |    { email, password }             |                                     |
     | ---------------------------------> | 2. supabase.auth.signInWithPassword |
     |                                    | ----------------------------------> |
     |                                    | 3. Returns Session & Access JWT     |
     |                                    | <---------------------------------- |
     |                                    | 4. Query public.profiles for role   |
     |                                    | ----------------------------------> |
     | 5. Return JWT & Profile with Role  |                                     |
     | <--------------------------------- |                                     |
     |                                    |                                     |
     | 6. POST /api/bookings              |                                     |
     |    Header: Bearer <JWT>            |                                     |
     | ---------------------------------> | 7. authenticate middleware          |
     |                                    |    Calls supabase.auth.getUser(JWT) |
     |                                    | ----------------------------------> |
     |                                    | 8. Query user role from DB          |
     |                                    | <---------------------------------- |
     |                                    | 9. Process reservation atomically   |
     | 10. Booking Confirmed              |                                     |
     | <--------------------------------- |                                     |
```

### Security Guarantees:
- **No Plaintext Passwords**: Passwords never touch application memory unencrypted; Supabase Auth handles bcrypt hashing.
- **No Role Forgery**: The user's role (`user` or `admin`) is ALWAYS queried from `public.profiles.role` in PostgreSQL. Client-supplied roles in headers or request bodies are completely ignored.
- **Service-Role Isolation**: The backend uses the elevated `SUPABASE_SERVICE_ROLE_KEY` solely on the server side to bypass RLS when performing trusted administrative tasks, and never leaks it to the frontend.

---

## 4. Safe Booking Concurrency & Real-Time Monitoring

### 4.1 The Double-Booking Concurrency Challenge
In an EV charging platform, multiple drivers may simultaneously view and attempt to reserve the same physical charging slot (EVSE connector) for the exact same time window. Relying solely on application-level checks creates a classic race condition (Time-of-Check to Time-of-Use / TOCTOU).

### 4.2 Multi-Layered Protection Strategy

1. **Transactional Advisory Locking (`create_booking_atomic`)**:
   - Acquires an advisory transaction lock hashed by the slot UUID (`PERFORM pg_advisory_xact_lock(hashtext(p_slot_id::text));`).
   - Forces concurrent reservation requests for the same physical connector to execute sequentially, preventing simultaneous race conditions.

2. **PostgreSQL GiST Exclusion Constraint**:
   ```sql
   ALTER TABLE public.bookings
   ADD CONSTRAINT no_double_booking_exclusion
   EXCLUDE USING gist (
       slot_id WITH =,
       timestamptz_to_utc_tsrange(start_time, end_time) WITH &&
   )
   WHERE (status IN ('pending', 'confirmed'));
   ```
   - If two transactions overlap, PostgreSQL immediately rejects the second transaction with error code `23P01` (`exclusion_violation`).
   - The backend catches this violation and returns a friendly `409 Conflict` response to the client.

3. **15-Minute Reservation Expiry & Auto-Release**:
   - Pending reservations must be confirmed through simulated payment within 15 minutes.
   - Any unpaid booking older than 15 minutes is automatically marked `'cancelled'` by `cleanup_expired_pending_bookings()` and ignored in real-time slot calculations, immediately returning the connector to the available pool.

4. **Slot Cancellation**:
   - When a booking is cancelled (`PATCH /api/bookings/:id/cancel`), its status becomes `'cancelled'`.
   - Because the GiST constraint only checks `status IN ('pending', 'confirmed')`, cancelling immediately releases the slot without manual lock clearing.

---

## 5. Health Monitoring & Operational Visibility

1. **HTTP Health Check (`GET /api/health`)**:
   - Returns real-time health indicator (`status: healthy`), server uptime, and timestamp.
   - Excluded from rate-limiting to allow continuous external polling.
2. **Process Monitoring via PM2**:
   - `pm2 status`: Inspects process state, uptime, CPU, and RAM usage.
   - `pm2 monit`: Real-time interactive dashboard in the terminal.
   - `pm2 logs ev-backend`: Streaming log viewer capturing HTTP requests and exceptions.
3. **Memory Safeguard for t3.micro**:
   - `t3.micro` has 1 GiB total RAM.
   - PM2 is configured with `--max-memory-restart 300M` to automatically recycle the worker process if memory grows, preventing system lockups.

---

## 6. Future Production Scaling Roadmap (Documented Improvements)

*Note: For the current college project, a single EC2 instance is optimal, cost-effective, and fully functional. The following improvements represent the documented enterprise scaling path:*

1. **Application Load Balancer (AWS ALB)**:
   - Terminate SSL/TLS certificates using AWS Certificate Manager (ACM).
   - Distribute incoming HTTPS traffic evenly across multiple EC2 instances in different Availability Zones (AZs).
2. **AWS Auto Scaling Group (ASG)**:
   - Automatically launch additional EC2 instances during peak EV charging hours based on CPU utilization or target tracking metrics.
3. **PostgreSQL Connection Pooling (PgBouncer / Supabase Pooler)**:
   - Handle thousands of concurrent microservices and frontend clients using transaction pooling.
4. **Distributed Caching (Redis / AWS ElastiCache)**:
   - Cache static station details, catalog information, and slot metadata to reduce database read load.
5. **Real-Time WebSockets / Server-Sent Events (SSE)**:
   - Push live charging slot state changes (`available` -> `occupied` -> `available`) directly to driver maps in real time.
