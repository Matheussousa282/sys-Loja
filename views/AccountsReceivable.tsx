
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../AppContext';
import { ConsignmentSale, ConsignmentStatus, UserRole } from '../types';
import ConsignmentDetail from './ConsignmentDetail';

const AccountsReceivable: React.FC = () => {
  const { consignmentSales, currentUser, establishments, refreshData } = useApp();
  
  const [filter, setFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState<ConsignmentSale | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  const currentStoreName = establishments.find(e => e.id === currentUser?.storeId)?.name || '';

  const activeDebts = useMemo(() => {
    return consignmentSales.filter(s => {
      const isUnpaid = s.balance > 0;
      const belongs = isAdmin || s.store === currentStoreName;
      const matchesSearch = !filter || 
        s.customerName.toLowerCase().includes(filter.toLowerCase()) || 
        s.id.toLowerCase().includes(filter.toLowerCase());
      return isUnpaid && belongs && matchesSearch;
    }).sort((a, b) => b.balance - a.balance);
  }, [consignmentSales, isAdmin, currentStoreName, filter]);

  const stats = useMemo(() => {
    const totalBalance = activeDebts.reduce((acc, s) => acc + s.balance, 0);
    const totalCustomers = Array.from(new Set(activeDebts.map(s => s.customerId))).length;
    return { totalBalance, totalCustomers, count: activeDebts.length };
  }, [activeDebts]);

  if (selectedSale) return <ConsignmentDetail sale={selectedSale} onBack={() => { setSelectedSale(null); refreshData(); }} />;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
           <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 dark:text-white leading-none">Contas a Receber</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
             <span className="size-2 bg-rose-500 rounded-full animate-pulse"></span>
             Gestão de faturas pendentes e cobrança ativa
           </p>
        </div>
      </div>

      {/* CARDS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <KPICard title="Valor Total Pendente" value={`R$ ${stats.totalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon="payments" color="text-rose-600" />
         <KPICard title="Clientes Devedores" value={stats.totalCustomers.toString()} icon="groups" color="text-primary" />
         <KPICard title="Faturas em Aberto" value={stats.count.toString()} icon="receipt_long" color="text-amber-500" />
      </div>

      <div className="bg-white dark:bg-[#101822] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
         <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">search</span>
            <input 
              value={filter} 
              onChange={e => setFilter(e.target.value)}
              placeholder="PESQUISAR CLIENTE OU NÚMERO DO DOCUMENTO..." 
              className="w-full h-12 bg-slate-50 dark:bg-[#0b1118] border-none rounded-2xl pl-12 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-primary/20" 
            />
         </div>
      </div>

      <div className="bg-white dark:bg-[#101822] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Emissão</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Fatura</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo Devedor</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {activeDebts.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                       <td className="px-8 py-6">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">#{s.id.slice(-6)}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase mt-1">{s.store}</p>
                       </td>
                       <td className="px-8 py-6 font-black uppercase text-xs text-slate-700 dark:text-slate-300">{s.customerName}</td>
                       <td className="px-8 py-6 text-xs text-slate-500 font-bold tabular-nums">{s.date.split('-').reverse().join('/')}</td>
                       <td className="px-8 py-6 text-right font-black text-xs tabular-nums text-slate-500">R$ {s.netValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                       <td className="px-8 py-6 text-right font-black text-sm tabular-nums text-rose-600">R$ {s.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                       <td className="px-8 py-6 text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${s.status === ConsignmentStatus.PARTIAL ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>{s.status}</span>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <button onClick={() => setSelectedSale(s)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-md active:scale-95">Receber / Quitar</button>
                       </td>
                    </tr>
                  ))}
                  {activeDebts.length === 0 && (
                    <tr><td colSpan={7} className="py-24 text-center opacity-30 font-black text-xs uppercase tracking-widest">Nenhuma fatura pendente de recebimento</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, color }: any) => (
  <div className="bg-white dark:bg-[#101822] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
     <div className={`size-16 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${color} shadow-inner`}>
        <span className="material-symbols-outlined text-4xl">{icon}</span>
     </div>
     <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h4 className={`text-2xl font-black tabular-nums ${color}`}>{value}</h4>
     </div>
  </div>
);

export default AccountsReceivable;
