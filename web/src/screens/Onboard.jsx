import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Api, isProfileComplete } from '../api'
import { Prefs, decodeJwt, waitForGoogle } from '../store'
import { Glyph, Card, Field, NavBar, Segmented, Spinner, useToast } from '../ui'


export function Splash() {
  const nav = useNavigate()
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!Prefs.isOnboarded()) return nav('/onboarding', { replace: true })
      if (!Prefs.isLoggedIn()) return nav('/login', { replace: true })
      if (Prefs.sessionExpired()) {
        Prefs.logout()
        return nav('/login?expired=1', { replace: true })
      }
      const { data: profile, error } = await Promise.race([
        Api.getProfile(Prefs.userId()),
        new Promise((r) => setTimeout(() => r({ data: null, error: 'timeout' }), 5000)),
      ])
      if (error) return nav('/home', { replace: true })
      if (!profile) {
        Prefs.logout()
        return nav('/login?revoked=1', { replace: true })
      }
      Prefs.applyProfile(profile)
      nav(isProfileComplete(profile) ? '/home' : '/profile/edit?required=1', { replace: true })
    }, 900)
    return () => clearTimeout(t)
  }, [nav])

  return (
    <div className="screen no-tabs" style={{ display: 'grid', placeContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
      <div style={{ color: "var(--cat-hikes)" }}><Glyph name="mountain" size={56} stroke={1.4} /></div>
      <h1 className="large-title" style={{ marginTop: 8 }}>M-Hike</h1>
      <div className="secondary">Ghi lại mọi chuyến đi</div>
      <Spinner />
    </div>
  )
}

const PAGES = [
  { n: '01', title: 'Lên kế hoạch', body: 'Đặt tên, ghim vị trí, chọn ngày. Độ khó, trang bị, chỗ đậu xe — xong hết trước khi ra khỏi nhà.' },
  { n: '02', title: 'Ghi lại dọc đường', body: 'Ghi chú thực địa kèm ảnh, tình trạng đường, động thực vật và tâm trạng.' },
  { n: '03', title: 'Nhìn lại chặng đường', body: 'Thống kê quãng đường, độ khó và thành tích theo từng tuần.' },
]

export function Onboarding() {
  const nav = useNavigate()
  const [i, setI] = useState(0)
  const done = () => { Prefs.setOnboarded(); nav('/login', { replace: true }) }
  const p = PAGES[i]
  return (
    <div className="screen no-tabs" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="navbar">
        <span className="spacer" />
        <button className="nav-action" onClick={done}>Bỏ qua</button>
      </div>
      <div className="large-title" style={{ color: 'var(--accent)', opacity: .35, fontSize: 64 }}>{p.n}</div>
      <div style={{ flex: 1, display: 'grid', placeContent: 'center', color: 'var(--cat-hikes)' }}><Glyph name="mountain" size={96} stroke={1.1} /></div>
      <h2 className="large-title">{p.title}</h2>
      <p className="secondary" style={{ marginBottom: 24 }}>{p.body}</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {PAGES.map((_, k) => (
          <span key={k} style={{
            height: 4, borderRadius: 2, flex: k === i ? 2 : 1,
            background: k === i ? 'var(--accent)' : 'var(--fill2)',
          }} />
        ))}
      </div>
      <button className="btn" onClick={() => (i < PAGES.length - 1 ? setI(i + 1) : done())}>
        {i < PAGES.length - 1 ? 'Tiếp' : 'Bắt đầu'}
      </button>
    </div>
  )
}

export function Login() {
  const nav = useNavigate()
  const toast = useToast()
  const btnRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('expired')) toast('Phiên đăng nhập đã hết hạn sau 14 ngày. Đăng nhập lại nhé.')
    if (q.get('revoked')) toast('Dữ liệu trên cloud đã bị xoá. Đang đăng xuất.')
  }, [toast])

  useEffect(() => {
    let cancelled = false
    waitForGoogle()
      .then((gid) => {
        if (cancelled) return
        gid.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: (res) => onCredential(res.credential),
        })
        gid.renderButton(btnRef.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' })
      })
      .catch((e) => setErr(e.message))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onCredential(token) {
    const claims = decodeJwt(token)
    if (!claims?.sub) return setErr('Không đọc được thông tin tài khoản Google.')
    setBusy(true)

    Prefs.startSession(claims.sub)
    const { data: profile, error } = await Api.signIn(claims.sub, claims.name, claims.email)
    if (error) {
      Prefs.applyProfile({ name: claims.name, email: claims.email })
      return nav('/home', { replace: true })
    }
    Prefs.applyProfile(profile)
    nav(isProfileComplete(profile) ? '/home' : '/profile/edit?required=1', { replace: true })
  }

  return (
    <div className="screen no-tabs" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ color: "var(--cat-hikes)" }}><Glyph name="mountain" size={56} stroke={1.4} /></div>
        <h1 className="large-title">M-Hike</h1>
        <p className="secondary">Đăng nhập Google để đồng bộ chuyến đi giữa các thiết bị.</p>
      </div>
      {busy ? <Spinner /> : <div ref={btnRef} style={{ display: 'grid', placeItems: 'center' }} />}
      {err && <p className="footnote" style={{ color: 'var(--danger)', textAlign: 'center', marginTop: 16 }}>{err}</p>}
      <p className="caption" style={{ textAlign: 'center', marginTop: 28 }}>
        Tiếp tục nghĩa là bạn đồng ý với Điều khoản và Chính sách bảo mật.
      </p>
    </div>
  )
}

