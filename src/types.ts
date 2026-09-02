export type ABCClass = 'A' | 'B' | 'C';

export type ShiftType = 'Manhã' | 'Tarde' | 'Noite';

export type PullStatus = 'OK' | 'PENDENTE' | 'DIVERGÊNCIA' | 'AVARIA';

export type ItemRiskLevel = 'Baixo' | 'Médio' | 'Alto';

export type NavTabType = 
  | 'analytics' 
  | 'new_pull' 
  | 'print_labels' 
  | 'conference_sheet' 
  | 'history' 
  | 'validity_alerts'
  | 'blitz' 
  | 'pnc' 
  | 'report_030519' 
  | 'catalog'
  | 'users'
  | 'database';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'CONFERENTE' | 'SUPERVISOR' | 'COORDENADOR' | 'ADMINISTRADOR' | 'OPERADOR';
  unit?: string;
  createdAt: string;
  active: boolean;
}

export interface ProductCatalogItem {
  code: string;
  description: string;
  unit: string;
  category: string;
  price: number;
  hectoliterFactor: number;
  palletFactor: number; // e.g. 84, 90, 100, 150
  lastroFactor: number;  // e.g. 12, 14, 15, 20
  abcClass: ABCClass;
  rank?: number;
  defaultShelfLifeDays?: number; // e.g. 180, 270, 365
  monthlyMovement?: number;
  cumulativeShare?: number;
}

export interface NRIItem {
  id: string;
  pullId?: string;
  productCode: string;
  description: string;
  unit: string;
  quantitySku: number;   // Total units / boxes
  palletCount: number;   // Calculated or entered
  lastroCount: number;   // Calculated or entered
  validityDate: string;  // YYYY-MM-DD
  status: 'OK' | 'ALERTA' | 'CRÍTICO' | 'BLOQUEADO';
  releasePeriodDays: number; // e.g. 40 days
  daysToExpiry: number;      // Days from receipt to expiry
  isPeriodOk: boolean;
  baseRisk: ItemRiskLevel;
  runoffDays: number;        // Dias para escoamento (do relatório 03.05.19)
  abcClass: ABCClass;
  hectoliterFactor: number;
  totalHectoliter: number;
  unitPrice: number;
  totalValue: number;
  preBlockDate: string;      // DD/MM/YYYY or YYYY-MM-DD
  loadUntilDate: string;     // DD/MM/YYYY or YYYY-MM-DD
  palletNumber?: number;     // 1 to N
}

export interface NRIPullHeader {
  id: string;
  nfeNumber: string;        // NOTA
  issueDate: string;        // Data Emissão (YYYY-MM-DD)
  receiptDate: string;      // Data receb. (YYYY-MM-DD)
  receiptTime: string;      // Hora receb. (HH:mm)
  orderNumber: string;      // Pedido (ex: 31700)
  truckPlate: string;       // CARRETA (ex: RLU3F59)
  factoryOrigin: string;    // Origem (ex: F. Itapissuma)
  shift: ShiftType;         // Turno (Manhã, Tarde, Noite)
  receiverName: string;     // Conferente (ex: Gilson)
  branchOp: string;         // OP (ex: GUARABIRA / PAU BRASIL GUARABIRA)
  status: PullStatus;
  promaxEntry: string;      // Entrada Promax (número/código)
  pbr1Count: number;        // PBRI
  pbr2Count: number;        // PBRII
  chapatexCount: number;    // Chapatex
  notes?: string;
  createdAt: string;
}

export interface PullRecord {
  header: NRIPullHeader;
  items: NRIItem[];
  totalPallets: number;
  totalSku: number;
  totalHectoliters: number;
  totalValue: number;
  hasValidityAlert: boolean;
  alertCount: number;
  averageStockAgeIndex: number;
}

export interface BlitzPalletRecord {
  id: string;
  pullId: string;
  nfeNumber: string;
  truckPlate: string;
  factoryOrigin: string;
  palletNumber: number;
  productCode: string;
  productDescription: string;
  unit: string;
  unitPrice: number;
  blockedQty: number;      // Quantidade no pallet
  retainedQty: number;     // Quantidade avariada / retida
  releasedQty: number;     // Quantidade liberada pós-retrabalho
  lossValue: number;       // retainedQty * unitPrice
  lossHectoliters?: number; // retainedQty * hectoliterFactor
  blockDate: string;       // YYYY-MM-DD
  releaseDate?: string | null; // YYYY-MM-DD
  status: 'BLOQUEADO' | 'EM_RETRABALHO' | 'LIBERADO' | 'PNC_SOLICITADO';
  damageType: string;      // Amassado, Vazamento, Quebra, Tombado, Rótulo, Outro
  conferente: string;
  notes?: string;
  pncId?: string;
}

export type BlitzRecord = BlitzPalletRecord;

export interface PNCRecord {
  id: string;
  pncNumber: string;       // PNC-2026-001
  protocolNumber?: string; // Protocol alias
  pullId?: string;
  blitzId?: string;
  nfeNumber: string;
  truckPlate: string;
  factoryOrigin: string;
  productCode: string;
  productDescription: string;
  lotNumber: string;
  validityDate: string;
  quantityBlocked: number;
  lossValue: number;
  blockedHectoliters?: number;
  reason: string;          // Motivo do bloqueio fiscal / Não conformidade
  qualityIssueType: 'Corpo Estranho' | 'Vazamento em Massa' | 'Lote Fora Padrão' | 'Data Ilegível' | 'Fermentação' | 'Mofo' | 'Pallet Estrutural' | 'Outro';
  requestedBy: string;     // Conferente / Operador
  requestDate: string;     // YYYY-MM-DD HH:mm
  fiscalBlockStatus: 'PENDENTE' | 'EFETIVADO' | 'TRATADO' | 'DESCARTADO' | 'DEVOLVIDO';
  fiscalBlockRealizedBy?: string;
  fiscalBlockDate?: string;
  promaxProtocol?: string;
  treatmentNotes?: string;
}

export interface Report030519Item {
  unb: string;
  unbOrigin: string;
  productCode: string;
  productName: string;
  unit: string;
  sales: number;        // Venda
  bonus: number;        // Bonif
  loan: number;         // Empr
  shipment: number;     // Remessa
  consignment: number;  // Consig
  supplierReturn: number; // Dev. For
  transfer: number;     // Transf
  other: number;        // Outras
  returnAmount: number; // Devol
  returnPct: number;    // %Devol
  totalMovement: number; // Total
  dailySalesAvg?: number;
  estimatedStockRunoffDays?: number;
  abcClass?: ABCClass;
  rank?: number;
  cumulativePct?: number;
}

export interface PullFilterState {
  search: string;
  productCode: string;
  factoryOrigin: string;
  nfeNumber: string;
  month: string; // YYYY-MM or 'ALL'
  abcClass: string; // 'ALL' | 'A' | 'B' | 'C'
  riskLevel: string; // 'ALL' | 'Baixo' | 'Médio' | 'Alto'
  validityAlertOnly: boolean;
  receiver: string;
}

