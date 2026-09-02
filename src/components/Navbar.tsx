import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  BarChart3, 
  History, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  PlusCircle,
  Truck,
  Image as ImageIcon,
  Sliders
} from 'lucide-react';
import { PauBrasilLogo } from './PauBrasilLogo';
import { getStoredBrandSettings, BrandSettings } from '../utils/branding';

interface NavbarProps {
  activeTab: 'analytics' | 'new_pull' | 'print_labels' | 'conference_sheet' | 'history' | 'report_030519' | 'catalog';
  setActiveTab: (tab: 'analytics' | 'new_pull' | 'print_labels' | 'conference_sheet' | 'history' | 'report_030519' | 'catalog') => void;
  alertCount: number;
  totalPullsCount: number;
  onOpenBrandingModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  totalPullsCount,
  onOpenBrandingModal
}) => {
  const [brand, setBrand] = useState<BrandSettings>(getStoredBrandSettings);

  useEffect(() => {
    const handleUpdate = () => {
      setBrand(getStoredBrandSettings());
    };
    window.addEventListener('brand_settings_updated', handleUpdate);
    return () => window.removeEventListener('brand_settings_updated', handleUpdate);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-xl print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Operational Unit */}
          <div className="flex items-center gap-3">
            <div 
              onClick={onOpenBrandingModal}
              title="Clique para alterar ou fazer upload de logotipo"
              className="group cursor-pointer flex items-center gap-2.5 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-amber-500/50 shadow-xs transition-all"
            >
              <PauBrasilLogo size="md" variant="horizontal" darkMode={true} />
              <div className="w-px h-6 bg-slate-700 mx-0.5" />
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 font-mono">
                  {brand.unitLocation}
                </span>
                <span className="text-[9px] font-semibold text-slate-300">
                  SISTEMA NRI
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items: DASHBOARD FIRST */}
          <nav className="flex items-center space-x-1 overflow-x-auto py-1">
            
            {/* 1. DASHBOARD & DESEMPENHO */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {/* 2. NOVA PUXADA / NRI */}
            <button
              onClick={() => setActiveTab('new_pull')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'new_pull'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Puxada / NRI</span>
            </button>

            {/* 3. ETIQUETAS DE PALLET */}
            <button
              onClick={() => setActiveTab('print_labels')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'print_labels'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Etiquetas de Pallet</span>
            </button>

            {/* 4. ESPELHO DE CONFERÊNCIA */}
            <button
              onClick={() => setActiveTab('conference_sheet')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'conference_sheet'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Espelho de Conferência</span>
            </button>

            {/* 5. ACOMP. MÊS A MÊS */}
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Acomp. Mês a Mês</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-[10px] rounded-full text-slate-300 font-mono">
                {totalPullsCount}
              </span>
            </button>

            {/* 6. 03.05.19 ESCOAMENTO */}
            <button
              onClick={() => setActiveTab('report_030519')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'report_030519'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>03.05.19 Escoamento</span>
            </button>

            {/* 7. BASE & CURVA ABC */}
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Base & Curva ABC</span>
            </button>
          </nav>

          {/* Quick Actions / Branding & Alerts */}
          <div className="flex items-center gap-2.5">
            {onOpenBrandingModal && (
              <button
                type="button"
                onClick={onOpenBrandingModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 hover:border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-xs"
                title="Configurar Logotipo & Imagens da Empresa"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload Logo</span>
              </button>
            )}

            {alertCount > 0 ? (
              <div 
                onClick={() => setActiveTab('history')}
                className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-red-300 text-xs font-bold animate-pulse"
                title={`${alertCount} itens com alerta de validade (< 3 meses ou prazo curto)`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden md:inline">{alertCount} Alertas</span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Prazos Normais</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
