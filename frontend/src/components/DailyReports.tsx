// frontend/src/components/DailyReports.tsx
import React, { useEffect, useState } from 'react';
import { FileText, Calendar, RefreshCw } from 'lucide-react';

export const DailyReports: React.FC = () => {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

  useEffect(() => {
    fetchDates();
  }, []);

  const fetchDates = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/daily-reports`);
      if (res.ok) {
        const data = await res.json();
        setDates(data);
        if (data.length > 0) {
          setSelectedDate(data[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching daily report dates:', e);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;
    const fetchReportContent = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${backendUrl}/api/daily-reports/${selectedDate}`);
        if (res.ok) {
          const text = await res.text();
          setContent(text);
        } else {
          setContent('Report content could not be found.');
        }
      } catch (e) {
        console.error('Error fetching report content:', e);
        setContent('Error loading report content.');
      } finally {
        setLoading(false);
      }
    };
    fetchReportContent();
  }, [selectedDate]);

  // A very basic but beautiful markdown renderer
  const renderMarkdown = (md: string) => {
    if (!md) return null;
    const lines = md.split('\n');
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Table parsing
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cols = trimmed.split('|').map(c => c.trim()).filter((_, i) => i > 0 && i < trimmed.split('|').length - 1);
        if (!inTable) {
          inTable = true;
          tableHeaders = cols;
          tableRows = [];
        } else {
          if (cols.every(c => c.startsWith(':') || c.startsWith('-'))) {
            // separator, ignore
          } else {
            tableRows.push(cols);
          }
        }
        return;
      } else if (inTable) {
        // Table closed
        inTable = false;
        elements.push(
          <div key={`table-${idx}`} style={{ overflowX: 'auto', margin: '15px 0', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  {tableHeaders.map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      {h.replace(/\*\*/g, '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ borderBottom: rowIndex === tableRows.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.02)', background: rowIndex % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                    {row.map((cell, cellIndex) => {
                      const isTargetHit = cell.includes('TARGET_HIT');
                      const isSlHit = cell.includes('STOP_LOSS_HIT');
                      const isLong = cell.includes('LONG');
                      const isShort = cell.includes('SHORT');
                      
                      let style: React.CSSProperties = { padding: '10px 14px', color: 'var(--text-primary)' };
                      if (isTargetHit) style.color = '#10b981';
                      if (isSlHit) style.color = '#ef4444';
                      if (isLong) style.color = '#3b82f6';
                      if (isShort) style.color = '#f59e0b';
                      
                      return (
                        <td key={cellIndex} style={style}>
                          {cell.replace(/\*\*/g, '')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      if (trimmed.startsWith('# ')) {
        elements.push(<h1 key={idx} style={{ fontSize: '20px', fontWeight: 'bold', margin: '20px 0 10px 0', color: 'white', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>{trimmed.slice(2).replace(/\*\*/g, '')}</h1>);
      } else if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={idx} style={{ fontSize: '15px', fontWeight: 'bold', margin: '18px 0 8px 0', color: 'var(--accent-blue)' }}>{trimmed.slice(3).replace(/\*\*/g, '')}</h2>);
      } else if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={idx} style={{ fontSize: '13px', fontWeight: 'bold', margin: '15px 0 6px 0', color: 'var(--accent-purple)' }}>{trimmed.slice(4).replace(/\*\*/g, '')}</h3>);
      } else if (trimmed.startsWith('* **') || trimmed.startsWith('- **')) {
        const text = trimmed.replace(/^[\*\-]\s+/, '');
        elements.push(
          <div key={idx} style={{ display: 'flex', gap: '8px', margin: '6px 0', paddingLeft: '10px', fontSize: '12px' }}>
            <span style={{ color: 'var(--accent-blue)' }}>•</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {text.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#f59e0b' }}>{part}</strong> : part)}
            </span>
          </div>
        );
      } else if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        elements.push(
          <div key={idx} style={{ display: 'flex', gap: '8px', margin: '6px 0', paddingLeft: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span>{trimmed.slice(1).trim()}</span>
          </div>
        );
      } else if (trimmed) {
        elements.push(<p key={idx} style={{ margin: '8px 0', fontSize: '12px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{trimmed.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'white' }}>{part}</strong> : part)}</p>);
      } else {
        elements.push(<div key={idx} style={{ height: '8px' }} />);
      }
    });

    return elements;
  };

  return (
    <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
      {/* Date List Sidebar */}
      <div className="glass-panel" style={{ width: '220px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>📅 REPORT ARCHIVE</span>
          <button onClick={fetchDates} className="btn-icon" style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <RefreshCw size={12} color="var(--text-muted)" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '500px', overflowY: 'auto' }}>
          {dates.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No reports found yet.</div>
          ) : (
            dates.map(date => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid ' + (selectedDate === date ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-color)'),
                  background: selectedDate === date ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-input)',
                  color: selectedDate === date ? 'var(--accent-blue)' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: selectedDate === date ? 'bold' : 'normal',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <Calendar size={13} />
                {date}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Report Display Container */}
      <div className="glass-panel" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '550px' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <RefreshCw className="animate-spin" size={24} color="var(--accent-blue)" style={{ animation: 'spin 1.5s linear infinite' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fetching report data...</span>
          </div>
        ) : selectedDate ? (
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
            {renderMarkdown(content)}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <FileText size={32} />
            <span>Select a date from the archive to view the post-mortem report.</span>
          </div>
        )}
      </div>
    </div>
  );
};
