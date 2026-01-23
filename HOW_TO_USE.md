# OPPTRA Business Intelligence - User Guide

## 🎯 Overview

The OPPTRA BI system automatically generates **MBB-style consulting reports** (McKinsey/BCG/Bain) with **fashion e-commerce insights** from your Looker Studio PDF exports.

### Key Features

✅ **MBB-Style Reports** - SCQA framework (Situation-Complication-Question-Answer)
✅ **Fashion-Specific Insights** - Revenue gap analysis, brand performance, profitability
✅ **Automated Analysis** - 35+ metrics extracted automatically from PDFs
✅ **Professional Visualizations** - Executive dashboards, impact charts, action plans

---

## 📁 Adding New PDF Files

### Step 1: Export from Looker Studio

1. Open your Looker Studio dashboard
2. Go to **File > Download > PDF**
3. Save the PDF with a descriptive name (e.g., `23rd-jan.pdf`, `feb-mtd.pdf`)

### Step 2: Add PDF to Data Folder

```bash
# Navigate to your Opptra project
cd /path/to/Opptra

# Copy your new PDF to the data folder
cp ~/Downloads/23rd-jan.pdf ./data/

# Or on Windows
copy C:\Users\YourName\Downloads\23rd-jan.pdf .\data\
```

### Step 3: Generate Reports

```bash
# Run the analysis pipeline
npm run dev -- analyze --pdf ./data/23rd-jan.pdf --output ./reports-final

# The system will:
# ✓ Extract 35+ business metrics
# ✓ Generate 8+ actionable insights
# ✓ Create MBB-style reports
# ✓ Complete in ~600ms
```

### Step 4: View Reports

```bash
# On Windows
start reports-final/report.html

# On macOS
open reports-final/report.html

# On Linux
xdg-open reports-final/report.html
```

---

## 📊 Generated Reports

After running the analysis, you'll get 5 professional reports:

### 1. **report.html** - Main MBB-Style Executive Report 🎯

**Format**: SCQA Framework (Situation-Complication-Question-Answer)

**Sections**:
- **Key Metrics Dashboard**: MTD revenue, gap to target, daily performance
- **SITUATION**: Current business state, portfolio composition
- **COMPLICATION**: Performance gaps, root causes, critical issues
- **QUESTION**: Strategic priorities for short/medium-term
- **ANSWER**: 3-Pillar action plan with impact projections
- **NEXT STEPS**: Immediate action items (48 hours)

**Use Case**: Present to executives, board meetings, strategic reviews

---

### 2. **insights.html** - Detailed Insights Breakdown

**Content**:
- All 8+ fashion-specific insights with full context
- Critical/High/Medium priority classification
- Root cause analysis for each issue
- Specific recommendations with 8-step action plans

**Use Case**: Operational teams, brand managers, channel partners

---

### 3. **action-plan.html** - Prioritized Action Items

**Content**:
- Consolidated action items from all insights
- Priority ranking (Critical → High → Medium → Low)
- Owner assignments, deadlines, dependencies

**Use Case**: Daily standups, sprint planning, task tracking

---

### 4. **timeline.html** - Timeline Visualization

**Content**:
- 10-event timeline of data points over time
- Trend analysis and pattern detection
- Visual chart of performance evolution

**Use Case**: Performance reviews, trend analysis

---

### 5. **consolidated-data.json** - Raw Data Export

**Content**:
- All 35 extracted metrics in structured JSON
- Brand performance, channel data, profitability metrics
- Ready for integration with other systems

**Use Case**: Data exports, API integrations, custom analysis

---

## 🔍 Fashion E-Commerce Insights

The system automatically generates 8 types of fashion-specific insights:

### 1. **MTD Revenue Gap Analysis** (Critical)
- Current MTD vs. target comparison
- Daily requirement to close gap
- Days remaining in month
- **Example**: "Need $7,205/day for 14 days to close $100,864 gap"

### 2. **Brand-Market Performance** (Critical/High)
- Top 3 underperforming brand-country combinations
- Revenue contribution % and impact score
- 8-step action plan per brand:
  - Inventory management
  - Marketing optimization (ROAS >3)
  - Pricing strategy
  - Returns reduction
  - SKU performance
  - Channel prioritization
  - Assortment expansion
  - Catalog improvements

### 3. **Channel Mix Analysis** (Medium)
- Revenue distribution across channels (Namshi, Noon, etc.)
- Weak channel identification (<10% share)
- Specific recommendations for each channel
- Catalog completeness and pricing reviews

### 4. **Gross Margin Analysis** (High)
- Identifies brands with GM 15+ points below average
- Root cause analysis (pricing, COGS, discounting, returns)
- Target improvement roadmap (5-point GM lift in 60 days)

### 5. **Marketing Efficiency** (Medium)
- Compares marketing spend % vs. industry benchmarks
  - Footwear (USPA, CAMPUS): 5.5%
  - Innerwear (Penti): 7.0%
  - Apparel (French Connection): 6.5%
- ROAS optimization recommendations
- Campaign pause criteria (<2.0 ROAS)

### 6. **Portfolio Summary** (High)
- Overall brand performance across all markets
- Top 3 underperformers with gap amounts
- Resource allocation priorities

---

## 🎨 MBB Consulting Framework (SCQA)

