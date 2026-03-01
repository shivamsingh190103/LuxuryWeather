# Luxury Weather (Next.js)
https://luxury-weather.vercel.app

Production-ready weather application built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Recharts, and React-Leaflet.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Recharts
- React-Leaflet + Leaflet
- lottie-react
- use-debounce
- next-pwa

## Features

- Secure BFF API route at `/api/weather` (server-side OpenWeather API key usage)
- AQI integration via OpenWeather Air Pollution API
- Geolocation-first load with fallback to `London`
- Magnetic expanding search bar with spring animation and `Cmd/Ctrl + K`
- Debounced search (500ms)
- Session cache with 10-minute TTL
- Offline page that renders the latest cached weather snapshot
- Glassmorphism UI and Lottie weather animations
- 24-hour trend chart (minimal glowing area)
- Lazy-loaded interactive map
- PWA support (manifest, service worker, offline fallback route)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variable in `.env.local`:

```env
OPENWEATHER_API_KEY=your_key_here
```

3. Run development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build & Start

```bash
npm run build
npm run start
```

## API Contract (`GET /api/weather`)

Query params:

- `city=Berlin`
- or `lat=52.52&lon=13.41`

Errors:

- `400` missing params
- `404` city not found
- `500` server/config/upstream failure

Response (minified weather payload):

- location: `name`, `country`, `lat`, `lon`
- current: `temp`, `condition`, `description`, `icon`, `humidity`, `wind`, `pressure`, optional `aqi`
- optional top-level `aqi` (mirrors current AQI for flexible clients)
- hourly: next 24 points (`ts`, `temp`, `condition`, `icon`)

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Set environment variable `OPENWEATHER_API_KEY` in Vercel Project Settings.
4. Deploy.

No code changes are required for deployment.
