# Google Earth Engine API Key Setup Guide

## Step 1: Place Your Service Account Key

1. Take your Earth Engine API key (should be a JSON file)
2. Rename it to: `service-account-key.json`
3. Place it in the backend directory: `g:\isro\disaster-eye-earth-engine\backend\service-account-key.json`

## Step 2: Verify Configuration

Your backend is already configured correctly in `.env`:
- EE_PROJECT_ID=omega-bearing-464216-i7
- EE_SERVICE_ACCOUNT=team-og-isro-322@omega-bearing-464216-i7.iam.gserviceaccount.com
- EE_PRIVATE_KEY_PATH=service-account-key.json

## Step 3: Restart Backend

After placing the key file:
1. Stop the backend (Ctrl+C)
2. Restart: python backend/main.py
3. Look for: "✅ Google Earth Engine initialized with service account"

## Alternative: Environment Variable Method

If you prefer to use environment variables:
1. Set EE_PRIVATE_KEY_PATH to the full path of your key file
2. Or set the key content directly as EE_PRIVATE_KEY environment variable
