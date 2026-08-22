import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MarketingCampaignModal } from './components/MarketingCampaignModal';
import { useI18nStore } from '../../store/i18nStore';

// Simple Modal for Order History
const OrderHistoryModal = ({ user, onClose, orders }: { user: any, onClose: () => void, orders: any[] }) => {
  if (!user) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#14141E] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wide">Historial de Pedidos</h3>
            <p className="text-zinc-400 text-sm mt-1">{user.full_name || 'Sin Nombre'} ({user.phone || 'Sin Teléfono'})</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {orders.length === 0 ? (
            <p className="text-zinc-500 text-center py-4">No hay pedidos registrados para este cliente.</p>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-[#0A0A0E] border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold">{new Date(order.created_at).toLocaleString('es-ES')}</p>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">{order.status} • {order.delivery_method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-green-500">{Number(order.total_amount).toFixed(2)}€</p>
                    <p className="text-xs text-zinc-400 mt-1">ID: {order.id.slice(0,8)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default function AdminAnalytics() {
  const { t } = useI18nStore();
  const [users, setUsers] = useState<any[]>([]);
  const [todaySales, setTodaySales] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
    fetchTodaySales();
  }, []);

  const fetchUsers = async () => {
    const { data: profilesData } = await supabase.from('profiles').select('*');
    const { data: kioskData } = await supabase.from('kiosk_customers').select('*');
    const { data: ordersData } = await supabase.from('orders').select('*');
    
    // Create a unified map of users by phone number
    const usersMap = new Map();

    // 1. Add Profiles
    (profilesData || []).forEach(p => {
      if (p.phone) usersMap.set(p.phone, { ...p, is_app: true, orderHistory: [] });
    });

    // 2. Add Kiosk Customers
    (kioskData || []).forEach(k => {
      if (k.phone) {
        if (!usersMap.has(k.phone)) {
          usersMap.set(k.phone, { ...k, points: k.points || 0, is_kiosk: true, orderHistory: [] });
        } else {
          // Merge kiosk flags
          usersMap.get(k.phone).is_kiosk = true;
        }
      }
    });

    // 3. Process Orders for ghost clients and order history
    (ordersData || []).forEach(order => {
      const phone = order.client_phone;
      if (phone && phone.trim() !== '' && phone !== 'Sin Teléfono' && phone !== 'unknown') {
        if (!usersMap.has(phone)) {
          // Ghost client from an order
          usersMap.set(phone, {
            id: 'ghost-' + order.id,
            full_name: order.client_name || 'Cliente Anónimo',
            phone: phone,
            points: 0,
            is_ghost: true,
            created_at: order.created_at,
            orderHistory: []
          });
        }
        // Attach order to the user's history
        usersMap.get(phone).orderHistory.push(order);
      } else if (order.user_id) {
        // Find user by id if phone is missing but id is linked
        const userByProfile = Array.from(usersMap.values()).find(u => u.id === order.user_id);
        if (userByProfile) {
          userByProfile.orderHistory.push(order);
        }
      }
    });
    
    const allUsers = Array.from(usersMap.values());
    
    // Ordenar pedidos internamente por fecha y usuarios por fecha
    allUsers.forEach(u => {
      u.orderHistory.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    
    allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setUsers(allUsers);
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

  const downloadCSV = () => {
    if (users.length === 0) {
      alert("No hay usuarios para exportar.");
      return;
    }

    // Professional headers
    const headers = [t('client_id'), t('name'), t('email'), t('phone'), t('points'), t('registration_date')];
    
    const rows = users.map(u => {
      const date = new Date(u.created_at).toLocaleDateString('es-ES');
      return `"${u.id.slice(0,8)}","${u.full_name || ''}","${u.email || ''}","${u.phone || ''}","${u.points || 0}","${date}"`;
    });

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    
    // Add date to filename
    const dateStr = new Date().toISOString().split('T')[0];
    a.setAttribute('download', `Nestor_Pizzas_Clientes_${dateStr}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0E] overflow-y-auto print:h-auto print:overflow-visible print:bg-white print:text-black">
      <div className="p-6 print:hidden">
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
          <div className="flex gap-2 relative">
            <button 
              onClick={() => setShowMarketingModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors shadow-lg"
            >
              📧 Enviar Publicidad (Resend)
            </button>
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)} 
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg text-xs transition-colors shadow-lg flex items-center gap-2"
            >
              📊 Exportar Base de Datos
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <button onClick={() => { downloadCSV(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-sm font-medium text-white border-b border-zinc-800">
                    📥 Descargar Excel (CSV)
                  </button>
                  <button onClick={() => { window.print(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-sm font-medium text-white">
                    🖨️ Imprimir Informe (PDF)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3">ID / Auth</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Puntos</th>
                <th className="px-4 py-3">Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr 
                  key={u.id} 
                  onClick={() => setSelectedUserForHistory(u)}
                  className="border-b border-zinc-800 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-[10px]">{u.id.slice(0,8)}...</td>
                  <td className="px-4 py-3 text-white font-bold">
                    {u.full_name || t('no_name')}
                    {u.is_kiosk && <span className="ml-2 text-[9px] bg-zinc-700 px-1 rounded uppercase text-zinc-300">Kiosko</span>}
                    {u.is_ghost && <span className="ml-2 text-[9px] bg-zinc-800 text-zinc-500 px-1 rounded uppercase">Fantasma</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{u.email || t('no_email')}</td>
                  <td className="px-4 py-3">{u.phone || t('no_phone')}</td>
                  <td className="px-4 py-3 text-green-400 font-bold">{u.points} pts</td>
                  <td className="px-4 py-3 text-xs flex justify-between items-center">
                    <span>{new Date(u.created_at).toLocaleDateString()}</span>
                    <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">{u.orderHistory?.length || 0} pedidos &rarr;</span>
                  </td>
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

      {/* Printable Report Section (Only visible when printing) */}
      <div className="hidden print:block p-8 bg-white text-black min-h-screen w-full">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-black uppercase mb-1">Néstor Pizzas</h1>
          <h2 className="text-xl text-gray-600 font-bold">Informe de Base de Datos de Clientes</h2>
          <p className="text-sm mt-2 text-gray-500">
            Generado: {new Date().toLocaleString('es-ES')}
          </p>
        </div>

        <div className="flex justify-between mb-8 gap-4">
          <div className="p-4 border border-gray-300 rounded-lg text-center w-[48%] bg-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Clientes Registrados</p>
            <p className="text-2xl font-black">{users.length}</p>
          </div>
          <div className="p-4 border border-gray-300 rounded-lg text-center w-[48%]">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Puntos en Circulación</p>
            <p className="text-2xl font-black text-green-700">
              {users.reduce((sum, u) => sum + (u.points || 0), 0)} pts
            </p>
          </div>
        </div>

        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-2">ID</th>
              <th className="py-2">Nombre Completo</th>
              <th className="py-2">Email</th>
              <th className="py-2">Teléfono</th>
              <th className="py-2">Puntos</th>
              <th className="py-2 text-right">Registro</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-200">
                <td className="py-2 font-mono text-xs text-gray-600">{u.id.slice(0,8)}</td>
                <td className="py-2 font-medium">{u.full_name || t('no_name')}</td>
                <td className="py-2 text-gray-600">{u.email || t('no_email')}</td>
                <td className="py-2">{u.phone || t('no_phone')}</td>
                <td className="py-2 font-bold text-green-700">{u.points || 0}</td>
                <td className="py-2 text-right text-xs">{new Date(u.created_at).toLocaleDateString('es-ES')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>Documento generado automáticamente por el TPV de Néstor Pizzas.</p>
          <p>Uso estrictamente confidencial para fines de marketing y gestión empresarial.</p>
        </div>
      </div>
      
      <MarketingCampaignModal 
        isOpen={showMarketingModal} 
        onClose={() => setShowMarketingModal(false)} 
        userCount={users.length} 
      />
      {selectedUserForHistory && (
        <OrderHistoryModal 
          user={selectedUserForHistory} 
          orders={selectedUserForHistory.orderHistory || []} 
          onClose={() => setSelectedUserForHistory(null)} 
        />
      )}
    </div>
  );
}
