"""Detect the YouTube broadcast and reconcile the public Firebase live flag.

YouTube is authoritative: every successful poll corrects stale Firebase state.
An inconclusive YouTube result fails without changing the published status.
"""
import json
import os
import sys
import urllib.request
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
        "extract_flat": True,  # Resolve /live without opening the video watch page
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
    # /live only returns a video reference while the channel is broadcasting.
    # The flat result avoids the YouTube watch-page bot challenge that blocks
    # GitHub-hosted runners from obtaining video details.
    if info.get("_type") == "url" and info.get("ie_key") in ("Youtube", "youtube"):
        video_id = info.get("id")
        if isinstance(video_id, str) and len(video_id) == 11:
            return True, video_id
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
    print("YouTube detection: " + ("LIVE " + video_id if live else "offline"))
    firebase_admin.initialize_app(credentials.Certificate(account), {"databaseURL": DATABASE_URL})
    # Every successful check publishes a fresh timestamp and the stream ID.
    # Visitors can now tell the difference between LIVE and stale detection.
    checked_at_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    db.reference("settings/liveDetection").set({
        "live": live,
        "videoId": video_id or "",
        "checkedAt": checked_at_ms,
    })
    print("Published live detection heartbeat at " + str(checked_at_ms))
    # Verify an ordinary visitor can read the new status without an admin key.
    # A successful admin write is not proof that Firebase rules allow public read.
    try:
        with urllib.request.urlopen(DATABASE_URL + "/settings/liveDetection.json", timeout=8) as response:
            public_status = json.load(response)
        if not isinstance(public_status, dict) or public_status.get("checkedAt") != checked_at_ms:
            raise ValueError("public status did not match the last successful check")
        print("Anonymous Firebase liveDetection read: OK")
    except Exception as error:
        print("WARNING: Anonymous visitors may not be able to read liveDetection: "
              + str(error), file=sys.stderr)
    live_setting = db.reference("settings/live")
    current = live_setting.get()
    # Read the actual published state, not only the workflow's saved history.
    # This fixes stale LIVE badges if the previously manual switch was left on.
    if current is not live:
        live_setting.set(live)
        print("Corrected Firebase settings/live from " + repr(current) + " to " + repr(live))
    else:
        print("Firebase settings/live already agrees with YouTube.")

    changed = live != old["live"] or (live and video_id != old["video_id"])
    if changed:
        STATE_FILE.write_text(json.dumps({
            "live": live,
            "video_id": video_id,
            "last_transition": datetime.now(timezone.utc).isoformat(),
        }, indent=2) + "\n", encoding="utf-8")
        print("Recorded YouTube broadcast transition.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Auto live detection failed safely: " + str(error), file=sys.stderr)
        sys.exit(1)
