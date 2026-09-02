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
  Sparkles
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
    }> = [];

    pulls.forEach(p => {
      p.items.forEach(it => {
        // Evaluate risk criteria:
        // Alert if daysToExpiry < 90 OR daysToExpiry < it.releasePeriodDays OR !it.isPeriodOk
        const isCritical = it.daysToExpiry <= (it.releasePeriodDays || 40) || !it.isPeriodOk;
        const isWarning = it.daysToExpiry < 90;

        let calculatedRisk: 'Baixo' | 'Médio' | 'Alto' | 'Crítico' = it.baseRisk;
        if (isCritical) {
          calculatedRisk = 'Crítico';
        } else if (isWarning && calculatedRisk === 'Baixo') {
          calculatedRisk = 'Médio';
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
          releasePeriodDays: it.releasePeriodDays,
          isPeriodOk: it.isPeriodOk,
          baseRisk: calculatedRisk,
          runoffDays: it.runoffDays,
          preBlockDate: it.preBlockDate,
          loadUntilDate: it.loadUntilDate,
          totalValue: it.totalValue,
          status: it.status
        });
      });
    });

    return list.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  }, [pulls]);

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
          item.factoryOrigin.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allAlertItems, filterRisk, filterFactory, searchQuery]);

  // Statistics
  const criticalCount = useMemo(() => {
    return allAlertItems.filter(i => i.baseRisk === 'Crítico').length;
  }, [allAlertItems]);

  const warningCount = useMemo(() => {
    return allAlertItems.filter(i => i.baseRisk === 'Médio' || i.baseRisk === 'Alto').length;
  }, [allAlertItems]);

  const totalCriticalValue = useMemo(() => {
    return allAlertItems
      .filter(i => i.baseRisk === 'Crítico')
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
      'Qtd SKUs': i.quantitySku,
      'Pallets': i.palletCount,
      'Data de Validade': formatDateBR(i.validityDate),
      'Dias Restantes': i.daysToExpiry,
      'Prazo Liberação': `${i.releasePeriodDays} dias`,
      'Nível de Risco': i.baseRisk,
      'Dias de Escoamento': i.runoffDays,
      'Data Pré-bloqueio': formatDateBR(i.preBlockDate),
      'Carregar Até': formatDateBR(i.loadUntilDate),
      'Valor Total R$': i.totalValue
    }));
    exportDataToExcel(data, `ALERTAS_VALIDADE_AMBEV_${new Date().toISOString().split('T')[0]}`);
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
              ALERTAS DE VALIDADE, RISCO & CRITICIDADE
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 text-xs font-mono font-bold border border-red-300">
                Puxadas & Armazém
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Monitoramento ativo de prazos de liberação, datas de pré-bloqueio e risco de descarte por vencimento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Alertas (Excel)</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Alerts */}
        <div className="bg-white rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-red-600 mb-1">
            <span className="text-xs font-bold uppercase">Lotes em Risco Crítico</span>
            <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" />
          </div>
          <div className="text-2xl font-black text-red-700 font-mono">
            {criticalCount}
          </div>
          <p className="text-[11px] text-red-700 font-semibold mt-1">
            Validade &le; prazo de liberação ou não liberados
          </p>
        </div>

        {/* Warning Alerts */}
        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold uppercase">Atenção (&lt; 90 Dias)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono">
            {warningCount}
          </div>
          <p className="text-[11px] text-amber-800 font-semibold mt-1">
            Prioridade imediata no escoamento/picking
          </p>
        </div>

        {/* Critical Value */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">Valor Financeiro em Risco</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatBRL(totalCriticalValue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Montante total dos lotes críticos</p>
        </div>

        {/* Total Monitored */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">Lotes Monitorados</span>
            <ShieldAlert className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {allAlertItems.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total de SKUs nas carretas recebidas</p>
        </div>
      </div>

      {/* 3. FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por NF, Carreta, SKU, Produto, Fábrica..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        <div className="w-48">
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Todos os Níveis de Risco</option>
            <option value="CRITICAL">Somente Crítico (Bloqueio Imediato)</option>
            <option value="WARNING">Crítico + Atenção (&lt; 90 dias)</option>
          </select>
        </div>

        <div className="w-44">
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

      {/* 4. TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-900 text-sm">
              ITENS E LOTES MONITORADOS ({filteredItems.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Ordenados pelos lotes mais próximos do vencimento
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Puxada / NF</th>
                <th className="py-3 px-3">Origem / Carreta</th>
                <th className="py-3 px-3">Produto SKU</th>
                <th className="py-3 px-3 text-center">Validade</th>
                <th className="py-3 px-3 text-center">Dias Restantes</th>
                <th className="py-3 px-3 text-center">Prazo Lib.</th>
                <th className="py-3 px-3 text-center">Risco</th>
                <th className="py-3 px-3">Pré-bloqueio / Carregar</th>
                <th className="py-3 px-3 text-right">Valor R$</th>
                <th className="py-3 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    Nenhum item com alerta de validade para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isCrit = item.baseRisk === 'Crítico';
                  const isMed = item.baseRisk === 'Médio' || item.baseRisk === 'Alto';

                  return (
                    <tr key={item.itemKey} className={`hover:bg-slate-50/80 transition-colors ${isCrit ? 'bg-red-50/25' : ''}`}>
                      
                      {/* Pull / NF */}
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900 font-mono text-xs">
                          NF: {item.nfeNumber}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Rec: {formatDateBR(item.receiptDate)}
                        </div>
                      </td>

                      {/* Origin / Truck */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{item.factoryOrigin}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{item.truckPlate}</span>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-3 max-w-[220px]">
                        <div className="font-bold text-slate-900 truncate" title={item.description}>
                          {item.description}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          SKU: {item.productCode} ({item.quantitySku} sku / {item.palletCount} pal)
                        </div>
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={isCrit ? 'text-red-700 font-black' : isMed ? 'text-amber-800' : 'text-slate-700'}>
                          {formatDateBR(item.validityDate)}
                        </span>
                      </td>

                      {/* Days to Expiry */}
                      <td className="py-3 px-3 text-center font-mono font-black">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                          isCrit 
                            ? 'bg-red-600 text-white animate-pulse' 
                            : item.daysToExpiry < 90 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {item.daysToExpiry} dias
                        </span>
                      </td>

                      {/* Release Period */}
                      <td className="py-3 px-3 text-center font-mono text-slate-600">
                        {item.releasePeriodDays} dias
                      </td>

                      {/* Risk */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isCrit 
                            ? 'bg-red-600 text-white' 
                            : item.baseRisk === 'Alto'
                            ? 'bg-orange-500 text-white'
                            : isMed
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.baseRisk}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-3 text-[11px] font-mono leading-tight">
                        <div>Pré-bloq: <strong className="text-slate-700">{formatDateBR(item.preBlockDate)}</strong></div>
                        <div className="text-slate-500">Carregar: <strong>{formatDateBR(item.loadUntilDate)}</strong></div>
                      </td>

                      {/* Value */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatBRL(item.totalValue)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectPull(item.pullId)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all"
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
