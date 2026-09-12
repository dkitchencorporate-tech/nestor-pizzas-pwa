import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface KioskCustomerRow {
  id: string;
  full_name: string;
  phone: string;
  address: string | null;
  created_at: string;
}

function formatAddressLabel(address: string | null): string {
  if (!address) return '';
  try {
    const parsed = JSON.parse(address);
    if (parsed && typeof parsed === 'object') {
      const parts = [parsed.street, parsed.number ? `Nº ${parsed.number}` : '', parsed.cp, parsed.notes].filter(Boolean);
      return parts.join(', ');
    }
  } catch {
    // No era JSON, es texto plano (p.ej. "Local").
  }
  return address;
}

export default function AdminClients() {
  const [customers, setCustomers] = useState<KioskCustomerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), type === 'error' ? 7000 : 3000);
  };

  const [editModal, setEditModal] = useState<{ isOpen: boolean; customer?: KioskCustomerRow }>({ isOpen: false });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const askConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const fetchCustomers = useCallback(async (search: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_list_kiosk_customers', { p_search: search.trim() || null });
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error cargando clientes del TPV:', error);
      showNotification(error.message || 'Error cargando clientes.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers('');
  }, [fetchCustomers]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchCustomers(searchQuery), 350);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchCustomers]);

  const doDelete = async (customer: KioskCustomerRow) => {
    try {
      const { error } = await supabase.rpc('admin_delete_kiosk_customer', { p_id: customer.id });
      if (error) throw error;
      showNotification('Cliente eliminado correctamente.', 'success');
      fetchCustomers(searchQuery);
    } catch (error: any) {
      console.error('Error eliminando cliente:', error);
      showNotification(error.message || 'Error al eliminar el cliente.', 'error');
    }
  };

  const deleteCustomer = (customer: KioskCustomerRow) => {
    askConfirm(
      'Eliminar cliente',
      `¿Eliminar a "${customer.full_name}" del listado de clientes del TPV? Los pedidos que ya hizo se quedan intactos en el historial — esto solo borra su ficha de contacto.`,
      () => doDelete(customer)
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 bg-[#0A0A0E] text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-black uppercase tracking-wide">Gestión de Clientes (TPV)</h1>
          <p className="text-sm text-zinc-400 mt-1">Clientes registrados manualmente desde el Kiosco para pedidos por teléfono o en persona. Aquí puedes corregir o borrar fichas con errores.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono o dirección..."
            className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
      </div>

      {notification && (
        <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${notification.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {notification.message}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-zinc-500">Cargando clientes...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          {searchQuery ? 'Ningún cliente coincide con esa búsqueda.' : 'Todavía no hay clientes registrados desde el Kiosco.'}
        </div>
      ) : (
        <div className="bg-[#14141E] border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-500 uppercase text-xs tracking-wider">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Alta</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-bold text-white">{c.full_name}</td>
                    <td className="px-4 py-3 text-zinc-300 font-mono">{c.phone}</td>
                    <td className="px-4 py-3 text-zinc-400 max-w-[280px] truncate" title={formatAddressLabel(c.address)}>{formatAddressLabel(c.address) || '—'}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(c.created_at).toLocaleDateString('es-ES')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditModal({ isOpen: true, customer: c })}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteCustomer(c)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider transition-colors border border-red-500/30"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editModal.isOpen && editModal.customer && (
        <EditClientModal
          customer={editModal.customer}
          onClose={() => setEditModal({ isOpen: false })}
          onSuccess={() => {
            setEditModal({ isOpen: false });
            showNotification('Cliente actualizado correctamente.', 'success');
            fetchCustomers(searchQuery);
          }}
          onError={(message) => showNotification(message, 'error')}
        />
      )}

      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[4000] flex items-center justify-center p-4">
          <div className="bg-[#14141E] border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-fade-in">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </div>
              <h3 className="font-black text-white text-lg uppercase tracking-wide mb-2">{confirmModal.title}</h3>
              <p className="text-zinc-400 text-sm">{confirmModal.message}</p>
            </div>
            <div className="p-4 bg-zinc-900/50 flex gap-3 border-t border-zinc-800">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  action();
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl py-3 transition-colors shadow-lg shadow-red-600/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditClientModal({ customer, onClose, onSuccess, onError }: {
  customer: KioskCustomerRow;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  let initStreet = '', initNumber = '', initCP = '18810', initNotes = '';
  if (customer.address) {
    try {
      const parsed = JSON.parse(customer.address);
      if (parsed && typeof parsed === 'object') {
        initStreet = parsed.street || '';
        initNumber = parsed.number || '';
        initCP = parsed.cp || '18810';
        initNotes = parsed.notes || '';
      } else {
        initNotes = customer.address;
      }
    } catch {
      initNotes = customer.address;
    }
  }

  const [fullName, setFullName] = useState(customer.full_name);
  const [phone, setPhone] = useState(customer.phone);
  const [street, setStreet] = useState(initStreet);
  const [number, setNumber] = useState(initNumber);
  const [cp, setCp] = useState(initCP);
  const [notes, setNotes] = useState(initNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Nombre y teléfono son obligatorios.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const hasAddressData = street.trim() || number.trim() || notes.trim();
      const addressJson = hasAddressData
        ? JSON.stringify({ street, number, cp, notes })
        : null;

      const { error: rpcError } = await supabase.rpc('admin_update_kiosk_customer', {
        p_id: customer.id,
        p_full_name: fullName.trim(),
        p_phone: phone.trim(),
        p_address: addressJson
      });
      if (rpcError) throw rpcError;
      onSuccess();
    } catch (err: any) {
      console.error('Error actualizando cliente:', err);
      if (err.code === '23505') {
        setError('Ya existe otro cliente con ese teléfono.');
      } else {
        const message = err.message || 'Error al actualizar el cliente.';
        setError(message);
        onError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-black text-white uppercase">Editar Cliente</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700 text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Teléfono</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
              className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Calle o Avenida (Opcional)</label>
              <input type="text" value={street} onChange={e => setStreet(e.target.value)}
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Número (Opcional)</label>
              <input type="text" value={number} onChange={e => setNumber(e.target.value)}
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Código Postal (Opcional)</label>
            <input type="text" value={cp} onChange={e => setCp(e.target.value)}
              className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Notas (Piso, referencia...)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Piso 2A, Puerta azul"
              className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl font-bold bg-zinc-800 text-white hover:bg-zinc-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-4 rounded-2xl font-bold bg-green-500 text-black hover:bg-green-400 transition-colors disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
