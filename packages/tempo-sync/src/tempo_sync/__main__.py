from __future__ import annotations

import typer
import uvicorn

app = typer.Typer(help="tempo-sync — Garmin sync service")
auth_app = typer.Typer(help="Auth commands")
db_app = typer.Typer(help="DB commands")
app.add_typer(auth_app, name="auth")
app.add_typer(db_app, name="db")


@app.command()
def serve(
    host: str = "127.0.0.1",
    port: int = 8765,
    reload: bool = False,
):
    """Run the HTTP API (foreground)."""
    from tempo_sync.api.app import create_app
    api_app, token = create_app()
    print(f"TEMPO-READY token={token} port={port}", flush=True)
    uvicorn.run(api_app, host=host, port=port, reload=reload)


@app.command()
def sync(
    since: str = "30d",
    force: bool = False,
):
    """Run one sync now."""
    from tempo_sync.sync.orchestrator import sync_all
    typer.echo(f"Syncing last {since}…")
    sync_all(force=force)
    typer.echo("Done.")


@auth_app.command("login")
def auth_login(
    email: str = typer.Option(..., prompt=True),
    password: str = typer.Option(..., prompt=True, hide_input=True),
):
    """Interactive Garmin SSO login."""
    from tempo_sync.auth.login import login
    from tempo_sync.auth.mfa import stdin_mfa
    try:
        login(email=email, password=password, mfa_callback=stdin_mfa)
        typer.echo("Login successful. Tokens stored in keychain.")
    except Exception as e:
        typer.echo(f"Login failed: {e}", err=True)
        raise typer.Exit(1)


@auth_app.command("status")
def auth_status():
    """Show token status."""
    from tempo_sync.auth.tokens import TokenStore
    store = TokenStore()
    tokens = store.load()
    if tokens:
        typer.echo("Authenticated (tokens present in keychain).")
    else:
        typer.echo("Not authenticated. Run `tempo-sync auth login`.")


@auth_app.command("logout")
def auth_logout():
    """Delete tokens from keychain."""
    from tempo_sync.auth.tokens import TokenStore
    TokenStore().clear()
    typer.echo("Logged out.")


@app.command("backfill-training")
def backfill_training():
    """Fetch EPOC, recovery, and IF from Garmin API for existing activities that lack them."""
    from tempo_sync.auth.tokens import TokenStore
    from tempo_sync.db.models import Activity
    from tempo_sync.db.session import get_db
    from tempo_sync.garmin.client import GarminClient
    from tempo_sync.sync.activities import backfill_training_fields

    store = TokenStore()
    client = GarminClient(store)
    if not client.resume():
        typer.echo("Not authenticated. Run `tempo-sync auth login` first.", err=True)
        raise typer.Exit(1)

    db = get_db()
    try:
        total = (
            db.query(Activity)
            .filter((Activity.epoc == None) | (Activity.recovery_time_h == None))  # noqa: E711
            .count()
        )
        typer.echo(f"Backfilling training fields for {total} activities…")
        updated, failed = backfill_training_fields(client=client, db=db)
        db.commit()
        typer.echo(f"Done — updated {updated}, failed {failed}.")
    except Exception as e:
        db.rollback()
        typer.echo(f"Error: {e}", err=True)
        raise typer.Exit(1)
    finally:
        db.close()


@db_app.command("inspect")
def db_inspect():
    """Print row counts per table."""
    from sqlalchemy import text

    from tempo_sync.db.session import get_engine
    engine = get_engine()
    tables = [
        "athlete", "activities", "activity_streams", "activity_laps",
        "activity_zones", "daily_metrics", "daily_load", "sleep_stages",
        "personal_records", "course_bests", "badges", "vo2max_history",
        "race_predictions", "sync_runs",
    ]
    with engine.connect() as conn:
        for t in tables:
            try:
                count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                typer.echo(f"  {t:30s} {count:>8}")
            except Exception:
                typer.echo(f"  {t:30s}       ?")


@db_app.command("reset")
def db_reset(confirm: bool = typer.Option(False, "--confirm", prompt="Drop and recreate the database?")):
    """Drop & recreate the database."""
    if not confirm:
        typer.echo("Aborted.")
        return
    from tempo_sync.db.models import Base
    from tempo_sync.db.session import get_engine
    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    typer.echo("Database reset.")


if __name__ == "__main__":
    app()
