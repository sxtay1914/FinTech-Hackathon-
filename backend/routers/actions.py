from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from backend.database import get_db
from backend.models import Action
from backend.schemas import ActionListItem

router = APIRouter(prefix="/api/actions", tags=["actions"])


@router.get("", response_model=list[ActionListItem])
def list_actions(
    urgency: str | None = None,
    direction: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Action).options(joinedload(Action.event))
    if urgency:
        query = query.filter(Action.urgency == urgency)
    if direction:
        query = query.filter(Action.direction == direction)
    query = query.order_by(Action.urgency.desc())
    return query.all()
