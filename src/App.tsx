import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, NavTabType } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { NRICreationForm } from './components/NRICreationForm';
import { NRILabelPrintView } from './components/NRILabelPrintView';
import { NRIConferenceSheetPrintView } from './components/NRIConferenceSheetPrintView';
import { MonthlyHistoryView } from './components/MonthlyHistoryView';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { Report030519View } from './components/Report030519View';
import { ProductCatalogView } from './components/ProductCatalogView';
import { BlitzPuxadaView } from './components/BlitzPuxadaView';
import { PNCView } from './components/PNCView';
import { ValidityAlertsView } from './components/ValidityAlertsView';
import { DatabaseView } from './components/DatabaseView';
import { BrandingModal } from './components/BrandingModal';
import { LoginView } from './components/LoginView';
import { UserManagementView } from './components/UserManagementView';

import { PullRecord, ProductCatalogItem, Report030519Item, BlitzRecord, PNCRecord, UserAccount } from './types';
import { INITIAL_PRODUCTS } from './data/initialCatalog';
import { 
  subscribeToPulls, 
  subscribeToBlitz, 
  subscribeToPNCs, 
  subscribeToReport030519, 
  subscribeToCatalog,
  subscribeToUsers,
  savePullToFirestore,
  deletePullFromFirestore,
  saveBlitzToFirestore,
  deleteBlitzFromFirestore,
  savePNCToFirestore,
  deletePNCFromFirestore,
  saveReport030519ToFirestore,
  saveCatalogItemToFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  clearCollectionInFirestore,
  clearAllFirestoreData,
  COLLECTIONS,
  DEFAULT_USERS
} from './services/firebase';
import { Image as ImageIcon, AlertTriangle, Zap, ShieldAlert, Sparkles, Database, Cloud, Wifi } from 'lucide-react';

