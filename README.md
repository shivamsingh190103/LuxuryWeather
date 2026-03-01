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
- @upstash/redis
- idb-keyval
- use-debounce
- next-pwa

## Features

- Secure BFF API route at `/api/weather` (server-side OpenWeather API key usage)
- Redis edge cache (Upstash) with 10-minute TTL for weather payloads
- Route-level rate limiting (Upstash Ratelimit) for `/api/weather`, `/api/cities`, and prefetch API
- AQI integration via OpenWeather Air Pollution API
- Geolocation-first load with fallback to `London`
- Magnetic expanding search bar with spring animation, city suggestions, and `Cmd/Ctrl + K`
- Debounced search (500ms) + intentional-hover prefetch (300ms) to warm cache
- IndexedDB cache with 10-minute TTL (survives tab/browser restarts)
- Invisible offline mode with subtle background desaturation + last update timestamp
- Offline page that renders the latest cached weather snapshot from IndexedDB
- Glassmorphism UI and Lottie weather animations
- 24-hour trend chart with time + temperature scale
- Lazy-loaded interactive map
- Framer Motion optimized with `LazyMotion` + `m` primitives to reduce initial animation payload
- Weather Lottie assets are condition-loaded (on-demand JSON chunk per weather type)
- Adaptive low-power mode with hydration-safe detection: reduces heavy scene effects, defers chart work to idle, and loads map on demand
- PWA support (manifest, service worker, offline fallback route)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env.local`:

```env
OPENWEATHER_API_KEY=your_key_here
UPSTASH_REDIS_REST_URL=your_upstash_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
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

## Redis Caching Strategy

- API route computes a deterministic cache key:
  - `weather:city:<city>`
  - `weather:coords:<lat>:<lon>`
- Upstash Redis is checked before calling OpenWeather.
- Cache hit returns instantly if data is newer than 10 minutes.
- Cache miss/stale data fetches from OpenWeather and stores in Redis with `EX 600`.
- If Redis is unavailable, API falls back to direct OpenWeather fetch and logs the issue without breaking responses.
- Responses include `X-Cache: HIT|MISS|BYPASS` for observability.
- API responses use CDN-friendly headers: `public, s-maxage=300, stale-while-revalidate=600`.

## API Protection

- Sliding-window rate limiting protects weather and city endpoints from abuse.
- Fallback logic for One Call API is explicit: forecast fallback is used only for known One Call availability/subscription failures, not for all upstream errors.

## Offline Behavior

- Primary client cache is IndexedDB (`idb-keyval`) with 10-minute TTL.
- When offline, weather data keeps rendering from last cached snapshot.
- UI avoids intrusive banners and instead:
  - desaturates background subtly
  - shows a low-opacity `Updated ... ago` timestamp in the corner
- Offline fallback route (`/offline`) also reads IndexedDB and displays last known weather.

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Set environment variables in Vercel Project Settings:
   - `OPENWEATHER_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy.

No code changes are required for deployment.
