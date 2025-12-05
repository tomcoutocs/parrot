# API Credentials Guide

This comprehensive guide shows you how to obtain all the required API credentials for integrating with Google Ads API, Meta Ads API, Shopify API, and Klaviyo API.

## Quick Reference

| API | Required Credentials | Estimated Setup Time | Approval Required |
|-----|---------------------|---------------------|-------------------|
| **Google Ads** | Developer Token, Client ID, Client Secret, Refresh Token, Customer ID | 2-3 hours + 1-3 days approval | Yes (Developer Token) |
| **Meta Ads** | App ID, App Secret, Access Token, Ad Account ID, System User Token (optional) | 1-2 hours + 1-7 days review | Yes (Permissions) |
| **Shopify** | Store Domain, API Key, API Secret Key, Access Token, Scopes | 15-30 minutes | No (Private App) |
| **Klaviyo** | Public API Key, Private API Key | 5-10 minutes | No |

## Table of Contents

1. [Google Ads API](#google-ads-api)
2. [Meta Ads API](#meta-ads-api-facebookinstagram-ads)
3. [Shopify API](#shopify-api)
4. [Klaviyo API](#klaviyo-api)

> 📖 **Looking for step-by-step instructions?** See [HOW_TO_GET_API_KEYS.md](./HOW_TO_GET_API_KEYS.md) for detailed guides on obtaining each API credential.

---

## Prerequisites

Before starting, ensure you have:
- Admin access to the accounts/services you want to integrate
- A valid email address for account verification
- Basic understanding of API authentication concepts
- Access to your application's callback URLs for OAuth flows

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

### Step-by-Step Guide to Obtain Google Ads API Credentials:

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "Parrot Google Ads Integration")
4. Click "Create"
5. Wait for project creation, then select it

#### Step 2: Enable Google Ads API
1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Ads API"
3. Click on "Google Ads API" → Click "Enable"
4. Wait for API to be enabled

#### Step 3: Set Up OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have Google Workspace)
3. Fill in required fields:
   - App name: "Parrot Client Portal"
   - User support email: Your email
   - Developer contact: Your email
4. Click "Save and Continue"
5. Add scopes: `https://www.googleapis.com/auth/adwords`
6. Click "Save and Continue"
7. Add test users (if in testing mode)
8. Click "Save and Continue" → "Back to Dashboard"

#### Step 4: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Parrot Google Ads Client"
5. Authorized redirect URIs: Add your callback URL (e.g., `http://localhost:3000/api/auth/callback/google`)
6. Click "Create"
7. **Copy the Client ID** → This is your `GOOGLE_ADS_CLIENT_ID`
8. **Copy the Client Secret** → This is your `GOOGLE_ADS_CLIENT_SECRET`
9. ⚠️ **Important**: Save the Client Secret immediately - you can only see it once!

#### Step 5: Get Developer Token
1. Go to [Google Ads](https://ads.google.com/)
2. Sign in with the Google account that manages your ads
3. Click the tools icon (wrench) → "Setup" → "API Center"
4. If you don't see "API Center", you need to:
   - Have a Google Ads account in good standing
   - Wait 14 days after account creation
   - Have spent at least $5,000 USD lifetime (for production access)
5. Click "Create developer token"
6. Fill in the form:
   - Company name: Your company name
   - Website: Your website
   - Contact email: Your email
   - Use case: Select appropriate option
7. Submit and wait for approval (can take 1-3 business days for test tokens)
8. Once approved, **copy the Developer Token** → This is your `GOOGLE_ADS_DEVELOPER_TOKEN`

#### Step 6: Generate Refresh Token
1. Use OAuth 2.0 Playground or implement OAuth flow:
   - Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Click gear icon (⚙️) → Check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - In left panel, find "Google Ads API" → Select `https://www.googleapis.com/auth/adwords`
   - Click "Authorize APIs"
   - Sign in and grant permissions
   - Click "Exchange authorization code for tokens"
   - **Copy the Refresh Token** → This is your `GOOGLE_ADS_REFRESH_TOKEN`

#### Step 7: Get Customer ID
1. In Google Ads, look at the top right corner
2. You'll see your Customer ID in format `123-456-7890`
3. **Copy this** → This is your `GOOGLE_ADS_CUSTOMER_ID`

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

### Step-by-Step Guide to Obtain Meta Ads API Credentials:

#### Step 1: Create Meta App
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as app type
4. Fill in:
   - App name: "Parrot Client Portal"
   - App contact email: Your email
5. Click "Create App"

#### Step 2: Add Marketing API Product
1. In your app dashboard, find "Add Product" section
2. Find "Marketing API" → Click "Set Up"
3. Review and accept terms if prompted

#### Step 3: Get App ID and App Secret
1. Go to "Settings" → "Basic"
2. **Copy the App ID** → This is your `META_ADS_APP_ID`
3. **Copy the App Secret** → This is your `META_ADS_APP_SECRET`
   - Click "Show" to reveal it
   - ⚠️ Keep this secret secure!

#### Step 4: Set Up App Domains and Privacy Policy
1. Still in "Settings" → "Basic"
2. Add your app domain (e.g., `yourdomain.com`)
3. Add Privacy Policy URL (required for production)
4. Add Terms of Service URL (optional)
5. Click "Save Changes"

#### Step 5: Configure OAuth Redirect URIs
1. Go to "Settings" → "Basic" → "Add Platform"
2. Select "Website"
3. Add Site URL: `https://yourdomain.com`
4. Add Valid OAuth Redirect URIs: `https://yourdomain.com/api/auth/callback/facebook`
5. Click "Save Changes"

#### Step 6: Request Permissions
1. Go to "App Review" → "Permissions and Features"
2. Request these permissions:
   - `ads_read` - Read ads data
   - `ads_management` - Manage ads
   - `business_management` - Manage business assets
3. For each permission:
   - Click "Request" or "Edit"
   - Fill in use case description
   - Upload required screenshots/videos
   - Submit for review (can take 1-7 days)

#### Step 7: Generate Access Token (Short-term Testing)
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from dropdown
3. Click "Generate Access Token"
4. Select permissions: `ads_read`, `ads_management`, `business_management`
5. Click "Generate Access Token"
6. **Copy the token** → This is your `META_ADS_ACCESS_TOKEN` (short-lived, expires in 1-2 hours)

#### Step 8: Generate Long-Lived Access Token
1. Use Graph API Explorer or make API call:
   ```
   GET https://graph.facebook.com/v18.0/oauth/access_token?
     grant_type=fb_exchange_token&
     client_id={app-id}&
     client_secret={app-secret}&
     fb_exchange_token={short-lived-token}
   ```
2. **Copy the long-lived token** → This is your `META_ADS_ACCESS_TOKEN` (expires in 60 days)

#### Step 9: Get Ad Account ID
1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Navigate to "Ad Accounts"
3. Find your ad account
4. **Copy the Account ID** (format: `act_123456789` or just `123456789`)
   - This is your `META_ADS_AD_ACCOUNT_ID`

#### Step 10: Create System User Token (Recommended for Production)
1. Go to [Meta Business Settings](https://business.facebook.com/settings)
2. Click "System Users" → "Add"
3. Name: "Parrot API System User"
4. Select "Admin" or appropriate role
5. Click "Create System User"
6. Click "Generate New Token"
7. Select your app
8. Select permissions: `ads_read`, `ads_management`, `business_management`
9. Click "Generate Token"
10. **Copy the token** → This is your `META_ADS_SYSTEM_USER_TOKEN`
11. ⚠️ **Important**: Save this token immediately - you can only see it once!

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

### Step-by-Step Guide to Obtain Shopify API Credentials (Private App Method):

#### Step 1: Access Shopify Admin
1. Log into your Shopify store admin panel
2. URL format: `https://your-store.myshopify.com/admin`

#### Step 2: Navigate to App Development
1. Go to "Settings" (bottom left)
2. Click "Apps and sales channels"
3. Scroll down and click "Develop apps"
4. If you don't see this option, you may need to enable developer mode

#### Step 3: Create Private App
1. Click "Create an app"
2. Enter app name: "Parrot Client Portal Integration"
3. Enter developer email: Your email
4. Click "Create app"

#### Step 4: Configure Admin API Scopes
1. Click "Configure Admin API scopes"
2. Select the scopes you need (common ones):
   - `read_products` - Read product information
   - `write_products` - Modify products
   - `read_orders` - Read order information
   - `write_orders` - Modify orders
   - `read_customers` - Read customer data
   - `read_inventory` - Read inventory levels
   - `write_inventory` - Modify inventory
   - `read_locations` - Read store locations
3. Click "Save"

#### Step 5: Install App and Get Credentials
1. Click "Install app" at the top
2. Review permissions and click "Install"
3. After installation, you'll see:
   - **API key** → This is your `SHOPIFY_API_KEY`
   - **API secret key** → This is your `SHOPIFY_API_SECRET_KEY`
   - **Admin API access token** → This is your `SHOPIFY_ACCESS_TOKEN`
4. **Copy all three immediately** - you can only see them once!
5. Your store domain is: `your-store.myshopify.com` → This is your `SHOPIFY_STORE_DOMAIN`

#### Step 6: Note Your Scopes
1. The scopes you selected are stored as: `read_products,write_products,read_orders`
2. **Copy this comma-separated list** → This is your `SHOPIFY_SCOPES`

---

### Step-by-Step Guide to Obtain Shopify API Credentials (OAuth - Public App Method):

#### Step 1: Create Shopify Partner Account
1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Sign up or log in
3. Complete partner profile if needed

#### Step 2: Create App in Partner Dashboard
1. Go to "Apps" → "Create app"
2. Choose "Create app manually"
3. Enter:
   - App name: "Parrot Client Portal"
   - App URL: `https://yourdomain.com`
   - Allowed redirection URL(s): `https://yourdomain.com/api/auth/callback/shopify`
4. Click "Create app"

#### Step 3: Get API Credentials
1. In your app, go to "API credentials"
2. **Copy the Client ID** → This is your `SHOPIFY_API_KEY`
3. **Copy the Client secret** → This is your `SHOPIFY_API_SECRET_KEY`

#### Step 4: Configure OAuth Scopes
1. Go to "Configuration" → "Scopes"
2. Select Admin API scopes (same as Private App method)
3. Click "Save"

#### Step 5: Implement OAuth Flow
1. Redirect user to:
   ```
   https://{shop}.myshopify.com/admin/oauth/authorize?
     client_id={api_key}&
     scope={scopes}&
     redirect_uri={redirect_uri}
   ```
2. User authorizes → Shopify redirects with `code` parameter
3. Exchange code for access token:
   ```
   POST https://{shop}.myshopify.com/admin/oauth/access_token
   {
     "client_id": "{api_key}",
     "client_secret": "{api_secret}",
     "code": "{authorization_code}"
   }
   ```
4. Response contains `access_token` → This is your `SHOPIFY_ACCESS_TOKEN`

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

### Step-by-Step Guide to Obtain Klaviyo API Credentials:

#### Step 1: Log into Klaviyo
1. Go to [Klaviyo](https://www.klaviyo.com/)
2. Log into your account
3. Navigate to your account dashboard

#### Step 2: Access API Keys Settings
1. Click on your account name/avatar (top right)
2. Select "Account" → "Settings"
3. In the left sidebar, click "API Keys"
   - Alternative path: Account → Settings → Integrations → API Keys

#### Step 3: Get Public API Key (Site ID)
1. Find the "Public API Key" section
2. You'll see a 6-character code (e.g., `ABC123`)
3. **Copy this code** → This is your `KLAVIYO_PUBLIC_API_KEY`
4. Note: This is safe to use in client-side code

#### Step 4: Create Private API Key
1. Scroll to "Private API Keys" section
2. Click "Create API Key"
3. Enter a name: "Parrot Client Portal Integration"
4. Select scopes/permissions:
   - **Read** - Read lists, profiles, metrics, etc.
   - **Write** - Create/update lists, profiles, events, etc.
   - **Full Access** - All permissions (recommended for server-side)
5. Click "Create API Key"
6. **Copy the API key immediately** → This is your `KLAVIYO_PRIVATE_API_KEY`
7. ⚠️ **Important**: You can only see this key once! Save it securely.

#### Step 5: Verify API Key
1. Test your API key using Klaviyo API:
   ```
   GET https://a.klaviyo.com/api/accounts/
   Headers:
     Authorization: Klaviyo-API-Key {your_private_api_key}
   ```
2. If successful, you'll receive account information

#### Notes:
- **Public API Key**: Safe for client-side use, 6 characters
- **Private API Key**: Must be kept secret, used for server-side operations
- **Key Format**: Private keys are long alphanumeric strings
- **Scopes**: Make sure your private key has the permissions you need
- **Rate Limits**: Be aware of Klaviyo's API rate limits

---

## Notes

- **Google Ads API**: Requires approval from Google before production use
- **Meta Ads API**: Requires app review for certain permissions
- **Shopify API**: Private apps are easier but OAuth apps are more flexible for multi-store scenarios
- **Klaviyo API**: Public key is safe for client-side use, but private key must be kept secure
- All tokens should be treated as sensitive data and never exposed in client-side code

