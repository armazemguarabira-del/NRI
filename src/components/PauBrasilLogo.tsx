import React, { useState, useEffect } from 'react';
import { getStoredBrandSettings, BrandSettings } from '../utils/branding';

interface PauBrasilLogoProps {
  className?: string;
  variant?: 'full' | 'icon_only' | 'horizontal' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  darkMode?: boolean;
  customLogoUrl?: string | null;
  showText?: boolean;
}

export const PauBrasilLogo: React.FC<PauBrasilLogoProps> = ({
  className = '',
  variant = 'horizontal',
  size = 'md',
  darkMode = false,
  customLogoUrl,
  showText = true
}) => {
  const [brand, setBrand] = useState<BrandSettings>(getStoredBrandSettings);

  useEffect(() => {
    const handleUpdate = () => {
      setBrand(getStoredBrandSettings());
    };

    window.addEventListener('brand_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('brand_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const effectiveLogoUrl = customLogoUrl !== undefined ? customLogoUrl : brand.primaryLogoUrl;

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const imageSizes = {
    sm: 'max-h-6 max-w-[90px]',
    md: 'max-h-8 max-w-[120px]',
    lg: 'max-h-12 max-w-[170px]',
    xl: 'max-h-16 max-w-[220px]'
  };

  const titleSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const subtitleSizes = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm'
  };

  // Render uploaded image if present
  const renderLogoGraphic = () => {
    if (effectiveLogoUrl) {
      return (
        <img
          src={effectiveLogoUrl}
          alt={brand.companyName || 'Logo'}
          className={`${imageSizes[size]} object-contain shrink-0 drop-shadow-2xs rounded-xs`}
          referrerPolicy="no-referrer"
        />
      );
    }

    // Default SVG representation of Pau Brasil / Ambev logo
    return (
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSizes[size]} shrink-0 drop-shadow-2xs`}
      >
        {/* Speech bubble / Pin background in Ambev Blue (#0047BA / #0056D2) */}
        <path 
          d="M 50 5 C 25 5 10 20 10 45 C 10 65 25 80 40 88 L 40 95 L 55 88 C 75 85 90 68 90 45 C 90 20 75 5 50 5 Z" 
          fill="#0056D2"
        />
        {/* Pau Brasil / Ambev stylized tree in white */}
        <path 
          d="M 50 72 L 50 52 M 50 52 L 40 42 M 50 52 L 60 42" 
          stroke="#FFFFFF" 
          strokeWidth="3.5" 
          strokeLinecap="round"
        />
        <path 
          d="M 32 30 Q 50 20 68 30" 
          stroke="#FFFFFF" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        <path 
          d="M 28 36 Q 50 26 72 36" 
          stroke="#FFFFFF" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        <path 
          d="M 26 42 Q 50 33 74 42" 
          stroke="#FFFFFF" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        <path 
          d="M 30 48 Q 50 40 70 48" 
          stroke="#FFFFFF" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        <path 
          d="M 36 54 Q 50 48 64 54" 
          stroke="#FFFFFF" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
      </svg>
    );
  };

  if (variant === 'icon_only' || !showText) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {renderLogoGraphic()}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${
        darkMode 
          ? 'bg-slate-800/90 border-slate-700 text-white' 
          : 'bg-white border-blue-200 text-slate-900 shadow-2xs'
      } ${className}`}>
        {renderLogoGraphic()}
        <div className="flex flex-col leading-tight">
          <span className={`font-black tracking-tight uppercase ${darkMode ? 'text-blue-400' : 'text-blue-700'} ${titleSizes[size]}`}>
            {brand.companyName.split(' ')[0] || 'PAU BRASIL'}
          </span>
          <span className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'} ${subtitleSizes[size]}`}>
            {brand.subtitle.toLowerCase()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {renderLogoGraphic()}
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold tracking-tight uppercase ${
            darkMode ? 'text-white' : 'text-[#002B7F]'
          } ${titleSizes[size]}`}>
            {brand.companyName}
          </span>
        </div>
        <span className={`font-semibold tracking-wide ${
          darkMode ? 'text-slate-400' : 'text-slate-600'
        } ${subtitleSizes[size]}`}>
          {brand.subtitle}
        </span>
      </div>
    </div>
  );
};
