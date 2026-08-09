import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Api, searchByName } from '../api'
import { DIFF_COLOR, Prefs, fmt } from '../store'
import { Glyph, Card, Cell, Confirm, Empty, Field, LargeTitle, NavBar, Section, Segmented, Spinner, Tag, useToast } from '../ui'


const DIFFICULTIES = ['Easy', 'Moderate', 'Hard']
const STATUSES = ['Planned', 'Completed']
const PRIORITIES = ['Must do', 'Soon', 'Someday']
const VISIBILITIES = ['Private', 'Friends', 'Public']
const KIT = ['Bản đồ & la bàn', 'Sơ cứu', 'Đèn pin', 'Áo mưa', 'Nước', 'Đồ ăn nhẹ']

export function useHikes() {
  const [hikes, setHikes] = useState(null)
  const [error, setError] = useState(null)
  const reload = async () => {
    const { data, error } = await Api.listHikes(Prefs.userId())
    setError(error); setHikes(data || [])
  }
  useEffect(() => { reload() }, [])
  return { hikes, error, reload }
}

export function HikeCard({ hike, onClick }) {
  return (
    <button className="cell" onClick={onClick} style={{ alignItems: 'flex-start' }}>
      <span className="icon-tile" style={{ background: DIFF_COLOR[hike.difficulty] || 'var(--cat-hikes)' }}><Glyph name="mountain" /></span>
      <span className="grow">
        <span className="headline" style={{ display: 'block' }}>
          {hike.name} {hike.favourite ? '★' : ''}
        </span>
        <span className="footnote" style={{ display: 'block' }}>
          {hike.location} · {fmt.date(hike.hike_date)}
        </span>
        <span style={{ display: 'inline-flex', gap: 6, marginTop: 6 }}>
          <Tag color={DIFF_COLOR[hike.difficulty]}>{hike.difficulty}</Tag>
          <Tag color="var(--label3)">{fmt.km(hike.length_km)}</Tag>
          {hike.status === 'Completed' && <Tag color="var(--cat-hikes)">Hoàn thành</Tag>}
        </span>
      </span>
      <span className="chevron">›</span>
    </button>
  )
}

export function HikeList() {
  const nav = useNavigate()
  const toast = useToast()
  const { hikes, reload } = useHikes()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')
  const [askReset, setAskReset] = useState(false)

  const shown = useMemo(() => {
    let list = searchByName(hikes || [], q)
    if (filter === 'Planned') list = list.filter((h) => h.status !== 'Completed')
    if (filter === 'Completed') list = list.filter((h) => h.status === 'Completed')
    if (filter === 'Favourites') list = list.filter((h) => h.favourite)
    return list
  }, [hikes, q, filter])

  if (!hikes) return <div className="screen"><Spinner /></div>

  const logged = hikes.filter((h) => h.status === 'Completed').length
  return (
    <div className="screen">
      <LargeTitle sub={`${logged} đã ghi · ${hikes.length - logged} dự kiến`}>Chuyến đi của bạn</LargeTitle>
      <Field>
        <input placeholder="Tìm chuyến đi theo tên" value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      <Segmented
        options={[{ value: 'All', label: 'Tất cả' }, { value: 'Planned', label: 'Dự kiến' },
                  { value: 'Completed', label: 'Hoàn thành' }, { value: 'Favourites', label: 'Yêu thích' }]}
        value={filter} onChange={setFilter}
      />
      <div style={{ height: 14 }} />
      {shown.length === 0 ? (
        <Empty>{hikes.length ? 'Không có chuyến đi nào khớp.' : 'Chưa có chuyến đi. Chạm + để thêm.'}</Empty>
      ) : (
        <Card>{shown.map((h) => <HikeCard key={h.id} hike={h} onClick={() => nav(`/hikes/${h.id}`)} />)}</Card>
      )}
      {hikes.length > 0 && (
        <>
          <div className="section-header">Dữ liệu</div>
          <Card><Cell title="Xoá tất cả chuyến đi" danger chevron={false} onClick={() => setAskReset(true)} /></Card>
        </>
      )}
      <button className="fab" onClick={() => nav('/hikes/new')}>+</button>
      <Confirm
        open={askReset}
        message="Xoá tất cả chuyến đi? Thao tác này đặt lại cơ sở dữ liệu và không thể hoàn tác."
        confirmLabel="Xoá tất cả"
        onCancel={() => setAskReset(false)}
        onConfirm={async () => {
          setAskReset(false)
          await Api.deleteAllHikes(Prefs.userId())
          toast('Đã xoá toàn bộ dữ liệu')
          reload()
        }}
      />
    </div>
  )
}

