# Historian Export Portal

Local prototype for previewing and exporting mock historian data through a React dashboard and a FastAPI backend.

## Structure

```text
historian-export-portal/
  backend/
  frontend/
  shared/
  tools/
  README.md
  .env.example
  .gitignore
```

## Features

- React + Vite + TypeScript frontend with a dashboard-style export form
- FastAPI backend with modular routes, schemas, and historian service abstraction
- Mock industrial historian tags and timestamped sample values
- CSV export endpoint and XLSX placeholder response
- Validation for date range, timezone-aware timestamps, and tag selection
- CORS enabled for local development

## Prerequisites

- Node.js 20+ and npm 10+
- Python 3.12+

## Environment setup

The repository keeps a shared `.env.example` at the root. Copy it into both app directories before starting the services:

```powershell
Copy-Item .env.example backend\.env
Copy-Item .env.example frontend\.env
```

The backend ignores unknown keys, and the frontend only reads `VITE_*` variables.

## Backend setup

```powershell
cd historian-export-portal\backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

Backend URL: `http://127.0.0.1:8010`

## Frontend setup

```powershell
cd historian-export-portal\frontend
npm install
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

If you want to use the bundled local Node toolchain in `tools/`, run:

```powershell
cd historian-export-portal\frontend
$env:PATH = (Resolve-Path ..\tools\node-v20.20.1-win-x64).Path + ";" + $env:PATH
& ..\tools\node-v20.20.1-win-x64\npm.cmd install
& ..\tools\node-v20.20.1-win-x64\npm.cmd run dev
```

## API endpoints

- `GET /health`
- `GET /tags`
- `POST /preview`
- `POST /export`

## Troubleshooting

- If the project was moved to a new folder, recreate `backend\.venv`. Python virtual environments store absolute interpreter paths and can stop working after a move.
- If `python` is not on `PATH`, use `py -3.12` in the backend commands.
- If the frontend cannot reach the backend, confirm `frontend\.env` includes `VITE_API_BASE_URL=http://127.0.0.1:8010`, or rely on the default `/api` proxy in Vite dev mode.

## Notes

- `Raw` sampling is represented as 1-second data in the mock provider.
- `XLSX` export currently returns a `501 Not Implemented` placeholder.
- The backend service layer is prepared for future AVEVA Historian, SQL/ODBC, or authenticated providers.
- Port `8010` is used by default because port `8000` was occupied in this environment during verification.
