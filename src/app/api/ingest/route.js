import { NextResponse } from 'next/server';
import { getDb, logAudit } from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const filename = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    
    let textContent = '';
    
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      // Parse using SheetJS (XLSX)
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Convert to a clean CSV-like string representation for the AI
      textContent = XLSX.utils.sheet_to_txt(worksheet);
    } else if (filename.endsWith('.csv') || filename.endsWith('.txt')) {
      textContent = buffer.toString('utf-8');
    } else if (filename.endsWith('.pdf')) {
      // Parse PDF using python subprocess
      const tempPdfPath = path.join(process.cwd(), `temp_${Date.now()}.pdf`);
      fs.writeFileSync(tempPdfPath, buffer);
      
      const { execSync } = require('child_process');
      try {
        const pyScript = `import pypdf; reader = pypdf.PdfReader(r"${tempPdfPath}"); text = "".join([page.extract_text() for page in reader.pages]); print(text)`;
        const pyOutput = execSync(`python -c "${pyScript}"`, { encoding: 'utf-8' });
        textContent = pyOutput;
      } catch (pyErr) {
        console.error('Python PDF extraction failed:', pyErr);
        throw new Error('Failed to extract text from PDF. Make sure pypdf is installed.');
      } finally {
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload XLSX, XLS, CSV, TXT, or PDF.' }, { status: 400 });
    }

    // Log the file ingestion in the audit log
    await logAudit(
      'sherri.garner@houstoncounty.gov',
      'INGEST',
      'audit_logs',
      0,
      null,
      { filename, sizeBytes: buffer.length, textLength: textContent.length }
    );

    return NextResponse.json({
      success: true,
      filename,
      textContent
    });
  } catch (err) {
    console.error('Spreadsheet Ingestion error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
