import React, { useState, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  Upload, 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Layers,
  FileUp,
  SlidersHorizontal
} from 'lucide-react';
import { Report030519Item, ProductCatalogItem } from '../types';
import { parse030519Report, parseUniversalFile, calculateParetoABC, exportDataToExcel } from '../utils/nriCalculations';

interface Report030519ViewProps {
  reportItems: Report030519Item[];
  onUpdateReportItems: (items: Report030519Item[]) => void;
  catalog: ProductCatalogItem[];
  onUpdateCatalog: (newCatalog: ProductCatalogItem[]) => void;
}

export const Report030519View: React.FC<Report030519ViewProps> = ({
  reportItems,
  onUpdateReportItems,
  catalog,
  onUpdateCatalog
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'CRITICAL' | 'NORMAL'>('ALL');
  const [filterAbc, setFilterAbc] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered items
  const filtered = useMemo(() => {
    return reportItems.filter(item => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = 
          item.productCode.toLowerCase().includes(q) ||
          item.productName.toLowerCase().includes(q) ||
          item.unit.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (filterAbc !== 'ALL' && item.abcClass !== filterAbc) return false;

      if (filterRisk === 'CRITICAL' && (item.estimatedStockRunoffDays || 0) > 40) return true;
      if (filterRisk === 'NORMAL' && (item.estimatedStockRunoffDays || 0) <= 40) return true;

      return filterRisk === 'ALL';
    });
  }, [reportItems, searchTerm, filterRisk, filterAbc]);

  // Execute Pareto Recalculation on Report & Catalog
  const applyParetoUpdate = (rawParsed: Report030519Item[]) => {
    const { updatedCatalog, updatedReport } = calculateParetoABC(rawParsed, catalog);
    onUpdateReportItems(updatedReport);
    onUpdateCatalog(updatedCatalog);

    const countA = updatedCatalog.filter(c => c.abcClass === 'A').length;
    const countB = updatedCatalog.filter(c => c.abcClass === 'B').length;
    const countC = updatedCatalog.filter(c => c.abcClass === 'C').length;

    setImportNotification(
      `Relatório 03.05.19 processado com sucesso! Curva ABC Pareto (70/20/10) atualizada para todos os produtos: Curva A (${countA} SKUs), Curva B (${countB} SKUs), Curva C (${countC} SKUs).`
    );
    setShowImportModal(false);
    setRawInput('');
  };

  // Text / CSV paste handler
  const handleImportSubmit = () => {
    if (!rawInput.trim()) return;
    const parsed = parse030519Report(rawInput);
    if (parsed.length > 0) {
      applyParetoUpdate(parsed);
    } else {
      alert('Não foi possível identificar registros válidos no texto colado. Certifique-se de que há colunas separadas por ponto e vírgula (;), tabulação ou vírgula.');
    }
  };

  // Universal File Upload Handler (Excel, CSV, TSV, TXT, DAT)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseUniversalFile(file);
      if (parsed.reportItems && parsed.reportItems.length > 0) {
        applyParetoUpdate(parsed.reportItems);
      } else {
        alert('Não foi possível extrair dados válidos deste arquivo. Verifique se o arquivo contém as colunas do relatório 03.05.19 da Ambev.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar o arquivo. Verifique a formatação.');
    }

    if (e.target) e.target.value = '';
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filtered.map(i => ({
      'UNB': i.unb,
      'Código SKU': i.productCode,
      'Nome Produto': i.productName,
      'Unidade': i.unit,
      'Vendas': i.sales,
      'Bonificações': i.bonus,
      'Remessas': i.shipment,
      'Total Movimento Mensal': i.totalMovement,
      'Média Venda Diária': i.dailySalesAvg,
      'Dias Escoamento': i.estimatedStockRunoffDays || 2.0,
      'Curva ABC (70/20/10)': i.abcClass || 'A',
      '% Acumulado Volume': i.cumulativeShare ? `${(i.cumulativeShare * 100).toFixed(1)}%` : '-'
    }));
    exportDataToExcel(data, `RELATORIO_03_05_19_PARETO_70_20_10_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* 1. HEADER BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Relatório 03.05.19 & Curva ABC Pareto (70/20/10)</span>
              <span className="text-xs bg-blue-100 text-blue-800 font-mono font-bold px-2.5 py-0.5 rounded-full">
                UNB 0005 - GUARABIRA
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Importação universal de arquivos (Excel, CSV, TXT, TSV) com recálculo automático da Curva ABC e velocidade diária de escoamento.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar 03.05.19 (.xlsx)</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv, .tsv, .txt, .dat"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
            title="Importar arquivo Excel (.xlsx, .xls), CSV ou TXT"
          >
            <FileUp className="w-4 h-4" />
            <span>Upload de Arquivo (Excel/CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Colar Texto / TSV</span>
          </button>
        </div>
      </div>

      {/* PARETO RECALCULATION SUCCESS BANNER */}
      {importNotification && (
        <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg border border-emerald-600 flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-xs uppercase tracking-wide">
                CURVA ABC PARETO 70/20/10 RECALCULADA & SINCRONIZADA!
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                {importNotification}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setImportNotification(null)}
            className="text-white/80 hover:text-white text-sm font-black shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* QUICK SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Itens Mapeados</div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{reportItems.length} SKUs</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Com histórico de giro & vendas</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Média de Escoamento</div>
          <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
            {(reportItems.reduce((acc, i) => acc + (i.estimatedStockRunoffDays || 0), 0) / (reportItems.length || 1)).toFixed(1)} dias
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Giro médio ponderado</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Volume Total Mensal</div>
          <div className="text-2xl font-black text-blue-600 mt-1 font-mono">
            {reportItems.reduce((acc, i) => acc + i.totalMovement, 0).toLocaleString('pt-BR')} sku
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Vendas + Bonificações + Remessas</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase">Distribuição Pareto</div>
          <div className="text-lg font-black text-emerald-900 mt-1 font-mono flex items-center gap-1.5">
            <span className="text-emerald-700">70% (A)</span>
            <span className="text-slate-300">/</span>
            <span className="text-amber-700">20% (B)</span>
            <span className="text-slate-300">/</span>
            <span className="text-red-700">10% (C)</span>
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Classificação Ambev sincronizada</div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por código SKU ou descrição (ex: 982, SKOL, BRAHMA, BUDWEISER)..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* ABC Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Curva ABC:</span>
            <select
              value={filterAbc}
              onChange={(e) => setFilterAbc(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700"
            >
              <option value="ALL">Todas (A/B/C)</option>
              <option value="A">Curva A (70% Volume)</option>
              <option value="B">Curva B (20% Volume)</option>
              <option value="C">Curva C (10% Volume)</option>
            </select>
          </div>

          {/* Giro Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Giro:</span>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700"
            >
              <option value="ALL">Todos os Prazos</option>
              <option value="NORMAL">Giro Rápido (&le; 40 dias)</option>
              <option value="CRITICAL">Giro Lento (&gt; 40 dias)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SPREADSHEET TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] border-b border-slate-200 uppercase">
                <th className="p-3 w-16">UNB</th>
                <th className="p-3 w-24">Código</th>
                <th className="p-3 min-w-[220px]">Nome Produto</th>
                <th className="p-3 w-16 text-center">Unid</th>
                <th className="p-3 w-20 text-center">Curva ABC</th>
                <th className="p-3 w-24 text-right">Vendas</th>
                <th className="p-3 w-20 text-right">Bonif.</th>
                <th className="p-3 w-24 text-right">Remessas</th>
                <th className="p-3 w-24 text-right">Total Mov.</th>
                <th className="p-3 w-24 text-center bg-blue-50/60 font-black text-blue-900 border-x border-blue-200">
                  Média / Dia
                </th>
                <th className="p-3 w-32 text-center bg-amber-50/70 font-black text-amber-950">
                  Dias Escoamento
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.map((item, idx) => {
                const runoff = item.estimatedStockRunoffDays || 2.0;
                const isSlow = runoff > 40;
                const abc = item.abcClass || 'A';

                return (
                  <tr key={`${item.productCode}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-500">{item.unb}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{item.productCode}</td>
                    <td className="p-3 font-semibold text-slate-900">{item.productName}</td>
                    <td className="p-3 text-center font-mono text-slate-500">{item.unit}</td>
                    
                    {/* Curva ABC Pareto */}
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-black text-xs shadow-2xs ${
                        abc === 'A' 
                          ? 'bg-emerald-600 text-white' 
                          : abc === 'B'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-red-600 text-white'
                      }`}>
                        {abc}
                      </span>
                    </td>

                    <td className="p-3 text-right font-mono">{item.sales.toLocaleString('pt-BR')}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{item.bonus || '-'}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{item.shipment || '-'}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {item.totalMovement.toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-blue-700 bg-blue-50/30 border-x border-blue-100">
                      {item.dailySalesAvg} /dia
                    </td>
                    <td className="p-3 text-center bg-amber-50/30 font-black">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-black ${
                        isSlow 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {runoff.toFixed(1).replace('.', ',')} dias
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">Importar / Colar Relatório 03.05.19</h3>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Copie os dados da planilha do relatório 03.05.19 gerado no sistema Ambev/Promax e cole no campo abaixo (ou utilize o botão de upload de arquivo Excel/CSV):
            </p>

            <textarea
              rows={10}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Cole aqui o texto delimitado por ponto e vírgula (;), tabulação ou vírgula..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleImportSubmit}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-95"
              >
                Processar & Atualizar Curva ABC (70/20/10)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
