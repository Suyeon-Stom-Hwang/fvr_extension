// simplify 함수
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const fetchRephrasedSentence = async (
  sentence: string,
  difficultWords: string[]
) => {
  if (!OPENAI_API_KEY) {
    console.error(
      "API Key is missing. Make sure to set VITE_OPENAI_API_KEY in .env file."
    );
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

const getUserDifficultWords = async () => {
  return new Promise<string[]>((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "getUserDifficultWords" },
      (response) => {
        if (response) {
          console.log("User Difficult Words", response);
          resolve(response);
        } else {
          console.log("Failed to get user difficult words");
          reject("Failed to get user difficult words");
        }
      }
    );
  });
};

const addDifficultWord = async (word: string) => {
  console.info("addDifficultWord", word);
  chrome.runtime.sendMessage({ action: "addDifficultWord", word });
};

const removeDifficultWord = async (word: string) => {
  console.info("removeDifficultWord", word);
  chrome.runtime.sendMessage({ action: "removeDifficultWord", word });
};

const removeExistingModal = () => {
  // Remove any existing modal
  const existingModal = document.querySelector(".fvr-modal");
  if (existingModal) {
    document.body.removeChild(existingModal);
  }
};

const handleWordClick = (e: MouseEvent) => {
  const word = (e.target as HTMLElement).innerText;
  console.info("clickWords", word, e.target);

  removeExistingModal();
  document.querySelectorAll(".fvr-clicked").forEach((element) => {
    element.classList.remove("fvr-clicked");
  });
  (e.target as HTMLElement).classList.add("fvr-clicked");

  const modal = document.createElement("div");
  modal.classList.add("fvr-modal");
  const targetRect = (e.target as HTMLElement).getBoundingClientRect();
  const scrollHeight = window.scrollY;
  const modalWidth = 200; // Adjust this value based on your modal's width
  const viewportWidth = window.innerWidth;
  const leftPosition = targetRect.right + 10;

  if (leftPosition + modalWidth > viewportWidth) {
    modal.style.left = `${viewportWidth - modalWidth - 10}px`;
  } else {
    modal.style.left = `${leftPosition}px`;
  }
  modal.style.top = `${scrollHeight + targetRect.top - 55}px`;

  const buttonAddWord = document.createElement("button");
  buttonAddWord.classList.add("fvr-button");
  buttonAddWord.innerText = "Add";
  buttonAddWord.onclick = () => {
    addDifficultWord(word.toLowerCase());
    document.querySelectorAll(".fvr-span").forEach((element) => {
      if (element.innerHTML.toLowerCase() === word) {
        element.classList.add("fvr-difficult");
      }
    });
    document.body.removeChild(modal);
  };

  const buttonRemoveWord = document.createElement("button");
  buttonRemoveWord.classList.add("fvr-button");
  buttonRemoveWord.innerText = "Remove";
  buttonRemoveWord.onclick = () => {
    removeDifficultWord(word.toLowerCase());
    document.querySelectorAll(".fvr-difficult").forEach((element) => {
      if (element.innerHTML.toLowerCase() === word) {
        element.classList.remove("fvr-difficult");
      }
    });
    document.body.removeChild(modal);
  };

  modal.appendChild(buttonAddWord);
  modal.appendChild(buttonRemoveWord);
  document.body.appendChild(modal);
};

const rephrasePage = async () => {
  const articles: HTMLParagraphElement[] = [];

  document
    .querySelectorAll("[fvr-data-original-content]")
    .forEach((element) => {
      articles.push(element as HTMLParagraphElement);
    });

  if (articles.length === 0) {
    // Export more than 5 words
    document.querySelectorAll("p").forEach((element) => {
      if (element.innerText.trim().split(/ +/).length > 5) {
        articles.push(element);
      }
    });
  }
  console.log("rephrasePage", articles.length);

  // Extract words without duplicates
  const words = articles.map((element) => element.innerText.split(/ +/));
  const uniqueWords = [...new Set(words.flat())];
  console.log("uniqueWords", uniqueWords.length, uniqueWords);

  // Calc 5% of uniqueWords
  const numOfPreservedWords = Math.ceil(uniqueWords.length * 0.05);

  // Extract difficult words according to the user's dictionary
  const userDiffcultWords = await getUserDifficultWords();
  const difficultWords = uniqueWords.filter((word) =>
    userDiffcultWords.includes(word.toLowerCase())
  );
  console.log("Difficult Words", difficultWords.length, difficultWords);

  const preservedWords =
    difficultWords.length <= numOfPreservedWords
      ? difficultWords
      : difficultWords
          .sort(() => 0.5 - Math.random())
          .slice(0, numOfPreservedWords);
  const unpreservedWords = userDiffcultWords.filter(
    (word) => !preservedWords.includes(word)
  );

  // Rephrase
  articles.forEach(async (element) => {
    const rephrasedText: string = await fetchRephrasedSentence(
      element.innerText,
      unpreservedWords
    );
    const rephrasedHTML = rephrasedText.replace(
      /(\b\w+\b)(?![^<]*>)/g,
      (word) => {
        if (userDiffcultWords.includes(word.toLowerCase())) {
          return `<span class='fvr-span fvr-difficult'">${word}</span>`;
        } else {
          return `<span class='fvr-span'>${word}</span>`;
        }
      }
    );

    if (!element.hasAttribute("fvr-data-original-content")) {
      element.setAttribute("fvr-data-original-content", element.innerHTML);
    }
    element.innerHTML = rephrasedHTML;
    element.querySelectorAll(".fvr-span").forEach((element) => {
      element.addEventListener("click", handleWordClick as EventListener);
    });
  });
};

