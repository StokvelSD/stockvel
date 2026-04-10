import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../index.css';

const LandingPage = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Thanks! We'll be in touch at ${email}`);
    setEmail('');
  };

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">South Africa&apos;s Digital Stokvel Platform</div>
        <h1 className="hero-title">Grow your money together,&nbsp;not alone</h1>
        <p className="hero-subtitle">
          A trusted rotating savings platform built for South African communities —
          transparent, secure, and fully digital.
        </p>
        <div className="hero-buttons">
          <Link to="/register" className="btn-hero-primary">Create a circle</Link>
          <Link to="/login"    className="btn-hero-secondary">Sign in</Link>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value">50k+</div>
            <div className="hero-stat-label">Active members</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">R2.4M</div>
            <div className="hero-stat-label">Paid out monthly</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">100%</div>
            <div className="hero-stat-label">Transparent</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="section">
        <div className="section-title">
          <span className="section-label">Simple &amp; Transparent</span>
          <h2>How StokvelHub works</h2>
        </div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-icon">
              <svg width="22" height="22" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3>Join or start a circle</h3>
            <p>Invite friends, family, or colleagues. Set a monthly contribution between R100 and R5,000. Everyone agrees on the payout rotation.</p>
          </div>
          <div className="step-card">
            <div className="step-icon">
              <svg width="22" height="22" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <h3>Contribute monthly</h3>
            <p>Automated EFT or card deductions. Watch the pot grow in real time. No hidden fees — 100% goes to the circle.</p>
          </div>
          <div className="step-card">
            <div className="step-icon">
              <svg width="22" height="22" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <h3>Receive your payout</h3>
            <p>On your rotation month, receive the full pot directly to your bank account — e.g. R12,000 for 12 members at R1,000 each.</p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" style={{ background: 'var(--bg-alt)', padding: '5rem 2rem' }}>
        <div className="section-title">
          <span className="section-label">Why StokvelHub</span>
          <h2>Built for trust and transparency</h2>
        </div>
        <div className="benefits-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {[
            { title: 'Real-time tracking', body: 'Every contribution is logged instantly and visible to all circle members.' },
            { title: 'Bank-grade security', body: 'Your funds and data are protected with enterprise-level encryption.' },
            { title: 'Automated reminders', body: 'Payment reminders are sent automatically so no one falls behind.' },
            { title: 'Flexible groups', body: 'Set custom contribution amounts, schedules, and payout orders.' },
            { title: 'Audit-ready records', body: 'Download full contribution histories for any period at any time.' },
            { title: 'Zero platform fees', body: 'StokvelHub charges nothing — every rand you contribute goes to your circle.' },
          ].map(b => (
            <div className="benefit-card" key={b.title}>
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section id="community" className="section">
        <div className="testimonial-block">
          <p className="testimonial-text">
            "We used to manage everything in a WhatsApp group with a spreadsheet. StokvelHub
            eliminated all the arguments about who paid and who didn't. Now everyone can see
            the ledger in real time."
          </p>
          <div className="testimonial-author">— Nosipho L., Soweto Stokvel Captain</div>
        </div>
      </section>

      {/* CTA */}
      <div className="cta-band">
        <h2>Ready to start your stokvel journey?</h2>
        <p>Join thousands of South Africans saving smarter, together. Takes 2 minutes to create a circle.</p>
        <form onSubmit={handleSubmit} className="email-form">
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary btn-lg">Notify me</button>
        </form>
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
          No credit check &bull; Cancel anytime &bull; Zero setup fee
        </p>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>StokvelHub</h4>
            <p>Building stronger communities through rotating savings and investments.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#how">How it works</a>
            <a href="#">Pricing</a>
            <a href="#">For group admins</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#">About us</a>
            <a href="#">Safety &amp; security</a>
            <a href="#">Blog</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">POPIA</a>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; {new Date().getFullYear()} StokvelHub (Pty) Ltd — Empowering South African stokvels.
        </div>
      </footer>
    </>
  );
};

export default LandingPage;