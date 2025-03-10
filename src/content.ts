const rephrase = (text: string) => {
  return "Test " + text.length;
};

const rephrasePage = () => {
  const articles: HTMLParagraphElement[] = [];
  document.querySelectorAll("p").forEach((element) => {
    if (element.innerText.trim().split(/ +/).length > 5) {
      articles.push(element);
    }
  });
  console.log("Tags", articles.length);

  // Rephrase
  articles.forEach((element) => {
    const rephrasedText = rephrase(element.innerText);
    element.setAttribute("fvr-data-original-content", element.innerHTML);
    element.innerText = rephrasedText;
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
  scrollIntervals: { time: number, pixels: number }[];
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
  const scrollIntervals: {time: number, pixels: number}[] = [];
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
    scrollIntervals.push({ time: (currentInterval * 0.5), pixels: scrollY });
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
      scrollIntervals: scrollIntervals
    });
  };

  window.addEventListener("beforeunload", logPage);
  
  return {intervals: [interval1, interval5], logFunc: logPage};
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
