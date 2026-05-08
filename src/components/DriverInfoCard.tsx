import { Truck, Phone, MapPin, Clock, Car, StickyNote } from "lucide-react";

interface Props {
  driver_name?: string | null;
  driver_phone?: string | null;
  vehicle_number?: string | null;
  pickup_location?: string | null;
  pickup_time?: string | null;
  driver_notes?: string | null;
}

const fmtTime = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function DriverInfoCard(props: Props) {
  const hasAny =
    props.driver_name || props.driver_phone || props.vehicle_number ||
    props.pickup_location || props.pickup_time || props.driver_notes;
  if (!hasAny) return null;

  const pickupTime = fmtTime(props.pickup_time);

  return (
    <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Driver & Trip Details</h4>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        {props.driver_name && (
          <div className="flex items-start gap-2">
            <Truck className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Driver</p><p className="font-medium">{props.driver_name}</p></div>
          </div>
        )}
        {props.driver_phone && (
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Mobile</p>
              <a href={`tel:${props.driver_phone}`} className="font-medium text-primary hover:underline">{props.driver_phone}</a>
            </div>
          </div>
        )}
        {props.vehicle_number && (
          <div className="flex items-start gap-2">
            <Car className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Vehicle</p><p className="font-medium tabular-nums">{props.vehicle_number}</p></div>
          </div>
        )}
        {pickupTime && (
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Pickup Time</p><p className="font-medium">{pickupTime}</p></div>
          </div>
        )}
        {props.pickup_location && (
          <div className="flex items-start gap-2 sm:col-span-2">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Pickup Location</p><p className="font-medium">{props.pickup_location}</p></div>
          </div>
        )}
        {props.driver_notes && (
          <div className="flex items-start gap-2 sm:col-span-2">
            <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{props.driver_notes}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
