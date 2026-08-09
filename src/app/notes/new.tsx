import { useLocalSearchParams } from 'expo-router'
import { ObservationForm } from '../../lib/forms'

export default function NewObservation() {
  const { hike } = useLocalSearchParams<{ hike?: string }>()
  return <ObservationForm hike={hike ? String(hike) : undefined} />
}
