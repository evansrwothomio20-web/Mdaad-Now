from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base

class UrgencyLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    CRITICAL = "Critical"

class RequestStatus(str, enum.Enum):
    PENDING = "Pending"
    DISPATCHED = "Dispatched"
    FULFILLED = "Fulfilled"

class VolunteerStatus(str, enum.Enum):
    AVAILABLE = "Available"
    BUSY = "Busy"
    OFFLINE = "Offline"

class NeedsCategory(str, enum.Enum):
    SAFETY = "Safety"
    FOOD = "Food"
    HEALTH = "Health"
    SHELTER = "Shelter"

class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    needs_category = Column(Enum(NeedsCategory), index=True)
    district = Column(String(100), index=True)
    urgency_level = Column(Enum(UrgencyLevel), default=UrgencyLevel.MEDIUM)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    description = Column(Text, nullable=False)
    location_coords = Column(JSON, nullable=True) # {"lat": float, "lng": float}
    is_confidential = Column(Boolean, default=False)
    reported_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tasks = relationship("Task", back_populates="request")

class Volunteer(Base):
    __tablename__ = "volunteers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), unique=True, index=True) # Reference to external auth or internal user
    name = Column(String(100))
    skill_tags = Column(JSON) # e.g. ["Medical", "Logistics"]
    status = Column(Enum(VolunteerStatus), default=VolunteerStatus.AVAILABLE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tasks = relationship("Task", back_populates="volunteer")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"))
    volunteer_id = Column(Integer, ForeignKey("volunteers.id"))
    claimed_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    request = relationship("Request", back_populates="tasks")
    volunteer = relationship("Volunteer", back_populates="tasks")

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150))
    category = Column(String(50)) # ngo, hospital, shelter
    address = Column(String(200))
    stock_level = Column(Integer, default=100) # Percentage (0-100)
    wishlist = Column(JSON, nullable=True) # Array of items
    is_critically_low = Column(Boolean, default=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
