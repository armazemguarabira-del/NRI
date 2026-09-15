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
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  PullRecord, 
  BlitzRecord, 
  PNCRecord, 
  Report030519Item, 
  ProductCatalogItem, 
  UserAccount, 
  SupplierItem,
  LabelPrintEvent,
  ActivityLogEvent
} from '../types';
import { INITIAL_SUPPLIERS } from '../data/initialSuppliers';

// Initialize Firebase App instance safely (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Direct binding to the Firestore Database (supports default or custom database IDs)
const customDbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = (customDbId && customDbId.trim() !== '' && customDbId !== '(default)')
  ? getFirestore(app, customDbId)
  : getFirestore(app);

// Validate connection on boot as mandated by Firebase skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Aviso: Cliente offline ou conectando ao Firestore...');
      return false;
    }
    return true;
  }
}
testConnection();

// Collection Names in Firestore
export const COLLECTIONS = {
  PULLS: 'nri_pulls',
  BLITZ: 'nri_blitz',
  PNCS: 'nri_pncs',
  REPORT_030519: 'nri_report_030519',
  CATALOG: 'nri_product_catalog',
  BRANDING: 'nri_branding_settings',
  USERS: 'nri_users',
  SUPPLIERS: 'nri_suppliers',
  LABEL_PRINTS: 'nri_label_prints',
  ACTIVITY_LOGS: 'nri_activity_logs'
} as const;

// LocalStorage Cache Keys
export const CACHE_KEYS = {
  PULLS: 'nri_cached_pulls',
  BLITZ: 'nri_cached_blitz',
  PNCS: 'nri_cached_pncs',
  REPORT_030519: 'nri_cached_report030519',
  CATALOG: 'nri_cached_catalog',
  USERS: 'nri_cached_users',
  SUPPLIERS: 'nri_cached_suppliers',
  LABEL_PRINTS: 'nri_cached_label_prints',
  ACTIVITY_LOGS: 'nri_cached_activity_logs'
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
      const p = docSnap.data() as PullRecord;
      if (p.header && (!p.header.factoryOrigin || p.header.factoryOrigin === 'F. Itapissuma')) {
        p.header.factoryOrigin = '950 - ITAPISSUMA';
      }
      list.push(p);
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
  const isNew = idx < 0;
  const updated = isNew ? [pull, ...existing] : [...existing];
  if (!isNew) updated[idx] = pull;
  setCachedData(CACHE_KEYS.PULLS, updated);

  try {
    const pullRef = doc(db, COLLECTIONS.PULLS, pull.header.id);
    await setDoc(pullRef, pull, { merge: true });
  } catch (err) {
    console.error('Error writing pull to Firestore (saved locally in cache):', err);
  }

  // Real-time evolution log
  logActivityToFirestore({
    category: 'PUXADA',
    severity: pull.hasValidityAlert ? 'warning' : 'success',
    title: isNew ? 'Nova Puxada Registrada' : 'Puxada Atualizada',
    description: `${isNew ? 'Criada' : 'Modificada'} entrada da carreta ${pull.header.truckPlate} (NF ${pull.header.nfeNumber}) com ${pull.totalPallets} pallets por ${pull.header.receiverName || 'Operador'}`,
    userName: pull.header.receiverName || 'Operador',
    referenceId: pull.header.id,
    metadata: {
      truckPlate: pull.header.truckPlate,
      nfeNumber: pull.header.nfeNumber,
      totalPallets: pull.totalPallets,
      factoryOrigin: pull.header.factoryOrigin,
      isNew
    }
  }).catch(() => {});
}

