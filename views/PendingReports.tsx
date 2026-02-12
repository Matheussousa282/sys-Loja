
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Transaction, TransactionStatus, UserRole } from '../types';

const PendingReports: React.FC = () => {
  const { transactions, currentUser, establishments, refreshData } = useApp();
  
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStore, setFilterStore] = useState('TODAS LOJAS');

  useEffect(() => {
    refreshData();
  }, []);

  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  const currentStoreName = establishments.find(e => e.id === currentUser?.storeId)?.name || '';

  // Filtra apenas o que NÃO está pago e é uma receita (venda/serviço)
  const pendingSales = useMemo(() => {
    return transactions.filter(t => {
      const isIncome = t.type === 'INCOME';
      const isNotPaid = t.status !== TransactionStatus.PAID && t.status !== TransactionStatus.CANCELLED;
      const belongs = isAdmin || t.store === currentStoreName;
      const matchesStore = filterStore === 'TODAS LOJAS' || t.store === filterStore;
      const matchesSearch = !filterSearch || 
        t.client?.toLowerCase().includes(filterSearch.toLowerCase()) || 
        t.id.toLowerCase().includes(filterSearch.toLowerCase());
      
      return isIncome && isNotPaid && belongs && matchesStore && matchesSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, isAdmin, currentStoreName, filterStore, filterSearch]);

  const stats = useMemo(() => {
    const totalPending = pendingSales.reduce((acc, t) => acc + (Number(t.value) || 0), 0);
    const overdue = pendingSales.filter(t => t.status === TransactionStatus.OVERDUE).reduce((acc, t) => acc + (Number(t.value) || 0), 0);
    const count = pendingSales.length;
    const avgPending = count > 0 ? totalPending / count : 0;
    
    return { totalPending, overdue, count, avgPending };
  }, [pendingSales]);

  return (
    <div className="min-h-screen bg-[#0b1118] text-slate-100 font-display p-6 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER ESPECÍFICO */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-5">
           <div className="size-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <span className="material-symbols-outlined text-3xl">pending_actions</span>
           </div>
           <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Notas em Aberto</h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Acompanhamento de Créditos e Contas a Receber</p>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-[#101822] p-2 rounded-[1.5rem] border border-slate-800/50 shadow-2xl">
           <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
              <input 
                value={filterSearch} 
                onChange={e => setFilterSearch(e.target.value)}
                placeholder="BUSCAR CLIENTE OU ID..." 
                className="h-11 w-64 bg-[#0b1118] border border-slate-800/50 rounded-xl pl-10 pr-4 text-[9px] font-black uppercase focus:ring-amber-500 text-slate-300" 
              />
           </div>
           <select value={filterStore} onChange={e => setFilterStore(e.target.value)} className="h-11 bg-[#0b1118] border border-slate-800/50 rounded-xl px-4 text-[9px] font-black uppercase focus:ring-amber-500 text-slate-300">
              <option>TODAS LOJAS</option>
              {establishments.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
           </select>
           <button onClick={() => window.print()} className="bg-amber-500 hover:bg-amber-600 text-slate-900 h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
              <span className="material-symbols-outlined text-sm">download</span> Exportar Lista
           </button>
        </div>
      </div>

      {/* KPIS DE PENDÊNCIAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <KPICard label="Total a Receber" value={`R$ ${stats.totalPending.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon="payments" color="text-amber-500" />
         <KPICard label="Total em Atraso" value={`R$ ${stats.overdue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon="error" color="text-rose-500" />
         <KPICard label="Qtd. de Notas" value={stats.count.toString()} icon="receipt" color="text-primary" />
         <KPICard label="Média por Nota" value={`R$ ${stats.avgPending.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon="analytics" color="text-slate-400" />
      </div>

      {/* LISTA DE PENDÊNCIAS */}
      <div className="bg-[#101822] border border-slate-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
         <div className="px-8 py-6 bg-[#0b1118]/50 border-b border-slate-800/50 flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalhamento de Cobrança</h3>
            <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full uppercase">{pendingSales.length} Notas Localizadas</span>
         </div>
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-[#0b1118]/30">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Emissão</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Cliente</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Vendedor / Loja</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Valor Pendente</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Ações</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
               {pendingSales.map((t, idx) => (
                 <tr key={idx} className="hover:bg-slate-800/20 transition-all group">
                    <td className="px-8 py-5">
                       <p className="text-[10px] font-bold text-slate-500 tabular-nums">{t.date.split('-').reverse().join('/')}</p>
                       <p className="text-[8px] font-black text-slate-700 uppercase mt-1">ID: #{t.id.slice(-8)}</p>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-[11px] font-black text-white uppercase">{t.client || 'CONSUMIDOR FINAL'}</p>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-[10px] font-black text-primary uppercase leading-tight">{t.store}</p>
                    </div>
                    <td className="px-8 py-5 text-center">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${
                         t.status === TransactionStatus.OVERDUE ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse' :
                         'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                       }`}>
                         {t.status}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <span className="text-xl font-black text-white tabular-nums tracking-tighter">R$ {Number(t.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <div className="flex justify-center gap-2">
                          <button className="size-9 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Receber Agora">
                             <span className="material-symbols-outlined text-lg">check_circle</span>
                          </button>
                          <button className="size-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm" title="Cobrar WhatsApp">
                             <span className="material-symbols-outlined text-lg">chat</span>
                          </button>
                       </div>
                    </td>
                 </tr>
               ))}
               {pendingSales.length === 0 && (
                 <tr><td colSpan={6} className="py-32 text-center opacity-20 font-black text-[10px] uppercase tracking-[0.4em]">Nenhuma nota em aberto no momento</td></tr>
               )}
            </tbody>
         </table>
      </div>

      <style>{`
        @media print {
           body * { visibility: hidden; }
           table, table * { visibility: visible; }
           table { position: absolute; left: 0; top: 0; width: 100%; color: black !important; }
           .bg-[#101822] { background: white !important; }
           .text-slate-100 { color: black !important; }
        }
      `}</style>
    </div>
  );
};

const KPICard = ({ label, value, icon, color }: any) => (
  <div className="bg-[#101822] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-sm flex items-center gap-6 group hover:border-amber-500/30 transition-all">
     <div className={`size-14 rounded-2xl bg-[#0b1118] flex items-center justify-center ${color} shadow-inner border border-slate-800/50`}>
        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">{icon}</span>
     </div>
     <div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-2xl font-black text-slate-100 tabular-nums">{value}</h4>
     </div>
  </div>
);

export default PendingReports;
