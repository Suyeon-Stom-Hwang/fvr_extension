import { useState } from "react";
import "./App.css";
import { findVocabularyLineNumbers } from "./utils/vocabularyUtils"; // 유틸리티 함수 import

function App() {
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [csvStartIndex, setCsvStartIndex] = useState<string>("");
  const [showSampleText, setShowSampleText] = useState<boolean>(false);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [averageLineNumber, setAverageLineNumber] = useState<number | null>(null);
  const [displayCount, setDisplayCount] = useState<number>(10);

  const sampleText = `📰 1. Smart Advisors and the Rise of Data-Driven Education
In recent years, educational institutions have increasingly turned to smart advisors—AI-powered systems designed to enhance student learning. These systems analyze census data, track usage patterns, and interpret charts to help students make optimal decisions about their academic paths.

At Wilson University, for example, students receive weekly reports that combine tablet interaction logs and class routine analytics. “It’s like having a personal academic coach,” says Dr. Glen Park, a faculty member in educational technology.

Beyond performance, smart advisors also suggest relevant certificates or programs based on individual strengths. Despite concerns about potential privacy threats, the collaborative development of such systems promises a more inclusive, data-driven future in education.`;

  const rephrasePage = async () => {
    const [tab] = await chrome.tabs.query({ active: true });
    if (!tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: "rephrase" });
  };

  const revertPage = async () => {
    const [tab] = await chrome.tabs.query({ active: true });
    if (!tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: "revert" });
  };
  
  const checkWordsInPage = async () => {
    const [tab] = await chrome.tabs.query({ active: true });
    if (!tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: "checkWords" });
  };

  const startLog = async () => {
    const [tab] = await chrome.tabs.query({ active: true });
    if (!tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: "startLog" });
  };

  const endLog = async () => {
    const [tab] = await chrome.tabs.query({ active: true });
    if (!tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: "endLog" });
  };

  const viewVocabulary = async () => {
    chrome.runtime.sendMessage({ action: "getUserDifficultWords" }, (response) => {
      if (response) {
        console.log("Retrieved vocabulary:", response);
        setVocabulary(response);
      } else {
        console.error("Failed to retrieve vocabulary");
      }
    });
  };

  const clearVocabulary = async () => {
    chrome.runtime.sendMessage({ action: "clearVocabulary" }, (response) => {
      if (response && response.success) {
        console.log("Vocabulary cleared:", response);
        setVocabulary([]);
        setDisplayCount(10);
      } else {
        console.error("Failed to clear vocabulary");
      }
    });
  };

  const importFromCSV = async () => {
    const startIndex = parseInt(csvStartIndex, 10);
    if (isNaN(startIndex)) {
      alert("올바른 숫자를 입력해주세요.");
      return;
    }
    try {
      const response = await fetch("vocabulary.csv");
      const csvText = await response.text();
      const lines = csvText.split("\n").filter((line) => line.trim() !== "");
      const importedWords = lines.slice(startIndex).map((line) => {
        const [firstColumn] = line.split(",");
        return firstColumn.trim();
      });
      console.log("Imported words from CSV:", importedWords);
      chrome.storage.local.get("difficultWords", (data) => {
        const existing: string[] = data.difficultWords || [];
        const newVocabulary = [...existing, ...importedWords];
        chrome.storage.local.set({ difficultWords: newVocabulary }, () => {
          console.log("Vocabulary updated with imported CSV words.");
          setVocabulary(newVocabulary);
        });
      });
    } catch (error) {
      console.error("CSV 파일을 불러오는 중 에러 발생:", error);
    }
  };

  const handleWordSelection = (word: string) => {
    const normalized = word.toLowerCase().replace(/[^a-z0-9]/gi, "");
    if (!normalized) return;
    if (vocabulary.includes(normalized)) {
      setVocabulary(vocabulary.filter((w) => w !== normalized));
      chrome.runtime.sendMessage({ action: "removeDifficultWord", word: normalized });
    } else {
      setVocabulary([...vocabulary, normalized]);
      chrome.runtime.sendMessage({ action: "addDifficultWord", word: normalized });
    }
  };

  /* 평균
  const handleFindLineNumbers = async () => {
    const result = await findVocabularyLineNumbers(vocabulary);
    console.log("Vocabulary line numbers:", result);
    setMapping(result);

    const foundNumbers = Object.values(result).filter((num) => num !== null) as number[];
    if (foundNumbers.length > 0) {
      const avg = foundNumbers.reduce((acc, cur) => acc + cur, 0) / foundNumbers.length;
      const truncatedAvg = Math.floor(avg);
      setAverageLineNumber(truncatedAvg);
      console.log("Average (truncated) line number:", truncatedAvg);

      const response = await fetch(chrome.runtime.getURL("vocabulary.csv"));
      const csvText = await response.text();
      const lines = csvText.split("\n").filter((line) => line.trim() !== "");
      const newWords = lines.slice(truncatedAvg).map((line) => {
        const [firstColumn] = line.split(",");
        return firstColumn.trim();
      });
      console.log("New words from CSV (after line", truncatedAvg, "):", newWords);
      const updatedVocabulary = Array.from(new Set([...vocabulary, ...newWords]));
      chrome.storage.local.set({ difficultWords: updatedVocabulary }, () => {
        console.log("Vocabulary updated with new words from CSV after line", truncatedAvg);
      });
      setVocabulary(updatedVocabulary);
    } else {
      setAverageLineNumber(null);
      console.log("No vocabulary words found in CSV mapping.");
    }
  };
*/

