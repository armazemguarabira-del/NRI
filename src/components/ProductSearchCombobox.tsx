import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Package, Sparkles, Plus } from 'lucide-react';
import { ProductCatalogItem } from '../types';
import { getAbcBadgeColor } from '../utils/nriCalculations';

interface ProductSearchComboboxProps {
  catalog: ProductCatalogItem[];
  selectedProductCode: string;
  onSelectProduct: (product: ProductCatalogItem) => void;
  onOpenRegisterProduct?: (code?: string) => void;
  autoFocus?: boolean;
}

export const ProductSearchCombobox: React.FC<ProductSearchComboboxProps> = ({
  catalog,
  selectedProductCode,
  onSelectProduct,
  onOpenRegisterProduct,
  autoFocus = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProduct = catalog.find(p => p.code === selectedProductCode) || catalog[0];

  // Filter products based on search term (code, description, category, brand)
  const filteredProducts = catalog.filter(product => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      product.code.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term) ||
      (product.category && product.category.toLowerCase().includes(term)) ||
      product.abcClass.toLowerCase() === term
    );
  });

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

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center gap-1.5">
          <Search className="w-4 h-4 text-amber-400" />
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
          placeholder="Digite o código (ex: 34608, 17808) ou nome (ex: Skol, Bud, Brahma, Pepsi)..."
          className="w-full bg-slate-800 border-2 border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl pl-9 pr-10 py-2.5 text-xs font-bold text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/30 focus:outline-none transition-all shadow-inner"
        />

        {isOpen && searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"
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
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-800 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 bg-slate-950/80 text-[11px] font-bold text-slate-400 flex items-center justify-between sticky top-0 backdrop-blur-xs border-b border-slate-800">
            <span>{filteredProducts.length} produto(s) encontrado(s)</span>
            <span className="text-[10px] text-amber-400">Use ↑ ↓ e Enter para selecionar</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-slate-400 space-y-2">
              <p className="font-semibold text-slate-300">Nenhum produto encontrado para "{searchTerm}"</p>
              <p className="text-[10px] text-slate-500">Item ainda não cadastrado na base de dados.</p>
              {onOpenRegisterProduct && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenRegisterProduct(searchTerm);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Cadastrar "{searchTerm}" na Guia de Cadastros</span>
                </button>
              )}
            </div>
          ) : (
            filteredProducts.map((p, index) => {
              const isSelected = p.code === selectedProductCode;
              const isHighlighted = index === highlightedIndex;
              
              return (
                <div
                  key={p.code}
                  onClick={() => handleSelect(p)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`p-3 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    isHighlighted ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60 text-slate-200'
                  } ${isSelected ? 'bg-amber-500/10' : ''}`}
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
                        <span className="font-mono font-black text-amber-400 tracking-wider">
                          {p.code}
                        </span>
                        <span className="font-bold text-white truncate">
                          {p.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>Fator Plt: <strong className="text-slate-200">{p.palletFactor}</strong></span>
                        <span>•</span>
                        <span>Lastro: <strong className="text-slate-200">{p.lastroFactor}</strong></span>
                        <span>•</span>
                        <span>Hecto: <strong className="text-slate-200">{p.hectoliterFactor}</strong></span>
                        <span>•</span>
                        <span>Emb: <strong className="text-slate-200">{p.packageType}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <span className="p-1 bg-amber-500 text-slate-950 rounded-full">
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
