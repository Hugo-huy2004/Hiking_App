import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Api, advancedSearch, searchByName } from '../api'
import { Prefs, applyTheme, bmi, fmt } from '../store'
import { Glyph, BarChart, Card, Cell, Confirm, Empty, Field, LargeTitle, NavBar, Ring, Section, Segmented, Spinner, useToast } from '../ui'
import { HikeCard } from './Hikes'


// ------------------------------------------------------------------ search

export function Search() {
  const nav = useNavigate()
  const [hikes, setHikes] = useState(null)
  const [q, setQ] = useState('')
  const [adv, setAdv] = useState(false)
  const [f, setF] = useState({ name: '', location: '', minLen: '', maxLen: '', dateFrom: '', dateTo: '', difficulty: null })

  useEffect(() => { Api.listHikes(Prefs.userId()).then(({ data }) => setHikes(data || [])) }, [])
  const results = useMemo(() => {
    if (!hikes) return []
    return adv ? advancedSearch(hikes, f) : searchByName(hikes, q)
  }, [hikes, q, adv, f])

  if (!hikes) return <div className="screen"><Spinner /></div>
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="screen">
      <LargeTitle>Tìm kiếm</LargeTitle>
      <Segmented
        options={[{ value: false, label: 'Theo tên' }, { value: true, label: 'Nâng cao' }]}
        value={adv} onChange={setAdv}
      />
      <div style={{ height: 12 }} />
      {!adv ? (
        <Field><input autoFocus placeholder="Tên chuyến đi bắt đầu bằng…" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
      ) : (
        <Card style={{ padding: 14 }}>
          <Field label="Tên"><input value={f.name} onChange={on('name')} /></Field>
          <Field label="Địa điểm"><input value={f.location} onChange={on('location')} /></Field>
          <div className="row2">
            <Field label="Km từ"><input value={f.minLen} onChange={on('minLen')} inputMode="decimal" /></Field>
            <Field label="Km đến"><input value={f.maxLen} onChange={on('maxLen')} inputMode="decimal" /></Field>
          </div>
          <div className="row2">
            <Field label="Ngày từ"><input type="date" value={f.dateFrom} onChange={on('dateFrom')} /></Field>
            <Field label="Ngày đến"><input type="date" value={f.dateTo} onChange={on('dateTo')} /></Field>
          </div>
          <Field label="Độ khó">
            <Segmented options={['Easy', 'Moderate', 'Hard']} value={f.difficulty}
              onChange={(v) => setF({ ...f, difficulty: f.difficulty === v ? null : v })} />
          </Field>
        </Card>
      )}
      <div className="section-header">{results.length} kết quả</div>
      {results.length === 0 ? <Empty>Không tìm thấy chuyến đi nào.</Empty> : (
        <Card>{results.map((h) => <HikeCard key={h.id} hike={h} onClick={() => nav(`/hikes/${h.id}`)} />)}</Card>
      )}
    </div>
  )
}

// ----------------------------------------------------------------- analytics

export function Analytics() {
  const [hikes, setHikes] = useState(null)
  const [notes, setNotes] = useState([])
  useEffect(() => {
    Api.listHikes(Prefs.userId()).then(({ data }) => setHikes(data || []))
    Api.listObservations(Prefs.userId()).then(({ data }) => setNotes(data || []))
  }, [])
  if (!hikes) return <div className="screen"><Spinner /></div>

  const totalKm = hikes.reduce((s, h) => s + Number(h.length_km || 0), 0)
  const done = hikes.filter((h) => h.status === 'Completed').length
  const byMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const key = d.toISOString().slice(0, 7)
    return {
      label: d.toLocaleDateString(undefined, { month: 'short' }),
      value: hikes.filter((h) => (h.hike_date || '').startsWith(key)).reduce((s, h) => s + Number(h.length_km || 0), 0),
    }
  })
  const diff = ['Easy', 'Moderate', 'Hard'].map((d) => ({ label: d, value: hikes.filter((h) => h.difficulty === d).length }))

  return (
    <div className="screen">
      <LargeTitle sub={`${hikes.length} chuyến đi · ${notes.length} ghi chú`}>Thống kê</LargeTitle>
      <Card hero style={{ display: 'grid', placeItems: 'center', gap: 10 }}>
        <Ring value={done} max={Math.max(1, hikes.length)} label={`${done}/${hikes.length}`} caption="đã hoàn thành" />
        <div className="secondary">Tổng {Math.round(totalKm)} km đã lên kế hoạch</div>
      </Card>
      <Section title="Quãng đường 6 tháng gần đây">
        <Card hero><BarChart data={byMonth} /></Card>
      </Section>
      <Section title="Theo độ khó">
        <Card hero><BarChart data={diff} color="var(--cat-hikes)" unit="chuyến" /></Card>
      </Section>
    </div>
  )
}

