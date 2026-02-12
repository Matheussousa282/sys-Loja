
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../AppContext';
import { CashSession, CashSessionStatus, UserRole } from '../types';

const CashMovement: React.FC = () => {
  const { cashSessions, transactions, establishments, currentUser, saveCashSession, users, refreshData } = useApp();
  const [filter, setFilter] = useState('');
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [openingValue, setOpeningValue] = useState(0);
  const [selectedRegister, setSelectedRegister] = useState('');

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);

  useEffect(() => {
    refreshData();
  }, []);

  const filteredSessions = useMemo(() => {
    return cashSessions.filter(s => 
      s.registerName.toLowerCase().includes(filter.toLowerCase()) ||
      s.openingOperatorName?.toLowerCase().includes(filter.toLowerCase())
    ).sort((a, b) => b.id.localeCompare(a.id));
  }, [cashSessions, filter]);

  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const cashier = users.find(u => u.name === selectedRegister.split(' - ')[1]);
    await saveCashSession({ 
      id: `${Date.now()}`, 
      storeId: currentUser?.storeId || 'matriz', 
      storeName: currentStore?.name || 'Matriz', 
      registerName: selectedRegister, 
      openingTime: new Date().toLocaleString('pt-BR'), 
      openingOperatorId: cashier?.id || currentUser?.id, 
      openingOperatorName: cashier?.name || currentUser?.name, 
      openingValue, 
      status: CashSessionStatus.OPEN, 
      priceTable: 'Tabela Padrão' 
    });
    setShowOpeningModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0b1118] text-slate-100 font-display p-6 space-y-6">
      
      {/* HEADER SUPERIOR (BARRA DE TÍTULO) */}
      <div className="flex justify-between items-center px-2">
         <div className="flex items-center gap-3">
            <span className="size-2 bg-primary rounded-full shadow-[0_0_10px_rgba(19,109,236,0.5)]"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sistema Operacional</span>
         </div>
         <div className="flex items-center gap-6">
            <button className="text-slate-400 hover:text-white transition-colors">
               <span className="material-symbols-outlined text-xl">light_mode</span>
            </button>
            <span className="text-[11px] font-black uppercase tracking-widest text-primary border-b border-primary/30 pb-0.5">Local</span>
         </div>
      </div>

      {/* BLOCO DE DASHBOARD SUPERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
         <div className="lg:col-span-9 bg-[#101822] rounded-3xl border border-slate-800/50 p-8 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
            {/* CARD GAVETA */}
            <div className="flex items-center gap-5 flex-1">
               <div className="size-16 bg-[#00c985]/10 text-[#00c985] rounded-2xl flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
               </div>
               <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo Acumulado (Gaveta)</p>
                  <h3 className="text-3xl font-black text-[#00c985] tabular-nums">R$ 0,00</h3>
               </div>
            </div>

            <div className="h-12 w-px bg-slate-800 hidden md:block"></div>

            {/* CARD DIÁRIO */}
            <div className="flex items-center gap-5 flex-1">
               <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-3xl">calendar_today</span>
               </div>
               <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo Diário (Turno)</p>
                  <h3 className="text-3xl font-black text-primary tabular-nums">R$ 0,00</h3>
               </div>
            </div>

            {/* BOTÃO ABRIR TURNO */}
            <div className="flex-1 flex justify-center lg:justify-end">
               <button 
                 onClick={() => setShowOpeningModal(true)}
                 className="bg-[#00c985] hover:bg-[#00b377] text-slate-900 font-black px-10 py-5 rounded-2xl text-[11px] uppercase tracking-widest shadow-[0_10px_20px_rgba(0,201,133,0.2)] transition-all active:scale-95 flex items-center gap-3"
               >
                  <span className="material-symbols-outlined font-black">add_circle</span>
                  Abrir Turno
               </button>
            </div>
         </div>

         {/* AUDITORIA DE UNIDADE */}
         <div className="lg:col-span-3 bg-[#101822]/40 rounded-3xl border border-slate-800/30 p-8 flex flex-col justify-center space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Auditoria de Unidade</h4>
            <p className="text-[9px] font-bold text-slate-500 leading-relaxed uppercase">O saldo acumulado reflete todo o dinheiro que deve estar fisicamente na gaveta agora.</p>
            <button className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:underline">
               Verificar Auditoria <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
         </div>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="relative group">
         <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-primary transition-colors">search</span>
         <input 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Pesquisar terminal ou operador..." 
            className="w-full h-16 bg-[#101822] border border-slate-800/50 rounded-2xl pl-16 pr-6 text-[11px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-600"
         />
      </div>

      {/* TABELA DE MOVIMENTAÇÕES */}
      <div className="bg-[#101822] border border-slate-800/50 rounded-3xl overflow-hidden shadow-2xl">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="border-b border-slate-800">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Caixa / Operador</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data/Hora Abertura</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data/Hora Fechamento</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ação</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
               {filteredSessions.map((s, idx) => (
                 <tr key={s.id} className="hover:bg-slate-800/20 transition-all group">
                    <td className="px-8 py-5">
                       <div className={`size-2.5 rounded-full ${s.status === CashSessionStatus.OPEN ? 'bg-[#00c985] shadow-[0_0_8px_rgba(0,201,133,0.5)]' : 'bg-primary shadow-[0_0_8px_rgba(19,109,236,0.5)]'}`}></div>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-[11px] font-black uppercase text-slate-200">{s.registerName}</p>
                       <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">MOV: #{s.id.slice(-12)}</p>
                    </td>
                    <td className="px-8 py-5 text-[11px] font-bold text-slate-400 tabular-nums">
                       {s.openingTime}
                    </td>
                    <td className="px-8 py-5">
                       {s.status === CashSessionStatus.OPEN ? (
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sessão em aberto</span>
                       ) : (
                          <span className="text-[11px] font-bold text-slate-400 tabular-nums">{s.closingTime}</span>
                       )}
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-primary/20 transition-all">
                          Exibir Extrato
                       </button>
                    </td>
                 </tr>
               ))}
               {filteredSessions.length === 0 && (
                 <tr>
                    <td colSpan={5} className="py-20 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.3em]">
                       Nenhuma sessão localizada
                    </td>
                 </tr>
               )}
            </tbody>
         </table>
      </div>

      {/* MODAL DE ABERTURA (Mantendo lógica funcional mas com visual da imagem) */}
      {showOpeningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-[#101822] w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 bg-primary text-white flex justify-between items-center">
                 <h3 className="font-black uppercase tracking-tight text-xl">Abertura de Caixa</h3>
                 <button onClick={() => setShowOpeningModal(false)} className="size-10 bg-white/10 rounded-full flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleOpenCash} className="p-10 space-y-8 text-slate-100">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Terminal / Operador</label>
                    <select required value={selectedRegister} onChange={e => setSelectedRegister(e.target.value)} className="w-full h-14 bg-[#0b1118] border border-slate-800 rounded-2xl px-6 font-black uppercase border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                       <option value="">Selecione...</option>
                       {users.map((u, i) => (
                         <option key={u.id} value={`CX ${i+1} - ${u.name}`}>CX {i+1} - {u.name}</option>
                       ))}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Fundo de Caixa (R$)</label>
                    <div className="relative">
                       <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#00c985] font-black text-lg">R$</span>
                       <input type="number" step="0.01" value={openingValue} onChange={e => setOpeningValue(parseFloat(e.target.value) || 0)} className="w-full h-16 bg-[#0b1118] border border-slate-800 rounded-2xl pl-16 pr-6 text-2xl font-black text-[#00c985] outline-none focus:ring-2 focus:ring-[#00c985]/20" />
                    </div>
                 </div>
                 <button type="submit" className="w-full h-16 bg-[#00c985] text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Iniciar Atividades</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default CashMovement;
