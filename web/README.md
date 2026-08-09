# M-Hike Web (React)

Bản web của M-Hike: **cùng màn hình, cùng tính năng, cùng một Realtime Database** với bản Android.
Không phải bản rút gọn — cùng design language v3/v4, cùng luồng, cùng tên field.

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # ra thư mục dist/
```

## Cấu hình

`.env` (đã gitignore, mẫu ở `.env.example`):

```env
VITE_API_BASE_URL=https://mhike-legiahu-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_GOOGLE_CLIENT_ID=264447937354-....apps.googleusercontent.com
```

Hai giá trị này **phải trùng** với bản Android (`.env` gốc repo và `strings.xml > server_client_id`).
Cùng OAuth client + cùng tài khoản Google ⇒ claim `sub` giống hệt ⇒ hai app đọc chung node
`users/{sub}`. Khác client id là ra hai uid khác nhau, dữ liệu không gặp nhau.

**Trước khi đăng nhập được**, thêm origin vào Google Cloud Console → APIs & Services →
Credentials → OAuth client (Web) → *Authorized JavaScript origins*:
`http:

## Bản đồ so sánh với Android

| Android | Web | Ghi chú |
|---|---|---|
| `net/Api.java` | `src/api.js` | cùng 6 endpoint, cùng hợp đồng `{data, error}` |
| `util/Prefs.java` (SharedPreferences) | `src/store.js` (localStorage) | bản sao local của hồ sơ cloud |
| `res/values/colors.xml`, `styles.xml` | `src/theme.css` | cùng token màu, bo góc, thang chữ |
| `ui/BottomNav`, `RingView`, `BarChartView` | `src/ui.jsx` | glass tab bar, activity ring, bar chart |
| 19 Activity | 18 route trong `src/App.jsx` | MapPicker gộp vào `/map?pick=1` |
| SQLite là nguồn dữ liệu chính | **Firebase là nguồn dữ liệu chính** | xem "Điểm khác" bên dưới |

Đầy đủ tính năng coursework: (a) nhập chuyến đi + validate + màn xác nhận, (b) CRUD + xoá tất cả,
(c) nhiều ghi chú mỗi chuyến đi, (d) tìm theo tên + tìm nâng cao. Cộng thêm: hồ sơ/BMI, kế hoạch
tập luyện, thống kê, bản đồ, phiên 14 ngày, form bắt buộc cho tài khoản mới.

## Điểm khác vì nền tảng

| Chỗ | Android | Web |
|---|---|---|
| Lưu trữ | SQLite trên máy, cloud là bản sao lưu | ghi thẳng Firebase (trình duyệt không có SQLite) |
| Bản đồ | osmdroid | Leaflet, cùng tile OpenTopoMap |
| Ảnh | file trong bộ nhớ app | chưa làm — cần Firebase Storage |
| Kế hoạch tập | SQLite cục bộ | localStorage cục bộ (cả hai đều không đồng bộ) |

## ⚠️ Một điểm sắc phải biết khi dùng chung database

Android **push cả cây**: bấm *Settings → Sao lưu lên cloud* sẽ thay toàn bộ `hikes` +
`observations` bằng đúng những gì có trong SQLite của máy đó.

> Vừa tạo chuyến đi trên web → sang Android bấm **Sao lưu** ngay ⇒ chuyến đi đó **biến mất**.

Thứ tự an toàn trên Android: **Khôi phục từ cloud trước, Sao lưu sau.**

Muốn bỏ hẳn cái bẫy này thì đổi Android sang ghi/xoá từng node (`hikes/h_{id}`) thay vì push cả
cây — khoảng 20 dòng trong `HikeDao`/`Api.java`. Chưa làm vì đó là đổi ngữ nghĩa đồng bộ của bản
Android, cần bạn quyết.

## Cấu trúc

```
src/
  api.js        toàn bộ phần gọi server — bản sinh đôi của Api.java
  store.js      Prefs (localStorage), phiên 14 ngày, Google Sign-In, BMI, format
  theme.css     design token v3 + v4
  ui.jsx        NavBar, Card/Cell, Segmented, Chips, Ring, BarChart, Sheet, Toast, TabBar, Glyph
  App.jsx       route + guard phiên đăng nhập
  screens/
    Onboard.jsx  Splash, Onboarding, Login, EditProfile (form bắt buộc)
    Home.jsx     bảng điều khiển
    Hikes.jsx    danh sách, tạo/sửa, màn xác nhận, chi tiết
    Notes.jsx    ghi chú: danh sách, thêm/sửa, chi tiết
    More.jsx     tìm kiếm, thống kê, kế hoạch, hồ sơ, cài đặt, bản đồ
```
