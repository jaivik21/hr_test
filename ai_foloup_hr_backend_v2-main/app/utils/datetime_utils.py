"""
Utility functions for datetime conversion and formatting.
Converts UTC timestamps to IST (Indian Standard Time, UTC+5:30) for API responses.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Union

IST_OFFSET = timedelta(hours=5, minutes=30)
IST_TIMEZONE = timezone(IST_OFFSET)

def convert_utc_to_ist(utc_dt: Optional[Union[datetime, str]]) -> Optional[datetime]:
    if not utc_dt:
        return None
    
    if isinstance(utc_dt, str):
        try:
            utc_dt = datetime.fromisoformat(utc_dt.replace('Z', '+00:00'))
        except ValueError:
            try:
                utc_dt = datetime.fromisoformat(utc_dt)
            except ValueError:
                return None
    
    if not isinstance(utc_dt, datetime):
        return None
    
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    else:
        utc_dt = utc_dt.astimezone(timezone.utc)
    
    ist_dt = utc_dt + IST_OFFSET
    return ist_dt.replace(tzinfo=IST_TIMEZONE)

def normalize_to_ist(dt: Optional[datetime]) -> Optional[datetime]:
    if not dt:
        return None
    
    if not isinstance(dt, datetime):
        return None
    
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    
    ist_dt = dt + IST_OFFSET
    return ist_dt.replace(tzinfo=IST_TIMEZONE)

def format_datetime_ist_iso(utc_dt: Optional[Union[datetime, str]]) -> Optional[str]:
    ist_dt = convert_utc_to_ist(utc_dt)
    if not ist_dt:
        return None
    return ist_dt.isoformat()

def format_datetime_ist_display(utc_dt: Optional[Union[datetime, str]]) -> Optional[str]:
    ist_dt = convert_utc_to_ist(utc_dt)
    if not ist_dt:
        return None
    
    # Format: "DD MMM YY HH:MM AM/PM"
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    day = ist_dt.day
    month = month_names[ist_dt.month - 1]
    year = str(ist_dt.year)[-2:]  # Last 2 digits of year
    
    # Format time: HH:MM AM/PM
    hour = ist_dt.hour
    minute = ist_dt.minute
    am_pm = "AM" if hour < 12 else "PM"
    if hour == 0:
        hour = 12
    elif hour > 12:
        hour = hour - 12
    
    return f"{day:02d} {month} {year} {hour:02d}:{minute:02d} {am_pm}"

