import React, { useState, useMemo, useEffect } from 'react';
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
  Layers,
  Edit3,
  AlertCircle
} from 'lucide-react';
import { PullRecord, PullFilterState, NRIItem, SupplierItem } from '../types';
import { formatDateBR, formatBRL, getAbcBadgeColor } from '../utils/nriCalculations';
import { PauBrasilLogo } from './PauBrasilLogo';
import { INITIAL_SUPPLIERS } from '../data/initialSuppliers';

interface MonthlyHistoryViewProps {
  pulls: PullRecord[];
  suppliers?: SupplierItem[];
  onSelectPullForLabels: (pull: PullRecord) => void;
  onSelectPullForSheet: (pull: PullRecord) => void;
  onDeletePull: (pullId: string) => void;
  onEditPull?: (pull: PullRecord) => void;
  onUpdatePull?: (pull: PullRecord) => void;
}

export const MonthlyHistoryView: React.FC<MonthlyHistoryViewProps> = ({
  pulls,
  suppliers = [],
  onSelectPullForLabels,
  onSelectPullForSheet,
  onDeletePull,
  onEditPull,
  onUpdatePull
}) => {
  const allSuppliers = (suppliers && suppliers.length > 0) ? suppliers : INITIAL_SUPPLIERS;
  const [editingFactoryPullId, setEditingFactoryPullId] = useState<string | null>(null);
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
  const [pullToDelete, setPullToDelete] = useState<PullRecord | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

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

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredPulls.length / pageSize));
  const paginatedPulls = useMemo(() => {
    if (pageSize >= 1000) return filteredPulls;
    const start = (currentPage - 1) * pageSize;
    return filteredPulls.slice(start, start + pageSize);
  }, [filteredPulls, currentPage, pageSize]);

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
          paginatedPulls.map((pull) => {
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
                        {editingFactoryPullId === pull.header.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              autoFocus
                              value={pull.header.factoryOrigin || '950 - ITAPISSUMA'}
                              onChange={(e) => {
                                const newOrigin = e.target.value;
                                if (onUpdatePull) {
                                  onUpdatePull({
                                    ...pull,
                                    header: {
                                      ...pull.header,
                                      factoryOrigin: newOrigin
                                    }
                                  });
                                }
                                setEditingFactoryPullId(null);
                              }}
                              onBlur={() => setEditingFactoryPullId(null)}
                              className="text-xs font-black bg-amber-50 text-amber-950 px-2 py-0.5 rounded-lg border-2 border-amber-500 focus:outline-none shadow-xs cursor-pointer"
                            >
                              <optgroup label="Fábricas Principais">
                                <option value="950 - ITAPISSUMA">950 - ITAPISSUMA</option>
                                <option value="426 - CDR JOÃO PESSOA">426 - CDR JOÃO PESSOA</option>
                                <option value="3006 - SERGIPE">3006 - SERGIPE</option>
                                <option value="436 - AQUIRAZ">436 - AQUIRAZ</option>
                                <option value="421 - CAMAÇARI">421 - CAMAÇARI</option>
                              </optgroup>
                              <optgroup label="Demais Fornecedores">
                                {allSuppliers
                                  .filter(s => !['950', '426', '3006', '436', '421'].includes(String(s.code).trim()))
                                  .map(s => (
                                    <option key={s.id} value={`${s.code} - ${s.name}`}>
                                      {s.code} - {s.name}
                                    </option>
                                  ))}
                              </optgroup>
                            </select>
                            <button
                              type="button"
                              onClick={() => setEditingFactoryPullId(null)}
                              className="text-[10px] text-slate-500 hover:text-slate-800 font-bold px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingFactoryPullId(pull.header.id)}
                            title="Clique para alterar a fábrica de origem desta puxada"
                            className="text-xs px-2.5 py-0.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 font-bold rounded-full text-amber-950 flex items-center gap-1 transition-all cursor-pointer group/fac"
                          >
                            <Building className="w-3 h-3 text-amber-700" />
                            <span>{pull.header.factoryOrigin || '950 - ITAPISSUMA'}</span>
                            <Edit3 className="w-2.5 h-2.5 text-amber-600 opacity-60 group-hover/fac:opacity-100" />
                          </button>
                        )}
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

                    {onEditPull && (
                      <button
                        onClick={() => onEditPull(pull)}
                        className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-blue-200"
                        title="Corrigir / Editar esta Puxada"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span className="hidden md:inline">Corrigir</span>
                      </button>
                    )}

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
                      type="button"
                      onClick={() => setPullToDelete(pull)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* PAGINATION CONTROLS */}
      {filteredPulls.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shadow-xs">
          <div className="flex items-center gap-2">
            <span>Exibindo <strong>{Math.min(filteredPulls.length, (currentPage - 1) * pageSize + 1)}</strong> a <strong>{Math.min(filteredPulls.length, currentPage * pageSize)}</strong> de <strong>{filteredPulls.length}</strong> puxadas</span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span>Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-700"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={9999}>Todas ({filteredPulls.length})</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="px-2.5 py-1 rounded bg-slate-50 border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                ««
              </button>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded bg-slate-50 border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                « Anterior
              </button>
              <span className="px-3 py-1 font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded bg-slate-50 border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                Próxima »
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2.5 py-1 rounded bg-slate-50 border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                »»
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (100% IN-APP, SEM BLOQUEIO DE IFRAME) */}
      {pullToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500">Esta ação removerá a puxada permanentemente do sistema.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2 mb-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Nota Fiscal:</span>
                <span className="font-mono font-black text-slate-900 text-sm">{pullToDelete.header.nfeNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Placa da Carreta:</span>
                <span className="font-mono font-bold text-slate-800">{pullToDelete.header.truckPlate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Fábrica de Origem:</span>
                <span className="font-bold text-slate-800">{pullToDelete.header.factoryOrigin}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Volume Recebido:</span>
                <span className="font-mono font-bold text-slate-800">{pullToDelete.totalPallets} Pallets ({pullToDelete.totalSku} SKUs)</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500">Data de Recebimento:</span>
                <span className="font-mono text-slate-700">{formatDateBR(pullToDelete.header.receiptDate)} às {pullToDelete.header.receiptTime}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPullToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = pullToDelete.header.id;
                  setPullToDelete(null);
                  onDeletePull(id);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