### What is SCQA?

SCQA is the storytelling framework used by top consulting firms (McKinsey, BCG, Bain) to structure executive presentations.

### Our Implementation:

**SITUATION** 📊
- "OPPTRA is tracking 16.6% behind January revenue targets mid-month"
- Sets context: $270K MTD revenue, 14 days remaining, $100K gap
- Portfolio overview: 4 brands, 2 markets, 5+ channels

**COMPLICATION** ⚠️
- "Performance gaps concentrated in key revenue drivers requiring $7.2K/day acceleration"
- Identifies 3-5 critical issues with data-backed evidence
- Root causes: inventory constraints, marketing inefficiency, margin issues, channel imbalance

**QUESTION** ❓
- "What immediate actions can close the monthly gap while improving long-term profitability?"
- Frames the dual-horizon strategy (short-term: close gap, medium-term: structural fixes)

**ANSWER** ✅
- "Recommended 3-Pillar Action Plan"
- 5 strategic recommendations with expected impact
- Impact chart showing 65% from brand focus, 15% from marketing, 12% from channels, 8% from SKU management

---

## 🚀 Advanced Usage

### Compare Multiple Time Periods

```bash
# Generate report for Week 1
npm run dev -- analyze --pdf ./data/week1-jan.pdf --output ./reports-week1

# Generate report for Week 2
npm run dev -- analyze --pdf ./data/week2-jan.pdf --output ./reports-week2

# Compare the two report.html files side by side
```

### Batch Processing

```bash
# Process multiple PDFs in sequence
for file in data/*.pdf; do
  filename=$(basename "$file" .pdf)
  npm run dev -- analyze --pdf "$file" --output "./reports-$filename"
done
```

### JSON Export for Custom Analysis

```bash
# Extract just the data, no reports
npm run dev -- extract --pdf ./data/19th-jan.pdf --output data.json

# Use the JSON for custom analysis in Python, R, etc.
```

---

## 📈 Supported Metrics (35 Total)

### Financial Metrics (2)
- MTD Revenue
- Last Day Revenue

### Brand Performance (8)
- 4 Brands × 2 Countries: USPA, CAMPUS, Penti, French Connection in KSA & UAE
- Each with: Revenue, Target, Variance, Variance %

### Channel Performance (5+)
- Namshi, Noon, CP, Amazon_1P, Trendyol
- Revenue and % contribution per channel

### Profitability Metrics (20)
- 4 Brands × 5 Metrics: GM%, MKT%, DC%, IOWC%, CM2%

---

## 🛠️ Troubleshooting

### PDF Not Parsing Correctly

**Issue**: "No data extracted from PDF"

**Solution**:
1. Ensure PDF is from Looker Studio (not manually edited)
2. Check that tables are visible and not images
3. Verify the PDF contains the expected sections (Profitability, Brand Performance, Channel Performance)

### Reports Look Empty

**Issue**: Reports generated but show "N/A" for metrics

**Solution**:
1. Check `consolidated-data.json` to see what was extracted
2. Verify your PDF has the standard Looker Studio format
3. Ensure metrics are labeled consistently (e.g., "MTD Revenue", "GM %")

### Performance Issues

**Issue**: Analysis takes longer than 2 seconds

**Solution**:
1. Check your PDF file size (should be <20MB)
2. Reduce PDF quality when exporting from Looker Studio
3. Ensure Node.js has enough memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run dev`

---

## 🎓 Best Practices

### For Daily Use

1. **Consistent Naming**: Name PDFs with dates (e.g., `23-jan.pdf`, `2026-01-23.pdf`)
2. **Regular Exports**: Export from Looker Studio at the same time daily (e.g., 9 AM)
3. **Archive Reports**: Keep historical reports for trend analysis
4. **Action Tracking**: Use action-plan.html to track progress on recommendations

### For Presentations

1. **Executive Summary**: Use the main `report.html` (5-minute read)
2. **Deep Dives**: Have `insights.html` ready for detailed questions
3. **Print-Friendly**: Reports are optimized for printing and PDF conversion
4. **Data Backup**: Keep `consolidated-data.json` for reference

### For Team Collaboration

1. **Share Reports**: Email or Slack the HTML files (self-contained, no dependencies)
2. **Action Items**: Export action-plan.html to project management tools
3. **Weekly Reviews**: Compare week-over-week reports to track progress
4. **Feedback Loop**: Use insights to adjust marketing, inventory, and pricing strategies

---

## 📞 Support

For issues or feature requests:
- **GitHub**: Create an issue at your repository
- **Email**: Contact your BI team
- **Docs**: Check the codebase README for technical details

---

## 🎉 Quick Start Checklist

- [ ] Clone/pull latest code from GitHub
- [ ] Run `npm install` to install dependencies
- [ ] Export your latest Looker Studio report as PDF
- [ ] Copy PDF to `./data/` folder
- [ ] Run `npm run dev -- analyze --pdf ./data/your-file.pdf --output ./reports-final`
- [ ] Open `reports-final/report.html` in your browser
- [ ] Review the SCQA-structured MBB report
- [ ] Share action items with your team
- [ ] Track progress and repeat daily/weekly

---

**Built with ❤️ for OPPTRA Fashion Group**
