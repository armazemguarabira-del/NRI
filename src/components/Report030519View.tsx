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
  SlidersHorizontal,
  Package,
  RotateCcw,
  Check,
  HelpCircle,
  FileDown
} from 'lucide-react';
import { Report030519Item, ProductCatalogItem, ABCClass } from '../types';
import { 
  parseSimpleAbcCurveExcel, 
  downloadAbcCurveTemplate, 
  exportDataToExcel,
  formatBRL 
} from '../utils/nriCalculations';
import { OFFICIAL_ABC_CURVE_ITEMS } from '../data/officialAbcCurve';
import { INITIAL_PRODUCTS } from '../data/initialCatalog';

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
  const [filterAbc, setFilterAbc] = useState<'ALL' | ABCClass>('ALL');
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics for the current catalog ABC curve
  const stats = useMemo(() => {
    const countA = catalog.filter(p => p.abcClass === 'A').length;
    const countB = catalog.filter(p => p.abcClass === 'B').length;
    const countC = catalog.filter(p => p.abcClass === 'C').length;
    return {
      countA,
      countB,
      countC,
      total: catalog.length
    };
  }, [catalog]);

  // Filtered catalog items
  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = 
          item.code.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.packaging && item.packaging.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (filterAbc !== 'ALL' && item.abcClass !== filterAbc) return false;

      return true;
    });
  }, [catalog, searchTerm, filterAbc]);

  // Apply the 3-column Excel import directly to the catalog
  const handleProcessExcelFile = async (file: File) => {
    try {
      setIsProcessing(true);
      const result = await parseSimpleAbcCurveExcel(file);

      if (!result.items || result.items.length === 0) {
        alert('Nenhum registro de SKU foi encontrado na planilha. Verifique se as colunas Código, Descrição e Curva estão preenchidas.');
        setIsProcessing(false);
        return;
      }

      // Map existing catalog items and update ABC classes
      const catalogMap = new Map<string, ProductCatalogItem>();
      catalog.forEach(p => catalogMap.set(p.code, { ...p }));

      result.items.forEach((importedItem, index) => {
        const existing = catalogMap.get(importedItem.code);
        if (existing) {
          catalogMap.set(importedItem.code, {
            ...existing,
            description: importedItem.description || existing.description,
            abcClass: importedItem.abcClass,
            rank: index + 1
          });
        } else {
          // New SKU from imported Excel
          catalogMap.set(importedItem.code, {
            code: importedItem.code,
            description: importedItem.description,
            unit: 'cx12',
            category: 'Geral',
            price: 35.00,
            unitPrice: 2.91,
            hectoliterFactor: 0.04,
            palletFactor: 120,
            lastroFactor: 12,
            factorSKU: 12,
            packaging: 'PADRÃO',
            abcClass: importedItem.abcClass,
            rank: index + 1,
            defaultShelfLifeDays: 180
          });
        }
      });

      const updatedCatalog = Array.from(catalogMap.values()).sort((a, b) => (a.rank || 999) - (b.rank || 999));
      onUpdateCatalog(updatedCatalog);

      setImportNotification(
        `Curva ABC importada com sucesso! ${result.summary.total} SKUs processados: Curva A (${result.summary.countA}), Curva B (${result.summary.countB}), Curva C (${result.summary.countC}).`
      );

      setTimeout(() => {
        setImportNotification(null);
      }, 7000);

    } catch (err: any) {
      console.error('Error importing ABC curve Excel:', err);
      alert(err.message || 'Erro ao importar planilha da Curva ABC.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessExcelFile(file);
    }
    if (e.target) e.target.value = '';
  };

  // Restore Official 190 items
  const handleRestoreOfficial190 = () => {
    if (window.confirm('Deseja aplicar a Curva ABC Oficial da Pau Brasil Ambev (190 SKUs classificados)?')) {
      const catalogMap = new Map<string, ProductCatalogItem>();
      catalog.forEach(p => catalogMap.set(p.code, { ...p }));

      OFFICIAL_ABC_CURVE_ITEMS.forEach((official) => {
        const existing = catalogMap.get(official.code);
        if (existing) {
          catalogMap.set(official.code, {
            ...existing,
            description: official.description || existing.description,
            abcClass: official.abcClass,
            rank: official.rank
          });
        } else {
          catalogMap.set(official.code, {
            code: official.code,
            description: official.description,
            unit: 'cx12',
            category: 'Geral',
            price: 35.00,
            unitPrice: 2.91,
            hectoliterFactor: 0.04,
            palletFactor: 120,
            lastroFactor: 12,
            factorSKU: 12,
            packaging: 'PADRÃO',
            abcClass: official.abcClass,
            rank: official.rank,
            defaultShelfLifeDays: 180
          });
        }
      });

      const updatedCatalog = Array.from(catalogMap.values()).sort((a, b) => (a.rank || 999) - (b.rank || 999));
      onUpdateCatalog(updatedCatalog);

      setImportNotification(
        `Curva ABC Oficial restaurada com sucesso! 190 SKUs configurados: Curva A (18 SKUs), Curva B (31 SKUs), Curva C (141 SKUs).`
      );
      setTimeout(() => setImportNotification(null), 6000);
    }
  };

  // Export current ABC curve to Excel (3 columns)
  const handleExportAbcExcel = () => {
    const data = catalog.map((p, idx) => ({
      'CÓDIGO': p.code,
      'DESCRIÇÃO': p.description,
      'CURVA': p.abcClass
    }));

    exportDataToExcel(data, `CURVA_ABC_PAU_BRASIL_AMBEV_${new Date().toISOString().split('T')[0]}`);
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
              <span>Importação & Gestão da Curva ABC</span>
              <span className="text-xs bg-blue-100 text-blue-800 font-mono font-bold px-2.5 py-0.5 rounded-full">
                PARETO AMBEV
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Atualize a classificação de Curva ABC dos produtos através de planilha Excel (.xlsx) contendo apenas Código, Descrição e Curva.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={downloadAbcCurveTemplate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs transition-all shadow-xs border border-slate-700 active:scale-95"
            title="Baixar modelo de planilha Excel com 3 colunas [Código, Descrição, Curva]"
          >
            <FileDown className="w-4 h-4 text-amber-400" />
            <span>Baixar Modelo Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportAbcExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs active:scale-95"
            title="Exportar base atual da Curva ABC em formato Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Curva ABC (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleRestoreOfficial190}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs active:scale-95"
            title="Restaurar os 190 SKUs da Curva ABC Oficial Ambev"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Curva Oficial (190 Itens)</span>
          </button>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION BANNER */}
      {importNotification && (
        <div className="bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-md flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            <span>{importNotification}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setImportNotification(null)}
            className="text-white/80 hover:text-white font-black ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. DEDICATED EXCEL IMPORT FIELD (DRAG & DROP / FILE SELECTION) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight font-mono">
              Campo de Importação da Curva ABC via Excel
            </h2>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Estrutura simples: <strong>CÓDIGO</strong> | <strong>DESCRIÇÃO</strong> | <strong>CURVA</strong> (A, B ou C)</span>
          </div>
        </div>

        {/* DRAG & DROP BOX */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleProcessExcelFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            isDragging 
              ? 'border-amber-500 bg-amber-50/60 scale-[0.99]' 
              : 'border-slate-300 hover:border-amber-500 bg-slate-50/70 hover:bg-amber-50/20'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".xlsx, .xls, .csv, .tsv, .txt"
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
            {isProcessing ? (
              <RefreshCw className="w-7 h-7 animate-spin text-amber-600" />
            ) : (
              <FileSpreadsheet className="w-7 h-7" />
            )}
          </div>

          <div>
            <p className="text-sm font-black text-slate-900">
              {isProcessing ? (
                'Processando planilha e atualizando Curva ABC...'
              ) : (
                <>
                  <span className="text-amber-600 underline">Clique para selecionar</span> ou arraste o arquivo Excel (.xlsx / .csv) da Curva ABC aqui
                </>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              O sistema lê automaticamente as colunas <strong>Código</strong>, <strong>Descrição</strong> e <strong>Curva</strong> e atualiza as etiquetas e consultas instantaneamente.
            </p>
          </div>

          <button
            type="button"
            className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Selecionar Arquivo Excel</span>
          </button>
        </div>
      </div>

      {/* 3. SUMMARY KPI METRICS OF CURRENT ABC CLASSIFICATION */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        {/* TOTAL SKUS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500">Total de Produtos</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
            <div className="text-[10px] text-slate-400 font-medium">Cadastrados no sistema</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* CURVA A (VERDE) */}
        <div 
          onClick={() => setFilterAbc(filterAbc === 'A' ? 'ALL' : 'A')}
          className={`cursor-pointer bg-emerald-50/70 p-4 rounded-2xl border border-emerald-300 shadow-2xs flex items-center justify-between transition-all hover:scale-[1.02] ${
            filterAbc === 'A' ? 'ring-2 ring-emerald-500 bg-emerald-100' : ''
          }`}
        >
          <div>
            <div className="text-[11px] font-black uppercase text-emerald-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span>Curva A (Alto Giro)</span>
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-0.5">{stats.countA} <span className="text-xs text-emerald-700 font-bold">SKUs</span></div>
            <div className="text-[10px] text-emerald-700 font-bold">
              {stats.total > 0 ? ((stats.countA / stats.total) * 100).toFixed(1) : 0}% do catálogo
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-600 text-white font-black text-sm rounded-lg shadow-xs">
            A
          </span>
        </div>

        {/* CURVA B (AMARELO) */}
        <div 
          onClick={() => setFilterAbc(filterAbc === 'B' ? 'ALL' : 'B')}
          className={`cursor-pointer bg-amber-50/70 p-4 rounded-2xl border border-amber-300 shadow-2xs flex items-center justify-between transition-all hover:scale-[1.02] ${
            filterAbc === 'B' ? 'ring-2 ring-amber-500 bg-amber-100' : ''
          }`}
        >
          <div>
            <div className="text-[11px] font-black uppercase text-amber-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Curva B (Médio Giro)</span>
            </div>
            <div className="text-2xl font-black text-amber-950 mt-0.5">{stats.countB} <span className="text-xs text-amber-700 font-bold">SKUs</span></div>
            <div className="text-[10px] text-amber-700 font-bold">
              {stats.total > 0 ? ((stats.countB / stats.total) * 100).toFixed(1) : 0}% do catálogo
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-sm rounded-lg shadow-xs">
            B
          </span>
        </div>

        {/* CURVA C (VERMELHO) */}
        <div 
          onClick={() => setFilterAbc(filterAbc === 'C' ? 'ALL' : 'C')}
          className={`cursor-pointer bg-rose-50/70 p-4 rounded-2xl border border-rose-300 shadow-2xs flex items-center justify-between transition-all hover:scale-[1.02] ${
            filterAbc === 'C' ? 'ring-2 ring-rose-500 bg-rose-100' : ''
          }`}
        >
          <div>
            <div className="text-[11px] font-black uppercase text-rose-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Curva C (Baixo Giro)</span>
            </div>
            <div className="text-2xl font-black text-rose-950 mt-0.5">{stats.countC} <span className="text-xs text-rose-700 font-bold">SKUs</span></div>
            <div className="text-[10px] text-rose-700 font-bold">
              {stats.total > 0 ? ((stats.countC / stats.total) * 100).toFixed(1) : 0}% do catálogo
            </div>
          </div>
          <span className="px-3 py-1 bg-rose-600 text-white font-black text-sm rounded-lg shadow-xs">
            C
          </span>
        </div>

      </div>

      {/* 4. CURRENT ABC CURVE TABLE & SEARCH */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Header & Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500"
              />
            </div>

            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                Limpar busca
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Filtrar Curva:</span>
            <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterAbc('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  filterAbc === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({catalog.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterAbc('A')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  filterAbc === 'A' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Curva A ({stats.countA})
              </button>
              <button
                type="button"
                onClick={() => setFilterAbc('B')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  filterAbc === 'B' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-amber-800 hover:bg-amber-100'
                }`}
              >
                Curva B ({stats.countB})
              </button>
              <button
                type="button"
                onClick={() => setFilterAbc('C')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  filterAbc === 'C' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-100'
                }`}
              >
                Curva C ({stats.countC})
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr className="text-slate-700 font-bold text-[11px] border-b border-slate-200 uppercase">
                <th className="p-3 w-16 text-center">Rank</th>
                <th className="p-3 w-28">Código SKU</th>
                <th className="p-3">Descrição do Produto</th>
                <th className="p-3 w-32 text-center">Curva ABC</th>
                <th className="p-3 w-24 text-center">Unidade</th>
                <th className="p-3 w-28 text-center">Fator Pallet</th>
                <th className="p-3 w-28 text-center">Fator Lastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
              {filteredCatalog.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    Nenhum produto encontrado na pesquisa.
                  </td>
                </tr>
              ) : (
                filteredCatalog.map((item, idx) => (
                  <tr key={item.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-bold">
                      {item.rank || idx + 1}
                    </td>
                    <td className="p-3">
                      <span className="inline-block font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                        {item.code}
                      </span>
                    </td>
                    <td className="p-3 font-sans font-bold text-slate-900">
                      {item.description}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className="inline-block px-3 py-1 rounded-lg text-xs font-black shadow-xs"
                        style={{
                          backgroundColor: item.abcClass === 'A' ? '#16a34a' : item.abcClass === 'B' ? '#eab308' : '#ef4444',
                          color: item.abcClass === 'B' ? '#000000' : '#ffffff'
                        }}
                      >
                        Curva {item.abcClass}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-600">
                      {item.unit}
                    </td>
                    <td className="p-3 text-center font-black text-amber-800">
                      {item.palletFactor}
                    </td>
                    <td className="p-3 text-center font-black text-blue-800">
                      {item.lastroFactor}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Exibindo {filteredCatalog.length} de {catalog.length} produtos</span>
          <span className="font-mono">Pau Brasil Distribuidora Ambev • Guarabira - PB</span>
        </div>

      </div>

    </div>
  );
};
