import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Package, Sparkles, Plus } from 'lucide-react';
import { ProductCatalogItem } from '../types';
import { getAbcBadgeColor } from '../utils/nriCalculations';

interface ProductSearchComboboxProps {
  catalog: ProductCatalogItem[];
  selectedProductCode: string;
  onSelectProduct: (product: ProductCatalogItem) => void;
  onOpenRegisterProduct?: (code?: string) => void;
  autoFocus?: boolean;
  theme?: 'dark' | 'light';
  placeholder?: string;
}

export const ProductSearchCombobox: React.FC<ProductSearchComboboxProps> = ({
  catalog,
  selectedProductCode,
  onSelectProduct,
  onOpenRegisterProduct,
  autoFocus = false,
  theme = 'dark',
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProduct = useMemo(() => {
    return catalog.find(p => p.code === selectedProductCode) || catalog[0];
  }, [catalog, selectedProductCode]);

  // Filter products based on search term (code, description, category, brand)
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return catalog.slice(0, 80);
    const term = searchTerm.toLowerCase().trim();
    return catalog.filter(product => {
      return (
        product.code.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        (product.category && product.category.toLowerCase().includes(term)) ||
        product.abcClass.toLowerCase() === term
      );
    }).slice(0, 80);
  }, [catalog, searchTerm]);

  // Handle outside click to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight index on filter change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const handleSelect = (product: ProductCatalogItem) => {
    onSelectProduct(product);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev + 1) % Math.max(1, filteredProducts.length));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev - 1 + filteredProducts.length) % Math.max(1, filteredProducts.length));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
      } else if (!isOpen) {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const defaultPlaceholder = placeholder || "Digite código (ex: 34608, 17808) ou nome (ex: Skol, Brahma, Bud, Pepsi)...";

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5">
          <Search className={`w-4 h-4 ${theme === 'light' ? 'text-red-500' : 'text-amber-400'}`} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : `${selectedProduct ? `[${selectedProduct.abcClass}] ${selectedProduct.code} - ${selectedProduct.description}` : ''}`}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={defaultPlaceholder}
          className={
            theme === 'light'
              ? "w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-red-500 rounded-xl pl-9 pr-10 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all shadow-2xs"
              : "w-full bg-slate-800 border-2 border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl pl-9 pr-10 py-2.5 text-[13px] font-bold text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/30 focus:outline-none transition-all shadow-inner"
          }
        />

        {isOpen && searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
              theme === 'light'
                ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
            {selectedProduct && (
              <span 
                className="px-1.5 py-0.5 rounded text-[10px] font-black"
                style={{
                  backgroundColor: selectedProduct.abcClass === 'A' ? '#16a34a' : selectedProduct.abcClass === 'B' ? '#eab308' : '#ef4444',
                  color: selectedProduct.abcClass === 'B' ? '#000000' : '#ffffff'
                }}
              >
                Curva {selectedProduct.abcClass}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filtered Dropdown List */}
      {isOpen && (
        <div 
          className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y text-xs animate-in fade-in slide-in-from-top-2 duration-150 ${
            theme === 'light'
              ? 'bg-white border border-slate-200 divide-slate-100 text-slate-800 shadow-slate-400/20'
              : 'bg-slate-900 border border-slate-700 divide-slate-800 text-slate-200'
          }`}
        >
          <div className={`p-2 text-[11px] font-bold flex items-center justify-between sticky top-0 backdrop-blur-xs border-b ${
            theme === 'light'
              ? 'bg-slate-50 text-slate-600 border-slate-200'
              : 'bg-slate-950/80 text-slate-400 border-slate-800'
          }`}>
            <span>{filteredProducts.length} produto(s) encontrado(s)</span>
            <span className={`text-[10px] ${theme === 'light' ? 'text-red-600 font-bold' : 'text-amber-400'}`}>
              Use ↑ ↓ e Enter para selecionar
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className={`p-4 text-center space-y-2 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              <p className={`font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>
                Nenhum produto encontrado para "{searchTerm}"
              </p>
              <p className="text-[10px] text-slate-400">Item não encontrado no catálogo.</p>
              {onOpenRegisterProduct && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsOpen(false);
                    onOpenRegisterProduct(searchTerm);
                  }}
                  className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg text-xs transition-colors shadow-xs ${
                    theme === 'light'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Cadastrar "{searchTerm}"</span>
                </button>
              )}
            </div>
          ) : (
            filteredProducts.map((p, index) => {
              const isSelected = p.code === selectedProductCode;
              const isHighlighted = index === highlightedIndex;
              
              const itemBgClass = theme === 'light'
                ? isSelected
                  ? 'bg-red-50 text-red-950 font-bold'
                  : isHighlighted
                  ? 'bg-slate-100 text-slate-900'
                  : 'hover:bg-slate-50 text-slate-800'
                : isSelected
                ? 'bg-amber-500/10'
                : isHighlighted
                ? 'bg-slate-800 text-white'
                : 'hover:bg-slate-800/60 text-slate-200';

              return (
                <div
                  key={p.code}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(p);
                  }}
                  onClick={() => handleSelect(p)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`p-3 cursor-pointer flex items-center justify-between gap-3 transition-colors ${itemBgClass}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Curva ABC badge */}
                    <span
                      className="shrink-0 w-6 h-6 rounded flex items-center justify-center font-black text-xs shadow-xs"
                      style={{
                        backgroundColor: p.abcClass === 'A' ? '#16a34a' : p.abcClass === 'B' ? '#eab308' : '#ef4444',
                        color: p.abcClass === 'B' ? '#000000' : '#ffffff'
                      }}
                      title={`Curva ${p.abcClass}`}
                    >
                      {p.abcClass}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-black text-sm tracking-wider ${
                          theme === 'light' ? 'text-red-600' : 'text-amber-400'
                        }`}>
                          {p.code}
                        </span>
                        <span className={`text-[13.5px] font-bold truncate ${
                          theme === 'light' ? 'text-slate-900' : 'text-white'
                        }`}>
                          {p.description}
                        </span>
                      </div>
                      <div className={`flex items-center gap-3 text-[11px] font-mono mt-0.5 ${
                        theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        <span>Fator Plt: <strong className={theme === 'light' ? 'text-slate-800 font-bold' : 'text-slate-200'}>{p.palletFactor}</strong></span>
                        <span>•</span>
                        <span>Lastro: <strong className={theme === 'light' ? 'text-slate-800 font-bold' : 'text-slate-200'}>{p.lastroFactor}</strong></span>
                        <span>•</span>
                        <span>Hecto: <strong className={theme === 'light' ? 'text-slate-800 font-bold' : 'text-slate-200'}>{p.hectoliterFactor}</strong></span>
                        <span>•</span>
                        <span>Emb: <strong className={theme === 'light' ? 'text-slate-800 font-bold' : 'text-slate-200'}>{p.packageType}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <span className={`p-1 rounded-full ${
                        theme === 'light'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
