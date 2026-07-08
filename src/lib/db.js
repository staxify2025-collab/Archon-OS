const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const ENCRYPTION_KEY = Buffer.from('f98f6d76efd03bc2a188f6b2f4f20e9803bc2a188f6b2f4f20e983a48e71829e', 'hex'); // 32 bytes
const IV_LENGTH = 16; // For AES-256-CBC

// Encrypt utility
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decrypt utility
function decrypt(text) {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return '[DECRYPTION ERROR]';
  }
}

// Hybrid DB Engine: Tries to load sqlite3, falls back to a robust JSON-based mock database
let sqlite3 = null;
let sqliteOpen = null;
try {
  sqlite3 = require('sqlite3');
  sqliteOpen = require('sqlite').open;
  console.log('Successfully loaded sqlite3 driver.');
} catch (err) {
  console.warn('sqlite3 module not found. Falling back to Pure JS JSON-based database.');
}

const DB_SQLITE_PATH = path.join(process.cwd(), 'database.sqlite');
const DB_JSON_PATH = path.join(process.cwd(), 'database.json');

// Memory store for Pure JS fallback
let jsonDb = {
  departments: [],
  positions: [],
  employees: [],
  personnel_actions: [],
  audit_logs: []
};

// Load JSON db from file if it exists
function loadJsonDb() {
  if (fs.existsSync(DB_JSON_PATH)) {
    try {
      const data = fs.readFileSync(DB_JSON_PATH, 'utf8');
      jsonDb = JSON.parse(data);
    } catch (err) {
      console.error('Error loading JSON DB, starting fresh:', err);
    }
  }
}

