import * as XLSX from 'xlsx';
import { ProductCatalogItem, NRIItem, Report030519Item, ABCClass, ItemRiskLevel, PullRecord, BlitzPalletRecord, PNCRecord, SupplierItem } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialCatalog';

export function calculateDateDiffDays(date1Str: string, date2Str: string): number {
  if (!date1Str || !date2Str) return 0;
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function subtractDaysFromDate(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/**
 * Recalculate an NRI Line item whenever pallet, lastro, sku, or validity changes
 */
export function recalculateItem(
  item: Partial<NRIItem>,
  catalogItem: ProductCatalogItem | undefined,
  receiptDate: string,
  triggerField: 'pallet' | 'lastro' | 'sku' | 'validity' | 'initial' = 'initial'
): NRIItem {
  const pFactor = catalogItem?.palletFactor || 100;
  const lFactor = catalogItem?.lastroFactor || 10;
  const hFactor = catalogItem?.hectoliterFactor || 0.04;
  const price = catalogItem?.price || 0;
  const releaseDays = item.releasePeriodDays ?? 30; // Pré-bloqueio é sempre 30 dias antes da validade
  const abc = catalogItem?.abcClass || item.abcClass || 'C';

  let qtySku = item.quantitySku ?? pFactor;
  let pallets = item.palletCount ?? 1;
  let lastros = lFactor; // Quantidade de SKU que vem no lastro (Fator Lastro, ex: 22 para 34608)

  if (triggerField === 'pallet') {
    pallets = Number(item.palletCount) || 0;
    qtySku = Math.round(pallets * pFactor);
    lastros = lFactor;
  } else if (triggerField === 'lastro') {
    const enteredLastroUnits = Number(item.lastroCount) || 1;
    qtySku = Math.round(enteredLastroUnits * lFactor);
    pallets = pFactor > 0 ? Number((qtySku / pFactor).toFixed(2)) : 0;
    lastros = lFactor;
  } else if (triggerField === 'sku') {
    qtySku = Number(item.quantitySku) || 0;
    pallets = pFactor > 0 ? Number((qtySku / pFactor).toFixed(2)) : 0;
    lastros = lFactor;
  }

  const validity = item.validityDate || addDaysToDate(receiptDate || new Date().toISOString(), catalogItem?.defaultShelfLifeDays || 180);
  const daysToExpiry = calculateDateDiffDays(validity, receiptDate || new Date().toISOString().split('T')[0]);

  // Idade do Produto (Shelf Life Total em Dias) & Stock Age Index (%) = (Dias Restantes ÷ Idade do Produto) × 100
  let productShelfLifeDays = Number(catalogItem?.defaultShelfLifeDays) || Number(item.productShelfLifeDays) || 180;
  if (item.manufacturingDate) {
    const diffMfg = calculateDateDiffDays(validity, item.manufacturingDate);
    if (diffMfg > 0) {
      productShelfLifeDays = diffMfg;
    }
  }

  // Stock Age Index (%)
  const rawSai = productShelfLifeDays > 0 ? (daysToExpiry / productShelfLifeDays) * 100 : 100;
  const stockAgeIndex = Number(Math.max(0, Math.min(100, rawSai)).toFixed(1));

  // Faixas de classificação do Stock Age Index:
  // 🔴 Crítico: SAI < 60%
  // 🟡 Atenção: SAI entre 60% e 75%
  // 🟢 OK: SAI > 75%
  const saiClassification: 'CRÍTICO' | 'ATENÇÃO' | 'OK' = 
    stockAgeIndex < 60 ? 'CRÍTICO' : stockAgeIndex <= 75 ? 'ATENÇÃO' : 'OK';

  // Venda média diária (cx/unidades por dia)
  let dailySalesAvg = 0;
  if (catalogItem?.monthlyMovement && catalogItem.monthlyMovement > 0) {
    dailySalesAvg = Number((catalogItem.monthlyMovement / 30).toFixed(1));
  } else {
    // Estimativa baseada na Curva ABC
    if (abc === 'A') dailySalesAvg = 40.0;
    else if (abc === 'B') dailySalesAvg = 10.0;
    else dailySalesAvg = 2.0;
  }

  // Dias necessários para escoar este volume específico recebido
  const neededRunoffDays = dailySalesAvg > 0 ? Number((qtySku / dailySalesAvg).toFixed(1)) : 0;

  // Dias úteis até o pré-bloqueio (40 dias antes) e até o vencimento
  const usefulDaysUntilPreBlock = Math.max(0, daysToExpiry - releaseDays);
  const usefulDaysUntilLoad = Math.max(0, daysToExpiry - 30);

  // Risco 1: Validade com 60 dias ou menos
  const isUnder60Days = daysToExpiry <= 60 && daysToExpiry >= 0;

  // Risco 2: Perigo de não escoar a tempo de acordo com a venda média
  // Ocorre se o tempo necessário para escoar o lote ultrapassar o prazo útil até o pré-bloqueio ou o vencimento total
  const hasRunoffRisk = dailySalesAvg > 0 && (neededRunoffDays > usefulDaysUntilPreBlock || neededRunoffDays > daysToExpiry);

  const isPeriodOk = daysToExpiry >= releaseDays;
  let status: 'OK' | 'ALERTA' | 'CRÍTICO' | 'BLOQUEADO' = 'OK';
  let baseRisk: ItemRiskLevel = 'Baixo';
  let validityAlertObservation = '';

  if (daysToExpiry < 0) {
    status = 'BLOQUEADO';
    baseRisk = 'Alto';
    validityAlertObservation = `PRODUTO VENCIDO: Data de validade (${formatDateBR(validity)}) anterior ao recebimento! Bloqueio imediato.`;
  } else if (daysToExpiry < releaseDays) {
    status = 'CRÍTICO';
    baseRisk = 'Alto';
    validityAlertObservation = `ALERTA CRÍTICO: Restam ${daysToExpiry} dias (inferior ao prazo de liberação de ${releaseDays} dias).`;
  } else if (isUnder60Days) {
    status = 'CRÍTICO';
    baseRisk = 'Alto';
    validityAlertObservation = `ALERTA CRÍTICO: Validade &le; 60 dias (restam ${daysToExpiry} dias, SAI: ${stockAgeIndex}%). Prioridade de carregamento.`;
  } else if (daysToExpiry <= 90) { // < 3 meses (90 dias)
    status = 'ALERTA';
    baseRisk = hasRunoffRisk ? 'Alto' : 'Médio';
    validityAlertObservation = `ALERTA: Validade reduzida (${daysToExpiry} dias restantes &le; 90 dias / 3 meses, SAI: ${stockAgeIndex}%).`;
  } else if (hasRunoffRisk && neededRunoffDays > usefulDaysUntilPreBlock) {
    status = 'ALERTA';
    baseRisk = 'Médio';
    validityAlertObservation = `ALERTA DE ESCOAMENTO: Venda média de ${dailySalesAvg} ${item.unit || 'cx'}/dia necessita de ~${neededRunoffDays} dias para escoar.`;
  } else {
    // Normal: mais de 90 dias / 3 meses
    status = 'OK';
    baseRisk = 'Baixo';
    validityAlertObservation = `Validade regular (${daysToExpiry} dias restantes, SAI ${stockAgeIndex}% - OK).`;
  }

  // Pre-bloqueio: SEMPRE 30 dias antes do vencimento
  const preBlockDate = subtractDaysFromDate(validity, 30);
  // Carregamento até: 30 dias antes do vencimento
  const loadUntilDate = subtractDaysFromDate(validity, 30);

  const totalHectoliter = Number((qtySku * hFactor).toFixed(2));
  const totalValue = Number((qtySku * price).toFixed(2));

  return {
    id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    pullId: item.pullId,
    productCode: item.productCode || catalogItem?.code || '',
    description: catalogItem?.description || item.description || '',
    unit: catalogItem?.unit || item.unit || 'cx12',
    quantitySku: qtySku,
    palletCount: pallets,
    lastroCount: lastros,
    validityDate: validity,
    manufacturingDate: item.manufacturingDate,
    status,
    releasePeriodDays: 30,
    daysToExpiry,
    isPeriodOk,
    baseRisk,
    runoffDays: item.runoffDays ?? (neededRunoffDays || 2.0),
    abcClass: abc,
    hectoliterFactor: hFactor,
    totalHectoliter,
    unitPrice: price,
    totalValue,
    preBlockDate: preBlockDate,
    loadUntilDate: loadUntilDate,
    palletNumber: item.palletNumber || 1,
    dailySalesAvg,
    neededRunoffDays,
    hasRunoffRisk,
    isUnder60Days,
    validityAlertObservation,
    productShelfLifeDays,
    stockAgeIndex,
    saiClassification
  };
}

/**
 * Universal number parser for Portuguese / Brazilian format and Ambev exported text
 * Handles: '47578;09' -> 47578.09, '47.578,09' -> 47578.09, '  123 ' -> 123
 */
function parseAmbevNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  
  // Format with negative e.g. - 115;-00
  const isNegative = str.includes('-');
  
  // Remove spaces
  let cleaned = str.replace(/[^\d.,;]/g, '');
  if (cleaned.includes(';')) {
    // Ambev format e.g. "47578;09" (integer;cents)
    const [intP, decP] = cleaned.split(';');
    const num = parseFloat(`${intP}.${decP || '0'}`);
    return isNegative ? -Math.abs(num) : num;
  }
  
  // Standard pt-BR format: "47.578,09" or "47578,09"
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

/**
 * Parse any raw text or CSV or TSV data into Report030519Item[]
 */
export function parse030519Report(rawText: string): Report030519Item[] {
  const lines = rawText.split(/\r?\n/);
  const items: Report030519Item[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase().includes('unb') && (trimmed.toLowerCase().includes('produto') || trimmed.toLowerCase().includes('origem'))) {
      continue; // Skip header
    }

    // Try splitting by semicolon, comma or tab
    let delimiter = ';';
    if (!trimmed.includes(';') && trimmed.includes('\t')) delimiter = '\t';
    else if (!trimmed.includes(';') && trimmed.includes(',')) delimiter = ',';

    const parts = trimmed.split(delimiter).map(p => p.trim());
    if (parts.length < 5) continue;

    let unb = '0005';
    let unbOrigin = '0005';
    let productCode = '';
    let productName = '';
    let unit = 'cx';
    let sales = 0;
    let bonus = 0;
    let loan = 0;
    let shipment = 0;
    let totalMovement = 0;
    let returnPct = 0;

    // Detect numeric product code (e.g. 0863059 -> 863059 or 0000982 -> 982)
    const codeIndex = parts.findIndex((p, idx) => idx >= 2 && idx <= 8 && /^\d{4,8}$/.test(p.replace(/\D/g, '')));
    
    if (codeIndex !== -1) {
      unb = parts[0] || '0005';
      unbOrigin = parts[1] || '0005';
      
      const rawCode = parts[codeIndex].replace(/\D/g, '');
      productCode = String(parseInt(rawCode, 10));
      productName = (parts[codeIndex + 1] || '').trim();
      unit = (parts[codeIndex + 2] || 'cx').trim();

      // Find sales and movement columns
      if (parts.length > codeIndex + 3) sales = parseAmbevNumber(parts[codeIndex + 3]);
      if (parts.length > codeIndex + 5) bonus = parseAmbevNumber(parts[codeIndex + 5]);
      if (parts.length > codeIndex + 7) loan = parseAmbevNumber(parts[codeIndex + 7]);
      if (parts.length > codeIndex + 9) shipment = parseAmbevNumber(parts[codeIndex + 9]);

      // Last or second to last is total
      const candidateTotal1 = parseAmbevNumber(parts[parts.length - 2]);
      const candidateTotal2 = parseAmbevNumber(parts[parts.length - 1]);
      totalMovement = candidateTotal1 > 0 ? candidateTotal1 : (candidateTotal2 > 0 ? candidateTotal2 : Math.max(sales, bonus, shipment));

      // Return pct
      const pctCol = parts[parts.length - 3] || parts[parts.length - 4];
      returnPct = parseAmbevNumber(pctCol);
    } else {
      // Direct columns fallback
      productCode = parts[6] ? String(parseInt(parts[6].replace(/\D/g, ''), 10) || parts[6]) : (parts[2] || '');
      productName = parts[7] || parts[3] || '';
      unit = parts[8] || parts[4] || 'cx';
      sales = parseAmbevNumber(parts[9] || parts[5]);
      totalMovement = parseAmbevNumber(parts[parts.length - 2]) || sales;
    }

    if (productCode && productName) {
      const monthlyVol = Math.max(sales, totalMovement, 0);
      const dailySales = monthlyVol > 0 ? monthlyVol / 30 : 0;
      const defaultStock = monthlyVol * 0.4;
      const estimatedRunoff = dailySales > 0 ? Number((defaultStock / dailySales).toFixed(1)) : 0;

      items.push({
        unb,
        unbOrigin,
        productCode,
        productName,
        unit,
        sales,
        bonus,
        loan,
        shipment,
        consignment: 0,
        supplierReturn: 0,
        transfer: 0,
        other: 0,
        returnAmount: 0,
        returnPct,
        totalMovement: monthlyVol,
        dailySalesAvg: Number(dailySales.toFixed(1)),
        estimatedStockRunoffDays: estimatedRunoff
      });
    }
  }

  return items;
}

/**
 * Universal file parser that supports .xlsx, .xls, .csv, .txt, .tsv, .dat
 */
export async function parseUniversalFile(file: File): Promise<{
  reportItems: Report030519Item[];
  rawText: string;
}> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (['xlsx', 'xls', 'ods'].includes(extension)) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // Convert to CSV
    const csvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
    const items = parse030519Report(csvContent);
    return { reportItems: items, rawText: csvContent };
  } else {
    // Text based: csv, txt, tsv, dat
    const text = await file.text();
    const items = parse030519Report(text);
    return { reportItems: items, rawText: text };
  }
}

