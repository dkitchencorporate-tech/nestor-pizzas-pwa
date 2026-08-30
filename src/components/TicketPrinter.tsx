import React from 'react';
import { useI18nStore } from '../store/i18nStore';
import { formatAddress } from '../utils/addressUtils';

interface TicketPrinterProps {
  order: any;
}

export default function TicketPrinter({ order }: TicketPrinterProps) {
  const { t } = useI18nStore();
  if (!order) return null;

  const isDelivery = order.delivery_method === 'delivery';
  const isPickup = order.delivery_method === 'pickup';
  const isLocal = order.delivery_method === 'local';

  // Format date & time
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const formattedDate = orderDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = orderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // Payment method classification
  const isCash = order.payment_method === 'cash' || !order.payment_method;
  const isTpv = order.payment_method === 'tpv' || order.payment_method === 'physical' || order.payment_method === 'card_delivery';
  const isOnline = order.payment_method === 'online' || order.payment_method === 'sumup_online';

  return (
    <div id="ticket-printer-content" className="ticket-printer-container bg-white text-black font-mono p-2 text-xs leading-snug">
      
      {/* 1. CABECERA CORPORATIVA Y NÚMERO DE TICKET */}
      <div className="ticket-header text-center border-b-2 border-black pb-2 mb-2">
        <h1 className="text-2xl font-black uppercase tracking-tight">NÉSTOR PIZZAS</h1>
        <p className="text-[10px] font-bold text-gray-700">Masa Fresca Artesana &bull; Caniles (Granada)</p>
        <div className="border-y border-black py-0.5 my-1 font-bold text-sm">
          {formattedDate} &bull; {formattedTime}
        </div>
        <p className="text-base font-black uppercase tracking-wider">
          TICKET: #NP-{order.id ? order.id.slice(0, 8).toUpperCase() : '00000000'}
        </p>
      </div>

      {/* 2. CANAL DE SERVICIO DESTACADO */}
      <div className="mb-2 text-center">
        <div className="border-2 border-black p-1.5 font-black uppercase">
          {isLocal && (
            <div>
              <span className="text-xs block text-gray-700">SERVICIO EN SALA</span>
              <span className="text-xl block">{order.client_name || 'MESA LOCAL'}</span>
            </div>
          )}
          {isDelivery && (
            <div>
              <span className="text-lg block">🛵 REPARTO A DOMICILIO</span>
            </div>
          )}
          {isPickup && (
            <div>
              <span className="text-lg block">🛍️ PARA RECOGER EN LOCAL</span>
            </div>
          )}
        </div>

        {order.estimated_ready_at && (
          <div className="bg-black text-white py-1 px-2 font-black text-sm uppercase mt-1">
            HORA ESTIMADA: {new Date(order.estimated_ready_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} H
          </div>
        )}
      </div>

      {/* 3. DATOS DEL CLIENTE Y DIRECCIÓN */}
      <div className="ticket-client mb-3 border-b border-black pb-2 text-left">
        {!isLocal && (
          <>
            <p className="text-[10px] font-bold text-gray-600 uppercase">CLIENTE:</p>
            <p className="text-base font-black uppercase leading-tight">{order.client_name || 'Mostrador'}</p>
            {order.client_phone && (
              <p className="text-sm font-bold mt-0.5">📞 Teléfono: {order.client_phone}</p>
            )}
          </>
        )}

        {isDelivery && order.delivery_address && (
          <div className="mt-1.5 p-1.5 border-2 border-black font-bold text-sm bg-gray-50 leading-snug">
            <span className="text-[10px] block font-black text-gray-700 uppercase">DIRECCIÓN DE ENTREGA:</span>
            <span>{formatAddress(order.delivery_address as string)}</span>
          </div>
        )}
      </div>

      {/* 4. TABLA DETALLADA DE PRODUCTOS */}
      <div className="ticket-items mb-3 border-b-2 border-black pb-2">
        <table className="w-full text-left font-bold text-xs">
          <thead>
            <tr className="border-b border-black text-[10px] uppercase">
              <th className="w-2/12 pb-0.5">Cant.</th>
              <th className="w-7/12 pb-0.5">Artículo / Extras</th>
              <th className="w-3/12 pb-0.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item: any, index: number) => (
              <tr key={index} className="border-b border-dotted border-gray-400">
                <td className="py-2 text-base font-black align-top">{item.quantity}x</td>
                <td className="py-2 align-top">
                  <span className="uppercase block font-black text-sm">
                    {item.customization_details?.name || item.products?.name}
                    {item.is_new && <span className="ml-1 bg-black text-white px-1 text-[9px] uppercase inline-block">NUEVO</span>}
                    {item.is_old && <span className="ml-1 text-gray-500 italic text-[9px] uppercase inline-block">(Ya Pedido)</span>}
                  </span>
                  
                  {/* Extras / Toppings */}
                  {item.customization_details?.extras && Array.isArray(item.customization_details.extras) && item.customization_details.extras.length > 0 && (
                    <div className="text-[10px] font-normal text-gray-800 mt-0.5 space-y-0.5">
                      {item.customization_details.extras.map((e: any, eIdx: number) => (
                        <p key={eIdx}>+ {typeof e === 'string' ? e : e.name}</p>
                      ))}
                    </div>
                  )}

                  {/* Item Specific Cooking Note */}
                  {item.customization_details?.notes && (
                    <p className="text-[10px] font-bold text-black mt-0.5 italic">
                      &bull; NOTA: {item.customization_details.notes}
                    </p>
                  )}
                </td>
                <td className="py-2 text-right text-sm font-black align-top">
                  {(item.unit_price * item.quantity).toFixed(2)}€
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. NOTAS GLOBALES DE COCINA O REPARTO */}
      {order.notes && typeof order.notes === 'string' && order.notes.trim() && (
        <div className="my-2 p-1.5 border-2 border-black font-bold text-xs bg-gray-100">
          <p className="uppercase text-[9px] font-black mb-0.5">📝 NOTAS / INSTRUCCIONES:</p>
          <p className="text-sm leading-snug font-black">{order.notes}</p>
        </div>
      )}

      {/* 6. TOTALES Y FORMA DE COBRO */}
      <div className="ticket-total text-right mb-3">
        {order.discount_applied > 0 && (
          <>
            <p className="text-xs font-bold uppercase">
              Subtotal: {(order.total_amount + order.discount_applied).toFixed(2)}€
            </p>
            <p className="text-xs font-bold uppercase text-gray-700">
              Descuento Club VIP: -{order.discount_applied.toFixed(2)}€
            </p>
          </>
        )}

        <div className="border-t-2 border-black pt-1 mt-1">
          <p className="text-2xl font-black uppercase">
            TOTAL: {order.total_amount?.toFixed(2)}€
          </p>
        </div>

        {/* INSTRUCCIÓN DE COBRO EN CUADRO DESTACADO */}
        <div className="mt-2 p-1.5 border-2 border-black text-center font-black uppercase text-xs">
          {isCash && <span>💵 COBRAR EN EFECTIVO (LLEVAR CAMBIO)</span>}
          {isTpv && <span>💳 COBRAR CON DATÁFONO TPV</span>}
          {isOnline && <span>✅ PAGADO ONLINE POR APP (SUMUP)</span>}
        </div>
      </div>

      {/* 7. PIE DE TICKET Y CORTE */}
      <div className="ticket-footer text-center mt-4 pt-2 border-t border-black">
        <p className="text-[10px] font-bold uppercase text-gray-600">
          Sistema POS Enterprise &bull; Néstor Pizzas
        </p>
        <p className="text-sm font-black italic mt-0.5">¡Gracias por su confianza!</p>
      </div>
      
      {/* Margen para guillotina de corte térmico */}
      <div className="h-12"></div>
      <div className="text-center text-[9px] text-gray-400">--- CORTE DE TICKET ---</div>
    </div>
  );
}
