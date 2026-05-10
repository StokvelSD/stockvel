import { useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export default function MigrateGroups() {
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const addLog = (message, type = 'info') => {
    setLog(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const runMigration = async () => {
    setRunning(true);
    setLog([]);
    setDone(false);

    try {
      addLog('Fetching all groups...', 'info');
      const groupsSnap = await getDocs(collection(db, 'groups'));
      addLog(`Found ${groupsSnap.docs.length} groups`, 'info');

      for (const groupDoc of groupsSnap.docs) {
        const data = groupDoc.data();
        const groupName = data.groupName || data.name || groupDoc.id;

        const alreadyMigrated =
          typeof data.currentCycle === 'number' &&
          data.cycleStartDate &&
          Array.isArray(data.payoutOrder);

        if (alreadyMigrated) {
          addLog(`Skipped "${groupName}" — already migrated`, 'skip');
          continue;
        }

        const members = data.members || [];

        if (members.length === 0) {
          addLog(`Skipped "${groupName}" — no members found`, 'skip');
          continue;
        }

        const createdAt = data.createdAt || new Date();

        await updateDoc(doc(db, 'groups', groupDoc.id), {
          currentCycle: 1,
          cycleStartDate: createdAt,
          payoutOrder: members,
        });

        addLog(`✓ Migrated "${groupName}" — ${members.length} member(s) added to payoutOrder`, 'success');
      }

      addLog('Migration complete!', 'done');
      setDone(true);
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setRunning(false);
    }
  };

  const colors = {
    info: '#64748b',
    success: '#15803d',
    skip: '#b45309',
    error: '#dc2626',
    done: '#1d4ed8',
  };

  return (
    <div style={{
      maxWidth: '640px',
      margin: '4rem auto',
      padding: '2rem',
      fontFamily: 'monospace',
      background: '#0f172a',
      borderRadius: '12px',
      color: '#e2e8f0',
    }}>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#f8fafc' }}>
        Group Migration Tool
      </h2>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
        Adds <code>currentCycle</code>, <code>cycleStartDate</code>, and <code>payoutOrder</code> to every group. Safe to run multiple times — already migrated groups are skipped.
      </p>

      <button
        onClick={runMigration}
        disabled={running}
        style={{
          padding: '0.6rem 1.4rem',
          backgroundColor: running ? '#334155' : '#15803d',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: running ? 'not-allowed' : 'pointer',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
        }}
      >
        {running ? 'Running...' : 'Run Migration'}
      </button>

      {log.length > 0 && (
        <div style={{
          background: '#1e293b',
          borderRadius: '8px',
          padding: '1rem',
          maxHeight: '320px',
          overflowY: 'auto',
          fontSize: '0.8rem',
          lineHeight: '1.8',
        }}>
          {log.map((entry, i) => (
            <div key={i} style={{ color: colors[entry.type] || '#e2e8f0' }}>
              <span style={{ color: '#475569', marginRight: '0.75rem' }}>{entry.time}</span>
              {entry.message}
            </div>
          ))}
        </div>
      )}

      {done && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: '#14532d',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#bbf7d0',
        }}>
          All done! You can now remove this page from your app and move to Step 2.
        </div>
      )}
    </div>
  );
}
