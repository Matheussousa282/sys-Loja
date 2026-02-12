
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Transaction, UserRole, TransactionStatus } from '../types';

const Reports: React.FC = () => {
  const { transactions, currentUser, establishments, refreshData } = useApp();
  
  const [reportType, setReportType] = useState('evolucao');
  // Filtros profissionais
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStore, setFilterStore] = useState('TODAS LOJAS');
  const [filterStatus, setFilterStatus] = useState('TODOS');

  useEffect(() => {
    refreshData();
  }, []);

  // Quando o tipo de relatório muda para 'notas_aberto', ajustamos o filtro de status automaticamente
  useEffect(() => {
    if (reportType === 'notas_aberto') {
      setFilterStatus('PENDENTES_SISTEMA'); // Tag interna para filtrar abertos/atrasados
    } else if (filterStatus === 'PENDENTES_SISTEMA') {
      setFilterStatus('TODOS');
    }
  }, [reportType]);

  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  const currentStoreName = establishments.find(e => e.id === currentUser?.storeId)?.name || '';

  // Lógica de filtragem avançada
  const filteredSales = useMemo(() => {
    return transactions.filter(t => {
      const isIncome = t.type === 'INCOME';
      const matchesDate = t.date >= startDate && t.date <= endDate;
      const belongs = isAdmin || t.store === currentStoreName;
      const matchesStore = filterStore === 'TODAS LOJAS' || t.store === filterStore;
      
      let matchesStatus = true;
      if (filterStatus === 'TODOS') matchesStatus = true;
      else if (filterStatus === 'PENDENTES_SISTEMA') {
        matchesStatus = t.status !== TransactionStatus.PAID && t.status !== TransactionStatus.CANCELLED;
      } else {
        matchesStatus = t.status === filterStatus;
      }
      
      return isIncome && matchesDate && belongs && matchesStore && matchesStatus;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, startDate, endDate, isAdmin, currentStoreName, filterStore, filterStatus]);

  // Estatísticas Analíticas por Status
  const stats = useMemo(() => {
    const total = filteredSales.reduce((acc, t) => acc + (Number(t.value) || 0), 0);
    const received = filteredSales.filter(t => t.status === TransactionStatus.PAID).reduce((acc, t) => acc + (Number(t.value) || 0), 0);
    const pending = filteredSales.filter(t => t.status === TransactionStatus.PENDING || t.status === TransactionStatus.APPROVED).reduce((acc, t) => acc + (Number(t.value) || 0), 0);
    const overdue = filteredSales.filter(t => t.status === TransactionStatus.OVERDUE).reduce((acc, t) => acc + (Number(t.value) || 0), 0);
    
    return { 
      total, 
      received, 
      pending, 
      overdue,
      volume: filteredSales.length,
      stores: new Set(filteredSales.map(t => t.store)).size
    };
  }, [filteredSales]);

  const reportCards = [
    { id: 'evolucao', label: 'Evolução de Vendas', icon: 'trending_up', color: 'bg-primary' },
    { id: 'notas_aberto', label: 'Notas em Aberto', icon: 'pending_actions', color: 'bg-amber-500' },
    { id: 'unidade', label: 'Vendas por Unidade', icon: 'store', color: 'bg-[#00c985]' },
    { id: 'produto', label: 'Vendas por Produto', icon: 'inventory_2', color: 'bg-amber-600' },
    { id: 'margem', label: 'Margem Bruta / Lucro', icon: 'payments', color: 'bg-rose-500' },
    { id: 'vendedor', label: 'Ticket Médio / Vendedor', icon: 'badge', color: 'bg-indigo-500' },
    { id: 'conferencia', label: 'Conferência de Caixa', icon: 'account_balance_wallet', color: 'bg-teal-500' },
    { id: 'clientes', label: 'Ranking de Clientes', icon: 'groups', color: 'bg-sky-500' },
    { id: 'servicos', label: 'Serviços Prestados', icon: 'build', color: 'bg-orange-500' },
    { id: 'loja_ticket', label: 'Ticket Médio / Loja', icon: 'analytics', color: 'bg-purple-500' },
    { id: 'estoque', label: 'Giro de Estoque', icon: 'sync', color: 'bg-emerald-600' },
    { id: 'detalhado', label: 'Listagem Detalhada', icon: 'list_alt', color: 'bg-slate-500' },
  ];

  const statusOptions = [
    { label: 'TODOS STATUS', value: 'TODOS' },
    { label: 'PAGOS / RECEBIDOS', value: TransactionStatus.PAID },
    { label: 'PENDENTES (ABERTO)', value: TransactionStatus.PENDING },
    { label: 'ATRASADOS', value: TransactionStatus.OVERDUE },
    { label: 'CANCELADOS', value: TransactionStatus.CANCELLED },
  ];

  const isPendingView = reportType === 'notas_aberto';

  return (
    <div className="min-h-screen bg-[#0b1118] text-slate-100 font-display p-6 space-y-8 overflow-x-hidden animate-in fade-in duration-500">
      
      {/* HEADER E FILTROS PROFISSIONAIS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-5">
           <div className={`size-14 rounded-2xl flex items-center justify-center border shadow-lg transition-all ${isPendingView ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-[#101822] text-primary border-primary/20'}`}>
              <span className="material-symbols-outlined text-3xl">{isPendingView ? 'pending_actions' : 'analytics'}</span>
           </div>
           <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">{isPendingView ? 'Relatório de Pendências' : 'Inteligência Analítica'}</h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">{isPendingView ? 'Monitoramento de Contas a Receber' : 'Performance Comercial e Financeira'} • {new Date().toLocaleDateString('pt-BR')}</p>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-[#101822] p-2 rounded-[1.5rem] border border-slate-800/50 shadow-2xl">
           <div className="flex items-center gap-2 bg-[#0b1118] px-4 py-2.5 rounded-xl border border-slate-800/50">
              <span className="material-symbols-outlined text-sm text-slate-500">calendar_month</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase p-0 focus:ring-0 w-24 text-slate-300" />
              <span className="text-[9px] font-black text-slate-600 px-1">ATÉ</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase p-0 focus:ring-0 w-24 text-slate-300" />
           </div>
           <select value={filterStore} onChange={e => setFilterStore(e.target.value)} className="h-11 bg-[#0b1118] border border-slate-800/50 rounded-xl px-4 text-[9px] font-black uppercase focus:ring-primary text-slate-300">
              <option>TODAS LOJAS</option>
              {establishments.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
           </select>
           {!isPendingView && (
             <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-11 bg-[#0b1118] border border-slate-800/50 rounded-xl px-4 text-[9px] font-black uppercase focus:ring-primary text-slate-300">
                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
           )}
           <button onClick={() => window.print()} className="bg-primary hover:bg-blue-600 text-white h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
              <span className="material-symbols-outlined text-sm">print</span> Imprimir
           </button>
        </div>
      </div>

      {/* GRADE DE CARTÕES (HUB) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
         {reportCards.map(card => (
           <button 
             key={card.id} 
             onClick={() => setReportType(card.id)}
             className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center text-center gap-3 group relative overflow-hidden ${reportType === card.id ? 'bg-primary border-primary shadow-[0_15px_30px_rgba(19,109,236,0.3)]' : 'bg-[#101822] border-slate-800/50 hover:border-slate-700'}`}
           >
              <div className={`size-12 rounded-xl flex items-center justify-center text-white mb-1 shadow-lg ${reportType === card.id ? 'bg-white/20' : card.color} group-hover:scale-110 transition-transform`}>
                 <span className="material-symbols-outlined text-2xl">{card.icon}</span>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest leading-tight ${reportType === card.id ? 'text-white' : 'text-slate-500'}`}>{card.label}</span>
           </button>
         ))}
      </div>

      {/* KPIS FINANCEIROS ANALÍTICOS - DINÂMICOS CONFORME O TIPO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {isPendingView ? (
           <>
             <KPICard label="Total a Receber" value={`R$ ${stats.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon="payments" color="text-amber-500" />
             <KPICard label="Somente Atrasados" value={`R$ ${stats.overdue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon="warning" color="text-rose-500" />
             <KPICard label="Qtd. Notas em Aberto" value={stats.volume.toString()} icon="receipt" color="text-primary" />
             <KPICard label="Lojas com Pendências" value={stats.stores.toString()} icon="store" color="text-slate-400" />
           </>
         ) : (
           <>
             <KPICard label="Total Recebido" value={`R$ ${stats.received.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon="check_circle" color="text-[#00c985]" />
             <KPICard label="Total a Receber" value={`R$ ${stats.pending.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon="schedule" color="text-primary" />
             <KPICard label="Total em Atraso" value={`R$ ${stats.overdue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon="warning" color="text-rose-500" />
             <KPICard label="Volume de Notas" value={stats.volume.toString()} icon="description" color="text-amber-500" />
           </>
         )}
      </div>

      {/* TABELA DE LANÇAMENTOS */}
      <div className="bg-[#101822] border border-slate-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
         <div className="px-8 py-6 bg-[#0b1118]/50 border-b border-slate-800/50 flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isPendingView ? 'Detalhamento de Cobrança' : 'Listagem Consolidada'}</h3>
            <span className="text-[9px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">{filteredSales.length} Registros</span>
         </div>
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="border-b border-slate-800/50 bg-[#0b1118]/30">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Emissão</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Documento / Loja</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Método</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
               {filteredSales.map((t, idx) => (
                 <tr key={idx} className="hover:bg-slate-800/20 transition-all group">
                    <td className="px-8 py-5 text-[10px] font-bold text-slate-500 tabular-nums">{t.date.split('-').reverse().join('/')}</td>
                    <td className="px-8 py-5">
                       <p className="text-[10px] font-black text-white uppercase leading-none mb-1">#{t.id.slice(-8)}</p>
                       <p className="text-[9px] font-black text-primary uppercase">{t.store}</p>
                    </td>
                    <td className="px-8 py-5 text-[10px] font-black text-slate-300 uppercase truncate max-w-[200px]">{t.client || 'CONSUMIDOR FINAL'}</td>
                    <td className="px-8 py-5 text-center">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${
                         t.status === TransactionStatus.PAID ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                         t.status === TransactionStatus.OVERDUE ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                         t.status === TransactionStatus.CANCELLED ? 'bg-slate-700/50 text-slate-400' :
                         'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                       }`}>
                         {t.status}
                       </span>
                    </td>
                    <td className="px-8 py-5">
                       <span className="bg-[#0b1118] text-slate-500 px-3 py-1 rounded-lg text-[8px] font-black uppercase border border-slate-800/50">{t.method}</span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-[11px] tabular-nums text-white">R$ {Number(t.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                 </tr>
               ))}
               {filteredSales.length === 0 && (
                 <tr><td colSpan={6} className="py-24 text-center opacity-20 font-black text-[10px] uppercase tracking-[0.4em]">Nenhum registro encontrado</td></tr>
               )}
            </tbody>
            {filteredSales.length > 0 && (
              <tfoot>
                 <tr className="bg-[#0b1118]/80">
                    <td colSpan={5} className="px-8 py-10 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Subtotal Acumulado:</td>
                    <td className="px-8 py-10 text-right">
                       <span className={`text-3xl font-black tabular-nums tracking-tighter ${isPendingView ? 'text-amber-500' : 'text-primary'}`}>R$ {stats.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </td>
                 </tr>
              </tfoot>
            )}
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
  <div className="bg-[#101822] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-sm flex items-center gap-6 group hover:border-primary/30 transition-all">
     <div className={`size-14 rounded-2xl bg-[#0b1118] flex items-center justify-center ${color} shadow-inner border border-slate-800/50`}>
        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">{icon}</span>
     </div>
     <div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-2xl font-black text-slate-100 tabular-nums">{value}</h4>
     </div>
  </div>
);

export default Reports;
