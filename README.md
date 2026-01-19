# Opptra Business Intelligence Automation

> End-to-end automation for data consolidation, analysis, and reporting from multiple business data sources.

## Overview

Opptra is a comprehensive Business Intelligence automation system that:

1. **Extracts** data from multiple sources (PDF reports, Looker Studio, web pages)
2. **Consolidates** and normalizes data into a unified format
3. **Analyzes** data to generate actionable insights using statistical methods
4. **Creates** timeline visualizations and action plans for business teams
5. **Generates** comprehensive dashboards and reports

## Features

### Data Extraction
- **PDF Reports**: Extract metrics, tables, and key data points from business reports
- **Looker Studio**: Connect to Looker Studio dashboards via BigQuery or Google Sheets
- **Web Scraping**: Extract data from web pages and APIs
- **Extensible**: Easy to add new data sources

### Analytics & Insights
- **Trend Detection**: Identify upward/downward trends using linear regression
- **Anomaly Detection**: Detect outliers using statistical methods (z-score)
- **Correlation Analysis**: Find relationships between metrics
- **Comparative Analysis**: Month-over-month, quarter-over-quarter comparisons
- **Confidence Scoring**: Each insight includes a confidence score

### Action Planning
- **Automated Action Items**: Generate actionable recommendations based on insights
- **Priority Classification**: Critical, High, Medium, Low priorities
- **Timeline Planning**: Automatic due dates and effort estimates
- **Dependency Tracking**: Identify action dependencies

### Visualization & Reporting
- **Timeline View**: Visual timeline of events, insights, and actions
- **HTML Reports**: Beautiful, interactive HTML reports
- **Multiple Formats**: Export to HTML, JSON, PDF, Markdown
- **Dashboard**: Interactive web dashboard (coming soon)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/opptra.git
cd opptra

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Build the project
npm run build
```

## Quick Start

### Initialize Configuration

```bash
npm run dev init
```

This creates an `opptra.config.json` file with default settings.

### Run Analysis

**Analyze PDF Reports:**

```bash
npm run dev analyze --pdf ./data/q1-report.pdf --pdf ./data/q2-report.pdf
```

**Analyze Web Data:**

```bash
npm run dev analyze --web https://example.com/metrics
```

**Analyze Looker Studio Data:**

```bash
npm run dev analyze --looker your-report-id
```

**Multiple Sources:**

```bash
npm run dev analyze \\
  --pdf ./data/internal-report.pdf \\
  --web https://example.com/public-metrics \\
  --looker your-looker-id \\
  --output ./reports
```

### View Results

After running analysis, open the generated HTML report:

```bash
open ./output/report.html
```

## CLI Commands

### `opptra analyze`

Run full analysis pipeline with extraction, consolidation, and reporting.

**Options:**
- `--pdf <paths...>` - PDF file paths to analyze
- `--web <urls...>` - Web URLs to scrape
- `--looker <id>` - Looker Studio report or dataset ID
- `-o, --output <dir>` - Output directory (default: `./output`)
- `--format <type>` - Output format: html, json, pdf, markdown (default: `html`)

**Example:**

```bash
opptra analyze \\
  --pdf ./reports/sales.pdf \\
  --web https://analytics.example.com \\
  --output ./results \\
  --format html
```

### `opptra extract`

Extract data from a single source without analysis.

**Options:**
- `--pdf <path>` - PDF file path
- `--web <url>` - Web URL
- `-o, --output <file>` - Output JSON file

**Example:**

```bash
opptra extract --pdf ./report.pdf --output data.json
```

### `opptra init`

Initialize Opptra configuration file.

```bash
opptra init
```

### `opptra dashboard`

Start interactive web dashboard (coming soon).

```bash
opptra dashboard --port 3000
```

## Architecture

```
opptra/
├── src/
│   ├── extractors/           # Data extraction modules
│   │   ├── pdf-extractor.ts
│   │   ├── web-scraper.ts
│   │   └── looker-studio-connector.ts
│   ├── consolidators/        # Data consolidation
│   │   └── data-consolidator.ts
│   ├── analyzers/            # Analytics and insights
│   │   └── insight-generator.ts
│   ├── generators/           # Report generators
│   │   ├── action-plan-generator.ts
│   │   └── timeline-generator.ts
│   ├── cli/                  # CLI interface
│   │   └── index.ts
│   ├── core/                 # Core orchestration
│   │   └── orchestrator.ts
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   └── utils/                # Utilities
│       ├── helpers.ts
│       └── logger.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

Edit `opptra.config.json`:

```json
{
  "dataSources": [],
  "analysisConfig": {
    "enableTrendDetection": true,
    "enableAnomalyDetection": true,
    "enablePredictions": false,
    "confidenceThreshold": 0.6
  },
  "outputConfig": {
    "outputDir": "./output",
    "defaultFormat": "html",
    "includeRawData": false
  }
}
```

## Environment Variables

See `.env.example` for all available environment variables.

**Required for Looker Studio:**
- `GOOGLE_CLIENT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Service account private key
- `BIGQUERY_PROJECT_ID` - BigQuery project ID

## Use Cases

### Business Performance Analysis
- Consolidate data from quarterly reports, web analytics, and BI tools
- Identify trends in key metrics (revenue, growth, customer acquisition)
- Generate actionable recommendations for business teams

### Marketing Analytics
- Analyze campaign performance from multiple sources
- Detect anomalies in traffic or conversion rates
- Correlate marketing spend with business outcomes

### Operations Monitoring
- Track operational metrics from various systems
- Identify bottlenecks and inefficiencies
- Create action plans for process improvements

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build

# Run built version
npm start

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

## Examples

See the `examples/` directory for sample data and configurations (coming soon).

## Roadmap

- [ ] Interactive web dashboard
- [ ] Real-time data streaming
- [ ] Machine learning predictions
- [ ] Email/Slack notifications
- [ ] Scheduled analysis runs
- [ ] More data source connectors (Salesforce, HubSpot, etc.)
- [ ] Custom visualization templates
- [ ] Collaboration features

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/opptra/issues
- Documentation: https://docs.opptra.io (coming soon)

---

**Built with ❤️ for data-driven business teams**
