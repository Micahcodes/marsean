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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Dashboard server running at http://localhost:${port}`);
});
