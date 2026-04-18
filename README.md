# Capybara Academy

A vocabulary learning app for children, built around a Hungarian–English word list. Players practise words through four game modes and collect animal friends as they master each word.

## Features

- **Four game modes** — Flash Cards, Spelling Bee, Match Game, Quick Fire
- **Spaced repetition** — words resurface based on mastery level (0–4), with review intervals of 0/1/3/7/21 days
- **Animal companions** — 20 animals unlock as words reach mastery level 4
- **XP, levels, streaks, and badges** — First Friend, Perfect Session, 5-Day Streak, 30-Day Streak, Full Zoo
- **Per-user progress** — stored in Azure Table Storage, keyed by Microsoft identity

## Architecture

```
/                  Vite + TypeScript frontend (vanilla Web Components)
/api/              Azure Functions v4 backend (Node.js)
```

The frontend is a single-page app deployed as Azure Static Web App static files. The backend runs as serverless functions alongside it. Auth is handled entirely by Azure Static Web Apps (Microsoft identity provider) — no auth code in the app itself.

**API endpoints:**

| Route | Method | Purpose |
|---|---|---|
| `/api/words` | GET | Returns word list parsed from `vocabulary.csv` in Blob Storage (5-min cache) |
| `/api/progress` | GET / PUT | Per-user spaced-repetition progress (Azure Table Storage) |
| `/api/profile` | GET / PUT | Per-user XP, level, streak, badges (Azure Table Storage) |

## Local Development

### Prerequisites

- Node.js 20+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local#install-the-azure-functions-core-tools)
- [Azure Static Web Apps CLI](https://azure.github.io/static-web-apps-cli/) (`npm install -g @azure/static-web-apps-cli`)
- [Azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite) — Azure Storage emulator (`npm install -g azurite`)

### Setup

```bash
# Install frontend dependencies
npm install

# Install API dependencies
cd api && npm install && cd ..
```

### Running

Open **three terminals**:

**Terminal 1 — Azurite (storage emulator):**
```bash
azurite --silent
```

**Terminal 2 — Vite dev server:**
```bash
npm run dev
```

**Terminal 3 — Azure Functions:**
```bash
cd api && npm run start
```

Then open the SWA CLI to get auth emulation:
```bash
npm run start
```

Open **http://localhost:4280**. The SWA CLI proxies Vite (port 5173) and the Functions runtime (port 7071) and emulates Microsoft authentication locally.

`api/local.settings.json` is pre-configured to use Azurite (`UseDevelopmentStorage=true`). For the word list, the API falls back to a `vocabulary.csv` file in the repo root when running locally — create one with the format below.

### Word list format

`vocabulary.csv` — no header row, columns in order:

```
english,hungarian,exampleSentence,dateAdded
apple,alma,I eat an apple every day.,2024-09-01
bicycle,kerékpár,She rides her bicycle to school.,2024-09-01
"butterfly,moth",lepke - pillangó,The butterfly landed on a flower.,2024-09-15
```

- `exampleSentence` and `dateAdded` are optional (leave blank)
- Values containing commas must be wrapped in double quotes
- UTF-8 encoding (Google Sheets → File → Download → CSV works)

## Azure Infrastructure Setup

### Resources required

| Resource | Tier | Notes |
|---|---|---|
| Resource Group | — | Container for all resources |
| Storage Account | Standard LRS | Hosts `vocabulary.csv` blob + two Azure Tables |
| Azure Static Web App | Free tier | Hosts frontend + Functions |

### Step 1 — Create a resource group

```bash
az group create --name capybara-academy-rg --location westeurope
```

### Step 2 — Create a storage account

```bash
az storage account create \
  --name capybaraacademy \
  --resource-group capybara-academy-rg \
  --location westeurope \
  --sku Standard_LRS
```

Get the connection string (you'll need it in Step 4):
```bash
az storage account show-connection-string \
  --name capybaraacademy \
  --resource-group capybara-academy-rg \
  --query connectionString -o tsv
```

### Step 3 — Upload the word list

Create a blob container and upload `vocabulary.csv`:
```bash
az storage container create \
  --name words \
  --account-name capybaraacademy

az storage blob upload \
  --account-name capybaraacademy \
  --container-name words \
  --name vocabulary.csv \
  --file vocabulary.csv
```

Azure Tables (`UserProgress` and `UserProfile`) are created automatically by the API on first request.

### Step 4 — Create a Static Web App

In the [Azure Portal](https://portal.azure.com):

1. Create a new **Static Web App** resource
2. Connect it to your GitHub repository
3. Set the build details:
   - **App location:** `/`
   - **API location:** `api`
   - **Output location:** `dist`
4. Azure generates a GitHub Actions workflow file automatically — commit it to the repo

Then add application settings under **Configuration → Application settings**:

| Name | Value |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | Connection string from Step 2 |
| `WORDS_BLOB_CONTAINER` | `words` |
| `WORDS_BLOB_NAME` | `vocabulary.csv` |

### Step 5 — Enable Microsoft authentication

In the Static Web App → **Authentication**:

1. Add an identity provider: **Microsoft**
2. Create a new App Registration (or use an existing one)
3. The SWA handles the OAuth flow; no code changes needed

After enabling auth, all routes except `/login` and `/animals/*` are locked to authenticated users (configured in [staticwebapp.config.json](staticwebapp.config.json)).

## Deployment

Deployment happens automatically via the GitHub Actions workflow that Azure generates when you connect the Static Web App to your repo. Every push to `main` triggers a build and deploy.

To build and check manually before pushing:
```bash
npm run build          # frontend: tsc + vite build → dist/
cd api && npm run build  # API: tsc → api/dist/
```

## Updating the Word List

To update the vocabulary without a code deploy:

1. Edit your `vocabulary.csv`
2. Go to **Azure Portal → Storage account → Storage browser → Blob containers → `words`**
3. Upload the new file, overwriting `vocabulary.csv`

Changes take effect within 5 minutes (the API caches the word list in memory with a 5-minute TTL).
