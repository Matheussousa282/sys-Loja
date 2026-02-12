
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../AppContext';
import { PriceTable, PriceTableItem, Product } from '../types';

const PriceTableManagement: React.FC = () => {
  const { products, priceTables, savePriceTable, deletePriceTable, savePriceTableItem, deletePriceTableItem, getPriceTableItems } = useApp();
  
  const [selectedTable, setSelectedTable] = useState<PriceTable | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableForm, setTableForm] = useState({
    id: '', description: '', startDate: new Date().toISOString().split('T')[0], endDate: '', tableType: 'VAREJO' as 'VAREJO' | 'ATACADO', active: true
  });

  const [tableItems, setTableItems] = useState<PriceTableItem[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  
  const [editingItem, setEditingItem] = useState<{
    productId: string; sku: string; name: string; p1: number; p2: number; p3: number; id: string;
  } | null>(null);

  useEffect(() => {
    if (selectedTable) loadItems(selectedTable.id);
    else setTableItems([]);
  }, [selectedTable]);

  const loadItems = async (tableId: string) => {
    setLoadingItems(true);
    const data = await getPriceTableItems(tableId);
    setTableItems(data);
    setLoadingItems(false);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = tableForm.id || `pt-${Date.now()}`;
    await savePriceTable({
      id: newId,
      description: tableForm.description.toUpperCase(),
      start_date: tableForm.startDate,
      end_date: tableForm.endDate || '2099-12-31',
      type: tableForm.tableType,
      active: tableForm.active
    });
    setShowTableModal(false);
    setTableForm({id: '', description: '', startDate: new Date().toISOString().split('T')[0], endDate: '', tableType: 'VAREJO', active: true});
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !editingItem) return;
    await savePriceTableItem({
        id: editingItem.id || `pti-${Date.now()}`,
        priceTableId: selectedTable.id,
        productId: editingItem.productId,
        sku: editingItem.sku,
        name: editingItem.name,
        p1: editingItem.p1,
        p2: editingItem.p2,
        p3: editingItem.p3
    });
    setEditingItem(null);
    setSearchProduct('');
    loadItems(selectedTable.id);
  };

  const applyMarkup = (percent: number) => {
    if (!editingItem) return;
    const baseProduct = products.find(p => p.id === editingItem.productId);
    if (!baseProduct) return;
    const cost = Number(baseProduct.costPrice) || 0;
    const calculated = Number((cost * (1 + percent / 100)).toFixed(2));
    setEditingItem({ ...editingItem, p1: calculated, p2: calculated, p3: calculated });
  };

  const applyDiscount = (percent: number) => {
    if (!editingItem) return;
    const baseProduct = products.find(p => p.id === editingItem.productId);
    if (!baseProduct) return;
    const sale = Number(baseProduct.salePrice) || 0;
    const calculated = Number((sale * (1 - percent / 100)).toFixed(2));
    setEditingItem({ ...editingItem, p1: calculated, p2: calculated, p3: calculated });
  };

  const filteredProducts = useMemo(() => {
    if (!searchProduct) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchProduct.toLowerCase())
    ).slice(0, 5);
  }, [searchProduct, products]);

  const selectProductToLink = (p: Product) => {
    const exists = tableItems.find(item => item.product_id === p.id);
    if (exists) {
        setEditingItem({ id: exists.id, productId: p.id, sku: p.sku, name: p.name, p1: exists.price_1, p2: exists.price_2, p3: exists.price_3 });
    } else {
        setEditingItem({ id: '', productId: p.id, sku: p.sku, name: p.name, p1: p.salePrice, p2: p.salePrice, p3: p.salePrice });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1118] text-slate-100 font-display flex flex-col overflow-hidden">
      <div className="bg-primary p-2 flex items-center justify-between shadow-2xl z-20 shrink-0">
         <div className="flex items-center gap-4 px-4">
            <span className="material-symbols-outlined text-white/50">sell</span>
            <h1 className="text-xs font-black uppercase tracking-widest text-white">Gestão de Tabelas de Preço</h1>
         </div>
         <div className="flex gap-1">
            <button onClick={() => { setTableForm({id: '', description: '', startDate: new Date().toISOString().split('T')[0], endDate: '', tableType: 'VAREJO', active: true}); setShowTableModal(true); }} className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-black text-[10px] uppercase transition-all border border-white/10">
               <span className="material-symbols-outlined text-sm">add_circle</span> Incluir Tabela
            </button>
            <button onClick={() => window.history.back()} className="flex items-center gap-2 px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-black text-[10px] uppercase transition-all shadow-lg ml-4">
               <span className="material-symbols-outlined text-sm">logout</span> Sair
            </button>
         </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
         <aside className="w-full md:w-1/3 bg-[#101822] border-r border-slate-800 flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800/50 bg-slate-900/50 flex justify-between items-center">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tabelas Ativas</p>
               <span className="text-[10px] font-black text-primary">{priceTables.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
               {priceTables.map(t => (
                 <div key={t.id} onClick={() => setSelectedTable(t)} className={`p-6 border-b border-slate-800/50 cursor-pointer transition-all hover:bg-primary/5 group ${selectedTable?.id === t.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                       <span className={`text-[8px] font-black px-2 py-0.5 rounded ${t.type === 'ATACADO' ? 'bg-amber-500 text-slate-900' : 'bg-primary text-white'}`}>{t.type}</span>
                       <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setTableForm({id: t.id, description: t.description, startDate: t.start_date, endDate: t.end_date, tableType: t.type, active: t.active}); setShowTableModal(true); }} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined text-xs">edit</span></button>
                          <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir tabela?')) deletePriceTable(t.id); }} className="text-slate-500 hover:text-rose-500"><span className="material-symbols-outlined text-xs">delete</span></button>
                       </div>
                    </div>
                    <h3 className="text-xs font-black uppercase text-slate-200 group-hover:text-primary transition-colors">{t.description}</h3>
                    <p className="text-[8px] text-slate-500 font-bold mt-1">VIGÊNCIA: {t.start_date.split('-').reverse().join('/')} ATÉ {t.end_date?.split('-').reverse().join('/')}</p>
                 </div>
               ))}
            </div>
         </aside>

         <main className="flex-1 bg-[#0b1118] flex flex-col overflow-hidden">
            {!selectedTable ? (
               <div className="h-full flex flex-col items-center justify-center opacity-20"><span className="material-symbols-outlined text-8xl">price_change</span><p className="text-xs font-black uppercase mt-4">Selecione uma tabela para gerenciar preços</p></div>
            ) : (
               <>
                  <div className="p-8 bg-slate-900 border-b border-slate-800 shrink-0">
                     <div className="flex justify-between items-end mb-6">
                        <div><h2 className="text-xl font-black uppercase text-primary tracking-tight">{selectedTable.description}</h2><p className="text-[10px] font-bold text-slate-500 uppercase">Configuração de Vínculos de Itens</p></div>
                        <div className="bg-slate-800 px-6 py-2 rounded-xl border border-slate-700 text-center"><p className="text-[8px] font-black text-slate-500 uppercase">Itens Vinculados</p><p className="text-2xl font-black text-white">{tableItems.length}</p></div>
                     </div>
                     <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                        <input value={searchProduct} onChange={e => setSearchProduct(e.target.value)} placeholder="VINCULAR NOVO PRODUTO (BUSQUE SKU OU NOME)..." className="w-full h-14 bg-[#0b1118] border border-slate-800 rounded-xl pl-12 pr-6 text-xs font-black uppercase focus:border-primary outline-none transition-all" />
                        {filteredProducts.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[#101822] border border-slate-700 shadow-2xl rounded-2xl z-50 overflow-hidden animate-in fade-in">
                             {filteredProducts.map(p => (
                               <button key={p.id} onClick={() => selectProductToLink(p)} className="w-full p-5 flex items-center justify-between hover:bg-primary transition-all border-b border-slate-800 group text-left">
                                  <div className="flex items-center gap-4">
                                     <div className="size-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-white font-black text-[10px]">SKU</div>
                                     <div><p className="text-[11px] font-black uppercase text-slate-200">{p.name}</p><p className="text-[9px] text-slate-500 uppercase">Ref: {p.sku} | Varejo: R$ {p.salePrice.toFixed(2)}</p></div>
                                  </div>
                                  <span className="material-symbols-outlined text-slate-500 group-hover:text-white">add_circle</span>
                               </button>
                             ))}
                          </div>
                        )}
                     </div>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                     <table className="w-full text-left">
                        <thead className="bg-[#101822] sticky top-0 z-10 border-b border-slate-800 shadow-sm">
                           <tr className="text-[10px] font-black uppercase text-slate-500">
                              <th className="px-8 py-5">Referência / Produto</th>
                              <th className="px-8 py-5 text-right">P1 (Varejo)</th>
                              <th className="px-8 py-5 text-right">P2 (Cartão)</th>
                              <th className="px-8 py-5 text-right">P3 (Revenda)</th>
                              <th className="px-8 py-5 text-right">Ação</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-[#0b1118]/50">
                           {tableItems.map(item => (
                             <tr key={item.id} className="hover:bg-slate-800/30 transition-all text-slate-300 font-bold group">
                                <td className="px-8 py-4 uppercase text-[11px]"><span className="text-primary font-mono mr-2">{item.product_sku}</span> {item.product_name}</td>
                                <td className="px-8 py-4 text-right tabular-nums text-emerald-400">R$ {Number(item.price_1).toFixed(2)}</td>
                                <td className="px-8 py-4 text-right tabular-nums text-primary">R$ {Number(item.price_2).toFixed(2)}</td>
                                <td className="px-8 py-4 text-right tabular-nums text-amber-400">R$ {Number(item.price_3).toFixed(2)}</td>
                                <td className="px-8 py-4 text-right">
                                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                      <button onClick={() => setEditingItem({id: item.id, productId: item.product_id, sku: item.product_sku, name: item.product_name, p1: item.price_1, p2: item.price_2, p3: item.price_3})} className="size-8 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all"><span className="material-symbols-outlined text-sm">edit</span></button>
                                      <button onClick={() => { if(confirm('Remover vínculo?')) { deletePriceTableItem(item.id); loadItems(selectedTable.id); } }} className="size-8 bg-rose-500/10 text-rose-500 rounded-lg flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><span className="material-symbols-outlined text-sm">delete</span></button>
                                   </div>
                                </td>
                             </tr>
                           ))}
                           {tableItems.length === 0 && <tr><td colSpan={5} className="py-20 text-center opacity-20 font-black uppercase text-[10px] tracking-[0.2em]">Aguardando inclusão de produtos</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </>
            )}
         </main>
      </div>

      {/* MODAL: CADASTRO/EDIÇÃO DE TABELA (ADICIONADO) */}
      {showTableModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
           <div className="bg-[#101822] w-full max-w-lg rounded-[3rem] shadow-2xl border border-slate-700 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-800 bg-primary text-white flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">Configurar Tabela</h3>
                 <button onClick={() => setShowTableModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <form onSubmit={handleSaveTable} className="p-10 space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Descrição da Tabela</label>
                    <input required value={tableForm.description} onChange={e => setTableForm({...tableForm, description: e.target.value})} placeholder="EX: TABELA BLACK FRIDAY" className="w-full h-14 bg-[#0b1118] border border-slate-800 rounded-2xl px-6 font-black text-sm uppercase text-white outline-none focus:border-primary" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Data Início</label>
                       <input type="date" required value={tableForm.startDate} onChange={e => setTableForm({...tableForm, startDate: e.target.value})} className="w-full h-12 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-black uppercase text-white" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Data Fim</label>
                       <input type="date" value={tableForm.endDate} onChange={e => setTableForm({...tableForm, endDate: e.target.value})} className="w-full h-12 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-black uppercase text-white" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tipo de Negócio</label>
                    <select value={tableForm.tableType} onChange={e => setTableForm({...tableForm, tableType: e.target.value as 'VAREJO' | 'ATACADO'})} className="w-full h-12 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-black uppercase text-white">
                       <option value="VAREJO">VAREJO / BALCÃO</option>
                       <option value="ATACADO">ATACADO / REVENDA</option>
                    </select>
                 </div>
                 <button type="submit" className="w-full h-16 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:bg-blue-600 active:scale-95">GRAVAR TABELA</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL: CONFIGURAÇÃO DE PREÇOS COM CALCULADORA */}
      {editingItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
           <div className="bg-[#101822] w-full max-w-2xl rounded-[4rem] shadow-2xl border border-slate-700 overflow-hidden animate-in zoom-in-95">
              <div className="p-10 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                 <div><h3 className="text-2xl font-black uppercase text-white tracking-tight">Precificação da Tabela</h3><p className="text-[10px] font-bold text-primary uppercase mt-1">Item: {editingItem.name}</p></div>
                 <button onClick={() => setEditingItem(null)} className="size-12 bg-slate-800 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
              </div>
              
              <div className="p-12 space-y-10">
                 <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-b border-slate-800 pb-4">Atalhos de Inteligência de Preço</p>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-3">
                          <p className="text-[9px] font-black text-emerald-500 uppercase px-2">Markup s/ Custo</p>
                          <div className="flex gap-1">
                             {[50, 100, 150].map(m => (
                               <button key={m} onClick={() => applyMarkup(m)} className="flex-1 py-2 bg-slate-800 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black transition-all">+{m}%</button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-3">
                          <p className="text-[9px] font-black text-primary uppercase px-2">Desconto s/ Varejo</p>
                          <div className="flex gap-1">
                             {[10, 20, 30].map(m => (
                               <button key={m} onClick={() => applyDiscount(m)} className="flex-1 py-2 bg-slate-800 hover:bg-primary text-white rounded-lg text-[9px] font-black transition-all">-{m}%</button>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PriceInput label="P1 (À VISTA)" value={editingItem.p1} onChange={v => setEditingItem({...editingItem, p1: v})} color="emerald" />
                    <PriceInput label="P2 (CARTÃO)" value={editingItem.p2} onChange={v => setEditingItem({...editingItem, p2: v})} color="primary" />
                    <PriceInput label="P3 (REVENDA)" value={editingItem.p3} onChange={v => setEditingItem({...editingItem, p3: v})} color="amber" />
                 </div>

                 <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <div className="text-slate-500">Referências de Cadastro:</div>
                    <div className="space-x-6">
                       <span className="text-rose-500">Custo: R$ {products.find(p => p.id === editingItem.productId)?.costPrice.toFixed(2)}</span>
                       <span className="text-white">Varejo: R$ {products.find(p => p.id === editingItem.productId)?.salePrice.toFixed(2)}</span>
                    </div>
                 </div>

                 <button onClick={handleSaveItem} className="w-full h-20 bg-emerald-500 text-slate-900 rounded-[2rem] font-black text-sm uppercase shadow-2xl transition-all active:scale-95 hover:bg-emerald-400">GRAVAR PREÇOS NA TABELA</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const PriceInput = ({ label, value, onChange, color }: any) => (
  <div className={`space-y-3 p-6 bg-slate-900/50 rounded-[2.5rem] border border-slate-800 group hover:border-${color}-500/50 transition-all`}>
     <label className={`text-[9px] font-black text-${color}-500 uppercase tracking-widest block text-center mb-1`}>{label}</label>
     <div className="relative">
        <input type="number" step="0.01" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} className={`w-full h-12 bg-[#0b1118] border-none rounded-xl text-center font-black text-lg text-${color}-400 outline-none`} />
     </div>
  </div>
);

export default PriceTableManagement;
