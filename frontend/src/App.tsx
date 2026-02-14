import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import Result from "./pages/Result";
import "./App.css";

function SearchPage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!query.trim()) return;
    navigate(`/result?q=${encodeURIComponent(query)}`);
  };

  return (
    <div id="container">
      <div id="search">
        <img src="logo-subtitute.png" alt="" className="logo" />

        <div className="search-box">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="키워드 입력"
          />
          <button onClick={handleSearch}>검색</button>
        </div>
      </div>
      <footer></footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/result" element={<Result />} />
    </Routes>
  );
}
