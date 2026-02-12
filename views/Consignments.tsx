
import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { ConsignmentSale, ConsignmentStatus, UserRole, Transaction, TransactionStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import ConsignmentPDV from './ConsignmentPDV';
import ConsignmentDetail from './ConsignmentDetail';

const Consignments: React.FC = () => {
  const { consignmentSales, currentUser, establishments, refreshData } = useApp();
  const navigate = useNavigate();
  
  // Filtros
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterSearch, setFilterSearch] = useState('');

  // Estados de UI
  const [showPDV, setShowPDV] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ConsignmentSale | null>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  const currentStoreName = establishments.find(e => e.id === currentUser?.storeId)?.name || '';

  const filteredSales = useMemo(() => {
    return consignmentSales.filter(s => {
      const matchesStore = isAdmin || s.store === currentStoreName;
      const matchesDate = s.date >= startDate && s.date <= endDate;
      const matchesStatus = filterStatus === 'TODOS' || s.status === filterStatus;
      const matchesSearch = !filterSearch || 
        s.id.toLowerCase().includes(filterSearch.toLowerCase()) || 
        s.customerName.toLowerCase().includes(filterSearch.toLowerCase());
      
      return matchesStore && matchesDate && matchesStatus && matchesSearch;
    }).sort((a, b) => b.id.localeCompare(a.id));
  }, [consignmentSales, isAdmin, currentStoreName, startDate, endDate, filterStatus, filterSearch]);

  const stats = useMemo(() => {
    let openTotal = 0;
    let receivedTotal = 0;
    let totalItems = 0;
    let totalDiscounts = 0;

    filteredSales.forEach(s => {
      openTotal += s.balance;
      receivedTotal += s.paidValue;
      totalDiscounts += s.discount;
      s.items.forEach(i => totalItems += i.quantity);
    });

    return { 
      openTotal, 
      receivedTotal, 
      qty: filteredSales.length, 
      totalItems, 
      totalDiscounts 
    };
  }, [filteredSales]);

  if (showPDV) return <ConsignmentPDV onBack={() => { setShowPDV(false); refreshData(); }} />;
  if (selectedSale) return <ConsignmentDetail sale={selectedSale} onBack={() => { setSelectedSale(null); refreshData(); }} />;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Vendas em Consignado</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <span className="size-2 bg-primary rounded-full animate-pulse"></span>
            Controle de Crédito e Retorno de Mercadoria
          </p>
        </div>
        <button 
          onClick={() => setShowPDV(true)}
          className="bg-primary hover:bg-blue-600 text-white font-black py-4 px-10 rounded-[1.5rem] text-[11px] uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center gap-3"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          Nova Venda em Consignado
        </button>
      </div>

      {/* FILTROS NO TOPO */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-4 items-end shadow-sm">
         <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-[10px] font-black uppercase" />
         </div>
         <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-[10px] font-black uppercase" />
         </div>
         <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-[10px] font-black uppercase">
               <option value="TODOS">TODOS OS STATUS</option>
               {Object.values(ConsignmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
         </div>
         <div className="space-y-1 md:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Pesquisar ID ou Cliente</label>
            <div className="relative">
               <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
               <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="NOME OU Nº VENDA..." className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 text-[10px] font-black uppercase" />
            </div>
         </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
         <SummaryCard label="Total em Aberto" value={`R$ ${stats.openTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} color="text-rose-500" icon="pending_actions" />
         <SummaryCard label="Total Recebido" value={`R$ ${stats.receivedTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} color="text-emerald-500" icon="payments" />
         <SummaryCard label="Qtd. Vendas" value={stats.qty.toString()} color="text-primary" icon="description" />
         <SummaryCard label="Itens Vendidos" value={stats.totalItems.toString()} color="text-amber-500" icon="shopping_bag" />
         <SummaryCard label="Descontos" value={`R$ ${stats.totalDiscounts.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} color="text-slate-400" icon="local_offer" />
      </div>

      {/* TABELA DE VENDAS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] overflow-hidden shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº / Data</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Itens</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Líquido</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo Devedor</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredSales.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                       <td className="px-8 py-6">
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-none">#{s.id.slice(-6)}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1.5">{s.date.split('-').reverse().join('/')}</p>
                       </td>
                       <td className="px-8 py-6">
                          <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-none">{s.customerName}</p>
                          <p className="text-[9px] text-primary font-bold uppercase mt-1.5">{s.store}</p>
                       </td>
                       <td className="px-8 py-6 text-center">
                          <span className="text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg tabular-nums">
                            {s.items.reduce((acc, i) => acc + i.quantity, 0)}
                          </span>
                       </td>
                       <td className="px-8 py-6 text-right font-black text-xs tabular-nums text-slate-700 dark:text-slate-300">R$ {s.netValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                       <td className="px-8 py-6 text-right font-black text-sm tabular-nums text-rose-500">R$ {s.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                       <td className="px-8 py-6 text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${
                             s.status === ConsignmentStatus.PAID ? 'bg-emerald-500/10 text-emerald-500' :
                             s.status === ConsignmentStatus.PARTIAL ? 'bg-amber-500/10 text-amber-500' :
                             s.status === ConsignmentStatus.CANCELLED ? 'bg-rose-500/10 text-rose-500' :
                             'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>{s.status}</span>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-2">
                             <button onClick={() => setSelectedSale(s)} className="size-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all"><span className="material-symbols-outlined text-lg">visibility</span></button>
                             {s.status !== ConsignmentStatus.PAID && s.status !== ConsignmentStatus.CANCELLED && (
                               <button onClick={() => setSelectedSale(s)} className="size-9 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><span className="material-symbols-outlined text-lg">payments</span></button>
                             )}
                          </div>
                       </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr><td colSpan={7} className="py-24 text-center opacity-30 font-black text-[10px] uppercase tracking-[0.3em]">Nenhuma venda consignada localizada</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, color, icon }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
     <div className={`size-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${color} mb-4`}><span className="material-symbols-outlined">{icon}</span></div>
     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
     <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
  </div>
);

export default Consignments;
