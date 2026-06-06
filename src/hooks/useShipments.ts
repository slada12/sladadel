import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Shipment, CreateShipmentData, TimelineEvent, PaymentRequest, Insurance } from '@/types/shipment';
import { generateTrackingCode, COUNTRY_COORDS, COUNTRIES } from '@/types/shipment';

// Map DB row to Shipment type
function mapShipment(row: any, timeline: any[], payments: any[], photos: any[]): Shipment {
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    status: row.status,
    currency: row.currency || 'USD',
    senderName: row.sender_name,
    senderAddress: row.sender_address || '',
    senderCountry: row.sender_country,
    senderEmail: row.sender_email || '',
    receiverName: row.receiver_name,
    receiverAddress: row.receiver_address || '',
    receiverCountry: row.receiver_country,
    receiverEmail: row.receiver_email || '',
    originCountry: row.origin_country,
    destinationCountry: row.destination_country,
    transportMode: row.transport_mode,
    estimatedDelivery: row.estimated_delivery,
    shippingFee: Number(row.shipping_fee),
    holdReason: row.hold_reason || undefined,
    currentLocation: row.current_lat != null ? {
      lat: Number(row.current_lat),
      lng: Number(row.current_lng),
      label: row.current_location_label || '',
      timestamp: row.current_location_timestamp || '',
    } : undefined,
    locationHistory: [],
    timeline: timeline.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      timestamp: t.timestamp,
      location: t.location || undefined,
    })),
    payments: payments.map(p => ({
      id: p.id,
      type: p.type,
      amount: Number(p.amount),
      paymentMethod: p.payment_method || 'crypto',
      cryptoCurrency: p.crypto_currency || undefined,
      walletAddress: p.wallet_address || undefined,
      paymentDetails: p.payment_details || undefined,
      expiresAt: p.expires_at,
      status: p.status,
      createdAt: p.created_at,
    })),
    photos: photos.map(ph => ({
      id: ph.id,
      photoUrl: ph.photo_url,
      caption: ph.caption || '',
      mediaType: (ph as any).media_type || 'photo',
      createdAt: ph.created_at,
    })),
    insurance: {
      status: row.insurance_status || 'none',
      fee: row.insurance_fee ? Number(row.insurance_fee) : undefined,
      requestedAt: row.insurance_requested_at || undefined,
    },
    departureDate: row.departure_date || undefined,
    deliveryNote: row.delivery_note || undefined,
    createdAt: row.created_at,
  };
}

