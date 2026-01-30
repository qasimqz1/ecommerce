import sqlite3
from db2 import get_db

ACTIVE_STATUSES = ("Waiting", "In Chair")
INACTIVE_STATUSES = ("Done", "No-show", "Cancelled")

ALL_STATUSES = ACTIVE_STATUSES + INACTIVE_STATUSES

ALLOWED_TRANSITIONS = {
    "Waiting": {"In Chair", "No-show", "Cancelled"},
    "In Chair": {"Done", "No-show", "Cancelled"},
}


def get_customer_status(public_ref):
    db = None
    try:
        db = get_db()
        cur = db.cursor()

        cur.execute("""
            SELECT id, status, service_id, created_at
            FROM QueueEntry
            WHERE public_ref = ?
        """, (public_ref,))
        customer = cur.fetchone()

        if not customer:
            return {"error": "Customer not found"}

        customer_status = customer["status"]
        customer_id = customer["id"]

        cur.execute("""
            SELECT q.id, q.service_id, q.created_at, 
                   COALESCE(s.duration_mins, 0) as duration_mins
            FROM QueueEntry q
            LEFT JOIN Service s ON q.service_id = s.id
            WHERE q.status IN (?, ?)
            ORDER BY q.created_at ASC
        """, ACTIVE_STATUSES)

        active_queue = cur.fetchall()

        position = None
        eta_minutes = 0

        for index, entry in enumerate(active_queue):
            if entry["id"] == customer_id:
                position = index + 1
                break

        if position is not None:
            for entry in active_queue[:position - 1]:
                duration = entry["duration_mins"]
                if duration is None:
                    duration = 0
                eta_minutes += duration

        return {
            "status": customer_status,
            "position": position,
            "etaMinutes": eta_minutes
        }
    
    except sqlite3.Error as e:
        print(f"Database error in get_customer_status: {e}")
        return {"error": "Database error occurred"}
    
    except Exception as e:
        print(f"Unexpected error in get_customer_status: {e}")
        return {"error": "An unexpected error occurred"}
    
    finally:
        if db:
            db.close()


def update_customer_status(public_ref, new_status):
    if not public_ref:
        return {"error": "Missing public_ref"}

    if not new_status:
        return {"error": "Missing status"}

    if new_status not in ALL_STATUSES:
        return {"error": "Invalid status"}

    db = None
    try:
        db = get_db()
        cur = db.cursor()

        cur.execute(
            """
            SELECT id, status
            FROM QueueEntry
            WHERE public_ref = ?
            """,
            (public_ref,),
        )
        row = cur.fetchone()

        if not row:
            return {"error": "Customer not found"}

        entry_id = row["id"]
        old_status = row["status"]

        if old_status == new_status:
            return {"public_ref": public_ref, "oldStatus": old_status, "newStatus": new_status}

        allowed = ALLOWED_TRANSITIONS.get(old_status, set())
        if new_status not in allowed:
            return {"error": "Transition not allowed"}

        cur.execute(
            """
            UPDATE QueueEntry
            SET status = ?
            WHERE id = ?
            """,
            (new_status, entry_id),
        )
        db.commit()

        return {"public_ref": public_ref, "oldStatus": old_status, "newStatus": new_status}

    except sqlite3.Error as e:
        print(f"Database error in update_customer_status: {e}")
        return {"error": "Database error occurred"}

    except Exception as e:
        print(f"Unexpected error in update_customer_status: {e}")
        return {"error": "An unexpected error occurred"}

    finally:
        if db:
            db.close()
