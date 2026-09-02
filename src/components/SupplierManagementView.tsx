import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  Filter, 
  X, 
  Save, 
  Factory, 
  Truck, 
  Layers, 
  Store,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { SupplierItem, SupplierType } from '../types';
import { exportDataToExcel } from '../utils/nriCalculations';
import { INITIAL_SUPPLIERS } from '../data/initialSuppliers';

interface SupplierManagementViewProps {
  suppliers: SupplierItem[];
  onSaveSupplier: (supplier: SupplierItem) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onResetSuppliers?: () => void;
}

const SUPPLIER_TYPES: SupplierType[] = [
  'FÁBRICA',
  'FORNECEDOR',
  'DISTRIBUIDOR',
  'CLIENTE / DEVOLUÇÃO',
  'OUTRO'
];

export const SupplierManagementView: React.FC<SupplierManagementViewProps> = ({
  suppliers,
  onSaveSupplier,
  onDeleteSupplier,
  onResetSuppliers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('TODOS');
  const [selectedStatus, setSelectedStatus] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('TODOS');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<SupplierItem, 'id'>>({
    code: '',
    name: '',
    type: 'FÁBRICA',
    location: '',
    active: true,
    notes: ''
  });

  // KPI calculations
  const stats = useMemo(() => {
    const total = suppliers.length;
    const fabricas = suppliers.filter(s => s.type === 'FÁBRICA').length;
    const fornecedores = suppliers.filter(s => s.type === 'FORNECEDOR').length;
    const outros = suppliers.filter(s => s.type === 'DISTRIBUIDOR' || s.type === 'CLIENTE / DEVOLUÇÃO' || s.type === 'OUTRO').length;
    const ativos = suppliers.filter(s => s.active).length;
    return { total, fabricas, fornecedores, outros, ativos };
  }, [suppliers]);

  // Filtered list
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = 
          s.name.toLowerCase().includes(q) || 
          s.code.toLowerCase().includes(q) ||
          (s.location && s.location.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }
      // Type
      if (selectedType !== 'TODOS' && s.type !== selectedType) {
        return false;
      }
      // Status
      if (selectedStatus === 'ATIVO' && !s.active) return false;
      if (selectedStatus === 'INATIVO' && s.active) return false;

      return true;
    }).sort((a, b) => {
      // Sort primarily by code as number if possible or name
      const numA = parseInt(a.code, 10);
      const numB = parseInt(b.code, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.name.localeCompare(b.name);
    });
  }, [suppliers, searchTerm, selectedType, selectedStatus]);

  const openNewModal = () => {
    setEditingSupplier(null);
    setFormData({
      code: '',
      name: '',
      type: 'FÁBRICA',
      location: '',
      active: true,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: SupplierItem) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      type: supplier.type,
      location: supplier.location || '',
      active: supplier.active,
      notes: supplier.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      alert('Por favor, informe o Código e o Nome do fornecedor/fábrica.');
      return;
    }

    const code = formData.code.trim().toUpperCase();
    const name = formData.name.trim().toUpperCase();

    // Check duplicate code if creating new
    if (!editingSupplier) {
      const existing = suppliers.find(s => s.code === code);
      if (existing) {
        if (!window.confirm(`Já existe um fornecedor cadastrado com o código ${code} ("${existing.name}"). Deseja cadastrar mesmo assim?`)) {
          return;
        }
      }
    }

    const itemToSave: SupplierItem = {
      id: editingSupplier ? editingSupplier.id : `sup-${code.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      code,
      name,
      type: formData.type,
      location: formData.location?.trim() || undefined,
      active: formData.active,
      notes: formData.notes?.trim() || undefined,
      createdAt: editingSupplier ? editingSupplier.createdAt : new Date().toISOString()
    };

    onSaveSupplier(itemToSave);
    setIsModalOpen(false);
    setSuccessMsg(editingSupplier ? 'Fornecedor atualizado com sucesso!' : 'Novo fornecedor adicionado com sucesso!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleDelete = (s: SupplierItem) => {
    if (window.confirm(`Tem certeza que deseja remover o fornecedor "${s.code} - ${s.name}"?`)) {
      onDeleteSupplier(s.id);
      setSuccessMsg(`Fornecedor "${s.name}" removido com sucesso.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleExportExcel = () => {
    const data = suppliers.map(s => ({
      'Código': s.code,
      'Fornecedor / Fábrica': s.name,
      'Tipo': s.type,
      'Localização / UF': s.location || '-',
      'Status': s.active ? 'Ativo' : 'Inativo',
      'Observações': s.notes || '-'
    }));

    exportDataToExcel(data, `FORNECEDORES_E_FABRICAS_AMBEV_${new Date().toISOString().split('T')[0]}`);
    setSuccessMsg('Planilha de fornecedores exportada com sucesso (.xlsx)!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleReset = () => {
    if (window.confirm('Deseja restaurar a lista padrão com as 29 fábricas e fornecedores oficiais?')) {
      if (onResetSuppliers) {
        onResetSuppliers();
      } else {
        INITIAL_SUPPLIERS.forEach(s => onSaveSupplier(s));
      }
      setSuccessMsg('Lista de fornecedores restaurada com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const getTypeBadge = (type: SupplierType) => {
    switch (type) {
      case 'FÁBRICA':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1"><Factory className="w-3 h-3" /> FÁBRICA</span>;
      case 'FORNECEDOR':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"><Building2 className="w-3 h-3" /> FORNECEDOR</span>;
      case 'DISTRIBUIDOR':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1"><Truck className="w-3 h-3" /> DISTRIBUIDOR</span>;
      case 'CLIENTE / DEVOLUÇÃO':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1"><Store className="w-3 h-3" /> CLIENTE / DEV</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#002B7F] text-white flex items-center justify-center shadow-md shrink-0">
            <Building2 className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#002B7F] uppercase tracking-tight font-mono">
                CADASTRO DE FÁBRICAS & FORNECEDORES
              </h2>
              <span className="text-xs bg-slate-900 text-amber-400 font-mono font-bold px-2.5 py-0.5 rounded-full">
                {stats.total} CADASTRADOS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Gestão de códigos operacionais, origens fabris Ambev, distribuidores e parceiros logísticos para emissão de NRI e etiquetas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95"
            title="Exportar fornecedores para Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Adicionar Fornecedor</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-xs flex items-center gap-1"
            title="Restaurar Lista Padrão Ambev"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {successMsg && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-md flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-white/80 hover:text-white font-black">✕</button>
        </div>
      )}

      {/* 2. KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400">Total de Registros</div>
            <div className="text-xl font-black text-slate-900 font-mono">{stats.total} UNIDADES</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-0.5">{stats.ativos} ativas em operação</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-blue-800">Fábricas Ambev</div>
            <div className="text-xl font-black text-blue-700 font-mono">{stats.fabricas} FÁBRICAS</div>
            <div className="text-[11px] text-blue-600 font-bold mt-0.5">Itapissuma, Sergipe, etc.</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Factory className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-emerald-800">Fornecedores Diretos</div>
            <div className="text-xl font-black text-emerald-700 font-mono">{stats.fornecedores} EMPRESAS</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-0.5">M. Dias, Ypê, Indaiá, etc.</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-amber-800">Distribuidores & Clientes</div>
            <div className="text-xl font-black text-amber-700 font-mono">{stats.outros} DESTINOS</div>
            <div className="text-[11px] text-amber-600 font-bold mt-0.5">CDRs, Patos, Atacadão, etc.</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
            <Store className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Fornecedor (ex: ITAPISSUMA) ou Código (ex: 950)..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Tipo:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="TODOS">Todos os Tipos</option>
              {SUPPLIER_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="TODOS">Todos</option>
              <option value="ATIVO">Somente Ativos</option>
              <option value="INATIVO">Somente Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. TABLE OF SUPPLIERS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider font-mono">
                <th className="py-3 px-4 w-28 text-center">CÓDIGO</th>
                <th className="py-3 px-4">FORNECEDOR / FÁBRICA</th>
                <th className="py-3 px-4">TIPO</th>
                <th className="py-3 px-4">LOCALIZAÇÃO / UF</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4">OBSERVAÇÕES</th>
                <th className="py-3 px-4 text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm">Nenhum fornecedor encontrado com os filtros selecionados.</p>
                    <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou adicione um novo fornecedor.</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s, idx) => (
                  <tr 
                    key={s.id} 
                    className={`hover:bg-amber-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                  >
                    {/* CODIGO */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 bg-slate-900 text-amber-400 font-mono font-black text-xs rounded-lg shadow-2xs">
                        {s.code}
                      </span>
                    </td>

                    {/* NAME */}
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 uppercase font-mono tracking-tight text-xs flex items-center gap-2">
                        <span>{s.name}</span>
                      </div>
                    </td>

                    {/* TIPO */}
                    <td className="py-3 px-4">
                      {getTypeBadge(s.type)}
                    </td>

                    {/* LOCALIZAÇÃO */}
                    <td className="py-3 px-4 text-slate-600 font-semibold">
                      {s.location || <span className="text-slate-300">-</span>}
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-4 text-center">
                      {s.active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          ATIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          INATIVO
                        </span>
                      )}
                    </td>

                    {/* OBSERVAÇÃO */}
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate" title={s.notes}>
                      {s.notes || <span className="text-slate-300">-</span>}
                    </td>

                    {/* AÇÕES */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Fornecedor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir Fornecedor"
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
        
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-bold px-4">
          <span>Mostrando {filteredSuppliers.length} de {suppliers.length} fornecedores cadastrados</span>
          <span className="text-[11px] text-slate-400 font-medium">Sincronizado automaticamente com Firestore & Workstation</span>
        </div>
      </div>

      {/* 5. MODAL: ADICIONAR / EDITAR FORNECEDOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-[#002B7F] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wide font-mono">
                  {editingSupplier ? 'Editar Fornecedor / Fábrica' : 'Novo Cadastro de Fornecedor'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white font-bold p-1 text-sm rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* CÓDIGO */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                    Código Operacional *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: 950, 3006, 426"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Código numérico da fábrica/fornecedor</span>
                </div>

                {/* TIPO */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                    Tipo de Parceiro *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as SupplierType })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {SUPPLIER_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* NOME / RAZÃO SOCIAL */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                  Nome do Fornecedor / Fábrica *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: ITAPISSUMA, SERGIPE, M. DIAS BRANCO"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* LOCALIZAÇÃO / UF */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                  Localização / UF (Cidade / Estado)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Pernambuco / PE, Ceará / CE, Guarabira / PB"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* OBSERVAÇÕES */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                  Observações & Detalhes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Fábrica Ambev responsável pelo fornecimento das latas e garrafas 600ml..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* STATUS ATIVO */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="supplier-active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="supplier-active" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Fornecedor Ativo (Habilitado para seleção na Workstation / Puxadas)
                </label>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
