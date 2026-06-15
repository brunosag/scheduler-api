import re

from playwright.sync_api import ElementHandle, Page

from .models import Class, Course, Professor, Schedule

DAY_MAP = {
    'Segunda': 0,
    'Terça': 1,
    'Quarta': 2,
    'Quinta': 3,
    'Sexta': 4,
    'Sábado': 5,
}


def login(page: Page, username: str, password: str):
    """Logs into the Moodle platform."""
    page.wait_for_selector('form#pessoal')
    page.fill('input#usuario', username)
    page.fill('input#senha', password)
    page.press('input#senha', 'Enter')
    page.wait_for_load_state('networkidle')


def select_program(page: Page, program_id: str):
    """Selects a specific program from the dropdown."""
    page.wait_for_selector('select#selecionado')
    page.select_option('select#selecionado', value=program_id)
    page.wait_for_load_state('networkidle')


def parse_schedules(schedule_cell: ElementHandle, _class: Class) -> list[Schedule]:
    """Parses course schedule information."""
    schedule_strings = [
        li.text_content().strip() for li in schedule_cell.query_selector_all('li.hor')
    ]
    locations = [
        {
            'text': a.text_content().strip(),
            'link': a.get_attribute('href'),
        }
        for a in schedule_cell.query_selector_all('a.clicavel')
    ]

    schedules = []
    for i, schedule_str in enumerate(schedule_strings):
        match = re.match(
            r'(?P<day>.*?)\s*(?P<s_hh>\d+):(?P<s_mm>\d+)-(?P<e_hh>\d+):(?P<e_mm>\d+)',
            schedule_str,
        )
        if not match:
            continue

        location = locations[i] if i < len(locations) else None

        schedule = Schedule(
            _class=_class,
            day=DAY_MAP.get(match.group('day')),
            startTime=int(match.group('s_hh')) * 60 + int(match.group('s_mm')),
            endTime=int(match.group('e_hh')) * 60 + int(match.group('e_mm')),
            locationText=location['text'] if location else None,
            locationLink=location['link'] if location else None,
        )
        schedules.append(schedule)

    return schedules


def parse_professors(
    professors_cell: ElementHandle,
) -> list[str]:
    """Parses professor names."""
    professor_strings = [
        li.text_content().strip() for li in professors_cell.query_selector_all('li.hor')
    ]

    professors = []
    for professor_str in professor_strings:
        match = re.match(r'(?P<name>.*?) - Ministrante', professor_str)
        if match:
            professors.append(match.group('name').upper())

    return professors


def parse_schedule_page(page: Page) -> list[Course]:
    """Parses the program's courses table."""
    page.wait_for_selector('table#Horarios tbody tr')
    rows = page.query_selector_all('table#Horarios tbody tr')[1:]

    courses = []
    professors = []

    for row in rows:
        cells = row.query_selector_all('td')
        title = cells[0].text_content().strip()

        if title:
            match = re.match(r'\((?P<code>.*?)\)\s*(?P<name>.*)', title)
            if not match:
                continue

            course = Course(
                code=match.group('code'),
                name=match.group('name'),
                credits=int(cells[1].text_content().strip()),
            )
            courses.append(course)

        _class = Class(
            course=course,
            code=cells[2].text_content().strip(),
            seniorSpots=int(cells[3].text_content().strip()),
            freshmanSpots=int(cells[4].text_content().strip()),
        )
        course.classes.append(_class)

        _class.schedules.extend(parse_schedules(cells[8], _class))

        for name in parse_professors(cells[9]):
            professor = next((prof for prof in professors if name == prof.name), None)
            if not professor:
                professor = Professor(name=name)
                professors.append(professor)

            _class.professors.append(professor)

    return courses
