from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from .models import Base, Class, Course, Professor, Schedule


def create_db_engine() -> Engine:
    """Creates and returns a database engine."""
    dbUrl = 'sqlite:///ufrgs.db'
    engine = create_engine(dbUrl, connect_args={'check_same_thread': False})
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


def get_all_courses(session: Session) -> list[Course]:
    """Retrieves the complete curriculum, ordered by semester."""
    return session.query(Course).order_by(Course.semester, Course.name).all()


def get_classes_by_filter(
    session: Session, course_code: str, day: int | None = None
) -> list[Class]:
    """Queries class sections filtered by course code and optionally by day of the week."""
    query = session.query(Class).join(Course).filter(Course.code == course_code)

    if day is not None:
        query = query.join(Schedule).filter(Schedule.day == day)

    return query.all()