// Save JSON db to file
function saveJsonDb() {
  try {
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(jsonDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving JSON DB:', err);
  }
}

class JsonDbWrapper {
  constructor() {
    loadJsonDb();
  }

  async exec(sql) {
    // Table creation queries - noop for JSON DB as schema is predefined in memory
    return true;
  }

  async run(sql, params = []) {
    const s = sql.trim().toLowerCase();
    
    if (s.startsWith('delete from')) {
      const tableName = sql.split(/\s+/)[2].toLowerCase();
      if (jsonDb[tableName]) {
        jsonDb[tableName] = [];
      }
      saveJsonDb();
      return { lastID: 0, changes: 0 };
    }

    if (s.startsWith('insert into')) {
      // Extract table name
      const tableName = sql.split(/\s+/)[2].toLowerCase();
      const list = jsonDb[tableName];
      if (!list) throw new Error(`Table ${tableName} not found in JSON store`);

      const lastID = list.length > 0 ? Math.max(...list.map(x => x.id || 0)) + 1 : 1;

      if (tableName === 'departments') {
        // [cost_center_code, name, division, budget_limit]
        list.push({
          id: lastID,
          cost_center_code: params[0],
          name: params[1],
          division: params[2],
          budget_limit: parseFloat(params[3]),
          created_at: new Date().toISOString()
        });
      } else if (tableName === 'positions') {
        // [dept_id, job_code, job_title, grade, approved_slots, filled_slots, status]
        list.push({
          id: lastID,
          dept_id: parseInt(params[0]),
          job_code: params[1],
          job_title: params[2],
          grade: params[3],
          approved_slots: parseInt(params[4]),
          filled_slots: parseInt(params[5]),
          status: params[6],
          created_at: new Date().toISOString()
        });
      } else if (tableName === 'employees') {
        // [employee_id_number, first_name, last_name, email, role, current_position_id, status, hire_date, ssn_encrypted]
        list.push({
          id: lastID,
          employee_id_number: params[0],
          first_name: params[1],
          last_name: params[2],
          email: params[3],
          role: params[4],
          current_position_id: params[5] ? parseInt(params[5]) : null,
          status: params[6],
          hire_date: params[7],
          ssn_encrypted: params[8],
          created_at: new Date().toISOString()
        });
      } else if (tableName === 'personnel_actions') {
        // [employee_id, action_type, effective_date, current_job_title, current_grade_step, current_salary, proposed_job_title, proposed_grade_step, proposed_salary, commission_approval_required, commission_meeting_date, status]
        list.push({
          id: lastID,
          employee_id: params[0] ? parseInt(params[0]) : null,
          action_type: params[1],
          effective_date: params[2],
          current_job_title: params[3],
          current_grade_step: params[4],
          current_salary: params[5] ? parseFloat(params[5]) : 0,
          proposed_job_title: params[6],
          proposed_grade_step: params[7],
          proposed_salary: params[8] ? parseFloat(params[8]) : 0,
          commission_approval_required: params[9],
          commission_meeting_date: params[10],
          status: 'Pending',
          created_at: new Date().toISOString()
        });
      } else if (tableName === 'audit_logs') {
        // [user_email, action, table_name, record_id, old_values, new_values, ip_address]
        list.push({
          id: lastID,
          user_email: params[0],
          action: params[1],
          table_name: params[2],
          record_id: parseInt(params[3]),
          old_values: params[4],
          new_values: params[5],
          ip_address: params[6],
          timestamp: new Date().toISOString()
        });
      }

      saveJsonDb();
      return { lastID, changes: 1 };
    }

    if (s.startsWith('update positions')) {
      if (s.includes('set filled_slots = 1')) {
        if (s.includes('fin-dir')) {
          jsonDb.positions.forEach(p => { if (p.job_code === 'FIN-DIR') p.filled_slots = 1; });
        } else if (s.includes('sr-acct')) {
          jsonDb.positions.forEach(p => { if (p.job_code === 'SR-ACCT') p.filled_slots = 1; });
        } else if (s.includes('rb-mnt')) {
          jsonDb.positions.forEach(p => { if (p.job_code === 'RB-MNT') p.filled_slots = 1; });
        } else if (s.includes('jail-dep')) {
          jsonDb.positions.forEach(p => { if (p.job_code === 'JAIL-DEP') p.filled_slots = 1; });
        }
      } else if (s.includes('set filled_slots =')) {
        // Generic set filled slots
        // UPDATE positions SET filled_slots = ? WHERE id = ?
        const match = sql.match(/WHERE\s+id\s*=\s*(\d+)/i);
        if (match) {
          const id = parseInt(match[1]);
          const pos = jsonDb.positions.find(p => p.id === id);
          if (pos) pos.filled_slots = parseInt(params[0]);
        }
      }
      saveJsonDb();
      return { lastID: 0, changes: 1 };
    }

    return { lastID: 0, changes: 0 };
  }

  async get(sql, params = []) {
    const s = sql.trim().toLowerCase();
    
    if (s.includes('from employees') && s.includes('where e.email = ?')) {
      const email = params[0];
      const emp = jsonDb.employees.find(e => e.email === email);
      if (!emp) return null;
      
      const pos = jsonDb.positions.find(p => p.id === emp.current_position_id);
      const dept = pos ? jsonDb.departments.find(d => d.id === pos.dept_id) : null;
      return {
        ...emp,
        cost_center_code: dept ? dept.cost_center_code : null
      };
    }

    if (s.includes('from employees') && s.includes('where employee_id_number = ?')) {
      const idNum = params[0];
      const emp = jsonDb.employees.find(e => e.employee_id_number === idNum);
      return emp || null;
    }

    return null;
  }

  async all(sql, params = []) {
    const s = sql.trim().toLowerCase();

    if (s.includes('select * from departments')) {
      return jsonDb.departments;
    }

    if (s.includes('select p.*, d.name as dept_name')) {
      // Join positions + departments + employees
      return jsonDb.positions.map(p => {
        const d = jsonDb.departments.find(dept => dept.id === p.dept_id) || {};
        
        // Find employees mapped to this position
        const emps = jsonDb.employees
          .filter(e => e.current_position_id === p.id)
          .map(e => `${e.first_name} ${e.last_name}`)
          .join(', ');

        return {
          id: p.id,
          dept_id: p.dept_id,
          job_code: p.job_code,
          job_title: p.job_title,
          grade: p.grade,
          approved_slots: p.approved_slots,
          filled_slots: p.filled_slots,
          status: p.status,
          dept_name: d.name || 'Unknown',
          cost_center_code: d.cost_center_code || '00000',
          employee_names: emps || null
        };
      });
    }

    if (s.includes('select id, employee_id_number, first_name, last_name, email, current_position_id, status, hire_date from employees')) {
      return jsonDb.employees.map(e => ({
        id: e.id,
        employee_id_number: e.employee_id_number,
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.email,
        current_position_id: e.current_position_id,
        status: e.status,
        hire_date: e.hire_date
      }));
    }

    if (s.includes('select pa.*, e.employee_id_number, e.first_name, e.last_name')) {
      return jsonDb.personnel_actions.map(pa => {
        const e = jsonDb.employees.find(emp => emp.id === pa.employee_id) || {};
        return {
          ...pa,
          employee_id_number: e.employee_id_number || null,
          first_name: e.first_name || null,
          last_name: e.last_name || null
        };
      }).sort((a,b) => b.effective_date.localeCompare(a.effective_date));
    }

    // CFO Arbitrary custom SELECTs emulated
    if (s.includes('where d.cost_center_code = \'53100\'') || s.includes('road & bridge')) {
      // Returns Road & Bridge budget actions
      const rbDept = jsonDb.departments.find(d => d.cost_center_code === '53100') || {};
      const rbEmps = jsonDb.employees.filter(e => {
        const pos = jsonDb.positions.find(p => p.id === e.current_position_id);
        return pos && pos.dept_id === rbDept.id;
      });
      
      const results = [];
      jsonDb.personnel_actions.forEach(pa => {
        // If proposed title matches Road/Bridge or matching employee
        const isRb = (pa.proposed_job_title && pa.proposed_job_title.includes('Road')) ||
                     (pa.proposed_job_title && pa.proposed_job_title.includes('Intern')) ||
                     rbEmps.some(e => e.id === pa.employee_id);
        if (isRb) {
          const empName = pa.employee_id 
            ? (() => { const e = jsonDb.employees.find(x => x.id === pa.employee_id); return e ? `${e.first_name} ${e.last_name}` : 'Unknown'; })()
            : 'James McGriff (NEW)';
          results.push({
            action_id: pa.id,
            employee: empName,
            type: pa.action_type,
            effective: pa.effective_date,
            budget_delta: pa.proposed_salary - (pa.current_salary || 0)
          });
        }
      });
      return results;
    }

    if (s.includes('where pa.proposed_job_title like \'%jail%\'')) {
      // Jail actions
      return jsonDb.personnel_actions.map(pa => {
        const e = jsonDb.employees.find(emp => emp.id === pa.employee_id) || {};
        return {
          id: pa.id,
          employee_name: e.first_name ? `${e.first_name} ${e.last_name}` : 'James McGriff (NEW)',
          action_type: pa.action_type,
          proposed_job_title: pa.proposed_job_title,
          proposed_salary: pa.proposed_salary,
          status: pa.status
        };
      }).filter(x => x.proposed_job_title.includes('Jail') || x.proposed_job_title.includes('Commander'));
    }

    // Default SELECT * from audit_logs
    if (s.includes('from audit_logs')) {
      return jsonDb.audit_logs;
    }

    return [];
  }
}

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  if (sqlite3 && sqliteOpen) {
    try {
      dbInstance = await sqliteOpen({
        filename: DB_SQLITE_PATH,
        driver: sqlite3.Database
      });
      console.log('Opened SQLite database at:', DB_SQLITE_PATH);
      return dbInstance;
    } catch (err) {
      console.error('Failed to open SQLite database, falling back to JSON db:', err);
    }
  }

  // Fallback
  dbInstance = new JsonDbWrapper();
  console.log('Opened JSON-based in-memory database at:', DB_JSON_PATH);
  return dbInstance;
}

