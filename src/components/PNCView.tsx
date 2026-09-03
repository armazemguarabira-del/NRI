import React, { useState, useMemo } from 'react';
import { 
  FileWarning, 
  CheckCircle, 
  ShieldCheck, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  Truck, 
  Calendar, 
  Package, 
  DollarSign, 
  FileSpreadsheet, 
  Trash2, 
  Check, 
  ExternalLink,
  AlertOctagon,
  FileCheck2,
  Lock,
  Unlock,
  RotateCcw,
  Boxes
} from 'lucide-react';
import { PNCRecord, PullRecord, ProductCatalogItem, UserAccount } from '../types';
import { formatBRL, formatDateBR, formatHL, exportDataToExcel } from '../utils/nriCalculations';
import { SupplierSearchCombobox } from './SupplierSearchCombobox';
import { ProductSearchCombobox } from './ProductSearchCombobox';

interface PNCViewProps {
  pncs: PNCRecord[];
  onUpdatePncs: (pncs: PNCRecord[]) => void;
  pulls: PullRecord[];
  catalog: ProductCatalogItem[];
  prefillPncModal?: Partial<PNCRecord> | null;
  onClearPrefillPncModal?: () => void;
  currentUser?: UserAccount | null;
}

export const PNCView: React.FC<PNCViewProps> = ({
  pncs,
  onUpdatePncs,
  pulls,
  catalog,
  prefillPncModal,
  onClearPrefillPncModal,
  currentUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [factoryFilter, setFactoryFilter] = useState<string>('ALL');

  // Modal State for New / Edit PNC
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPncToEffect, setSelectedPncToEffect] = useState<PNCRecord | null>(null);

  // Form Fields
  const [nfeNumber, setNfeNumber] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [factoryOrigin, setFactoryOrigin] = useState('950 - ITAPISSUMA');
  const [productCode, setProductCode] = useState(catalog[0]?.code || '34608');
  const [lotNumber, setLotNumber] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [quantityBlocked, setQuantityBlocked] = useState<number>(100);
  const [qualityIssueType, setQualityIssueType] = useState<PNCRecord['qualityIssueType']>('Corpo Estranho');
  const [reason, setReason] = useState('');
  const [requestedBy, setRequestedBy] = useState(() => currentUser?.fullName || 'Conferente NRI');

  // Fiscal Block Execution Modal Fields
  const [promaxProtocol, setPromaxProtocol] = useState('');
  const [fiscalBlockUser, setFiscalBlockUser] = useState(() => `${currentUser?.fullName || 'Administração NRI'}`);
  const [treatmentNotes, setTreatmentNotes] = useState('');

  // Sync logged in user if changed
  React.useEffect(() => {
    if (currentUser?.fullName) {
      setRequestedBy(currentUser.fullName);
      setFiscalBlockUser(`${currentUser.fullName} (Administração NRI)`);
    }
  }, [currentUser]);

  // Handle auto open if prefilled from Blitz
  React.useEffect(() => {
    if (prefillPncModal) {
      if (prefillPncModal.nfeNumber) setNfeNumber(prefillPncModal.nfeNumber);
      if (prefillPncModal.truckPlate) setTruckPlate(prefillPncModal.truckPlate);
      if (prefillPncModal.factoryOrigin) setFactoryOrigin(prefillPncModal.factoryOrigin);
      if (prefillPncModal.productCode) setProductCode(prefillPncModal.productCode);
      if (prefillPncModal.quantityBlocked) setQuantityBlocked(prefillPncModal.quantityBlocked);
      if (prefillPncModal.validityDate) setValidityDate(prefillPncModal.validityDate);
      if (prefillPncModal.requestedBy) setRequestedBy(prefillPncModal.requestedBy);
      if (prefillPncModal.reason) setReason(prefillPncModal.reason);
      if (prefillPncModal.qualityIssueType) setQualityIssueType(prefillPncModal.qualityIssueType);
      setIsModalOpen(true);
    }
  }, [prefillPncModal]);

  const factories = useMemo(() => {
    const set = new Set<string>();
    pncs.forEach(p => set.add(p.factoryOrigin));
    pulls.forEach(p => set.add(p.header.factoryOrigin));
    return Array.from(set).filter(Boolean).sort();
  }, [pncs, pulls]);

  // Filtered PNCs
  const filteredPncs = useMemo(() => {
    return pncs.filter(p => {
      if (statusFilter !== 'ALL' && p.fiscalBlockStatus !== statusFilter) return false;
      if (factoryFilter !== 'ALL' && p.factoryOrigin !== factoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = 
          p.pncNumber.toLowerCase().includes(q) ||
          p.nfeNumber.toLowerCase().includes(q) ||
          p.truckPlate.toLowerCase().includes(q) ||
          p.productCode.toLowerCase().includes(q) ||
          p.productDescription.toLowerCase().includes(q) ||
          p.lotNumber.toLowerCase().includes(q) ||
          p.reason.toLowerCase().includes(q) ||
          p.requestedBy.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [pncs, statusFilter, factoryFilter, searchQuery]);

  // Counts
  const pendingCount = useMemo(() => {
    return pncs.filter(p => p.fiscalBlockStatus === 'PENDENTE').length;
  }, [pncs]);

  const totalBlockedValue = useMemo(() => {
    return pncs.reduce((acc, p) => acc + p.lossValue, 0);
  }, [pncs]);

  const totalBlockedHectoliters = useMemo(() => {
    return pncs.reduce((acc, p) => {
      const cat = catalog.find(c => c.code === p.productCode);
      const hFactor = cat?.hectoliterFactor || 0.04;
      return acc + (p.quantityBlocked * hFactor);
    }, 0);
  }, [pncs, catalog]);

  // Save new PNC
  const handleSaveNewPNC = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = catalog.find(c => c.code === productCode);
    const unitPrice = cat?.price || 35.00;
    const hFactor = cat?.hectoliterFactor || 0.04;
    const lossValue = Number((quantityBlocked * unitPrice).toFixed(2));
    const blockedHectoliters = Number((quantityBlocked * hFactor).toFixed(2));
    const nextNum = pncs.length + 1;
    const pncNumber = `PNC-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

    const newPNC: PNCRecord = {
      id: `pnc-${Date.now()}`,
      pncNumber,
      nfeNumber,
      truckPlate,
      factoryOrigin,
      productCode,
      productDescription: cat?.description || `Produto SKU ${productCode}`,
      lotNumber: lotNumber || `L${new Date().getFullYear().toString().substring(2)}001`,
      validityDate: validityDate || new Date().toISOString().split('T')[0],
      quantityBlocked,
      lossValue,
      blockedHectoliters,
      reason,
      qualityIssueType,
      requestedBy,
      requestDate: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      fiscalBlockStatus: 'PENDENTE'
    };

    onUpdatePncs([newPNC, ...pncs]);
    setIsModalOpen(false);
    if (onClearPrefillPncModal) onClearPrefillPncModal();

    // Reset
    setReason('');
    setLotNumber('');
  };

  // Efetivar Bloqueio Fiscal Action
  const handleConfirmFiscalBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPncToEffect) return;

    const updated = pncs.map(p => {
      if (p.id === selectedPncToEffect.id) {
        return {
          ...p,
          fiscalBlockStatus: 'EFETIVADO' as const,
          fiscalBlockRealizedBy: fiscalBlockUser,
          fiscalBlockDate: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
          promaxProtocol: promaxProtocol || `PRX-BLQ-${Math.floor(10000 + Math.random() * 90000)}`,
          treatmentNotes
        };
      }
      return p;
    });

    onUpdatePncs(updated);
    setSelectedPncToEffect(null);
    setPromaxProtocol('');
    setTreatmentNotes('');
  };

  // Desfazer Bloqueio Fiscal (Reverter caso tenha sido feito por engano)
  const handleUndoFiscalBlock = (pnc: PNCRecord) => {
    const confirmUndo = confirm(
      `Deseja realmente desfazer o bloqueio fiscal do ${pnc.pncNumber} (${pnc.productDescription})?\n\nO status retornará para 'SOLICITADO' (Pendente) e o protocolo Promax será desvinculado.`
    );
    if (!confirmUndo) return;

    const updated = pncs.map(p => {
      if (p.id === pnc.id) {
        return {
          ...p,
          fiscalBlockStatus: 'PENDENTE' as const,
          fiscalBlockRealizedBy: undefined,
          fiscalBlockDate: undefined,
          promaxProtocol: undefined,
          treatmentNotes: p.treatmentNotes ? `${p.treatmentNotes} [Bloqueio revertido manualmente]` : undefined
        };
      }
      return p;
    });

    onUpdatePncs(updated);
  };

  // Delete PNC
  const handleDeletePnc = (id: string) => {
    if (confirm('Deseja realmente remover este registro de PNC?')) {
      onUpdatePncs(pncs.filter(p => p.id !== id));
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredPncs.map(p => ({
      'Nº PNC': p.pncNumber,
      'Nota Fiscal': p.nfeNumber,
      'Carreta': p.truckPlate,
      'Fábrica Origem': p.factoryOrigin,
      'Código SKU': p.productCode,
      'Descrição': p.productDescription,
      'Lote': p.lotNumber,
      'Validade': formatDateBR(p.validityDate),
      'Qtd Bloqueada': p.quantityBlocked,
      'Prejuízo R$': p.lossValue,
      'Tipo Problema': p.qualityIssueType,
      'Motivo': p.reason,
      'Status Bloqueio Fiscal': p.fiscalBlockStatus,
      'Solicitante': p.requestedBy,
      'Data Solicitação': p.requestDate,
      'Bloqueio Efetivado Por': p.fiscalBlockRealizedBy || '-',
      'Data Bloqueio': p.fiscalBlockDate || '-',
      'Protocolo Promax': p.promaxProtocol || '-'
    }));
    exportDataToExcel(data, `PNC_BLOQUEIOS_FISCAIS_AMBEV_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shadow-md">
            <FileWarning className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              PNC — PRODUTO NÃO CONFORME & BLOQUEIO FISCAL
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 text-xs font-mono font-bold border border-red-300">
                Qualidade & Auditoria
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Solicitação, efetivação de bloqueio fiscal no Promax/SGI e tratativas de qualidade com a fábrica
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
            <span>Exportar PNCs (Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nova Solicitação de Bloqueio Fiscal (PNC)</span>
          </button>
        </div>
      </div>

      {/* 2. PENDING FISCAL BLOCK BANNER IF ANY */}
      {pendingCount > 0 && (
        <div className="bg-red-500 text-white p-4 rounded-2xl shadow-lg border border-red-600 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">
                ATENÇÃO: {pendingCount} SOLICITAÇÃO(ÕES) DE BLOQUEIO FISCAL PENDENTE(S)!
              </h3>
              <p className="text-xs text-red-100">
                Lotes não conformes aguardando efetivação fiscal no Promax e segregação física no armazém.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDENTE')}
            className="px-4 py-1.5 bg-white text-red-700 hover:bg-red-50 rounded-xl text-xs font-black shrink-0 shadow-md"
          >
            Filtrar Pendentes
          </button>
        </div>
      )}

      {/* 3. METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">Total de PNCs</span>
            <FileWarning className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {pncs.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Registros totais na plataforma</p>
        </div>

        <div className="bg-white rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-red-600 mb-1">
            <span className="text-xs font-bold uppercase">Bloqueios Pendentes</span>
            <Clock className="w-4 h-4 text-red-500 animate-spin" />
          </div>
          <div className="text-2xl font-black text-red-700 font-mono">
            {pendingCount}
          </div>
          <p className="text-[11px] text-red-600 mt-1 font-semibold">Aguardando efetivação fiscal</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold uppercase">Bloqueio Fiscal Efetivado</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {pncs.filter(p => p.fiscalBlockStatus === 'EFETIVADO').length}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">Com protocolo Promax ativo</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">Prejuízo Bloqueado</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatBRL(totalBlockedValue)}
          </div>
          <p className="text-[11px] text-amber-700 font-bold mt-1 flex items-center gap-1">
            <Boxes className="w-3 h-3" />
            <span>Volume Total: {formatHL(totalBlockedHectoliters)}</span>
          </p>
        </div>
      </div>

      {/* 4. FILTERS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por PNC, NF, Lote, SKU, Solicitante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        <div className="w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Pendente de Bloqueio</option>
            <option value="EFETIVADO">Bloqueio Fiscal Efetivado</option>
            <option value="TRATADO">Tratado / Concluído</option>
            <option value="DEVOLVIDO">Devolvido à Fábrica</option>
          </select>
        </div>

        <div className="w-44">
          <select
            value={factoryFilter}
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

      {/* 5. PNC TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-900 text-sm">
              LISTA DE PRODUTOS NÃO CONFORMES & TRATATIVAS ({filteredPncs.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Controle detalhado de bloqueios fiscais, laudos e protocolos Promax
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">PNC / NF</th>
                <th className="py-3 px-3">Origem / Carreta</th>
                <th className="py-3 px-3">Produto / Lote</th>
                <th className="py-3 px-3 text-center">Qtd Bloqueada</th>
                <th className="py-3 px-3 text-right">Valor R$</th>
                <th className="py-3 px-3">Motivo & Problema</th>
                <th className="py-3 px-3">Solicitante</th>
                <th className="py-3 px-3 text-center">Status Fiscal</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 font-medium">
              {filteredPncs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    Nenhum PNC encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredPncs.map(pnc => {
                  const isEfetivado = pnc.fiscalBlockStatus === 'EFETIVADO';
                  const isPendente = pnc.fiscalBlockStatus === 'PENDENTE';

                  return (
                    <tr key={pnc.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* PNC / NF */}
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900 font-mono text-xs text-red-600">
                          {pnc.pncNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          NF: {pnc.nfeNumber}
                        </div>
                      </td>

                      {/* Origin / Truck */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{pnc.factoryOrigin}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{pnc.truckPlate}</span>
                        </div>
                      </td>

                      {/* SKU / Lot */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-bold text-slate-900 truncate" title={pnc.productDescription}>
                          {pnc.productDescription}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Lote: <strong>{pnc.lotNumber}</strong> | Val: {formatDateBR(pnc.validityDate)}
                        </div>
                      </td>

                      {/* Qtd & Volume */}
                      <td className="py-3 px-3 text-center bg-red-50/40">
                        <div className="font-mono font-black text-red-700 text-xs">
                          {pnc.quantityBlocked} cx
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 font-bold">
                          {formatHL(pnc.blockedHectoliters || (pnc.quantityBlocked * (catalog.find(c => c.code === pnc.productCode)?.hectoliterFactor || 0.04)))}
                        </div>
                      </td>

                      {/* Value */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatBRL(pnc.lossValue)}
                      </td>

                      {/* Reason & Type */}
                      <td className="py-3 px-3 max-w-[220px]">
                        <span className="inline-block px-2 py-0.5 bg-red-100 text-red-900 rounded font-bold text-[10px] mb-1">
                          {pnc.qualityIssueType}
                        </span>
                        <p className="text-[11px] text-slate-600 truncate leading-tight" title={pnc.reason}>
                          {pnc.reason}
                        </p>
                      </td>

                      {/* Requester */}
                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-bold text-slate-800">{pnc.requestedBy}</div>
                        <div className="text-slate-400 font-mono">{pnc.requestDate}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {isEfetivado && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-black">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                              <span>BLOQUEIO REALIZADO</span>
                            </span>
                            {pnc.promaxProtocol && (
                              <span className="block text-[9px] font-mono text-slate-500 font-bold">
                                {pnc.promaxProtocol}
                              </span>
                            )}
                          </div>
                        )}
                        {isPendente && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 rounded-lg text-[10px] font-black animate-pulse">
                            <Clock className="w-3 h-3 stroke-[2.5]" />
                            <span>SOLICITADO</span>
                          </span>
                        )}
                        {!isEfetivado && !isPendente && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-[10px] font-black">
                            <span>{pnc.fiscalBlockStatus}</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPendente && (
                            <button
                              type="button"
                              onClick={() => setSelectedPncToEffect(pnc)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all shadow-xs"
                              title="Efetivar Bloqueio Fiscal no Promax"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Bloquear</span>
                            </button>
                          )}

                          {isEfetivado && (
                            <button
                              type="button"
                              onClick={() => handleUndoFiscalBlock(pnc)}
                              className="flex items-center gap-1 px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs"
                              title="Desfazer Bloqueio Fiscal (caso tenha sido feito por engano)"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-700" />
                              <span>Desfazer</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeletePnc(pnc.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            title="Excluir PNC"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL TO REGISTER NEW PNC */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black">
                  <FileWarning className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">SOLICITAR BLOQUEIO FISCAL (PNC)</h3>
                  <p className="text-xs text-red-100">Registro de Produto Não Conforme e solicitação fiscal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white text-lg font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewPNC} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nota Fiscal:</label>
                  <input
                    type="text"
                    value={nfeNumber}
                    onChange={(e) => setNfeNumber(e.target.value)}
                    placeholder="Ex: 1106399"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Carreta / Placa:</label>
                  <input
                    type="text"
                    value={truckPlate}
                    onChange={(e) => setTruckPlate(e.target.value)}
                    placeholder="Ex: RLU3F59"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fábrica Origem:</label>
                  <SupplierSearchCombobox
                    value={factoryOrigin}
                    onChange={(val) => setFactoryOrigin(val)}
                    placeholder="Digite ou selecione a fábrica..."
                    showQuickChips={true}
                    theme="light"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Produto SKU (buscar por código ou nome):</label>
                  <ProductSearchCombobox
                    catalog={catalog}
                    selectedProductCode={productCode}
                    onSelectProduct={(prod) => setProductCode(prod.code)}
                    theme="light"
                    placeholder="Digite código SKU ou nome da cerveja/refri..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Não Conformidade / Motivo:</label>
                  <select
                    value={qualityIssueType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setQualityIssueType(val);
                      if (val === 'Próximo da Validade' && !reason) {
                        setReason('Produto recebido próximo da validade / lote crítico (Short Date).');
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 focus:border-red-500 rounded-xl text-xs font-bold text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  >
                    <option value="Próximo da Validade">Próximo da Validade (Short Date / Vencimento)</option>
                    <option value="Corpo Estranho">Corpo Estranho no Produto</option>
                    <option value="Vazamento em Massa">Vazamento em Massa / Ruptura</option>
                    <option value="Lote Fora Padrão">Lote Fora do Padrão Ambev</option>
                    <option value="Data Ilegível">Data de Validade Ilegível / Sem Gravação</option>
                    <option value="Fermentação">Fermentação Alterada / Odor Estranho</option>
                    <option value="Mofo">Presença de Mofo / Umidade Excessiva</option>
                    <option value="Pallet Estrutural">Pallet Estruturalmente Condenado</option>
                    <option value="Outro">Outro Motivo Grave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-red-50 p-3.5 rounded-2xl border border-red-200">
                <div>
                  <label className="block text-xs font-bold text-red-900 mb-1">Lote Fabril:</label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Ex: L26228AQ"
                    className="w-full px-3 py-2 bg-white border border-red-300 rounded-xl text-xs font-mono font-bold text-red-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-red-900 mb-1">Data de Validade:</label>
                  <input
                    type="date"
                    value={validityDate}
                    onChange={(e) => setValidityDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-red-300 rounded-xl text-xs font-mono font-bold text-red-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-red-900 mb-1">Quantidade Bloqueada:</label>
                  <input
                    type="number"
                    min={1}
                    value={quantityBlocked}
                    onChange={(e) => setQuantityBlocked(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-red-300 rounded-xl text-xs font-mono font-black text-red-900"
                    required
                  />
                </div>
              </div>

              {/* Loss Preview in R$ and HL */}
              {(() => {
                const cat = catalog.find(c => c.code === productCode);
                const unitPrice = cat?.price || 35.00;
                const hFactor = cat?.hectoliterFactor || 0.04;
                const estLossVal = quantityBlocked * unitPrice;
                const estLossHL = quantityBlocked * hFactor;
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Prejuízo Financeiro Estimado:</span>
                      <span className="text-sm font-black font-mono text-amber-950">{formatBRL(estLossVal)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Volume Total Bloqueado:</span>
                      <span className="text-sm font-black font-mono text-amber-950">{formatHL(estLossHL)}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo Detalhado da Solicitação de Bloqueio Fiscal:
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva minuciosamente a não conformidade para envio ao controle de qualidade Ambev..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Solicitante (Conferente / Qualidade):</label>
                <input
                  type="text"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all shadow-md"
                >
                  Confirmar e Gerar PNC
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL TO EFFECT FISCAL BLOCK (BLOQUEIO FISCAL REALIZADO) */}
      {selectedPncToEffect && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">EFETIVAR BLOQUEIO FISCAL</h3>
                  <p className="text-xs text-emerald-100">{selectedPncToEffect.pncNumber} — {selectedPncToEffect.productDescription}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPncToEffect(null)}
                className="text-white/80 hover:text-white text-lg font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmFiscalBlock} className="p-6 space-y-4">
              
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-xs space-y-1.5 text-emerald-900">
                <div className="font-black text-sm text-emerald-950">
                  Confirmar Bloqueio Fiscal no Sistema Promax
                </div>
                <p>
                  Esta ação mudará o status do lote para <strong>BLOQUEIO REALIZADO</strong> e registrará o protocolo fiscal oficial.
                </p>
                <div className="pt-2 font-mono text-[11px] text-emerald-800 border-t border-emerald-200">
                  Lote: <strong>{selectedPncToEffect.lotNumber}</strong> | Qtd: <strong>{selectedPncToEffect.quantityBlocked} cx</strong> | Valor: <strong>{formatBRL(selectedPncToEffect.lossValue)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número do Protocolo / Lote Promax:
                </label>
                <input
                  type="text"
                  value={promaxProtocol}
                  onChange={(e) => setPromaxProtocol(e.target.value)}
                  placeholder="Ex: PRX-BLQ-99412"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Responsável pelo Bloqueio Fiscal:
                </label>
                <input
                  type="text"
                  value={fiscalBlockUser}
                  onChange={(e) => setFiscalBlockUser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Parecer / Tratativa Inicial:
                </label>
                <textarea
                  rows={2}
                  value={treatmentNotes}
                  onChange={(e) => setTreatmentNotes(e.target.value)}
                  placeholder="Ex: Bloqueio efetuado no Promax. Aberto chamado com fábrica para emissão de nota de devolução."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedPncToEffect(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Salvar Bloqueio Realizado</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
