// src/utils/vocabularyUtils.ts
export async function findVocabularyLineNumbers(vocabulary: string[]): Promise<Record<string, number | null>> {
    const response = await fetch(chrome.runtime.getURL("vocabulary.csv"));
    const csvText = await response.text();
    const lines = csvText.split("\n").filter((line) => line.trim() !== "");
  
    const mapping: Record<string, number | null> = {};
  
    vocabulary.forEach((word) => {
      const lowerWord = word.toLowerCase();
      let foundLine: number | null = null;
      for (let i = 0; i < lines.length; i++) {
        const [csvWord] = lines[i].split(",");
        if (csvWord.trim().toLowerCase() === lowerWord) {
          foundLine = i + 1; // 줄 번호는 1부터 시작
          break;
        }
      }
      mapping[word] = foundLine;
    });
  
    return mapping;
  }
  