/**
 * Calculates Pareto 70 / 20 / 10 ABC Curve:
 * - Sorts products descending by total movement (sales / volume).
 * - Computes cumulative percentage.
 * - Accum 0% -> 70% = Class 'A'
 * - Accum 70% -> 90% = Class 'B' (the next 20%)
 * - Accum 90% -> 100% = Class 'C' (the last 10%)
 * 
 * Returns updated catalog and updated report items.
 */
export function calculateParetoABC(
  reportItems: Report030519Item[],
  currentCatalog: ProductCatalogItem[]
): {
  updatedCatalog: ProductCatalogItem[];
  updatedReport: Report030519Item[];
  summary: {
    totalVolume: number;
    countA: number;
    countB: number;
    countC: number;
    shareA: number;
    shareB: number;
    shareC: number;
  };
} {
  // Aggregate movement by product code
  const volumeMap = new Map<string, { totalMovement: number; name: string; unit: string }>();

  reportItems.forEach(item => {
    const existing = volumeMap.get(item.productCode) || { totalMovement: 0, name: item.productName, unit: item.unit };
    existing.totalMovement += Math.max(item.totalMovement, item.sales, 0);
    volumeMap.set(item.productCode, existing);
  });

  // Calculate total overall movement
  let totalVolume = 0;
  volumeMap.forEach(v => {
    totalVolume += v.totalMovement;
  });

  if (totalVolume === 0) totalVolume = 1;

  // Sort products by total movement descending
  const sortedItems = Array.from(volumeMap.entries()).sort((a, b) => b[1].totalMovement - a[1].totalMovement);

  let cumulative = 0;
  const productAbcMap = new Map<string, { abc: ABCClass; rank: number; cumulativePct: number; share: number }>();

  let countA = 0;
  let countB = 0;
  let countC = 0;
  let volA = 0;
  let volB = 0;
  let volC = 0;

  sortedItems.forEach(([code, data], index) => {
    const rank = index + 1;
    const itemVol = data.totalMovement;
    cumulative += itemVol;
    const cumulativePct = Number(((cumulative / totalVolume) * 100).toFixed(2));
    const share = Number(((itemVol / totalVolume) * 100).toFixed(2));

    let abc: ABCClass = 'C';
    if (cumulativePct <= 70 || (rank === 1 && cumulativePct > 70)) {
      abc = 'A';
      countA++;
      volA += itemVol;
    } else if (cumulativePct <= 90) {
      abc = 'B';
      countB++;
      volB += itemVol;
    } else {
      abc = 'C';
      countC++;
      volC += itemVol;
    }

    productAbcMap.set(code, { abc, rank, cumulativePct, share });
  });

  // Update Report Items with ABC classes
  const updatedReport: Report030519Item[] = reportItems.map(item => {
    const abcInfo = productAbcMap.get(item.productCode);
    return {
      ...item,
      abcClass: abcInfo?.abc || 'C',
      rank: abcInfo?.rank,
      cumulativePct: abcInfo?.cumulativePct
    };
  });

  // Update Product Catalog with new ABC classifications and ranks
  const updatedCatalog: ProductCatalogItem[] = currentCatalog.map(prod => {
    const abcInfo = productAbcMap.get(prod.code);
    const initialPreset = INITIAL_PRODUCTS.find(i => i.code === prod.code);
    return {
      ...prod,
      palletFactor: prod.palletFactor || initialPreset?.palletFactor || 100,
      lastroFactor: prod.lastroFactor || initialPreset?.lastroFactor || 10,
      hectoliterFactor: prod.hectoliterFactor || initialPreset?.hectoliterFactor || 0.04,
      price: prod.price || initialPreset?.price || 35.00,
      unitPrice: prod.unitPrice || initialPreset?.unitPrice || 2.50,
      abcClass: abcInfo?.abc || prod.abcClass || 'C',
      rank: abcInfo?.rank || prod.rank,
      monthlyMovement: volumeMap.get(prod.code)?.totalMovement || prod.monthlyMovement,
      cumulativeShare: abcInfo?.cumulativePct || prod.cumulativeShare
    };
  });

  // Also add any new products from the report that were not in catalog
  sortedItems.forEach(([code, data]) => {
    const exists = updatedCatalog.some(p => p.code === code);
    if (!exists && data.name) {
      const abcInfo = productAbcMap.get(code);
      const initialPreset = INITIAL_PRODUCTS.find(i => i.code === code);
      updatedCatalog.push({
        code,
        description: data.name,
        unit: data.unit || initialPreset?.unit || 'cx',
        category: initialPreset?.category || 'Ambev Fabril',
        price: initialPreset?.price || 35.00,
        unitPrice: initialPreset?.unitPrice || 2.50,
        hectoliterFactor: initialPreset?.hectoliterFactor || 0.04,
        palletFactor: initialPreset?.palletFactor || 100,
        lastroFactor: initialPreset?.lastroFactor || 10,
        abcClass: abcInfo?.abc || 'C',
        rank: abcInfo?.rank,
        defaultShelfLifeDays: initialPreset?.defaultShelfLifeDays || 180,
        packaging: initialPreset?.packaging || '',
        factorSKU: initialPreset?.factorSKU || 12,
        monthlyMovement: data.totalMovement,
        cumulativeShare: abcInfo?.cumulativePct
      });
    }
  });

  return {
    updatedCatalog,
    updatedReport,
    summary: {
      totalVolume,
      countA,
      countB,
      countC,
      shareA: Number(((volA / totalVolume) * 100).toFixed(1)),
      shareB: Number(((volB / totalVolume) * 100).toFixed(1)),
      shareC: Number(((volC / totalVolume) * 100).toFixed(1))
    }
  };
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
}

