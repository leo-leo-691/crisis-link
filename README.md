# CrisisLink 🛡️
### Next-Gen Emergency Response for the Hospitality Industry

**CrisisLink** is a rapid-response emergency platform designed to help hotels and public venues manage incidents with surgical precision. By combining **Google Gemini AI** for instant triage with real-time room-level tracking, CrisisLink ensures that life-saving information reaches the right people in seconds, not minutes.

---

## 🌟 Key Features

- **🚀 Gemini AI Triage**: Automatically analyzes emergency descriptions using **Gemini 2.0 Flash** to assess severity, recommend immediate actions, and suggest specific staff roles (e.g., Security, First Aid).
- **📝 AI Post-Incident Debrief**: Automatically generates a comprehensive markdown report after an incident is resolved, detailing the timeline and response efficiency.
- **🌐 Multi-language Support**: Real-time translation of SOS reports submitted in non-English languages using Gemini AI.
- **🗣️ Voice & QR SOS**: Guests can report emergencies via voice commands or a unique room-level QR code, providing instant location accuracy.
- **📊 Real-Time Command Center**: A live dashboard for staff and administrators powered by **Socket.io** for instant incident updates and task tracking.
- **📱 PWA & Offline Support**: Designed to work even in network-congested environments with local caching and background sync.
- **🗺️ Interactive Venue Map**: Visualize the emergency location and evacuation routes directly on the hotel floor plan.

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **AI Engine**: [Google Gemini 2.0 Flash](https://aistudio.google.com/)
- **Real-time**: [Socket.io](https://socket.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via `pg` & Supabase)
- **Styling**: Tailwind CSS + Framer Motion
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18.x or higher
- A Google AI Studio API Key (for Gemini)
- A PostgreSQL database (e.g., Supabase)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/leo-leo-691/crisis-link.git
   cd crisislink
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_google_gemini_key_here
NEXTAUTH_SECRET=your_random_secret_here
jwt_secret=your_jwt_secret_here

# Database Configuration
DATABASE_URL=your_postgresql_connection_string
```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the platform in action.

---

## 🚀 Submission Documentation
For a complete breakdown of the project architecture, social impact, and technical details for the **Google Solution Challenge**, please refer to:
👉 **[Summary.md](./Summary.md)**

---

## 🚀 Live Deployment (Supabase & Cloud Run)

CrisisLink is designed to be highly scalable using **Supabase** for the database and **Google Cloud Run** for hosting.

### 1. Supabase Setup
- Create a new project at [Supabase](https://supabase.com/).
- Navigate to **Project Settings > Database** and copy your **Connection String** (URI).
- Provide this as `DATABASE_URL` in your environment.

### 2. Google Cloud Run Deployment
For the **Google Solution Challenge**, we recommend deploying to Cloud Run:
1. Build the Docker image:
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/crisislink
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy crisislink --image gcr.io/[PROJECT_ID]/crisislink --platform managed --allow-unauthenticated
   ```

---

## 🚒 Demo Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@grandhotel.com` | `demo1234` |
| **Manager** | `manager@grandhotel.com` | `demo1234` |
| **Staff** | `staff@grandhotel.com` | `demo1234` |

---

## 🛡️ Security & Privacy
CrisisLink prioritizes data security:
- **JWT Authorization**: All sensitive API routes are protected via JSON Web Tokens.
- **Rate Limiting**: SOS submission endpoints are rate-limited to prevent automated spam.
- **Input Sanitization**: AI Triage logic cleans and validates all incident descriptions.

## 🏆 Google Solution Challenge 2026
This project was built for the **2026 Google Solution Challenge**, addressing the UN Sustainable Development Goal of **Good Health and Well-being (SDG 3)** and **Sustainable Cities and Communities (SDG 11)**.
