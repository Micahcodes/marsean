const results = document.querySelector("#results");
const riskFilter = document.querySelector("#riskFilter");
const stateFilter = document.querySelector("#stateFilter");
const billsTab = document.querySelector("#billsTab");
const newsTab = document.querySelector("#newsTab");
let currentStateData = null;
let currentNewsData = null;
let activeTab = "bills";

function getRiskClasses(rating) {
  switch (rating) {
    case "green":
      return "bg-emerald-500 text-slate-950";
    case "yellow":
      return "bg-amber-400 text-slate-950";
    case "red":
      return "bg-rose-500 text-slate-950";
    default:
      return "bg-slate-700 text-slate-100";
  }
}

function getStateFileUrl(stateCode) {
  if (stateCode === "tx") {
    return "/data/texas-bills.json";
  }
  return `/data/${stateCode}-bills.json`;
}

function filterBills(data) {
  if (!data?.results) {
    return [];
  }

  const selectedRisk = riskFilter?.value || "all";
  return data.results.filter((bill) => {
    const rating = bill.risk_analysis?.rating || "green";
    return selectedRisk === "all" || rating === selectedRisk;
  });
}

function renderResults(data) {
  currentStateData = data;
  if (activeTab === "bills") {
    renderBills(data);
  } else {
    renderNews(currentNewsData);
  }
  renderSummary(data, currentNewsData);
}

function renderBills(data) {
  const filteredResults = filterBills(data);
  results.innerHTML = "";
  if (!filteredResults.length) {
    results.innerHTML = '<p class="text-slate-400">No bills found.</p>';
    return;
  }

  const sortedBills = filteredResults.sort((a, b) => {
    const ratingOrder = { red: 0, yellow: 1, green: 2 };
    const aRating = a.risk_analysis?.rating || "green";
    const bRating = b.risk_analysis?.rating || "green";
    return ratingOrder[aRating] - ratingOrder[bRating];
  });

  sortedBills.forEach((bill) => {
    results.appendChild(renderBill(bill));
  });
}

function renderNews(data) {
  results.innerHTML = "";
  if (!data || !data.articles?.length) {
    results.innerHTML = '<p class="text-slate-400">No news articles found.</p>';
    return;
  }

  const sortedArticles = data.articles.sort((a, b) => {
    const order = { negative: 0, neutral: 1, positive: 2 };
    return order[a.sentiment] - order[b.sentiment];
  });

  sortedArticles.forEach((article) => {
    const sentimentClass =
      article.sentiment === "negative"
        ? "bg-rose-500"
        : article.sentiment === "positive"
          ? "bg-emerald-500"
          : "bg-amber-400";
    const container = document.createElement("div");
    container.className =
      "rounded-lg border border-slate-800 bg-slate-900/90 p-3 shadow-lg shadow-slate-950/20";
    container.innerHTML = `
      <div class="flex items-center gap-2 mb-2">
        <span class="rounded-full px-2 py-1 text-xs font-semibold ${sentimentClass} text-slate-950">${article.sentiment.toUpperCase()}</span>
        <p class="text-slate-400 text-xs">${new Date(article.publishedAt).toLocaleDateString()}</p>
      </div>
      <h3 class="text-lg font-semibold leading-tight">${article.title || "No title"}</h3>
      <p class="mt-2 text-slate-400 text-sm">${article.description || ""}</p>
      <a href="${article.url}" target="_blank" rel="noreferrer" class="mt-2 inline-block text-cyan-300 hover:text-cyan-200 text-xs">Read more</a>
    `;
    results.appendChild(container);
  });
}

async function loadStateData(stateCode = "tx") {
  try {
    const response = await fetch(getStateFileUrl(stateCode));
    if (!response.ok) {
      throw new Error(`Unable to load state data for ${stateCode}`);
    }

    const data = await response.json();
    renderResults(data);
  } catch (error) {
    console.warn(error);
    results.innerHTML =
      '<p class="text-rose-300">Unable to load the selected state data.</p>';
  }
}

async function loadNewsData(stateCode) {
  try {
    // First try to load stored data
    const storedResponse = await fetch(`/data/news-${stateCode}.json`);
    if (storedResponse.ok) {
      const data = await storedResponse.json();
      currentNewsData = data;
      renderResults(currentStateData);
      return;
    }
  } catch (error) {
    // Ignore, fetch from API
  }

  try {
    const response = await fetch(`/api/news?state=${stateCode}`);
    if (!response.ok) {
      throw new Error(`Unable to load news for ${stateCode}`);
    }
    const data = await response.json();
    currentNewsData = data;
    renderResults(currentStateData);
  } catch (error) {
    console.warn(error);
    currentNewsData = { articles: [] };
    renderResults(currentStateData);
  }
}