// Initialise DB Schema
async function initDb() {
  const db = await getDb();
  if (!(db instanceof JsonDbWrapper)) {
    // Create departments table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cost_center_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        division TEXT NOT NULL,
        budget_limit REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create positions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dept_id INTEGER REFERENCES departments(id),
        job_code TEXT UNIQUE NOT NULL,
        job_title TEXT NOT NULL,
        grade TEXT NOT NULL,
        approved_slots INTEGER NOT NULL DEFAULT 1,
        filled_slots INTEGER NOT NULL DEFAULT 0,
        status TEXT CHECK (status IN ('Active', 'Hold', 'Freeze', 'Hiring Pipeline')) NOT NULL DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create employees table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id_number TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE,
        role TEXT CHECK (role IN ('Admin', 'Personnel Clerk', 'Department Head', 'Employee')) NOT NULL DEFAULT 'Employee',
        current_position_id INTEGER REFERENCES positions(id),
        status TEXT CHECK (status IN ('Active', 'On Leave', 'Suspended')) NOT NULL DEFAULT 'Active',
        hire_date TEXT NOT NULL,
        ssn_encrypted TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create personnel_actions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS personnel_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER REFERENCES employees(id),
        action_type TEXT CHECK (action_type IN ('New Hire', 'Promotion', 'Step Change', 'Termination', 'Separation', 'Salary Adjustment')) NOT NULL,
        effective_date TEXT NOT NULL,
        current_job_title TEXT,
        current_grade_step TEXT,
        current_salary REAL,
        proposed_job_title TEXT,
        proposed_grade_step TEXT,
        proposed_salary REAL,
        commission_approval_required INTEGER DEFAULT 1,
        commission_meeting_date TEXT,
        status TEXT CHECK (status IN ('Pending', 'Approved', 'Executed')) NOT NULL DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit_logs table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

// Log audit entries
async function logAudit(userEmail, action, tableName, recordId, oldValues, newValues, ipAddress = '127.0.0.1') {
  const db = await getDb();
  
  if (db instanceof JsonDbWrapper) {
    // Pure JS logging
    jsonDb.audit_logs.push({
      id: jsonDb.audit_logs.length + 1,
      user_email: userEmail,
      action: action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      ip_address: ipAddress,
      timestamp: new Date().toISOString()
    });
    saveJsonDb();
  } else {
    // SQLite3 logging
    await db.run(
      `INSERT INTO audit_logs (user_email, action, table_name, record_id, old_values, new_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userEmail,
        action,
        tableName,
        recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress
      ]
    );
  }
}

// Emulate RLS checks
async function getEmployeesRLS(currentUserEmail, currentUserRole, departmentFilter = null) {
  const db = await getDb();
  
  if (db instanceof JsonDbWrapper) {
    if (currentUserRole === 'Admin' || currentUserRole === 'Personnel Clerk') {
      let emps = jsonDb.employees.map(e => {
        const pos = jsonDb.positions.find(p => p.id === e.current_position_id) || {};
        const d = jsonDb.departments.find(dept => dept.id === pos.dept_id) || {};
        return {
          ...e,
          job_title: pos.job_title || null,
          job_code: pos.job_code || null,
          grade: pos.grade || null,
          dept_name: d.name || null,
          cost_center_code: d.cost_center_code || null
        };
      });
      if (departmentFilter) {
        emps = emps.filter(e => e.cost_center_code === departmentFilter);
      }
      return emps;
    } else {
      // Employee filter self
      const emp = jsonDb.employees.find(e => e.email === currentUserEmail);
      if (!emp) return [];
      const pos = jsonDb.positions.find(p => p.id === emp.current_position_id) || {};
      const d = jsonDb.departments.find(dept => dept.id === pos.dept_id) || {};
      return [{
        ...emp,
        job_title: pos.job_title || null,
        job_code: pos.job_code || null,
        grade: pos.grade || null,
        dept_name: d.name || null,
        cost_center_code: d.cost_center_code || null
      }];
    }
  } else {
    // SQLite RLS query logic
    if (currentUserRole === 'Admin' || currentUserRole === 'Personnel Clerk') {
      let sql = `
        SELECT e.*, p.job_title, p.job_code, p.grade, d.name as dept_name, d.cost_center_code
        FROM employees e
        LEFT JOIN positions p ON e.current_position_id = p.id
        LEFT JOIN departments d ON p.dept_id = d.id
      `;
      const params = [];
      if (departmentFilter) {
        sql += ` WHERE d.cost_center_code = ?`;
        params.push(departmentFilter);
      }
      return db.all(sql, params);
    } else {
      const sql = `
        SELECT e.*, p.job_title, p.job_code, p.grade, d.name as dept_name, d.cost_center_code
        FROM employees e
        LEFT JOIN positions p ON e.current_position_id = p.id
        LEFT JOIN departments d ON p.dept_id = d.id
        WHERE e.email = ?
      `;
      return db.all(sql, [currentUserEmail]);
    }
  }
}

module.exports = {
  getDb,
  initDb,
  encrypt,
  decrypt,
  logAudit,
  getEmployeesRLS
};
