M-Hike ⛰️
M-Hike là ứng dụng di động đi bộ đường dài (hiking) đa nền tảng dành cho iOS và Android. Giữa rừng sâu hay đồi núi khi điện thoại mất kết nối mạng – đó lại là lúc bạn cần đến bản đồ và thông tin hành trình nhất. M-Hike được xây dựng với nguyên tắc lõi: mọi thứ phải hoạt động hoàn hảo khi không có mạng, và tự động đồng bộ (sync) ngay khi có Internet trở lại.

🛠 Các Công Nghệ & Kỹ Thuật Cốt Lõi
M-Hike được phát triển dựa trên các công nghệ và giải pháp hiện đại nhằm tối ưu hóa trải nghiệm Offline-first:

Core Framework: React Native & Expo (Cho phép build ứng dụng mượt mà trên cả hai nền tảng iOS/Android từ một codebase).
Ngôn Ngữ: TypeScript (Kiểm soát kiểu dữ liệu chặt chẽ, hạn chế bug ở runtime).
Cơ Sở Dữ Liệu Cục Bộ (Offline-first): SQLite (Lưu trữ toàn bộ dữ liệu người dùng, điểm đánh dấu, và lộ trình ngay trên thiết bị, đảm bảo app luôn dùng được khi không có WiFi/4G).
Đồng Bộ Đám Mây (Cloud Backend): Firebase (Đảm nhiệm vai trò đồng bộ hóa hai chiều tự động khi thiết bị bắt được mạng trở lại, tránh mất mát dữ liệu).
Bản Đồ & Định Vị: Leaflet (Tích hợp bản đồ trực quan, tối ưu hóa hiển thị route/địa điểm).
API Thời Tiết: Open-Meteo (Tích hợp dữ liệu thời tiết theo thời gian thực để cảnh báo tình hình thời tiết tại điểm đi bộ).
Native Modules: Tích hợp mã Java / Android thuần để xử lý các tác vụ yêu cầu can thiệp sâu vào hệ thống hoặc phần cứng thiết bị.
🚀 Các Tính Năng Nổi Bật
Kiến Trúc Offline-First Toàn Diện

Lưu trữ dữ liệu chuyến đi cục bộ 100%. Mọi thao tác thêm, sửa, xóa nhật ký đều được ghi lại tức thời mà không bị gián đoạn loading mạng.
Đồng Bộ Dữ Liệu Thông Minh (Cloud Sync)

Hệ thống tự động phát hiện trạng thái kết nối mạng để "đẩy" (push) dữ liệu lên mây và "kéo" (pull) các bản ghi mới về máy, giúp lưu trữ an toàn trọn đời.
Quản Lý Hành Trình (Hike Management)

Lên lịch & Theo dõi: Quản lý danh sách các chuyến đi đã hoàn thành, đang diễn ra hoặc đã lên lịch.
Yêu thích: Đánh dấu (bookmark) những cung đường đẹp để đi lại hoặc chia sẻ sau.
Chi Tiết Báo Cáo Chuyến Đi (Hike Details)

Theo dõi sát sao các chỉ số như: cấp độ khó của cung đường, độ dài quãng đường, và năng lượng (calo) ước tính cần thiết cho chuyến đi.
Dự Báo Thời Tiết Trực Tiếp (Live Weather)

Cập nhật tức thời thông tin thời tiết tại tọa độ dự định đến, giúp người dùng có sự chuẩn bị tốt nhất để tránh mưa bão hay nắng gắt.
Hệ Thống Bản Đồ (Map & Navigation)

Hiển thị trực quan cung đường và vị trí các điểm dừng chân trên bản đồ tích hợp, giúp điều hướng dễ dàng.
Báo Động Khẩn Cấp (SOS / Emergency)

Nhanh chóng phát tín hiệu, lưu lại tọa độ định vị cuối cùng khi người dùng rơi vào tình trạng cần cứu hộ khẩn cấp.
Lưu ý: Đây là mã nguồn ứng dụng di động. Để trải nghiệm nhanh trên web mà không cần cài đặt ứng dụng, vui lòng truy cập phiên bản trình duyệt tại: hiking.hugowishpax.studio