export function getAbcBadgeColor(abc: ABCClass): { bg: string; text: string; border: string; hex: string } {
  switch (abc) {
    case 'A':
      return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600', hex: '#10b981' };
    case 'B':
      return { bg: 'bg-amber-400', text: 'text-amber-950', border: 'border-amber-500', hex: '#fbbf24' };
    case 'C':
      return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600', hex: '#ef4444' };
  }
}

/**
 * Universal Excel / CSV Exporter using SheetJS
 */
export function exportDataToExcel(data: any[], fileName: string, sheetName: string = 'Dados') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Export all databases of the platform in a comprehensive multi-sheet Excel Workbook
 */
export function formatHL(hl: number | undefined | null): string {
  if (hl === undefined || hl === null || isNaN(hl)) return '0,00 HL';
  return `${hl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HL`;
}

export function calculateLossHectoliters(
  productCode: string,
  quantity: number,
  catalog: ProductCatalogItem[]
): number {
  if (!quantity || quantity <= 0) return 0;
  const item = catalog.find(c => c.code === productCode);
  const factor = item?.hectoliterFactor || 0.04;
  return Number((quantity * factor).toFixed(2));
}

/**
 * Export full system state to a structured JSON file
 */
export function exportAllToJSON(data: {
  pulls: PullRecord[];
  blitzRecords: BlitzPalletRecord[];
  pncs: PNCRecord[];
  report030519: Report030519Item[];
  catalog: ProductCatalogItem[];
  extraMetadata?: Record<string, any>;
}) {
  const exportPayload = {
    version: '2.5',
    exportTimestamp: new Date().toISOString(),
    system: 'Sistema de Controle NRI & Logística Ambev - Pau Brasil Guarabira',
    metadata: {
      totalPulls: data.pulls.length,
      totalBlitz: data.blitzRecords.length,
      totalPnc: data.pncs.length,
      totalCatalog: data.catalog.length,
      total030519: data.report030519.length,
      ...data.extraMetadata
    },
    data: {
      pulls: data.pulls,
      blitzRecords: data.blitzRecords,
      pncs: data.pncs,
      report030519: data.report030519,
      catalog: data.catalog
    }
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BACKUP_TOTAL_NRI_PAUBRASIL_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to download an array of objects as a standard RFC-4180 / Excel-friendly CSV with UTF-8 BOM
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('Nenhum dado disponível para exportar nesta tabela.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row (using semicolon separator for PT-BR Excel compatibility)
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(';'));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(';'));
  }

  // Prepend UTF-8 Byte Order Mark (BOM) so Excel opens UTF-8 special characters correctly
  const csvString = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export all system databases as individual CSV files
 */
