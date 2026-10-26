# Cloud-Based Smart EV Charging and Reservation Platform with Real-Time Monitoring

**College Project:** Cloud Architecture and Design (CAD)  
**Target Deployment OS:** Amazon Linux 2023 on Amazon EC2 (`t3.micro`)  
**Backend Stack:** Node.js 22 LTS, Express.js (ES Modules), Supabase PostgreSQL, Supabase Auth, PM2, GitHub  
**Frontend Stack:** React 19, Vite, Leaflet, React Router  
**Production Reverse Proxy:** Nginx (Single Port 80 for SPA & API)  

---

## 🌐 Live AWS Cloud Deployment

The application is deployed and operational on AWS EC2:

| Component | URL | Status |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://56.228.22.74](http://56.228.22.74) | 🟢 Live |
| **Backend API Health** | [http://56.228.22.74/api/health](http://56.228.22.74/api/health) | 🟢 Operational |
| **Stations Directory API** | [http://56.228.22.74/api/stations](http://56.228.22.74/api/stations) | 🟢 Active (5 Stations) |

---

## 🧭 Repository Quick Links

- ☁️ **AWS EC2 Production Deployment Guide**: [`DEPLOYMENT.md`](DEPLOYMENT.md)
- 🏛️ **Cloud Architecture Specification**: [`backend/ARCHITECTURE.md`](backend/ARCHITECTURE.md)
- 📖 **Comprehensive Deployment & Setup Guide**: [`backend/README.md`](backend/README.md)
- 🗄️ **Database Schema & RLS Policies**: [`backend/database/schema.sql`](backend/database/schema.sql)
- 🌱 **Database Seed Data (5 Stations, 17 Slots)**: [`backend/database/seed.sql`](backend/database/seed.sql)
- 📮 **Postman API Test Collection**: [`backend/postman_collection.json`](backend/postman_collection.json)
- ⚙️ **Environment Template**: [`backend/.env.example`](backend/.env.example)
- 🧪 **Automated Test Suite**: [`backend/tests/`](backend/tests/)

---

## 🚀 Quick Start (Local Development)

```bash
cd backend
npm install
npm test
npm start
```

Health check verification:
```bash
curl http://localhost:5000/api/health
```

For complete Amazon Linux 2023 EC2 deployment, PM2 supervisor setup, Nginx reverse proxy configuration, and systemd persistence, see [`DEPLOYMENT.md`](DEPLOYMENT.md).
