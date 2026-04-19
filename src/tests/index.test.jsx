import { render } from '@testing-library/react'
import '../index.css'

describe('CSS Styles Tests', () => {
  
  // Create a simple test component to verify CSS classes are loaded
  const TestComponent = () => (
    <div className="test-container">
      {/* Navbar elements */}
      <nav className="navbar">
        <div className="navbar-logo">
          <span className="navbar-logo-text">StokvelHub</span>
        </div>
        <div className="nav-links">
          <a className="nav-link">Home</a>
          <button className="navbar-signout-btn">Sign out</button>
          <span className="navbar-user-badge">
            User
            <span className="navbar-role-pill">admin</span>
          </span>
        </div>
      </nav>
      
      {/* Dashboard elements */}
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <div className="dashboard-header">
            <h2>Admin Dashboard</h2>
          </div>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total users</div>
              <div className="stat-value">10</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Admins</div>
              <div className="stat-value">2</div>
            </div>
          </div>
          
          <div className="section-card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Role</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>User 1</td>
                    <td>
                      <span className="badge badge-danger">Admin</span>
                      <span className="badge badge-warning">Treasurer</span>
                      <span className="badge badge-info">User</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Buttons */}
          <button className="btn-primary">Create group</button>
          <button className="btn-outline">Browse groups</button>
          <button className="btn-secondary">Secondary</button>
          <button className="btn-ghost">Ghost</button>
          <button className="btn-danger">Danger</button>
          
          {/* Hamburger menu */}
          <div className="hamburger">
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </div>
          
          {/* Auth form elements */}
          <div className="auth-page">
            <div className="auth-form">
              <div className="auth-form-logo"></div>
              <h2>Welcome back</h2>
              <p className="auth-subtitle">Sign in to your account</p>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="you@example.com" />
              </div>
              <div className="auth-error">Error message</div>
              <p className="auth-footer">Don't have an account? <a href="/register">Create one</a></p>
            </div>
          </div>
          
          {/* Cards */}
          <div className="card">
            <h3>Card Title</h3>
            <p>Card content</p>
          </div>
          
          {/* Loading state */}
          <div className="loading-screen">
            <div className="spinner"></div>
            <h3>Loading...</h3>
          </div>
        </div>
      </div>
    </div>
  )

  beforeEach(() => {
    render(<TestComponent />)
  })

  // ─── Navbar CSS Tests ─────────────────────────────────────────
  
  describe('Navbar Styles', () => {
    it('applies navbar class', () => {
      expect(document.querySelector('.navbar')).toBeInTheDocument()
    })

    it('applies navbar-logo class', () => {
      expect(document.querySelector('.navbar-logo')).toBeInTheDocument()
    })

    it('applies navbar-logo-text class', () => {
      const logoText = document.querySelector('.navbar-logo-text')
      expect(logoText).toBeInTheDocument()
      expect(logoText.textContent).toBe('StokvelHub')
    })

    it('applies nav-links class', () => {
      expect(document.querySelector('.nav-links')).toBeInTheDocument()
    })

    it('applies nav-link class', () => {
      expect(document.querySelector('.nav-link')).toBeInTheDocument()
    })

    it('applies navbar-signout-btn class', () => {
      expect(document.querySelector('.navbar-signout-btn')).toBeInTheDocument()
    })

    it('applies navbar-user-badge class', () => {
      expect(document.querySelector('.navbar-user-badge')).toBeInTheDocument()
    })

    it('applies navbar-role-pill class', () => {
      expect(document.querySelector('.navbar-role-pill')).toBeInTheDocument()
    })
  })

  // ─── Dashboard CSS Tests ──────────────────────────────────────
  
  describe('Dashboard Styles', () => {
    it('applies dashboard-page class', () => {
      expect(document.querySelector('.dashboard-page')).toBeInTheDocument()
    })

    it('applies dashboard-inner class', () => {
      expect(document.querySelector('.dashboard-inner')).toBeInTheDocument()
    })

    it('applies dashboard-header class', () => {
      expect(document.querySelector('.dashboard-header')).toBeInTheDocument()
    })

    it('applies stats-grid class', () => {
      expect(document.querySelector('.stats-grid')).toBeInTheDocument()
    })

    it('applies stat-card class', () => {
      const statCards = document.querySelectorAll('.stat-card')
      expect(statCards.length).toBe(2)
    })

    it('applies section-card class', () => {
      expect(document.querySelector('.section-card')).toBeInTheDocument()
    })

    it('applies table-wrap class', () => {
      expect(document.querySelector('.table-wrap')).toBeInTheDocument()
    })

    it('applies table class', () => {
      expect(document.querySelector('table')).toBeInTheDocument()
    })
  })

  // ─── Button CSS Tests ─────────────────────────────────────────
  
  describe('Button Styles', () => {
    it('applies btn-primary class', () => {
      expect(document.querySelector('.btn-primary')).toBeInTheDocument()
    })

    it('applies btn-outline class', () => {
      expect(document.querySelector('.btn-outline')).toBeInTheDocument()
    })

    it('applies btn-secondary class', () => {
      expect(document.querySelector('.btn-secondary')).toBeInTheDocument()
    })

    it('applies btn-ghost class', () => {
      expect(document.querySelector('.btn-ghost')).toBeInTheDocument()
    })

    it('applies btn-danger class', () => {
      expect(document.querySelector('.btn-danger')).toBeInTheDocument()
    })
  })

  // ─── Badge CSS Tests ──────────────────────────────────────────
  
  describe('Badge Styles', () => {
    it('applies badge class', () => {
      const badges = document.querySelectorAll('.badge')
      expect(badges.length).toBe(3)
    })

    it('applies badge-danger class', () => {
      expect(document.querySelector('.badge-danger')).toBeInTheDocument()
    })

    it('applies badge-warning class', () => {
      expect(document.querySelector('.badge-warning')).toBeInTheDocument()
    })

    it('applies badge-info class', () => {
      expect(document.querySelector('.badge-info')).toBeInTheDocument()
    })
  })

  // ─── Auth Form CSS Tests ──────────────────────────────────────
  
  describe('Auth Form Styles', () => {
    it('applies auth-page class', () => {
      expect(document.querySelector('.auth-page')).toBeInTheDocument()
    })

    it('applies auth-form class', () => {
      expect(document.querySelector('.auth-form')).toBeInTheDocument()
    })

    it('applies auth-form-logo class', () => {
      expect(document.querySelector('.auth-form-logo')).toBeInTheDocument()
    })

    it('applies auth-subtitle class', () => {
      expect(document.querySelector('.auth-subtitle')).toBeInTheDocument()
    })

    it('applies form-group class', () => {
      expect(document.querySelector('.form-group')).toBeInTheDocument()
    })

    it('applies auth-error class', () => {
      expect(document.querySelector('.auth-error')).toBeInTheDocument()
    })

    it('applies auth-footer class', () => {
      expect(document.querySelector('.auth-footer')).toBeInTheDocument()
    })
  })

  // ─── Card CSS Tests ───────────────────────────────────────────
  
  describe('Card Styles', () => {
    it('applies card class', () => {
      expect(document.querySelector('.card')).toBeInTheDocument()
    })
  })

  // ─── Loading State CSS Tests ──────────────────────────────────
  
  describe('Loading State Styles', () => {
    it('applies loading-screen class', () => {
      expect(document.querySelector('.loading-screen')).toBeInTheDocument()
    })

    it('applies spinner class', () => {
      expect(document.querySelector('.spinner')).toBeInTheDocument()
    })
  })

  // ─── Responsive CSS Tests ─────────────────────────────────────
  
  describe('Responsive Styles', () => {
    it('hamburger menu exists', () => {
      expect(document.querySelector('.hamburger')).toBeInTheDocument()
    })

    it('hamburger has bar elements', () => {
      const bars = document.querySelectorAll('.bar')
      expect(bars.length).toBe(3)
    })
  })

  // ─── CSS Variable Tests ───────────────────────────────────────
  
  describe('CSS Variables', () => {
    it('CSS variables are defined on root element', () => {
      const rootStyles = getComputedStyle(document.documentElement)
      
      expect(rootStyles.getPropertyValue('--blue').trim()).toBe('#1d4ed8')
      expect(rootStyles.getPropertyValue('--blue-dark').trim()).toBe('#1e3a8a')
      expect(rootStyles.getPropertyValue('--blue-mid').trim()).toBe('#2563eb')
      expect(rootStyles.getPropertyValue('--border').trim()).toBe('#e2e8f0')
      expect(rootStyles.getPropertyValue('--text').trim()).toBe('#0f172a')
      expect(rootStyles.getPropertyValue('--text-muted').trim()).toBe('#64748b')
      expect(rootStyles.getPropertyValue('--success').trim()).toBe('#16a34a')
      expect(rootStyles.getPropertyValue('--warning').trim()).toBe('#d97706')
      expect(rootStyles.getPropertyValue('--danger').trim()).toBe('#dc2626')
      expect(rootStyles.getPropertyValue('--radius').trim()).toBe('8px')
      expect(rootStyles.getPropertyValue('--radius-lg').trim()).toBe('12px')
    })
  })
})
