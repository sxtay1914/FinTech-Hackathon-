from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import MacroEvent

import yfinance as yf
import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

router = APIRouter()
_analyzer = SentimentIntensityAnalyzer()


@router.get("/api/screener")
def screener(q: str = Query(..., description="Ticker symbol, e.g. AAPL")):
    try:
        ticker = yf.Ticker(q.upper())
        info = ticker.info
        hist = ticker.history(period="1y")

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No data found for ticker '{q.upper()}'")

        close = hist["Close"]
        price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or float(close.iloc[-1])
        )

        def ret(days: int) -> float:
            if len(close) > days:
                return round(((close.iloc[-1] / close.iloc[-days]) - 1) * 100, 2)
            return 0.0

        # 90-day chart data with dates
        hist_90 = hist.tail(90)
        chart = [
            {"date": str(d.date()), "close": round(float(v), 2)}
            for d, v in zip(hist_90.index, hist_90["Close"])
        ]

        week_52_high = info.get("fiftyTwoWeekHigh") or float(close.max())
        week_52_low  = info.get("fiftyTwoWeekLow")  or float(close.min())
        avg_volume   = info.get("averageVolume")
        beta         = info.get("beta")
        dividend_yield = info.get("dividendYield")

        return {
            "ticker": q.upper(),
            "name": info.get("longName") or q.upper(),
            "price": round(float(price), 2),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": round(float(info["trailingPE"]), 1) if info.get("trailingPE") else None,
            "beta": round(float(beta), 2) if beta else None,
            "dividend_yield": round(float(dividend_yield) * 100, 2) if dividend_yield else None,
            "avg_volume": avg_volume,
            "week_52_high": round(float(week_52_high), 2),
            "week_52_low": round(float(week_52_low), 2),
            "ret_1d": ret(2),
            "ret_1w": ret(6),
            "ret_1m": ret(22),
            "ret_1y": ret(252),
            "chart": chart,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/correlation")
def correlation(tickers: str = Query("SPY,GLD,TLT,USO,EEM")):
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]

    data: dict[str, pd.Series] = {}
    for t in ticker_list:
        try:
            hist = yf.Ticker(t).history(period="3mo")["Close"]
            if len(hist) > 10:
                data[t] = hist
        except Exception:
            pass

    if len(data) < 2:
        return {"tickers": list(data.keys()), "matrix": {}}

    df = pd.DataFrame(data).pct_change().dropna()
    corr = df.corr().round(2)

    return {
        "tickers": list(corr.columns),
        "matrix": corr.to_dict(),
    }


@router.get("/api/sentiment")
def sentiment(db: Session = Depends(get_db)):
    events = db.query(MacroEvent).all()

    by_theme: dict[str, list[float]] = {}
    for ev in events:
        text = f"{ev.headline}. {ev.summary or ''}"
        score = _analyzer.polarity_scores(text)["compound"]
        by_theme.setdefault(ev.theme, []).append(score)

    return [
        {
            "theme": theme,
            "sentiment": round(sum(scores) / len(scores), 3),
            "count": len(scores),
        }
        for theme, scores in sorted(by_theme.items())
    ]
