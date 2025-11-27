# API Credentials Required Variables

This document outlines all the required variables/credentials needed to connect to Google Ads API, Meta Ads API, and Shopify API.

## Google Ads API

The Google Ads API uses OAuth 2.0 authentication and requires the following credentials:

### Required Variables:
1. **`GOOGLE_ADS_DEVELOPER_TOKEN`** (string)
   - Unique token that identifies your application to Google Ads API
   - Obtained from Google Ads account after API access approval
   - Format: Usually a long alphanumeric string

2. **`GOOGLE_ADS_CLIENT_ID`** (string)
   - OAuth 2.0 Client ID from Google Cloud Console
   - Format: `xxxxx.apps.googleusercontent.com`

3. **`GOOGLE_ADS_CLIENT_SECRET`** (string)
   - OAuth 2.0 Client Secret from Google Cloud Console
   - Format: `GOCSPX-xxxxxxxxxxxxx`

4. **`GOOGLE_ADS_REFRESH_TOKEN`** (string)
   - Used to obtain new access tokens without user interaction
   - Generated through OAuth 2.0 authorization flow
   - Format: Long alphanumeric string

5. **`GOOGLE_ADS_CUSTOMER_ID`** (string, optional per account)
   - The Google Ads customer ID (account ID) you want to access
   - Format: `123-456-7890` (with dashes) or `1234567890` (without dashes)
   - Note: This may be stored per company/client if managing multiple accounts

### How to Obtain:
1. Create a Google Cloud Project and enable Google Ads API
2. Set up OAuth consent screen
3. Create OAuth 2.0 credentials (Client ID & Secret)
4. Request Google Ads API access and get Developer Token
5. Generate Refresh Token using OAuth 2.0 flow with scope: `https://www.googleapis.com/auth/adwords`

---

## Meta Ads API (Facebook/Instagram Ads)

The Meta Ads API uses OAuth 2.0 authentication and requires the following credentials:

### Required Variables:
1. **`META_ADS_APP_ID`** (string)
   - Application ID from Meta for Developers portal
   - Format: Numeric string (e.g., `123456789012345`)

2. **`META_ADS_APP_SECRET`** (string)
   - Application Secret from Meta for Developers portal
   - Format: Alphanumeric string (e.g., `abc123def456ghi789`)

3. **`META_ADS_ACCESS_TOKEN`** (string)
   - Access token that grants API access
   - Can be short-lived (1-2 hours) or long-lived (60 days)
   - Format: Long alphanumeric string
   - Note: Long-lived tokens can be refreshed programmatically

4. **`META_ADS_AD_ACCOUNT_ID`** (string, optional per account)
   - The Meta Ad Account ID (act_ prefix)
   - Format: `act_123456789` or just `123456789`
   - Note: This may be stored per company/client if managing multiple accounts

### Optional Variables:
5. **`META_ADS_SYSTEM_USER_TOKEN`** (string, recommended for production)
   - System User Access Token for server-to-server calls
   - More stable than user tokens
   - Format: Long alphanumeric string

