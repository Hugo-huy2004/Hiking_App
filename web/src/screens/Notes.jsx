import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Api } from '../api'
import { Prefs, fmt } from '../store'
import { Glyph, Card, Cell, Chips, Confirm, Empty, Field, LargeTitle, NavBar, Section, Segmented, Spinner, Tag, useToast } from '../ui'


const CONDITIONS = ['Dry', 'Muddy', 'Rocky', 'Icy']
const MOODS = ['Stoked', 'Calm', 'Beat']
const WILDLIFE = ['Chim', 'Hươu nai', 'Sóc', 'Bò', 'Cừu', 'Côn trùng']
const VEGETATION = ['Rừng thông', 'Cỏ lau', 'Dương xỉ', 'Hoa dại', 'Rêu']

export function Observations() {
  const nav = useNavigate()
  const [rows, setRows] = useState(null)
  useEffect(() => { Api.listObservations(Prefs.userId()).then(({ data }) => setRows(data || [])) }, [])
  if (!rows) return <div className="screen"><Spinner /></div>
  return (
    <div className="screen">
      <LargeTitle sub={`${rows.length} ghi chú`}>Ghi chú thực địa</LargeTitle>
      {rows.length === 0 ? <Empty>Chưa có ghi chú thực địa.</Empty> : (
        <Card>
          {rows.map((o) => (
            <Cell key={o.id} icon={<Glyph name="pencil" />} tint="var(--cat-notes)" title={o.observation} value={o.obs_time?.slice(0, 10)}
              onClick={() => nav(`/notes/${o.id}`)} />
          ))}
        </Card>
      )}
      <button className="fab" onClick={() => nav('/notes/new')}>+</button>
    </div>
  )
}

