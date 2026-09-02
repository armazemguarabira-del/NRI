import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PlusCircle, 
  Printer, 
  FileText, 
  History, 
  TrendingUp, 
  Package, 
  Layers, 
  Sliders, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Search, 
  Check, 
  LogOut, 
  Sun, 
  Clock, 
  ChevronRight, 
  Image as ImageIcon,
  AlertTriangle,
  Building2,
  ShieldCheck,
  UserCheck,
  Zap,
  ShieldAlert,
  SlidersHorizontal,
  Flame,
  FileSpreadsheet,
  Database,
  Key,
  Users
} from 'lucide-react';
import { PauBrasilLogo } from './PauBrasilLogo';
import { getStoredBrandSettings, BrandSettings } from '../utils/branding';

export type NavTabType = 
  | 'analytics' 
  | 'new_pull' 
  | 'history' 
  | 'blitz' 
  | 'pnc' 
  | 'alerts' 
  | 'report_030519' 
  | 'catalog' 
  | 'users'
  | 'database'
  | 'print_labels' 
  | 'conference_sheet';

interface SidebarProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  alertCount: number;
  totalPullsCount: number;
  blitzCount?: number;
  pncCount?: number;
  onOpenBrandingModal: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  collaboratorName?: string;
  collaboratorRole?: string;
  onLogout?: () => void;
}