// -------------------------------------------------------------------- plan

export function Plan() {
  const [plan, setPlan] = useState(() => Prefs.get('plan', null))
  const [f, setF] = useState({ start: fmt.today(), perWeek: 3, minutes: 60, weeks: 4 })
  const s = Prefs.all()
  const b = bmi(s.height_cm, s.weight_kg)

  function generate() {
    const sessions = []
    const start = new Date(f.start + 'T00:00:00')
    for (let w = 0; w < Number(f.weeks); w++) {
      for (let i = 0; i < Number(f.perWeek); i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + w * 7 + Math.round((i * 7) / f.perWeek))
        sessions.push({ id: `${w}-${i}`, date: d.toISOString().slice(0, 10), minutes: Number(f.minutes), week: w + 1, done: false })
      }
    }
    const next = { ...f, sessions }
    Prefs.set('plan', next); setPlan(next)
  }
  const toggle = (id) => {
    const next = { ...plan, sessions: plan.sessions.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }
    Prefs.set('plan', next); setPlan(next)
  }
  const reset = () => { Prefs.set('plan', null); setPlan(null) }

  return (
    <div className="screen">
      <LargeTitle sub="TẬP LUYỆN HƯỚNG TỚI MỤC TIÊU">Kế hoạch đi bộ</LargeTitle>
      {b && (
        <Card hero style={{ marginBottom: 14 }}>
          <div className="section-header" style={{ margin: 0 }}>BMI của bạn</div>
          <div className="stat-value">{b.value}</div>
          <div className="secondary">{b.band}</div>
        </Card>
      )}
      {!plan ? (
        <Card style={{ padding: 14 }}>
          <p className="secondary" style={{ marginTop: 0 }}>
            Chọn nhịp độ mỗi tuần, ứng dụng sẽ dựng lịch có ngày cụ thể để bạn tick dần.
          </p>
          <Field label="Ngày bắt đầu"><input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
          <div className="row2">
            <Field label="Buổi / tuần"><input value={f.perWeek} onChange={(e) => setF({ ...f, perWeek: e.target.value })} inputMode="numeric" /></Field>
            <Field label="Phút mỗi buổi"><input value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} inputMode="numeric" /></Field>
            <Field label="Số tuần"><input value={f.weeks} onChange={(e) => setF({ ...f, weeks: e.target.value })} inputMode="numeric" /></Field>
          </div>
          <button className="btn" onClick={generate}>Tạo lịch tập</button>
        </Card>
      ) : (
        <>
          <Card hero style={{ marginBottom: 14 }}>
            <div className="secondary">
              {plan.weeks} tuần · {Math.round((plan.sessions.length * plan.minutes) / 60)} giờ đi bộ theo kế hoạch
            </div>
            <div className="stat-value" style={{ marginTop: 6 }}>
              {plan.sessions.filter((x) => x.done).length}/{plan.sessions.length}
            </div>
            <div className="footnote">buổi đã ghi</div>
          </Card>
          {Array.from(new Set(plan.sessions.map((x) => x.week))).map((w) => (
            <Section key={w} title={`Tuần ${w}`}>
              <Card>
                {plan.sessions.filter((x) => x.week === w).map((x) => (
                  <Cell key={x.id} icon={<Glyph name={x.done ? "check" : "circle"} />} tint={x.done ? 'var(--cat-hikes)' : 'var(--label3)'}
                    title={fmt.date(x.date)} value={`${x.minutes} phút`} onClick={() => toggle(x.id)} chevron={false} />
                ))}
              </Card>
            </Section>
          ))}
          <div style={{ height: 18 }} />
          <button className="btn secondary" onClick={reset}>Bắt đầu kế hoạch mới</button>
        </>
      )}
    </div>
  )
}

