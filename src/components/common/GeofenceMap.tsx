import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Office } from '../../types';
import { Layers, Locate, Building2, ZoomIn, ZoomOut } from 'lucide-react';

interface GeofenceMapProps {
  office: Office | null;
  userLocation: { latitude: number; longitude: number } | null;
  isInsideRadius: boolean;
  distanceMeters: number | null;
  heightClass?: string;
  defaultSatellite?: boolean;
}

// Google Maps & Satellite tile URLs
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
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

export const GeofenceMap: React.FC<GeofenceMapProps> = ({
  office,
  userLocation,
  isInsideRadius,
  distanceMeters,
  heightClass = 'h-64',
  defaultSatellite = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const officeMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [mapType, setMapType] = useState<'streets' | 'satellite'>(
    defaultSatellite ? 'satellite' : 'streets'
  );

  const officeLat = office?.latitude ?? 5.6432;
  const officeLng = office?.longitude ?? 100.4912;
  const radius = office?.radiusMeters ?? 100;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] = userLocation
      ? [userLocation.latitude, userLocation.longitude]
      : [officeLat, officeLng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 17,
      zoomControl: false,
    });

    const activeTileConfig = mapType === 'satellite' ? TILE_LAYERS.satellite : TILE_LAYERS.streets;
    const tileLayer = L.tileLayer(activeTileConfig.url, {
      attribution: activeTileConfig.attribution,
      maxZoom: activeTileConfig.maxZoom,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Fix map container size after mount
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when mapType switches
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

  // Update Office Marker & Geofence Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !office) return;

    // Custom emerald office pin
    const officeIcon = L.divIcon({
      className: 'custom-office-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: #10B981; color: #0F172A; font-weight: 800; font-size: 11px; padding: 4px 8px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 2px solid white; white-space: nowrap; margin-bottom: 2px;">
            🏢 ${office.name}
          </div>
          <div style="width: 24px; height: 24px; background: #10B981; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 14px rgba(16,185,129,0.8); display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
          </div>
          <div style="width: 2px; height: 6px; background: white;"></div>
        </div>
      `,
      iconSize: [0, 0],
    });

    if (officeMarkerRef.current) {
      officeMarkerRef.current.setLatLng([officeLat, officeLng]);
      officeMarkerRef.current.setIcon(officeIcon);
    } else {
      officeMarkerRef.current = L.marker([officeLat, officeLng], { icon: officeIcon }).addTo(map);
    }

    // Geofence Circle (Radius in meters)
    const circleColor = isInsideRadius ? '#10B981' : '#EF4444';
    const circleFill = isInsideRadius ? 'rgba(16, 185, 129, 0.20)' : 'rgba(239, 68, 68, 0.18)';

    if (circleRef.current) {
      circleRef.current.setLatLng([officeLat, officeLng]);
      circleRef.current.setRadius(radius);
      circleRef.current.setStyle({
        color: circleColor,
        fillColor: circleFill,
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '6, 6',
      });
    } else {
      circleRef.current = L.circle([officeLat, officeLng], {
        radius,
        color: circleColor,
        fillColor: circleFill,
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);
    }
  }, [officeLat, officeLng, radius, isInsideRadius, office?.name]);

  // Update User Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    const userIcon = L.divIcon({
      className: 'custom-user-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${isInsideRadius ? 'rgba(59, 130, 246, 0.35)' : 'rgba(239, 68, 68, 0.35)'}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 20px; height: 20px; background: ${isInsideRadius ? '#3B82F6' : '#EF4444'}; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 12px rgba(0,0,0,0.6); z-index: 10;"></div>
        </div>
      `,
      iconSize: [0, 0],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
      userMarkerRef.current.setIcon(userIcon);
    } else {
      userMarkerRef.current = L.marker([userLocation.latitude, userLocation.longitude], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    }
  }, [userLocation, isInsideRadius]);

  const recenterOffice = () => {
    if (mapInstanceRef.current && office) {
      mapInstanceRef.current.flyTo([officeLat, officeLng], 17, { duration: 0.8 });
    }
  };

  const recenterUser = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.flyTo([userLocation.latitude, userLocation.longitude], 18, {
        duration: 0.8,
      });
    }
  };

  const zoomIn = () => mapInstanceRef.current?.zoomIn();
  const zoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-700/80 shadow-inner group`}>
      {/* Real Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

      {/* Top Left: Office & Status Badge */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 text-xs shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_#10B981]" />
          <span className="text-white font-bold">{office?.name || 'Pejabat Halagel'}</span>
          <span className="text-slate-400 text-[11px]">({radius}m radius)</span>
        </div>
      </div>

      {/* Top Right: Satellite / Map Switcher & Zoom Controls */}
      <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5 items-end">
        {/* Satellite Toggle Button */}
        <button
          type="button"
          onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
          className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-semibold shadow-lg transition active:scale-95 cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>{mapType === 'streets' ? '🛰️ Satelit' : '🗺️ Peta'}</span>
        </button>

        {/* Zoom In / Out */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 overflow-hidden shadow-lg flex flex-col">
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
        </div>
      </div>

      {/* Bottom Floating Bar: User Distance & Recenter Actions */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2">
        <div
          className={`flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border ${
            isInsideRadius ? 'border-emerald-500/50' : 'border-amber-500/50'
          } text-xs shadow-lg`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isInsideRadius ? 'bg-blue-400 shadow-[0_0_8px_#60A5FA]' : 'bg-red-400 shadow-[0_0_8px_#F87171]'
            }`}
          />
          <span className="text-white font-medium">
            Jarak: <strong className={isInsideRadius ? 'text-emerald-400' : 'text-amber-400'}>{distanceMeters ?? 0}m</strong>
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isInsideRadius ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {isInsideRadius ? 'DALAM ZON' : 'LUAR RADIUS'}
          </span>
        </div>

        <div className="flex gap-1.5">
          {userLocation && (
            <button
              type="button"
              onClick={recenterUser}
              title="Pusatkan Lokasi Saya"
              className="p-2 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-blue-400 rounded-xl border border-slate-700 shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Locate className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={recenterOffice}
            title="Pusatkan Pejabat"
            className="p-2 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-emerald-400 rounded-xl border border-slate-700 shadow-lg transition active:scale-95 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
