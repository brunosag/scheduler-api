from fastapi import Depends, FastAPI, HTTPException, Query

from . import db, schemas

app = FastAPI(
    title='UFRGS Scheduler API',
    description='Programmatic access to UFRGS curriculum and scheduling data.',
    version='1.0.0',
)


def get_db_session():
    """Dependency injection for database sessions."""
    session = db.start_db_session()
    try:
        yield session
    finally:
        session.close()


@app.get('/api/v1/curriculum', response_model=list[schemas.CourseBase])
def get_curriculum(session=Depends(get_db_session)):
    """Retrieve the full course hierarchy representing the curriculum."""
    courses = db.get_all_courses(session)
    if not courses:
        raise HTTPException(status_code=404, detail='No courses found in the database.')
    return courses


@app.get('/api/v1/classes', response_model=list[schemas.ClassBase])
def get_classes(
    course_code: str = Query(
        ..., description='The internal course code (e.g., INF01101)'
    ),
    day: int | None = Query(
        None, description='Filter by day of the week (0=Segunda, 5=Sábado)'
    ),
    session=Depends(get_db_session),
):
    """Query specific class sections and schedules filtered by course and day."""
    classes = db.get_classes_by_filter(session, course_code, day)
    if not classes:
        raise HTTPException(
            status_code=404, detail='No classes found matching criteria.'
        )
    return classes