function switchTab(tab) {
  activeTab = tab;
  billsTab.classList.toggle("bg-slate-800", tab === "bills");
  billsTab.classList.toggle("text-slate-100", tab === "bills");
  billsTab.classList.toggle("border-cyan-400", tab === "bills");
  billsTab.classList.toggle("bg-slate-900", tab !== "bills");
  billsTab.classList.toggle("text-slate-400", tab !== "bills");
  billsTab.classList.toggle("border-transparent", tab !== "bills");

  newsTab.classList.toggle("bg-slate-800", tab === "news");
  newsTab.classList.toggle("text-slate-100", tab === "news");
  newsTab.classList.toggle("border-cyan-400", tab === "news");
  newsTab.classList.toggle("bg-slate-900", tab !== "news");
  newsTab.classList.toggle("text-slate-400", tab !== "news");
  newsTab.classList.toggle("border-transparent", tab !== "news");

  renderResults(currentStateData);
}

function renderBill(bill) {
  const rating = bill.risk_analysis?.rating || "green";
  const recap = bill.risk_analysis?.recap || "No analysis available.";
  const analysis = bill.risk_analysis?.analysis || "No risk details available.";
  const container = document.createElement("div");
  container.className =
    "rounded-lg border border-slate-800 bg-slate-900/90 p-3 shadow-lg shadow-slate-950/20";
  container.innerHTML = `
    <div class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="rounded-full px-2 py-1 text-xs font-semibold ${getRiskClasses(rating)}">${rating.toUpperCase()}</span>
          <p class="text-slate-400 text-xs">${bill.jurisdiction?.name || "Texas"} • ${bill.from_organization?.name || "Unknown chamber"}</p>
        </div>
        <h3 class="text-lg font-semibold leading-tight">${bill.identifier || "N/A"}: ${bill.title || "No title"}</h3>
      </div>
      <div class="text-slate-400 text-xs text-right">
        <p>${bill.session || "Unknown session"}</p>
        <p>${bill.latest_action_date || ""}</p>
      </div>
    </div>
    <div class="mt-2 flex flex-wrap gap-1 text-xs">
      ${
        bill.subject
          ?.slice(0, 5)
          .map(
            (subject) =>
              `<span class="rounded bg-slate-800 px-2 py-1 text-slate-300">${subject}</span>`,
          )
          .join("") || ""
      }
    </div>
    <div class="mt-2 rounded bg-slate-950/80 p-2 text-xs text-slate-300">
      <p class="font-semibold text-slate-100">AI analysis</p>
      <p class="mt-1"><strong>Recap:</strong> ${recap}</p>
      <p class="mt-1"><strong>Reasoning:</strong> ${analysis}</p>
    </div>
    <a href="${bill.openstates_url || "#"}" target="_blank" rel="noreferrer" class="mt-2 inline-block text-cyan-300 hover:text-cyan-200 text-xs">View on OpenStates</a>
  `;
  return container;
}

