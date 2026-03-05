"""Populate the database with analyzed articles."""
import json
import sys
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

# Allow running as script from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import engine, SessionLocal, Base
from backend.models import MacroEvent, Action
from backend.seed_articles import ARTICLES
from backend.news_fetcher import fetch_news
from backend.llm_analyzer import analyze_article, generate_fallback
from backend.config import OPENAI_API_KEY


def _analyze_one(title: str, body: str, source: str, date: str, index: int, use_llm: bool):
    """Analyze a single article. Returns (analysis, source, date) or raises."""
    try:
        if use_llm:
            analysis = analyze_article(title, body)
        else:
            analysis = generate_fallback(title, body, index)
    except Exception as e:
        print(f"  LLM failed for '{title[:40]}': {e}. Using fallback.")
        analysis = generate_fallback(title, body, index)
    return analysis, source, date


def _insert_event(db, analysis, source: str, date: str):
    event = MacroEvent(
        headline=analysis.headline,
        summary=analysis.summary,
        country=analysis.country,
        country_code=analysis.country_code,
        lat=analysis.lat,
        lng=analysis.lng,
        theme=analysis.theme,
        heat=analysis.heat,
        opportunity_impact=analysis.opportunity_impact,
        portfolio_impact=analysis.portfolio_impact,
        risk_chain_json=json.dumps([s for s in analysis.risk_chain]),
        analysis=analysis.analysis,
        globe_connections_json=json.dumps([c.model_dump() for c in analysis.globe_connections]),
        globe_points_json=json.dumps([p.model_dump() for p in analysis.globe_points]),
        historical_precedents_json=json.dumps([h.model_dump() for h in analysis.historical_precedents]),
        predicted_impact=analysis.predicted_impact,
        published_date=date,
        source=source,
    )
    db.add(event)
    db.flush()

    for action_data in analysis.actions:
        db.add(Action(
            event_id=event.id,
            action=action_data.action,
            asset_class=action_data.asset_class,
            direction=action_data.direction,
            rationale=action_data.rationale,
            opportunity_impact=action_data.opportunity_impact,
            portfolio_impact=action_data.portfolio_impact,
            urgency=action_data.urgency,
        ))


def seed(live: bool = True):
    """Seed DB. If live=True, fetch from Google News RSS. Otherwise use hardcoded articles."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    use_llm = bool(OPENAI_API_KEY and OPENAI_API_KEY != "your-openai-api-key-here")
    print(f"LLM: {'OpenAI' if use_llm else 'fallback'}")

    # Build article list
    if live:
        print("Fetching live news from Google News RSS...")
        fetched = fetch_news()
        if not fetched:
            print("No live articles. Falling back to hardcoded.")
            live = False

    if live:
        tasks = [(a.title, a.title, a.source, a.date, i, use_llm) for i, a in enumerate(fetched)]
    else:
        tasks = [(a["title"], a["body"], a["source"], a["date"], i, use_llm) for i, a in enumerate(ARTICLES)]

    print(f"Analyzing {len(tasks)} articles (8 parallel workers)...")

    # Parallel LLM calls
    results = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(_analyze_one, *t): i for i, t in enumerate(tasks)}
        for future in as_completed(futures):
            idx = futures[future]
            analysis, source, date = future.result()
            results.append((idx, analysis, source, date))
            print(f"  [{len(results)}/{len(tasks)}] {analysis.headline[:55]}...")

    # Insert in original order
    results.sort(key=lambda x: x[0])
    db = SessionLocal()
    for _, analysis, source, date in results:
        _insert_event(db, analysis, source, date)
    db.commit()
    db.close()
    print(f"\nDone! Seeded {len(results)} events.")


def refresh_live():
    seed(live=True)


if __name__ == "__main__":
    use_live = "--hardcoded" not in sys.argv
    seed(live=use_live)
