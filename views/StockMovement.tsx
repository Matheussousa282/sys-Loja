
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Product, UserRole, Establishment } from '../types';

interface MovementItem extends Product {
  entryQty: number;
}

const StockMovement: React.FC = () => {
  const { products, bulkUpdateStock, currentUser, establishments, refreshData } = useApp();
  
  // Estados de Controle do Cabeçalho
  const [operationDir, setOperationDir] = useState<'IN' | 'OUT'>('IN');
  const [controlId, setControlId] = useState(`MOV-${Date.now().toString().slice(-6)}`);
  const [sourceStore, setSourceStore] = useState('FORNECEDOR EXTERNO');
  const [priceTable, setPriceTable] = useState('TABELA PADRÃO');
  
  const [movementType, setMovementType] = useState<string>('COMPRA');
  const [entryMode, setEntryMode] = useState<'AUTOMATICA' | 'MANUAL'>('AUTOMATICA');
  const [useRefCost, setUseRefCost] = useState(true);

  // Estados Operacionais
  const [search, setSearch] = useState('');
  const [batchItems, setBatchItems] = useState<MovementItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
    setMovementType(operationDir === 'IN' ? 'COMPRA' : 'DEVOLUCAO');
  }, [operationDir]);

  const currentStore = useMemo(() => establishments.find(e => e.id === currentUser?.storeId), [establishments, currentUser]);

  const filteredProducts = useMemo(() => {
    if (!search) return [];
    const low = search.toLowerCase();
    return products.filter(p => 
      !p.isService && (
        p.name.toLowerCase().includes(low) || 
        p.sku.toLowerCase().includes(low) || 
        p.barcode?.includes(search)
      )
    ).slice(0, 8);
  }, [search, products]);

  const addToBatch = (p: Product) => {
    const existing = batchItems.find(item => item.id === p.id);
    if (existing) {
      setBatchItems(batchItems.map(item => item.id === p.id ? { ...item, entryQty: item.entryQty + 1 } : item));
    } else {
      setBatchItems([...batchItems, { ...p, entryQty: 1 }]);
    }
    setSearch('');
    if (entryMode === 'AUTOMATICA') searchInputRef.current?.focus();
  };

  const updateItemQty = (id: string, qty: number) => {
    setBatchItems(batchItems.map(item => item.id === id ? { ...item, entryQty: Math.max(0, qty) } : item));
  };

  const removeItem = (id: string) => {
    setBatchItems(batchItems.filter(item => item.id !== id));
  };

  const handlePrintReport = () => {
    if (batchItems.length === 0) {
      alert("Adicione itens à lista para gerar o relatório!");
      return;
    }
    window.print();
  };

  const handleSave = async () => {
    if (batchItems.length === 0) {
      alert("Nenhum item adicionado para gravação!");
      return;
    }

    setIsProcessing(true);
    try {
      const adjustments: Record<string, number> = {};
      batchItems.forEach(item => {
        adjustments[item.id] = operationDir === 'IN' 
          ? item.stock + item.entryQty 
          : item.stock - item.entryQty;
      });

      await bulkUpdateStock(adjustments);
      alert(`${operationDir === 'IN' ? 'Entrada' : 'Saída'} de estoque gravada com sucesso!`);
      setBatchItems([]);
      setControlId(`MOV-${Date.now().toString().slice(-6)}`);
      refreshData();
    } catch (e) {
      alert("Erro ao processar movimentação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalItemsCount = useMemo(() => batchItems.reduce((acc, i) => acc + i.entryQty, 0), [batchItems]);

  const entryTypes = ['COMPRA', 'TRANSFERENCIA', 'AJUSTE (SOBRA)'];
  const exitTypes = ['DEVOLUCAO', 'TRANSFERENCIA', 'PERDA/QUEBRA', 'USO/CONSUMO'];

  return (
    <div className="min-h-screen bg-[#0b1118] text-slate-100 font-display flex flex-col overflow-hidden relative">
      
      {/* TEMPLATE DE IMPRESSÃO A4 (OCULTO NA TELA) */}
      <div id="movement-print-template" className="hidden print:block p-10 bg-white text-slate-900 font-sans">
         <div className={`flex justify-between items-center border-b-4 ${operationDir === 'IN' ? 'border-primary' : 'border-orange-600'} pb-6 mb-8`}>
            <div>
               <h1 className="text-3xl font-black uppercase tracking-tighter">{currentStore?.name || 'TEM ACESSÓRIOS'}</h1>
               <p className="text-[10px] font-bold text-slate-500 uppercase">{currentStore?.location} | CNPJ: {currentStore?.cnpj}</p>
            </div>
            <div className="text-right">
               <h2 className={`text-xl font-black ${operationDir === 'IN' ? 'text-primary' : 'text-orange-600'}`}>
                 RELATÓRIO DE {operationDir === 'IN' ? 'ENTRADA' : 'SAÍDA'}
               </h2>
               <p className="text-sm font-black uppercase">DOC: {controlId}</p>
               <p className="text-[10px] font-bold text-slate-400">EMISSÃO: {new Date().toLocaleString('pt-BR')}</p>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-10 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="space-y-1">
               <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalhes do Movimento</h4>
               <p className="text-sm font-black uppercase">Motivo: {movementType}</p>
               <p className="text-sm font-black uppercase">Origem/Dest: {sourceStore}</p>
            </div>
            <div className="space-y-1 text-right">
               <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Informações Técnicas</h4>
               <p className="text-sm font-black uppercase">Operador: {currentUser?.name}</p>
               <p className="text-sm font-black uppercase">Total de Itens: {totalItemsCount}</p>
            </div>
         </div>

         <table className="w-full text-left mb-20">
            <thead>
               <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-[10px] font-black uppercase rounded-tl-xl">Ref/SKU</th>
                  <th className="p-4 text-[10px] font-black uppercase">Descrição do Produto</th>
                  <th className="p-4 text-center text-[10px] font-black uppercase">Un</th>
                  <th className="p-4 text-right text-[10px] font-black uppercase rounded-tr-xl">Quantidade</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 border-x border-b border-slate-100">
               {batchItems.map((item, idx) => (
                 <tr key={idx} className="text-[11px] font-bold">
                    <td className="p-4 text-slate-400 font-mono">{item.sku}</td>
                    <td className="p-4 uppercase">{item.name}</td>
                    <td className="p-4 text-center">{item.unit || 'UN'}</td>
                    <td className={`p-4 text-right font-black text-lg ${operationDir === 'IN' ? 'text-primary' : 'text-orange-600'}`}>
                      {item.entryQty}
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>

         <div className="mt-40 grid grid-cols-2 gap-20">
            <div className="text-center border-t border-slate-400 pt-4">
               <p className="text-[10px] font-black uppercase">Assinatura do Conferente</p>
               <p className="text-[8px] text-slate-400 uppercase mt-1">Responsável pela Verificação Física</p>
            </div>
            <div className="text-center border-t border-slate-400 pt-4">
               <p className="text-[10px] font-black uppercase">Gerente de Estoque</p>
               <p className="text-[8px] text-slate-400 uppercase mt-1">Autorização de Lançamento</p>
            </div>
         </div>
      </div>

      {/* TOOLBAR DE AÇÕES */}
      <div className={`${operationDir === 'IN' ? 'bg-primary' : 'bg-orange-600'} p-2 flex items-center justify-between shadow-2xl z-20 transition-colors duration-500 print:hidden`}>
         <div className="flex items-center gap-4 px-4">
            <span className="material-symbols-outlined text-white/50">{operationDir === 'IN' ? 'inventory' : 'outbox'}</span>
            <h1 className="text-xs font-black uppercase tracking-widest text-white">
              {operationDir === 'IN' ? 'Movimentação: Entrada de Mercadoria' : 'Movimentação: Retirada / Saída'}
            </h1>
         </div>
         <div className="flex gap-1">
            <button onClick={handleSave} disabled={isProcessing} className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-black text-[10px] uppercase transition-all border border-white/10">
               <span className="material-symbols-outlined text-sm">save</span> {isProcessing ? 'Gravando...' : 'Gravar'}
            </button>
            <button onClick={() => setBatchItems([])} className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-black text-[10px] uppercase transition-all border border-white/10">
               <span className="material-symbols-outlined text-sm">cancel</span> Cancelar
            </button>
            <button onClick={handlePrintReport} className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-black text-[10px] uppercase transition-all border border-white/10">
               <span className="material-symbols-outlined text-sm">print</span> Relatório
            </button>
            <button onClick={() => window.history.back()} className="flex items-center gap-2 px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-black text-[10px] uppercase transition-all shadow-lg ml-4">
               <span className="material-symbols-outlined text-sm">logout</span> Sair
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar print:hidden">
        
        {/* CABEÇALHO DE PARÂMETROS */}
        <section className="bg-[#101822] rounded-xl border border-slate-800 p-6 grid grid-cols-1 md:grid-cols-12 gap-6 shadow-sm">
           
           <div className="md:col-span-3 space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Sentido do Lançamento</p>
              <div className="flex bg-[#0b1118] p-1 rounded-lg">
                 <button 
                  onClick={() => setOperationDir('IN')}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-md transition-all ${operationDir === 'IN' ? 'bg-primary text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                 >
                   Entrada (+)
                 </button>
                 <button 
                  onClick={() => setOperationDir('OUT')}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-md transition-all ${operationDir === 'OUT' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                 >
                   Saída (-)
                 </button>
              </div>
           </div>

           <div className="md:col-span-6 space-y-3 bg-slate-800/20 p-4 rounded-xl border border-slate-800">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                Motivo da {operationDir === 'IN' ? 'Entrada' : 'Retirada'}
              </p>
              <div className="flex flex-wrap gap-4">
                 {(operationDir === 'IN' ? entryTypes : exitTypes).map(type => (
                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="moveType" 
                        checked={movementType === type} 
                        onChange={() => setMovementType(type)} 
                        className={`size-4 bg-slate-900 border-slate-700 focus:ring-offset-0 ${operationDir === 'IN' ? 'text-primary' : 'text-orange-500'}`} 
                      />
                      <span className={`text-[10px] font-black uppercase ${movementType === type ? (operationDir === 'IN' ? 'text-primary' : 'text-orange-500') : 'text-slate-500 group-hover:text-slate-300'}`}>{type}</span>
                   </label>
                 ))}
              </div>
           </div>

           <div className="md:col-span-3 space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Loja/Origem-Destino:</label>
              <select value={sourceStore} onChange={e => setSourceStore(e.target.value)} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-lg px-4 text-[10px] font-bold text-slate-300 uppercase outline-none focus:ring-1 focus:ring-primary">
                 <option>{operationDir === 'IN' ? 'FORNECEDOR EXTERNO' : 'CONSUMIDOR / AJUSTE'}</option>
                 {establishments.map(est => <option key={est.id} value={est.name}>{est.name}</option>)}
              </select>
           </div>

           <div className="md:col-span-4 space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Tabela de Preços:</label>
              <select value={priceTable} onChange={e => setPriceTable(e.target.value)} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-lg px-4 text-[10px] font-bold text-slate-300 uppercase outline-none focus:ring-1 focus:ring-primary">
                 <option>TABELA PADRÃO - VAREJO</option>
                 <option>TABELA ATACADO</option>
              </select>
           </div>
           
           <div className="md:col-span-4 flex items-center gap-3 pt-6">
              <input type="checkbox" checked={useRefCost} onChange={e => setUseRefCost(e.target.checked)} className="size-4 rounded bg-slate-800 border-slate-700 text-primary focus:ring-primary" />
              <label className="text-[9px] font-black text-slate-400 uppercase leading-tight">Atualizar Custo Médio na Referência</label>
           </div>

           <div className="md:col-span-4 space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Protocolo Nº:</label>
              <div className="flex gap-2">
                 <input value={controlId} onChange={e => setControlId(e.target.value)} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-lg px-4 text-[11px] font-black text-primary uppercase text-center" />
                 <button onClick={() => setControlId(`MOV-${Date.now().toString().slice(-6)}`)} className="bg-slate-800 hover:bg-slate-700 size-11 rounded-lg flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-lg">sync</span></button>
              </div>
           </div>
        </section>

        {/* SELEÇÃO DE MODO E BUSCA */}
        <section className="bg-[#101822] rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col">
           <div className="bg-slate-800/30 flex border-b border-slate-800">
              <button onClick={() => setEntryMode('AUTOMATICA')} className={`px-10 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${entryMode === 'AUTOMATICA' ? 'bg-[#0b1118] text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-300'}`}>Automática (Bipagem)</button>
              <button onClick={() => setEntryMode('MANUAL')} className={`px-10 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${entryMode === 'MANUAL' ? 'bg-[#0b1118] text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-300'}`}>Manual (Pesquisa)</button>
           </div>
           
           <div className="p-8 space-y-6">
              <div className="flex flex-col md:flex-row gap-8 items-end">
                 <div className="flex-1 space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 ${operationDir === 'IN' ? 'text-primary' : 'text-orange-500'}`}>
                      {operationDir === 'IN' ? 'Entrada de Referências' : 'Retirada de Referências'}
                    </label>
                    <div className="relative">
                       <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">barcode_scanner</span>
                       <input 
                         ref={searchInputRef}
                         value={search}
                         onChange={e => setSearch(e.target.value)}
                         placeholder={entryMode === 'AUTOMATICA' ? "BIPE O PRODUTO AGORA..." : "DIGITE O NOME OU REFERÊNCIA DO ITEM..."}
                         className={`w-full h-16 bg-[#0b1118] border border-slate-800 rounded-xl pl-14 pr-6 text-lg font-black text-white placeholder:text-slate-700 outline-none focus:ring-1 ${operationDir === 'IN' ? 'focus:ring-primary' : 'focus:ring-orange-500'} uppercase transition-all`}
                       />
                       
                       {filteredProducts.length > 0 && (
                         <div className="absolute top-full left-0 right-0 mt-1 bg-[#101822] border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
                            {filteredProducts.map(p => (
                               <button key={p.id} onClick={() => addToBatch(p)} className="w-full p-4 flex items-center justify-between hover:bg-primary transition-all border-b border-slate-800 last:border-none group text-left">
                                  <div className="flex items-center gap-4">
                                     <img src={p.image} className="size-10 rounded-lg object-cover" />
                                     <div>
                                        <p className="text-[11px] font-black text-white uppercase">{p.name}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase group-hover:text-white/70">REF: {p.sku} | ESTOQUE ATUAL: {p.stock}</p>
                                     </div>
                                  </div>
                                  <span className="text-[10px] font-black bg-slate-800 px-3 py-1 rounded text-slate-400 group-hover:bg-white/20 group-hover:text-white">SELECIONAR</span>
                               </button>
                            ))}
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="w-full md:w-64 bg-slate-800/40 p-6 rounded-xl border border-slate-800 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Qtd. Total no Lote</p>
                    <p className="text-4xl font-black text-white tabular-nums tracking-tighter">{totalItemsCount.toString().padStart(2, '0')}</p>
                 </div>
              </div>

              {/* GRID DE ITENS LANÇADOS */}
              <div className="border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                 <table className="w-full text-left border-collapse">
                    <thead className={`bg-[#0b1118] ${operationDir === 'IN' ? 'text-primary' : 'text-orange-500'}`}>
                       <tr className="text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                          <th className="px-6 py-4 w-48 border-r border-slate-800">Referência</th>
                          <th className="px-6 py-4 border-r border-slate-800">Descrição do Produto</th>
                          <th className="px-6 py-4 text-center w-24 border-r border-slate-800">Un</th>
                          <th className="px-6 py-4 text-center w-24 border-r border-slate-800">Estoque</th>
                          <th className={`px-6 py-4 text-center w-32 ${operationDir === 'IN' ? 'bg-primary/10' : 'bg-orange-500/10'}`}>Qtd. {operationDir === 'IN' ? 'Entrada' : 'Saída'}</th>
                          <th className="px-6 py-4 text-right w-20">Ação</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-[#0b1118]/40">
                       {batchItems.map(item => (
                         <tr key={item.id} className="group hover:bg-slate-800/30 transition-all text-slate-300 font-bold">
                            <td className={`px-6 py-4 font-mono border-r border-slate-800/50 uppercase ${operationDir === 'IN' ? 'text-primary' : 'text-orange-500'}`}>{item.sku}</td>
                            <td className="px-6 py-4 uppercase border-r border-slate-800/50">
                               <div className="flex items-center gap-3">
                                  <img src={item.image} className="size-6 rounded object-cover opacity-50" />
                                  <span className="text-[11px] truncate">{item.name}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-center text-[10px] text-slate-500 border-r border-slate-800/50 uppercase">{item.unit || 'UN'}</td>
                            <td className="px-6 py-4 text-center text-[10px] text-slate-500 border-r border-slate-800/50 tabular-nums">{item.stock}</td>
                            <td className={`px-6 py-4 text-center ${operationDir === 'IN' ? 'bg-primary/5' : 'bg-orange-500/5'}`}>
                               <input 
                                 type="number" 
                                 value={item.entryQty} 
                                 onChange={e => updateItemQty(item.id, parseInt(e.target.value) || 0)}
                                 className={`w-20 h-9 bg-slate-900 border rounded text-center font-black text-lg focus:ring-1 outline-none ${operationDir === 'IN' ? 'border-primary/20 text-primary focus:ring-primary' : 'border-orange-500/20 text-orange-500 focus:ring-orange-500'}`}
                               />
                            </td>
                            <td className="px-6 py-4 text-right">
                               <button onClick={() => removeItem(item.id)} className="text-rose-500 opacity-20 group-hover:opacity-100 hover:scale-125 transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
                            </td>
                         </tr>
                       ))}
                       {batchItems.length === 0 && (
                          <tr><td colSpan={6} className="py-32 text-center opacity-10 text-xs font-black uppercase tracking-[0.5em]">Aguardando inclusão de referências...</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </section>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        @media print {
          body * { visibility: hidden !important; }
          #movement-print-template, #movement-print-template * { visibility: visible !important; display: block !important; }
          #movement-print-template { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; border: none !important; }
          @page { size: A4; margin: 0mm; }
        }
      `}</style>
    </div>
  );
};

export default StockMovement;
