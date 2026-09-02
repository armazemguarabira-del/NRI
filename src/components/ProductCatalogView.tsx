import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Edit2, 
  Check, 
  Filter, 
  Trash2, 
  Sparkles, 
  Save, 
  X, 
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download,
  Upload,
  Image,
  Layers,
  Database,
  ShieldCheck,
  Key,
  Building2,
  Factory
} from 'lucide-react';
import { ProductCatalogItem, ABCClass, PullRecord, Report030519Item, BlitzPalletRecord, PNCRecord, SupplierItem } from '../types';
import { formatBRL, getAbcBadgeColor, exportAllSystemBasesToExcel, exportDataToExcel } from '../utils/nriCalculations';
import { PauBrasilLogo } from './PauBrasilLogo';
import { INITIAL_PRODUCTS } from '../data/initialCatalog';
import { SupplierManagementView } from './SupplierManagementView';
import { getStoredBrandSettings, saveStoredBrandSettings, BrandSettings } from '../utils/branding';
import { saveBrandSettingsToFirestore } from '../services/firebase';

interface ProductCatalogViewProps {
  catalog: ProductCatalogItem[];
  onUpdateCatalog: (newCatalog: ProductCatalogItem[]) => void;
  suppliers?: SupplierItem[];
  onSaveSupplier?: (supplier: SupplierItem) => void;
  onDeleteSupplier?: (supplierId: string) => void;
  onResetSuppliers?: () => void;
  pulls?: PullRecord[];
  report030519?: Report030519Item[];
  blitzRecords?: BlitzPalletRecord[];
  pncs?: PNCRecord[];
  customAmbevLogo?: string | null;
  customPauBrasilLogo?: string | null;
  onUpdateAmbevLogo?: (url: string | null) => void;
  onUpdatePauBrasilLogo?: (url: string | null) => void;
  onOpenBrandingModal?: () => void;
  onNavigateToUsers?: () => void;
}