const EMPTY_HIKE = {
  name: '', location: '', hike_date: fmt.today(), parking: 0, length_km: '', difficulty: null,
  description: '', start_time: '', duration_hours: '', trail_type: '', weather: '', budget: '',
  equipment: '', emergency_contact: '', tags: '', priority: '', visibility: 'Private',
  favourite: 0, status: 'Planned',
}

export function CreateHike() {
  const nav = useNavigate()
  const { id } = useParams()
  const editing = !!id
  const [f, setF] = useState(null)
  const [errs, setErrs] = useState({})

  useEffect(() => {
    if (!editing) {
      const draft = sessionStorage.getItem('draft')
      setF(draft ? JSON.parse(draft) : EMPTY_HIKE)
      return
    }
    Api.getHike(Prefs.userId(), id).then(({ data }) => setF(data ? { ...EMPTY_HIKE, ...data } : EMPTY_HIKE))
  }, [id, editing])

  if (!f) return <div className="screen"><Spinner /></div>
  const set = (k, v) => setF({ ...f, [k]: v })
  const on = (k) => (e) => set(k, e.target.value)

  function review() {
    const e = {}
    if (!f.name.trim()) e.name = 'Bắt buộc'
    if (!f.location.trim()) e.location = 'Bắt buộc'
    if (!f.hike_date) e.hike_date = 'Bắt buộc'
    if (f.length_km === '' || isNaN(Number(f.length_km))) e.length_km = f.length_km === '' ? 'Bắt buộc' : 'Nhập một số'
    if (!f.difficulty) e.difficulty = 'Chọn độ khó'
    setErrs(e)
    if (Object.keys(e).length) return
    sessionStorage.setItem('draft', JSON.stringify(f))
    nav('/hikes/confirm')
  }

  const kit = f.equipment ? f.equipment.split(',').filter(Boolean) : []
  return (
    <div className="screen no-tabs">
      <NavBar title={editing ? 'Sửa chuyến đi' : 'Chuyến đi mới'} />
      <div className="secondary" style={{ margin: '0 4px 14px' }}>
        {editing ? 'Đang chỉnh sửa' : 'Bước 1/2 · gần như không cần gõ'}
      </div>

      <Section title="Thông tin chính">
        <Card style={{ padding: 14 }}>
          <Field label="Tên chuyến đi *" error={errs.name}><input value={f.name} onChange={on('name')} /></Field>
          <Field label="Địa điểm *" error={errs.location}><input value={f.location} onChange={on('location')} /></Field>
          <div className="row2">
            <Field label="Ngày *" error={errs.hike_date}><input type="date" value={f.hike_date} onChange={on('hike_date')} /></Field>
            <Field label="Giờ bắt đầu"><input type="time" value={f.start_time} onChange={on('start_time')} /></Field>
          </div>
          <Field label="Độ khó *" error={errs.difficulty}>
            <Segmented options={DIFFICULTIES} value={f.difficulty} onChange={(v) => set('difficulty', v)} />
          </Field>
        </Card>
      </Section>

      <Section title="Lộ trình">
        <Card style={{ padding: 14 }}>
          <div className="row2">
            <Field label="Khoảng cách (km) *" error={errs.length_km}>
              <input value={f.length_km} onChange={on('length_km')} inputMode="decimal" />
            </Field>
            <Field label="Thời lượng (giờ)">
              <input value={f.duration_hours} onChange={on('duration_hours')} inputMode="decimal" />
            </Field>
          </div>
          <Field label="Loại đường mòn"><input value={f.trail_type} onChange={on('trail_type')} /></Field>
          <Cell
            title="Có chỗ đậu xe" chevron={false}
            value={<input type="checkbox" checked={!!f.parking} onChange={(e) => set('parking', e.target.checked ? 1 : 0)} />}
          />
        </Card>
      </Section>

      <Section title="Điều kiện & chi phí">
        <Card style={{ padding: 14 }}>
          <Field label="Thời tiết dự kiến"><input value={f.weather} onChange={on('weather')} /></Field>
          <Field label="Ngân sách (£)"><input value={f.budget} onChange={on('budget')} inputMode="decimal" /></Field>
        </Card>
      </Section>

      <Section title="Trang bị & an toàn">
        <Card style={{ padding: 14 }}>
          <Field label="Danh sách trang bị">
            <div className="chips">
              {KIT.map((k) => (
                <button key={k} className="chip" aria-pressed={kit.includes(k)}
                  onClick={() => set('equipment', (kit.includes(k) ? kit.filter((x) => x !== k) : [...kit, k]).join(','))}>
                  {k}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Liên hệ khẩn cấp"><input value={f.emergency_contact} onChange={on('emergency_contact')} /></Field>
        </Card>
      </Section>

      <Section title="Ghi chú & thêm">
        <Card style={{ padding: 14 }}>
          <Field label="Thẻ (cách nhau bởi dấu phẩy)"><input value={f.tags} onChange={on('tags')} /></Field>
          <Field label="Ưu tiên"><Segmented options={PRIORITIES} value={f.priority} onChange={(v) => set('priority', v)} /></Field>
          <Field label="Hiển thị"><Segmented options={VISIBILITIES} value={f.visibility} onChange={(v) => set('visibility', v)} /></Field>
          <Field label="Mô tả"><textarea rows={3} value={f.description} onChange={on('description')} /></Field>
        </Card>
      </Section>

      <div style={{ height: 20 }} />
      <button className="btn" onClick={review}>{editing ? 'Xem lại thay đổi' : 'Xem lại'}</button>
      <div style={{ height: 10 }} />
      <button className="btn secondary" onClick={() => nav(-1)}>Huỷ</button>
    </div>
  )
}

export function ConfirmHike() {
  const nav = useNavigate()
  const toast = useToast()
  const draft = useMemo(() => JSON.parse(sessionStorage.getItem('draft') || 'null'), [])
  if (!draft) { nav('/hikes', { replace: true }); return null }

  const rows = [
    ['Địa điểm', draft.location],
    ['Ngày & giờ', draft.start_time ? `${fmt.date(draft.hike_date)} · ${draft.start_time}` : fmt.date(draft.hike_date)],
    ['Khoảng cách · thời lượng', draft.duration_hours ? `${fmt.km(draft.length_km)} · ~${draft.duration_hours} h` : fmt.km(draft.length_km)],
    ['Loại đường mòn', draft.trail_type],
    ['Đậu xe', draft.parking ? 'Có' : 'Không'],
    ['Thời tiết', draft.weather],
    ['Ngân sách', draft.budget ? `£${draft.budget}` : ''],
    ['Trang bị đã mang', draft.equipment],
    ['Liên hệ khẩn cấp', draft.emergency_contact],
    ['Ưu tiên · hiển thị', [draft.priority, draft.visibility].filter(Boolean).join(' · ')],
    ['Thẻ', draft.tags],
    ['Mô tả', draft.description],
  ].filter(([, v]) => v)

  async function save() {
    const row = {
      ...draft,
      length_km: Number(draft.length_km) || 0,
      duration_hours: draft.duration_hours ? Number(draft.duration_hours) : null,
      budget: draft.budget ? Number(draft.budget) : null,
    }
    const { error } = await Api.saveHike(Prefs.userId(), row)
    sessionStorage.removeItem('draft')
    toast(error ? `Lưu thất bại (${error})` : draft.id ? 'Đã cập nhật chuyến đi' : 'Đã lưu chuyến đi')
    nav('/hikes', { replace: true })
  }

  return (
    <div className="screen no-tabs">
      <NavBar title="Ổn chứ?" />
      <div className="secondary" style={{ margin: '0 4px 14px' }}>Bước 2/2 · xác nhận</div>
      <Card hero>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <h2 className="title" style={{ flex: 1 }}>{draft.name}</h2>
          <Tag color={DIFF_COLOR[draft.difficulty]}>{draft.difficulty}</Tag>
        </div>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: '1px solid var(--sep)' }}>
            <span className="footnote" style={{ flex: 1 }}>{k}</span>
            <span className="footnote" style={{ color: 'var(--label)', textAlign: 'right', flex: 1.4 }}>{v}</span>
          </div>
        ))}
      </Card>
      <div style={{ height: 18 }} />
      <button className="btn" onClick={save}>Lưu chuyến đi</button>
      <div style={{ height: 10 }} />
      <button className="btn secondary" onClick={() => nav(-1)}>Sửa chi tiết</button>
    </div>
  )
}

