import os

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from models import Base, Class, Course, Professor, Schedule

TURSO_DATABASE_URL = os.environ.get("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.environ.get("TURSO_AUTH_TOKEN")


def create_db_engine() -> Engine:
    """Creates and returns a database engine."""
    dbUrl = f"sqlite+{TURSO_DATABASE_URL}/?authToken={TURSO_AUTH_TOKEN}&secure=true"
    engine = create_engine(dbUrl, connect_args={"check_same_thread": False})
    return engine


def start_db_session() -> Session:
    """Starts and returns a new database session."""
    engine = create_db_engine()
    session = Session(engine)
    return session


def drop_and_recreate_tables():
    """Drops and recreates all database tables."""
    engine = create_db_engine()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def reset_database(session: Session):
    """Wipes all data from the database."""
    session.query(Schedule).delete()
    session.query(Professor).delete()
    session.query(Class).delete()
    session.query(Course).delete()
    session.commit()
