// Trail Safety & Emergency SOS Signal Helper.
// Fetches real-time GPS coordinates and triggers SMS/Phone call emergency actions.

import * as Linking from 'expo-linking'
import * as Location from 'expo-location'

export interface SosDetails {
  lat: number
  lng: number
  googleMapsUrl: string
  contactPhone: string
  message: string
}

export async function getCurrentSosDetails(contactPhone = '999'): Promise<SosDetails | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      return null
    }

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    const lat = Number(pos.coords.latitude.toFixed(5))
    const lng = Number(pos.coords.longitude.toFixed(5))
    const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`
    const message = `EMERGENCY SOS: Hiker needs assistance! GPS Location: ${googleMapsUrl} (${lat}, ${lng}).`

    return {
      lat,
      lng,
      googleMapsUrl,
      contactPhone,
      message,
    }
  } catch {
    return null
  }
}

export async function sendSosSms(phone: string, message: string): Promise<boolean> {
  try {
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`
    const supported = await Linking.canOpenURL(smsUrl)
    if (supported) {
      await Linking.openURL(smsUrl)
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function callSosPhone(phone: string): Promise<boolean> {
  try {
    const telUrl = `tel:${phone}`
    await Linking.openURL(telUrl)
    return true
  } catch {
    return false
  }
}
