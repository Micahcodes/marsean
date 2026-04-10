import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import { getTexasBills } from "./index.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const publicDir = path.join(__dirname, "../public");
const dataDir = path.join(__dirname, "../data");

function getStateName(stateCode) {
  const states = {
    tx: "Texas",
    ca: "California",
    ny: "New York",
    fl: "Florida",
    wa: "Washington",
    // Add more as needed
  };
  return states[stateCode] || stateCode;
}

function analyzeSentiment(text) {
  const positiveWords =
    /\b(benefit|growth|expansion|investment|job|positive|good|success|advantage)\b/gi;
  const negativeWords =
    /\b(controversy|ban|restrict|protest|lawsuit|opposition|environmental|water|power|shortage|outage|impact|problem|issue|concern|risk|threat|damage|harm|criticism|complaint)\b/gi;
  const posCount = (text.match(positiveWords) || []).length;
  const negCount = (text.match(negativeWords) || []).length;
  if (negCount > posCount) return "negative";
  if (posCount > negCount) return "positive";
  return "neutral";
}

app.use(express.static(publicDir));
app.use("/data", express.static(dataDir));

app.get("/api/search-bills", async (req, res) => {
  try {
    const result = await getTexasBills();
    await fs.writeFile(
      path.join(dataDir, "texas-bills.json"),
      JSON.stringify(result, null, 2),
    );
    res.json(result);
  } catch (error) {
    console.error("search-bills error:", error);
    res.status(500).json({ message: error.message || "Unable to fetch bills" });
  }
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
  try {
    const state = req.query.state || "tx";
    const stateName = getStateName(state);
    const apiKey = process.env.NEWS_API_KEY;
    const url = `https://newsapi.org/v2/everything?q=data center ${stateName} (controversy OR ban OR restrict OR protest OR lawsuit OR opposition OR environmental OR water OR power)&pageSize=25&apiKey=${apiKey}`;
    const response = await axios.get(url);
    const data = response.data;
    // Analyze sentiment for each article
    if (data.articles) {
      data.articles.forEach((article) => {
        const text = (article.title || "") + " " + (article.description || "");
        article.sentiment = analyzeSentiment(text);
      });
    }
    // Store the data
    await fs.writeFile(
      path.join(dataDir, `news-${state}.json`),
      JSON.stringify(data, null, 2),
    );
    res.json(data);
  } catch (error) {
    console.error("news error:", error);
    res.status(500).json({ message: error.message || "Unable to fetch news" });
  }
});

function getTwitterApiKey() {
  return process.env.TWITTER_API_KEY || process.env.X_API_KEY;
}

app.get("/api/x-sentiment", async (req, res) => {
  try {
    const state = req.query.state || "tx";
    const apiKey = getTwitterApiKey();
    if (!apiKey) {
      return res.status(501).json({
        message:
          "Twitter/X API key not configured. Set TWITTER_API_KEY or X_API_KEY in .env to enable social sentiment integration.",
      });
    }

    // Future implementation: call Twitter/X API v2 or v3 to fetch tweets, filter by region/keywords,
    // and run sentiment analysis. This scaffold is ready for the next phase.
    return res.status(501).json({
      message:
        "Twitter/X integration is scaffolded but not yet implemented. API key is configured.",
    });
  } catch (error) {
    console.error("x-sentiment error:", error);
    res
      .status(500)
      .json({ message: error.message || "Unable to fetch X sentiment" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Dashboard server running at http://localhost:${port}`);
});
