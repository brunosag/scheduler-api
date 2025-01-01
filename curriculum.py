import re

from playwright.sync_api import Page

from models import Course

CURRICULUM_URL = "https://www1.ufrgs.br/PortalEnsino/GraduacaoCurriculos/plone.php?r=relatorio&curso=305&habilitacao=36&curriculo=95"
SEMESTER_MAP = {"Obrigatória": 0, "Eletiva": 1, "Alternativa": 2}
SEMESTER_COUNT = 8


def parse_curriculum_page(page: Page) -> list[dict]:
    curriculum_data = []

    tables = page.query_selector_all("table.modelo1")[0 : SEMESTER_COUNT + 1]
    for table_index, table in enumerate(tables):
        rows = table.query_selector_all("tbody tr")
        for row in rows:
            cells = row.query_selector_all("td")

            code = cells[0].text_content().strip()
            semester = 0 if table_index == SEMESTER_COUNT else table_index + 1
            course_type = SEMESTER_MAP.get(cells[2].text_content().strip())
            required_credits = 0

            prereq_codes = []
            prereq_strings = [
                span.text_content().strip()
                for span in cells[1].query_selector_all("span")
            ]
            for prereq_str in prereq_strings:
                course_match = re.search(r"\b[A-Z]{3}\d{5}\b", prereq_str)
                if course_match:
                    prereq_codes.append(course_match.group())
                else:
                    credits_match = re.search(
                        r"Créditos Obrigatórios - (?P<num>\d+)", prereq_str
                    )
                    if credits_match:
                        required_credits = int(credits_match.group("num"))

            curriculum_data.append(
                {
                    "code": code,
                    "semester": semester,
                    "course_type": course_type,
                    "required_credits": required_credits,
                    "prereq_codes": prereq_codes,
                }
            )

    return curriculum_data


def add_curriculum_data(
    schedule_courses: list[Course], curriculum_data: list[dict]
) -> list[Course]:
    """Adds curriculum data to schedule courses"""
    schedule_lookup = {course.code: course for course in schedule_courses}

    enriched_courses = []

    for curriculum_course in curriculum_data:
        course_code = curriculum_course["code"]
        course = schedule_lookup.get(course_code)

        if not course:
            continue

        course.semester = curriculum_course["semester"]
        course.required_credits = curriculum_course["required_credits"]
        course.course_type = curriculum_course["course_type"]

        course.prerequisites.extend(
            prereq
            for prereq_code in curriculum_course["prereq_codes"]
            if (prereq := schedule_lookup.get(prereq_code)) is not None
        )

        enriched_courses.append(course)

    return enriched_courses
