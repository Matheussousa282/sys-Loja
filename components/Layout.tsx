
// Implementação do layout principal com navegação lateral e controle de acesso por permissões.
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, rolePermissions } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard', perm: 'dashboard' },
    { path: '/pdv', label: 'Vender (PDV)', icon: 'point_of_sale', perm: 'pdv' },
    { path: '/documentos', label: 'Vendas', icon: 'receipt_long', perm: 'dashboard' },
    { path: '/caixa', label: 'Caixa', icon: 'account_balance_wallet', perm: 'cashControl' },
    { path: '/clientes', label: 'Clientes', icon: 'groups', perm: 'customers' },
    { path: '/estoque', label: 'Estoque', icon: 'inventory_2', perm: 'inventory' },
    { path: '/balanco', label: 'Balanço', icon: 'inventory', perm: 'balance' },
    { path: '/servicos', label: 'Serviços/OS', icon: 'build', perm: 'serviceOrders' },
    { path: '/entradas', label: 'Receitas', icon: 'payments', perm: 'incomes' },
    { path: '/saidas', label: 'Despesas', icon: 'money_off', perm: 'expenses' },
    { path: '/cartoes', label: 'Cartões', icon: 'credit_card', perm: 'cardManagement' },
    { path: '/dre', label: 'DRE', icon: 'account_balance', perm: 'financial' },
    { path: '/relatorios', label: 'Relatórios', icon: 'monitoring', perm: 'reports' },
    { path: '/config', label: 'Configurações', icon: 'settings', perm: 'settings' },
  ];

  const filteredMenu = menuItems.filter(item => {
    if (!currentUser) return false;
    const perms = rolePermissions[currentUser.role] as any;
    return perms ? perms[item.perm] : true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all flex flex-col`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined">storefront</span>
          </div>
          {sidebarOpen && <span className="font-black text-sm uppercase tracking-tighter">Retail Pro</span>}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredMenu.map(item => (
            <Link key={item.path} to={item.path} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${location.pathname === item.path ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <span className="material-symbols-outlined">{item.icon}</span>
              {sidebarOpen && <span className="text-[11px] font-black uppercase tracking-wider">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-3 mb-4">
             <div className="size-8 rounded-full bg-slate-200 overflow-hidden">
                {currentUser?.avatar ? <img src={currentUser.avatar} /> : <div className="size-full flex items-center justify-center text-slate-400 bg-slate-100"><span className="material-symbols-outlined text-sm">person</span></div>}
             </div>
             {sidebarOpen && (
                <div className="min-w-0">
                   <p className="text-[10px] font-black uppercase truncate">{currentUser?.name}</p>
                   <p className="text-[8px] text-slate-400 uppercase">{currentUser?.role}</p>
                </div>
             )}
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
            <span className="material-symbols-outlined">logout</span>
            {sidebarOpen && <span className="text-[11px] font-black uppercase tracking-wider">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8">
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400"><span className="material-symbols-outlined">menu</span></button>
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
           </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
           {children}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Layout;
