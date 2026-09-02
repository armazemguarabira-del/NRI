import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Key, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ShieldCheck, 
  Search, 
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { UserAccount } from '../types';

interface UserManagementViewProps {
  users: UserAccount[];
  onSaveUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: UserAccount | null;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  onSaveUser,
  onDeleteUser,
  currentUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Deletion modal state
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserAccount['role']>('CONFERENTE');
  const [unit, setUnit] = useState('GUARABIRA - PB');
  const [showPassword, setShowPassword] = useState(false);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Open modal to create new user
  const handleOpenCreate = () => {
    setEditingUserId(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setRole('CONFERENTE');
    setUnit('GUARABIRA - PB');
    setShowPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal to edit existing user
  const handleOpenEdit = (u: UserAccount) => {
    setEditingUserId(u.id);
    setFullName(u.fullName);
    setUsername(u.username);
    setPassword(u.password);
    setRole(u.role);
    setUnit(u.unit || 'GUARABIRA - PB');
    setShowPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit User Form
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const cleanUser = username.trim().toLowerCase();
    
    // Check if username is already taken by another user
    const existing = users.find(u => u.username.toLowerCase() === cleanUser && u.id !== editingUserId);
    if (existing) {
      setFormError('Já existe um usuário cadastrado com este login. Escolha outro login.');
      return;
    }

    const userToSave: UserAccount = {
      id: editingUserId || `user-${Date.now()}`,
      fullName: fullName.trim(),
      username: cleanUser,
      password: password.trim(),
      role,
      unit,
      createdAt: editingUserId ? (users.find(u => u.id === editingUserId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      active: true
    };

    onSaveUser(userToSave);
    setIsModalOpen(false);
    showToast(editingUserId ? 'Usuário atualizado com sucesso!' : 'Novo usuário cadastrado com sucesso!');
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    const deletedName = deletingUser.fullName;
    onDeleteUser(deletingUser.id);
    setDeletingUser(null);
    showToast(`Usuário "${deletedName}" excluído com sucesso.`);
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* SUCCESS TOAST */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-400/30">
                  Controle de Acessos
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                CADASTRO DE LOGINS & USUÁRIOS
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Cadastre, edite e exclua credenciais de login, senhas e perfis operacionais do sistema Pau Brasil.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário / Login</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND USERS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Usuários Registrados ({filteredUsers.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, login ou cargo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        {/* USERS TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                <th className="p-3.5">Nome Completo</th>
                <th className="p-3.5">Login / Usuário</th>
                <th className="p-3.5">Senha</th>
                <th className="p-3.5 text-center">Função / Cargo</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    Nenhum usuário cadastrado encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.username.toLowerCase() === u.username.toLowerCase();
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 font-black flex items-center justify-center text-xs">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block leading-tight">{u.fullName}</span>
                            {isCurrent && (
                              <span className="text-[10px] text-emerald-600 font-bold">● Sessão Atual</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-black text-blue-900">
                        {u.username}
                      </td>

                      <td className="p-3.5 font-mono text-slate-500">
                        ••••••••
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          u.role === 'ADMINISTRADOR'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : u.role === 'SUPERVISOR'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Ativo</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200"
                            title="Editar usuário e senha"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingUser(u)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer border border-red-200"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* IN-APP CONFIRM DELETE MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-black shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Confirmar Exclusão de Usuário
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Esta ação removerá permanentemente o acesso do usuário.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <p className="text-xs font-bold text-slate-800">
                <span className="text-slate-500 font-normal">Nome:</span> {deletingUser.fullName}
              </p>
              <p className="text-xs font-mono font-bold text-blue-900">
                <span className="text-slate-500 font-normal font-sans">Login:</span> {deletingUser.username}
              </p>
              <p className="text-xs font-bold text-slate-700">
                <span className="text-slate-500 font-normal">Cargo:</span> {deletingUser.role}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir Usuário</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TO CREATE OR EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {editingUserId ? 'Editar Usuário & Senha' : 'Cadastrar Novo Usuário'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Nome Completo: *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Gilson Santos"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Login / Usuário: *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: gilson"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Senha de Acesso: *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha"
                    required
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Cargo / Perfil: *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="CONFERENTE">Conferente de Armazém</option>
                  <option value="OPERADOR">Operador de Empilhadeira</option>
                  <option value="SUPERVISOR">Supervisor Operacional</option>
                  <option value="COORDENADOR">Coordenador de Logística</option>
                  <option value="ADMINISTRADOR">Administrador Geral</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Usuário</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