export function HikeDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [hike, setHike] = useState(null)
  const [obs, setObs] = useState([])
  const [ask, setAsk] = useState(false)

  const load = async () => {
    const [{ data: h }, { data: o }] = await Promise.all([
      Api.getHike(Prefs.userId(), id),
      Api.listObservationsByHike(Prefs.userId(), id),
    ])
    setHike(h); setObs(o || [])
  }
  useEffect(() => { load() }, [id])   // eslint-disable-line react-hooks/exhaustive-deps

  if (!hike) return <div className="screen"><Spinner /></div>

  const toggleFav = async () => {
    const next = { ...hike, favourite: hike.favourite ? 0 : 1 }
    setHike(next)
    await Api.saveHike(Prefs.userId(), next)
  }

  return (
    <div className="screen no-tabs">
      <NavBar action={{ label: hike.favourite ? '★' : '☆', onClick: toggleFav }} />
      <LargeTitle sub={`${hike.location} · ${fmt.date(hike.hike_date)}`}>{hike.name}</LargeTitle>
      <div style={{ display: 'flex', gap: 8, margin: '4px 0 16px' }}>
        <Tag color={DIFF_COLOR[hike.difficulty]}>{hike.difficulty}</Tag>
        <Tag color="var(--label3)">{fmt.km(hike.length_km)}</Tag>
        <Tag color={hike.status === 'Completed' ? 'var(--cat-hikes)' : 'var(--label3)'}>
          {hike.status === 'Completed' ? 'Hoàn thành' : 'Dự kiến'}
        </Tag>
      </div>

      <Card>
        <Cell icon={<Glyph name="clock" />} tint="var(--cat-notes)" title="Thời lượng" value={hike.duration_hours ? `${hike.duration_hours} h` : '—'} chevron={false} />
        <Cell icon={<Glyph name="parking" />} tint="var(--cat-search)" title="Đậu xe" value={hike.parking ? 'Có' : 'Không'} chevron={false} />
        <Cell icon={<Glyph name="cloud" />} tint="var(--label2)" title="Thời tiết" value={hike.weather || '—'} chevron={false} />
        <Cell icon={<Glyph name="money" />} tint="var(--cat-stats)" title="Ngân sách" value={hike.budget ? `£${hike.budget}` : '—'} chevron={false} />
        <Cell icon={<Glyph name="alert" />} tint="var(--danger)" title="Khẩn cấp" value={hike.emergency_contact || '—'} chevron={false} />
      </Card>

      {hike.description && (
        <Section title="Mô tả"><Card style={{ padding: 14 }}><p className="body" style={{ margin: 0 }}>{hike.description}</p></Card></Section>
      )}

      <Section title={`Ghi chú thực địa · ${obs.length}`}>
        <Card>
          {obs.map((o) => (
            <Cell key={o.id} icon={<Glyph name="pencil" />} tint="var(--cat-notes)" title={o.observation} value={o.obs_time?.slice(11)}
              onClick={() => nav(`/notes/${o.id}`)} />
          ))}
          <Cell icon="+" tint="var(--cat-hikes)" title="Thêm ghi chú" onClick={() => nav(`/notes/new?hike=${hike.id}`)} />
        </Card>
      </Section>

      <div style={{ height: 20 }} />
      <button className="btn secondary" onClick={() => nav(`/hikes/${hike.id}/edit`)}>Sửa</button>
      <div style={{ height: 10 }} />
      <button className="btn danger" onClick={() => setAsk(true)}>Xoá chuyến đi</button>

      <Confirm
        open={ask} message="Xoá chuyến đi này? Ghi chú thuộc chuyến đi cũng bị xoá theo."
        onCancel={() => setAsk(false)}
        onConfirm={async () => {
          await Api.deleteHike(Prefs.userId(), hike.id)
          toast(`Đã xoá "${hike.name}"`)
          nav('/hikes', { replace: true })
        }}
      />
    </div>
  )
}
