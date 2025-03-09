// const rephrase = (text: string) => {
//   return "Test " + text.length;
// };

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

const clickWords = (e: MouseEvent) => {

  const word = (e.target as HTMLElement).innerText;
  console.log("Clicked", word, e.target);

  removeExistingModal();
  document.querySelectorAll(".fvr-clicked").forEach((element) => {
    element.classList.remove("fvr-clicked");
  });
  (e.target as HTMLElement).classList.add("fvr-clicked");

  const modal = document.createElement("div");
  modal.classList.add("fvr-modal");
  const targetRect = (e.target as HTMLElement).getBoundingClientRect();
  const scrollHeight = window.scrollY;
  console.log("Target Rect", targetRect);
  const modalWidth = 200; // Adjust this value based on your modal's width
  const viewportWidth = window.innerWidth;
  const leftPosition = targetRect.right + 10;

  if (leftPosition + modalWidth > viewportWidth) {
    modal.style.left = `${viewportWidth - modalWidth - 10}px`;
  } else {
    modal.style.left = `${leftPosition}px`;
  }
  modal.style.top = `${scrollHeight + targetRect.top - 55}px`;

  const button1 = document.createElement("button");
  button1.classList.add("fvr-button");
  button1.innerText = "Button 1";
  button1.onclick = () => {
    addDifficultWord(word);
    (e.target as HTMLElement).classList.add("fvr-difficult");
    document.body.removeChild(modal);
  };

  const button2 = document.createElement("button");
  button2.classList.add("fvr-button");
  button2.innerText = "Button 2";
  button2.onclick = () => {
    removeDifficultWord(word);
    (e.target as HTMLElement).classList.remove("fvr-difficult");
    document.body.removeChild(modal);
  };

  modal.appendChild(button1);
  modal.appendChild(button2);
  document.body.appendChild(modal);
};

const rephrasePage = async () => {
  const articles: HTMLParagraphElement[] = [];
  document.querySelectorAll("p").forEach((element) => {
    if (element.innerText.trim().split(/ +/).length > 5) {
      articles.push(element);
    }
  });
  console.log("Tags", articles.length);

  // Extract words without duplicates
  const words = articles.map((element) => element.innerText.split(/ +/));
  const uniqueWords = [...new Set(words.flat())];
  console.log("Words", uniqueWords.length, uniqueWords);

  // Calc 5% of uniqueWords
  const numOfPreservedWords = Math.ceil(uniqueWords.length * 0.05);

  // Extract difficult words according to the user's dictionary
  const userDiffcultWords = await getUserDifficultWords();
  const difficultWords = uniqueWords.filter((word) =>
    userDiffcultWords.includes(word)
  );
  const preservedWords =
    difficultWords.length <= numOfPreservedWords
      ? difficultWords
      : difficultWords
          .sort(() => 0.5 - Math.random())
          .slice(0, numOfPreservedWords);
  console.log("Difficult Words", difficultWords.length, difficultWords);

  // Rephrase
  articles.forEach((element) => {
    // const rephrasedText = rephrase(element.innerText);
    // TODO: Implement rephrasing
    const rephrasedHTML = element.innerHTML.replace(
      /(\b\w+\b)(?![^<]*>)/g,
      (word) => {
        if (preservedWords.includes(word)) {
          return `<span class='fvr-span fvr-difficult'">${word}</span>`;
        } else {
          return `<span class='fvr-span'>${word}</span>`;
        }
      }
    );

    element.setAttribute("fvr-data-original-content", element.innerHTML);
    element.innerHTML = rephrasedHTML;
  });

  document.querySelectorAll(".fvr-span").forEach((element) => {
    element.addEventListener("click", clickWords as EventListener);
  });
};

const revertPage = () => {
  const articles = document.querySelectorAll("[fvr-data-original-content]");
  console.log("Tags", articles.length);

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
  jsIntervals = tracks?.intervals ?? [];
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
