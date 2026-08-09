import { useLocalSearchParams } from 'expo-router'
import { ObservationForm } from '../../../lib/forms'

export default function EditObservation() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ObservationForm id={String(id)} />
}
