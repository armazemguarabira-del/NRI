import React from 'react';
import { PullRecord, NRIItem } from '../types';
import { formatDateBR, subtractDaysFromDate } from '../utils/nriCalculations';
import { PauBrasilLogo } from './PauBrasilLogo';
import { BrandSettings } from '../utils/branding';
import { LabelCustomConfig } from '../utils/labelConfig';

export interface LabelFaceEntry {
  item: NRIItem;
  palletNumber: number;
  totalPalletsOfItem: number;
  globalPalletIndex: number;
  totalGlobalPallets: number;
  faceNumber: 1 | 2 | 3 | 4;
  faceLabel?: string;
  quantityInPallet: number;
  palletFactor: number;
  lastroFactor: number;
  isFractionalLastro: boolean;
}

interface NRILabelCardProps {
  entry: LabelFaceEntry;
  currentPull: PullRecord;
  brand: BrandSettings;
  labelConfig: LabelCustomConfig;
  variant?: 'a4_4_per_page' | 'a4_double' | 'a4_single' | 'thermal' | 'preview';
  zoom?: number;
}

export const NRILabelCard: React.FC<NRILabelCardProps> = ({
  entry,
  currentPull,
  brand,
  labelConfig,
  variant = 'a4_4_per_page',
  zoom = 1
}) => {
  const {
    item,
    quantityInPallet,
    palletFactor,
    lastroFactor,
    isFractionalLastro
  } = entry;

  const isCompact = variant === 'a4_4_per_page' || variant === 'preview';
  const scale = isCompact ? 1 : variant === 'a4_double' ? 1.8 : 2.8;

  // Quantity to display in QTD TOTAL / PALLET:
  const displayQuantityTotal = isFractionalLastro 
    ? quantityInPallet 
    : (palletFactor && palletFactor > 0 ? palletFactor : (item.quantitySku > 0 ? item.quantitySku : '84'));

  const displayQuantityLastro = (lastroFactor && lastroFactor > 0) 
    ? lastroFactor 
    : (item.lastroCount > 0 ? item.lastroCount : '12');

  const cardStyle: React.CSSProperties = {
    border: `${labelConfig.outerBorderWidth * scale}px solid ${labelConfig.outerBorderColor}`,
    padding: `${labelConfig.labelPaddingMm * (isCompact ? 1 : 2.5)}mm`,
    boxSizing: 'border-box',
    ...(isCompact ? {
      height: `${labelConfig.labelHeightMm}mm`,
      maxHeight: `${labelConfig.labelHeightMm}mm`,
      minHeight: `${labelConfig.labelHeightMm}mm`
    } : {})
  };

  const innerDividerStyle: React.CSSProperties = {
    borderBottom: `${labelConfig.innerBorderWidth * scale}px solid ${labelConfig.innerBorderColor}`
  };

  const gridBorderStyle: React.CSSProperties = {
    border: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
  };

  const cellDividerStyle: React.CSSProperties = {
    borderColor: labelConfig.gridBorderColor,
    borderWidth: `${labelConfig.gridBorderWidth * scale}px`
  };

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

  return (
    <div
      style={cardStyle}
      className={`bg-white text-black font-sans flex flex-col justify-between overflow-hidden select-none ${
        isCompact 
          ? 'nri-label-card-4' 
          : variant === 'a4_double'
          ? 'p-4 h-full min-h-[130mm]'
          : 'p-6 h-full min-h-[265mm]'
      }`}
    >
      {/* 1. TOP HEADER: AMBEV on the Left + PAU BRASIL GUARABIRA & LOGO on the Right */}
      <div 
        style={innerDividerStyle} 
        className={`flex items-center justify-between pb-0.5 mb-0.5 ${isCompact ? 'min-h-[19px]' : 'min-h-[46px] pb-2 mb-2'}`}
      >
        {/* Left: AMBEV */}
        <div className="flex items-center gap-1 shrink-0">
          {brand.secondaryLogoUrl ? (
            <img 
              src={brand.secondaryLogoUrl} 
              alt="Ambev" 
              style={{
                height: `${(labelConfig.logoHeightPx || 18) * scale}px`,
                maxHeight: `${(labelConfig.logoHeightPx || 18) * 1.5 * scale}px`,
                maxWidth: `${(labelConfig.logoHeightPx || 18) * 4 * scale}px`
              }}
              className="object-contain" 
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
        <div className="flex items-center gap-1.5 justify-end shrink-0 max-w-[78%]">
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
                  height: `${(labelConfig.logoHeightPx || 18) * scale}px`,
                  maxHeight: `${(labelConfig.logoHeightPx || 18) * 1.5 * scale}px`,
                  maxWidth: `${(labelConfig.logoHeightPx || 18) * 4 * scale}px`
                }}
                className="object-contain shrink-0" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                style={{ 
                  transform: `scale(${((labelConfig.logoHeightPx || 18) / 18)})`, 
                  transformOrigin: 'right center' 
                }}
                className="shrink-0 inline-flex items-center"
              >
                <PauBrasilLogo size={isCompact ? "sm" : "md"} showText={false} className="shrink-0" />
              </div>
            )
          )}
        </div>
      </div>

      {/* 2. PRODUCT CODE & DESCRIPTION CENTERED */}
      <div 
        style={{
          fontSize: `${labelConfig.productTitleSize * scale}px`,
          fontWeight: labelConfig.productTitleBold ? 900 : 700
        }}
        className={`text-center uppercase text-black tracking-tight leading-none px-0.5 truncate ${
          isCompact ? 'py-0.5 my-0' : variant === 'a4_double' ? 'my-3 text-2xl' : 'my-4 text-3xl'
        }`}
      >
        <span className="font-mono font-black text-black tracking-normal">{item.productCode}</span> – {item.description}
      </div>

      {/* 3. HERO SECTION: "Carreg até:" + GIANT BLACK BOX + CURVA ABC */}
      <div className={`flex items-stretch justify-between gap-1 ${isCompact ? 'my-0.5' : 'my-2.5'}`}>
        {/* Left: Carreg até: */}
        <div 
          className={`text-right flex flex-col justify-center leading-tight shrink-0 pr-1 ${isCompact ? 'min-w-[44px]' : 'min-w-[85px]'}`}
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
            minHeight: labelConfig.carregAteBoxHeight ? `${labelConfig.carregAteBoxHeight * scale}px` : undefined,
            paddingTop: `${Math.max(2, (labelConfig.carregAteBoxHeight ? labelConfig.carregAteBoxHeight * 0.12 : 4) * scale)}px`,
            paddingBottom: `${Math.max(2, (labelConfig.carregAteBoxHeight ? labelConfig.carregAteBoxHeight * 0.12 : 4) * scale)}px`
          }}
          className={`flex-1 text-center flex items-center justify-center ${isCompact ? 'px-1.5' : 'px-4'}`}
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
        </div>

        {/* Right: Curva Box */}
        {labelConfig.showCurva && (
          <div 
            style={{
              border: `${labelConfig.innerBorderWidth * scale}px solid ${labelConfig.innerBorderColor}`
            }}
            className={`flex flex-col items-center justify-between shrink-0 text-center overflow-hidden bg-black ${isCompact ? 'min-w-[56px] sm:min-w-[62px]' : 'min-w-[110px]'}`}
          >
            <div 
              style={{
                fontSize: `${labelConfig.curvaLabelSize * scale}px`,
                borderBottom: `${labelConfig.innerBorderWidth * scale}px solid ${labelConfig.innerBorderColor}`
              }}
              className="bg-white text-black font-black tracking-wider w-full text-center py-0.2 leading-none"
            >
              CURVA
            </div>
            <div 
              style={{
                fontSize: `${labelConfig.curvaLetterSize * scale}px`
              }}
              className="w-full flex-1 bg-black text-white font-black flex items-center justify-center font-mono py-0.2 leading-none"
            >
              {item.abcClass || 'B'}
            </div>
          </div>
        )}
      </div>

      {/* 4. SUB-DATES: Pré-bloq, Recebimento & VALIDADE MAXIMIZADA EM NEGRITO */}
      <div 
        style={{
          borderTop: `${labelConfig.innerBorderWidth * scale}px solid ${labelConfig.innerBorderColor}`,
          borderBottom: `${labelConfig.innerBorderWidth * scale}px solid ${labelConfig.innerBorderColor}`
        }}
        className={`flex items-center justify-between px-1 bg-slate-50 ${isCompact ? 'py-0.5 my-0.5' : 'py-2 my-2'}`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
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
                className="font-mono font-black text-black"
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
                className="font-mono font-black text-black"
              >
                {recebDate}
              </span>
            </div>
          )}
        </div>

        {labelConfig.showValidity && (
          <div className="flex items-baseline gap-1 text-right">
            <span 
              style={{ fontSize: `${labelConfig.validityLabelSize * scale}px` }}
              className="font-black uppercase text-black tracking-wider"
            >
              Validade:
            </span>{' '}
            <span 
              style={{ fontSize: `${labelConfig.validityDateSize * scale}px` }}
              className="font-mono font-black text-black underline decoration-[2px] leading-none"
            >
              {validadeDate}
            </span>
          </div>
        )}
      </div>

      {/* 5. METADATA GRID TABLE */}
      {labelConfig.tableMode === 'excel_7_cols' ? (
        /* 7-COLUMN METADATA GRID EXACTLY AS IN USER'S EXCEL IMAGE:
           CONFERENTE | TURNO | HORA | QTDE TT | NOTA | ORIGEM | CARRETA */
        <div 
          style={gridBorderStyle}
          className="grid grid-cols-[1.6fr_1.0fr_0.9fr_1.1fr_1.1fr_1.5fr_1.2fr] text-center bg-white font-sans overflow-hidden"
        >
          {/* Header Row */}
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            CONFERENTE
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            TURNO
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            HORA
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            QTDE TT
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            NOTA
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            ORIGEM
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            CARRETA
          </div>

          {/* Data Row */}
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black truncate leading-tight flex items-center justify-center"
            title={receiver}
          >
            {receiver}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black leading-tight flex items-center justify-center"
          >
            {shift}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black font-mono leading-tight flex items-center justify-center"
          >
            {time}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black font-mono leading-tight flex items-center justify-center bg-slate-50/50"
          >
            {displayQuantityTotal}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black font-mono truncate leading-tight flex items-center justify-center"
          >
            {nfe}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black truncate leading-tight flex items-center justify-center"
            title={origin}
          >
            {origin}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`
            }}
            className="p-0.5 font-black font-mono uppercase truncate leading-tight flex items-center justify-center"
          >
            {plate}
          </div>
        </div>
      ) : (
        /* 8-COLUMN METADATA GRID (CONFERENTE, TURNO, HORA, QTD TOTAL, QTD LASTRO, NOTA, ORIGEM, CARRETA) */
        <div 
          style={gridBorderStyle}
          className="grid grid-cols-[1.5fr_0.85fr_0.8fr_1fr_1fr_0.95fr_1.4fr_1.05fr] text-center bg-white font-sans overflow-hidden"
        >
          {/* Header Row */}
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            CONFERENTE
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            TURNO
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            HORA
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            QTD TOTAL
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            QTD LASTRO
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            NOTA
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            ORIGEM
          </div>
          <div 
            style={{
              backgroundColor: labelConfig.tableHeaderBgColor,
              color: labelConfig.tableHeaderTextColor,
              fontSize: `${labelConfig.tableHeaderSize * scale}px`,
              borderBottom: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black uppercase leading-none truncate"
          >
            CARRETA
          </div>

          {/* Data Row */}
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black truncate leading-tight flex items-center justify-center"
            title={receiver}
          >
            {receiver}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black leading-tight flex items-center justify-center"
          >
            {shift}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black font-mono leading-tight flex items-center justify-center"
          >
            {time}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black font-mono leading-tight flex items-center justify-center bg-slate-50/50"
          >
            {displayQuantityTotal}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black font-mono leading-tight flex items-center justify-center bg-slate-50/50"
          >
            {displayQuantityLastro}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black font-mono truncate leading-tight flex items-center justify-center"
          >
            {nfe}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`,
              borderRight: `${labelConfig.gridBorderWidth * scale}px solid ${labelConfig.gridBorderColor}`
            }}
            className="p-0.5 font-black truncate leading-tight flex items-center justify-center"
            title={origin}
          >
            {origin}
          </div>
          <div 
            style={{
              color: labelConfig.tableDataTextColor,
              fontSize: `${labelConfig.tableDataSize * scale}px`
            }}
            className="p-0.5 font-black font-mono uppercase truncate leading-tight flex items-center justify-center"
          >
            {plate}
          </div>
        </div>
      )}
    </div>
  );
};
