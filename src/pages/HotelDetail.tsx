import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Star, MapPin, Ruler, Users, Wifi, Car, UtensilsCrossed, Dumbbell, ArrowLeft, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import hotelFallback from "@/assets/hotel-makkah.jpg";
import roomFallback from "@/assets/hotel-room.jpg";
import { useLanguage } from "@/i18n/LanguageContext";

const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi, parking: Car, restaurant: UtensilsCrossed, gym: Dumbbell,
};

const HotelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [hotel, setHotel] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    apiClient.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    const { data: { subscription } } = apiClient.auth.onAuthStateChange((_, s) => setUser(s?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const [hotelRes, roomsRes] = await Promise.all([
        apiClient.from("hotels").select("*").eq("id", id).maybeSingle(),
        apiClient.from("hotel_rooms").select("*").eq("hotel_id", id).eq("is_available", true).order("price_per_night"),
      ]);
      setHotel(hotelRes.data);
      setRooms(roomsRes.data || []);
      setLoading(false);
    };
    if (id) fetch();
  }, [id]);

  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;
  const totalPrice = selectedRoom ? nights * Number(selectedRoom.price_per_night) : 0;

  const handleBook = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!selectedRoom || !checkIn || !checkOut || nights < 1) {
      toast.error(t("hotelDetail.selectDatesRoom"));
      return;
    }
    setBooking(true);
    const { error } = await apiClient.from("hotel_bookings").insert({
      user_id: user.id, hotel_id: hotel.id, room_id: selectedRoom.id,
      check_in: checkIn, check_out: checkOut, guests, total_price: totalPrice,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("hotelDetail.bookSuccess"));
      setSelectedRoom(null); setCheckIn(""); setCheckOut("");
    }
    setBooking(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center text-muted-foreground py-20">{t("common.loading")}</div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center py-20">
          <p className="text-muted-foreground mb-4">{t("hotelDetail.notFound")}</p>
          <button onClick={() => navigate("/hotels")} className="text-primary hover:underline">← {t("hotelDetail.backToHotels")}</button>
        </div>
      </div>
    );
  }

  const amenities: string[] = Array.isArray(hotel.amenities) ? hotel.amenities : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <button onClick={() => navigate("/hotels")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> {t("hotelDetail.backToHotels")}
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="rounded-xl overflow-hidden h-64 md:h-96 mb-6">
              <img src={hotel.image_url || hotelFallback} alt={hotel.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {Array.from({ length: hotel.star_rating || 0 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-primary fill-primary" />
                  ))}
                </div>
                <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">{hotel.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {hotel.location}, {hotel.city}</span>
                  {hotel.distance_to_haram && (
                    <span className="flex items-center gap-1"><Ruler className="h-4 w-4" /> {hotel.distance_to_haram} {t("hotelDetail.fromHaram")}</span>
                  )}
                </div>
              </div>
            </div>
            {hotel.description && (
              <p className="text-muted-foreground mt-4 max-w-3xl leading-relaxed">{hotel.description}</p>
            )}
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {amenities.map((a) => {
                  const Icon = AMENITY_ICONS[a.toLowerCase()] || Star;
                  return (
                    <span key={a} className="bg-secondary text-sm text-foreground/80 px-3 py-1.5 rounded-full flex items-center gap-1.5 capitalize">
                      <Icon className="h-3.5 w-3.5 text-primary" /> {a}
                    </span>
                  );
                })}
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="font-heading text-2xl font-bold mb-6">{t("hotelDetail.availableRooms")}</h2>
              {rooms.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">{t("hotelDetail.noRooms")}</p>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <motion.div key={room.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className={`bg-card border rounded-xl overflow-hidden flex flex-col sm:flex-row cursor-pointer transition-all ${
                        selectedRoom?.id === room.id ? "border-primary shadow-gold" : "border-border hover:border-primary/30"
                      }`}
                      onClick={() => setSelectedRoom(room)}>
                      <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0">
                        <img src={room.image_url || roomFallback} alt={room.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-heading text-lg font-semibold mb-1">{room.name}</h3>
                          {room.description && <p className="text-sm text-muted-foreground mb-2">{room.description}</p>}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" /> {t("hotelDetail.upToGuests").replace("{n}", room.capacity)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xl font-heading font-bold text-primary">
                            ৳{Number(room.price_per_night).toLocaleString("en-IN")}<span className="text-xs font-body text-muted-foreground font-normal"> {t("hotels.perNight")}</span>
                          </p>
                          {selectedRoom?.id === room.id && (
                            <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-1 rounded-full">{t("hotelDetail.selected")}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                <h3 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> {t("hotelDetail.bookHotel")}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("hotelDetail.checkIn")}</label>
                    <input type="date" className="w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={checkIn} min={new Date().toISOString().split("T")[0]} onChange={(e) => setCheckIn(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("hotelDetail.checkOut")}</label>
                    <input type="date" className="w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={checkOut} min={checkIn || new Date().toISOString().split("T")[0]} onChange={(e) => setCheckOut(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("hotelDetail.guests")}</label>
                    <input type="number" min={1} max={selectedRoom?.capacity || 10}
                      className="w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={guests} onChange={(e) => setGuests(parseInt(e.target.value) || 1)} />
                  </div>

                  {selectedRoom && nights > 0 && (
                    <div className="border-t border-border pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{selectedRoom.name}</span>
                        <span>৳{Number(selectedRoom.price_per_night).toLocaleString("en-IN")}{t("hotels.perNight")}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("hotelDetail.nights")}</span>
                        <span>{nights}</span>
                      </div>
                      <div className="flex justify-between font-heading font-bold text-lg border-t border-border pt-2 mt-2">
                        <span>{t("hotelDetail.total")}</span>
                        <span className="text-primary">৳{totalPrice.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}

                  <button onClick={handleBook} disabled={!selectedRoom || !checkIn || !checkOut || nights < 1 || booking}
                    className="w-full bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-md text-sm hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50">
                    {booking ? t("hotelDetail.booking") : !user ? t("hotelDetail.signInToBook") : t("hotelDetail.confirmBooking")}
                  </button>
                  {!selectedRoom && (
                    <p className="text-xs text-muted-foreground text-center">{t("hotelDetail.selectRoom")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HotelDetail;