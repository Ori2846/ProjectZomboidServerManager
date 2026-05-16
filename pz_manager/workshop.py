from __future__ import annotations

import html
import re
import urllib.request


WORKSHOP_URL_TEMPLATE = "https://steamcommunity.com/sharedfiles/filedetails/?id={workshop_id}"


def fetch_workshop_mod_details(workshop_id: str) -> dict[str, object]:
    clean_id = workshop_id.strip()
    if not re.fullmatch(r"\d+", clean_id):
        raise ValueError("Enter a numeric Steam Workshop ID first.")

    request = urllib.request.Request(
        WORKSHOP_URL_TEMPLATE.format(workshop_id=clean_id),
        headers={
            "User-Agent": "ProjectZomboidServerManager/1.0",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        page_text = response.read().decode("utf-8", errors="ignore")

    title = extract_workshop_title(page_text)
    mod_ids = extract_mod_ids(page_text)
    if not mod_ids:
        raise ValueError("No Mod ID values were found on the Workshop page.")

    return {
        "title": title or f"Workshop {clean_id}",
        "modIds": mod_ids,
        "workshopId": clean_id,
        "imageUrl": extract_preview_image_url(page_text),
    }


def extract_workshop_title(page_text: str) -> str:
    title_match = re.search(r'<div[^>]*class="[^"]*workshopItemTitle[^"]*"[^>]*>(.*?)</div>', page_text, flags=re.IGNORECASE | re.DOTALL)
    if title_match:
        return normalize_html_text(title_match.group(1))

    meta_match = re.search(r'<meta\s+property="og:title"\s+content="([^"]+)"', page_text, flags=re.IGNORECASE)
    if meta_match:
        return normalize_html_text(meta_match.group(1))

    document_title = re.search(r"<title>(.*?)</title>", page_text, flags=re.IGNORECASE | re.DOTALL)
    if not document_title:
        return ""
    title = normalize_html_text(document_title.group(1))
    return re.sub(r"\s+::\s+.*$", "", title).strip()


def extract_mod_ids(page_text: str) -> list[str]:
    text = normalize_html_text(re.sub(r"<br\s*/?>", "\n", page_text, flags=re.IGNORECASE))
    mod_ids = []
    seen = set()
    for match in re.finditer(r"\bMod\s+ID\s*:\s*([A-Za-z0-9_.-]+)", text, flags=re.IGNORECASE):
        mod_id = match.group(1).strip()
        if mod_id.lower() in seen:
            continue
        seen.add(mod_id.lower())
        mod_ids.append(mod_id)
    return mod_ids


def extract_preview_image_url(page_text: str) -> str:
    og_image = re.search(r'<meta\s+property="og:image"\s+content="([^"]+)"', page_text, flags=re.IGNORECASE)
    if og_image:
        return html.unescape(og_image.group(1)).strip()

    preview = re.search(r'<img[^>]+id="previewImage"[^>]+src="([^"]+)"', page_text, flags=re.IGNORECASE)
    if preview:
        return html.unescape(preview.group(1)).strip()

    image_src = re.search(r'<img[^>]+class="[^"]*workshopItemPreviewImage[^"]*"[^>]+src="([^"]+)"', page_text, flags=re.IGNORECASE)
    return html.unescape(image_src.group(1)).strip() if image_src else ""


def normalize_html_text(value: str) -> str:
    without_tags = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(without_tags)).strip()
