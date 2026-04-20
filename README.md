# CrisisLink 🛡️
### Next-Gen Emergency Response for the Hospitality Industry

**CrisisLink** is a rapid-response emergency platform designed to help hotels and public venues manage incidents with surgical precision. By combining **Google Gemini AI** for instant triage with real-time room-level tracking, CrisisLink ensures that life-saving information reaches the right people in seconds, not minutes.

---

## 🌟 Key Features

- **🚀 Gemini AI Triage**: Automatically analyzes emergency descriptions using **Gemini 2.0 Flash** to assess severity, recommend immediate actions, and suggest specific staff roles (e.g., Security, First Aid).
- **🗣️ Voice & QR SOS**: Guests can report emergencies via voice commands or a unique room-level QR code, providing instant location accuracy.
- **📊 Real-Time Command Center**: A live dashboard for staff and administrators powered by **Socket.io** for instant incident updates and task tracking.
- **📱 PWA & Offline Support**: Designed to work even in network-congested environments with local caching and background sync.
- **🗺️ Interactive Venue Map**: Visualize the emergency location and evacuation routes directly on the hotel floor plan.

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **AI Engine**: [Google Gemini 2.0 Flash](https://aistudio.google.com/)
- **Real-time**: [Socket.io](https://socket.io/)
- **Database**: [SQLite](https://www.sqlite.org/) (via `better-sqlite3`)
- **Styling**: Vanilla CSS + Tailwind CSS
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18.x or higher
- A Google AI Studio API Key (for Gemini)

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
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_google_gemini_key_here
   NEXTAUTH_SECRET=your_random_secret_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the platform in action.

---

## 🚒 Demo Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@grandhotel.com` | `demo1234` |
| **Staff** | `security@grandhotel.com` | `demo1234` |

---

## 🛡️ Security & Privacy
CrisisLink prioritizes data security. All sensitive configuration is handled via environment variables, and the system is designed to be easily portable to Google Cloud Run and Cloud SQL (PostgreSQL) for production-grade security.

## 🏆 Google Solution Challenge 2026
This project was built for the **2026 Google Solution Challenge**, addressing the UN Sustainable Development Goal of **Good Health and Well-being (SDG 3)** and **Sustainable Cities and Communities (SDG 11)**.
