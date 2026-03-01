"use client";

import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";

type WeatherMapProps = {
  lat: number;
  lon: number;
  city: string;
};

export function WeatherMap({ lat, lon, city }: WeatherMapProps) {
  return (
    <div className="h-44 overflow-hidden rounded-2xl border border-white/10 sm:h-52">
      <MapContainer
        center={[lat, lon]}
        zoom={9}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={[lat, lon]}
          radius={9}
          pathOptions={{
            color: "#38bdf8",
            fillColor: "#7dd3fc",
            fillOpacity: 0.9
          }}
        >
          <Tooltip>{city}</Tooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
