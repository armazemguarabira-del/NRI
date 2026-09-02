import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Layers, Filter, CheckCircle2, Image as ImageIcon, LayoutGrid, ExternalLink } from 'lucide-react';
import { PullRecord, NRIItem, ProductCatalogItem } from '../types';
import { formatDateBR, getAbcBadgeColor, subtractDaysFromDate } from '../utils/nriCalculations';
import { PauBrasilLogo } from './PauBrasilLogo';
import { getStoredBrandSettings, BrandSettings } from '../utils/branding';
import { BrandingModal } from './BrandingModal';
import { INITIAL_PRODUCTS } from '../data/initialCatalog';
import { executePrintJob } from '../utils/printHelper';

interface NRILabelPrintViewProps {
  currentPull?: PullRecord | null;
  pull?: PullRecord | null;
  catalog?: ProductCatalogItem[];
  onBackToForm?: () => void;
  onBack?: () => void;
  onOpenBrandingModal?: () => void;
}

interface PrintablePalletFace {
  item: NRIItem;
  palletNumber: number;
  totalPalletsOfItem: number;
  globalPalletIndex: number;
  totalGlobalPallets: number;
  faceNumber: 1 | 2 | 3 | 4;
  faceLabel: string;
  quantityInPallet: number;
  palletFactor: number;
  lastroFactor: number;
  isFractionalLastro: boolean;
}

const FACE_DESCRIPTIONS: Record<number, string> = {
  1: 'FACE 1/4 (FRONTAL)',
  2: 'FACE 2/4 (TRASEIRA)',
  3: 'FACE 3/4 (LAT. DIREITA)',
  4: 'FACE 4/4 (LAT. ESQUERDA)'
};

