import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.routes import export, health, tags
from app.core.config import get_settings

settings = get_settings()

logging.basicConfig(level=logging.INFO)
logging.getLogger("app").setLevel(logging.INFO)

app = FastAPI(
    title="Historian Export Portal API",
    version="0.1.0",
    description="Prototype API for previewing and exporting historian data.",
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(tags.router)
app.include_router(export.router)
