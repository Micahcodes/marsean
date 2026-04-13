import axios from "axios";

const X_API_BASE = "https://api.x.com/2";

// Sentiment themes with keywords for classification
const sentimentThemes = {
  ECONOMIC: [
    "jobs",
    "wages",
    "cost",
    "price",
    "inflation",
    "property",
    "value",
    "economy",
    "business",
    "energy",
    "electricity",
    "power",
    "water",
    "rates",
    "bills",
    "afford",
    "expense",
    "financial",
  ],
  ENVIRONMENTAL: [
    "carbon",
    "emissions",
    "climate",
    "pollution",
    "waste",
    "sustainability",
    "renewable",
  ],
  COMMUNITY: [
    "gentrification",
    "displacement",
    "infrastructure",
    "traffic",
    "density",
    "sprawl",
    "local",
    "residents",
    "community",
    "neighborhood",
  ],
  SECURITY_PRIVACY: [
    "surveillance",
    "data",
    "privacy",
    "security",
    "regulation",
  ],
};

// Define search queries with their focus areas
const searchQueries = [
  {
    query: "data center electricity costs OR data center power bills",
    focus: "Energy cost concerns",
    maxResults: 100,
  },
  {
    query: "data center water usage OR data center drought",
    focus: "Water usage concerns",
    maxResults: 100,
  },
  {
    query: "data center jobs OR data center employment",
    focus: "Economic/Employment impacts",
    maxResults: 100,
  },
  {
    query: "data center community opposition OR data center protest",
    focus: "Community opposition",
    maxResults: 100,
  },
  {
    query: "Microsoft data center Sweden canceled OR Gävle data center",
    focus: "Microsoft Sweden project sentiment",
    maxResults: 50,
  },
  {
    query: "Meta data center Ohio canceled OR New Albany data center",
    focus: "Meta Ohio project sentiment",
    maxResults: 50,
  },
  {
    query: "Amazon data center Virginia paused OR Prince William data center",
    focus: "Amazon Virginia project sentiment",
    maxResults: 50,
  },
];

function classifyThemes(text) {
  const themes = [];
  const lowerText = text.toLowerCase();

  for (const [theme, keywords] of Object.entries(sentimentThemes)) {
    if (keywords.some((kw) => lowerText.includes(kw.toLowerCase()))) {
      themes.push(theme);
    }
  }

  return themes.length > 0 ? themes : ["GENERAL"];
}

function analyzeSentiment(text) {
  const positiveWords =
    /\b(benefit|growth|expansion|investment|job|opportunity|good|success|advantage|progress|innovation|efficient|improve|boost|create|prosper)\b/gi;
  const negativeWords =
    /\b(concern|problem|issue|crisis|risk|threat|damage|harm|opposition|protest|ban|restrict|contro|costly|expensive|shortage|waste|pollution|environmental|controversy|lawsuit)\b/gi;

  const posCount = (text.match(positiveWords) || []).length;
  const negCount = (text.match(negativeWords) || []).length;

  if (negCount > posCount) return "negative";
  if (posCount > negCount) return "positive";
  return "neutral";
}

function calculateSentimentScore(tweet) {
  // Engagement scoring: normalize by typical tweet engagement
  const engagementScore =
    (tweet.public_metrics.retweet_count +
      tweet.public_metrics.like_count +
      tweet.public_metrics.reply_count) /
    100;

  // Credibility boost for verified authors
  const credibilityBoost = tweet.author?.verified ? 1.5 : 1.0;

  // Sentiment intensity: count negative words for weighted sentiment
  const negativeWords =
    tweet.text.match(
      /concern|problem|issue|crisis|risk|threat|damage|costly|expensive|pollution|controversy/gi,
    ) || [];
  const negativeIntensity = Math.min(negativeWords.length / 3, 1);

  return (engagementScore * credibilityBoost + negativeIntensity) / 2;
}

