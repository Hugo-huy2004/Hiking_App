import { createContext, useContext, useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

/* Shared building blocks — the web twin of the Android styles.xml components:
   grouped inset list, segmented control, floating glass tab bar, activity ring, bar chart. */

// ----------------------------------------------------------------- icons

/* SF-Symbols-style thin line icons — the design language forbids emoji glyphs. */
const GLYPHS = {
  plus: 'M12 5v14M5 12h14',
  mountain: 'M3 19h18L14 6l-3.2 5.6L8.6 8z',
  pencil: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  calendar: 'M4 7h16v13H4zM4 11h16M8 3v4M16 3v4',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  parking: 'M8 19V5h4.5a3.5 3.5 0 0 1 0 7H8',
  cloud: 'M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.5 1.6A3.5 3.5 0 0 1 17.5 18z',
  money: 'M15 5H11a3 3 0 0 0-3 3v11M6 12h7M6 19h11',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1.5-1.5-3-2.4.8a7 7 0 0 0-2-1.2L14.5 4h-3l-.6 2.6a7 7 0 0 0-2 1.2L6.5 7 5 10l2 1.5v1L5 14l1.5 3 2.4-.8a7 7 0 0 0 2 1.2L11.5 20h3l.6-2.6a7 7 0 0 0 2-1.2l2.4.8L21 14l-2-1.5z',
  database: 'M12 8c4.4 0 8-1.1 8-2.5S16.4 3 12 3 4 4.1 4 5.5 7.6 8 12 8zM4 5.5v13C4 20 7.6 21 12 21s8-1 8-2.5v-13',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  check: 'M4 13l5 5L20 6',
  circle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm10 17-5.2-5.2',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
}

export function Glyph({ name, size = 18, stroke = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d={GLYPHS[name] || GLYPHS.circle} />
    </svg>
  )
}

// ---------------------------------------------------------------- chrome

export function NavBar({ title, back = true, onBack, action, danger }) {
  const nav = useNavigate()
  return (
    <div className="navbar">
      {back && (
        <button className="back" onClick={onBack || (() => nav(-1))}>
          <span style={{ fontSize: 26, lineHeight: 0.9 }}>‹</span> Quay lại
        </button>
      )}
      <span className="spacer" />
      {title && <h1 className="title">{title}</h1>}
      <span className="spacer" />
      {action ? (
        <button className={'nav-action' + (danger ? ' danger' : '')} onClick={action.onClick}>{action.label}</button>
      ) : back ? <span style={{ width: 64 }} /> : null}
    </div>
  )
}

export function LargeTitle({ children, sub }) {
  return (
    <>
      <h1 className="large-title">{children}</h1>
      {sub && <div className="secondary" style={{ marginBottom: 8 }}>{sub}</div>}
    </>
  )
}

export const Section = ({ title, children }) => (
  <>
    {title && <div className="section-header">{title}</div>}
    {children}
  </>
)

export const Card = ({ children, hero, style }) => (
  <div className={'card' + (hero ? ' hero' : '')} style={style}>{children}</div>
)

export function Cell({ icon, tint, title, value, onClick, chevron = !!onClick, danger }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={'cell' + (onClick ? '' : ' plain')} onClick={onClick}>
      {icon && <span className="icon-tile" style={{ background: tint || 'var(--accent)' }}>{icon}</span>}
      <span className="grow" style={danger ? { color: 'var(--danger)' } : undefined}>{title}</span>
      {value != null && <span className="value">{value}</span>}
      {chevron && <span className="chevron">›</span>}
    </Tag>
  )
}

// --------------------------------------------------------------- controls

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => {
        const val = o.value ?? o
        return (
          <button key={val} aria-pressed={value === val} onClick={() => onChange(val)}>
            {o.label ?? o}
          </button>
        )
      })}
    </div>
  )
}

export function Field({ label, error, children }) {
  return (
    <div className={'field' + (error ? ' invalid' : '')}>
      {label && <label>{label}</label>}
      {children}
      {error && <div className="error">{error}</div>}
    </div>
  )
}

export const Input = (props) => <input {...props} />

export function Chips({ options, value, onChange, multi }) {
  const selected = multi ? (value || []) : [value]
  const toggle = (v) => {
    if (!multi) return onChange(value === v ? null : v)
    const has = selected.includes(v)
    onChange(has ? selected.filter((x) => x !== v) : [...selected, v])
  }
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o} className="chip" aria-pressed={selected.includes(o)} onClick={() => toggle(o)}>{o}</button>
      ))}
    </div>
  )
}

export const Tag = ({ children, color }) => (
  <span className="tag" style={{ background: color || 'var(--label2)' }}>{children}</span>
)

// ------------------------------------------------------------------ data

export const Spinner = () => <div className="spinner" />
export const Empty = ({ children }) => <div className="empty">{children}</div>

/** Health-style activity ring: circular progress, rounded cap, category colour. */
export function Ring({ value, max, color = 'var(--cat-stats)', size = 132, label, caption }) {
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg className="ring" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--fill2)" strokeWidth="9" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="9"
          strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray .6s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}>
        <div className="stat-value">{label}</div>
        {caption && <div className="caption">{caption}</div>}
      </div>
    </div>
  )
}

/** Filled bars with rounded tops — the twin of ui/BarChartView. */
export function BarChart({ data, color = 'var(--cat-stats)', unit = 'km' }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, padding: '8px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div className="caption">{d.value ? Math.round(d.value) : ''}</div>
          <div
            style={{
              width: '78%', height: `${(d.value / max) * 100}%`, minHeight: d.value ? 4 : 0,
              background: color, borderRadius: '6px 6px 0 0', transition: 'height .5s ease',
            }}
          />
          <div className="caption">{d.label}</div>
        </div>
      ))}
      {!data.some((d) => d.value) && <div className="caption" style={{ margin: 'auto' }}>Chưa có dữ liệu {unit}</div>}
    </div>
  )
}

// ----------------------------------------------------------------- sheet

export function Sheet({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {children}
      </div>
    </div>
  )
}

export function Confirm({ open, message, confirmLabel = 'Xoá', danger = true, onConfirm, onCancel }) {
  return (
    <Sheet open={open} onClose={onCancel}>
      <p className="body" style={{ margin: '4px 4px 18px' }}>{message}</p>
      <button className={'btn' + (danger ? ' danger' : '')} onClick={onConfirm}>{confirmLabel}</button>
      <div style={{ height: 10 }} />
      <button className="btn secondary" onClick={onCancel}>Huỷ</button>
    </Sheet>
  )
}

// ----------------------------------------------------------------- toast

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastHost({ children }) {
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2600)
    return () => clearTimeout(t)
  }, [msg])
  return (
    <ToastCtx.Provider value={setMsg}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastCtx.Provider>
  )
}

// -------------------------------------------------------------- tab bar

const I = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  hikes: 'M3 19h18L14 6l-3.2 5.6L8.6 8z',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm10 17-5.2-5.2',
  stats: 'M5 20V10m7 10V4m7 16v-7',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
}
const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export function TabBar() {
  const tabs = [
    ['/home', 'Trang chủ', I.home],
    ['/hikes', 'Chuyến đi', I.hikes],
    ['/search', 'Tìm kiếm', I.search],
    ['/stats', 'Thống kê', I.stats],
    ['/profile', 'Hồ sơ', I.profile],
  ]
  return (
    <nav className="tabbar">
      {tabs.map(([to, label, d]) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon d={d} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
