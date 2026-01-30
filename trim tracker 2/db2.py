import os
import sqlite3

# queue.db next to db2.py, or in services2/templates, or project root
_ROOT = os.path.dirname(os.path.abspath(__file__))
_db_candidates = [
    os.path.join(_ROOT, "queue.db"),
    os.path.join(_ROOT, "services2", "templates", "queue.db"),
]
DB_PATH = next((p for p in _db_candidates if os.path.isfile(p)), os.path.join(_ROOT, "queue.db"))

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
