import React, { useState, useEffect } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  X, 
  Save, 
  Check, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Sparkles, 
  SlidersHorizontal, 
  Printer, 
  Eye, 
  Layers, 
  CheckCircle2,
  HelpCircle,
  Move,
  Type,
  Image as ImageIcon,
  Calendar,
  Square
} from 'lucide-react';
import { 
  LabelCustomConfig, 
  DEFAULT_LABEL_CONFIG, 
  PRESET_LABEL_CONFIGS, 
  getStoredLabelConfig, 
  saveStoredLabelConfig, 
  resetLabelConfig 
} from '../utils/labelConfig';
import { BrandSettings, getStoredBrandSettings } from '../utils/branding';
import { PullRecord, ProductCatalogItem, LabelPrintEvent } from '../types';
import { InteractiveLabelPreview } from './InteractiveLabelPreview';
import { saveLabelConfigToFirestore, logLabelPrintToFirestore, logActivityToFirestore } from '../services/firebase';
import { executePrintJob } from '../utils/printHelper';

interface LabelMaximizedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPull?: PullRecord | null;
  catalog?: ProductCatalogItem[];
  onConfigSaved?: (newConfig: LabelCustomConfig) => void;
}

export const LabelMaximizedModal: React.FC<LabelMaximizedModalProps> = ({
  isOpen,
  onClose,
  currentPull,
  catalog = [],
  onConfigSaved
}) => {
  if (!isOpen) return null;

  const [config, setConfig] = useState<LabelCustomConfig>(getStoredLabelConfig);
  const [brand, setBrand] = useState<BrandSettings>(getStoredBrandSettings);
  const [zoomLevel, setZoomLevel] = useState<number>(1.35);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [activeBottomDrawer, setActiveBottomDrawer] = useState<boolean>(true);

  // Sync brand settings
  useEffect(() => {
    const handleBrand = () => setBrand(getStoredBrandSettings());
    window.addEventListener('brand_settings_updated', handleBrand);
    return () => window.removeEventListener('brand_settings_updated', handleBrand);
  }, []);

  // Update specific property
  const updateProp = <K extends keyof LabelCustomConfig>(key: K, value: LabelCustomConfig[K]) => {
    setConfig(prev => {
      const updated = { ...prev, [key]: value };
      saveStoredLabelConfig(updated);
      return updated;
    });
  };

  // Save settings permanently
  const handleSave = () => {
    saveStoredLabelConfig(config);
    saveLabelConfigToFirestore(config).catch(err => console.warn('Firestore sync warning:', err));
    logActivityToFirestore({
      category: 'CONFIGURACAO',
      severity: 'info',
      title: 'Layout de Etiquetas Customizado na Tela Maximizada',
      description: `Ícone: ${config.logoHeightPx || 18}px, Nome: ${config.productTitleSize}px, Carregar Até: ${config.carregAteDateSize}px, Altura: ${config.carregAteBoxHeight || 26}px`,
      userName: currentPull?.header.receiverName || 'Operador'
    }).catch(() => {});

    if (onConfigSaved) onConfigSaved(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Reset to original default
  const handleReset = () => {
    if (window.confirm('Restaurar todas as dimensões da etiqueta para o padrão original da fábrica?')) {
      const reset = resetLabelConfig();
      setConfig(reset);
      saveLabelConfigToFirestore(reset).catch(err => console.warn('Firestore sync error:', err));
      if (onConfigSaved) onConfigSaved(reset);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  // Apply Preset
  const handlePreset = (presetKey: string) => {
    const p = PRESET_LABEL_CONFIGS[presetKey];
    if (!p) return;
    const updated = { ...config, ...p.config };
    setConfig(updated);
    saveStoredLabelConfig(updated);
    saveLabelConfigToFirestore(updated).catch(err => console.warn('Firestore preset error:', err));
    if (onConfigSaved) onConfigSaved(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Fallback Mock Pull
  const effectivePull: PullRecord = currentPull || {
    header: {
      id: 'mock-maximized-pull',
      nfeNumber: '1104458',
      issueDate: '2026-07-15',
      receiptDate: '2026-07-15',
      receiptTime: '11:41',
      orderNumber: '31700',
      truckPlate: 'RLU3F59',
      factoryOrigin: 'F. Itapissum.',
      shift: 'Manhã',
      receiverName: 'Gilson',
      branchOp: 'PAU BRASIL GUARABIRA',
      status: 'OK',
      promaxEntry: '1104458',
      pbr1Count: 1,
      pbr2Count: 0,
      chapatexCount: 0,
      notes: '',
      createdAt: new Date().toISOString()
    },
    items: [
      {
        id: 'mock-item-max',
        productCode: '17808',
        description: 'BUDWEISER LN 330 SH C/4',
        unit: 'CX',
        quantitySku: 84,
        palletCount: 1,
        lastroCount: 12,
        validityDate: '2027-03-03',
        manufacturingDate: '2026-07-15',
        status: 'OK',
        releasePeriodDays: 40,
        daysToExpiry: 180,
        isPeriodOk: true,
        baseRisk: 'Baixo',
        runoffDays: 45,
        abcClass: 'B',
        hectoliterFactor: 0.1,
        totalHectoliter: 8.4,
        unitPrice: 50,
        totalValue: 4200,
        preBlockDate: '2027-02-01',
        loadUntilDate: '2027-02-01'
      }
    ],
    totalPallets: 1,
    totalSku: 84,
    totalHectoliters: 8.4,
    totalValue: 4200,
    hasValidityAlert: false,
    alertCount: 0,
    averageStockAgeIndex: 1
  };

  const effectiveEntry = {
    item: effectivePull.items[0],
    palletNumber: 1,
    totalPalletsOfItem: 1,
    globalPalletIndex: 1,
    totalGlobalPallets: 1,
    faceNumber: 1 as const,
    quantityInPallet: effectivePull.items[0].quantitySku || 84,
    palletFactor: effectivePull.items[0].quantitySku || 84,
    lastroFactor: effectivePull.items[0].lastroCount || 12,
    isFractionalLastro: false
  };

  // Quick print test
  const handlePrintTest = () => {
    handleSave();
    try {
      executePrintJob('label-designer-print-target', `Etiqueta_Maximizada_${effectiveEntry.item.productCode}`);
    } catch {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-fadeIn">
      
      {/* 1. TOP HEADER BAR */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/50 text-purple-400 flex items-center justify-center shrink-0">
            <Maximize2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Tela Maximizada do Exemplo da Etiqueta NRI
              </h2>
              <span className="bg-purple-500/20 text-purple-300 font-mono text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-500/40">
                Ajuste Direto na Etiqueta
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Segure e arraste as alças sobre o <strong>ícone</strong>, o <strong>nome do produto</strong> e a <strong>barra preta de carregar até</strong> para aumentar diretamente.
            </p>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Zoom Selector */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(0.9, prev - 0.15))}
              className="p-1 hover:text-purple-400 text-slate-300 cursor-pointer"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-slate-200 px-2 min-w-[45px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(2.2, prev + 0.15))}
              className="p-1 hover:text-purple-400 text-slate-300 cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Guides */}
          <button
            type="button"
            onClick={() => setShowGuides(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              showGuides 
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-inner' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {showGuides ? '✓ Alças Visíveis' : 'Alças Ocultas'}
          </button>

          {/* Presets Button */}
          <button
            type="button"
            onClick={() => handlePreset('giant_elements')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 font-bold rounded-xl text-xs border border-purple-500/50 cursor-pointer"
            title="Aplicar modelo com Ícones Grandes e Títulos Expandidos"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Modelo Ícone & Título Grande</span>
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Restaurar padrão"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md ${
              savedSuccess 
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' 
                : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white'
            }`}
          >
            {savedSuccess ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Salvo no Sistema!' : 'Salvar Dimensões'}</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-red-950/60 rounded-xl transition-colors cursor-pointer ml-1"
            title="Fechar Tela Maximizada"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. CENTER CANVAS AREA (SCROLLABLE & ZOOMABLE) */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-900/60">
        <div 
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.12s ease-out'
          }}
          className="my-auto transition-transform duration-100 w-full max-w-[210mm]"
        >
          <InteractiveLabelPreview
            labelConfig={config}
            brand={brand}
            entry={effectiveEntry}
            currentPull={effectivePull}
            onUpdateProp={updateProp}
            scale={1.35}
            showGuides={showGuides}
          />
        </div>
      </div>

      {/* 3. BOTTOM FLOATING FINE-TUNING DRAWER */}
      <div className="bg-slate-900/95 border-t border-slate-800 p-3 sm:px-6 shrink-0 shadow-2xl backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
            <SlidersHorizontal className="w-4 h-4 text-purple-400" />
            <span>Controles Rápidos de Dimensão:</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 max-w-4xl text-xs">
            
            {/* 1. Ícone / Logo */}
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-blue-400" />
                  <span>Ícone / Logo:</span>
                </span>
                <span className="font-mono text-blue-400 font-black">{config.logoHeightPx || 18}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="38"
                step="1"
                value={config.logoHeightPx || 18}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateProp('logoHeightPx', val);
                  updateProp('headerAmbevSize', Math.min(30, Math.max(14, Math.round(val * 1.05))));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* 2. Nome do Produto */}
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1">
                  <Type className="w-3 h-3 text-purple-400" />
                  <span>Nome Produto:</span>
                </span>
                <span className="font-mono text-purple-400 font-black">{config.productTitleSize}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="26"
                step="0.5"
                value={config.productTitleSize}
                onChange={(e) => updateProp('productTitleSize', parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* 3. Data de Carregar Até */}
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>Data Carregar Até:</span>
                </span>
                <span className="font-mono text-amber-400 font-black">{config.carregAteDateSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="38"
                step="1"
                value={config.carregAteDateSize}
                onChange={(e) => updateProp('carregAteDateSize', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* 4. Altura da Barra Preta */}
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1">
                  <Square className="w-3 h-3 text-amber-400" />
                  <span>Altura Barra Preta:</span>
                </span>
                <span className="font-mono text-amber-400 font-black">{config.carregAteBoxHeight || 26}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="48"
                step="1"
                value={config.carregAteBoxHeight || 26}
                onChange={(e) => updateProp('carregAteBoxHeight', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintTest}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Imprimir Teste</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 cursor-pointer"
            >
              Concluir & Voltar
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