export const NRILabelPrintView: React.FC<NRILabelPrintViewProps> = ({
  currentPull: propCurrentPull,
  pull: propPull,
  catalog,
  onBackToForm,
  onBack,
  onOpenBrandingModal
}) => {
  const currentPull = propPull !== undefined ? propPull : propCurrentPull;
  const handleBack = onBack || onBackToForm;

  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [facesPerPallet, setFacesPerPallet] = useState<number>(4); // 4 faces per pallet (Frente, Verso, Dir, Esq) = 1 folha A4 por pallet
  const [printSize, setPrintSize] = useState<'a4_4_per_page' | 'a4_double' | 'a4_single' | 'thermal'>('a4_4_per_page'); // 4 labels per A4 sheet (1x4 vertical)
  const [showLocalBrandingModal, setShowLocalBrandingModal] = useState(false);

  const [brand, setBrand] = useState<BrandSettings>(getStoredBrandSettings);

  useEffect(() => {
    const handleUpdate = () => setBrand(getStoredBrandSettings());
    window.addEventListener('brand_settings_updated', handleUpdate);
    return () => window.removeEventListener('brand_settings_updated', handleUpdate);
  }, []);

  const triggerBrandingModal = onOpenBrandingModal || (() => setShowLocalBrandingModal(true));

  if (!currentPull || currentPull.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white rounded-3xl shadow-sm border border-slate-200 my-8">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Printer className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Nenhuma Puxada Selecionada para Impressão</h2>
        <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto">
          Crie uma nova puxada ou selecione uma no histórico para gerar e imprimir as etiquetas de identificação de pallets NRI (4 etiquetas por folha A4).
        </p>
        {handleBack && (
          <button
            onClick={handleBack}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer"
          >
            Preencher Nova Puxada
          </button>
        )}
      </div>
    );
  }

  // Generate NRI Labels (Strictly 4 NRI labels per physical pallet - 1 pallet = 4 labels / 1 A4 sheet, 2 pallets = 8 labels / 2 A4 sheets)
  const printableList: PrintablePalletFace[] = [];
  let globalPalletCounter = 1;
  const totalPalletsInPull = Math.max(1, Math.round(currentPull.totalPallets || currentPull.items.length));

  currentPull.items.forEach((item, itemIdx) => {
    if (selectedProductFilter !== 'ALL' && item.productCode !== selectedProductFilter) {
      return;
    }

    // Lookup product catalog registration for exact standard Pallet and Lastro factor
    const catalogItem = (catalog && catalog.find(c => String(c.code).trim() === String(item.productCode).trim()))
      || INITIAL_PRODUCTS.find(c => String(c.code).trim() === String(item.productCode).trim());

    // Exact registered factors from catalog, or 0 if missing (will display CADASTRAR)
    const registeredPalletFactor = (catalogItem && catalogItem.palletFactor && catalogItem.palletFactor > 0)
      ? catalogItem.palletFactor
      : 0;

    const registeredLastroFactor = (catalogItem && catalogItem.lastroFactor && catalogItem.lastroFactor > 0)
      ? catalogItem.lastroFactor
      : 0;

    const wholePallets = Math.floor(item.palletCount);
    const fractionalPart = item.palletCount - wholePallets;
    const itemTotalPalletUnits = Math.max(1, Math.ceil(item.palletCount));

    const qtyPerPallet = registeredPalletFactor > 0
      ? registeredPalletFactor
      : (item.quantitySku > 0 && item.palletCount > 0 ? Math.round(item.quantitySku / item.palletCount) : item.quantitySku || 0);

    // If wholePallets is 0 and no fraction (or item.palletCount <= 0), generate 1 pallet (4 labels)
    if (wholePallets <= 0 && fractionalPart <= 0) {
      const explicitPalletNum = item.palletNumber || itemIdx + 1;
      for (let f = 1; f <= facesPerPallet; f++) {
        printableList.push({
          item,
          palletNumber: explicitPalletNum,
          totalPalletsOfItem: 1,
          globalPalletIndex: explicitPalletNum,
          totalGlobalPallets: totalPalletsInPull,
          faceNumber: f as 1 | 2 | 3 | 4,
          faceLabel: FACE_DESCRIPTIONS[f],
          quantityInPallet: item.quantitySku || qtyPerPallet,
          palletFactor: registeredPalletFactor,
          lastroFactor: registeredLastroFactor,
          isFractionalLastro: false
        });
      }
      globalPalletCounter++;
      return;
    }

    // For each complete pallet (1 pallet = 4 NRI labels)
    for (let p = 1; p <= wholePallets; p++) {
      const currentGlobalIdx = item.palletNumber ? item.palletNumber : globalPalletCounter;
      for (let f = 1; f <= facesPerPallet; f++) {
        printableList.push({
          item,
          palletNumber: p,
          totalPalletsOfItem: itemTotalPalletUnits,
          globalPalletIndex: currentGlobalIdx,
          totalGlobalPallets: totalPalletsInPull,
          faceNumber: f as 1 | 2 | 3 | 4,
          faceLabel: FACE_DESCRIPTIONS[f],
          quantityInPallet: qtyPerPallet,
          palletFactor: registeredPalletFactor,
          lastroFactor: registeredLastroFactor,
          isFractionalLastro: false
        });
      }
      globalPalletCounter++;
    }

    // Fractional pallet (Pallet Falho: 1 falho = 4 labels for this pallet)
    if (fractionalPart > 0) {
      const remainingSku = item.quantitySku > 0 && wholePallets > 0
        ? (item.quantitySku - (wholePallets * (qtyPerPallet || 1)))
        : (item.quantitySku || Math.round(qtyPerPallet * fractionalPart));
      const falhoQty = remainingSku > 0 ? remainingSku : Math.round(qtyPerPallet * fractionalPart) || item.quantitySku || qtyPerPallet;
      const currentGlobalIdx = item.palletNumber ? item.palletNumber : globalPalletCounter;

      for (let f = 1; f <= facesPerPallet; f++) {
        printableList.push({
          item,
          palletNumber: wholePallets + 1,
          totalPalletsOfItem: itemTotalPalletUnits,
          globalPalletIndex: currentGlobalIdx,
          totalGlobalPallets: totalPalletsInPull,
          faceNumber: f as 1 | 2 | 3 | 4,
          faceLabel: `${FACE_DESCRIPTIONS[f]} (FALHO / FRAÇÃO)`,
          quantityInPallet: falhoQty,
          palletFactor: registeredPalletFactor,
          lastroFactor: registeredLastroFactor,
          isFractionalLastro: true
        });
      }
      globalPalletCounter++;
    }
  });

  // Chunk items according to layout per sheet
  const itemsPerSheet = printSize === 'a4_4_per_page' ? 4 : printSize === 'a4_double' ? 2 : 1;
  const pagedSheets: PrintablePalletFace[][] = [];
  for (let i = 0; i < printableList.length; i += itemsPerSheet) {
    pagedSheets.push(printableList.slice(i, i + itemsPerSheet));
  }

  const handlePrint = () => {
    try {
      executePrintJob('printable-sheets-container', `Etiquetas_${currentPull.header.truckPlate || 'NRI'}_${currentPull.header.nfeNumber || 'Doc'}`);
    } catch (err) {
      console.warn('Execute print job error, calling direct fallback:', err);
      window.focus();
      window.print();
    }
  };

  // Keyboard shortcut Ctrl+P / Cmd+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPull]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Controls Toolbar */}
      <div className="print:hidden bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          {handleBack && (
            <button
              onClick={handleBack}
              className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Impressão de Etiquetas de Pallets NRI
              </h2>
              <span className="bg-emerald-100 text-emerald-900 font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-emerald-300">
                4 ETIQUETAS POR FOLHA A4 (1x4)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Carreta: <strong className="font-mono text-slate-800">{currentPull.header.truckPlate}</strong> | 
              NF-e: <strong className="font-mono text-slate-800">{currentPull.header.nfeNumber}</strong> | 
              Origem: <strong className="text-slate-800">{currentPull.header.factoryOrigin}</strong> | 
              Total: <strong className="text-amber-700 font-mono font-bold">{printableList.length} etiquetas ({pagedSheets.length} folha(s) A4)</strong>
            </p>
          </div>
        </div>

        {/* Filters and Print buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          <button
            type="button"
            onClick={triggerBrandingModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors border border-slate-200 cursor-pointer"
            title="Alterar Logotipo ou Textos da Etiqueta"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
            <span>Upload Logo / Marca</span>
          </button>

          {/* Product Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-600">Produto:</span>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">Todos ({printableList.length} etiquetas)</option>
              {Array.from(new Set(currentPull.items.map(it => it.productCode))).map(code => {
                const it = currentPull.items.find(i => i.productCode === code);
                return (
                  <option key={code} value={code}>
                    {code} - {it?.description.substring(0, 24)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Print Format */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-600">Formato:</span>
            <select
              value={printSize}
              onChange={(e) => setPrintSize(e.target.value as any)}
              className="bg-emerald-50 border border-emerald-300 font-bold text-emerald-950 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
            >
              <option value="a4_4_per_page">⭐ 4 Etiquetas por Folha A4 (Padrão 1x4 Tiras Verticais)</option>
              <option value="a4_double">2 Etiquetas por Folha A4 (1x2)</option>
              <option value="a4_single">1 Etiqueta por Folha A4 (Grande)</option>
              <option value="thermal">Térmica Individual (100x150mm)</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer ring-2 ring-amber-400"
            title="Abrir tela de impressão"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Imprimir {printableList.length} Etiqueta(s) ({pagedSheets.length} Folha(s))</span>
          </button>
        </div>
      </div>

      {/* Pages Render Container */}
      <div 
        id="printable-sheets-container" 
        className="flex flex-col items-center justify-center gap-6 print:gap-0 print:m-0 print:p-0 w-full"
      >
        {pagedSheets.map((sheet, sheetIdx) => (
          <div
            key={`sheet-${sheetIdx}`}
            className={
              printSize === 'a4_4_per_page'
                ? "a4-print-sheet-4 w-[210mm] max-w-full bg-white p-3 print:p-0 border border-slate-300 print:border-none shadow-md print:shadow-none mb-6 print:mb-0 flex flex-col justify-between"
                : printSize === 'a4_double'
                ? "a4-print-sheet-2 w-[210mm] max-w-full bg-white p-4 print:p-0 border border-slate-300 print:border-none shadow-md print:shadow-none mb-6 print:mb-0 flex flex-col justify-between"
                : "a4-print-sheet-1 w-[210mm] max-w-full bg-white p-6 print:p-0 border border-slate-300 print:border-none shadow-md print:shadow-none mb-6 print:mb-0 flex flex-col justify-between"
            }
            style={{
              fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
              boxSizing: 'border-box'
            }}
          >
            {sheet.map((entry, entryIdx) => (
              <LabelCard
                key={`${entry.item.id}-p${entry.palletNumber}-f${entry.faceNumber}-${sheetIdx}-${entryIdx}`}
                entry={entry}
                currentPull={currentPull}
                brand={brand}
                variant={printSize}
              />
            ))}
          </div>
        ))}
      </div>

      {showLocalBrandingModal && (
        <BrandingModal
          isOpen={showLocalBrandingModal}
          onClose={() => setShowLocalBrandingModal(false)}
        />
      )}

    </div>
  );
};

