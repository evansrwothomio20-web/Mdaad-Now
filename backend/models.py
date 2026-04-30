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
    description = Column(Text, nullable=True)
    stock_level = Column(Integer, default=100) 
    wishlist = Column(JSON, nullable=True) 
    is_critically_low = Column(Boolean, default=False)
    
    # Organization/Trust Fields
    verification_status = Column(String(50), default="verified")
    trust_score = Column(Integer, default=70)
    docs_submitted = Column(Boolean, default=True)
    un_ocha_registered = Column(Boolean, default=False)
    has_field_contact = Column(Boolean, default=True)
    community_reports = Column(Integer, default=0)
    campaigns_fulfilled = Column(Integer, default=0)
    days_active = Column(Integer, default=1)
    
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    campaigns = relationship("Campaign", back_populates="organization")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("resources.id"))
    posted_by = Column(String(100), nullable=True)

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False) # Food, Health, etc.

    urgency_level = Column(String(20), default="Medium")
    status = Column(String(20), default="active") # active, fulfilled, expired

    location_coords = Column(JSON, nullable=True)
    location_label = Column(String(150), nullable=True)
    is_location_masked = Column(Boolean, default=False)

    quantity_needed = Column(Integer, nullable=True)
    quantity_unit = Column(String(20), default="units")
    quantity_fulfilled = Column(Integer, default=0)
    
    volunteer_slots = Column(Integer, default=0)
    volunteers_claimed = Column(Integer, default=0)

    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Resource", back_populates="campaigns")
