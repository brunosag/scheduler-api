from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


course_prerequisites = Table(
    "_CoursePrerequisites",
    Base.metadata,
    Column(
        "A",
        Integer,
        ForeignKey("Course.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "B",
        Integer,
        ForeignKey("Course.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

class_professors = Table(
    "_ClassToProfessor",
    Base.metadata,
    Column(
        "A",
        Integer,
        ForeignKey("Class.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "B",
        Integer,
        ForeignKey("Professor.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Course(Base):
    __tablename__ = "Course"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    credits = Column(Integer, nullable=False)
    semester = Column(Integer)
    courseType = Column(Integer)
    requiredCredits = Column(Integer)

    classes = relationship("Class", back_populates="course")
    prerequisites = relationship(
        "Course",
        secondary=course_prerequisites,
        primaryjoin=(id == course_prerequisites.c.B),
        secondaryjoin=(id == course_prerequisites.c.A),
        backref="prerequisiteFor",
    )


class Class(Base):
    __tablename__ = "Class"

    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(
        Integer, ForeignKey("Course.id", ondelete="CASCADE"), nullable=False
    )
    code = Column(String, nullable=False)
    seniorSpots = Column(Integer, nullable=False)
    freshmanSpots = Column(Integer, nullable=False)

    course = relationship("Course", back_populates="classes")
    professors = relationship(
        "Professor",
        secondary="_ClassToProfessor",
        back_populates="classes",
    )
    schedules = relationship("Schedule", back_populates="_class")


class Professor(Base):
    __tablename__ = "Professor"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)

    classes = relationship(
        "Class",
        secondary="_ClassToProfessor",
        back_populates="professors",
    )


class Schedule(Base):
    __tablename__ = "Schedule"

    id = Column(Integer, primary_key=True, autoincrement=True)
    classId = Column(
        Integer, ForeignKey("Class.id", ondelete="CASCADE"), nullable=False
    )
    day = Column(Integer, nullable=False)
    startTime = Column(Integer, nullable=False)
    endTime = Column(Integer, nullable=False)
    locationText = Column(String)
    locationLink = Column(String)

    _class = relationship("Class", back_populates="schedules")
