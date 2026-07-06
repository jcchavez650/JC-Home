import { useEffect, useState, createContext, useContext } from 'react'
import { getStoredUser, clearSession } from './api.js'
import AuthPage from './pages/AuthPage.jsx'
import TripsPage from './pages/TripsPage.jsx'
import TripDetailPage from './pages/TripDetailPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash.replace(/^#/, '')
}

export function navigate(path) {
  window.location.hash = path
}

export default function App() {
  const [user, setUser] = useState(getStoredUser())
  const route = useHashRoute()

  const logout = () => {
    clearSession()
    setUser(null)
    navigate('/')
  }

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, setUser, logout }}>
        <AuthPage onLogin={setUser} />
      </AuthContext.Provider>
    )
  }

  let page
  const tripMatch = route.match(/^\/trips\/(\d+)/)
  if (tripMatch) page = <TripDetailPage tripId={Number(tripMatch[1])} />
  else if (route === '/reports') page = <ReportsPage />
  else page = <TripsPage />

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <header className="topbar">
        <a href="#/" className="brand">🧳 Trip Planner</a>
        <nav>
          <a href="#/" className={!tripMatch && route !== '/reports' ? 'active' : ''}>Trips</a>
          <a href="#/reports" className={route === '/reports' ? 'active' : ''}>Reports</a>
        </nav>
        <div className="topbar-user">
          <span>{user.name}</span>
          <button className="btn btn-ghost" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="container">{page}</main>
    </AuthContext.Provider>
  )
}
