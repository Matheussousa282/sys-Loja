
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Product, Establishment } from '../types';

interface Batch {
  id: string;
  name: string;
  items: Record<string, number>;
  timestamp: string;
}

const STORAGE_KEY = 'erp_retail_balance_v3';

const Balance: React.FC = () => {
  const { products, bulkUpdateStock, establishments, currentUser, refreshData } = useApp();
  
  // Estados de Sessão
  const [sessionActive, setSessionActive] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Estados do Lote Atual (Bipagem)
  const [currentBatchName, setCurrentBatchName] = useState('');
  const [currentBatchItems, setCurrentBatchItems] = useState<Record<string, number>>({});
  const [isScanning, setIsScanning] = useState(false);
  
  // Estados de Edição de Lotes Salvos
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  
  // Estados de UI
  const [scannerValue, setScannerValue] = useState('');
  const scannerRef = useRef<HTMLInputElement>(null);
  const batchNameRef = useRef<HTMLInputElement>(null);

  const currentStore = useMemo(() => establishments.find(e => e.id === currentUser?.storeId), [establishments, currentUser]);

  // Carregar dados salvos na montagem
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.batches) setBatches(parsed.batches);
        if (parsed.currentBatchItems) setCurrentBatchItems(parsed.currentBatchItems);
        if (parsed.currentBatchName) setCurrentBatchName(parsed.currentBatchName);
        // Não ativamos a sessão automaticamente para mostrar a tela de "Retomar"
      } catch (e) {
        console.error("Erro ao recuperar sessão:", e);
      }
    }
    setIsInitialized(true);
    refreshData();
  }, []);

  // Salvar automaticamente
  useEffect(() => {
    if (!isInitialized) return;
    const dataToSave = { batches, currentBatchItems, currentBatchName, sessionActive };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [batches, currentBatchItems, currentBatchName, sessionActive, isInitialized]);

  const handleStartNewSession = () => {
    if (batches.length > 0 || Object.keys(currentBatchItems).length > 0) {
      if (!confirm("Já existe uma auditoria em andamento. Deseja DESCARTAR tudo e começar uma do zero?")) return;
    }
    setBatches([]);
    setCurrentBatchItems({});
    setCurrentBatchName('');
    setSessionActive(true);
    setIsScanning(false);
  };

  const handleResumeSession = () => {
    setSessionActive(true);
  };

  const handleOpenBatch = () => {
    if (!currentBatchName.trim()) {
      alert("Identifique o local (ex: Corredor A) antes de iniciar.");
      return;
    }
    setIsScanning(true);
    setTimeout(() => scannerRef.current?.focus(), 100);
  };

  const handleScan = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && scannerValue) {
      const code = scannerValue.trim().toUpperCase();
      const product = products.find(p => p.barcode === code || p.sku === code || p.sku.toUpperCase() === code);
      
      if (product) {
        setCurrentBatchItems(prev => ({
          ...prev,
          [product.id]: (prev[product.id] || 0) + 1
        }));
        setScannerValue('');
      } else {
        setScannerValue('');
        alert(`PRODUTO [${code}] NÃO ENCONTRADO!`);
      }
    }
  };

  const handleSaveBatch = () => {
    if (Object.keys(currentBatchItems).length === 0) return alert("Bipe ao menos um item!");
    const newBatch: Batch = {
      id: `batch-${Date.now()}`,
      name: currentBatchName.toUpperCase(),
      items: { ...currentBatchItems },
      timestamp: new Date().toLocaleString('pt-BR')
    };
    setBatches(prev => [...prev, newBatch]);
    setCurrentBatchItems({});
    setCurrentBatchName('');
    setIsScanning(false);
  };

  // Funções de Edição de Lote Salvo
  const updateBatchItemQty = (batchId: string, productId: string, newQty: number) => {
    setBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      const updatedItems = { ...b.items };
      if (newQty <= 0) {
        delete updatedItems[productId];
      } else {
        updatedItems[productId] = newQty;
      }
      return { ...b, items: updatedItems };
    }));
  };

  const removeBatchItem = (batchId: string, productId: string) => {
    if (confirm("Remover este item do lote?")) {
      updateBatchItemQty(batchId, productId, 0);
    }
  };

  const consolidatedCount = useMemo(() => {
    const total: Record<string, number> = {};
    batches.forEach(b => {
      Object.entries(b.items).forEach(([pid, qty]) => {
        total[pid] = (total[pid] || 0) + (qty as number);
      });
    });
    Object.entries(currentBatchItems).forEach(([pid, qty]) => {
      total[pid] = (total[pid] || 0) + (qty as number);
    });
    return total;
  }, [batches, currentBatchItems]);

  const comparison = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.map(p => {
      const counted = consolidatedCount[p.id] || 0;
      const expected = Number(p.stock) || 0;
      const diff = counted - expected;
      return { ...p, expected, counted, diff, status: diff === 0 ? 'OK' : diff > 0 ? 'SOBRA' : 'FALTA' };
    }).sort((a, b) => (Math.abs(b.diff) - Math.abs(a.diff)));
  }, [products, consolidatedCount]);

  const stats = useMemo(() => {
    const totalCounted = Object.values(consolidatedCount).reduce((a, b) => a + b, 0);
    const divergencies = comparison.filter(c => c.diff !== 0).length;
    const missingItems = comparison.filter(c => c.counted === 0 && c.expected > 0).length;
    const accuracy = products.length > 0 ? ((1 - divergencies / products.length) * 100) : 100;
    return { totalCounted, divergencies, missingItems, accuracy };
  }, [consolidatedCount, comparison, products.length]);

  const handleFinalizeBalance = async () => {
    const msg = `ATENÇÃO: FINALIZAR AUDITORIA GERAL?\n\n` +
                `- Total de Itens Bipados: ${stats.totalCounted}\n` +
                `- Divergências Detectadas: ${stats.divergencies}\n\n` +
                `O estoque de TODOS os produtos será substituído. Itens não localizados serão ZERADOS.`;
    
    if (confirm(msg)) {
      const adjustments: Record<string, number> = {};
      products.forEach(p => { adjustments[p.id] = consolidatedCount[p.id] || 0; });
      
      try {
        await bulkUpdateStock(adjustments);
        localStorage.removeItem(STORAGE_KEY);
        setSessionActive(false);
        setBatches([]);
        alert("ESTOQUE SINCRONIZADO COM SUCESSO!");
        refreshData();
      } catch (e) {
        alert("Erro na gravação.");
      }
    }
  };

  const selectedBatchForEdit = useMemo(() => batches.find(b => b.id === editingBatchId), [batches, editingBatchId]);

  if (!isInitialized) return null;

  return (
    <div className="min-h-screen bg-[#0b1118] text-slate-100 font-display flex flex-col overflow-hidden relative">
      
      {/* RELATÓRIO A4 (PRINT) */}
      <div id="balance-report" className="hidden print:block p-10 bg-white text-slate-900 font-sans">
         <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8">
            <div>
               <h1 className="text-3xl font-black uppercase tracking-tighter">{currentStore?.name || 'SISTEMA ERP'}</h1>
               <p className="text-[10px] font-bold text-slate-500 uppercase">Relatório de Auditoria de Inventário Físico</p>
            </div>
            <div className="text-right">
               <h2 className="text-xl font-black text-primary">BALANÇO GERAL</h2>
               <p className="text-sm font-black uppercase">DATA: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
         </div>
         <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center"><p className="text-[9px] font-black text-slate-400 uppercase">Total Contado</p><p className="text-2xl font-black">{stats.totalCounted} UN</p></div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center"><p className="text-[9px] font-black text-slate-400 uppercase">Divergências</p><p className="text-2xl font-black text-rose-600">{stats.divergencies}</p></div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center"><p className="text-[9px] font-black text-slate-400 uppercase">Acuracidade</p><p className="text-2xl font-black text-emerald-600">{stats.accuracy.toFixed(1)}%</p></div>
         </div>
         <table className="w-full text-left border-collapse mb-20">
            <thead>
               <tr className="bg-slate-900 text-white text-[10px] uppercase font-black">
                  <th className="p-3">Ref/SKU</th><th className="p-3">Descrição do Produto</th><th className="p-3 text-center">No Sistema</th><th className="p-3 text-center">Contado</th><th className="p-3 text-right">Diferença</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
               {comparison.filter(c => c.diff !== 0).map((item, idx) => (
                 <tr key={idx} className="text-[10px] font-bold"><td className="p-3 text-slate-500 font-mono">{item.sku}</td><td className="p-3 uppercase">{item.name}</td><td className="p-3 text-center text-slate-400">{item.expected}</td><td className="p-3 text-center font-black">{item.counted}</td><td className={`p-3 text-right font-black ${item.diff < 0 ? 'text-rose-600' : 'text-amber-600'}`}>{item.diff > 0 ? `+${item.diff}` : item.diff}</td></tr>
               ))}
            </tbody>
         </table>
      </div>

      {!sessionActive ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700 print:hidden">
          <div className="size-48 bg-primary/10 text-primary rounded-[4rem] flex items-center justify-center mb-10 shadow-2xl">
            <span className="material-symbols-outlined text-8xl">inventory</span>
          </div>
          <h2 className="text-5xl font-black text-white mb-6 tracking-tighter">Inventário Físico</h2>
          <p className="max-w-xl text-slate-500 font-bold text-lg mb-12 leading-relaxed uppercase tracking-wider">
            Realize a contagem total por lotes ou locais. <br/> Seu progresso é salvo automaticamente para pausas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
             {(batches.length > 0 || Object.keys(currentBatchItems).length > 0) && (
               <button 
                onClick={handleResumeSession}
                className="px-12 py-6 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-[2rem] font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center gap-4 group"
               >
                 <span className="material-symbols-outlined text-3xl">play_circle</span>
                 RETOMAR AUDITORIA
               </button>
             )}
             <button 
               onClick={handleStartNewSession}
               className="px-12 py-6 bg-primary hover:bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center gap-4 group"
             >
               <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform">add_circle</span>
               NOVO BALANÇO GERAL
             </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden print:hidden">
          
          <div className="bg-primary p-2 flex items-center justify-between shadow-2xl z-30 shrink-0">
             <div className="flex items-center gap-4 px-4">
                <span className="material-symbols-outlined text-white/50 animate-pulse">verified_user</span>
                <h1 className="text-xs font-black uppercase tracking-widest text-white">Auditoria Ativa: {currentStore?.name || 'Loja Local'}</h1>
             </div>
             <div className="flex gap-1">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-black text-[10px] uppercase transition-all border border-white/10">
                   <span className="material-symbols-outlined text-sm">print</span> Relatório
                </button>
                <button onClick={handleFinalizeBalance} className="flex items-center gap-2 px-6 py-2 bg-[#00c985] hover:bg-[#00b377] text-slate-900 rounded font-black text-[10px] uppercase transition-all shadow-lg ml-2">
                   <span className="material-symbols-outlined text-sm">check_circle</span> Finalizar e Ajustar
                </button>
                <button onClick={() => setSessionActive(false)} className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded font-black text-[10px] uppercase transition-all shadow-lg ml-2">
                   <span className="material-symbols-outlined text-sm">pause_circle</span> Pausar p/ Almoço
                </button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0b1118]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-4 space-y-6">
                 {!isScanning ? (
                   <div className="bg-[#101822] p-8 rounded-[2.5rem] border-2 border-primary/20 shadow-lg space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                         <span className="material-symbols-outlined text-primary">location_on</span>
                         <h3 className="text-sm font-black text-white uppercase tracking-widest">Local do Inventário</h3>
                      </div>
                      <input 
                        ref={batchNameRef}
                        value={currentBatchName}
                        onChange={e => setCurrentBatchName(e.target.value)}
                        placeholder="Ex: PRATELEIRA 01, VITRINE A..."
                        className="w-full h-16 bg-[#0b1118] border border-slate-800 rounded-2xl px-6 text-lg font-bold placeholder:text-slate-700 focus:ring-4 focus:ring-primary/10 transition-all uppercase text-white outline-none"
                      />
                      <button 
                        onClick={handleOpenBatch}
                        className="w-full py-5 bg-primary hover:bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined">barcode_scanner</span>
                        COMEÇAR BIPAGEM
                      </button>
                   </div>
                 ) : (
                   <div className="bg-[#101822] p-8 rounded-[2.5rem] border-4 border-primary shadow-2xl space-y-6 animate-in zoom-in-95">
                      <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-3">
                            <span className="size-3 bg-red-500 rounded-full animate-ping"></span>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Lote: {currentBatchName}</h3>
                         </div>
                         <button onClick={() => setIsScanning(false)} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                      </div>
                      <input 
                        ref={scannerRef}
                        autoFocus
                        value={scannerValue}
                        onChange={e => setScannerValue(e.target.value)}
                        onKeyDown={handleScan}
                        placeholder="BIPE O CÓDIGO..."
                        className="w-full h-20 bg-primary/5 border-2 border-primary/20 rounded-3xl px-6 text-3xl font-black text-center text-primary placeholder:text-primary/10 focus:ring-0 outline-none uppercase"
                      />
                      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                         {Object.entries(currentBatchItems).reverse().map(([pid, qty]) => {
                           const p = products.find(x => x.id === pid);
                           return (
                             <div key={pid} className="flex justify-between items-center p-4 bg-[#0b1118] rounded-xl border border-slate-800 animate-in slide-in-from-right-4">
                                <div className="flex flex-col min-w-0">
                                   <span className="text-xs font-black truncate text-slate-200 uppercase">{p?.name}</span>
                                   <span className="text-[9px] font-mono text-slate-500">{p?.sku}</span>
                                </div>
                                <span className="text-lg font-black text-primary tabular-nums">{qty}x</span>
                             </div>
                           );
                         })}
                      </div>
                      <button 
                        onClick={handleSaveBatch}
                        className="w-full py-5 bg-[#00c985] hover:bg-[#00b377] text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined">save</span> FINALIZAR LOTE
                      </button>
                   </div>
                 )}

                 <div className="bg-[#101822] p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Lotes Salvos (Clique p/ ver itens)</h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                       {batches.map(b => (
                         <div key={b.id} onClick={() => setEditingBatchId(b.id)} className="p-4 bg-[#0b1118] rounded-2xl border border-slate-800 flex justify-between items-center cursor-pointer hover:border-primary transition-all group">
                            <div><p className="text-xs font-black text-white uppercase group-hover:text-primary transition-colors">{b.name}</p><p className="text-[9px] text-slate-500 uppercase font-bold">{Object.values(b.items).reduce((a:any, b:any) => a+b, 0)} itens</p></div>
                            <button onClick={(e) => { e.stopPropagation(); if(confirm('Remover lote?')) setBatches(prev => prev.filter(x => x.id !== b.id)); }} className="text-rose-500 hover:scale-110 transition-transform"><span className="material-symbols-outlined text-lg">delete</span></button>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-8">
                 <div className="bg-[#101822] rounded-[3rem] border border-slate-800 shadow-sm overflow-hidden flex flex-col h-[750px]">
                    <div className="p-8 border-b border-slate-800 bg-[#0b1118]/50 flex justify-between items-center">
                       <div><h3 className="text-xl font-black text-white uppercase tracking-tight">Análise de Divergências</h3><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Conferência Física vs Saldo Atual</p></div>
                       <div className="flex gap-4">
                          <div className="text-center px-6 border-r border-slate-800"><p className="text-[8px] font-black text-slate-500 uppercase mb-1">Divergências</p><p className="text-xl font-black text-rose-500">{stats.divergencies}</p></div>
                          <div className="text-center px-6"><p className="text-[8px] font-black text-slate-500 uppercase mb-1">Acuracidade</p><p className="text-xl font-black text-emerald-500">{stats.accuracy.toFixed(1)}%</p></div>
                          <div className="text-center px-6 border-l border-slate-800"><p className="text-[8px] font-black text-slate-500 uppercase mb-1">Bipados</p><p className="text-xl font-black text-primary">{stats.totalCounted}</p></div>
                       </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                       <table className="w-full text-left">
                          <thead className="sticky top-0 bg-[#101822] z-10 border-b border-slate-800">
                             <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-8 py-5">Produto / Referência</th><th className="px-8 py-5 text-center">Esperado</th><th className="px-8 py-5 text-center">Bipado</th><th className="px-8 py-5 text-right">Diferença</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                             {comparison.map(item => (
                               <tr key={item.id} className={`group hover:bg-white/5 transition-all ${item.diff !== 0 ? 'bg-rose-500/5' : ''}`}>
                                  <td className="px-8 py-5"><div className="flex items-center gap-4"><img src={item.image} className="size-10 rounded-xl object-cover" /><div><p className="text-xs font-black text-white uppercase leading-tight mb-1">{item.name}</p><p className="text-[9px] font-mono text-primary font-bold uppercase">{item.sku}</p></div></div></td>
                                  <td className="px-8 py-5 text-center text-sm font-bold text-slate-500 tabular-nums">{item.expected}</td>
                                  <td className="px-8 py-5 text-center text-lg font-black text-primary tabular-nums">{item.counted}</td>
                                  <td className="px-8 py-5 text-right">
                                     <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black tabular-nums ${item.status === 'OK' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {item.diff > 0 ? `+${item.diff}` : item.diff}
                                        <span className="material-symbols-outlined text-[16px]">{item.status === 'OK' ? 'verified' : item.diff > 0 ? 'keyboard_double_arrow_up' : 'keyboard_double_arrow_down'}</span>
                                     </div>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE LOTE */}
      {selectedBatchForEdit && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-[#101822] w-full max-w-4xl rounded-[3rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col h-[80vh] animate-in zoom-in-95">
              <div className="p-8 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-black uppercase text-primary leading-none">Gerenciar Lote: {selectedBatchForEdit.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Gravado em: {selectedBatchForEdit.timestamp}</p>
                 </div>
                 <button onClick={() => setEditingBatchId(null)} className="size-12 rounded-2xl bg-white/5 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-lg"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                 <table className="w-full text-left">
                    <thead className="border-b border-slate-800">
                       <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <th className="px-4 py-4">Produto</th>
                          <th className="px-4 py-4 text-center">Quantidade</th>
                          <th className="px-4 py-4 text-right">Ação</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                       {Object.entries(selectedBatchForEdit.items).map(([pid, qty]) => {
                          const p = products.find(x => x.id === pid);
                          return (
                            <tr key={pid} className="group hover:bg-white/5 transition-all font-bold">
                               <td className="px-4 py-6">
                                  <div className="flex items-center gap-4">
                                     <img src={p?.image} className="size-10 rounded-lg object-cover" />
                                     <div><p className="text-sm font-black text-white uppercase">{p?.name}</p><p className="text-[10px] text-primary font-mono">{p?.sku}</p></div>
                                  </div>
                               </td>
                               <td className="px-4 py-6 text-center">
                                  <div className="inline-flex items-center gap-4 bg-[#0b1118] p-2 rounded-2xl border border-slate-800 shadow-inner">
                                     <button onClick={() => updateBatchItemQty(selectedBatchForEdit.id, pid, qty - 1)} className="size-8 rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white transition-all font-black">-</button>
                                     <span className="text-xl font-black text-primary tabular-nums w-12 text-center">{qty}</span>
                                     <button onClick={() => updateBatchItemQty(selectedBatchForEdit.id, pid, qty + 1)} className="size-8 rounded-xl bg-slate-800 text-slate-400 hover:bg-emerald-500 hover:text-white transition-all font-black">+</button>
                                  </div>
                               </td>
                               <td className="px-4 py-6 text-right">
                                  <button onClick={() => removeBatchItem(selectedBatchForEdit.id, pid)} className="size-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><span className="material-symbols-outlined">delete</span></button>
                               </td>
                            </tr>
                          );
                       })}
                    </tbody>
                 </table>
                 {Object.keys(selectedBatchForEdit.items).length === 0 && (
                   <div className="py-20 text-center opacity-20 font-black uppercase text-xs">Lote vazio ou removido</div>
                 )}
              </div>
              <div className="p-8 border-t border-slate-800 bg-[#0b1118]/50 text-right">
                 <button onClick={() => setEditingBatchId(null)} className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Concluir Edição</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        @media print {
          body * { visibility: hidden !important; }
          #balance-report, #balance-report * { visibility: visible !important; display: block !important; }
          #balance-report { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </div>
  );
};

export default Balance;
