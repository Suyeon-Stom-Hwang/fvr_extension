// rephraseUtils.ts
export const fetchRephrasedSentence = async (
    sentence: string,
    difficultWords: string[]
  ): Promise<string> => {
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      console.error("API Key is missing. Make sure to set VITE_OPENAI_API_KEY in .env file.");
      return "";
    }
    const prompt = `Rephrase the following sentence in simpler language, making sure to replace or explain the difficult words: "${sentence}" Difficult words: ${difficultWords.join(
      ", "
    )}. Provide only the revised sentence without any extra words.`;
  
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    const result = data.choices[0].message.content.trim();
    console.log("fetchRephrasedSentence - ", result);
    return result;
  };
  