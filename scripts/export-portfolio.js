#!/usr/bin/env node
/**
 * Export portfolio from Welldee to CSV/PDF files.
 * Usage: node scripts/export-portfolio.js [csv|pdf|both] [output-dir]
 *
 * Reads portfolio data from localStorage (stored in browser), exports to specified directory.
 * For use by Cowork agents or manual batch exports.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dirname);

// Storage keys from src/utils/constants.js
const STORAGE_KEYS = {
  PORTFOLIO: 'welldee_portfolio',
};

// Default output directory
const DEFAULT_OUTPUT_DIR = '/Users/leopard/Welldee/Cowork agents/welldee output';

// Parse CLI args
const format = process.argv[2]?.toLowerCase() || 'both'; // csv, pdf, or both
const outputDir = process.argv[3] || DEFAULT_OUTPUT_DIR;

if (!['csv', 'pdf', 'both'].includes(format)) {
  console.error('❌ Invalid format. Use: csv, pdf, or both');
  process.exit(1);
}

// Try to load portfolio from browser's indexed db via a headless browser context,
// or fallback to reading from localStorage file if available
async function loadPortfolio() {
  // Since we can't directly access browser localStorage from Node, we need to
  // either: (a) read from a saved JSON export, (b) spin up a headless browser,
  // or (c) take portfolio as stdin. For now, check if there's a cached export.

  const cacheFile = path.join(projectRoot, 'portfolio-cache.json');
  if (fs.existsSync(cacheFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      return data.portfolio || data;
    } catch (err) {
      console.error('❌ Failed to read portfolio cache:', err.message);
    }
  }

  console.error('❌ Portfolio not found. To export:');
  console.error('   1. Open Welldee in browser');
  console.error('   2. Click Settings → "Export CSV" (this loads portfolio into memory)');
  console.error('   3. Or call: node scripts/export-portfolio.js from within a browser context');
  process.exit(1);
}

// Portfolio calculation helpers (mirrored from src/utils/calculations.js)
function toSGD(amount, currency, fxRates = { SGD: 1, USD: 1.292 }) {
  const rate = fxRates[currency];
  return amount * (rate || 1);
}

function holdingCurrentValue(holding) {
  return holding.shares * holding.currentPrice;
}

function holdingUnrealizedPnL(holding) {
  if (holding.costBasis == null) return null;
  return holding.shares * (holding.currentPrice - holding.costBasis);
}

// Export to CSV
function portfolioToCSV(portfolio) {
  const rows = [];
  const header = [
    'accountId', 'accountType', 'broker/provider', 'ticker', 'shares',
    'costBasis', 'currentPrice', 'currency', 'assetClass', 'geography',
    'industry', 'portfolioName', 'currentValue', 'allocation_equities',
    'allocation_fixedIncome', 'balances_ordinary', 'balances_special',
    'balances_medisave', 'cash_SGD', 'cash_USD', 'dividendYieldPct', 'lastUpdated',
  ];
  rows.push(header);

  for (const account of portfolio.accounts || []) {
    if (account.type === 'Brokerage') {
      for (const holding of account.holdings || []) {
        rows.push([
          account.id,
          'Brokerage',
          account.broker || '',
          holding.ticker || '',
          holding.shares || '',
          holding.costBasis || '',
          holding.currentPrice || '',
          holding.currency || 'SGD',
          holding.assetClass || '',
          holding.geography || '',
          holding.industry || '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          holding.dividendYieldPct || '',
          holding.lastUpdated || '',
        ]);
      }
      for (const [ccy, amount] of Object.entries(account.cash || {})) {
        const row = Array(header.length).fill('');
        row[0] = account.id;
        row[1] = 'Brokerage';
        row[2] = account.broker || '';
        if (ccy === 'SGD') row[18] = amount;
        else if (ccy === 'USD') row[19] = amount;
        rows.push(row);
      }
    } else if (account.type === 'ManagedPortfolio') {
      rows.push([
        account.id,
        'ManagedPortfolio',
        account.provider || '',
        '',
        '',
        account.costBasis || '',
        '',
        account.currency || 'SGD',
        '',
        account.geography || '',
        account.industry || '',
        account.portfolioName || '',
        account.currentValue || '',
        account.allocation?.equities || '',
        account.allocation?.fixedIncome || '',
        '',
        '',
        '',
        '',
        '',
        account.dividendYieldPct || '',
        account.lastUpdated || '',
      ]);
    } else if (account.type === 'CPF') {
      rows.push([
        account.id,
        'CPF',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        account.balances?.ordinary || '',
        account.balances?.special || '',
        account.balances?.medisave || '',
        '',
        '',
        '',
        account.lastUpdated || '',
      ]);
    } else if (account.type === 'Bank') {
      rows.push([
        account.id,
        'Bank',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        account.cash?.SGD || '',
        account.cash?.USD || '',
        '',
        account.lastUpdated || '',
      ]);
    }
  }

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

// Export to PDF (using simple text-based format since we don't have browser context)
async function portfolioToPDF(portfolio) {
  // Import jsPDF dynamically
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(18);
  doc.text('Welldee Portfolio Export', 20, yPos);
  yPos += 15;

  // Date
  doc.setFontSize(10);
  doc.text(`Exported: ${new Date().toLocaleString('en-SG')}`, 20, yPos);
  yPos += 10;

  // Summary
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Portfolio Summary', 20, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  const summaryLines = [];

  let totalNetWorth = 0;
  let totalNetWorthExCPF = 0;

  for (const account of portfolio.accounts || []) {
    if (account.type === 'Brokerage') {
      for (const holding of account.holdings || []) {
        const value = holdingCurrentValue(holding);
        const valueSGD = toSGD(value, holding.currency);
        totalNetWorth += valueSGD;
        totalNetWorthExCPF += valueSGD;
      }
      for (const [ccy, amount] of Object.entries(account.cash || {})) {
        const cash = toSGD(amount, ccy);
        totalNetWorth += cash;
        totalNetWorthExCPF += cash;
      }
    } else if (account.type === 'ManagedPortfolio') {
      const valueSGD = toSGD(account.currentValue || 0, account.currency || 'SGD');
      totalNetWorth += valueSGD;
      totalNetWorthExCPF += valueSGD;
    } else if (account.type === 'CPF') {
      const cpfTotal = (account.balances?.ordinary || 0) + (account.balances?.special || 0) + (account.balances?.medisave || 0);
      totalNetWorth += cpfTotal;
    } else if (account.type === 'Bank') {
      const bankTotal = (account.cash?.SGD || 0) + toSGD(account.cash?.USD || 0, 'USD');
      totalNetWorth += bankTotal;
      totalNetWorthExCPF += bankTotal;
    }
  }

  summaryLines.push(`Net Worth (ex-CPF): SGD ${totalNetWorthExCPF.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`);
  summaryLines.push(`Total Net Worth: SGD ${totalNetWorth.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`);

  summaryLines.forEach((line) => {
    doc.text(line, 20, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Holdings table
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Holdings by Account', 20, yPos);
  yPos += 8;

  const tableData = [];
  tableData.push(['Account', 'Ticker', 'Shares', 'Price', 'Value (SGD)']);

  for (const account of portfolio.accounts || []) {
    if (account.type === 'Brokerage') {
      for (const holding of account.holdings || []) {
        const value = holdingCurrentValue(holding);
        const valueSGD = toSGD(value, holding.currency);
        tableData.push([
          account.broker || account.id,
          holding.ticker || '',
          (holding.shares || 0).toString(),
          `${holding.currency}${(holding.currentPrice || 0).toFixed(2)}`,
          `SGD ${valueSGD.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
        ]);
      }
    } else if (account.type === 'ManagedPortfolio') {
      const valueSGD = toSGD(account.currentValue || 0, account.currency || 'SGD');
      tableData.push([
        `${account.provider || 'Portfolio'}: ${account.portfolioName || account.id}`,
        '',
        '',
        '',
        `SGD ${valueSGD.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
      ]);
    } else if (account.type === 'CPF') {
      const cpfTotal = (account.balances?.ordinary || 0) + (account.balances?.special || 0) + (account.balances?.medisave || 0);
      tableData.push([
        'CPF (Total)',
        '',
        '',
        '',
        `SGD ${cpfTotal.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
      ]);
    }
  }

  doc.autoTable({
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: yPos,
    margin: 20,
    fontSize: 8,
  });

  return doc;
}

// Main
(async () => {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✓ Created output directory: ${outputDir}`);
    }

    console.log('📂 Loading portfolio...');
    const portfolio = await loadPortfolio();

    const timestamp = new Date().toISOString().split('T')[0];

    // Export CSV
    if (format === 'csv' || format === 'both') {
      const csvFile = path.join(outputDir, `welldee-portfolio-${timestamp}.csv`);
      const csv = portfolioToCSV(portfolio);
      fs.writeFileSync(csvFile, csv, 'utf-8');
      console.log(`✓ CSV exported: ${csvFile}`);
    }

    // Export PDF
    if (format === 'pdf' || format === 'both') {
      const pdfFile = path.join(outputDir, `welldee-portfolio-${timestamp}.pdf`);
      const pdf = await portfolioToPDF(portfolio);
      pdf.save(pdfFile);
      console.log(`✓ PDF exported: ${pdfFile}`);
    }

    console.log('✅ Export complete!');
  } catch (err) {
    console.error('❌ Export failed:', err.message);
    process.exit(1);
  }
})();
