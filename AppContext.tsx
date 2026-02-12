
// Implementação completa do AppContext para gerenciamento de estado e sincronização com o banco de dados Neon.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Customer, User, Establishment, Transaction, CashSession, CashSessionStatus, ServiceOrder, RolePermissions, TransactionStatus, UserRole, CardOperator, CardBrand, ConsignmentSale, ConsignmentStatus, ConsignmentReturn, CashEntry } from './types';

interface AppContextType {
  products: Product[];
  customers: Customer[];
  users: User[];
  establishments: Establishment[];
  transactions: Transaction[];
  cashSessions: CashSession[];
  cashEntries: CashEntry[];
  cardOperators: CardOperator[];
  cardBrands: CardBrand[];
  serviceOrders: ServiceOrder[];
  consignmentSales: ConsignmentSale[];
  systemConfig: any;
  currentUser: User | null;
  rolePermissions: Record<string, RolePermissions>;
  loading: boolean;
  refreshData: () => Promise<void>;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  addProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCustomer: (c: Customer) => Promise<void>;
  addUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addEstablishment: (e: Establishment) => Promise<void>;
  deleteEstablishment: (id: string) => Promise<void>;
  addTransaction: (t: Transaction) => Promise<void>;
  saveCashSession: (s: CashSession) => Promise<void>;
  addCashEntry: (e: CashEntry) => Promise<void>;
  saveCardOperator: (o: CardOperator) => Promise<void>;
  deleteCardOperator: (id: string) => Promise<void>;
  saveCardBrand: (b: CardBrand) => Promise<void>;
  deleteCardBrand: (id: string) => Promise<void>;
  updateServiceOrder: (os: ServiceOrder) => Promise<void>;
  addServiceOrder: (os: ServiceOrder) => Promise<void>;
  addConsignmentSale: (sale: ConsignmentSale) => Promise<void>;
  updateConsignmentSale: (sale: ConsignmentSale) => Promise<void>;
  addConsignmentReturn: (ret: ConsignmentReturn) => Promise<void>;
  updateConfig: (config: any) => Promise<void>;
  processSale: (cart: any[], total: number, method: string, customerId: string, vendorId: string, shipping: number, cardDetails: any) => Promise<void>;
  bulkUpdateStock: (adjustments: Record<string, number>) => Promise<void>;
  updateRolePermissions: (role: string, perms: RolePermissions) => Promise<void>;
}

