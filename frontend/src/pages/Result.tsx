import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { SearchResponse } from "./types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function Result() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get("q") || "";
  const noerr = searchParams.get("noerr") === "1";

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  useEffect(() => {
    if (!query) return;

    const url = `${BACKEND_URL}/search?q=${encodeURIComponent(query)}${
      noerr ? "&noerr=1" : ""
    }`;

    fetch(url)
      .then((res) => res.json())
      .then((resData: SearchResponse) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [query, noerr]);

  if (loading) return <div style={styles.center}>Loading...</div>;
  if (!data) return <div style={styles.center}>검색 결과 없음</div>;

  const allSources = Array.from(new Set(data.results.flatMap((r) => r.source)));
  const showNoErrButton = !noerr && data.original_query !== data.final_query;

  function sanitizeBoldOnly(html?: string | null) {
    if (!html) return "";
    return html.replace(/<(?!\/?b\b)[^>]*>/g, "");
  }

  const toggleSource = (src: string) => {
    setSelectedSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src],
    );
  };

  const filteredResults =
    selectedSources.length === 0
      ? data.results
      : data.results.filter((item) =>
          item.source.some((src) => selectedSources.includes(src)),
        );
  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button onClick={() => navigate("/")}>←</button>

        <h3>
          "{data.original_query}"
          {!noerr && data.original_query !== data.final_query && (
            <> → {data.final_query}</>
          )}
        </h3>
      </div>

      <p>총 {data.count}건</p>
      <div style={styles.filterBox}>
        {allSources.map((src) => (
          <button
            key={src}
            onClick={() => toggleSource(src)}
            style={{
              ...styles.filterButton,
              backgroundColor: selectedSources.includes(src)
                ? "#4285f4"
                : "#f1f3f4",
              color: selectedSources.includes(src) ? "white" : "black",
            }}
          >
            {src}
          </button>
        ))}
      </div>

      {/* 🔥 교정 과정 표시 */}
      {!noerr && data.errata_steps.length > 0 && (
        <div style={styles.errata}>
          교정 과정: {data.errata_steps.join(" → ")}
        </div>
      )}

      {/* 🔥 원래대로 검색 버튼 */}
      {showNoErrButton && (
        <button
          style={styles.noErrButton}
          onClick={() =>
            navigate(
              `/result?q=${encodeURIComponent(data.original_query)}&noerr=1`,
            )
          }
        >
          원래 검색어로 다시 검색
        </button>
      )}

      <div style={styles.resultList}>
        {filteredResults.map((item, idx) => (
          <div key={idx} style={styles.card}>
            <div style={styles.source}>{item.source.join(", ")}</div>

            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              style={styles.title}
              dangerouslySetInnerHTML={{
                __html: sanitizeBoldOnly(item.title),
              }}
            ></a>

            <div
              style={styles.description}
              dangerouslySetInnerHTML={{
                __html: sanitizeBoldOnly(item.description),
              }}
            />

            {item.published_at && (
              <div style={styles.date}>{item.published_at}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles: any = {
  container: {
    padding: "40px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "20px",
  },
  errata: {
    marginBottom: "10px",
    fontSize: "14px",
    color: "gray",
  },
  noErrButton: {
    marginBottom: "20px",
    padding: "8px 16px",
    backgroundColor: "#f1f3f4",
    border: "1px solid #ccc",
    borderRadius: "6px",
    cursor: "pointer",
  },
  resultList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  card: {
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
  },
  source: {
    fontSize: "12px",
    color: "gray",
    marginBottom: "5px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "bold",
    textDecoration: "none",
    display: "block",
    marginBottom: "10px",
  },
  description: {
    fontSize: "14px",
  },
  date: {
    fontSize: "12px",
    marginTop: "8px",
    color: "#777",
  },
  filterBox: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },

  filterButton: {
    padding: "6px 12px",
    border: "1px solid #ccc",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "12px",
  },
};
