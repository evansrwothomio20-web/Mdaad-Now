from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from . import models, database, reliefweb, hdx_hapi, unhcr, hot_osm

# Create tables if they don't exist
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Mdaad Now Ecosystem API")

# Setup CORS for PWA and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Schemas ──────────────────────────────────────────

class RequestCreate(BaseModel):
    category: str
    district: str
    urgency: str
    description: str
    is_confidential: bool = False
    location_coords: Optional[dict] = None

class RequestResponse(BaseModel):
    id: int
    needs_category: str
    district: str
    urgency_level: str
    status: str
    description: str
    
    class Config:
        from_attributes = True

class ResourceResponse(BaseModel):
    id: int
    name: str
    category: str
    address: Optional[str]
    stock_level: int
    wishlist: Optional[List[str]]
    is_critically_low: bool

    class Config:
        from_attributes = True

class OrganizationResponse(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str]
    verification_status: str
    trust_score: int
    docs_submitted: bool
    un_ocha_registered: bool
    has_field_contact: bool
    community_reports: int
    campaigns_fulfilled: int
    days_active: int

    class Config:
        from_attributes = True

class CampaignCreate(BaseModel):
    org_id: int
    title: str
    description: str
    category: str
    urgency_level: str
    location_coords: Optional[dict] = None
    location_label: Optional[str] = None
    quantity_needed: Optional[int] = None
    quantity_unit: str = "units"

class CampaignResponse(BaseModel):
    id: int
    org_id: int
    title: str
    description: str
    category: str
    urgency_level: str
    status: str
    quantity_needed: Optional[int]
    quantity_fulfilled: int
    is_verified: bool

    class Config:
        from_attributes = True

class VolunteerCreate(BaseModel):
    user_id: str
    name: str
    skill_tags: List[str]

class StatusUpdate(BaseModel):
    status: str

# ── Endpoints ───────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "Welcome to the Humanitarian Coordination Ecosystem API"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/requests", response_model=List[RequestResponse])
def get_requests(db: Session = Depends(database.get_db)):
    return db.query(models.Request).all()

@app.post("/api/requests")
def create_request(req: RequestCreate, db: Session = Depends(database.get_db)):
    # Map frontend names to backend model
    new_req = models.Request(
        needs_category=req.category,
        district=req.district,
        urgency_level=req.urgency,
        description=req.description,
        is_confidential=req.is_confidential,
        location_coords=req.location_coords
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return new_req

@app.get("/api/resources", response_model=List[ResourceResponse])
def get_resources(db: Session = Depends(database.get_db)):
    return db.query(models.Resource).all()

@app.get("/api/organizations/{org_id}", response_model=OrganizationResponse)
def get_organization(org_id: int, db: Session = Depends(database.get_db)):
    org = db.query(models.Resource).filter(models.Resource.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@app.get("/api/volunteers")
def get_volunteers(db: Session = Depends(database.get_db)):
    return db.query(models.Volunteer).all()

@app.post("/api/volunteers")
def register_volunteer(vol: VolunteerCreate, db: Session = Depends(database.get_db)):
    db_vol = db.query(models.Volunteer).filter(models.Volunteer.user_id == vol.user_id).first()
    if db_vol:
        return db_vol
    new_vol = models.Volunteer(**vol.dict())
    db.add(new_vol)
    db.commit()
    db.refresh(new_vol)
    return new_vol

@app.patch("/api/requests/{req_id}")
def update_request_status(req_id: int, update: StatusUpdate, db: Session = Depends(database.get_db)):
    req = db.query(models.Request).filter(models.Request.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = update.status
    db.commit()
    return req

@app.get("/api/campaigns", response_model=List[CampaignResponse])
def get_campaigns(db: Session = Depends(database.get_db)):
    return db.query(models.Campaign).all()

@app.post("/api/campaigns", response_model=CampaignResponse)
def create_campaign(camp: CampaignCreate, db: Session = Depends(database.get_db)):
    new_camp = models.Campaign(**camp.dict())
    db.add(new_camp)
    db.commit()
    db.refresh(new_camp)
    return new_camp
@app.get("/api/external/reports")
def get_external_reports(country: str = "Lebanon"):
    """Fetch recent reports from ReliefWeb."""
    reports = reliefweb.fetch_reliefweb_reports(country=country)
    # Map ReliefWeb reports to the structure expected by the frontend
    mapped = []
    for r in reports:
        mapped.append({
            "id": f"rw-{r['url'].split('/')[-1]}", # Use ID from URL
            "category": "Safety",
            "description": r['title'],
            "reported_by": r['source'],
            "created_at": r['date'],
            "is_verified": True,
            "url": r['url']
        })
    return mapped

@app.get("/api/external/disasters/count")
def get_disasters_count():
    """Fetch active disasters count from ReliefWeb."""
    count = reliefweb.fetch_active_disasters_count()
    return {"count": count}

@app.get("/api/external/hdx/presence")
def get_hdx_presence(location: str = "Lebanon", admin_level: int = 0):
    """Fetch operational presence from HDX HAPI."""
    return hdx_hapi.fetch_hdx_presence(location=location, admin_level=admin_level)

@app.get("/api/external/hdx/funding")
def get_hdx_funding(location: str = "Lebanon"):
    """Fetch funding status from HDX HAPI."""
    return hdx_hapi.fetch_hdx_funding(location=location)

@app.get("/api/external/unhcr/population")
def get_unhcr_population(coa: str = "LBN", year: int = 2023):
    """Fetch refugee population statistics from UNHCR."""
    return unhcr.fetch_unhcr_population(coa=coa, year=year)
@app.get("/api/external/hot/projects")
def get_hot_projects(search: str = "Lebanon"):
    """Fetch active projects from HOT Tasking Manager."""
    return hot_osm.fetch_hot_projects(search=search)

@app.get("/api/external/hot/stats/{project_id}")
def get_hot_stats(project_id: int):
    """Fetch statistics for a specific HOT project."""
    return hot_osm.fetch_project_stats(project_id=project_id)
