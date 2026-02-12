
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import PDV from './views/PDV';
import Inventory from './views/Inventory';
import Transactions from './views/Transactions';
import DRE from './views/DRE';
import Settings from './views/Settings';
import Reports from './views/Reports';
import Balance from './views/Balance';
import Customers from './views/Customers';
import ServiceOrders from './views/ServiceOrders';
import Login from './views/Login';
import CashMovement from './views/CashMovement';
import CardManagement from './views/CardManagement';
import SalesInquiry from './views/SalesInquiry';
import Consignments from './views/Consignments';
import AccountsReceivable from './views/AccountsReceivable';
import StockMovement from './views/StockMovement';
import CategoryManagement from './views/CategoryManagement';
import PriceTableManagement from './views/PriceTableManagement';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useApp();
  if (loading) return null;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { loading } = useApp();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0b1118]">
        <div className="flex flex-col items-center gap-4">
           <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sincronizando Sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/pdv" element={<ProtectedRoute><PDV /></ProtectedRoute>} />
      <Route path="/consignados" element={<ProtectedRoute><Layout><Consignments /></Layout></ProtectedRoute>} />
      <Route path="/documentos" element={<ProtectedRoute><Layout><SalesInquiry /></Layout></ProtectedRoute>} />
      <Route path="/caixa" element={<ProtectedRoute><Layout><CashMovement /></Layout></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><Layout><Customers /></Layout></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
      <Route path="/estoque" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
      <Route path="/categorias" element={<ProtectedRoute><Layout><CategoryManagement /></Layout></ProtectedRoute>} />
      <Route path="/movimentacao-estoque" element={<ProtectedRoute><Layout><StockMovement /></Layout></ProtectedRoute>} />
      <Route path="/balanco" element={<ProtectedRoute><Layout><Balance /></Layout></ProtectedRoute>} />
      <Route path="/servicos" element={<ProtectedRoute><Layout><ServiceOrders /></Layout></ProtectedRoute>} />
      <Route path="/entradas" element={<ProtectedRoute><Layout><Transactions type="INCOME" /></Layout></ProtectedRoute>} />
      <Route path="/saidas" element={<ProtectedRoute><Layout><Transactions type="EXPENSE" /></Layout></ProtectedRoute>} />
      <Route path="/contas-receber" element={<ProtectedRoute><Layout><AccountsReceivable /></Layout></ProtectedRoute>} />
      <Route path="/price-tables" element={<ProtectedRoute><Layout><PriceTableManagement /></Layout></ProtectedRoute>} />
      <Route path="/cartoes" element={<ProtectedRoute><Layout><CardManagement /></Layout></ProtectedRoute>} />
      <Route path="/dre" element={<ProtectedRoute><Layout><DRE /></Layout></ProtectedRoute>} />
      <Route path="/config" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  </AppProvider>
);

export default App;
