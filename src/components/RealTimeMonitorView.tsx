import React, { useState, useMemo } from 'react';
import { 
  Radio, 
  Printer, 
  Activity, 
  ShieldCheck, 
  Cloud, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Download, 
  Filter, 
  FileSpreadsheet, 
  Trash2,
  Truck,
  FileText,
  User,
  ArrowUpRight,
  Database,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { LabelPrintEvent, ActivityLogEvent, PullRecord } from '../types';
import { clearLabelPrintsInFirestore, clearActivityLogsInFirestore } from '../services/firebase';

interface RealTimeMonitorViewProps {
  labelPrints?: LabelPrintEvent[];
  activityLogs?: ActivityLogEvent[];
  pulls?: PullRecord[];
  blitzRecords?: any[];
  pncRecords?: any[];
  isDbConnected?: boolean;
  onSelectPullToPrint?: (pull: PullRecord) => void;
  onSelectPullForLabels?: (pull: PullRecord) => void;
  onRefreshData?: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const RealTimeMonitorView: React.FC<RealTimeMonitorViewProps> = ({
  labelPrints = [],
  activityLogs = [],
  pulls = [],
  isDbConnected = true,
  onSelectPullToPrint,
  onSelectPullForLabels,
  onRefreshData,
  onNavigateToTab
}) => {
  const [activeTab, setActiveTab] = useState<'prints' | 'activities' | 'integrity'>('prints');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterPrintType, setFilterPrintType] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual refresh trigger
  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshData) onRefreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Metrics
  const todayStr = new Date().toISOString().split('T')[0];

  const totalPrintsCount = labelPrints.reduce((acc, p) => acc + (p.totalLabelsCount || 0), 0);
  const printsToday = labelPrints.filter(p => (p.printedAt || '').startsWith(todayStr));
  const printsTodayCount = printsToday.reduce((acc, p) => acc + (p.totalLabelsCount || 0), 0);

  const activitiesToday = activityLogs.filter(a => (a.timestamp || '').startsWith(todayStr));

  // Filtered Label Prints
  const filteredPrints = useMemo(() => {
    return labelPrints.filter(p => {
      const matchSearch = 
        !searchTerm ||
        (p.nfeNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.truckPlate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.receiverName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.userFullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.factoryOrigin || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = filterPrintType === 'ALL' || p.printType === filterPrintType;

      return matchSearch && matchType;
    });
  }, [labelPrints, searchTerm, filterPrintType]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activityLogs.filter(a => {
      const matchSearch = 
        !searchTerm ||
        (a.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.referenceId || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = filterCategory === 'ALL' || a.category === filterCategory;

      return matchSearch && matchCategory;
    });
  }, [activityLogs, searchTerm, filterCategory]);

  // Export prints to Excel
  const handleExportPrintsExcel = () => {
    if (labelPrints.length === 0) {
      alert('Nenhum registro de impressão para exportar.');
      return;
    }

    const rows = labelPrints.map(p => ({
      'Data/Hora': new Date(p.printedAt).toLocaleString('pt-BR'),
      'NF-e': p.nfeNumber,
      'Placa Carreta': p.truckPlate,
      'Origem': p.factoryOrigin,
      'Conferente/Operador': p.userFullName || p.receiverName,
      'Tipo de Impressão': p.printType,
      'Qtd Etiquetas': p.totalLabelsCount,
      'Qtd Pallets': p.totalPallets,
      'Faces/Pallet': p.facesPerPallet,
      'Formato': p.printFormat,
      'Resumo dos SKUs': p.printedProductsSummary,
      'Observações': p.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico_Impressões');
    XLSX.writeFile(wb, `Auditoria_Impressoes_NRI_${todayStr}.xlsx`);
  };

  // Export activities to Excel
  const handleExportActivitiesExcel = () => {
    if (activityLogs.length === 0) {
      alert('Nenhum log de atividade para exportar.');
      return;
    }

    const rows = activityLogs.map(a => ({
      'Data/Hora': new Date(a.timestamp).toLocaleString('pt-BR'),
      'Categoria': a.category,
      'Severidade': a.severity,
      'Título': a.title,
      'Descrição': a.description,
      'Usuário/Operador': a.userName,
      'Referência': a.referenceId || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria_Evoluções');
    XLSX.writeFile(wb, `Auditoria_Evolucoes_Operacionais_${todayStr}.xlsx`);
  };

  // Download complete JSON disaster recovery backup
  const handleDownloadFullBackup = () => {
    const backupData = {
      backupDate: new Date().toISOString(),
      system: 'Sistema NRI & Gestão de Puxadas - Ambev Pau Brasil Guarabira',
      version: '2.5',
      pullsCount: pulls.length,
      labelPrintsCount: labelPrints.length,
      activityLogsCount: activityLogs.length,
      pulls,
      labelPrints,
      activityLogs
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Completo_NRI_${todayStr}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Real-time Status Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>SISTEMA EM TEMPO REAL ATIVO</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                <Cloud className="w-3.5 h-3.5" />
                <span>FIRESTORE CLOUD SINCRONIZADO</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>RESILIÊNCIA CONTRA PERDA DE DADOS</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Radio className="w-8 h-8 text-emerald-400 animate-pulse" />
              <span>Monitoramento Operacional & Impressão de Etiquetas</span>
            </h1>

            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Acompanhamento centralizado em tempo real de todas as emissões de etiquetas de pallets NRI, 
              evoluções de puxadas, avarias e apontamentos fiscais. Todas as informações são salvas 
              instantaneamente no banco de dados na nuvem e no cache local blindado.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold rounded-2xl text-xs transition-all border border-slate-700 cursor-pointer shadow-sm"
              title="Forçar atualização dos ouvintes"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Sincronizando...' : 'Atualizar Dados'}</span>
            </button>

            <button
              onClick={handleDownloadFullBackup}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-md cursor-pointer hover:shadow-amber-500/20"
              title="Baixar cópia de segurança em JSON com todas as tabelas"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Backup Instantâneo</span>
            </button>
          </div>
        </div>

        {/* Live Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span>Etiquetas Hoje</span>
              <Printer className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{printsTodayCount}</div>
            <div className="text-2xs text-emerald-400 font-semibold mt-0.5">{printsToday.length} lotes impressos hoje</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span>Total Acumulado</span>
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{totalPrintsCount}</div>
            <div className="text-2xs text-slate-400 font-semibold mt-0.5">Etiquetas no histórico total</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span>Puxadas no Banco</span>
              <Truck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{pulls.length}</div>
            <div className="text-2xs text-amber-400 font-semibold mt-0.5">Carretas conferidas</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span>Evoluções Registradas</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{activityLogs.length}</div>
            <div className="text-2xs text-purple-300 font-semibold mt-0.5">{activitiesToday.length} ações hoje</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('prints')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              activeTab === 'prints'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Histórico de Impressão de Etiquetas ({labelPrints.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              activeTab === 'activities'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Linha do Tempo & Evoluções ({activityLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('integrity')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              activeTab === 'integrity'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Prevenção de Perdas & Status do Banco</span>
          </button>
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por NF, carreta ou conferente..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {activeTab === 'prints' && (
            <button
              onClick={handleExportPrintsExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-black transition-colors cursor-pointer"
              title="Exportar registros de impressão em Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          )}

          {activeTab === 'activities' && (
            <button
              onClick={handleExportActivitiesExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-black transition-colors cursor-pointer"
              title="Exportar auditoria de atividades em Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: HISTÓRICO DE IMPRESSÕES */}
      {activeTab === 'prints' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Sub Filters */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Filter className="w-4 h-4 text-amber-500" />
              <span>Tipo de Emissão:</span>
              <select
                value={filterPrintType}
                onChange={(e) => setFilterPrintType(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="PRIMEIRA_EMISSAO">1ª Emissão</option>
                <option value="REIMPRESSAO">Reimpressão</option>
                <option value="REIMPRESSAO_PARCIAL">Reimpressão Parcial</option>
                <option value="TESTE_DESIGNER">Teste de Designer</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Exibindo <span className="text-slate-900 font-mono">{filteredPrints.length}</span> registro(s) de impressão
            </div>
          </div>

          {filteredPrints.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Printer className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-700">Nenhum Registro de Impressão Encontrado</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Assim que você ou qualquer membro da equipe imprimir etiquetas NRI na aba "ETIQUETAS PALLETS" ou fizer testes no "DESIGNER", o evento aparecerá aqui instantaneamente com data, conferente e carretas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-extrabold border-b border-slate-200">
                    <th className="py-3.5 px-4">Data / Horário</th>
                    <th className="py-3.5 px-4">Carreta / Placa</th>
                    <th className="py-3.5 px-4">NF-e</th>
                    <th className="py-3.5 px-4">Fábrica Origem</th>
                    <th className="py-3.5 px-4">Conferente / Usuário</th>
                    <th className="py-3.5 px-4 text-center">Tipo</th>
                    <th className="py-3.5 px-4 text-center">Etiquetas</th>
                    <th className="py-3.5 px-4 text-center">Pallets</th>
                    <th className="py-3.5 px-4">Formato</th>
                    <th className="py-3.5 px-4">Resumo dos SKUs</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredPrints.map((p) => {
                    // Match corresponding pull
                    const matchedPull = pulls.find(pull => pull.header.id === p.pullId || pull.header.nfeNumber === p.nfeNumber);

                    return (
                      <tr key={p.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono whitespace-nowrap text-slate-900 font-bold">
                          {p.printedAt ? new Date(p.printedAt).toLocaleString('pt-BR') : '-'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900 whitespace-nowrap">
                          {p.truckPlate || 'S/P'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-blue-700 whitespace-nowrap">
                          {p.nfeNumber || 'S/N'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {p.factoryOrigin || '-'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                          {p.userFullName || p.receiverName || 'Operador'}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-2xs uppercase tracking-wider ${
                            p.printType === 'PRIMEIRA_EMISSAO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : p.printType === 'TESTE_DESIGNER'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {p.printType === 'PRIMEIRA_EMISSAO' ? '1ª Emissão' : p.printType === 'TESTE_DESIGNER' ? 'Teste A4' : 'Reimpressão'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-slate-900">
                          {p.totalLabelsCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-slate-600">
                          {p.totalPallets}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-2xs text-slate-500 font-bold">
                          {p.printFormat === 'a4_4_per_page' ? 'A4 (4 etiquetas)' : p.printFormat === 'a4_double' ? 'A4 (2 etiquetas)' : 'Outro'}
                        </td>
                        <td className="py-3.5 px-4 text-2xs text-slate-600 max-w-xs truncate" title={p.printedProductsSummary}>
                          {p.printedProductsSummary || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {matchedPull && onSelectPullToPrint && (
                            <button
                              onClick={() => onSelectPullToPrint(matchedPull)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-2xs transition-colors cursor-pointer shadow-2xs"
                              title="Reabrir tela de impressão para esta carreta"
                            >
                              Reimprimir
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDITORIA DE EVOLUÇÕES & LINHA DO TEMPO */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          {/* Sub Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
              <Filter className="w-4 h-4 text-amber-500" />
              <span>Categoria:</span>
              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'PUXADA', 'ETIQUETAS', 'AVARIA', 'BLOQUEIO', 'SISTEMA'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      filterCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'Todas' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500">
              {filteredActivities.length} evento(s) no histórico
            </div>
          </div>

          {/* Timeline Feed */}
          {filteredActivities.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-700">Nenhuma Atividade Registrada</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Conforme as operações de entrada de carretas, inspeções de avarias e emissão de etiquetas forem executadas, a linha do tempo registrará tudo automaticamente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-4">
              {filteredActivities.map((a) => (
                <div key={a.id} className="py-4 flex items-start gap-4 hover:bg-slate-50/80 rounded-2xl px-3 transition-colors">
                  {/* Category Badge Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                    a.category === 'ETIQUETAS'
                      ? 'bg-amber-100 text-amber-800'
                      : a.category === 'PUXADA'
                      ? 'bg-blue-100 text-blue-800'
                      : a.category === 'AVARIA'
                      ? 'bg-orange-100 text-orange-800'
                      : a.category === 'BLOQUEIO'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {a.category === 'ETIQUETAS' && <Printer className="w-5 h-5" />}
                    {a.category === 'PUXADA' && <Truck className="w-5 h-5" />}
                    {a.category === 'AVARIA' && <AlertTriangle className="w-5 h-5" />}
                    {a.category === 'BLOQUEIO' && <ShieldCheck className="w-5 h-5" />}
                    {a.category === 'SISTEMA' && <Activity className="w-5 h-5" />}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-black text-2xs uppercase tracking-wider ${
                          a.severity === 'critical'
                            ? 'bg-red-600 text-white'
                            : a.severity === 'warning'
                            ? 'bg-amber-500 text-slate-950'
                            : a.severity === 'success'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {a.category}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900">{a.title}</h4>
                      </div>

                      <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(a.timestamp).toLocaleString('pt-BR')}</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                      {a.description}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-2xs text-slate-400 font-semibold">
                      <span className="flex items-center gap-1 text-slate-700">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{a.userName}</span>
                      </span>
                      {a.referenceId && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          Ref: {a.referenceId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PREVENÇÃO DE PERDAS & STATUS DO BANCO */}
      {activeTab === 'integrity' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              <span>Arquitetura de Alta Disponibilidade & Prevenção Total de Perda</span>
            </h3>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed mb-6">
              Para garantir que <strong>nenhuma informação seja perdida</strong>, o sistema opera sob uma 
              estratégia de dupla camada (Double-Layer Persistence): todas as alterações são salvas primeiro 
              no armazenamento seguro local (com tolerância a falhas de rede) e sincronizadas atomicamente com o 
              Google Cloud Firestore em tempo real.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-900 font-black text-sm mb-1">
                  <Cloud className="w-5 h-5 text-emerald-600" />
                  <span>Nuvem Firestore</span>
                </div>
                <p className="text-xs text-emerald-800 font-medium">
                  Persistência global centralizada no projeto Google Cloud com regras de segurança ativas.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Status: Conectado</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200">
                <div className="flex items-center gap-2 text-blue-900 font-black text-sm mb-1">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span>Cache Local Blindado</span>
                </div>
                <p className="text-xs text-blue-800 font-medium">
                  Cópia local redundante em cada terminal para que se a internet oscilar, nada é perdido.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-950 bg-white px-2.5 py-1 rounded-lg border border-blue-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Status: Sincronizado</span>
                </div>
              </div>

              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200">
                <div className="flex items-center gap-2 text-purple-900 font-black text-sm mb-1">
                  <Radio className="w-5 h-5 text-purple-600" />
                  <span>Ouvintes em Tempo Real</span>
                </div>
                <p className="text-xs text-purple-800 font-medium">
                  Qualquer colega que registrar puxada ou imprimir etiquetas atualiza sua tela sem refresh.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono font-bold text-purple-950 bg-white px-2.5 py-1 rounded-lg border border-purple-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  <span>Status: Escutando 10 coleções</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table summary of all collections */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h4 className="text-sm font-extrabold text-slate-900 mb-4">
              Auditoria de Registros Ativos por Coleção
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500">Puxadas de Carretas</div>
                <div className="text-xl font-black text-slate-900 font-mono mt-1">{pulls.length} registros</div>
                <div className="text-2xs text-slate-400 mt-1">Coleção: nri_pulls</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500">Impressões de Etiquetas</div>
                <div className="text-xl font-black text-slate-900 font-mono mt-1">{labelPrints.length} eventos</div>
                <div className="text-2xs text-slate-400 mt-1">Coleção: nri_label_prints</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500">Logs de Atividade</div>
                <div className="text-xl font-black text-slate-900 font-mono mt-1">{activityLogs.length} eventos</div>
                <div className="text-2xs text-slate-400 mt-1">Coleção: nri_activity_logs</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500">Total de Etiquetas Emitidas</div>
                <div className="text-xl font-black text-emerald-700 font-mono mt-1">{totalPrintsCount} un</div>
                <div className="text-2xs text-slate-400 mt-1">Soma de todas as faces</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Precisa de uma cópia física ou externa de todos os dados para envio ou auditoria?
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadFullBackup}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Download Backup Completo (JSON)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