export function useShipmentsList() {
  return useQuery({
    queryKey: ['shipments'],
    queryFn: async (): Promise<Shipment[]> => {
      const { data: rows, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = (rows || []).map(r => r.id);
      
      const [tlRes, payRes, photoRes] = await Promise.all([
        supabase.from('timeline_events').select('*').in('shipment_id', ids).order('timestamp', { ascending: true }),
        supabase.from('payments').select('*').in('shipment_id', ids).order('created_at', { ascending: true }),
        supabase.from('shipment_photos').select('*').in('shipment_id', ids).order('created_at', { ascending: true }),
      ]);

      const timelineMap = new Map<string, any[]>();
      (tlRes.data || []).forEach(t => {
        const arr = timelineMap.get(t.shipment_id) || [];
        arr.push(t);
        timelineMap.set(t.shipment_id, arr);
      });

      const paymentMap = new Map<string, any[]>();
      (payRes.data || []).forEach(p => {
        const arr = paymentMap.get(p.shipment_id) || [];
        arr.push(p);
        paymentMap.set(p.shipment_id, arr);
      });

      const photoMap = new Map<string, any[]>();
      (photoRes.data || []).forEach(ph => {
        const arr = photoMap.get(ph.shipment_id) || [];
        arr.push(ph);
        photoMap.set(ph.shipment_id, arr);
      });

      return (rows || []).map(r => mapShipment(r, timelineMap.get(r.id) || [], paymentMap.get(r.id) || [], photoMap.get(r.id) || []));
    },
  });
}

export function useShipmentByTracking(code: string) {
  return useQuery({
    queryKey: ['shipment', 'tracking', code],
    queryFn: async (): Promise<Shipment | null> => {
      const { data: row, error } = await supabase
        .from('shipments')
        .select('*')
        .ilike('tracking_code', code)
        .maybeSingle();
      if (error) throw error;
      if (!row) return null;

      const [tlRes, payRes, photoRes] = await Promise.all([
        supabase.from('timeline_events').select('*').eq('shipment_id', row.id).order('timestamp', { ascending: true }),
        supabase.from('payments').select('*').eq('shipment_id', row.id).order('created_at', { ascending: true }),
        supabase.from('shipment_photos').select('*').eq('shipment_id', row.id).order('created_at', { ascending: true }),
      ]);

      return mapShipment(row, tlRes.data || [], payRes.data || [], photoRes.data || []);
    },
    enabled: !!code,
  });
}

export function useShipmentById(id: string) {
  return useQuery({
    queryKey: ['shipment', id],
    queryFn: async (): Promise<Shipment | null> => {
      const { data: row, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!row) return null;

      const [tlRes, payRes, photoRes] = await Promise.all([
        supabase.from('timeline_events').select('*').eq('shipment_id', row.id).order('timestamp', { ascending: true }),
        supabase.from('payments').select('*').eq('shipment_id', row.id).order('created_at', { ascending: true }),
        supabase.from('shipment_photos').select('*').eq('shipment_id', row.id).order('created_at', { ascending: true }),
      ]);

      return mapShipment(row, tlRes.data || [], payRes.data || [], photoRes.data || []);
    },
    enabled: !!id,
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateShipmentData) => {
      const trackingCode = generateTrackingCode(data.originCountry, data.destinationCountry);
      const originCoords = COUNTRY_COORDS[data.originCountry];
      const originLabel = COUNTRIES[data.originCountry] || data.originCountry;
      const { data: row, error } = await supabase
        .from('shipments')
        .insert({
          tracking_code: trackingCode,
          sender_name: data.senderName,
          sender_address: data.senderAddress,
          sender_country: data.senderCountry,
          sender_email: data.senderEmail,
          receiver_name: data.receiverName,
          receiver_address: data.receiverAddress,
          receiver_country: data.receiverCountry,
          receiver_email: data.receiverEmail,
          origin_country: data.originCountry,
          destination_country: data.destinationCountry,
          transport_mode: data.transportMode,
          estimated_delivery: data.estimatedDelivery,
          shipping_fee: data.shippingFee,
          currency: data.currency,
          ...(originCoords ? {
            current_lat: originCoords.lat,
            current_lng: originCoords.lng,
            current_location_label: originLabel,
            current_location_timestamp: new Date().toISOString(),
          } : {}),
        })
        .select()
        .single();
      if (error) throw error;

      // Add initial timeline event
      await supabase.from('timeline_events').insert({
        shipment_id: row.id,
        title: 'Shipment Created',
        description: 'Package registered in the system',
      });

      // Send notification emails (fire-and-forget)
      if (data.senderEmail || data.receiverEmail) {
        supabase.functions.invoke('send-shipment-email', {
          body: {
            trackingCode,
            senderName: data.senderName,
            senderEmail: data.senderEmail,
            receiverName: data.receiverName,
            receiverEmail: data.receiverEmail,
            originCountry: data.originCountry,
            destinationCountry: data.destinationCountry,
            transportMode: data.transportMode,
            estimatedDelivery: data.estimatedDelivery,
            shippingFee: data.shippingFee,
            currency: data.currency,
          },
        }).catch(err => console.error('Email notification failed:', err));
      }

      return { trackingCode, id: row.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipments'] }),
  });
}

export function useUpdateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('shipments')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipment', vars.id] });
      qc.invalidateQueries({ queryKey: ['shipment', 'tracking'] });
    },
  });
}

export function useAddTimelineEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: { shipment_id: string; title: string; description: string; location?: string; timestamp?: string }) => {
      const { error } = await supabase.from('timeline_events').insert({
        shipment_id: event.shipment_id,
        title: event.title,
        description: event.description,
        location: event.location || null,
        timestamp: event.timestamp || new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipment'] });
    },
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: { shipment_id: string; type: string; amount: number; payment_method: string; crypto_currency?: string; wallet_address?: string; payment_details?: string; expires_at: string }) => {
      const { error } = await supabase.from('payments').insert({
        shipment_id: payment.shipment_id,
        type: payment.type,
        amount: payment.amount,
        payment_method: payment.payment_method,
        crypto_currency: payment.crypto_currency || null,
        wallet_address: payment.wallet_address || null,
        payment_details: payment.payment_details || null,
        expires_at: payment.expires_at,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipment'] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('payments').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipment'] });
    },
  });
}