export function exportAllBasesToCSV(params: {
  pulls: PullRecord[];
  blitzRecords: BlitzPalletRecord[];
  pncs: PNCRecord[];
  report030519: Report030519Item[];
  catalog: ProductCatalogItem[];
}) {
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Puxadas
  const pullRows: any[] = [];
  params.pulls.forEach(p => {
    p.items.forEach((item, idx) => {
      pullRows.push({
        'ID Puxada': p.header.id,
        'Nº Nota Fiscal': p.header.nfeNumber,
        'Data Recebimento': formatDateBR(p.header.receiptDate),
        'Hora': p.header.receiptTime,
        'Carreta / Placa': p.header.truckPlate,
        'Fábrica Origem': p.header.factoryOrigin,
        'Turno': p.header.shift,
        'Conferente': p.header.receiverName,
        'Status Carga': p.header.status,
        'Pallet Nº': item.palletNumber || (idx + 1),
        'Código SKU': item.productCode,
        'Descrição': item.description,
        'Qtd SKU': item.quantitySku,
        'Pallets': item.palletCount,
        'Lastros': item.lastroCount,
        'Data Validade': formatDateBR(item.validityDate),
        'Dias até Vencimento': item.daysToExpiry,
        'Status Validade': item.status,
        'Curva ABC': item.abcClass,
        'Venda Média Diária': item.dailySalesAvg ? `${item.dailySalesAvg} ${item.unit || 'cx'}/dia` : '-',
        'Dias para Escoar': item.neededRunoffDays ? `${item.neededRunoffDays} dias` : '-',
        'Alerta <= 60 Dias': item.isUnder60Days ? 'SIM (CRÍTICO)' : 'NÃO',
        'Risco Não Escoar': item.hasRunoffRisk ? 'SIM (ALERTA)' : 'NÃO',
        'Observação de Validade': item.validityAlertObservation || '-',
        'Volume Total (HL)': item.totalHectoliter,
        'Valor Total (R$)': item.totalValue
      });
    });
  });
  if (pullRows.length > 0) {
    exportToCSV(pullRows, `1_Historico_Puxadas_NRI_${dateStr}.csv`);
  }

  // 2. Blitz Avarias
  const blitzRows = params.blitzRecords.map(b => {
    const hFactor = params.catalog.find(c => c.code === b.productCode)?.hectoliterFactor || 0.04;
    return {
      'ID Blitz': b.id,
      'Nota Fiscal': b.nfeNumber,
      'Placa': b.truckPlate,
      'Fábrica Origem': b.factoryOrigin,
      'Pallet Nº': b.palletNumber,
      'Código SKU': b.productCode,
      'Produto': b.productDescription,
      'Qtd Bloqueada (Pallet)': b.blockedQty,
      'Qtd Retida (Avaria)': b.retainedQty,
      'Volume Perdido (HL)': Number((b.retainedQty * hFactor).toFixed(2)),
      'Prejuízo Financeiro (R$)': b.lossValue,
      'Tipo Avaria': b.damageType,
      'Status': b.status,
      'Data Bloqueio': formatDateBR(b.blockDate),
      'Data Liberação': b.releaseDate ? formatDateBR(b.releaseDate) : 'Pendente',
      'Conferente': b.conferente,
      'PNC Vinculado': b.pncId || 'Não'
    };
  });
  if (blitzRows.length > 0) {
    setTimeout(() => exportToCSV(blitzRows, `2_Blitz_Avarias_Pallets_${dateStr}.csv`), 300);
  }

  // 3. PNCs
  const pncRows = params.pncs.map(pnc => {
    const hFactor = params.catalog.find(c => c.code === pnc.productCode)?.hectoliterFactor || 0.04;
    return {
      'Nº PNC': pnc.pncNumber,
      'Nota Fiscal': pnc.nfeNumber,
      'Placa': pnc.truckPlate,
      'Fábrica Origem': pnc.factoryOrigin,
      'Código SKU': pnc.productCode,
      'Descrição': pnc.productDescription,
      'Lote': pnc.lotNumber,
      'Validade': formatDateBR(pnc.validityDate),
      'Qtd Bloqueada (cx)': pnc.quantityBlocked,
      'Volume Bloqueado (HL)': Number((pnc.quantityBlocked * hFactor).toFixed(2)),
      'Prejuízo (R$)': pnc.lossValue,
      'Tipo Não Conformidade': pnc.qualityIssueType,
      'Motivo do Bloqueio': pnc.reason,
      'Status Bloqueio Fiscal': pnc.fiscalBlockStatus,
      'Solicitante': pnc.requestedBy,
      'Data Solicitação': pnc.requestDate,
      'Bloqueio Efetivado Por': pnc.fiscalBlockRealizedBy || '-',
      'Data Bloqueio Fiscal': pnc.fiscalBlockDate || '-',
      'Protocolo Promax': pnc.promaxProtocol || '-'
    };
  });
  if (pncRows.length > 0) {
    setTimeout(() => exportToCSV(pncRows, `3_PNC_Produtos_Nao_Conformes_${dateStr}.csv`), 600);
  }

  // 4. 03.05.19
  const reportRows = params.report030519.map(r => ({
    'UNB': r.unb,
    'Origem': r.unbOrigin,
    'Código SKU': r.productCode,
    'Produto': r.productName,
    'Unidade': r.unit,
    'Curva ABC': r.abcClass || '-',
    'Ranking': r.rank || '-',
    '% Acumulado': r.cumulativePct ? `${r.cumulativePct}%` : '-',
    'Vendas': r.sales,
    'Bonificação': r.bonus,
    'Remessa': r.shipment,
    'Movimento Total': r.totalMovement,
    '% Devolução': r.returnPct,
    'Média Diária': r.dailySalesAvg || '-',
    'Dias Escoamento': r.estimatedStockRunoffDays || '-'
  }));
  if (reportRows.length > 0) {
    setTimeout(() => exportToCSV(reportRows, `4_Relatorio_030519_Pareto_${dateStr}.csv`), 900);
  }

  // 5. Catálogo
  const catRows = params.catalog.map(c => ({
    'Código SKU': c.code,
    'Descrição': c.description,
    'Unidade': c.unit,
    'Categoria': c.category,
    'Preço Unitário (R$)': c.price,
    'Fator HL': c.hectoliterFactor,
    'Fator Pallet (cx)': c.palletFactor,
    'Fator Lastro (cx)': c.lastroFactor,
    'Curva ABC': c.abcClass,
    'Shelf Life Padrão (Dias)': c.defaultShelfLifeDays || 180
  }));
  if (catRows.length > 0) {
    setTimeout(() => exportToCSV(catRows, `5_Catalogo_SKU_Ambev_${dateStr}.csv`), 1200);
  }
}

