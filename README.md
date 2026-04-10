# MarSean

**MarSean** (pronounced "martian"): Data center site suitability analysis using legislation and news sentiment.

MarSean ingests all state house and senate legislative bills as well as local news sentiment across the USA to provide a risk intelligence hub for Data Center Infrastructure Deployment professionals. The AI-tailored synopsis focuses on the key issues driving sentiment and provides a suggested public affairs go-to-market playbook.

Created as a learning opportunity and project to demonstrate technical understanding that mirrors the functions in a job description I hope to be consider for.

## Getting Started

1. Install dependencies: `npm install`
2. Create `.env` with API configuration (see `.env.example`)
3. Add your own API keys for Openstate.org, newsapi.com, and x.ai into the env folder
4. Run the dashboard: `npm start`
5. Open `http://localhost:3000`

## Usage

### Dashboard

The dashboard provides:

- **Risk Intelligence Highlights** - Priority water/energy/cooling concerns across selected state
- **Legislative Bills** - Curated state bills related to data centers, utilities, and regulation
- **News Sentiment** - Local news articles and sentiment analysis for controversy/opportunity identification
- **State Selector** - Compare legislative and news sentiment across all 50 states
- **Risk Filtering** - Filter results by red/yellow/green risk ratings

### CLI

If you want to run the original analysis script:

```bash
npm run cli
```

This fetches and stores bill data for all 50 states to `data/{state}-bills.json`.

## Future Expansion

- Social media sentiment analysis (Twitter/X integration scaffolded)
- Interactive heatmap of critical risk areas
- Regional trend analysis
