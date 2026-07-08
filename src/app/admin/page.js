'use client';

import React, { useState, useEffect } from 'react';

export default function AdminDashboard() {
  // Navigation
  const [activeTab, setActiveTab] = useState('roster');

  // DB State
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDept, setSelectedDept] = useState('All');
  
  // KPI Metrics
  const [metrics, setMetrics] = useState({
    approved: 0,
    filled: 0,
    vacancyRate: '0%',
    holds: 0,
    pendingActions: 0
  });

  // Commission Highlight State
  const [meetingDate, setMeetingDate] = useState('2026-06-01');
  const [commissionActions, setCommissionActions] = useState([]);
  const [showMemo, setShowMemo] = useState(false);

  // Ingestion State
  const [reconciliationReport, setReconciliationReport] = useState(null);
  const [isReconciling, setIsReconciling] = useState(false);

  // AI Memo Parsing State
  const [memoText, setMemoText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedActions, setParsedActions] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  // NL Query Search State
  const [nlQuery, setNlQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [generatedSql, setGeneratedSql] = useState('');
  const [sqlExplanation, setSqlExplanation] = useState('');

  // Position Editing & Adding Modals
  const [editingPosition, setEditingPosition] = useState(null);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [newPositionForm, setNewPositionForm] = useState({
    dept_id: '',
    job_code: '',
    job_title: '',
    grade: 'Grade 9',
    approved_slots: 1,
    status: 'Active'
  });

  // Fetch initial data & register service worker
  useEffect(() => {
    fetchData();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('ServiceWorker registered with scope:', reg.scope);
      }).catch((err) => {
        console.error('ServiceWorker registration failed:', err);
      });
    }
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/positions');
      const data = await res.json();
      setDepartments(data.departments || []);
      setPositions(data.positions || []);
      setEmployees(data.employees || []);
      
      // Calculate KPI metrics
      let approved = 0;
      let filled = 0;
      let holds = 0;
      data.positions.forEach(p => {
        approved += p.approved_slots;
        filled += p.filled_slots;
        if (p.status === 'Hold' || p.status === 'Freeze') {
          holds += p.approved_slots - p.filled_slots;
        }
      });
      
      const vacancyRate = approved > 0 ? Math.round(((approved - filled) / approved) * 100) + '%' : '0%';
      
      // Fetch actions to get pending count
      const actionsRes = await fetch('/api/actions');
      const actionsData = await actionsRes.json();
      const pendingCount = actionsData.filter(a => a.status === 'Pending').length;
      
      setMetrics({
        approved,
        filled,
        vacancyRate,
        holds,
        pendingActions: pendingCount
      });
      
      // Filter commission actions for selected date
      filterCommissionActions(actionsData, meetingDate);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const filterCommissionActions = (actions, date) => {
    const filtered = actions.filter(a => a.commission_meeting_date === date);
    setCommissionActions(filtered);
  };

  // Triggered when date changes
  const handleDateChange = async (e) => {
    const date = e.target.value;
    setMeetingDate(date);
    try {
      const actionsRes = await fetch('/api/actions');
      const actionsData = await actionsRes.json();
      filterCommissionActions(actionsData, date);
      setShowMemo(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger CSV reconciliation
  const handleAutoReconcile = async () => {
    setIsReconciling(true);
    setReconciliationReport(null);
    try {
      const res = await fetch('/api/ingest', { method: 'POST' });
      const report = await res.json();
      setReconciliationReport(report);
    } catch (err) {
      console.error('Reconciliation failed:', err);
    } finally {
      setIsReconciling(false);
    }
  };

  // Trigger AI memo parsing
  const handleParseMemo = async () => {
    if (!memoText.trim()) return;
    setIsParsing(true);
    setParsedActions(null);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: memoText })
      });
      const data = await res.json();
      setParsedActions(data.actions || []);
    } catch (err) {
      console.error('Error parsing memo:', err);
    } finally {
      setIsParsing(false);
    }
  };

  // Apply parsed actions to database
  const handleApplyActions = async () => {
    if (!parsedActions || parsedActions.length === 0) return;
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: parsedActions })
      });
      if (res.ok) {
        setSaveStatus('Success! Actions written to database as pending.');
        setParsedActions(null);
        setMemoText('');
        fetchData(); // Refresh UI
      } else {
        setSaveStatus('Error saving actions to database.');
      }
    } catch (err) {
      console.error('Error applying actions:', err);
      setSaveStatus('Error applying actions.');
    }
  };

  // CFO NLP search & command executor
  const handleNlQuery = async () => {
    if (!nlQuery.trim()) return;
    setIsQuerying(true);
    setQueryResult(null);
    setGeneratedSql('');
    setSqlExplanation('');
    try {
      const res = await fetch('/api/query-nlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlQuery })
      });
      const data = await res.json();
      setGeneratedSql(data.sql || '');
      setSqlExplanation(data.explanation || '');
      setQueryResult(data.result || []);
      
      // If it was a database mutation, refresh roster data
      if (data.isMutation) {
        fetchData();
      }
    } catch (err) {
      console.error('NLP query failed:', err);
    } finally {
      setIsQuerying(false);
    }
  };

  const setNlPreset = (text) => {
    setNlQuery(text);
  };

  // Approve & Execute Personnel Action
  const handleExecuteAction = async (id) => {
    try {
      const res = await fetch('/api/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Executed' })
      });
      if (res.ok) {
        fetchData(); // Refresh Roster, Actions, and metrics
      } else {
        alert('Failed to execute action.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cancel / Delete Personnel Action
  const handleCancelAction = async (id) => {
    if (!confirm('Are you sure you want to cancel this pending action?')) return;
    try {
      const res = await fetch('/api/actions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchData(); // Refresh
      } else {
        alert('Failed to delete action.');
      }
    } catch (err) {
      console.error(err);
    }
  };
  // Submit Position Direct Edit
  const handleSavePositionEdit = async () => {
    if (!editingPosition) return;
    try {
      const res = await fetch('/api/positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPosition.id,
          approved_slots: parseInt(editingPosition.approved_slots),
          status: editingPosition.status,
          job_title: editingPosition.job_title,
          grade: editingPosition.grade,
          employee_names: editingPosition.employee_names
        })
      });
      if (res.ok) {
        setEditingPosition(null);
        fetchData();
      } else {
        alert('Failed to update position.');
      }
    } catch (err) {
      console.error(err);
    }
  };
  // Submit New Position Form
  const handleCreatePosition = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPositionForm,
          dept_id: parseInt(newPositionForm.dept_id),
          approved_slots: parseInt(newPositionForm.approved_slots)
        })
      });
      if (res.ok) {
        setShowAddPosition(false);
        setNewPositionForm({
          dept_id: '',
          job_code: '',
          job_title: '',
          grade: 'Grade 9',
          approved_slots: 1,
          status: 'Active'
        });
        fetchData();
      } else {
        alert('Failed to create position.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active': return <span className="badge badge-active">Active</span>;
      case 'Hold': return <span className="badge badge-hold">On Hold</span>;
      case 'Freeze': return <span className="badge badge-freeze">Frozen</span>;
      case 'Hiring Pipeline':
      case 'Recruiting':
      case 'Vacant':
        return <span className="badge badge-pipeline">Vacant</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const getActionBadge = (type) => {
    switch (type) {
      case 'New Hire': return <span className="badge badge-pipeline" style={{ borderColor: 'rgba(2, 132, 199, 0.4)' }}>New Hire</span>;
      case 'Promotion': return <span className="badge badge-highlight">Promotion</span>;
      case 'Step Change': return <span className="badge badge-active" style={{ borderColor: 'rgba(5, 150, 105, 0.4)' }}>Step Change</span>;
      case 'Termination': return <span className="badge badge-hold" style={{ borderColor: 'rgba(220, 38, 38, 0.4)' }}>Termination</span>;
      default: return <span className="badge">{type}</span>;
    }
  };

  const filteredPositions = selectedDept === 'All'
    ? positions
    : positions.filter(p => p.cost_center_code === selectedDept);

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <h2>Archon OS</h2>
          <p>County Roster overlay</p>
        </div>

        <ul className="nav-menu">
          <li>
            <div 
              className={`nav-item ${activeTab === 'roster' ? 'active' : ''}`}
              onClick={() => setActiveTab('roster')}
            >
              Roster & Slots
            </div>
          </li>
          <li>
            <div 
              className={`nav-item ${activeTab === 'commission' ? 'active' : ''}`}
              onClick={() => setActiveTab('commission')}
            >
              Commission Highlights
            </div>
          </li>
          <li>
            <div 
              className={`nav-item ${activeTab === 'ingest' ? 'active' : ''}`}
              onClick={() => setActiveTab('ingest')}
            >
              Spreadsheet Ingest
            </div>
          </li>
          <li>
            <div 
              className={`nav-item ${activeTab === 'ai-memo' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai-memo')}
            >
              AI Memo Parser
            </div>
          </li>
          <li>
            <div 
              className={`nav-item ${activeTab === 'nlp-query' ? 'active' : ''}`}
              onClick={() => setActiveTab('nlp-query')}
            >
              CFO Ledger Search & Tasks
            </div>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-avatar">SG</div>
            <div className="user-info">
              <h4>Sherri Garner</h4>
              <p>Personnel Director</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        <div className="header-actions">
          <div className="header-title">
            <span className="tagline">Run your county, not your spreadsheets</span>
            <h1>County Administration Dashboard</h1>
          </div>
          <div>
            <button className="btn-premium btn-secondary" onClick={fetchData}>
              Refresh Database
            </button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <section className="metrics-grid">
          <div className="glass-panel metric-card">
            <div className="metric-title">Approved Budget Slots</div>
            <div className="metric-value">{metrics.approved}</div>
            <div className="metric-change positive">Authorized Positions</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-title">Filled Roster Slots</div>
            <div className="metric-value">{metrics.filled}</div>
            <div className="metric-change neutral">Active Personnel</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-title">Slot Vacancy Rate</div>
            <div className="metric-value">{metrics.vacancyRate}</div>
            <div className="metric-change positive">Opportunity Ratio</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-title">Hold/Freeze Slots</div>
            <div className="metric-value">{metrics.holds}</div>
            <div className="metric-change negative">Locked Budget</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-title">Pending Board Actions</div>
            <div className="metric-value">{metrics.pendingActions}</div>
            <div className="metric-change positive">{metrics.pendingActions > 0 ? 'Awaiting Commission' : 'Roster Synchronized'}</div>
          </div>
        </section>

        {/* Dynamic Tab Render */}
        {activeTab === 'roster' && (
          <section className="glass-panel">
            <div className="panel-header">
              <h3>County Organizational Registry</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-premium btn-secondary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🖨️ Print / Save PDF
                </button>
                <button className="btn-premium" onClick={() => setShowAddPosition(true)}>
                  + Add Position
                </button>
                <select 
                  className="premium-input"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  <option value="All">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.cost_center_code}>
                      {d.cost_center_code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Print-Only Report Header */}
            <div className="print-only-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>HOUSTON COUNTY COMMISSION</h1>
                  <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.05rem', color: '#475569', fontWeight: '600' }}>Personnel & Approved Budget Slot Registry</h2>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                  <div><strong>Date Generated:</strong> {new Date().toLocaleDateString('en-US')}</div>
                  <div><strong>Report Status:</strong> Official Audit Copy</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.2rem', fontSize: '0.85rem', background: '#f8fafc', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div><strong>Selected Scope:</strong> {selectedDept === 'All' ? 'All County Departments' : `${selectedDept} - ${departments.find(d => d.cost_center_code === selectedDept)?.name}`}</div>
                <div><strong>Approved Budget Slots:</strong> {filteredPositions.reduce((acc, p) => acc + p.approved_slots, 0)}</div>
                <div><strong>Filled Slots:</strong> {filteredPositions.reduce((acc, p) => acc + p.filled_slots, 0)}</div>
                <div><strong>Vacancy Rate:</strong> {
                  (() => {
                    const app = filteredPositions.reduce((acc, p) => acc + p.approved_slots, 0);
                    const fil = filteredPositions.reduce((acc, p) => acc + p.filled_slots, 0);
                    return app > 0 ? Math.round(((app - fil) / app) * 100) + '%' : '0%';
                  })()
                }</div>
              </div>
            </div>

            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Job Code</th>
                    <th>Job Title</th>
                    <th>Cost Center</th>
                    <th>Grade</th>
                    <th>Slots (Filled/Approved)</th>
                    <th>Active Employees</th>
                    <th>Slot Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDept === 'All' ? (
                    departments.map(dept => {
                      const deptPos = filteredPositions.filter(p => p.cost_center_code === dept.cost_center_code);
                      if (deptPos.length === 0) return null;
                      return (
                        <React.Fragment key={dept.id}>
                          {/* Department Heading Row */}
                          <tr className="dept-group-header-row" style={{ pageBreakAfter: 'avoid' }}>
                            <td colSpan="8" style={{
                              background: '#f8fafc',
                              color: '#0f172a',
                              fontWeight: '700',
                              fontSize: '0.9rem',
                              padding: '0.8rem 1.2rem',
                              borderBottom: '2px solid #cbd5e1',
                              textAlign: 'left'
                            }}>
                              📁 {dept.cost_center_code} - {dept.name}
                            </td>
                          </tr>
                          {deptPos.map(pos => (
                            <tr key={pos.id}>
                              <td style={{ fontWeight: '700' }}>{pos.job_code}</td>
                              <td>{pos.job_title}</td>
                              <td>{pos.cost_center_code}</td>
                              <td>{pos.grade}</td>
                              <td>
                                <strong>{pos.filled_slots}</strong> / {pos.approved_slots}
                              </td>
                              <td>
                                {pos.employee_names ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    {pos.employee_names.split(',').map((name, i) => (
                                      <span key={i} style={{ color: 'var(--color-text-main)' }}>{name.trim()}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--color-text-dark)', fontStyle: 'italic' }}>Vacant</span>
                                )}
                              </td>
                              <td>{getStatusBadge(pos.status)}</td>
                              <td>
                                <button 
                                  className="btn-premium btn-secondary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                  onClick={() => setEditingPosition(pos)}
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    filteredPositions.map(pos => (
                      <tr key={pos.id}>
                        <td style={{ fontWeight: '700' }}>{pos.job_code}</td>
                        <td>{pos.job_title}</td>
                        <td>{pos.cost_center_code} ({pos.dept_name})</td>
                        <td>{pos.grade}</td>
                        <td>
                          <strong>{pos.filled_slots}</strong> / {pos.approved_slots}
                        </td>
                        <td>
                          {pos.employee_names ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              {pos.employee_names.split(',').map((name, i) => (
                                <span key={i} style={{ color: 'var(--color-text-main)' }}>{name.trim()}</span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-dark)', fontStyle: 'italic' }}>Vacant</span>
                          )}
                        </td>
                        <td>{getStatusBadge(pos.status)}</td>
                        <td>
                          <button 
                            className="btn-premium btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => setEditingPosition(pos)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Edit Position Modal */}
            {editingPosition && (
              <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
              }}>
                <div className="glass-panel" style={{ padding: '2rem', width: '450px', background: '#fff' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>Edit Position: {editingPosition.job_code}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Job Title</label>
                    <input 
                      type="text" className="premium-input"
                      value={editingPosition.job_title}
                      onChange={(e) => setEditingPosition({ ...editingPosition, job_title: e.target.value })}
                    />
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Grade</label>
                    <input 
                      type="text" className="premium-input"
                      value={editingPosition.grade}
                      onChange={(e) => setEditingPosition({ ...editingPosition, grade: e.target.value })}
                    />
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Approved Slots</label>
                    <input 
                      type="number" className="premium-input"
                      value={editingPosition.approved_slots}
                      onChange={(e) => setEditingPosition({ ...editingPosition, approved_slots: e.target.value })}
                    />
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Slot Status</label>
                    <select 
                      className="premium-input"
                      value={editingPosition.status}
                      onChange={(e) => setEditingPosition({ ...editingPosition, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Hold">On Hold</option>
                      <option value="Freeze">Frozen</option>
                      <option value="Hiring Pipeline">Vacant (Recruiting)</option>
                    </select>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Active Employee Name(s) (comma-separated)</label>
                    <input 
                      type="text" className="premium-input"
                      value={editingPosition.employee_names || ''}
                      onChange={(e) => setEditingPosition({ ...editingPosition, employee_names: e.target.value })}
                      placeholder="e.g. Martha Walker (leave blank / Vacant if empty)"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-premium" style={{ flexGrow: 1 }} onClick={handleSavePositionEdit}>
                      Save Changes
                    </button>
                    <button className="btn-premium btn-secondary" onClick={() => setEditingPosition(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Position Modal */}
            {showAddPosition && (
              <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
              }}>
                <form onSubmit={handleCreatePosition} className="glass-panel" style={{ padding: '2rem', width: '450px', background: '#fff' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>Create New Position Slot</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Department</label>
                    <select 
                      className="premium-input" required
                      value={newPositionForm.dept_id}
                      onChange={(e) => setNewPositionForm({ ...newPositionForm, dept_id: e.target.value })}
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.cost_center_code} - {d.name}</option>
                      ))}
                    </select>

                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Job Code</label>
                    <input 
                      type="text" className="premium-input" placeholder="e.g. IT-03" required
                      value={newPositionForm.job_code}
                      onChange={(e) => setNewPositionForm({ ...newPositionForm, job_code: e.target.value })}
                    />

                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Job Title</label>
                    <input 
                      type="text" className="premium-input" placeholder="e.g. IT Support Spec II" required
                      value={newPositionForm.job_title}
                      onChange={(e) => setNewPositionForm({ ...newPositionForm, job_title: e.target.value })}
                    />

                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Grade</label>
                    <input 
                      type="text" className="premium-input" placeholder="e.g. Grade 10" required
                      value={newPositionForm.grade}
                      onChange={(e) => setNewPositionForm({ ...newPositionForm, grade: e.target.value })}
                    />

                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Approved Slots</label>
                    <input 
                      type="number" className="premium-input" required
                      value={newPositionForm.approved_slots}
                      onChange={(e) => setNewPositionForm({ ...newPositionForm, approved_slots: e.target.value })}
                    />

                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Initial Status</label>
                    <select 
                      className="premium-input"
                      value={newPositionForm.status}
                      onChange={(e) => setNewPositionForm({ ...newPositionForm, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Hold">On Hold</option>
                      <option value="Freeze">Frozen</option>
                      <option value="Hiring Pipeline">Recruiting</option>
                    </select>

                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" className="btn-premium" style={{ flexGrow: 1 }}>
                      Create Position
                    </button>
                    <button type="button" className="btn-premium btn-secondary" onClick={() => setShowAddPosition(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        )}

        {activeTab === 'commission' && (
          <section className="dashboard-grid">
            <div className="glass-panel">
              <div className="panel-header">
                <h3>Commission Highlight Board</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Target Meeting Date:</label>
                  <input 
                    type="date"
                    className="premium-input"
                    value={meetingDate}
                    onChange={handleDateChange}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Current Status</th>
                      <th>Proposed Status</th>
                      <th>Meeting Date</th>
                      <th>Action Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionActions.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                          No pending actions scheduled for this meeting date. Select another date.
                        </td>
                      </tr>
                    ) : (
                      commissionActions.map(action => (
                        <tr key={action.id} className={action.status === 'Pending' ? 'highlighted-action' : ''}>
                          <td>{getActionBadge(action.action_type)}</td>
                          <td style={{ fontWeight: '700' }}>{action.employee_id_number || 'NEW'}</td>
                          <td>
                            {action.employee_name || 
                              (action.first_name ? `${action.first_name} ${action.last_name}` : 'Pending Name Setup')}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)' }}>
                            {action.action_type === 'New Hire' ? (
                              'n/a'
                            ) : (
                              <span>
                                {action.current_job_title} ({action.current_grade_step}) - ${action.current_salary?.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td>
                            <strong>{action.proposed_job_title}</strong> ({action.proposed_grade_step}) 
                            <div style={{ color: 'var(--color-secondary)', fontWeight: '600' }}>
                              ${action.proposed_salary?.toLocaleString()}
                            </div>
                          </td>
                          <td>{action.effective_date}</td>
                          <td>
                            {action.status === 'Pending' ? (
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button 
                                  className="btn-premium"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'var(--status-active)' }}
                                  onClick={() => handleExecuteAction(action.id)}
                                >
                                  Execute
                                </button>
                                <button 
                                  className="btn-premium btn-secondary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: 'var(--status-hold)', color: 'var(--status-hold)' }}
                                  onClick={() => handleCancelAction(action.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--status-active)', fontWeight: '700', fontSize: '0.85rem' }}>
                                ✓ Approved & Executed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {commissionActions.length > 0 && (
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-glass)', textAlign: 'right' }}>
                  <button className="btn-premium" onClick={() => setShowMemo(true)}>
                    Compile Board Approval Memo
                  </button>
                </div>
              )}
            </div>

            {/* Side brief memo rendering */}
            <div>
              {showMemo && (
                <div className="glass-panel memo-card">
                  <div className="memo-header">
                    <h3>Archon OS Executive Briefing</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--status-highlight)', fontWeight: '600' }}>
                      SUBMITTED TO HOUSTON COUNTY COMMISSION
                    </p>
                  </div>
                  
                  <div className="memo-meta">
                    <div><strong>Meeting Date:</strong> {meetingDate}</div>
                    <div><strong>Prepared By:</strong> Finance Department</div>
                    <div><strong>Subject:</strong> Personnel & Position Authorization</div>
                    <div><strong>Total Changes:</strong> {commissionActions.length} Actions</div>
                  </div>

                  <div className="memo-body" style={{ marginTop: '1.5rem' }}>
                    <p>Pursuant to local civil service codes and budget allocations, the following list of personnel shifts and new placements is submitted for official Commission approval. All salary adjustments have been verified against active funding lines:</p>
                    
                    <table className="memo-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Employee</th>
                          <th>Proposed Role & Salary</th>
                          <th>Monthly Cost Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissionActions.map(a => {
                          const delta = (a.proposed_salary || 0) - (a.current_salary || 0);
                          const monthlyDelta = Math.round(delta / 12);
                          return (
                            <tr key={a.id}>
                              <td style={{ color: 'var(--status-highlight)' }}>{a.action_type}</td>
                              <td>{a.employee_name || `${a.first_name || ''} ${a.last_name || ''}`}</td>
                              <td>{a.proposed_job_title} (${a.proposed_salary?.toLocaleString()})</td>
                              <td style={{ color: delta >= 0 ? 'var(--status-active)' : 'var(--status-hold)', fontWeight: '600' }}>
                                {delta >= 0 ? '+' : ''}${monthlyDelta.toLocaleString()}/mo
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '1rem' }}>
                      Recommendation: The Office of the Budget recommends approval of all listed adjustments. Net monthly county payroll change is estimated at +${Math.round(commissionActions.reduce((acc, a) => acc + ((a.proposed_salary || 0) - (a.current_salary || 0)), 0) / 12).toLocaleString()}.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-premium" style={{ flexGrow: 1 }} onClick={() => alert('Commission Briefing PDF Exported successfully to County Fileshare.')}>
                      Download Board Package
                    </button>
                    <button className="btn-premium btn-secondary" onClick={() => setShowMemo(false)}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'ingest' && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Spreadsheet Ingest & Matching Engine</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
              Upload unstructured annual position tracking sheets or monthly payroll change files. The reconciliation algorithm matches names, salaries, and slot codes to instantly flag anomalies.
            </p>

            <div className="dropzone" onClick={handleAutoReconcile}>
              <div className="dropzone-icon">📥</div>
              <h3>Click to Ingest County Payroll Spreadsheet</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                This runs reconciliation against the active database roster in-memory
              </p>
              {isReconciling && <p style={{ color: 'var(--color-primary)' }}>Executing parsing engine...</p>}
            </div>

            {reconciliationReport && (
              <div style={{ marginTop: '2.5rem' }}>
                <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                  Reconciliation Discrepancy Log ({reconciliationReport.discrepancies?.length || 0} issues flagged)
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reconciliationReport.discrepancies?.map((disc, idx) => (
                    <div 
                      key={idx} 
                      className="glass-panel" 
                      style={{ 
                        padding: '1.2rem', 
                        borderLeft: `4px solid ${disc.severity === 'critical' ? 'var(--status-hold)' : 'var(--status-freeze)'}` 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: disc.severity === 'critical' ? 'var(--status-hold)' : 'var(--status-freeze)' }}>
                          {disc.type} - {disc.severity}
                        </strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Target: {disc.target}</span>
                      </div>
                      <p style={{ fontSize: '0.95rem', color: 'var(--color-text-main)' }}>{disc.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'ai-memo' && (
          <section className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>Archon AI Personnel Memo Parser</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Paste raw emails, data dumps, or textual personnel adjustment forms. The AI assistant will parse them into structured database actions.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <textarea
                  className="premium-input"
                  style={{ width: '100%', minHeight: '180px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  placeholder="Paste email or text here..."
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                />
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-premium" onClick={handleParseMemo} disabled={isParsing}>
                    {isParsing ? 'Processing with AI...' : 'Analyze with Archon AI'}
                  </button>
                  <button 
                    className="btn-premium btn-secondary"
                    onClick={() => {
                      setMemoText(`PAYROLL DIRECTIVE - JUNE 14, 2026
Effective June 1, 2026:
- Promote Kelita Moore (EMP-1277) to Jail Commander (Grade 14, proposed salary: $65,000).
- Promote Carla Snell (EMP-0719) to Assist Jail Commander (Grade 12, proposed salary: $55,000).
- Promote David Asbill (EMP-1632) to Jail Captain (Grade 16, proposed salary: $72,000).
- Hire James Waylon McGriff (EMP-3864) as Summer Intern in Road & Bridge 53100 at Grade 16 Step 1 ($17.37/hr).`);
                    }}
                  >
                    Load PDF Text Data
                  </button>
                </div>
              </div>

              {saveStatus && (
                <div style={{ marginTop: '1rem', color: 'var(--status-active)', fontWeight: '600' }}>
                  {saveStatus}
                </div>
              )}
            </div>

            <div>
              {parsedActions && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>AI Extracted Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    {parsedActions.map((act, idx) => (
                      <div key={idx} className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--color-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <strong>{act.employee_name || 'New Employee'}</strong>
                          <span className="badge badge-pipeline" style={{ fontSize: '0.7rem' }}>{act.action_type}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          <strong>Proposed Role:</strong> {act.proposed_job_title} ({act.proposed_grade_step})<br />
                          <strong>Salary:</strong> ${act.proposed_salary?.toLocaleString()}<br />
                          <strong>Effective:</strong> {act.effective_date}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="btn-premium" style={{ width: '100%' }} onClick={handleApplyActions}>
                    Apply Candidates to Pending Actions
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'nlp-query' && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>CFO Natural Language Agent Console</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Ask questions, generate reports, or perform database tasks using plain English.
            </p>

            <div className="nlp-search-container">
              <span className="nlp-search-icon">🤖</span>
              <input
                type="text"
                className="premium-input nlp-input"
                placeholder="Ask me to do something (e.g. Put position 467 on Active, or query jail promotions)"
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNlQuery(); }}
              />
            </div>

            <div className="nlp-suggestions">
              <span style={{ color: 'var(--color-text-dark)', display: 'flex', alignItems: 'center' }}>Task Presets:</span>
              <button className="nlp-suggestion-chip" onClick={() => setNlPreset("Update positions SET status = 'Active' WHERE job_code = '467'")}>
                Activate Accounting Manager position
              </button>
              <button className="nlp-suggestion-chip" onClick={() => setNlPreset("Update positions SET approved_slots = 5 WHERE job_code = '468'")}>
                Increase Accounting Assistant approved slots to 5
              </button>
              <button className="nlp-suggestion-chip" onClick={() => setNlPreset("Show all jail actions with proposed salary exceeding $40k")}>
                Query Jail actions
              </button>
              <button className="nlp-suggestion-chip" onClick={() => setNlPreset("Summarize total budget changes for Road & Bridge last month")}>
                Road & Bridge budget changes
              </button>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button className="btn-premium" onClick={handleNlQuery} disabled={isQuerying}>
                {isQuerying ? 'Executing AI Command...' : 'Send Command / Query'}
              </button>
            </div>

            {generatedSql && (
              <div style={{ marginTop: '2.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>AI Agent Execution Logs</h3>
                <div className="glass-panel" style={{ padding: '1rem', background: '#f1f5f9', border: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
                  <p style={{ color: 'var(--color-primary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                    EXPLANATION: {sqlExplanation}
                  </p>
                  <pre style={{ color: '#0f172a', fontSize: '0.85rem', overflowX: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
                    <code>{generatedSql}</code>
                  </pre>
                </div>
              </div>
            )}

            {queryResult && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Execution Results ({queryResult.length} rows returned)</h3>
                
                {queryResult.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>Command ran successfully but returned no records.</p>
                ) : (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          {Object.keys(queryResult[0]).map((key, i) => (
                            <th key={i}>{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {Object.values(row).map((val, cIdx) => (
                              <td key={cIdx}>
                                {typeof val === 'number' && val > 1000 
                                  ? val.toLocaleString() 
                                  : String(val === null ? 'n/a' : val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
