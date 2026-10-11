"""Server-side scheduler for periodic 3-hour job synchronization.
Runs as a background asyncio task managed by the FastAPI lifespan.
Guarantees reliable unattended synchronization, error isolation, and audit logging.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from backend.jobs_collector import sync_all_sources
from backend.jobs_db import get_sync_status

logger = logging.getLogger("jntuh_jobs_scheduler")

SYNC_INTERVAL_SECONDS = 3 * 60 * 60  # 3 hours (10,800 seconds)
MANUAL_SYNC_COOLDOWN_SECONDS = 60    # Rate limiting for manual trigger

_SCHEDULER_TASK: Optional[asyncio.Task] = None
_LAST_SYNC_TIMESTAMP: float = 0
_IS_SYNCING: bool = False


async def jobs_scheduler_worker():
    """Background async worker that runs every 3 hours."""
    global _LAST_SYNC_TIMESTAMP, _IS_SYNCING
    logger.info("Jobs background scheduler started. Interval: 3 hours.")

    # Run initial sync on server startup in non-blocking executor
    loop = asyncio.get_running_loop()
    try:
        _IS_SYNCING = True
        logger.info("Running initial jobs synchronization on startup...")
        await loop.run_in_executor(None, sync_all_sources)
        _LAST_SYNC_TIMESTAMP = time.time()
        logger.info("Initial jobs synchronization completed successfully.")
    except Exception as e:
        logger.error(f"Error during initial jobs synchronization: {e}")
    finally:
        _IS_SYNCING = False

    while True:
        try:
            await asyncio.sleep(SYNC_INTERVAL_SECONDS)
            _IS_SYNCING = True
            logger.info("Executing scheduled 3-hour job synchronization cycle...")
            await loop.run_in_executor(None, sync_all_sources)
            _LAST_SYNC_TIMESTAMP = time.time()
            logger.info("Scheduled 3-hour job synchronization completed successfully.")
        except asyncio.CancelledError:
            logger.info("Jobs background scheduler cancelled (server shutting down).")
            break
        except Exception as e:
            logger.error(f"Error in scheduled jobs synchronization: {e}")
        finally:
            _IS_SYNCING = False


def start_jobs_scheduler() -> asyncio.Task:
    """Start the background scheduler task. Called during FastAPI lifespan startup."""
    global _SCHEDULER_TASK
    if _SCHEDULER_TASK is None or _SCHEDULER_TASK.done():
        _SCHEDULER_TASK = asyncio.create_task(jobs_scheduler_worker())
    return _SCHEDULER_TASK


def stop_jobs_scheduler():
    """Cancel the background scheduler task. Called during FastAPI lifespan shutdown."""
    global _SCHEDULER_TASK
    if _SCHEDULER_TASK and not _SCHEDULER_TASK.done():
        _SCHEDULER_TASK.cancel()
        logger.info("Jobs background scheduler task stopped.")


async def trigger_manual_sync() -> Dict[str, Any]:
    """Trigger an immediate synchronization cycle with rate-limiting cooldown."""
    global _LAST_SYNC_TIMESTAMP, _IS_SYNCING
    now = time.time()

    if _IS_SYNCING:
        return {"status": "in_progress", "message": "Synchronization is currently underway."}

    time_since_last = now - _LAST_SYNC_TIMESTAMP
    if _LAST_SYNC_TIMESTAMP > 0 and time_since_last < MANUAL_SYNC_COOLDOWN_SECONDS:
        remaining = int(MANUAL_SYNC_COOLDOWN_SECONDS - time_since_last)
        return {
            "status": "rate_limited",
            "message": f"Cooldown active. Please wait {remaining} seconds before syncing again."
        }

    loop = asyncio.get_running_loop()
    _IS_SYNCING = True
    try:
        res = await loop.run_in_executor(None, sync_all_sources)
        _LAST_SYNC_TIMESTAMP = time.time()
        return {"status": "success", "result": res}
    except Exception as e:
        logger.error(f"Manual sync failed: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        _IS_SYNCING = False


def get_scheduler_status() -> Dict[str, Any]:
    """Get metadata about scheduler health, next scheduled run, and active jobs."""
    now = time.time()
    db_status = get_sync_status()

    next_sync_seconds = max(0, int(SYNC_INTERVAL_SECONDS - (now - _LAST_SYNC_TIMESTAMP))) if _LAST_SYNC_TIMESTAMP > 0 else SYNC_INTERVAL_SECONDS
    next_sync_dt = (datetime.now(timezone.utc) + timedelta(seconds=next_sync_seconds)).isoformat()

    return {
        **db_status,
        "is_syncing": _IS_SYNCING,
        "scheduler_active": _SCHEDULER_TASK is not None and not _SCHEDULER_TASK.done(),
        "next_sync_in_seconds": next_sync_seconds,
        "next_scheduled_sync": next_sync_dt,
    }
