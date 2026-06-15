from pydantic import BaseModel


class ScheduleBase(BaseModel):
    day: int
    startTime: int
    endTime: int
    locationText: str | None = None
    locationLink: str | None = None

    class Config:
        from_attributes = True


class ClassBase(BaseModel):
    code: str
    seniorSpots: int
    freshmanSpots: int
    schedules: list[ScheduleBase] = []

    class Config:
        from_attributes = True


class CourseBase(BaseModel):
    code: str
    name: str
    credits: int
    semester: int | None = None
    courseType: int | None = None
    requiredCredits: int | None = None
    classes: list[ClassBase] = []

    class Config:
        from_attributes = True
