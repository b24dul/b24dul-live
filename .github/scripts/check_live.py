"""Detect B24DUL's public YouTube broadcast and sync transitions to Firebase.

This never re-applies the same live state every poll. That is intentional:
the administrator can switch the website off manually during an ongoing
broadcast, and the next *new broadcast* will automatically switch it on again.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, db
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError, ExtractorError

CHANNEL_URL = "https://www.youtube.com/channel/UCnXAfqk5I7QE3frLhHHyImQ/live"
DATABASE_URL = "https://b24duls-anonymous-chat-default-rtdb.europe-west1.firebasedatabase.app"
STATE_FILE = Path("live-monitor-state.json")


def detect_live():
    """Return (bool, video id) or raise when YouTube's result is inconclusive."""
    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "socket_timeout": 20,
        "extractor_retries": 2,
        "retries": 2,
    }
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(CHANNEL_URL, download=False)
    except (DownloadError, ExtractorError) as error:
        reason = str(error).lower()
        # yt-dlp wraps expected ExtractorError instances in DownloadError.
        # Only this exact channel-offline condition is a confirmed offline
        # result; all other YouTube failures must preserve Firebase status.
        if "the channel is not currently live" in reason:
            return False, None
        raise RuntimeError("Could not reliably check YouTube: " + str(error)) from error
    if not isinstance(info, dict) or info.get("_type") == "playlist":
        raise RuntimeError("YouTube returned an unexpected channel response; existing status retained.")
    status = info.get("live_status")
    video_id = info.get("id")
    if status == "is_live" and isinstance(video_id, str) and len(video_id) == 11:
        return True, video_id
    if status in ("not_live", "was_live", "post_live", "is_upcoming"):
        return False, None
    raise RuntimeError("YouTube live status is unknown; existing status retained.")


def main():
    secret = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if not secret:
        raise RuntimeError(
            "Missing GitHub Actions secret FIREBASE_SERVICE_ACCOUNT_JSON. "
            "See docs/AUTO-LIVE-DETECTION.md."
        )
    account = json.loads(secret)
    if not isinstance(account, dict) or not account.get("private_key") or not account.get("client_email"):
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is not a valid service-account JSON.")
    old = {"live": False, "video_id": None}
    if STATE_FILE.exists():
        old.update(json.loads(STATE_FILE.read_text(encoding="utf-8")))

    live, video_id = detect_live()
    # No write on repeated checks. Manual admin changes therefore stay in
    # effect for the rest of this broadcast, until the next stream transition.
    changed = live != old["live"] or (live and video_id != old["video_id"])
    print("YouTube detection: " + ("LIVE " + video_id if live else "offline"))
    if not changed:
        print("No new broadcast transition; existing Firebase value left untouched.")
        return

    firebase_admin.initialize_app(credentials.Certificate(account), {"databaseURL": DATABASE_URL})
    live_setting = db.reference("settings/live")
    live_setting.set(live)
    print("Firebase settings/live set to " + str(live).lower())
    STATE_FILE.write_text(json.dumps({
        "live": live,
        "video_id": video_id,
        "last_transition": datetime.now(timezone.utc).isoformat(),
    }, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Auto live detection failed safely: " + str(error), file=sys.stderr)
        sys.exit(1)
