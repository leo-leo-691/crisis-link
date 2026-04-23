# 🚨 CrisisLink
### Real-Time Emergency Response & Crisis Coordination for Hospitality

> **Google Solution Challenge 2026** | Addressing UN SDG 11 — Sustainable Cities and Communities

[![Live Demo](https://img.shields.io/badge/Live-Demo-red?style=for-the-badge)](YOUR_LIVE_URL_HERE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%20AI-blue?style=for-the-badge&logo=google)](https://aistudio.google.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase-green?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-white?style=for-the-badge&logo=socket.io)](https://socket.io)

---

## 🎯 The Problem

Large hospitality venues — hotels, resorts, and event spaces — face a critical communication gap during emergencies. Traditional response methods like walkie-talkies, phone trees, and manual logs are siloed, unstructured, and dangerously slow. When every second counts, fragmented communication costs lives.

During a crisis, three groups need to act simultaneously but often cannot:
- **Guests** have no reliable way to report emergencies quickly
- **Staff** receive incomplete or delayed information
- **Commanders** lack a unified view of what is happening and who is responding

---

## 💡 The Solution

CrisisLink is an AI-first emergency command and control platform that bridges the gap between distressed guests, on-site staff, and emergency commanders in real time. Powered by **Google Gemini 2.0 Flash**, it triages incidents in under 2 seconds — generating severity assessments, 8-step Standard Operating Procedures, evacuation routes, and staff deployment recommendations before a human supervisor has picked up a radio.

> **"The 2-Second Triage Advantage"** — CrisisLink does not just report emergencies. It interprets them, coordinates the response, and documents every action automatically.

---

## ✨ Features

### Core Features
| Feature | Description |
|---------|-------------|
| 🆘 Guest SOS Portal | No login required. Guests report emergencies in seconds via web or QR code scan |
| 🤖 AI Triage Engine | Gemini 2.0 Flash classifies severity, generates 8-step SOP, evacuation route, and do-not-do list |
| 📡 Real-Time Alerts | Socket.IO broadcasts incidents instantly to all staff dashboards simultaneously |
| 🗺️ Live Venue Map | SVG floor plan with color-coded severity zones and animated incident pins |
| ✅ Task Orchestration | Dynamic checklists auto-assigned to staff roles, updated in real time across all devices |
| 💬 Incident Chat | Isolated per-incident real-time chat channel for coordinating responders |
| 📋 Audit Timeline | Every action, status change, and message is timestamped and logged immutably |
| 📊 Analytics Dashboard | Historical trends, response times, zone hotspots, and KPI metrics |

### Advanced Features
| Feature | Description |
|---------|-------------|
| ⏱️ Auto-Escalation | Unacknowledged incidents automatically escalate to CRITICAL after 90 seconds |
| 🔴 Drill Mode | Simulate emergencies safely with 5 preset scenarios and post-drill performance reports |
| 📄 AI Debrief Report | API route and incident workflow support AI-generated post-incident analysis when incidents are resolved |
| 📱 PWA Offline Support | Service worker support via `next-pwa` with SOS continuity in unstable networks |
| 🔁 Offline Queue | Incidents submitted offline sync automatically when connection is restored |
| 📲 QR Code Access | Per-zone QR codes pre-fill the SOS form with location — scan and report in one tap |
| 🎬 Demo Autopilot | Press D on the landing page to watch a fully automated live demonstration |
| 📢 Broadcast System | Admins send instant one-to-many alerts to all connected staff |

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                      CLIENT TIER                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Guest SOS  │  │  Staff       │  │  Admin        │  │
│  │  Portal     │  │  Dashboard   │  │  Command      │  │
│  │  (No Login) │  │  + Map       │  │  Center       │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         └────────────────┼──────────────────┘          │
│                          │ Next.js + Zustand            │
└──────────────────────────┼──────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │ WebSockets │  HTTP/REST │
              │ Socket.IO  │  API       │
              └────────────┼────────────┘
                           │
┌──────────────────────────┼──────────────────────────────┐
│                    SERVICE TIER                         │
│                                                         │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  Next.js 14  │  │  Socket.IO  │  │  Escalation   │  │
│  │  API Gateway │  │  Event Bus  │  │  Service      │  │
│  │  App Router  │  │  Real-time  │  │  (30s checks) │  │
│  └──────────────┘  └─────────────┘  └───────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Google Gemini 2.0 Flash AI Engine        │   │
│  │   Triage · SOP Generation · Debrief Workflows    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Offline Layer                       │   │
│  │   Service Worker · LocalStorage Queue · Sync     │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────┐
│                     DATA TIER                           │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │          PostgreSQL + Supabase Integration       │   │
│  │  users · incidents · incident_tasks ·            │   │
│  │  incident_messages · incident_timeline ·         │   │
│  │  venue_zones · broadcast_messages                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | Frontend pages and backend API routes |
| Styling | Tailwind CSS | Utility-first responsive design |
| Animations | Framer Motion | Smooth transitions and micro-interactions |
| State | Zustand | Lightweight client-side state management |
| Real-Time | Socket.IO | WebSocket event bus for live updates |
| Database | PostgreSQL (`pg`) + Supabase SDK | Persistent cloud database and admin timeline integration |
| AI Engine | Google Gemini 2.0 Flash | Triage, SOP generation, and incident intelligence |
| Auth | JWT + bcrypt | Secure role-based authentication |
| Charts | Recharts | Analytics visualizations |
| QR Codes | External QR API + QR workflows | Zone-based guest access links and printable QR access |
| Icons | Lucide React | Consistent icon system |
| PWA | next-pwa | Offline support and installability |
| Server | Custom Node.js | Next.js + Socket.IO on same port |
| Deployment | Docker + Google Cloud Run | Containerized scalable deployment |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- A PostgreSQL database connection string (`DATABASE_URL`)
- A Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))
- (Optional) Supabase project keys for enhanced integrations