export function AddObservation() {
  const nav = useNavigate()
  const toast = useToast()
  const { id } = useParams()
  const [params] = useSearchParams()
  const editing = !!id
  const [hikes, setHikes] = useState([])
  const [f, setF] = useState(null)
  const [errs, setErrs] = useState({})

  useEffect(() => {
    Api.listHikes(Prefs.userId()).then(({ data }) => setHikes(data || []))
    if (editing) {
      Api.listObservations(Prefs.userId()).then(({ data }) => {
        const row = (data || []).find((o) => String(o.id) === String(id))
        setF(row || null)
      })
    } else {
      setF({
        hike_id: params.get('hike') || '', observation: '', obs_time: fmt.now(), detail: '',
        trail_condition: null, wildlife: '', vegetation: '', mood: null, rating: '', comments: '',
      })
    }
  }, [id, editing, params])

  if (!f) return <div className="screen"><Spinner /></div>
  const set = (k, v) => setF({ ...f, [k]: v })
  const on = (k) => (e) => set(k, e.target.value)
  const csv = (k) => (f[k] ? f[k].split(',').filter(Boolean) : [])

  async function save() {
    const e = {}
    if (!f.observation.trim()) e.observation = 'Bắt buộc'
    if (!f.obs_time) e.obs_time = 'Bắt buộc'
    if (!f.hike_id) e.hike_id = 'Chọn chuyến đi'
    setErrs(e)
    if (Object.keys(e).length) return

    const { error } = await Api.saveObservation(Prefs.userId(), {
      ...f, hike_id: Number(f.hike_id), rating: f.rating ? Number(f.rating) : null,
    })
    toast(error ? `Lưu thất bại (${error})` : editing ? 'Đã cập nhật ghi chú' : 'Đã lưu ghi chú')
    nav(-1)
  }

  return (
    <div className="screen no-tabs">
      <NavBar title={editing ? 'Sửa ghi chú' : 'Ghi chú mới'} />
      <Card style={{ padding: 14 }}>
        <Field label="Thuộc chuyến đi *" error={errs.hike_id}>
          <select value={f.hike_id} onChange={on('hike_id')}>
            <option value="">— Chọn —</option>
            {hikes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </Field>
        <Field label="Tiêu đề *" error={errs.observation}>
          <input value={f.observation} onChange={on('observation')} placeholder="Bạn thấy gì?" />
        </Field>
        <Field label="Thời điểm *" error={errs.obs_time}>
          <input type="datetime-local" value={(f.obs_time || '').replace(' ', 'T')}
            onChange={(e) => set('obs_time', e.target.value.replace('T', ' '))} />
        </Field>
        <Field label="Chi tiết"><textarea rows={3} value={f.detail} onChange={on('detail')} /></Field>
      </Card>

      <Section title="Điều kiện">
        <Card style={{ padding: 14 }}>
          <Field label="Tình trạng đường">
            <Segmented options={CONDITIONS} value={f.trail_condition} onChange={(v) => set('trail_condition', v)} />
          </Field>
          <Field label="Động vật">
            <Chips options={WILDLIFE} multi value={csv('wildlife')} onChange={(v) => set('wildlife', v.join(','))} />
          </Field>
          <Field label="Thực vật">
            <Chips options={VEGETATION} multi value={csv('vegetation')} onChange={(v) => set('vegetation', v.join(','))} />
          </Field>
          <Field label="Tâm trạng">
            <Segmented options={MOODS} value={f.mood} onChange={(v) => set('mood', v)} />
          </Field>
          <Field label="Đánh giá (0–5)">
            <input value={f.rating} onChange={on('rating')} inputMode="decimal" placeholder="4" />
          </Field>
        </Card>
      </Section>

      <Section title="Còn gì nữa không?">
        <Card style={{ padding: 14 }}>
          <Field><textarea rows={2} value={f.comments} onChange={on('comments')} placeholder="Tuỳ chọn" /></Field>
        </Card>
      </Section>

      <div style={{ height: 18 }} />
      <button className="btn" onClick={save}>Lưu ghi chú</button>
    </div>
  )
}

export function ObservationDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [row, setRow] = useState(null)
  const [hike, setHike] = useState(null)
  const [ask, setAsk] = useState(false)

  useEffect(() => {
    Api.listObservations(Prefs.userId()).then(async ({ data }) => {
      const o = (data || []).find((x) => String(x.id) === String(id))
      setRow(o || null)
      if (o?.hike_id) {
        const { data: h } = await Api.getHike(Prefs.userId(), o.hike_id)
        setHike(h)
      }
    })
  }, [id])

  if (!row) return <div className="screen"><Spinner /></div>
  const rows = [
    ['Thuộc chuyến đi', hike?.name],
    ['Thời điểm', row.obs_time],
    ['Tình trạng đường', row.trail_condition],
    ['Động vật', row.wildlife],
    ['Thực vật', row.vegetation],
    ['Tâm trạng', row.mood],
    ['Đánh giá', row.rating ? `${row.rating}/5` : ''],
    ['Ghi chú thêm', row.comments],
  ].filter(([, v]) => v)

  return (
    <div className="screen no-tabs">
      <NavBar action={{ label: 'Sửa', onClick: () => nav(`/notes/${row.id}/edit`) }} />
      <LargeTitle sub={row.obs_time}>{row.observation}</LargeTitle>
      {row.detail && <Card style={{ padding: 14, marginBottom: 14 }}><p className="body" style={{ margin: 0 }}>{row.detail}</p></Card>}
      <Card>{rows.map(([k, v]) => <Cell key={k} title={k} value={v} chevron={false} />)}</Card>
      <div style={{ height: 20 }} />
      <button className="btn danger" onClick={() => setAsk(true)}>Xoá ghi chú</button>
      <Confirm open={ask} message="Xoá ghi chú này?" onCancel={() => setAsk(false)}
        onConfirm={async () => {
          await Api.deleteObservation(Prefs.userId(), row.id)
          toast('Đã xoá ghi chú')
          nav(-1)
        }} />
    </div>
  )
}
