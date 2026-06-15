# `scheduler-ufrgs` API

An automated data ingestion pipeline and a REST API to extract, store, and serve curriculum and scheduling data from the UFRGS (Universidade Federal do Rio Grande do Sul) systems.

## Architecture and stack

* **Language:** Python 3.13+
* **Web Framework:** FastAPI, Uvicorn
* **Database:** SQLite, SQLAlchemy
* **Scraping:** Playwright
* **Data Validation:** Pydantic

## Installation

1. Install the dependencies.
```bash
uv sync
```

2. Install the necessary Playwright browser binaries for the scraping pipeline:
```bash
playwright install firefox
```

## Configuration

The data ingestion pipeline requires active UFRGS Moodle credentials to access the intranet portals. Copy the `.env.example` file to create a `.env` file in the root directory and populate it with your credentials:

```env
MOODLE_USERNAME=your_username
MOODLE_PASSWORD=your_password
```

## Usage

The application is operated via the `main.py` script, which accepts an `--action` argument to dictate its operation mode.

### 1. Data ingestion pipeline

To run the automated scraper, which navigates the UFRGS portal, extracts the course schedules and curriculum structures, and populates the local SQLite database (`ufrgs.db`):

```bash
uv run main.py --action ingest
```

### 2. API server

To boot the asynchronous web server and expose the ingested data via HTTP endpoints:

```bash
uv run main.py --action serve
```

The server binds to `0.0.0.0` on port `8000`. API documentation (Swagger UI) is automatically generated and accessible at the root URL path when the server is active.

## Endpoints

The API currently exposes the following public routes:

* `GET /api/v1/curriculum`: Retrieves the full course hierarchy representing the current program curriculum.
* `GET /api/v1/classes`: Queries specific class sections and schedules.
  * `course_code` (str, required): The internal course code (e.g., `INF01101`).
  * `day` (int, optional): Filter schedules by day of the week, where `0` represents Monday and `5` represents Saturday.
