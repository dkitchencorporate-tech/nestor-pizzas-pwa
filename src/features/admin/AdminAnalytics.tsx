import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminAnalytics() {
  const [users, setUsers] = useState<any[]>([]);
  const [todaySales, setTodaySales] = useState(0);

  useEffect(() => {
    fetchUsers();
    fetchTodaySales();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
  };

  const fetchTodaySales = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', today.toISOString())
      .neq('status', 'cancelled');
      
    if (data) {
      const total = data.reduce((acc, order) => acc + Number(order.total_amount), 0);
      setTodaySales(total);
    }
  };

  const exportCSV = () => {
    if (users.length === 0) return;
    const header = Object.keys(users[0]).join(',') + '\n';
    const csv = users.map(u => Object.values(u).map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'usuarios_pwa.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <h2 className="text-2xl font-display font-black uppercase text-white tracking-wide mb-6">
        Analítica y <span className="text-green-500">Marketing</span>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#14141E] border border-zinc-800 rounded-2xl p-6">
          <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest mb-2">Ventas de Hoy</h3>
          <p className="text-4xl font-black text-white">{todaySales.toFixed(2)}€</p>
          <p className="text-xs text-green-500 mt-2">Calculado de órdenes no canceladas</p>
        </div>
        <div className="bg-[#14141E] border border-zinc-800 rounded-2xl p-6">
          <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest mb-2">Total Clientes BD</h3>
          <p className="text-4xl font-black text-white">{users.length}</p>
        </div>
      </div>

      <div className="bg-[#14141E] border border-zinc-800 rounded-2xl p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-white text-lg">Base de Datos de Clientes</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors">
              📧 Enviar Publicidad (Resend)
            </button>
            <button onClick={exportCSV} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg text-xs transition-colors">
              ⬇️ Exportar CSV para Gestoría
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3">ID / Auth</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Puntos</th>
                <th className="px-4 py-3">Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-zinc-800 hover:bg-zinc-800/20">
                  <td className="px-4 py-3 font-mono text-[10px]">{u.id.slice(0,8)}...</td>
                  <td className="px-4 py-3 text-white font-bold">{u.full_name || 'Sin nombre'}</td>
                  <td className="px-4 py-3">{u.phone || 'Sin teléfono'}</td>
                  <td className="px-4 py-3 text-green-400 font-bold">{u.points} pts</td>
                  <td className="px-4 py-3 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8">No hay usuarios registrados aún.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
