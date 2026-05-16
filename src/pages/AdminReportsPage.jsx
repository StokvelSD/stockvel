import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';

/* ─── theme ────────────────────────────────────────────────────── */
const B = {
  dark:   '#1e3a8a',
  mid:    '#2563eb',
  light:  '#3b82f6',
  pale:   '#dbeafe',
  accent: '#f4b942',
  bg:     '#eff6ff',
  border: '#bfdbfe',
  text:   '#1e3a8a',
  muted:  '#64748b',
};

/* ─── helpers ──────────────────────────────────────────────────── */
const isPaid    = (s) => ['paid', 'completed'].includes(s?.toLowerCase());
const fmtMoney  = (n) => `R ${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
const toDate    = (d) => { try { return d?.toDate ? d.toDate() : new Date(d); } catch { return null; } };
const fmtDate   = (d) => { const dt = toDate(d); return dt ? dt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; };

/* ─── CSV export ────────────────────────────────────────────────── */
function exportCSV(contributions) {
  const rows = [
    ['StokvelHub — Admin Platform Report'],
    [`Generated: ${new Date().toLocaleString('en-ZA')}`],
    [],
    ['Member', 'Amount (ZAR)', 'Payment Method', 'Status', 'Date'],
    ...contributions.map(c => [
      c.member || '—', c.amount, c.paymentMethod || '—',
      c.status || 'pending', fmtDate(c.date || c.createdAt),
    ]),
    [],
    ['Total Collected', contributions.filter(c => isPaid(c.status)).reduce((s, c) => s + Number(c.amount), 0)],
    ['Total Pending',   contributions.filter(c => !isPaid(c.status)).reduce((s, c) => s + Number(c.amount), 0)],
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `stokvel-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ─── real PDF via jsPDF + html2canvas (CDN dynamic import) ────── */
async function exportPDF(reportRef) {
  // dynamically load scripts so we don't need npm packages
  const loadScript = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  try {
    await Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
    ]);

    const element = reportRef.current;
    const canvas  = await window.html2canvas(element, { scale: 1.5, useCORS: true, backgroundColor: '#f8faff' });
    const imgData = canvas.toDataURL('image/png');

    const { jsPDF } = window.jspdf;
    const pdf    = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
    const pdfW   = pdf.internal.pageSize.getWidth();
    const pdfH   = pdf.internal.pageSize.getHeight();
    const ratio  = canvas.width / canvas.height;
    const imgW   = pdfW;
    const imgH   = imgW / ratio;
    let posY     = 0;
    let heightLeft = imgH;

    pdf.addImage(imgData, 'PNG', 0, posY, imgW, imgH);
    heightLeft -= pdfH;

    while (heightLeft > 0) {
      posY = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, posY, imgW, imgH);
      heightLeft -= pdfH;
    }

    pdf.save(`stokvel-admin-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('PDF generation failed. Please try again.');
  }
}

/* ─── custom chart tooltips ─────────────────────────────────────── */
const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: `1px solid ${B.border}`, borderRadius: 8, padding: '0.6rem 1rem', boxShadow: '0 4px 16px rgba(30,58,138,0.12)' }}>
      <p style={{ fontWeight: 700, color: B.dark, marginBottom: 2, fontSize: '0.85rem' }}>{payload[0].name}</p>
      <p style={{ color: B.mid, fontSize: '0.85rem', fontWeight: 600 }}>{fmtMoney(payload[0].value)}</p>
    </div>
  );
};

const LineTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: `1px solid ${B.border}`, borderRadius: 8, padding: '0.6rem 1rem', boxShadow: '0 4px 16px rgba(30,58,138,0.12)' }}>
      <p style={{ fontWeight: 700, color: B.dark, marginBottom: 2, fontSize: '0.85rem' }}>{label}</p>
      <p style={{ color: B.mid, fontSize: '0.85rem', fontWeight: 600 }}>{fmtMoney(payload[0].value)}</p>
    </div>
  );
};

/* ─── stat card ─────────────────────────────────────────────────── */
function Card({ label, value, sub, accent = B.mid }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: '1.3rem', boxShadow: `0 2px 12px rgba(30,58,138,0.08)`, borderTop: `4px solid ${accent}` }}>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: B.muted, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: accent, margin: '0.25rem 0' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.76rem', color: B.muted }}>{sub}</div>}
    </div>
  );
}

/* ─── section wrapper ────────────────────────────────────────────── */
function Section({ title, children, style = {} }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: '1.5rem', boxShadow: `0 2px 12px rgba(30,58,138,0.08)`, border: `1px solid ${B.border}`, marginBottom: '1.8rem', ...style }}>
      {title && <h3 style={{ margin: '0 0 1.2rem', fontSize: '1rem', color: B.dark, fontWeight: 700 }}>{title}</h3>}
      {children}
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────────── */
export default function AdminReportsPage() {
  const [contributions, setContributions] = useState([]);
  const [groups, setGroups]               = useState([]);
  const [users, setUsers]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [pdfLoading, setPdfLoading]       = useState(false);
  const [filterStatus, setFilterStatus]   = useState('all');
  const [sortField, setSortField]         = useState('date');
  const [sortDir, setSortDir]             = useState('desc');
  const reportRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [cSnap, gSnap, uSnap] = await Promise.all([
          getDocs(collection(db, 'contributions')),
          getDocs(collection(db, 'groups')),
          getDocs(collection(db, 'users')),
        ]);
        setContributions(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setGroups(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── stats ── */
  const paidList       = contributions.filter(c => isPaid(c.status));
  const pendingList    = contributions.filter(c => !isPaid(c.status));
  const totalCollected = paidList.reduce((s, c) => s + Number(c.amount), 0);
  const totalPending   = pendingList.reduce((s, c) => s + Number(c.amount), 0);
  const compliance     = contributions.length ? (paidList.length / contributions.length) * 100 : 0;

  /* ── pie ── */
  const pieData   = [
    { name: 'Paid / Completed', value: totalCollected },
    { name: 'Pending',          value: totalPending   },
  ];
  const PIE_COLORS = [B.mid, B.accent];

  /* ── line ── */
  const monthly = contributions.reduce((acc, c) => {
    const date = toDate(c.date || c.createdAt);
    if (!date) return acc;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[key] = (acc[key] || 0) + Number(c.amount);
    return acc;
  }, {});
  const lineData = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b)).slice(-8)
    .map(([month, total]) => {
      const [yr, mo] = month.split('-');
      return { month: new Date(Number(yr), Number(mo) - 1).toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' }), total };
    });

  /* ── methods ── */
  const methodData = Object.entries(
    contributions.reduce((acc, c) => { const m = c.paymentMethod || 'unknown'; acc[m] = (acc[m] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  /* ── members ── */
  const memberBreakdown = Object.values(
    contributions.reduce((acc, c) => {
      const key = c.userId || 'unknown';
      const name = c.member || c.userId || 'Unknown';
      const amt = Number(c.amount || 0);
      if (acc[key]) { acc[key].totalPaid += amt; acc[key].count += 1; }
      else acc[key] = { userId: key, name, totalPaid: amt, count: 1 };
      return acc;
    }, {})
  ).sort((a, b) => b.totalPaid - a.totalPaid);

  /* ── filtered table ── */
  const filtered = contributions
    .filter(c => filterStatus === 'all' ? true : filterStatus === 'paid' ? isPaid(c.status) : !isPaid(c.status))
    .sort((a, b) => {
      const va = sortField === 'amount' ? Number(a.amount) : (toDate(a.date || a.createdAt)?.getTime() || 0);
      const vb = sortField === 'amount' ? Number(b.amount) : (toDate(b.date || b.createdAt)?.getTime() || 0);
      return sortDir === 'asc' ? va - vb : vb - va;
    });

  const toggleSort = (f) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  const handlePDF = async () => {
    setPdfLoading(true);
    await exportPDF(reportRef);
    setPdfLoading(false);
  };

  /* ── shared table styles ── */
  const thStyle = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'white', fontWeight: 700, background: B.dark, whiteSpace: 'nowrap' };
  const tdStyle = { padding: '0.75rem 1rem', fontSize: '0.88rem', borderBottom: `1px solid ${B.border}` };

  const pillBtn = (active, label, onClick) => (
    <button key={label} onClick={onClick} style={{
      padding: '0.35rem 1rem', borderRadius: 8, border: `1px solid ${B.border}`,
      cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
      background: active ? B.mid : 'white', color: active ? 'white' : B.dark,
      transition: 'all .15s',
    }}>{label}</button>
  );

  if (loading) return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: B.bg }}>
      <div style={{ textAlign: 'center', color: B.dark }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
        <p style={{ fontWeight: 600 }}>Loading platform data…</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: B.bg, fontFamily: "'Segoe UI', sans-serif", padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── header (outside reportRef so buttons aren't captured) ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: B.dark, margin: 0 }}>📊 Platform Reports</h1>
            <p style={{ color: B.muted, marginTop: '0.3rem', fontSize: '0.93rem' }}>Full platform overview — all groups, members, and contributions.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => exportCSV(filtered)} style={{ background: B.pale, color: B.dark, border: `1px solid ${B.border}`, borderRadius: 10, padding: '0.65rem 1.3rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
              ⬇ Export CSV
            </button>
            <button onClick={handlePDF} disabled={pdfLoading} style={{ background: B.mid, color: 'white', border: 'none', borderRadius: 10, padding: '0.65rem 1.3rem', fontWeight: 700, fontSize: '0.88rem', cursor: pdfLoading ? 'not-allowed' : 'pointer', opacity: pdfLoading ? 0.7 : 1 }}>
              {pdfLoading ? '⏳ Generating…' : '🖨 Download PDF'}
            </button>
          </div>
        </div>

        {/* ── everything below is captured for PDF ── */}
        <div ref={reportRef} style={{ background: B.bg, padding: '0.5rem' }}>

          {/* watermark header inside PDF capture */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem 1.5rem', background: B.dark, borderRadius: 12, color: 'white' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>StokvelHub</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Admin Platform Report</div>
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, textAlign: 'right' }}>
              Generated: {new Date().toLocaleString('en-ZA')}
            </div>
          </div>

          {/* stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1.1rem', marginBottom: '1.8rem' }}>
            <Card label="Total Collected"  value={fmtMoney(totalCollected)} sub={`${paidList.length} paid`}           accent={B.mid}    />
            <Card label="Pending"           value={fmtMoney(totalPending)}   sub={`${pendingList.length} outstanding`}  accent={B.accent}  />
            <Card label="Transactions"      value={contributions.length}      sub="total records"                        accent={B.light}   />
            <Card label="Groups"            value={groups.length}             sub="active stokvels"                      accent={B.dark}    />
            <Card label="Members"           value={users.length}              sub="registered accounts"                  accent="#6366f1"   />
            <Card label="Compliance"        value={`${Math.round(compliance)}%`} sub={compliance >= 80 ? 'Excellent 🌟' : 'Needs improvement'} accent={compliance >= 80 ? B.mid : '#ef4444'} />
          </div>

          {/* charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.8rem' }}>

            {/* pie */}
            <Section title="💰 Collected vs Pending">
              {totalCollected + totalPending === 0 ? (
                <p style={{ color: B.muted }}>No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" animationBegin={0} animationDuration={800} animationEasing="ease-out">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                    <Legend iconType="circle" formatter={v => <span style={{ fontSize: '0.82rem', color: B.dark }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {methodData.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: `1px solid ${B.border}`, paddingTop: '0.8rem' }}>
                  <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: B.muted, fontWeight: 700, marginBottom: '0.5rem' }}>By Payment Method</p>
                  {methodData.map(m => (
                    <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.85rem', borderBottom: `1px solid ${B.border}` }}>
                      <span style={{ textTransform: 'capitalize', color: B.dark }}>{m.name}</span>
                      <span style={{ fontWeight: 700, color: B.mid }}>{m.value} tx</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* line */}
            <Section title="📈 Monthly Contribution Trend">
              {lineData.length === 0 ? (
                <p style={{ color: B.muted }}>No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={B.border} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: B.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: B.muted }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<LineTip />} />
                    <Line type="monotone" dataKey="total" stroke={B.mid} strokeWidth={3}
                      dot={{ fill: B.mid, r: 5, stroke: 'white', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: B.accent, stroke: B.dark, strokeWidth: 2 }}
                      animationBegin={0} animationDuration={1000} animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p style={{ fontSize: '0.75rem', color: B.muted, marginTop: '0.75rem', textAlign: 'center' }}>
                Last {lineData.length} months of platform activity
              </p>
            </Section>
          </div>

          {/* per-member table */}
          <Section title="👥 Per-Member Breakdown" style={{ marginBottom: '1.8rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Member</th>
                    <th style={thStyle}>Transactions</th>
                    <th style={thStyle}>Total Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {memberBreakdown.length === 0 && (
                    <tr><td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: B.muted, padding: '2rem' }}>No data.</td></tr>
                  )}
                  {memberBreakdown.map((m, i) => (
                    <tr key={m.userId} style={{ background: i % 2 === 0 ? B.bg : 'white' }}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: B.pale, color: B.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                            {(m.name || '?')[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: B.dark }}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: B.muted }}>{m.count}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: B.mid }}>{fmtMoney(m.totalPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* all contributions */}
          <Section title="📋 All Contributions" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.85rem', color: B.muted }}>{filtered.length} of {contributions.length} records</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['all', 'paid', 'pending'].map(s => pillBtn(filterStatus === s, s.charAt(0).toUpperCase() + s.slice(1), () => setFilterStatus(s)))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Member</th>
                    <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('amount')}>
                      Amount {sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                    </th>
                    <th style={thStyle}>Method</th>
                    <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('date')}>
                      Date {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                    </th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: B.muted, padding: '2rem' }}>No contributions match.</td></tr>
                  )}
                  {filtered.map((c, i) => (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? B.bg : 'white' }}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: B.dark }}>{c.member || '—'}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: B.mid }}>{fmtMoney(c.amount)}</td>
                      <td style={{ ...tdStyle, textTransform: 'capitalize', color: B.muted }}>{c.paymentMethod || '—'}</td>
                      <td style={{ ...tdStyle, color: B.muted }}>{fmtDate(c.date || c.createdAt)}</td>
                      <td style={tdStyle}>
                        <span style={{
                          background: isPaid(c.status) ? B.pale : '#fef9c3',
                          color: isPaid(c.status) ? B.dark : '#854d0e',
                          padding: '3px 10px', borderRadius: 9999, fontSize: '0.78rem', fontWeight: 700,
                        }}>
                          {c.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', padding: '0.75rem 0 0', fontSize: '0.85rem', color: B.muted, borderTop: `1px solid ${B.border}`, marginTop: '0.5rem' }}>
                <span>{filtered.length} records</span>
                <span>Filtered total: <strong style={{ color: B.mid }}>{fmtMoney(filtered.reduce((s, c) => s + Number(c.amount), 0))}</strong></span>
              </div>
            )}
          </Section>

        </div>{/* end reportRef */}

        <p style={{ textAlign: 'center', color: B.muted, fontSize: '0.78rem', marginTop: '1rem' }}>
          CSV exports currently filtered records. PDF captures the full report as shown on screen.
        </p>
      </div>
    </div>
  );
}