export function EditProfile() {
  const nav = useNavigate()
  const toast = useToast()
  const required = new URLSearchParams(window.location.search).get('required') === '1'
  const s = Prefs.all()
  const [f, setF] = useState({
    name: s.name || '', email: s.email || '', gender: s.gender || null,
    height_cm: s.height_cm || '', weight_kg: s.weight_kg || '', age: s.age || '',
  })
  const [errs, setErrs] = useState({})
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  function save() {
    if (required) {
      const e = {}
      if (!f.name.trim()) e.name = 'Bắt buộc'
      if (!(Number(f.height_cm) > 0)) e.height_cm = 'Bắt buộc'
      if (!(Number(f.weight_kg) > 0)) e.weight_kg = 'Bắt buộc'
      if (!(Number(f.age) > 0)) e.age = 'Bắt buộc'
      if (!f.gender) e.gender = 'Chọn giới tính'
      setErrs(e)
      if (Object.keys(e).length) return
    }
    const profile = {
      name: f.name.trim(), email: f.email.trim(), gender: f.gender,
      height_cm: Number(f.height_cm) || 0, weight_kg: Number(f.weight_kg) || 0, age: Number(f.age) || 0,
    }
    Prefs.applyProfile(profile)
    Api.saveProfile(Prefs.userId(), profile)
    toast('Đã lưu hồ sơ')
    nav(required ? '/home' : -1, required ? { replace: true } : undefined)
  }

  return (
    <div className="screen no-tabs">
      <NavBar title={required ? 'Hoàn tất hồ sơ' : 'Sửa hồ sơ'} back={!required} />
      <div style={{ textAlign: 'center', margin: '8px 0 20px' }}>
        <div className="avatar" style={{ margin: '0 auto', width: 84, height: 84, fontSize: 28 }}>{Prefs.initials()}</div>
      </div>
      <Card style={{ padding: 14 }}>
        <Field label={required ? 'Tên *' : 'Tên'} error={errs.name}>
          <input value={f.name} onChange={set('name')} placeholder="Tên hiển thị" />
        </Field>
        <Field label="Email">
          <input value={f.email} onChange={set('email')} inputMode="email" />
        </Field>
        <Field label="Giới tính" error={errs.gender}>
          <Segmented options={['Male', 'Female', 'Other']} value={f.gender} onChange={(v) => setF({ ...f, gender: v })} />
        </Field>
        <div className="row2">
          <Field label="Chiều cao (cm)" error={errs.height_cm}>
            <input value={f.height_cm} onChange={set('height_cm')} inputMode="numeric" />
          </Field>
          <Field label="Cân nặng (kg)" error={errs.weight_kg}>
            <input value={f.weight_kg} onChange={set('weight_kg')} inputMode="numeric" />
          </Field>
          <Field label="Tuổi" error={errs.age}>
            <input value={f.age} onChange={set('age')} inputMode="numeric" />
          </Field>
        </div>
      </Card>
      <div style={{ height: 18 }} />
      <button className="btn" onClick={save}>Lưu</button>
    </div>
  )
}
