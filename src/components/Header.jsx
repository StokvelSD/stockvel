import '../index.css';

function Header() {
  return (
    <div className="admin-header-bar">
      <div>
        <div className="header-greeting">Good morning</div>
        <h4>Admin Portal</h4>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.85rem', fontWeight: 700, color: '#fff'
        }}>
          A
        </div>
      </div>
    </div>
  );
}

export default Header;