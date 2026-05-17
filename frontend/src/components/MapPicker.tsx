import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function MapEvents({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 14)
  }, [lat, lng, map])
  return null
}

export function MapPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}) {
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : [19.076, 72.8777]

  return (
    <MapContainer center={center} zoom={11} className="location-map" style={{ height: 220 }}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; OSM &copy; CARTO" />
      <MapEvents onPick={onPick} />
      {lat != null && lng != null && (
        <>
          <Marker position={[lat, lng]} icon={icon} />
          <Recenter lat={lat} lng={lng} />
        </>
      )}
    </MapContainer>
  )
}