### Local Setup

1. Clone the repository
```bash
git clone https://github.com/leo-leo-691/crisis-link.git
cd crisislink
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```
Then open `.env` and fill in your values:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=any_random_string_minimum_32_characters
NODE_ENV=development
PORT=3000
DATABASE_URL=your_postgresql_connection_string
```

4. Set up database
- Provision a PostgreSQL database (Supabase Postgres works well)
- Add `DATABASE_URL` in `.env`
- Tables and seed data are initialized automatically on first server start via `lib/db.js`

5. Start the development server
```bash
npm run dev
```

6. Open your browser
```text
http://localhost:3000
```

---

## 👤 Demo Accounts

| Name | Email | Password | Role |
|------|-------|----------|------|
| Crisis Admin | admin@grandhotel.com | demo1234 | Admin |
| Duty Manager | manager@grandhotel.com | demo1234 | Manager |
| Marcus Rivera | staff@grandhotel.com | demo1234 | Staff |

---

## 🔄 How It Works

```text
1. 🆘  Guest scans QR code or visits /sos — reports emergency without login
         ↓
2. 🤖  Gemini 2.0 Flash analyzes report in under 2 seconds
       Outputs: severity, 8-step SOP, evacuation route, do-not-do list
         ↓
3. 📡  Socket.IO broadcasts incident:new to ALL connected staff simultaneously
       Audio alert fires. Browser notification sent. Dashboard updates live.
         ↓
4. ⏱️  Escalation timer starts — if no acknowledgment in 90 seconds
       severity auto-upgrades to CRITICAL
         ↓
5. ✅  Staff acknowledge, execute SOP tasks, coordinate via live incident chat
       Every action is timestamped in the immutable audit timeline
         ↓
6. 🔒  Incident resolved — debrief workflow can generate AI post-incident report
       Handoff report available for emergency services
         ↓
7. 📊  Analytics dashboard updates with new incident data
       Response time, zone hotspots, and trends tracked automatically
