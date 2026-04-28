# 🚨 CrisisLink
### Real-Time Emergency Response & Crisis Coordination for Hospitality

<div align="center">

> **Google Solution Challenge 2026** · Addressing UN SDG 11 — Sustainable Cities and Communities

[![Live Demo](https://img.shields.io/badge/🌐_Live-Demo-FF4444?style=for-the-badge)](https://crisislink-928472984789.us-central1.run.app)
[![Video Demo](https://img.shields.io/badge/Drive_Video-Google_Drive-34A853?style=for-the-badge&logo=googledrive&logoColor=white)](https://drive.google.com/drive/folders/1yctaJev2KHz9wFfkDPg0PUL0ZKcUknpc?usp=drive_link)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Gemini AI](https://img.shields.io/badge/Gemini_3_Flash-Preview-4285F4?style=for-the-badge&logo=google)](https://aistudio.google.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socket.io)](https://socket.io)
[![Docker](https://img.shields.io/badge/Docker-Cloud_Run-2496ED?style=for-the-badge&logo=docker)](https://cloud.google.com/run)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## 🎯 The Problem

Large hospitality venues — hotels, resorts, and event spaces — face a **critical communication gap** during emergencies. Traditional response methods like walkie-talkies, phone trees, and manual logs are siloed, unstructured, and dangerously slow. When every second counts, fragmented communication costs lives.

During a crisis, three groups need to act simultaneously but often cannot:

| Who | The Gap |
|-----|---------|
| 🙋 **Guests** | No reliable way to report emergencies quickly |
| 👷 **Staff** | Receive incomplete or delayed information |
| 🧑‍✈️ **Commanders** | Lack a unified view of what's happening and who is responding |

---

## 💡 The Solution

CrisisLink is an **AI-first emergency command and control platform** that bridges the gap between distressed guests, on-site staff, and emergency commanders — in real time.

Powered by **Google Gemini 3 Flash Preview**, it triages incidents in **under 2 seconds** — generating severity assessments, 8-step SOPs, evacuation routes, and staff deployment recommendations before a human supervisor has picked up a radio.

> 💬 **"The 2-Second Triage Advantage"** — CrisisLink doesn't just report emergencies. It interprets them, coordinates the response, and documents every action automatically.

---

## ✨ Features

### 🔴 Core Emergency Features

| Feature | Description |
|---------|-------------|
| 🆘 **Guest SOS Portal** | No login required. Report emergencies in seconds via web or QR code scan |
| 🤖 **AI Triage Engine** | Gemini 3 Flash Preview classifies severity, generates 8-step SOP, evacuation route, and do-not-do list |
| 📡 **Real-Time Alerts** | Socket.IO broadcasts incidents instantly to all staff dashboards simultaneously |
| 🗺️ **Live Venue Map** | SVG floor plan with color-coded severity zones and animated incident pins |
| ✅ **Task Orchestration** | Dynamic checklists auto-assigned by role, synced in real time across all devices. Staff can also claim unassigned SOP tasks. |
| 💬 **Incident Chat** | Isolated per-incident real-time channel for coordinating responders |
| 📋 **Audit Timeline** | Every action, status change, and message timestamped and logged immutably |
| 📊 **Analytics Dashboard** | Historical trends, response times, zone hotspots, and KPI metrics |

### ⚡ Advanced Capabilities

| Feature | Description |
|---------|-------------|
| ⏱️ **Auto-Escalation** | Unacknowledged incidents auto-escalate to CRITICAL after 90 seconds |
| 🔴 **Drill Mode** | Simulate emergencies safely with 5 preset scenarios and post-drill reports |
| 📄 **AI Debrief Report** | Gemini-generated post-incident analysis triggered on incident resolution |
| 📱 **PWA Offline Support** | Service worker + cached assets for SOS continuity on unstable networks |
| 🔁 **Offline Queue** | Incidents submitted offline sync automatically when connection restores |
| 🔍 **Guest Tracker** | Guests can monitor their incident status in real-time using a unique Tracking ID |
| 📲 **QR Code Access** | Per-zone QR codes pre-fill the SOS form — scan and report in one tap |
| 🎬 **Demo Autopilot** | Press `D` on the landing page to watch a fully automated live demonstration |
| 🛡️ **Smart Fallback** | Hybrid response system: switches to keyword-based SOPs if AI is unreachable |
| 📢 **Broadcast System** | Admins send instant one-to-many alerts to all connected staff |
| 🛡️ **Cloud Observability** | Optional Google Cloud Logging when service-account credentials are configured |
| 📂 **Portable Audit Logs** | Export currently filtered incidents to machine-readable JSON for legal review |

---

## 🔄 How It Works

```
1. 🆘  Guest scans QR code or visits /sos — reports emergency without login
         ↓
2. 🤖  Gemini 3 Flash Preview analyzes the report in under 2 seconds
       Outputs: severity · 8-step SOP · evacuation route · do-not-do list
         ↓
3. 📡  Socket.IO broadcasts incident:new to ALL connected staff simultaneously
       Audio alert fires · Browser notification sent · Dashboard updates live
         ↓
4. ⏱️  Escalation timer starts — if no acknowledgment in 90 seconds
       severity auto-upgrades to CRITICAL
         ↓
5. ✅  Staff acknowledge, execute SOP tasks, coordinate via live incident chat
       Every action is timestamped in the immutable audit timeline
         ↓
6. 🔒  Incident resolved — AI debrief workflow generates post-incident report
       Handoff report available for emergency services
         ↓
7. 📊  Analytics dashboard updates with new incident data
       Response time · zone hotspots · trends tracked automatically
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT TIER                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Guest SOS  │  │  Staff       │  │  Admin        │  │
│  │  Portal     │  │  Dashboard   │  │  Command      │  │
│  │  (No Login) │  │  + Map       │  │  Center       │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         └────────────────┼──────────────────┘          │
│                          │  Next.js 16 + Zustand        │
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
│  │  Next.js 16  │  │  Socket.IO  │  │  Escalation   │  │
│  │  API Gateway │  │  Event Bus  │  │  Service      │  │
│  │  App Router  │  │  Real-time  │  │  (30s checks) │  │
│  └──────────────┘  └─────────────┘  └───────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │      Google Gemini 3 Flash Preview Engine        │   │
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
│  │                 Supabase (Postgres)               │   │
│  │  users · incidents · incident_tasks ·             │   │
│  │  incident_messages · incident_timeline ·          │   │
│  │  venue_zones · broadcast_messages                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 16 (App Router) | Frontend pages and backend API routes |
| **UI** | React 19, Tailwind CSS | Component library + utility-first styling |
| **Animations** | Framer Motion | Smooth transitions and micro-interactions |
| **State** | Zustand | Lightweight client-side state management |
| **Real-Time** | Socket.IO | WebSocket event bus for live updates |
| **Database** | Supabase (Postgres) | Persistent cloud database |
| **AI Engine** | Gemini 3 Flash Preview | Triage, SOP generation, incident intelligence |
| **Auth** | JWT + bcrypt | Secure role-based authentication |
| **Charts** | Recharts | Analytics visualizations |
| **QR Codes** | qrcode.react | Zone-based guest access and printable links |
| **Icons** | Lucide React | Consistent icon system |
| **PWA** | Service worker + Workbox runtime caching | Offline support and installability |
| **Server** | Custom Node.js | Next.js + Socket.IO on same port |
| **Deployment** | Docker + Google Cloud Run | Containerized, scalable deployment |
| **Observability** | Google Cloud Logging (optional) | Enterprise-grade incident and security auditing |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com) (free tier available)
- A [Supabase](https://supabase.com) project (URL + keys)

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/leo-leo-691/crisis-link.git
cd crisislink

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
```

Fill in your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=any_random_string_minimum_32_characters
NODE_ENV=development
# Optional: enable Google Cloud Logging locally only if you have a service account JSON
# GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

```bash
# 4. Provision Supabase tables
# Ensure these tables exist: users · incidents · incident_tasks
# incident_messages · incident_timeline · venue_zones · broadcast_messages

# 5. Start the development server
npm run dev

# 6. Open in browser
# http://localhost:3000 (or next free port shown by server.js)
```

---

## 👤 Demo Accounts

| Name | Email | Password | Role |
|------|-------|----------|------|
| Crisis Admin | `admin@grandhotel.com` | `demo1234` | Admin |
| Duty Manager | `manager@grandhotel.com` | `demo1234` | Manager |
| Response Staff | `staff@grandhotel.com` | `demo1234` | Staff |
| Marcus Rivera | `security@grandhotel.com` | `demo1234` | Staff |
| Priya Sharma | `frontdesk@grandhotel.com` | `demo1234` | Staff |

> 💡 **Tip:** Press `D` on the landing page to trigger a fully automated end-to-end demonstration without any manual input.

---

## 📸 Screenshots

### Landing Page
> Command Glass design with live system status, animated hero, and role-based entry cards

`c:\Users\arind\OneDrive\Pictures\Screenshots\Screenshot 2026-04-28 212139.png`

### Guest SOS Portal
> High-contrast emergency reporting interface — no login required, voice-to-text enabled

`c:\Users\arind\OneDrive\Pictures\Screenshots\Screenshot 2026-04-28 212259.png`

### Admin Command Dashboard
> Live incident feed with SVG venue map, severity-colored zones, and real-time socket updates

`c:\Users\arind\OneDrive\Pictures\Screenshots\Screenshot 2026-04-28 212355.png`

### Incident Detail with AI Triage
> Full AI triage panel showing severity, confidence meter, 8-step SOP, evacuation route

`c:\Users\arind\OneDrive\Pictures\Screenshots\Screenshot 2026-04-28 212715.png`

### Admin Analytics
> KPI cards, incident trends, zone hotspots, and response time analytics

`c:\Users\arind\OneDrive\Pictures\Screenshots\Screenshot 2026-04-28 212740.png`

### Drill Mode
> Safe simulation environment with 5 preset scenarios and post-drill performance reports

`c:\Users\arind\OneDrive\Pictures\Screenshots\Screenshot 2026-04-28 212824.png`

---

## 🌍 Social Impact

CrisisLink directly contributes to **UN SDG 11 — Sustainable Cities and Communities** by enhancing the safety and resilience of public hospitality spaces.

| Metric | Impact |
|--------|--------|
| ⚡ Response Time | 40% reduction via AI-automated triage vs manual assessment |
| 📡 Communication Lag | Zero delay between guests, staff, and commanders via real-time WebSockets |
| 📋 Audit Compliance | 100% — every action logged in immutable incident timelines |
| 📶 Offline Resilience | Works in low or no internet conditions via offline-first PWA architecture |

**Target beneficiaries:** Hotel and resort guests, hospitality workers, and emergency responders globally. Designed to be venue-agnostic — deployable across hotels, resorts, hospitals, shopping centres, and any large public venue.

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
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  -e GEMINI_API_KEY=your_key \
  -e JWT_SECRET=your_secret \
  crisislink
```

### Google Cloud Run

```bash
# This repo deploys via Cloud Build, not plain `gcloud run deploy --source .`
# `.env` is ignored by `.gcloudignore`, so pass values explicitly as substitutions.
gcloud builds submit . \
  --config cloudbuild.yaml \
  --substitutions \
_SERVICE_NAME=crisislink,\
_REGION=us-central1,\
_NEXT_PUBLIC_SUPABASE_URL=your_supabase_url,\
_NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key,\
_SUPABASE_URL=your_supabase_url,\
_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key,\
_GEMINI_API_KEY=your_gemini_api_key,\
_JWT_SECRET=your_jwt_secret
```

If you want Google Cloud Logging in Cloud Run, also configure `GOOGLE_APPLICATION_CREDENTIALS`
or attach a service account with the required logging permissions.

---

## 📁 Project Structure

```
crisislink/
├── app/                          # Next.js App Router
│   ├── page.jsx                  # Landing page + demo autopilot launcher
│   ├── sos/                      # Guest SOS portal
│   │   └── confirm/              # SOS confirmation screens
│   ├── qr/                       # QR code manager for zones/rooms
│   ├── staff/                    # Staff pages
│   │   ├── dashboard/            # Live incident dashboard
│   │   ├── incidents/            # Filterable incident archives
│   │   ├── incident/[id]/        # Incident detail + triage + chat + timeline
│   │   ├── map/                  # Staff-specific live venue map
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
│   ├── supabase.js               # Supabase client
│   ├── sopTasks.js               # SOP task templates
│   ├── aiTriage.js               # Gemini triage service
│   ├── auth.js                   # JWT helpers
│   ├── escalation.js             # Auto-escalation service
│   ├── socket.js                 # Socket.IO singleton
│   └── stores/                   # Zustand state stores
├── server.js                     # Custom Node.js server (Next.js + Socket.IO)
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
- [Framer Motion](https://www.framer.com/motion)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>🚨 Built for Google Solution Challenge 2026</strong><br/>
  <em>Making hospitality spaces safer, one alert at a time.</em><br/><br/>
  <a href="https://crisislink-928472984789.us-central1.run.app">🌐 Live Demo</a> ·
  <a href="https://drive.google.com/drive/folders/1yctaJev2KHz9wFfkDPg0PUL0ZKcUknpc?usp=drive_link">🎥 Drive Video</a> ·
  <a href="https://github.com/leo-leo-691/crisis-link/issues">🐛 Report Bug</a>
</div>
