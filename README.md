# Meridian

Global Macro Intelligence Platform — built for asset managers who need a unified view of macro events, their global impact, and actionable portfolio recommendations.

Meridian is a global macro intelligence platform designed to help asset managers transform complex macro developments into clear, actionable portfolio insights. In today's environment, investors face an overwhelming volume of geopolitical events, economic releases, and policy signals that are difficult to translate into portfolio implications. Meridian addresses this challenge by connecting macro news, risk transmission across markets, historical precedents, and portfolio exposures within a single decision-support platform.

The platform first ingests global macro news and detects emerging themes such as monetary policy shifts, inflation pressures, geopolitical tensions, or trade disruptions. It then maps how these events propagate through a risk chain, identifying potential impacts across countries, asset classes, and market sectors. Meridian compares current events with historical market precedents through its MarketMemory module, allowing asset managers to understand how similar macro shocks previously affected financial markets.

To support faster decision-making, Meridian quantifies potential portfolio exposure through a macro stress testing engine, estimating potential drawdowns and risk concentrations. Based on this analysis, the platform generates actionable investment recommendations, such as hedging exposures, adjusting asset allocations, or increasing defensive positioning.

By integrating macro intelligence, risk analysis, historical context, and portfolio guidance, Meridian enables asset managers to move from information overload to faster, more informed investment decisions.

![Stack](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js) ![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white) ![Stack](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)

## What it does

1. **News Dashboard** — Macro summary KPIs, Theme Pulse with momentum sparklines, Portfolio Stress Tester, and a sortable/filterable event table with globe markers colour-coded by heat
2. **Event Detail** — Interactive 3D globe with impact arcs, risk chain analysis, AI-generated deep analysis, and MarketMemory — a timeline scrubber through historical precedents that rotates the globe to each event's location
3. **Actions Dashboard** — Country impact globe (click to filter by country), AI-recommended portfolio actions with urgency, direction, and asset class — all sortable and filterable

## Architecture

```
├── backend/           Python FastAPI + SQLite + SQLAlchemy
│   ├── main.py        API server (CORS, routers, /api/refresh)
│   ├── llm_analyzer.py  GPT-4o-mini structured outputs via Pydantic
│   ├── news_fetcher.py  Google News RSS (no API key needed)
│   ├── seed_db.py     Parallel seeding (8 workers), fallback data
│   └── routers/       /api/events, /api/actions, /api/themes
│
├── frontend/          Next.js 15 + React + Tailwind + shadcn/ui
│   ├── src/app/       App Router pages (splash, dashboard, events/[id], actions)
│   ├── src/components/ Globe views, tables, sidebar, MarketMemory, stress tester
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

## Deployment

### Backend — Render.com (free)

1. New Web Service → connect GitHub repo
2. **Build command:** `pip install -r backend/requirements.txt`
3. **Start command:** `python3 -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Add env var: `OPENAI_API_KEY=your-key` (optional)
5. After deploy, open the Render **Shell** tab and run:
   ```
   python3 -m backend.seed_db --hardcoded
   ```

> Note: Render free tier sleeps after 15 min of inactivity — first request takes ~30s to wake up.

### Frontend — Vercel (free)

1. New Project → import GitHub repo
2. **Root directory:** `frontend`
3. Add env var: `NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com`
4. Deploy

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/events` | List all events |
| `GET /api/events/{id}` | Full event detail with globe data, analysis, precedents |
| `GET /api/actions` | All recommended actions |
| `GET /api/themes` | Aggregated theme overview (heat, avg impacts, event count) |
| `POST /api/refresh` | Re-fetch live news + re-analyze (async) |
| `GET /api/refresh/status` | Check if refresh is in progress |
| `GET /api/health` | Health check |

## Key Features

- **Macro Summary Strip** — 4 KPI cards (active events, top theme, most active country, high-risk count) + auto-generated narrative from live data
- **Theme Pulse** — 6 theme cards with SVG momentum sparklines (heat score over time) and momentum arrows (↑/↓/→), click to filter the event table
- **Portfolio Stress Tester** — 3 preset profiles (Conservative / Balanced / Aggressive). Estimated drawdown per theme computed as:
  ```
  contribution = (portfolio_impact / 5) × heat_factor × Σ(allocation[asset] × sensitivity[theme][asset])
  ```
  where `heat_factor` = 1.0 (Hot/High), 0.6 (Warming/Moderate), 0.2 (Cooling), 0.05 (Cold/Low)
  and `sensitivity` is a 6-theme × 5-asset-class matrix (Equities, Bonds, EM, FX, Cash).
  Results sorted worst-first with an auto-generated insight identifying the primary risk driver.
- **Hero Globe** — Pulsing rings colour-coded by heat (red=Hot, yellow=Warming, grey=Cold), country name labels, user-draggable with 3s auto-rotate resume
- **MarketMemory Scrubber** — Drag a timeline slider through historical precedents; globe rotates in real time to each event's location. Ends at a "NOW" stop showing the AI-predicted impact.
- **Actions Globe** — Country markers sized and coloured by avg portfolio impact (green → red). Click to reveal all events for that country.
- **Sort & Filter** — Both the event table and actions table support sorting by any column + filtering by country, theme, date range, min opportunity impact, and min portfolio impact
- **3D Globe** (react-globe.gl) — Sun-lit based on real UTC time on event detail, free-spin interaction, animated arcs between impacted regions
- **Context-aware connections** — Globe arcs point to genuinely relevant financial centers based on article content
- **Splash screen** — Cinematic "Meridian" fade-in, auto-navigates to dashboard after 4.2s
- **Dark theme** — Bloomberg terminal aesthetic with zinc palette + emerald accents

## Tech Decisions

- **SQLite + JSON columns** — Zero setup, hackathon-friendly. Nested data (risk chains, globe connections, precedents) stored as JSON
- **OpenAI structured outputs** — Pydantic model passed as `response_format` guarantees valid JSON from GPT-4o-mini
- **Dynamic import for Globe** — Three.js needs `window`, so `react-globe.gl` is loaded with `{ ssr: false }`
- **Parallel seeding** — `ThreadPoolExecutor(max_workers=8)` for concurrent LLM calls
- **Google News RSS** — No API key needed, 9 macro-focused query topics, deduplication by title
- **Fallback data** — 25 hardcoded articles with pre-built analysis when no OpenAI key is available
- **Event delegation for globe clicks** — react-globe.gl's HTML overlay has `pointer-events: none`; solved with CSS override + `closest("[data-event-id]")` delegation on the container
- **Cross-component communication** — Globe → EventTable communication via `window.dispatchEvent(new CustomEvent("meridian:focus-event"))`, avoiding prop drilling through server components
