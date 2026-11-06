import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

export interface UnifiedClient {
  id: string;
  full_name: string;
  phone: string;
  address: string | null;
  points: number;
  created_at: string;
  source: 'app' | 'kiosk' | 'unified';
  is_app: boolean;
  is_kiosk: boolean;
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
  const [clients, setClients] = useState<UnifiedClient[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'app' | 'kiosk' | 'unified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), type === 'error' ? 7000 : 3000);
  };

  const [editModal, setEditModal] = useState<{ isOpen: boolean; customer?: UnifiedClient }>({ isOpen: false });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const askConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  // Carga unificada de clientes: Kiosk Customers (Iavanza) + Profiles (App)
  const fetchAllClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const [kioskRes, profilesRes] = await Promise.all([
        supabase.from('kiosk_customers').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);

      if (kioskRes.error) throw kioskRes.error;

      const clientsMap = new Map<string, UnifiedClient>();

      // 1. Añadir usuarios registrados en la App (profiles)
      (profilesRes.data || []).forEach(p => {
        const cleanPhone = (p.phone || '').trim().replace(/[^0-9]/g, '');
        const key = cleanPhone && cleanPhone !== '000000000' ? cleanPhone : `profile-${p.id}`;
        clientsMap.set(key, {
          id: p.id,
          full_name: p.full_name || p.email?.split('@')[0] || 'Usuario App',
          phone: p.phone || 'Sin Teléfono',
          address: p.address || null,
          points: Number(p.points || 0),
          created_at: p.created_at || new Date().toISOString(),
          source: 'app',
          is_app: true,
          is_kiosk: false
        });
      });

      // 2. Cruzar con clientes de mostrador / Iavanza (kiosk_customers)
      (kioskRes.data || []).forEach(k => {
        const cleanPhone = (k.phone || '').trim().replace(/[^0-9]/g, '');
        const key = cleanPhone && cleanPhone !== '000000000' ? cleanPhone : `kiosk-${k.id}`;

        if (clientsMap.has(key)) {
          // Cliente Unificado (existe en ambos)
          const existing = clientsMap.get(key)!;
          existing.source = 'unified';
          existing.is_kiosk = true;
          if (!existing.address && k.address) {
            existing.address = k.address;
          }
          if (existing.full_name === 'Usuario App' && k.full_name) {
            existing.full_name = k.full_name;
          }
        } else {
          // Cliente exclusivo de mostrador
          clientsMap.set(key, {
            id: k.id,
            full_name: k.full_name || 'Cliente Mostrador',
            phone: k.phone,
            address: k.address || null,
            points: Number(k.points || 0),
            created_at: k.created_at,
            source: 'kiosk',
            is_app: false,
            is_kiosk: true
          });
        }
      });

      const list = Array.from(clientsMap.values());
      // Ordenar: primero unificados y app, luego por fecha
      list.sort((a, b) => {
        if (a.source === 'unified' && b.source !== 'unified') return -1;
        if (b.source === 'unified' && a.source !== 'unified') return 1;
        if (a.source === 'app' && b.source === 'kiosk') return -1;
        if (b.source === 'app' && a.source === 'kiosk') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setClients(list);
    } catch (error: any) {
      console.error('Error cargando directorio maestro de clientes:', error);
      showNotification(error.message || 'Error cargando clientes.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllClients();
  }, [fetchAllClients]);

  // Filtrado reactivo en caliente por tipo y término de búsqueda
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clients.filter(c => {
      // Filtro por pestaña
      if (filterType === 'app' && !c.is_app) return false;
      if (filterType === 'kiosk' && (c.source !== 'kiosk')) return false;
      if (filterType === 'unified' && c.source !== 'unified') return false;

      // Filtro por término
      if (!q) return true;
      const matchName = c.full_name.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchAddr = (c.address || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchAddr;
    });
  }, [clients, filterType, searchQuery]);

  const appCount = useMemo(() => clients.filter(c => c.is_app).length, [clients]);
  const kioskCount = useMemo(() => clients.filter(c => c.source === 'kiosk').length, [clients]);
  const unifiedCount = useMemo(() => clients.filter(c => c.source === 'unified').length, [clients]);

  const doDelete = async (customer: UnifiedClient) => {
    try {
      const { error } = await supabase.rpc('admin_delete_kiosk_customer', { p_id: customer.id });
      if (error) throw error;
      showNotification('Ficha de mostrador eliminada correctamente.', 'success');
      fetchAllClients();
    } catch (error: any) {
      console.error('Error eliminando cliente:', error);
      showNotification(error.message || 'Error al eliminar el cliente.', 'error');
    }
  };

  const deleteCustomer = (customer: UnifiedClient) => {
    askConfirm(
      'Eliminar ficha',
      `¿Eliminar a "${customer.full_name}" del listado de mostrador? Los pedidos históricos se conservan.`,
      () => doDelete(customer)
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 bg-[#0A0A0E] text-white">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-black uppercase tracking-wide">Directorio Maestro de Clientes 360°</h1>
            <span className="bg-green-500/20 text-green-400 border border-green-500/40 text-xs px-2.5 py-1 rounded-full font-bold font-mono">
              {clients.length} contactos
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Base integral unificada: clientes del TPV (Iavanza), usuarios registrados de la App y fidelización con puntos VIP.
          </p>
        </div>

        {/* Action Button: Difusión WhatsApp */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:scale-105"
          >
            <span className="text-lg">📲</span>
            <span>Difusión WhatsApp (4 Lotes)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-[#14141E] border border-zinc-800 rounded-2xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap ${filterType === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            Todos ({clients.length})
          </button>
          <button
            onClick={() => setFilterType('app')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${filterType === 'app' ? 'bg-green-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <span>📱</span> Solo App VIP ({appCount})
          </button>
          <button
            onClick={() => setFilterType('unified')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${filterType === 'unified' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <span>🔄</span> Unificados ({unifiedCount})
          </button>
          <button
            onClick={() => setFilterType('kiosk')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${filterType === 'kiosk' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <span>🏪</span> Mostrador ({kioskCount})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar nombre, teléfono, calle..."
            className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${notification.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {notification.message}
        </div>
      )}

      {/* Clients Table */}
      {isLoading ? (
        <div className="text-center py-20 text-zinc-500">
          <div className="inline-block animate-spin text-2xl mb-2">🔄</div>
          <p>Cargando directorio unificado de clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 bg-[#14141E] rounded-2xl border border-zinc-800 p-8">
          <p className="text-base font-bold text-zinc-400">Ningún cliente coincide con los filtros actuales.</p>
          <p className="text-xs text-zinc-500 mt-1">Prueba a limpiar el buscador o cambiar de pestaña.</p>
        </div>
      ) : (
        <div className="bg-[#14141E] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-400 uppercase text-xs tracking-wider bg-zinc-900/60">
                  <th className="px-4 py-3.5">Cliente</th>
                  <th className="px-4 py-3.5">Teléfono / WhatsApp</th>
                  <th className="px-4 py-3.5">Estado / Fidelización</th>
                  <th className="px-4 py-3.5">Dirección en Caniles</th>
                  <th className="px-4 py-3.5">Fecha</th>
                  <th className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredClients.map(c => {
                  const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
                  const hasValidPhone = cleanPhone.length >= 9;

                  return (
                    <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Name + Source Tag */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-base">{c.full_name}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {c.source === 'unified' && (
                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              🔄 UNIFICADO
                            </span>
                          )}
                          {c.source === 'app' && (
                            <span className="bg-green-500/20 text-green-400 border border-green-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              📱 APP VIP
                            </span>
                          )}
                          {c.source === 'kiosk' && (
                            <span className="bg-zinc-700/50 text-zinc-300 border border-zinc-600/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              🏪 MOSTRADOR
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone + WhatsApp Link */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="text-zinc-300">{c.phone}</div>
                        {hasValidPhone && (
                          <a
                            href={`https://wa.me/34${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 hover:underline mt-1 font-sans"
                          >
                            <span>💬 Abrir WhatsApp</span>
                          </a>
                        )}
                      </td>

                      {/* VIP Points */}
                      <td className="px-4 py-3.5">
                        {c.is_app ? (
                          <span className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-xl font-bold font-mono">
                            <span>⭐</span> {c.points} puntos VIP
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500 italic">Sin cuenta App</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="px-4 py-3.5 text-zinc-300 max-w-[260px] truncate" title={formatAddressLabel(c.address)}>
                        {formatAddressLabel(c.address) || <span className="text-zinc-600 italic">Sin dirección</span>}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-zinc-500 text-xs">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES') : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.is_kiosk && (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Difusión WhatsApp */}
      {isWhatsAppModalOpen && (
        <WhatsAppBroadcastModal
          clients={clients}
          onClose={() => setIsWhatsAppModalOpen(false)}
        />
      )}

      {/* Modal de Edición de Cliente de Mostrador */}
      {editModal.isOpen && editModal.customer && (
        <EditClientModal
          customer={editModal.customer}
          onClose={() => setEditModal({ isOpen: false })}
          onSuccess={() => {
            setEditModal({ isOpen: false });
            showNotification('Cliente actualizado correctamente.', 'success');
            fetchAllClients();
          }}
          onError={(message) => showNotification(message, 'error')}
        />
      )}

      {/* Confirm Modal */}
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

// Modal de Campaña y Segmentación WhatsApp (4 Lotes Nocturnos)
function WhatsAppBroadcastModal({ clients, onClose }: { clients: UnifiedClient[]; onClose: () => void }) {
  // Filtrar solo contactos con teléfono móvil español válido
  const validContacts = useMemo(() => {
    return clients
      .map(c => {
        const cleanDigits = (c.phone || '').replace(/[^0-9]/g, '');
        return {
          id: c.id,
          name: c.full_name || 'Cliente',
          firstName: (c.full_name || 'Cliente').split(' ')[0],
          phone: cleanDigits,
          formattedPhone: cleanDigits.startsWith('34') ? `+${cleanDigits}` : `+34${cleanDigits}`
        };
      })
      .filter(c => c.phone.length === 9 && (c.phone.startsWith('6') || c.phone.startsWith('7')));
  }, [clients]);

  // División en 4 lotes para servicio nocturno (19:30, 20:15, 21:00, 21:45)
  const batches = useMemo(() => {
    const size = 200;
    return [
      {
        id: 1,
        title: 'Lote 1 (19:30)',
        subtitle: 'Pre-Apertura Cena',
        contacts: validContacts.slice(0, size)
      },
      {
        id: 2,
        title: 'Lote 2 (20:15)',
        subtitle: 'Apertura Oficial en Vivo',
        contacts: validContacts.slice(size, size * 2)
      },
      {
        id: 3,
        title: 'Lote 3 (21:00)',
        subtitle: 'Pico de Demanda Cena',
        contacts: validContacts.slice(size * 2, size * 3)
      },
      {
        id: 4,
        title: 'Lote 4 (21:45)',
        subtitle: 'Última Tanda de Cena',
        contacts: validContacts.slice(size * 3)
      }
    ];
  }, [validContacts]);

  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Plantilla editable con selector listo para mañana
  const [messageTemplate, setMessageTemplate] = useState(
    `🍕 ¡Hola, [Nombre]! Te escribimos de NÉSTOR PIZZAS en Caniles.\n\n` +
    `¡Ya puedes pedir tus pizzas y comida favorita A DOMICILIO directamente desde tu móvil sin esperas! 🛵✨\n\n` +
    `👉 Haz tu pedido aquí: https://nestorpizzas.es?utm_source=whatsapp&utm_campaign=apertura_noche\n\n` +
    `🎁 ¡Además, en cada pedido acumulas PUNTOS VIP para canjear por pizzas y hamburguesas gratis!\n\n` +
    `Te esperamos en el horno. 🔥\nCalle Alcalde Felip, 9 — Caniles\nTel: +34 679 76 19 87\n\n` +
    `(Responde BAJA si no deseas recibir más avisos de Néstor Pizzas)`
  );

  const currentBatch = batches[activeBatchIndex];

  const handleCopyPhones = () => {
    const phoneList = currentBatch.contacts.map(c => c.formattedPhone).join('\n');
    navigator.clipboard.writeText(phoneList);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2500);
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Nombre;Telefono;Prefijo\n" + 
      currentBatch.contacts.map(c => `"${c.name}";"${c.formattedPhone}";"+34"`).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nestor_pizzas_whatsapp_lote_${currentBatch.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="h-1.5 bg-gradient-to-r from-green-500 via-emerald-400 to-green-600"></div>

        <div className="p-5 sm:p-6 border-b border-zinc-800 flex justify-between items-center bg-[#0E0E16]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xl">
              📲
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-white uppercase tracking-wider">
                Campaña de Difusión WhatsApp (4 Lotes Nocturnos)
              </h3>
              <p className="text-xs text-zinc-400">
                Segmentación anti-saturación adaptada a la apertura nocturna &bull; <strong className="text-green-400">{validContacts.length} teléfonos móviles listos</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white">✕</button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Lotes Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Selecciona el Lote de Envío:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {batches.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => setActiveBatchIndex(idx)}
                  className={`p-3 rounded-2xl border text-left transition-all ${activeBatchIndex === idx ? 'bg-green-500/20 border-green-500/50 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                >
                  <p className="font-bold text-sm text-white">{b.title}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{b.subtitle}</p>
                  <p className="text-xs font-mono font-bold text-green-400 mt-2">{b.contacts.length} contactos</p>
                </button>
              ))}
            </div>
          </div>

          {/* Message Template Editor & Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Texto del Mensaje (Editable para el momento del envío):
              </label>
              <textarea
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
                rows={10}
                className="w-full bg-[#1A1A24] border border-zinc-700/60 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-green-500 font-sans leading-relaxed resize-none custom-scrollbar"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5">
                💡 La etiqueta <code className="text-green-400">[Nombre]</code> se reemplaza automáticamente por el nombre de pila de cada cliente.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Vista Previa en WhatsApp (Ejemplo con el 1º contacto):
              </label>
              <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl p-4 text-sm text-[#e9edef] leading-relaxed shadow-inner">
                <div className="bg-[#005c4b] p-3.5 rounded-2xl rounded-tl-none shadow-md inline-block max-w-full whitespace-pre-wrap">
                  {messageTemplate.replace('[Nombre]', currentBatch.contacts[0]?.firstName || 'Carlos')}
                </div>
                <div className="text-right text-[10px] text-[#8696a0] mt-2 font-mono">
                  Entregado &bull; Néstor Pizzas Caniles
                </div>
              </div>
            </div>
          </div>

          {/* Contacts in Active Batch */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Contactos en {currentBatch.title} ({currentBatch.contacts.length}):
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyPhones}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all flex items-center gap-1.5"
                >
                  <span>📋</span> {copiedBatch ? '¡Copiados al portapapeles!' : 'Copiar Teléfonos'}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-bold text-white transition-all flex items-center gap-1.5"
                >
                  <span>📥</span> Exportar CSV
                </button>
              </div>
            </div>

            <div className="bg-[#1A1A24] border border-zinc-800/80 rounded-2xl p-3 max-h-48 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {currentBatch.contacts.slice(0, 60).map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                    <span className="font-medium text-white truncate max-w-[120px]">{c.name}</span>
                    <span className="font-mono text-zinc-400">{c.formattedPhone}</span>
                  </div>
                ))}
              </div>
              {currentBatch.contacts.length > 60 && (
                <p className="text-center text-xs text-zinc-500 mt-2">
                  ... y {currentBatch.contacts.length - 60} contactos más en este lote.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0E0E16] border-t border-zinc-800 flex justify-between items-center">
          <p className="text-xs text-zinc-400">
            Listo para usar mañana a partir de las <strong>19:30</strong> según el horario nocturno.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de Edición de Cliente de Mostrador
function EditClientModal({ customer, onClose, onSuccess, onError }: {
  customer: UnifiedClient;
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
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-black text-white uppercase">Editar Ficha de Cliente</h2>
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
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Calle o Avenida</label>
              <input type="text" value={street} onChange={e => setStreet(e.target.value)}
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Número</label>
              <input type="text" value={number} onChange={e => setNumber(e.target.value)}
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Código Postal</label>
            <input type="text" value={cp} onChange={e => setCp(e.target.value)}
              className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Notas (Piso, puerta, etc.)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Puerta verde, frente a la farmacia"
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
