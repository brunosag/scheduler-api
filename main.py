import os
import re

from playwright.sync_api import ElementHandle, Page, sync_playwright

from db import reset_database, start_db_session
from models import Class, Course, Professor, Schedule

MOODLE_USERNAME = os.environ.get("MOODLE_USERNAME")
MOODLE_PASSWORD = os.environ.get("MOODLE_PASSWORD")
LOGIN_URL = "https://www1.ufrgs.br/sistemas/portal/?Destino=ccd7f388f9a3e25ef6aff3b98c773f65"
COURSES_URL = (
    "https://www1.ufrgs.br/intranet/portal/public/index.php?cods=1,1,1,224"
)
DAY_MAP = {
    "Segunda": 0,
    "Terça": 1,
    "Quarta": 2,
    "Quinta": 3,
    "Sexta": 4,
    "Sábado": 5,
}


def login(page: Page, username: str, password: str):
    """Logs into the Moodle platform."""
    page.wait_for_selector("form#pessoal")
    page.fill("input#usuario", username)
    page.fill("input#senha", password)
    page.click("input[name='login']")
    page.wait_for_load_state("networkidle")


def select_program(page: Page, program_id: str):
    """Selects a specific program from the dropdown."""
    page.wait_for_selector("select#selecionado")
    page.select_option("select#selecionado", value=program_id)
    page.wait_for_load_state("networkidle")


def parse_schedules(
    schedule_cell: ElementHandle, class_: Class
) -> list[Schedule]:
    """Parses course schedule information."""
    schedule_strings = [
        li.text_content().strip()
        for li in schedule_cell.query_selector_all("li.hor")
    ]
    locations = [
        {
            "text": a.text_content().strip(),
            "link": a.get_attribute("href"),
        }
        for a in schedule_cell.query_selector_all("a.clicavel")
    ]

    schedules = []
    for i, schedule_str in enumerate(schedule_strings):
        match = re.match(
            r"(?P<day>.*?)\s*(?P<s_hh>\d+):(?P<s_mm>\d+)-(?P<e_hh>\d+):(?P<e_mm>\d+)",
            schedule_str,
        )
        if not match:
            continue

        location = locations[i] if i < len(locations) else None

        schedule = Schedule(
            class_=class_,
            day=DAY_MAP.get(match.group("day")),
            start_time=int(match.group("s_hh")) * 60
            + int(match.group("s_mm")),
            end_time=int(match.group("e_hh")) * 60 + int(match.group("e_mm")),
            location_text=location["text"] if location else None,
            location_link=location["link"] if location else None,
        )
        schedules.append(schedule)

    return schedules


def parse_professors(
    professors_cell: ElementHandle,
) -> list[str]:
    """Parses professor names."""
    professor_strings = [
        li.text_content().strip()
        for li in professors_cell.query_selector_all("li.hor")
    ]

    professors = []
    for professor_str in professor_strings:
        match = re.match(r"(?P<name>.*?) - Ministrante", professor_str)
        if match:
            professors.append(match.group("name").upper())

    return professors


def parse_courses(page: Page) -> list[Course]:
    """Parses the program's courses table."""
    page.wait_for_selector("table#Horarios tbody tr")
    rows = page.query_selector_all("table#Horarios tbody tr")[1:]

    courses = []
    professors = []

    for row in rows:
        cells = row.query_selector_all("td")
        title = cells[0].text_content().strip()

        if title:
            match = re.match(r"\((?P<code>.*?)\)\s*(?P<name>.*)", title)
            if not match:
                continue

            course = Course(
                code=match.group("code"),
                name=match.group("name"),
                credits=int(cells[1].text_content().strip()),
            )
            courses.append(course)

        class_ = Class(
            course=course,
            code=cells[2].text_content().strip(),
            senior_spots=int(cells[3].text_content().strip()),
            freshman_spots=int(cells[4].text_content().strip()),
        )
        course.classes.append(class_)

        class_.schedules.extend(parse_schedules(cells[8], class_))

        for name in parse_professors(cells[9]):
            professor = next(
                (prof for prof in professors if name == prof.name), None
            )
            if not professor:
                professor = Professor(name=name)
                professors.append(professor)

            class_.professors.append(professor)

    return courses


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        page.goto(LOGIN_URL)
        login(page, MOODLE_USERNAME, MOODLE_PASSWORD)

        page.goto(COURSES_URL)
        select_program(page, "38/1")
        courses = parse_courses(page)

        browser.close()

    session = start_db_session()

    reset_database(session)
    session.add_all(courses)

    session.commit()
    session.close()


if __name__ == "__main__":
    main()
