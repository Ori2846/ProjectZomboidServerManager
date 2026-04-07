from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


SandboxValue = bool | int | float | str | dict[str, "SandboxValue"]


@dataclass
class SandboxField:
    path: str
    label: str
    value: str
    value_type: str
    depth: int
    comments: list[str]


class SandboxParseError(ValueError):
    pass


class SandboxParser:
    def __init__(self, text: str):
        self.text = text
        self.length = len(text)
        self.index = 0
        self.comments_by_path: dict[str, list[str]] = {}
        self.pending_comments: list[str] = []

    def parse(self) -> tuple[dict[str, SandboxValue], dict[str, list[str]]]:
        self._skip_ws_and_comments()
        name = self._parse_identifier()
        if name != "SandboxVars":
            raise SandboxParseError("Expected SandboxVars root table")
        self._skip_ws_and_comments()
        self._expect("=")
        self._skip_ws_and_comments()
        value = self._parse_table("")
        self._skip_ws_and_comments()
        if self.index < self.length:
            raise SandboxParseError("Unexpected content after SandboxVars table")
        return value, self.comments_by_path

    def _parse_table(self, prefix: str) -> dict[str, SandboxValue]:
        table: dict[str, SandboxValue] = {}
        self._expect("{")
        while True:
            self._skip_ws_and_comments()
            if self._peek() == "}":
                self.index += 1
                return table
            comments = self.pending_comments
            self.pending_comments = []
            key = self._parse_identifier()
            path = f"{prefix}.{key}" if prefix else key
            if comments:
                self.comments_by_path[path] = comments
            self._skip_ws_and_comments()
            self._expect("=")
            self._skip_ws_and_comments()
            table[key] = self._parse_value(path)
            self._skip_ws_and_comments()
            if self._peek() == ",":
                self.index += 1

    def _parse_value(self, path: str) -> SandboxValue:
        char = self._peek()
        if char == "{":
            return self._parse_table(path)
        if char == '"':
            return self._parse_string()
        if self.text.startswith("true", self.index):
            self.index += 4
            return True
        if self.text.startswith("false", self.index):
            self.index += 5
            return False
        return self._parse_number()

    def _parse_identifier(self) -> str:
        self._skip_ws_and_comments()
        start = self.index
        while self.index < self.length and (self.text[self.index].isalnum() or self.text[self.index] == "_"):
            self.index += 1
        if start == self.index:
            raise SandboxParseError(f"Expected identifier at position {self.index}")
        return self.text[start:self.index]

    def _parse_string(self) -> str:
        self._expect('"')
        chars: list[str] = []
        while self.index < self.length:
            char = self.text[self.index]
            self.index += 1
            if char == "\\":
                if self.index >= self.length:
                    raise SandboxParseError("Unterminated escape sequence")
                escaped = self.text[self.index]
                self.index += 1
                escapes = {"n": "\n", "r": "\r", "t": "\t", '"': '"', "\\": "\\"}
                chars.append(escapes.get(escaped, escaped))
                continue
            if char == '"':
                return "".join(chars)
            chars.append(char)
        raise SandboxParseError("Unterminated string")

    def _parse_number(self) -> int | float:
        start = self.index
        if self._peek() == "-":
            self.index += 1
        while self.index < self.length and self.text[self.index].isdigit():
            self.index += 1
        if self._peek() == ".":
            self.index += 1
            while self.index < self.length and self.text[self.index].isdigit():
                self.index += 1
        token = self.text[start:self.index]
        if not token or token == "-":
            raise SandboxParseError(f"Expected number at position {start}")
        return float(token) if "." in token else int(token)

    def _skip_ws_and_comments(self) -> None:
        while self.index < self.length:
            if self.text[self.index].isspace():
                self.index += 1
                continue
            if self.text.startswith("--", self.index):
                start = self.index
                while self.index < self.length and self.text[self.index] != "\n":
                    self.index += 1
                self.pending_comments.append(self.text[start:self.index])
                continue
            break

    def _expect(self, token: str) -> None:
        if self._peek() != token:
            raise SandboxParseError(f"Expected '{token}' at position {self.index}")
        self.index += 1

    def _peek(self) -> str:
        if self.index >= self.length:
            return ""
        return self.text[self.index]


