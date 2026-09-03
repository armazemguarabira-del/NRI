import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Building2, Factory, Star, ChevronDown } from 'lucide-react';
import { SupplierItem } from '../types';
import { INITIAL_SUPPLIERS } from '../data/initialSuppliers';

interface SupplierSearchComboboxProps {
  suppliers?: SupplierItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showQuickChips?: boolean;
  theme?: 'light' | 'dark';
  required?: boolean;
}

// 5 Principais Fábricas solicitadas
const MAIN_FACTORY_CODES = ['950', '426', '3006', '436', '421'];

export const SupplierSearchCombobox: React.FC<SupplierSearchComboboxProps> = ({
  suppliers = INITIAL_SUPPLIERS,
  value,
  onChange,
  placeholder = "Digite código ou nome da fábrica (Ex: 950, Itapissuma, Sergipe, João Pessoa)...",
  className = "",
  showQuickChips = true,
  theme = 'light',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep internal text in sync with external value prop
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value || '');
    }
  }, [value, isOpen]);

  const availableSuppliers = useMemo(() => {
    return (suppliers && suppliers.length > 0) ? suppliers : INITIAL_SUPPLIERS;
  }, [suppliers]);

  // Separate Top 5 Main Factories and Others
  const { mainFactories, otherSuppliers } = useMemo(() => {
    const main: SupplierItem[] = [];
    const others: SupplierItem[] = [];

    // Prioritize specific 5 codes first
    MAIN_FACTORY_CODES.forEach(code => {
      const found = availableSuppliers.find(s => String(s.code).trim() === code);
      if (found && !main.some(m => m.id === found.id)) {
        main.push(found);
      }
    });

    // Fallback if not all 5 found by code
    availableSuppliers.forEach(s => {
      const sName = s.name.toUpperCase();
      if (
        (sName.includes('ITAPISSUMA') || sName.includes('JOÃO PESSOA') || sName.includes('JOAO PESSOA') || sName.includes('SERGIPE') || sName.includes('AQUIRAZ') || sName.includes('CAMAÇARI') || sName.includes('CAMACARI') || sName.includes('CDR PARAÍBA')) &&
        !main.some(m => m.id === s.id)
      ) {
        if (main.length < 5) main.push(s);
        else others.push(s);
      } else if (!main.some(m => m.id === s.id)) {
        others.push(s);
      }
    });

    return { mainFactories: main, otherSuppliers: others };
  }, [availableSuppliers]);

  // Filtered Suppliers based on search term
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) {
      return [...mainFactories, ...otherSuppliers];
    }
    const term = searchTerm.toLowerCase().trim();
    return availableSuppliers.filter(s => {
      const formatted = `${s.code} - ${s.name}`.toLowerCase();
      return (
        formatted.includes(term) ||
        s.code.toLowerCase().includes(term) ||
        s.name.toLowerCase().includes(term) ||
        (s.location && s.location.toLowerCase().includes(term)) ||
        (s.type && s.type.toLowerCase().includes(term)) ||
        (s.notes && s.notes.toLowerCase().includes(term))
      );
    });
  }, [availableSuppliers, mainFactories, otherSuppliers, searchTerm]);

  // Click outside to close and resolve value
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (searchTerm.trim()) {
          // If exact match or close match exists, format it
          const term = searchTerm.toLowerCase().trim();
          const match = availableSuppliers.find(s => 
            s.code.toLowerCase() === term || 
            s.name.toLowerCase() === term ||
            `${s.code} - ${s.name}`.toLowerCase() === term
          );
          if (match) {
            const formatted = `${match.code} - ${match.name}`;
            onChange(formatted);
            setSearchTerm(formatted);
          } else {
            onChange(searchTerm.trim());
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchTerm, availableSuppliers, onChange]);

  // Reset highlight index when filtering
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const handleSelect = (supplier: SupplierItem) => {
    const formatted = `${supplier.code} - ${supplier.name}`;
    onChange(formatted);
    setSearchTerm(formatted);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleDirectSelect = (formattedText: string) => {
    onChange(formattedText);
    setSearchTerm(formattedText);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev + 1) % Math.max(1, filteredList.length));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev - 1 + filteredList.length) % Math.max(1, filteredList.length));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredList[highlightedIndex]) {
        handleSelect(filteredList[highlightedIndex]);
      } else if (isOpen && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const match = availableSuppliers.find(s => 
          s.code.toLowerCase() === term || 
          s.name.toLowerCase() === term ||
          `${s.code} - ${s.name}`.toLowerCase() === term
        );
        if (match) {
          handleSelect(match);
        } else {
          handleDirectSelect(searchTerm.trim());
        }
      } else if (!isOpen) {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center ${isDark ? 'text-amber-400' : 'text-slate-400'}`}>
          <Factory className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm(value || '');
            inputRef.current?.select();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-lg pl-9 pr-8 py-2 text-xs font-bold transition-all focus:outline-none ${
            isDark 
              ? 'bg-slate-800 border-2 border-slate-700 text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30'
              : 'bg-white border-2 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
          }`}
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isOpen && searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className={`p-1 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`p-1 rounded transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* QUICK CHIPS FOR TOP 5 MOST USED FACTORIES */}
      {showQuickChips && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className={`text-[10px] font-black uppercase tracking-wider mr-0.5 flex items-center gap-0.5 ${isDark ? 'text-amber-400' : 'text-slate-600'}`}>
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
            <span>Fábricas Principais:</span>
          </span>
          {mainFactories.map(fac => {
            const formatted = `${fac.code} - ${fac.name}`;
            const isSelected = value === formatted || value.includes(fac.name) || value.startsWith(fac.code);
            return (
              <button
                key={fac.id}
                type="button"
                onClick={() => handleSelect(fac)}
                className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  isSelected
                    ? isDark 
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-1 ring-amber-300'
                      : 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-600'
                    : isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title={`${fac.code} - ${fac.name} (${fac.location})`}
              >
                {fac.code} - {fac.name}
              </button>
            );
          })}
        </div>
      )}

      {/* FLOATING DROPDOWN LIST */}
      {isOpen && (
        <div 
          className={`absolute left-0 right-0 top-full mt-1.5 max-h-72 overflow-y-auto rounded-xl shadow-2xl z-[100] border transition-all ${
            isDark 
              ? 'bg-slate-900 border-slate-700 divide-y divide-slate-800 text-white' 
              : 'bg-white border-slate-300 divide-y divide-slate-100 text-slate-900'
          }`}
          style={{ zIndex: 9999 }}
        >
          {/* Header in dropdown */}
          <div className={`px-3 py-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider ${
            isDark ? 'bg-slate-950 text-amber-400' : 'bg-slate-100 text-slate-700'
          }`}>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span>Selecione a Fábrica ou Origem</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {filteredList.length} opções
            </span>
          </div>

          {filteredList.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs font-bold text-slate-400 mb-2">Nenhuma fábrica encontrada com "{searchTerm}"</p>
              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={() => handleDirectSelect(searchTerm.trim())}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-lg transition-colors"
                >
                  Usar "{searchTerm.trim()}" como Fábrica
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* If no search term, show Main Factories Section first */}
              {!searchTerm.trim() && (
                <div>
                  <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    isDark ? 'bg-amber-950/40 text-amber-300' : 'bg-amber-50 text-amber-900'
                  }`}>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    <span>5 Principais Fábricas (Mais Utilizadas)</span>
                  </div>
                  {mainFactories.map((fac, idx) => {
                    const formatted = `${fac.code} - ${fac.name}`;
                    const isSelected = value === formatted;
                    return (
                      <div
                        key={fac.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(fac);
                        }}
                        onClick={() => handleSelect(fac)}
                        className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-950 font-black'
                            : highlightedIndex === idx
                              ? isDark ? 'bg-slate-800' : 'bg-slate-100'
                              : isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                            {fac.code}
                          </span>
                          <div>
                            <div className="text-xs font-black leading-tight">
                              {fac.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {fac.location} • {fac.notes || 'Fábrica Principal'}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-500 shrink-0 font-black" />}
                      </div>
                    );
                  })}

                  <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                    isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                    Demais Fábricas e Fornecedores
                  </div>
                  {otherSuppliers.map((fac, idx) => {
                    const formatted = `${fac.code} - ${fac.name}`;
                    const isSelected = value === formatted;
                    const itemHighlightIdx = mainFactories.length + idx;
                    return (
                      <div
                        key={fac.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(fac);
                        }}
                        onClick={() => handleSelect(fac)}
                        className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-950 font-black'
                            : highlightedIndex === itemHighlightIdx
                              ? isDark ? 'bg-slate-800' : 'bg-slate-100'
                              : isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                            isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {fac.code}
                          </span>
                          <div>
                            <div className="text-xs font-bold leading-tight">
                              {fac.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {fac.type} • {fac.location}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-500 shrink-0 font-black" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* If search term is present, show direct matches */}
              {searchTerm.trim() && (
                <div>
                  {filteredList.map((fac, idx) => {
                    const formatted = `${fac.code} - ${fac.name}`;
                    const isSelected = value === formatted;
                    const isMain = MAIN_FACTORY_CODES.includes(String(fac.code).trim());
                    return (
                      <div
                        key={fac.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(fac);
                        }}
                        onClick={() => handleSelect(fac)}
                        className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-950 font-black'
                            : highlightedIndex === idx
                              ? isDark ? 'bg-slate-800' : 'bg-slate-100'
                              : isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-black text-xs px-2 py-0.5 rounded ${
                            isMain 
                              ? 'bg-amber-400 text-slate-950' 
                              : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {fac.code}
                          </span>
                          <div>
                            <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                              <span>{fac.name}</span>
                              {isMain && (
                                <span className="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded font-black">
                                  PRINCIPAL
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {fac.type} • {fac.location}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-500 shrink-0 font-black" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