export const ProductCatalogView: React.FC<ProductCatalogViewProps> = ({
  catalog,
  onUpdateCatalog,
  suppliers = [],
  onSaveSupplier,
  onDeleteSupplier,
  onResetSuppliers,
  pulls = [],
  report030519 = [],
  blitzRecords = [],
  pncs = [],
  customAmbevLogo,
  customPauBrasilLogo,
  onUpdateAmbevLogo,
  onUpdatePauBrasilLogo,
  onOpenBrandingModal,
  onNavigateToUsers
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'suppliers' | 'branding'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAbc, setSelectedAbc] = useState<'ALL' | ABCClass>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(getStoredBrandSettings);

  useEffect(() => {
    const handleUpdate = () => setBrandSettings(getStoredBrandSettings());
    window.addEventListener('brand_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('brand_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const ambevInputRef = useRef<HTMLInputElement>(null);
  const pauBrasilInputRef = useRef<HTMLInputElement>(null);
  
  // Editing modal/state
  const [editingItem, setEditingItem] = useState<ProductCatalogItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New item draft
  const [newItem, setNewItem] = useState<ProductCatalogItem>({
    code: '',
    description: '',
    unit: 'cx12',
    category: 'Cerveja',
    price: 35.00,
    hectoliterFactor: 0.04,
    palletFactor: 120,
    lastroFactor: 12,
    abcClass: 'A',
    defaultShelfLifeDays: 180,
    packaging: '',
    factorSKU: 12,
    unitPrice: 0
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Reset to first page whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedAbc, selectedCategory, pageSize]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach(p => set.add(p.category || 'Geral'));
    return Array.from(set).sort();
  }, [catalog]);

  // Statistics & Pareto Share
  const stats = useMemo(() => {
    const countA = catalog.filter(p => p.abcClass === 'A').length;
    const countB = catalog.filter(p => p.abcClass === 'B').length;
    const countC = catalog.filter(p => p.abcClass === 'C').length;
    return { countA, countB, countC, total: catalog.length };
  }, [catalog]);

  const filtered = useMemo(() => {
    return catalog.filter(p => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = 
          p.code.toLowerCase().includes(q) || 
          p.description.toLowerCase().includes(q) ||
          (p.packaging && p.packaging.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (selectedAbc !== 'ALL' && p.abcClass !== selectedAbc) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      return true;
    });
  }, [catalog, searchTerm, selectedAbc, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedItems = useMemo(() => {
    if (pageSize >= 1000) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleSaveEdit = () => {
    if (!editingItem) return;
    if (!editingItem.description.trim()) {
      alert('A descrição do produto não pode ficar vazia.');
      return;
    }
    onUpdateCatalog(catalog.map(p => p.code === editingItem.code ? editingItem : p));
    setEditingItem(null);
  };

  const handleDeleteItem = (code: string, desc: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${code} - ${desc}" da base de cadastros?`)) {
      onUpdateCatalog(catalog.filter(p => p.code !== code));
    }
  };

  const handleCreateProduct = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItem.code.trim() || !newItem.description.trim()) {
      alert('Preencha o código SKU e a descrição do produto.');
      return;
    }
    if (catalog.some(p => p.code === newItem.code.trim())) {
      alert('Já existe um produto cadastrado com este código SKU.');
      return;
    }

    const created: ProductCatalogItem = {
      ...newItem,
      code: newItem.code.trim(),
      description: newItem.description.trim().toUpperCase(),
      rank: catalog.length + 1
    };

    onUpdateCatalog([...catalog, created]);
    setShowAddModal(false);
    setShowInlineCreate(false);
    setNewItem({
      code: '',
      description: '',
      unit: 'cx12',
      category: 'Cerveja',
      price: 35.00,
      unitPrice: 0,
      hectoliterFactor: 0.04,
      palletFactor: 120,
      lastroFactor: 12,
      factorSKU: 12,
      packaging: '',
      abcClass: 'A',
      defaultShelfLifeDays: 180
    });
  };

  const handleResetCatalogToDefault = () => {
    if (window.confirm('Deseja restaurar a base de produtos padrão atualizada com todos os 377+ itens da Ambev, com fatores de Pallet, Lastro, Hectolitro e Preços?')) {
      onUpdateCatalog(INITIAL_PRODUCTS);
      setExportSuccessMsg('Base de produtos restaurada com sucesso com todos os 377 SKUs padrão!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    }
  };

  const handleSyncNewFactors = () => {
    if (window.confirm(`Deseja sincronizar e atualizar os fatores (Hectolitro, Pallet, Lastro, Preço Total, Preço Unitário, Embalagem e Idade) de todos os 377+ produtos da base oficial Ambev? Quaisquer SKUs personalizados adicionados serão preservados.`)) {
      const map = new Map<string, ProductCatalogItem>();
      INITIAL_PRODUCTS.forEach(p => map.set(p.code, p));
      catalog.forEach(p => {
        const def = INITIAL_PRODUCTS.find(i => i.code === p.code);
        if (def) {
          map.set(p.code, {
            ...p,
            hectoliterFactor: def.hectoliterFactor,
            palletFactor: def.palletFactor,
            lastroFactor: def.lastroFactor,
            price: def.price,
            unitPrice: def.unitPrice,
            factorSKU: def.factorSKU,
            packaging: def.packaging,
            defaultShelfLifeDays: def.defaultShelfLifeDays || p.defaultShelfLifeDays,
            category: def.category || p.category
          });
        } else {
          map.set(p.code, p);
        }
      });
      const updated = Array.from(map.values()).sort((a, b) => (a.rank || 999) - (b.rank || 999));
      onUpdateCatalog(updated);
      setExportSuccessMsg('Base de produtos e fatores de paletização sincronizados com sucesso!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    }
  };

  // Image Upload Handlers
  const handleAmbevLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const updated = { ...brandSettings, secondaryLogoUrl: dataUrl };
        setBrandSettings(updated);
        saveStoredBrandSettings(updated);
        saveBrandSettingsToFirestore(updated).catch(err => console.error('Firestore brand sync error:', err));
        if (onUpdateAmbevLogo) {
          onUpdateAmbevLogo(dataUrl);
        }
        setExportSuccessMsg('Logotipo da Ambev atualizado com sucesso em toda a plataforma!');
        setTimeout(() => setExportSuccessMsg(null), 4000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePauBrasilLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const updated = { ...brandSettings, primaryLogoUrl: dataUrl };
        setBrandSettings(updated);
        saveStoredBrandSettings(updated);
        saveBrandSettingsToFirestore(updated).catch(err => console.error('Firestore brand sync error:', err));
        if (onUpdatePauBrasilLogo) {
          onUpdatePauBrasilLogo(dataUrl);
        }
        setExportSuccessMsg('Logotipo da Pau Brasil atualizado com sucesso em toda a plataforma!');
        setTimeout(() => setExportSuccessMsg(null), 4000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetPauBrasilLogo = () => {
    const updated = { ...brandSettings, primaryLogoUrl: null };
    setBrandSettings(updated);
    saveStoredBrandSettings(updated);
    saveBrandSettingsToFirestore(updated).catch(err => console.error('Firestore brand sync error:', err));
    if (onUpdatePauBrasilLogo) onUpdatePauBrasilLogo(null);
    setExportSuccessMsg('Logotipo padrão da Pau Brasil restaurado com sucesso!');
    setTimeout(() => setExportSuccessMsg(null), 3000);
  };

  const handleResetAmbevLogo = () => {
    const updated = { ...brandSettings, secondaryLogoUrl: null };
    setBrandSettings(updated);
    saveStoredBrandSettings(updated);
    saveBrandSettingsToFirestore(updated).catch(err => console.error('Firestore brand sync error:', err));
    if (onUpdateAmbevLogo) onUpdateAmbevLogo(null);
    setExportSuccessMsg('Logotipo padrão da Ambev restaurado com sucesso!');
    setTimeout(() => setExportSuccessMsg(null), 3000);
  };

  // Full Database Export
  const handleExportAllDatabases = () => {
    exportAllSystemBasesToExcel({
      catalog,
      pulls,
      blitzRecords,
      pncs,
      report030519,
      suppliers
    });
    setExportSuccessMsg('Backup de todas as bases de dados exportado com sucesso no formato Excel (.xlsx)!');
    setTimeout(() => setExportSuccessMsg(null), 4000);
  };

  const handleExportCatalogOnly = () => {
    const data = catalog.map(p => ({
      'Código SKU': p.code,
      'Descrição': p.description,
      'Unidade': p.unit,
      'Categoria': p.category,
      'Preço Unitário R$': p.price,
      'Fator Hectolitro': p.hectoliterFactor,
      'Fator Pallet': p.palletFactor,
      'Fator Lastro': p.lastroFactor,
      'Curva ABC (70/20/10)': p.abcClass,
      'Movimento Mensal': p.monthlyMovement || 0,
      '% Acumulado': p.cumulativeShare ? `${(p.cumulativeShare * 100).toFixed(1)}%` : '-',
      'Validade Padrão (Dias)': p.defaultShelfLifeDays
    }));
    exportDataToExcel(data, `BASE_CADASTROS_PRODUTOS_AMBEV_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* 1. HEADER BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PauBrasilLogo size="lg" customLogoUrl={customPauBrasilLogo} />
          <div className="border-l border-slate-200 pl-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#002B7F] tracking-tight uppercase font-mono">
                GUIA DE CADASTROS & GESTÃO DE DADOS
              </h1>
              <span className="text-xs bg-slate-900 text-amber-400 font-mono font-bold px-2.5 py-0.5 rounded-full">
                {stats.total} SKUs • {suppliers.length} FORNECEDORES
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Gerenciamento de produtos, fábricas e fornecedores, fatores de paletização, Curva ABC (70/20/10) e logos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigateToUsers && (
            <button
              type="button"
              onClick={onNavigateToUsers}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-amber-400 font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 border border-slate-700"
              title="Acessar Cadastro de Logins e Senhas"
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>Cadastro de Logins</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportAllDatabases}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95"
            title="Exportar Todas as Bases da Plataforma (Cadastros, Fornecedores, Puxadas, 03.05.19, Blitz, PNC)"
          >
            <Database className="w-4 h-4" />
            <span>Exportar Todas as Bases (.xlsx)</span>
          </button>

          {activeSubTab === 'products' && (
            <>
              <button
                type="button"
                onClick={handleSyncNewFactors}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 border border-blue-600"
                title="Sincronizar Fatores de Pallet, Lastro, HL e Preços com a base oficial (377 SKUs)"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Sincronizar Fatores (377 SKUs)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowInlineCreate(!showInlineCreate)}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Novo SKU</span>
                {showInlineCreate ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleResetCatalogToDefault}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-xs flex items-center gap-1"
                title="Restaurar Base Padrão Ambev (377 SKUs)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ALERT BANNER IF EXPORTED */}
      {exportSuccessMsg && (
        <div className="bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-md flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>{exportSuccessMsg}</span>
          </div>
          <button onClick={() => setExportSuccessMsg(null)} className="text-white/80 hover:text-white font-black">✕</button>
        </div>
      )}

      {/* SUB-TABS NAVIGATION: PRODUTOS | FORNECEDORES | LOGOS */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/90 rounded-2xl border border-slate-300 w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeSubTab === 'products'
              ? 'bg-[#002B7F] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catálogo de Produtos (SKUs)</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
            activeSubTab === 'products' ? 'bg-amber-400 text-slate-950' : 'bg-slate-300 text-slate-700'
          }`}>
            {stats.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeSubTab === 'suppliers'
              ? 'bg-[#002B7F] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Fábricas & Fornecedores</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
            activeSubTab === 'suppliers' ? 'bg-amber-400 text-slate-950' : 'bg-slate-300 text-slate-700'
          }`}>
            {suppliers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('branding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeSubTab === 'branding'
              ? 'bg-[#002B7F] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>Logomarcas & Identidade</span>
        </button>
      </div>

      {/* VIEW 1: FÁBRICAS & FORNECEDORES TAB */}
      {activeSubTab === 'suppliers' && (
        <SupplierManagementView 
          suppliers={suppliers}
          onSaveSupplier={onSaveSupplier || (() => {})}
          onDeleteSupplier={onDeleteSupplier || (() => {})}
          onResetSuppliers={onResetSuppliers}
        />
      )}

      {/* VIEW 2: LOGOS & BRANDING TAB */}
      {activeSubTab === 'branding' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Image className="w-5 h-5 text-blue-600" />
              <h2 className="font-black text-slate-900 text-sm uppercase tracking-tight font-mono">
                Upload & Personalização de Logomarcas (Cabeçalho & NRI)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Formatos aceitos: PNG, JPG, SVG, WebP</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* PAU BRASIL LOGO */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                  {brandSettings.primaryLogoUrl ? (
                    <img src={brandSettings.primaryLogoUrl} alt="Pau Brasil" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <PauBrasilLogo size="sm" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900">Logo Pau Brasil Distribuidora</h3>
                  <p className="text-[11px] text-slate-500">Exibida no topo e nas notas de recebimento (NRI)</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={pauBrasilInputRef}
                  onChange={handlePauBrasilLogoChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => pauBrasilInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo</span>
                </button>
                {brandSettings.primaryLogoUrl && (
                  <button
                    type="button"
                    onClick={handleResetPauBrasilLogo}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg text-xs"
                    title="Restaurar padrão"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* AMBEV LOGO */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 bg-slate-900 rounded-lg border border-slate-800 p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                  {brandSettings.secondaryLogoUrl ? (
                    <img src={brandSettings.secondaryLogoUrl} alt="Ambev" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="font-black text-amber-400 tracking-tighter text-sm font-mono">ambev</span>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900">Logo Ambev Oficial</h3>
                  <p className="text-[11px] text-slate-500">Exibida nos documentos operacionais e cabeçalho</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={ambevInputRef}
                  onChange={handleAmbevLogoChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => ambevInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-amber-400 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo</span>
                </button>
                {brandSettings.secondaryLogoUrl && (
                  <button
                    type="button"
                    onClick={handleResetAmbevLogo}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg text-xs"
                    title="Restaurar padrão"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW 3: PRODUCT CATALOG TAB */}
      {activeSubTab === 'products' && (
        <>
          {/* 3. CURVA ABC PARETO 70/20/10 STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase text-slate-400">Total de Produtos</div>
                <div className="text-xl font-black text-slate-900 font-mono">{stats.total} SKUs</div>
              </div>
              <Package className="w-6 h-6 text-slate-400" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase text-emerald-800">Curva A (70% Volume)</div>
                <div className="text-xl font-black text-emerald-700 font-mono">{stats.countA} SKUs</div>
              </div>
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-xs">A</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase text-amber-800">Curva B (20% Volume)</div>
                <div className="text-xl font-black text-amber-700 font-mono">{stats.countB} SKUs</div>
              </div>
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs">B</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase text-red-800">Curva C (10% Volume)</div>
                <div className="text-xl font-black text-red-700 font-mono">{stats.countC} SKUs</div>
              </div>
              <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black flex items-center justify-center text-sm shadow-xs">C</span>
            </div>
          </div>


      {/* INLINE PRODUCT CREATION FORM (EXPANDABLE) */}
      {showInlineCreate && (
        <form 
          onSubmit={handleCreateProduct}
          className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400 stroke-[3]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 font-mono">
                Cadastrar Novo Item na Base de Dados (Ambev / Pau Brasil Guarabira)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowInlineCreate(false)}
              className="text-slate-400 hover:text-white font-bold text-xs"
            >
              ✕ Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Código SKU *</label>
              <input
                type="text"
                required
                value={newItem.code}
                onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                placeholder="Ex: 34608"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block font-bold text-slate-300 mb-1">Descrição Completa do Produto *</label>
              <input
                type="text"
                required
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Ex: SKOL LATA 350ML SH C/12 NPAL MULTIPACK"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-semibold text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Unidade</label>
              <input
                type="text"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                placeholder="Ex: cx12, Dz, cx23, cx24"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Curva ABC *</label>
              <select
                value={newItem.abcClass}
                onChange={(e) => setNewItem({ ...newItem, abcClass: e.target.value as ABCClass })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              >
                <option value="A">Curva A (Verde)</option>
                <option value="B">Curva B (Amarelo)</option>
                <option value="C">Curva C (Vermelho)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Categoria</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-semibold text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Cerveja">Cerveja</option>
                <option value="NAB">NAB (Refrigerante/Água/Suco)</option>
                <option value="Match">Match / Beats</option>
                <option value="Destilados">Destilados / Vinhos</option>
                <option value="Marketplace">Marketplace / Alimentos</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-amber-400 mb-1">Fator Pallet (Plts) *</label>
              <input
                type="number"
                required
                min={1}
                value={newItem.palletFactor}
                onChange={(e) => setNewItem({ ...newItem, palletFactor: Number(e.target.value) })}
                placeholder="Ex: 160"
                className="w-full bg-slate-800 border border-amber-500/50 rounded-xl p-2.5 font-mono font-black text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-blue-400 mb-1">Fator Lastro *</label>
              <input
                type="number"
                required
                min={1}
                value={newItem.lastroFactor}
                onChange={(e) => setNewItem({ ...newItem, lastroFactor: Number(e.target.value) })}
                placeholder="Ex: 16"
                className="w-full bg-slate-800 border border-blue-500/50 rounded-xl p-2.5 font-mono font-black text-blue-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Fator Hectolitro (HL)</label>
              <input
                type="number"
                step="0.01"
                value={newItem.hectoliterFactor}
                onChange={(e) => setNewItem({ ...newItem, hectoliterFactor: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Preço Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Validade Padrão (Dias)</label>
              <input
                type="number"
                value={newItem.defaultShelfLifeDays || 180}
                onChange={(e) => setNewItem({ ...newItem, defaultShelfLifeDays: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Cadastro na Base</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* FILTER AND SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por código SKU ou descrição (ex: 34608, 9067, Budweiser, Spaten, Skol, Brahma)..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">Curva ABC:</span>
            <select
              value={selectedAbc}
              onChange={(e) => setSelectedAbc(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-700"
            >
              <option value="ALL">Todas as Curvas ({stats.total})</option>
              <option value="A">Curva A ({stats.countA})</option>
              <option value="B">Curva B ({stats.countB})</option>
              <option value="C">Curva C ({stats.countC})</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-700"
            >
              <option value="ALL">Todas Categorias</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" />
            <span>Lista Completa de Produtos ({filtered.length} de {catalog.length} exibidos)</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Clique no ícone de lápis para editar fatores e curva de qualquer produto
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold text-[11px] border-b border-slate-200 uppercase">
                <th className="p-3 w-14 text-center">Rank</th>
                <th className="p-3 w-24">Código SKU</th>
                <th className="p-3 min-w-[260px]">Descrição do Produto</th>
                <th className="p-3 w-28">Embalagem</th>
                <th className="p-3 w-20 text-center">Curva ABC</th>
                <th className="p-3 w-16 text-center">Unidade</th>
                <th className="p-3 w-24 text-center bg-amber-50/70 font-black text-amber-950 border-x border-amber-200">
                  Fator Pallet
                </th>
                <th className="p-3 w-24 text-center bg-blue-50/70 font-black text-blue-950 border-r border-blue-200">
                  Fator Lastro
                </th>
                <th className="p-3 w-20 text-center bg-slate-100 font-bold">Fator HL</th>
                <th className="p-3 w-24 text-right bg-emerald-50/70 font-bold text-emerald-950">Preço Caixa</th>
                <th className="p-3 w-24 text-right text-slate-700">Preço Unit.</th>
                <th className="p-3 w-20 text-center">Validade</th>
                <th className="p-3 w-20 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">Nenhum produto encontrado com os filtros selecionados.</p>
                    <button
                      type="button"
                      onClick={() => setShowInlineCreate(true)}
                      className="mt-2 text-amber-600 hover:underline font-bold"
                    >
                      + Cadastrar novo produto agora
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => (
                  <tr key={item.code} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center font-mono text-slate-400 font-bold">
                      {item.rank || ((currentPage - 1) * pageSize + idx + 1)}
                    </td>
                    <td className="p-3">
                      <span className="inline-block font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-xs">
                        {item.code}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      <div>{item.description}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.category || 'Geral'}</div>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-600">
                      {item.packaging || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span 
                        className="inline-block px-2.5 py-0.5 rounded text-xs font-black shadow-xs"
                        style={{
                          backgroundColor: item.abcClass === 'A' ? '#16a34a' : item.abcClass === 'B' ? '#eab308' : '#ef4444',
                          color: item.abcClass === 'B' ? '#000000' : '#ffffff'
                        }}
                      >
                        {item.abcClass}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {item.unit}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-amber-800 bg-amber-50/40 border-x border-amber-100">
                      {item.palletFactor}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-blue-800 bg-blue-50/40 border-r border-blue-100">
                      {item.lastroFactor}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-700 bg-slate-50/50">
                      {item.hectoliterFactor}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-800 font-bold bg-emerald-50/30">
                      {formatBRL(item.price)}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      {item.unitPrice ? formatBRL(item.unitPrice) : '-'}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {item.defaultShelfLifeDays || 180} d
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                          title="Editar Cadastro & Fatores"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.code, item.description)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Excluir Produto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {filtered.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Exibindo <strong>{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> a <strong>{Math.min(filtered.length, currentPage * pageSize)}</strong> de <strong>{filtered.length}</strong> produtos</span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span>Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-700"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={9999}>Todos ({filtered.length})</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                >
                  ««
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                >
                  « Anterior
                </button>
                <span className="px-3 py-1 font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                >
                  Próxima »
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                >
                  »»
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* EDIT MODAL - FULL FIELD PERMISSION TO EDIT */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">
                  Editar Cadastro & Fatores: SKU {editingItem.code}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição do Produto *</label>
                <input
                  type="text"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Curva ABC</label>
                  <select
                    value={editingItem.abcClass}
                    onChange={(e) => setEditingItem({ ...editingItem, abcClass: e.target.value as ABCClass })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="A">Curva A (Verde)</option>
                    <option value="B">Curva B (Amarelo)</option>
                    <option value="C">Curva C (Vermelho)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidade</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={editingItem.category || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Embalagem</label>
                  <input
                    type="text"
                    value={editingItem.packaging || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, packaging: e.target.value })}
                    placeholder="Ex: LATA 350ML, RETORNÁVEL 600ML"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fator SKU (Unidades/Cx)</label>
                  <input
                    type="number"
                    value={editingItem.factorSKU || 1}
                    onChange={(e) => setEditingItem({ ...editingItem, factorSKU: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
              </div>

              {/* HIGHLIGHTED PALLET & LASTRO FACTORS */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                <div>
                  <label className="block font-black text-amber-900 mb-1">Fator Pallet (Plts)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.palletFactor}
                    onChange={(e) => setEditingItem({ ...editingItem, palletFactor: Number(e.target.value) })}
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 font-mono font-black text-amber-950"
                  />
                  <span className="text-[10px] text-amber-700">Qtd de caixas por pallet</span>
                </div>

                <div>
                  <label className="block font-black text-blue-900 mb-1">Fator Lastro</label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.lastroFactor}
                    onChange={(e) => setEditingItem({ ...editingItem, lastroFactor: Number(e.target.value) })}
                    className="w-full bg-white border border-blue-300 rounded-lg p-2 font-mono font-black text-blue-950"
                  />
                  <span className="text-[10px] text-blue-700">Qtd por camada de lastro</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fator HL</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editingItem.hectoliterFactor}
                    onChange={(e) => setEditingItem({ ...editingItem, hectoliterFactor: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preço Caixa (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preço Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.unitPrice || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, unitPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Validade (Dias)</label>
                  <input
                    type="number"
                    value={editingItem.defaultShelfLifeDays || 180}
                    onChange={(e) => setEditingItem({ ...editingItem, defaultShelfLifeDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
