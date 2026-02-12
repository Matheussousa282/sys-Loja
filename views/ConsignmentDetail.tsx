
import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { ConsignmentSale, ConsignmentStatus, ConsignmentReturn, TransactionStatus, Transaction } from '../types';

interface ConsignmentDetailProps {
  sale: ConsignmentSale;
  onBack: () => void;
}

const ConsignmentDetail: React.FC<ConsignmentDetailProps> = ({ sale, onBack }) => {
  const { addTransaction, updateConsignmentSale, addConsignmentReturn, currentUser, products, addProduct } = useApp();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  
  const [paymentValue, setPaymentValue] = useState(sale.balance);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  
  const [returnSearch, setReturnSearch] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('DEVOLUÇÃO DE CONSIGNADO');

  const filteredItemsForReturn = useMemo(() => {
    if (!returnSearch) return [];
    return sale.items.filter(i => 
      i.name.toLowerCase().includes(returnSearch.toLowerCase()) || 
      i.sku.toLowerCase().includes(returnSearch.toLowerCase())
    );
  }, [returnSearch, sale.items]);

  const handleProcessPayment = async () => {
    if (paymentValue <= 0 || paymentValue > sale.balance) { alert('Valor inválido!'); return; }

    try {
      const newPaid = sale.paidValue + paymentValue;
      const newBalance = sale.balance - paymentValue;
      const newStatus = newBalance <= 0 ? ConsignmentStatus.PAID : ConsignmentStatus.PARTIAL;

      // 1. Registrar transação financeira
      await addTransaction({
        id: `REC-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: `Recebimento Parcial Consignado #${sale.id.slice(-6)}`,
        store: sale.store,
        category: 'Venda',
        status: TransactionStatus.PAID,
        value: paymentValue,
        type: 'INCOME',
        method: paymentMethod,
        client: sale.customerName,
        clientId: sale.customerId,
        consignmentId: sale.id
      });

      // 2. Atualizar Consignado
      await updateConsignmentSale({
        ...sale,
        paidValue: newPaid,
        balance: newBalance,
        status: newStatus
      });

      alert('Pagamento recebido com sucesso!');
      setShowPaymentModal(false);
      onBack();
    } catch (e) { alert('Erro ao processar pagamento.'); }
  };

  const handleProcessReturn = async (item: any) => {
    if (returnQty < 0.001 || returnQty > item.quantity) { alert('Quantidade inválida para devolução!'); return; }

    try {
      const returnValue = (item.salePrice - (item.otherCostsPercent || 0)) * returnQty;
      const newBalance = sale.balance - returnValue;
      const newStatus = newBalance <= 0 ? ConsignmentStatus.PAID : sale.status;

      const ret: ConsignmentReturn = {
        id: `RET-${Date.now()}`,
        consignmentId: sale.id,
        productId: item.id,
        productName: item.name,
        quantity: returnQty,
        value: returnValue,
        date: new Date().toISOString().split('T')[0],
        reason: returnReason
      };

      // 1. Salvar Devolução e Retornar ao Estoque
      await addConsignmentReturn(ret);

      // 2. Atualizar Consignado (Abater valor e atualizar itens se necessário - aqui simplificamos abatendo saldo)
      await updateConsignmentSale({
        ...sale,
        balance: newBalance,
        status: newStatus
      });

      alert(`Devolução de ${returnQty} unidade(s) processada. R$ ${returnValue.toLocaleString('pt-BR')} abatidos do saldo.`);
      setShowReturnModal(false);
      onBack();
    } catch (e) { alert('Erro ao processar devolução.'); }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="size-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><span className="material-symbols-outlined">arrow_back</span></button>
           <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Detalhes do Consignado</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {sale.id} • Data: {sale.date}</p>
           </div>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setShowReturnModal(true)} className="px-8 py-4 bg-amber-500/10 text-amber-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2 shadow-sm"><span className="material-symbols-outlined text-lg">settings_backup_restore</span> Troca / Devolução</button>
           <button onClick={() => setShowPaymentModal(true)} disabled={sale.status === ConsignmentStatus.PAID} className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-30"><span className="material-symbols-outlined text-lg">payments</span> Receber Pagamento</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* COLUNA ESQUERDA: INFOS CLIENTE E STATUS */}
         <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 size-32 bg-primary/20 blur-3xl group-hover:bg-primary/40 transition-all"></div>
               <div className="relative z-10 space-y-6">
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente Solicitante</p>
                     <h3 className="text-2xl font-black uppercase leading-tight">{sale.customerName}</h3>
                  </div>
                  <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                     <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Status Atual</p><p className={`text-[11px] font-black uppercase mt-1 ${sale.status === ConsignmentStatus.PAID ? 'text-emerald-400' : 'text-amber-400'}`}>{sale.status}</p></div>
                     <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unidade</p><p className="text-[11px] font-black uppercase text-white mt-1">{sale.store}</p></div>
                  </div>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">Extrato da Conta</h4>
               <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase">Valor Bruto</span><span className="text-sm font-black tabular-nums">R$ {sale.grossValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-rose-500 uppercase">Desconto / Abatimento</span><span className="text-sm font-black tabular-nums text-rose-500">- R$ {sale.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-emerald-500 uppercase">Total Recebido</span><span className="text-sm font-black tabular-nums text-emerald-500">+ R$ {sale.paidValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline"><span className="text-sm font-black uppercase">Saldo Devedor</span><span className="text-3xl font-black text-rose-600 tabular-nums">R$ {sale.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
               </div>
            </div>
         </div>

         {/* COLUNA DIREITA: LISTA DE ITENS */}
         <div className="lg:col-span-8">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
               <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase tracking-tight">Itens da Venda</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full">{sale.items.length} PRODUTOS</span>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/20 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                           <th className="px-8 py-5">Item / SKU</th>
                           <th className="px-8 py-5 text-center">Qtd Inicial</th>
                           <th className="px-8 py-5 text-right">Vr Unitário</th>
                           <th className="px-8 py-5 text-right">Desc. Aplicado</th>
                           <th className="px-8 py-5 text-right">Subtotal Líquido</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sale.items.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                             <td className="px-8 py-4">
                                <p className="text-xs font-black uppercase text-slate-800 dark:text-white leading-none">{item.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">SKU: {item.sku}</p>
                             </td>
                             <td className="px-8 py-4 text-center font-black tabular-nums">{item.quantity} {item.unit}</td>
                             <td className="px-8 py-4 text-right font-bold text-xs tabular-nums text-slate-500">R$ {item.salePrice.toLocaleString('pt-BR')}</td>
                             <td className="px-8 py-4 text-right font-black text-xs tabular-nums text-rose-400">R$ {(item.otherCostsPercent || 0).toLocaleString('pt-BR')}</td>
                             <td className="px-8 py-4 text-right font-black text-sm tabular-nums text-primary">R$ {((item.salePrice - (item.otherCostsPercent || 0)) * item.quantity).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      </div>

      {/* MODAL PAGAMENTO */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-emerald-500 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Baixa de Saldo</h3>
                 <button onClick={() => setShowPaymentModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Saldo Restante para Quitar</p><p className="text-4xl font-black text-rose-500 tabular-nums">R$ {sale.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Valor Pago (R$)</label>
                       <input type="number" step="0.01" value={paymentValue} onChange={e => setPaymentValue(parseFloat(e.target.value) || 0)} className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-2xl font-black text-emerald-600 text-center shadow-inner" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       {['Dinheiro', 'Pix', 'Debito', 'Credito'].map(m => (
                         <button key={m} onClick={() => setPaymentMethod(m)} className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${paymentMethod === m ? 'border-primary bg-primary/5 text-primary shadow-lg' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>{m}</button>
                       ))}
                    </div>
                 </div>
                 <button onClick={handleProcessPayment} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">CONFIRMAR RECEBIMENTO</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DEVOLUÇÃO */}
      {showReturnModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-amber-500 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-3xl">settings_backup_restore</span>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Troca / Devolução de Consignado</h3>
                 </div>
                 <button onClick={() => setShowReturnModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <div className="p-10 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Pesquisar Produto no Consignado</p>
                    <input 
                      autoFocus
                      value={returnSearch}
                      onChange={e => setReturnSearch(e.target.value)}
                      placeholder="BIPE OU DIGITE O NOME DO PRODUTO..." 
                      className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-lg font-black uppercase shadow-inner" 
                    />
                 </div>

                 <div className="space-y-4">
                    {filteredItemsForReturn.map(item => (
                       <div key={item.id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-right-4">
                          <div className="flex-1">
                             <h4 className="text-lg font-black uppercase text-slate-800 dark:text-white leading-none">{item.name}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Disponível nesta venda: {item.quantity} {item.unit}</p>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase px-2">Qtd Devolver</label>
                                <input type="number" step="0.01" value={returnQty} onChange={e => setReturnQty(parseFloat(e.target.value) || 0)} className="w-24 h-11 bg-white dark:bg-slate-900 border-none rounded-xl px-4 text-center font-black" />
                             </div>
                             <button 
                               onClick={() => handleProcessReturn(item)}
                               className="h-11 px-6 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:scale-105 active:scale-95 transition-all"
                             >
                               Efetivar Devolução
                             </button>
                          </div>
                       </div>
                    ))}
                    {returnSearch && filteredItemsForReturn.length === 0 && (
                       <div className="py-20 text-center opacity-20 font-black text-xs uppercase tracking-widest">Produto não faz parte deste consignado</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default ConsignmentDetail;
