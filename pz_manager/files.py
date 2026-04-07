from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from pathlib import Path

from .config import ADVANCED_FILES, DEFAULT_SAVES_DIR


@dataclass
class IniField:
    key: str
    value: str
    value_type: str
    comments: list[str]


@dataclass
class IniDocument:
    fields: list[IniField]
    trailing_comments: list[str]


def normalize_server_dir(candidate: str) -> Path:
    expanded = os.path.expandvars(candidate.strip())
    return Path(expanded).expanduser()


def ini_path(server_dir: Path, server_name: str) -> Path:
    return server_dir / f"{server_name}.ini"


def advanced_path(server_dir: Path, server_name: str, pattern: str) -> Path:
    return server_dir / pattern.format(server=server_name)


def read_text_file(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def parse_ini_file(path: Path) -> IniDocument:
    fields: list[IniField] = []
    trailing_comments: list[str] = []
    if not path.exists():
        return IniDocument(fields=fields, trailing_comments=trailing_comments)

    pending_comments: list[str] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith(";"):
            pending_comments.append(raw_line)
            continue
        if "=" not in raw_line:
            pending_comments.append(raw_line)
            continue
        key, value = raw_line.split("=", 1)
        clean_key = key.strip()
        clean_value = value.strip()
        fields.append(
            IniField(
                key=clean_key,
                value=clean_value,
                value_type=infer_ini_type(clean_value),
                comments=pending_comments,
            )
        )
        pending_comments = []
    trailing_comments = pending_comments
    return IniDocument(fields=fields, trailing_comments=trailing_comments)


def infer_ini_type(value: str) -> str:
    lower = value.lower()
    if lower in {"true", "false"}:
        return "bool"
    try:
        int(value)
        return "int"
    except ValueError:
        pass
    try:
        float(value)
        return "float"
    except ValueError:
        pass
    return "str"


def parse_ini_lookup(path: Path) -> dict[str, IniField]:
    return {field.key: field for field in parse_ini_file(path).fields}


def write_ini_file(path: Path, document: IniDocument) -> None:
    lines = []
    for field in document.fields:
        if field.comments:
            lines.extend(field.comments)
        lines.append(f"{field.key}={field.value}")

    if document.trailing_comments:
        if lines and document.trailing_comments[0].strip():
            lines.append("")
        lines.extend(document.trailing_comments)

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def load_advanced_contents(server_dir: Path, server_name: str) -> dict[str, str]:
    return {
        label: read_text_file(advanced_path(server_dir, server_name, pattern))
        for label, pattern in ADVANCED_FILES
    }


def reset_saves_directory(saves_dir: Path = DEFAULT_SAVES_DIR) -> tuple[bool, str]:
    if not saves_dir.exists():
        return False, f"Saves folder not found: {saves_dir}"

    deleted = 0
    for child in saves_dir.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()
        deleted += 1

    return True, f"Deleted {deleted} item(s) from {saves_dir}"
