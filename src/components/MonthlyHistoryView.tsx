import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Printer, 
  FileText, 
  AlertTriangle, 
  Calendar, 
  Building, 
  Download, 
  Eye, 
  CheckCircle2,
  Trash2,
  TrendingDown,
  Layers
} from 'lucide-react';
import { PullRecord, PullFilterState, NRIItem } from '../types';
import { formatDateBR, formatBRL, getAbcBadgeColor } from '../utils/nriCalculations';
import { PauBrasilLogo } from './PauBrasilLogo';

interface MonthlyHistoryViewProps {
  pulls: PullRecord[];
  onSelectPullForLabels: (pull: PullRecord) => void;
  onSelectPullForSheet: (pull: PullRecord) => void;
  onDeletePull: (pullId: string) => void;
}

export const MonthlyHistoryView: React.FC<MonthlyHistoryViewProps> = ({
  pulls,
  onSelectPullForLabels,
  onSelectPullForSheet,
  onDeletePull
}) => {
  // Filters State
  const [filters, setFilters] = useState<PullFilterState>({
    search: '',
    productCode: '',
    factoryOrigin: 'ALL',
    nfeNumber: '',
    month: 'ALL',
    abcClass: 'ALL',
    riskLevel: 'ALL',
    validityAlertOnly: false,
    receiver: 'ALL'
  });

  const [expandedPullId, setExpandedPullId] = useState<string | null>(null);

  // Available unique months from pulls
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    pulls.forEach(p => {
      if (p.header.receiptDate) {
        const ym = p.header.receiptDate.substring(0, 7); // YYYY-MM
        monthsSet.add(ym);
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [pulls]);

  // Available factories
  const availableFactories = useMemo(() => {
    const fSet = new Set<string>();
    pulls.forEach(p => {
      if (p.header.factoryOrigin) fSet.add(p.header.factoryOrigin);
    });
    return Array.from(fSet).sort();
  }, [pulls]);

  // Filtered pulls list
  const filteredPulls = useMemo(() => {
    return pulls.filter(pull => {
      // Search across NF, Carreta, Receiver, Notes
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchHeader = 
          pull.header.nfeNumber.toLowerCase().includes(q) ||
          pull.header.truckPlate.toLowerCase().includes(q) ||
          pull.header.receiverName.toLowerCase().includes(q) ||
          pull.header.factoryOrigin.toLowerCase().includes(q);

        const matchItem = pull.items.some(it => 
          it.productCode.toLowerCase().includes(q) || 
          it.description.toLowerCase().includes(q)
        );

        if (!matchHeader && !matchItem) return false;
      }

      // Specific filter matches
      if (filters.nfeNumber && !pull.header.nfeNumber.includes(filters.nfeNumber)) return false;
      if (filters.factoryOrigin !== 'ALL' && pull.header.factoryOrigin !== filters.factoryOrigin) return false;
      if (filters.month !== 'ALL' && !pull.header.receiptDate.startsWith(filters.month)) return false;
      if (filters.validityAlertOnly && !pull.hasValidityAlert) return false;

      // Filter by item code or ABC inside pull
      if (filters.productCode && !pull.items.some(it => it.productCode === filters.productCode)) return false;
      if (filters.abcClass !== 'ALL' && !pull.items.some(it => it.abcClass === filters.abcClass)) return false;
      if (filters.riskLevel !== 'ALL' && !pull.items.some(it => it.baseRisk === filters.riskLevel)) return false;

      return true;
    });
  }, [pulls, filters]);

  // Summary Metrics of filtered view
  const summary = useMemo(() => {
    let totalP = 0;
    let totalS = 0;
    let totalH = 0;
    let totalV = 0;
    let totalAlerts = 0;

    filteredPulls.forEach(p => {
      totalP += p.totalPallets;
      totalS += p.totalSku;
      totalH += p.totalHectoliters;
      totalV += p.totalValue;
      totalAlerts += p.alertCount;
    });

    return {
      pullsCount: filteredPulls.length,
      totalPallets: totalP,
      totalSku: totalS,
      totalHectoliters: Number(totalH.toFixed(2)),
      totalValue: totalV,
      totalAlerts
    };
  }, [filteredPulls]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Puxada',
      'Nota Fiscal',
      'Data Emissao',
      'Data Recebimento',
      'Hora',
      'Carreta',
      'Origem Fabrica',
      'Conferente',
      'Codigo Produto',
      'Descricao',
      'Curva ABC',
      'Qtde SKU',
      'Pallets',
      'Lastro',
      'Validade',
      'Dias p/ Vencer',
      'Risco',
      'Hectolitros',
      'Valor Total'
    ];

    const rows: string[] = [headers.join(';')];

    filteredPulls.forEach(pull => {
      pull.items.forEach(it => {
        rows.push([
          pull.header.id,
          pull.header.nfeNumber,
          pull.header.issueDate,
          pull.header.receiptDate,
          pull.header.receiptTime,
          pull.header.truckPlate,
          `"${pull.header.factoryOrigin}"`,
          `"${pull.header.receiverName}"`,
          it.productCode,
          `"${it.description}"`,
          it.abcClass,
          it.quantitySku,
          it.palletCount,
          it.lastroCount,
          it.validityDate,
          it.daysToExpiry,
          it.baseRisk,
          it.totalHectoliter,
          it.totalValue
        ].join(';'));
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Historico_Puxadas_NRI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* HEADER BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PauBrasilLogo size="lg" />
          <div className="border-l border-slate-200 pl-4">
            <h1 className="text-xl font-black text-[#002B7F] uppercase tracking-tight flex items-center gap-2 font-mono">
              <span>PAU BRASIL GUARABIRA</span>
              <span className="text-xs bg-slate-900 text-amber-400 font-bold px-2 py-0.5 rounded">
                HISTÓRICO NRI
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Consulte todas as puxadas realizadas, filtre por fábrica, nota ou produto, e monitore as validades de chegada.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Exportar Relatório (CSV / Excel)</span>
        </button>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Puxadas / NRIs</div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">{summary.pullsCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Carretas recebidas</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Pallets</div>
          <div className="text-xl font-black text-amber-600 mt-1 font-mono">{summary.totalPallets} Plts</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Volume físico</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Volume (HL)</div>
          <div className="text-xl font-black text-blue-600 mt-1 font-mono">{summary.totalHectoliters} HL</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Hectolitros recebidos</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total SKUs (Unid)</div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">{summary.totalSku.toLocaleString('pt-BR')}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Caixas / Fardos</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Valor Total Cargas</div>
          <div className="text-lg font-black text-emerald-600 mt-1 font-mono truncate">{formatBRL(summary.totalValue)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Faturamento NF</div>
        </div>

        <div className={`p-3.5 rounded-xl border shadow-xs ${
          summary.totalAlerts > 0 
            ? 'bg-red-50 border-red-200 text-red-900' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="text-[11px] font-bold uppercase flex items-center gap-1">
            <AlertTriangle className={`w-3.5 h-3.5 ${summary.totalAlerts > 0 ? 'text-red-600' : 'text-slate-400'}`} />
            <span>Alertas Validade</span>
          </div>
          <div className={`text-xl font-black mt-1 font-mono ${summary.totalAlerts > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {summary.totalAlerts}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">&lt; 3 meses (90 dias)</div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wide">
            <Filter className="w-4 h-4 text-amber-500" />
            <span>Filtros Avançados de Pesquisa</span>
          </div>
          {(filters.search || filters.month !== 'ALL' || filters.factoryOrigin !== 'ALL' || filters.validityAlertOnly || filters.abcClass !== 'ALL') && (
            <button
              onClick={() => setFilters({
                search: '',
                productCode: '',
                factoryOrigin: 'ALL',
                nfeNumber: '',
                month: 'ALL',
                abcClass: 'ALL',
                riskLevel: 'ALL',
                validityAlertOnly: false,
                receiver: 'ALL'
              })}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-800"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* General Search */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Busca Rápida (NF, Carreta, Conferente, Produto)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Ex: 1104458, RLU3F59, Budweiser..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Mês / Período
            </label>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
            >
              <option value="ALL">Todos os Meses</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Factory Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Fábrica / Origem
            </label>
            <select
              value={filters.factoryOrigin}
              onChange={(e) => setFilters({ ...filters, factoryOrigin: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
            >
              <option value="ALL">Todas as Fábricas</option>
              {availableFactories.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Curva ABC Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Curva ABC
            </label>
            <select
              value={filters.abcClass}
              onChange={(e) => setFilters({ ...filters, abcClass: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
            >
              <option value="ALL">Todas as Classes</option>
              <option value="A">Curva A (Verde)</option>
              <option value="B">Curva B (Amarelo)</option>
              <option value="C">Curva C (Vermelho)</option>
            </select>
          </div>

          {/* Only Alert Toggle */}
          <div className="flex flex-col justify-end">
            <label 
              onClick={() => setFilters({ ...filters, validityAlertOnly: !filters.validityAlertOnly })}
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer select-none transition-colors ${
                filters.validityAlertOnly 
                  ? 'bg-red-50 border-red-300 text-red-700' 
                  : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <input
                type="checkbox"
                checked={filters.validityAlertOnly}
                onChange={() => {}}
                className="w-3.5 h-3.5 text-red-600 rounded"
              />
              <span>Só Alertas (&lt; 3 meses)</span>
            </label>
          </div>
        </div>
      </div>

      {/* PULLS TIMELINE / TABLE LIST */}
      <div className="space-y-4">
        {filteredPulls.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-700">Nenhuma Puxada Encontrada com os Filtros Aplicados</h3>
            <p className="text-xs text-slate-400 mt-1">Tente ajustar os termos de busca ou o período selecionado.</p>
          </div>
        ) : (
          filteredPulls.map((pull) => {
            const isExpanded = expandedPullId === pull.header.id;
            
            return (
              <div 
                key={pull.header.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* PULL CARD HEADER */}
                <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 text-amber-700 rounded-xl flex items-center justify-center font-black text-sm">
                      NF
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-slate-900">
                          {pull.header.nfeNumber}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-200 font-mono font-bold rounded text-slate-700 uppercase">
                          {pull.header.truckPlate}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 bg-amber-100 font-bold rounded-full text-amber-900">
                          {pull.header.factoryOrigin}
                        </span>
                        {pull.hasValidityAlert && (
                          <span className="text-[10px] px-2 py-0.5 bg-red-100 border border-red-300 text-red-700 font-bold rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{pull.alertCount} Alerta(s)</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-1 font-sans">
                        <span>Receb: <strong className="text-slate-700 font-mono">{formatDateBR(pull.header.receiptDate)} às {pull.header.receiptTime}</strong></span>
                        <span>•</span>
                        <span>Turno: <strong className="text-slate-700">{pull.header.shift}</strong></span>
                        <span>•</span>
                        <span>Conferente: <strong className="text-slate-700">{pull.header.receiverName}</strong></span>
                        {pull.header.promaxEntry && (
                          <>
                            <span>•</span>
                            <span>Promax: <strong className="font-mono text-slate-700">#{pull.header.promaxEntry}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary Badges & Quick Print Actions */}
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="font-mono text-sm font-black text-slate-900">
                        {pull.totalPallets} Plts | {pull.totalHectoliters} HL
                      </div>
                      <div className="text-[11px] font-bold text-emerald-600 font-mono">
                        {formatBRL(pull.totalValue)}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectPullForSheet(pull)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      title="Ver Espelho de Conferência"
                    >
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span className="hidden md:inline">Espelho</span>
                    </button>

                    <button
                      onClick={() => onSelectPullForLabels(pull)}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-black transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                      title="Imprimir Etiquetas de Pallet"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Etiquetas ({pull.totalPallets})</span>
                    </button>

                    <button
                      onClick={() => setExpandedPullId(isExpanded ? null : pull.header.id)}
                      className="p-2 text-slate-500 hover:text-slate-900 rounded-lg text-xs font-bold transition-colors"
                    >
                      {isExpanded ? 'Ocultar Itens ▲' : 'Ver Detalhes ▼'}
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Deseja excluir o registro da NF ${pull.header.nfeNumber}?`)) {
                          onDeletePull(pull.header.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      title="Excluir Puxada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* EXPANDED ITEMS LIST TABLE */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-slate-200 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-bold text-[11px] border-b border-slate-200 uppercase">
                          <th className="p-2.5 w-12 text-center">#</th>
                          <th className="p-2.5 w-24">Código</th>
                          <th className="p-2.5">Descrição do Produto</th>
                          <th className="p-2.5 w-16 text-center">Curva</th>
                          <th className="p-2.5 w-20 text-center font-bold">Pallets</th>
                          <th className="p-2.5 w-20 text-center font-bold">Lastro</th>
                          <th className="p-2.5 w-24 text-center font-bold">Qtde SKU</th>
                          <th className="p-2.5 w-28">Validade</th>
                          <th className="p-2.5 w-24 text-center">Dias Venc.</th>
                          <th className="p-2.5 w-20 text-center">Risco</th>
                          <th className="p-2.5 w-24 text-right">Hectolitros</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {pull.items.map((it, iIdx) => {
                          const isAlert = it.daysToExpiry <= 90;
                          
                          return (
                            <tr key={`${it.id}-${iIdx}`} className={isAlert ? 'bg-red-50/40' : 'hover:bg-slate-50'}>
                              <td className="p-2.5 text-center font-mono text-slate-400">{iIdx + 1}</td>
                              <td className="p-2.5 font-mono font-bold">{it.productCode}</td>
                              <td className="p-2.5 font-semibold text-slate-900">{it.description}</td>
                              <td className="p-2.5 text-center">
                                <span 
                                  className="inline-block px-2 py-0.5 rounded text-[11px] font-black"
                                  style={{
                                    backgroundColor: it.abcClass === 'A' ? '#16a34a' : it.abcClass === 'B' ? '#eab308' : '#ef4444',
                                    color: it.abcClass === 'B' ? '#000000' : '#ffffff'
                                  }}
                                >
                                  {it.abcClass}
                                </span>
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-amber-700 bg-amber-50/30">{it.palletCount}</td>
                              <td className="p-2.5 text-center font-mono font-bold text-blue-700 bg-blue-50/30">{it.lastroCount}</td>
                              <td className="p-2.5 text-center font-mono font-black text-slate-900 bg-emerald-50/30">{it.quantitySku}</td>
                              <td className="p-2.5 font-mono text-slate-700">{formatDateBR(it.validityDate)}</td>
                              <td className={`p-2.5 text-center font-mono font-bold ${isAlert ? 'text-red-600 font-black' : 'text-slate-700'}`}>
                                {it.daysToExpiry} d
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  it.baseRisk === 'Alto'
                                    ? 'bg-red-100 text-red-700'
                                    : it.baseRisk === 'Médio'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {it.baseRisk}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">{it.totalHectoliter} HL</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