function renderSummary(data, newsData) {
  const summarySection = document.querySelector("#summarySection");
  const summary = document.querySelector("#summary");
  if (!data?.results?.length && !newsData?.articles?.length) {
    summarySection.classList.add("hidden");
    return;
  }

  const billCounts = data?.results?.length
    ? data.results.reduce(
        (acc, bill) => {
          const rating = bill.risk_analysis?.rating || "green";
          acc[rating] = (acc[rating] || 0) + 1;
          return acc;
        },
        { green: 0, yellow: 0, red: 0 },
      )
    : { green: 0, yellow: 0, red: 0 };

  const newsCounts = newsData?.articles?.length
    ? newsData.articles.reduce(
        (acc, article) => {
          acc[article.sentiment] = (acc[article.sentiment] || 0) + 1;
          return acc;
        },
        { negative: 0, neutral: 0, positive: 0 },
      )
    : { negative: 0, neutral: 0, positive: 0 };

  const highScrutinyKeywords = {
    water: /\b(water|groundwater|drought|rights|hydrology)\b/i,
    energy: /\b(energy|electric|power|utility|grid|load|demand)\b/i,
    cooling: /\b(cooling|chiller|hvac|thermal|heat)\b/i,
  };

  const billThemes = data?.results?.length
    ? data.results.reduce((acc, bill) => {
        const text = `${bill.title || ""} ${bill.subject?.join(" ") || ""}`;
        Object.entries(highScrutinyKeywords).forEach(([theme, regex]) => {
          if (regex.test(text)) {
            acc[theme] = (acc[theme] || 0) + 1;
          }
        });
        return acc;
      }, {})
    : {};

  const newsThemes = newsData?.articles?.length
    ? newsData.articles.reduce((acc, article) => {
        const text = `${article.title || ""} ${article.description || ""}`;
        Object.entries(highScrutinyKeywords).forEach(([theme, regex]) => {
          if (regex.test(text)) {
            acc[theme] = (acc[theme] || 0) + 1;
          }
        });
        return acc;
      }, {})
    : {};

  const recentBills = data?.results?.length
    ? data.results.filter((bill) => {
        const date = bill.latest_action_date
          ? new Date(bill.latest_action_date)
          : null;
        return date && Date.now() - date.getTime() <= 1000 * 60 * 60 * 24 * 90;
      }).length
    : 0;

  const recentNews = newsData?.articles?.length
    ? newsData.articles.filter((article) => {
        const date = article.publishedAt ? new Date(article.publishedAt) : null;
        return date && Date.now() - date.getTime() <= 1000 * 60 * 60 * 24 * 30;
      }).length
    : 0;

  const billsText = data?.results?.length
    ? `From ${data.results.length} active bills, ${billCounts.red} are high-risk and should be escalated to operations and regulatory teams, ${billCounts.yellow} are medium-risk and require monitoring, and ${billCounts.green} are lower risk. ${recentBills} of these bills have seen action in the last 90 days, indicating recent legislative momentum.`
    : "No bill data available.";

  const newsText = newsData?.articles?.length
    ? `Across ${newsData.articles.length} news articles, ${newsCounts.negative} signal elevated stakeholder concern and reputational risk, ${newsCounts.neutral} provide context, and ${newsCounts.positive} identify potential opportunity narratives. ${recentNews} articles were published in the past 30 days, showing where current attention is concentrated.`
    : "No news sentiment data available.";

  const topBillThemes = Object.entries(billThemes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(
      ([theme, count]) =>
        `${theme.charAt(0).toUpperCase() + theme.slice(1)} (${count})`,
    )
    .join(", ");

  const topNewsThemes = Object.entries(newsThemes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(
      ([theme, count]) =>
        `${theme.charAt(0).toUpperCase() + theme.slice(1)} (${count})`,
    )
    .join(", ");

  const riskHighlights = [];
  if (billCounts.red) {
    riskHighlights.push(
      `High-risk bills: ${billCounts.red} require priority review and executive escalation.`,
    );
  }
  if (billThemes.water || newsThemes.water) {
    riskHighlights.push(
      `Water usage is a key scrutiny area (${billThemes.water || 0} bills, ${newsThemes.water || 0} articles).`,
    );
  }
  if (billThemes.energy || newsThemes.energy) {
    riskHighlights.push(
      `Energy and grid impact are elevated concerns (${billThemes.energy || 0} bills, ${newsThemes.energy || 0} articles).`,
    );
  }
  if (!riskHighlights.length) {
    riskHighlights.push(
      "No immediate water or energy alerts were detected from the current dataset.",
    );
  }

  const actionRecommendations =
    data?.results?.length || newsData?.articles?.length
      ? `Recommend aligning public affairs strategy with water and energy stakeholders, prioritizing regulatory and utility engagement, and preparing risk narratives tied to ${topBillThemes || "key themes"}. Define success by reducing red-risk bill exposure and moving news sentiment toward neutral or positive.`
      : "No actions available without data.";

  summarySection.classList.remove("hidden");
  summary.innerHTML = `
    <div class="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 w-full">
      <p class="font-semibold text-slate-100">Risk Intelligence Highlights</p>
      <ul class="mt-2 space-y-2 text-slate-300 text-sm">
        ${riskHighlights.map((item) => `<li>• ${item}</li>`).join("")}
      </ul>
      <p class="mt-3 text-slate-300"><strong>Recommended focus:</strong> ${actionRecommendations}</p>
    </div>
    <div class="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
      <div class="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
        <p class="font-semibold text-slate-100">Legislative Bills</p>
        <p class="mt-2 text-slate-400">${billsText}</p>
        <p class="mt-3 text-slate-300"><strong>Key bill themes:</strong> ${topBillThemes || "None identified"}</p>
      </div>
      <div class="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
        <p class="font-semibold text-slate-100">News Sentiment</p>
        <p class="mt-2 text-slate-400">${newsText}</p>
        <p class="mt-3 text-slate-300"><strong>Top news themes:</strong> ${topNewsThemes || "None identified"}</p>
      </div>
    </div>
  `;
}

window.addEventListener("load", () => {
  riskFilter?.addEventListener("change", () => {
    if (currentStateData && activeTab === "bills") {
      renderResults(currentStateData);
    }
  });

  stateFilter?.addEventListener("change", (event) => {
    loadStateData(event.target.value);
    loadNewsData(event.target.value);
  });

  billsTab?.addEventListener("click", () => switchTab("bills"));
  newsTab?.addEventListener("click", () => {
    switchTab("news");
    if (!currentNewsData) {
      loadNewsData(stateFilter?.value || "tx");
    }
  });

  const initialState = stateFilter?.value || "tx";
  loadStateData(initialState);
  loadNewsData(initialState);
});
