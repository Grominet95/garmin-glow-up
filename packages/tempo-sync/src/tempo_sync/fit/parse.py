from __future__ import annotations

from dataclasses import dataclass, field

from fitparse import FitFile


@dataclass
class ParsedFit:
    records: list[dict] = field(default_factory=list)
    laps: list[dict] = field(default_factory=list)
    events: list[dict] = field(default_factory=list)
    sessions: list[dict] = field(default_factory=list)


def parse(blob: bytes) -> ParsedFit:
    fit = FitFile(blob)
    result = ParsedFit()
    for msg in fit.get_messages():
        row = {f.name: f.value for f in msg.fields}
        if msg.name == "record":
            result.records.append(row)
        elif msg.name == "lap":
            result.laps.append(row)
        elif msg.name == "event":
            result.events.append(row)
        elif msg.name == "session":
            result.sessions.append(row)
    return result
