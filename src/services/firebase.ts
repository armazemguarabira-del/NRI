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
import { PullRecord, BlitzRecord, PNCRecord, Report030519Item, ProductCatalogItem, UserAccount } from '../types';

// Initialize Firebase App instance safely (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Collection Names in Firestore
export const COLLECTIONS = {
  PULLS: 'nri_pulls',
  BLITZ: 'nri_blitz',
  PNCS: 'nri_pncs',
  REPORT_030519: 'nri_report_030519',
  CATALOG: 'nri_product_catalog',
  BRANDING: 'nri_branding_settings',
  USERS: 'nri_users'
} as const;

// LocalStorage Cache Keys
export const CACHE_KEYS = {
  PULLS: 'nri_cached_pulls',
  BLITZ: 'nri_cached_blitz',
  PNCS: 'nri_cached_pncs',
  REPORT_030519: 'nri_cached_report030519',
  CATALOG: 'nri_cached_catalog',
  USERS: 'nri_cached_users'
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

// Real-time synchronization hooks/subscribers with Cache fallback
export function subscribeToPulls(onUpdate: (pulls: PullRecord[]) => void) {
  // Emit immediately from cache to ensure zero flash / zero data loss
  const cached = getCachedData<PullRecord[]>(CACHE_KEYS.PULLS, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const pullsRef = collection(db, COLLECTIONS.PULLS);
  return onSnapshot(pullsRef, (snapshot) => {
    const list: PullRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PullRecord);
    });
    // Sort descending by createdAt or receiptDate
    list.sort((a, b) => (b.header.createdAt || b.header.receiptDate || '').localeCompare(a.header.createdAt || a.header.receiptDate || ''));
    
    // Save to cache
    if (list.length > 0 || snapshot.empty) {
      setCachedData(CACHE_KEYS.PULLS, list);
    }
    onUpdate(list);
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
  return onSnapshot(blitzRef, (snapshot) => {
    const list: BlitzRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as BlitzRecord);
    });
    list.sort((a, b) => (b.blockDate || '').localeCompare(a.blockDate || ''));
    setCachedData(CACHE_KEYS.BLITZ, list);
    onUpdate(list);
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
  return onSnapshot(pncRef, (snapshot) => {
    const list: PNCRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PNCRecord);
    });
    list.sort((a, b) => (b.requestDate || '').localeCompare(a.requestDate || ''));
    setCachedData(CACHE_KEYS.PNCS, list);
    onUpdate(list);
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