export function exportAllSystemBasesToExcel(params: {
  catalog: ProductCatalogItem[];
  pulls: PullRecord[];
  blitzRecords: BlitzPalletRecord[];
  pncs: PNCRecord[];
  report030519: Report030519Item[];
  suppliers?: SupplierItem[];
}) {
  const wb = XLSX.utils.book_new();

  // 1. Catálogo de Produtos
  const catalogRows = params.catalog.map(c => ({
    'Código SKU': c.code,
    'Descrição': c.description,
    'Unidade': c.unit,
    'Categoria': c.category,
    'Curva ABC (Pareto 70/20/10)': c.abcClass,
    'Ranking': c.rank || '-',
    'Preço Unitário (R$)': c.price,
    'Fator Pallet': c.palletFactor,
    'Fator Lastro': c.lastroFactor,
    'Fator Hectolitro': c.hectoliterFactor,
    'Shelf-Life Padrão (Dias)': c.defaultShelfLifeDays || 180,
    'Movimentação Mensal': c.monthlyMovement || '-'
  }));
  const wsCatalog = XLSX.utils.json_to_sheet(catalogRows);
  XLSX.utils.book_append_sheet(wb, wsCatalog, '1_Cadastros_Produtos');

  // 2. Histórico de Puxadas / NRIs
  const pullRows: any[] = [];
  params.pulls.forEach(p => {
    p.items.forEach((item, idx) => {
      pullRows.push({
        'ID Puxada': p.header.id,
        'Nº Nota Fiscal': p.header.nfeNumber,
        'Data Recebimento': formatDateBR(p.header.receiptDate),
        'Hora': p.header.receiptTime,
        'Carreta / Placa': p.header.truckPlate,
        'Fábrica Origem': p.header.factoryOrigin,
        'Turno': p.header.shift,
        'Conferente': p.header.receiverName,
        'Status Carga': p.header.status,
        'Pallet Nº': item.palletNumber || (idx + 1),
        'Código SKU': item.productCode,
        'Descrição': item.description,
        'Qtd SKU': item.quantitySku,
        'Pallets': item.palletCount,
        'Lastros': item.lastroCount,
        'Data Validade': formatDateBR(item.validityDate),
        'Dias até Vencimento': item.daysToExpiry,
        'Status Validade': item.status,
        'Curva ABC': item.abcClass,
        'Venda Média Diária': item.dailySalesAvg ? `${item.dailySalesAvg} ${item.unit || 'cx'}/dia` : '-',
        'Dias para Escoamento': item.neededRunoffDays ? `${item.neededRunoffDays} dias` : '-',
        'Alerta <= 60 Dias': item.isUnder60Days ? 'SIM' : 'NÃO',
        'Risco Não Escoar a Tempo': item.hasRunoffRisk ? 'SIM' : 'NÃO',
        'Observação / Diagnóstico Validade': item.validityAlertObservation || '-',
        'Volume Total (HL)': item.totalHectoliter,
        'Valor Total (R$)': item.totalValue
      });
    });
  });
  const wsPulls = XLSX.utils.json_to_sheet(pullRows);
  XLSX.utils.book_append_sheet(wb, wsPulls, '2_Historico_Puxadas');

  // 3. Blitz de Puxada & Avarias
  const blitzRows = params.blitzRecords.map(b => {
    const hFactor = params.catalog.find(c => c.code === b.productCode)?.hectoliterFactor || 0.04;
    return {
      'ID Blitz': b.id,
      'Nota Fiscal': b.nfeNumber,
      'Placa': b.truckPlate,
      'Fábrica Origem': b.factoryOrigin,
      'Pallet Nº': b.palletNumber,
      'Código SKU': b.productCode,
      'Produto': b.productDescription,
      'Qtd Bloqueada (Pallet)': b.blockedQty,
      'Qtd Retida (Avaria)': b.retainedQty,
      'Qtd Liberada': b.releasedQty,
      'Volume Perdido (HL)': Number((b.retainedQty * hFactor).toFixed(2)),
      'Prejuízo Financeiro (R$)': b.lossValue,
      'Tipo Avaria': b.damageType,
      'Status': b.status,
      'Data Bloqueio': formatDateBR(b.blockDate),
      'Data Liberação': b.releaseDate ? formatDateBR(b.releaseDate) : 'Pendente',
      'Conferente': b.conferente,
      'PNC Vinculado': b.pncId || 'Não'
    };
  });
  const wsBlitz = XLSX.utils.json_to_sheet(blitzRows);
  XLSX.utils.book_append_sheet(wb, wsBlitz, '3_Blitz_Avarias');

  // 4. PNCs & Bloqueios Fiscais
  const pncRows = params.pncs.map(pnc => {
    const hFactor = params.catalog.find(c => c.code === pnc.productCode)?.hectoliterFactor || 0.04;
    return {
      'Nº PNC': pnc.pncNumber,
      'Nota Fiscal': pnc.nfeNumber,
      'Placa': pnc.truckPlate,
      'Fábrica Origem': pnc.factoryOrigin,
      'Código SKU': pnc.productCode,
      'Descrição': pnc.productDescription,
      'Lote': pnc.lotNumber,
      'Validade': formatDateBR(pnc.validityDate),
      'Qtd Bloqueada': pnc.quantityBlocked,
      'Volume Bloqueado (HL)': Number((pnc.quantityBlocked * hFactor).toFixed(2)),
      'Prejuízo (R$)': pnc.lossValue,
      'Tipo Não Conformidade': pnc.qualityIssueType,
      'Motivo do Bloqueio': pnc.reason,
      'Status Bloqueio Fiscal': pnc.fiscalBlockStatus,
      'Solicitante': pnc.requestedBy,
      'Data Solicitação': pnc.requestDate,
      'Bloqueio Efetivado Por': pnc.fiscalBlockRealizedBy || '-',
      'Data Bloqueio Fiscal': pnc.fiscalBlockDate || '-',
      'Protocolo Promax': pnc.promaxProtocol || '-'
    };
  });
  const wsPnc = XLSX.utils.json_to_sheet(pncRows);
  XLSX.utils.book_append_sheet(wb, wsPnc, '4_PNC_Bloqueio_Fiscal');

  // 5. Relatório 03.05.19
  const reportRows = params.report030519.map(r => ({
    'UNB': r.unb,
    'Origem': r.unbOrigin,
    'Código SKU': r.productCode,
    'Produto': r.productName,
    'Unidade': r.unit,
    'Curva ABC': r.abcClass || '-',
    'Ranking': r.rank || '-',
    '% Acumulado': r.cumulativePct ? `${r.cumulativePct}%` : '-',
    'Vendas': r.sales,
    'Bonificação': r.bonus,
    'Remessa': r.shipment,
    'Movimento Total': r.totalMovement,
    '% Devolução': r.returnPct,
    'Média Diária': r.dailySalesAvg || '-',
    'Dias Escoamento': r.estimatedStockRunoffDays || '-'
  }));
  const wsReport = XLSX.utils.json_to_sheet(reportRows);
  XLSX.utils.book_append_sheet(wb, wsReport, '5_030519_Escoamento');

  // 6. Fábricas & Fornecedores
  if (params.suppliers && params.suppliers.length > 0) {
    const supplierRows = params.suppliers.map(s => ({
      'Código': s.code,
      'Nome / Razão Social': s.name,
      'Tipo': s.type,
      'Localização / UF': s.location || '-',
      'Status': s.active ? 'Ativo' : 'Inativo',
      'Observações': s.notes || '-'
    }));
    const wsSuppliers = XLSX.utils.json_to_sheet(supplierRows);
    XLSX.utils.book_append_sheet(wb, wsSuppliers, '6_Fornecedores_Fabricantes');
  }

  XLSX.writeFile(wb, `BACKUP_COMPLETO_NRI_AMBEV_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Parses a simple 3-column ABC Curve Excel/CSV file containing:
 * - Código (Product Code / SKU)
 * - Descrição (Product Description / Name)
 * - Curva (A, B, or C)
 */
export async function parseSimpleAbcCurveExcel(file: File): Promise<{
  items: { rank: number; code: string; description: string; abcClass: 'A' | 'B' | 'C' }[];
  summary: { total: number; countA: number; countB: number; countC: number; invalidCount: number };
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Read as array of arrays or json
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rows || rows.length === 0) {
          throw new Error('O arquivo está vazio.');
        }

        // Find header row or assume first row
        let headerRowIdx = 0;
        let codeColIdx = -1;
        let descColIdx = -1;
        let curveColIdx = -1;

        // Try to locate columns by name in the first 5 rows
        for (let r = 0; r < Math.min(rows.length, 5); r++) {
          const row = rows[r];
          if (!Array.isArray(row)) continue;

          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || '').trim().toUpperCase();
            if (['CODIGO', 'CÓDIGO', 'SKU', 'COD', 'COD_PRODUTO', 'PRODUTO_COD', 'ITEM'].includes(val)) {
              codeColIdx = c;
              headerRowIdx = r;
            } else if (['DESCRICAO', 'DESCRIÇÃO', 'PRODUTO', 'NOME', 'DESC', 'NOME DO PRODUTO'].includes(val)) {
              descColIdx = c;
              headerRowIdx = r;
            } else if (['CURVA', 'CURVA ABC', 'ABC', 'CLASSE', 'CLASSIFICACAO', 'CLASSIFICAÇÃO'].includes(val)) {
              curveColIdx = c;
              headerRowIdx = r;
            }
          }

          if (codeColIdx !== -1 && curveColIdx !== -1) {
            break;
          }
        }

        // Fallback: If headers were not found by text, assume Col 0 = Código, Col 1 = Descrição, Col 2 = Curva
        if (codeColIdx === -1 || curveColIdx === -1) {
          codeColIdx = 0;
          descColIdx = 1;
          curveColIdx = 2;
          // Check if first row contains non-data header text
          const firstVal = String(rows[0][0] || '').trim().toUpperCase();
          if (firstVal.includes('COD') || isNaN(Number(firstVal))) {
            headerRowIdx = 0;
          } else {
            headerRowIdx = -1; // No header, start from 0
          }
        }

        if (descColIdx === -1) {
          descColIdx = codeColIdx === 0 ? 1 : 0;
        }

        const items: { rank: number; code: string; description: string; abcClass: 'A' | 'B' | 'C' }[] = [];
        let countA = 0;
        let countB = 0;
        let countC = 0;
        let invalidCount = 0;

        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row) || row.length === 0) continue;

          const rawCode = String(row[codeColIdx] || '').trim().replace(/^'+/, '');
          const rawDesc = String(row[descColIdx] || '').trim();
          let rawCurve = String(row[curveColIdx] || '').trim().toUpperCase();

          // Ignore blank rows
          if (!rawCode && !rawDesc) continue;

          // Normalize curve value (extract first letter A, B, or C)
          let abcClass: 'A' | 'B' | 'C' = 'C';
          if (rawCurve.startsWith('A')) {
            abcClass = 'A';
            countA++;
          } else if (rawCurve.startsWith('B')) {
            abcClass = 'B';
            countB++;
          } else if (rawCurve.startsWith('C')) {
            abcClass = 'C';
            countC++;
          } else {
            // Default to C if unspecified or unrecognized
            abcClass = 'C';
            invalidCount++;
            countC++;
          }

          if (rawCode) {
            items.push({
              rank: items.length + 1,
              code: rawCode,
              description: rawDesc || `PRODUTO ${rawCode}`,
              abcClass
            });
          }
        }

        resolve({
          items,
          summary: {
            total: items.length,
            countA,
            countB,
            countC,
            invalidCount
          }
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Erro ao processar planilha Excel'));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generates and triggers download of a standardized 3-column ABC Curve template
 */
export function downloadAbcCurveTemplate(): void {
  const data = [
    { 'CÓDIGO': '34608', 'DESCRIÇÃO': 'SKOL LATA 350ML SH C/12 NPAL MULTIPACK', 'CURVA': 'A' },
    { 'CÓDIGO': '9067', 'DESCRIÇÃO': 'ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL', 'CURVA': 'A' },
    { 'CÓDIGO': '37450', 'DESCRIÇÃO': 'BUDWEISER LT SLEEK 350ML SH C 12 MULTIPACK', 'CURVA': 'A' },
    { 'CÓDIGO': '19164', 'DESCRIÇÃO': 'GUARANA CHP ANTARCTICA PET 1L PACK C/2 MULTPACK', 'CURVA': 'B' },
    { 'CÓDIGO': '33857', 'DESCRIÇÃO': 'STELLA ARTOIS PURE GOLD 600ML', 'CURVA': 'B' },
    { 'CÓDIGO': '504', 'DESCRIÇÃO': 'PEPSI COLA PET 2L CAIXA C/6', 'CURVA': 'C' },
    { 'CÓDIGO': '503', 'DESCRIÇÃO': 'SUKITA PET 2L CAIXA C/6', 'CURVA': 'C' }
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  // Column widths
  ws['!cols'] = [{ wch: 15 }, { wch: 55 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Curva_ABC');
  XLSX.writeFile(wb, 'MODELO_IMPORTACAO_CURVA_ABC_PAU_BRASIL.xlsx');
}

