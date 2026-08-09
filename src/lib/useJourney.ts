import * as Location from 'expo-location'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  appendPoint, autoStopReason, paceKmh, trackDistanceKm, type Point, type StopReason,
} from './track'

// React hook for active GPS location tracking and distance calculation
export function useJourney(targetMin: number) {
  const [points, setPoints] = useState<Point[]>([])
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [stopped, setStopped] = useState<StopReason | null>(null)
  const [denied, setDenied] = useState(false)

  const [lastMoveAt, setLastMoveAt] = useState<number | null>(null)
  const sub = useRef<Location.LocationSubscription | null>(null)

  const detach = useCallback(() => {
    sub.current?.remove()
    sub.current = null
  }, [])

  useEffect(() => detach, [detach])

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!running || !startedAt) return
    const reason = autoStopReason(now - startedAt, lastMoveAt == null ? null : now - lastMoveAt, targetMin)
    if (!reason) return
    detach()
    setRunning(false)
    setStopped(reason)
  }, [now, running, startedAt, lastMoveAt, targetMin, detach])
  /* eslint-enable react-hooks/set-state-in-effect */

  const start = useCallback(async () => {
    const perm = await Location.requestForegroundPermissionsAsync()
    if (perm.granted) {
      sub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 3000 },
        (pos) => setPoints((prev) => {
          const next = appendPoint(prev, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            t: pos.timestamp,
            alt: pos.coords.altitude ?? 0,
            heading: pos.coords.heading ?? 0,
          })
          if (next !== prev) setLastMoveAt(Date.now())
          return next
        }),
      )
    }
    const at = Date.now()
    setDenied(!perm.granted)
    setStartedAt(at)
    setLastMoveAt(perm.granted ? at : null)
    setStopped(null)
    setRunning(true)
    return at
  }, [])

  const pause = useCallback(() => {
    detach()
    setRunning(false)
  }, [detach])

  const resumeFrom = useCallback((at: number) => setStartedAt(at), [])

  const reset = useCallback(() => {
    detach()
    setPoints([]); setRunning(false); setStartedAt(null)
    setStopped(null); setLastMoveAt(null); setDenied(false)
  }, [detach])

  const elapsedMs = startedAt ? now - startedAt : 0

  return {
    points, running, startedAt, stopped, denied,
    elapsedMs,
    elapsedMin: elapsedMs / 60000,
    km: trackDistanceKm(points),
    pace: paceKmh(points),
    start, pause, resumeFrom, reset,
  }
}
