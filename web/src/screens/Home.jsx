import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Api } from '../api'
import { DIFF_COLOR, Prefs, fmt } from '../store'
import { Glyph, Card, Cell, LargeTitle, Section, Spinner, Tag } from '../ui'


const QUICK = [
  ['Chuyến đi mới', <Glyph name="plus" size={22} />, 'var(--cat-hikes)', '/hikes/new'],
  ['Ghi chú', <Glyph name="pencil" size={22} />, 'var(--cat-notes)', '/notes/new'],
  ['Khám phá', <Glyph name="map" size={22} />, 'var(--cat-search)', '/map'],
  ['Kế hoạch', <Glyph name="calendar" size={22} />, 'var(--cat-stats)', '/plan'],
  ['Hồ sơ', <Glyph name="person" size={22} />, 'var(--cat-profile)', '/profile'],
]

export function Home() {
  const nav = useNavigate()
  const [hikes, setHikes] = useState(null)
  const [notes, setNotes] = useState([])

  useEffect(() => {
    Api.listHikes(Prefs.userId()).then(({ data }) => setHikes(data || []))
    Api.listObservations(Prefs.userId()).then(({ data }) => setNotes((data || []).slice(0, 3)))
  }, [])

  const week = useMemo(() => {
    if (!hikes) return { km: 0, count: 0 }
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const iso = monday.toISOString().slice(0, 10)
    const inWeek = hikes.filter((h) => (h.hike_date || '') >= iso)
    return { km: inWeek.reduce((s, h) => s + Number(h.length_km || 0), 0), count: inWeek.length }
  }, [hikes])

  if (!hikes) return <div className="screen"><Spinner /></div>

  const upcoming = hikes
    .filter((h) => h.status !== 'Completed' && (h.hike_date || '') >= fmt.today())
    .sort((a, b) => (a.hike_date || '').localeCompare(b.hike_date || ''))[0]

  return (
    <div className="screen">
      <div className="section-header" style={{ margin: '14px 4px 0' }}>
        {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
      <div style={{ position: 'relative' }}>
        <LargeTitle sub="Lên kế hoạch chuyến đi tiếp theo.">Chào mừng trở lại</LargeTitle>
        <button className="avatar" onClick={() => nav('/profile')}
          style={{ position: 'absolute', top: 6, right: 0, width: 48, height: 48, fontSize: 17, border: 0, cursor: 'pointer' }}>
          {Prefs.initials()}
        </button>
      </div>

      <Card hero style={{ marginTop: 8 }}>
        {upcoming ? (
          <div onClick={() => nav(`/hikes/${upcoming.id}`)} style={{ cursor: 'pointer' }}>
            <div className="section-header" style={{ margin: '0 0 6px' }}>Chuyến đi tới</div>
            <h2 className="title">{upcoming.name}</h2>
            <div className="secondary" style={{ marginTop: 4 }}>
              {upcoming.location} · {fmt.date(upcoming.hike_date)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Tag color={DIFF_COLOR[upcoming.difficulty]}>{upcoming.difficulty}</Tag>
              <Tag color="var(--label3)">{fmt.km(upcoming.length_km)}</Tag>
            </div>
          </div>
        ) : (
          <h2 className="title">Chưa có chuyến đi — hãy lên kế hoạch.</h2>
        )}
      </Card>

      <div style={{ display: 'flex', gap: 6, margin: '18px 0 4px' }}>
        {QUICK.map(([label, icon, tint, to]) => (
          <button key={label} onClick={() => nav(to)}
            style={{ flex: 1, background: 'none', border: 0, cursor: 'pointer', display: 'grid', gap: 6, justifyItems: 'center' }}>
            <span style={{
              width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center',
              background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint, fontSize: 22,
            }}>{icon}</span>
            <span className="caption" style={{ color: 'var(--label)' }}>{label}</span>
          </button>
        ))}
      </div>

      <Section title="Tuần này">
        <Card hero>
          <div style={{ display: 'flex', textAlign: 'center' }}>
            <div style={{ flex: 1 }}>
              <div className="stat-value">{Math.round(week.km)}</div>
              <div className="footnote">km dự kiến</div>
            </div>
            <div style={{ width: 1, background: 'var(--sep)' }} />
            <div style={{ flex: 1 }}>
              <div className="stat-value">{week.count}</div>
              <div className="footnote">chuyến</div>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Ghi chú gần đây">
        {notes.length === 0 ? (
          <p className="secondary" style={{ margin: '0 4px' }}>Chưa có ghi chú thực địa.</p>
        ) : (
          <Card>
            {notes.map((o) => (
              <Cell key={o.id} icon={<Glyph name="pencil" />} tint="var(--cat-notes)" title={o.observation}
                value={o.obs_time?.slice(0, 10)} onClick={() => nav(`/notes/${o.id}`)} />
            ))}
          </Card>
        )}
      </Section>
    </div>
  )
}
