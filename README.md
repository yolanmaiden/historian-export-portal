# Historian Export Portal

Local prototype for previewing and exporting mock historian data through a React dashboard and a FastAPI backend.

## Structure

```text
historian-export-portal/
  frontend/
  backend/
  shared/
  README.md
  .gitignore
  .env.example
```

## Features

- React + Vite + TypeScript frontend with a dashboard-style export form
- FastAPI backend with modular routes, models, and historian service abstraction
- Mock industrial historian tags and realistic timestamped sample values
- CSV export endpoint and XLSX placeholder response
- Validation for date range and tag selection
- CORS enabled for local development

## Prerequisites

- Node.js 20+ and npm 10+
- Python 3.12+

## Backend setup

```powershell
cd historian-export-portal\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\.env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

Backend will be available at `http://127.0.0.1:8010`.

## Frontend setup

```powershell
cd historian-export-portal\frontend
npm install
copy ..\.env.example .env
npm run dev
```

Frontend will be available at `http://127.0.0.1:5173`.

## API endpoints

- `GET /health`
- `GET /tags`
- `POST /preview`
- `POST /export`

## Notes

- `Raw` sampling is represented as 1-second data in the mock provider.
- `XLSX` export currently returns a `501 Not Implemented` placeholder.
- The backend service layer is prepared for future AVEVA Historian, SQL/ODBC, or authenticated providers.
- Port `8010` is used by default because port `8000` was occupied in this environment during verification.
