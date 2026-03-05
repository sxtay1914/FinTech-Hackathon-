from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import MacroEvent
from backend.schemas import ThemeOverview

router = APIRouter(prefix="/api/themes", tags=["themes"])


@router.get("", response_model=list[ThemeOverview])
def list_themes(db: Session = Depends(get_db)):
    results = (
        db.query(
            MacroEvent.theme,
            func.count(MacroEvent.id).label("event_count"),
            func.avg(MacroEvent.opportunity_impact).label("avg_opportunity_impact"),
            func.avg(MacroEvent.portfolio_impact).label("avg_portfolio_impact"),
        )
        .group_by(MacroEvent.theme)
        .all()
    )

    themes = []
    for row in results:
        # Get the most common heat for this theme
        heat_row = (
            db.query(MacroEvent.heat)
            .filter(MacroEvent.theme == row.theme)
            .group_by(MacroEvent.heat)
            .order_by(func.count(MacroEvent.id).desc())
            .first()
        )
        themes.append(
            ThemeOverview(
                theme=row.theme,
                heat=heat_row[0] if heat_row else "Warming",
                event_count=row.event_count,
                avg_opportunity_impact=round(row.avg_opportunity_impact, 1),
                avg_portfolio_impact=round(row.avg_portfolio_impact, 1),
            )
        )
    return themes
