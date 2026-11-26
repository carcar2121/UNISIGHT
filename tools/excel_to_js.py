"""
Regenerates js/data.js (the offline copy of the database) from database/Dea_Database.xlsx.

Usage (from the project folder):
    pip install openpyxl
    python3 tools/excel_to_js.py

The published page reads the Excel file directly; js/data.js is only used when
index.html is opened by double-click (file://), where browsers block reading the Excel.
"""
import json
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "database" / "Dea_Database.xlsx"
OUT = ROOT / "js" / "data.js"

wb = load_workbook(XLSX, data_only=True)
data = {}
for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        continue
    headers = [str(h) if h is not None else "" for h in rows[0]]
    items = []
    for r in rows[1:]:
        if all(v is None for v in r):
            continue
        items.append({h: ("" if v is None else v) for h, v in zip(headers, r) if h})
    data[ws.title] = items

OUT.write_text(
    "// AUTO-GENERATED from database/Dea_Database.xlsx by tools/excel_to_js.py. Do not edit by hand.\n"
    "window.DEA_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n",
    encoding="utf-8",
)
print(f"Wrote {OUT.relative_to(ROOT)} ({', '.join(f'{k}: {len(v)}' for k, v in data.items())})")