const handleFindLineNumbers = async () => {
  const result = await findVocabularyLineNumbers(vocabulary);
  console.log("Vocabulary line numbers:", result);
  setMapping(result);

  const foundNumbers = Object.values(result).filter((num) => num !== null) as number[];
  if (foundNumbers.length > 0) {
    const avg = foundNumbers.reduce((acc, cur) => acc + cur, 0) / foundNumbers.length;
    const truncatedAvg = Math.floor(avg);
    setAverageLineNumber(truncatedAvg);
    console.log("Average (truncated) line number:", truncatedAvg);

    const response = await fetch(chrome.runtime.getURL("vocabulary.csv"));
    const csvText = await response.text();
    const lines = csvText.split("\n").filter((line) => line.trim() !== "");
    
    // CSV의 마지막 500개 줄만 사용
    const last500Lines = lines.slice(-300);
    const newWords = last500Lines.map((line) => {
      const [firstColumn] = line.split(",");
      return firstColumn.trim();
    });
    console.log("New words from CSV (last 500 lines):", newWords);
    
    const updatedVocabulary = Array.from(new Set([...vocabulary, ...newWords]));
    chrome.storage.local.set({ difficultWords: updatedVocabulary }, () => {
      console.log("Vocabulary updated with new words from CSV (last 500 lines)");
    });
    setVocabulary(updatedVocabulary);
  } else {
    setAverageLineNumber(null);
    console.log("No vocabulary words found in CSV mapping.");
  }
};

  return (
    <div className="App">
      <div className="flex flex-col w-32 text-md gap-6 text-slate-900">
        <button
          className="bg-slate-100 rounded-lg p-1 cursor-pointer hover:bg-slate-200 transition-all shadow-lg"
          onClick={checkWordsInPage}
        >
          Words Check Mode
        </button>
        <button
          className="bg-slate-100 rounded-lg p-1 cursor-pointer hover:bg-slate-200 transition-all shadow-lg"
          onClick={rephrasePage}
        >
          Rephrasing
        </button>
        <button
          className="bg-slate-100 rounded-lg p-1 cursor-pointer hover:bg-slate-200 transition-all shadow-lg"
          onClick={revertPage}
        >
          Revert
        </button>
        <button
          className="bg-slate-100 rounded-lg p-1 cursor-pointer hover:bg-slate-200 transition-all shadow-lg"
          onClick={startLog}
        >
          Start Logging
        </button>
        <button
          className="bg-slate-100 rounded-lg p-1 cursor-pointer hover:bg-slate-200 transition-all shadow-lg"
          onClick={endLog}
        >
          End Logging
        </button>
        <button
          className="bg-green-100 rounded-lg p-1 cursor-pointer hover:bg-green-200 transition-all shadow-lg"
          onClick={viewVocabulary}
        >
          View Vocabulary
        </button>
        <button
          className="bg-red-100 rounded-lg p-1 cursor-pointer hover:bg-red-200 transition-all shadow-lg"
          onClick={clearVocabulary}
        >
          Clear Vocabulary
        </button>
        <input
          type="number"
          placeholder="시작 행 번호"
          value={csvStartIndex}
          onChange={(e) => setCsvStartIndex(e.target.value)}
          className="border rounded p-1"
        />
        <button
          className="bg-blue-100 rounded-lg p-1 cursor-pointer hover:bg-blue-200 transition-all shadow-lg"
          onClick={importFromCSV}
        >
          Import from CSV
        </button>
        <button
          className="bg-purple-100 rounded-lg p-1 cursor-pointer hover:bg-purple-200 transition-all shadow-lg"
          onClick={() => setShowSampleText(!showSampleText)}
        >
          {showSampleText ? "Hide Sample Text" : "Show Sample Text"}
        </button>
        <button
          className="bg-yellow-100 rounded-lg p-1 cursor-pointer hover:bg-yellow-200 transition-all shadow-lg"
          onClick={handleFindLineNumbers}
        >
          Voca Profiling
        </button>
      </div>

      {showSampleText && (
        <div
          className="mt-4 p-4 border rounded bg-slate-50"
          style={{ width: "700px", margin: "auto" }}
        >
          <h3 className="text-lg font-bold mb-2">Sample Text</h3>
          <div
            className="sample-text"
            style={{
              lineHeight: "1.6",
              fontSize: "14px",
              whiteSpace: "normal",
              wordBreak: "break-word"
            }}
          >
            {sampleText.split(/\s+/).map((word, idx) => {
              const normalized = word.toLowerCase().replace(/[^a-z0-9]/gi, "");
              return (
                <span
                  key={idx}
                  onClick={() => handleWordSelection(word)}
                  style={{
                    cursor: "pointer",
                    backgroundColor: vocabulary.includes(normalized)
                      ? "#ccffcc"
                      : "transparent",
                    marginRight: "4px"
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {vocabulary.length > 0 && (
        <div className="mt-4 p-4 border rounded bg-slate-50">
          <h3 className="text-lg font-bold mb-2">Saved Vocabulary</h3>
          <ul className="list-disc list-inside">
            {vocabulary.slice(0, displayCount).map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
          {displayCount < vocabulary.length && (
            <button
              className="mt-2 bg-gray-100 rounded-lg p-1 cursor-pointer hover:bg-gray-200 transition-all shadow-lg"
              onClick={() => setDisplayCount(displayCount + 10)}
            >
              더보기
            </button>
          )}
        </div>
      )}

      {Object.keys(mapping).length > 0 && (
        <div className="mt-4 p-4 border rounded bg-slate-50">
          <h3 className="text-lg font-bold mb-2">Vocabulary Line Numbers</h3>
          <ul className="list-disc list-inside">
            {Object.entries(mapping).map(([word, line]) => (
              <li key={word}>
                {word}: {line ? line : "Not found"}
              </li>
            ))}
          </ul>
          {averageLineNumber !== null && (
            <p className="mt-2">
              <strong>Average Line Number:</strong> {averageLineNumber}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
