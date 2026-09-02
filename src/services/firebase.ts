import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { PullRecord, BlitzRecord, PNCRecord, Report030519Item, ProductCatalogItem, UserAccount, SupplierItem } from '../types';
import { INITIAL_SUPPLIERS } from '../data/initialSuppliers';

// Initialize Firebase App instance safely (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Direct binding to the dedicated Firestore Database ID from configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Collection Names in Firestore
export const COLLECTIONS = {
  PULLS: 'nri_pulls',
  BLITZ: 'nri_blitz',
  PNCS: 'nri_pncs',
  REPORT_030519: 'nri_report_030519',
  CATALOG: 'nri_product_catalog',
  BRANDING: 'nri_branding_settings',
  USERS: 'nri_users',
  SUPPLIERS: 'nri_suppliers'
} as const;

// LocalStorage Cache Keys
export const CACHE_KEYS = {
  PULLS: 'nri_cached_pulls',
  BLITZ: 'nri_cached_blitz',
  PNCS: 'nri_cached_pncs',
  REPORT_030519: 'nri_cached_report030519',
  CATALOG: 'nri_cached_catalog',
  USERS: 'nri_cached_users',
  SUPPLIERS: 'nri_cached_suppliers'
} as const;

// Cache Helper Functions
export function getCachedData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch (err) {
    console.warn(`Error reading cache key ${key}:`, err);
    return defaultValue;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error writing cache key ${key}:`, err);
  }
}

// Track initial syncs to avoid erasing local data on fresh database
let hasSyncedLocalPulls = false;
let hasSyncedLocalBlitz = false;
let hasSyncedLocalPNCs = false;

// Real-time synchronization hooks/subscribers with Cache fallback & Auto-sync
export function subscribeToPulls(onUpdate: (pulls: PullRecord[]) => void) {
  // 1. Emit immediately from cache to ensure zero flash / zero data loss
  const cached = getCachedData<PullRecord[]>(CACHE_KEYS.PULLS, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const pullsRef = collection(db, COLLECTIONS.PULLS);
  return onSnapshot(pullsRef, async (snapshot) => {
    const list: PullRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PullRecord);
    });
    // Sort descending by createdAt or receiptDate
    list.sort((a, b) => (b.header.createdAt || b.header.receiptDate || '').localeCompare(a.header.createdAt || a.header.receiptDate || ''));
    
    // Auto-migration: If Firestore is empty on first load but local storage has cached pulls, upload them to Firestore!
    if (snapshot.empty && cached && cached.length > 0 && !hasSyncedLocalPulls) {
      hasSyncedLocalPulls = true;
      try {
        const batch = writeBatch(db);
        for (const p of cached) {
          batch.set(doc(db, COLLECTIONS.PULLS, p.header.id), p, { merge: true });
        }
        await batch.commit();
        console.log(`Auto-synced ${cached.length} local pulls to Firestore database.`);
      } catch (err) {
        console.warn('Could not auto-sync local pulls to Firestore:', err);
      }
      onUpdate(cached);
      return;
    }

    hasSyncedLocalPulls = true;

    // If Firestore returned records, update local cache and state
    if (list.length > 0) {
      setCachedData(CACHE_KEYS.PULLS, list);
      onUpdate(list);
    } else if (snapshot.empty && (!cached || cached.length === 0)) {
      setCachedData(CACHE_KEYS.PULLS, []);
      onUpdate([]);
    }
  }, (error) => {
    console.error('Error listening to pulls in Firestore, using cache fallback:', error);
    const fallback = getCachedData<PullRecord[]>(CACHE_KEYS.PULLS, []);
    onUpdate(fallback);
  });
}

export function subscribeToBlitz(onUpdate: (blitz: BlitzRecord[]) => void) {
  const cached = getCachedData<BlitzRecord[]>(CACHE_KEYS.BLITZ, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const blitzRef = collection(db, COLLECTIONS.BLITZ);
  return onSnapshot(blitzRef, async (snapshot) => {
    const list: BlitzRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as BlitzRecord);
    });
    list.sort((a, b) => (b.blockDate || '').localeCompare(a.blockDate || ''));

    if (snapshot.empty && cached && cached.length > 0 && !hasSyncedLocalBlitz) {
      hasSyncedLocalBlitz = true;
      try {
        const batch = writeBatch(db);
        for (const b of cached) {
          batch.set(doc(db, COLLECTIONS.BLITZ, b.id), b, { merge: true });
        }
        await batch.commit();
      } catch (err) {
        console.warn('Could not auto-sync blitz records to Firestore:', err);
      }
      onUpdate(cached);
      return;
    }

    hasSyncedLocalBlitz = true;

    if (list.length > 0) {
      setCachedData(CACHE_KEYS.BLITZ, list);
      onUpdate(list);
    } else if (snapshot.empty && (!cached || cached.length === 0)) {
      setCachedData(CACHE_KEYS.BLITZ, []);
      onUpdate([]);
    }
  }, (error) => {
    console.error('Error listening to blitz in Firestore, using cache fallback:', error);
    onUpdate(getCachedData<BlitzRecord[]>(CACHE_KEYS.BLITZ, []));
  });
}

export function subscribeToPNCs(onUpdate: (pncs: PNCRecord[]) => void) {
  const cached = getCachedData<PNCRecord[]>(CACHE_KEYS.PNCS, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const pncRef = collection(db, COLLECTIONS.PNCS);
  return onSnapshot(pncRef, async (snapshot) => {
    const list: PNCRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PNCRecord);
    });
    list.sort((a, b) => (b.requestDate || '').localeCompare(a.requestDate || ''));

    if (snapshot.empty && cached && cached.length > 0 && !hasSyncedLocalPNCs) {
      hasSyncedLocalPNCs = true;
      try {
        const batch = writeBatch(db);
        for (const pnc of cached) {
          batch.set(doc(db, COLLECTIONS.PNCS, pnc.id), pnc, { merge: true });
        }
        await batch.commit();
      } catch (err) {
        console.warn('Could not auto-sync PNC records to Firestore:', err);
      }
      onUpdate(cached);
      return;
    }

    hasSyncedLocalPNCs = true;

    if (list.length > 0) {
      setCachedData(CACHE_KEYS.PNCS, list);
      onUpdate(list);
    } else if (snapshot.empty && (!cached || cached.length === 0)) {
      setCachedData(CACHE_KEYS.PNCS, []);
      onUpdate([]);
    }
  }, (error) => {
    console.error('Error listening to PNCs in Firestore, using cache fallback:', error);
    onUpdate(getCachedData<PNCRecord[]>(CACHE_KEYS.PNCS, []));
  });
}

export function subscribeToReport030519(onUpdate: (items: Report030519Item[]) => void) {
  const cached = getCachedData<Report030519Item[]>(CACHE_KEYS.REPORT_030519, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const ref = collection(db, COLLECTIONS.REPORT_030519);
  return onSnapshot(ref, (snapshot) => {
    const list: Report030519Item[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Report030519Item);
    });
    list.sort((a, b) => a.rank - b.rank);
    if (list.length > 0) {
      setCachedData(CACHE_KEYS.REPORT_030519, list);
    }
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to Report030519 in Firestore, using cache fallback:', error);
    onUpdate(getCachedData<Report030519Item[]>(CACHE_KEYS.REPORT_030519, []));
  });
}

export function subscribeToCatalog(onUpdate: (catalog: ProductCatalogItem[]) => void) {
  const cached = getCachedData<ProductCatalogItem[]>(CACHE_KEYS.CATALOG, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const ref = collection(db, COLLECTIONS.CATALOG);
  return onSnapshot(ref, (snapshot) => {
    const list: ProductCatalogItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ProductCatalogItem);
    });
    list.sort((a, b) => (a.rank || 999) - (b.rank || 999));
    if (list.length > 0) {
      setCachedData(CACHE_KEYS.CATALOG, list);
    }
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to catalog in Firestore, using cache fallback:', error);
    onUpdate(getCachedData<ProductCatalogItem[]>(CACHE_KEYS.CATALOG, []));
  });
}

// Write/Save operations with LocalStorage Cache synchronization
export async function savePullToFirestore(pull: PullRecord): Promise<void> {
  // Update local cache immediately
  const existing = getCachedData<PullRecord[]>(CACHE_KEYS.PULLS, []);
  const idx = existing.findIndex(p => p.header.id === pull.header.id);
  const updated = idx >= 0 ? [...existing] : [pull, ...existing];
  if (idx >= 0) updated[idx] = pull;
  setCachedData(CACHE_KEYS.PULLS, updated);

  try {
    const pullRef = doc(db, COLLECTIONS.PULLS, pull.header.id);
    await setDoc(pullRef, pull, { merge: true });
  } catch (err) {
    console.error('Error writing pull to Firestore (saved locally in cache):', err);
  }
}

export async function deletePullFromFirestore(pullId: string): Promise<void> {
  // Update local cache
  const existing = getCachedData<PullRecord[]>(CACHE_KEYS.PULLS, []);
  const filtered = existing.filter(p => p.header.id !== pullId);
  setCachedData(CACHE_KEYS.PULLS, filtered);

  try {
    const pullRef = doc(db, COLLECTIONS.PULLS, pullId);
    await deleteDoc(pullRef);
  } catch (err) {
    console.error('Error deleting pull from Firestore:', err);
  }
}

export async function saveBlitzToFirestore(record: BlitzRecord): Promise<void> {
  const existing = getCachedData<BlitzRecord[]>(CACHE_KEYS.BLITZ, []);
  const idx = existing.findIndex(b => b.id === record.id);
  const updated = idx >= 0 ? [...existing] : [record, ...existing];
  if (idx >= 0) updated[idx] = record;
  setCachedData(CACHE_KEYS.BLITZ, updated);

  try {
    const ref = doc(db, COLLECTIONS.BLITZ, record.id);
    await setDoc(ref, record, { merge: true });
  } catch (err) {
    console.error('Error writing Blitz to Firestore:', err);
  }
}

export async function deleteBlitzFromFirestore(id: string): Promise<void> {
  const existing = getCachedData<BlitzRecord[]>(CACHE_KEYS.BLITZ, []);
  setCachedData(CACHE_KEYS.BLITZ, existing.filter(b => b.id !== id));

  try {
    const ref = doc(db, COLLECTIONS.BLITZ, id);
    await deleteDoc(ref);
  } catch (err) {
    console.error('Error deleting Blitz from Firestore:', err);
  }
}

export async function savePNCToFirestore(record: PNCRecord): Promise<void> {
  const existing = getCachedData<PNCRecord[]>(CACHE_KEYS.PNCS, []);
  const idx = existing.findIndex(p => p.id === record.id);
  const updated = idx >= 0 ? [...existing] : [record, ...existing];
  if (idx >= 0) updated[idx] = record;
  setCachedData(CACHE_KEYS.PNCS, updated);

  try {
    const ref = doc(db, COLLECTIONS.PNCS, record.id);
    await setDoc(ref, record, { merge: true });
  } catch (err) {
    console.error('Error writing PNC to Firestore:', err);
  }
}

export async function deletePNCFromFirestore(id: string): Promise<void> {
  const existing = getCachedData<PNCRecord[]>(CACHE_KEYS.PNCS, []);
  setCachedData(CACHE_KEYS.PNCS, existing.filter(p => p.id !== id));

  try {
    const ref = doc(db, COLLECTIONS.PNCS, id);
    await deleteDoc(ref);
  } catch (err) {
    console.error('Error deleting PNC from Firestore:', err);
  }
}

export async function saveReport030519ToFirestore(items: Report030519Item[]): Promise<void> {
  setCachedData(CACHE_KEYS.REPORT_030519, items);

  try {
    const batch = writeBatch(db);
    for (const it of items) {
      const ref = doc(db, COLLECTIONS.REPORT_030519, `item-${it.productCode}`);
      batch.set(ref, it);
    }
    await batch.commit();
  } catch (err) {
    console.error('Error writing Report030519 to Firestore:', err);
  }
}

export async function saveCatalogItemToFirestore(item: ProductCatalogItem): Promise<void> {
  const existing = getCachedData<ProductCatalogItem[]>(CACHE_KEYS.CATALOG, []);
  const idx = existing.findIndex(c => c.code === item.code);
  const updated = idx >= 0 ? [...existing] : [...existing, item];
  if (idx >= 0) updated[idx] = item;
  setCachedData(CACHE_KEYS.CATALOG, updated);

  try {
    const ref = doc(db, COLLECTIONS.CATALOG, `prod-${item.code}`);
    await setDoc(ref, item, { merge: true });
  } catch (err) {
    console.error('Error writing Catalog item to Firestore:', err);
  }
}

export async function deleteCatalogItemFromFirestore(code: string): Promise<void> {
  const existing = getCachedData<ProductCatalogItem[]>(CACHE_KEYS.CATALOG, []);
  setCachedData(CACHE_KEYS.CATALOG, existing.filter(c => c.code !== code));

  try {
    const ref = doc(db, COLLECTIONS.CATALOG, `prod-${code}`);
    await deleteDoc(ref);
  } catch (err) {
    console.error('Error deleting Catalog item from Firestore:', err);
  }
}

export async function saveCatalogToFirestore(items: ProductCatalogItem[]): Promise<void> {
  setCachedData(CACHE_KEYS.CATALOG, items);

  try {
    const batch = writeBatch(db);
    for (const it of items) {
      const ref = doc(db, COLLECTIONS.CATALOG, `prod-${it.code}`);
      batch.set(ref, it, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.error('Error writing Catalog list to Firestore:', err);
  }
}

export async function clearCollectionInFirestore(collectionName: string): Promise<void> {
  if (collectionName === COLLECTIONS.PULLS) setCachedData(CACHE_KEYS.PULLS, []);
  if (collectionName === COLLECTIONS.BLITZ) setCachedData(CACHE_KEYS.BLITZ, []);
  if (collectionName === COLLECTIONS.PNCS) setCachedData(CACHE_KEYS.PNCS, []);
  if (collectionName === COLLECTIONS.REPORT_030519) setCachedData(CACHE_KEYS.REPORT_030519, []);

  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error(`Error clearing collection ${collectionName} in Firestore:`, err);
  }
}

export async function clearAllFirestoreData(): Promise<void> {
  setCachedData(CACHE_KEYS.PULLS, []);
  setCachedData(CACHE_KEYS.BLITZ, []);
  setCachedData(CACHE_KEYS.PNCS, []);
  setCachedData(CACHE_KEYS.REPORT_030519, []);

  await Promise.all([
    clearCollectionInFirestore(COLLECTIONS.PULLS),
    clearCollectionInFirestore(COLLECTIONS.BLITZ),
    clearCollectionInFirestore(COLLECTIONS.PNCS),
    clearCollectionInFirestore(COLLECTIONS.REPORT_030519)
  ]);
}

// User Accounts Firestore Integration
export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: '123',
    fullName: 'Administrador NRI',
    role: 'ADMINISTRADOR',
    unit: 'GUARABIRA - PB',
    createdAt: '2026-01-01',
    active: true
  },
  {
    id: 'user-gilson',
    username: 'gilson',
    password: '123',
    fullName: 'Gilson Conferente',
    role: 'CONFERENTE',
    unit: 'GUARABIRA - PB',
    createdAt: '2026-01-01',
    active: true
  },
  {
    id: 'user-paubrasil',
    username: 'paubrasil',
    password: '123',
    fullName: 'Equipe Pau Brasil',
    role: 'SUPERVISOR',
    unit: 'GUARABIRA - PB',
    createdAt: '2026-01-01',
    active: true
  }
];

let hasLoadedUsersOnce = false;
export function subscribeToUsers(onUpdate: (users: UserAccount[]) => void) {
  const usersRef = collection(db, COLLECTIONS.USERS);
  return onSnapshot(usersRef, async (snapshot) => {
    if (snapshot.empty && !hasLoadedUsersOnce) {
      hasLoadedUsersOnce = true;
      // Seed initial default users if Firestore collection is brand new
      for (const u of DEFAULT_USERS) {
        await setDoc(doc(db, COLLECTIONS.USERS, u.id), u);
      }
      onUpdate(DEFAULT_USERS);
      return;
    }
    hasLoadedUsersOnce = true;
    const list: UserAccount[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as UserAccount);
    });
    list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to users in Firestore, falling back to defaults:', error);
    onUpdate(DEFAULT_USERS);
  });
}

export async function saveUserToFirestore(user: UserAccount): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, user.id);
  await setDoc(userRef, user, { merge: true });
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await deleteDoc(userRef);
}

// ==========================================
// SUPPLIERS & FACTORIES FIRESTORE INTEGRATION
// ==========================================
let hasLoadedSuppliersOnce = false;

export function subscribeToSuppliers(onUpdate: (suppliers: SupplierItem[]) => void) {
  const cached = getCachedData<SupplierItem[]>(CACHE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const suppliersRef = collection(db, COLLECTIONS.SUPPLIERS);
  return onSnapshot(suppliersRef, async (snapshot) => {
    if (snapshot.empty && !hasLoadedSuppliersOnce) {
      hasLoadedSuppliersOnce = true;
      // Seed initial 29 suppliers if Firestore collection is brand new
      try {
        const batch = writeBatch(db);
        for (const s of INITIAL_SUPPLIERS) {
          const docRef = doc(db, COLLECTIONS.SUPPLIERS, s.id);
          batch.set(docRef, s);
        }
        await batch.commit();
      } catch (err) {
        console.warn('Could not seed initial suppliers to Firestore:', err);
      }
      setCachedData(CACHE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
      onUpdate(INITIAL_SUPPLIERS);
      return;
    }

    hasLoadedSuppliersOnce = true;
    const list: SupplierItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as SupplierItem);
    });

    list.sort((a, b) => a.name.localeCompare(b.name));
    if (list.length > 0) {
      setCachedData(CACHE_KEYS.SUPPLIERS, list);
    }
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to suppliers in Firestore, falling back to cache:', error);
    onUpdate(getCachedData<SupplierItem[]>(CACHE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS));
  });
}

export async function saveSupplierToFirestore(supplier: SupplierItem): Promise<void> {
  const existing = getCachedData<SupplierItem[]>(CACHE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  const idx = existing.findIndex(s => s.id === supplier.id);
  const updated = idx >= 0 ? [...existing] : [...existing, supplier];
  if (idx >= 0) updated[idx] = supplier;
  setCachedData(CACHE_KEYS.SUPPLIERS, updated);

  try {
    const ref = doc(db, COLLECTIONS.SUPPLIERS, supplier.id);
    await setDoc(ref, supplier, { merge: true });
  } catch (err) {
    console.error('Error writing Supplier to Firestore:', err);
  }
}

export async function deleteSupplierFromFirestore(supplierId: string): Promise<void> {
  const existing = getCachedData<SupplierItem[]>(CACHE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  const filtered = existing.filter(s => s.id !== supplierId);
  setCachedData(CACHE_KEYS.SUPPLIERS, filtered);

  try {
    const ref = doc(db, COLLECTIONS.SUPPLIERS, supplierId);
    await deleteDoc(ref);
  } catch (err) {
    console.error('Error deleting Supplier from Firestore:', err);
  }
}

export async function resetSuppliersToDefault(): Promise<void> {
  setCachedData(CACHE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  try {
    const colRef = collection(db, COLLECTIONS.SUPPLIERS);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach(d => batch.delete(d.ref));
    for (const s of INITIAL_SUPPLIERS) {
      const docRef = doc(db, COLLECTIONS.SUPPLIERS, s.id);
      batch.set(docRef, s);
    }
    await batch.commit();
  } catch (err) {
    console.error('Error resetting suppliers in Firestore:', err);
  }
}

// ==========================================
// BRANDING SETTINGS FIRESTORE INTEGRATION
// ==========================================
export function subscribeToBrandSettings(onUpdate: (brand: any) => void) {
  const brandingRef = doc(db, COLLECTIONS.BRANDING, 'main');
  return onSnapshot(brandingRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onUpdate(data);
    }
  }, (error) => {
    console.warn('Error listening to branding in Firestore:', error);
  });
}

export async function saveBrandSettingsToFirestore(brandSettings: any): Promise<void> {
  try {
    const brandingRef = doc(db, COLLECTIONS.BRANDING, 'main');
    await setDoc(brandingRef, brandSettings, { merge: true });
  } catch (err) {
    console.error('Error writing branding to Firestore:', err);
  }
}


