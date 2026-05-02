from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Defaulting to MySQL, falling back to SQLite for local development if needed
MYSQL_URL = "mysql+pymysql://root:password@localhost/mdaad_now"
SQLITE_URL = "sqlite:///./mdaad_now.db"

# Change this based on actual environment
USE_SQLITE = True

SQLALCHEMY_DATABASE_URL = SQLITE_URL if USE_SQLITE else MYSQL_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if USE_SQLITE else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
