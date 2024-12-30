import json
import os
import re

from playwright.sync_api import Page, sync_playwright

MOODLE_USERNAME = os.environ.get("MOODLE_USERNAME")
MOODLE_PASSWORD = os.environ.get("MOODLE_PASSWORD")
LOGIN_URL = "https://www1.ufrgs.br/sistemas/portal/?Destino=ccd7f388f9a3e25ef6aff3b98c773f65"
TABLES_URL = (
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
    page.wait_for_selector("form#pessoal")
    page.fill("input#usuario", username)
    page.fill("input#senha", password)
    page.click("input[name='login']")
    page.wait_for_load_state("networkidle")


def select_program(page: Page, program_id: str):
    page.wait_for_selector("select#selecionado")
    page.select_option("select#selecionado", value=program_id)
    page.wait_for_load_state("networkidle")


def parse_table(page: Page) -> list[dict[str, str]]:
    page.wait_for_selector("table#Horarios")
    rows = page.query_selector_all("table#Horarios tbody tr")

    courses = []
    current_course = None
    for row in rows:
        cells = row.query_selector_all("td")
        if cells:
            title = cells[0].text_content().strip()
            if title:
                if current_course:
                    courses.append(current_course)

                match = re.match(r"\((?P<code>.*?)\)\s*(?P<name>.*)", title)

                code = match.group("code")
                name = match.group("name")
                credits = int(cells[1].text_content().strip())

                current_course = dict(
                    code=code,
                    name=name,
                    credits=credits,
                    classes=[],
                )

            code = cells[2].text_content().strip()
            senior_spots = int(cells[3].text_content().strip())
            freshman_spots = int(cells[4].text_content().strip())

            schedule_strings = [
                li.text_content().strip()
                for li in cells[8].query_selector_all("li.hor")
            ]
            locations = [
                {
                    "text": a.text_content().strip(),
                    "link": a.get_attribute("href"),
                }
                for a in cells[8].query_selector_all("a.clicavel")
            ]

            schedule = []
            for i, schedule_string in enumerate(schedule_strings):
                match = re.match(
                    r"(?P<day>.*?)\s*(?P<s_hh>\d+):(?P<s_mm>\d+)-(?P<e_hh>\d+):(?P<e_mm>\d+)",
                    schedule_string,
                )
                schedule_item = dict(
                    day=DAY_MAP[match.group("day")],
                    time=dict(
                        start=int(match.group("s_hh")) * 60
                        + int(match.group("s_mm")),
                        end=int(match.group("e_hh")) * 60
                        + int(match.group("e_mm")),
                    ),
                    location=locations[i] if i < len(locations) else None,
                )
                schedule.append(schedule_item)

            professor_strings = [
                li.text_content().strip()
                for li in cells[9].query_selector_all("li.hor")
            ]

            professors = []
            for professor_string in professor_strings:
                match = re.match(
                    r"(?P<name>.*?) - Ministrante", professor_string
                )
                if match:
                    name = match.group("name")
                    professors.append(name.upper())

            current_class = dict(
                code=code,
                senior_spots=senior_spots,
                freshman_spots=freshman_spots,
                schedule=schedule,
                professors=professors,
            )
            current_course["classes"].append(current_class)

    return courses


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        page.goto(LOGIN_URL)
        login(page, MOODLE_USERNAME, MOODLE_PASSWORD)

        page.goto(TABLES_URL)
        select_program(page, "38/1")

        courses = parse_table(page)

        browser.close()

    json_out = json.dumps(courses, ensure_ascii=False)
    with open("courses.json", "w") as file:
        file.write(json_out)


if __name__ == "__main__":
    main()
