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

  // Format date
  const orderDate = new Date(order.created_at);
  const formattedDate = orderDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = orderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div id="ticket-printer-content" className="ticket-printer-container bg-white text-black font-mono">
      <div className="ticket-header text-center">
        <h1 className="text-3xl font-black uppercase mb-1 tracking-tighter">NESTOR PIZZAS</h1>
        <p className="text-sm font-bold border-y-2 border-black py-1 my-2">
          {formattedDate} - {formattedTime}
        </p>
        
        <h2 className="text-2xl font-black border-b-2 border-black pb-2 mb-2 uppercase">
          {order.delivery_method === 'local' ? 'MESA / LOCAL' : (isDelivery ? t('ticket_delivery') : t('ticket_pickup'))}
        </h2>
        {order.estimated_ready_at && (
          <p className="text-xl font-black bg-black text-white py-1 uppercase mb-2">
            LISTO: {new Date(order.estimated_ready_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      <div className="ticket-client text-left mb-4">
        <p className="text-sm font-bold uppercase mb-1">{t('ticket_client')}</p>
        <p className="text-2xl font-black uppercase leading-none mb-1">{order.client_name || t('no_name')}</p>
        <p className="text-xl font-bold">{t('ticket_phone')} {order.client_phone}</p>
        {isDelivery && order.delivery_address && (
          <div className="mt-2 p-2 border-2 border-black font-bold text-xl leading-snug">
            {formatAddress(order.delivery_address as string)}
          </div>
        )}
      </div>

      <div className="ticket-items mb-4 border-t-2 border-black pt-2">
        <table className="w-full text-left font-bold text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="w-1/6 pb-1">{t('ticket_qty')}</th>
              <th className="w-4/6 pb-1">{t('ticket_item')}</th>
              <th className="w-1/6 pb-1 text-right">{t('ticket_euros')}</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item: any, index: number) => (
              <tr key={index} className="border-b border-dotted border-gray-400">
                <td className="py-3 text-xl">{item.quantity}x</td>
                <td className="py-3 text-lg leading-tight">
                  <span className="uppercase block font-black text-[15px]">{item.customization_details?.name || item.products?.name}</span>
                  {item.customization_details?.extras && Array.isArray(item.customization_details.extras) && item.customization_details.extras.length > 0 && (
                    <span className="text-sm font-normal text-gray-800 block italic mt-1">
                      {item.customization_details.extras.map((e: any) => `+ ${typeof e === 'string' ? e : e.name}`).join(', ')}
                    </span>
                  )}
                  {item.customization_details?.notes && (
                    <span className="text-sm font-bold text-gray-800 block mt-1">
                      NOTA: {item.customization_details.notes}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right text-lg">{(item.unit_price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ticket-total text-right mb-4">
        {order.discount_applied > 0 && (
          <p className="text-xl font-bold uppercase border-t-2 border-black pt-2 mb-1">
            {t('ticket_subtotal')} {(order.total_amount + order.discount_applied).toFixed(2)}€
          </p>
        )}
        {order.discount_applied > 0 && (
          <p className="text-lg font-bold uppercase mb-2">
            {t('ticket_vip_discount')} -{order.discount_applied.toFixed(2)}€
          </p>
        )}
        <p className={`text-3xl font-black uppercase ${order.discount_applied > 0 ? 'border-t-2 border-black border-dotted pt-2' : 'border-t-2 border-black pt-2'}`}>
          {t('ticket_total')} {order.total_amount?.toFixed(2)}€
        </p>
      </div>

      <div className="ticket-footer text-center mt-8">
        <p className="font-bold text-xs uppercase mb-1 text-gray-600">{t('ticket_order_id')}{order.id.slice(0, 8)}</p>
        <p className="text-lg font-black italic border-t-2 border-black pt-2">{t('ticket_thanks')}</p>
      </div>
      
      {/* Spacer for paper cut mechanism to trigger properly */}
      <div className="h-16"></div>
      <div className="text-center text-[10px] text-gray-400">{t('ticket_end')}</div>
    </div>
  );
}
