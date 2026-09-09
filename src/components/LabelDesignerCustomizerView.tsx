import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  Printer, 
  RotateCcw, 
  Save, 
  Check, 
  Eye, 
  Sparkles, 
  Layers, 
  Maximize2, 
  Table, 
  Type, 
  Palette, 
  Square, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowRight,
  HelpCircle,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { 
  LabelCustomConfig, 
  DEFAULT_LABEL_CONFIG, 
  PRESET_LABEL_CONFIGS, 
  getStoredLabelConfig, 
  saveStoredLabelConfig, 
  resetLabelConfig 
} from '../utils/labelConfig';
import { saveLabelConfigToFirestore, logLabelPrintToFirestore, logActivityToFirestore } from '../services/firebase';
import { NRILabelCard, LabelFaceEntry } from './NRILabelCard';
import { getStoredBrandSettings, BrandSettings } from '../utils/branding';
import { PullRecord, ProductCatalogItem, LabelPrintEvent } from '../types';
import { executePrintJob } from '../utils/printHelper';

interface LabelDesignerCustomizerViewProps {
  pulls?: PullRecord[];
  catalog?: ProductCatalogItem[];
  onNavigateToPrint?: () => void;
}

export const LabelDesignerCustomizerView: React.FC<LabelDesignerCustomizerViewProps> = ({
  pulls = [],
  catalog = [],
  onNavigateToPrint
}) => {
  const [config, setConfig] = useState<LabelCustomConfig>(getStoredLabelConfig);
  const [brand, setBrand] = useState<BrandSettings>(getStoredBrandSettings);
  const [activeTab, setActiveTab] = useState<'borders' | 'fonts' | 'table' | 'content'>('borders');
  const [previewMode, setPreviewMode] = useState<'single' | 'sheet_a4'>('single');
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('excel_standard');

  // Test data reflecting user's screenshot exactly
  const [testProductCode, setTestProductCode] = useState('17808');
  const [testProductDesc, setTestProductDesc] = useState('BUDWEISER LN 330 SH C/4');
  const [testCarregAte, setTestCarregAte] = useState('2027-02-01');
  const [testValidade, setTestValidade] = useState('2027-03-03');
  const [testReceb, setTestReceb] = useState('2026-07-15');
  const [testCurva, setTestCurva] = useState<'A' | 'B' | 'C'>('B');
  const [testConferente, setTestConferente] = useState('Gilson');
  const [testTurno, setTestTurno] = useState('Manhã');
  const [testHora, setTestHora] = useState('11:41');
  const [testQtdTt, setTestQtdTt] = useState(84);
  const [testNota, setTestNota] = useState('1104458');
  const [testOrigem, setTestOrigem] = useState('F. Itapissum.');
  const [testCarreta, setTestCarreta] = useState('RLU3F59');

  // Sync brand settings
  useEffect(() => {
    const handleBrandChange = () => setBrand(getStoredBrandSettings());
    window.addEventListener('brand_settings_updated', handleBrandChange);
    return () => window.removeEventListener('brand_settings_updated', handleBrandChange);
  }, []);

  // Sync label config
  useEffect(() => {
    const handleConfigChange = () => setConfig(getStoredLabelConfig());
    window.addEventListener('label_custom_settings_updated', handleConfigChange);
    return () => window.removeEventListener('label_custom_settings_updated', handleConfigChange);
  }, []);

  // Update specific property
  const updateProp = <K extends keyof LabelCustomConfig>(key: K, value: LabelCustomConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Apply preset
  const handleApplyPreset = (presetKey: string) => {
    const preset = PRESET_LABEL_CONFIGS[presetKey];
    if (!preset) return;
    setActivePreset(presetKey);
    const updated = { ...config, ...preset.config };
    setConfig(updated);
    saveStoredLabelConfig(updated);
    saveLabelConfigToFirestore(updated).catch(err => console.warn('Firestore sync warning:', err));
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  // Save current settings
  const handleSave = () => {
    saveStoredLabelConfig(config);
    saveLabelConfigToFirestore(config).catch(err => console.warn('Firestore sync warning:', err));
    logActivityToFirestore({
      category: 'CONFIGURACAO',
      severity: 'info',
      title: 'Layout de Etiquetas Customizado Salvo',
      description: `Bordas ajustadas (Externa: ${config.borderThicknessOuter}px, Interna: ${config.borderThicknessInner}px), fontes (${config.fontSizeTitle} / ${config.fontSizeValues}) salvas no banco Firestore`,
      userName: testConferente || 'Operador'
    }).catch(() => {});
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  // Reset to factory defaults
  const handleReset = () => {
    if (window.confirm('Deseja restaurar todas as configurações visuais da etiqueta para o padrão original?')) {
      const reset = resetLabelConfig();
      setConfig(reset);
      saveLabelConfigToFirestore(reset).catch(err => console.warn('Firestore sync warning:', err));
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2000);
    }
  };

  // Quick load real pull data into simulator
  const handleLoadRealPull = (pullId: string) => {
    const pull = pulls.find(p => p.header.id === pullId);
    if (!pull || pull.items.length === 0) return;
    const item = pull.items[0];
    setTestProductCode(item.productCode);
    setTestProductDesc(item.description);
    setTestCarregAte(item.loadUntilDate || item.validityDate);
    setTestValidade(item.validityDate);
    setTestReceb(pull.header.receiptDate);
    setTestCurva((item.abcClass || 'B') as any);
    setTestConferente(pull.header.receiverName || 'Gilson');
    setTestTurno(pull.header.shift || 'Manhã');
    setTestHora(pull.header.receiptTime || '11:41');
    setTestQtdTt(item.quantitySku || 84);
    setTestNota(pull.header.nfeNumber || '1104458');
    setTestOrigem(pull.header.factoryOrigin || 'F. Itapissum.');
    setTestCarreta(pull.header.truckPlate || 'RLU3F59');
  };

  // Build mock PullRecord and mock Entry for live rendering
  const mockPull: PullRecord = {
    header: {
      id: 'mock-test-pull',
      nfeNumber: testNota,
      issueDate: testReceb,
      receiptDate: testReceb,
      receiptTime: testHora,
      orderNumber: '31700',
      truckPlate: testCarreta,
      factoryOrigin: testOrigem,
      shift: testTurno as any,
      receiverName: testConferente,
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
        id: 'mock-item-1',
        productCode: testProductCode,
        description: testProductDesc,
        unit: 'CX',
        quantitySku: testQtdTt,
        palletCount: 1,
        lastroCount: 12,
        validityDate: testValidade,
        manufacturingDate: testReceb,
        status: 'OK',
        releasePeriodDays: 40,
        daysToExpiry: 180,
        isPeriodOk: true,
        baseRisk: 'Baixo',
        runoffDays: 45,
        abcClass: testCurva,
        hectoliterFactor: 0.1,
        totalHectoliter: 8.4,
        unitPrice: 50,
        totalValue: testQtdTt * 50,
        preBlockDate: testValidade,
        loadUntilDate: testCarregAte
      }
    ],
    totalPallets: 1,
    totalSku: testQtdTt,
    totalHectoliters: 10,
    totalValue: 0,
    hasValidityAlert: false,
    alertCount: 0,
    averageStockAgeIndex: 1
  };

  const mockEntry: LabelFaceEntry = {
    item: mockPull.items[0],
    palletNumber: 1,
    totalPalletsOfItem: 1,
    globalPalletIndex: 1,
    totalGlobalPallets: 1,
    faceNumber: 1,
    faceLabel: 'FACE 1/4 (FRONTAL)',
    quantityInPallet: testQtdTt,
    palletFactor: testQtdTt,
    lastroFactor: 12,
    isFractionalLastro: false
  };

  // Print single sheet test
  const handlePrintTest = () => {
    handleSave();
    try {
      const testPrintEvent: LabelPrintEvent = {
        id: `print-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nfeNumber: testNota || '1104458',
        truckPlate: testCarreta || 'RLU3F59',
        factoryOrigin: testOrigem || 'Ambev Itapissuma',
        receiverName: testConferente || 'Gilson',
        printedAt: new Date().toISOString(),
        facesPerPallet: 1,
        printFormat: 'a4_single',
        totalPallets: 1,
        totalLabelsCount: 1,
        printedProductsSummary: `${testProductCode} - ${testProductDesc}`,
        printType: 'TESTE_DESIGNER',
        userFullName: testConferente || 'Conferente',
        notes: 'Impressão de teste do Editor de Etiquetas'
      };
      logLabelPrintToFirestore(testPrintEvent).catch(e => console.warn('Test print log error:', e));
    } catch (e) {
      console.warn('Logging error:', e);
    }

    try {
      executePrintJob('label-designer-print-target', `Etiqueta_Teste_Customizada_${testProductCode}`);
    } catch (e) {
      console.warn('Direct fallback print:', e);
      window.print();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* 1. TOP HEADER & ACTION CONTROLS */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0 shadow-xs">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Editor & Personalização de Etiquetas NRI
              </h1>
              <span className="bg-purple-100 text-purple-900 font-mono font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-purple-300">
                Ajuste Manual de Bordas & Fontes
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Ajuste as bordas externas e internas, aumente os tamanhos de texto e personalize a grade (fiel ao modelo Excel Ambev).
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors border border-slate-200 cursor-pointer"
            title="Restaurar valores padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handlePrintTest}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
            title="Imprimir página A4 de teste"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Imprimir Teste A4</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md ${
              saveFeedback
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white'
            }`}
          >
            {saveFeedback ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
            <span>{saveFeedback ? 'Configurações Salvas!' : 'Salvar & Aplicar'}</span>
          </button>

          {onNavigateToPrint && (
            <button
              type="button"
              onClick={() => {
                handleSave();
                onNavigateToPrint();
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
            >
              <span>Ir para Impressão</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. PRESETS BAR (1-CLICK TEMPLATES) */}
      <div className="bg-gradient-to-r from-purple-50 via-slate-50 to-amber-50 p-4 rounded-2xl border border-purple-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Modelos Prontos (1-Clique):
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(PRESET_LABEL_CONFIGS).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleApplyPreset(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activePreset === key 
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs' 
                  : 'bg-white hover:bg-purple-50 text-slate-800 border-slate-300 hover:border-purple-300'
              }`}
              title={item.desc}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: CONTROLS (LEFT) + LIVE PREVIEW (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CONFIGURATION CONTROLS */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Subtabs Selector */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('borders')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'borders' ? 'bg-white text-purple-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>Bordas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fonts')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'fonts' ? 'bg-white text-purple-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Fontes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'table' ? 'bg-white text-purple-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Grade / Tabela</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'content' ? 'bg-white text-purple-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Dados Teste</span>
            </button>
          </div>

          {/* TAB 1: BORDERS */}
          {activeTab === 'borders' && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Square className="w-4 h-4 text-purple-600" />
                  <span>Espessura & Cor das Bordas</span>
                </h3>
                <span className="text-[11px] font-mono font-bold text-slate-500">Milímetros / Pixels</span>
              </div>

              {/* Outer border width */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Borda Externa da Etiqueta (Contorno):</label>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {config.outerBorderWidth}px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.5"
                    value={config.outerBorderWidth}
                    onChange={(e) => updateProp('outerBorderWidth', parseFloat(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[1, 2, 3, 4].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateProp('outerBorderWidth', w)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                          config.outerBorderWidth === w ? 'bg-purple-600 text-white border-purple-700' : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Inner dividers width */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Divisões Internas (Cabeçalho, Validade, etc.):</label>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {config.innerBorderWidth}px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.5"
                    value={config.innerBorderWidth}
                    onChange={(e) => updateProp('innerBorderWidth', parseFloat(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[1, 1.5, 2, 3].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateProp('innerBorderWidth', w)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                          config.innerBorderWidth === w ? 'bg-purple-600 text-white border-purple-700' : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table grid border width */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Linhas da Tabela Inferior (Grade de Dados):</label>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {config.gridBorderWidth}px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.5"
                    value={config.gridBorderWidth}
                    onChange={(e) => updateProp('gridBorderWidth', parseFloat(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[1, 1.5, 2, 3].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateProp('gridBorderWidth', w)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                          config.gridBorderWidth === w ? 'bg-purple-600 text-white border-purple-700' : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Outer Border Color */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Cor da Borda:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Preto Puro (#000000)', color: '#000000' },
                    { label: 'Azul Ambev (#002B7F)', color: '#002B7F' },
                    { label: 'Grafite Escuro (#334155)', color: '#334155' }
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => {
                        updateProp('outerBorderColor', c.color);
                        updateProp('innerBorderColor', c.color);
                        updateProp('gridBorderColor', c.color);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                        config.outerBorderColor === c.color ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300" style={{ backgroundColor: c.color }} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Height and Margins */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Altura da Etiqueta:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="58"
                      max="65"
                      value={config.labelHeightMm}
                      onChange={(e) => updateProp('labelHeightMm', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    />
                    <span className="text-xs text-slate-500 font-bold">mm</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Padrão 61mm (4 por folha A4)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Margem Interna (Padding):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="3.5"
                      value={config.labelPaddingMm}
                      onChange={(e) => updateProp('labelPaddingMm', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    />
                    <span className="text-xs text-slate-500 font-bold">mm</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Padrão 1.5mm</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: FONTS */}
          {activeTab === 'fonts' && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 max-h-[620px] overflow-y-auto">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Type className="w-4 h-4 text-purple-600" />
                  <span>Tamanho das Fontes & Informações</span>
                </h3>
                <span className="text-[11px] font-mono font-bold text-slate-500">Valores em Pixels</span>
              </div>

              {/* Product SKU & Description */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Título do Produto (Código SKU + Descrição):</label>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {config.productTitleSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="11"
                  max="20"
                  step="0.5"
                  value={config.productTitleSize}
                  onChange={(e) => updateProp('productTitleSize', parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Carreg até Date */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Data "Carreg até" (Bloco Preto Central):</label>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {config.carregAteDateSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="32"
                  step="1"
                  value={config.carregAteDateSize}
                  onChange={(e) => updateProp('carregAteDateSize', parseInt(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Curva Letter */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Letra da Curva ABC (A / B / C):</label>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {config.curvaLetterSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="28"
                  step="1"
                  value={config.curvaLetterSize}
                  onChange={(e) => updateProp('curvaLetterSize', parseInt(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Validity Date */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Data de Validade (Negrito & Sublinhado):</label>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {config.validityDateSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="24"
                  step="0.5"
                  value={config.validityDateSize}
                  onChange={(e) => updateProp('validityDateSize', parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Sub-dates */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Sub-datas (Pré-bloqueio & Recebimento):</label>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {config.preBloqDateSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="9"
                  max="14"
                  step="0.5"
                  value={config.preBloqDateSize}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateProp('preBloqDateSize', val);
                    updateProp('recebDateSize', val);
                  }}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Table Headers */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Cabeçalho da Tabela (CONFERENTE, TURNO, etc.):</label>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {config.tableHeaderSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="6.5"
                  max="12"
                  step="0.5"
                  value={config.tableHeaderSize}
                  onChange={(e) => updateProp('tableHeaderSize', parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Table Data Values */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Dados da Tabela (Valores das Células):</label>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {config.tableDataSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="7.5"
                  max="14"
                  step="0.5"
                  value={config.tableDataSize}
                  onChange={(e) => updateProp('tableDataSize', parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Header Texts */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fonte Logo "ambev":</label>
                  <input
                    type="number"
                    min="14"
                    max="26"
                    value={config.headerAmbevSize}
                    onChange={(e) => updateProp('headerAmbevSize', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fonte "PAU BRASIL":</label>
                  <input
                    type="number"
                    min="10"
                    max="18"
                    value={config.headerCompanySize}
                    onChange={(e) => updateProp('headerCompanySize', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: TABLE & COLUMNS FORMAT */}
          {activeTab === 'table' && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Table className="w-4 h-4 text-purple-600" />
                  <span>Modelo de Grade & Exibição de Campos</span>
                </h3>
              </div>

              {/* Table Mode Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">Formato das Colunas da Tabela:</label>
                
                <div 
                  onClick={() => updateProp('tableMode', 'excel_7_cols')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    config.tableMode === 'excel_7_cols'
                      ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      ⭐ Modelo Planilha Excel (7 Colunas - Igual à Imagem)
                    </span>
                    {config.tableMode === 'excel_7_cols' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                  </div>
                  <div className="mt-2 text-[10px] font-mono bg-white p-2 rounded-xl border border-slate-200 text-slate-700 flex flex-wrap gap-1">
                    <span className="font-bold">CONFERENTE</span> | 
                    <span className="font-bold">TURNO</span> | 
                    <span className="font-bold">HORA</span> | 
                    <span className="font-bold text-purple-700">QTDE TT</span> | 
                    <span className="font-bold">NOTA</span> | 
                    <span className="font-bold">ORIGEM</span> | 
                    <span className="font-bold">CARRETA</span>
                  </div>
                </div>

                <div 
                  onClick={() => updateProp('tableMode', 'full_8_cols')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    config.tableMode === 'full_8_cols'
                      ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      Modelo Completo com Lastro (8 Colunas)
                    </span>
                    {config.tableMode === 'full_8_cols' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                  </div>
                  <div className="mt-2 text-[10px] font-mono bg-white p-2 rounded-xl border border-slate-200 text-slate-700 flex flex-wrap gap-1">
                    <span className="font-bold">CONFERENTE</span> | 
                    <span className="font-bold">TURNO</span> | 
                    <span className="font-bold">HORA</span> | 
                    <span className="font-bold text-amber-700">QTD TOTAL</span> | 
                    <span className="font-bold text-amber-700">QTD LASTRO</span> | 
                    <span className="font-bold">NOTA</span> | 
                    <span className="font-bold">ORIGEM</span> | 
                    <span className="font-bold">CARRETA</span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800">Campos Opcionais:</label>
                
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showPreBloq}
                      onChange={(e) => updateProp('showPreBloq', e.target.checked)}
                      className="accent-purple-600"
                    />
                    <span>Exibir Pré-bloq</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showReceb}
                      onChange={(e) => updateProp('showReceb', e.target.checked)}
                      className="accent-purple-600"
                    />
                    <span>Exibir Recebimento</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showCurva}
                      onChange={(e) => updateProp('showCurva', e.target.checked)}
                      className="accent-purple-600"
                    />
                    <span>Exibir Bloco CURVA</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showLogo}
                      onChange={(e) => updateProp('showLogo', e.target.checked)}
                      className="accent-purple-600"
                    />
                    <span>Exibir Logo Pau Brasil</span>
                  </label>
                </div>
              </div>

              {/* Custom Names */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Empresa (Topo Direito):</label>
                  <input
                    type="text"
                    value={config.companyName}
                    onChange={(e) => updateProp('companyName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black uppercase text-[#002B7F]"
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: SIMULATOR / TEST DATA */}
          {activeTab === 'content' && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 max-h-[620px] overflow-y-auto">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  <span>Dados para Teste da Etiqueta</span>
                </h3>
              </div>

              {/* Fast Load from existing pull */}
              {pulls.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Carregar dados de uma Puxada real:</label>
                  <select
                    onChange={(e) => handleLoadRealPull(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    defaultValue=""
                  >
                    <option value="" disabled>Selecione uma puxada salva...</option>
                    {pulls.map(p => (
                      <option key={p.header.id} value={p.header.id}>
                        {p.header.truckPlate} - NF {p.header.nfeNumber} ({p.header.factoryOrigin})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código SKU:</label>
                  <input
                    type="text"
                    value={testProductCode}
                    onChange={(e) => setTestProductCode(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Curva ABC:</label>
                  <select
                    value={testCurva}
                    onChange={(e) => setTestCurva(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="A">A (Alta Rotatividade)</option>
                    <option value="B">B (Média Rotatividade)</option>
                    <option value="C">C (Baixa Rotatividade)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Produto:</label>
                <input
                  type="text"
                  value={testProductDesc}
                  onChange={(e) => setTestProductDesc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Carreg até (Data):</label>
                  <input
                    type="date"
                    value={testCarregAte}
                    onChange={(e) => setTestCarregAte(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Validade (Data):</label>
                  <input
                    type="date"
                    value={testValidade}
                    onChange={(e) => setTestValidade(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Conferente:</label>
                  <input
                    type="text"
                    value={testConferente}
                    onChange={(e) => setTestConferente(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Turno:</label>
                  <input
                    type="text"
                    value={testTurno}
                    onChange={(e) => setTestTurno(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Hora:</label>
                  <input
                    type="text"
                    value={testHora}
                    onChange={(e) => setTestHora(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">QTDE TT:</label>
                  <input
                    type="number"
                    value={testQtdTt}
                    onChange={(e) => setTestQtdTt(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nota Fiscal:</label>
                  <input
                    type="text"
                    value={testNota}
                    onChange={(e) => setTestNota(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Carreta:</label>
                  <input
                    type="text"
                    value={testCarreta}
                    onChange={(e) => setTestCarreta(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Origem:</label>
                <input
                  type="text"
                  value={testOrigem}
                  onChange={(e) => setTestOrigem(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: LIVE REAL-TIME PREVIEW & A4 SHEET SIMULATOR */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Pré-visualização em Tempo Real
                </h3>
                <span className="text-[10px] text-slate-400">
                  Dimensões: Largura 200mm × Altura {config.labelHeightMm}mm | Borda: {config.outerBorderWidth}px
                </span>
              </div>
            </div>

            {/* View Mode & Zoom controls */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewMode('single')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    previewMode === 'single' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Etiqueta Única
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('sheet_a4')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    previewMode === 'sheet_a4' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Folha A4 (4 Etiquetas)
                </button>
              </div>

              {previewMode === 'single' && (
                <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(0.9, prev - 0.1))}
                    className="p-1 hover:text-purple-400 text-slate-400"
                    title="Diminuir Zoom"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-slate-300 min-w-[38px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
                    className="p-1 hover:text-purple-400 text-slate-400"
                    title="Aumentar Zoom"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW CANVAS */}
          <div className="bg-slate-200/80 p-6 rounded-3xl border border-slate-300 flex flex-col items-center justify-center min-h-[500px] overflow-hidden">
            
            {previewMode === 'single' ? (
              <div 
                style={{ 
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out'
                }}
                className="w-full max-w-[200mm] shadow-2xl"
              >
                <NRILabelCard
                  entry={mockEntry}
                  currentPull={mockPull}
                  brand={brand}
                  labelConfig={config}
                  variant="a4_4_per_page"
                />
              </div>
            ) : (
              /* SHEET A4 SIMULATOR */
              <div className="w-full max-w-[210mm] bg-white p-2 sm:p-3 rounded-xl shadow-2xl border-2 border-slate-400 space-y-1 scale-90 sm:scale-95 origin-top">
                <div className="text-center text-[10px] font-mono font-bold text-slate-400 pb-1 border-b border-dashed border-slate-200">
                  --- FOLHA A4 RETRATO (210mm × 297mm) - 4 ETIQUETAS EM TIRAS ---
                </div>
                {[1, 2, 3, 4].map(idx => (
                  <div key={idx} className="relative">
                    <NRILabelCard
                      entry={{ ...mockEntry, faceNumber: idx as any }}
                      currentPull={mockPull}
                      brand={brand}
                      labelConfig={config}
                      variant="a4_4_per_page"
                    />
                    <span className="absolute top-1 left-2 bg-slate-900/80 text-white text-[8px] font-mono font-bold px-1 rounded z-10">
                      Face {idx}/4
                    </span>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* HIDDEN PRINT CONTAINER (Used by executePrintJob for test print) */}
          <div className="hidden">
            <div id="label-designer-print-target">
              <div className="a4-print-sheet-4">
                {[1, 2, 3, 4].map(faceNum => (
                  <NRILabelCard
                    key={`print-test-face-${faceNum}`}
                    entry={{ ...mockEntry, faceNumber: faceNum as any }}
                    currentPull={mockPull}
                    brand={brand}
                    labelConfig={config}
                    variant="a4_4_per_page"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* FOOTER TIPS */}
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Dica Operacional:</strong> Todas as alterações salvas aqui são aplicadas automaticamente em todas as etiquetas impressas na guia <strong>"ETIQUETAS PALLET"</strong> e sincronizadas no banco de dados na nuvem para todos os computadores e conferentes da distribuidora.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