export async function fetchXSentiment(bearerToken, options = {}) {
  try {
    if (!bearerToken) {
      throw new Error("X Bearer token not configured");
    }

    const allTweets = [];
    const headers = {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "v2RecentTweetLookup",
    };

    // Query parameters for tweets/search/recent endpoint
    const tweetFields =
      "created_at,public_metrics,author_id,conversation_id,lang";
    const userFields = "username,verified,public_metrics";
    const expansions = "author_id";

    console.log("🔄 Fetching X sentiment data (30-day lookback)...\n");

    for (const queryConfig of searchQueries) {
      try {
        console.log(`  Querying: "${queryConfig.focus}"`);

        const params = {
          query: `${queryConfig.query} -is:retweet lang:en -is:reply`,
          max_results: queryConfig.maxResults,
          "tweet.fields": tweetFields,
          "user.fields": userFields,
          expansions: expansions,
        };

        const response = await axios.get(`${X_API_BASE}/tweets/search/recent`, {
          headers,
          params,
        });

        if (response.data.data) {
          // Enrich tweets with author data
          const authorMap = {};
          if (response.data.includes?.users) {
            response.data.includes.users.forEach((user) => {
              authorMap[user.id] = user;
            });
          }

          const enrichedTweets = response.data.data.map((tweet) => ({
            ...tweet,
            author: authorMap[tweet.author_id] || null,
            theme: classifyThemes(tweet.text),
            sentiment: analyzeSentiment(tweet.text),
            sentimentScore: calculateSentimentScore({
              ...tweet,
              author: authorMap[tweet.author_id],
            }),
            query_focus: queryConfig.focus,
          }));

          allTweets.push(...enrichedTweets);
          console.log(
            `    ✓ Found ${enrichedTweets.length} tweets (cost: ~$${(enrichedTweets.length * 0.005).toFixed(2)})`,
          );
        }
      } catch (error) {
        if (error.response?.status === 429) {
          console.warn(`    ⚠ Rate limited. Skipping this query.`);
        } else {
          console.error(
            `    ✗ Query failed: ${error.response?.data?.detail || error.message}`,
          );
        }
      }
    }

    console.log(
      `\n✓ Total tweets collected: ${allTweets.length} (estimated cost: ~$${(allTweets.length * 0.005).toFixed(2)})\n`,
    );

    return {
      tweets: allTweets,
      metadata: {
        collectedAt: new Date().toISOString(),
        totalTweets: allTweets.length,
        estimatedCost: (allTweets.length * 0.005).toFixed(2),
        queries: searchQueries.length,
      },
    };
  } catch (error) {
    console.error("X sentiment fetch error:", error.message);
    throw error;
  }
}

export function computeTopSentiments(tweets) {
  const sentimentMap = {};

  tweets.forEach((tweet) => {
    // Create a unique key for each sentiment + theme combination
    const themes = tweet.theme || ["GENERAL"];
    themes.forEach((theme) => {
      const key = `${theme}:${tweet.sentiment}`;

      if (!sentimentMap[key]) {
        sentimentMap[key] = {
          theme,
          sentiment: tweet.sentiment,
          frequency: 0,
          totalEngagement: 0,
          credibleMentions: 0,
          samples: [],
          avgScore: 0,
          scores: [],
        };
      }

      sentimentMap[key].frequency += 1;
      sentimentMap[key].totalEngagement +=
        tweet.public_metrics.retweet_count +
        tweet.public_metrics.like_count +
        tweet.public_metrics.reply_count;
      sentimentMap[key].scores.push(tweet.sentimentScore);
      if (tweet.author?.verified) sentimentMap[key].credibleMentions += 1;

      // Store sample tweets for reference (limit to 2 per sentiment)
      if (sentimentMap[key].samples.length < 2) {
        sentimentMap[key].samples.push({
          text: tweet.text,
          author: tweet.author?.username || "unknown",
          engagement: {
            retweets: tweet.public_metrics.retweet_count,
            likes: tweet.public_metrics.like_count,
            replies: tweet.public_metrics.reply_count,
          },
          url: `https://x.com/i/web/status/${tweet.id}`,
        });
      }
    });
  });

  // Compute aggregate scores
  Object.values(sentimentMap).forEach((entry) => {
    entry.avgScore =
      entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
    delete entry.scores; // Remove raw scores array
  });

  // Score by: frequency (0.4) + engagement (0.4) + credibility (0.2)
  const scored = Object.values(sentimentMap).map((entry) => {
    const maxEngagement = Math.max(
      ...Object.values(sentimentMap).map((e) => e.totalEngagement),
    );
    const engagementNorm =
      maxEngagement > 0 ? entry.totalEngagement / maxEngagement : 0;
    const credibilityBoost = entry.credibleMentions / entry.frequency;

    entry.score =
      entry.frequency * 0.4 +
      engagementNorm * 100 * 0.4 +
      credibilityBoost * 100 * 0.2;

    return entry;
  });

  // Sort and return top 5 disagreeable sentiments
  const topDisagreeable = scored
    .filter((s) => s.sentiment === "negative")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    topDisagreeableSentiments: topDisagreeable,
    totalAnalyzed: tweets.length,
    breakdown: {
      byTheme: Object.fromEntries(
        Object.entries(
          Object.values(sentimentMap).reduce((acc, entry) => {
            acc[entry.theme] = (acc[entry.theme] || 0) + entry.frequency;
            return acc;
          }, {}),
        ).sort((a, b) => b[1] - a[1]),
      ),
      bySentiment: Object.fromEntries(
        Object.entries(
          Object.values(sentimentMap).reduce((acc, entry) => {
            acc[entry.sentiment] =
              (acc[entry.sentiment] || 0) + entry.frequency;
            return acc;
          }, {}),
        ).sort((a, b) => b[1] - a[1]),
      ),
    },
  };
}
