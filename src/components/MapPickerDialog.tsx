import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, MapPin, Check, Layers, Copy } from 'lucide-react';
import { toast } from 'sonner';

// Fix Leaflet default marker icon issue with bundlers
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface MapPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentAddress?: string;
    currentLocation?: { lat: number; lng: number };
    onSelectAddress: (address: string, lat?: number, lng?: number) => void;
    readOnly?: boolean;
}

export function MapPickerDialog({ open, onOpenChange, currentAddress, currentLocation, onSelectAddress, readOnly = false }: MapPickerDialogProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);

    const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
    const [selectedAddress, setSelectedAddress] = useState('');
    const [isReversing, setIsReversing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchingMap, setIsSearchingMap] = useState(false);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

    // Autocomplete state
    const [addressSuggestions, setAddressSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Debounced search for suggestions
    const fetchSuggestions = useCallback((query: string) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (query.length < 3) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=5&addressdetails=1`,
                    { headers: { 'Accept-Language': 'id' } }
                );
                const data = await res.json();
                setAddressSuggestions(data);
                setShowSuggestions(data.length > 0);
            } catch {
                setAddressSuggestions([]);
            }
        }, 500);
    }, []);

    // Default center: Indonesia
    const defaultCenter: [number, number] = [-6.2, 106.816];

    // Initialize map when dialog opens
    useEffect(() => {
        if (!open) return;

        let pollCount = 0;
        let invalidateInterval: ReturnType<typeof setInterval> | null = null;

        // Use an interval to wait for Radix UI to actually mount the DialogContent DOM
        const timer = setInterval(() => {
            if (!mapContainerRef.current) {
                pollCount++;
                if (pollCount > 20) clearInterval(timer); // give up after 2 seconds
                return;
            }

            // If we already have a map, stop polling
            if (mapRef.current) {
                clearInterval(timer);
                return;
            }

            clearInterval(timer); // stop polling, we have the ref now

            const map = L.map(mapContainerRef.current, {
                center: defaultCenter,
                zoom: 15,
                zoomControl: true,
            });

            // Use Google Maps Tiles (Indonesian locale)
            const tileLayer = L.tileLayer(
                mapType === 'satellite'
                    ? 'https://mt1.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}'
                    : 'https://mt1.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}',
                {
                    attribution: '© Google Maps',
                    maxZoom: 20,
                }
            ).addTo(map);
            tileLayerRef.current = tileLayer;

            // Click handler to place marker (only if not readonly)
            if (!readOnly) {
                map.on('click', (e: L.LeafletMouseEvent) => {
                    placeMarker(map, e.latlng.lat, e.latlng.lng);
                });
            }

            mapRef.current = map;

            // Radix UI animates using transform/opacity which doesn't trigger ResizeObserver.
            // Force invalidateSize repeatedly for the first 1 second to catch the end of the animation.
            let ticks = 0;
            invalidateInterval = setInterval(() => {
                if (mapRef.current) {
                    mapRef.current.invalidateSize();
                }
                ticks++;
                if (ticks > 10) {
                    if (invalidateInterval) clearInterval(invalidateInterval);
                }
            }, 100);

            // If we have a currentLocation, use that immediately and skip geocoding
            if (currentLocation?.lat && currentLocation?.lng) {
                const lat = Number(currentLocation.lat);
                const lng = Number(currentLocation.lng);
                map.setView([lat, lng], 16);
                placeMarker(map, lat, lng, true); // SKIP geocode override here!

                // If we also have currentAddress, pre-fill it without reverse geocoding which might overwrite it
                if (currentAddress && !readOnly) {
                    setSearchQuery(currentAddress);
                    setSelectedAddress(currentAddress);
                }
            }
            // else If we have a current address but no exact location, try to geocode it
            else if (currentAddress) {
                setSearchQuery(currentAddress);
                geocodeAndCenter(map, currentAddress);
            } else {
                // Try to get user's location
                navigator.geolocation?.getCurrentPosition(
                    (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        map.setView([lat, lng], 16);
                        placeMarker(map, lat, lng);
                        map.invalidateSize();
                    },
                    () => { /* ignore error, stay at default */ },
                    { timeout: 5000 }
                );
            }
        }, 100);

        return () => {
            clearInterval(timer);
            if (invalidateInterval) clearInterval(invalidateInterval);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update tile layer based on mapType state
    useEffect(() => {
        if (!tileLayerRef.current) return;
        const url = mapType === 'satellite'
            ? 'https://mt1.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}'
            : 'https://mt1.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}';
        tileLayerRef.current.setUrl(url);
    }, [mapType]);

    function placeMarker(map: L.Map, lat: number, lng: number, skipGeocode = false) {
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else {
            markerRef.current = L.marker([lat, lng], {
                icon: defaultIcon,
                draggable: !readOnly,
            }).addTo(map);

            // When marker is dragged
            if (!readOnly) {
                markerRef.current.on('dragend', () => {
                    const pos = markerRef.current?.getLatLng();
                    if (pos) {
                        setCoords({ lat: pos.lat, lng: pos.lng });
                        reverseGeocode(pos.lat, pos.lng);
                    }
                });
            }
        }

        if (!readOnly) {
            setCoords({ lat, lng });
            if (!skipGeocode) {
                reverseGeocode(lat, lng);
            }
        }
    };

    async function reverseGeocode(lat: number, lng: number) {
        setIsReversing(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                { headers: { 'Accept-Language': 'id' } }
            );
            const data = await res.json();
            if (data.display_name) {
                setSelectedAddress(data.display_name);
            }
        } catch {
            toast.error('Gagal mendapatkan alamat');
        } finally {
            setIsReversing(false);
        }
    };

    async function geocodeAndCenter(map: L.Map, query: string) {
        setIsSearchingMap(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=1`,
                { headers: { 'Accept-Language': 'id' } }
            );
            const data = await res.json();
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                map.setView([lat, lng], 16);
                placeMarker(map, lat, lng);
            } else {
                toast.error('Lokasi tidak ditemukan');
            }
        } catch {
            toast.error('Gagal mencari lokasi');
        } finally {
            setIsSearchingMap(false);
        }
    };

    function handleSearch() {
        if (!searchQuery.trim() || !mapRef.current) return;
        geocodeAndCenter(mapRef.current, searchQuery.trim());
    };

    function handleConfirm() {
        if (selectedAddress) {
            onSelectAddress(selectedAddress, coords?.lat, coords?.lng);
            onOpenChange(false);
            toast.success('Alamat berhasil dipilih');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl w-full rounded-none border-4 border-brand-black bg-brand-white p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-brand-orange p-3 border-b-4 border-brand-black shrink-0">
                    <DialogHeader>
                        <DialogTitle className="font-display font-black text-lg text-brand-black uppercase tracking-wider flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Pilih Titik Lokasi Toko
                        </DialogTitle>
                    </DialogHeader>
                </div>

                {/* Search Bar (Enabled in readonly mode too for visual exploration) */}
                <div className="p-3 border-b-2 border-brand-black bg-gray-50 flex flex-col gap-2 relative" ref={suggestionsRef}>
                    <div className="flex gap-2 w-full">
                        <Input
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                fetchSuggestions(e.target.value);
                            }}
                            onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Cari alamat atau nama tempat..."
                            className="border-2 border-brand-black rounded-none font-mono text-sm flex-1"
                        />
                        <Button
                            type="button"
                            onClick={handleSearch}
                            disabled={isSearchingMap}
                            className="bg-brand-black text-white rounded-none font-mono font-bold text-xs border-2 border-brand-black hover:bg-brand-orange hover:text-brand-black px-4"
                        >
                            {isSearchingMap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                    </div>
                    {/* Autocomplete Suggestions */}
                    {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute top-[3.5rem] left-3 right-3 z-50 bg-white border-2 border-brand-black shadow-[4px_4px_0px_0px_#000] max-h-48 overflow-y-auto">
                            {addressSuggestions.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-brand-orange/20 border-b border-gray-100 last:border-0 flex items-start gap-2 transition-colors"
                                    onClick={() => {
                                        setSearchQuery(s.display_name);
                                        setShowSuggestions(false);
                                        // Auto-pan the map to the selected suggestion
                                        if (mapRef.current) {
                                            const lat = parseFloat(s.lat);
                                            const lng = parseFloat(s.lon);
                                            mapRef.current.setView([lat, lng], 16);
                                            placeMarker(mapRef.current, lat, lng);
                                        }
                                    }}
                                >
                                    <MapPin className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                                    <span className="line-clamp-2">{s.display_name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {/* End Search Bar */}

                {/* Map Container */}
                <div className="relative w-full flex-1 min-h-[250px] z-10 flex flex-col">
                    <div
                        ref={mapContainerRef}
                        className="w-full flex-1 bg-gray-100 min-h-[250px]"
                        style={{ cursor: 'crosshair' }}
                    />

                    {/* Floating Map Controls */}
                    <div className="absolute top-3 right-3 z-[1000] drop-shadow-md">
                        <Button
                            type="button"
                            onClick={() => setMapType(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
                            className="bg-white text-brand-black border-2 border-brand-black hover:bg-gray-100 font-mono text-xs font-bold rounded-none h-10 px-3"
                        >
                            <Layers className="w-4 h-4 mr-2" />
                            {mapType === 'roadmap' ? 'Mode Satelit' : 'Mode Peta'}
                        </Button>
                    </div>
                </div>

                {/* Selected Address + Confirm */}
                <div className="p-3 border-t-4 border-brand-black bg-white shrink-0">
                    {readOnly ? (
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <p className="font-mono text-xs text-muted-foreground uppercase font-bold">Detail Alamat:</p>
                                <p className="font-mono text-sm font-bold text-brand-black">{currentAddress}</p>
                            </div>
                            <Button
                                type="button"
                                onClick={() => {
                                    if (currentAddress) {
                                        navigator.clipboard.writeText(currentAddress);
                                        toast.success('Alamat disalin!');
                                    }
                                }}
                                className="w-full bg-white text-brand-black border-2 border-brand-black rounded-none font-mono font-bold hover:bg-gray-100 shrink-0 mt-2"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                SALIN ALAMAT
                            </Button>
                            <a
                                href={currentLocation ? `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentAddress || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full bg-brand-orange text-white border-2 border-brand-black rounded-none font-mono font-bold hover:bg-orange-600 shrink-0 mt-2 items-center justify-center p-2 transition-colors"
                            >
                                <MapPin className="w-4 h-4 mr-2" />
                                BUKA DI GOOGLE MAPS
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {isReversing ? (
                                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Mencari alamat...
                                </div>
                            ) : selectedAddress ? (
                                <div className="space-y-1">
                                    <p className="font-mono text-xs text-muted-foreground uppercase font-bold">Alamat Terpilih (Bisa Diedit):</p>
                                    <Textarea
                                        value={selectedAddress}
                                        onChange={(e) => setSelectedAddress(e.target.value)}
                                        className="font-mono text-sm font-bold text-brand-black border-2 border-brand-black rounded-none min-h-[60px] resize-none"
                                    />
                                </div>
                            ) : (
                                <p className="font-mono text-sm text-muted-foreground italic">
                                    Belum ada titik yang dipilih
                                </p>
                            )}

                            <Button
                                type="button"
                                onClick={handleConfirm}
                                className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-mono font-bold hover:bg-brand-orange/80 shrink-0 mt-2"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                GUNAKAN ALAMAT INI
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