// ----------------------------------------------------------------- profile

export function Profile() {
  const nav = useNavigate()
  const [counts, setCounts] = useState({ hikes: 0, km: 0, notes: 0 })
  const s = Prefs.all()
  useEffect(() => {
    Api.listHikes(Prefs.userId()).then(({ data }) => {
      const h = data || []
      setCounts((c) => ({ ...c, hikes: h.length, km: Math.round(h.reduce((x, i) => x + Number(i.length_km || 0), 0)) }))
    })
    Api.listObservations(Prefs.userId()).then(({ data }) => setCounts((c) => ({ ...c, notes: (data || []).length })))
  }, [])
  const b = bmi(s.height_cm, s.weight_kg)

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
        <div className="avatar">{Prefs.initials()}</div>
        <div className="grow" style={{ flex: 1, minWidth: 0 }}>
          <h1 className="title">{s.name || 'Người dùng'}</h1>
          <div className="secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>
        </div>
        <button className="nav-action" onClick={() => nav('/profile/edit')}>Sửa</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {[['hikes', counts.hikes, 'var(--cat-hikes)'], ['km', counts.km, 'var(--cat-search)'],
          ['ghi chú', counts.notes, 'var(--cat-stats)'], ['BMI', b ? b.value : '—', 'var(--cat-profile)']].map(([label, v, c]) => (
          <Card key={label} style={{ flex: 1, padding: '14px 6px', textAlign: 'center' }}>
            <div className="stat-value" style={{ color: c, fontSize: 24 }}>{v}</div>
            <div className="footnote">{label}</div>
          </Card>
        ))}
      </div>

      <Section title="Hồ sơ cơ thể">
        <Card>
          <Cell icon={<Glyph name="pencil" />} tint="var(--cat-notes)" title="Sửa hồ sơ cơ thể"
            value={b ? b.band : 'Đặt chiều cao & cân nặng'} onClick={() => nav('/profile/edit')} />
        </Card>
      </Section>

      <Section title="Tuỳ chọn">
        <Card>
          <Cell icon={<Glyph name="map" />} tint="var(--cat-search)" title="Bản đồ khám phá" onClick={() => nav('/map')} />
          <Cell icon={<Glyph name="calendar" />} tint="var(--cat-stats)" title="Kế hoạch tập luyện" onClick={() => nav('/plan')} />
          <Cell icon={<Glyph name="pencil" />} tint="var(--cat-notes)" title="Tất cả ghi chú" onClick={() => nav('/notes')} />
          <Cell icon={<Glyph name="gear" />} tint="var(--cat-profile)" title="Cài đặt" onClick={() => nav('/settings')} />
        </Card>
      </Section>

      <div style={{ height: 18 }} />
      <button className="btn secondary" onClick={() => { Prefs.logout(); nav('/login', { replace: true }) }}>Đăng xuất</button>
    </div>
  )
}

// ---------------------------------------------------------------- settings

