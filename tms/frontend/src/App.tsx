export default function App() {
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', minHeight: '100vh', background: '#ecfeff', padding: 32 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 12, color: '#0f172a' }}>AURORA TMS</h1>
        <p style={{ color: '#475569', marginBottom: 24 }}>Hệ thống quản lý vận chuyển và giao nhận</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            ['Lộ trình', 'Quản lý chi tiết tuyến đường'],
            ['Đơn hàng', 'Theo dõi đơn và trạng thái'],
            ['Bảng điều khiển', 'Theo dõi hoạt động thời gian thực'],
            ['Giám sát', 'Báo cáo và phân tích'],
          ].map(([title, text]) => (
            <div key={title} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 8px 20px rgba(15,23,42,.06)' }}>
              <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>{title}</h3>
              <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
