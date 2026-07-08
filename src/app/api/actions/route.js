import { NextResponse } from 'next/server';
import { getDb, logAudit, encrypt } from '../../../lib/db';

export async function GET(request) {
  try {
    const db = await getDb();
    const actions = await db.all(`
      SELECT pa.*, e.employee_id_number, e.first_name, e.last_name
      FROM personnel_actions pa
      LEFT JOIN employees e ON pa.employee_id = e.id
      ORDER BY pa.effective_date DESC
    `);
    return NextResponse.json(actions);
  } catch (err) {
    console.error('API Actions GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { actions } = body;
    
    if (!actions || !Array.isArray(actions)) {
      return NextResponse.json({ error: 'Invalid actions body' }, { status: 400 });
    }
    
    const userEmail = 'marcus@houstoncounty.gov';
    
    for (const action of actions) {
      let empId = null;
      if (action.employee_id_number) {
        const emp = await db.get(
          'SELECT id FROM employees WHERE employee_id_number = ?',
          [action.employee_id_number]
        );
        if (emp) empId = emp.id;
      }
      
      const res = await db.run(
        `INSERT INTO personnel_actions 
         (employee_id, action_type, effective_date, current_job_title, current_grade_step, current_salary, proposed_job_title, proposed_grade_step, proposed_salary, commission_approval_required, commission_meeting_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'Pending')`,
        [
          empId,
          action.action_type,
          action.effective_date,
          action.current_job_title,
          action.current_grade_step,
          action.current_salary,
          action.proposed_job_title,
          action.proposed_grade_step,
          action.proposed_salary,
          action.effective_date
        ]
      );
      
      await logAudit(
        userEmail,
        'CREATE',
        'personnel_actions',
        res.lastID,
        null,
        action
      );
    }
    
    if (db.saveJsonDb) db.saveJsonDb();
    return NextResponse.json({ success: true, count: actions.length });
  } catch (err) {
    console.error('API Actions POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const db = await getDb();
    const { id, status } = await request.json();
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing action ID or status' }, { status: 400 });
    }
    
    const userEmail = 'marcus@houstoncounty.gov';
    
    // Fetch the target personnel action details
    const action = await db.get('SELECT * FROM personnel_actions WHERE id = ?', [id]);
    if (!action) {
      return NextResponse.json({ error: 'Personnel action not found' }, { status: 404 });
    }
    
    const oldValues = { ...action };
    
    if (status === 'Executed' && action.status !== 'Executed') {
      // 1. Process New Hires
      if (action.action_type === 'New Hire') {
        const nextIdNumber = 'EMP-' + (3000 + Math.floor(Math.random() * 1000));
        
        // Find proposed position ID
        let posId = null;
        const pos = await db.get('SELECT id, filled_slots FROM positions WHERE job_title = ? OR job_code = ?', [action.proposed_job_title, action.proposed_job_title]);
        if (pos) {
          posId = pos.id;
          // Increment filled slot
          await db.run('UPDATE positions SET filled_slots = ? WHERE id = ?', [pos.filled_slots + 1, pos.id]);
        }
        
        const first = action.proposed_job_title.split(' ')[0] || 'Pending';
        const last = 'Name';
        const ssnEnc = encrypt('999-00-0000');
        
        const resEmp = await db.run(
          `INSERT INTO employees (employee_id_number, first_name, last_name, email, role, current_position_id, status, hire_date, ssn_encrypted)
           VALUES (?, ?, ?, ?, 'Employee', ?, 'Active', ?, ?)`,
          [nextIdNumber, first, last, `${first.toLowerCase()}.${last.toLowerCase()}@houstoncounty.gov`, posId, action.effective_date, ssnEnc]
        );
        
        // Update personnel action to point to new employee ID
        await db.run('UPDATE personnel_actions SET employee_id = ? WHERE id = ?', [resEmp.lastID, id]);
      }
      
      // 2. Process Promotions
      if (action.action_type === 'Promotion' && action.employee_id) {
        const emp = await db.get('SELECT * FROM employees WHERE id = ?', [action.employee_id]);
        
        if (emp) {
          // Decrement old position filled_slots
          if (emp.current_position_id) {
            const oldPos = await db.get('SELECT id, filled_slots FROM positions WHERE id = ?', [emp.current_position_id]);
            if (oldPos) {
              await db.run('UPDATE positions SET filled_slots = ? WHERE id = ?', [Math.max(0, oldPos.filled_slots - 1), oldPos.id]);
            }
          }
          
          // Find new position
          const newPos = await db.get('SELECT id, filled_slots FROM positions WHERE job_title = ?', [action.proposed_job_title]);
          let newPosId = emp.current_position_id;
          if (newPos) {
            newPosId = newPos.id;
            await db.run('UPDATE positions SET filled_slots = ? WHERE id = ?', [newPos.filled_slots + 1, newPos.id]);
          }
          
          // Update employee position
          await db.run('UPDATE employees SET current_position_id = ? WHERE id = ?', [newPosId, emp.id]);
        }
      }
      
      // 3. Process Terminations
      if (action.action_type === 'Termination' && action.employee_id) {
        const emp = await db.get('SELECT * FROM employees WHERE id = ?', [action.employee_id]);
        if (emp) {
          await db.run('UPDATE employees SET status = "Terminated", current_position_id = NULL WHERE id = ?', [emp.id]);
          
          if (emp.current_position_id) {
            const pos = await db.get('SELECT id, filled_slots FROM positions WHERE id = ?', [emp.current_position_id]);
            if (pos) {
              await db.run('UPDATE positions SET filled_slots = ? WHERE id = ?', [Math.max(0, pos.filled_slots - 1), pos.id]);
            }
          }
        }
      }
    }
    
    // Update the action status
    await db.run('UPDATE personnel_actions SET status = ? WHERE id = ?', [status, id]);
    
    await logAudit(
      userEmail,
      'UPDATE',
      'personnel_actions',
      id,
      oldValues,
      { status }
    );
    
    if (db.saveJsonDb) db.saveJsonDb();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Actions PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const db = await getDb();
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing action ID' }, { status: 400 });
    }
    
    const userEmail = 'marcus@houstoncounty.gov';
    
    // Delete action
    await db.run('DELETE FROM personnel_actions WHERE id = ?', [id]);
    
    await logAudit(
      userEmail,
      'DELETE',
      'personnel_actions',
      id,
      { deleted: true },
      null
    );
    
    if (db.saveJsonDb) db.saveJsonDb();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Actions DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
