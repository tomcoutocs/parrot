# Metrics Cache Setup Guide

This document explains how to set up the API metrics caching system to reduce API calls and improve performance.

## Overview

The metrics cache system stores the last 30 days of API data (Google Ads, Meta Ads, Shopify) in the database. Reports read from the cache instead of calling external APIs directly, significantly reducing API usage and improving load times.

## Database Setup

1. Run the migration to create the cache tables:

```sql
-- Run this SQL in your Supabase SQL editor
-- File: migrations/create_api_metrics_cache.sql
```

This creates three tables:
- `google_ads_metrics_cache`
- `meta_ads_metrics_cache`
- `shopify_metrics_cache`

## How It Works

1. **Daily Updates**: A scheduled job runs daily at 4am EST to:
   - Fetch yesterday's data from all APIs
   - Update the cache tables
   - Remove data older than 31 days

2. **Report Loading**: When reports are loaded:
   - The system first checks the cache
   - If cache exists, it uses cached data
   - If cache is empty, it falls back to API calls

3. **Force Update**: Users can manually trigger cache updates from the API credentials modals

## Setting Up the Scheduled Job

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

1. Update `vercel.json` with your secret:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-metrics-cache?secret=YOUR_SECRET_HERE",
      "schedule": "0 4 * * *"
    }
  ]
}
```

2. Set the `CRON_SECRET` environment variable in Vercel to match your secret
3. Deploy to Vercel (Pro plan required for cron jobs)

**Note**: The schedule `0 4 * * *` runs at 4am UTC. To run at 4am EST:
- EST is UTC-5, so use `0 9 * * *` (9am UTC = 4am EST)
- EDT is UTC-4, so use `0 8 * * *` (8am UTC = 4am EDT)

### Option 2: External Cron Service (Recommended for other hosting)

Use any external cron service (e.g., cron-job.org, EasyCron, GitHub Actions) to call:

```
POST https://your-domain.com/api/cron/update-metrics-cache?secret=YOUR_SECRET
```

Schedule: Daily at 4am EST (9am UTC / 8am EDT)

### Option 3: GitHub Actions (Free)

Create `.github/workflows/update-metrics-cache.yml`:

```yaml
name: Update Metrics Cache

on:
  schedule:
    - cron: '0 9 * * *'  # 4am EST (9am UTC)
  workflow_dispatch:  # Allow manual trigger

jobs:
  update-cache:
    runs-on: ubuntu-latest
    steps:
      - name: Update Cache
        run: |
          curl -X POST "https://your-domain.com/api/cron/update-metrics-cache?secret=${{ secrets.CRON_SECRET }}"
```

## Environment Variables

Add to your `.env.local`:

```env
CRON_SECRET=your-secret-key-change-this
```

**Important**: Use a strong, random secret and never commit it to version control.

## Manual Cache Updates

### Via UI

1. Go to Settings tab
2. Open any API credentials modal (Google Ads, Meta Ads, or Shopify)
3. Click "Force Update Cache" button
4. This will fetch the latest data from APIs and update the cache

### Via API

```bash
POST /api/cache/update
Content-Type: application/json

{
  "companyId": "your-company-id",
  "forceToday": true  // Set to true to update today's data, false for yesterday
}
```

## Cache Structure

Each cache table stores:
- `company_id`: Reference to the company
- `date`: The date (YYYY-MM-DD format)
- Metrics specific to each API (spend, conversions, revenue, etc.)
- `created_at` and `updated_at` timestamps

Data is automatically cleaned up - entries older than 31 days are removed during daily updates.

## Troubleshooting

### Cache not updating

1. Check that the cron job is running:
   - Check Vercel logs (if using Vercel)
   - Check your cron service logs
   - Manually trigger the endpoint to test

2. Verify credentials:
   - Ensure API credentials are valid
   - Check that credentials are properly encrypted in the database

3. Check API responses:
   - Review the cache update API logs
   - Verify that external APIs are returning data

### Reports showing old data

1. Force update the cache via the UI
2. Check that the cache tables have recent data:
   ```sql
   SELECT MAX(date) FROM google_ads_metrics_cache WHERE company_id = 'your-company-id';
   ```

### Cache not being used

1. Verify cache tables exist:
   ```sql
   SELECT * FROM google_ads_metrics_cache LIMIT 1;
   ```

2. Check that cache reading functions are working (check browser console logs)

3. Ensure the cache has data for the date range you're viewing

## Performance Benefits

- **Reduced API Calls**: From potentially hundreds per day to just one per day per company
- **Faster Load Times**: Database queries are much faster than external API calls
- **Rate Limit Protection**: Avoids hitting API rate limits
- **Cost Savings**: Reduces API usage costs for paid APIs

## Maintenance

- The cache automatically maintains the last 30 days
- Old data (>31 days) is automatically removed
- No manual cleanup required

