import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, ZoomIn, ZoomOut, Locate, Search, Move, Disc } from 'lucide-react';

interface AdminOfficeMapPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  officeName: string;
  onLocationChange: (lat: number, lng: number) => void;
  onRadiusChange: (radius: number) => void;
}

const TILE_LAYERS = {
  satellite: {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
    maxZoom: 20,
  },
  streets: {
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
};

export const AdminOfficeMapPicker: React.FC<AdminOfficeMapPickerProps> = ({
  latitude,
  longitude,
  radiusMeters,
  officeName,
  onLocationChange,
  onRadiusChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const officeMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const radiusHandleMarkerRef = useRef<L.Marker | null>(null);

  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite'); // Default to satellite as requested!
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  // Helper to compute a point at offset distance east of [lat, lng]
  const getRadiusHandleLatLng = (centerLat: number, centerLng: number, radius: number): [number, number] => {
    // 1 degree latitude ~ 111,320m
    // 1 degree longitude ~ 111,320m * cos(lat)
    const earthRadius = 6378137;
    const dLng = (radius / (earthRadius * Math.cos((Math.PI * centerLat) / 180))) * (180 / Math.PI);
    return [centerLat, centerLng + dLng];
  };

  // Helper to compute distance in meters between two LatLngs
  const computeDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 18,
      zoomControl: false,
    });

    const activeConfig = mapType === 'satellite' ? TILE_LAYERS.satellite : TILE_LAYERS.streets;
    const tileLayer = L.tileLayer(activeConfig.url, {
      attribution: activeConfig.attribution,
      maxZoom: activeConfig.maxZoom,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Draggable Office Pin Icon
    const officeIcon = L.divIcon({
      className: 'admin-office-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: grab;">
          <div style="background: #10B981; color: #022c22; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(0,0,0,0.6); border: 2px solid white; white-space: nowrap; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
            <span>🏢</span> <span>${officeName || 'Lokasi Pejabat'}</span>
          </div>
          <div style="width: 28px; height: 28px; background: #10B981; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 16px rgba(16,185,129,0.9); display: flex; align-items: center; justify-content: center;">
            <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
          </div>
          <div style="width: 3px; height: 8px; background: white; border-radius: 2px;"></div>
        </div>
      `,
      iconSize: [0, 0],
    });

    // Create Draggable Office Marker
    const marker = L.marker([latitude, longitude], {
      draggable: true,
      icon: officeIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    officeMarkerRef.current = marker;

    // When marker is dragged
    marker.on('drag', (e: any) => {
      const newPos = e.target.getLatLng();
      onLocationChange(parseFloat(newPos.lat.toFixed(6)), parseFloat(newPos.lng.toFixed(6)));

      // Update circle & handle position in sync
      if (radiusCircleRef.current) {
        radiusCircleRef.current.setLatLng(newPos);
      }
      if (radiusHandleMarkerRef.current) {
        const handlePos = getRadiusHandleLatLng(newPos.lat, newPos.lng, radiusMeters);
        radiusHandleMarkerRef.current.setLatLng(handlePos);
      }
    });

    // Click anywhere on map to reposition office pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onLocationChange(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));

      if (radiusCircleRef.current) {
        radiusCircleRef.current.setLatLng([lat, lng]);
      }
      if (radiusHandleMarkerRef.current) {
        const handlePos = getRadiusHandleLatLng(lat, lng, radiusMeters);
        radiusHandleMarkerRef.current.setLatLng(handlePos);
      }
    });

    // Create Geofence Circle
    const circle = L.circle([latitude, longitude], {
      radius: radiusMeters,
      color: '#10B981',
      fillColor: 'rgba(16, 185, 129, 0.22)',
      fillOpacity: 0.25,
      weight: 2.5,
      dashArray: '6, 6',
    }).addTo(map);

    radiusCircleRef.current = circle;

    // Draggable Handle Icon for Resizing Radius
    const handleIcon = L.divIcon({
      className: 'admin-radius-handle',
      html: `
        <div style="position: relative; transform: translate(-50%, -50%); cursor: ew-resize;" title="Seret untuk besarkan/kecilkan radius">
          <div style="background: #F59E0B; color: #1E293B; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); white-space: nowrap; margin-bottom: 2px; text-align: center;">
            ⇄ ${radiusMeters}m
          </div>
          <div style="width: 22px; height: 22px; background: #F59E0B; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 12px rgba(245,158,11,0.9); display: flex; align-items: center; justify-content: center; margin: 0 auto;">
            <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
          </div>
        </div>
      `,
      iconSize: [0, 0],
    });

    const handleLatLng = getRadiusHandleLatLng(latitude, longitude, radiusMeters);
    const handleMarker = L.marker(handleLatLng, {
      draggable: true,
      icon: handleIcon,
      zIndexOffset: 1200,
    }).addTo(map);

    radiusHandleMarkerRef.current = handleMarker;

    // Handle Radius Dragging
    handleMarker.on('drag', (e: any) => {
      const handlePos = e.target.getLatLng();
      const centerPos = officeMarkerRef.current ? officeMarkerRef.current.getLatLng() : L.latLng(latitude, longitude);
      const newRadius = computeDistanceMeters(centerPos.lat, centerPos.lng, handlePos.lat, handlePos.lng);
      const clampedRadius = Math.max(15, Math.min(2000, newRadius));

      if (radiusCircleRef.current) {
        radiusCircleRef.current.setRadius(clampedRadius);
      }
      onRadiusChange(clampedRadius);
    });

    handleMarker.on('dragend', () => {
      // Re-align handle smoothly to the east edge of the circle
      const centerPos = officeMarkerRef.current ? officeMarkerRef.current.getLatLng() : L.latLng(latitude, longitude);
      const alignedPos = getRadiusHandleLatLng(centerPos.lat, centerPos.lng, radiusMeters);
      handleMarker.setLatLng(alignedPos);
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer on type switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = mapType === 'satellite' ? TILE_LAYERS.satellite : TILE_LAYERS.streets;
    const newTile = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    tileLayerRef.current = newTile;
  }, [mapType]);

  // Sync Office Marker & Circle when external state changes
  useEffect(() => {
    if (officeMarkerRef.current) {
      officeMarkerRef.current.setLatLng([latitude, longitude]);
    }
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([latitude, longitude]);
      radiusCircleRef.current.setRadius(radiusMeters);
    }
    if (radiusHandleMarkerRef.current) {
      const handlePos = getRadiusHandleLatLng(latitude, longitude, radiusMeters);
      radiusHandleMarkerRef.current.setLatLng(handlePos);

      // Update handle icon label
      const updatedHandleIcon = L.divIcon({
        className: 'admin-radius-handle',
        html: `
          <div style="position: relative; transform: translate(-50%, -50%); cursor: ew-resize;" title="Seret untuk besarkan/kecilkan radius">
            <div style="background: #F59E0B; color: #1E293B; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); white-space: nowrap; margin-bottom: 2px; text-align: center;">
              ⇄ ${radiusMeters}m
            </div>
            <div style="width: 22px; height: 22px; background: #F59E0B; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 12px rgba(245,158,11,0.9); display: flex; align-items: center; justify-content: center; margin: 0 auto;">
              <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
            </div>
          </div>
        `,
        iconSize: [0, 0],
      });
      radiusHandleMarkerRef.current.setIcon(updatedHandleIcon);
    }
  }, [latitude, longitude, radiusMeters, officeName]);

  // Location search using OpenStreetMap Nominatim
  const handleSearch = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchStatus(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ' Malaysia'
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(parseFloat(item.lat).toFixed(6));
        const newLng = parseFloat(parseFloat(item.lon).toFixed(6));

        onLocationChange(newLat, newLng);
        mapInstanceRef.current?.flyTo([newLat, newLng], 18, { duration: 1 });
        setSearchStatus(`Lokasi dijumpai: ${item.display_name?.slice(0, 45)}...`);
      } else {
        setSearchStatus('Lokasi tidak dijumpai. Sila cuba kata kunci lain.');
      }
    } catch {
      setSearchStatus('Ralat semasa mencari lokasi.');
    } finally {
      setIsSearching(false);
    }
  };

  const useCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setSearchStatus('Mencari isyarat GPS peranti...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          onLocationChange(lat, lng);
          mapInstanceRef.current?.flyTo([lat, lng], 18, { duration: 0.8 });
          setSearchStatus('Lokasi GPS semasa berjaya ditetapkan.');
        },
        () => {
          setSearchStatus('Tidak dapat mengesan lokasi peranti semasa.');
        }
      );
    }
  };

  const zoomIn = () => mapInstanceRef.current?.zoomIn();
  const zoomOut = () => mapInstanceRef.current?.zoomOut();
  const recenter = () => mapInstanceRef.current?.flyTo([latitude, longitude], 18, { duration: 0.8 });

  return (
    <div className="space-y-2">
      {/* Search & Location Tools */}
      <div className="flex gap-2">
        <div className="flex-1 flex gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari lokasi: cth: MIEL Sungai Petani, Cyberjaya..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="w-full bg-[#0F172A] border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            {isSearching ? '...' : 'Cari'}
          </button>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          title="Gunakan Lokasi GPS Saya"
          className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-xs font-semibold flex items-center gap-1 transition"
        >
          <Locate className="w-3.5 h-3.5" />
          <span>GPS Saya</span>
        </button>
      </div>

      {searchStatus && (
        <div className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-emerald-400 flex items-center justify-between">
          <span>{searchStatus}</span>
          <button
            type="button"
            onClick={() => setSearchStatus(null)}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Interactive Map Box */}
      <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-slate-700 shadow-xl group">
        <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

        {/* Top-Right Map Controls: Satelit / Peta & Zoom */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-2 items-end">
          {/* Satellite vs Street View Switcher Button */}
          <button
            type="button"
            onClick={() => setMapType(mapType === 'satellite' ? 'streets' : 'satellite')}
            className="flex items-center gap-1.5 bg-slate-900/95 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl border border-slate-600/80 text-xs font-bold shadow-xl transition active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{mapType === 'satellite' ? '🛰️ Satelit' : '🗺️ Peta Jalan'}</span>
          </button>

          {/* Zoom & Recenter Controls */}
          <div className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col">
            <button
              type="button"
              onClick={zoomIn}
              className="p-2 hover:bg-slate-800 text-white transition active:bg-slate-700"
              title="Zum Masuk"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-[1px] bg-slate-700" />
            <button
              type="button"
              onClick={zoomOut}
              className="p-2 hover:bg-slate-800 text-white transition active:bg-slate-700"
              title="Zum Keluar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="h-[1px] bg-slate-700" />
            <button
              type="button"
              onClick={recenter}
              className="p-2 hover:bg-slate-800 text-emerald-400 transition active:bg-slate-700"
              title="Pusatkan ke Pejabat"
            >
              <Locate className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drag Helper Guide Floating Pill */}
        <div className="absolute top-2.5 left-2.5 z-10 max-w-[260px] pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3 py-1.5 rounded-xl text-[10px] text-slate-200 shadow-lg flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>Seret penanda hijau</strong> ke bumbung/pintu kilang. <strong>Seret pin jingga</strong> untuk ubah radius!
            </span>
          </div>
        </div>

        {/* Live Coordinate & Radius Status Footer */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2 pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs shadow-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
            <span className="text-white font-mono text-[11px]">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
          </div>

          <div className="bg-amber-500/95 text-slate-950 px-3 py-1.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5" />
            <span>Radius: {radiusMeters} Meter</span>
          </div>
        </div>
      </div>

      {/* Radius Quick Range Slider for Convenience */}
      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
        <span className="text-xs text-slate-400 shrink-0">Pelaras Radius:</span>
        <input
          type="range"
          min="20"
          max="800"
          step="5"
          value={radiusMeters}
          onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))}
          className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
        />
        <span className="text-xs font-bold text-emerald-400 w-12 text-right">{radiusMeters}m</span>
      </div>
    </div>
  );
};