export async function deletePullFromFirestore(pullId: string): Promise<void> {
  // Update local cache
  const existing = getCachedData<PullRecord[]>(CACHE_KEYS.PULLS, []);
  const target = existing.find(p => p.header.id === pullId);
  const filtered = existing.filter(p => p.header.id !== pullId);
  setCachedData(CACHE_KEYS.PULLS, filtered);

  try {
    const pullRef = doc(db, COLLECTIONS.PULLS, pullId);
    await deleteDoc(pullRef);
  } catch (err) {
    console.error('Error deleting pull from Firestore:', err);
  }

  logActivityToFirestore({
    category: 'PUXADA',
    severity: 'warning',
    title: 'Puxada Excluída',
    description: `Puxada NF ${target?.header.nfeNumber || pullId} - Placa ${target?.header.truckPlate || ''} foi removida do sistema`,
    userName: 'Administrador/Operador',
    referenceId: pullId
  }).catch(() => {});
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

  logActivityToFirestore({
    category: 'AVARIA',
    severity: 'warning',
    title: 'Registro de Blitz de Puxada',
    description: `Avaria reportada: ${record.blockedQty} un bloqueadas (${record.damageType}) em ${record.productDescription} - NF ${record.nfeNumber}`,
    userName: record.conferente || 'Conferente',
    referenceId: record.id
  }).catch(() => {});
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

  logActivityToFirestore({
    category: 'BLOQUEIO',
    severity: 'critical',
    title: 'Abertura de PNC / Bloqueio Fiscal',
    description: `PNC ${record.pncNumber} aberto para NF ${record.nfeNumber} (${record.quantityBlocked} un de ${record.productDescription}): ${record.reason}`,
    userName: 'Qualidade / Conferência',
    referenceId: record.id
  }).catch(() => {});
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

  logActivityToFirestore({
    category: 'SISTEMA',
    severity: 'info',
    title: 'Relatório 03.05.19 Atualizado',
    description: `Sincronização de ${items.length} SKUs com curva ABC de movimentação e giro diário`,
    userName: 'Sistema / Planejamento'
  }).catch(() => {});
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

    const MAIN_CODES = ['950', '426', '3006', '436', '421'];
    list.sort((a, b) => {
      const aCode = String(a.code).trim();
      const bCode = String(b.code).trim();
      const aIdx = MAIN_CODES.indexOf(aCode);
      const bIdx = MAIN_CODES.indexOf(bCode);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
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

// ==========================================
// LABEL CUSTOM CONFIG FIRESTORE INTEGRATION
// ==========================================
export function subscribeToLabelConfig(onUpdate: (config: any) => void) {
  const labelConfigRef = doc(db, COLLECTIONS.BRANDING, 'label_custom_layout');
  return onSnapshot(labelConfigRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onUpdate(data);
    }
  }, (error) => {
    console.warn('Error listening to label config in Firestore:', error);
  });
}

export async function saveLabelConfigToFirestore(config: any): Promise<void> {
  try {
    const labelConfigRef = doc(db, COLLECTIONS.BRANDING, 'label_custom_layout');
    await setDoc(labelConfigRef, config, { merge: true });
  } catch (err) {
    console.error('Error writing label config to Firestore:', err);
  }
}

// ==========================================
// LABEL PRINT MONITORING FIRESTORE INTEGRATION
// ==========================================
export function subscribeToLabelPrints(onUpdate: (prints: LabelPrintEvent[]) => void) {
  const cached = getCachedData<LabelPrintEvent[]>(CACHE_KEYS.LABEL_PRINTS, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const printsRef = collection(db, COLLECTIONS.LABEL_PRINTS);
  return onSnapshot(printsRef, (snapshot) => {
    const list: LabelPrintEvent[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as LabelPrintEvent);
    });
    // Sort descending by printedAt
    list.sort((a, b) => (b.printedAt || '').localeCompare(a.printedAt || ''));
    setCachedData(CACHE_KEYS.LABEL_PRINTS, list);
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to label prints in Firestore, using cache fallback:', error);
    onUpdate(getCachedData<LabelPrintEvent[]>(CACHE_KEYS.LABEL_PRINTS, []));
  });
}

