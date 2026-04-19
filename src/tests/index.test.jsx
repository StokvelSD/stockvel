import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import '../index.css'

// Mock Firebase
vi.mock('../firebase/firebase', () => ({
  db: {},
  auth: {}
}))

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' },
    role: 'admin',
    logout: vi.fn(),
    loading: false
  })
}))

// Import components after mocks - FIXED PATHS
import Navbar from '../components/Navbar'
import AdminPage from '../pages/AdminPage'

describe('CSS Styles Tests', () => {
  
  // ─── Navbar CSS Tests ─────────────────────────────────────────
  
  describe('Navbar Styles', () => {
    
    it('applies navbar class to navigation element', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )
      const navbar = document.querySelector('.navbar')
      expect(navbar).toBeInTheDocument()
    })

    it('applies navbar-logo class to logo link', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )
      const logo = document.querySelector('.navbar-logo')
      expect(logo).toBeInTheDocument()
    })

    it('applies navbar-logo-text class to logo text', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )
      const logoText = document.querySelector('.navbar-logo-text')
      expect(logoText).toBeInTheDocument()
      expect(logoText.textContent).toBe('StokvelHub')
    })

    it('applies nav-links class to navigation links container', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )
      const navLinks = document.querySelector('.nav-links')
      expect(navLinks).toBeInTheDocument()
    })

    it('applies nav-link class to each navigation link', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )
      const navLinks = document.querySelectorAll('.nav-link')
      expect(navLinks.length).toBeGreaterThan(0)
    })

    it('applies navbar-signout-btn class to sign out button', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )
      const signOutBtn = document.querySelector('.navbar-signout-btn')
      expect(signOutBtn).toBeInTheDocument()
    })

    it('applies navbar-user-badge class to user badge', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )
      const userBadge = document.querySelector('.navbar-user-badge')
      expect(userBadge).toBeInTheDocument()
    })

    it('applies navbar-role-pill class to role pill', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )
      const rolePill = document.querySelector('.navbar-role-pill')
      expect(rolePill).toBeInTheDocument()
    })
  })

  // ─── Dashboard CSS Tests ──────────────────────────────────────
  
  describe('Dashboard Styles', () => {
    
    it('applies dashboard-page class to page container', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Admin Dashboard')
      const dashboardPage = document.querySelector('.dashboard-page')
      expect(dashboardPage).toBeInTheDocument()
    })

    it('applies dashboard-inner class to inner container', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Admin Dashboard')
      const dashboardInner = document.querySelector('.dashboard-inner')
      expect(dashboardInner).toBeInTheDocument()
    })

    it('applies dashboard-header class to header section', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Admin Dashboard')
      const header = document.querySelector('.dashboard-header')
      expect(header).toBeInTheDocument()
    })

    it('applies stats-grid class to stats container', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Admin Dashboard')
      const statsGrid = document.querySelector('.stats-grid')
      expect(statsGrid).toBeInTheDocument()
    })

    it('applies stat-card class to each stat card', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Admin Dashboard')
      const statCards = document.querySelectorAll('.stat-card')
      expect(statCards.length).toBe(4)
    })

    it('applies section-card class to user management section', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Admin Dashboard')
      const sectionCard = document.querySelector('.section-card')
      expect(sectionCard).toBeInTheDocument()
    })
  })

  // ─── Button CSS Tests ─────────────────────────────────────────
  
  describe('Button Styles', () => {
    
    it('applies btn-primary class to primary buttons', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Create group')
      const primaryBtn = document.querySelector('.btn-primary')
      expect(primaryBtn).toBeInTheDocument()
    })

    it('applies btn-outline class to outline buttons', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Browse groups')
      const outlineBtn = document.querySelector('.btn-outline')
      expect(outlineBtn).toBeInTheDocument()
    })
  })

  // ─── Badge CSS Tests ──────────────────────────────────────────
  
  describe('Badge Styles', () => {
    
    it('applies badge class to role badges', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Alice Dlamini')
      const badges = document.querySelectorAll('.badge')
      expect(badges.length).toBeGreaterThan(0)
    })

    it('applies badge-danger class to admin role badges', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Carol Admin')
      const adminBadges = document.querySelectorAll('.badge-danger')
      expect(adminBadges.length).toBeGreaterThan(0)
    })

    it('applies badge-warning class to treasurer role badges', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Bob Mokoena')
      const treasurerBadges = document.querySelectorAll('.badge-warning')
      expect(treasurerBadges.length).toBeGreaterThan(0)
    })

    it('applies badge-info class to user role badges', async () => {
      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      )
      await screen.findByText('Alice Dlamini')
      const userBadges = document.querySelectorAll('.badge-info')
      expect(userBadges.length).toBeGreaterThan(0)
    })
  })

  // ─── Responsive CSS Tests ─────────────────────────────────────
  
  describe('Responsive Styles', () => {
    
    it('hamburger menu exists for mobile view', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )
      const hamburger = document.querySelector('.hamburger')
      expect(hamburger).toBeInTheDocument()
    })

    it('hamburger has bar elements', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      )
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
      expect(rootStyles.getPropertyValue('--border').trim()).toBe('#e2e8f0')
      expect(rootStyles.getPropertyValue('--text').trim()).toBe('#0f172a')
      expect(rootStyles.getPropertyValue('--text-muted').trim()).toBe('#64748b')
      expect(rootStyles.getPropertyValue('--success').trim()).toBe('#16a34a')
      expect(rootStyles.getPropertyValue('--warning').trim()).toBe('#d97706')
      expect(rootStyles.getPropertyValue('--danger').trim()).toBe('#dc2626')
    })
  })
})
