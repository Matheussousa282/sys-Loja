
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';

interface MenuItem {
  path?: string;
  label: string;
  icon: string;
  perm: string;
  submenu?: MenuItem[];
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, rolePermissions } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'VENDAS': true,
    'ESTOQUE': false,
    'FINANCEIRO': true
  });

  // Gerenciamento do Tema
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const menuStructure: MenuItem[] = [
    { path: '/', label: 'DASHBOARD', icon: 'dashboard', perm: 'dashboard' },
    {
      label: 'VENDAS',
      icon: 'shopping_cart',
      perm: 'pdv',
      submenu: [
        { path: '/caixa', label: 'CAIXA', icon: 'account_balance_wallet', perm: 'cashControl' },
        { path: '/pdv', label: 'FRENTE DE CAIXA', icon: 'point_of_sale', perm: 'pdv' },
        { path: '/consignados', label: 'CONSIGNADOS', icon: 'inventory', perm: 'pdv' },
        { path: '/documentos', label: 'DOCUMENTOS', icon: 'receipt_long', perm: 'dashboard' },
        { path: '/clientes', label: 'CLIENTES', icon: 'groups', perm: 'customers' },
        { path: '/relatorios', label: 'RELATÓRIOS', icon: 'monitoring', perm: 'reports' },
      ]
    },
    {
      label: 'ESTOQUE',
      icon: 'inventory_2',
      perm: 'inventory',
      submenu: [
        { path: '/estoque', label: 'ESTOQUE', icon: 'inventory_2', perm: 'inventory' },
        { path: '/balanco', label: 'BALANÇO', icon: 'inventory', perm: 'balance' },
      ]
    },
    { path: '/servicos', label: 'SERVIÇOS (OS)', icon: 'build', perm: 'serviceOrders' },
    {
      label: 'FINANCEIRO',
      icon: 'account_balance',
      perm: 'financial',
      submenu: [
        { path: '/entradas', label: 'RECEITAS', icon: 'payments', perm: 'incomes' },
        { path: '/saidas', label: 'DESPESAS', icon: 'money_off', perm: 'expenses' },
        { path: '/contas-receber', label: 'CONTAS A RECEBER', icon: 'pending_actions', perm: 'financial' },
        { path: '/cartoes', label: 'CARTÕES', icon: 'credit_card', perm: 'cardManagement' },
        { path: '/dre', label: 'DRE', icon: 'account_balance', perm: 'financial' },
      ]
    },
    { path: '/config', label: 'CONFIGURAÇÕES', icon: 'settings', perm: 'settings' },
  ];

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const checkPerm = (perm: string) => {
    if (!currentUser) return false;
    const perms = rolePermissions[currentUser.role] as any;
    return perms ? perms[perm] : true;
  };

  return (
    <div className="flex h-screen bg-background-light dark:bg-[#0b1118] transition-colors duration-300">
      <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-[#101822] border-r border-slate-800 transition-all flex flex-col shadow-2xl z-40`}>
        <div className="p-6 flex items-center gap-4 border-b border-slate-800/50">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined">storefront</span>
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
               <h2 className="font-black text-sm uppercase tracking-tighter text-white truncate">TEM ACESSORIOS</h2>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">GESTÃO NEON</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {menuStructure.map(item => {
            if (!checkPerm(item.perm)) return null;

            if (item.submenu) {
              const isOpen = openMenus[item.label];
              const isSubActive = item.submenu.some(s => location.pathname === s.path);

              return (
                <div key={item.label} className="space-y-1">
                  <button 
                    onClick={() => sidebarOpen && toggleMenu(item.label)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all ${isSubActive ? 'text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${isSubActive ? 'text-primary' : ''}`}>{item.icon}</span>
                      {sidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>}
                    </div>
                    {sidebarOpen && (
                      <span className={`material-symbols-outlined text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    )}
                  </button>
                  
                  {sidebarOpen && isOpen && (
                    <div className="ml-6 space-y-1 border-l border-slate-800 pl-4 animate-in slide-in-from-top-2 duration-300">
                      {item.submenu.map(sub => {
                        if (!checkPerm(sub.perm)) return null;
                        const active = location.pathname === sub.path;
                        return (
                          <Link 
                            key={sub.path} 
                            to={sub.path!} 
                            className={`flex items-center gap-3 p-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${active ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path!} 
                className={`flex items-center gap-3 p-3.5 rounded-xl transition-all ${active ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {sidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/50 space-y-4">
          <div className="flex items-center gap-3 p-2 bg-slate-800/30 rounded-2xl">
             <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black shadow-inner uppercase">
                {currentUser?.name.charAt(0)}
             </div>
             {sidebarOpen && (
                <div className="min-w-0">
                   <p className="text-[10px] font-black text-white uppercase truncate">{currentUser?.name}</p>
                   <p className="text-[8px] text-slate-500 font-bold uppercase">{currentUser?.role}</p>
                </div>
             )}
             {sidebarOpen && (
                <button onClick={handleLogout} className="ml-auto text-rose-500 hover:scale-110 transition-transform">
                   <span className="material-symbols-outlined text-xl">logout</span>
                </button>
             )}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="h-16 bg-white dark:bg-[#101822] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-30 shadow-sm transition-colors duration-300">
           <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">menu_open</span>
              </button>
              <div className="flex items-center gap-2">
                 <span className="size-2 bg-emerald-500 rounded-full animate-pulse"></span>
                 <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">SISTEMA OPERACIONAL</span>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              {/* BOTÃO DARK MODE */}
              <button 
                onClick={toggleTheme}
                className="size-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:scale-105 transition-all"
              >
                <span className="material-symbols-outlined text-xl">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </button>

              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:block">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
              <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-slate-400 text-xl">cloud_done</span>
                 <span className="text-[10px] font-black text-primary uppercase tracking-widest">ONLINE</span>
              </div>
           </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-background-light dark:bg-[#0b1118] custom-scrollbar transition-colors duration-300">
           {children}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Layout;