const revertPage = () => {
  const articles = document.querySelectorAll("[fvr-data-original-content]");
  console.log("revertPage", articles.length);

  // Revert
  articles.forEach((element) => {
    const originalText = element.getAttribute("fvr-data-original-content");
    if (originalText) {
      element.innerHTML = originalText;
    }
  });

  removeExistingModal();
};

let loggingActive = false;
const logs: {
  url: string;
  title: string;
  timeSpent: number;
  maxScrollDepth: number;
  totalScrollAmount: number;
  nonScrollTime: number;
  upScrollAmount: number;
  scrollReversals: number;
  scrollIntervals: { time: number; pixels: number }[];
}[] = [];
let jsIntervals: number[] = [];
let logFunc: () => void;

const startLog = () => {
  loggingActive = true;
  console.log("Logging Started");
  const tracks = trackPage();
  //  jsIntervals = tracks?.intervals ?? [];
  logFunc = tracks?.logFunc ?? (() => {});
};

const trackPage = () => {
  if (!loggingActive) return;

  const startTime = Date.now();
  let maxScrollDepth = 0;
  let totalScrollAmount = 0;
  let upScrollAmount = 0;
  let scrollReversals = 0;
  let lastScrollY = window.scrollY;
  let lastScrollTime = Date.now();
  let nonScrollTime = 0;
  const scrollIntervals: { time: number; pixels: number }[] = [];
  let currentInterval = 0;
  let lastDirection = 0;

  const trackScrolling = () => {
    if (!loggingActive) return;
    const now = Date.now();
    const scrollY = window.scrollY;
    const delta = scrollY - lastScrollY;

    if (delta !== 0) {
      totalScrollAmount += Math.abs(delta);
      if (delta > 0) {
        if (lastDirection === -1) scrollReversals++;
        lastDirection = 1;
      } else {
        upScrollAmount += Math.abs(delta);
        if (lastDirection === 1) scrollReversals++;
        lastDirection = -1;
      }
      maxScrollDepth = Math.max(maxScrollDepth, scrollY);
      lastScrollY = scrollY;
      lastScrollTime = now;
    } else {
      nonScrollTime += now - lastScrollTime;
    }
  };

  const interval5 = setInterval(() => {
    if (!loggingActive) return;
    const scrollY = window.scrollY;
    scrollIntervals.push({ time: currentInterval * 0.5, pixels: scrollY });
    currentInterval++;
  }, 500);

  const interval1 = setInterval(trackScrolling, 100);

  const logPage = () => {
    if (!loggingActive) return;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    logs.push({
      url: document.location.href,
      title: document.title,
      timeSpent: timeSpent,
      maxScrollDepth: maxScrollDepth,
      totalScrollAmount: totalScrollAmount,
      nonScrollTime: Math.round(nonScrollTime / 1000),
      upScrollAmount: upScrollAmount,
      scrollReversals: scrollReversals,
      scrollIntervals: scrollIntervals,
    });
  };

  window.addEventListener("beforeunload", logPage);

  return { intervals: [interval1, interval5], logFunc: logPage };
};

const endLog = () => {
  logFunc();
  loggingActive = false;
  for (const interval of jsIntervals) {
    clearInterval(interval);
  }
  console.log("Logging Data:", logs);
  chrome.storage.local.set({ logs });
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "rephrase") {
    rephrasePage();
  } else if (message.action === "revert") {
    revertPage();
  } else if (message.action === "startLog") {
    startLog();
  } else if (message.action === "endLog") {
    endLog();
  }
});
