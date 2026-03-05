from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import MacroEvent
from backend.schemas import EventListItem, EventDetail

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[EventListItem])
def list_events(theme: str | None = None, heat: str | None = None, db: Session = Depends(get_db)):
    query = db.query(MacroEvent)
    if theme:
        query = query.filter(MacroEvent.theme == theme)
    if heat:
        query = query.filter(MacroEvent.heat == heat)
    query = query.order_by(MacroEvent.published_date.desc())
    return query.all()


@router.get("/{event_id}", response_model=EventDetail)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(MacroEvent).filter(MacroEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
