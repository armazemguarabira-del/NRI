import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Printer, 
  FileText, 
  Save, 
  AlertTriangle, 
  AlertCircle,
  Sparkles,
  Calculator,
  Truck,
  Building,
  Calendar,
  Clock,
  User,
  Search,
  CheckCircle2,
  Package
} from 'lucide-react';
import { ProductCatalogItem, PullRecord, NRIItem, NRIPullHeader, ShiftType, PullStatus, Report030519Item, UserAccount } from '../types';
import { recalculateItem, formatBRL, formatDateBR, getAbcBadgeColor } from '../utils/nriCalculations';
import { ProductSearchCombobox } from './ProductSearchCombobox';
import { PauBrasilLogo } from './PauBrasilLogo';

interface NRICreationFormProps {
  catalog: ProductCatalogItem[];
  reportItems?: Report030519Item[];
  onSavePull: (pull: PullRecord, printAction?: 'labels' | 'sheet' | null) => void;
  onNavigateToCatalog?: () => void;
  onNavigateToAlerts?: () => void;
  onQuickRegisterProduct?: (item: ProductCatalogItem) => void;
  initialPull?: PullRecord | null;
  currentUser?: UserAccount | null;
}

const FACTORY_OPTIONS = [
  'F. Itapissuma',
  'F. Aquiraz',
  'F. Agudos',
  'F. Camaçari',
  'F. Jaguariúna',
  'F. Natal',
  'F. Teresina',
  'F. Brasília',
  'F. Sete Lagoas',
  'Outra Fábrica'
];

