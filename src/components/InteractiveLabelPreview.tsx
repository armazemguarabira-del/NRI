import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Sparkles, 
  Move, 
  Maximize2, 
  Check, 
  HelpCircle,
  Type,
  Image as ImageIcon,
  Square,
  Calendar
} from 'lucide-react';
import { LabelCustomConfig } from '../utils/labelConfig';
import { BrandSettings } from '../utils/branding';
import { PullRecord, NRIItem } from '../types';
import { formatDateBR, subtractDaysFromDate } from '../utils/nriCalculations';
import { PauBrasilLogo } from './PauBrasilLogo';

interface InteractiveLabelPreviewProps {
  labelConfig: LabelCustomConfig;
  brand: BrandSettings;
  entry: {
    item: NRIItem;
    palletNumber: number;
    totalPalletsOfItem: number;
    globalPalletIndex: number;
    totalGlobalPallets: number;
    faceNumber: 1 | 2 | 3 | 4;
    quantityInPallet: number;
    palletFactor: number;
    lastroFactor: number;
    isFractionalLastro: boolean;
  };
  currentPull: PullRecord;
  onUpdateProp: <K extends keyof LabelCustomConfig>(key: K, value: LabelCustomConfig[K]) => void;
  scale?: number;
  showGuides?: boolean;
}

