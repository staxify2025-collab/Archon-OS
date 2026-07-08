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
    const { id, approved_slots, status, job_title, grade, employee_names } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing position ID' }, { status: 400 });
    }
    
    const userEmail = 'sherri.garner@houstoncounty.gov';
    const oldPosition = await db.get('SELECT * FROM positions WHERE id = ?', [id]);
    if (!oldPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }
    
    // Update positions table
    await db.run(
      `UPDATE positions 
       SET approved_slots = COALESCE(?, approved_slots),
           status = COALESCE(?, status),
           job_title = COALESCE(?, job_title),
           grade = COALESCE(?, grade)
       WHERE id = ?`,
      [approved_slots, status, job_title, grade, id]
    );

    // Sync employee records if employee_names is provided
    if (employee_names !== undefined) {
      const cleanNames = employee_names ? employee_names.split(',').map(n => n.trim()).filter(n => n.length > 0 && n.toLowerCase() !== 'vacant') : [];
      
      // Fetch currently assigned employees
      const currentEmployees = await db.all('SELECT * FROM employees WHERE current_position_id = ?', [id]);
      
      // Determine employees to remove
      for (const emp of currentEmployees) {
        const fullName = `${emp.first_name} ${emp.last_name}`;
        if (!cleanNames.some(n => n.toLowerCase() === fullName.toLowerCase())) {
          // Employee was removed from this position. We set current_position_id = NULL
          await db.run('UPDATE employees SET current_position_id = NULL WHERE id = ?', [emp.id]);
        }
      }
      
      // Determine employees to add/update
      for (const name of cleanNames) {
        const parts = name.split(' ');
        const first_name = parts[0] || '';
        const last_name = parts.slice(1).join(' ') || 'Employee';
        
        // Is this employee already assigned here?
        const isAssigned = currentEmployees.some(emp => 
          emp.first_name.toLowerCase() === first_name.toLowerCase() && 
          emp.last_name.toLowerCase() === last_name.toLowerCase()
        );
        
        if (!isAssigned) {
          // Check if employee exists elsewhere in the database (maybe not assigned to any position)
          const existingEmp = await db.get(
            'SELECT * FROM employees WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)',
            [first_name, last_name]
          );
          
          if (existingEmp) {
            // Re-assign existing employee to this position
            await db.run('UPDATE employees SET current_position_id = ? WHERE id = ?', [id, existingEmp.id]);
          } else {
            // Create a new employee!
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const empId = `EMP-${randomNum}`;
            const email = `${first_name.toLowerCase()}.${last_name.toLowerCase().replace(/\s+/g, '')}@houstoncounty.gov`;
            const hireDate = new Date().toISOString().split('T')[0];
            
            await db.run(
              `INSERT INTO employees (employee_id_number, first_name, last_name, email, current_position_id, status, hire_date)
               VALUES (?, ?, ?, ?, ?, 'Active', ?)`,
              [empId, first_name, last_name, email, id, hireDate]
            );
          }
        }
      }

      // Re-calculate filled_slots count
      const activeCountRes = await db.get(
        `SELECT COUNT(*) as count FROM employees WHERE current_position_id = ? AND status = 'Active'`,
        [id]
      );
      const activeCount = activeCountRes ? activeCountRes.count : 0;
      await db.run('UPDATE positions SET filled_slots = ? WHERE id = ?', [activeCount, id]);
    }
    
    await logAudit(
      userEmail,
      'UPDATE',
      'positions',
      id,
      oldPosition,
      { approved_slots, status, job_title, grade, employee_names }
    );
    
    if (db.saveJsonDb) db.saveJsonDb();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Positions PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