export async function logLabelPrintToFirestore(event: LabelPrintEvent): Promise<void> {
  // Update local cache immediately to prevent loss
  const existing = getCachedData<LabelPrintEvent[]>(CACHE_KEYS.LABEL_PRINTS, []);
  const updated = [event, ...existing.filter(e => e.id !== event.id)].slice(0, 500); // keep last 500
  setCachedData(CACHE_KEYS.LABEL_PRINTS, updated);

  try {
    const printRef = doc(db, COLLECTIONS.LABEL_PRINTS, event.id);
    await setDoc(printRef, event, { merge: true });
  } catch (err) {
    console.error('Error logging label print to Firestore:', err);
  }

  // Also automatically register an activity event for real-time monitoring
  logActivityToFirestore({
    category: 'ETIQUETAS',
    severity: event.printType === 'PRIMEIRA_EMISSAO' ? 'success' : 'info',
    title: `Etiquetas Impressas (${event.totalLabelsCount} un)`,
    description: `${event.userFullName || event.receiverName} imprimiu ${event.totalLabelsCount} etiquetas (${event.facesPerPallet} faces/pal) para NF ${event.nfeNumber} - Placa ${event.truckPlate}`,
    userName: event.userFullName || event.receiverName || 'Operador',
    referenceId: event.pullId || event.nfeNumber,
    metadata: {
      truckPlate: event.truckPlate,
      nfeNumber: event.nfeNumber,
      totalPallets: event.totalPallets,
      printFormat: event.printFormat,
      printType: event.printType
    }
  }).catch(() => {});
}

export async function deleteLabelPrintFromFirestore(printId: string): Promise<void> {
  const existing = getCachedData<LabelPrintEvent[]>(CACHE_KEYS.LABEL_PRINTS, []);
  setCachedData(CACHE_KEYS.LABEL_PRINTS, existing.filter(e => e.id !== printId));

  try {
    const printRef = doc(db, COLLECTIONS.LABEL_PRINTS, printId);
    await deleteDoc(printRef);
  } catch (err) {
    console.error('Error deleting label print from Firestore:', err);
  }
}

export async function clearLabelPrintsInFirestore(): Promise<void> {
  setCachedData(CACHE_KEYS.LABEL_PRINTS, []);
  try {
    const colRef = collection(db, COLLECTIONS.LABEL_PRINTS);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.error('Error clearing label prints in Firestore:', err);
  }
}

// ==========================================
// REAL-TIME AUDIT & EVOLUTION LOGS INTEGRATION
// ==========================================
export function subscribeToActivityLogs(onUpdate: (logs: ActivityLogEvent[]) => void) {
  const cached = getCachedData<ActivityLogEvent[]>(CACHE_KEYS.ACTIVITY_LOGS, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const logsRef = collection(db, COLLECTIONS.ACTIVITY_LOGS);
  return onSnapshot(logsRef, (snapshot) => {
    const list: ActivityLogEvent[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ActivityLogEvent);
    });
    list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    setCachedData(CACHE_KEYS.ACTIVITY_LOGS, list);
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to activity logs in Firestore, using cache fallback:', error);
    onUpdate(getCachedData<ActivityLogEvent[]>(CACHE_KEYS.ACTIVITY_LOGS, []));
  });
}

export async function logActivityToFirestore(
  event: Omit<ActivityLogEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): Promise<void> {
  const fullEvent: ActivityLogEvent = {
    id: event.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: event.timestamp || new Date().toISOString(),
    category: event.category,
    severity: event.severity,
    title: event.title,
    description: event.description,
    userName: event.userName,
    userRole: event.userRole || 'OPERADOR',
    referenceId: event.referenceId || '',
    metadata: event.metadata || {}
  };

  // Immediate local cache write
  const existing = getCachedData<ActivityLogEvent[]>(CACHE_KEYS.ACTIVITY_LOGS, []);
  const updated = [fullEvent, ...existing.filter(e => e.id !== fullEvent.id)].slice(0, 300);
  setCachedData(CACHE_KEYS.ACTIVITY_LOGS, updated);

  try {
    const ref = doc(db, COLLECTIONS.ACTIVITY_LOGS, fullEvent.id);
    await setDoc(ref, fullEvent, { merge: true });
  } catch (err) {
    console.error('Error logging activity to Firestore:', err);
  }
}

export async function clearActivityLogsInFirestore(): Promise<void> {
  setCachedData(CACHE_KEYS.ACTIVITY_LOGS, []);
  try {
    const colRef = collection(db, COLLECTIONS.ACTIVITY_LOGS);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.error('Error clearing activity logs in Firestore:', err);
  }
}