```

---

## 🎬 Demo

Press **D** on the landing page or click **▶ Watch Live Demo** to see an automated end-to-end demonstration of the full emergency response cycle.

---

## 📱 Screenshots

### Landing Page
> Command Glass design with live system status, animated hero, and role-based entry cards
`[Add screenshot here]`

### Guest SOS Portal
> High-contrast emergency reporting interface — no login required, voice-to-text enabled
`[Add screenshot here]`

### Staff Command Dashboard
> Live incident feed with SVG venue map, severity-colored zones, and real-time socket updates
`[Add screenshot here]`

### Incident Detail with AI Triage
> Full AI triage panel showing severity, confidence meter, 8-step SOP, evacuation route
`[Add screenshot here]`

### Admin Analytics
> KPI cards, incident trends, zone hotspots, and response time analytics
`[Add screenshot here]`

### Drill Mode
> Safe simulation environment with 5 preset scenarios and post-drill performance reports
`[Add screenshot here]`

---

## 🌍 Social Impact

CrisisLink directly contributes to **UN Sustainable Development Goal 11 — Sustainable Cities and Communities** by enhancing the safety and resilience of public hospitality spaces.

**Estimated Impact:**
- 40% reduction in emergency response time through AI-automated triage vs manual assessment
- Zero communication lag between guests, staff, and commanders via real-time WebSockets
- 100% audit compliance through immutable incident timelines
- Works in low or no internet conditions via offline-first PWA architecture

**Target beneficiaries:** Hotel and resort guests, hospitality workers, and emergency responders globally. The platform is designed to be venue-agnostic and can be deployed across hotels, resorts, hospitals, shopping centres, and any large public venue.

---

## 🗺️ Roadmap

- [ ] Native mobile app (React Native) with push notifications
- [ ] IoT sensor integration (smoke detectors, panic buttons, CCTV triggers)
- [ ] Multi-property enterprise dashboard for hotel chains
- [ ] Predictive risk scoring using historical incident pattern analysis
- [ ] Direct API integration with national emergency services (112, 999, 911)
- [ ] Hardware NFC panic button for staff lanyards
- [ ] Multilingual SOS portal with auto-detection
- [ ] WhatsApp and SMS broadcast channel integration

---

## 🏃 Running in Production

### Docker
```bash
docker build -t crisislink .
docker run -p 3000:3000 \
  -e DATABASE_URL=your_postgresql_url \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  -e GEMINI_API_KEY=your_key \
  -e JWT_SECRET=your_secret \
  crisislink
```

### Google Cloud Run
```bash
gcloud run deploy crisislink \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --min-instances 1
```

---

## 📁 Project Structure

```text
crisislink/
├── app/                          # Next.js App Router
│   ├── page.jsx                  # Landing page + demo autopilot launcher
│   ├── sos/                      # Guest SOS portal
│   │   └── confirm/              # SOS confirmation screens
│   ├── qr/                       # QR code manager for zones/rooms
│   ├── staff/                    # Staff pages
│   │   ├── dashboard/            # Live incident dashboard
│   │   ├── incident/[id]/        # Incident detail + triage + chat + timeline
│   │   └── drill/                # Drill mode simulator
│   ├── admin/                    # Admin pages
│   │   ├── dashboard/            # Command center
│   │   ├── incidents/            # Incident management
│   │   ├── analytics/            # Charts and KPIs
│   │   ├── staff/                # Staff management
│   │   ├── settings/             # System settings
│   │   ├── map/                  # Admin live map
│   │   └── demo/                 # Demo scenario controls
│   └── api/                      # API routes (auth, incidents, tasks, analytics, broadcast)
├── components/                   # Shared UI and realtime components
├── lib/                          # Core services
│   ├── db.js                     # PostgreSQL schema, queries, seed data
│   ├── aiTriage.js               # Gemini triage service
│   ├── auth.js                   # JWT helpers
│   ├── escalation.js             # Auto-escalation service
│   ├── socket.js                 # Socket.IO singleton
│   └── stores/                   # Zustand state stores
├── server.js                     # Custom Node.js server
├── Dockerfile                    # Container config
└── cloudbuild.yaml               # GCP deployment config
```

---

## 🙏 Acknowledgements

- [Google Solution Challenge 2026](https://developers.google.com/community/gdsc-solution-challenge)
- [Google Gemini API](https://aistudio.google.com)
- [Supabase](https://supabase.com)
- [Next.js](https://nextjs.org)
- [Socket.IO](https://socket.io)
- [Vercel](https://vercel.com)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>Built with ❤️ for Google Solution Challenge 2026</strong><br/>
  <em>Making hospitality spaces safer, one alert at a time.</em>
</div>
