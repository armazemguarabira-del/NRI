import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Calendar, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Truck, 
  Building2, 
  Clock, 
  CheckCircle2, 
  Package, 
  ArrowRight,
  Printer,
  Sparkles,
  TrendingDown,
  Info
} from 'lucide-react';
import { PullRecord, ProductCatalogItem } from '../types';
import { formatDateBR, formatBRL, exportDataToExcel } from '../utils/nriCalculations';

interface ValidityAlertsViewProps {
  pulls: PullRecord[];
  catalog: ProductCatalogItem[];
  onSelectPull: (pullId: string) => void;
}

export const ValidityAlertsView: React.FC<ValidityAlertsViewProps> = ({
  pulls,
  catalog,
  onSelectPull
}) => {
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterFactory, setFactoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Collect all items across all pulls with enriched alert calculation
  const allAlertItems = useMemo(() => {
    const list: Array<{
      itemKey: string;
      pullId: string;
      nfeNumber: string;
      truckPlate: string;
      factoryOrigin: string;
      receiptDate: string;
      productCode: string;
      description: string;
      quantitySku: number;
      palletCount: number;
      validityDate: string;
      daysToExpiry: number;
      releasePeriodDays: number;
      isPeriodOk: boolean;
      baseRisk: 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
      runoffDays: number;
      preBlockDate: string;
      loadUntilDate: string;
      totalValue: number;
      status: string;
      dailySalesAvg: number;
      neededRunoffDays: number;
      hasRunoffRisk: boolean;
      isUnder60Days: boolean;
      validityAlertObservation: string;
      abcClass: string;
      productShelfLifeDays: number;
      stockAgeIndex: number;
      saiClassification: 'CRÍTICO' | 'ATENÇÃO' | 'OK';
    }> = [];

    pulls.forEach(p => {
      p.items.forEach(it => {
        const catItem = catalog.find(c => c.code === it.productCode);
        const daysToExpiry = it.daysToExpiry;
        const releaseDays = it.releasePeriodDays || 30;

        // Idade do Produto (Shelf Life Total) & Stock Age Index (%) = (Dias Restantes ÷ Idade do Produto) × 100
        const productShelfLifeDays = Number(it.productShelfLifeDays) || Number(catItem?.defaultShelfLifeDays) || 180;
        const rawSai = productShelfLifeDays > 0 ? (daysToExpiry / productShelfLifeDays) * 100 : 100;
        const stockAgeIndex = it.stockAgeIndex ?? Number(Math.max(0, Math.min(100, rawSai)).toFixed(1));
        const saiClassification: 'CRÍTICO' | 'ATENÇÃO' | 'OK' = 
          stockAgeIndex < 60 ? 'CRÍTICO' : stockAgeIndex <= 75 ? 'ATENÇÃO' : 'OK';
        
        let dailySales = it.dailySalesAvg || 0;
        if (!dailySales) {
          if (catItem?.monthlyMovement && catItem.monthlyMovement > 0) {
            dailySales = Number((catItem.monthlyMovement / 30).toFixed(1));
          } else {
            dailySales = it.abcClass === 'A' ? 40 : it.abcClass === 'B' ? 10 : 2;
          }
        }

        const neededRunoff = it.neededRunoffDays || (dailySales > 0 ? Number((it.quantitySku / dailySales).toFixed(1)) : 0);
        const usefulDaysUntilPreBlock = Math.max(0, daysToExpiry - releaseDays);
        
        const isUnder60 = it.isUnder60Days ?? (daysToExpiry <= 60 && daysToExpiry >= 0);
        const hasRunoff = it.hasRunoffRisk ?? (dailySales > 0 && (neededRunoff > usefulDaysUntilPreBlock || neededRunoff > daysToExpiry));

        const isCritical = daysToExpiry <= releaseDays || !it.isPeriodOk || isUnder60 || stockAgeIndex < 60;
        const isWarning = daysToExpiry <= 90 || hasRunoff || stockAgeIndex <= 75;

        let calculatedRisk: 'Baixo' | 'Médio' | 'Alto' | 'Crítico' = it.baseRisk;
        if (isCritical) {
          calculatedRisk = 'Crítico';
        } else if (isWarning && calculatedRisk === 'Baixo') {
          calculatedRisk = 'Médio';
        }

        let observation = it.validityAlertObservation || '';
        if (!observation) {
          if (daysToExpiry < 0) {
            observation = `PRODUTO VENCIDO: Data de validade (${formatDateBR(it.validityDate)}) anterior ao recebimento!`;
          } else if (stockAgeIndex < 60) {
            observation = `ALERTA CRÍTICO (SAI ${stockAgeIndex}% < 60%): Restam ${daysToExpiry} de ${productShelfLifeDays} dias de vida útil. Prioridade máxima de carregamento/giro.`;
          } else if (isUnder60 && hasRunoff) {
            observation = `ALERTA CRÍTICO: Validade curta (${daysToExpiry} dias <= 60d) E risco de não escoar a tempo (venda média de ${dailySales} cx/dia requer ~${neededRunoff} dias vs ${usefulDaysUntilPreBlock} dias úteis até o pré-bloqueio).`;
          } else if (isUnder60) {
            observation = `ALERTA DE VALIDADE (<= 60 DIAS): Restam apenas ${daysToExpiry} dias para o vencimento (SAI: ${stockAgeIndex}%). Prioridade máxima de carregamento/giro.`;
          } else if (hasRunoff) {
            observation = `ALERTA DE ESCOAMENTO: Venda média de ${dailySales} cx/dia requer ~${neededRunoff} dias para escoar este lote (${it.quantitySku} un), excedendo o prazo útil antes do pré-bloqueio (${usefulDaysUntilPreBlock} dias úteis).`;
          } else if (stockAgeIndex <= 75) {
            observation = `ATENÇÃO (SAI ${stockAgeIndex}% entre 60% e 75%): Restam ${daysToExpiry} de ${productShelfLifeDays} dias de vida útil.`;
          } else if (daysToExpiry <= 90) {
            observation = `ALERTA: Validade reduzida (${daysToExpiry} dias restantes, SAI: ${stockAgeIndex}%).`;
          } else {
            observation = `Validade regular (${daysToExpiry} de ${productShelfLifeDays} dias, SAI ${stockAgeIndex}% - OK). Escoamento previsto em ~${neededRunoff} dias (venda média: ${dailySales} un/dia).`;
          }
        }

        list.push({
          itemKey: `${p.header.id}-${it.id}`,
          pullId: p.header.id,
          nfeNumber: p.header.nfeNumber,
          truckPlate: p.header.truckPlate,
          factoryOrigin: p.header.factoryOrigin,
          receiptDate: p.header.receiptDate,
          productCode: it.productCode,
          description: it.description,
          quantitySku: it.quantitySku,
          palletCount: it.palletCount,
          validityDate: it.validityDate,
          daysToExpiry: it.daysToExpiry,
          releasePeriodDays: releaseDays,
          isPeriodOk: it.isPeriodOk,
          baseRisk: calculatedRisk,
          runoffDays: it.runoffDays,
          preBlockDate: it.preBlockDate,
          loadUntilDate: it.loadUntilDate,
          totalValue: it.totalValue,
          status: it.status,
          dailySalesAvg: dailySales,
          neededRunoffDays: neededRunoff,
          hasRunoffRisk: hasRunoff,
          isUnder60Days: isUnder60,
          validityAlertObservation: observation,
          abcClass: it.abcClass || 'C',
          productShelfLifeDays,
          stockAgeIndex,
          saiClassification
        });
      });
    });

    return list.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  }, [pulls, catalog]);

  // Factories list
  const factories = useMemo(() => {
    const set = new Set<string>();
    allAlertItems.forEach(i => set.add(i.factoryOrigin));
    return Array.from(set).filter(Boolean).sort();
  }, [allAlertItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allAlertItems.filter(item => {
      if (filterRisk !== 'ALL') {
        if (filterRisk === 'SAI_CRITICAL' && item.stockAgeIndex >= 60) return false;
        if (filterRisk === 'SAI_WARNING' && (item.stockAgeIndex < 60 || item.stockAgeIndex > 75)) return false;
        if (filterRisk === 'SAI_OK' && item.stockAgeIndex <= 75) return false;
        if (filterRisk === 'UNDER_60' && !item.isUnder60Days) return false;
        if (filterRisk === 'RUNOFF_RISK' && !item.hasRunoffRisk) return false;
        if (filterRisk === 'CRITICAL' && item.baseRisk !== 'Crítico') return false;
        if (filterRisk === 'WARNING' && item.baseRisk !== 'Médio' && item.baseRisk !== 'Alto' && item.baseRisk !== 'Crítico') return false;
      }
      if (filterFactory !== 'ALL' && item.factoryOrigin !== filterFactory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = 
          item.nfeNumber.toLowerCase().includes(q) ||
          item.truckPlate.toLowerCase().includes(q) ||
          item.productCode.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.factoryOrigin.toLowerCase().includes(q) ||
          item.validityAlertObservation.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allAlertItems, filterRisk, filterFactory, searchQuery]);

  // Statistics
  const under60Count = useMemo(() => {
    return allAlertItems.filter(i => i.isUnder60Days).length;
  }, [allAlertItems]);

  const runoffRiskCount = useMemo(() => {
    return allAlertItems.filter(i => i.hasRunoffRisk).length;
  }, [allAlertItems]);

  const criticalCount = useMemo(() => {
    return allAlertItems.filter(i => i.baseRisk === 'Crítico').length;
  }, [allAlertItems]);

  const saiCriticalCount = useMemo(() => {
    return allAlertItems.filter(i => i.stockAgeIndex < 60).length;
  }, [allAlertItems]);

  const saiWarningCount = useMemo(() => {
    return allAlertItems.filter(i => i.stockAgeIndex >= 60 && i.stockAgeIndex <= 75).length;
  }, [allAlertItems]);

  const saiOkCount = useMemo(() => {
    return allAlertItems.filter(i => i.stockAgeIndex > 75).length;
  }, [allAlertItems]);

  const avgSaiOverall = useMemo(() => {
    if (allAlertItems.length === 0) return '100.0';
    const sum = allAlertItems.reduce((acc, i) => acc + i.stockAgeIndex, 0);
    return (sum / allAlertItems.length).toFixed(1);
  }, [allAlertItems]);

  const totalCriticalValue = useMemo(() => {
    return allAlertItems
      .filter(i => i.baseRisk === 'Crítico' || i.isUnder60Days || i.hasRunoffRisk || i.stockAgeIndex < 60)
      .reduce((acc, i) => acc + i.totalValue, 0);
  }, [allAlertItems]);

  // Export
  const handleExportExcel = () => {
    const data = filteredItems.map(i => ({
      'Nota Fiscal': i.nfeNumber,
      'Carreta': i.truckPlate,
      'Fábrica Origem': i.factoryOrigin,
      'Código SKU': i.productCode,
      'Descrição Produto': i.description,
      'Curva ABC': i.abcClass,
      'Qtd SKUs': i.quantitySku,
      'Pallets': i.palletCount,
      'Data de Validade': formatDateBR(i.validityDate),
      'Idade do Produto (Dias)': i.productShelfLifeDays,
      'Dias Restantes': i.daysToExpiry,
      'Stock Age Index (%)': `${i.stockAgeIndex}%`,
      'Classificação SAI': i.saiClassification,
      'Alerta <= 60 Dias': i.isUnder60Days ? 'SIM' : 'NÃO',
      'Venda Média Diária': `${i.dailySalesAvg} un/dia`,
      'Dias para Escoar': `${i.neededRunoffDays} dias`,
      'Perigo Não Escoar': i.hasRunoffRisk ? 'SIM (ALERTA)' : 'NÃO',
      'Diagnóstico / Observação': i.validityAlertObservation,
      'Prazo Liberação': `${i.releasePeriodDays} dias`,
      'Nível de Risco': i.baseRisk,
      'Data Pré-bloqueio': formatDateBR(i.preBlockDate),
      'Carregar Até': formatDateBR(i.loadUntilDate),
      'Valor Total R$': i.totalValue
    }));
    exportDataToExcel(data, `ALERTAS_STOCK_AGE_INDEX_VALIDADE_AMBEV_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shadow-md">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              ALERTAS DE VALIDADE & STOCK AGE INDEX (%)
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 text-xs font-mono font-bold border border-red-300">
                Ambev • Pau Brasil
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Monitoramento por Stock Age Index (SAI), prazos de liberação, validade &le; 60 dias e giro médio diário.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Alertas (Excel)</span>
          </button>
        </div>
      </div>

      {/* 2. REGRAS & FÓRMULA OFICIAL STOCK AGE INDEX (BANNER) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 border border-slate-700 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 font-mono">
              Fórmula e Classificação do Stock Age Index (SAI %)
            </h3>
          </div>
          <div className="px-3 py-1 bg-slate-800 rounded-lg border border-slate-600 font-mono text-xs font-bold text-amber-300">
            Stock Age Index (%) = (Dias Restantes ÷ Idade do Produto) × 100
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-xs">
          <div 
            onClick={() => setFilterRisk(filterRisk === 'SAI_CRITICAL' ? 'ALL' : 'SAI_CRITICAL')}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              filterRisk === 'SAI_CRITICAL'
                ? 'bg-red-950/80 border-red-500 ring-2 ring-red-400'
                : 'bg-red-950/40 border-red-800/80 hover:bg-red-950/60'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5 font-black text-red-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                <span>CRÍTICO: SAI &lt; 60%</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">Risco alto de expiração e bloqueio fiscal</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black font-mono text-red-400">{saiCriticalCount}</span>
              <span className="text-[10px] text-slate-400 block font-mono">lotes</span>
            </div>
          </div>

          <div 
            onClick={() => setFilterRisk(filterRisk === 'SAI_WARNING' ? 'ALL' : 'SAI_WARNING')}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              filterRisk === 'SAI_WARNING'
                ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-400'
                : 'bg-amber-950/40 border-amber-800/80 hover:bg-amber-950/60'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5 font-black text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                <span>ATENÇÃO: SAI 60% a 75%</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">Priorizar carregamento e acelerar giro</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black font-mono text-amber-400">{saiWarningCount}</span>
              <span className="text-[10px] text-slate-400 block font-mono">lotes</span>
            </div>
          </div>

          <div 
            onClick={() => setFilterRisk(filterRisk === 'SAI_OK' ? 'ALL' : 'SAI_OK')}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              filterRisk === 'SAI_OK'
                ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-400'
                : 'bg-emerald-950/40 border-emerald-800/80 hover:bg-emerald-950/60'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5 font-black text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>OK: SAI &gt; 75%</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">Validade saudável dentro dos parâmetros</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black font-mono text-emerald-400">{saiOkCount}</span>
              <span className="text-[10px] text-slate-400 block font-mono">lotes</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* SAI Médio Geral */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">SAI Médio Geral</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {avgSaiOverall}%
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Vida útil restante média de todos os itens</p>
        </div>

        {/* Under 60 Days */}
        <div 
          onClick={() => setFilterRisk(filterRisk === 'UNDER_60' ? 'ALL' : 'UNDER_60')}
          className={`rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            filterRisk === 'UNDER_60' ? 'ring-2 ring-red-500 bg-red-100/80 border-red-400' : 'bg-red-50/70 border-red-300 hover:bg-red-100/50'
          }`}
        >
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">Validade &le; 60 Dias</span>
            <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-red-800 font-mono">
            {under60Count}
          </div>
          <p className="text-[10px] text-red-700 font-bold mt-1">
            Alerta de validade: risco de pré-bloqueio
          </p>
        </div>

        {/* Runoff Risk by Average Sales */}
        <div 
          onClick={() => setFilterRisk(filterRisk === 'RUNOFF_RISK' ? 'ALL' : 'RUNOFF_RISK')}
          className={`rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            filterRisk === 'RUNOFF_RISK' ? 'ring-2 ring-amber-500 bg-amber-100/80 border-amber-400' : 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">Perigo Não Escoar</span>
            <TrendingDown className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-black text-amber-900 font-mono">
            {runoffRiskCount}
          </div>
          <p className="text-[10px] text-amber-800 font-bold mt-1">
            Venda média diária não escoará a tempo
          </p>
        </div>

        {/* Critical Value */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">Valor em Risco</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {formatBRL(totalCriticalValue)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Montante total dos lotes em alerta/crítico</p>
        </div>

        {/* Total Monitored */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">Total Monitorado</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {allAlertItems.length}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Lotes em todas as carretas recebidas</p>
        </div>
      </div>

      {/* 4. FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por NF, Carreta, SKU, Produto, Fábrica, Observação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        <div className="w-72">
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">🔍 Todos os Níveis de Risco / SAI</option>
            <option value="SAI_CRITICAL">🔴 Stock Age Index &lt; 60% (Crítico)</option>
            <option value="SAI_WARNING">🟡 Stock Age Index 60% a 75% (Atenção)</option>
            <option value="SAI_OK">🟢 Stock Age Index &gt; 75% (OK)</option>
            <option value="UNDER_60">🚨 Somente Validade &le; 60 Dias (Crítico)</option>
            <option value="RUNOFF_RISK">⚠️ Somente Risco de Não Escoar (Venda Média)</option>
            <option value="CRITICAL">⛔ Somente Críticos Gerais</option>
          </select>
        </div>

        <div className="w-48">
          <select
            value={filterFactory}
            onChange={(e) => setFactoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Todas as Fábricas</option>
            {factories.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-900 text-sm">
              ITENS E LOTES MONITORADOS ({filteredItems.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Ordenados por Stock Age Index e proximidade do vencimento
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Puxada / NF</th>
                <th className="py-3 px-3">Origem / Carreta</th>
                <th className="py-3 px-3 min-w-[180px]">Produto SKU</th>
                <th className="py-3 px-3 text-center">Curva</th>
                <th className="py-3 px-3 text-center">Validade</th>
                <th className="py-3 px-3 text-center">Idade Total</th>
                <th className="py-3 px-3 text-center">Dias Rest.</th>
                <th className="py-3 px-3 text-center bg-amber-50/60 font-black text-amber-950 border-x border-amber-200">
                  Stock Age Index (%)
                </th>
                <th className="py-3 px-3 text-center">Venda Média / Giro</th>
                <th className="py-3 px-3 min-w-[240px]">Diagnóstico & Observação do Alerta</th>
                <th className="py-3 px-3 text-center">Risco</th>
                <th className="py-3 px-3">Pré-bloq / Carregar</th>
                <th className="py-3 px-3 text-right">Valor R$</th>
                <th className="py-3 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-10 text-slate-400">
                    Nenhum item encontrado para os filtros de Stock Age Index selecionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isCrit = item.baseRisk === 'Crítico' || item.isUnder60Days || item.stockAgeIndex < 60;
                  const isMed = item.baseRisk === 'Médio' || item.baseRisk === 'Alto' || item.hasRunoffRisk || (item.stockAgeIndex >= 60 && item.stockAgeIndex <= 75);

                  return (
                    <tr key={item.itemKey} className={`hover:bg-slate-50/80 transition-colors ${
                      item.stockAgeIndex < 60 ? 'bg-red-50/50' : item.stockAgeIndex <= 75 ? 'bg-amber-50/40' : item.isUnder60Days ? 'bg-red-50/40' : ''
                    }`}>
                      
                      {/* Pull / NF */}
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900 font-mono text-xs">
                          NF: {item.nfeNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Rec: {formatDateBR(item.receiptDate)}
                        </div>
                      </td>

                      {/* Origin / Truck */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 text-[11px]">{item.factoryOrigin}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{item.truckPlate}</span>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 leading-tight" title={item.description}>
                          {item.description}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          SKU: <span className="font-bold text-slate-700">{item.productCode}</span> ({item.quantitySku} sku / {item.palletCount} plt)
                        </div>
                      </td>

                      {/* Curva ABC */}
                      <td className="py-3 px-3 text-center">
                        <span 
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-black"
                          style={{
                            backgroundColor: item.abcClass === 'A' ? '#16a34a' : item.abcClass === 'B' ? '#eab308' : '#ef4444',
                            color: item.abcClass === 'B' ? '#000000' : '#ffffff'
                          }}
                        >
                          {item.abcClass}
                        </span>
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={item.stockAgeIndex < 60 ? 'text-red-700 font-black' : item.isUnder60Days ? 'text-red-700 font-black' : isMed ? 'text-amber-800' : 'text-slate-700'}>
                          {formatDateBR(item.validityDate)}
                        </span>
                      </td>

                      {/* Idade Total do Produto */}
                      <td className="py-3 px-3 text-center font-mono text-slate-600 font-semibold">
                        {item.productShelfLifeDays} d
                      </td>

                      {/* Days to Expiry */}
                      <td className="py-3 px-3 text-center font-mono font-black">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] inline-block ${
                          item.stockAgeIndex < 60
                            ? 'bg-red-600 text-white font-black'
                            : item.isUnder60Days
                            ? 'bg-red-600 text-white font-black animate-pulse'
                            : item.stockAgeIndex <= 75
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : item.daysToExpiry < 90 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {item.daysToExpiry} d
                        </span>
                        {item.isUnder60Days && (
                          <div className="text-[9px] text-red-700 font-black uppercase mt-0.5">
                            &le; 60 Dias
                          </div>
                        )}
                      </td>

                      {/* STOCK AGE INDEX (%) COLUMN (Formula: Dias Restantes ÷ Idade do Produto * 100) */}
                      <td className="py-3 px-3 text-center bg-amber-50/40 border-x border-amber-100">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-2xs ${
                            item.stockAgeIndex < 60
                              ? 'bg-red-600 text-white'
                              : item.stockAgeIndex <= 75
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {item.stockAgeIndex}%
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 mt-0.5 font-bold">
                            {item.saiClassification} ({item.daysToExpiry}d ÷ {item.productShelfLifeDays}d)
                          </span>
                        </div>
                      </td>

                      {/* Venda Média & Giro */}
                      <td className="py-3 px-3 text-center font-mono text-[11px]">
                        <div className="font-bold text-slate-800">
                          {item.dailySalesAvg.toFixed(1)} un/dia
                        </div>
                        <div className={`text-[10px] font-bold ${
                          item.hasRunoffRisk ? 'text-amber-700 font-black' : 'text-slate-500'
                        }`}>
                          Giro: ~{item.neededRunoffDays} d
                        </div>
                      </td>

                      {/* Observation / Diagnostic */}
                      <td className="py-3 px-3">
                        <div className={`p-2 rounded-xl text-[11px] leading-relaxed border ${
                          item.stockAgeIndex < 60
                            ? 'bg-red-50 text-red-950 border-red-300 font-semibold'
                            : item.isUnder60Days
                            ? 'bg-red-50 text-red-950 border-red-300 font-semibold'
                            : item.hasRunoffRisk || item.stockAgeIndex <= 75
                            ? 'bg-amber-50 text-amber-950 border-amber-300 font-semibold'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          <div className="flex items-start gap-1.5">
                            {item.stockAgeIndex < 60 || item.isUnder60Days ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                            ) : item.hasRunoffRisk || item.stockAgeIndex <= 75 ? (
                              <TrendingDown className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              {item.validityAlertObservation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Risk */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.stockAgeIndex < 60 || item.isUnder60Days || isCrit 
                            ? 'bg-red-600 text-white' 
                            : item.hasRunoffRisk || item.stockAgeIndex <= 75
                            ? 'bg-amber-500 text-slate-950'
                            : item.baseRisk === 'Alto'
                            ? 'bg-orange-500 text-white'
                            : isMed
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.stockAgeIndex < 60 ? 'SAI CRÍTICO' : item.isUnder60Days ? 'CRÍTICO 60D' : item.stockAgeIndex <= 75 ? 'SAI ATENÇÃO' : item.hasRunoffRisk ? 'RISCO GIRO' : item.baseRisk}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-3 text-[10px] font-mono leading-tight">
                        <div>Pré-bloq: <strong className="text-slate-700">{formatDateBR(item.preBlockDate)}</strong></div>
                        <div className="text-slate-500">Carregar: <strong>{formatDateBR(item.loadUntilDate)}</strong></div>
                      </td>

                      {/* Value */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatBRL(item.totalValue)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectPull(item.pullId)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Abrir detalhes da puxada"
                        >
                          <span>Puxada</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
