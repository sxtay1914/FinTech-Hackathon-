# CLAUDE.md — Meridian Project Context

## Project Overview
Meridian is a macro economics intelligence platform for a fintech hackathon. Three views: News Dashboard, Event Detail (3D globe + sidebar + MarketMemory), Actions Dashboard.

## Running the App
- Backend: `python3 -m uvicorn backend.main:app --reload --port 8000` (from project root)
- Frontend: `cd frontend && npm run dev` (port 3000)
- No Python venv — packages installed globally via `pip install -r backend/requirements.txt`
- Seed DB: `python3 -m backend.seed_db --hardcoded` (fallback) or `python3 -m backend.seed_db` (live RSS + LLM)
- To force fallback without LLM: `OPENAI_API_KEY="" python3 -m backend.seed_db`

## Critical Patterns

### Globe (react-globe.gl / Three.js)
- MUST use `dynamic(() => import("react-globe.gl"), { ssr: false })` — Three.js crashes without `window`
- Always wrap in an error boundary — WebGL failures are common
- Lighting: remove default lights via `scene.children.filter(c => c.isLight)`, then add custom lights
- Controls setup goes in `onGlobeReady` callback, NOT in useEffect
- `hero-globe.tsx` (dashboard banner): no user interaction, auto-rotate only, transparent bg, bright ambient (1.2)
- `globe-view.tsx` (event detail): sun lighting from UTC time, free spin with 3s auto-rotate resume, arcs + points

### Layout
- `layout-wrapper.tsx` hides navbar padding on `/` (splash screen)
- `nav-bar.tsx` returns null on `/`
- Splash at `/` is a client component with phase-based JS animations, auto-navs to `/dashboard` after 4.2s

### Backend Data Flow
- `seed_db.py` does `drop_all` + `create_all` at start — cancelling mid-seed leaves EMPTY tables
- JSON columns: `risk_chain_json`, `globe_connections_json`, `globe_points_json`, `historical_precedents_json`
- Routers parse JSON columns back to Pydantic models via `json.loads()`
- `llm_analyzer.py` has both `analyze_article()` (LLM) and `generate_fallback()` (no LLM)
- Fallback destinations are context-aware: keyword matching in title/body maps to relevant financial centers

### Frontend Data Flow
- Dashboard + Actions pages are server components — fetch at render time with `cache: "no-store"`
- Event detail page: server component fetches, passes to `EventDetailView` (client) which manages globe/sidebar/MarketMemory state
- MarketMemory click → globe zooms to precedent location, sidebar swaps to `MemoryDetail`

## Gotchas / Lessons Learned
- Clearing `.next` cache (`rm -rf .next`) fixes most mysterious rendering issues after heavy iteration
- `frontend/` had its own `.git` from create-next-app — removed it for monorepo setup
- `python` doesn't exist on this mac, always use `python3`
- Port conflicts: always `lsof -ti:3000 | xargs kill -9` before restarting frontend
- Globe autoRotateSpeed 0.3 is invisible in a 280px banner — use 0.8+
- `enablePan = false` on banner globe prevents accidental interaction

## File Map (key files only)
```
backend/
  main.py              FastAPI app, CORS, /api/refresh endpoint
  llm_analyzer.py      GPT-4o-mini + fallback generator (context-aware destinations)
  schemas.py           All Pydantic models (LLMAnalysis is the big one)
  models.py            SQLAlchemy ORM (MacroEvent, Action) with JSON columns
  seed_db.py           Parallel seeding, --hardcoded flag, refresh_live()
  news_fetcher.py      Google News RSS, 9 topics, certifi SSL fix
  seed_articles.py     25 hardcoded macro articles

frontend/src/
  app/page.tsx                Splash screen (client, phase animations)
  app/dashboard/page.tsx      Globe banner + EventTable (server)
  app/events/[id]/page.tsx    Event detail (server → EventDetailView client)
  app/actions/page.tsx        Actions table (server)
  components/globe-view.tsx   Main globe (sun lighting, arcs, free spin)
  components/hero-globe.tsx   Banner globe (auto-rotate only, transparent bg)
  components/event-detail-view.tsx  State manager for sidebar/globe/MarketMemory
  components/market-memory.tsx      Clickable horizontal timeline
  components/memory-detail.tsx      Precedent detail with chart
  lib/api.ts                  Fetch wrapper (getEvents, getEvent, getActions)
  lib/types.ts                TypeScript interfaces
```
