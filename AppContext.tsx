
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Customer, User, Establishment, Transaction, CashSession, CashSessionStatus, ServiceOrder, RolePermissions, TransactionStatus, UserRole, CardOperator, CardBrand, ConsignmentSale, ConsignmentStatus, ConsignmentReturn, CashEntry, PriceTable, PriceTableItem } from './types';

interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

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
  categories: Category[];
  priceTables: PriceTable[];
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
  addCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  savePriceTable: (table: PriceTable) => Promise<void>;
  deletePriceTable: (id: string) => Promise<void>;
  savePriceTableItem: (item: any) => Promise<void>;
  deletePriceTableItem: (id: string) => Promise<void>;
  getPriceTableItems: (tableId: string) => Promise<PriceTableItem[]>;
}

export const INITIAL_PERMS: Record<string, RolePermissions> = {
  [UserRole.ADMIN]: { dashboard: true, pdv: true, cashControl: true, customers: true, reports: true, inventory: true, balance: true, incomes: true, expenses: true, financial: true, settings: true, serviceOrders: true, cardManagement: true, editProducts: true, accountsReceivable: true, consignment: true },
  [UserRole.MANAGER]: { dashboard: true, pdv: true, cashControl: true, customers: true, reports: true, inventory: true, balance: true, incomes: true, expenses: true, financial: true, settings: true, serviceOrders: true, cardManagement: true, editProducts: true, accountsReceivable: true, consignment: true },
  [UserRole.CASHIER]: { dashboard: true, pdv: true, cashControl: true, customers: true, reports: false, inventory: true, balance: false, incomes: false, expenses: false, financial: false, settings: false, serviceOrders: true, cardManagement: false, editProducts: false, accountsReceivable: true, consignment: false },
  [UserRole.VENDOR]: { dashboard: true, pdv: true, cashControl: false, customers: true, reports: false, inventory: false, balance: false, incomes: false, expenses: false, financial: false, settings: false, serviceOrders: true, cardManagement: false, editProducts: false, accountsReceivable: false, consignment: true },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) return await res.json();
    return null;
  } catch (e: any) {
    console.error(`ERRO API [${url}]:`, e);
    return null;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceTables, setPriceTables] = useState<PriceTable[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>({ companyName: 'ERP Retail', returnPeriodDays: 30 });
  
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'u-admin',
    name: 'Carlos Silva (ADMIN)',
    email: 'admin@erp.com',
    role: UserRole.ADMIN,
    storeId: 'est-1',
    active: true
  });

  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermissions>>(INITIAL_PERMS);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    const p = await safeFetch('/api/products'); if (p) setProducts(p);
    const c = await safeFetch('/api/customers'); if (c) setCustomers(c);
    const u = await safeFetch('/api/users'); if (u) setUsers(u);
    const e = await safeFetch('/api/establishments'); if (e) setEstablishments(e);
    const t = await safeFetch('/api/transactions'); if (t) setTransactions(t);
    const cs = await safeFetch('/api/cash-sessions'); if (cs) setCashSessions(cs);
    const ce = await safeFetch('/api/cash-entries'); if (ce) setCashEntries(ce);
    const co = await safeFetch('/api/card-operators'); if (co) setCardOperators(co);
    const cb = await safeFetch('/api/card-brands'); if (cb) setCardBrands(cb);
    const so = await safeFetch('/api/service-orders'); if (so) setServiceOrders(so);
    const cat = await safeFetch('/api/categories'); if (cat) setCategories(cat);
    const pts = await safeFetch('/api/price-tables'); if (pts) setPriceTables(pts);
    const config = await safeFetch('/api/config'); if (config) setSystemConfig(config);
    const perms = await safeFetch('/api/permissions'); 
    if (perms && Array.isArray(perms)) {
      const pMap: any = { ...INITIAL_PERMS };
      perms.forEach((item: any) => { pMap[item.role] = item.permissions; });
      setRolePermissions(pMap);
    }
    const cons = await safeFetch('/api/consignments'); if (cons) setConsignmentSales(cons);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const login = async (emailOrName: string, pass: string) => {
    const user = users.find(u => (u.email === emailOrName || u.name === emailOrName) && u.password === pass);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('erp_user', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => { };

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
    await safeFetch('/api/consignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ret, type: 'RETURN' }) });
    const p = products.find(x => x.id === ret.productId);
    if (p && !p.isService) await addProduct({ ...p, stock: p.stock + ret.quantity });
    await refreshData();
  };

  const updateConfig = async (config: any) => {
    setSystemConfig(config); // Atualização otimista instantânea
    await safeFetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    // refreshData não é estritamente necessário aqui se confiamos no setSystemConfig, 
    // mas chamamos para garantir sincronia total com o backend
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

  const addCategory = async (cat: Category) => {
    await safeFetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cat) });
    await refreshData();
  };

  const deleteCategory = async (id: string) => {
    await safeFetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const savePriceTable = async (table: PriceTable) => {
    await safeFetch('/api/price-tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...table, type: 'TABLE' }) });
    await refreshData();
  };

  const deletePriceTable = async (id: string) => {
    await safeFetch(`/api/price-tables?id=${id}&type=TABLE`, { method: 'DELETE' });
    await refreshData();
  };

  const savePriceTableItem = async (item: any) => {
    await safeFetch('/api/price-tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, type: 'ITEM' }) });
  };

  const deletePriceTableItem = async (id: string) => {
    await safeFetch(`/api/price-tables?id=${id}&type=ITEM`, { method: 'DELETE' });
  };

  const getPriceTableItems = async (tableId: string): Promise<PriceTableItem[]> => {
    const data = await safeFetch(`/api/price-tables?id=${tableId}&items=true`);
    return data || [];
  };

  const processSale = async (cart: any[], total: number, method: string, customerId: string, vendorId: string, shipping: number, cardDetails: any) => {
    const store = establishments.find(e => e.id === currentUser?.storeId);
    const customer = customers.find(c => c.id === customerId);
    const transaction: Transaction = {
      id: `SALE-${Date.now()}`,
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
      products, customers, users, establishments, transactions, cashSessions, cashEntries, cardOperators, cardBrands, serviceOrders, consignmentSales, categories, priceTables, systemConfig, currentUser, rolePermissions, loading,
      refreshData, login, logout, addProduct, deleteProduct, addCustomer, addUser, deleteUser, addEstablishment, deleteEstablishment, addTransaction, saveCashSession, addCashEntry,
      saveCardOperator, deleteCardOperator, saveCardBrand, deleteCardBrand, updateServiceOrder, addServiceOrder, addConsignmentSale, updateConsignmentSale, addConsignmentReturn, updateConfig, processSale, bulkUpdateStock, updateRolePermissions,
      addCategory, deleteCategory, savePriceTable, deletePriceTable, savePriceTableItem, deletePriceTableItem, getPriceTableItems
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