### How to Obtain:
1. Create an app in [Meta for Developers](https://developers.facebook.com/)
2. Add "Marketing API" product to your app
3. Get App ID and App Secret from Settings > Basic
4. Generate Access Token using Graph API Explorer or OAuth flow
5. Request required permissions: `ads_read`, `ads_management`, `business_management`

---

## Shopify API

The Shopify API uses API key authentication (for Private Apps) or OAuth 2.0 (for Public Apps).

### Required Variables (Private App Method - Recommended):
1. **`SHOPIFY_STORE_DOMAIN`** (string)
   - Your Shopify store domain
   - Format: `your-store.myshopify.com` or `your-store.com`
   - Note: Include protocol if needed: `https://your-store.myshopify.com`

2. **`SHOPIFY_API_KEY`** (string)
   - Admin API Key from Private App
   - Format: Alphanumeric string (e.g., `abc123def456ghi789`)

3. **`SHOPIFY_API_SECRET_KEY`** (string)
   - Admin API Secret Key from Private App
   - Format: Alphanumeric string (e.g., `secret123abc456def789`)

4. **`SHOPIFY_ACCESS_TOKEN`** (string)
   - Admin API Access Token
   - Generated when creating Private App
   - Format: `shpat_xxxxxxxxxxxxxxxxxxxxx` (for Private Apps)
   - Format: `shpca_xxxxxxxxxxxxxxxxxxxxx` (for OAuth apps)

### Required Variables (OAuth 2.0 Method - For Public Apps):
1. **`SHOPIFY_STORE_DOMAIN`** (string) - Same as above
2. **`SHOPIFY_API_KEY`** (string) - Same as above
3. **`SHOPIFY_API_SECRET_KEY`** (string) - Same as above
4. **`SHOPIFY_ACCESS_TOKEN`** (string) - Obtained through OAuth flow
5. **`SHOPIFY_SCOPES`** (string, optional)
   - Required scopes/permissions
   - Format: Comma-separated (e.g., `read_products,write_products,read_orders`)

### How to Obtain (Private App):
1. Log into Shopify Admin
2. Go to Settings > Apps and sales channels
3. Click "Develop apps" > "Create an app"
4. Configure Admin API scopes
5. Install app and copy API credentials

### How to Obtain (OAuth - Public App):
1. Create app in Partner Dashboard
2. Configure OAuth redirect URLs
3. Implement OAuth flow to get access token
4. Request required scopes during authorization

---

## Database Schema Recommendations

Based on the current implementation, you may want to expand the `companies` table to store these additional credentials:

```sql
-- Current columns (from migrations/add_api_keys_to_companies.sql):
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS meta_api_key TEXT,
ADD COLUMN IF NOT EXISTS google_api_key TEXT,
ADD COLUMN IF NOT EXISTS shopify_api_key TEXT;

-- Recommended additional columns:
ALTER TABLE companies
-- Google Ads API
ADD COLUMN IF NOT EXISTS google_ads_developer_token TEXT,
ADD COLUMN IF NOT EXISTS google_ads_client_id TEXT,
ADD COLUMN IF NOT EXISTS google_ads_client_secret TEXT,
ADD COLUMN IF NOT EXISTS google_ads_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_ads_customer_id TEXT,

-- Meta Ads API
ADD COLUMN IF NOT EXISTS meta_ads_app_id TEXT,
ADD COLUMN IF NOT EXISTS meta_ads_app_secret TEXT,
ADD COLUMN IF NOT EXISTS meta_ads_access_token TEXT,
ADD COLUMN IF NOT EXISTS meta_ads_ad_account_id TEXT,

-- Shopify API
ADD COLUMN IF NOT EXISTS shopify_store_domain TEXT,
ADD COLUMN IF NOT EXISTS shopify_api_secret_key TEXT,
ADD COLUMN IF NOT EXISTS shopify_access_token TEXT,

-- Klaviyo API
ADD COLUMN IF NOT EXISTS klaviyo_public_api_key TEXT,
ADD COLUMN IF NOT EXISTS klaviyo_private_api_key TEXT;
```

---

## Security Best Practices

1. **Encryption**: All API credentials should be encrypted at rest (already implemented in your codebase using `encrypt()` function)

2. **Environment Variables**: For development, store credentials in `.env.local`:
   ```env
   # Google Ads API
   GOOGLE_ADS_DEVELOPER_TOKEN=your_token
   GOOGLE_ADS_CLIENT_ID=your_client_id
   GOOGLE_ADS_CLIENT_SECRET=your_client_secret
   GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
   
   # Meta Ads API
   META_ADS_APP_ID=your_app_id
   META_ADS_APP_SECRET=your_app_secret
   META_ADS_ACCESS_TOKEN=your_access_token
   
   # Shopify API
   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   SHOPIFY_API_KEY=your_api_key
   SHOPIFY_API_SECRET_KEY=your_secret_key
   SHOPIFY_ACCESS_TOKEN=your_access_token
   
   # Klaviyo API
   KLAVIYO_PUBLIC_API_KEY=ABC123
   KLAVIYO_PRIVATE_API_KEY=your_private_api_key
   ```

3. **Token Refresh**: Implement automatic token refresh for:
   - Google Ads API (refresh tokens)
   - Meta Ads API (long-lived tokens expire after 60 days)

4. **Access Control**: Use Row Level Security (RLS) to ensure companies can only access their own credentials

---

## Klaviyo API

The Klaviyo API uses API key authentication and requires the following credentials:

### Required Variables:
1. **`KLAVIYO_PUBLIC_API_KEY`** (string)
   - Public API Key (Site ID) - 6-character identifier
   - Used for client-side API calls
   - Format: 6-character alphanumeric string (e.g., `ABC123`)

2. **`KLAVIYO_PRIVATE_API_KEY`** (string)
   - Private API Key for server-side calls
   - Grants read/write access to Klaviyo data
   - Format: Long alphanumeric string
   - Note: This should be encrypted before storage

### How to Obtain:
1. Log into your Klaviyo account
2. Navigate to Account > Settings > API Keys
3. Copy the Public API Key (Site ID) - 6 characters
4. Copy the Private API Key - used for server-side operations
5. Note: Private API keys can have different scopes/permissions

---

## Notes

- **Google Ads API**: Requires approval from Google before production use
- **Meta Ads API**: Requires app review for certain permissions
- **Shopify API**: Private apps are easier but OAuth apps are more flexible for multi-store scenarios
- **Klaviyo API**: Public key is safe for client-side use, but private key must be kept secure
- All tokens should be treated as sensitive data and never exposed in client-side code

