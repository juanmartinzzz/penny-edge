# Symbol Updates Guide

## Overview
This guide provides step-by-step instructions for administrators to update stock symbols from the EOD Historical Data API. The process involves 
downloading CSV files for TSX and TSXV exchanges 
and generating TypeScript symbol files for the application.

## Step-by-Step Instructions

### Step 1: Download TSX Symbols
Download the Toronto Stock Exchange (TSX) symbols CSV file:

**Note**: Replace `EOD_HISTORICAL_DATA_API_KEY` with your actual API key which is on .env.local file

```bash
curl "https://eodhistoricaldata.com/api/exchange-symbol-list/TO?api_token=$EOD_HISTORICAL_DATA_API_KEY" -o TO_LIST_OF_SYMBOLS.csv
```

### Step 2: Download TSXV Symbols
Download the Toronto Venture Exchange (TSXV) symbols CSV file:

```bash
curl "https://eodhistoricaldata.com/api/exchange-symbol-list/V?api_token=$EOD_HISTORICAL_DATA_API_KEY" -o V_LIST_OF_SYMBOLS.csv
```

### Step 3: Verify Downloads
Ensure both CSV files are present in the project root directory:

```bash
ls -la *.csv
```

You should see:
- `TO_LIST_OF_SYMBOLS.csv`
- `V_LIST_OF_SYMBOLS.csv`

### Step 4: Generate Symbol Files
Run the symbol generation script using npm:

```bash
npm run generate-symbols
```

This script will:
- Parse the downloaded CSV files
- Generate TypeScript files in `src/lib/`:
  - `TO_LIST_OF_SYMBOLS.ts`
  - `V_LIST_OF_SYMBOLS.ts`
- Display progress and completion status

### Step 5: Verify Generation
Check that the TypeScript files were created successfully:

```bash
ls -la src/lib/*_LIST_OF_SYMBOLS.ts
```

## File Structure After Update

After successful completion, your project will have:

```
project-root/
├── TO_LIST_OF_SYMBOLS.csv          # Downloaded TSX symbols
├── V_LIST_OF_SYMBOLS.csv          # Downloaded TSXV symbols
└── src/lib/
    ├── TO_LIST_OF_SYMBOLS.ts      # Generated TSX symbols (TypeScript)
    └── V_LIST_OF_SYMBOLS.ts      # Generated TSXV symbols (TypeScript)
```

## Automation Notes

For regular updates, you can combine the download and generation steps:

```bash
export EOD_HISTORICAL_DATA_API_KEY="EOD_HISTORICAL_DATA_API_KEY"
curl "https://eodhistoricaldata.com/api/exchange-symbol-list/TO?api_token=$EOD_HISTORICAL_DATA_API_KEY" -o TO_LIST_OF_SYMBOLS.csv
curl "https://eodhistoricaldata.com/api/exchange-symbol-list/V?api_token=$EOD_HISTORICAL_DATA_API_KEY" -o V_LIST_OF_SYMBOLS.csv
npm run generate-symbols
```

The generated TypeScript files include timestamp comments indicating when they were last updated.