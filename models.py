from datetime import time
from typing import List, Optional

from sqlalchemy import (
    CheckConstraint,
    Column,
    Enum,
    ForeignKey,
    Integer,
    String,
    Table,
    UniqueConstraint,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    MappedAsDataclass,
    mapped_column,
    relationship,
)
from typing_extensions import Annotated

intpk = Annotated[int, mapped_column(primary_key=True)]


class Base(MappedAsDataclass, DeclarativeBase):
    pass


course_prerequisites = Table(
    "course_prerequisites",
    Base.metadata,
    Column("course_id", Integer, ForeignKey("courses.id"), primary_key=True),
    Column(
        "prerequisite_id",
        Integer,
        ForeignKey("courses.id"),
        primary_key=True,
    ),
)


class Program(Base):
    __tablename__ = "programs"

    code: Mapped[intpk]
    name: Mapped[str] = mapped_column(String(100), unique=True)
    required_credits: Mapped[int]
    elective_credits: Mapped[int]
    required_hours: Mapped[int]
    elective_hours: Mapped[int]

    students: Mapped[List["Student"]] = relationship(back_populates="program")


class Student(Base):
    __tablename__ = "students"

    id: Mapped[intpk]
    program_code: Mapped[int] = mapped_column(ForeignKey("programs.code"))
    name: Mapped[str] = mapped_column(String(50))
    semester: Mapped[int]
    student_order: Mapped[int]
    UniqueConstraint("program_code", "student_order")

    program: Mapped["Program"] = relationship(back_populates="students")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[intpk]
    code: Mapped[str] = mapped_column(String(8), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    course_type: Mapped[str] = mapped_column(
        Enum("required", "elective", "alternative", name="course_type")
    )
    semester: Mapped[Optional[int]]
    credits: Mapped[int]
    hours: Mapped[int]
    syllabus_code: Mapped[str] = mapped_column(String(15))
    required_credits: Mapped[Optional[int]]

    class_groups: Mapped["ClassGroup"] = relationship(back_populates="course")
    prerequisites: Mapped[List["Course"]] = relationship(
        "Course",
        secondary=course_prerequisites,
        primaryjoin="Course.id==course_prerequisites.c.course_id",
        secondaryjoin="Course.id==course_prerequisites.c.prerequisite_id",
        back_populates="unlocks",
    )
    unlocks: Mapped[List["Course"]] = relationship(
        "Course",
        secondary=course_prerequisites,
        primaryjoin="Course.id==course_prerequisites.c.prerequisite_id",
        secondaryjoin="Course.id==course_prerequisites.c.course_id",
        back_populates="prerequisites",
    )


class ClassGroup(Base):
    __tablename__ = "class_groups"

    id: Mapped[intpk]
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))
    code: Mapped[str] = mapped_column(String(2))
    freshman_slots: Mapped[int]
    senior_slots: Mapped[int]
    filled_freshman_slots: Mapped[int]
    filled_senior_slots: Mapped[int]
    observation: Mapped[Optional[str]] = mapped_column(String(250))
    UniqueConstraint("course_id", "code")

    course: Mapped["Course"] = relationship(back_populates="class_groups")
    professors: Mapped[List["ClassProfessor"]] = relationship(
        back_populates="class_group"
    )


class Professor(Base):
    __tablename__ = "professors"

    id: Mapped[intpk]
    name: Mapped[str] = mapped_column(String(150))

    class_groups: Mapped[List["ClassProfessor"]] = relationship(
        back_populates="professor"
    )


class ClassProfessor(Base):
    __tablename__ = "class_professors"

    class_id: Mapped[int] = mapped_column(
        ForeignKey("class_groups.id"), primary_key=True
    )
    professor_id: Mapped[int] = mapped_column(
        ForeignKey("professors.id"), primary_key=True
    )
    class_group: Mapped["ClassGroup"] = relationship(back_populates="professors")
    professor: Mapped["Professor"] = relationship(back_populates="class_groups")
    is_grader: Mapped[bool] = mapped_column(default_factory=False)
    is_grader: Mapped[bool] = mapped_column(default_factory=True)
    is_grader: Mapped[bool] = mapped_column(default_factory=True)


class ClassSchedule(Base):
    __tablename__ = "class_schedules"

    id: Mapped[intpk]
    class_id: Mapped[int] = mapped_column(ForeignKey("class_groups.id"))
    weekday: Mapped[str] = mapped_column(
        Enum("monday", "tuesday", "wednesday", "thursday", "friday", name="weekday")
    )
    start_time: Mapped[time]
    end_time: Mapped[time]
    location: Mapped[Optional[str]] = mapped_column(String(100))
    building_number: Mapped[Optional[int]]
    CheckConstraint("end_time > start_time")
