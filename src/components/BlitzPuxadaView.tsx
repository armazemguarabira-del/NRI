import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Search, 
  Filter, 
  RotateCcw, 
  Trash2, 
  FileSpreadsheet, 
  Truck, 
  Building2, 
  Calendar, 
  Package, 
  DollarSign, 
  Layers, 
  FileWarning, 
  ArrowRight,
  ExternalLink,
  Check,
  Clock,
  UserCheck,
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { BlitzPalletRecord, PullRecord, ProductCatalogItem, PNCRecord, UserAccount } from '../types';
import { formatBRL, formatDateBR, exportDataToExcel } from '../utils/nriCalculations';

// Allowed damage reasons as strictly requested by user
export const DAMAGE_REASONS = [
  'Falta de produto',
  'Vazamento',
  'Estufada',
  'Próximo da validade',
  'Estourada',
  'Mal cheio',
  'Quebrada'
] as const;

interface BlitzPuxadaViewProps {
  pulls: PullRecord[];
  catalog: ProductCatalogItem[];
  blitzRecords: BlitzPalletRecord[];
  onUpdateBlitzRecords: (records: BlitzPalletRecord[]) => void;
  onOpenPNCModal: (prefillData: Partial<PNCRecord>) => void;
  onNavigateToPNC: () => void;
  currentUser?: UserAccount | null;
}

