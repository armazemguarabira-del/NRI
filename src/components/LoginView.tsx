import React, { useState } from 'react';
import { Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { PauBrasilLogo } from './PauBrasilLogo';
import { UserAccount } from '../types';

interface LoginViewProps {
  onLogin: (user: UserAccount) => void;
  users: UserAccount[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Por favor, informe o usuário e a senha.');
      return;
    }

    // Match registered user or allow admin default
    const matched = users.find(
      u => u.username.toLowerCase() === cleanUser && u.password === cleanPass && u.active !== false
    );

    if (matched) {
      onLogin(matched);
    } else if (
      (cleanUser === 'admin' && cleanPass === '123') ||
      (cleanUser === 'armazem' && cleanPass === '123') ||
      (cleanUser === 'paubrasil' && cleanPass === '123') ||
      (cleanUser === 'gilson' && cleanPass === '123')
    ) {
      // Fallback emergency default user
      const defaultUser: UserAccount = {
        id: `user-${cleanUser}`,
        username: cleanUser,
        password: cleanPass,
        fullName: cleanUser.toUpperCase(),
        role: cleanUser === 'admin' ? 'ADMINISTRADOR' : 'CONFERENTE',
        createdAt: new Date().toISOString(),
        active: true
      };
      onLogin(defaultUser);
    } else {
      setErrorMessage('Usuário ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a1120] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-slate-100 flex flex-col items-center">
        
        {/* LOGO IMPORTADA */}
        <div className="mb-3 flex items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-2xs">
          <PauBrasilLogo size="lg" variant="full" />
        </div>

        {/* NOME DA PAU BRASIL & NOME DA PLATAFORMA ADMINISTRAÇÃO DE NRI */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-mono">
            PAU BRASIL
          </h1>
          <p className="text-xs font-black uppercase text-amber-600 tracking-wider mt-1">
            Administração de NRI
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <div className="w-full mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-bold animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1">
              Login
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                autoFocus
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 rounded-xl text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
          >
            <span>Entrar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
