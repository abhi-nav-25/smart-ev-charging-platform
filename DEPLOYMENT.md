# AWS EC2 Production Deployment Specification

**Project:** VoltWay — Cloud-Based Smart EV Charging and Reservation Platform  
**Target Environment:** Amazon Web Services (AWS) EC2 — Amazon Linux 2023 (`t3.micro`)  
**Deployment Architect:** Smridhi Agarwal  
**Live Endpoint:** [http://56.228.22.74](http://56.228.22.74)  

---

## 🏗️ Production Architecture

```
                       +------------------------------------------+
                       |          Web Browser / Client            |
                       +--------------------+---------------------+
                                            |
                                            | HTTP (Port 80)
                                            v
                       +------------------------------------------+
                       |       Amazon EC2 (Amazon Linux 2023)     |
                       |       Instance Type: t3.micro            |
                       |                                          |
                       |   +----------------------------------+   |
                       |   |         Nginx Reverse Proxy      |   |
                       |   |   • "/"      -> React SPA files  |   |
                       |   |   • "/api/*" -> localhost:5000   |   |
                       |   +----------------+-----------------+   |
                       |                    |                     |
                       |                    v                     |
                       |   +----------------------------------+   |
                       |   |      PM2 Process Supervisor      |   |
                       |   |   +--------------------------+   |   |
                       |   |   | Node.js 22 Express API   |   |   |
                       |   |   | (Port 5000, ES Modules)  |   |   |
                       |   |   +--------------------------+   |   |
                       |   +----------------------------------+   |
                       +--------------------+---------------------+
                                            |
                                            | TLS / Encrypted Database RPC
                                            v
                               +----------------------------------+
                               |       Supabase Cloud             |
                               |    (PostgreSQL 15 & Auth)        |
                               +----------------------------------+
```

---

## 🛠️ Infrastructure Implementation Steps

### 1. Compute & Hardening (Amazon Linux 2023)
- Provisioned `t3.micro` EC2 instance in `eu-north-1` (Stockholm).
- Configured 1 GiB Swap memory (`/swapfile`) to ensure stable compilation and runtime memory headroom on 1 GiB physical RAM instances.
- Installed **Node.js 22 LTS** to support native WebSockets required by `@supabase/supabase-js` v2.

### 2. Process Supervision (PM2)
- Daemonized the Express.js server:
  ```bash
  pm2 start src/server.js --name "ev-backend" --max-memory-restart 300M
  ```
- Configured Linux `systemd` startup hooks (`pm2 startup systemd` and `pm2 save`) to ensure automatic service recovery across server reboots.

### 3. Frontend Compilation
- Compiled Vite production bundle with relative API resolution (`VITE_API_URL=/api`), eliminating browser CORS preflight friction.
- Deployed built static assets into `/usr/share/nginx/html/`.

### 4. Nginx Web Server & Reverse Proxy
Configured `/etc/nginx/default.d/voltway.conf`:
- **Single-Page Application Fallback**: `try_files $uri $uri/ /index.html;` to ensure client-side routes (`/stations`, `/bookings/my`, `/admin`) resolve seamlessly without 404s.
- **API Proxy**: Upstream proxy from `/api/` to internal port `5000` with WebSocket upgrade headers.

---

## 🧪 Production Verification

- **Health Probe**:
  `GET http://56.228.22.74/api/health` ➔ Status 200 OK (`healthy`)
- **Stations Catalog**:
  `GET http://56.228.22.74/api/stations` ➔ Status 200 OK (5 seeded charging stations loaded from Supabase)
- **Frontend SPA**:
  `GET http://56.228.22.74/` ➔ Status 200 OK (VoltWay React Application)
