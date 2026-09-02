export interface BrandSettings {
  primaryLogoUrl: string | null; // Data URL or external URL
  secondaryLogoUrl: string | null; // e.g. Ambev or quality seal
  companyName: string;
  unitLocation: string;
  subtitle: string;
}

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  primaryLogoUrl: null, // null will render the high-fidelity SVG Pau Brasil logo
  secondaryLogoUrl: null,
  companyName: 'PAU BRASIL GUARABIRA',
  unitLocation: 'GUARABIRA - PB',
  subtitle: 'DISTRIBUIDORA DE BEBIDAS AMBEV'
};

const STORAGE_KEY = 'pau_brasil_nri_branding_v1';

export function getStoredBrandSettings(): BrandSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return { ...DEFAULT_BRAND_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('Error loading branding settings:', err);
  }
  return DEFAULT_BRAND_SETTINGS;
}

export function saveStoredBrandSettings(settings: BrandSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Trigger custom event so all open tabs/components react immediately
    window.dispatchEvent(new Event('brand_settings_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Error saving branding settings:', err);
  }
}

export function resetBrandSettings(): BrandSettings {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('brand_settings_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Error resetting branding settings:', err);
  }
  return DEFAULT_BRAND_SETTINGS;
}

