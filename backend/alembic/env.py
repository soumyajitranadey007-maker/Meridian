from logging.config import fileConfig
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from alembic import context
from sqlalchemy import engine_from_config, pool
from app.config import get_settings
from app.models import Base

config = context.config
database_url = get_settings().database_url
if not database_url:
    raise RuntimeError("DATABASE_URL is required to run migrations.")
# The application uses asyncpg, while Alembic runs migrations through the
# synchronous psycopg driver. Convert the URL and its SSL option explicitly.
sync_url = database_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
parsed = urlsplit(sync_url)
query = dict(parse_qsl(parsed.query, keep_blank_values=True))
if "ssl" in query:
    query["sslmode"] = query.pop("ssl")
config.set_main_option("sqlalchemy.url", urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment)))
if config.config_file_name:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=config.get_main_option("sqlalchemy.url"), target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(config.get_section(config.config_ini_section, {}), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
