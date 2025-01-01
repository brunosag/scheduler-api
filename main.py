import os

from playwright.sync_api import sync_playwright

from curriculum import add_curriculum_data, parse_curriculum_page
from db import reset_database, start_db_session
from schedule import login, parse_schedule_page, select_program

MOODLE_USERNAME = os.environ.get("MOODLE_USERNAME")
MOODLE_PASSWORD = os.environ.get("MOODLE_PASSWORD")
LOGIN_URL = "https://www1.ufrgs.br/sistemas/portal/?Destino=ccd7f388f9a3e25ef6aff3b98c773f65"
SCHEDULE_URL = (
    "https://www1.ufrgs.br/intranet/portal/public/index.php?cods=1,1,1,224"
)
CURRICULUM_URL = "https://www1.ufrgs.br/PortalEnsino/GraduacaoCurriculos/plone.php?r=relatorio&curso=305&habilitacao=36&curriculo=95"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        page.goto(LOGIN_URL)
        login(page, MOODLE_USERNAME, MOODLE_PASSWORD)

        page.goto(SCHEDULE_URL)
        select_program(page, "38/1")
        schedule_courses = parse_schedule_page(page)

        page.goto(CURRICULUM_URL)
        curriculum_data = parse_curriculum_page(page)

        browser.close()

    courses = add_curriculum_data(schedule_courses, curriculum_data)

    session = start_db_session()
    reset_database(session)

    session.add_all(courses)
    session.commit()
    session.close()


if __name__ == "__main__":
    main()
