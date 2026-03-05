# Meridian

Global Macro Intelligence Platform — built for asset managers who need a unified view of macro events, their global impact, and actionable portfolio recommendations.

![Stack](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js) ![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white) ![Stack](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)

## What it does

1. **News Dashboard** — Macro events table with theme, heat indicators, and impact ratings (opportunity + portfolio)
2. **Event Detail** — Interactive 3D globe showing impact arcs from source to affected regions, risk chain analysis, AI-generated deep analysis, and MarketMemory (historical precedents with firm actions/outcomes)
3. **Actions Dashboard** — AI-recommended portfolio actions with urgency, direction, and asset class

## Architecture

```
├── backend/           Python FastAPI + SQLite + SQLAlchemy
│   ├── main.py        API server (CORS, routers, /api/refresh)
│   ├── llm_analyzer.py  GPT-4o-mini structured outputs via Pydantic
│   ├── news_fetcher.py  Google News RSS (no API key needed)
│   ├── seed_db.py     Parallel seeding (8 workers), fallback data
│   └── routers/       /api/events, /api/actions, /api/themes
│
├── frontend/          Next.js 16 + React + Tailwind + shadcn/ui
│   ├── src/app/       App Router pages (splash, dashboard, events/[id], actions)
│   ├── src/components/ Globe views, tables, sidebar, MarketMemory
│   └── src/lib/       API client, types, utils
│
└── scripts/dev.sh     Start both servers
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- (Optional) OpenAI API key for LLM-powered analysis

### 1. Backend

```bash
pip install -r backend/requirements.txt
```

Create a `.env` in the project root:
```
OPENAI_API_KEY=your-key-here   # or leave empty for fallback data
```

Seed the database:
```bash
python3 -m backend.seed_db --hardcoded    # fallback data (instant)
python3 -m backend.seed_db                # live Google News + LLM analysis
```

Start the API:
```bash
python3 -m uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Both at once

```bash
bash scripts/dev.sh
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/events` | List all events (filterable by theme, heat) |
| `GET /api/events/{id}` | Full event detail with globe data, analysis, precedents |
| `GET /api/actions` | All recommended actions (filterable by urgency, direction) |
| `GET /api/themes` | Aggregated theme overview |
| `POST /api/refresh` | Re-fetch live news + re-analyze (async) |
| `GET /api/refresh/status` | Check if refresh is in progress |
| `GET /api/health` | Health check |

## Key Features

- **3D Globe** (react-globe.gl) — Sun-lit based on real UTC time, free-spin interaction, auto-rotate, animated arcs between impacted regions
- **MarketMemory** — Click historical precedents to zoom the globe to that event's location, see market impact charts, and what a firm did + the result
- **Context-aware connections** — Globe arcs point to genuinely relevant financial centers based on article content (not generic destinations)
- **Splash screen** — Cinematic "Meridian" fade-in on app load
- **Dark theme** — Bloomberg terminal aesthetic with zinc palette + emerald accents

## Tech Decisions

- **SQLite + JSON columns** — Zero setup, hackathon-friendly. Nested data (risk chains, globe connections, precedents) stored as JSON
- **OpenAI structured outputs** — Pydantic model passed as `response_format` guarantees valid JSON from GPT-4o-mini
- **Dynamic import for Globe** — Three.js needs `window`, so `react-globe.gl` is loaded with `{ ssr: false }`
- **Parallel seeding** — `ThreadPoolExecutor(max_workers=8)` for concurrent LLM calls
- **Google News RSS** — No API key needed, 9 macro-focused query topics, deduplication by title
- **Fallback data** — 25 hardcoded articles with pre-built analysis when no OpenAI key is available
