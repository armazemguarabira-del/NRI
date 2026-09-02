import { SupplierItem } from '../types';

export const INITIAL_SUPPLIERS: SupplierItem[] = [
  // 5 PRINCIPAIS FÁBRICAS (MAIS UTILIZADAS)
  { id: 'sup-950', code: '950', name: 'ITAPISSUMA', type: 'FÁBRICA', location: 'Pernambuco / PE', active: true, notes: 'Fábrica Ambev Itapissuma - Principal Fornecedora' },
  { id: 'sup-426', code: '426', name: 'CDR JOÃO PESSOA', type: 'FÁBRICA', location: 'João Pessoa / PB', active: true, notes: 'Centro de Distribuição Regional Ambev João Pessoa (CDR Paraíba)' },
  { id: 'sup-3006', code: '3006', name: 'SERGIPE', type: 'FÁBRICA', location: 'Sergipe / SE', active: true, notes: 'Fábrica / CD Ambev Sergipe' },
  { id: 'sup-436', code: '436', name: 'AQUIRAZ', type: 'FÁBRICA', location: 'Ceará / CE', active: true, notes: 'Fábrica Ambev Aquiraz' },
  { id: 'sup-421', code: '421', name: 'CAMAÇARI', type: 'FÁBRICA', location: 'Bahia / BA', active: true, notes: 'Fábrica Ambev Camaçari' },

  // DEMAIS FÁBRICAS, DISTRIBUIDORES E FORNECEDORES
  { id: 'sup-3007', code: '3007', name: 'M. DIAS BRANCO', type: 'FORNECEDOR', location: 'Ceará / CE', active: true, notes: 'Fornecedor Parceiro M. Dias Branco' },
  { id: 'sup-767', code: '767', name: 'SISA SAUIPE', type: 'FORNECEDOR', location: 'Bahia / BA', active: true, notes: 'Fornecedor Sisa Sauipe' },
  { id: 'sup-13', code: '13', name: 'PATOS', type: 'DISTRIBUIDOR', location: 'Paraíba / PB', active: true, notes: 'Filial / CD Pau Brasil Patos' },
  { id: 'sup-321', code: '321', name: 'MAGAZINE', type: 'CLIENTE / DEVOLUÇÃO', location: 'Paraíba / PB', active: true, notes: 'Cliente / Fornecedor Magazine' },
  { id: 'sup-325', code: '325', name: 'MIX MATEUS', type: 'CLIENTE / DEVOLUÇÃO', location: 'Paraíba / PB', active: true, notes: 'Grupo Mateus / Mix Mateus' },
  { id: 'sup-163', code: '163', name: 'ATACADÃO', type: 'CLIENTE / DEVOLUÇÃO', location: 'Paraíba / PB', active: true, notes: 'Rede Atacadão' },
  { id: 'sup-370', code: '370', name: 'ATACAMIX', type: 'CLIENTE / DEVOLUÇÃO', location: 'Paraíba / PB', active: true, notes: 'Atacamix Distribuição' },
  { id: 'sup-42', code: '42', name: 'MIX GBA', type: 'CLIENTE / DEVOLUÇÃO', location: 'Guarabira / PB', active: true, notes: 'Mix Guarabira Atacado' },
  { id: 'sup-378', code: '378', name: 'REAL ATACADO', type: 'CLIENTE / DEVOLUÇÃO', location: 'Paraíba / PB', active: true, notes: 'Real Atacado' },
  { id: 'sup-380', code: '380', name: 'BEM MAIS', type: 'CLIENTE / DEVOLUÇÃO', location: 'Paraíba / PB', active: true, notes: 'Rede Bem Mais' },
  { id: 'sup-99', code: '99', name: 'SOUSA', type: 'DISTRIBUIDOR', location: 'Paraíba / PB', active: true, notes: 'Filial / CD Pau Brasil Sousa' },
  { id: 'sup-3015', code: '3015', name: 'REAL MERCADO', type: 'CLIENTE / DEVOLUÇÃO', location: 'Paraíba / PB', active: true, notes: 'Real Mercado Varejo' },
  { id: 'sup-433', code: '433', name: 'MIX GBA VAREJO', type: 'CLIENTE / DEVOLUÇÃO', location: 'Guarabira / PB', active: true, notes: 'Mix Guarabira Varejo' },
  { id: 'sup-3028', code: '3028', name: 'NORDECE', type: 'FORNECEDOR', location: 'Ceará / CE', active: true, notes: 'Nordece Distribuição' },
  { id: 'sup-3031', code: '3031', name: 'MIX CONDE', type: 'CLIENTE / DEVOLUÇÃO', location: 'Paraíba / PB', active: true, notes: 'Mix Conde' },
  { id: 'sup-3030', code: '3030', name: 'B&A', type: 'FORNECEDOR', location: 'Paraíba / PB', active: true, notes: 'B&A Distribuição' },
  { id: 'sup-3036-eleve', code: '3036', name: 'ÉLEVE', type: 'FORNECEDOR', location: 'Brasil', active: true, notes: 'Éleve Água Mineral' },
  { id: 'sup-3036-asl', code: '3036', name: 'ASL', type: 'FORNECEDOR', location: 'Brasil', active: true, notes: 'ASL Logística / Fornecedor' },
  { id: 'sup-3041', code: '3041', name: 'NORDIL', type: 'FORNECEDOR', location: 'Nordeste', active: true, notes: 'Nordil Distribuição' },
  { id: 'sup-150', code: '150', name: 'INDAIA', type: 'FORNECEDOR', location: 'Ceará / PB', active: true, notes: 'Indaiá Águas Minerais e Bebidas' },
  { id: 'sup-3027', code: '3027', name: 'AGIL', type: 'FORNECEDOR', location: 'Paraíba / PB', active: true, notes: 'Ágil Logística e Suprimentos' },
  { id: 'sup-3043', code: '3043', name: 'YPÊ', type: 'FORNECEDOR', location: 'São Paulo / SP', active: true, notes: 'Química Amparo Ypê' },
  { id: 'sup-3047', code: '3047', name: 'SANTA HELENA', type: 'FORNECEDOR', location: 'São Paulo / SP', active: true, notes: 'Santa Helena Alimentos' },
  { id: 'sup-3052', code: '3052', name: 'LIMA ATACAREJO', type: 'CLIENTE / DEVOLUÇÃO', location: 'Paraíba / PB', active: true, notes: 'Lima Atacarejo' }
];
