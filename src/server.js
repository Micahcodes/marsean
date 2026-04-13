import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const publicDir = path.join(__dirname, "../public");
const dataDir = path.join(__dirname, "../data");

app.use(express.static(publicDir));
app.use("/data", express.static(dataDir));

const COLLECTION_DISABLED_MESSAGE =
  "Live data collection is disabled for this project. Use existing files in /data for analysis and UI work.";

app.get("/api/search-bills", async (req, res) => {
  res.status(410).json({ message: COLLECTION_DISABLED_MESSAGE });
});

app.get("/api/stored-bills", async (req, res) => {
  try {
    const stored = await fs.readFile(
      path.join(dataDir, "texas-bills.json"),
      "utf8",
    );
    res.type("application/json").send(stored);
  } catch (error) {
    res.status(404).json({ message: "No stored bills found yet." });
  }
});

app.get("/api/news", async (req, res) => {
  res.status(410).json({ message: COLLECTION_DISABLED_MESSAGE });
});

app.get("/api/x-sentiment", async (req, res) => {
  res.status(410).json({ message: COLLECTION_DISABLED_MESSAGE });
});

function getStateCodeFromFilename(fileName) {
  if (fileName === "texas-bills.json") {
    return "tx";
  }
  return fileName.replace("-bills.json", "");
}

function getStateLabel(stateCode) {
  const states = {
    tx: "Texas",
    al: "Alabama",
    ar: "Arkansas",
    az: "Arizona",
    ca: "California",
    co: "Colorado",
    ct: "Connecticut",
    de: "Delaware",
    fl: "Florida",
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
    ny: "New York",
    oh: "Ohio",
    ok: "Oklahoma",
    or: "Oregon",
    pa: "Pennsylvania",
    ri: "Rhode Island",
    sc: "South Carolina",
    sd: "South Dakota",
    tn: "Tennessee",
    ut: "Utah",
    va: "Virginia",
    vt: "Vermont",
    wa: "Washington",
    wi: "Wisconsin",
    wv: "West Virginia",
    wy: "Wyoming",
  };
  return states[stateCode] || stateCode.toUpperCase();
}

app.get("/api/national-legislation-summary", async (req, res) => {
  try {
    const files = await fs.readdir(dataDir);
    const billFiles = files.filter(
      (fileName) =>
        fileName.endsWith("-bills.json") || fileName === "texas-bills.json",
    );

    const ratingTotals = { red: 0, yellow: 0, green: 0 };
    const themeTotals = {
      water: 0,
      energy: 0,
      tax: 0,
      zoning: 0,
      environment: 0,
    };
    const stateStats = [];
    let totalBills = 0;

    for (const fileName of billFiles) {
      const raw = await fs.readFile(path.join(dataDir, fileName), "utf8");
      const parsed = JSON.parse(raw);
      const bills = Array.isArray(parsed?.results) ? parsed.results : [];

      if (!bills.length) {
        continue;
      }

      const stateCode = getStateCodeFromFilename(fileName);
      const stateName = getStateLabel(stateCode);
      const stateCounts = { red: 0, yellow: 0, green: 0 };

      bills.forEach((bill) => {
        const rating = bill?.risk_analysis?.rating || "green";
        if (ratingTotals[rating] !== undefined) {
          ratingTotals[rating] += 1;
          stateCounts[rating] += 1;
        } else {
          ratingTotals.green += 1;
          stateCounts.green += 1;
        }

        const text =
          `${bill?.title || ""} ${(bill?.subject || []).join(" ")}`.toLowerCase();
        if (/\bwater|groundwater|drought|aquifer\b/i.test(text))
          themeTotals.water += 1;
        if (/\benergy|electric|grid|power|utility\b/i.test(text))
          themeTotals.energy += 1;
        if (/\btax|incentive|exemption|revenue\b/i.test(text))
          themeTotals.tax += 1;
        if (/\bzoning|land use|permitting|permit|site\b/i.test(text))
          themeTotals.zoning += 1;
        if (/\benvironment|emission|pollution|climate|sustain\b/i.test(text))
          themeTotals.environment += 1;
      });

      totalBills += bills.length;
      stateStats.push({
        stateCode,
        stateName,
        totalBills: bills.length,
        ...stateCounts,
      });
    }

    const statesAnalyzed = stateStats.length;
    const highRiskShare = totalBills
      ? ((ratingTotals.red / totalBills) * 100).toFixed(1)
      : "0.0";

    const topThemes = Object.entries(themeTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme, count]) => ({
        theme,
        count,
      }));

    const topStatesByVolume = [...stateStats]
      .sort((a, b) => b.totalBills - a.totalBills)
      .slice(0, 5);

    const topStatesByRedRisk = [...stateStats]
      .sort((a, b) => b.red - a.red)
      .slice(0, 5);

    const topVolumeState = topStatesByVolume[0];
    const topRiskState = topStatesByRedRisk[0];

    const insights = [
      `${totalBills} active bills tracked across ${statesAnalyzed} states.`,
      `${ratingTotals.red} bills are red-risk (${highRiskShare}% of nationwide volume).`,
      `Top legislative pressure themes: ${topThemes.map((item) => `${item.theme} (${item.count})`).join(", ") || "none"}.`,
      `Highest bill volume: ${topVolumeState ? `${topVolumeState.stateName} (${topVolumeState.totalBills})` : "N/A"}; highest red-risk concentration: ${topRiskState ? `${topRiskState.stateName} (${topRiskState.red})` : "N/A"}.`,
    ];

    res.json({
      overview: {
        totalBills,
        statesAnalyzed,
        red: ratingTotals.red,
        yellow: ratingTotals.yellow,
        green: ratingTotals.green,
        highRiskShare,
      },
      topThemes,
      topStatesByVolume,
      topStatesByRedRisk,
      insights,
    });
  } catch (error) {
    console.error("national-legislation-summary error:", error);
    res
      .status(500)
      .json({ message: "Unable to compute national legislation summary" });
  }
});

