from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

pub = "Mon, 27 Jan 2025 14:26:00 -0500"
try:
    dt = parsedate_to_datetime(pub).isoformat()
    print("SUCCESS", dt)
except Exception as e:
    print("ERROR", e)
