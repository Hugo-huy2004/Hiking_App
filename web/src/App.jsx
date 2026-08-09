import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Prefs, applyTheme } from './store'
import { TabBar, ToastHost } from './ui'
import { EditProfile, Login, Onboarding, Splash } from './screens/Onboard'
import { Home } from './screens/Home'
import { ConfirmHike, CreateHike, HikeDetail, HikeList } from './screens/Hikes'
import { AddObservation, ObservationDetail, Observations } from './screens/Notes'
import { Analytics, ExploreMap, Plan, Profile, Search, Settings } from './screens/More'

const TAB_ROUTES = ['/home', '/hikes', '/search', '/stats', '/profile']

function Guard({ children }) {
  if (!Prefs.isLoggedIn()) return <Navigate to="/login" replace />
  if (Prefs.sessionExpired()) {
    Prefs.logout()
    return <Navigate to="/login?expired=1" replace />
  }
  return children
}

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => { applyTheme() }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  const g = (el) => <Guard>{el}</Guard>
  return (
    <ToastHost>
      <div className="app">
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />

          <Route path="/home" element={g(<Home />)} />
          <Route path="/hikes" element={g(<HikeList />)} />
          <Route path="/hikes/new" element={g(<CreateHike />)} />
          <Route path="/hikes/confirm" element={g(<ConfirmHike />)} />
          <Route path="/hikes/:id" element={g(<HikeDetail />)} />
          <Route path="/hikes/:id/edit" element={g(<CreateHike />)} />

          <Route path="/notes" element={g(<Observations />)} />
          <Route path="/notes/new" element={g(<AddObservation />)} />
          <Route path="/notes/:id" element={g(<ObservationDetail />)} />
          <Route path="/notes/:id/edit" element={g(<AddObservation />)} />

          <Route path="/search" element={g(<Search />)} />
          <Route path="/stats" element={g(<Analytics />)} />
          <Route path="/plan" element={g(<Plan />)} />
          <Route path="/profile" element={g(<Profile />)} />
          <Route path="/profile/edit" element={g(<EditProfile />)} />
          <Route path="/settings" element={g(<Settings />)} />
          <Route path="/map" element={g(<ExploreMap />)} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {TAB_ROUTES.includes(pathname) && <TabBar />}
      </div>
    </ToastHost>
  )
}
