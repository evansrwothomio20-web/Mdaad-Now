from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from . import models

def seed_db():
    db = SessionLocal()
    
    # 1. Clear existing data (optional, but good for a clean seed)
    db.query(models.Resource).delete()
    db.query(models.Request).delete()
    db.query(models.Volunteer).delete()
    
    # 2. Add Initial Resources (NGOs, Hospitals, Shelters)
    resources = [
        models.Resource(
            name="Al-Rahma Medical Center",
            category="hospital",
            address="District 5, Sector A, Building 12",
            description="24/7 emergency care, pediatrics, and maternal health services.",
            stock_level=80,
            wishlist=["Antibiotics", "Insulin"],
            is_critically_low=False,
            trust_score=95,
            days_active=120
        ),
        models.Resource(
            name="Hope Beyond Borders",
            category="ngo",
            address="Sector C, Aid Coordination Office",
            description="Food distribution and non-food item provisioning. Running daily kitchen serving 800 meals.",
            stock_level=8,
            wishlist=["Blankets", "Rice", "Cooking Oil"],
            is_critically_low=True,
            trust_score=78,
            docs_submitted=True,
            un_ocha_registered=True,
            has_field_contact=True,
            community_reports=3,
            campaigns_fulfilled=4,
            days_active=45
        ),
        models.Resource(
            name="Shelter Point Alpha",
            category="shelter",
            address="District 3, Old School Compound",
            description="Transitional shelter for displaced families. Warm meals, bedding, and psychosocial support available.",
            stock_level=60,
            wishlist=["Tents", "Mats"],
            is_critically_low=False,
            trust_score=88,
            days_active=30
        )
    ]
    
    for r in resources:
        db.add(r)
        
    # 3. Add Initial Requests (Mock Feed)
    requests = [
        models.Request(
            needs_category="Safety",
            district="District 3",
            urgency_level="High",
            status="Pending",
            description="Main road between District 3 and District 5 blocked by debris. Assessment team needed.",
            is_confidential=False
        ),
        models.Request(
            needs_category="Food",
            district="Sector C",
            urgency_level="Medium",
            status="Dispatched",
            description="Daily hot meal distribution starting at 12:00 near Mosque.",
            is_confidential=False
        )
    ]
    
    for req in requests:
        db.add(req)

    # 4. Add Initial Campaigns
    campaigns = [
        models.Campaign(
            org_id=2, # Hope Beyond Borders
            title="200 Blankets for District 3",
            description="Providing warmth for displaced families in the old school compound.",
            category="Shelter",
            urgency_level="High",
            location_label="District 3",
            location_coords={"lat": 37.066, "lng": 37.383},
            quantity_needed=200,
            quantity_unit="units",
            quantity_fulfilled=45,
            volunteer_slots=5
        ),
        models.Campaign(
            org_id=2, # Hope Beyond Borders
            title="Emergency Food Parcels",
            description="Weekly food distribution for Sector C families.",
            category="Food",
            urgency_level="Critical",
            location_label="Sector C",
            location_coords={"lat": 37.067, "lng": 37.384},
            quantity_needed=500,
            quantity_unit="kits",
            quantity_fulfilled=120,
            volunteer_slots=10
        )
    ]
    
    for c in campaigns:
        db.add(c)
        
    db.commit()
    print("Database seeded successfully!")
    db.close()

if __name__ == "__main__":
    # Create tables if not exist
    models.Base.metadata.create_all(bind=engine)
    seed_db()
