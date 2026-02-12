
import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { Transaction, UserRole, Customer, User } from '../types';

const SalesInquiry: React.FC = () => {
  const { transactions, users, establishments, cardOperators, cardBrands } = useApp();
  
  const [filter, setFilter] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [storeFilter, setStoreFilter] = useState('TODAS AS LOJAS');

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [viewingDetail, setViewingDetail] = useState<Transaction | null>(null);
  const [showPrintOptions, setShowPrintOptions] = useState<Transaction | null>(null);
  const [printFormat, setPrintFormat] = useState<'CUPOM' | 'A4'>('CUPOM');

  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);

  const sales = useMemo(() => {
    return transactions.filter(t => {
      const isSale = t.type === 'INCOME' && (t.category === 'Venda' || t.category === 'Serviço');
      const matchesStore = storeFilter === 'TODAS AS LOJAS' || t.store === storeFilter;
      const matchesDate = t.date >= startDate && t.date <= endDate;
      const matchesSearch = !filter || t.id.toLowerCase().includes(filter.toLowerCase()) || (t.client && t.client.toLowerCase().includes(filter.toLowerCase()));
      return isSale && matchesStore && matchesDate && matchesSearch;
    }).sort((a, b) => b.id.localeCompare(a.id));
  }, [transactions, filter, startDate, endDate, storeFilter]);

  const handlePrint = (sale: Transaction, format: 'CUPOM' | 'A4') => {
    setSelectedTransaction(sale);
    setPrintFormat(format);
    setShowPrintOptions(null);
    setTimeout(() => {
      window.print();
      setTimeout(() => setSelectedTransaction(null), 500);
    }, 200);
  };

  const clearFilters = () => {
    setFilter('');
    setStartDate(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setStoreFilter('TODAS AS LOJAS');
  };

  return (
    <div className="min-h-screen bg-[#0b1118] font-display text-[11px] flex flex-col relative overflow-hidden">
      
      {/* ÁREA DE IMPRESSÃO - FORMATO CUPOM (OCULTO NA TELA) */}
      <div id="print-area" className={`hidden print:block bg-white text-black font-mono leading-tight p-4 ${printFormat === 'CUPOM' ? 'w-[80mm]' : 'w-full'}`}>
        {selectedTransaction && (
          printFormat === 'CUPOM' ? (
            <div className="text-[11px]">
               <div className="text-center space-y-1 mb-4 border-b border-black pb-2">
                  <h2 className="text-sm font-black uppercase">{selectedTransaction.store}</h2>
                  <p className="font-black">*** REIMPRESSÃO DE CUPOM ***</p>
               </div>
               <div className="flex justify-between font-bold mb-2">
                  <span>DOC: {selectedTransaction.id.slice(-8)}</span>
                  <span>{selectedTransaction.date}</span>
               </div>
               <p className="uppercase mb-2">CLIENTE: {selectedTransaction.client || 'CONSUMIDOR FINAL'}</p>
               <div className="border-t border-b border-black py-1 mb-1 font-black flex justify-between uppercase text-[9px]">
                  <span className="w-8">QTD</span><span className="flex-1 px-2">DESCRIÇÃO</span><span className="w-16 text-right">TOTAL</span>
               </div>
               {selectedTransaction.items?.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-start uppercase mb-1">
                    <span className="w-8">{item.quantity}</span>
                    <span className="flex-1 px-2">{item.name}</span>
                    <span className="w-16 text-right">{(item.quantity * item.salePrice).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                 </div>
               ))}
               <div className="border-t border-black pt-2 mt-4 space-y-1 font-black text-right">
                  <p>SUBTOTAL: R$ {(selectedTransaction.value + (selectedTransaction.shippingValue || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  {selectedTransaction.shippingValue ? <p>FRETE (+): R$ {selectedTransaction.shippingValue.toLocaleString('pt-BR')}</p> : null}
                  <p className="text-sm">TOTAL GERAL: R$ {selectedTransaction.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  <p className="text-[10px] mt-2">PAGTO: {selectedTransaction.method}</p>
               </div>
            </div>
          ) : (
            /* FORMATO A4 */
            <div className="p-10 font-sans text-slate-900 border-2 border-slate-200">
               <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                  <div>
                    <h1 className="text-3xl font-black uppercase text-primary mb-1">{selectedTransaction.store}</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Documento de Venda Digital</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-black">VENDA Nº {selectedTransaction.id}</h2>
                    <p className="text-sm font-bold">Emissão: {selectedTransaction.date}</p>
                    <p className="text-xs text-primary font-black uppercase mt-1">{selectedTransaction.consignmentId ? 'Venda Consignada' : 'Venda Direta PDV'}</p>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-10 mb-10">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dados do Cliente</h4>
                    <p className="text-sm font-black uppercase">{selectedTransaction.client || 'CONSUMIDOR FINAL'}</p>
                    <p className="text-xs text-slate-500 mt-1">ID CLIENTE: {selectedTransaction.clientId || 'BALCAO'}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resumo Financeiro</h4>
                    <p className="text-sm font-black uppercase">Método: {selectedTransaction.method}</p>
                    <p className="text-xs text-slate-500 mt-1">Status: {selectedTransaction.status}</p>
                  </div>
               </div>

               <table className="w-full text-left mb-10 border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white"><th className="p-4 text-[10px] font-black uppercase">Ref/SKU</th><th className="p-4 text-[10px] font-black uppercase">Descrição do Produto</th><th className="p-4 text-center text-[10px] font-black uppercase">Qtd</th><th className="p-4 text-right text-[10px] font-black uppercase">Unitário</th><th className="p-4 text-right text-[10px] font-black uppercase">Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTransaction.items?.map((item, idx) => (
                      <tr key={idx} className="text-[11px] font-bold">
                        <td className="p-4 text-slate-400 font-mono">{item.sku}</td>
                        <td className="p-4 uppercase">{item.name}</td>
                        <td className="p-4 text-center">{item.quantity}</td>
                        <td className="p-4 text-right">R$ {item.salePrice.toLocaleString('pt-BR')}</td>
                        <td className="p-4 text-right font-black text-primary">R$ {(item.quantity * item.salePrice).toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>

               <div className="flex justify-end pt-8 border-t-2 border-slate-900">
                  <div className="w-72 space-y-3">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Subtotal Bruto</span><span>R$ {selectedTransaction.value.toLocaleString('pt-BR')}</span></div>
                    <div className="flex justify-between text-lg font-black text-slate-900 uppercase pt-2 border-t border-slate-100"><span>Total Líquido</span><span>R$ {selectedTransaction.value.toLocaleString('pt-BR')}</span></div>
                  </div>
               </div>

               <div className="mt-24 border-t border-slate-200 pt-8 text-center opacity-30">
                  <p className="text-[9px] font-black uppercase">Comprovante de Operação Interna • Tem Acessórios ERP Cloud</p>
               </div>
            </div>
          )
        )}
      </div>

      {/* HEADER AZUL ROYAL - CONFORME IMAGEM */}
      <header className="bg-primary p-4 flex items-center justify-between shadow-2xl shrink-0 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-2 rounded-lg">
             <span className="material-symbols-outlined text-3xl text-white">receipt_long</span>
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight leading-none text-white">Documentos de Vendas PDV</h1>
            <p className="text-[9px] font-bold text-white/70 mt-1 uppercase tracking-widest">Painel de Auditoria e Segunda Via</p>
          </div>
        </div>
      </header>

      {/* BARRA DE FILTROS - CONFORME IMAGEM */}
      <div className="p-6 bg-[#101822] border-b border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-6 items-end shadow-sm print:hidden">
         <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Data Inicial:</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-bold text-slate-300 outline-none focus:border-primary" />
         </div>
         <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Data Final:</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-bold text-slate-300 outline-none focus:border-primary" />
         </div>
         <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Unidade / Loja:</label>
            <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-black uppercase text-slate-300 outline-none focus:border-primary">
               <option>TODAS AS LOJAS</option>
               {establishments.map(est => <option key={est.id} value={est.name}>{est.name}</option>)}
            </select>
         </div>
         <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Pesquisa Rápida (ID ou Cliente):</label>
            <div className="relative">
               <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
               <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="DIGITE PARA BUSCAR..." className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl pl-10 pr-4 text-[10px] font-black uppercase text-slate-300 outline-none focus:border-primary placeholder:text-slate-700" />
            </div>
         </div>
         <button onClick={clearFilters} className="h-11 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            <span className="material-symbols-outlined text-sm">filter_alt_off</span> Limpar
         </button>
      </div>

      {/* TABELA - CONFORME IMAGEM */}
      <div className="flex-1 overflow-auto bg-[#0b1118] p-4 print:hidden custom-scrollbar">
        <div className="bg-[#101822] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-primary text-white sticky top-0 z-20">
              <tr className="text-[9px] font-black uppercase tracking-widest">
                <th className="px-4 py-4 text-center w-12"><span className="material-symbols-outlined text-sm">settings</span></th>
                <th className="px-4 py-4 w-24">Opções</th>
                <th className="px-4 py-4 w-24">ID</th>
                <th className="px-4 py-4 w-32">Loja</th>
                <th className="px-4 py-4 w-24">Vend.</th>
                <th className="px-4 py-4 w-32">Data de Emissão</th>
                <th className="px-4 py-4">Cliente</th>
                <th className="px-4 py-4 w-24 text-center">Qtd. Itens</th>
                <th className="px-4 py-4 w-32 text-right">Vr. Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sales.map((s, idx) => (
                <tr key={s.id} onClick={() => setViewingDetail(s)} className="hover:bg-slate-800/30 transition-all cursor-pointer text-slate-300 font-bold group">
                  <td className="px-4 py-4 text-center">
                     <div className={`size-2.5 rounded-full mx-auto ${s.consignmentId ? 'bg-amber-500' : 'bg-primary'} shadow-[0_0_10px_rgba(19,109,236,0.3)]`}></div>
                  </td>
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowPrintOptions(s)} className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-primary hover:bg-primary hover:text-white transition-all">
                       <span className="material-symbols-outlined text-sm">list</span>
                    </button>
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-500 text-[10px]">{s.id.slice(-6)}</td>
                  <td className="px-4 py-4 text-primary text-[10px] font-black truncate max-w-[120px]">{s.store}</td>
                  <td className="px-4 py-4 text-primary text-[10px] font-black uppercase truncate max-w-[80px]">
                    {users.find(u => u.id === s.vendorId)?.name || 'ADMIN'}
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-[10px]">{s.date}</td>
                  <td className="px-4 py-4 uppercase truncate max-w-[250px] text-white">{s.client || 'CONSUMIDOR FINAL'}</td>
                  <td className="px-4 py-4 text-center text-slate-400 tabular-nums">{s.items?.reduce((acc, i) => acc + i.quantity, 0).toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-black text-white tabular-nums text-sm">R$ {s.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={9} className="py-24 text-center opacity-20 font-black text-sm uppercase tracking-widest">Nenhum documento localizado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHES COM ITENS E DESCONTOS */}
      {viewingDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in print:hidden">
           <div className="bg-[#101822] w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl flex flex-col border border-slate-800">
              <div className="bg-primary p-6 text-white flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-2xl">description</span>
                    <h2 className="text-xl font-black uppercase">Documento ID: {viewingDetail.id}</h2>
                 </div>
                 <button onClick={() => setViewingDetail(null)} className="size-10 hover:bg-white/20 flex items-center justify-center rounded-xl transition-all"><span className="material-symbols-outlined text-2xl">close</span></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-800"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Loja/Unidade</p><p className="text-sm font-black text-white uppercase">{viewingDetail.store}</p></div>
                    <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-800"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Cliente</p><p className="text-sm font-black text-white uppercase truncate">{viewingDetail.client || 'CONSUMIDOR FINAL'}</p></div>
                    <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-800"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Data Venda</p><p className="text-sm font-black text-white uppercase">{viewingDetail.date}</p></div>
                    <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-800"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pagamento</p><p className="text-sm font-black text-emerald-500 uppercase">{viewingDetail.method}</p></div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
                       <span className="material-symbols-outlined text-sm">shopping_cart</span> Produtos Detalhados
                    </h3>
                    <table className="w-full text-left uppercase text-[10px] font-black border-separate border-spacing-y-2">
                       <thead>
                          <tr className="text-slate-600">
                             <th className="px-4 py-2">Item / Descrição</th>
                             <th className="px-4 py-2 text-center">Qtd</th>
                             <th className="px-4 py-2 text-right">Preço Base</th>
                             <th className="px-4 py-2 text-right text-rose-500">Desconto</th>
                             <th className="px-4 py-2 text-right text-primary">Total Líquido</th>
                          </tr>
                       </thead>
                       <tbody>
                          {viewingDetail.items?.map((item, idx) => (
                             <tr key={idx} className="bg-slate-800/20 group hover:bg-slate-800/50 transition-all rounded-2xl">
                                <td className="px-4 py-4 rounded-l-2xl">
                                   <p className="text-white text-xs leading-none mb-1">{item.name}</p>
                                   <p className="text-[9px] text-slate-500">SKU: {item.sku}</p>
                                </td>
                                <td className="px-4 py-4 text-center tabular-nums text-slate-300">{item.quantity}</td>
                                <td className="px-4 py-4 text-right tabular-nums text-slate-500">R$ {item.salePrice.toLocaleString('pt-BR')}</td>
                                <td className="px-4 py-4 text-right tabular-nums text-rose-600">R$ 0,00</td>
                                <td className="px-4 py-4 text-right font-black text-white tabular-nums rounded-r-2xl text-sm">R$ {(item.quantity * item.salePrice).toLocaleString('pt-BR')}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              <div className="p-10 border-t border-slate-800 flex justify-between items-center bg-[#0b1118]/50">
                 <div className="flex gap-4">
                    <button onClick={() => setShowPrintOptions(viewingDetail)} className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-all">
                       <span className="material-symbols-outlined text-lg">print</span> Reimprimir Documento
                    </button>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Consolidado</p>
                    <h3 className="text-4xl font-black text-white tabular-nums tracking-tighter">R$ {viewingDetail.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* SELETOR DE FORMATO DE IMPRESSÃO */}
      {showPrintOptions && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in">
           <div className="bg-[#101822] w-full max-w-md rounded-[3rem] shadow-2xl border border-slate-800 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-800 text-center">
                 <h3 className="text-xl font-black text-white uppercase tracking-tight">Formato de Impressão</h3>
                 <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Como deseja gerar este documento?</p>
              </div>
              <div className="p-10 grid grid-cols-1 gap-4">
                 <button onClick={() => handlePrint(showPrintOptions, 'CUPOM')} className="p-6 bg-slate-800 rounded-3xl border border-slate-700 flex items-center gap-6 group hover:border-primary transition-all">
                    <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all text-primary"><span className="material-symbols-outlined text-3xl">print</span></div>
                    <div className="text-left"><p className="text-sm font-black text-white uppercase">Cupom Térmico</p><p className="text-[9px] font-bold text-slate-500 uppercase">Ideal para impressoras de 80mm</p></div>
                 </button>
                 <button onClick={() => handlePrint(showPrintOptions, 'A4')} className="p-6 bg-slate-800 rounded-3xl border border-slate-700 flex items-center gap-6 group hover:border-primary transition-all">
                    <div className="size-16 bg-amber-500/10 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all text-amber-500"><span className="material-symbols-outlined text-3xl">picture_as_pdf</span></div>
                    <div className="text-left"><p className="text-sm font-black text-white uppercase">Relatório Papel A4</p><p className="text-[9px] font-bold text-slate-500 uppercase">Ideal para faturas e arquivos em PDF</p></div>
                 </button>
              </div>
              <button onClick={() => setShowPrintOptions(null)} className="w-full py-6 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors border-t border-slate-800">Fechar Seleção</button>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        @media print {
          body * { visibility: hidden !important; }
          #root { display: none !important; }
          #print-area, #print-area * { visibility: visible !important; display: block !important; }
          #print-area { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; border: none !important; background: white !important; color: black !important; }
          @page { size: auto; margin: 0mm; }
        }
      `}</style>
    </div>
  );
};

export default SalesInquiry;
