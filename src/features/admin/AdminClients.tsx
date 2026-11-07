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
    // No era JSON, es texto plano
  }
  return address;
}

export default function AdminClients() {
  const [clients, setClients] = useState<UnifiedClient[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'app' | 'kiosk' | 'unified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
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
      console.error('Error cargando directorio de clientes:', error);
      showNotification(error.message || 'Error cargando clientes.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllClients();
  }, [fetchAllClients]);

  const handleFilterChange = (type: 'all' | 'app' | 'kiosk' | 'unified') => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

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

  // Paginación reactiva
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedClients = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, safeCurrentPage, pageSize]);

  const doDelete = async (customer: UnifiedClient) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          action: 'delete',
          id: customer.id,
          phone: customer.phone,
          isApp: customer.is_app,
          isKiosk: customer.is_kiosk
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar el cliente.');
      showNotification('Cliente eliminado correctamente.', 'success');
      fetchAllClients();
    } catch (error: any) {
      console.error('Error eliminando cliente:', error);
      showNotification(error.message || 'Error al eliminar el cliente.', 'error');
    }
  };

  const deleteCustomer = (customer: UnifiedClient) => {
    askConfirm(
      'Eliminar cliente',
      `¿Deseas eliminar a "${customer.full_name}" del directorio de clientes? Los pedidos históricos se conservan por motivos fiscales.`,
      () => doDelete(customer)
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-[#0A0A0E] text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-display font-black uppercase tracking-wide">Directorio de Clientes</h1>
            <span className="bg-[#1C1C26] border border-[#262636] text-xs px-2.5 py-1 rounded-full font-mono text-zinc-300">
              {clients.length} contactos
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Base integral: clientes del mostrador TPV y usuarios registrados en la App.
          </p>
        </div>

        {/* Action Button: Solicitar Difusión WhatsApp */}
        <div>
          <button
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <span>📢</span>
            <span>Solicitar Difusión WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1 p-1 bg-[#14141C] border border-[#262636] rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors whitespace-nowrap ${filterType === 'all' ? 'bg-[#262636] text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Todos ({clients.length})
          </button>
          <button
            onClick={() => handleFilterChange('app')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors whitespace-nowrap ${filterType === 'app' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            App ({appCount})
          </button>
          <button
            onClick={() => handleFilterChange('unified')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors whitespace-nowrap ${filterType === 'unified' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Unificados ({unifiedCount})
          </button>
          <button
            onClick={() => handleFilterChange('kiosk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors whitespace-nowrap ${filterType === 'kiosk' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Mostrador ({kioskCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre, teléfono o calle..."
            className="w-full bg-[#14141C] border border-[#262636] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-green-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${notification.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {notification.message}
        </div>
      )}

      {/* Clients Table */}
      {isLoading ? (
        <div className="text-center py-20 text-zinc-500">
          <div className="inline-block animate-spin text-xl mb-2">🔄</div>
          <p className="text-xs">Cargando directorio de clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 bg-[#14141C] rounded-2xl border border-[#262636] p-6">
          <p className="text-sm font-semibold text-zinc-400">Ningún cliente coincide con los filtros actuales.</p>
          <p className="text-xs text-zinc-500 mt-1">Prueba a limpiar el buscador o cambiar de pestaña.</p>
        </div>
      ) : (
        <div className="bg-[#14141C] border border-[#262636] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#262636] text-left text-zinc-400 uppercase text-[11px] tracking-wider bg-[#0E0E16]">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Teléfono / WhatsApp</th>
                  <th className="px-4 py-3">Fidelización</th>
                  <th className="px-4 py-3">Dirección en Caniles</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262636]/60">
                {paginatedClients.map(c => {
                  const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
                  const hasValidPhone = cleanPhone.length >= 9;

                  return (
                    <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors">
                      {/* Name + Source Tag */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-white text-sm truncate max-w-[180px]">{c.full_name}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {c.source === 'unified' && (
                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                              Unificado
                            </span>
                          )}
                          {c.source === 'app' && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                              App
                            </span>
                          )}
                          {c.source === 'kiosk' && (
                            <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                              Mostrador
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone + WhatsApp Link */}
                      <td className="px-4 py-3 font-mono whitespace-nowrap">
                        <div className="text-zinc-300">
                          {c.phone && c.phone !== 'Sin Teléfono' ? c.phone : <span className="text-zinc-600 font-sans italic text-xs">Sin teléfono</span>}
                        </div>
                        {hasValidPhone && (
                          <a
                            href={`https://wa.me/34${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-green-400 hover:underline mt-0.5 font-sans"
                          >
                            <span>💬 WhatsApp</span>
                          </a>
                        )}
                      </td>

                      {/* Loyalty Points */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.is_app ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded font-mono font-bold">
                            {c.points} pts
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="px-4 py-3 text-zinc-300 max-w-[220px] truncate" title={formatAddressLabel(c.address)}>
                        {formatAddressLabel(c.address) || <span className="text-zinc-600 italic">Sin dirección</span>}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES') : '—'}
                      </td>

                      {/* Actions: Always available to edit! */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditModal({ isOpen: true, customer: c })}
                            className="px-2.5 py-1 rounded bg-[#1C1C26] hover:bg-[#262636] text-zinc-300 hover:text-white text-xs font-semibold border border-[#262636] transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteCustomer(c)}
                            className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-colors"
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {filteredClients.length > 0 && (
            <div className="p-3 bg-[#0E0E16] border-t border-[#262636] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
              <div className="flex items-center gap-3">
                <span>
                  Mostrando <strong className="text-white">{(safeCurrentPage - 1) * pageSize + 1}</strong> a <strong className="text-white">{Math.min(safeCurrentPage * pageSize, filteredClients.length)}</strong> de <strong className="text-white">{filteredClients.length}</strong> contactos
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-zinc-500">Filas:</span>
                  {[25, 50, 100].map(size => (
                    <button
                      key={size}
                      onClick={() => handlePageSizeChange(size)}
                      className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                        pageSize === size 
                          ? 'bg-green-600 text-white' 
                          : 'bg-[#1C1C26] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="px-2.5 py-1 rounded bg-[#1C1C26] hover:bg-[#262636] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  « Primera
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-2.5 py-1 rounded bg-[#1C1C26] hover:bg-[#262636] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹ Anterior
                </button>
                <span className="px-2 py-1 font-mono text-zinc-300 font-bold">
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-2.5 py-1 rounded bg-[#1C1C26] hover:bg-[#262636] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="px-2.5 py-1 rounded bg-[#1C1C26] hover:bg-[#262636] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Última »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Solicitud de Campaña WhatsApp (Meta Cloud API) */}
      {isWhatsAppModalOpen && (
        <WhatsAppCampaignRequestModal
          clients={clients}
          onClose={() => setIsWhatsAppModalOpen(false)}
          onSuccess={() => {
            setIsWhatsAppModalOpen(false);
            showNotification('¡Solicitud de difusión WhatsApp registrada correctamente!', 'success');
          }}
        />
      )}

      {/* Modal de Edición de Cliente (App / Mostrador / Unificado) */}
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
          <div className="bg-[#14141C] border border-[#262636] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-fade-in">
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </div>
              <h3 className="font-bold text-white text-base uppercase tracking-wide mb-1">{confirmModal.title}</h3>
              <p className="text-zinc-400 text-xs">{confirmModal.message}</p>
            </div>
            <div className="p-3 bg-[#0E0E16] flex gap-2 border-t border-[#262636]">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2 text-zinc-400 hover:text-white font-medium rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  action();
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl py-2 text-xs transition-colors"
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

// Modal de Solicitud de Difusión WhatsApp (Diseño sobrio y limpio PWA)
function WhatsAppCampaignRequestModal({ clients, onClose, onSuccess }: {
  clients: UnifiedClient[];
  onClose: () => void;
  onSuccess: () => void;
}) {
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

  const [campaignType, setCampaignType] = useState('apertura_domicilio');
  const [targetAudience, setTargetAudience] = useState('lote_1');
  const [preferredSchedule, setPreferredSchedule] = useState('horario_noche');
  const [messageIdea, setMessageIdea] = useState(
    `🍕 ¡Hola, [Nombre]! Te escribimos de NÉSTOR PIZZAS en Caniles.\n\n` +
    `¡Ya puedes pedir tus pizzas y comida favorita A DOMICILIO directamente desde tu móvil sin esperas! 🛵✨\n\n` +
    `👉 Haz tu pedido aquí: https://nestorpizzas.es?utm_source=whatsapp&utm_campaign=apertura_domicilio\n\n` +
    `🎁 ¡Además, en cada pedido acumulas PUNTOS para canjear por pizzas gratis!\n\n` +
    `Te esperamos en el horno. 🔥\nCalle Alcalde Felip, 9 — Caniles\nTel: +34 679 76 19 87\n\n` +
    `(Responde BAJA si no deseas recibir más avisos de Néstor Pizzas)`
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageIdea.trim()) {
      setErrorMsg('Por favor describe la propuesta o mensaje de la campaña.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/request-whatsapp-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          campaignType,
          targetAudience,
          preferredSchedule,
          messageIdea: messageIdea.trim(),
          clientName: 'Néstor Pizzas Gerencia'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo enviar la solicitud.');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error enviando solicitud de campaña:', err);
      setErrorMsg(err.message || 'Error de conexión al enviar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewFirstName = validContacts[0]?.firstName || 'Carlos';

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14141C] border border-[#262636] rounded-2xl w-full max-w-xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#262636] flex justify-between items-center bg-[#0F0F16]">
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-white uppercase tracking-wide">
              Campaña de Difusión WhatsApp
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {validContacts.length} teléfonos móviles disponibles en Caniles
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#1E1E28] text-zinc-400 hover:text-white transition-colors text-xs">
            ✕
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmitRequest} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Sutil aviso de tandas de cortesía */}
          <div className="bg-[#181822] border border-[#262636] rounded-xl p-3 text-zinc-400 leading-relaxed">
            <p className="text-zinc-300 font-medium">
              💡 Las 2 primeras difusiones (hasta 400 clientes, en 2 tandas de 200) están incluidas en la puesta en marcha.
            </p>
          </div>

          {/* Selectores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Objetivo:
              </label>
              <select
                value={campaignType}
                onChange={e => setCampaignType(e.target.value)}
                className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-green-500"
              >
                <option value="apertura_domicilio">Apertura Servicio a Domicilio</option>
                <option value="ofertas_combos">Oferta o Menú Especial</option>
                <option value="reactivacion">Reactivación de Clientes</option>
                <option value="evento_horario">Horario Especial / Festivos</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Audiencia Destino:
              </label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-green-500"
              >
                <option value="lote_1">Tanda 1 (Primeros 200 contactos)</option>
                <option value="lote_2">Tanda 2 (Siguientes 200 contactos)</option>
                <option value="todos">Todos los contactos ({validContacts.length})</option>
                <option value="vip">Clientes frecuentes (2+ pedidos)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Horario Preferido:
            </label>
            <select
              value={preferredSchedule}
              onChange={e => setPreferredSchedule(e.target.value)}
              className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-green-500"
            >
              <option value="horario_noche">🌙 Noche (19:30 a 22:00 en tandas)</option>
              <option value="horario_mediodia">☀️ Mediodía (12:30 a 14:00)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Propuesta de Mensaje:
            </label>
            <textarea
              value={messageIdea}
              onChange={e => setMessageIdea(e.target.value)}
              rows={5}
              className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl p-3 text-white text-xs focus:outline-none focus:border-green-500 font-sans leading-relaxed resize-none"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              La etiqueta <code className="text-zinc-400">[Nombre]</code> se reemplaza por el nombre de cada contacto.
            </p>
          </div>

          {/* Vista Previa WhatsApp discreta */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Vista Previa:
            </label>
            <div className="bg-[#0A0A0E] border border-[#262636] rounded-xl p-3 text-xs text-zinc-200">
              <div className="bg-[#1E2C24] border border-[#2B4034] p-3 rounded-xl rounded-tl-none inline-block max-w-full whitespace-pre-wrap text-[11px] leading-relaxed">
                {messageIdea.replace(/\[Nombre\]/g, previewFirstName)}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[#262636] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1E1E28] hover:bg-[#262636] text-zinc-300 rounded-xl font-medium text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Solicitar Difusión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de Edición de Cliente (Universal: App / Mostrador / Unificado)
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
  const [phone, setPhone] = useState(customer.phone === 'Sin Teléfono' ? '' : customer.phone);
  const [points, setPoints] = useState<number>(customer.points || 0);
  const [street, setStreet] = useState(initStreet);
  const [number, setNumber] = useState(initNumber);
  const [cp, setCp] = useState(initCP);
  const [notes, setNotes] = useState(initNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const hasAddressData = street.trim() || number.trim() || notes.trim();
      const addressJson = hasAddressData
        ? JSON.stringify({ street: street.trim(), number: number.trim(), cp: cp.trim(), notes: notes.trim() })
        : null;

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          action: 'update',
          id: customer.id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: addressJson,
          points: customer.is_app ? Number(points) : customer.points,
          source: customer.source,
          isApp: customer.is_app,
          isKiosk: customer.is_kiosk
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el cliente');

      onSuccess();
    } catch (err: any) {
      console.error('Error actualizando cliente:', err);
      const message = err.message || 'Error al actualizar el cliente.';
      setError(message);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14141C] border border-[#262636] rounded-2xl p-5 w-full max-w-md shadow-2xl overflow-y-auto max-h-[85vh] no-scrollbar">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#262636]">
          <div>
            <h2 className="text-base font-display font-bold text-white uppercase tracking-wide">Editar Cliente</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Origen: {customer.source === 'app' ? 'Registrado en App' : customer.source === 'unified' ? 'Unificado (App + Mostrador)' : 'Mostrador'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#1E1E28] text-zinc-400 hover:text-white transition-colors text-xs">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nombre</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-green-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Teléfono</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 612345678"
                className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-green-500" />
            </div>

            {customer.is_app ? (
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Puntos Fidelización</label>
                <input type="number" min="0" value={points} onChange={e => setPoints(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl px-3 py-2 text-amber-400 font-mono text-xs focus:outline-none focus:border-green-500" />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Puntos</label>
                <div className="w-full bg-[#0A0A0E] border border-[#262636]/60 rounded-xl px-3 py-2 text-zinc-600 text-xs italic">
                  Sin cuenta App
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Calle</label>
              <input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="Ej: Calle Real"
                className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nº</label>
              <input type="text" value={number} onChange={e => setNumber(e.target.value)} placeholder="12"
                className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-green-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cód. Postal</label>
              <input type="text" value={cp} onChange={e => setCp(e.target.value)}
                className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Piso / Notas</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="2º B"
                className="w-full bg-[#0A0A0E] border border-[#262636] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-green-500" />
            </div>
          </div>

          <div className="pt-3 border-t border-[#262636] flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl font-medium bg-[#1E1E28] text-zinc-300 hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl font-bold bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
