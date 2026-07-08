const { initDb, getDb, encrypt, logAudit } = require('../src/lib/db');

async function run() {
  console.log('Initializing database tables with ALL real Houston County data...');
  await initDb();
  const db = await getDb();

  // Clear existing data
  await db.run('DELETE FROM personnel_actions');
  await db.run('DELETE FROM employees');
  await db.run('DELETE FROM positions');
  await db.run('DELETE FROM departments');
  await db.run('DELETE FROM audit_logs');

  console.log('Inserting departments...');
  const depts = [
    { code: '51100', name: 'Commission', division: 'General Government', budget: 1500000.00 },
    { code: '51110', name: 'Accounting', division: 'General Government', budget: 900000.00 },
    { code: '51130', name: 'Facilities and Grounds', division: 'General Government', budget: 2500000.00 },
    { code: '51300', name: 'Probate', division: 'General Government', budget: 3500000.00 },
    { code: '51500', name: 'Revenue Commission', division: 'General Government', budget: 1400000.00 },
    { code: '51920', name: 'Registrar', division: 'General Government', budget: 500000.00 },
    { code: '51960', name: 'Personnel', division: 'General Government', budget: 600000.00 },
    { code: '51961', name: 'Safety', division: 'General Government', budget: 300000.00 },
    { code: '51965', name: 'Information Technology', division: 'General Government', budget: 1800000.00 },
    { code: '51985', name: 'Reappraisal', division: 'General Government', budget: 1100000.00 },
    { code: '52100', name: 'Sheriff', division: 'Public Safety', budget: 9500000.00 },
    { code: '52150', name: 'Rabies Control', division: 'Public Safety', budget: 400000.00 },
    { code: '52200', name: 'County Jail', division: 'Public Safety', budget: 8500000.00 },
    { code: '52300', name: 'EMA', division: 'Public Safety', budget: 800000.00 },
    { code: '52400', name: 'Coroner', division: 'Public Safety', budget: 250000.00 },
    { code: '52910', name: 'Community Corrections', division: 'Public Safety', budget: 1300000.00 },
    { code: '53100', name: 'Road & Bridge', division: 'Public Works', budget: 12000000.00 },
    { code: '54100', name: 'Sanitation', division: 'Public Works', budget: 4500000.00 },
    { code: '54110', name: 'Sanitation Billing', division: 'Public Works', budget: 800000.00 },
    { code: '56202', name: 'In Home Services', division: 'Health & Welfare', budget: 700000.00 },
    { code: '56204', name: 'Senior Citizens Centers', division: 'Health & Welfare', budget: 600000.00 }
  ];

  const deptMap = {};
  for (const d of depts) {
    const res = await db.run(
      `INSERT INTO departments (cost_center_code, name, division, budget_limit) VALUES (?, ?, ?, ?)`,
      [d.code, d.name, d.division, d.budget]
    );
    deptMap[d.code] = res.lastID;
  }

  // Large arrays for all positions and employees
  const positionsRaw = [];
  const employeesRaw = [];

  // 1. Accounting 51110
  positionsRaw.push(
    { deptCode: '51110', jobCode: '468', title: 'Accounting Assistant', grade: 'Grade 10', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51110', jobCode: '806', title: 'Accounting Clerk', grade: 'Grade 8', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51110', jobCode: '467', title: 'Accounting Manager', grade: 'Grade 15', approved: 1, filled: 0, status: 'Hold' },
    { deptCode: '51110', jobCode: '122', title: 'Admn Asst-Acctg', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-3001', first: 'Martha', last: 'Walker', email: 'martha.walker@houstoncounty.gov', role: 'Employee', posCode: '468', status: 'Active', hireDate: '2018-02-10', ssn: '999-00-1111' },
    { idNum: 'EMP-3002', first: 'Teresa', last: 'Shortsleeve', email: 'teresa.s@houstoncounty.gov', role: 'Employee', posCode: '806', status: 'Active', hireDate: '2019-06-15', ssn: '999-00-2222' },
    { idNum: 'EMP-3003', first: 'Gentry', last: 'McClenny', email: 'gentry.mcclenny@houstoncounty.gov', role: 'Personnel Clerk', posCode: '122', status: 'Active', hireDate: '2021-04-01', ssn: '999-00-3333' }
  );

  // 2. Commission 51100
  positionsRaw.push(
    { deptCode: '51100', jobCode: '185', title: 'Executive Assistant', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51100', jobCode: '859', title: 'Chairman County Commission', grade: 'Elected', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51100', jobCode: '860-1', title: 'County Commissioner', grade: 'Elected', approved: 4, filled: 4, status: 'Active' },
    { deptCode: '51100', jobCode: '405', title: 'Chief Admin Officer', grade: 'Grade 20', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51100', jobCode: '465', title: 'Grant Writer', grade: 'Grade 12', approved: 1, filled: 0, status: 'Hiring Pipeline' }
  );
  employeesRaw.push(
    { idNum: 'EMP-3101', first: 'Jackie', last: 'Culpepper', email: 'jackie.c@houstoncounty.gov', role: 'Employee', posCode: '185', status: 'Active', hireDate: '2014-08-01', ssn: '999-00-4444' },
    { idNum: 'EMP-3102', first: 'Brandon', last: 'Shoupe', email: 'brandon.shoupe@houstoncounty.gov', role: 'Department Head', posCode: '859', status: 'Active', hireDate: '2020-11-03', ssn: '999-00-5555' },
    { idNum: 'EMP-3103', first: 'Curtis', last: 'Harvey', email: 'curtis.harvey@houstoncounty.gov', role: 'Employee', posCode: '860-1', status: 'Active', hireDate: '2020-11-03', ssn: '999-00-6666' },
    { idNum: 'EMP-3104', first: 'Tracy', last: 'Adams', email: 'tracy.adams@houstoncounty.gov', role: 'Employee', posCode: '860-1', status: 'Active', hireDate: '2020-11-03', ssn: '999-00-7777' },
    { idNum: 'EMP-3105', first: 'Ricky', last: 'Herring', email: 'ricky.herring@houstoncounty.gov', role: 'Employee', posCode: '860-1', status: 'Active', hireDate: '2020-11-03', ssn: '999-00-8888' },
    { idNum: 'EMP-3106', first: 'James', last: 'Ivey', email: 'james.ivey@houstoncounty.gov', role: 'Employee', posCode: '860-1', status: 'Active', hireDate: '2020-11-03', ssn: '999-00-9999' },
    { idNum: 'EMP-3107', first: 'Stacey', last: 'Holland', email: 'stacey.h@houstoncounty.gov', role: 'Employee', posCode: '405', status: 'Active', hireDate: '2016-09-01', ssn: '999-01-1111' }
  );

  // 3. Community Corrections 52910
  positionsRaw.push(
    { deptCode: '52910', jobCode: '408', title: 'Comm Corr Director', grade: 'Grade 16', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52910', jobCode: '403', title: 'Investigator', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52910', jobCode: '401', title: 'Probation Officer I', grade: 'Grade 10', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52910', jobCode: '402', title: 'Probation Officer II', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52910', jobCode: '406', title: 'Social Svcs Specialist', grade: 'Grade 10', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52910', jobCode: '404', title: 'Job Placement Specialist', grade: 'Grade 10', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52910', jobCode: '407', title: 'Operations Officer', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52910', jobCode: '409', title: 'Comm Corr Assistant Director', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52910', jobCode: '400', title: 'Comm Corr Acct Specialist', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-3291', first: 'Tony', last: 'Weber', email: 'tony.weber@houstoncounty.gov', role: 'Department Head', posCode: '408', status: 'Active', hireDate: '2015-06-01', ssn: '999-02-1111' },
    { idNum: 'EMP-3292', first: 'Christopher', last: 'Jerkins', email: 'christopher.j@houstoncounty.gov', role: 'Employee', posCode: '403', status: 'Active', hireDate: '2018-09-10', ssn: '999-02-2222' },
    { idNum: 'EMP-3293', first: 'Rachel', last: 'Ford', email: 'rachel.ford@houstoncounty.gov', role: 'Employee', posCode: '401', status: 'Active', hireDate: '2020-02-15', ssn: '999-02-3333' },
    { idNum: 'EMP-3294', first: 'Brendon', last: 'Morse', email: 'brendon.morse@houstoncounty.gov', role: 'Employee', posCode: '402', status: 'Active', hireDate: '2019-11-01', ssn: '999-02-4444' },
    { idNum: 'EMP-3295', first: 'Mekki', last: 'Klein', email: 'mekki.klein@houstoncounty.gov', role: 'Employee', posCode: '406', status: 'Active', hireDate: '2021-08-01', ssn: '999-02-5555' },
    { idNum: 'EMP-3296', first: 'Heather', last: 'Seawright', email: 'heather.s@houstoncounty.gov', role: 'Employee', posCode: '404', status: 'Active', hireDate: '2020-05-15', ssn: '999-02-6666' },
    { idNum: 'EMP-3297', first: 'Andrew', last: 'Brown', email: 'andrew.brown@houstoncounty.gov', role: 'Employee', posCode: '407', status: 'Active', hireDate: '2017-04-20', ssn: '999-02-7777' },
    { idNum: 'EMP-3298', first: 'Erika', last: 'Tyson', email: 'erika.tyson@houstoncounty.gov', role: 'Employee', posCode: '409', status: 'Active', hireDate: '2016-12-01', ssn: '999-02-8888' },
    { idNum: 'EMP-3299', first: 'Connie', last: 'Kelley', email: 'connie.kelley@houstoncounty.gov', role: 'Employee', posCode: '400', status: 'Active', hireDate: '2018-03-10', ssn: '999-02-9999' }
  );

  // 4. Coroner 52400
  positionsRaw.push(
    { deptCode: '52400', jobCode: '873', title: 'Coroner', grade: 'Elected', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-3240', first: 'Robert', last: 'Byrd', email: 'robert.byrd@houstoncounty.gov', role: 'Department Head', posCode: '873', status: 'Active', hireDate: '2012-11-06', ssn: '999-03-1111' }
  );

  // 5. Facilities and Grounds 51130
  positionsRaw.push(
    { deptCode: '51130', jobCode: '760', title: 'Facilities Dept Supv', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51130', jobCode: '755-1', title: 'Facilities Maint Tech', grade: 'Grade 10', approved: 3, filled: 3, status: 'Active' },
    { deptCode: '51130', jobCode: '755-2', title: 'Facilities Maint Tech (J McLean)', grade: 'Grade 10', approved: 1, filled: 0, status: 'Hold' },
    { deptCode: '51130', jobCode: '757', title: 'Facilities Construction Tech', grade: 'Grade 10', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51130', jobCode: '731', title: 'Safety, Inv & Fac Foreman', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51130', jobCode: '744', title: 'Janitorial Foreman', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51130', jobCode: '394', title: 'Construction Foreman', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51130', jobCode: '752', title: 'HVAC Controls & Electical', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51130', jobCode: '566', title: 'Facilities & Grounds Director', grade: 'Grade 17', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51130', jobCode: '567', title: 'Admin Asst-Facilities & Grounds', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51130', jobCode: '732', title: 'HVAC PM Tech', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51130', jobCode: '730', title: 'Facilities & Grounds Worker', grade: 'Grade 8', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-3131', first: 'Alan', last: 'Taylor', email: 'alan.taylor@houstoncounty.gov', role: 'Department Head', posCode: '760', status: 'Active', hireDate: '2015-04-10', ssn: '999-04-1111' },
    { idNum: 'EMP-3132', first: 'Clifford', last: 'Dean', email: 'clifford.dean@houstoncounty.gov', role: 'Employee', posCode: '755-1', status: 'Active', hireDate: '2017-08-15', ssn: '999-04-2222' },
    { idNum: 'EMP-3133', first: 'Michael', last: 'Deacon', email: 'michael.deacon@houstoncounty.gov', role: 'Employee', posCode: '755-1', status: 'Active', hireDate: '2019-03-01', ssn: '999-04-3333' },
    { idNum: 'EMP-3134', first: 'Jeremy', last: 'Owens', email: 'jeremy.owens@houstoncounty.gov', role: 'Employee', posCode: '755-1', status: 'Active', hireDate: '2020-05-12', ssn: '999-04-4444' },
    { idNum: 'EMP-3135', first: 'Larry', last: 'Mobley', email: 'larry.mobley@houstoncounty.gov', role: 'Employee', posCode: '757', status: 'Active', hireDate: '2018-11-20', ssn: '999-04-5555' },
    { idNum: 'EMP-3136', first: 'Lee', last: 'Herring', email: 'lee.herring@houstoncounty.gov', role: 'Employee', posCode: '731', status: 'Active', hireDate: '2016-02-01', ssn: '999-04-6666' },
    { idNum: 'EMP-3137', first: 'Faye', last: 'Gray', email: 'faye.gray@houstoncounty.gov', role: 'Employee', posCode: '744', status: 'Active', hireDate: '2014-06-15', ssn: '999-04-7777' },
    { idNum: 'EMP-3138', first: 'Brian', last: 'Skelton', email: 'brian.skelton@houstoncounty.gov', role: 'Employee', posCode: '394', status: 'Active', hireDate: '2015-09-01', ssn: '999-04-8888' },
    { idNum: 'EMP-3139', first: 'Clay', last: 'Aman', email: 'clay.aman@houstoncounty.gov', role: 'Employee', posCode: '752', status: 'Active', hireDate: '2017-01-15', ssn: '999-04-9999' },
    { idNum: 'EMP-3140', first: 'Thomas', last: 'Dixon', email: 'thomas.dixon@houstoncounty.gov', role: 'Employee', posCode: '566', status: 'Active', hireDate: '2013-05-20', ssn: '999-05-1111' },
    { idNum: 'EMP-3141', first: 'Tiffani', last: 'Cunningham', email: 'tiffani.c@houstoncounty.gov', role: 'Employee', posCode: '567', status: 'Active', hireDate: '2021-10-01', ssn: '999-05-2222' },
    { idNum: 'EMP-3142', first: 'Marquis', last: 'Thomas-Forsythe', email: 'marquis.tf@houstoncounty.gov', role: 'Employee', posCode: '732', status: 'Active', hireDate: '2020-07-15', ssn: '999-05-3333' },
    { idNum: 'EMP-3865', first: 'Andrew', last: 'Chapman', email: 'andrew.c@houstoncounty.gov', role: 'Employee', posCode: '730', status: 'Active', hireDate: '2026-06-08', ssn: '999-05-4444' }
  );

  // 6. EMA 52300
  positionsRaw.push(
    { deptCode: '52300', jobCode: '397', title: 'Operations Support', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52300', jobCode: '585', title: 'Deputy Director', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52300', jobCode: '265', title: 'EMA Director', grade: 'Grade 16', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52300', jobCode: '267', title: 'EMA Specialist', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-3231', first: 'Kathy', last: 'Turner', email: 'kathy.turner@houstoncounty.gov', role: 'Employee', posCode: '397', status: 'Active', hireDate: '2019-01-15', ssn: '999-06-1111' },
    { idNum: 'EMP-3232', first: 'Jamie', last: 'Shell', email: 'jamie.shell@houstoncounty.gov', role: 'Employee', posCode: '585', status: 'Active', hireDate: '2018-04-01', ssn: '999-06-2222' },
    { idNum: 'EMP-3233', first: 'Mark', last: 'Powell', email: 'mark.powell@houstoncounty.gov', role: 'Department Head', posCode: '265', status: 'Active', hireDate: '2015-11-10', ssn: '999-06-3333' },
    { idNum: 'EMP-3234', first: 'Matthew', last: 'Denson', email: 'matthew.denson@houstoncounty.gov', role: 'Employee', posCode: '267', status: 'Active', hireDate: '2021-08-20', ssn: '999-06-4444' }
  );

  // 7. In Home Services 56202
  positionsRaw.push(
    { deptCode: '56202', jobCode: '910', title: 'In Home Service Director', grade: 'Grade 14', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '56202', jobCode: '850-1', title: 'Senior Service Worker', grade: 'Grade 8', approved: 3, filled: 3, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-5621', first: 'Sherry', last: 'Douglas', email: 'sherry.douglas@houstoncounty.gov', role: 'Department Head', posCode: '910', status: 'Active', hireDate: '2013-09-01', ssn: '999-07-1111' },
    { idNum: 'EMP-5622', first: 'Shelia', last: 'McGhee', email: 'shelia.m@houstoncounty.gov', role: 'Employee', posCode: '850-1', status: 'Active', hireDate: '2016-05-15', ssn: '999-07-2222' },
    { idNum: 'EMP-5623', first: 'Glen', last: 'Pipkin', email: 'glen.pipkin@houstoncounty.gov', role: 'Employee', posCode: '850-1', status: 'Active', hireDate: '2018-07-01', ssn: '999-07-3333' },
    { idNum: 'EMP-5624', first: 'Dana', last: 'Weed', email: 'dana.weed@houstoncounty.gov', role: 'Employee', posCode: '850-1', status: 'Active', hireDate: '2020-04-10', ssn: '999-07-4444' }
  );

  // 8. IT 51965
  positionsRaw.push(
    { deptCode: '51965', jobCode: '343', title: 'Sr Systems Analyst - Applications', grade: 'Grade 14', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51965', jobCode: '342', title: 'Mail Control Specialist/IT Tech', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51965', jobCode: '290', title: 'IT Director', grade: 'Grade 18', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51965', jobCode: '291', title: 'IT Support Specialist', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51965', jobCode: '341', title: 'Computer Analyst Prog III', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51965', jobCode: '345', title: 'Sr Systems Analyst - Networking', grade: 'Grade 14', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51965', jobCode: '387', title: 'IT Application Edu Specialist', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-5191', first: 'Ami', last: 'Denault', email: 'ami.d@houstoncounty.gov', role: 'Employee', posCode: '343', status: 'Active', hireDate: '2016-03-10', ssn: '999-08-1111' },
    { idNum: 'EMP-5192', first: 'Angie', last: 'Richards', email: 'angie.r@houstoncounty.gov', role: 'Employee', posCode: '342', status: 'Active', hireDate: '2019-11-15', ssn: '999-08-2222' },
    { idNum: 'EMP-5193', first: 'Del', last: 'Hollis', email: 'del.hollis@houstoncounty.gov', role: 'Department Head', posCode: '290', status: 'Active', hireDate: '2012-08-01', ssn: '999-08-3333' },
    { idNum: 'EMP-5194', first: 'Brian', last: 'Jones', email: 'brian.jones@houstoncounty.gov', role: 'Employee', posCode: '291', status: 'Active', hireDate: '2021-05-10', ssn: '999-08-4444' },
    { idNum: 'EMP-5195', first: 'Bruce', last: 'Collins', email: 'bruce.collins@houstoncounty.gov', role: 'Employee', posCode: '341', status: 'Active', hireDate: '2015-02-20', ssn: '999-08-5555' },
    { idNum: 'EMP-5196', first: 'Greg', last: 'Marshall', email: 'greg.m@houstoncounty.gov', role: 'Employee', posCode: '345', status: 'Active', hireDate: '2014-06-01', ssn: '999-08-6666' },
    { idNum: 'EMP-5197', first: 'Roger', last: 'Howell', email: 'roger.h@houstoncounty.gov', role: 'Employee', posCode: '387', status: 'Active', hireDate: '2020-04-15', ssn: '999-08-7777' }
  );

  // 9. Personnel 51960
  positionsRaw.push(
    { deptCode: '51960', jobCode: '501', title: 'Personnel Director', grade: 'Grade 18', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51960', jobCode: '186', title: 'Personnel Specialist', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51960', jobCode: '187', title: 'Personnel Assistant', grade: 'Grade 9', approved: 1, filled: 0, status: 'Hold' },
    { deptCode: '51960', jobCode: '807', title: 'Payroll/Retirement Administrator', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-3201', first: 'Sheri', last: 'Garner', email: 'sheri.garner@houstoncounty.gov', role: 'Admin', posCode: '501', status: 'Active', hireDate: '2012-05-15', ssn: '999-00-6666' },
    { idNum: 'EMP-3202', first: 'Kristin', last: 'Tyson', email: 'kristin.tyson@houstoncounty.gov', role: 'Personnel Clerk', posCode: '186', status: 'Active', hireDate: '2022-02-01', ssn: '999-00-7777' },
    { idNum: 'EMP-3203', first: 'Anisa', last: 'McKenzie', email: 'anisa.m@houstoncounty.gov', role: 'Employee', posCode: '807', status: 'Active', hireDate: '2019-09-01', ssn: '999-08-8888' }
  );

  // 10. Rabies Control 52150
  positionsRaw.push(
    { deptCode: '52150', jobCode: '153', title: 'Certified Animal Control Officer', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52150', jobCode: '152', title: 'Sr. Animal Control Officer', grade: 'Grade 10', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52150', jobCode: '151', title: 'Environmental Ser. Supv.', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-5211', first: 'Jeremy', last: 'Davis', email: 'jeremy.davis@houstoncounty.gov', role: 'Employee', posCode: '153', status: 'Active', hireDate: '2021-06-15', ssn: '999-09-1111' },
    { idNum: 'EMP-5212', first: 'Walter', last: 'Lewis', email: 'walter.l@houstoncounty.gov', role: 'Employee', posCode: '152', status: 'Active', hireDate: '2019-03-01', ssn: '999-09-2222' },
    { idNum: 'EMP-5213', first: 'Kym', last: 'Wilson', email: 'kym.wilson@houstoncounty.gov', role: 'Department Head', posCode: '151', status: 'Active', hireDate: '2015-11-20', ssn: '999-09-3333' }
  );

  // 11. Reappraisal 51985
  positionsRaw.push(
    { deptCode: '51985', jobCode: '362', title: 'Mapper III', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51985', jobCode: '357', title: 'Chief Appraisal Supv', grade: 'Grade 15', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51985', jobCode: '350', title: 'Appraiser I', grade: 'Grade 9', approved: 4, filled: 4, status: 'Active' },
    { deptCode: '51985', jobCode: '353', title: 'Appraiser IV', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-5181', first: 'Chad', last: 'Searcy', email: 'chad.searcy@houstoncounty.gov', role: 'Employee', posCode: '362', status: 'Active', hireDate: '2018-04-10', ssn: '999-10-1111' },
    { idNum: 'EMP-5182', first: 'Jackelyn', last: 'Greenwood', email: 'jackelyn.g@houstoncounty.gov', role: 'Department Head', posCode: '357', status: 'Active', hireDate: '2014-09-15', ssn: '999-10-2222' },
    { idNum: 'EMP-5183', first: 'Camille', last: 'Farmer', email: 'camille.f@houstoncounty.gov', role: 'Employee', posCode: '350', status: 'Active', hireDate: '2021-02-15', ssn: '999-10-3333' },
    { idNum: 'EMP-5184', first: 'Justin', last: 'Harrison', email: 'justin.h@houstoncounty.gov', role: 'Employee', posCode: '350', status: 'Active', hireDate: '2022-06-01', ssn: '999-10-4444' },
    { idNum: 'EMP-5185', first: 'Kiefer', last: 'Parrish', email: 'kiefer.p@houstoncounty.gov', role: 'Employee', posCode: '350', status: 'Active', hireDate: '2020-03-10', ssn: '999-10-5555' },
    { idNum: 'EMP-5186', first: 'Melissa', last: 'Thomley', email: 'melissa.t@houstoncounty.gov', role: 'Employee', posCode: '353', status: 'Active', hireDate: '2017-08-01', ssn: '999-10-6666' }
  );

  // 12. Revenue Commission 51500
  positionsRaw.push(
    { deptCode: '51500', jobCode: '999', title: 'Revenue Commissioner', grade: 'Elected', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51500', jobCode: '288', title: 'Chief Revenue Clerk', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51500', jobCode: '282', title: 'Deputy Chief Clerk', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51500', jobCode: '280', title: 'Assessing Supervisor', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51500', jobCode: '217', title: 'Revenue Clerk I', grade: 'Grade 8', approved: 5, filled: 5, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-5151', first: 'Greg', last: 'Holland', email: 'greg.holland@houstoncounty.gov', role: 'Department Head', posCode: '999', status: 'Active', hireDate: '2016-11-08', ssn: '999-11-1111' },
    { idNum: 'EMP-5152', first: 'Tami', last: 'McNeil', email: 'tami.mcneil@houstoncounty.gov', role: 'Employee', posCode: '288', status: 'Active', hireDate: '2018-05-01', ssn: '999-11-2222' },
    { idNum: 'EMP-5153', first: 'Michelle', last: 'Parker', email: 'michelle.p@houstoncounty.gov', role: 'Employee', posCode: '282', status: 'Active', hireDate: '2020-03-10', ssn: '999-11-3333' },
    { idNum: 'EMP-5154', first: 'Rebecca', last: 'Hatcher', email: 'rebecca.h@houstoncounty.gov', role: 'Employee', posCode: '280', status: 'Active', hireDate: '2017-09-15', ssn: '999-11-4444' },
    { idNum: 'EMP-5155', first: 'Cheyenne', last: 'Sawyer', email: 'cheyenne.s@houstoncounty.gov', role: 'Employee', posCode: '217', status: 'Active', hireDate: '2022-01-10', ssn: '999-11-5555' },
    { idNum: 'EMP-5156', first: 'Karen', last: 'Bush', email: 'karen.bush@houstoncounty.gov', role: 'Employee', posCode: '217', status: 'Active', hireDate: '2021-04-15', ssn: '999-11-6666' }
  );

  // 13. Registrar 51920
  positionsRaw.push(
    { deptCode: '51920', jobCode: '866', title: 'Registrar', grade: 'Appointed', approved: 3, filled: 3, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-51920-1', first: 'Lucrecia', last: 'George', email: 'lucrecia.g@houstoncounty.gov', role: 'Employee', posCode: '866', status: 'Active', hireDate: '2015-08-01', ssn: '999-12-1111' },
    { idNum: 'EMP-51920-2', first: 'Kimberle', last: 'Cowden', email: 'kimberle.c@houstoncounty.gov', role: 'Employee', posCode: '866', status: 'Active', hireDate: '2017-10-15', ssn: '999-12-2222' },
    { idNum: 'EMP-51920-3', first: 'Jan', last: 'Taylor', email: 'jan.taylor@houstoncounty.gov', role: 'Department Head', posCode: '866', status: 'Active', hireDate: '2016-03-01', ssn: '999-12-3333' }
  );

  // 14. Safety 51961
  positionsRaw.push(
    { deptCode: '51961', jobCode: '901-1', title: 'Safety Director (30HPW)', grade: 'Grade 14', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-51961', first: 'Kelly', last: 'Crowell', email: 'kelly.crowell@houstoncounty.gov', role: 'Department Head', posCode: '901-1', status: 'Active', hireDate: '2018-07-01', ssn: '999-13-1111' }
  );

  // 15. Coroner 52400 (already added)
  
  // 16. Road & Bridge 53100
  positionsRaw.push(
    { deptCode: '53100', jobCode: '998', title: 'County Engineer', grade: 'Grade 22', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '53100', jobCode: '140', title: 'Administrative Supervisor', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '53100', jobCode: '120', title: 'Admn Asst - Office', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '53100', jobCode: '194-1', title: 'Asst County Eng/PE', grade: 'Grade 16', approved: 2, filled: 2, status: 'Active' },
    { deptCode: '53100', jobCode: '384', title: 'Engineering Inspector', grade: 'Grade 11', approved: 5, filled: 4, status: 'Active' },
    { deptCode: '53100', jobCode: '381', title: 'Engineering Aide II (J Jackson)', grade: 'Grade 9', approved: 1, filled: 0, status: 'Hold' }, // Vacant (J Jackson)
    { deptCode: '53100', jobCode: '390-1', title: 'Road Foreman', grade: 'Grade 13', approved: 5, filled: 5, status: 'Active' },
    { deptCode: '53100', jobCode: '389', title: 'Concrete Foreman', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '53100', jobCode: '642-1', title: 'Crewleader', grade: 'Grade 10', approved: 4, filled: 4, status: 'Active' },
    { deptCode: '53100', jobCode: '613', title: 'Equipment Operator II', grade: 'Grade 9', approved: 50, filled: 50, status: 'Active' },
    { deptCode: '53100', jobCode: '675', title: 'Garage Superintendent', grade: 'Grade 15', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '53100', jobCode: '250', title: 'Purchasing Agent', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '53100', jobCode: '190', title: 'Administrative Assistant - Shop', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '53100', jobCode: '626', title: 'Auto H/E Serv Tech', grade: 'Grade 11', approved: 9, filled: 9, status: 'Active' },
    { deptCode: '53100', jobCode: '383', title: 'Summer Intern', grade: 'Grade 16', approved: 1, filled: 0, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-3501', first: 'Barkley', last: 'Kirkland', email: 'barkley.k@houstoncounty.gov', role: 'Department Head', posCode: '998', status: 'Active', hireDate: '2010-02-01', ssn: '999-01-5555' },
    { idNum: 'EMP-3502', first: 'Kendall', last: 'Shine', email: 'kendall.s@houstoncounty.gov', role: 'Employee', posCode: '140', status: 'Active', hireDate: '2016-05-10', ssn: '999-14-1111' },
    { idNum: 'EMP-3503', first: 'Tiffany', last: 'Cole', email: 'tiffany.cole@houstoncounty.gov', role: 'Employee', posCode: '120', status: 'Active', hireDate: '2018-09-01', ssn: '999-14-2222' },
    { idNum: 'EMP-3504', first: 'Tyler', last: 'Reeder', email: 'tyler.reeder@houstoncounty.gov', role: 'Employee', posCode: '194-1', status: 'Active', hireDate: '2021-09-01', ssn: '999-01-6666' },
    { idNum: 'EMP-3505', first: 'Will', last: 'Kirkland', email: 'will.k@houstoncounty.gov', role: 'Employee', posCode: '194-1', status: 'Active', hireDate: '2022-03-15', ssn: '999-14-3333' },
    { idNum: 'EMP-3506', first: 'Austin', last: 'Larsen', email: 'austin.l@houstoncounty.gov', role: 'Employee', posCode: '384', status: 'Active', hireDate: '2020-04-20', ssn: '999-14-4444' },
    { idNum: 'EMP-3507', first: 'Morgan', last: 'Curtis', email: 'morgan.curtis@houstoncounty.gov', role: 'Employee', posCode: '384', status: 'Active', hireDate: '2021-11-01', ssn: '999-14-5555' },
    { idNum: 'EMP-3508', first: 'Arthur R.', last: 'Jones', email: 'arthur.j@houstoncounty.gov', role: 'Employee', posCode: '384', status: 'Active', hireDate: '2019-06-10', ssn: '999-14-6666' },
    { idNum: 'EMP-3509', first: 'Chris', last: 'Trawick', email: 'chris.trawick@houstoncounty.gov', role: 'Employee', posCode: '384', status: 'Active', hireDate: '2022-08-01', ssn: '999-14-7777' },
    { idNum: 'EMP-3510', first: 'Michael', last: 'Edwards', email: 'michael.edwards@houstoncounty.gov', role: 'Employee', posCode: '390-1', status: 'Active', hireDate: '2015-03-01', ssn: '999-14-8888' },
    { idNum: 'EMP-3511', first: 'Chris', last: 'Bowen', email: 'chris.bowen@houstoncounty.gov', role: 'Employee', posCode: '390-1', status: 'Active', hireDate: '2017-06-15', ssn: '999-14-9999' },
    { idNum: 'EMP-3512', first: 'Cary', last: 'Lingo', email: 'cary.lingo@houstoncounty.gov', role: 'Employee', posCode: '390-1', status: 'Active', hireDate: '2018-02-10', ssn: '999-15-1111' },
    { idNum: 'EMP-3513', first: 'Josh', last: 'Harper', email: 'josh.harper@houstoncounty.gov', role: 'Employee', posCode: '390-1', status: 'Active', hireDate: '2020-05-15', ssn: '999-15-2222' },
    { idNum: 'EMP-3514', first: 'Kurt', last: 'Lanzendorfer', email: 'kurt.l@houstoncounty.gov', role: 'Employee', posCode: '390-1', status: 'Active', hireDate: '2019-12-01', ssn: '999-15-3333' },
    { idNum: 'EMP-3515', first: 'Nathan', last: 'Cody', email: 'nathan.cody@houstoncounty.gov', role: 'Employee', posCode: '389', status: 'Active', hireDate: '2016-08-01', ssn: '999-15-4444' },
    { idNum: 'EMP-3516', first: 'Michael', last: 'Vickers', email: 'michael.v@houstoncounty.gov', role: 'Employee', posCode: '642-1', status: 'Active', hireDate: '2018-04-10', ssn: '999-15-5555' },
    { idNum: 'EMP-3517', first: 'Mark', last: 'Watson', email: 'mark.watson@houstoncounty.gov', role: 'Employee', posCode: '642-1', status: 'Active', hireDate: '2017-09-15', ssn: '999-15-6666' },
    { idNum: 'EMP-3518', first: 'Kenny', last: 'Redmon', email: 'kenny.redmon@houstoncounty.gov', role: 'Employee', posCode: '642-1', status: 'Active', hireDate: '2019-11-20', ssn: '999-15-7777' },
    { idNum: 'EMP-3519', first: 'Scott', last: 'Jordan', email: 'scott.j@houstoncounty.gov', role: 'Employee', posCode: '642-1', status: 'Active', hireDate: '2021-06-01', ssn: '999-15-8888' },
    { idNum: 'EMP-3520', first: 'Michael', last: 'Prevatt', email: 'michael.prevatt@houstoncounty.gov', role: 'Employee', posCode: '613', status: 'Active', hireDate: '2015-05-10', ssn: '999-15-9999' },
    { idNum: 'EMP-3521', first: 'Barry', last: 'Forrester', email: 'barry.f@houstoncounty.gov', role: 'Employee', posCode: '613', status: 'Active', hireDate: '2016-08-15', ssn: '999-16-1111' },
    { idNum: 'EMP-3522', first: 'Phillip', last: 'Smith', email: 'phillip.smith@houstoncounty.gov', role: 'Employee', posCode: '613', status: 'Active', hireDate: '2018-03-01', ssn: '999-16-2222' },
    { idNum: 'EMP-3523', first: 'Devon', last: 'Porter', email: 'devon.porter@houstoncounty.gov', role: 'Employee', posCode: '613', status: 'Active', hireDate: '2019-07-20', ssn: '999-16-3333' },
    { idNum: 'EMP-3524', first: 'Austin', last: 'Knight', email: 'austin.knight@houstoncounty.gov', role: 'Employee', posCode: '613', status: 'Active', hireDate: '2021-04-10', ssn: '999-16-4444' },
    { idNum: 'EMP-3525', first: 'Scott', last: 'Pilot', email: 'scott.pilot@houstoncounty.gov', role: 'Employee', posCode: '675', status: 'Active', hireDate: '2012-09-15', ssn: '999-16-5555' },
    { idNum: 'EMP-3526', first: 'Jennifer', last: 'Pearson', email: 'jennifer.p@houstoncounty.gov', role: 'Employee', posCode: '250', status: 'Active', hireDate: '2016-11-20', ssn: '999-16-6666' },
    { idNum: 'EMP-3527', first: 'Donna', last: 'Wood', email: 'donna.wood@houstoncounty.gov', role: 'Employee', posCode: '190', status: 'Active', hireDate: '2018-05-15', ssn: '999-16-7777' },
    { idNum: 'EMP-3528', first: 'Seth', last: 'Williams', email: 'seth.w@houstoncounty.gov', role: 'Employee', posCode: '626', status: 'Active', hireDate: '2017-02-01', ssn: '999-16-8888' },
    { idNum: 'EMP-3529', first: 'Phillip', last: 'Dasinger', email: 'phillip.d@houstoncounty.gov', role: 'Employee', posCode: '626', status: 'Active', hireDate: '2018-10-15', ssn: '999-16-9999' },
    { idNum: 'EMP-3867', first: 'Hayden', last: 'Barber', email: 'hayden.barber@houstoncounty.gov', role: 'Employee', posCode: '613', status: 'Active', hireDate: '2026-06-08', ssn: '999-17-1111' }
  );

  // 17. Sanitation 54100
  positionsRaw.push(
    { deptCode: '54100', jobCode: '667-1', title: 'Sanitation Inspector', grade: 'Grade 11', approved: 3, filled: 3, status: 'Active' },
    { deptCode: '54100', jobCode: '664', title: 'Refuse Coll & Disp Supv', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '54100', jobCode: '662-1', title: 'Refuse Truck Driver', grade: 'Grade 9', approved: 9, filled: 9, status: 'Active' },
    { deptCode: '54100', jobCode: '668', title: 'Asst Refuse Coll & Disp Supv', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-5401', first: 'Cedric', last: 'Washington', email: 'cedric.w@houstoncounty.gov', role: 'Employee', posCode: '667-1', status: 'Active', hireDate: '2016-09-01', ssn: '999-18-1111' },
    { idNum: 'EMP-5402', first: 'Gregory', last: 'Strickland', email: 'gregory.s@houstoncounty.gov', role: 'Employee', posCode: '667-1', status: 'Active', hireDate: '2018-04-15', ssn: '999-18-2222' },
    { idNum: 'EMP-5403', first: 'Roger', last: 'Jackson', email: 'roger.j@houstoncounty.gov', role: 'Employee', posCode: '667-1', status: 'Active', hireDate: '2019-11-20', ssn: '999-18-3333' },
    { idNum: 'EMP-5404', first: 'Kent', last: 'Menefee', email: 'kent.menefee@houstoncounty.gov', role: 'Department Head', posCode: '664', status: 'Active', hireDate: '2012-03-10', ssn: '999-18-4444' },
    { idNum: 'EMP-5405', first: 'Casey', last: 'Miller', email: 'casey.miller@houstoncounty.gov', role: 'Employee', posCode: '662-1', status: 'Active', hireDate: '2017-06-01', ssn: '999-18-5555' },
    { idNum: 'EMP-5406', first: 'Jimmy', last: 'Murphree', email: 'jimmy.m@houstoncounty.gov', role: 'Employee', posCode: '662-1', status: 'Active', hireDate: '2018-10-15', ssn: '999-18-6666' },
    { idNum: 'EMP-5407', first: 'Michael', last: 'Williams', email: 'michael.w@houstoncounty.gov', role: 'Employee', posCode: '662-1', status: 'Active', hireDate: '2015-05-20', ssn: '999-18-7777' },
    { idNum: 'EMP-5408', first: 'Justin', last: 'Coleman', email: 'justin.c@houstoncounty.gov', role: 'Employee', posCode: '668', status: 'Active', hireDate: '2017-08-01', ssn: '999-18-8888' }
  );

  // 18. Sanitation Billing 54110
  positionsRaw.push(
    { deptCode: '54110', jobCode: '670-1', title: 'Customer Service Rep', grade: 'Grade 8', approved: 3, filled: 3, status: 'Active' },
    { deptCode: '54110', jobCode: '669', title: 'Sanitation Billing Supervisor', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-5411', first: 'Marie', last: 'Ortiz', email: 'marie.ortiz@houstoncounty.gov', role: 'Employee', posCode: '670-1', status: 'Active', hireDate: '2019-02-15', ssn: '999-19-1111' },
    { idNum: 'EMP-5412', first: 'Sandra', last: 'Boland', email: 'sandra.b@houstoncounty.gov', role: 'Employee', posCode: '670-1', status: 'Active', hireDate: '2020-06-10', ssn: '999-19-2222' },
    { idNum: 'EMP-5413', first: 'Wayne', last: 'Jenkins', email: 'wayne.j@houstoncounty.gov', role: 'Employee', posCode: '670-1', status: 'Active', hireDate: '2021-08-01', ssn: '999-19-3333' },
    { idNum: 'EMP-5414', first: 'Nikki', last: 'Perkins', email: 'nikki.perkins@houstoncounty.gov', role: 'Department Head', posCode: '669', status: 'Active', hireDate: '2016-04-20', ssn: '999-19-4444' }
  );

  // 19. Sheriff 52100
  positionsRaw.push(
    { deptCode: '52100', jobCode: '373', title: 'Sheriff', grade: 'Elected', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52100', jobCode: '563', title: 'Major', grade: 'Grade 18', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52100', jobCode: '561', title: 'Chief Deputy', grade: 'Grade 17', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52100', jobCode: '126', title: 'Admin Assistant (Sheriff\'s)', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52100', jobCode: '177-1', title: 'Sheriff\'s Clerk', grade: 'Grade 8', approved: 5, filled: 5, status: 'Active' },
    { deptCode: '52100', jobCode: '176', title: 'Sheriff\'s Clerk/HR Generalist', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52100', jobCode: '562-1', title: 'Sheriff Captain', grade: 'Grade 16', approved: 4, filled: 4, status: 'Active' },
    { deptCode: '52100', jobCode: '560-1', title: 'Sheriff Deputy Lieutenant', grade: 'Grade 14', approved: 11, filled: 11, status: 'Active' },
    { deptCode: '52100', jobCode: '555-1', title: 'Sheriff Deputy Sergeant', grade: 'Grade 12', approved: 11, filled: 11, status: 'Active' },
    { deptCode: '52100', jobCode: '3753', title: 'Sheriff Deputy', grade: 'Grade 9', approved: 52, filled: 52, status: 'Active' },
    { deptCode: '52100', jobCode: '517-1', title: 'Sheriff IT Support', grade: 'Grade 11', approved: 3, filled: 3, status: 'Active' },
    { deptCode: '52100', jobCode: '502', title: 'Communications Supervisor', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52100', jobCode: '504-1', title: 'Senior Telecommunicator', grade: 'Grade 10', approved: 3, filled: 3, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-3401', first: 'Donald', last: 'Valenza', email: 'donald.v@houstoncounty.gov', role: 'Department Head', posCode: '373', status: 'Active', hireDate: '2014-11-04', ssn: '999-01-3333' },
    { idNum: 'EMP-3402', first: 'William', last: 'Rafferty', email: 'william.r@houstoncounty.gov', role: 'Employee', posCode: '563', status: 'Active', hireDate: '2015-05-15', ssn: '999-20-1111' },
    { idNum: 'EMP-3403', first: 'Jeff', last: 'Carlisle', email: 'jeff.carlisle@houstoncounty.gov', role: 'Employee', posCode: '561', status: 'Active', hireDate: '2016-09-01', ssn: '999-20-2222' },
    { idNum: 'EMP-3404', first: 'Kaci', last: 'King', email: 'kaci.king@houstoncounty.gov', role: 'Employee', posCode: '126', status: 'Active', hireDate: '2018-04-10', ssn: '999-20-3333' },
    { idNum: 'EMP-3405', first: 'Casey', last: 'Phillips', email: 'casey.p@houstoncounty.gov', role: 'Employee', posCode: '177-1', status: 'Active', hireDate: '2020-02-15', ssn: '999-20-4444' },
    { idNum: 'EMP-3406', first: 'Kim', last: 'Wilson', email: 'kim.w@houstoncounty.gov', role: 'Personnel Clerk', posCode: '176', status: 'Active', hireDate: '2017-08-01', ssn: '999-20-5555' },
    { idNum: 'EMP-1943', first: 'Ricky', last: 'Herring', email: 'ricky.h@houstoncounty.gov', role: 'Employee', posCode: '562-1', status: 'Active', hireDate: '2016-06-01', ssn: '999-20-6666' },
    { idNum: 'EMP-3407', first: 'Tracy', last: 'Ward', email: 'tracy.ward@houstoncounty.gov', role: 'Employee', posCode: '560-1', status: 'Active', hireDate: '2018-09-15', ssn: '999-20-7777' },
    { idNum: 'EMP-3408', first: 'Chad', last: 'Wilson', email: 'chad.w@houstoncounty.gov', role: 'Employee', posCode: '555-1', status: 'Active', hireDate: '2019-11-01', ssn: '999-20-8888' },
    { idNum: 'EMP-3753', first: 'Jeremy', last: 'Robinson', email: 'jeremy.r@houstoncounty.gov', role: 'Employee', posCode: '3753', status: 'Active', hireDate: '2024-02-15', ssn: '999-01-4444' },
    { idNum: 'EMP-3217', first: 'Parker', last: 'Bellot', email: 'parker.b@houstoncounty.gov', role: 'Employee', posCode: '517-1', status: 'Active', hireDate: '2021-03-01', ssn: '999-20-9999' },
    { idNum: 'EMP-3409', first: 'William', last: 'Blackmon', email: 'william.blackmon@houstoncounty.gov', role: 'Employee', posCode: '502', status: 'Active', hireDate: '2015-06-01', ssn: '999-21-1111' },
    { idNum: 'EMP-3410', first: 'Kristin', last: 'David', email: 'kristin.david@houstoncounty.gov', role: 'Employee', posCode: '504-1', status: 'Active', hireDate: '2018-04-15', ssn: '999-21-2222' }
  );

  // 20. County Jail 52200
  positionsRaw.push(
    { deptCode: '52200', jobCode: '562', title: 'Captain', grade: 'Grade 16', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52200', jobCode: '471', title: 'Jail Commander', grade: 'Grade 14', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52200', jobCode: '472', title: 'Asst Jail Commander', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52200', jobCode: '519', title: 'Jail Investigations', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52200', jobCode: '872', title: 'Chaplain', grade: 'Grade 10', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52200', jobCode: '178-1', title: 'Sheriff\'s Clerk Jail', grade: 'Grade 8', approved: 3, filled: 3, status: 'Active' },
    { deptCode: '52200', jobCode: '511', title: 'Clinic Director', grade: 'Grade 15', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52200', jobCode: '509-1', title: 'Licensed Practical Nurse', grade: 'Grade 10', approved: 5, filled: 5, status: 'Active' },
    { deptCode: '52200', jobCode: '507', title: 'Medical Assistant', grade: 'Grade 8', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52200', jobCode: '513', title: 'Clinic Coordinator', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '52200', jobCode: '515-1', title: 'Corrections Lieutenant - Certified', grade: 'Grade 11', approved: 4, filled: 4, status: 'Active' },
    { deptCode: '52200', jobCode: '512-1', title: 'Corrections Sergeant-Certified', grade: 'Grade 10', approved: 5, filled: 5, status: 'Active' },
    { deptCode: '52200', jobCode: '506-1', title: 'Corrections Corporal - Certified', grade: 'Grade 9', approved: 7, filled: 7, status: 'Active' },
    { deptCode: '52200', jobCode: '510-1', title: 'Corrections Deputy - Certified', grade: 'Grade 9', approved: 53, filled: 53, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-1632', first: 'David', last: 'Asbill', email: 'david.asbill@houstoncounty.gov', role: 'Employee', posCode: '562', status: 'Active', hireDate: '2016-10-01', ssn: '999-00-8888' },
    { idNum: 'EMP-1277', first: 'Kelita', last: 'Moore', email: 'kelita.moore@houstoncounty.gov', role: 'Employee', posCode: '471', status: 'Active', hireDate: '2023-01-15', ssn: '999-00-9999' },
    { idNum: 'EMP-0719', first: 'Carla', last: 'Snell', email: 'carla.snell@houstoncounty.gov', role: 'Employee', posCode: '472', status: 'Active', hireDate: '2018-05-20', ssn: '999-01-1111' },
    { idNum: 'EMP-2201', first: 'Michael', last: 'Meadows', email: 'michael.m@houstoncounty.gov', role: 'Employee', posCode: '519', status: 'Active', hireDate: '2019-09-10', ssn: '999-22-1111' },
    { idNum: 'EMP-2202', first: 'Mark', last: 'Pickett', email: 'mark.p@houstoncounty.gov', role: 'Employee', posCode: '872', status: 'Active', hireDate: '2020-03-01', ssn: '999-22-2222' },
    { idNum: 'EMP-2203', first: 'Emily', last: 'Williams', email: 'emily.w@houstoncounty.gov', role: 'Employee', posCode: '178-1', status: 'Active', hireDate: '2021-08-15', ssn: '999-22-3333' },
    { idNum: 'EMP-2204', first: 'Jason', last: 'Smoak', email: 'jason.smoak@houstoncounty.gov', role: 'Employee', posCode: '511', status: 'Active', hireDate: '2017-11-20', ssn: '999-22-4444' },
    { idNum: 'EMP-2205', first: 'Evelyn', last: 'McGhee', email: 'evelyn.m@houstoncounty.gov', role: 'Employee', posCode: '509-1', status: 'Active', hireDate: '2018-04-10', ssn: '999-22-5555' },
    { idNum: 'EMP-2206', first: 'Susan', last: 'Luke', email: 'susan.l@houstoncounty.gov', role: 'Employee', posCode: '507', status: 'Active', hireDate: '2019-06-15', ssn: '999-22-6666' },
    { idNum: 'EMP-2207', first: 'Melinda', last: 'Van Ackern', email: 'melinda.va@houstoncounty.gov', role: 'Employee', posCode: '513', status: 'Active', hireDate: '2020-01-10', ssn: '999-22-7777' },
    { idNum: 'EMP-2208', first: 'James', last: 'Trawick', email: 'james.trawick@houstoncounty.gov', role: 'Employee', posCode: '515-1', status: 'Active', hireDate: '2015-05-20', ssn: '999-22-8888' },
    { idNum: 'EMP-2209', first: 'Darlene', last: 'Hayder', email: 'darlene.h@houstoncounty.gov', role: 'Employee', posCode: '512-1', status: 'Active', hireDate: '2018-03-01', ssn: '999-22-9999' },
    { idNum: 'EMP-2210', first: 'Ronald', last: 'Nichols', email: 'ronald.n@houstoncounty.gov', role: 'Employee', posCode: '506-1', status: 'Active', hireDate: '2016-09-01', ssn: '999-23-1111' },
    { idNum: 'EMP-2211', first: 'Jacqueline', last: 'Dixon', email: 'jacqueline.d@houstoncounty.gov', role: 'Employee', posCode: '510-1', status: 'Active', hireDate: '2019-06-15', ssn: '999-23-2222' }
  );

  // 21. Probate 51300
  positionsRaw.push(
    { deptCode: '51300', jobCode: '142', title: 'Admn Asst-Probate Judge', grade: 'Grade 9', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '269', title: 'Chief Probate Clerk', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '261', title: 'Deputy Chief Clerk', grade: 'Grade 11', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '466', title: 'Staff Attorney', grade: 'Grade 16', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '210', title: 'Training Coordinator', grade: 'Grade 11', approved: 1, filled: 0, status: 'Hold' },
    { deptCode: '51300', jobCode: '260', title: 'License Supervisor', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '264', title: 'Judicial & Recording Sup', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '266', title: 'Veh Reg Supervisor', grade: 'Grade 12', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '230', title: 'Customer Care Specialist', grade: 'Grade 8', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '268', title: 'Veh Registration Manager', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '890', title: 'Election Supervisor', grade: 'Grade 13', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '891', title: 'Elections Specialist', grade: 'Grade 10', approved: 1, filled: 1, status: 'Active' },
    { deptCode: '51300', jobCode: '200-1', title: 'Probate Clerk Part Time', grade: 'Grade 8', approved: 6, filled: 5, status: 'Active' },
    { deptCode: '51300', jobCode: '202', title: 'Probate Clerk', grade: 'Grade 8', approved: 24, filled: 21, status: 'Active' },
    { deptCode: '51300', jobCode: '640', title: 'Judge of Probate', grade: 'Elected', approved: 1, filled: 1, status: 'Active' }
  );
  employeesRaw.push(
    { idNum: 'EMP-351', first: 'Beth', last: 'Caylor', email: 'beth.c@houstoncounty.gov', role: 'Employee', posCode: '142', status: 'Active', hireDate: '2016-04-10', ssn: '999-24-1111' },
    { idNum: 'EMP-352', first: 'Heather', last: 'Helms', email: 'heather.h@houstoncounty.gov', role: 'Employee', posCode: '269', status: 'Active', hireDate: '2015-08-01', ssn: '999-24-2222' },
    { idNum: 'EMP-353', first: 'Ginnie', last: 'Lush', email: 'ginnie.l@houstoncounty.gov', role: 'Employee', posCode: '261', status: 'Active', hireDate: '2017-10-15', ssn: '999-24-3333' },
    { idNum: 'EMP-354', first: 'Leanne', last: 'Richardson', email: 'leanne.r@houstoncounty.gov', role: 'Employee', posCode: '466', status: 'Active', hireDate: '2014-03-01', ssn: '999-24-4444' },
    { idNum: 'EMP-355', first: 'Leona', last: 'Sheffield', email: 'leona.s@houstoncounty.gov', role: 'Employee', posCode: '260', status: 'Active', hireDate: '2015-11-20', ssn: '999-24-5555' },
    { idNum: 'EMP-356', first: 'Debbie', last: 'Lewis', email: 'debbie.l@houstoncounty.gov', role: 'Employee', posCode: '264', status: 'Active', hireDate: '2018-02-15', ssn: '999-24-6666' },
    { idNum: 'EMP-357', first: 'Jodie', last: 'Middleton', email: 'jodie.m@houstoncounty.gov', role: 'Employee', posCode: '266', status: 'Active', hireDate: '2019-06-10', ssn: '999-24-7777' },
    { idNum: 'EMP-358', first: 'Brenda', last: 'Money', email: 'brenda.m@houstoncounty.gov', role: 'Employee', posCode: '230', status: 'Active', hireDate: '2017-09-01', ssn: '999-24-8888' },
    { idNum: 'EMP-359', first: 'Dawanna', last: 'Moates', email: 'dawanna.m@houstoncounty.gov', role: 'Employee', posCode: '268', status: 'Active', hireDate: '2016-12-01', ssn: '999-24-9999' },
    { idNum: 'EMP-360', first: 'Angela', last: 'Martin', email: 'angela.m@houstoncounty.gov', role: 'Employee', posCode: '890', status: 'Active', hireDate: '2013-05-20', ssn: '999-25-1111' },
    { idNum: 'EMP-361', first: 'Theresa', last: 'Gorton', email: 'theresa.g@houstoncounty.gov', role: 'Employee', posCode: '891', status: 'Active', hireDate: '2021-10-01', ssn: '999-25-2222' },
    { idNum: 'EMP-362', first: 'Jamie', last: 'Barfield', email: 'jamie.b@houstoncounty.gov', role: 'Employee', posCode: '200-1', status: 'Active', hireDate: '2020-07-15', ssn: '999-25-3333' },
    { idNum: 'EMP-363', first: 'Jameson', last: 'Whaley', email: 'jameson.w@houstoncounty.gov', role: 'Employee', posCode: '202', status: 'Active', hireDate: '2018-06-15', ssn: '999-25-4444' },
    { idNum: 'EMP-364', first: 'Sharon', last: 'Stage', email: 'sharon.stage@houstoncounty.gov', role: 'Employee', posCode: '202', status: 'Active', hireDate: '2019-09-01', ssn: '999-25-5555' },
    { idNum: 'EMP-365', first: 'Patrick', last: 'Davenport', email: 'patrick.d@houstoncounty.gov', role: 'Department Head', posCode: '640', status: 'Active', hireDate: '2012-11-06', ssn: '999-25-6666' }
  );

  console.log('Resolving and writing positions into SQLite...');
  const posMap = {};
  for (const pos of positionsRaw) {
    const res = await db.run(
      `INSERT INTO positions (dept_id, job_code, job_title, grade, approved_slots, filled_slots, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [deptMap[pos.deptCode], pos.jobCode, pos.title, pos.grade, pos.approved, pos.filled, pos.status]
    );
    posMap[pos.jobCode] = res.lastID;
  }

  console.log('Resolving and writing employees into SQLite...');
  const empMap = {};
  for (const emp of employeesRaw) {
    const ssnEnc = encrypt(emp.ssn);
    const res = await db.run(
      `INSERT INTO employees (employee_id_number, first_name, last_name, email, role, current_position_id, status, hire_date, ssn_encrypted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [emp.idNum, emp.first, emp.last, emp.email, emp.role, emp.posCode ? posMap[emp.posCode] : null, emp.status, emp.hireDate, ssnEnc]
    );
    empMap[emp.idNum] = res.lastID;

    await logAudit(
      'SYSTEM-INIT', 
      'CREATE', 
      'employees', 
      res.lastID, 
      null, 
      { idNum: emp.idNum, name: `${emp.first} ${emp.last}`, role: emp.role }
    );
  }

  // Seeding pending personnel actions effective 06/01/2026
  console.log('Seeding pending actions...');
  const actions = [
    {
      empIdNum: 'EMP-1277', // Kelita Moore
      type: 'Promotion',
      effective: '2026-06-01',
      currTitle: 'Correctional Officer',
      currGrade: 'Grade 9',
      currSal: 42000.00,
      propTitle: 'Jail Commander',
      propGrade: 'Grade 14',
      propSal: 65000.00,
      meetingDate: '2026-06-01'
    },
    {
      empIdNum: 'EMP-0719', // Carla Snell
      type: 'Promotion',
      effective: '2026-06-01',
      currTitle: 'Jail Sergeant',
      currGrade: 'Grade 10',
      currSal: 48000.00,
      propTitle: 'Assist Jail Commander',
      propGrade: 'Grade 12',
      propSal: 55000.00,
      meetingDate: '2026-06-01'
    },
    {
      empIdNum: 'EMP-1632', // David Asbill
      type: 'Promotion',
      effective: '2026-06-01',
      currTitle: 'Jail Lieutenant',
      currGrade: 'Grade 11',
      currSal: 52000.00,
      propTitle: 'Jail Captain',
      propGrade: 'Grade 16',
      propSal: 72000.00,
      meetingDate: '2026-06-01'
    },
    {
      empIdNum: null, // James Waylon McGriff
      type: 'New Hire',
      effective: '2026-06-01',
      currTitle: null,
      currGrade: null,
      currSal: 0.00,
      propTitle: 'Summer Intern (Road & Bridge)',
      propGrade: 'Grade 16',
      propSal: 36129.60,
      meetingDate: '2026-06-01'
    }
  ];

  for (const a of actions) {
    const empId = a.empIdNum ? empMap[a.empIdNum] : null;
    await db.run(
      `INSERT INTO personnel_actions 
       (employee_id, action_type, effective_date, current_job_title, current_grade_step, current_salary, proposed_job_title, proposed_grade_step, proposed_salary, commission_approval_required, commission_meeting_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'Pending')`,
      [empId, a.type, a.effective, a.currTitle, a.currGrade, a.currSal, a.propTitle, a.propGrade, a.propSal, a.meetingDate]
    );
  }

  console.log('Exporting SQLite data to database.json for serverless deployment fallback...');
  const fs = require('fs');
  const path = require('path');
  
  const deptsDb = await db.all('SELECT * FROM departments');
  const positionsDb = await db.all('SELECT * FROM positions');
  const employeesDb = await db.all('SELECT * FROM employees');
  const actionsDb = await db.all('SELECT * FROM personnel_actions');
  const logsDb = await db.all('SELECT * FROM audit_logs');

  const dbData = {
    departments: deptsDb,
    positions: positionsDb,
    employees: employeesDb,
    personnel_actions: actionsDb,
    audit_logs: logsDb
  };

  fs.writeFileSync(
    path.join(__dirname, '../database.json'),
    JSON.stringify(dbData, null, 2),
    'utf8'
  );
  console.log('Successfully wrote database.json');

  console.log('Database initialization of ALL real Houston County positions and employees completed successfully.');
}

run().catch(err => {
  console.error('Initialization error:', err);
});
