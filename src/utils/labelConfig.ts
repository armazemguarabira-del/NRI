export interface LabelCustomConfig {
  // Border Settings
  outerBorderWidth: number;   // 1 to 4 px (e.g. 1, 1.5, 2, 3, 4)
  outerBorderColor: string;   // '#000000', '#002B7F', etc.
  innerBorderWidth: number;   // 1 to 3 px
  innerBorderColor: string;
  gridBorderWidth: number;    // 1 to 3 px
  gridBorderColor: string;

  // Font Sizes (compact label pixel sizes)
  headerAmbevSize: number;     // 14 to 24px (default 19px)
  headerCompanySize: number;   // 10 to 18px (default 12px)
  productTitleSize: number;    // 11 to 20px (default 13.5px)
  productTitleBold: boolean;   // true
  carregAteLabelSize: number;  // 8 to 14px (default 9.5px)
  carregAteDateSize: number;   // 18 to 32px (default 22px)
  curvaLabelSize: number;      // 7 to 12px (default 8.5px)
  curvaLetterSize: number;     // 16 to 30px (default 21px)
  preBloqTextSize: number;     // 8 to 14px (default 9.5px)
  preBloqDateSize: number;     // 9 to 15px (default 11px)
  recebTextSize: number;       // 8 to 14px (default 9.5px)
  recebDateSize: number;       // 9 to 15px (default 11px)
  validityLabelSize: number;   // 9 to 15px (default 11px)
  validityDateSize: number;    // 14 to 26px (default 18px)
  tableHeaderSize: number;     // 6.5 to 12px (default 8px)
  tableDataSize: number;       // 7.5 to 14px (default 10px)

  // Layout & Sizing
  labelHeightMm: number;       // 58 to 65mm (default 61mm for 4 A4 labels)
  labelPaddingMm: number;      // 1 to 3.5mm (default 1.5mm)
  tableMode: 'excel_7_cols' | 'full_8_cols'; // 'excel_7_cols' matches user image exactly!
  showPreBloq: boolean;        // default true
  showReceb: boolean;          // default true
  showValidity: boolean;       // default true
  showCurva: boolean;          // default true
  showLogo: boolean;           // default true

  // Texts & Colors
  companyName: string;         // 'PAU BRASIL GUARABIRA'
  companyColor: string;        // '#002B7F'
  ambevText: string;           // 'ambev'
  ambevColor: string;          // '#002B7F'
  carregAteBgColor: string;    // '#000000'
  carregAteTextColor: string;  // '#ffffff'
  tableHeaderBgColor: string;  // '#ffffff' or '#f8fafc'
  tableHeaderTextColor: string; // '#1e293b' or '#000000'
  tableDataTextColor: string;  // '#000000'
  highlightCarregAteBorder?: boolean; // Optional green accent border like Excel selection
}

export const DEFAULT_LABEL_CONFIG: LabelCustomConfig = {
  outerBorderWidth: 2,
  outerBorderColor: '#000000',
  innerBorderWidth: 1.5,
  innerBorderColor: '#000000',
  gridBorderWidth: 1.5,
  gridBorderColor: '#000000',

  headerAmbevSize: 19,
  headerCompanySize: 12,
  productTitleSize: 13.5,
  productTitleBold: true,
  carregAteLabelSize: 9.5,
  carregAteDateSize: 22,
  curvaLabelSize: 8.5,
  curvaLetterSize: 21,
  preBloqTextSize: 9.5,
  preBloqDateSize: 11,
  recebTextSize: 9.5,
  recebDateSize: 11,
  validityLabelSize: 11,
  validityDateSize: 18,
  tableHeaderSize: 8,
  tableDataSize: 10,

  labelHeightMm: 61,
  labelPaddingMm: 1.5,
  tableMode: 'excel_7_cols',
  showPreBloq: true,
  showReceb: true,
  showValidity: true,
  showCurva: true,
  showLogo: true,

  companyName: 'PAU BRASIL GUARABIRA',
  companyColor: '#002B7F',
  ambevText: 'ambev',
  ambevColor: '#002B7F',
  carregAteBgColor: '#000000',
  carregAteTextColor: '#ffffff',
  tableHeaderBgColor: '#ffffff',
  tableHeaderTextColor: '#000000',
  tableDataTextColor: '#000000',
  highlightCarregAteBorder: false
};

