import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Download, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { PullRecord } from '../types';
import { formatDateBR, formatBRL, getAbcBadgeColor } from '../utils/nriCalculations';
import { PauBrasilLogo } from './PauBrasilLogo';
import { getStoredBrandSettings, BrandSettings } from '../utils/branding';
import { BrandingModal } from './BrandingModal';

interface NRIConferenceSheetPrintViewProps {
  currentPull?: PullRecord | null;
  pull?: PullRecord | null;
  onBackToForm?: () => void;
  onBack?: () => void;
  onGoToLabels?: () => void;
  onOpenBrandingModal?: () => void;
}

export const NRIConferenceSheetPrintView: React.FC<NRIConferenceSheetPrintViewProps> = ({
  currentPull: propCurrentPull,
  pull: propPull,
  onBackToForm,
  onBack,
  onGoToLabels,
  onOpenBrandingModal
}) => {
  const currentPull = propPull !== undefined ? propPull : propCurrentPull;
  const handleBack = onBack || onBackToForm;

  const [brand, setBrand] = useState<BrandSettings>(getStoredBrandSettings);
  const [showLocalBrandingModal, setShowLocalBrandingModal] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setBrand(getStoredBrandSettings());
    window.addEventListener('brand_settings_updated', handleUpdate);
    return () => window.removeEventListener('brand_settings_updated', handleUpdate);
  }, []);

  const triggerBrandingModal = onOpenBrandingModal || (() => setShowLocalBrandingModal(true));

  if (!currentPull) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white rounded-3xl shadow-sm border border-slate-200 my-8">
        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Nenhuma Puxada Selecionada</h2>
        <p className="text-xs text-slate-500 mb-4">Selecione uma puxada para visualizar o espelho de conferência.</p>
        {handleBack && (
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs"
          >
            Preencher Nova Puxada
          </button>
        )}
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Controls (Hidden in Print) */}
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
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Espelho de Conferência da Puxada / NRI
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Visualização fiel da planilha de inspeção e entrada física da carreta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={triggerBrandingModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors border border-slate-200"
            title="Configurar Logotipo e Cabeçalhos"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
            <span>Upload Logo</span>
          </button>

          {onGoToLabels && (
            <button
              onClick={onGoToLabels}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors"
            >
              Ver Etiquetas (4 Faces)
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Espelho de Conferência</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Format Sheet */}
      <div className="bg-white border-2 border-slate-300 p-6 rounded-2xl shadow-xs print:shadow-none print:border-none print:p-0 font-sans text-xs">
        
        {/* LOGO & TITLE HEADER */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <PauBrasilLogo size="lg" />
            <div className="border-l border-slate-300 pl-3">
              <h1 className="text-xl font-black text-[#002B7F] uppercase font-mono tracking-tight">
                {brand.companyName}
              </h1>
              <p className="text-[10px] text-slate-600 font-bold uppercase">
                {brand.subtitle} • SISTEMA DE CONTROLE NRI
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-500">
              EMISSÃO: {formatDateBR(currentPull.header.receiptDate)}
            </span>
          </div>
        </div>

        {/* HEADER SECTION (Spreadsheet Yellow Grid) */}
        <div className="border border-slate-400 mb-6 overflow-x-auto rounded-lg">
          <div className="grid grid-cols-12 min-w-[900px] border-b border-slate-400">
            {/* Sidebar title */}
            <div className="col-span-1 bg-amber-400 font-black text-slate-950 flex items-center justify-center p-2 uppercase tracking-widest text-[13px] border-r border-slate-400 [writing-mode:vertical-lr] rotate-180 text-center">
              INFORMAÇÕES
            </div>

            {/* Main Info Columns */}
            <div className="col-span-11 grid grid-cols-6 divide-x divide-slate-400">
              {/* Group 1 */}
              <div className="divide-y divide-slate-400">
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">NOTA</span>
                  <span className="p-1.5 font-black text-center text-[11px] font-mono">{currentPull.header.nfeNumber}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Pedido</span>
                  <span className="p-1.5 font-bold text-center text-[11px] font-mono">{currentPull.header.orderNumber || '-'}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Origem</span>
                  <span className="p-1.5 font-bold text-center text-[11px]">{currentPull.header.factoryOrigin}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">OP</span>
                  <span className="p-1.5 font-bold text-center text-[11px]">{currentPull.header.branchOp || 'GUARABIRA'}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Status</span>
                  <span className="p-1.5 font-bold text-center text-[11px] text-emerald-700">LIBERADO</span>
                </div>
              </div>

              {/* Group 2 */}
              <div className="divide-y divide-slate-400">
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Carreta</span>
                  <span className="p-1.5 font-black text-center text-[11px] font-mono uppercase">{currentPull.header.truckPlate}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Transp.</span>
                  <span className="p-1.5 font-bold text-center text-[11px] truncate">{currentPull.header.transporterName || 'AMBEV FROTA'}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Motorista</span>
                  <span className="p-1.5 font-bold text-center text-[11px] truncate">{currentPull.header.driverName || 'CARLOS SILVA'}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Cavalo</span>
                  <span className="p-1.5 font-bold text-center text-[11px] font-mono">{currentPull.header.truckModel || 'FH 540'}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Tipo</span>
                  <span className="p-1.5 font-bold text-center text-[11px]">Sider</span>
                </div>
              </div>

              {/* Group 3 */}
              <div className="divide-y divide-slate-400">
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Conferente</span>
                  <span className="p-1.5 font-black text-center text-[11px] truncate">{currentPull.header.receiverName || 'Gilson'}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Turno</span>
                  <span className="p-1.5 font-bold text-center text-[11px]">{currentPull.header.shift || 'Manhã'}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Data Rec.</span>
                  <span className="p-1.5 font-bold text-center text-[11px] font-mono">{formatDateBR(currentPull.header.receiptDate)}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Hora</span>
                  <span className="p-1.5 font-bold text-center text-[11px] font-mono">{currentPull.header.receiptTime || '11:41'}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Doca</span>
                  <span className="p-1.5 font-bold text-center text-[11px] font-mono">02</span>
                </div>
              </div>

              {/* Group 4: Volume & Units */}
              <div className="divide-y divide-slate-400">
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Plts NFe</span>
                  <span className="p-1.5 font-black text-center text-[11px] font-mono">{currentPull.totalPallets}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">SKUs TT</span>
                  <span className="p-1.5 font-black text-center text-[11px] font-mono">{currentPull.totalQuantity}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">HL Total</span>
                  <span className="p-1.5 font-bold text-center text-[11px] font-mono">{currentPull.totalHectoliters.toFixed(2)} HL</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Valor NFe</span>
                  <span className="p-1.5 font-bold text-center text-[11px] font-mono">{formatBRL(currentPull.totalValue)}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Avarias</span>
                  <span className="p-1.5 font-bold text-center text-[11px] text-slate-500 font-mono">0</span>
                </div>
              </div>

              {/* Group 5: Seals and Security */}
              <div className="col-span-2 divide-y divide-slate-400">
                <div className="grid grid-cols-3">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Lacres</span>
                  <span className="col-span-2 p-1.5 font-bold text-center text-[11px] font-mono truncate">{currentPull.header.lacres || '123456 / 123457'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Temperatura</span>
                  <span className="col-span-2 p-1.5 font-bold text-center text-[11px]">Ambiente (22°C)</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Insp. Veículo</span>
                  <span className="col-span-2 p-1.5 font-bold text-center text-[11px] text-emerald-700">CONFORME (100%)</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="bg-amber-400 p-1.5 font-bold uppercase text-center text-[11px] border-r border-slate-400">Obs.</span>
                  <span className="col-span-2 p-1.5 font-bold text-center text-[11px] truncate">{currentPull.header.observations || 'Nenhuma avaria'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="border border-slate-400 overflow-x-auto mb-6 rounded-lg">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-amber-400 text-slate-950 font-black border-b border-slate-400 text-center uppercase">
                <th className="p-2 border-r border-slate-400 w-12">Item</th>
                <th className="p-2 border-r border-slate-400 w-24">Código SKU</th>
                <th className="p-2 border-r border-slate-400 text-left">Descrição do Produto</th>
                <th className="p-2 border-r border-slate-400 w-16">Curva</th>
                <th className="p-2 border-r border-slate-400 w-20">Pallets</th>
                <th className="p-2 border-r border-slate-400 w-16">Lastros</th>
                <th className="p-2 border-r border-slate-400 w-24">Qtd Total</th>
                <th className="p-2 border-r border-slate-400 w-24">Fabricação</th>
                <th className="p-2 border-r border-slate-400 w-24">Pré-Bloq</th>
                <th className="p-2 border-r border-slate-400 w-24">Carreg Até</th>
                <th className="p-2 border-r border-slate-400 w-24">Validade</th>
                <th className="p-2 w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {currentPull.items.map((it, idx) => (
                <tr key={it.id} className="text-center hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-300 font-bold">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300 font-mono font-black">{it.productCode}</td>
                  <td className="p-2 border-r border-slate-300 text-left font-semibold">{it.description}</td>
                  <td className="p-2 border-r border-slate-300">
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-black"
                      style={{
                        backgroundColor: it.abcClass === 'A' ? '#16a34a' : it.abcClass === 'B' ? '#eab308' : '#ef4444',
                        color: it.abcClass === 'B' ? '#000000' : '#ffffff'
                      }}
                    >
                      {it.abcClass}
                    </span>
                  </td>
                  <td className="p-2 border-r border-slate-300 font-mono font-bold bg-amber-50/50">{it.palletCount}</td>
                  <td className="p-2 border-r border-slate-300 font-mono font-bold">{it.lastroCount}</td>
                  <td className="p-2 border-r border-slate-300 font-mono font-black">{it.quantitySku} sku</td>
                  <td className="p-2 border-r border-slate-300 font-mono">{formatDateBR(it.manufacturingDate)}</td>
                  <td className="p-2 border-r border-slate-300 font-mono font-bold text-slate-700">{formatDateBR(it.preBlockDate)}</td>
                  <td className="p-2 border-r border-slate-300 font-mono font-black text-amber-700 bg-amber-50/50">{formatDateBR(it.loadUntilDate)}</td>
                  <td className="p-2 border-r border-slate-300 font-mono font-bold text-red-600">{formatDateBR(it.validityDate)}</td>
                  <td className="p-2 font-bold text-[10px] text-emerald-700">{it.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black text-center border-t-2 border-slate-400">
                <td colSpan={4} className="p-2 text-right border-r border-slate-400">TOTAIS DA CARRETA:</td>
                <td className="p-2 border-r border-slate-400 font-mono">{currentPull.totalPallets} Plts</td>
                <td className="p-2 border-r border-slate-400 font-mono">-</td>
                <td className="p-2 border-r border-slate-400 font-mono">{currentPull.totalQuantity} sku</td>
                <td colSpan={5} className="p-2 font-mono text-left pl-4">Volume: {currentPull.totalHectoliters.toFixed(2)} HL | Valor: {formatBRL(currentPull.totalValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* SIGNATURE FOOTER */}
        <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
          <div>
            <div className="border-b border-slate-500 pb-1 mb-1 font-mono font-bold">
              {currentPull.header.receiverName || 'Gilson'} (Conferente)
            </div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Assinatura do Conferente NRI</span>
          </div>

          <div>
            <div className="border-b border-slate-500 pb-1 mb-1 font-mono font-bold">
              {currentPull.header.driverName || 'Motorista Transportador'}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Assinatura do Motorista</span>
          </div>

          <div>
            <div className="border-b border-slate-500 pb-1 mb-1 font-mono font-bold">
              Supervisão de Armazém CDD
            </div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Visto do Supervisor Logística</span>
          </div>
        </div>

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