export const BlitzPuxadaView: React.FC<BlitzPuxadaViewProps> = ({
  pulls,
  catalog,
  blitzRecords,
  onUpdateBlitzRecords,
  onOpenPNCModal,
  onNavigateToPNC,
  currentUser
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Selected Pull for Blitz Execution
  const [selectedPullId, setSelectedPullId] = useState<string>(() => {
    return pulls[0]?.header.id || '';
  });

  // Keep selected pull synced if pulls change
  useEffect(() => {
    if (!selectedPullId && pulls.length > 0) {
      setSelectedPullId(pulls[0].header.id);
    }
  }, [pulls, selectedPullId]);

  // Filters for History Table
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedFactory, setSelectedFactory] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pullsFilterMode, setPullsFilterMode] = useState<'today' | 'all'>('today');

  // Currently Active Blitz Form State (when inspecting a pallet)
  const [activePalletInspect, setActivePalletInspect] = useState<{
    palletNumber: number;
    productCode: string;
    productDescription: string;
    unit: string;
    unitPrice: number;
    skuQuantity: number;
    validityDate: string;
    status: 'BLOQUEADO' | 'EM_RETRABALHO' | 'LIBERADO' | 'PNC_SOLICITADO';
    existingRecordId?: string;
  } | null>(null);

  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [conferenteName, setConferenteName] = useState<string>(() => currentUser?.fullName || 'Gilson Conferente');
  const [retainedQty, setRetainedQty] = useState<number>(0);
  const [damageReason, setDamageReason] = useState<string>(DAMAGE_REASONS[0]);
  const [notes, setNotes] = useState<string>('');
  const [shouldOpenPNC, setShouldOpenPNC] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser?.fullName) {
      setConferenteName(currentUser.fullName);
    }
  }, [currentUser]);

  // Selected pull object
  const currentPull = useMemo(() => {
    return pulls.find(p => p.header.id === selectedPullId) || pulls[0];
  }, [pulls, selectedPullId]);

  // Pulls list filtered by today or all
  const displayedPulls = useMemo(() => {
    if (pullsFilterMode === 'today') {
      const todayPulls = pulls.filter(p => 
        p.header.receiptDate === todayStr || 
        p.header.issueDate === todayStr ||
        (p.header.createdAt && p.header.createdAt.startsWith(todayStr))
      );
      return todayPulls.length > 0 ? todayPulls : pulls;
    }
    return pulls;
  }, [pulls, pullsFilterMode, todayStr]);

  // Derived list of pallet items for the current pull
  const currentPullPallets = useMemo(() => {
    if (!currentPull) return [];
    
    return currentPull.items.map((it, idx) => {
      const cat = catalog.find(c => c.code === it.productCode);
      const palletNum = it.palletNumber || idx + 1;
      const skuCount = it.quantitySku || (cat?.palletFactor || 100);
      const unitPrice = cat?.price || it.unitPrice || 35.00;
      
      // Check if there is already a Blitz record for this pull and pallet
      const existingBlitz = blitzRecords.find(
        b => b.pullId === currentPull.header.id && b.palletNumber === palletNum
      );

      return {
        palletNumber: palletNum,
        productCode: it.productCode,
        productDescription: it.description,
        unit: it.unit || 'CX',
        validityDate: it.validityDate,
        skuQuantity: skuCount,
        unitPrice,
        existingBlitz,
        status: existingBlitz ? existingBlitz.status : 'PENDENTE'
      };
    });
  }, [currentPull, catalog, blitzRecords]);

  // KPI Calculations
  const pullStats = useMemo(() => {
    if (!currentPull) return { total: 0, completed: 0, inProgress: 0, pending: 0, totalDamagedUnits: 0 };
    const total = currentPullPallets.length;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let totalDamagedUnits = 0;

    currentPullPallets.forEach(p => {
      if (p.existingBlitz) {
        if (p.existingBlitz.status === 'LIBERADO' || p.existingBlitz.status === 'PNC_SOLICITADO') {
          completed++;
        } else {
          inProgress++;
        }
        totalDamagedUnits += p.existingBlitz.retainedQty;
      } else {
        pending++;
      }
    });

    return { total, completed, inProgress, pending, totalDamagedUnits };
  }, [currentPull, currentPullPallets]);

  // Start Blitz on a specific Pallet
  const handleStartBlitz = (pallet: typeof currentPullPallets[0]) => {
    if (!currentPull) return;

    // If no existing record, create one with status EM_RETRABALHO
    const recordId = pallet.existingBlitz?.id || `blitz-${Date.now()}-${pallet.palletNumber}`;
    const newRecord: BlitzPalletRecord = {
      id: recordId,
      pullId: currentPull.header.id,
      nfeNumber: currentPull.header.nfeNumber,
      truckPlate: currentPull.header.truckPlate,
      factoryOrigin: currentPull.header.factoryOrigin,
      palletNumber: pallet.palletNumber,
      productCode: pallet.productCode,
      productDescription: pallet.productDescription,
      unit: pallet.unit,
      unitPrice: pallet.unitPrice,
      blockedQty: pallet.skuQuantity,
      retainedQty: 0,
      releasedQty: pallet.skuQuantity,
      lossValue: 0,
      blockDate: todayStr,
      releaseDate: null,
      status: 'EM_RETRABALHO',
      damageType: 'Em Inspeção',
      conferente: conferenteName,
      notes: 'Blitz iniciada pelo conferente. Pallet em conferência física e retrabalho.'
    };

    const existingIdx = blitzRecords.findIndex(b => b.id === recordId);
    let updated: BlitzPalletRecord[];
    if (existingIdx >= 0) {
      updated = [...blitzRecords];
      updated[existingIdx] = newRecord;
    } else {
      updated = [newRecord, ...blitzRecords];
    }
    onUpdateBlitzRecords(updated);

    // Open completion modal directly so conferente can inspect and report damage/release
    setActivePalletInspect({
      palletNumber: pallet.palletNumber,
      productCode: pallet.productCode,
      productDescription: pallet.productDescription,
      unit: pallet.unit,
      unitPrice: pallet.unitPrice,
      skuQuantity: pallet.skuQuantity,
      validityDate: pallet.validityDate,
      status: 'EM_RETRABALHO',
      existingRecordId: recordId
    });
    setRetainedQty(0);
    setDamageReason(DAMAGE_REASONS[0]);
    setNotes('');
    setShouldOpenPNC(false);
    setIsFinalizeModalOpen(true);
  };

  // Open inspection/finish modal for already started pallet
  const handleOpenFinalizeModal = (pallet: typeof currentPullPallets[0]) => {
    setActivePalletInspect({
      palletNumber: pallet.palletNumber,
      productCode: pallet.productCode,
      productDescription: pallet.productDescription,
      unit: pallet.unit,
      unitPrice: pallet.unitPrice,
      skuQuantity: pallet.skuQuantity,
      validityDate: pallet.validityDate,
      status: (pallet.existingBlitz?.status as any) || 'EM_RETRABALHO',
      existingRecordId: pallet.existingBlitz?.id
    });
    setRetainedQty(pallet.existingBlitz?.retainedQty || 0);
    setDamageReason(pallet.existingBlitz?.damageType && DAMAGE_REASONS.includes(pallet.existingBlitz.damageType as any) ? pallet.existingBlitz.damageType : DAMAGE_REASONS[0]);
    setNotes(pallet.existingBlitz?.notes || '');
    setShouldOpenPNC(pallet.existingBlitz?.status === 'PNC_SOLICITADO');
    setIsFinalizeModalOpen(true);
  };

  // Finalize Blitz and release remaining balance
  const handleSaveFinalizeBlitz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPull || !activePalletInspect) return;

    const safeRetained = Math.min(Math.max(0, Number(retainedQty) || 0), activePalletInspect.skuQuantity);
    const released = Math.max(0, activePalletInspect.skuQuantity - safeRetained);
    const loss = Number((safeRetained * activePalletInspect.unitPrice).toFixed(2));
    const recordId = activePalletInspect.existingRecordId || `blitz-${Date.now()}-${activePalletInspect.palletNumber}`;

    const finalStatus = shouldOpenPNC ? 'PNC_SOLICITADO' : 'LIBERADO';
    const finalReason = safeRetained > 0 ? damageReason : 'Conforme / Sem Avaria';

    const finalizedRecord: BlitzPalletRecord = {
      id: recordId,
      pullId: currentPull.header.id,
      nfeNumber: currentPull.header.nfeNumber,
      truckPlate: currentPull.header.truckPlate,
      factoryOrigin: currentPull.header.factoryOrigin,
      palletNumber: activePalletInspect.palletNumber,
      productCode: activePalletInspect.productCode,
      productDescription: activePalletInspect.productDescription,
      unit: activePalletInspect.unit,
      unitPrice: activePalletInspect.unitPrice,
      blockedQty: activePalletInspect.skuQuantity,
      retainedQty: safeRetained,
      releasedQty: released,
      lossValue: loss,
      blockDate: todayStr,
      releaseDate: todayStr,
      status: finalStatus,
      damageType: finalReason,
      conferente: conferenteName,
      notes: notes || (safeRetained > 0 ? `Retrabalhado: ${safeRetained} un retidas por ${finalReason}. Saldo de ${released} un liberado.` : 'Pallet 100% conforme e liberado.')
    };

    const existingIdx = blitzRecords.findIndex(b => b.id === recordId);
    let updated: BlitzPalletRecord[];
    if (existingIdx >= 0) {
      updated = [...blitzRecords];
      updated[existingIdx] = finalizedRecord;
    } else {
      updated = [finalizedRecord, ...blitzRecords];
    }
    onUpdateBlitzRecords(updated);

    // If PNC was requested
    if (shouldOpenPNC) {
      onOpenPNCModal({
        blitzId: recordId,
        pullId: currentPull.header.id,
        nfeNumber: currentPull.header.nfeNumber,
        truckPlate: currentPull.header.truckPlate,
        factoryOrigin: currentPull.header.factoryOrigin,
        productCode: activePalletInspect.productCode,
        productDescription: activePalletInspect.productDescription,
        quantityBlocked: safeRetained > 0 ? safeRetained : activePalletInspect.skuQuantity,
        lossValue: loss > 0 ? loss : Number((activePalletInspect.skuQuantity * activePalletInspect.unitPrice).toFixed(2)),
        validityDate: activePalletInspect.validityDate,
        requestedBy: conferenteName,
        qualityIssueType: finalReason === 'Próximo da validade' ? 'Próximo da Validade' : finalReason === 'Vazamento' ? 'Vazamento em Massa' : 'Outro',
        reason: `Avaria detectada no Pallet Nº ${activePalletInspect.palletNumber}: ${finalReason}. ${notes}`
      });
    }

    setIsFinalizeModalOpen(false);
    setActivePalletInspect(null);
  };

  // Quick release full pallet (no damages)
  const handleQuickReleaseFull = (pallet: typeof currentPullPallets[0]) => {
    if (!currentPull) return;
    const recordId = pallet.existingBlitz?.id || `blitz-${Date.now()}-${pallet.palletNumber}`;

    const record: BlitzPalletRecord = {
      id: recordId,
      pullId: currentPull.header.id,
      nfeNumber: currentPull.header.nfeNumber,
      truckPlate: currentPull.header.truckPlate,
      factoryOrigin: currentPull.header.factoryOrigin,
      palletNumber: pallet.palletNumber,
      productCode: pallet.productCode,
      productDescription: pallet.productDescription,
      unit: pallet.unit,
      unitPrice: pallet.unitPrice,
      blockedQty: pallet.skuQuantity,
      retainedQty: 0,
      releasedQty: pallet.skuQuantity,
      lossValue: 0,
      blockDate: todayStr,
      releaseDate: todayStr,
      status: 'LIBERADO',
      damageType: 'Conforme / Sem Avaria',
      conferente: conferenteName,
      notes: 'Pallet inspecionado na Blitz e liberado 100% sem avarias.'
    };

    const existingIdx = blitzRecords.findIndex(b => b.id === recordId);
    let updated: BlitzPalletRecord[];
    if (existingIdx >= 0) {
      updated = [...blitzRecords];
      updated[existingIdx] = record;
    } else {
      updated = [record, ...blitzRecords];
    }
    onUpdateBlitzRecords(updated);
  };

  // Delete a Blitz Record
  const handleDeleteRecord = (id: string) => {
    if (confirm('Deseja realmente remover este registro de blitz?')) {
      const updated = blitzRecords.filter(b => b.id !== id);
      onUpdateBlitzRecords(updated);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map(b => ({
      'ID Blitz': b.id,
      'Data Bloqueio': formatDateBR(b.blockDate),
      'Nota Fiscal': b.nfeNumber,
      'Placa Carreta': b.truckPlate,
      'Fábrica Origem': b.factoryOrigin,
      'Nº Pallet': b.palletNumber,
      'Código SKU': b.productCode,
      'Descrição': b.productDescription,
      'Qtd Bloqueada (un)': b.blockedQty,
      'Qtd Retida (un)': b.retainedQty,
      'Saldo Liberado (un)': b.releasedQty,
      'Prejuízo (R$)': b.lossValue,
      'Motivo Avaria': b.damageType,
      'Status': b.status,
      'Conferente': b.conferente,
      'Data Liberação': b.releaseDate ? formatDateBR(b.releaseDate) : 'Pendente',
      'Observações': b.notes || ''
    }));

    exportDataToExcel(dataToExport, `Blitz_Puxada_PBRI_${todayStr}`);
  };

  // Filtered Records for the History Table
  const filteredRecords = useMemo(() => {
    return blitzRecords.filter(b => {
      if (selectedMonth !== 'ALL' && !b.blockDate.startsWith(selectedMonth)) return false;
      if (selectedFactory !== 'ALL' && b.factoryOrigin !== selectedFactory) return false;
      if (selectedProduct !== 'ALL' && b.productCode !== selectedProduct) return false;
      if (selectedStatus !== 'ALL' && b.status !== selectedStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = 
          b.nfeNumber.toLowerCase().includes(q) ||
          b.truckPlate.toLowerCase().includes(q) ||
          b.productCode.toLowerCase().includes(q) ||
          b.productDescription.toLowerCase().includes(q) ||
          b.factoryOrigin.toLowerCase().includes(q) ||
          b.conferente.toLowerCase().includes(q) ||
          b.damageType.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [blitzRecords, selectedMonth, selectedFactory, selectedProduct, selectedStatus, searchQuery]);

  // Overall KPIs
  const totalLoss = useMemo(() => blitzRecords.reduce((acc, b) => acc + b.lossValue, 0), [blitzRecords]);
  const totalRetained = useMemo(() => blitzRecords.reduce((acc, b) => acc + b.retainedQty, 0), [blitzRecords]);
  const totalAuditedPallets = useMemo(() => blitzRecords.length, [blitzRecords]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* 1. HEADER SECTION & OPERATIONAL CONFERENTE BADGE */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-400/30">
                  Módulo Operacional de Armazém
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {formatDateBR(todayStr)}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                BLITZ DE PUXADA & RETRABALHO DE PALLETS
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Conferência física 100% por pallet, segregação de avarias e liberação de saldo para estoque.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Export History */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PUXADAS DO DIA / SELETOR DE PUXADA ATIVA */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                1. Selecionar Puxada para Execução da Blitz
              </h3>
              <p className="text-xs text-slate-500">
                Puxadas registradas prontas para conferência e retrabalho de pallets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPullsFilterMode('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pullsFilterMode === 'today'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Puxadas do Dia ({pulls.filter(p => p.header.receiptDate === todayStr || p.header.issueDate === todayStr).length})
            </button>
            <button
              type="button"
              onClick={() => setPullsFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pullsFilterMode === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas as Puxadas ({pulls.length})
            </button>
          </div>
        </div>

        {/* PULLS CAROUSEL / SELECTOR CARDS */}
        {displayedPulls.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 uppercase">Nenhuma Puxada Cadastrada</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cadastre uma nova puxada na aba "Nova Puxada (NRI)" para que seus pallets fiquem disponíveis para blitz.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedPulls.map(pull => {
              const isSelected = pull.header.id === currentPull?.header.id;
              const pullPalletsTotal = pull.items.length;
              const auditedCount = blitzRecords.filter(b => b.pullId === pull.header.id).length;
              const isDone = auditedCount >= pullPalletsTotal && pullPalletsTotal > 0;

              return (
                <div
                  key={pull.header.id}
                  onClick={() => setSelectedPullId(pull.header.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-400/20'
                      : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 font-mono font-black text-xs flex items-center justify-center">
                        NF
                      </span>
                      <div>
                        <span className="text-xs font-black text-slate-900 block leading-tight font-mono">
                          {pull.header.nfeNumber || 'S/N'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">
                          Placa: {pull.header.truckPlate || '---'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 block">
                        {formatDateBR(pull.header.receiptDate)}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        isDone 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : auditedCount > 0 
                            ? 'bg-amber-100 text-amber-900' 
                            : 'bg-slate-200 text-slate-700'
                      }`}>
                        {auditedCount} / {pullPalletsTotal} Plts
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 truncate max-w-[170px]" title={pull.header.factoryOrigin}>
                      🏭 {pull.header.factoryOrigin}
                    </span>
                    <span className="font-mono font-black text-slate-800">
                      {pull.totalSku} SKU
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. LISTA DE PALLETS DA PUXADA SELECIONADA (CONVERSÃO AUTOMÁTICA & INÍCIO DE BLITZ) */}
      {currentPull && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900 font-mono text-xs font-black">
                  NF: {currentPull.header.nfeNumber}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Carreta: {currentPull.header.truckPlate} • Origem: {currentPull.header.factoryOrigin}
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight mt-1">
                2. Conferência de Pallets ({currentPullPallets.length} Pallets na Puxada)
              </h3>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                Concluídos: <strong>{pullStats.completed}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                Em Retrabalho: <strong>{pullStats.inProgress}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                Pendentes: <strong>{pullStats.pending}</strong>
              </span>
            </div>
          </div>

          {/* PALLET ITEMS TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                  <th className="p-3 w-14 text-center">Plt #</th>
                  <th className="p-3 w-20">Cód</th>
                  <th className="p-3">Descrição do Produto</th>
                  <th className="p-3 w-28 text-center">Validade</th>
                  <th className="p-3 w-28 text-center bg-blue-900">Qtd no Pallet</th>
                  <th className="p-3 w-28 text-center bg-red-950">Qtd Retida</th>
                  <th className="p-3 w-28 text-center bg-emerald-900">Saldo Liberado</th>
                  <th className="p-3 w-32 text-center">Status Blitz</th>
                  <th className="p-3 w-48 text-right">Ação do Conferente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentPullPallets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      Nenhum pallet encontrado para esta puxada.
                    </td>
                  </tr>
                ) : (
                  currentPullPallets.map(pallet => {
                    const hasRecord = !!pallet.existingBlitz;
                    const isLiberado = pallet.existingBlitz?.status === 'LIBERADO';
                    const isRetrabalho = pallet.existingBlitz?.status === 'EM_RETRABALHO';
                    const isPNC = pallet.existingBlitz?.status === 'PNC_SOLICITADO';

                    return (
                      <tr 
                        key={`${currentPull.header.id}-plt-${pallet.palletNumber}`}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isLiberado 
                            ? 'bg-emerald-50/30' 
                            : isRetrabalho 
                              ? 'bg-amber-50/40' 
                              : ''
                        }`}
                      >
                        {/* Pallet # */}
                        <td className="p-3 font-mono font-black text-center text-slate-900">
                          <span className="w-7 h-7 rounded-xl bg-slate-200/80 text-slate-800 flex items-center justify-center mx-auto text-xs font-bold">
                            {pallet.palletNumber}
                          </span>
                        </td>

                        {/* Code */}
                        <td className="p-3 font-mono font-bold text-slate-700">
                          {pallet.productCode}
                        </td>

                        {/* Description */}
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block leading-tight">
                            {pallet.productDescription}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            Embalagem: {pallet.unit} • Valor Unit: {formatBRL(pallet.unitPrice)}
                          </span>
                        </td>

                        {/* Validity */}
                        <td className="p-3 text-center font-mono text-slate-700">
                          {formatDateBR(pallet.validityDate)}
                        </td>

                        {/* Qtd SKU no Pallet (Auto Converted) */}
                        <td className="p-3 text-center bg-blue-50/50 font-mono font-black text-blue-900 text-xs">
                          {pallet.skuQuantity} {pallet.unit}
                        </td>

                        {/* Qtd Retida */}
                        <td className="p-3 text-center bg-red-50/50 font-mono font-black text-red-600 text-xs">
                          {pallet.existingBlitz ? pallet.existingBlitz.retainedQty : '0'} {pallet.unit}
                        </td>

                        {/* Saldo Liberado */}
                        <td className="p-3 text-center bg-emerald-50/50 font-mono font-black text-emerald-800 text-xs">
                          {pallet.existingBlitz ? pallet.existingBlitz.releasedQty : pallet.skuQuantity} {pallet.unit}
                        </td>

                        {/* Status Badge */}
                        <td className="p-3 text-center">
                          {isLiberado && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Liberado</span>
                            </span>
                          )}
                          {isRetrabalho && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Em Retrabalho</span>
                            </span>
                          )}
                          {isPNC && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                              <FileWarning className="w-3 h-3 text-rose-600" />
                              <span>PNC / Bloqueio</span>
                            </span>
                          )}
                          {!hasRecord && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                              <span>Pendente</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!hasRecord ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartBlitz(pallet)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all"
                                  title="Iniciar inspeção e retrabalho deste pallet"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Iniciar Blitz</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickReleaseFull(pallet)}
                                  className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-[11px] font-bold transition-all"
                                  title="Liberar pallet 100% conforme sem avaria"
                                >
                                  Liberar OK
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenFinalizeModal(pallet)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-amber-400 rounded-xl text-xs font-bold transition-all shadow-xs"
                                title="Editar ou apontar avarias deste pallet"
                              >
                                <span>Apontar / Editar</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      )}

      {/* 4. MODAL OPERACIONAL DE RETRABALHO E APONTAMENTO DE BLITZ */}
      {isFinalizeModalOpen && activePalletInspect && currentPull && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    Retrabalho & Apontamento de Blitz
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pallet Nº {activePalletInspect.palletNumber} • NF {currentPull.header.nfeNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveFinalizeBlitz} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* PALLET SUMMARY CARD */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Produto</span>
                  <span className="font-black text-slate-900 block truncate">
                    {activePalletInspect.productCode} - {activePalletInspect.productDescription}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Validade</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatDateBR(activePalletInspect.validityDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Qtd Total no Pallet</span>
                  <span className="font-mono font-black text-blue-900 text-sm">
                    {activePalletInspect.skuQuantity} {activePalletInspect.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Valor Unitário</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatBRL(activePalletInspect.unitPrice)}
                  </span>
                </div>
              </div>

              {/* RETENTION QUANTITY & REASON */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-red-600 mb-1">
                    Qtd Retida / Avariada ({activePalletInspect.unit}): *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={activePalletInspect.skuQuantity}
                    value={retainedQty}
                    onChange={(e) => setRetainedQty(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 bg-red-50 border-2 border-red-400 rounded-xl text-base font-mono font-black text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                    required
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Digite 0 se o pallet estiver 100% íntegro.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Motivo da Avaria / Retenção: *
                  </label>
                  <select
                    value={damageReason}
                    onChange={(e) => setDamageReason(e.target.value)}
                    disabled={retainedQty === 0}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    {DAMAGE_REASONS.map(reason => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {retainedQty === 0 ? 'Pallet sem avarias' : 'Selecione o motivo específico'}
                  </span>
                </div>
              </div>

              {/* REAL-TIME RELEASE CALCULATION */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">
                    Saldo a ser Liberado para Estoque:
                  </span>
                  <span className="text-base font-mono font-black text-emerald-900">
                    {Math.max(0, activePalletInspect.skuQuantity - retainedQty)} {activePalletInspect.unit}
                  </span>
                </div>

                {retainedQty > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-red-700 font-bold uppercase block">
                      Prejuízo Estimado ({retainedQty} un):
                    </span>
                    <span className="text-sm font-mono font-black text-red-700">
                      {formatBRL(retainedQty * activePalletInspect.unitPrice)}
                    </span>
                  </div>
                )}
              </div>

              {/* CONFERENTE & NOTES */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Nome do Conferente:
                  </label>
                  <input
                    type="text"
                    value={conferenteName}
                    onChange={(e) => setConferenteName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Observações do Retrabalho:
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: 4 caixas no 2º lastro avariadas. Pallet reembalado e saldo liberado."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* PNC TRIGGER */}
              {retainedQty > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="triggerPncModal"
                    checked={shouldOpenPNC}
                    onChange={(e) => setShouldOpenPNC(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                  />
                  <label htmlFor="triggerPncModal" className="text-xs text-rose-900 leading-tight cursor-pointer">
                    <strong className="block font-black">Problema Crítico de Qualidade / Acionar PNC</strong>
                    Marcar para solicitar bloqueio fiscal e abertura formal de Produto Não Conforme.
                  </label>
                </div>
              )}

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFinalizeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Finalizar Blitz & Salvar no Histórico</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. HISTÓRICO DE BLITZ DE PUXADA (FILTROS & AUDITORIA) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              3. Histórico de Blitz de Puxada ({filteredRecords.length} Registros)
            </h3>
            <p className="text-xs text-slate-500">
              Registros salvos em tempo real no banco de dados Firebase
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-600">
              Perdas: <strong className="text-red-600">{formatBRL(totalLoss)}</strong> ({totalRetained} sku)
            </span>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por NF, Placa, SKU, Conferente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="ALL">Todos os Status</option>
              <option value="LIBERADO">Liberado</option>
              <option value="EM_RETRABALHO">Em Retrabalho</option>
              <option value="PNC_SOLICITADO">PNC / Bloqueio</option>
            </select>
          </div>

          <div>
            <select
              value={selectedFactory}
              onChange={(e) => setSelectedFactory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="ALL">Todas as Fábricas</option>
              {Array.from(new Set(blitzRecords.map(b => b.factoryOrigin))).filter(Boolean).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('ALL');
                setSelectedFactory('ALL');
                setSearchQuery('');
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          </div>
        </div>

        {/* HISTÓRICO TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider">
                <th className="p-3">Data</th>
                <th className="p-3">NF / Placa</th>
                <th className="p-3">Fábrica</th>
                <th className="p-3 text-center">Plt #</th>
                <th className="p-3">Produto</th>
                <th className="p-3 text-center">Qtd Bloq.</th>
                <th className="p-3 text-center">Qtd Retida</th>
                <th className="p-3 text-center">Saldo Lib.</th>
                <th className="p-3">Motivo Avaria</th>
                <th className="p-3">Conferente</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                    Nenhum registro de blitz encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                      {formatDateBR(record.blockDate)}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">
                      <span>NF {record.nfeNumber}</span>
                      <span className="text-[10px] text-slate-400 block">{record.truckPlate}</span>
                    </td>
                    <td className="p-3 text-slate-700 font-medium truncate max-w-[130px]">
                      {record.factoryOrigin}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-900">
                      {record.palletNumber}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block truncate max-w-[200px]" title={record.productDescription}>
                        {record.productCode} - {record.productDescription}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-700">
                      {record.blockedQty}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-red-600">
                      {record.retainedQty > 0 ? `${record.retainedQty} un` : '0'}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-700">
                      {record.releasedQty} un
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        record.retainedQty > 0 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {record.damageType}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">
                      {record.conferente}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        record.status === 'LIBERADO' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : record.status === 'EM_RETRABALHO' 
                            ? 'bg-amber-100 text-amber-900' 
                            : 'bg-rose-100 text-rose-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
