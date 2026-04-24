# CrisisLink

Real-time emergency response and crisis coordination for hospitality venues, built with Next.js App Router, React 19, Supabase, Socket.IO, and Gemini-powered AI triage.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 |
| UI | React 19, Tailwind CSS, Framer Motion |
| State | Zustand |
| Realtime | Socket.IO |
| Data | Supabase |
| AI | Google Gemini |
| Charts | Recharts |
| QR | qrcode.react |

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Fill in the required environment variables.

4. Start the app locally:

```bash
npm run dev
```

5. Open `http://localhost:3000` or the next free port shown by `server.js`.

## Environment Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |
| `GEMINI_API_KEY` | Gemini API key |
| `JWT_SECRET` | JWT signing secret |
| `NODE_ENV` | Runtime environment, default `development` |

## Demo Accounts

| Name | Email | Password | Role |
| --- | --- | --- | --- |
| Crisis Admin | `admin@grandhotel.com` | `demo1234` | Admin |
| Duty Manager | `manager@grandhotel.com` | `demo1234` | Staff |
| Response Staff | `staff@grandhotel.com` | `demo1234` | Staff |
| Marcus Rivera | `security@grandhotel.com` | `demo1234` | Staff |
| Priya Sharma | `frontdesk@grandhotel.com` | `demo1234` | Staff |

## Deployment

Cloud Run is supported through the included `Dockerfile` and `cloudbuild.yaml`.

```bash
npm run build
node server.js
```

The app listens on `process.env.PORT` in production and falls back to `3000` locally.