export const INITIAL_PERMS: Record<string, RolePermissions> = {
  [UserRole.ADMIN]: { dashboard: true, pdv: true, cashControl: true, customers: true, reports: true, inventory: true, balance: true, incomes: true, expenses: true, financial: true, settings: true, serviceOrders: true, cardManagement: true, editProducts: true },
  [UserRole.MANAGER]: { dashboard: true, pdv: true, cashControl: true, customers: true, reports: true, inventory: true, balance: true, incomes: true, expenses: true, financial: true, settings: true, serviceOrders: true, cardManagement: true, editProducts: true },
  [UserRole.CASHIER]: { dashboard: true, pdv: true, cashControl: true, customers: true, reports: false, inventory: true, balance: false, incomes: false, expenses: false, financial: false, settings: false, serviceOrders: true, cardManagement: false, editProducts: false },
  [UserRole.VENDOR]: { dashboard: true, pdv: true, cashControl: false, customers: true, reports: false, inventory: false, balance: false, incomes: false, expenses: false, financial: false, settings: false, serviceOrders: true, cardManagement: false, editProducts: false },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "Sem detalhes");
      console.error(`ERRO API [${url}] Status ${res.status}:`, errorText);
      throw new Error(`HTTP ${res.status}`);
    }

    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    
    // Se não for JSON, apenas consome o texto para liberar a stream
    await res.text();
    return null;
  } catch (e: any) {
    throw e;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [cardOperators, setCardOperators] = useState<CardOperator[]>([]);
  const [cardBrands, setCardBrands] = useState<CardBrand[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [consignmentSales, setConsignmentSales] = useState<ConsignmentSale[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>({ companyName: 'ERP Retail', returnPeriodDays: 30 });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermissions>>(INITIAL_PERMS);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const endpoints = [
        { key: 'products', url: '/api/products' },
        { key: 'customers', url: '/api/customers' },
        { key: 'users', url: '/api/users' },
        { key: 'establishments', url: '/api/establishments' },
        { key: 'transactions', url: '/api/transactions' },
        { key: 'cashSessions', url: '/api/cash-sessions' },
        { key: 'cashEntries', url: '/api/cash-entries' },
        { key: 'cardOperators', url: '/api/card-operators' },
        { key: 'cardBrands', url: '/api/card-brands' },
        { key: 'serviceOrders', url: '/api/service-orders' },
        { key: 'config', url: '/api/config' },
        { key: 'permissions', url: '/api/permissions' },
        { key: 'consignments', url: '/api/consignments' },
      ];

      const fetchResults = await Promise.allSettled(
        endpoints.map(e => safeFetch(e.url))
      );
      
      const getVal = (idx: number) => {
        const res = fetchResults[idx];
        return res.status === 'fulfilled' ? res.value : null;
      };

      const p = getVal(0); if (p) setProducts(p);
      const c = getVal(1); if (c) setCustomers(c);
      const u = getVal(2); if (u) setUsers(u);
      const e = getVal(3); if (e) setEstablishments(e);
      const t = getVal(4); if (t) setTransactions(t);
      const cs = getVal(5); if (cs) setCashSessions(cs);
      const ce = getVal(6); if (ce) setCashEntries(ce);
      const co = getVal(7); if (co) setCardOperators(co);
      const cb = getVal(8); if (cb) setCardBrands(cb);
      const so = getVal(9); if (so) setServiceOrders(so);
      const conf = getVal(10); if (conf) setSystemConfig(conf);
      const perms = getVal(11); if (perms && Array.isArray(perms)) {
        const pMap: any = { ...INITIAL_PERMS };
        perms.forEach((item: any) => { pMap[item.role] = item.permissions; });
        setRolePermissions(pMap);
      }
      const cons = getVal(12); if (cons) setConsignmentSales(cons);

    } catch (err) {
      console.error("Falha fatal no ciclo de sincronização:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('erp_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    refreshData();
  }, []);

  const login = async (email: string, pass: string) => {
    const user = users.find(u => (u.email === email || u.name === email) && u.password === pass);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('erp_user', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('erp_user');
  };

  const addProduct = async (p: Product) => {
    await safeFetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    await refreshData();
  };

  const deleteProduct = async (id: string) => {
    await safeFetch(`/api/products?id=${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const addCustomer = async (c: Customer) => {
    await safeFetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    await refreshData();
  };

  const addUser = async (u: User) => {
    await safeFetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
    await refreshData();
  };

  const deleteUser = async (id: string) => {
    await safeFetch(`/api/users?id=${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const addEstablishment = async (e: Establishment) => {
    await safeFetch('/api/establishments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) });
    await refreshData();
  };

  const deleteEstablishment = async (id: string) => {
    await safeFetch(`/api/establishments?id=${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const addTransaction = async (t: Transaction) => {
    await safeFetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) });
    await refreshData();
  };

  const saveCashSession = async (s: CashSession) => {
    await safeFetch('/api/cash-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    await refreshData();
  };

  const addCashEntry = async (e: CashEntry) => {
    await safeFetch('/api/cash-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) });
    await refreshData();
  };

  const saveCardOperator = async (o: CardOperator) => {
    await safeFetch('/api/card-operators', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
    await refreshData();
  };

  const deleteCardOperator = async (id: string) => {
    await safeFetch(`/api/card-operators?id=${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const saveCardBrand = async (b: CardBrand) => {
    await safeFetch('/api/card-brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    await refreshData();
  };

  const deleteCardBrand = async (id: string) => {
    await safeFetch(`/api/card-brands?id=${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const updateServiceOrder = async (os: ServiceOrder) => {
    await safeFetch('/api/service-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(os) });
    await refreshData();
  };

  const addServiceOrder = async (os: ServiceOrder) => {
    await safeFetch('/api/service-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(os) });
    await refreshData();
  };

  const addConsignmentSale = async (sale: ConsignmentSale) => {
    await safeFetch('/api/consignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sale) });
    
    const stockUpdates = sale.items.map(item => {
      const p = products.find(x => x.id === item.id);
      if (p && !p.isService) return addProduct({ ...p, stock: p.stock - item.quantity });
      return Promise.resolve();
    });

    await Promise.all(stockUpdates);
    await refreshData();
  };

  const updateConsignmentSale = async (sale: ConsignmentSale) => {
    await safeFetch('/api/consignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sale) });
    await refreshData();
  };

  const addConsignmentReturn = async (ret: ConsignmentReturn) => {
    await safeFetch('/api/consignments', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...ret, type: 'RETURN' }) 
    });
    
    const p = products.find(x => x.id === ret.productId);
    if (p && !p.isService) {
      await addProduct({ ...p, stock: p.stock + ret.quantity });
    }

    await refreshData();
  };

  const updateConfig = async (config: any) => {
    await safeFetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    await refreshData();
  };

  const bulkUpdateStock = async (adjustments: Record<string, number>) => {
    for (const [id, stock] of Object.entries(adjustments)) {
      const p = products.find(prod => prod.id === id);
      if (p) await addProduct({ ...p, stock });
    }
  };

  const updateRolePermissions = async (role: string, perms: RolePermissions) => {
    await safeFetch('/api/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, permissions: perms }) });
    await refreshData();
  };

  const processSale = async (cart: any[], total: number, method: string, customerId: string, vendorId: string, shipping: number, cardDetails: any) => {
    const saleId = `SALE-${Date.now()}`;
    const store = establishments.find(e => e.id === currentUser?.storeId);
    const customer = customers.find(c => c.id === customerId);

    const transaction: Transaction = {
      id: saleId,
      date: new Date().toISOString().split('T')[0],
      description: 'Venda PDV',
      store: store?.name || 'Matriz',
      category: 'Venda',
      status: TransactionStatus.PAID,
      value: total,
      shippingValue: shipping,
      type: 'INCOME',
      method,
      client: customer?.name || 'Consumidor Final',
      clientId: customerId,
      vendorId,
      items: cart,
      ...cardDetails
    };

    const stockUpdates = cart.map(item => {
      const p = products.find(x => x.id === item.id);
      if (p && !p.isService) return addProduct({ ...p, stock: p.stock - item.quantity });
      return Promise.resolve();
    });

    await Promise.all([...stockUpdates, addTransaction(transaction)]);
  };

  return (
    <AppContext.Provider value={{
      products, customers, users, establishments, transactions, cashSessions, cashEntries, cardOperators, cardBrands, serviceOrders, consignmentSales, systemConfig, currentUser, rolePermissions, loading,
      refreshData, login, logout, addProduct, deleteProduct, addCustomer, addUser, deleteUser, addEstablishment, deleteEstablishment, addTransaction, saveCashSession, addCashEntry,
      saveCardOperator, deleteCardOperator, saveCardBrand, deleteCardBrand, updateServiceOrder, addServiceOrder, addConsignmentSale, updateConsignmentSale, addConsignmentReturn, updateConfig, processSale, bulkUpdateStock, updateRolePermissions
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
