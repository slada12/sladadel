import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Plus, Eye, Package, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useShipmentsList, useCreateShipment } from '@/hooks/useShipments';
import { COUNTRIES, TRANSPORT_MODES, STATUS_CONFIG, CURRENCIES } from '@/types/shipment';
import type { TransportMode } from '@/types/shipment';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data: shipments = [], isLoading } = useShipmentsList();
  const createShipment = useCreateShipment();
  const [open, setOpen] = useState(false);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/admin" replace />;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      senderName: fd.get('senderName') as string,
      senderAddress: fd.get('senderAddress') as string,
      senderCountry: fd.get('senderCountry') as string,
      senderEmail: fd.get('senderEmail') as string || '',
      receiverName: fd.get('receiverName') as string,
      receiverAddress: fd.get('receiverAddress') as string,
      receiverCountry: fd.get('receiverCountry') as string,
      receiverEmail: fd.get('receiverEmail') as string || '',
      originCountry: fd.get('originCountry') as string || fd.get('senderCountry') as string,
      destinationCountry: fd.get('destinationCountry') as string || fd.get('receiverCountry') as string,
      transportMode: fd.get('transportMode') as TransportMode,
      estimatedDelivery: fd.get('estimatedDelivery') as string,
      shippingFee: parseFloat(fd.get('shippingFee') as string),
      currency: fd.get('currency') as string,
    };

    if (!data.senderName || !data.receiverName || !data.transportMode || !data.estimatedDelivery || !data.shippingFee || !data.currency) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const result = await createShipment.mutateAsync(data);
      toast.success(`Shipment created: ${result.trackingCode}`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create shipment');
    }
  };

  const countryOptions = Object.entries(COUNTRIES);

  return (
    <main className="container py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shipments</h1>
          <p className="text-muted-foreground">{shipments.length} total shipments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="accent"><Plus className="h-4 w-4 mr-2" /> Create Shipment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Shipment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sender</h3>
              <div className="grid grid-cols-1 gap-3">
                <div><Label>Name *</Label><Input name="senderName" required /></div>
                <div><Label>Email</Label><Input name="senderEmail" type="email" placeholder="sender@example.com" /></div>
                <div><Label>Address</Label><Input name="senderAddress" /></div>
                <div>
                  <Label>Country *</Label>
                  <Select name="senderCountry" required>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>{countryOptions.map(([c, n]) => <SelectItem key={c} value={c}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Receiver</h3>
              <div className="grid grid-cols-1 gap-3">
                <div><Label>Name *</Label><Input name="receiverName" required /></div>
                <div><Label>Email</Label><Input name="receiverEmail" type="email" placeholder="receiver@example.com" /></div>
                <div><Label>Address</Label><Input name="receiverAddress" /></div>
                <div>
                  <Label>Country *</Label>
                  <Select name="receiverCountry" required>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>{countryOptions.map(([c, n]) => <SelectItem key={c} value={c}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Shipping Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Origin *</Label>
                  <Select name="originCountry" required>
                    <SelectTrigger><SelectValue placeholder="Origin" /></SelectTrigger>
                    <SelectContent>{countryOptions.map(([c, n]) => <SelectItem key={c} value={c}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Destination *</Label>
                  <Select name="destinationCountry" required>
                    <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                    <SelectContent>{countryOptions.map(([c, n]) => <SelectItem key={c} value={c}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Transport Mode *</Label>
                <Select name="transportMode" required>
                  <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.icon} {m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
  <div>
    <Label>Est. Delivery *</Label>
    <Input type="date" name="estimatedDelivery" required />
  </div>

  <div>
    <Label>Currency *</Label>
    <Select name="currency" required>
      <SelectTrigger>
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(CURRENCIES).map(([code, currency]) => (
          <SelectItem key={code} value={code}>
            {code} ({currency.symbol})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  <div>
    <Label>Shipping Fee *</Label>
    <Input
      type="number"
      name="shippingFee"
      step="0.01"
      min="0"
      required
    />
  </div>
</div>
              <Button type="submit" variant="accent" className="w-full" disabled={createShipment.isPending}>
                {createShipment.isPending ? 'Creating...' : 'Create Shipment'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {shipments.map(s => {
            const cfg = STATUS_CONFIG[s.status];
            return (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono font-semibold text-foreground">{s.trackingCode}</p>
                        <p className="text-sm text-muted-foreground">
                          {COUNTRIES[s.originCountry]} → {COUNTRIES[s.destinationCountry]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={cfg.color as any}>{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {format(new Date(s.createdAt), 'MMM d, yyyy')}
                      </span>
                      <Link to={`/admin/shipment/${s.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {shipments.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No shipments yet. Create your first one!</p>
          )}
        </div>
      )}
    </main>
  );
}
