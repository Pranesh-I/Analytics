import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Build connection URL from discrete environment variables or fallback to full DATABASE_URL
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

DEFAULT_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)



# Use standard synchronous SQLAlchemy engine for reliable execution
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Detects closed connections and reconnects
    pool_size=10,        # Number of connections to keep open in the pool
    max_overflow=20,     # Extra connections allowed beyond pool_size
    connect_args={"connect_timeout": 10}  # 10 second timeout for initial connection
)

# Create a local session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models to inherit
Base = declarative_base()


def get_db():
    """
    FastAPI Dependency to retrieve a database session.
    Automatically closes the session after request lifecycle is complete.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
