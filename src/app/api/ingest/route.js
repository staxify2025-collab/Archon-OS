import { NextResponse } from 'next/server';
import { getDb, logAudit } from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

export async function POST(request) {
  try {
    const db = await getDb();
    
    // In a real upload, we would parse request.formData() files.
    // For this dashboard overlay demonstration, we load the mock roster spreadsheet in-memory.
    const csvPath = path.join(process.cwd(), 'data', 'sample_roster.csv');
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: 'Sample roster CSV missing' }, { status: 404 });
    }
    
    const fileBuffer = fs.readFileSync(csvPath);
    
    // Parse using SheetJS (XLSX)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet);

    // Fetch database employees and their position details
    const dbEmployees = await db.all(`
      SELECT e.id, e.employee_id_number, e.first_name, e.last_name, 
             p.job_code, p.job_title, p.grade, d.cost_center_code
      FROM employees e
      LEFT JOIN positions p ON e.current_position_id = p.id
      LEFT JOIN departments d ON p.dept_id = d.id
    `);

    const dbEmpMap = {};
    dbEmployees.forEach(emp => {
      dbEmpMap[emp.employee_id_number] = emp;
    });

    const discrepancies = [];

    // Run Reconciliation Match Engine
    for (const row of sheetData) {
      const csvEmpId = row['Employee ID'];
      const csvName = row['Name'];
      const csvJobCode = row['Job Code'];
      const csvSalary = parseFloat(row['Salary']);
      const csvDept = row['Department'];

      const dbEmp = dbEmpMap[csvEmpId];

      if (!dbEmp) {
        // Anomaly 1: Employee on spreadsheet is missing from database
        discrepancies.push({
          type: 'Missing Employee Profile',
          severity: 'critical',
          target: csvName,
          message: `Employee "${csvName}" (${csvEmpId}) was found in the payroll Excel export under Dept ${csvDept}, but has no active personnel profile or record in Archon OS database.`
        });
        continue;
      }

      // Anomaly 2: Name spelling variance
      const dbFullNameLower = `${dbEmp.last_name}, ${dbEmp.first_name}`.toLowerCase();
      const csvNameLower = csvName.toLowerCase();
      if (dbFullNameLower !== csvNameLower && !dbFullNameLower.includes(csvNameLower) && !csvNameLower.includes(dbFullNameLower)) {
        discrepancies.push({
          type: 'Name Spelling Variance',
          severity: 'low',
          target: csvEmpId,
          message: `Name variance detected: Excel roster lists "${csvName}", but Archon OS database records "${dbEmp.first_name} ${dbEmp.last_name}".`
        });
      }

      // Anomaly 3: Job Code/Position slot mismatch
      if (dbEmp.job_code !== csvJobCode) {
        discrepancies.push({
          type: 'Unlogged Position Assignment',
          severity: 'critical',
          target: csvEmpId,
          message: `Position mismatch: Excel roster registers "${csvName}" under position "${csvJobCode}", but database maps this employee to slot "${dbEmp.job_code || 'UNASSIGNED'}".`
        });
      }

      // Anomaly 4: Salary Budget Overrun / Mismatch
      // Suppose we have position budget limits. Grade 8 max is $48,000.
      if (dbEmp.grade === 'Grade 8' && csvSalary > 48000) {
        discrepancies.push({
          type: 'Salary Cap Breach',
          severity: 'high',
          target: csvEmpId,
          message: `Salary cap breach: Arthur Pendelton is listed with salary $${csvSalary.toLocaleString()} on payroll Excel sheet, which exceeds the authorized cap for ${dbEmp.grade} ($48,000).`
        });
      }
    }

    // Log the reconciliation audit log
    await logAudit(
      'marcus@houstoncounty.gov',
      'EXPORT', // reconciliation export matching
      'audit_logs',
      0,
      null,
      { fileIngested: 'sample_roster.csv', discrepanciesCount: discrepancies.length }
    );

    return NextResponse.json({
      success: true,
      recordsProcessed: sheetData.length,
      discrepancies
    });
  } catch (err) {
    console.error('Spreadsheet Ingestion error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
