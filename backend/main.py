from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, database

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

@app.get("/")
def read_root():
    return {"message": "Welcome to the Humanitarian Coordination Ecosystem API"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# Example placeholder endpoints to be expanded
@app.get("/api/requests")
def get_requests(db: Session = Depends(database.get_db)):
    return db.query(models.Request).all()

@app.get("/api/volunteers")
def get_volunteers(db: Session = Depends(database.get_db)):
    return db.query(models.Volunteer).all()