interface LabelCardProps {
  entry: PrintablePalletFace;
  currentPull: PullRecord;
  brand: BrandSettings;
  variant: 'a4_4_per_page' | 'a4_double' | 'a4_single' | 'thermal';
}

const LabelCard: React.FC<LabelCardProps> = ({ entry, currentPull, brand, variant }) => {
  const {
    item,
    palletNumber,
    totalPalletsOfItem,
    globalPalletIndex,
    totalGlobalPallets,
    faceNumber,
    faceLabel,
    quantityInPallet,
    palletFactor,
    lastroFactor,
    isFractionalLastro
  } = entry;

  const isCompact = variant === 'a4_4_per_page';

  // Quantity to display in QTD TOTAL / PALLET:
  // If full pallet: exact standard palletFactor from catalog (e.g. 286, 150, 160, 84, etc.)
  // If fractional: actual remaining SKU units on that specific pallet
  const displayQuantityTotal = isFractionalLastro 
    ? quantityInPallet 
    : (palletFactor && palletFactor > 0 ? palletFactor : 'CADASTRAR');

  const displayQuantityLastro = (lastroFactor && lastroFactor > 0) 
    ? lastroFactor 
    : 'CADASTRAR';

  return (
    <div
      className={`bg-white text-black border-2 border-black font-sans box-border flex flex-col justify-between overflow-hidden ${
        isCompact 
          ? 'nri-label-card-4 p-1 sm:p-1.5 h-full max-h-[68.5mm] min-h-[66mm] print:h-[68.5mm] print:max-h-[68.5mm] print:min-h-[66mm] rounded-none' 
          : variant === 'a4_double'
          ? 'p-4 h-full min-h-[130mm]'
          : 'p-6 h-full min-h-[265mm]'
      }`}
    >
      {/* 1. TOP HEADER: AMBEV on the Left + PAU BRASIL GUARABIRA & LOGO on the Right */}
      <div className={`flex items-center justify-between border-b-2 border-black ${isCompact ? 'pb-0.5 mb-0.5 min-h-[24px]' : 'pb-2 mb-2 min-h-[46px]'}`}>
        {/* Left: AMBEV */}
        <div className="flex items-center gap-1.5 shrink-0">
          {brand.secondaryLogoUrl ? (
            <img 
              src={brand.secondaryLogoUrl} 
              alt="Ambev" 
              className={isCompact ? "h-5 sm:h-5.5 max-h-6 max-w-[70px] object-contain" : "h-9 max-h-9 max-w-[120px] object-contain"} 
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className={`font-black tracking-tight lowercase font-sans text-[#002B7F] ${isCompact ? 'text-xl sm:text-[22px] leading-none' : 'text-3xl sm:text-4xl leading-none'}`}>
              ambev
            </span>
          )}
        </div>

        {/* Right: PAU BRASIL GUARABIRA + LOGO */}
        <div className="flex items-center gap-1.5 justify-end shrink-0 max-w-[75%]">
          <span className={`font-black uppercase tracking-tight text-[#002B7F] font-sans leading-none truncate ${isCompact ? 'text-[11px] sm:text-xs md:text-[13px]' : 'text-2xl sm:text-3xl'}`}>
            {brand.companyName || 'PAU BRASIL GUARABIRA'}
          </span>
          {brand.primaryLogoUrl ? (
            <img 
              src={brand.primaryLogoUrl} 
              alt="Logo Pau Brasil" 
              className={isCompact ? "h-5 sm:h-5.5 max-h-6 max-w-[70px] object-contain shrink-0" : "h-10 max-h-10 max-w-[120px] object-contain shrink-0"} 
              referrerPolicy="no-referrer"
            />
          ) : (
            <PauBrasilLogo size={isCompact ? "sm" : "md"} showText={false} className="shrink-0 scale-90 sm:scale-100" />
          )}
        </div>
      </div>

      {/* 2. PRODUCT CODE & DESCRIPTION CENTERED */}
      <div className={`text-center font-black uppercase text-black tracking-tight leading-tight px-0.5 truncate ${
        isCompact 
          ? 'text-[13px] sm:text-[14px] md:text-[15px] py-0 my-0' 
          : variant === 'a4_double'
          ? 'text-2xl sm:text-[28px] my-3'
          : 'text-3xl sm:text-4xl my-4'
      }`}>
        <span className="font-mono font-black text-black tracking-normal">{item.productCode}</span> – {item.description}
      </div>

      {/* 3. HERO SECTION: "Carreg até:" + GIANT BLACK BOX + CURVA ABC */}
      <div className={`flex items-stretch justify-between gap-1 ${isCompact ? 'my-0.5' : 'my-2.5'}`}>
        {/* Left: Carreg até: */}
        <div className={`text-right flex flex-col justify-center leading-tight shrink-0 pr-1 ${isCompact ? 'min-w-[46px] sm:min-w-[52px]' : 'min-w-[85px]'}`}>
          <span className={`font-black uppercase text-black leading-none ${isCompact ? 'text-[10px] sm:text-[11px]' : 'text-base sm:text-lg'}`}>Carreg</span>
          <span className={`font-black uppercase text-black leading-none ${isCompact ? 'text-[10px] sm:text-[11px]' : 'text-base sm:text-lg'}`}>até:</span>
        </div>

        {/* Center: Giant Black Box with Load Until Date */}
        <div className={`flex-1 bg-black text-white text-center flex items-center justify-center ${isCompact ? 'py-0.5 px-1.5' : 'py-3.5 px-4'}`}>
          <span className={`font-black font-mono tracking-wider text-white ${isCompact ? 'text-xl sm:text-[24px] md:text-[26px] leading-none' : 'text-5xl sm:text-6xl'}`}>
            {formatDateBR(item.loadUntilDate || item.validityDate)}
          </span>
        </div>

        {/* Right: Curva Box */}
        <div className={`border-2 border-black flex flex-col items-center justify-between shrink-0 text-center overflow-hidden bg-black ${isCompact ? 'min-w-[64px] sm:min-w-[72px]' : 'min-w-[110px]'}`}>
          <div className={`bg-white text-black font-black tracking-wider border-b border-black w-full text-center ${isCompact ? 'text-[9px] sm:text-[10px] py-0.2 leading-none' : 'text-sm py-1'}`}>
            CURVA
          </div>
          <div className={`w-full flex-1 bg-black text-white font-black flex items-center justify-center font-mono ${isCompact ? 'text-xl sm:text-[26px] py-0.2 leading-none' : 'text-5xl py-2'}`}>
            {item.abcClass || 'A'}
          </div>
        </div>
      </div>

      {/* 4. SUB-DATES: Pré-bloq, Recebimento & VALIDADE MAXIMIZADA EM NEGRITO */}
      <div className={`flex items-center justify-between px-1.5 bg-slate-50 border-y-2 border-black font-sans ${isCompact ? 'py-0.5 my-0.5' : 'py-2 my-2'}`}>
        <div className="flex items-center gap-2 sm:gap-3.5">
          <div>
            <span className="font-black text-black uppercase text-[9.5px] sm:text-[10.5px]">Pré-bloq:</span>{' '}
            <span className="font-mono font-black text-black text-[11px] sm:text-xs">
              {formatDateBR(subtractDaysFromDate(item.validityDate, 30))}
            </span>
          </div>
          <div>
            <span className="font-black text-black uppercase text-[9.5px] sm:text-[10.5px]">Receb:</span>{' '}
            <span className="font-mono font-black text-black text-[11px] sm:text-xs">{formatDateBR(currentPull.header.receiptDate)}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1 text-right">
          <span className="font-black uppercase text-black tracking-wider text-[11px] sm:text-xs md:text-sm">Validade:</span>{' '}
          <span className={`font-mono font-black text-black underline decoration-[2.5px] ${isCompact ? 'text-lg sm:text-xl md:text-[22px] leading-none' : 'text-3xl sm:text-4xl'}`}>
            {formatDateBR(item.validityDate)}
          </span>
        </div>
      </div>

      {/* 5. 8-COLUMN METADATA GRID (CONFERENTE, TURNO, HORA, QTD TOTAL, QTD LASTRO, NOTA, ORIGEM, CARRETA) */}
      <div className={`border-2 border-black grid grid-cols-[1.55fr_0.85fr_0.8fr_1fr_1fr_0.95fr_1.45fr_1.05fr] text-center divide-x-2 divide-black bg-white font-sans ${isCompact ? 'text-[7.5px] mt-0.5' : 'text-xs sm:text-sm'}`}>
        <div className="p-0.5 px-1 flex flex-col justify-center overflow-hidden" title={currentPull.header.receiverName || 'GLADSON LISBOA'}>
          <div className={`font-black uppercase text-slate-800 leading-none mb-0.5 ${isCompact ? 'text-[7px] sm:text-[7.5px]' : 'text-[10px]'}`}>CONFERENTE</div>
          <div className={`font-black text-black truncate leading-tight ${isCompact ? 'text-[9px] sm:text-[10px]' : 'text-xs'}`}>{currentPull.header.receiverName || 'GLADSON LISBOA'}</div>
        </div>

        <div className="p-0.5 flex flex-col justify-center overflow-hidden">
          <div className={`font-black uppercase text-slate-800 leading-none mb-0.5 ${isCompact ? 'text-[7px] sm:text-[7.5px]' : 'text-[10px]'}`}>TURNO</div>
          <div className={`font-black text-black leading-tight ${isCompact ? 'text-[9px] sm:text-[10px]' : 'text-xs'}`}>{currentPull.header.shift || 'Manhã'}</div>
        </div>

        <div className="p-0.5 flex flex-col justify-center overflow-hidden">
          <div className={`font-black uppercase text-slate-800 leading-none mb-0.5 ${isCompact ? 'text-[7px] sm:text-[7.5px]' : 'text-[10px]'}`}>HORA</div>
          <div className={`font-black text-black font-mono leading-tight ${isCompact ? 'text-[9.5px] sm:text-[10.5px]' : 'text-xs'}`}>{currentPull.header.receiptTime || '08:32'}</div>
        </div>

        <div className="p-0.5 flex flex-col justify-center bg-slate-50 overflow-hidden">
          <div className={`font-black uppercase text-slate-800 leading-none mb-0.5 ${isCompact ? 'text-[7px] sm:text-[7.5px]' : 'text-[10px]'}`}>QTD TOTAL</div>
          {displayQuantityTotal === 'CADASTRAR' ? (
            <span className={`font-black text-amber-800 bg-amber-100 border border-amber-300 rounded px-0.5 py-0.2 tracking-tighter uppercase leading-none truncate inline-block ${isCompact ? 'text-[6px]' : 'text-[9px]'}`}>
              CADASTRAR
            </span>
          ) : (
            <div className={`font-black text-black font-mono leading-tight ${isCompact ? 'text-[10.5px] sm:text-[11.5px]' : 'text-sm'}`}>{displayQuantityTotal}</div>
          )}
        </div>

        <div className="p-0.5 flex flex-col justify-center bg-slate-50 overflow-hidden">
          <div className={`font-black uppercase text-slate-800 leading-none mb-0.5 ${isCompact ? 'text-[7px] sm:text-[7.5px]' : 'text-[10px]'}`}>QTD LASTRO</div>
          {displayQuantityLastro === 'CADASTRAR' ? (
            <span className={`font-black text-amber-800 bg-amber-100 border border-amber-300 rounded px-0.5 py-0.2 tracking-tighter uppercase leading-none truncate inline-block ${isCompact ? 'text-[6px]' : 'text-[9px]'}`}>
              CADASTRAR
            </span>
          ) : (
            <div className={`font-black text-black font-mono leading-tight ${isCompact ? 'text-[10.5px] sm:text-[11.5px]' : 'text-sm'}`}>{displayQuantityLastro}</div>
          )}
        </div>

        <div className="p-0.5 flex flex-col justify-center overflow-hidden">
          <div className={`font-black uppercase text-slate-800 leading-none mb-0.5 ${isCompact ? 'text-[7px] sm:text-[7.5px]' : 'text-[10px]'}`}>NOTA</div>
          <div className={`font-black text-black font-mono truncate leading-tight ${isCompact ? 'text-[9.5px] sm:text-[10.5px]' : 'text-xs'}`}>{currentPull.header.nfeNumber}</div>
        </div>

        <div className="p-0.5 px-0.5 flex flex-col justify-center overflow-hidden" title={currentPull.header.factoryOrigin || 'F. Itapissuma'}>
          <div className={`font-black uppercase text-slate-800 leading-none mb-0.5 ${isCompact ? 'text-[7px] sm:text-[7.5px]' : 'text-[10px]'}`}>ORIGEM</div>
          <div className={`font-black text-black truncate leading-tight ${isCompact ? 'text-[8.5px] sm:text-[9.5px]' : 'text-xs'}`}>{currentPull.header.factoryOrigin || 'F. Itapissuma'}</div>
        </div>

        <div className="p-0.5 flex flex-col justify-center overflow-hidden">
          <div className={`font-black uppercase text-slate-800 leading-none mb-0.5 ${isCompact ? 'text-[7px] sm:text-[7.5px]' : 'text-[10px]'}`}>CARRETA</div>
          <div className={`font-black text-black font-mono uppercase truncate leading-tight ${isCompact ? 'text-[9.5px] sm:text-[10.5px]' : 'text-xs'}`}>{currentPull.header.truckPlate || 'RLU3F59'}</div>
        </div>
      </div>
    </div>
  );
};
