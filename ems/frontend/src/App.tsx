export default function App() {
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', minHeight: '100vh', background: '#f3f6fb', padding: 32 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 44,
            height: 44,
            background: '#f0b52d',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(240, 181, 45, 0.35)',
            flexShrink: 0
          }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#0b1220">
              <path d="M12 2l2.8 6.5 7 .6-5.3 4.7 1.6 6.9-6.1-3.6-6.1 3.6 1.6-6.9-5.3-4.7 7-.6z" />
            </svg>
          </div>
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: '0.04em', color: '#0d1b2e' }}>AURORA</div>
            <div style={{ fontSize: 9.5, letterSpacing: '0.36em', color: '#7a8fa6', fontWeight: 700, marginTop: 2 }}>CINEMA EMS</div>
          </div>
        </div>
        <p style={{ color: '#475569', marginBottom: 24 }}>Enterprise Management System - Quản lý nhân sự & vận hành doanh nghiệp</p>

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
