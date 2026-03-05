import json
from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship

from backend.database import Base


class MacroEvent(Base):
    __tablename__ = "macro_events"

    id = Column(Integer, primary_key=True, index=True)
    headline = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    country = Column(String, nullable=False)
    country_code = Column(String(3), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    theme = Column(String, nullable=False)
    heat = Column(String, nullable=False)
    opportunity_impact = Column(Integer, nullable=False)
    portfolio_impact = Column(Integer, nullable=False)
    risk_chain_json = Column(Text, nullable=False, default="[]")
    analysis = Column(Text, nullable=False)
    globe_connections_json = Column(Text, nullable=False, default="[]")
    globe_points_json = Column(Text, nullable=False, default="[]")
    historical_precedents_json = Column(Text, nullable=False, default="[]")
    published_date = Column(String, nullable=False)
    source = Column(String, nullable=False)

    actions = relationship("Action", back_populates="event", cascade="all, delete-orphan")

    @property
    def risk_chain(self) -> list:
        return json.loads(self.risk_chain_json)

    @property
    def globe_connections(self) -> list:
        return json.loads(self.globe_connections_json)

    @property
    def globe_points(self) -> list:
        return json.loads(self.globe_points_json)

    @property
    def historical_precedents(self) -> list:
        return json.loads(self.historical_precedents_json)


class Action(Base):
    __tablename__ = "actions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("macro_events.id"), nullable=False)
    action = Column(String, nullable=False)
    asset_class = Column(String, nullable=False)
    direction = Column(String, nullable=False)
    rationale = Column(Text, nullable=False)
    opportunity_impact = Column(Integer, nullable=False)
    portfolio_impact = Column(Integer, nullable=False)
    urgency = Column(String, nullable=False)

    event = relationship("MacroEvent", back_populates="actions")

    @property
    def event_headline(self) -> str:
        return self.event.headline if self.event else ""
