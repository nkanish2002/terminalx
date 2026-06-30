# Portfolio Manager

A command-line portfolio tracking tool with DCA (Dollar Cost Averaging) support, holdings CSV, and sector allocation analysis.

## Features

- Track holdings across multiple accounts
- DCA schedule enforcement (no ETF overlap)
- Sector allocation visualization
- Performance tracking over time

## Usage

```bash
python3 portfolio-manager.py
```

## Data Sources

- Holdings CSV files
- Yahoo Finance API (free)
- OpenBB (multi-provider)

## Graphs

Here's a sample line chart showing portfolio performance over time:

```graph
{
  "type": "line",
  "title": "Portfolio Growth",
  "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  "datasets": [{
    "label": "Portfolio Value",
    "data": [45000, 47000, 46000, 49000, 51000, 53000, 55000],
    "borderColor": "green",
    "backgroundColor": "rgba(0, 255, 0, 0.1)",
    "tension": 0.4
  }]
}
```

## Screenshots

Portfolio overview with interactive charts.

---

*Built with Python + Textual*