export const NRICreationForm: React.FC<NRICreationFormProps> = ({
  catalog,
  reportItems = [],
  onSavePull,
  onNavigateToCatalog,
  onNavigateToAlerts,
  onQuickRegisterProduct,
  initialPull,
  currentUser
}) => {
  // Modal for quick registration from form if product is missing
  const [showQuickRegisterModal, setShowQuickRegisterModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [quickRegDraft, setQuickRegDraft] = useState<ProductCatalogItem>({
    code: '',
    description: '',
    unit: 'cx12',
    category: 'Cerveja',
    price: 35.00,
    hectoliterFactor: 0.04,
    palletFactor: 120,
    lastroFactor: 12,
    abcClass: 'A',
    defaultShelfLifeDays: 180
  });
  // Header State (without Entrada Promax, Pallets PBRI and Chapatex inputs)
  const [header, setHeader] = useState<NRIPullHeader>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (initialPull) return { ...initialPull.header, issueDate: todayStr };
    return {
      id: `pull-${Date.now()}`,
      nfeNumber: '',
      issueDate: todayStr,
      receiptDate: todayStr,
      receiptTime: new Date().toTimeString().substring(0, 5),
      orderNumber: '',
      truckPlate: '',
      factoryOrigin: 'F. Itapissuma',
      shift: 'Manhã' as ShiftType,
      receiverName: currentUser?.fullName || 'Gilson Conferente',
      branchOp: 'PAU BRASIL GUARABIRA',
      status: 'OK' as PullStatus,
      promaxEntry: '',
      pbr1Count: 0,
      pbr2Count: 0,
      chapatexCount: 0,
      notes: '',
      createdAt: new Date().toISOString()
    };
  });

  // Sync logged in user if changed
  React.useEffect(() => {
    if (currentUser?.fullName && !initialPull) {
      setHeader(prev => ({
        ...prev,
        receiverName: currentUser.fullName
      }));
    }
  }, [currentUser, initialPull]);

  // Line items state - starts empty for pristine manual entry
  const [items, setItems] = useState<NRIItem[]>(() => {
    if (initialPull && initialPull.items.length > 0) return initialPull.items;
    return [];
  });

  // Selected quick search for adding new product
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<ProductCatalogItem>(catalog[0]);
  const [quickQtyMode, setQuickQtyMode] = useState<'pallet' | 'lastro' | 'sku'>('pallet');
  const [quickQtyValue, setQuickQtyValue] = useState<number>(1);
  const [quickValidity, setQuickValidity] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });

  // Calculations for overall pull totals
  const totalPallets = Number(items.reduce((acc, it) => acc + (Number(it.palletCount) || 0), 0).toFixed(2));
  const totalSku = items.reduce((acc, it) => acc + (Number(it.quantitySku) || 0), 0);
  const totalHectoliters = Number(items.reduce((acc, it) => acc + (Number(it.totalHectoliter) || 0), 0).toFixed(2));
  const totalValue = Number(items.reduce((acc, it) => acc + (Number(it.totalValue) || 0), 0).toFixed(2));
  const alertItems = items.filter(it => it.daysToExpiry <= 90 || it.status === 'ALERTA' || it.status === 'CRÍTICO');
  const hasValidityAlert = alertItems.length > 0;

  // Handle line item field changes (pallets, lastros, SKU quantity, validity date)
  const handleItemChange = (
    index: number,
    field: 'pallet' | 'lastro' | 'sku' | 'validity',
    value: any
  ) => {
    setItems(prevItems => {
      const updated = [...prevItems];
      const current = { ...updated[index] };
      const catItem = catalog.find(p => p.code === current.productCode);

      if (field === 'pallet') {
        current.palletCount = Number(value);
        updated[index] = recalculateItem(current, catItem, header.receiptDate, 'pallet');
      } else if (field === 'lastro') {
        current.lastroCount = Number(value);
        updated[index] = recalculateItem(current, catItem, header.receiptDate, 'lastro');
      } else if (field === 'sku') {
        current.quantitySku = Number(value);
        updated[index] = recalculateItem(current, catItem, header.receiptDate, 'sku');
      } else if (field === 'validity') {
        current.validityDate = value;
        updated[index] = recalculateItem(current, catItem, header.receiptDate, 'validity');
      }

      return updated;
    });
  };

  // Add Item to line using selected product from Combobox
  // Rule: If pallet count N is specified (e.g. 28 pallets of 9068), export N individual lines, each with 1 pallet (= 4 NRIs each).
  // If lastro mode is chosen (regardless of lastro quantity), generate exactly 1 record in the list (= 4 NRIs total).
  const handleAddItem = (productToUse?: ProductCatalogItem) => {
    const catItem = productToUse || selectedCatalogProduct || catalog[0];
    const itemValidity = quickValidity || '2027-04-15';
    
    if (quickQtyMode === 'pallet') {
      const qtyPallets = Math.max(1, Math.floor(quickQtyValue || 1));
      const newLines: NRIItem[] = [];

      for (let p = 1; p <= qtyPallets; p++) {
        const palletNum = items.length + newLines.length + 1;
        const newItemObj: Partial<NRIItem> = {
          productCode: catItem.code,
          description: catItem.description,
          unit: catItem.unit,
          validityDate: itemValidity,
          palletCount: 1,
          palletNumber: palletNum
        };
        const calculated = recalculateItem(newItemObj, catItem, header.receiptDate, 'pallet');
        calculated.palletNumber = palletNum;
        newLines.push(calculated);
      }

      setItems(prev => [...prev, ...newLines]);
    } else if (quickQtyMode === 'lastro') {
      // Lastro mode: Generates exactly 1 single record in the list (independent of quantity of lastros)
      const lastros = Math.max(1, quickQtyValue || 1);
      const palletNum = items.length + 1;
      const newItemObj: Partial<NRIItem> = {
        productCode: catItem.code,
        description: catItem.description,
        unit: catItem.unit,
        validityDate: itemValidity,
        lastroCount: lastros,
        palletNumber: palletNum
      };
      const calculated = recalculateItem(newItemObj, catItem, header.receiptDate, 'lastro');
      calculated.palletNumber = palletNum;
      setItems(prev => [...prev, calculated]);
    } else {
      // SKU mode: Single record with specified SKU units
      const palletNum = items.length + 1;
      const newItemObj: Partial<NRIItem> = {
        productCode: catItem.code,
        description: catItem.description,
        unit: catItem.unit,
        validityDate: itemValidity,
        quantitySku: quickQtyValue || catItem.palletFactor,
        palletNumber: palletNum
      };
      const calculated = recalculateItem(newItemObj, catItem, header.receiptDate, 'sku');
      calculated.palletNumber = palletNum;
      setItems(prev => [...prev, calculated]);
    }
  };

  // Duplicate line item
  const handleDuplicateItem = (index: number) => {
    const source = items[index];
    const catItem = catalog.find(p => p.code === source.productCode);
    const duplicated = recalculateItem({
      ...source,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      palletNumber: items.length + 1
    }, catItem, header.receiptDate, 'initial');

    setItems(prev => [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)]);
  };

  // Remove line item (Allows deleting any item, including the last remaining item to leave the list pristine/zeroed)
  const handleRemoveItem = (index: number) => {
    setItems(prev => {
      const filtered = prev.filter((_, idx) => idx !== index);
      // Re-index remaining pallet numbers sequentially
      return filtered.map((it, i) => ({
        ...it,
        palletNumber: i + 1
      }));
    });
  };

  // Load standard 27 pallets example
  const handleLoadSample = () => {
    setHeader({
      id: `pull-${Date.now()}`,
      nfeNumber: '1104458',
      issueDate: '2026-07-14',
      receiptDate: '2026-07-15',
      receiptTime: '11:41',
      orderNumber: '31700',
      truckPlate: 'RLU3F59',
      factoryOrigin: 'F. Itapissuma',
      shift: 'Manhã',
      receiverName: 'Gilson',
      branchOp: 'PAU BRASIL GUARABIRA',
      status: 'OK',
      promaxEntry: '',
      pbr1Count: 27,
      pbr2Count: 0,
      chapatexCount: 0,
      notes: 'Carreta padrão 27 pallets recebida e inspecionada.',
      createdAt: new Date().toISOString()
    });

    const pBud = catalog.find(p => p.code === '17808');
    const pBrahma = catalog.find(p => p.code === '13201');
    const pSukita = catalog.find(p => p.code === '18268');
    const pSkol = catalog.find(p => p.code === '13205');
    const pPepsi = catalog.find(p => p.code === '504');
    const pSpaten = catalog.find(p => p.code === '23186');

    const sampleLines: NRIItem[] = [
      recalculateItem({ productCode: '17808', palletCount: 1, validityDate: '2027-03-03' }, pBud, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '17808', palletCount: 1, validityDate: '2027-03-03' }, pBud, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '17808', palletCount: 1, validityDate: '2027-02-21' }, pBud, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '17808', palletCount: 1, validityDate: '2027-03-10' }, pBud, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '17808', palletCount: 1, validityDate: '2027-03-10' }, pBud, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '13201', palletCount: 1, validityDate: '2027-03-08' }, pBrahma, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '18268', palletCount: 1, validityDate: '2026-11-09' }, pSukita, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '13205', palletCount: 1, validityDate: '2027-03-11' }, pSkol, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '504', palletCount: 1, validityDate: '2026-10-31' }, pPepsi, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '504', palletCount: 1, validityDate: '2026-10-31' }, pPepsi, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '504', palletCount: 1, validityDate: '2026-10-31' }, pPepsi, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '504', palletCount: 1, validityDate: '2026-10-31' }, pPepsi, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '504', palletCount: 1, validityDate: '2026-10-31' }, pPepsi, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '504', palletCount: 1, validityDate: '2026-10-31' }, pPepsi, '2026-07-15', 'pallet'),
      recalculateItem({ productCode: '23186', palletCount: 1, validityDate: '2027-04-09' }, pSpaten, '2026-07-15', 'pallet')
    ];

    setItems(sampleLines);
  };

  const handleSave = (printAction?: 'labels' | 'sheet' | null) => {
    setValidationError(null);

    if (!header.nfeNumber?.trim()) {
      setValidationError('Por favor, preencha o número da Nota Fiscal (NF).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!header.truckPlate?.trim()) {
      setValidationError('Por favor, preencha a Placa da Carreta.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // If no items have been added to the pull list yet
    let currentItems = [...items];
    if (currentItems.length === 0) {
      if (selectedCatalogProduct) {
        // Auto-add default row if product selected
        const catItem = selectedCatalogProduct;
        const itemValidity = quickValidity || '2027-04-15';
        const newItemObj: Partial<NRIItem> = {
          productCode: catItem.code,
          description: catItem.description,
          unit: catItem.unit,
          validityDate: itemValidity,
          palletCount: 1,
          palletNumber: 1
        };
        const calculated = recalculateItem(newItemObj, catItem, header.receiptDate, 'pallet');
        calculated.palletNumber = 1;
        currentItems = [calculated];
        setItems(currentItems);
      } else {
        setValidationError('Por favor, adicione pelo menos 1 produto na carga da puxada antes de salvar.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    const completePull: PullRecord = {
      header: {
        ...header,
        pbr1Count: totalPallets || currentItems.length
      },
      items: currentItems,
      totalPallets: totalPallets || currentItems.length,
      totalSku: totalSku || currentItems.reduce((acc, it) => acc + (Number(it.quantitySku) || 0), 0),
      totalHectoliters: totalHectoliters || Number(currentItems.reduce((acc, it) => acc + (Number(it.totalHectoliter) || 0), 0).toFixed(2)),
      totalValue: totalValue || Number(currentItems.reduce((acc, it) => acc + (Number(it.totalValue) || 0), 0).toFixed(2)),
      hasValidityAlert,
      alertCount: alertItems.length,
      averageStockAgeIndex: 90.5
    };

    onSavePull(completePull, printAction);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* VALIDATION WARNING BANNER */}
      {validationError && (
        <div className="p-4 bg-red-50 border-2 border-red-400 rounded-2xl flex items-center justify-between gap-3 text-red-900 animate-in fade-in shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-red-800">Atenção para Prosseguir</h4>
              <p className="text-xs font-bold text-red-900">{validationError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-red-500 hover:text-red-800 font-black p-1 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* TOP TITLE & LOGO WITH PAU BRASIL GUARABIRA */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PauBrasilLogo size="lg" />
          <div className="border-l border-slate-200 pl-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#002B7F] tracking-tight uppercase font-mono">
                PAU BRASIL GUARABIRA
              </h1>
              <span className="text-[11px] bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
                GERAÇÃO NRI
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Entrada de carretas, sincronização automática de pallets/lastros/SKU e emissão das 4 faces NRI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Carregar Exemplo (NF 1104458)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('sheet')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Salvar & Ver Espelho</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('labels')}
            className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Salvar & Imprimir Etiquetas (4 Faces/Plt)</span>
          </button>
        </div>
      </div>

      {/* HEADER SECTION (Spreadsheet Yellow Styled Form - Promax, PBRI and Chapatex REMOVED) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-amber-400 px-5 py-3 border-b border-amber-500 flex items-center justify-between">
          <span className="text-sm font-black text-slate-950 uppercase tracking-wide flex items-center gap-2">
            <Building className="w-4 h-4" />
            <span>1. Informações da Puxada / Cabeçalho da Nota Fiscal</span>
          </span>
          <span className="text-xs font-bold text-amber-950 bg-amber-300 px-2.5 py-0.5 rounded-md">
            Guarabira / PB
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-50/50">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Nota Fiscal (NOTA) *
            </label>
            <input
              type="text"
              value={header.nfeNumber}
              onChange={(e) => setHeader({ ...header, nfeNumber: e.target.value })}
              placeholder="Ex: 1104458"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold uppercase text-slate-700">
                Data de Emissão
              </label>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                Fixada (Hoje)
              </span>
            </div>
            <input
              type="date"
              value={header.issueDate}
              readOnly
              disabled
              title="A data de emissão é fixada automaticamente na data do dia."
              className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed select-none focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-emerald-800 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-600" />
              <span>Data Recebimento *</span>
            </label>
            <input
              type="date"
              value={header.receiptDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setHeader({ ...header, receiptDate: newDate });
                // Recalculate all items with new receipt date
                setItems(prev => prev.map(it => {
                  const catItem = catalog.find(p => p.code === it.productCode);
                  return recalculateItem(it, catItem, newDate, 'validity');
                }));
              }}
              className="w-full bg-emerald-50 border-2 border-emerald-500 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Hora Receb.</span>
            </label>
            <input
              type="time"
              value={header.receiptTime}
              onChange={(e) => setHeader({ ...header, receiptTime: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Pedido
            </label>
            <input
              type="text"
              value={header.orderNumber}
              onChange={(e) => setHeader({ ...header, orderNumber: e.target.value })}
              placeholder="Ex: 31700"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Carreta (Placa) *
            </label>
            <input
              type="text"
              value={header.truckPlate}
              onChange={(e) => setHeader({ ...header, truckPlate: e.target.value.toUpperCase() })}
              placeholder="Ex: RLU3F59"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Fábrica / Origem *
            </label>
            <select
              value={header.factoryOrigin}
              onChange={(e) => setHeader({ ...header, factoryOrigin: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {FACTORY_OPTIONS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-500" />
              <span>Conferente</span>
            </label>
            <input
              type="text"
              value={header.receiverName}
              onChange={(e) => setHeader({ ...header, receiverName: e.target.value })}
              placeholder="Ex: Gilson"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* QUICK PRODUCT ADDER BAR WITH AUTOCOMPLETE SEARCH */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase text-amber-400 flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>Adicionar Produto à Puxada (O Conferente pode digitar código ou descrição para filtrar)</span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {catalog.length} produtos disponíveis na base Ambev
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          {/* Autocomplete Input */}
          <div className="lg:col-span-5">
            <ProductSearchCombobox 
              catalog={catalog}
              selectedProductCode={selectedCatalogProduct?.code || catalog[0]?.code}
              onSelectProduct={(prod) => setSelectedCatalogProduct(prod)}
              onOpenRegisterProduct={(code) => {
                setQuickRegDraft({
                  code: code || '',
                  description: '',
                  unit: 'cx12',
                  category: 'Cerveja',
                  price: 35.00,
                  hectoliterFactor: 0.04,
                  palletFactor: 120,
                  lastroFactor: 12,
                  abcClass: 'A',
                  defaultShelfLifeDays: 180
                });
                setShowQuickRegisterModal(true);
              }}
            />
          </div>

          {/* Mode */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Modo Entrada
            </label>
            <select
              value={quickQtyMode}
              onChange={(e) => setQuickQtyMode(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
            >
              <option value="pallet">Pallets (Plts)</option>
              <option value="lastro">Lastros</option>
              <option value="sku">Unidades / SKU</option>
            </select>
          </div>

          {/* Quantity */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Quantidade
            </label>
            <input
              type="number"
              min={1}
              value={quickQtyValue}
              onChange={(e) => setQuickQtyValue(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-black text-center text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Validity Date */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Data Validade
            </label>
            <input
              type="date"
              value={quickValidity}
              onChange={(e) => setQuickValidity(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Insert Button */}
          <div className="lg:col-span-1">
            <button
              type="button"
              onClick={() => handleAddItem()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95 h-[38px]"
              title="Adicionar à Lista"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Adicionar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ITEMS TABLE - CLEAN VIEW WITHOUT DROPDOWN, ONLY DELETE / QUANTITY EDITS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              2. Itens da Puxada ({items.length} Linhas / {totalPallets} Pallets)
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
            <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200 font-mono">
              Total: {totalPallets} Plts ({Math.round(totalPallets * 4)} Etiquetas NRI)
            </span>
            <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full border border-blue-200 font-mono">
              {totalSku} Unidades / SKU
            </span>
            <span className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-200 font-mono">
              {totalHectoliters} HL
            </span>
          </div>
        </div>

        {/* Real-time Alert Banner if any validity is under 3 months */}
        {hasValidityAlert && (
          <div 
            onClick={onNavigateToAlerts}
            className={`p-3.5 px-5 flex items-center justify-between text-xs font-bold transition-colors ${
              onNavigateToAlerts ? 'cursor-pointer hover:bg-red-100 bg-red-50 border-b border-red-200 text-red-900' : 'bg-red-50 border-b border-red-200 text-red-800'
            }`}
            title={onNavigateToAlerts ? "Clique para ir diretamente para a Guia de Alertas de Validade" : undefined}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
              <span>
                Atenção: <strong>{alertItems.length} item(s)</strong> com validade reduzida (&lt; 3 meses / 90 dias) ou risco crítico de escoamento.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-red-200/90 text-red-900 px-2.5 py-1 rounded-full font-black border border-red-300">
                VER ALERTA DE VALIDADE &rarr;
              </span>
            </div>
          </div>
        )}

        {/* 3-COLUMN TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 w-28">Código</th>
                <th className="p-3 min-w-[240px]">Produto / Descrição</th>
                <th className="p-3 w-20 text-center">Curva</th>
                <th className="p-3 w-28 bg-amber-50/70 border-x border-amber-200 text-amber-950 font-black text-center">
                  1. PALLET (Plts)
                </th>
                <th className="p-3 w-28 bg-blue-50/70 border-r border-blue-200 text-blue-950 font-black text-center">
                  2. LASTRO
                </th>
                <th className="p-3 w-28 bg-emerald-50/70 border-r border-emerald-200 text-emerald-950 font-black text-center">
                  3. SKU (Total)
                </th>
                <th className="p-3 w-32">Validade</th>
                <th className="p-3 w-24 text-center">Dias Venc.</th>
                <th className="p-3 w-24 text-center">Risco</th>
                <th className="p-3 w-24 text-center">Escoam.</th>
                <th className="p-3 w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto text-slate-500">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100/80 flex items-center justify-center text-amber-700 mb-2 border border-amber-200">
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-0.5">
                        Nenhum item na puxada
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Utilize o campo superior <strong>"1. Adicionar Produto à Puxada"</strong> para incluir os pallets ou lastros.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => {
                const catItem = catalog.find(p => p.code === it.productCode);
                const isAlert = it.daysToExpiry <= 90;

                return (
                  <tr 
                    key={it.id} 
                    className={`hover:bg-slate-50 transition-colors ${
                      isAlert ? 'bg-red-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Index */}
                    <td className="p-3 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Product Code (Solid Text Badge, No Dropdown as requested) */}
                    <td className="p-3">
                      <span className="inline-block font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-300 text-xs">
                        {it.productCode}
                      </span>
                    </td>

                    {/* Description (Clean, Fixed, No Dropdown) */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900 leading-tight">
                        {it.description}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Fator Plt: <span className="font-bold text-slate-700">{catItem?.palletFactor || 100}</span> | 
                        Fator Lastro: <span className="font-bold text-slate-700">{catItem?.lastroFactor || 10}</span> | 
                        Hecto: <span className="font-bold text-slate-700">{it.hectoliterFactor}</span>
                      </div>
                    </td>

                    {/* Curva ABC (Strict Green=A, Yellow=B, Red=C) */}
                    <td className="p-3 text-center">
                      <span 
                        className="inline-block px-2.5 py-1 rounded text-xs font-black shadow-xs tracking-wider"
                        style={{
                          backgroundColor: it.abcClass === 'A' ? '#16a34a' : it.abcClass === 'B' ? '#eab308' : '#ef4444',
                          color: it.abcClass === 'B' ? '#000000' : '#ffffff'
                        }}
                      >
                        {it.abcClass}
                      </span>
                    </td>

                    {/* 1. PALLET (Plts) - NÃO EDITÁVEL */}
                    <td className="p-3 bg-amber-50/40 border-x border-amber-200 text-center">
                      <span className="inline-block px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-950 font-mono font-black rounded-lg text-xs shadow-2xs">
                        {it.palletCount} {it.palletCount === 1 ? 'plt' : 'plts'}
                      </span>
                    </td>

                    {/* 2. LASTRO - NÃO EDITÁVEL */}
                    <td className="p-3 bg-blue-50/40 border-r border-blue-200 text-center">
                      <span className="inline-block px-3 py-1.5 bg-blue-100 border border-blue-300 text-blue-950 font-mono font-black rounded-lg text-xs shadow-2xs">
                        {it.lastroCount}
                      </span>
                    </td>

                    {/* 3. SKU (Total) - NÃO EDITÁVEL */}
                    <td className="p-3 bg-emerald-50/40 border-r border-emerald-200 text-center">
                      <span className="inline-block px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-950 font-mono font-black rounded-lg text-xs shadow-2xs">
                        {it.quantitySku} sku
                      </span>
                    </td>

                    {/* Validity Date */}
                    <td className="p-3">
                      <input
                        type="date"
                        value={it.validityDate}
                        onChange={(e) => handleItemChange(idx, 'validity', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800"
                      />
                    </td>

                    {/* Days to Expiry */}
                    <td className="p-3 text-center">
                      <span className={`font-mono font-black text-xs ${
                        isAlert ? 'text-red-600 animate-pulse' : 'text-slate-700'
                      }`}>
                        {it.daysToExpiry} d
                      </span>
                    </td>

                    {/* Base Risk */}
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        it.baseRisk === 'Alto'
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : it.baseRisk === 'Médio'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {it.baseRisk}
                      </span>
                    </td>

                    {/* Escoamento */}
                    <td className="p-3 text-center font-mono font-bold text-slate-600">
                      {it.runoffDays.toFixed(1).replace('.', ',')} d
                    </td>

                    {/* Actions (Allow deletion and duplicate, no inline select) */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(idx)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                          title="Duplicar Pallet"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                          title="Excluir Item da Lista"
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

        {/* TABLE FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => handleAddItem()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-500" />
            <span>Adicionar Mais uma Linha</span>
          </button>

          <div className="flex items-center gap-6 text-xs font-bold text-slate-700">
            <div>
              <span>Volume Hectolitros: </span>
              <span className="font-mono font-black text-slate-900">{totalHectoliters} HL</span>
            </div>
            <div>
              <span>Valor Total da Carga: </span>
              <span className="font-mono font-black text-emerald-700">{formatBRL(totalValue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL SAVE / PRINT ACTION BUTTONS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          * Cada pallet gerará automaticamente <strong>4 etiquetas NRI</strong> (uma para cada face do pallet: Frontal, Traseira, Direita e Esquerda).
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(null)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Somente</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('sheet')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-md"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Salvar & Gerar Espelho NRI</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('labels')}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Salvar & Imprimir Etiquetas (4 Faces/Plt)</span>
          </button>
        </div>
      </div>

      {/* QUICK PRODUCT REGISTRATION MODAL IF ITEM NOT FOUND */}
      {showQuickRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">
                  Cadastrar Novo Produto na Base Ambev
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowQuickRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Preencha os fatores logísticos e a Curva ABC do item para cadastrá-lo permanentemente na base da Pau Brasil Guarabira.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código SKU *</label>
                  <input
                    type="text"
                    value={quickRegDraft.code}
                    onChange={(e) => setQuickRegDraft({ ...quickRegDraft, code: e.target.value })}
                    placeholder="Ex: 34608"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Descrição do Produto *</label>
                  <input
                    type="text"
                    value={quickRegDraft.description}
                    onChange={(e) => setQuickRegDraft({ ...quickRegDraft, description: e.target.value })}
                    placeholder="Ex: SKOL LATA 350ML SH C/12"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidade</label>
                  <input
                    type="text"
                    value={quickRegDraft.unit}
                    onChange={(e) => setQuickRegDraft({ ...quickRegDraft, unit: e.target.value })}
                    placeholder="Ex: cx12, Dz, cx24"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Curva ABC</label>
                  <select
                    value={quickRegDraft.abcClass}
                    onChange={(e) => setQuickRegDraft({ ...quickRegDraft, abcClass: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="A">Curva A (Verde)</option>
                    <option value="B">Curva B (Amarelo)</option>
                    <option value="C">Curva C (Vermelho)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={quickRegDraft.category}
                    onChange={(e) => setQuickRegDraft({ ...quickRegDraft, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold"
                  >
                    <option value="Cerveja">Cerveja</option>
                    <option value="NAB">NAB (Refrig/Suco/Água)</option>
                    <option value="Match">Match / Beats</option>
                    <option value="Destilados">Destilados / Vinhos</option>
                    <option value="Marketplace">Marketplace / Alimentos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                <div>
                  <label className="block font-black text-amber-900 mb-1">Fator Pallet (Plts) *</label>
                  <input
                    type="number"
                    value={quickRegDraft.palletFactor}
                    onChange={(e) => setQuickRegDraft({ ...quickRegDraft, palletFactor: Number(e.target.value) })}
                    placeholder="Ex: 160"
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 font-mono font-black text-amber-950"
                  />
                  <span className="text-[10px] text-amber-700">Qtd de caixas/SKUs por pallet</span>
                </div>

                <div>
                  <label className="block font-black text-blue-900 mb-1">Fator Lastro *</label>
                  <input
                    type="number"
                    value={quickRegDraft.lastroFactor}
                    onChange={(e) => setQuickRegDraft({ ...quickRegDraft, lastroFactor: Number(e.target.value) })}
                    placeholder="Ex: 16"
                    className="w-full bg-white border border-blue-300 rounded-lg p-2 font-mono font-black text-blue-950"
                  />
                  <span className="text-[10px] text-blue-700">Qtd por camada do pallet</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fator HL</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickRegDraft.hectoliterFactor}
                    onChange={(e) => setQuickRegDraft({ ...quickRegDraft, hectoliterFactor: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickRegDraft.price}
                    onChange={(e) => setQuickRegDraft({ ...quickRegDraft, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Validade Padrão</label>
                  <input
                    type="number"
                    value={quickRegDraft.defaultShelfLifeDays || 180}
                    onChange={(e) => setQuickRegDraft({ ...quickRegDraft, defaultShelfLifeDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                    placeholder="180 dias"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQuickRegisterModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!quickRegDraft.code || !quickRegDraft.description) {
                    alert('Preencha pelo menos o Código SKU e a Descrição.');
                    return;
                  }
                  if (onQuickRegisterProduct) {
                    onQuickRegisterProduct(quickRegDraft);
                  }
                  setSelectedCatalogProduct(quickRegDraft);
                  setShowQuickRegisterModal(false);
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md"
              >
                Salvar Cadastro & Usar na Puxada
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
