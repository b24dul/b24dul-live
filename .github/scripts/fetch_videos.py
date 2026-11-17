"""Pull the channel's latest videos from its public YouTube feed into videos.json."""
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET

CHANNEL = "UCnXAfqk5I7QE3frLhHHyImQ"
FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL}"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}


def parse(xml_bytes):
    root = ET.fromstring(xml_bytes)
    out = []
    for e in root.findall("a:entry", NS):
        vid = e.findtext("yt:videoId", default="", namespaces=NS)
        if not vid:
            continue
        out.append({
            "id": vid,
            "title": e.findtext("a:title", default="", namespaces=NS),
            "published": e.findtext("a:published", default="", namespaces=NS),
        })
    return out


def main(path="videos.json"):
    req = urllib.request.Request(FEED, headers={"User-Agent": "b24dul-live-site"})
    with urllib.request.urlopen(req, timeout=30) as r:
        videos = parse(r.read())
    if not videos:
        # The feed sometimes comes back empty for a while. Keep the current list
        # instead of wiping the Videos page.
        print("Feed returned no videos, keeping the existing list")
        return
    with open(path, "w", encoding="utf-8") as f:
        json.dump(videos, f, ensure_ascii=False, indent=1)
    print(f"Saved {len(videos)} videos")


if __name__ == "__main__":
    main(*sys.argv[1:])
