# Capybara Academy — Parent Guide

## Adding / Updating the Word List

1. Create or edit a CSV file with columns in this order:
   `english,hungarian,exampleSentence,dateAdded`

   Example:
   ```
   apple,alma,I eat an apple every day.,2024-09-01
   bicycle,kerékpár,She rides her bicycle to school.,2024-09-01
   "butterfly,moth",lepke - pillangó,The butterfly landed on a flower.,2024-09-15
   ```

   - Columns with commas inside must be wrapped in **double quotes**
   - `exampleSentence` and `dateAdded` are optional (leave blank is fine)
   - Use UTF-8 encoding (Google Sheets → File → Download → CSV works perfectly)

2. Go to **Azure Portal** → your storage account → **Storage browser** → **Blob containers** → `words`

3. Upload the file and name it exactly: **`vocabulary.csv`** (overwrite the existing one)

4. Changes take effect within 5 minutes (the app caches the list for 5 minutes)

## Azure Resources

| Resource | Name | Notes |
|---|---|---|
| Resource group | `capybara-academy-rg` | |
| Storage account | `capybaraacademy` (or your chosen name) | |
| Static Web App | `capybara-academy` | Free tier |

## App Settings Required

In the Static Web App → **Configuration → Application settings**:

| Name | Value |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | Connection string from storage account |
| `WORDS_BLOB_CONTAINER` | `words` |
| `WORDS_BLOB_NAME` | `vocabulary.csv` |

## Local Development

Prerequisites: Node.js 20+, Azure Functions Core Tools v4, Azure Static Web Apps CLI

```bash
# Install dependencies
npm install
cd api && npm install && cd ..

# Start local dev (runs Vite + Functions + SWA auth emulation together)
npm run start
```

Open http://localhost:4280

For local testing without real Azure storage, install **Azurite** (Azure Storage emulator):
```bash
npm install -g azurite
azurite --silent &
```

Then `api/local.settings.json` already has `"AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true"`.