export const InteractiveLabelPreview: React.FC<InteractiveLabelPreviewProps> = ({
  labelConfig,
  brand,
  entry,
  currentPull,
  onUpdateProp,
  scale = 1.3,
  showGuides = true
}) => {
  const { item, quantityInPallet, palletFactor, lastroFactor, isFractionalLastro } = entry;

  const [activeElement, setActiveElement] = useState<'logo' | 'product_title' | 'carreg_ate' | null>(null);
  const [draggingTarget, setDraggingTarget] = useState<'logo' | 'product_title' | 'black_box_date' | 'black_box_height' | null>(null);

  const dragStartRef = useRef<{
    target: 'logo' | 'product_title' | 'black_box_date' | 'black_box_height';
    startX: number;
    startY: number;
    initialValue: number;
  } | null>(null);

  const holdIntervalRef = useRef<any>(null);

  const startHold = (action: () => void) => {
    action();
    holdIntervalRef.current = setInterval(action, 80);
  };

  const stopHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  // Window drag events
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const { target, startX, startY, initialValue } = dragStartRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (target === 'logo') {
        const delta = ((deltaX + deltaY) / 2) * 0.25;
        const val = Math.min(38, Math.max(12, Math.round((initialValue + delta) * 2) / 2));
        onUpdateProp('logoHeightPx', val);
        onUpdateProp('headerAmbevSize', Math.min(30, Math.max(14, Math.round(val * 1.05))));
      } else if (target === 'product_title') {
        const delta = ((deltaX + deltaY) / 2) * 0.2;
        const val = Math.min(26, Math.max(10, Math.round((initialValue + delta) * 2) / 2));
        onUpdateProp('productTitleSize', val);
      } else if (target === 'black_box_date') {
        const delta = ((deltaX + deltaY) / 2) * 0.25;
        const val = Math.min(38, Math.max(16, Math.round((initialValue + delta) * 2) / 2));
        onUpdateProp('carregAteDateSize', val);
      } else if (target === 'black_box_height') {
        const val = Math.min(48, Math.max(18, Math.round((initialValue + deltaY * 0.35) * 2) / 2));
        onUpdateProp('carregAteBoxHeight', val);
      }
    };

    const onMouseUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        setDraggingTarget(null);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragStartRef.current || !e.touches[0]) return;
      const { target, startX, startY, initialValue } = dragStartRef.current;
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;

      if (target === 'logo') {
        const delta = ((deltaX + deltaY) / 2) * 0.25;
        const val = Math.min(38, Math.max(12, Math.round((initialValue + delta) * 2) / 2));
        onUpdateProp('logoHeightPx', val);
        onUpdateProp('headerAmbevSize', Math.min(30, Math.max(14, Math.round(val * 1.05))));
      } else if (target === 'product_title') {
        const delta = ((deltaX + deltaY) / 2) * 0.2;
        const val = Math.min(26, Math.max(10, Math.round((initialValue + delta) * 2) / 2));
        onUpdateProp('productTitleSize', val);
      } else if (target === 'black_box_date') {
        const delta = ((deltaX + deltaY) / 2) * 0.25;
        const val = Math.min(38, Math.max(16, Math.round((initialValue + delta) * 2) / 2));
        onUpdateProp('carregAteDateSize', val);
      } else if (target === 'black_box_height') {
        const val = Math.min(48, Math.max(18, Math.round((initialValue + deltaY * 0.35) * 2) / 2));
        onUpdateProp('carregAteBoxHeight', val);
      }
    };

    const onTouchEnd = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        setDraggingTarget(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onUpdateProp]);

  // Dates formatting
  const carregAteDate = formatDateBR(item.loadUntilDate || item.validityDate);
  const validadeDate = formatDateBR(item.validityDate);
  const preBloqDate = formatDateBR(subtractDaysFromDate(item.validityDate, 30));
  const recebDate = formatDateBR(currentPull.header.receiptDate);

  const receiver = currentPull.header.receiverName || 'Gilson';
  const shift = currentPull.header.shift || 'Manhã';
  const time = currentPull.header.receiptTime || '11:41';
  const nfe = currentPull.header.nfeNumber || '1104458';
  const origin = currentPull.header.factoryOrigin || 'F. Itapissum.';
  const plate = currentPull.header.truckPlate || 'RLU3F59';

  const displayQuantityTotal = isFractionalLastro 
    ? quantityInPallet 
    : (palletFactor && palletFactor > 0 ? palletFactor : (item.quantitySku > 0 ? item.quantitySku : '84'));

  const displayQuantityLastro = (lastroFactor && lastroFactor > 0) 
    ? lastroFactor 
    : (item.lastroCount > 0 ? item.lastroCount : '12');

  const logoHeight = labelConfig.logoHeightPx || 18;
  const carregAteHeight = labelConfig.carregAteBoxHeight || 26;

  return (
    <div className="relative select-none w-full max-w-[210mm] mx-auto">
      
      {/* Interactive Helper Banner */}
      {showGuides && (
        <div className="mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white px-4 py-2.5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
            <span>Ajuste Direto na Etiqueta: Clique, segure e arraste as alças ou use os botões [ + ] / [ - ] diretamente sobre cada elemento!</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono bg-black/20 px-2.5 py-1 rounded-xl">
            <span>Ícone: {logoHeight}px</span>
            <span>|</span>
            <span>Produto: {labelConfig.productTitleSize}px</span>
            <span>|</span>
            <span>Data: {labelConfig.carregAteDateSize}px</span>
            <span>|</span>
            <span>Altura: {carregAteHeight}px</span>
          </div>
        </div>
      )}

      {/* Actual Label Wrapper with border & padding matching print specs */}
      <div 
        style={{
          border: `${labelConfig.outerBorderWidth * scale}px solid ${labelConfig.outerBorderColor}`,
          padding: `${labelConfig.labelPaddingMm * 2 * scale}mm`,
          backgroundColor: '#ffffff',
          boxSizing: 'border-box'
        }}
        className="w-full text-black font-sans flex flex-col justify-between shadow-2xl relative transition-all"
      >

        {/* 1. TOP HEADER: AMBEV + PAU BRASIL GUARABIRA + LOGO (INTERACTIVE ELEMENT 1) */}
        <div 
          onClick={() => setActiveElement('logo')}
          style={{
            borderBottom: `${labelConfig.innerBorderWidth * scale}px solid ${labelConfig.innerBorderColor}`
          }}
          className={`relative group flex items-center justify-between pb-1.5 mb-1.5 rounded-lg transition-all cursor-pointer ${
            activeElement === 'logo' 
              ? 'ring-2 ring-blue-500 bg-blue-50/40 p-1 -m-1' 
              : 'hover:ring-1 hover:ring-blue-300 hover:bg-slate-50/60'
          }`}
        >
          {/* Top floating control badge for Logo */}
          <div className="absolute -top-3.5 left-2 z-20 flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md">
            <ImageIcon className="w-3 h-3" />
            <span>Ícone & Logo: {logoHeight}px</span>
            <div className="flex items-center gap-0.5 ml-1 bg-black/20 px-1 rounded">
              <button
                type="button"
                onMouseDown={() => startHold(() => {
                  onUpdateProp('logoHeightPx', Math.max(12, logoHeight - 1));
                  onUpdateProp('headerAmbevSize', Math.max(14, labelConfig.headerAmbevSize - 1));
                })}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                className="hover:bg-white/30 px-1 rounded cursor-pointer"
                title="Diminuir Ícone"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onMouseDown={() => startHold(() => {
                  onUpdateProp('logoHeightPx', Math.min(38, logoHeight + 1));
                  onUpdateProp('headerAmbevSize', Math.min(30, labelConfig.headerAmbevSize + 1));
                })}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                className="hover:bg-white/30 px-1 rounded cursor-pointer"
                title="Aumentar Ícone"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Left: AMBEV Logo / Text */}
          <div className="flex items-center gap-1 shrink-0 relative">
            {brand.secondaryLogoUrl ? (
              <img 
                src={brand.secondaryLogoUrl} 
                alt="Ambev" 
                style={{
                  height: `${logoHeight * scale}px`,
                  maxHeight: `${logoHeight * 1.6 * scale}px`,
                  maxWidth: `${logoHeight * 4 * scale}px`
                }}
                className="object-contain transition-all" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span 
                style={{ 
                  fontSize: `${labelConfig.headerAmbevSize * scale}px`,
                  color: labelConfig.ambevColor
                }}
                className="font-black tracking-tight lowercase font-sans leading-none"
              >
                {labelConfig.ambevText || 'ambev'}
              </span>
            )}
          </div>

          {/* Right: PAU BRASIL GUARABIRA + LOGO */}
          <div className="flex items-center gap-2 justify-end shrink-0 max-w-[78%]">
            <span 
              style={{ 
                fontSize: `${labelConfig.headerCompanySize * scale}px`,
                color: labelConfig.companyColor
              }}
              className="font-black uppercase tracking-tight font-sans leading-none truncate"
            >
              {labelConfig.companyName || brand.companyName || 'PAU BRASIL GUARABIRA'}
            </span>
            {labelConfig.showLogo && (
              brand.primaryLogoUrl ? (
                <img 
                  src={brand.primaryLogoUrl} 
                  alt="Logo Pau Brasil" 
                  style={{
                    height: `${logoHeight * scale}px`,
                    maxHeight: `${logoHeight * 1.6 * scale}px`,
                    maxWidth: `${logoHeight * 4 * scale}px`
                  }}
                  className="object-contain shrink-0 transition-all" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  style={{ 
                    transform: `scale(${((logoHeight) / 18)})`, 
                    transformOrigin: 'right center' 
                  }}
                  className="shrink-0 inline-flex items-center transition-transform"
                >
                  <PauBrasilLogo size="md" showText={false} className="shrink-0" />
                </div>
              )
            )}
          </div>

          {/* Direct Drag Handle for Logo */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              dragStartRef.current = {
                target: 'logo',
                startX: e.clientX,
                startY: e.clientY,
                initialValue: logoHeight
              };
              setDraggingTarget('logo');
            }}
            onTouchStart={(e) => {
              if (e.touches[0]) {
                dragStartRef.current = {
                  target: 'logo',
                  startX: e.touches[0].clientX,
                  startY: e.touches[0].clientY,
                  initialValue: logoHeight
                };
                setDraggingTarget('logo');
              }
            }}
            className="absolute bottom-0 right-0 translate-x-1.5 translate-y-1.5 z-30 bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center cursor-nwse-resize shadow-lg hover:scale-125 transition-transform"
            title="Clique, segure e arraste para aumentar ou diminuir o ícone"
          >
            <Move className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* 2. PRODUCT CODE & DESCRIPTION (INTERACTIVE ELEMENT 2) */}
        <div 
          onClick={() => setActiveElement('product_title')}
          style={{
            fontSize: `${labelConfig.productTitleSize * scale}px`,
            fontWeight: labelConfig.productTitleBold ? 900 : 700
          }}
          className={`relative group text-center uppercase text-black tracking-tight leading-tight px-1 py-1 my-1 rounded-lg transition-all cursor-pointer ${
            activeElement === 'product_title' 
              ? 'ring-2 ring-purple-600 bg-purple-50/50 -m-0.5' 
              : 'hover:ring-1 hover:ring-purple-300 hover:bg-slate-50/60'
          }`}
        >
          {/* Top floating badge for Product Title */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-purple-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md">
            <Type className="w-3 h-3" />
            <span>Nome do Produto: {labelConfig.productTitleSize}px</span>
            <div className="flex items-center gap-0.5 ml-1 bg-black/20 px-1 rounded">
              <button
                type="button"
                onMouseDown={() => startHold(() => {
                  onUpdateProp('productTitleSize', Math.max(10, labelConfig.productTitleSize - 0.5));
                })}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                className="hover:bg-white/30 px-1 rounded cursor-pointer"
                title="Diminuir Nome do Produto"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onMouseDown={() => startHold(() => {
                  onUpdateProp('productTitleSize', Math.min(26, labelConfig.productTitleSize + 0.5));
                })}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                className="hover:bg-white/30 px-1 rounded cursor-pointer"
                title="Aumentar Nome do Produto"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          <span className="font-mono font-black text-black tracking-normal">{item.productCode}</span> – {item.description}

          {/* Drag handle for Product Title */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              dragStartRef.current = {
                target: 'product_title',
                startX: e.clientX,
                startY: e.clientY,
                initialValue: labelConfig.productTitleSize
              };
              setDraggingTarget('product_title');
            }}
            onTouchStart={(e) => {
              if (e.touches[0]) {
                dragStartRef.current = {
                  target: 'product_title',
                  startX: e.touches[0].clientX,
                  startY: e.touches[0].clientY,
                  initialValue: labelConfig.productTitleSize
                };
                setDraggingTarget('product_title');
              }
            }}
            className="absolute bottom-0 right-1 translate-y-1.5 z-30 bg-purple-600 text-white w-5 h-5 rounded-full flex items-center justify-center cursor-nwse-resize shadow-lg hover:scale-125 transition-transform"
            title="Clique, segure e arraste para aumentar ou diminuir o nome do produto"
          >
            <Move className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* 3. HERO SECTION: "Carreg até:" + GIANT BLACK BOX + CURVA ABC (INTERACTIVE ELEMENT 3) */}
        <div 
          onClick={() => setActiveElement('carreg_ate')}
          className={`relative group flex items-stretch justify-between gap-1.5 my-2 p-1 rounded-xl transition-all cursor-pointer ${
            activeElement === 'carreg_ate' 
              ? 'ring-2 ring-amber-500 bg-amber-50/40 -m-1' 
              : 'hover:ring-1 hover:ring-amber-300'
          }`}
        >
          {/* Top floating control badge for Carregar Até */}
          <div className="absolute -top-4 left-3 z-20 flex items-center gap-2 bg-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md shadow-md">
            <Calendar className="w-3 h-3" />
            <span>Faixa Preta Carregar Até:</span>
            <div className="flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded">
              <span>Data: {labelConfig.carregAteDateSize}px</span>
              <button
                type="button"
                onMouseDown={() => startHold(() => {
                  onUpdateProp('carregAteDateSize', Math.max(16, labelConfig.carregAteDateSize - 1));
                })}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                className="hover:bg-white/30 px-1 rounded cursor-pointer"
                title="Diminuir Data"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onMouseDown={() => startHold(() => {
                  onUpdateProp('carregAteDateSize', Math.min(38, labelConfig.carregAteDateSize + 1));
                })}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                className="hover:bg-white/30 px-1 rounded cursor-pointer"
                title="Aumentar Data"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded">
              <span>Altura: {carregAteHeight}px</span>
              <button
                type="button"
                onMouseDown={() => startHold(() => {
                  onUpdateProp('carregAteBoxHeight', Math.max(18, carregAteHeight - 1));
                })}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                className="hover:bg-white/30 px-1 rounded cursor-pointer"
                title="Diminuir Altura da Barra Preta"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onMouseDown={() => startHold(() => {
                  onUpdateProp('carregAteBoxHeight', Math.min(48, carregAteHeight + 1));
                })}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                className="hover:bg-white/30 px-1 rounded cursor-pointer"
                title="Aumentar Altura da Barra Preta"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Left: Carreg até: */}
          <div 
            className="text-right flex flex-col justify-center leading-tight shrink-0 pr-1.5 min-w-[55px]"
          >
            <span 
              style={{ fontSize: `${labelConfig.carregAteLabelSize * scale}px` }}
              className="font-black uppercase text-black leading-none"
            >
              Carreg
            </span>
            <span 
              style={{ fontSize: `${labelConfig.carregAteLabelSize * scale}px` }}
              className="font-black uppercase text-black leading-none"
            >
              até:
            </span>
          </div>

          {/* Center: Giant Box with Load Until Date */}
          <div 
            style={{
              backgroundColor: labelConfig.carregAteBgColor,
              color: labelConfig.carregAteTextColor,
              border: labelConfig.highlightCarregAteBorder ? '2px solid #16a34a' : 'none',
              minHeight: `${carregAteHeight * scale}px`,
              paddingTop: `${Math.max(2, carregAteHeight * 0.12 * scale)}px`,
              paddingBottom: `${Math.max(2, carregAteHeight * 0.12 * scale)}px`
            }}
            className="flex-1 text-center flex items-center justify-center px-3 relative shadow-inner"
          >
            <span 
              style={{ 
                fontSize: `${labelConfig.carregAteDateSize * scale}px`,
                color: labelConfig.carregAteTextColor
              }}
              className="font-black font-mono tracking-wider leading-none"
            >
              {carregAteDate}
            </span>

            {/* Bottom Drag Handle for Black Box Height */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                dragStartRef.current = {
                  target: 'black_box_height',
                  startX: e.clientX,
                  startY: e.clientY,
                  initialValue: carregAteHeight
                };
                setDraggingTarget('black_box_height');
              }}
              onTouchStart={(e) => {
                if (e.touches[0]) {
                  dragStartRef.current = {
                    target: 'black_box_height',
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    initialValue: carregAteHeight
                  };
                  setDraggingTarget('black_box_height');
                }
              }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 bg-amber-500 hover:bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 cursor-ns-resize shadow-md hover:scale-110 transition-transform"
              title="Clique e arraste para cima/baixo para mudar a altura da faixa preta"
            >
              <span>↕ Altura</span>
            </div>

            {/* Corner Drag Handle for Date Font Size */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                dragStartRef.current = {
                  target: 'black_box_date',
                  startX: e.clientX,
                  startY: e.clientY,
                  initialValue: labelConfig.carregAteDateSize
                };
                setDraggingTarget('black_box_date');
              }}
              onTouchStart={(e) => {
                if (e.touches[0]) {
                  dragStartRef.current = {
                    target: 'black_box_date',
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    initialValue: labelConfig.carregAteDateSize
                  };
                  setDraggingTarget('black_box_date');
                }
              }}
              className="absolute bottom-0 right-0 translate-x-1.5 translate-y-1.5 z-30 bg-amber-500 text-slate-950 w-5 h-5 rounded-full flex items-center justify-center cursor-nwse-resize shadow-lg hover:scale-125 transition-transform"
              title="Clique, segure e arraste para aumentar a data de giro"
            >
              <Move className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Right: Curva Box */}
          {labelConfig.showCurva && (
            <div 
              style={{
                border: `${labelConfig.innerBorderWidth * scale}px solid ${labelConfig.innerBorderColor}`
              }}
              className="flex flex-col items-center justify-between shrink-0 text-center overflow-hidden bg-black min-w-[70px]"
            >
              <div 
                style={{
                  fontSize: `${labelConfig.curvaLabelSize * scale}px`,
                  borderBottom: `${labelConfig.innerBorderWidth * scale}px solid ${labelConfig.innerBorderColor}`
                }}
                className="bg-white text-black font-black tracking-wider w-full text-center py-0.5 leading-none"
              >
                CURVA
              </div>
              <div 
                style={{
                  fontSize: `${labelConfig.curvaLetterSize * scale}px`
                }}
                className="w-full flex-1 bg-black text-white font-black flex items-center justify-center font-mono py-0.5 leading-none"
              >
                {item.abcClass || 'B'}
              </div>
            </div>
          )}
        </div>

        {/* 4. SUB-DATES: Pré-bloq, Recebimento & VALIDADE */}
        <div 
          style={{
            borderTop: `${labelConfig.innerBorderWidth * scale}px solid ${labelConfig.innerBorderColor}`,
            borderBottom: `${labelConfig.innerBorderWidth * scale}px solid ${labelConfig.innerBorderColor}`
          }}
          className="flex items-center justify-between px-1.5 py-1 my-1 bg-slate-50"
        >
          <div className="flex items-center gap-3">
            {labelConfig.showPreBloq && (
              <div>
                <span 
                  style={{ fontSize: `${labelConfig.preBloqTextSize * scale}px` }}
                  className="font-black text-black uppercase"
                >
                  Pré-bloq:
                </span>{' '}
                <span 
                  style={{ fontSize: `${labelConfig.preBloqDateSize * scale}px` }}
                  className="font-black font-mono text-black"
                >
                  {preBloqDate}
                </span>
              </div>
            )}

            {labelConfig.showReceb && (
              <div>
                <span 
                  style={{ fontSize: `${labelConfig.recebTextSize * scale}px` }}
                  className="font-black text-black uppercase"
                >
                  Receb.:
                </span>{' '}
                <span 
                  style={{ fontSize: `${labelConfig.recebDateSize * scale}px` }}
                  className="font-black font-mono text-black"
                >
                  {recebDate}
                </span>
              </div>
            )}
          </div>

          {/* Validade */}
          {labelConfig.showValidity && (
            <div className="text-right">
              <span 
                style={{ fontSize: `${labelConfig.validityLabelSize * scale}px` }}
                className="font-black uppercase text-black"
              >
                VALIDADE:
              </span>{' '}
              <span 
                style={{ 
                  fontSize: `${labelConfig.validityDateSize * scale}px`,
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px'
                }}
                className="font-black font-mono tracking-wide text-black"
              >
                {validadeDate}
              </span>
            </div>
          )}
        </div>

        {/* 5. LOGISTICS DATA GRID (7 COLS EXCEL EXACT) */}
        <div 
          style={{
            border: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
          }}
          className="w-full text-center overflow-hidden my-0.5"
        >
          {/* Header Row */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: labelConfig.tableMode === 'full_8_cols' ? 'repeat(8, minmax(0, 1fr))' : 'repeat(7, minmax(0, 1fr))',
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
          >
            <div style={{ fontSize: `${labelConfig.tableHeaderSize * scale}px` }} className="p-0.5 font-black uppercase truncate border-r border-black">
              CONFERENTE
            </div>
            <div style={{ fontSize: `${labelConfig.tableHeaderSize * scale}px` }} className="p-0.5 font-black uppercase truncate border-r border-black">
              TURNO
            </div>
            <div style={{ fontSize: `${labelConfig.tableHeaderSize * scale}px` }} className="p-0.5 font-black uppercase truncate border-r border-black">
              HORA
            </div>
            <div style={{ fontSize: `${labelConfig.tableHeaderSize * scale}px` }} className="p-0.5 font-black uppercase truncate border-r border-black">
              {labelConfig.tableMode === 'full_8_cols' ? 'QTD TOTAL' : 'QTDE TT'}
            </div>
            {labelConfig.tableMode === 'full_8_cols' && (
              <div style={{ fontSize: `${labelConfig.tableHeaderSize * scale}px` }} className="p-0.5 font-black uppercase truncate border-r border-black">
                QTD LASTRO
              </div>
            )}
            <div style={{ fontSize: `${labelConfig.tableHeaderSize * scale}px` }} className="p-0.5 font-black uppercase truncate border-r border-black">
              NOTA
            </div>
            <div style={{ fontSize: `${labelConfig.tableHeaderSize * scale}px` }} className="p-0.5 font-black uppercase truncate border-r border-black">
              ORIGEM
            </div>
            <div style={{ fontSize: `${labelConfig.tableHeaderSize * scale}px` }} className="p-0.5 font-black uppercase truncate">
              CARRETA
            </div>
          </div>

          {/* Data Row */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: labelConfig.tableMode === 'full_8_cols' ? 'repeat(8, minmax(0, 1fr))' : 'repeat(7, minmax(0, 1fr))',
              color: labelConfig.tableDataTextColor
            }}
          >
            <div style={{ fontSize: `${labelConfig.tableDataSize * scale}px` }} className="p-0.5 font-bold uppercase truncate border-r border-black">
              {receiver}
            </div>
            <div style={{ fontSize: `${labelConfig.tableDataSize * scale}px` }} className="p-0.5 font-bold uppercase truncate border-r border-black">
              {shift}
            </div>
            <div style={{ fontSize: `${labelConfig.tableDataSize * scale}px` }} className="p-0.5 font-mono font-bold truncate border-r border-black">
              {time}
            </div>
            <div style={{ fontSize: `${labelConfig.tableDataSize * scale}px` }} className="p-0.5 font-mono font-black truncate border-r border-black">
              {displayQuantityTotal}
            </div>
            {labelConfig.tableMode === 'full_8_cols' && (
              <div style={{ fontSize: `${labelConfig.tableDataSize * scale}px` }} className="p-0.5 font-mono font-black truncate border-r border-black">
                {displayQuantityLastro}
              </div>
            )}
            <div style={{ fontSize: `${labelConfig.tableDataSize * scale}px` }} className="p-0.5 font-mono font-bold truncate border-r border-black">
              {nfe}
            </div>
            <div style={{ fontSize: `${labelConfig.tableDataSize * scale}px` }} className="p-0.5 font-bold truncate border-r border-black">
              {origin}
            </div>
            <div style={{ fontSize: `${labelConfig.tableDataSize * scale}px` }} className="p-0.5 font-mono font-bold uppercase truncate">
              {plate}
            </div>
          </div>
        </div>

      </div>

      {/* Floating Dragging Live State Badge */}
      {draggingTarget && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-2xl border-2 border-amber-400 font-bold text-xs flex items-center gap-2 animate-bounce">
          <Move className="w-4 h-4 text-amber-400" />
          <span>Redimensionando diretamente... Solte o clique quando estiver no tamanho desejado!</span>
        </div>
      )}

    </div>
  );
};
