import { useLocalSearchParams } from 'expo-router'
import { HikeForm } from '../../../../lib/forms'

export default function EditHike() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <HikeForm id={String(id)} />
}
