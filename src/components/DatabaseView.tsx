import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Trash2, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  FileCode, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert, 
  Package, 
  Truck, 
  Boxes, 
  DollarSign, 
  Layers, 
  Check, 
  HelpCircle,
  FileWarning
} from 'lucide-react';
import { PullRecord, BlitzPalletRecord, PNCRecord, Report030519Item, ProductCatalogItem } from '../types';
import { 
  formatBRL, 
  formatHL, 
  exportAllToJSON, 
  exportAllBasesToCSV, 
  exportToCSV, 
  exportAllSystemBasesToExcel 
} from '../utils/nriCalculations';

interface DatabaseViewProps {
  pulls: PullRecord[];
  blitzRecords: BlitzPalletRecord[];
  pncs: PNCRecord[];
  report030519: Report030519Item[];
  catalog: ProductCatalogItem[];
  onClearAllData: () => void;
  onClearSpecificBase: (baseName: 'pulls' | 'blitz' | 'pnc' | 'report' | 'catalog') => void;
  onRestoreBackupJSON: (importedData: {
    pulls?: PullRecord[];
    blitzRecords?: BlitzPalletRecord[];
    pncs?: PNCRecord[];
    report030519?: Report030519Item[];
    catalog?: ProductCatalogItem[];
  }) => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  pulls,
  blitzRecords,
  pncs,
  report030519,
  catalog,
  onClearAllData,
  onClearSpecificBase,
  onRestoreBackupJSON
}) => {
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Consolidated Loss in R$ and HL
  const totalBlitzLossValue = useMemo(() => {
    return blitzRecords.reduce((acc, b) => acc + (b.lossValue || 0), 0);
  }, [blitzRecords]);

  const totalBlitzLossHL = useMemo(() => {
    return blitzRecords.reduce((acc, b) => {
      const cat = catalog.find(c => c.code === b.productCode);
      const hFactor = cat?.hectoliterFactor || 0.04;
      return acc + (b.retainedQty * hFactor);
    }, 0);
  }, [blitzRecords, catalog]);

  const totalPncLossValue = useMemo(() => {
    return pncs.reduce((acc, p) => acc + (p.lossValue || 0), 0);
  }, [pncs]);

  const totalPncLossHL = useMemo(() => {
    return pncs.reduce((acc, p) => {
      const cat = catalog.find(c => c.code === p.productCode);
      const hFactor = cat?.hectoliterFactor || 0.04;
      return acc + (p.quantityBlocked * hFactor);
    }, 0);
  }, [pncs, catalog]);

  const totalConsolidatedLossValue = totalBlitzLossValue + totalPncLossValue;
  const totalConsolidatedLossHL = totalBlitzLossHL + totalPncLossHL;

  // Handle Complete Clear
  const handleExecuteResetAll = () => {
    if (confirmInputText.trim().toUpperCase() !== 'ZERAR') {
      alert("Por favor digite 'ZERAR' exatamente como indicado para confirmar a limpeza.");
      return;
    }

    onClearAllData();
    setIsResetConfirmModalOpen(false);
    setConfirmInputText('');
    setStatusMessage({
      type: 'success',
      text: 'Todas as bases de dados foram limpas e zeradas com sucesso! A plataforma está pronta para início das operações do zero.'
    });

    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Handle Single Base Export CSV
  const handleExportBaseCSV = (base: 'pulls' | 'blitz' | 'pnc' | 'report' | 'catalog') => {
    const dateStr = new Date().toISOString().split('T')[0];
    if (base === 'pulls') {
      const rows: any[] = [];
      pulls.forEach(p => {
        p.items.forEach((item, idx) => {
          rows.push({
            'ID Puxada': p.header.id,
            'Nº Nota Fiscal': p.header.nfeNumber,
            'Data Recebimento': p.header.receiptDate,
            'Placa': p.header.truckPlate,
            'Fábrica': p.header.factoryOrigin,
            'Conferente': p.header.receiverName,
            'Status': p.header.status,
            'Pallet Nº': item.palletNumber || (idx + 1),
            'Código SKU': item.productCode,
            'Descrição': item.description,
            'Qtd SKU': item.quantitySku,
            'Pallets': item.palletCount,
            'Validade': item.validityDate,
            'Status Validade': item.status,
            'Volume Total (HL)': item.totalHectoliter,
            'Valor Total (R$)': item.totalValue
          });
        });
      });
      exportToCSV(rows, `Historico_Puxadas_${dateStr}.csv`);
    } else if (base === 'blitz') {
      const rows = blitzRecords.map(b => {
        const cat = catalog.find(c => c.code === b.productCode);
        const hFactor = cat?.hectoliterFactor || 0.04;
        return {
          'ID Blitz': b.id,
          'NF': b.nfeNumber,
          'Placa': b.truckPlate,
          'Fábrica': b.factoryOrigin,
          'Pallet Nº': b.palletNumber,
          'SKU': b.productCode,
          'Produto': b.productDescription,
          'Bloqueado': b.blockedQty,
          'Retido Avaria': b.retainedQty,
          'Volume Perdido (HL)': Number((b.retainedQty * hFactor).toFixed(2)),
          'Prejuízo (R$)': b.lossValue,
          'Tipo Avaria': b.damageType,
          'Status': b.status,
          'Data': b.blockDate
        };
      });
      exportToCSV(rows, `Blitz_Avarias_${dateStr}.csv`);
    } else if (base === 'pnc') {
      const rows = pncs.map(p => {
        const cat = catalog.find(c => c.code === p.productCode);
        const hFactor = cat?.hectoliterFactor || 0.04;
        return {
          'Nº PNC': p.pncNumber,
          'NF': p.nfeNumber,
          'Placa': p.truckPlate,
          'Fábrica': p.factoryOrigin,
          'SKU': p.productCode,
          'Produto': p.productDescription,
          'Lote': p.lotNumber,
          'Validade': p.validityDate,
          'Qtd Bloqueada (cx)': p.quantityBlocked,
          'Volume Bloqueado (HL)': Number((p.quantityBlocked * hFactor).toFixed(2)),
          'Prejuízo (R$)': p.lossValue,
          'Motivo': p.reason,
          'Status Fiscal': p.fiscalBlockStatus,
          'Protocolo Promax': p.promaxProtocol || '-'
        };
      });
      exportToCSV(rows, `PNC_Bloqueios_Fiscais_${dateStr}.csv`);
    } else if (base === 'report') {
      exportToCSV(report030519, `Relatorio_030519_${dateStr}.csv`);
    } else if (base === 'catalog') {
      exportToCSV(catalog, `Catalogo_SKU_Ambev_${dateStr}.csv`);
    }
  };

  // Handle JSON Import
  const handleJSONFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const payload = json.data || json;

        if (confirm(`Arquivo de backup detectado. Deseja restaurar os dados do arquivo?\n\nPuxadas: ${payload.pulls?.length || 0}\nBlitz: ${payload.blitzRecords?.length || 0}\nPNCs: ${payload.pncs?.length || 0}`)) {
          onRestoreBackupJSON(payload);
          setStatusMessage({
            type: 'success',
            text: 'Backup restaurado com sucesso para a plataforma!'
          });
          setTimeout(() => setStatusMessage(null), 4000);
        }
      } catch (err) {
        alert('Erro ao processar o arquivo JSON. Certifique-se de que é um backup válido gerado pelo sistema.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                <Database className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                GESTÃO & BASE DE DADOS INTEGRADA
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Central de controle para exportação de dados em massa (CSV, JSON e Excel), métricas consolidadas de prejuízo (R$ e HL) e reset total da plataforma para início de novos ciclos operacionais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportAllToJSON({ pulls, blitzRecords, pncs, report030519, catalog })}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Baixar backup completo em JSON estruturado"
            >
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Exportar JSON</span>
            </button>

            <button
              type="button"
              onClick={() => exportAllBasesToCSV({ pulls, blitzRecords, pncs, report030519, catalog })}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Baixar todas as bases em planilhas CSV individuais"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Exportar Todas em CSV</span>
            </button>

            <button
              type="button"
              onClick={() => exportAllSystemBasesToExcel({ catalog, pulls, blitzRecords, pncs, report030519 })}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Baixar todas as bases em uma única planilha Excel com abas"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <label className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Restaurar JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleJSONFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* 2. CONSOLIDATED LOSS & HECTOLITER METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Prejuízo Financeiro Total */}
        <div className="bg-white rounded-2xl border border-red-200 bg-red-50/30 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Prejuízo Total (R$)</span>
            <DollarSign className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700 font-mono">
            {formatBRL(totalConsolidatedLossValue)}
          </div>
          <p className="text-[11px] text-red-800 font-medium mt-1">
            Soma de Avarias em Blitz + Bloqueios PNC
          </p>
        </div>

        {/* Metric 2: Volume Total Perdido em Hectolitros */}
        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/30 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Volume de Prejuízo (HL)</span>
            <Boxes className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono">
            {formatHL(totalConsolidatedLossHL)}
          </div>
          <p className="text-[11px] text-amber-900 font-medium mt-1">
            Hectolitros retidos / avariados totais
          </p>
        </div>

        {/* Metric 3: Prejuízo Específico em PNCs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Bloqueios Fiscais (PNC)</span>
            <FileWarning className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {formatBRL(totalPncLossValue)}
          </div>
          <p className="text-[11px] text-slate-500 font-bold mt-1">
            Volume: <span className="text-purple-700">{formatHL(totalPncLossHL)}</span> ({pncs.length} ocorrências)
          </p>
        </div>

        {/* Metric 4: Prejuízo Específico em Blitz */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Avarias em Blitz</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {formatBRL(totalBlitzLossValue)}
          </div>
          <p className="text-[11px] text-slate-500 font-bold mt-1">
            Volume: <span className="text-amber-700">{formatHL(totalBlitzLossHL)}</span> ({blitzRecords.length} pallets)
          </p>
        </div>
      </div>

      {/* 3. INDIVIDUAL DATABASE TABLES & ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase">
              TABELAS & BASES DE DADOS DO SISTEMA
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Gerencie individualmente as tabelas, faça downloads de CSV ou limpe bases específicas.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {/* Base 1: Puxadas */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">1. Histórico de Puxadas & Recebimento (NRI)</h3>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-black">
                    {pulls.length} Puxadas ({pulls.reduce((acc, p) => acc + p.items.length, 0)} Itens)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registros completos de notas fiscais, conferentes, turnos, placas e itens por pallet.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleExportBaseCSV('pulls')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja limpar apenas o Histórico de Puxadas?')) {
                    onClearSpecificBase('pulls');
                  }
                }}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                title="Zerar apenas Histórico de Puxadas"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Base 2: Blitz & Avarias */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">2. Blitz de Puxada & Avarias Retidas</h3>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-black">
                    {blitzRecords.length} Pallets Registrados
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prejuízo Total: <strong className="text-slate-800">{formatBRL(totalBlitzLossValue)}</strong> | Volume: <strong className="text-amber-800">{formatHL(totalBlitzLossHL)}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleExportBaseCSV('blitz')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja limpar apenas os registros de Blitz e Avarias?')) {
                    onClearSpecificBase('blitz');
                  }
                }}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                title="Zerar apenas Blitz"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Base 3: PNCs */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl shrink-0 mt-0.5">
                <FileWarning className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">3. Produtos Não Conformes (PNC) & Bloqueio Fiscal</h3>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[11px] font-black">
                    {pncs.length} PNCs Registrados
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prejuízo Total: <strong className="text-slate-800">{formatBRL(totalPncLossValue)}</strong> | Volume: <strong className="text-purple-800">{formatHL(totalPncLossHL)}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleExportBaseCSV('pnc')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja limpar apenas a base de PNCs?')) {
                    onClearSpecificBase('pnc');
                  }
                }}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                title="Zerar apenas PNCs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Base 4: Relatório 03.05.19 */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">4. Relatório 03.05.19 & Curva ABC (Pareto)</h3>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-black">
                    {report030519.length} Itens Mapeados
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Base de escoamento, vendas, giro mensal e devoluções para cálculo inteligente de shelf-life.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleExportBaseCSV('report')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja limpar os dados do Relatório 03.05.19?')) {
                    onClearSpecificBase('report');
                  }
                }}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                title="Zerar apenas Relatório 03.05.19"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Base 5: Catálogo */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shrink-0 mt-0.5">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">5. Catálogo de Produtos SKU & Preços Ambev</h3>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[11px] font-black">
                    {catalog.length} SKUs Cadastrados
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fatores de pallet, lastro, hectolitro, preços unitários e parâmetros de shelf-life padrão.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleExportBaseCSV('catalog')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DANGER ZONE: CLEAR ALL DATA / RESET PLATFORM */}
      <div className="bg-red-50/80 rounded-2xl border-2 border-red-300 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-red-900 font-black text-sm">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>ZONA DE LIMPEZA GERAL DA PLATAFORMA (RESET TOTAL)</span>
            </div>
            <p className="text-xs text-red-700 max-w-2xl">
              Esta ação limpa <strong>todas as bases de dados armazenadas</strong> no sistema (Puxadas, Blitz, PNCs e Relatórios), permitindo iniciar as operações operacionais com a base 100% zerada. Certifique-se de exportar um backup antes caso deseje arquivar os dados anteriores.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfirmInputText('');
              setIsResetConfirmModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-black transition-all shadow-md shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Zerar Toda a Plataforma</span>
          </button>
        </div>
      </div>

      {/* 5. MODAL DE CONFIRMAÇÃO DE RESET */}
      {isResetConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Confirmar Limpeza Total</h3>
                <p className="text-xs text-slate-500">Ação irreversível de reset da base de dados</p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs text-slate-700 bg-red-50 p-4 rounded-xl border border-red-200">
              <p className="font-semibold text-red-900">
                Você está prestes a apagar todas as bases da plataforma:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                <li>{pulls.length} registros de puxadas / NRIs</li>
                <li>{blitzRecords.length} registros de blitz de avarias</li>
                <li>{pncs.length} registros de produtos não conformes</li>
                <li>Dados vinculados do relatório 03.05.19</li>
              </ul>
              <p className="text-slate-600 font-semibold pt-1">
                Para confirmar, digite <strong className="text-red-700 font-black">ZERAR</strong> no campo abaixo:
              </p>
            </div>

            <div className="mb-5">
              <input
                type="text"
                value={confirmInputText}
                onChange={(e) => setConfirmInputText(e.target.value)}
                placeholder="Digite ZERAR para confirmar"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-red-500 uppercase tracking-widest text-center"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteResetAll}
                disabled={confirmInputText.trim().toUpperCase() !== 'ZERAR'}
                className="flex items-center gap-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition-all shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar e Limpar Tudo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
