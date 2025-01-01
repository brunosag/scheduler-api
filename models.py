from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


course_prerequisite_association = Table(
    "course_prerequisite",
    Base.metadata,
    Column("course_id", ForeignKey("courses.id", ondelete="CASCADE")),
    Column("prerequisite_id", ForeignKey("courses.id", ondelete="CASCADE")),
)

professor_class_association = Table(
    "professor_class",
    Base.metadata,
    Column("professor_id", ForeignKey("professors.id", ondelete="CASCADE")),
    Column("class_id", ForeignKey("classes.id", ondelete="CASCADE")),
)


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    credits = Column(Integer, nullable=False)
    semester = Column(Integer)
    course_type = Column(Integer)
    required_credits = Column(Integer)
    prerequisites = relationship(
        "Course",
        secondary=course_prerequisite_association,
        primaryjoin=(id == course_prerequisite_association.c.course_id),
        secondaryjoin=(
            id == course_prerequisite_association.c.prerequisite_id
        ),
        backref="prerequisite_for",
    )
    classes = relationship("Class", back_populates="course")


class Class(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    code = Column(String, nullable=False)
    senior_spots = Column(Integer, nullable=False)
    freshman_spots = Column(Integer, nullable=False)
    schedules = relationship("Schedule", back_populates="class_")
    professors = relationship(
        "Professor",
        secondary=professor_class_association,
        back_populates="classes",
    )
    course = relationship("Course", back_populates="classes")


class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(
        Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    day = Column(Integer, nullable=False)
    start_time = Column(Integer, nullable=False)
    end_time = Column(Integer, nullable=False)
    location_text = Column(String)
    location_link = Column(String)
    class_ = relationship("Class", back_populates="schedules")


class Professor(Base):
    __tablename__ = "professors"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    classes = relationship(
        "Class",
        secondary=professor_class_association,
        back_populates="professors",
    )
