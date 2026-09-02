import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  RotateCcw, 
  Check, 
  X, 
  Trash2, 
  Sparkles, 
  Eye, 
  Printer, 
  Building2,
  FileCheck
} from 'lucide-react';
import { 
  BrandSettings, 
  getStoredBrandSettings, 
  saveStoredBrandSettings, 
  resetBrandSettings,
  DEFAULT_BRAND_SETTINGS 
} from '../utils/branding';
import { saveBrandSettingsToFirestore } from '../services/firebase';
import { PauBrasilLogo } from './PauBrasilLogo';

interface BrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandingModal: React.FC<BrandingModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<BrandSettings>(getStoredBrandSettings);
  const [isDragging, setIsDragging] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const secFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File, target: 'primary' | 'secondary') => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WEBP).');
      return;
    }

    // Limit file size (max 4MB for localStorage)
    if (file.size > 4 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha um arquivo com menos de 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (target === 'primary') {
        const updated = { ...settings, primaryLogoUrl: dataUrl };
        setSettings(updated);
        saveStoredBrandSettings(updated);
        saveBrandSettingsToFirestore(updated).catch(err => console.error('Firestore brand sync error:', err));
      } else {
        const updated = { ...settings, secondaryLogoUrl: dataUrl };
        setSettings(updated);
        saveStoredBrandSettings(updated);
        saveBrandSettingsToFirestore(updated).catch(err => console.error('Firestore brand sync error:', err));
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePrimaryLogo = () => {
    const updated = { ...settings, primaryLogoUrl: null };
    setSettings(updated);
    saveStoredBrandSettings(updated);
    saveBrandSettingsToFirestore(updated).catch(err => console.error('Firestore brand sync error:', err));
  };

  const handleRemoveSecondaryLogo = () => {
    const updated = { ...settings, secondaryLogoUrl: null };
    setSettings(updated);
    saveStoredBrandSettings(updated);
    saveBrandSettingsToFirestore(updated).catch(err => console.error('Firestore brand sync error:', err));
  };

  const handleSaveTextChanges = () => {
    saveStoredBrandSettings(settings);
    saveBrandSettingsToFirestore(settings).catch(err => console.error('Firestore brand sync error:', err));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleFullReset = () => {
    if (window.confirm('Deseja restaurar todas as configurações de logotipo e textos para o padrão original?')) {
      const reset = resetBrandSettings();
      setSettings(reset);
      saveBrandSettingsToFirestore(reset).catch(err => console.error('Firestore brand sync error:', err));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Logotipos & Identidade Visual (Sistema e Etiquetas NRI)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Faça o upload do logotipo da Pau Brasil / Ambev para aplicar na barra superior, nas etiquetas e no espelho de conferência.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors font-bold text-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK SUCCESS BADGE */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            <span>Identidade visual atualizada com sucesso! Todas as telas e etiquetas já foram sincronizadas.</span>
          </div>
        )}

        {/* PRIMARY LOGO UPLOAD SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>Logotipo Principal da Distribuidora</span>
            </label>
            {settings.primaryLogoUrl && (
              <button
                type="button"
                onClick={handleRemovePrimaryLogo}
                className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Usar Logo Vetorial Padrão</span>
              </button>
            )}
          </div>

          {/* DRAG & DROP OR FILE PICKER */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0], 'primary');
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-amber-500 bg-amber-50/50 scale-[0.99]' 
                : 'border-slate-300 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/svg+xml, image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0], 'primary');
                }
              }}
            />

            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-amber-600">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  <span className="text-amber-600 underline">Clique para selecionar</span> ou arraste a imagem do seu logo aqui
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Formatos suportados: PNG transparente, JPG, SVG, WebP (Recomendado: fundo transparente)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* LIVE PREVIEW SECTION */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Pré-visualização ao Vivo</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {settings.primaryLogoUrl ? '✓ Logo personalizado ativo' : '✓ Logotipo vetorial padrão'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Navbar Preview */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <PauBrasilLogo size="md" variant="horizontal" darkMode={true} />
            </div>

            {/* Print Label Header Preview */}
            <div className="bg-white text-slate-900 p-3 rounded-xl border border-slate-300 flex items-center justify-between">
              <PauBrasilLogo size="md" variant="horizontal" />
              <div className="text-right">
                <div className="text-xs font-black text-[#002B7F] font-mono leading-none">
                  {settings.companyName}
                </div>
                <div className="text-[8px] font-bold text-slate-600 uppercase">
                  {settings.subtitle}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TEXT AND UNIT CUSTOMIZATION */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
            Textos do Cabeçalho da Puxada e das Etiquetas NRI
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Nome da Empresa / CDD</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Unidade / Localização</label>
              <input
                type="text"
                value={settings.unitLocation}
                onChange={(e) => setSettings({ ...settings, unitLocation: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Subtítulo Operacional</label>
              <input
                type="text"
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleFullReset}
            className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={() => {
                handleSaveTextChanges();
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md active:scale-95 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar & Aplicar em Toda a Plataforma</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
