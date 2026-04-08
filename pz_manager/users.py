from __future__ import annotations

import sqlite3
from pathlib import Path

from .config import DEFAULT_DB_DIR


def server_db_path(server_name: str, db_dir: Path = DEFAULT_DB_DIR) -> Path:
    return db_dir / f"{server_name}.db"


def load_user_directory(server_name: str) -> dict[str, object]:
    db_path = server_db_path(server_name)
    if not db_path.exists():
        return {
            "dbPath": str(db_path),
            "available": False,
            "roles": [],
            "users": [],
        }

    with sqlite3.connect(db_path) as connection:
        role_rows = connection.execute(
            "SELECT id, name, description FROM role ORDER BY position ASC, id ASC"
        ).fetchall()
        user_rows = connection.execute(
            """
            SELECT username, displayName, steamid, ownerid, lastConnection, role
            FROM whitelist
            ORDER BY LOWER(COALESCE(displayName, username)) ASC
            """
        ).fetchall()

    roles = [
        {
            "id": role_id,
            "name": name,
            "description": description or "",
        }
        for role_id, name, description in role_rows
    ]
    role_lookup = {role["id"]: role["name"] for role in roles}

    users = []
    for username, display_name, steam_id, owner_id, last_connection, role_id in user_rows:
        users.append(
            {
                "username": username or "",
                "displayName": display_name or "",
                "steamId": steam_id or "",
                "ownerId": owner_id or "",
                "lastConnection": last_connection or "",
                "roleId": role_id,
                "accessLevel": role_lookup.get(role_id, "unknown"),
            }
        )

    return {
        "dbPath": str(db_path),
        "available": True,
        "roles": roles,
        "users": users,
    }


def set_user_access_level(server_name: str, username: str, access_level: str) -> tuple[bool, str]:
    db_path = server_db_path(server_name)
    if not db_path.exists():
        return False, f"Server database not found: {db_path}"

    trimmed_username = username.strip()
    normalized_level = access_level.strip().lower()
    if not trimmed_username:
        return False, "Choose a user first."
    if not normalized_level:
        return False, "Choose an access level first."
    if normalized_level == "none":
        normalized_level = "user"

    with sqlite3.connect(db_path) as connection:
        role_row = connection.execute(
            "SELECT id FROM role WHERE LOWER(name) = ?",
            (normalized_level,),
        ).fetchone()
        if role_row is None:
            return False, f"Unknown access level: {access_level}"

        result = connection.execute(
            "UPDATE whitelist SET role = ? WHERE LOWER(username) = ?",
            (role_row[0], trimmed_username.lower()),
        )
        connection.commit()

    if result.rowcount == 0:
        return False, f"User not found in whitelist: {trimmed_username}"
    return True, f"Updated {trimmed_username} to {normalized_level} in {db_path.name}"