export const PRESET_LABEL_CONFIGS: Record<string, { name: string; desc: string; config: Partial<LabelCustomConfig> }> = {
  excel_standard: {
    name: '🎯 Padrão Planilha Excel (Fiel à Imagem)',
    desc: 'Layout idêntico ao modelo Ambev: 7 colunas tabulares com bordas bem nítidas e preto de alto contraste.',
    config: {
      outerBorderWidth: 2,
      innerBorderWidth: 1.5,
      gridBorderWidth: 1.5,
      tableMode: 'excel_7_cols',
      headerAmbevSize: 19,
      headerCompanySize: 12,
      productTitleSize: 13.5,
      carregAteDateSize: 22,
      curvaLetterSize: 21,
      validityDateSize: 18,
      tableHeaderSize: 8,
      tableDataSize: 10,
      tableHeaderBgColor: '#ffffff',
      tableHeaderTextColor: '#000000',
      highlightCarregAteBorder: false
    }
  },
  thick_borders: {
    name: '📦 Bordas Reforçadas (Corte Fácil & Alta Definição)',
    desc: 'Bordas de 2.5px a 3px para destaque absoluto ao cortar e fixar nos pallets do armazém.',
    config: {
      outerBorderWidth: 3,
      innerBorderWidth: 2,
      gridBorderWidth: 2,
      outerBorderColor: '#000000',
      tableMode: 'excel_7_cols',
      headerAmbevSize: 20,
      headerCompanySize: 13,
      productTitleSize: 14,
      carregAteDateSize: 24,
      curvaLetterSize: 22,
      validityDateSize: 19,
      tableHeaderSize: 8.5,
      tableDataSize: 10.5
    }
  },
  large_fonts: {
    name: '🔍 Fontes Grandes (Máxima Leitura à Distância)',
    desc: 'Amplia títulos, código SKU, data de carregamento e validade para leitura rápida em pallets altos.',
    config: {
      outerBorderWidth: 2,
      innerBorderWidth: 1.5,
      gridBorderWidth: 1.5,
      tableMode: 'excel_7_cols',
      headerAmbevSize: 21,
      headerCompanySize: 13.5,
      productTitleSize: 15,
      carregAteDateSize: 26,
      curvaLetterSize: 24,
      validityDateSize: 20,
      tableHeaderSize: 9,
      tableDataSize: 11
    }
  },
  full_8_columns: {
    name: '📊 Modo 8 Colunas (Com Lastro)',
    desc: 'Inclui tanto a coluna QTD TOTAL quanto QTD LASTRO na grade inferior.',
    config: {
      tableMode: 'full_8_cols',
      outerBorderWidth: 2,
      innerBorderWidth: 1.5,
      gridBorderWidth: 1.5,
      tableHeaderSize: 7.5,
      tableDataSize: 9.5
    }
  }
};

const STORAGE_KEY = 'pau_brasil_nri_label_config_v1';

export function getStoredLabelConfig(): LabelCustomConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_LABEL_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('Error loading label config from localStorage:', err);
  }
  return DEFAULT_LABEL_CONFIG;
}

export function saveStoredLabelConfig(config: LabelCustomConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('label_custom_settings_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Error saving label config to localStorage:', err);
  }
}

export function resetLabelConfig(): LabelCustomConfig {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('label_custom_settings_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Error resetting label config:', err);
  }
  return DEFAULT_LABEL_CONFIG;
}
