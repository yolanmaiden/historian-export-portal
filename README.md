# Historian Export Portal

Local prototype for previewing and exporting historian-style time-series data through a React dashboard and a FastAPI backend.

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

- React + Vite + TypeScript frontend with searchable tag selection
- FastAPI backend with modular routes, schemas, and provider-based historian services
- Retrieval modes modeled explicitly as `raw`, `delta`, and `cyclic`
- Rich tag metadata including `tag_name`, `description`, `io_address`, `units`, and `source_system`
- Mock historian provider for local development and an AVEVA ODBC provider integration path
- CSV export endpoint and XLSX placeholder response

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

### Provider selection

- `HISTORIAN_PROVIDER=mock` keeps the local prototype self-contained.
- `HISTORIAN_PROVIDER=aveva_odbc` enables the AVEVA Historian ODBC provider.

ODBC settings:

- `HISTORIAN_ODBC_DSN`
- `HISTORIAN_ODBC_UID`
- `HISTORIAN_ODBC_PWD`
- `HISTORIAN_QUERY_TIMEOUT_SECONDS`

Current provider behavior:

- Mock provider supports `raw` and `delta`
- Mock provider returns a clean `501` for `cyclic`
- ODBC provider is currently intended to start with `delta`
- ODBC provider returns a clean `501` for retrieval modes not implemented yet

### Live ODBC validation

Set these backend variables before starting FastAPI with the ODBC provider:

- `HISTORIAN_PROVIDER=aveva_odbc`
- `HISTORIAN_ODBC_DSN`
- `HISTORIAN_ODBC_UID` and `HISTORIAN_ODBC_PWD` if the DSN does not use integrated security
- `HISTORIAN_QUERY_TIMEOUT_SECONDS`

Then validate the workflow in this order:

1. `GET /health`

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8010/health'
```

Expected result: `status = ok`

2. `GET /tags`

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8010/tags'
```

Expected result: an array of canonical tag metadata objects with `tag_name`, `description`, `io_address`, `units`, and `source_system`

3. Delta preview for a known tag and time window

```powershell
$body = @{
  start_datetime = '2026-03-16T00:00:00Z'
  end_datetime = '2026-03-16T01:00:00Z'
  tags = @('PT_1001')
  retrieval_mode = 'delta'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://127.0.0.1:8010/preview' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body
```

Expected result: a preview response with `columns` and `rows`

If the ODBC provider is active, the backend logs will show messages such as `Selecting historian provider 'aveva_odbc'`, `Initialized AVEVA ODBC provider for DSN '...'`, and request-time ODBC log lines for `/tags` and `/preview`.

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

## Tag metadata

`GET /tags` returns richer metadata for each tag:

- `tag_name`
- `description`
- `io_address`
- `units`
- `source_system`

The backend treats that as the canonical `/tags` response shape. Legacy field names such as `name` and `engineering_unit` are not emitted by the API.

`source_system` is derived from `io_address` when the provider can infer it.

## Retrieval modes

- `raw`: explicit raw retrieval mode
- `delta`: explicit delta retrieval mode
- `cyclic`: separate retrieval mode that requires `cycle_seconds`

The frontend currently exposes:

- `Raw`
- `Delta`
- `1 second cyclic`

## Troubleshooting

- If the project was moved to a new folder, recreate `backend\.venv`. Python virtual environments store absolute interpreter paths and can stop working after a move.
- If `python` is not on `PATH`, use `py -3.12` in the backend commands.
- If the frontend cannot reach the backend, confirm `frontend\.env` includes `VITE_API_BASE_URL=http://127.0.0.1:8010`, or rely on the default `/api` proxy in Vite dev mode.
- If the ODBC provider is selected, make sure the DSN exists on the machine and `pyodbc` is installed in the backend environment.

## Notes

- The mock provider keeps the current prototype functional with richer tag metadata and explicit retrieval modes.
- `XLSX` export currently returns a `501 Not Implemented` placeholder.
- Future historian namespace browsing can build on the richer tag metadata model and provider abstraction without requiring a UI tree browser yet.
