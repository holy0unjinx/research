from fastapi import FastAPI, Query
import httpx
from dotenv import load_dotenv
import os
import asyncio
from datetime import datetime
from email.utils import parsedate_to_datetime
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()
load_dotenv()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000", "http://127.0.0.1:3000"],  # 개발용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


SEARXNG_URL = os.getenv("SEARXNG_URL", "http://searxng:8080/search")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

NAVER_ENDPOINTS = {
    "blog": "https://openapi.naver.com/v1/search/blog.json",
    "news": "https://openapi.naver.com/v1/search/news.json",
    "book": "https://openapi.naver.com/v1/search/book.json",
    "encyc": "https://openapi.naver.com/v1/search/encyc.json",
    "cafearticle": "https://openapi.naver.com/v1/search/cafearticle.json",
    "kin": "https://openapi.naver.com/v1/search/kin.json",
    "webkr": "https://openapi.naver.com/v1/search/webkr.json",
    # "image": "https://openapi.naver.com/v1/search/image.json",
    "shop": "https://openapi.naver.com/v1/search/shop.json",
    "doc": "https://openapi.naver.com/v1/search/doc.json",
}

ERRATA_URL = "https://openapi.naver.com/v1/search/errata.json"


async def resolve_errata(client, q: str, max_retry: int = 3):
    current_query = q
    corrected_history = []

    for _ in range(max_retry):
        res = await client.get(
            ERRATA_URL,
            params={"query": current_query},
            headers={
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
            }
        )
        data = res.json()
        corrected = data.get("errata", "")

        if not corrected:
            break

        corrected_history.append(corrected)
        current_query = corrected

    return current_query, corrected_history


async def fetch_searx(client, q):
    res = await client.get(
        SEARXNG_URL,
        params={
            "q": q,
            "format": "json",
            "number_of_results": 50,
            "safesearch": 0,
            "language": "ko-KR"
        }
    )
    data = res.json()

    return [{
        "source": item.get("engines"),
        "title": item.get("title"),
        "url": item.get("url"),
        "description": item.get("content"),
        "published_at": item.get("publishedDate")
    } for item in data.get("results", [])]


async def fetch_naver(client, q, search_type):
    url = NAVER_ENDPOINTS.get(search_type)
    if not url:
        return []

    res = await client.get(
        url,
        params={"query": q, "display": 20},
        headers={
            "X-Naver-Client-Id": NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
        }
    )

    data = res.json()
    results = []

    for item in data.get("items", []):
        pub_date = None

        if "postdate" in item:
            pub_date = datetime.strptime(item["postdate"], "%Y%m%d").date().isoformat()
        elif "pubDate" in item:
            pub_date = parsedate_to_datetime(item["pubDate"]).date().isoformat()

        results.append({
            "source": [f"naver_{search_type}"],
            "title": item.get("title"),
            "url": item.get("originallink") or item.get("link"),
            "description": item.get("description"),
            "published_at": pub_date
        })

    return results


@app.get("/search")
async def search(
    q: str,
    types: list[str] | None = Query(default=None),
    noerr: int = 0
):
    if not types:
        types = list(NAVER_ENDPOINTS.keys())  # 네이버 전부

    async with httpx.AsyncClient(timeout=10) as client:

        if noerr == 1:
            corrected_query = q
            errata_history = []
        else:
            corrected_query, errata_history = await resolve_errata(client, q)

        tasks = [fetch_searx(client, corrected_query)]

        for t in types:
            if t in NAVER_ENDPOINTS:
                tasks.append(fetch_naver(client, corrected_query, t))

        responses = await asyncio.gather(*tasks, return_exceptions=True)

    results = []
    for res in responses:
        if isinstance(res, list):
            results.extend(res)

    return {
        "original_query": q,
        "final_query": corrected_query,
        "errata_steps": errata_history,
        "count": len(results),
        "results": results
    }
