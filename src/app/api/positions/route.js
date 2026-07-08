import { NextResponse } from 'next/server';
import { getDb, logAudit } from '../../../lib/db';

export async function GET(request) {
  try {
    const db = await getDb();
    const departments = await db.all('SELECT * FROM departments');
    
    // Fetch positions with mapped employee names
    const positions = await db.all(`
      SELECT p.*, d.name as dept_name, d.cost_center_code,
             GROUP_CONCAT(e.first_name || ' ' || e.last_name, ', ') as employee_names
      FROM positions p
      JOIN departments d ON p.dept_id = d.id
      LEFT JOIN employees e ON e.current_position_id = p.id
      GROUP BY p.id
    `);

    const employees = await db.all(`
      SELECT id, employee_id_number, first_name, last_name, email, current_position_id, status, hire_date
      FROM employees
    `);

    return NextResponse.json({ departments, positions, employees });
  } catch (err) {
    console.error('API Positions GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = await getDb();
    const { dept_id, job_code, job_title, grade, approved_slots, status } = await request.json();
    
    if (!dept_id || !job_code || !job_title || !grade || approved_slots === undefined) {
      return NextResponse.json({ error: 'Missing required position fields' }, { status: 400 });
    }
    
    const userEmail = 'sherri.garner@houstoncounty.gov';
    
    const res = await db.run(
      `INSERT INTO positions (dept_id, job_code, job_title, grade, approved_slots, filled_slots, status)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [dept_id, job_code, job_title, grade, approved_slots, status || 'Active']
    );
    
    await logAudit(
      userEmail,
      'CREATE',
      'positions',
      res.lastID,
      null,
      { job_code, job_title, grade, approved_slots, status }
    );
    
    if (db.saveJsonDb) db.saveJsonDb();
    return NextResponse.json({ success: true, id: res.lastID });
  } catch (err) {
    console.error('API Positions POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const db = await getDb();
    const { id, approved_slots, status, job_title, grade } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing position ID' }, { status: 400 });
    }
    
    const userEmail = 'sherri.garner@houstoncounty.gov';
    const oldPosition = await db.get('SELECT * FROM positions WHERE id = ?', [id]);
    if (!oldPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }
    
    await db.run(
      `UPDATE positions 
       SET approved_slots = COALESCE(?, approved_slots),
           status = COALESCE(?, status),
           job_title = COALESCE(?, job_title),
           grade = COALESCE(?, grade)
       WHERE id = ?`,
      [approved_slots, status, job_title, grade, id]
    );
    
    await logAudit(
      userEmail,
      'UPDATE',
      'positions',
      id,
      oldPosition,
      { approved_slots, status, job_title, grade }
    );
    
    if (db.saveJsonDb) db.saveJsonDb();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Positions PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
