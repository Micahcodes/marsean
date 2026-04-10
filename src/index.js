import dotenv from "dotenv";
import { fetchApiData } from "./apiIngest.js";
import { analyzeRecords } from "./analysis.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

dotenv.config();

const apiKey = process.env.OPENSTATES_API_KEY;
const apiLimit = Number(process.env.QUERY_LIMIT || "10");
const OPENSTATES_BASE =
  process.env.OPENSTATES_URL || "https://v3.openstates.org";
const TEXAS_JURISDICTION = "ocd-jurisdiction/country:us/state:tx/government";

if (!apiKey) {
  console.error("Missing OPENSTATES_API_KEY in .env file.");
  process.exit(1);
}

export function getJurisdiction(stateCode) {
  return `ocd-jurisdiction/country:us/state:${stateCode}/government`;
}

export async function fetchBills(options = {}) {
  const {
    jurisdiction = TEXAS_JURISDICTION,
    q = "energy OR data center OR water",
    page_size = 10,
  } = options;

  return fetchApiData(
    `${OPENSTATES_BASE}/bills`,
    { jurisdiction, q, page_size },
    { "X-API-KEY": apiKey },
  );
}

export async function getStateBills(
  stateCode,
  query = "data center OR electricity OR electric OR cooling OR water rights OR utility",
) {
  const jurisdiction = getJurisdiction(stateCode);
  const data = await fetchBills({
    jurisdiction,
    q: query,
    page_size: apiLimit,
  });
  return data;
}

export async function getTexasBills() {
  return getStateBills("tx");
}

async function run() {
  const allStates = [
    "al",
    "ar",
    "az",
    "ca",
    "co",
    "ct",
    "de",
    "fl",
    "ga",
    "ia",
    "id",
    "il",
    "in",
    "ks",
    "ky",
    "la",
    "ma",
    "md",
    "me",
    "mi",
    "mn",
    "mo",
    "ms",
    "mt",
    "nc",
    "nd",
    "ne",
    "nh",
    "nj",
    "nm",
    "nv",
    "ny",
    "oh",
    "ok",
    "or",
    "pa",
    "ri",
    "sc",
    "sd",
    "tn",
    "ut",
    "vt",
    "va",
    "wa",
    "wv",
    "wi",
    "wy",
  ];

  const states = allStates.filter((state) => {
    const filePath = path.join(__dirname, "..", "data", `${state}-bills.json`);
    return !fs.existsSync(filePath);
  });

  if (states.length === 0) {
    console.log("All state bill files are already present. No fetch needed.");
    return;
  }

  for (const state of states) {
    try {
      console.log(`Fetching bills for ${state}...`);
      const data = await getStateBills(state);
      const filePath = path.join(
        __dirname,
        "..",
        "data",
        `${state}-bills.json`,
      );
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(
        `Saved ${data.results?.length || 0} bills for ${state} to ${filePath}`,
      );

      // Add delay to respect rate limits (5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`Failed to fetch for ${state}:`, error.message);
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isMain = process.argv[1] === __filename;

if (isMain) {
  run();
}
