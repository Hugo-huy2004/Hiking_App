// Open-Meteo Weather API integration helper.
// No API key required, cross-platform fast HTTP fetch.

export interface WeatherData {
  tempC: number
  windKmH: number
  description: string
  icon: string
  cityName?: string
  lat?: number
  lng?: number
}

const WEATHER_CODES: Record<number, { en: string; vi: string; icon: string }> = {
  0: { en: 'Clear sky', vi: 'Trời quang', icon: 'sun' },
  1: { en: 'Mainly clear', vi: 'Nắng nhẹ', icon: 'sun' },
  2: { en: 'Partly cloudy', vi: 'Mây rải rác', icon: 'cloud' },
  3: { en: 'Overcast', vi: 'Nhiều mây', icon: 'cloud' },
  45: { en: 'Foggy', vi: 'Sương mù', icon: 'cloud' },
  48: { en: 'Depositing rime fog', vi: 'Sương giá', icon: 'cloud' },
  51: { en: 'Light drizzle', vi: 'Mưa phun nhẹ', icon: 'cloud' },
  53: { en: 'Moderate drizzle', vi: 'Mưa phùn', icon: 'cloud' },
  55: { en: 'Dense drizzle', vi: 'Mưa phùn dày', icon: 'cloud' },
  61: { en: 'Slight rain', vi: 'Mưa nhỏ', icon: 'cloud' },
  63: { en: 'Moderate rain', vi: 'Mưa vừa', icon: 'cloud' },
  65: { en: 'Heavy rain', vi: 'Mưa to', icon: 'cloud' },
  71: { en: 'Slight snow', vi: 'Tuyết nhẹ', icon: 'cloud' },
  73: { en: 'Moderate snow', vi: 'Tuyết vừa', icon: 'cloud' },
  75: { en: 'Heavy snow', vi: 'Tuyết rơi nhiều', icon: 'cloud' },
  80: { en: 'Slight rain showers', vi: 'Mưa rào nhẹ', icon: 'cloud' },
  81: { en: 'Moderate rain showers', vi: 'Mưa rào vừa', icon: 'cloud' },
  82: { en: 'Violent rain showers', vi: 'Mưa rào nặng hạt', icon: 'cloud' },
  95: { en: 'Thunderstorm', vi: 'Giông bão', icon: 'cloud' },
  96: { en: 'Thunderstorm with hail', vi: 'Giông kèm mưa đá', icon: 'cloud' },
}

export async function fetchWeatherByCoords(lat: number, lng: number, lang: 'en' | 'vi' = 'en'): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const current = json.current_weather
    if (!current) return null

    const codeInfo = WEATHER_CODES[current.weathercode] || { en: 'Sunny', vi: 'Nắng', icon: 'sun' }
    return {
      tempC: Math.round(current.temperature),
      windKmH: Math.round(current.windspeed),
      description: lang === 'vi' ? codeInfo.vi : codeInfo.en,
      icon: codeInfo.icon,
      lat,
      lng,
    }
  } catch {
    return null
  }
}

export async function fetchWeatherByLocationName(locationName: string, lang: 'en' | 'vi' = 'en'): Promise<WeatherData | null> {
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1`
    const geoRes = await fetch(geoUrl)
    if (!geoRes.ok) return null
    const geoJson = await geoRes.json()
    const place = geoJson.results?.[0]
    if (!place) return null

    const weather = await fetchWeatherByCoords(place.latitude, place.longitude, lang)
    if (weather) {
      weather.cityName = place.name
    }
    return weather
  } catch {
    return null
  }
}