export default function App() {
  // Authentication & Current User Session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('nri_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState<UserAccount[]>(DEFAULT_USERS);

  // Navigation State (Dashboard is the first tab)
  const [activeTab, setActiveTab] = useState<NavTabType>('analytics');

  // Sidebar Collapse/Expand State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Branding Modal State
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);

  // Firestore Real-Time State - Starts zeroed/clean (only showing what was manually inserted)
  const [pulls, setPulls] = useState<PullRecord[]>([]);
  const [catalog, setCatalog] = useState<ProductCatalogItem[]>(INITIAL_PRODUCTS);
  const [reportItems, setReportItems] = useState<Report030519Item[]>([]);
  const [blitzRecords, setBlitzRecords] = useState<BlitzRecord[]>([]);
  const [pncRecords, setPncRecords] = useState<PNCRecord[]>([]);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    const unsubPulls = subscribeToPulls((updatedPulls) => {
      setPulls(updatedPulls);
    });

    const unsubBlitz = subscribeToBlitz((updatedBlitz) => {
      setBlitzRecords(updatedBlitz);
    });

    const unsubPNCs = subscribeToPNCs((updatedPNCs) => {
      setPncRecords(updatedPNCs);
    });

    const unsubReport = subscribeToReport030519((updatedReport) => {
      if (updatedReport.length > 0) {
        setReportItems(updatedReport);
      }
    });

    const unsubCatalog = subscribeToCatalog((updatedCatalog) => {
      if (updatedCatalog.length > 0) {
        setCatalog(updatedCatalog);
      }
    });

    const unsubUsers = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
    });

    return () => {
      unsubPulls();
      unsubBlitz();
      unsubPNCs();
      unsubReport();
      unsubCatalog();
      unsubUsers();
    };
  }, []);

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('nri_active_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('nri_active_user');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveUser = async (userToSave: UserAccount) => {
    try {
      await saveUserToFirestore(userToSave);
      setUsers(prev => {
        const idx = prev.findIndex(u => u.id === userToSave.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = userToSave;
          return copy;
        }
        return [...prev, userToSave];
      });
      // If updating current active user
      if (currentUser?.id === userToSave.id) {
        setCurrentUser(userToSave);
        localStorage.setItem('nri_active_user', JSON.stringify(userToSave));
      }
    } catch (e) {
      console.error('Error saving user to Firestore:', e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserFromFirestore(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      console.error('Error deleting user from Firestore:', e);
    }
  };

  // Currently Selected Pull for Printing
  const [selectedPull, setSelectedPull] = useState<PullRecord | null>(null);

  useEffect(() => {
    if (pulls.length > 0 && !selectedPull) {
      setSelectedPull(pulls[0]);
    }
  }, [pulls, selectedPull]);

  // Total Alert Count (< 3 months / 90 days)
  const alertCount = useMemo(() => {
    let count = 0;
    pulls.forEach(p => {
      count += p.alertCount;
    });
    return count;
  }, [pulls]);

  // Handlers (Persisting directly to Firebase Firestore)
  const handleSavePull = async (newPull: PullRecord, printAction?: 'labels' | 'sheet' | null) => {
    try {
      // Save directly to Firestore (real-time listener updates state)
      await savePullToFirestore(newPull);
      setSelectedPull(newPull);
      
      if (printAction === 'sheet') {
        setActiveTab('conference_sheet');
      } else if (printAction === 'labels') {
        setActiveTab('print_labels');
      } else {
        setActiveTab('history');
      }
    } catch (e) {
      console.error('Error saving pull to Firestore:', e);
      // Fallback local update
      setPulls(prev => [newPull, ...prev.filter(p => p.header.id !== newPull.header.id)]);
      setSelectedPull(newPull);
    }
  };

  const handleDeletePull = async (pullId: string) => {
    try {
      await deletePullFromFirestore(pullId);
      if (selectedPull?.header.id === pullId) {
        const remaining = pulls.filter(p => p.header.id !== pullId);
        setSelectedPull(remaining[0] || null);
      }
    } catch (e) {
      console.error('Error deleting pull from Firestore:', e);
      setPulls(prev => prev.filter(p => p.header.id !== pullId));
    }
  };

  const handleSelectPullForLabels = (pull: PullRecord) => {
    setSelectedPull(pull);
    setActiveTab('print_labels');
  };

  const handleSelectPullForSheet = (pull: PullRecord) => {
    setSelectedPull(pull);
    setActiveTab('conference_sheet');
  };

  const handleUpdateBlitzRecords = async (updatedRecords: BlitzRecord[]) => {
    try {
      // Find deleted records
      const existingIds = new Set(updatedRecords.map(r => r.id));
      for (const old of blitzRecords) {
        if (!existingIds.has(old.id)) {
          await deleteBlitzFromFirestore(old.id);
        }
      }
      // Save/Update new or modified records
      for (const rec of updatedRecords) {
        await saveBlitzToFirestore(rec);
      }
      setBlitzRecords(updatedRecords);
    } catch (e) {
      console.error('Error updating blitz records in Firestore:', e);
      setBlitzRecords(updatedRecords);
    }
  };

  const handleAddBlitzRecord = async (newBlitz: BlitzRecord, createPNC?: boolean) => {
    try {
      await saveBlitzToFirestore(newBlitz);

      if (createPNC && newBlitz.retainedQty > 0) {
        const generatedPNC: PNCRecord = {
          id: `pnc-${Date.now()}`,
          pncNumber: `PNC-PBRI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          nfeNumber: newBlitz.nfeNumber,
          truckPlate: newBlitz.truckPlate,
          factoryOrigin: newBlitz.factoryOrigin,
          productCode: newBlitz.productCode,
          productDescription: newBlitz.productDescription,
          lotNumber: 'LOTE-PADRAO',
          validityDate: newBlitz.blockDate,
          quantityBlocked: newBlitz.blockedQty,
          lossValue: newBlitz.lossValue,
          reason: `Avaria detectada na Blitz de Puxada (${newBlitz.damageType} - ${newBlitz.retainedQty} un retidas)`,
          qualityIssueType: newBlitz.damageType === 'Vazamento' ? 'Vazamento em Massa' : 'Outro',
          requestedBy: newBlitz.conferente,
          requestDate: new Date().toISOString(),
          fiscalBlockStatus: 'PENDENTE'
        };
        await savePNCToFirestore(generatedPNC);
      }
    } catch (e) {
      console.error('Error saving blitz to Firestore:', e);
      setBlitzRecords(prev => [newBlitz, ...prev]);
    }
  };

  // Clear All System Data (Full Reset in Firestore and State)
  const handleClearAllData = async () => {
    try {
      await clearAllFirestoreData();
    } catch (e) {
      console.error('Error clearing Firestore:', e);
    }
    setPulls([]);
    setBlitzRecords([]);
    setPncRecords([]);
    setReportItems([]);
    setSelectedPull(null);
  };

  // Clear Specific Base
  const handleClearSpecificBase = async (baseName: 'pulls' | 'blitz' | 'pnc' | 'report' | 'catalog') => {
    try {
      if (baseName === 'pulls') {
        await clearCollectionInFirestore(COLLECTIONS.PULLS);
        setPulls([]);
        setSelectedPull(null);
      } else if (baseName === 'blitz') {
        await clearCollectionInFirestore(COLLECTIONS.BLITZ);
        setBlitzRecords([]);
      } else if (baseName === 'pnc') {
        await clearCollectionInFirestore(COLLECTIONS.PNCS);
        setPncRecords([]);
      } else if (baseName === 'report') {
        await clearCollectionInFirestore(COLLECTIONS.REPORT_030519);
        setReportItems([]);
      } else if (baseName === 'catalog') {
        await clearCollectionInFirestore(COLLECTIONS.CATALOG);
        setCatalog(INITIAL_PRODUCTS);
      }
    } catch (e) {
      console.error('Error clearing base in Firestore:', e);
    }
  };

  // Restore Backup JSON / Upload
  const handleRestoreBackupJSON = async (importedData: {
    pulls?: PullRecord[];
    blitzRecords?: BlitzRecord[];
    pncs?: PNCRecord[];
    report030519?: Report030519Item[];
    catalog?: ProductCatalogItem[];
  }) => {
    if (importedData.pulls) {
      for (const p of importedData.pulls) {
        await savePullToFirestore(p);
      }
      setPulls(importedData.pulls);
      if (importedData.pulls.length > 0) setSelectedPull(importedData.pulls[0]);
    }
    if (importedData.blitzRecords) {
      for (const b of importedData.blitzRecords) {
        await saveBlitzToFirestore(b);
      }
      setBlitzRecords(importedData.blitzRecords);
    }
    if (importedData.pncs) {
      for (const pnc of importedData.pncs) {
        await savePNCToFirestore(pnc);
      }
      setPncRecords(importedData.pncs);
    }
    if (importedData.report030519) {
      await saveReport030519ToFirestore(importedData.report030519);
      setReportItems(importedData.report030519);
    }
    if (importedData.catalog) {
      for (const cat of importedData.catalog) {
        await saveCatalogItemToFirestore(cat);
      }
      setCatalog(importedData.catalog);
    }
  };

  // If user is not authenticated, display clean Login Screen only
  if (!currentUser) {
    return <LoginView users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex selection:bg-amber-500 selection:text-slate-950 font-sans text-slate-900">
      
      {/* 1. LATERAL EXPANDABLE / COLLAPSIBLE SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={alertCount}
        totalPullsCount={pulls.length}
        blitzCount={blitzRecords.length}
        pncCount={pncRecords.length}
        onOpenBrandingModal={() => setIsBrandingModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        collaboratorName={currentUser.fullName}
        collaboratorRole={currentUser.role}
        onLogout={handleLogout}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* TOP BAR WITH TITLE & CONTROLS */}
        <TopBar
          activeTab={activeTab}
          alertCount={alertCount}
          onOpenBrandingModal={() => setIsBrandingModalOpen(true)}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          onNavigate={setActiveTab}
        />

        {/* ORGANIZED NOTIFICATION BALLOON FOR CRITICAL VALIDITY ALERTS */}
        {alertCount > 0 && activeTab !== 'alerts' && (
          <div className="no-print mx-4 sm:mx-6 mt-4">
            <div 
              onClick={() => setActiveTab('alerts')}
              className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white p-3.5 px-5 rounded-2xl shadow-md border border-red-500 flex items-center justify-between gap-4 cursor-pointer transition-all hover:scale-[1.005] group"
              title="Clique para acessar a Central de Alertas de Validade"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide flex items-center gap-2">
                    <span>ATENÇÃO: {alertCount} LOTE(S) COM VALIDADE INFERIOR A 90 DIAS</span>
                    <span className="bg-white text-red-700 text-[10px] font-black px-2 py-0.2 rounded-full shadow-2xs">
                      AÇÃO FIFO/FEFO
                    </span>
                  </h4>
                  <p className="text-[11px] text-red-100 font-medium mt-0.5">
                    Há produtos com risco de shelf life na base da Pau Brasil Guarabira. Clique para auditar prazos e priorizar saídas.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black bg-white/10 group-hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/20 transition-colors">
                <span>Ver Alertas</span>
                <span className="text-sm">&rarr;</span>
              </div>
            </div>
          </div>
        )}

        {/* MAIN VIEWS */}
        <main className="flex-1 py-4 sm:py-6 px-3 sm:px-6">
          
          {/* DASHBOARD & BI */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard 
              pulls={pulls}
              catalog={catalog}
              blitzRecords={blitzRecords}
              pncRecords={pncRecords}
              onSelectPullForLabels={handleSelectPullForLabels}
              onNavigateToTab={setActiveTab}
            />
          )}

          {/* WORKSTATION (NOVA PUXADA / NRI) */}
          {activeTab === 'new_pull' && (
            <NRICreationForm 
              catalog={catalog}
              reportItems={reportItems}
              onSavePull={handleSavePull}
              onNavigateToCatalog={() => setActiveTab('catalog')}
              onNavigateToAlerts={() => setActiveTab('alerts')}
              currentUser={currentUser}
              onQuickRegisterProduct={(newProd) => {
                setCatalog(prev => {
                  if (prev.some(p => p.code === newProd.code)) {
                    return prev.map(p => p.code === newProd.code ? newProd : p);
                  }
                  return [...prev, newProd];
                });
              }}
            />
          )}

          {/* HISTÓRICO DE PUXADAS */}
          {activeTab === 'history' && (
            <MonthlyHistoryView 
              pulls={pulls}
              onSelectPullForLabels={handleSelectPullForLabels}
              onSelectPullForSheet={handleSelectPullForSheet}
              onDeletePull={handleDeletePull}
            />
          )}

          {/* BLITZ DE PUXADA */}
          {activeTab === 'blitz' && (
            <BlitzPuxadaView
              blitzRecords={blitzRecords}
              pulls={pulls}
              catalog={catalog}
              onUpdateBlitzRecords={handleUpdateBlitzRecords}
              onOpenPNCModal={() => setActiveTab('pnc')}
              onNavigateToPNC={() => setActiveTab('pnc')}
              currentUser={currentUser}
            />
          )}

          {/* PNC - PRODUTO NÃO CONFORME */}
          {activeTab === 'pnc' && (
            <PNCView
              pncs={pncRecords}
              onUpdatePncs={setPncRecords}
              pulls={pulls}
              catalog={catalog}
              currentUser={currentUser}
              onNavigateToBlitz={() => setActiveTab('blitz')}
            />
          )}

          {/* ALERTAS DE VALIDADE */}
          {activeTab === 'alerts' && (
            <ValidityAlertsView
              pulls={pulls}
              catalog={catalog}
              onSelectPull={(pullId) => {
                const found = pulls.find(p => p.header.id === pullId);
                if (found) {
                  setSelectedPull(found);
                  setActiveTab('print_labels');
                }
              }}
            />
          )}

          {/* RELATÓRIO 03.05.19 & PARETO 70/20/10 */}
          {activeTab === 'report_030519' && (
            <Report030519View 
              reportItems={reportItems}
              onUpdateReportItems={setReportItems}
              catalog={catalog}
              onUpdateCatalog={setCatalog}
            />
          )}

          {/* BASE DE CADASTROS & LOGOS */}
          {activeTab === 'catalog' && (
            <ProductCatalogView 
              catalog={catalog}
              onUpdateCatalog={setCatalog}
              pulls={pulls}
              blitzRecords={blitzRecords}
              pncRecords={pncRecords}
              reportItems={reportItems}
              onOpenBrandingModal={() => setIsBrandingModalOpen(true)}
              onNavigateToUsers={() => setActiveTab('users')}
            />
          )}

          {/* CADASTRO DE LOGINS & USUÁRIOS */}
          {activeTab === 'users' && (
            <UserManagementView 
              users={users}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              currentUser={currentUser}
            />
          )}

          {/* BASE DE DADOS, EXPORTAÇÃO CSV/JSON & RESET */}
          {activeTab === 'database' && (
            <DatabaseView 
              pulls={pulls}
              blitzRecords={blitzRecords}
              pncs={pncRecords}
              report030519={reportItems}
              catalog={catalog}
              onClearAllData={handleClearAllData}
              onClearSpecificBase={handleClearSpecificBase}
              onRestoreBackupJSON={handleRestoreBackupJSON}
            />
          )}

          {/* ETIQUETAS DE PALLETS */}
          {activeTab === 'print_labels' && (
            <NRILabelPrintView 
              pull={selectedPull}
              onBack={() => setActiveTab('history')}
              onOpenBrandingModal={() => setIsBrandingModalOpen(true)}
            />
          )}

          {/* ESPELHO DE CONFERÊNCIA */}
          {activeTab === 'conference_sheet' && (
            <NRIConferenceSheetPrintView 
              pull={selectedPull}
              onBack={() => setActiveTab('history')}
              onGoToLabels={() => setActiveTab('print_labels')}
              onOpenBrandingModal={() => setIsBrandingModalOpen(true)}
            />
          )}

        </main>

        {/* FOOTER */}
        <footer className="no-print bg-white border-t border-slate-200 py-3.5 px-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-700">Sistema NRI & Gestão de Puxadas v2.5</span>
              <span>— Ambev CDD Guarabira / Logística Fabril</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsBrandingModalOpen(true)}
                className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-bold hover:underline"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload de Logos e Imagens NRI</span>
              </button>
              <div className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                Curva ABC Pareto: <strong className="text-emerald-700">70% A (Verde)</strong> | <strong className="text-amber-700">20% B (Amarelo)</strong> | <strong className="text-red-700">10% C (Vermelho)</strong>
              </div>
            </div>
          </div>
        </footer>

      </div>

      {/* BRANDING / IMAGE UPLOAD MODAL */}
      <BrandingModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
      />

    </div>
  );
}
