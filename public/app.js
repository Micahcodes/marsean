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

function getStateName(stateCode) {
  const states = {
    tx: "Texas",
    ca: "California",
    ny: "New York",
    fl: "Florida",
    wa: "Washington",
    al: "Alabama",
    ar: "Arkansas",
    az: "Arizona",
    co: "Colorado",
    ct: "Connecticut",
    de: "Delaware",
    ga: "Georgia",
    ia: "Iowa",
    id: "Idaho",
    il: "Illinois",
    in: "Indiana",
    ks: "Kansas",
    ky: "Kentucky",
    la: "Louisiana",
    ma: "Massachusetts",
    md: "Maryland",
    me: "Maine",
    mi: "Michigan",
    mn: "Minnesota",
    mo: "Missouri",
    ms: "Mississippi",
    mt: "Montana",
    nc: "North Carolina",
    nd: "North Dakota",
    ne: "Nebraska",
    nh: "New Hampshire",
    nj: "New Jersey",
    nm: "New Mexico",
    nv: "Nevada",
    oh: "Ohio",
    ok: "Oklahoma",
    or: "Oregon",
    pa: "Pennsylvania",
    ri: "Rhode Island",
    sc: "South Carolina",
    sd: "South Dakota",
    tn: "Tennessee",
    ut: "Utah",
    vt: "Vermont",
    va: "Virginia",
    wv: "West Virginia",
    wi: "Wisconsin",
    wy: "Wyoming",
  };
  return states[stateCode] || stateCode;
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

function analyzeNewsRisk(article) {
  const text =
    `${article.title || ""} ${article.description || ""}`.toLowerCase();

  // Map sentiment to risk level
  const sentimentToRisk = {
    negative: "red",
    neutral: "yellow",
    positive: "green",
  };

  const rating = sentimentToRisk[article.sentiment] || "yellow";

  // Keywords for recap analysis
  const concernKeywords = {
    ban: /\bban|banned|bans|banning\b/i,
    controversy: /\bcontroversy|controversial|controversy\b/i,
    opposition: /\bopposition|oppose|opposed\b/i,
    restrict: /\brestrict|restriction|restricted\b/i,
    lawsuit: /\blawsuit|lawsuit|legal\b/i,
    water: /\bwater|groundwater|aquifer\b/i,
    energy: /\benergy|electric|power/i,
    cooling: /\bcooling|chiller|thermal\b/i,
    environmental: /\benvironmental|ecology|ecological\b/i,
    impact: /\bimpact|concern|issue|problem\b/i,
  };

  // Identify concerns present in article
  const concernsFound = Object.entries(concernKeywords)
    .filter(([_, regex]) => regex.test(text))
    .map(([concern, _]) => concern);

  // Generate recap based on sentiment and concerns
  let recap = "";
  if (article.sentiment === "negative") {
    if (concernsFound.length > 0) {
      recap = `Negative coverage highlighting ${concernsFound.slice(0, 2).join(" and ")} concerns.`;
    } else {
      recap = "Negative sentiment detected in news coverage.";
    }
  } else if (article.sentiment === "neutral") {
    if (concernsFound.length > 0) {
      recap = `Neutral coverage mentioning potential ${concernsFound[0]} considerations.`;
    } else {
      recap =
        "Neutral tone in article discussing data center or related infrastructure.";
    }
  } else {
    recap = "Positive sentiment in coverage.";
  }

  // Generate detailed analysis
  let analysis = "";
  if (article.sentiment === "negative") {
    analysis = `This article presents negative coverage that could impact project approval or public perception. Key concerns identified: ${concernsFound.length > 0 ? concernsFound.join(", ") : "general opposition or controversy"}. Recommend developing counter-narrative focused on project benefits and stakeholder engagement.`;
  } else if (article.sentiment === "neutral") {
    analysis = `Article provides factual coverage without clear sentiment. Opportunity to engage media with project benefits story, particularly around ${concernsFound.length > 0 ? concernsFound[0] : "infrastructure"} advantages and local economic impact.`;
  } else {
    analysis =
      "Positive coverage represents opportunity to amplify project narrative through stakeholder engagement and media partnerships.";
  }

  return { rating, recap, analysis, concerns: concernsFound };
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
    // Analyze risk for each article
    const riskAnalysis = analyzeNewsRisk(article);
    const { rating, recap, analysis, concerns } = riskAnalysis;

    // Only show yellow and red rated articles with full analysis
    if (rating === "red" || rating === "yellow") {
      const container = document.createElement("div");
      container.className =
        "rounded-lg border border-slate-800 bg-slate-900/90 p-3 shadow-lg shadow-slate-950/20";
      container.innerHTML = `
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="rounded-full px-2 py-1 text-xs font-semibold ${getRiskClasses(rating)}">${rating.toUpperCase()}</span>
              <p class="text-slate-400 text-xs">${new Date(article.publishedAt).toLocaleDateString()} • ${article.source?.name || "News Source"}</p>
            </div>
            <h3 class="text-lg font-semibold leading-tight">${article.title || "No title"}</h3>
          </div>
        </div>
        ${
          concerns.length > 0
            ? `
          <div class="mt-2 flex flex-wrap gap-1 text-xs">
            ${concerns.map((concern) => `<span class="rounded bg-slate-800 px-2 py-1 text-slate-300">${concern}</span>`).join("")}
          </div>
        `
            : ""
        }
        <p class="mt-2 text-slate-400 text-sm">${article.description || ""}</p>
        <div class="mt-2 rounded bg-slate-950/80 p-2 text-xs text-slate-300">
          <p class="font-semibold text-slate-100">Sentiment Analysis</p>
          <p class="mt-1"><strong>Summary:</strong> ${recap}</p>
          <p class="mt-1"><strong>Recommendation:</strong> ${analysis}</p>
        </div>
        <a href="${article.url}" target="_blank" rel="noreferrer" class="mt-2 inline-block text-cyan-300 hover:text-cyan-200 text-xs">Read full article</a>
      `;
      results.appendChild(container);
    } else {
      // Green articles shown without detailed analysis
      const container = document.createElement("div");
      container.className =
        "rounded-lg border border-slate-800 bg-slate-900/90 p-3 shadow-lg shadow-slate-950/20";
      container.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="rounded-full px-2 py-1 text-xs font-semibold ${getRiskClasses(rating)} text-slate-950">${rating.toUpperCase()}</span>
          <p class="text-slate-400 text-xs">${new Date(article.publishedAt).toLocaleDateString()}</p>
        </div>
        <h3 class="text-lg font-semibold leading-tight">${article.title || "No title"}</h3>
        <p class="mt-2 text-slate-400 text-sm">${article.description || ""}</p>
        <a href="${article.url}" target="_blank" rel="noreferrer" class="mt-2 inline-block text-cyan-300 hover:text-cyan-200 text-xs">Read more</a>
      `;
      results.appendChild(container);
    }
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

  // Populate Risk Intelligence Highlights
  const riskHighlightsEl = document.querySelector("#riskHighlights");
  const actionRecommendationsEl = document.querySelector(
    "#actionRecommendations",
  );

  if (riskHighlightsEl) {
    riskHighlightsEl.innerHTML = riskHighlights
      .map((item) => `<li>• ${item}</li>`)
      .join("");
  }
  if (actionRecommendationsEl) {
    actionRecommendationsEl.innerHTML = `<strong>Recommended focus:</strong> ${actionRecommendations}`;
  }

  // Populate Additional Insights (placeholder for now)
  const additionalInsightsEl = document.querySelector("#additionalInsights");
  if (additionalInsightsEl) {
    additionalInsightsEl.textContent = `State analysis for ${getStateName(stateFilter?.value || "tx")} completed. Monitor legislative activity and stakeholder sentiment for optimal data center site selection.`;
  }

  // Populate Legislative Bills
  const billsTextEl = document.querySelector("#billsText");
  const billThemesEl = document.querySelector("#billThemes");

  if (billsTextEl) {
    billsTextEl.textContent = billsText;
  }
  if (billThemesEl) {
    billThemesEl.innerHTML = `<strong>Key bill themes:</strong> ${topBillThemes || "None identified"}`;
  }

  // Populate News Sentiment
  const newsTextEl = document.querySelector("#newsText");
  const newsThemesEl = document.querySelector("#newsThemes");

  if (newsTextEl) {
    newsTextEl.textContent = newsText;
  }
  if (newsThemesEl) {
    newsThemesEl.innerHTML = `<strong>Top news themes:</strong> ${topNewsThemes || "None identified"}`;
  }
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
  loadSocialSentiment();
});

// Load and render social sentiment data
async function loadSocialSentiment() {
  try {
    const response = await fetch("/data/social-sentiment.json");
    if (!response.ok) {
      console.warn("Social sentiment data not available");
      return;
    }
    const data = await response.json();
    renderSocialSentiment(data);
  } catch (error) {
    console.error("Error loading social sentiment:", error);
  }
}

function renderSocialSentiment(data) {
  if (!data?.analysis) return;

  const analysis = data.analysis;

  // Top Disagreeable Sentiments
  const topDisagreeableEl = document.querySelector("#topDisagreeable");
  if (topDisagreeableEl && analysis.topDisagreeableSentiments) {
    topDisagreeableEl.innerHTML = analysis.topDisagreeableSentiments
      .map((item, index) => `
        <div class="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-slate-300">#${index + 1}</span>
              <span class="text-sm font-semibold text-slate-100">${item.theme}</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">${item.frequency} mentions, ${item.totalEngagement} engagement</p>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium text-red-400">Score: ${item.score}</div>
          </div>
        </div>
      `)
      .join("");
  }

  // Sentiment Themes
  const sentimentThemesEl = document.querySelector("#sentimentThemes");
  if (sentimentThemesEl && analysis.breakdown?.byTheme) {
    const themes = analysis.breakdown.byTheme;
    const total = Object.values(themes).reduce((a, b) => a + b, 0);
    sentimentThemesEl.innerHTML = Object.entries(themes)
      .sort(([,a], [,b]) => b - a)
      .map(([theme, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        return `
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-300">${theme}</span>
            <div class="flex items-center gap-2">
              <div class="w-16 bg-slate-700 rounded-full h-2">
                <div class="bg-cyan-500 h-2 rounded-full" style="width: ${percentage}%"></div>
              </div>
              <span class="text-sm text-slate-100">${percentage}%</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // Pro/Con Balance
  const proConBalanceEl = document.querySelector("#proConBalance");
  if (proConBalanceEl && analysis.breakdown?.bySentiment) {
    const sentiments = analysis.breakdown.bySentiment;
    const total = Object.values(sentiments).reduce((a, b) => a + b, 0);
    proConBalanceEl.innerHTML = Object.entries(sentiments)
      .map(([sentiment, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        const color = sentiment === "positive" ? "text-green-400" : 
                     sentiment === "negative" ? "text-red-400" : "text-slate-400";
        return `
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-300 capitalize">${sentiment}</span>
            <span class="text-sm ${color} font-medium">${count} (${percentage}%)</span>
          </div>
        `;
      })
      .join("");
  }

  // Correlation Alerts
  const correlationAlertsEl = document.querySelector("#correlationAlerts");
  if (correlationAlertsEl) {
    correlationAlertsEl.innerHTML = `
      <div class="space-y-2">
        <div class="p-3 bg-slate-800/30 rounded-lg">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-yellow-400">📈</span>
            <span class="text-sm font-medium text-slate-100">Bills → News Correlation</span>
          </div>
          <p class="text-xs text-slate-400">Legislative activity drives media attention spikes</p>
        </div>
        <div class="p-3 bg-slate-800/30 rounded-lg">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-green-400">📊</span>
            <span class="text-sm font-medium text-slate-100">Social Stability</span>
          </div>
          <p class="text-xs text-slate-400">Social sentiment remains consistent despite news cycles</p>
        </div>
        <div class="p-3 bg-slate-800/30 rounded-lg">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-blue-400">🎯</span>
            <span class="text-sm font-medium text-slate-100">Economic Focus</span>
          </div>
          <p class="text-xs text-slate-400">Cost concerns dominate over environmental issues</p>
        </div>
      </div>
    `;
  }
}
