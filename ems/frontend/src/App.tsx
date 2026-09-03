export default function App() {
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', minHeight: '100vh', background: '#f3f6fb', padding: 32 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 12, color: '#0d1b2e' }}>AURORA EMS</h1>
        <p style={{ color: '#475569', marginBottom: 24 }}>Hệ thống quản lý nhân sự</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            ['Nhân sự', 'Quản lý thông tin nhân viên'],
            ['Chấm công', 'Theo dõi giờ làm và nghỉ phép'],
            ['Phân ca', 'Lịch làm việc theo ca'],
            ['Đào tạo', 'Khóa học và chứng chỉ'],
          ].map(([title, text]) => (
            <div key={title} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 8px 20px rgba(15,23,42,.06)' }}>
              <h3 style={{ margin: '0 0 8px', color: '#0d1b2e' }}>{title}</h3>
              <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
