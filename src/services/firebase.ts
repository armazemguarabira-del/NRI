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

// Real-time synchronization hooks/subscribers
export function subscribeToPulls(onUpdate: (pulls: PullRecord[]) => void) {
  const pullsRef = collection(db, COLLECTIONS.PULLS);
  return onSnapshot(pullsRef, (snapshot) => {
    const list: PullRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PullRecord);
    });
    // Sort descending by createdAt or receiptDate
    list.sort((a, b) => (b.header.createdAt || '').localeCompare(a.header.createdAt || ''));
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to pulls in Firestore:', error);
  });
}

export function subscribeToBlitz(onUpdate: (blitz: BlitzRecord[]) => void) {
  const blitzRef = collection(db, COLLECTIONS.BLITZ);
  return onSnapshot(blitzRef, (snapshot) => {
    const list: BlitzRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as BlitzRecord);
    });
    list.sort((a, b) => (b.blockDate || '').localeCompare(a.blockDate || ''));
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to blitz in Firestore:', error);
  });
}

export function subscribeToPNCs(onUpdate: (pncs: PNCRecord[]) => void) {
  const pncRef = collection(db, COLLECTIONS.PNCS);
  return onSnapshot(pncRef, (snapshot) => {
    const list: PNCRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PNCRecord);
    });
    list.sort((a, b) => (b.requestDate || '').localeCompare(a.requestDate || ''));
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to PNCs in Firestore:', error);
  });
}

export function subscribeToReport030519(onUpdate: (items: Report030519Item[]) => void) {
  const ref = collection(db, COLLECTIONS.REPORT_030519);
  return onSnapshot(ref, (snapshot) => {
    const list: Report030519Item[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Report030519Item);
    });
    list.sort((a, b) => a.rank - b.rank);
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to Report030519 in Firestore:', error);
  });
}

export function subscribeToCatalog(onUpdate: (catalog: ProductCatalogItem[]) => void) {
  const ref = collection(db, COLLECTIONS.CATALOG);
  return onSnapshot(ref, (snapshot) => {
    const list: ProductCatalogItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ProductCatalogItem);
    });
    list.sort((a, b) => (a.rank || 999) - (b.rank || 999));
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to catalog in Firestore:', error);
  });
}

// Write/Save operations
export async function savePullToFirestore(pull: PullRecord): Promise<void> {
  const pullRef = doc(db, COLLECTIONS.PULLS, pull.header.id);
  await setDoc(pullRef, pull, { merge: true });
}

export async function deletePullFromFirestore(pullId: string): Promise<void> {
  const pullRef = doc(db, COLLECTIONS.PULLS, pullId);
  await deleteDoc(pullRef);
}

export async function saveBlitzToFirestore(record: BlitzRecord): Promise<void> {
  const ref = doc(db, COLLECTIONS.BLITZ, record.id);
  await setDoc(ref, record, { merge: true });
}

export async function deleteBlitzFromFirestore(id: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.BLITZ, id);
  await deleteDoc(ref);
}

export async function savePNCToFirestore(record: PNCRecord): Promise<void> {
  const ref = doc(db, COLLECTIONS.PNCS, record.id);
  await setDoc(ref, record, { merge: true });
}

export async function deletePNCFromFirestore(id: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.PNCS, id);
  await deleteDoc(ref);
}

export async function saveReport030519ToFirestore(items: Report030519Item[]): Promise<void> {
  const batch = writeBatch(db);
  // Clear existing items in batch if any or upsert
  for (const it of items) {
    const ref = doc(db, COLLECTIONS.REPORT_030519, `item-${it.productCode}`);
    batch.set(ref, it);
  }
  await batch.commit();
}

export async function saveCatalogItemToFirestore(item: ProductCatalogItem): Promise<void> {
  const ref = doc(db, COLLECTIONS.CATALOG, `prod-${item.code}`);
  await setDoc(ref, item, { merge: true });
}

export async function clearCollectionInFirestore(collectionName: string): Promise<void> {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);
  snapshot.forEach((d) => {
    batch.delete(d.ref);
  });
  await batch.commit();
}

export async function clearAllFirestoreData(): Promise<void> {
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
