import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Layers, Filter, CheckCircle2, Image as ImageIcon } from 'lucide-react';
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
  const [printSize, setPrintSize] = useState<'a4_single' | 'thermal' | 'a4_double'>('a4_single'); // Default A4 1 face per sheet
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
          Crie uma nova puxada ou selecione uma no histórico para gerar e imprimir as etiquetas de identificação de pallets NRI (4 faces por pallet, 1 por folha A4).
        </p>
        {handleBack && (
          <button
            onClick={handleBack}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-colors"
          >
            Preencher Nova Puxada
          </button>
        )}
      </div>
    );
  }

  // Generate NRI Labels per Pallet / Lastro fraction
  // For each pallet, generate 4 labels (1 for each face, 1 label per A4 page)
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
              className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
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
              <span className="bg-amber-100 text-amber-900 font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-amber-300">
                4 FACES POR PALLET
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Carreta: <strong className="font-mono text-slate-800">{currentPull.header.truckPlate}</strong> | 
              NF-e: <strong className="font-mono text-slate-800">{currentPull.header.nfeNumber}</strong> | 
              Origem: <strong className="text-slate-800">{currentPull.header.factoryOrigin}</strong> | 
              Total: <strong className="text-amber-700 font-mono font-bold">{printableList.length} etiquetas geradas ({facesPerPallet} faces/pallet)</strong>
            </p>
          </div>
        </div>

        {/* Filters and Print buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          <button
            type="button"
            onClick={triggerBrandingModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors border border-slate-200"
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
              <option value="ALL">Todos os Produtos ({printableList.length} etiquetas)</option>
              {Array.from(new Set(currentPull.items.map(it => it.productCode))).map(code => {
                const it = currentPull.items.find(i => i.productCode === code);
                return (
                  <option key={code} value={code}>
                    {code} - {it?.description.substring(0, 26)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Faces per pallet - Standard 4 Faces */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-600">Faces:</span>
            <span className="bg-amber-100 border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-amber-900">
              4 Faces (Frente, Verso, Dir, Esq)
            </span>
          </div>

          {/* Print Format */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-600">Formato:</span>
            <select
              value={printSize}
              onChange={(e) => setPrintSize(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="thermal">Térmica Individual (100x150mm)</option>
              <option value="a4_single">Folha A4 (1 por página)</option>
              <option value="a4_double">Folha A4 (2 por página)</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Imprimir {printableList.length} Etiqueta(s)</span>
          </button>
        </div>
      </div>

      {/* Label Preview Container */}
      <div className="flex flex-col gap-8 items-center justify-center print:gap-0 print:m-0 print:p-0">
        {printableList.map((entry, idx) => {
          const { item, palletNumber, totalPalletsOfItem, globalPalletIndex, totalGlobalPallets, faceNumber, faceLabel, quantityInPallet, isFractionalLastro } = entry;
          
          return (
            <div
              key={`${item.id}-p${palletNumber}-f${faceNumber}-${idx}`}
              className={`bg-white text-black border-2 border-black font-sans box-border w-[680px] max-w-full p-5 print:p-6 rounded-none shadow-md print:shadow-none print:border-4 print:border-black print:mb-0 print:break-after-page ${
                printSize === 'a4_single' 
                  ? 'print:w-[100vw] print:h-[97vh] print:max-h-[97vh] print:flex print:flex-col print:justify-between' 
                  : printSize === 'a4_double' 
                  ? 'print:h-[48vh] print:mb-4 print:flex print:flex-col print:justify-between' 
                  : 'print:h-[96vh]'
              }`}
              style={{
                pageBreakAfter: 'always',
                fontFamily: "'Plus Jakarta Sans', Arial, sans-serif"
              }}
            >
              {/* TOP HEADER: Logo PAU BRASIL distribuidora ambev on left, COMPANY NAME on right */}
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <PauBrasilLogo size="md" variant="horizontal" />
                </div>
                <div className="text-right">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#002B7F] uppercase font-mono leading-none">
                    {brand.companyName}
                  </h1>
                  <span className="text-[10px] sm:text-xs font-extrabold text-slate-800 tracking-wider uppercase">
                    {brand.subtitle}
                  </span>
                </div>
              </div>

              {/* PRODUCT CODE & DESCRIPTION + CURVA ABC BADGE */}
              <div className="flex items-stretch justify-between gap-3 mb-3">
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-black tracking-tight leading-snug">
                    <span className="font-mono">{item.productCode}</span> - {item.description}
                  </h2>
                  {isFractionalLastro && (
                    <span className="inline-block mt-1 text-[11px] font-black bg-amber-200 text-amber-950 px-2.5 py-0.5 border border-amber-400 w-fit uppercase">
                      PALLET FRACIONADO / LASTRO ({item.lastroCount} Lastros)
                    </span>
                  )}
                </div>

                {/* CURVA ABC BADGE */}
                <div className="border-2 border-black flex flex-col items-center justify-center min-w-[95px] text-center overflow-hidden">
                  <div className="bg-white text-black font-black text-xs tracking-widest px-2 py-0.5 border-b-2 border-black w-full text-center">
                    CURVA
                  </div>
                  <div 
                    className="w-full text-3xl sm:text-4xl font-black py-1.5 flex items-center justify-center font-mono"
                    style={{
                      backgroundColor: item.abcClass === 'A' ? '#16a34a' : item.abcClass === 'B' ? '#eab308' : '#ef4444',
                      color: item.abcClass === 'B' ? '#000000' : '#ffffff'
                    }}
                  >
                    {item.abcClass}
                  </div>
                </div>
              </div>

              {/* MAIN HERO DATE: CARREG ATÉ */}
              <div className="flex items-center gap-3 my-3 sm:my-4">
                <div className="text-right flex flex-col justify-center min-w-[75px]">
                  <span className="text-base sm:text-lg font-black uppercase leading-tight tracking-tight">Carreg</span>
                  <span className="text-base sm:text-lg font-black uppercase leading-tight tracking-tight">até:</span>
                </div>

                <div className="flex-1 bg-black text-white px-4 py-2.5 text-center rounded-xs">
                  <span className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-wider">
                    {formatDateBR(item.loadUntilDate || item.validityDate)}
                  </span>
                </div>
              </div>

              {/* SECONDARY DATE LINE: PRÉ-BLOQ & VALIDADE */}
              <div className="flex items-center justify-between border-y-2 border-black py-2.5 my-3 px-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-base sm:text-lg font-black">Pré-bloq:</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-black">
                    {formatDateBR(item.preBlockDate)}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-base sm:text-lg font-black">Validade:</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-black">
                    {formatDateBR(item.validityDate)}
                  </span>
                </div>
              </div>

              {/* RECEIPT DATE HEADER & FACE IDENTIFIER */}
              <div className="text-left text-xs sm:text-sm font-bold text-slate-900 mb-1 flex items-center justify-between">
                <div>
                  Receb.: <span className="font-mono font-black text-sm sm:text-base">{formatDateBR(currentPull.header.receiptDate)}</span>
                </div>
                <div className="font-mono font-black text-xs sm:text-sm bg-slate-100 px-3 py-0.5 border border-slate-400">
                  {faceLabel}
                </div>
              </div>

              {/* COMPACT FOOTER GRID */}
              <div className="border border-black grid grid-cols-7 text-center divide-x divide-black bg-slate-50 text-[11px] sm:text-xs font-sans">
                <div className="p-1.5">
                  <div className="font-black uppercase text-[9px] text-slate-700 tracking-wider">CONFERENTE</div>
                  <div className="font-bold text-black truncate">{currentPull.header.receiverName || 'Gilson'}</div>
                </div>

                <div className="p-1.5">
                  <div className="font-black uppercase text-[9px] text-slate-700 tracking-wider">TURNO</div>
                  <div className="font-bold text-black">{currentPull.header.shift || 'Manhã'}</div>
                </div>

                <div className="p-1.5">
                  <div className="font-black uppercase text-[9px] text-slate-700 tracking-wider">HORA</div>
                  <div className="font-bold text-black font-mono">{currentPull.header.receiptTime || '11:41'}</div>
                </div>

                <div className="p-1.5 bg-amber-100">
                  <div className="font-black uppercase text-[9px] text-slate-700 tracking-wider">QTDE TT</div>
                  <div className="font-black text-black font-mono text-xs sm:text-sm">{quantityInPallet} sku</div>
                </div>

                <div className="p-1.5">
                  <div className="font-black uppercase text-[9px] text-slate-700 tracking-wider">NOTA</div>
                  <div className="font-bold text-black font-mono">{currentPull.header.nfeNumber}</div>
                </div>

                <div className="p-1.5">
                  <div className="font-black uppercase text-[9px] text-slate-700 tracking-wider">ORIGEM</div>
                  <div className="font-bold text-black truncate">{currentPull.header.factoryOrigin || 'F. Itapissuma'}</div>
                </div>

                <div className="p-1.5">
                  <div className="font-black uppercase text-[9px] text-slate-700 tracking-wider">CARRETA</div>
                  <div className="font-black text-black font-mono uppercase">{currentPull.header.truckPlate || 'RLU3F59'}</div>
                </div>
              </div>

              {/* PALLET IDENTIFIER FOOTER WITH FACE NUMBER */}
              <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-800 font-mono mt-2.5 pt-1.5 border-t-2 border-slate-300">
                <span className="font-black text-slate-950">
                  PALLET {palletNumber} DE {totalPalletsOfItem} (CARGA: PLT #{globalPalletIndex}/{totalGlobalPallets})
                </span>
                <span className="font-black text-amber-800">
                  {faceLabel}
                </span>
                <span className="font-bold text-slate-700">STATUS: {item.status} ({item.daysToExpiry}D)</span>
              </div>
            </div>
          );
        })}
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