export function Settings() {
  const toast = useToast()
  const [theme, setTheme] = useState(Prefs.get('theme', 'auto'))
  const [counts, setCounts] = useState({ hikes: 0, notes: 0 })
  const [sub, setSub] = useState('Sao lưu hoặc khôi phục toàn bộ chuyến đi & ghi chú')
  const [ask, setAsk] = useState(false)

  const reload = () => {
    Api.listHikes(Prefs.userId()).then(({ data }) => setCounts((c) => ({ ...c, hikes: (data || []).length })))
    Api.listObservations(Prefs.userId()).then(({ data }) => setCounts((c) => ({ ...c, notes: (data || []).length })))
  }
  useEffect(reload, [])

  const chooseTheme = (v) => { setTheme(v); Prefs.set('theme', v); applyTheme(v) }

  return (
    <div className="screen">
      <LargeTitle>Cài đặt</LargeTitle>

      <Section title="Giao diện">
        <Card style={{ padding: 14 }}>
          <Segmented
            options={[{ value: 'light', label: 'Sáng' }, { value: 'dark', label: 'Tối' }, { value: 'auto', label: 'Tự động' }]}
            value={theme} onChange={chooseTheme}
          />
        </Card>
      </Section>

      <Section title="Dữ liệu">
        <Card>
          <Cell icon={<Glyph name="database" />} tint="var(--cat-search)" title="Cơ sở dữ liệu"
            value={`${counts.hikes} chuyến · ${counts.notes} ghi chú`} chevron={false} />
          <Cell icon={<Glyph name="cloud" />} tint="var(--cat-hikes)" title="Kiểm tra kết nối" onClick={async () => {
            setSub('Đang kiểm tra…')
            const { error } = await Api.ping(Prefs.userId())
            setSub(error ? `Server không phản hồi (${error})` : 'Đã kết nối Firebase')
          }} />
          <Cell icon={<Glyph name="refresh" />} tint="var(--cat-notes)" title="Đồng bộ lại từ cloud" onClick={async () => {
            setSub('Đang tải…'); reload(); setSub('Đã đồng bộ')
          }} />
          <Cell icon={<Glyph name="trash" />} tint="var(--danger)" title="Xoá toàn bộ dữ liệu" danger onClick={() => setAsk(true)} />
        </Card>
        <p className="footnote" style={{ margin: '8px 4px' }}>{sub}</p>
      </Section>

      <Section title="Giới thiệu">
        <Card>
          <Cell title="Phiên bản" value={import.meta.env.VITE_APP_VERSION} chevron={false} />
          <Cell title="Tác giả" value={import.meta.env.VITE_AUTHOR} chevron={false} />
          <Cell title="Nền tảng" value="React · web" chevron={false} />
        </Card>
      </Section>

      <Confirm open={ask} message="Xoá mọi chuyến đi và ghi chú? Không thể hoàn tác." confirmLabel="Xoá tất cả"
        onCancel={() => setAsk(false)}
        onConfirm={async () => {
          setAsk(false)
          await Api.deleteAllHikes(Prefs.userId())
          toast('Đã xoá toàn bộ dữ liệu'); reload()
        }} />
    </div>
  )
}

// --------------------------------------------------------------------- map

export function ExploreMap() {
  const nav = useNavigate()
  const toast = useToast()
  const ref = useRef(null)
  const [q, setQ] = useState('')
  const pick = new URLSearchParams(window.location.search).get('pick') === '1'

  useEffect(() => {
    let map
    ;(async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      map = L.map(ref.current, { zoomControl: false }).setView([21.028, 105.804], 6)
      L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap, © OpenStreetMap', maxZoom: 17,
      }).addTo(map)

      const { data: hikes } = await Api.listHikes(Prefs.userId())
      const pins = (hikes || []).filter((h) => h.location_lat && h.location_lng)
      pins.forEach((h) => {
        L.circleMarker([h.location_lat, h.location_lng], { radius: 8, color: '#fff', weight: 2, fillColor: '#34C759', fillOpacity: 1 })
          .addTo(map).bindPopup(`<b>${h.name}</b><br>${h.location}`)
      })
      if (pins.length) map.fitBounds(pins.map((h) => [h.location_lat, h.location_lng]), { padding: [50, 50] })

      if (pick) {
        map.on('click', (e) => {
          const draft = JSON.parse(sessionStorage.getItem('draft') || '{}')
          sessionStorage.setItem('draft', JSON.stringify({
            ...draft, location_lat: +e.latlng.lat.toFixed(5), location_lng: +e.latlng.lng.toFixed(5),
          }))
          toast('Đã ghim vị trí')
          nav(-1)
        })
      }
    })()
    return () => map?.remove()
  }, [pick, nav, toast])

  return (
    <div className="map-full">
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div className="search-pill">
        <button className="back" style={{ padding: 0 }} onClick={() => nav(-1)}>‹</button>
        <input placeholder={pick ? 'Chạm lên bản đồ để ghim vị trí' : 'Tìm địa điểm'} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
    </div>
  )
}
