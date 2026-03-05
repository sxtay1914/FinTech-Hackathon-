"""Fetch macro news from Google News RSS feeds."""
import ssl
import certifi
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from urllib.request import urlopen, Request

_ssl_ctx = ssl.create_default_context(cafile=certifi.where())


@dataclass
class NewsArticle:
    title: str
    source: str
    date: str
    link: str


QUERIES = [
    "macro economy",
    "central bank interest rate",
    "GDP growth recession",
    "inflation CPI",
    "geopolitical trade tensions",
    "emerging markets currency",
    "federal reserve ECB BOJ",
    "oil energy prices OPEC",
    "sovereign debt fiscal policy",
]

BASE_URL = "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"


def fetch_news(max_per_query: int = 5, max_total: int = 25) -> list[NewsArticle]:
    seen_titles: set[str] = set()
    articles: list[NewsArticle] = []

    for query in QUERIES:
        if len(articles) >= max_total:
            break

        url = BASE_URL.format(query=query.replace(" ", "+"))
        try:
            req = Request(url, headers={"User-Agent": "Meridian/1.0"})
            with urlopen(req, timeout=10, context=_ssl_ctx) as resp:
                xml_data = resp.read()

            root = ET.fromstring(xml_data)
            items = root.findall(".//item")

            for item in items[:max_per_query]:
                if len(articles) >= max_total:
                    break

                title = item.findtext("title", "").strip()
                # Google News appends " - Source" to titles
                if " - " in title:
                    parts = title.rsplit(" - ", 1)
                    clean_title = parts[0].strip()
                    source = parts[1].strip()
                else:
                    clean_title = title
                    source = "Google News"

                # Deduplicate
                if clean_title in seen_titles:
                    continue
                seen_titles.add(clean_title)

                pub_date = item.findtext("pubDate", "")
                # Parse "Thu, 05 Mar 2026 08:54:24 GMT" -> "2026-03-05"
                date_str = _parse_date(pub_date)
                link = item.findtext("link", "")

                articles.append(NewsArticle(
                    title=clean_title,
                    source=source,
                    date=date_str,
                    link=link,
                ))

        except Exception as e:
            print(f"  Failed to fetch '{query}': {e}")
            continue

    return articles


def _parse_date(date_str: str) -> str:
    """Parse RSS date to YYYY-MM-DD."""
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(date_str)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        from datetime import date
        return date.today().isoformat()


if __name__ == "__main__":
    print("Fetching Google News RSS...")
    news = fetch_news()
    for i, a in enumerate(news):
        print(f"[{i+1}] {a.title}")
        print(f"    Source: {a.source} | Date: {a.date}")
        print()
    print(f"Total: {len(news)} articles")
