import * as Location from 'expo-location'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { Api } from '../lib/api'
import { Prefs } from '../lib/store'
import { useApp } from '../lib/theme'
import { Btn, GlassPill, Glyph } from '../lib/ui'

const buildLeafletHtml = (
  pins: any[],
  tracks: { name: string; path: number[][] }[],
  pick: boolean,
  initialGps: { lat: number; lng: number } | null,
) => {
  const defaultLat = initialGps?.lat ?? (pins.length ? pins[0].location_lat : 21.0285)
  const defaultLng = initialGps?.lng ?? (pins.length ? pins[0].location_lng : 105.8041)

  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#f3f4f6;}
  .gps-pulse {
    width: 18px; height: 18px; background: #007AFF; border: 3px solid #ffffff;
    border-radius: 50%; box-shadow: 0 0 12px rgba(0,122,255,0.8);
  }
</style>
</head><body><div id="map"></div><script>
  // Standard International Tile Layer (CartoDB Voyager - Clean, Official, Accurate)
  var map = L.map('map', { zoomControl: false }).setView([${defaultLat}, ${defaultLng}], ${initialGps ? 13 : 8});
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
    attribution: '© OpenStreetMap, © CartoDB'
  }).addTo(map);

  var pins = ${JSON.stringify(pins)};
  pins.forEach(function (h) {
    var color = h.difficulty === 'Hard' ? '#FF3B30' : h.difficulty === 'Moderate' ? '#FF9500' : '#34C759';
    var marker = L.circleMarker([h.location_lat, h.location_lng], {
      radius: 8, color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 1
    }).addTo(map);
    
    var popupContent = '<div style="font-family:sans-serif;padding:2px;">' +
      '<b style="font-size:14px;color:#111;">' + h.name + '</b><br>' +
      '<span style="font-size:12px;color:#666;">' + (h.location || '') + '</span></div>';
    marker.bindPopup(popupContent);
  });

  var tracks = ${JSON.stringify(tracks)};
  tracks.forEach(function (tr) {
    if (tr.path.length < 2) return;
    L.polyline(tr.path, { color: '#FF375F', weight: 4, opacity: 0.9 }).addTo(map);
  });

  var gpsMarker = null;
  var gpsCircle = null;

  window.updateUserGps = function(lat, lng, acc, autoCenter) {
    if (gpsMarker) map.removeLayer(gpsMarker);
    if (gpsCircle) map.removeLayer(gpsCircle);
    if (acc) {
      gpsCircle = L.circle([lat, lng], { radius: acc, color: '#007AFF', weight: 1, fillColor: '#007AFF', fillOpacity: 0.15 }).addTo(map);
    }
    var icon = L.divIcon({ className: 'gps-pulse-wrapper', html: '<div class="gps-pulse"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    gpsMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
    if (autoCenter) {
      map.setView([lat, lng], 14);
    }
  };

  window.centerGps = function(lat, lng) {
    map.flyTo([lat, lng], 14, { animate: true, duration: 1.0 });
  };

  var pickMarker = null;
  if (${pick}) {
    map.on('click', function (e) {
      var lat = +e.latlng.lat.toFixed(5);
      var lng = +e.latlng.lng.toFixed(5);
      if (pickMarker) map.removeLayer(pickMarker);
      pickMarker = L.marker([lat, lng]).addTo(map);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick', lat: lat, lng: lng }));
    });
  }
</script></body></html>`
}

export default function ExploreMap() {
  const router = useRouter()
  const webViewRef = useRef<WebView>(null)
  const { c, t } = useApp()
  const params = useLocalSearchParams()
  const insets = useSafeAreaInsets()
  const pick = params.pick === '1'

  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [pins, setPins] = useState<any[] | null>(null)
  const [tracks, setTracks] = useState<{ name: string; path: number[][] }[]>([])
  const [userGps, setUserGps] = useState<{ lat: number; lng: number; acc?: number } | null>(null)
  const [selectedPick, setSelectedPick] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    Api.listHikes(Prefs.userId()).then(({ data }) => {
      const rows = data || []
      setPins(rows.filter((h: any) => h.location_lat && h.location_lng))
      setTracks(
        rows.flatMap((h: any) => {
          try {
            const pts = h.track ? JSON.parse(h.track) : []
            return pts.length ? [{ name: h.name, path: pts.map((p: any) => [p.lat, p.lng]) }] : []
          } catch {
            return []
          }
        }),
      )
    })

    // Request GPS location on mount
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          const gps = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            acc: loc.coords.accuracy || undefined,
          }
          setUserGps(gps)
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(
              `if (window.updateUserGps) window.updateUserGps(${gps.lat}, ${gps.lng}, ${gps.acc || 0}, true); true;`,
            )
          }
        }
      } catch {
        // location optional
      }
    })()
  }, [])

  // Memoize HTML once when pins load to prevent WebView re-render reload loop
  const html = useMemo(
    () => (pins !== null ? buildLeafletHtml(pins, tracks, pick, userGps) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pins, tracks, pick],
  )

  const searchPlace = async () => {
    if (!q.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.slice(0, 5))
      }
    } catch {
      Alert.alert(t.noSearchFound || 'No places found.')
    } finally {
      setSearching(false)
    }
  }

  const selectPlace = (item: any) => {
    const lat = parseFloat(item.lat)
    const lon = parseFloat(item.lon)
    setSearchResults([])
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`if (window.centerGps) window.centerGps(${lat}, ${lon}); true;`)
    }
  }

  const centerOnGps = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const newGps = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        acc: loc.coords.accuracy || undefined,
      }
      setUserGps(newGps)
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(
          `if (window.updateUserGps) window.updateUserGps(${newGps.lat}, ${newGps.lng}, ${newGps.acc || 0}, true); true;`,
        )
      }
    } catch {
      Alert.alert('GPS Error', 'Could not obtain exact GPS location.')
    }
  }

  const onMessage = async (eventData: string) => {
    try {
      const msg = JSON.parse(eventData)
      if (msg.type === 'pick') {
        setSelectedPick({ lat: msg.lat, lng: msg.lng })
      } else if (msg.type === 'view' && msg.id) {
        router.push(`/hikes/${msg.id}` as any)
      }
    } catch {
      // ignore
    }
  }

  const confirmPick = async () => {
    if (!selectedPick) return
    await Prefs.setDraft({ ...(Prefs.getDraft() || {}), location_lat: selectedPick.lat, location_lng: selectedPick.lng })
    router.back()
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {!!html && (
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onLoadEnd={() => {
            if (userGps && webViewRef.current) {
              webViewRef.current.injectJavaScript(
                `if (window.updateUserGps) window.updateUserGps(${userGps.lat}, ${userGps.lng}, ${userGps.acc || 0}, true); true;`,
              )
            }
          }}
          onMessage={(e) => onMessage(e.nativeEvent.data)}
        />
      )}

      {/* Floating Top Bar (Search + Back) */}
      <GlassPill style={{ top: insets.top + 8, left: 16, right: 16 }}>
        <Pressable onPress={() => router.back()} style={{ paddingRight: 6 }}>
          <Text style={{ color: c.accent, fontSize: 26, lineHeight: 28 }}>‹</Text>
        </Pressable>
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={searchPlace}
          placeholder={pick ? t.tapToPin : t.findPlace}
          placeholderTextColor={c.label2}
          style={{ flex: 1, fontSize: 16, color: c.label, padding: 0 }}
          returnKeyType="search"
        />
        {searching ? (
          <ActivityIndicator size="small" color={c.accent} />
        ) : (
          <Pressable onPress={searchPlace}>
            <Glyph name="search" color={c.accent} size={20} />
          </Pressable>
        )}
      </GlassPill>

      {/* Search Results Dropdown */}
      {searchResults.length > 0 && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 64,
            left: 16,
            right: 16,
            backgroundColor: c.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.sep,
            maxHeight: 200,
            zIndex: 999,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            {searchResults.map((item, idx) => (
              <Pressable
                key={idx}
                onPress={() => selectPlace(item)}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: idx < searchResults.length - 1 ? 0.5 : 0, borderColor: c.sep }}
              >
                <Text style={{ color: c.label, fontSize: 14, fontWeight: '500' }}>{item.display_name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* GPS Locate Button */}
      <View style={{ position: 'absolute', right: 16, bottom: pick && selectedPick ? 120 : 40, alignItems: 'flex-end' }}>
        <Pressable
          onPress={centerOnGps}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.sep,
            alignItems: 'center',
            justify: 'center',
            opacity: pressed ? 0.7 : 1,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          })}
        >
          <Text style={{ fontSize: 22 }}>🎯</Text>
        </Pressable>
      </View>

      {/* GPS Info Bar */}
      {!!userGps && (
        <View
          style={{
            position: 'absolute',
            left: 16,
            bottom: pick && selectedPick ? 120 : 40,
            backgroundColor: c.card,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: c.sep,
          }}
        >
          <Text style={{ color: c.label2, fontSize: 11, fontWeight: '500' }}>
            GPS: {userGps.lat.toFixed(4)}, {userGps.lng.toFixed(4)}
            {userGps.acc ? ` (${t.gpsAccuracy ? t.gpsAccuracy(Math.round(userGps.acc)) : `~${Math.round(userGps.acc)}m`})` : ''}
          </Text>
        </View>
      )}

      {/* Pick Location Confirmation Card */}
      {pick && selectedPick && (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 30,
            backgroundColor: c.card,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.sep,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <Text style={{ color: c.label, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
            Pinned: {selectedPick.lat}, {selectedPick.lng}
          </Text>
          <Btn onPress={confirmPick}>{t.useLocation || 'Use this location'}</Btn>
        </View>
      )}
    </View>
  )
}
