import { useMemo } from 'react'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'
import { R, useApp } from './theme'
import { type Point } from './track'

// Leaflet Map Component for render and live tracking
export function TrackMap({
  track,
  height = 220,
  isLive = false,
  weather,
}: {
  track?: string | null | Point[]
  height?: number
  isLive?: boolean
  weather?: { tempC: number; icon: string; description: string } | null
}) {
  const { c } = useApp()

  const points = useMemo<Point[]>(() => {
    if (!track) return []
    if (Array.isArray(track)) return track
    try {
      const arr = JSON.parse(track)
      return Array.isArray(arr) ? arr.filter((p) => typeof p?.lat === 'number' && typeof p?.lng === 'number') : []
    } catch {
      return []
    }
  }, [track])

  const html = useMemo(() => buildHtml(points, isLive), [points, isLive])
  if (!html) return null

  return (
    <View style={{ height, borderRadius: R.hero, overflow: 'hidden', backgroundColor: c.fill2 }}>
      <WebView
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        originWhitelist={['*']}
        scrollEnabled={isLive}
      />
    </View>
  )
}

const buildHtml = (points: Point[], isLive: boolean) => {
  if (points.length === 0) {
    // Default centering fallback map (Hanoi / Sapa)
    const fallbackLat = 21.0285
    const fallbackLng = 105.8542
    return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0}</style>
</head><body><div id="map"></div><script>
  var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${fallbackLat}, ${fallbackLng}], 14);
  L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 }).addTo(map);
  L.circleMarker([${fallbackLat}, ${fallbackLng}], { radius: 8, color: '#fff', weight: 3, fillColor: '#007AFF', fillOpacity: 1 }).addTo(map);
</script></body></html>`
  }

  const path = points.map((p) => [p.lat, p.lng])

  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{height:100%;margin:0}
  .pulse-icon {
    width: 20px; height: 20px; border-radius: 50%; background: #007AFF;
    border: 3px solid #FFFFFF; box-shadow: 0 0 10px rgba(0,122,255,0.8);
  }
</style>
</head><body><div id="map"></div><script>
  var path = ${JSON.stringify(path)};
  var isLive = ${isLive};
  var map = L.map('map', { zoomControl: isLive, attributionControl: false, dragging: true, scrollWheelZoom: isLive });
  L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 }).addTo(map);

  if (path.length >= 2) {
    L.polyline(path, { color: '#007AFF', weight: 6, opacity: 0.95, lineJoin: 'round' }).addTo(map);
    L.circleMarker(path[0], { radius: 7, color: '#fff', weight: 2, fillColor: '#34C759', fillOpacity: 1 }).addTo(map);
  }

  var currentPos = path[path.length - 1];
  L.circleMarker(currentPos, { radius: 9, color: '#ffffff', weight: 3, fillColor: '#FF3B30', fillOpacity: 1 }).addTo(map);

  if (isLive) {
    map.setView(currentPos, 16);
  } else if (path.length >= 2) {
    map.fitBounds(path, { padding: [24, 24] });
  } else {
    map.setView(currentPos, 15);
  }
</script></body></html>`
}
