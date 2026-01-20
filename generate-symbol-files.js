const fs = require('fs');
const path = require('path');

// Function to parse CSV content
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

  return lines.slice(1).map(line => {
    // Handle quoted fields that may contain commas
    const fields = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.replace(/"/g, '').trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.replace(/"/g, '').trim());

    const obj = {};
    headers.forEach((header, index) => {
      obj[header.toLowerCase()] = fields[index] || undefined;
    });

    return obj;
  });
}

// Function to generate TypeScript file content
function generateTSFile(symbols, filename) {
  const importStatement = `import { Symbol } from '../types/symbol';\n\n`;
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const dateComment = `// Generated on ${currentDate} from ${filename.replace('.ts', '.csv')}\n`;
  const exportStatement = `export const ${filename.replace('.ts', '').toUpperCase()}_SYMBOLS: Symbol[] = [\n`;
  const symbolsString = symbols.map(symbol =>
    `  {\n${Object.entries(symbol).map(([key, value]) =>
      `    ${key}: ${value ? `"${value.replace(/"/g, '\\"')}"` : 'undefined'}`
    ).join(',\n')},\n  }`
  ).join(',\n');

  return importStatement + dateComment + exportStatement + symbolsString + '\n];\n';
}

// Main conversion function
function convertSymbols() {
  const files = ['TO_LIST_OF_SYMBOLS.csv', 'V_LIST_OF_SYMBOLS.csv'];

  files.forEach(filename => {
    try {
      console.log(`Processing ${filename}...`);

      const content = fs.readFileSync(filename, 'utf8');
      const symbols = parseCSV(content);

      const tsFilename = filename.replace('.csv', '.ts');
      const tsContent = generateTSFile(symbols, tsFilename);

      const outputPath = path.join('src', 'lib', tsFilename);
      fs.writeFileSync(outputPath, tsContent);

      console.log(`Generated ${outputPath} with ${symbols.length} symbols`);
    } catch (error) {
      console.error(`Error processing ${filename}:`, error.message);
    }
  });
}

convertSymbols();