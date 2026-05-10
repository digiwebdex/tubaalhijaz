import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, X, Building2, Bed, Trash2, Edit2, Save, ChevronDown, ChevronUp, Image as ImageIcon, Star, MapPin, Eye } from "lucide-react";
import HotelImageUpload from "@/components/admin/HotelImageUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import HotelGalleryManager from "@/components/admin/HotelGalleryManager";

interface Props {
  hotels: any[];
  onRefresh: () => void;
}

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const AdminHotelManager = ({ hotels, onRefresh }: Props) => {
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState<string | null>(null);
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Record<string, any[]>>({});
  const [editingHotel, setEditingHotel] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "hotel" | "room"; id: string; hotelId?: string } | null>(null);
  const [viewHotel, setViewHotel] = useState<any>(null);
  const [viewHotelRooms, setViewHotelRooms] = useState<any[]>([]);

  const emptyHotelForm = { name: "", location: "", city: "Makkah", description: "", star_rating: "5", distance_to_haram: "", image_url: "", amenities: "" };
  const emptyRoomForm = { name: "", description: "", capacity: "2", price_per_night: "", image_url: "", amenities: "" };

  const [hotelForm, setHotelForm] = useState(emptyHotelForm);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);

  const fetchRooms = async (hotelId: string) => {
    const { data } = await apiClient.from("hotel_rooms").select("*").eq("hotel_id", hotelId).order("price_per_night");
    setRooms((prev) => ({ ...prev, [hotelId]: data || [] }));
  };

  const toggleExpand = (hotelId: string) => {
    if (expandedHotel === hotelId) { setExpandedHotel(null); } else {
      setExpandedHotel(hotelId);
      if (!rooms[hotelId]) fetchRooms(hotelId);
    }
  };

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    const amenitiesArr = hotelForm.amenities.split(",").map((a) => a.trim()).filter(Boolean);
    const { error } = await apiClient.from("hotels").insert({
      name: hotelForm.name, location: hotelForm.location, city: hotelForm.city,
      description: hotelForm.description || null, star_rating: parseInt(hotelForm.star_rating),
      distance_to_haram: hotelForm.distance_to_haram || null, image_url: hotelForm.image_url || null,
      amenities: amenitiesArr,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Hotel added");
    setShowHotelForm(false);
    setHotelForm(emptyHotelForm);
    onRefresh();
  };

  const startEditHotel = (hotel: any) => {
    setEditingHotel(hotel.id);
    const amenities = Array.isArray(hotel.amenities) ? hotel.amenities.join(", ") : "";
    setHotelForm({
      name: hotel.name, location: hotel.location, city: hotel.city,
      description: hotel.description || "", star_rating: String(hotel.star_rating || 5),
      distance_to_haram: hotel.distance_to_haram || "", image_url: hotel.image_url || "",
      amenities,
    });
  };

  const saveEditHotel = async (hotelId: string) => {
    const amenitiesArr = hotelForm.amenities.split(",").map((a) => a.trim()).filter(Boolean);
    const { error } = await apiClient.from("hotels").update({
      name: hotelForm.name, location: hotelForm.location, city: hotelForm.city,
      description: hotelForm.description || null, star_rating: parseInt(hotelForm.star_rating),
      distance_to_haram: hotelForm.distance_to_haram || null, image_url: hotelForm.image_url || null,
      amenities: amenitiesArr,
    }).eq("id", hotelId);
    if (error) { toast.error(error.message); return; }
    toast.success("Hotel updated");
    setEditingHotel(null);
    setHotelForm(emptyHotelForm);
    onRefresh();
  };

  const handleCreateRoom = async (e: React.FormEvent, hotelId: string) => {
    e.preventDefault();
    const amenitiesArr = roomForm.amenities.split(",").map((a) => a.trim()).filter(Boolean);
    const { error } = await apiClient.from("hotel_rooms").insert({
      hotel_id: hotelId, name: roomForm.name, description: roomForm.description || null,
      capacity: parseInt(roomForm.capacity), price_per_night: parseFloat(roomForm.price_per_night),
      image_url: roomForm.image_url || null, amenities: amenitiesArr.length > 0 ? amenitiesArr : [],
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Room added");
    setShowRoomForm(null);
    setRoomForm(emptyRoomForm);
    fetchRooms(hotelId);
  };

  const startEditRoom = (room: any) => {
    setEditingRoom(room.id);
    const amenities = Array.isArray(room.amenities) ? room.amenities.join(", ") : "";
    setRoomForm({
      name: room.name, description: room.description || "", capacity: String(room.capacity),
      price_per_night: String(room.price_per_night), image_url: room.image_url || "", amenities,
    });
  };

  const saveEditRoom = async (roomId: string, hotelId: string) => {
    const amenitiesArr = roomForm.amenities.split(",").map((a) => a.trim()).filter(Boolean);
    const { error } = await apiClient.from("hotel_rooms").update({
      name: roomForm.name, description: roomForm.description || null,
      capacity: parseInt(roomForm.capacity), price_per_night: parseFloat(roomForm.price_per_night),
      image_url: roomForm.image_url || null, amenities: amenitiesArr.length > 0 ? amenitiesArr : [],
    }).eq("id", roomId);
    if (error) { toast.error(error.message); return; }
    toast.success("Room updated");
    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
    fetchRooms(hotelId);
  };

  const toggleHotelActive = async (hotel: any) => {
    const { error } = await apiClient.from("hotels").update({ is_active: !hotel.is_active }).eq("id", hotel.id);
    if (error) { toast.error(error.message); return; }
    toast.success(hotel.is_active ? "Hotel deactivated" : "Hotel activated");
    onRefresh();
  };

  const toggleRoomAvailable = async (room: any, hotelId: string) => {
    const { error } = await apiClient.from("hotel_rooms").update({ is_available: !room.is_available }).eq("id", room.id);
    if (error) { toast.error(error.message); return; }
    toast.success(room.is_available ? "Room marked unavailable" : "Room marked available");
    fetchRooms(hotelId);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "hotel") {
      const { error } = await apiClient.from("hotels").delete().eq("id", deleteConfirm.id);
      if (error) { toast.error(error.message); setDeleteConfirm(null); return; }
      toast.success("Hotel deleted");
      onRefresh();
    } else {
      const { error } = await apiClient.from("hotel_rooms").delete().eq("id", deleteConfirm.id);
      if (error) { toast.error(error.message); setDeleteConfirm(null); return; }
      toast.success("Room deleted");
      if (deleteConfirm.hotelId) fetchRooms(deleteConfirm.hotelId);
    }
    setDeleteConfirm(null);
  };

  const renderHotelForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <div className="bg-card border border-border rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <input className={inputClass} placeholder="Hotel Name *" required value={hotelForm.name} onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })} />
      <input className={inputClass} placeholder="Location (e.g. Near Haram) *" required value={hotelForm.location} onChange={(e) => setHotelForm({ ...hotelForm, location: e.target.value })} />
      <select className={inputClass} value={hotelForm.city} onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })}>
        <option value="Makkah">Makkah</option>
        <option value="Madinah">Madinah</option>
        <option value="Jeddah">Jeddah</option>
      </select>
      <select className={inputClass} value={hotelForm.star_rating} onChange={(e) => setHotelForm({ ...hotelForm, star_rating: e.target.value })}>
        {[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s} Star</option>)}
      </select>
      <input className={inputClass} placeholder="Distance to Haram (e.g. 200m)" value={hotelForm.distance_to_haram} onChange={(e) => setHotelForm({ ...hotelForm, distance_to_haram: e.target.value })} />
      <input className={`${inputClass}`} placeholder="Amenities (comma-separated: WiFi, Parking)" value={hotelForm.amenities} onChange={(e) => setHotelForm({ ...hotelForm, amenities: e.target.value })} />
      <div className="sm:col-span-2">
        <HotelImageUpload
          folder="hotels/covers"
          currentUrl={hotelForm.image_url || undefined}
          onUpload={(url) => setHotelForm({ ...hotelForm, image_url: url })}
          label="Upload Hotel Cover Image"
        />
      </div>
      <textarea className={`${inputClass} sm:col-span-2`} placeholder="Description" rows={2} value={hotelForm.description} onChange={(e) => setHotelForm({ ...hotelForm, description: e.target.value })} />
      <button type="button" onClick={onSubmit} className="bg-gradient-gold text-primary-foreground font-semibold py-2.5 rounded-md text-sm sm:col-span-2">{submitLabel}</button>
    </div>
  );

  const renderRoomForm = (hotelId: string, onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <div className="bg-secondary/50 rounded-lg p-4 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input className={inputClass} placeholder="Room Name *" required value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} placeholder="Capacity" type="number" min="1" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })} />
        <input className={inputClass} placeholder="Price/Night (BDT) *" type="number" required value={roomForm.price_per_night} onChange={(e) => setRoomForm({ ...roomForm, price_per_night: e.target.value })} />
      </div>
      <input className={inputClass} placeholder="Amenities (comma-separated: AC, TV, WiFi)" value={roomForm.amenities} onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })} />
      <input className={inputClass} placeholder="Description" value={roomForm.description} onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} />
      <div className="sm:col-span-2">
        <HotelImageUpload
          folder={`rooms/${hotelId}`}
          currentUrl={roomForm.image_url || undefined}
          onUpload={(url) => setRoomForm({ ...roomForm, image_url: url })}
          label="Upload Room Image"
        />
      </div>
      <button type="button" onClick={onSubmit} className="bg-gradient-gold text-primary-foreground font-semibold py-2 rounded-md text-xs sm:col-span-2">{submitLabel}</button>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading text-lg font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Hotels
        </h3>
        <button onClick={() => { setShowHotelForm(!showHotelForm); if (showHotelForm) setHotelForm(emptyHotelForm); }} className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2">
          {showHotelForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showHotelForm ? "Cancel" : "Add Hotel"}
        </button>
      </div>

      {showHotelForm && renderHotelForm(handleCreateHotel, "Create Hotel")}

      <div className="space-y-3">
        {hotels.map((hotel) => {
          const isEditing = editingHotel === hotel.id;
          const gallery: string[] = Array.isArray(hotel.gallery) ? hotel.gallery : [];

          return (
            <div key={hotel.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Hotel Header */}
              <div className="flex items-stretch">
                {/* Thumbnail */}
                {hotel.image_url && !isEditing && (
                  <div className="w-24 h-24 sm:w-32 sm:h-auto flex-shrink-0">
                    <img src={hotel.image_url} alt={hotel.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => { if (!isEditing) { setViewHotel(hotel); apiClient.from("hotel_rooms").select("*").eq("hotel_id", hotel.id).order("price_per_night").then(({ data }) => setViewHotelRooms(data || [])); } }}>
                  <div className="flex items-center gap-3">
                    {!hotel.image_url && <Building2 className="h-5 w-5 text-primary flex-shrink-0" />}
                    <div>
                      <p className="font-medium">{hotel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {hotel.city} • {"★".repeat(hotel.star_rating || 0)} • {hotel.distance_to_haram || "N/A"}
                      </p>
                      {Array.isArray(hotel.amenities) && hotel.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {hotel.amenities.slice(0, 4).map((a: string) => (
                            <span key={a} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded capitalize">{a}</span>
                          ))}
                          {hotel.amenities.length > 4 && <span className="text-[10px] text-muted-foreground">+{hotel.amenities.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); const openView = async () => { setViewHotel(hotel); const { data } = await apiClient.from("hotel_rooms").select("*").eq("hotel_id", hotel.id).order("price_per_night"); setViewHotelRooms(data || []); }; openView(); }} className="text-xs text-muted-foreground hover:text-primary p-1">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); startEditHotel(hotel); }} className="text-xs text-muted-foreground hover:text-primary p-1">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: "hotel", id: hotel.id }); }} className="text-xs text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleHotelActive(hotel); }}
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${hotel.is_active ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"}`}>
                      {hotel.is_active ? "Active" : "Inactive"}
                    </button>
                    {expandedHotel === hotel.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              {/* Edit Hotel Form */}
              {isEditing && (
                <div className="border-t border-border p-4">
                  {renderHotelForm((e) => { e.preventDefault(); saveEditHotel(hotel.id); }, "Save Changes")}
                  <button onClick={() => { setEditingHotel(null); setHotelForm(emptyHotelForm); }} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                </div>
              )}

              {/* Expanded: Gallery + Rooms */}
              {expandedHotel === hotel.id && !isEditing && (
                <div className="border-t border-border p-4 space-y-5">
                  {/* Gallery */}
                  <HotelGalleryManager hotelId={hotel.id} gallery={gallery} onUpdate={onRefresh} />

                  {/* Rooms */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <Bed className="h-4 w-4 text-primary" /> Rooms ({(rooms[hotel.id] || []).length})
                      </h4>
                      <button onClick={() => { setShowRoomForm(showRoomForm === hotel.id ? null : hotel.id); setRoomForm(emptyRoomForm); }} className="text-xs text-primary hover:underline flex items-center gap-1">
                        {showRoomForm === hotel.id ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {showRoomForm === hotel.id ? "Cancel" : "Add Room"}
                      </button>
                    </div>

                    {showRoomForm === hotel.id && editingRoom === null &&
                      renderRoomForm(hotel.id, (e) => handleCreateRoom(e, hotel.id), "Add Room")
                    }

                    {(rooms[hotel.id] || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No rooms added yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {(rooms[hotel.id] || []).map((room) => {
                          const isRoomEditing = editingRoom === room.id;
                          const roomAmenities: string[] = Array.isArray(room.amenities) ? room.amenities : [];

                          if (isRoomEditing) {
                            return (
                              <div key={room.id}>
                                {renderRoomForm(hotel.id, () => saveEditRoom(room.id, hotel.id), "Save Room")}
                                <button onClick={() => { setEditingRoom(null); setRoomForm(emptyRoomForm); }} className="text-xs text-muted-foreground hover:underline ml-1">Cancel</button>
                              </div>
                            );
                          }

                          return (
                            <div key={room.id} className="bg-secondary/30 rounded-lg overflow-hidden flex flex-col sm:flex-row">
                              {/* Room Image */}
                              {room.image_url ? (
                                <div className="sm:w-28 h-24 sm:h-auto flex-shrink-0">
                                  <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="sm:w-28 h-24 sm:h-auto flex-shrink-0 bg-secondary flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                                </div>
                              )}
                              {/* Room Details */}
                              <div className="p-3 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{room.name}</p>
                                  {room.description && <p className="text-xs text-muted-foreground truncate">{room.description}</p>}
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">👥 {room.capacity}</span>
                                    <span className="text-xs font-semibold text-primary">BDT {Number(room.price_per_night).toLocaleString("en-IN")}/night</span>
                                  </div>
                                  {roomAmenities.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {roomAmenities.map((a) => (
                                        <span key={a} className="text-[10px] bg-background px-1.5 py-0.5 rounded capitalize">{a}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button onClick={() => startEditRoom(room)} className="text-xs text-muted-foreground hover:text-primary p-1">
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => setDeleteConfirm({ type: "room", id: room.id, hotelId: hotel.id })} className="text-xs text-muted-foreground hover:text-destructive p-1">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => toggleRoomAvailable(room, hotel.id)}
                                    className={`text-xs px-2 py-1 rounded-full font-semibold ${room.is_available ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"}`}>
                                    {room.is_available ? "Available" : "Unavailable"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {hotels.length === 0 && <p className="text-center text-muted-foreground py-12">No hotels yet. Add your first hotel above.</p>}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-2">Delete {deleteConfirm.type === "hotel" ? "Hotel" : "Room"}?</h3>
            <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.{deleteConfirm.type === "hotel" ? " All rooms will also be deleted." : ""}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="text-sm px-4 py-2 rounded-md bg-secondary">Cancel</button>
              <button onClick={handleDelete} className="text-sm px-4 py-2 rounded-md bg-destructive text-destructive-foreground">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Hotel Detail View Dialog */}
      <Dialog open={!!viewHotel} onOpenChange={(o) => { if (!o) { setViewHotel(null); setViewHotelRooms([]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> {viewHotel?.name}
            </DialogTitle>
          </DialogHeader>
          {viewHotel && (
            <div className="space-y-4 text-sm">
              {viewHotel.image_url && (
                <img src={viewHotel.image_url} alt={viewHotel.name} className="w-full h-48 rounded-lg object-cover" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground text-xs block">City</span>
                  <span className="font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> {viewHotel.city}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Rating</span>
                  <span className="font-medium flex items-center gap-1"><Star className="h-3 w-3 text-primary" /> {"★".repeat(viewHotel.star_rating || 0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Location</span>
                  <span className="font-medium">{viewHotel.location}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Distance to Haram</span>
                  <span className="font-medium">{viewHotel.distance_to_haram || "—"}</span>
                </div>
                <div>
                   <span className="text-muted-foreground text-xs block">Status</span>
                  <span className={`font-medium ${viewHotel.is_active ? "text-emerald" : "text-destructive"}`}>
                    {viewHotel.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              {viewHotel.description && (
                <div><span className="text-muted-foreground text-xs block">Description</span><p>{viewHotel.description}</p></div>
              )}
              {Array.isArray(viewHotel.amenities) && viewHotel.amenities.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Amenities</span>
                  <div className="flex flex-wrap gap-1">
                    {viewHotel.amenities.map((a: string, i: number) => (
                      <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded capitalize">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(viewHotel.gallery) && viewHotel.gallery.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Gallery ({viewHotel.gallery.length})</span>
                  <div className="grid grid-cols-3 gap-2">
                    {viewHotel.gallery.slice(0, 6).map((url: string, i: number) => (
                      <img key={i} src={url} alt="" className="w-full h-20 rounded object-cover border border-border" />
                    ))}
                  </div>
                </div>
              )}
              {viewHotelRooms.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs block mb-2">Rooms ({viewHotelRooms.length})</span>
                  <div className="space-y-2">
                    {viewHotelRooms.map((room: any) => (
                      <div key={room.id} className="bg-secondary/30 rounded-lg p-3 flex items-center gap-3">
                        {room.image_url && <img src={room.image_url} alt={room.name} className="w-14 h-14 rounded object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{room.name}</p>
                          <p className="text-xs text-muted-foreground">Capacity: {room.capacity} guests • BDT {Number(room.price_per_night).toLocaleString("en-IN")}/night</p>
                          {Array.isArray(room.amenities) && room.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {room.amenities.map((a: string, i: number) => <span key={i} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">{a}</span>)}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${room.is_available ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"}`}>
                          {room.is_available ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHotelManager;