def parse_sandbox_vars(text: str) -> dict[str, SandboxValue]:
    data, _comments = SandboxParser(text).parse()
    return data


def parse_sandbox_document(text: str) -> tuple[dict[str, SandboxValue], dict[str, list[str]]]:
    return SandboxParser(text).parse()


def load_sandbox_vars(path: Path) -> dict[str, SandboxValue]:
    if not path.exists():
        return {}
    return parse_sandbox_vars(path.read_text(encoding="utf-8"))


def load_sandbox_document(path: Path) -> tuple[dict[str, SandboxValue], dict[str, list[str]]]:
    if not path.exists():
        return {}, {}
    return parse_sandbox_document(path.read_text(encoding="utf-8"))


def save_sandbox_vars(path: Path, data: dict[str, SandboxValue]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(serialize_sandbox_vars(data), encoding="utf-8")


def serialize_sandbox_vars(data: dict[str, SandboxValue]) -> str:
    lines = ["SandboxVars = {"] + _serialize_table(data, 1) + ["}"]
    return "\n".join(lines) + "\n"


def _serialize_table(data: dict[str, SandboxValue], depth: int) -> list[str]:
    indent = "    " * depth
    lines: list[str] = []
    for key, value in data.items():
        if isinstance(value, dict):
            lines.append(f"{indent}{key} = {{")
            lines.extend(_serialize_table(value, depth + 1))
            lines.append(f"{indent}}},")
            continue
        lines.append(f"{indent}{key} = {_serialize_value(value)},")
    return lines


def _serialize_value(value: SandboxValue) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        escaped = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        return f'"{escaped}"'
    return str(value)


def flatten_sandbox_fields(data: dict[str, SandboxValue], comments_by_path: dict[str, list[str]] | None = None) -> list[SandboxField]:
    fields: list[SandboxField] = []
    _flatten("", data, 0, fields, comments_by_path or {})
    return fields


def _flatten(
    prefix: str,
    data: dict[str, SandboxValue],
    depth: int,
    fields: list[SandboxField],
    comments_by_path: dict[str, list[str]],
) -> None:
    for key, value in data.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            fields.append(
                SandboxField(
                    path=path,
                    label=key,
                    value="",
                    value_type="section",
                    depth=depth,
                    comments=comments_by_path.get(path, []),
                )
            )
            _flatten(path, value, depth + 1, fields, comments_by_path)
            continue
        if isinstance(value, bool):
            value_type = "bool"
            string_value = "true" if value else "false"
        elif isinstance(value, int):
            value_type = "int"
            string_value = str(value)
        elif isinstance(value, float):
            value_type = "float"
            string_value = str(value)
        else:
            value_type = "str"
            string_value = value
        fields.append(
            SandboxField(
                path=path,
                label=key,
                value=string_value,
                value_type=value_type,
                depth=depth,
                comments=comments_by_path.get(path, []),
            )
        )


def coerce_sandbox_value(raw: str, value_type: str) -> SandboxValue:
    if value_type == "bool":
        return raw.lower() == "true"
    if value_type == "int":
        return int(raw)
    if value_type == "float":
        return float(raw)
    return raw


def update_sandbox_value(data: dict[str, SandboxValue], dotted_path: str, value: SandboxValue) -> None:
    parts = dotted_path.split(".")
    current: dict[str, SandboxValue] = data
    for part in parts[:-1]:
        next_value = current.get(part)
        if not isinstance(next_value, dict):
            next_value = {}
            current[part] = next_value
        current = next_value
    current[parts[-1]] = value
