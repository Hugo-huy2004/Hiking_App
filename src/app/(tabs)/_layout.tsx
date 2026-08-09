import { Tabs } from 'expo-router'
import type { JSX } from 'react'
import { TabBar } from '../../lib/ui'

export default function TabsLayout(): JSX.Element {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="hikes" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="profile" />
    </Tabs>
  )
}