app.get("/api/national-news-summary", async (req, res) => {
  try {
    const files = await fs.readdir(dataDir);
    const newsFiles = files.filter(
      (fileName) => fileName.startsWith("news-") && fileName.endsWith(".json"),
    );

    const sentimentTotals = { negative: 0, neutral: 0, positive: 0 };
    const themeTotals = {
      energy: 0,
      water: 0,
      taxPolicy: 0,
      community: 0,
      environment: 0,
    };

    const stateStats = [];
    let totalArticles = 0;
    let recentArticles = 0;

    for (const fileName of newsFiles) {
      const raw = await fs.readFile(path.join(dataDir, fileName), "utf8");
      const parsed = JSON.parse(raw);
      const articles = Array.isArray(parsed?.articles) ? parsed.articles : [];

      if (!articles.length) {
        continue;
      }

      const stateCode = fileName.replace("news-", "").replace(".json", "");
      const stateName = getStateLabel(stateCode);
      const stateCounts = { negative: 0, neutral: 0, positive: 0 };

      articles.forEach((article) => {
        const sentiment = article?.sentiment || "neutral";
        const normalizedSentiment =
          sentiment === "negative" ||
          sentiment === "positive" ||
          sentiment === "neutral"
            ? sentiment
            : "neutral";

        sentimentTotals[normalizedSentiment] += 1;
        stateCounts[normalizedSentiment] += 1;

        const text =
          `${article?.title || ""} ${article?.description || ""}`.toLowerCase();
        if (/\benergy|electric|power|grid|utility\b/i.test(text))
          themeTotals.energy += 1;
        if (/\bwater|drought|aquifer|groundwater\b/i.test(text))
          themeTotals.water += 1;
        if (/\btax|incentive|exemption|policy|regulation|law\b/i.test(text))
          themeTotals.taxPolicy += 1;
        if (/\bcommunity|local|resident|opposition|protest\b/i.test(text))
          themeTotals.community += 1;
        if (/\benvironment|climate|emission|pollution|sustain\b/i.test(text))
          themeTotals.environment += 1;

        if (article?.publishedAt) {
          const publishedAt = new Date(article.publishedAt);
          if (!Number.isNaN(publishedAt.getTime())) {
            const ageMs = Date.now() - publishedAt.getTime();
            if (ageMs <= 1000 * 60 * 60 * 24 * 30) {
              recentArticles += 1;
            }
          }
        }
      });

      totalArticles += articles.length;
      stateStats.push({
        stateCode,
        stateName,
        totalArticles: articles.length,
        ...stateCounts,
      });
    }

    const statesAnalyzed = stateStats.length;
    const riskShare = totalArticles
      ? ((sentimentTotals.negative / totalArticles) * 100).toFixed(1)
      : "0.0";

    const topThemes = Object.entries(themeTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme, count]) => ({ theme, count }));

    const topStatesByVolume = [...stateStats]
      .sort((a, b) => b.totalArticles - a.totalArticles)
      .slice(0, 5);

    const topStatesByNegative = [...stateStats]
      .sort((a, b) => b.negative - a.negative)
      .slice(0, 5);

    const topVolumeState = topStatesByVolume[0];
    const topNegativeState = topStatesByNegative[0];

    const insights = [
      `${totalArticles} news articles synthesized across ${statesAnalyzed} states.`,
      `${sentimentTotals.negative} negative articles (${riskShare}% of coverage) vs ${sentimentTotals.positive} positive and ${sentimentTotals.neutral} neutral.`,
      `Top national media themes: ${topThemes.map((item) => `${item.theme} (${item.count})`).join(", ") || "none"}.`,
      `Highest coverage volume: ${topVolumeState ? `${topVolumeState.stateName} (${topVolumeState.totalArticles})` : "N/A"}; highest negative count: ${topNegativeState ? `${topNegativeState.stateName} (${topNegativeState.negative})` : "N/A"}.`,
    ];

    res.json({
      overview: {
        totalArticles,
        statesAnalyzed,
        negative: sentimentTotals.negative,
        neutral: sentimentTotals.neutral,
        positive: sentimentTotals.positive,
        recentArticles,
        negativeShare: riskShare,
      },
      topThemes,
      topStatesByVolume,
      topStatesByNegative,
      insights,
    });
  } catch (error) {
    console.error("national-news-summary error:", error);
    res
      .status(500)
      .json({ message: "Unable to compute national news summary" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Dashboard server running at http://localhost:${port}`);
});
