# Cloud-Based Smart EV Charging and Reservation Platform with Real-Time Monitoring

**College Project:** Cloud Architecture and Design (CAD)  
**Target Deployment OS:** Amazon Linux 2023 on Amazon EC2 (`t3.micro`)  
**Backend Stack:** Node.js 22 LTS, Express.js (ES Modules), Supabase PostgreSQL, Supabase Auth, PM2, GitHub  

---

## 🧭 Repository Quick Links

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

For complete Amazon Linux 2023 EC2 deployment, PM2 supervisor setup, and frontend integration contracts, please refer to [`backend/README.md`](backend/README.md).