interface NavItemConfig {
  id: NavTabType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  totalPullsCount,
  blitzCount = 0,
  pncCount = 0,
  onOpenBrandingModal,
  isCollapsed,
  setIsCollapsed,
  collaboratorName = 'NIXON HENRIQUE PEREIRA DE ...',
  collaboratorRole = 'ADMINISTRAÇÃO & NRI',
  onLogout
}) => {
  const [brand, setBrand] = useState<BrandSettings>(getStoredBrandSettings);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to branding updates
  useEffect(() => {
    const handleBrandChange = () => setBrand(getStoredBrandSettings());
    window.addEventListener('brand_settings_updated', handleBrandChange);
    return () => window.removeEventListener('brand_settings_updated', handleBrandChange);
  }, []);

  const navItems: NavItemConfig[] = [
    {
      id: 'analytics',
      title: 'DASHBOARD & BI',
      subtitle: 'Indicadores, Avarias & Gráficos',
      icon: BarChart3,
      iconBg: 'bg-blue-600',
      iconColor: 'text-white',
    },
    {
      id: 'new_pull',
      title: 'WORKSTATION',
      subtitle: 'Centro de Controle & Nova Puxada',
      icon: Layers,
      iconBg: 'bg-amber-500',
      iconColor: 'text-slate-950',
    },
    {
      id: 'history',
      title: 'HISTÓRICO',
      subtitle: 'Auditoria & Base de Puxadas',
      icon: History,
      iconBg: 'bg-slate-700',
      iconColor: 'text-amber-400',
      badge: totalPullsCount > 0 ? totalPullsCount : undefined,
      badgeColor: 'bg-slate-800 text-amber-400 border border-slate-600'
    },
    {
      id: 'blitz',
      title: 'BLITZ DE PUXADA',
      subtitle: 'Retrabalho & Avarias por Pallet',
      icon: Zap,
      iconBg: 'bg-amber-600',
      iconColor: 'text-white',
      badge: blitzCount > 0 ? blitzCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-black'
    },
    {
      id: 'pnc',
      title: 'PNC & BLOQUEIO',
      subtitle: 'Tratamento de Não Conformidades',
      icon: ShieldAlert,
      iconBg: 'bg-red-600',
      iconColor: 'text-white',
      badge: pncCount > 0 ? pncCount : undefined,
      badgeColor: 'bg-red-500 text-white font-black'
    },
    {
      id: 'alerts',
      title: 'ALERTAS DE VALIDADE',
      subtitle: 'Shelf Life & Risco Crítico',
      icon: AlertTriangle,
      iconBg: 'bg-rose-600',
      iconColor: 'text-white',
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: 'bg-rose-500 text-white font-black animate-pulse'
    },
    {
      id: 'report_030519',
      title: '03.05.19 & PARETO',
      subtitle: 'Curva ABC 70/20/10 & Escoamento',
      icon: TrendingUp,
      iconBg: 'bg-sky-600',
      iconColor: 'text-white',
    },
    {
      id: 'catalog',
      title: 'CADASTROS & LOGOS',
      subtitle: 'Exportação Bases & Logomarcas',
      icon: Package,
      iconBg: 'bg-teal-600',
      iconColor: 'text-white',
    },
    {
      id: 'users',
      title: 'CADASTRO DE LOGINS',
      subtitle: 'Gestão de Usuários & Senhas',
      icon: Key,
      iconBg: 'bg-amber-600',
      iconColor: 'text-white',
    },
    {
      id: 'database',
      title: 'BASE DE DADOS & RESET',
      subtitle: 'Exportar CSV/JSON & Limpar Bases',
      icon: Database,
      iconBg: 'bg-blue-700',
      iconColor: 'text-white',
    },
    {
      id: 'print_labels',
      title: 'ETIQUETAS PALLET',
      subtitle: 'Impressão 4 Faces por Pallet',
      icon: Printer,
      iconBg: 'bg-indigo-600',
      iconColor: 'text-white',
    },
    {
      id: 'conference_sheet',
      title: 'ESPELHO CONFERÊNCIA',
      subtitle: 'Planilha & Inspeção da Carga',
      icon: FileText,
      iconBg: 'bg-emerald-600',
      iconColor: 'text-white',
    }
  ];

  const filteredItems = navItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={`print:hidden bg-[#0a1120] text-slate-100 flex flex-col border-r border-slate-800/80 transition-all duration-300 ease-in-out shrink-0 z-30 shadow-2xl ${
        isCollapsed ? 'w-20' : 'w-72 lg:w-80'
      }`}
    >
      {/* 1. TOP HEADER & LOGO + MINIMIZE / MAXIMIZE TOGGLE */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2 bg-[#080d1a]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* White rounded container for Logo */}
            <div 
              onClick={onOpenBrandingModal}
              className="cursor-pointer bg-white p-1.5 rounded-2xl shadow-md shrink-0 flex items-center justify-center hover:scale-105 transition-transform"
              title="Configurar Logotipos"
            >
              <PauBrasilLogo size="sm" variant="icon_only" />
            </div>

            <div className="flex flex-col truncate">
              <div className="flex items-center gap-1">
                <span className="font-black text-sm tracking-tight text-blue-400">
                  PAU
                </span>
                <span className="font-black text-sm tracking-tight text-white">
                  BRASIL
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                DISTRIBUIDORA <strong className="text-blue-400">AMBEV</strong>
              </span>
            </div>
          </div>
        ) : (
          <div 
            onClick={onOpenBrandingModal}
            className="cursor-pointer bg-white p-1.5 rounded-2xl shadow-md mx-auto flex items-center justify-center hover:scale-105 transition-transform"
            title="Logotipo Pau Brasil Ambev"
          >
            <PauBrasilLogo size="sm" variant="icon_only" />
          </div>
        )}

        {/* MINIMIZE / MAXIMIZE BUTTON */}
        <button
          type="button"
          onClick={() => setIsCollapsed(prev => !prev)}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors shrink-0 shadow-xs"
          title={isCollapsed ? "Maximizar / Expandir Painel Lateral" : "Minimizar Painel Lateral (Somente Ícones)"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-amber-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* 2. USER PROFILE & COLLABORATOR CARD (Only if expanded) */}
      {!isCollapsed && (
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="bg-[#0e172a] rounded-2xl p-3 border border-slate-800/90 shadow-inner space-y-2.5">
            <div className="flex items-center gap-2.5">
              {/* Avatar circle */}
              <div className="w-9 h-9 rounded-full bg-blue-900/80 border border-blue-500/40 text-blue-300 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                NH
              </div>
              <div className="overflow-hidden leading-tight">
                <div className="text-[9px] font-extrabold text-blue-400 uppercase tracking-wider">
                  COLABORADOR
                </div>
                <div className="text-xs font-black text-white truncate" title={collaboratorName}>
                  {collaboratorName}
                </div>
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{collaboratorRole}</span>
                </div>
              </div>
            </div>

            {/* Status & Quick Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/70">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-black tracking-wide">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>ATIVO</span>
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenBrandingModal}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                  title="Upload e Gestão de Logotipos"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Unidade Conectada: ${brand.unitLocation} - ${brand.companyName}`)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold transition-colors"
                  title="Status da Sessão"
                >
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  <span>CDD PB</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEARCH INPUT (Only if expanded) */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar guia ou módulo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0e172a] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>
      )}

      {/* 4. NAVIGATION MODULES (MEDIUM ICONS & BALANCED SPACING) */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-1.5">
        {filteredItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          if (isCollapsed) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-center p-2 rounded-2xl transition-all relative group ${
                  isActive
                    ? 'bg-blue-600/30 border-2 border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-[#0e172a]/60 hover:bg-[#131e36] border border-slate-800/80 hover:border-slate-700'
                }`}
                title={`${item.title} - ${item.subtitle}`}
              >
                {/* Medium Icon */}
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shadow-md shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>

                {item.badge !== undefined && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-amber-500 text-slate-950 font-mono font-black text-[9px] rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}

                {/* Floating Tooltip on Hover in Collapsed mode */}
                <div className="hidden group-hover:block absolute left-full ml-3 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-xl z-50 pointer-events-none">
                  {item.title}
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left p-2 rounded-2xl transition-all border flex items-center justify-between gap-3 group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-950/80 to-[#101b33] border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                  : 'bg-[#0e172a]/80 hover:bg-[#131f38] border-slate-800/90 hover:border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {/* Medium Icon Container */}
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Title and Subtitle */}
                <div className="overflow-hidden leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-black tracking-tight uppercase truncate ${
                      isActive ? 'text-white font-extrabold' : 'text-slate-200'
                    }`}>
                      {item.title}
                    </span>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor || 'bg-amber-500 text-slate-950'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              {/* Right Chevron */}
              <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                isActive ? 'text-blue-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5'
              }`} />
            </button>
          );
        })}
      </div>

      {/* 5. BOTTOM STATUS FOOTER WITH CLOCK & ONLINE BADGE */}
      <div className="p-3 border-t border-slate-800/80 bg-[#080d1a] space-y-2">
        {!isCollapsed ? (
          <>
            {/* Clock & Online */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 text-blue-400 font-mono font-bold text-xs">
                <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>{currentTime || '16:07:01'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 font-bold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>ONLINE</span>
              </div>
            </div>

            {/* Logout Button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                title="Encerrar sessão atual e voltar para a tela de login"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>Sair do Sistema</span>
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex flex-col items-center justify-center gap-1 text-[9px] text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ON</span>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-white transition-colors"
                title="Sair do Sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
