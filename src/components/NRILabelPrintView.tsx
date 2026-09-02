import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Layers, Filter, CheckCircle2, Image as ImageIcon, LayoutGrid } from 'lucide-react';
import { PullRecord, NRIItem } from '../types';
import { formatDateBR, getAbcBadgeColor } from '../utils/nriCalculations';
import { PauBrasilLogo } from './PauBrasilLogo';
import { getStoredBrandSettings, BrandSettings } from '../utils/branding';
import { BrandingModal } from './BrandingModal';

interface NRILabelPrintViewProps {
  currentPull?: PullRecord | null;
  pull?: PullRecord | null;
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
  onBackToForm,
  onBack,
  onOpenBrandingModal
}) => {
  const currentPull = propPull !== undefined ? propPull : propCurrentPull;
  const handleBack = onBack || onBackToForm;

  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [facesPerPallet, setFacesPerPallet] = useState<number>(4); // Default 4 faces per pallet (Frente, Verso, Dir, Esq)
  const [printSize, setPrintSize] = useState<'a4_4_per_page' | 'a4_double' | 'a4_single' | 'thermal'>('a4_4_per_page'); // Default: 4 labels per A4 sheet (2x2 grid)
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

  // Generate NRI Labels per Pallet / Lastro fraction
  // For each pallet, generate 4 labels (1 for each face, 4 per A4 sheet)
  const printableList: PrintablePalletFace[] = [];
  let globalPalletCounter = 1;
  const totalPalletsInPull = Math.max(1, Math.round(currentPull.totalPallets || currentPull.items.length));

  currentPull.items.forEach((item, itemIdx) => {
    if (selectedProductFilter !== 'ALL' && item.productCode !== selectedProductFilter) {
      return;
    }

    const wholePallets = Math.floor(item.palletCount);
    const fractionalPart = item.palletCount - wholePallets;
    const itemTotalPalletUnits = Math.max(1, Math.ceil(item.palletCount));

    const qtyPerPallet = item.quantitySku > 0 && item.palletCount > 0 
      ? Math.round(item.quantitySku / item.palletCount) 
      : item.quantitySku || 100;

    // If wholePallets is 0 and fractionalPart is 0 (or item.palletCount <= 0), treat as 1 pallet
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
          quantityInPallet: item.quantitySku,
          isFractionalLastro: false
        });
      }
      globalPalletCounter++;
      return;
    }

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
          isFractionalLastro: false
        });
      }
      globalPalletCounter++;
    }

    // Fractional pallet (Lastro fraction)
    if (fractionalPart > 0) {
      const remainingSku = item.quantitySku - (wholePallets * qtyPerPallet);
      const currentGlobalIdx = item.palletNumber ? item.palletNumber : globalPalletCounter;
      for (let f = 1; f <= facesPerPallet; f++) {
        printableList.push({
          item,
          palletNumber: wholePallets + 1,
          totalPalletsOfItem: itemTotalPalletUnits,
          globalPalletIndex: currentGlobalIdx,
          totalGlobalPallets: totalPalletsInPull,
          faceNumber: f as 1 | 2 | 3 | 4,
          faceLabel: `${FACE_DESCRIPTIONS[f]} (FRAÇÃO / LASTRO)`,
          quantityInPallet: remainingSku > 0 ? remainingSku : Math.round(item.quantitySku * fractionalPart),
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
    window.print();
  };

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
                4 ETIQUETAS POR FOLHA A4
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
              <option value="a4_4_per_page">⭐ 4 Etiquetas por Folha A4 (Padrão 2x2 - 4 Faces)</option>
              <option value="a4_double">2 Etiquetas por Folha A4 (1x2)</option>
              <option value="a4_single">1 Etiqueta por Folha A4 (Grande)</option>
              <option value="thermal">Térmica Individual (100x150mm)</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Imprimir {printableList.length} Etiqueta(s) ({pagedSheets.length} Folha(s))</span>
          </button>
        </div>
      </div>

      {/* Pages Render Container */}
      <div className="flex flex-col items-center justify-center gap-8 print:gap-0 print:m-0 print:p-0">
        {pagedSheets.map((sheet, sheetIdx) => (
          <div
            key={`sheet-${sheetIdx}`}
            className={
              printSize === 'a4_4_per_page'
                ? "a4-print-sheet-4 w-[210mm] max-w-full bg-white p-3 print:p-0 border border-slate-300 print:border-none shadow-md print:shadow-none mb-6 print:mb-0 grid grid-cols-2 grid-rows-2 gap-3"
                : printSize === 'a4_double'
                ? "a4-print-sheet-2 w-[210mm] max-w-full bg-white p-4 print:p-0 border border-slate-300 print:border-none shadow-md print:shadow-none mb-6 print:mb-0 grid grid-cols-1 grid-rows-2 gap-4"
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
    isFractionalLastro
  } = entry;

  const isCompact = variant === 'a4_4_per_page';

  return (
    <div
      className={`bg-white text-black border-2 border-black font-sans box-border flex flex-col justify-between overflow-hidden ${
        isCompact 
          ? 'p-2.5 h-full rounded-none min-h-[132mm] max-h-[138mm]' 
          : variant === 'a4_double'
          ? 'p-4 h-full min-h-[135mm]'
          : 'p-6 h-full min-h-[265mm]'
      }`}
    >
      {/* 1. TOP HEADER: Logo Pau Brasil Guarabira / Ambev + Company Title */}
      <div className={`flex items-center justify-between border-b-2 border-black ${isCompact ? 'pb-1.5 mb-1.5' : 'pb-2 mb-3'}`}>
        <div className="flex items-center gap-1.5">
          <PauBrasilLogo size={isCompact ? "sm" : "md"} variant="horizontal" customLogoUrl={brand.primaryLogoUrl} />
        </div>
        <div className="text-right">
          <h1 className={`font-black uppercase tracking-tight text-[#002B7F] font-mono leading-none ${isCompact ? 'text-xs sm:text-sm' : 'text-xl sm:text-2xl'}`}>
            {brand.companyName}
          </h1>
          <span className={`font-extrabold text-slate-800 tracking-wider uppercase block ${isCompact ? 'text-[7.5px] sm:text-[8px] mt-0.5' : 'text-[10px] sm:text-xs'}`}>
            {brand.subtitle}
          </span>
        </div>
      </div>

      {/* 2. PRODUCT CODE & DESCRIPTION + CURVA ABC */}
      <div className={`flex items-stretch justify-between gap-2 ${isCompact ? 'mb-1.5' : 'mb-3'}`}>
        <div className="flex-1 flex flex-col justify-center">
          <h2 className={`font-black uppercase text-black tracking-tight leading-snug line-clamp-2 ${isCompact ? 'text-xs sm:text-sm' : 'text-xl sm:text-2xl'}`}>
            <span className="font-mono">{item.productCode}</span> – {item.description}
          </h2>
          {isFractionalLastro && (
            <span className="inline-block mt-0.5 text-[8.5px] font-black bg-amber-200 text-amber-950 px-1.5 py-0.2 border border-amber-400 w-fit uppercase">
              PALLET FRACIONADO / LASTRO ({item.lastroCount} Lastros)
            </span>
          )}
        </div>

        {/* CURVA ABC BADGE */}
        <div className={`border-2 border-black flex flex-col items-center justify-center shrink-0 text-center overflow-hidden ${isCompact ? 'min-w-[48px]' : 'min-w-[85px]'}`}>
          <div className={`bg-white text-black font-black tracking-widest border-b-2 border-black w-full text-center ${isCompact ? 'text-[7.5px] py-0.2' : 'text-xs py-0.5'}`}>
            CURVA
          </div>
          <div 
            className={`w-full font-black flex items-center justify-center font-mono ${isCompact ? 'text-lg sm:text-xl py-0.5' : 'text-3xl sm:text-4xl py-1.5'}`}
            style={{
              backgroundColor: item.abcClass === 'A' ? '#16a34a' : item.abcClass === 'B' ? '#eab308' : '#ef4444',
              color: item.abcClass === 'B' ? '#000000' : '#ffffff'
            }}
          >
            {item.abcClass}
          </div>
        </div>
      </div>

      {/* 3. HERO DATE BANNER: CARREG ATÉ */}
      <div className={`flex items-center gap-2 ${isCompact ? 'my-1' : 'my-3 sm:my-4'}`}>
        <div className={`text-right flex flex-col justify-center ${isCompact ? 'min-w-[55px]' : 'min-w-[75px]'}`}>
          <span className={`font-black uppercase leading-tight tracking-tight ${isCompact ? 'text-[10px] sm:text-xs' : 'text-base sm:text-lg'}`}>CARREG</span>
          <span className={`font-black uppercase leading-tight tracking-tight ${isCompact ? 'text-[10px] sm:text-xs' : 'text-base sm:text-lg'}`}>ATÉ:</span>
        </div>

        <div className={`flex-1 bg-black text-white text-center rounded-xs ${isCompact ? 'px-2 py-1' : 'px-4 py-2.5'}`}>
          <span className={`font-black font-mono tracking-wider ${isCompact ? 'text-xl sm:text-2xl md:text-3xl' : 'text-4xl sm:text-5xl md:text-6xl'}`}>
            {formatDateBR(item.loadUntilDate || item.validityDate)}
          </span>
        </div>
      </div>

      {/* 4. SECONDARY DATES: PRÉ-BLOQUEIO & VALIDADE */}
      <div className={`flex items-center justify-between border-y-2 border-black px-1 ${isCompact ? 'py-1 my-1' : 'py-2.5 my-3'}`}>
        <div className="flex items-baseline gap-1.5">
          <span className={`font-black ${isCompact ? 'text-[10px] sm:text-xs' : 'text-base sm:text-lg'}`}>Pré-bloq:</span>
          <span className={`font-black font-mono text-black ${isCompact ? 'text-xs sm:text-sm' : 'text-xl sm:text-2xl'}`}>
            {formatDateBR(item.preBlockDate)}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className={`font-black ${isCompact ? 'text-[10px] sm:text-xs' : 'text-base sm:text-lg'}`}>Validade:</span>
          <span className={`font-black font-mono text-black ${isCompact ? 'text-xs sm:text-sm' : 'text-xl sm:text-2xl'}`}>
            {formatDateBR(item.validityDate)}
          </span>
        </div>
      </div>

      {/* 5. RECEIPT DATE & FACE BADGE */}
      <div className={`text-left font-bold text-slate-900 flex items-center justify-between ${isCompact ? 'text-[9.5px] sm:text-[10px] my-1' : 'text-xs sm:text-sm mb-1'}`}>
        <div>
          Receb.: <span className={`font-mono font-black ${isCompact ? 'text-[10px] sm:text-xs' : 'text-sm sm:text-base'}`}>{formatDateBR(currentPull.header.receiptDate)}</span>
        </div>
        <div className={`font-mono font-black bg-slate-100 border border-slate-400 ${isCompact ? 'text-[8.5px] sm:text-[9.5px] px-1.5 py-0.2' : 'text-xs sm:text-sm px-3 py-0.5'}`}>
          {faceLabel}
        </div>
      </div>

      {/* 6. COMPACT 7-COLUMN FOOTER TABLE */}
      <div className={`border border-black grid grid-cols-7 text-center divide-x divide-black bg-slate-50 font-sans ${isCompact ? 'text-[8px] sm:text-[8.5px]' : 'text-[11px] sm:text-xs'}`}>
        <div className={isCompact ? "p-0.5" : "p-1.5"}>
          <div className={`font-black uppercase text-slate-700 tracking-wider ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>CONFERENTE</div>
          <div className="font-bold text-black truncate">{currentPull.header.receiverName || 'Gilson'}</div>
        </div>

        <div className={isCompact ? "p-0.5" : "p-1.5"}>
          <div className={`font-black uppercase text-slate-700 tracking-wider ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>TURNO</div>
          <div className="font-bold text-black">{currentPull.header.shift || 'Manhã'}</div>
        </div>

        <div className={isCompact ? "p-0.5" : "p-1.5"}>
          <div className={`font-black uppercase text-slate-700 tracking-wider ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>HORA</div>
          <div className="font-bold text-black font-mono">{currentPull.header.receiptTime || '11:41'}</div>
        </div>

        <div className={`${isCompact ? "p-0.5" : "p-1.5"} bg-amber-100`}>
          <div className={`font-black uppercase text-slate-700 tracking-wider ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>QTDE TT</div>
          <div className={`font-black text-black font-mono ${isCompact ? 'text-[8.5px] sm:text-[9px]' : 'text-xs sm:text-sm'}`}>{quantityInPallet} sku</div>
        </div>

        <div className={isCompact ? "p-0.5" : "p-1.5"}>
          <div className={`font-black uppercase text-slate-700 tracking-wider ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>NOTA</div>
          <div className="font-bold text-black font-mono truncate">{currentPull.header.nfeNumber}</div>
        </div>

        <div className={isCompact ? "p-0.5" : "p-1.5"}>
          <div className={`font-black uppercase text-slate-700 tracking-wider ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>ORIGEM</div>
          <div className="font-bold text-black truncate">{currentPull.header.factoryOrigin || 'F. Itapissuma'}</div>
        </div>

        <div className={isCompact ? "p-0.5" : "p-1.5"}>
          <div className={`font-black uppercase text-slate-700 tracking-wider ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>CARRETA</div>
          <div className="font-black text-black font-mono uppercase truncate">{currentPull.header.truckPlate || 'RLU3F59'}</div>
        </div>
      </div>

      {/* 7. PALLET IDENTIFIER FOOTER */}
      <div className={`flex justify-between items-center text-slate-800 font-mono border-t-2 border-slate-300 ${isCompact ? 'text-[8px] sm:text-[8.5px] mt-1.5 pt-1' : 'text-[11px] sm:text-xs mt-2.5 pt-1.5'}`}>
        <span className="font-black text-slate-950 truncate">
          PALLET {palletNumber} DE {totalPalletsOfItem} (CARGA: #{globalPalletIndex}/{totalGlobalPallets})
        </span>
        <span className="font-black text-amber-800 shrink-0">
          {faceLabel}
        </span>
        <span className="font-bold text-slate-700 truncate">
          {item.status} ({item.daysToExpiry}D)
        </span>
      </div>
    </div>
  );
};
