import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Image as ImageIcon, 
  AlertTriangle, 
  Calendar, 
  Layers, 
  Printer, 
  FileSpreadsheet, 
  Sparkles, 
  Menu, 
  PanelLeftOpen, 
  PanelLeftClose, 
  Zap, 
  ShieldAlert,
  Cloud,
  Wifi
} from 'lucide-react';
import { PauBrasilLogo } from './PauBrasilLogo';
import { getStoredBrandSettings, BrandSettings } from '../utils/branding';
import { NavTabType } from './Sidebar';

interface TopBarProps {
  activeTab: NavTabType;
  alertCount: number;
  onOpenBrandingModal: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  onNavigate: (tab: NavTabType) => void;
}

const TAB_TITLES: Record<NavTabType, { title: string; subtitle: string }> = {
  analytics: {
    title: 'DASHBOARD & INDICADORES DE DESEMPENHO',
    subtitle: 'Índices de avarias, perdas financeiras, rankings de fábricas/pallets e distribuição Pareto 70/20/10'
  },
  new_pull: {
    title: 'WORKSTATION • NOVA PUXADA / LANÇAMENTO NRI',
    subtitle: 'Registro de entrada física, conferência por carreta, cálculo automático de validade e geração de etiquetas'
  },
  history: {
    title: 'HISTÓRICO DE PUXADAS & AUDITORIA MÊS A MÊS',
    subtitle: 'Consulta de todas as puxadas recebidas, busca avançada por NF/Fábrica e exportação consolidada'
  },
  blitz: {
    title: 'BLITZ DE PUXADA • RETRABALHO & AVARIAS POR PALLET',
    subtitle: 'Inspeção minuciosa de avarias, conferência de quebras/vazamentos e direcionamento para tratamento fiscal'
  },
  pnc: {
    title: 'PNC • PRODUTO NÃO CONFORME & BLOQUEIO FISCAL',
    subtitle: 'Tratamento de avarias de transporte, divergências de qualidade e protocolos Promax/Ambev'
  },
  alerts: {
    title: 'ALERTAS DE VALIDADE & RISCO CRÍTICO',
    subtitle: 'Monitoramento FEFO/FIFO de shelf life inferior a 90 dias com ações prioritárias de escoamento'
  },
  report_030519: {
    title: 'RELATÓRIO 03.05.19 & CURVA ABC PARETO (70/20/10)',
    subtitle: 'Importação universal de arquivos (Excel, CSV, TXT) com sincronização imediata de giro e velocidade diária'
  },
  catalog: {
    title: 'CADASTROS, LOGOTIPOS & EXPORTAÇÃO GERAL',
    subtitle: 'Upload de logos Ambev / Pau Brasil, backup completo das bases de dados em Excel e parâmetros de SKU'
  },
  users: {
    title: 'CADASTRO DE LOGINS & GESTÃO DE ACESSOS',
    subtitle: 'Cadastre e gerencie usuários, senhas operacionais e níveis de permissão do sistema Pau Brasil'
  },
  database: {
    title: 'GESTÃO DA BASE DE DADOS & RESET',
    subtitle: 'Exportação completa em CSV e JSON estruturado, métricas de prejuízo financeiro e hectolitros e limpeza geral'
  },
  print_labels: {
    title: 'CENTRAL DE IMPRESSÃO DE ETIQUETAS NRI',
    subtitle: 'Identificação padrão Ambev de 4 faces por pallet com curva ABC colorida e datas em destaque'
  },
  conference_sheet: {
    title: 'ESPELHO OFICIAL DE CONFERÊNCIA DA CARRETA',
    subtitle: 'Planilha física para conferência na doca, assinaturas e conferência de lacres e avarias'
  }
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  alertCount,
  onOpenBrandingModal,
  isCollapsed,
  setIsCollapsed,
  onNavigate
}) => {
  const [brand, setBrand] = useState<BrandSettings>(getStoredBrandSettings);

  useEffect(() => {
    const handleUpdate = () => setBrand(getStoredBrandSettings());
    window.addEventListener('brand_settings_updated', handleUpdate);
    return () => window.removeEventListener('brand_settings_updated', handleUpdate);
  }, []);

  const tabInfo = TAB_TITLES[activeTab] || {
    title: 'SISTEMA DE CONTROLE NRI',
    subtitle: 'Distribuidora Pau Brasil Ambev'
  };

  return (
    <header className="print:hidden bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-xs px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left: Hamburger / Toggle & View Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title={isCollapsed ? "Expandir Painel Lateral" : "Minimizar Painel Lateral"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-amber-600" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-slate-600" />
            )}
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
              {tabInfo.title}
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              {tabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Operational Status & Branding Button */}
        <div className="flex items-center gap-2.5">
          {/* Cloud Database Connected Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-xl text-[11px] font-black text-emerald-800" title="Banco de dados Firebase Firestore conectado em tempo real">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Firebase Online</span>
          </div>

          {/* Alert Badge -> Direct link to 'alerts' */}
          {alertCount > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('alerts')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded-xl text-xs font-black animate-pulse shadow-xs"
              title={`${alertCount} lotes com validade crítica (< 3 meses). Clique para ver detalhes.`}
            >
              <AlertTriangle className="w-4 h-4 text-red-600 stroke-[2.5]" />
              <span>{alertCount} Alertas</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
