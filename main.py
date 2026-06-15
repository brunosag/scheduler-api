import argparse
import os

import uvicorn
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

from src.api import app
from src.curriculum import add_curriculum_data, parse_curriculum_page
from src.db import drop_and_recreate_tables, start_db_session
from src.schedule import login, parse_schedule_page, select_program

load_dotenv()

MOODLE_USERNAME = os.environ.get('MOODLE_USERNAME')
MOODLE_PASSWORD = os.environ.get('MOODLE_PASSWORD')
LOGIN_URL = 'https://www1.ufrgs.br/sistemas/portal/login?Destino=portal-matricula'
SCHEDULE_URL = 'https://www1.ufrgs.br/intranet/portal/public/index.php?cods=1,1,1,224'
CURRICULUM_URL = 'https://www1.ufrgs.br/PortalEnsino/GraduacaoCurriculos/plone.php?r=relatorio&curso=305&habilitacao=36&curriculo=95'


def run_scraper():
    """Executes the data ingestion and database population pipeline."""
    print('Initiating scraping worker...')
    if not MOODLE_USERNAME or not MOODLE_PASSWORD:
        raise ValueError(
            'MOODLE_USERNAME and MOODLE_PASSWORD must be set in environment variables.'
        )

    with sync_playwright() as p:
        browser = p.firefox.launch(headless=False)
        page = browser.new_page()

        page.goto(LOGIN_URL)
        login(page, MOODLE_USERNAME, MOODLE_PASSWORD)

        page.goto(SCHEDULE_URL)
        select_program(page, '38/1')
        schedule_courses = parse_schedule_page(page)

        page.goto(CURRICULUM_URL)
        curriculum_data = parse_curriculum_page(page)

        browser.close()

    courses = add_curriculum_data(schedule_courses, curriculum_data)

    session = start_db_session()
    drop_and_recreate_tables()

    session.add_all(courses)
    session.commit()
    session.close()
    print('Database population complete.')


def serve_api():
    """Launches the asynchronous API web server."""
    print('Booting UFRGS Scheduler API server...')
    uvicorn.run(app, host='0.0.0.0', port=8000)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='UFRGS Scheduler Pipeline & API')
    parser.add_argument(
        '--action',
        choices=['ingest', 'serve'],
        required=True,
        help="Choose 'ingest' to scrape data or 'serve' to boot the API.",
    )

    args = parser.parse_args()

    if args.action == 'ingest':
        run_scraper()
    elif args.action == 'serve':
        serve_api()
