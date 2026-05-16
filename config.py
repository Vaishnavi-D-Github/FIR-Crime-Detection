import os
from pathlib import Path

from sqlalchemy.engine.url import make_url


def resolve_database_uri(raw_uri, base_dir):
    """Always use an absolute SQLite path so the app and DB tools see the same file."""
    default_db = Path(base_dir) / "fir_crime.db"

    if not raw_uri:
        return f"sqlite:///{default_db.as_posix()}"

    try:
        url = make_url(raw_uri)
    except Exception:
        return raw_uri

    if url.drivername != "sqlite" or not url.database:
        return raw_uri

    db_path = Path(url.database)
    if not db_path.is_absolute():
        db_path = Path(base_dir) / db_path

    return f"sqlite:///{db_path.resolve().as_posix()}"


class Config:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "fir-crime-detection-secret-key"
    )

    SQLALCHEMY_DATABASE_URI = resolve_database_uri(
        os.environ.get("DATABASE_URL"),
        BASE_DIR,
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    MAX_CONTENT_LENGTH = 5 * 1024 * 1024

    PASSWORD_RESET_MAX_AGE = int(os.environ.get("PASSWORD_RESET_MAX_AGE", 3600))
