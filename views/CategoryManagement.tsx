
import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';

const CategoryManagement: React.FC = () => {
  const { categories, addCategory, deleteCategory, products } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    active: true
  });

  const filteredCategories = useMemo(() => {
    return categories.filter(c => 
      c.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [categories, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    await addCategory({
      id: editingId || `cat-${Date.now()}`,
      name: form.name.toUpperCase(),
      description: form.description.toUpperCase(),
      active: form.active
    });

    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', description: '', active: true });
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description || '',
      active: cat.active
    });
    setShowModal(true);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Gestão de Categorias</h2>
          <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-tight">Organize seu catálogo de produtos por grupos lógicos</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setForm({ name: '', description: '', active: true }); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined">add_circle</span>
          NOVA CATEGORIA
        </button>
      </div>

      <div className="bg-white dark:bg-[#101822] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
         <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Pesquisar categoria..."
              className="w-full h-12 bg-slate-50 dark:bg-[#0b1118] border-none rounded-2xl pl-12 pr-6 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-primary/20"
            />
         </div>
      </div>

      <div className="bg-white dark:bg-[#101822] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-slate-50 dark:bg-slate-800/50 border-b">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Produtos Vinculados</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
               {filteredCategories.map(cat => {
                 const count = products.filter(p => p.category === cat.name).length;
                 return (
                   <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                               <span className="material-symbols-outlined">category</span>
                            </div>
                            <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{cat.name}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase">{cat.description || 'SEM DESCRIÇÃO'}</td>
                      <td className="px-8 py-6 text-center">
                         <span className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-lg text-[10px] font-black text-slate-500 tabular-nums">
                            {count} ITENS
                         </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2">
                            <button onClick={() => handleEdit(cat)} className="size-9 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl flex items-center justify-center transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                            <button 
                              onClick={() => { if(confirm('Excluir esta categoria?')) deleteCategory(cat.id); }}
                              disabled={count > 0}
                              className="size-9 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center justify-center disabled:opacity-20"
                              title={count > 0 ? "Não é possível excluir categorias com produtos vinculados" : ""}
                            >
                               <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                         </div>
                      </td>
                   </tr>
                 );
               })}
            </tbody>
         </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-primary text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                 <button onClick={() => setShowModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nome da Categoria</label>
                    <input 
                      required 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                      placeholder="EX: ACESSÓRIOS APPLE"
                      className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 font-black text-sm uppercase"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Breve Descrição</label>
                    <textarea 
                      value={form.description} 
                      onChange={e => setForm({...form, description: e.target.value})}
                      className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-6 font-bold text-sm uppercase"
                    />
                 </div>
                 <button type="submit" className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                    {editingId ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
