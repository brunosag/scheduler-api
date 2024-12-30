import json
import os
import re

from playwright.sync_api import ElementHandle, Page, sync_playwright

# Environment variables for credentials
MOODLE_USERNAME = os.environ.get("MOODLE_USERNAME")
MOODLE_PASSWORD = os.environ.get("MOODLE_PASSWORD")

# URLs
LOGIN_URL = "https://www1.ufrgs.br/sistemas/portal/?Destino=ccd7f388f9a3e25ef6aff3b98c773f65"
COURSES_URL = (
    "https://www1.ufrgs.br/intranet/portal/public/index.php?cods=1,1,1,224"
)

# Day Mapping
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


def extract_schedule_data(schedule_string: str) -> dict:
    """Extracts day and time information from a schedule string."""
    match = re.match(
        r"(?P<day>.*?)\s*(?P<s_hh>\d+):(?P<s_mm>\d+)-(?P<e_hh>\d+):(?P<e_mm>\d+)",
        schedule_string,
    )
    if not match:
        return {}

    start_time = int(match.group("s_hh")) * 60 + int(match.group("s_mm"))
    end_time = int(match.group("e_hh")) * 60 + int(match.group("e_mm"))

    return {
        "day": DAY_MAP.get(match.group("day"), -1),
        "time": {"start": start_time, "end": end_time},
    }


def parse_schedule(schedule_cell: ElementHandle) -> list[dict]:
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

    schedule = [
        {
            **extract_schedule_data(schedule_str),
            "location": locations[i] if i < len(locations) else None,
        }
        for i, schedule_str in enumerate(schedule_strings)
    ]
    return schedule


def parse_professors(professors_cell: ElementHandle) -> list[str]:
    """Parses professor names."""
    professor_strings = [
        li.text_content().strip()
        for li in professors_cell.query_selector_all("li.hor")
    ]
    professors = []
    for professor_string in professor_strings:
        match = re.match(r"(?P<name>.*?) - Ministrante", professor_string)
        if match:
            professors.append(match.group("name").upper())
    return professors


def parse_courses(page: Page) -> list[dict]:
    """Parses the program's courses table."""
    page.wait_for_selector("table#Horarios")
    rows = page.query_selector_all("table#Horarios tbody tr")[1:]

    courses = []
    current_course = None

    for row in rows:
        cells = row.query_selector_all("td")
        title = cells[0].text_content().strip()

        if title:
            if current_course:
                courses.append(current_course)

            match = re.match(r"\((?P<code>.*?)\)\s*(?P<name>.*)", title)
            if match:
                current_course = {
                    "code": match.group("code"),
                    "name": match.group("name"),
                    "credits": int(cells[1].text_content().strip()),
                    "classes": [],
                }

        class_data = {
            "code": cells[2].text_content().strip(),
            "senior_spots": int(cells[3].text_content().strip()),
            "freshman_spots": int(cells[4].text_content().strip()),
            "schedule": parse_schedule(cells[8]),
            "professors": parse_professors(cells[9]),
        }
        current_course["classes"].append(class_data)

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

    json_out = json.dumps(courses, ensure_ascii=False)
    with open("courses.json", "w") as file:
        file.write(json_out)


if __name__ == "__main__":
    main()
