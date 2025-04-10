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

  const sampleText = `🌍 Brave Teen Makes Bold Career Move After Feat at Science Fair

Last Friday, a brave high school student from Chicago made headlines after winning a national science fair. Before going to bed, she had no idea her life would change overnight.

Samantha Lee, 17, said, “I always wanted to be a scientist. I didn’t assume I would win, but I gave it my best.” She created a new type of peptide that could help treat rare diseases. Judges called her project a “remarkable scientific feat.”

Samantha used advanced methods to assay the samples and even learned how to encode protein structures. “I had to immerse myself in books and lab work. It wasn’t easy,” she said. Her efforts helped her acquire knowledge far beyond the average student.

The project was no small burden. “There were times I wanted to cease, but my family would console me. I learned to stay calm and decisive even under pressure.”

Samantha wore a white tunic and a plaid scarf at the awards ceremony. “She looked so chic!” said one judge. When her name was announced, the crowd began to clap loudly, and she couldn’t help but blush.

Some media outlets started to peddle rumors about her discovery, but scientists were quick to cite her official work. “There’s no need to surmise or deduce beyond the facts,” said Dr. Greene, a science professor.

Her next step? A career in biomedical research. She hopes to create capsules that can safely deliver medicine to the body. She’s already working on a way to condense large proteins for easier use.

Samantha's family, including her brother who wears a pilot’s tunic, were proud. “We coexist peacefully even when stressed,” said her mother. “We faced tough times, but nothing bad has ever befallen us that we couldn’t overcome.”

In a world filled with chaos, Samantha’s stoic attitude is refreshing. “She’s not just smart, she’s bold,” her teacher said.

For now, Samantha will continue studying while enjoying root lager, using a garden hose, and learning how a rudder steers a boat—all part of a science kit she received as a prize. She may be young, but she’s already guiding her life like a seasoned captain.

After the fair, Samantha said, “You don’t just get results—you have to give everything.” Her first experiment had a major flaw, but she learned to adjust quickly. She added a gloss in her report to explain complex ideas and studied the causal links behind rare conditions, including those related to incest, a topic she handled with care. One night, with only dry bread’s crust and tea, she worked late under the dun sky, determined to finish.
`;

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
          style={{ width: "400px", margin: "auto" }}
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
{sampleText.split("\n").map((paragraph, idx) => (
  <p key={idx} style={{ marginBottom: "1em" }}>
    {paragraph.split(/\s+/).map((word, wordIdx) => {
      const normalized = word.toLowerCase().replace(/[^a-z0-9]/gi, "");
      return (
        <span
          key={wordIdx}
          onClick={() => handleWordSelection(word)}
          style={{
            cursor: "pointer",
            backgroundColor: vocabulary.includes(normalized)
              ? "#ccffcc"
              : "transparent",
            marginRight: "4px",
            display: "inline-block",
            wordBreak: "keep-all",
            overflowWrap: "break-word",
          }}
        >
          {word}
        </span>
      );
    })}
  </p>
))}
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
