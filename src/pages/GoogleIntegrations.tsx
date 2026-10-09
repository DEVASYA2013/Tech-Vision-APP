import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  HardDrive,
  Calendar,
  CheckCircle,
  Upload,
  Download,
  AlertTriangle,
  FileUp,
  Sparkles,
} from 'lucide-react';
import { useInstitute, STANDARD_12_HOURLY_BATCHES } from '../context/InstituteContext';
import { formatINR, getTodayDateString } from '../utils/formatters';
import { exportToCSV } from '../utils/csvExport';
import { useToast } from '../components/ui/Toast';
import { Course, Student } from '../types';

export interface ParsedStudentCsvRow {
  grNo: string;
  admissionDate: string;
  fullName: string;
  fatherOrHusbandName: string;
  fatherOrHusbandProfession: string;
  dateOfBirth: string;
  qualification: string;
  aadharCardNo: string;
  mobile: string;
  emergencyContact: string;
  address: string;
  courseId: string;
  courseName: string;
  courseIds: string[];
  courseNames: string[];
  batchId: string;
  batchName: string;
  totalCourseFee: number;
  discount: number;
  paidAmount: number;
  netPayable: number;
  outstandingBalance: number;
  isDuplicate: boolean;
  isFeeAutoCalculated?: boolean;
}

// Helper to split a single CSV or TSV line respecting double-quotes
export function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Helper to normalize dates like DD/MM/YYYY or DD-MM-YYYY into YYYY-MM-DD
export function normalizeDateString(raw: string, fallbackToToday = true): string {
  if (!raw || !raw.trim()) return fallbackToToday ? getTodayDateString() : '';
  const cleaned = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const dmyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return fallbackToToday ? getTodayDateString() : cleaned;
}

const STOP_WORDS = new Set([
  'course',
  'on',
  'and',
  'with',
  'in',
  'for',
  'of',
  'the',
  'to',
  'class',
  'training',
  'module',
  'program',
  'fundamentals',
  'masterclass',
  'reporting',
]);

function extractCourseKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

function getFallbackStandardFee(token: string): number {
  const t = token.toLowerCase();
  if (t.includes('tally') || t.includes('gst') || t.includes('miracle') || t.includes('account')) return 6500;
  if (t.includes('ccc')) return 3500;
  if (t.includes('bcc') || t.includes('basic') || t.includes('office') || t.includes('word')) return 4000;
  if (t.includes('excel') || t.includes('mis')) return 5500;
  if (t.includes('python')) return 9000;
  if (t.includes('web') || t.includes('full stack') || t.includes('react')) return 18000;
  if (t.includes('c++') || t.includes('cpp') || t === 'c' || t.includes('c programming')) return 7500;
  if (t.includes('java')) return 8500;
  if (t.includes('sql') || t.includes('mysql') || t.includes('database')) return 6000;
  if (t.includes('power bi') || t.includes('powerbi') || t.includes('data')) return 8000;
  if (t.includes('dtp') || t.includes('graphic') || t.includes('photoshop') || t.includes('corel')) return 6500;
  if (t.includes('autocad') || t.includes('cad')) return 7500;
  if (t.includes('pgdca')) return 12000;
  if (t.includes('dca')) return 8500;
  if (t.includes('english') || t.includes('spoken')) return 4500;
  return 3500;
}

function findMatchingCourse(token: string, courses: Course[]): Course | undefined {
  const clean = token.trim();
  if (!clean || courses.length === 0) return undefined;
  const tLower = clean.toLowerCase();

  // 1. Exact ID or Name match
  const exact = courses.find(
    (c) => c.courseId.toLowerCase() === tLower || c.courseName.toLowerCase() === tLower
  );
  if (exact) return exact;

  // 2. Direct substring match in either direction
  const substringMatch = courses.find((c) => {
    const cName = c.courseName.toLowerCase();
    const cId = c.courseId.toLowerCase();
    const isGenericId = /^course_\d+$/.test(cId);
    return (
      cName.includes(tLower) ||
      tLower.includes(cName) ||
      (!isGenericId &&
        (tLower === cId ||
          tLower.split(/[\s,()+-]+/).includes(cId) ||
          (cId.length >= 3 && tLower.includes(cId))))
    );
  });
  if (substringMatch) return substringMatch;

  // 3. Keyword overlap scoring against the institute's Courses Catalog
  const tokenKeywords = extractCourseKeywords(tLower);
  if (tokenKeywords.length === 0) return undefined;

  let bestCourse: Course | undefined;
  let bestScore = 0;

  for (const c of courses) {
    const cId = c.courseId.toLowerCase();
    const isGenericId = /^course_\d+$/.test(cId);
    const courseKeywords = extractCourseKeywords(
      `${c.courseName} ${isGenericId ? '' : c.courseId.replace(/_/g, ' ')}`
    );

    let score = 0;
    for (const tk of tokenKeywords) {
      for (const ck of courseKeywords) {
        if (tk === ck) {
          score += 3;
        } else if (tk.length >= 3 && ck.length >= 3 && (tk.includes(ck) || ck.includes(tk))) {
          score += 2;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCourse = c;
    }
  }

  return bestScore > 0 ? bestCourse : undefined;
}

// Helper to parse single or multiple courses from a cell (e.g. "CCC + Tally Prime" or "CCC, Advanced Excel")
// and automatically sum their standard fees from the Course Catalog
export function parseMultiCoursesFromCell(
  rawCourseCell: string,
  courses: Course[]
): {
  courseIds: string[];
  courseNames: string[];
  courseId: string;
  courseName: string;
  summedStandardFee: number;
} {
  const trimmedCell = (rawCourseCell || '').trim();
  if (!trimmedCell) {
    const fallback = courses[0];
    return {
      courseIds: [fallback?.courseId || 'CCC'],
      courseNames: [fallback?.courseName || 'CCC'],
      courseId: fallback?.courseId || 'CCC',
      courseName: fallback?.courseName || 'CCC',
      summedStandardFee: fallback?.standardFee || 3500,
    };
  }

  // Check if the entire cell matches a single course directly (e.g., "C & C++ Programming Fundamentals" or "Advanced Excel & MIS Reporting")
  if (!/[+;/|,]/.test(trimmedCell)) {
    const singleMatch = findMatchingCourse(trimmedCell, courses);
    if (singleMatch) {
      return {
        courseIds: [singleMatch.courseId],
        courseNames: [singleMatch.courseName],
        courseId: singleMatch.courseId,
        courseName: singleMatch.courseName,
        summedStandardFee: singleMatch.standardFee || getFallbackStandardFee(trimmedCell),
      };
    }
  }

  const tokens = trimmedCell
    .split(/[+;/|]|,\s*/)
    .map((t) => t.trim())
    .filter(Boolean);

  const courseIds: string[] = [];
  const courseNames: string[] = [];
  let summedStandardFee = 0;

  for (const token of tokens) {
    const matched = findMatchingCourse(token, courses);
    if (matched) {
      if (!courseIds.includes(matched.courseId)) {
        courseIds.push(matched.courseId);
        courseNames.push(matched.courseName);
        summedStandardFee += matched.standardFee || getFallbackStandardFee(token);
      }
    } else {
      const customId = token.toUpperCase().replace(/\s+/g, '_');
      if (!courseIds.includes(customId)) {
        courseIds.push(customId);
        courseNames.push(token);
        summedStandardFee += getFallbackStandardFee(token);
      }
    }
  }

  return {
    courseIds,
    courseNames,
    courseId: courseIds.join(', '),
    courseName: courseNames.join(' + '),
    summedStandardFee: summedStandardFee || 3500,
  };
}

// Shared parser for 15-column (without Total fees — auto-fetched from Course Catalog!)
// as well as 10-column, 14-column, or legacy 16-column CSV / Google Sheet data
export function parseStudentsCsvData(
  rawText: string,
  courses: Course[],
  availableBatches: { batchId: string; batchName: string; startTime?: string }[],
  existingStudents: Student[]
): ParsedStudentCsvRow[] {
  const lines = rawText
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const firstRowCols = splitCsvLine(lines[0], delimiter).map((c) =>
    c.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  );

  const hasHeader = firstRowCols.some(
    (c) =>
      c.includes('gr') ||
      c.includes('name') ||
      c.includes('mobile') ||
      c.includes('course') ||
      c.includes('batch') ||
      c.includes('father') ||
      c.includes('aadhar')
  );

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const headers = hasHeader ? firstRowCols : [];

  const colIdx = (names: string[]) =>
    headers.findIndex((h) => names.some((n) => h === n || h.includes(n)));

  const idxGr = colIdx(['grno', 'gr no', 'gr', 'student id']);
  const idxAdmDate = headers.findIndex(
    (h) =>
      !h.includes('birth') &&
      !h.includes('dob') &&
      (h.includes('admission') || h.includes('joining') || h === 'date')
  );
  const idxName = headers.findIndex(
    (h) =>
      !h.includes('father') &&
      !h.includes('husband') &&
      (h === 'student full name' ||
        h === 'full name' ||
        h === 'student name' ||
        h === 'name' ||
        h.includes('student full name') ||
        h.includes('student name'))
  );
  const idxFatherName = colIdx(['fatherhusband name', 'father name', 'husband name', 'father']);
  const idxFatherProf = colIdx(['fatherhusband profession', 'profession', 'occupation']);
  const idxDob = colIdx(['date of birth', 'dob', 'birth date', 'birthdate']);
  const idxQual = colIdx(['qualification', 'education', 'degree']);
  const idxAadhar = colIdx(['aadhar card no', 'aadhar no', 'aadhar', 'aadhaar']);
  const idxMobile = headers.findIndex(
    (h) =>
      !h.includes('emergency') &&
      (h.includes('mobile') || h.includes('phone') || h.includes('contact'))
  );
  const idxEmergency = colIdx(['emergency contact number', 'emergency contact', 'emergency']);
  const idxAddress = colIdx(['address', 'city', 'location']);
  const idxCourse = headers.findIndex(
    (h) => !h.includes('fee') && (h === 'course' || h === 'courses' || h.includes('course'))
  );
  const idxBatch = colIdx(['batch time', 'batch', 'timing', 'slot']);

  // IMPORTANT: idxTotal only matches explicit Total/Course Fee headers, NEVER "Paid fees"
  const idxTotal = headers.findIndex(
    (h) =>
      !h.includes('paid') &&
      !h.includes('remaining') &&
      !h.includes('pending') &&
      !h.includes('due') &&
      (h === 'total fees' ||
        h === 'total fee' ||
        h === 'course fee' ||
        h === 'course fees' ||
        h === 'total' ||
        h.includes('total fee') ||
        h.includes('course fee'))
  );
  const idxDiscount = colIdx(['discount', 'concession']);
  const idxPaid = colIdx(['paid fee', 'paid fees', 'paid amount', 'fees paid', 'paid', 'received']);

  const existingGrNos = new Set(
    existingStudents.map((s) => (s.grNo || s.studentId).toLowerCase())
  );
  const existingMobiles = new Set(existingStudents.map((s) => s.mobile.replace(/\s+/g, '')));

  const rows: ParsedStudentCsvRow[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const parts = splitCsvLine(dataLines[i], delimiter);
    if (parts.length < 2) continue;

    let rawGrNo = '';
    let rawAdmissionDate = '';
    let fullName = '';
    let fatherOrHusbandName = '';
    let fatherOrHusbandProfession = '';
    let rawDob = '';
    let qualification = '';
    let aadharCardNo = '';
    let mobile = '';
    let emergencyContact = '';
    let address = '';
    let rawCourse = '';
    let rawBatchTime = '';
    let rawTotalFees = '0';
    let rawDiscount = '0';
    let rawPaidFees = '0';

    if (hasHeader) {
      rawGrNo = idxGr >= 0 ? parts[idxGr] || '' : parts[0] || '';
      rawAdmissionDate = idxAdmDate >= 0 ? parts[idxAdmDate] || '' : parts[1] || '';
      fullName = idxName >= 0 ? parts[idxName] || '' : parts[2] || '';
      fatherOrHusbandName = idxFatherName >= 0 ? parts[idxFatherName] || '' : '';
      fatherOrHusbandProfession = idxFatherProf >= 0 ? parts[idxFatherProf] || '' : '';
      rawDob = idxDob >= 0 ? parts[idxDob] || '' : '';
      qualification = idxQual >= 0 ? parts[idxQual] || '' : '';
      aadharCardNo = idxAadhar >= 0 ? parts[idxAadhar] || '' : '';
      mobile = idxMobile >= 0 ? parts[idxMobile] || '' : '';
      emergencyContact = idxEmergency >= 0 ? parts[idxEmergency] || '' : '';
      address = idxAddress >= 0 ? parts[idxAddress] || '' : '';
      rawCourse = idxCourse >= 0 ? parts[idxCourse] || '' : '';
      rawBatchTime = idxBatch >= 0 ? parts[idxBatch] || '' : '';
      // If Total fees column is not in the CSV, rawTotalFees stays '0' and is auto-fetched from Course Catalog
      rawTotalFees = idxTotal >= 0 ? parts[idxTotal] || '0' : '0';
      rawDiscount = idxDiscount >= 0 ? parts[idxDiscount] || '0' : '0';
      rawPaidFees = idxPaid >= 0 ? parts[idxPaid] || '0' : '0';
    } else {
      const looksLikePhone = (val: string) =>
        /^\d{10}$/.test((val || '').replace(/[\s\-+]/g, ''));

      if (parts.length <= 9) {
        // 9-column short sequence (No personal fields, No Total fees, No Discount):
        // GR.No, Admission Date, Full Name, Mobile, Emergency, Address, Course, Batch time, Paid fees
        rawGrNo = parts[0] || '';
        rawAdmissionDate = parts[1] || '';
        fullName = parts[2] || '';
        mobile = parts[3] || '';
        emergencyContact = parts[4] || '';
        address = parts[5] || '';
        rawCourse = parts[6] || '';
        rawBatchTime = parts[7] || '';
        rawTotalFees = '0';
        rawDiscount = '0';
        rawPaidFees = parts[8] || '0';
      } else if (parts.length === 10) {
        // 10-column sequence (No personal fields, No Total fees):
        // GR.No, Admission Date, Full Name, Mobile, Emergency, Address, Course, Batch time, Discount, Paid fees
        rawGrNo = parts[0] || '';
        rawAdmissionDate = parts[1] || '';
        fullName = parts[2] || '';
        mobile = parts[3] || '';
        emergencyContact = parts[4] || '';
        address = parts[5] || '';
        rawCourse = parts[6] || '';
        rawBatchTime = parts[7] || '';
        rawTotalFees = '0';
        rawDiscount = parts[8] || '0';
        rawPaidFees = parts[9] || '0';
      } else if (parts.length === 11) {
        if (looksLikePhone(parts[5])) {
          // 11-column sequence (12-column format with Discount omitted):
          // GR.No, Admission Date, Student full name, Date of birth, Qualification, Mobile number, Emergency contact number, Address, Course, Batch time, Paid fees
          rawGrNo = parts[0] || '';
          rawAdmissionDate = parts[1] || '';
          fullName = parts[2] || '';
          rawDob = parts[3] || '';
          qualification = parts[4] || '';
          mobile = parts[5] || '';
          emergencyContact = parts[6] || '';
          address = parts[7] || '';
          rawCourse = parts[8] || '';
          rawBatchTime = parts[9] || '';
          rawTotalFees = '0';
          rawDiscount = '0';
          rawPaidFees = parts[10] || '0';
        } else {
          // 11-column legacy sequence (No personal fields, with Total fees, Discount, Paid fees):
          rawGrNo = parts[0] || '';
          rawAdmissionDate = parts[1] || '';
          fullName = parts[2] || '';
          mobile = parts[3] || '';
          emergencyContact = parts[4] || '';
          address = parts[5] || '';
          rawCourse = parts[6] || '';
          rawBatchTime = parts[7] || '';
          rawTotalFees = parts[8] || '0';
          rawDiscount = parts[9] || '0';
          rawPaidFees = parts[10] || '0';
        }
      } else if (parts.length === 12) {
        // Primary 12-column sequence:
        // GR.No, Admission Date, Student full name, Date of birth, Qualification, Mobile number, Emergency contact number, Address, Course, Batch time, Discount, Paid fees
        rawGrNo = parts[0] || '';
        rawAdmissionDate = parts[1] || '';
        fullName = parts[2] || '';
        rawDob = parts[3] || '';
        qualification = parts[4] || '';
        mobile = parts[5] || '';
        emergencyContact = parts[6] || '';
        address = parts[7] || '';
        rawCourse = parts[8] || '';
        rawBatchTime = parts[9] || '';
        rawTotalFees = '0';
        rawDiscount = parts[10] || '0';
        rawPaidFees = parts[11] || '0';
      } else if (parts.length === 13) {
        // 13-column sequence (12-column fields + explicit Total fees before Discount & Paid fees):
        rawGrNo = parts[0] || '';
        rawAdmissionDate = parts[1] || '';
        fullName = parts[2] || '';
        rawDob = parts[3] || '';
        qualification = parts[4] || '';
        mobile = parts[5] || '';
        emergencyContact = parts[6] || '';
        address = parts[7] || '';
        rawCourse = parts[8] || '';
        rawBatchTime = parts[9] || '';
        rawTotalFees = parts[10] || '0';
        rawDiscount = parts[11] || '0';
        rawPaidFees = parts[12] || '0';
      } else if (parts.length === 14) {
        // 14-column sequence (With 5 personal fields, No Total fees, No Discount — only Paid fees at col 13):
        rawGrNo = parts[0] || '';
        rawAdmissionDate = parts[1] || '';
        fullName = parts[2] || '';
        fatherOrHusbandName = parts[3] || '';
        fatherOrHusbandProfession = parts[4] || '';
        rawDob = parts[5] || '';
        qualification = parts[6] || '';
        aadharCardNo = parts[7] || '';
        mobile = parts[8] || '';
        emergencyContact = parts[9] || '';
        address = parts[10] || '';
        rawCourse = parts[11] || '';
        rawBatchTime = parts[12] || '';
        rawTotalFees = '0';
        rawDiscount = '0';
        rawPaidFees = parts[13] || '0';
      } else if (parts.length === 15) {
        // Standard 15-column sequence (NO Total fees — Auto-fetched from Course Catalog!):
        if (looksLikePhone(parts[3]) && !looksLikePhone(parts[8])) {
          // Alternative 15-column order (personal fields at the end, no Total fees):
          // GR.No, Admission Date, Name, Mobile, Emergency, Address, Course, Batch, Discount, Paid, Father, Profession, DOB, Qualification, Aadhar
          rawGrNo = parts[0] || '';
          rawAdmissionDate = parts[1] || '';
          fullName = parts[2] || '';
          mobile = parts[3] || '';
          emergencyContact = parts[4] || '';
          address = parts[5] || '';
          rawCourse = parts[6] || '';
          rawBatchTime = parts[7] || '';
          rawTotalFees = '0';
          rawDiscount = parts[8] || '0';
          rawPaidFees = parts[9] || '0';
          fatherOrHusbandName = parts[10] || '';
          fatherOrHusbandProfession = parts[11] || '';
          rawDob = parts[12] || '';
          qualification = parts[13] || '';
          aadharCardNo = parts[14] || '';
        } else {
          // Primary 15-column order:
          // GR.No, Admission Date, Full Name, Father/Husband Name, Profession, DOB, Qualification, Aadhar, Mobile, Emergency, Address, Course, Batch time, Discount, Paid fees
          rawGrNo = parts[0] || '';
          rawAdmissionDate = parts[1] || '';
          fullName = parts[2] || '';
          fatherOrHusbandName = parts[3] || '';
          fatherOrHusbandProfession = parts[4] || '';
          rawDob = parts[5] || '';
          qualification = parts[6] || '';
          aadharCardNo = parts[7] || '';
          mobile = parts[8] || '';
          emergencyContact = parts[9] || '';
          address = parts[10] || '';
          rawCourse = parts[11] || '';
          rawBatchTime = parts[12] || '';
          rawTotalFees = '0';
          rawDiscount = parts[13] || '0';
          rawPaidFees = parts[14] || '0';
        }
      } else {
        // 16+ columns (Legacy sequence that includes Total fees, Discount, Paid fees)
        if (looksLikePhone(parts[3]) && !looksLikePhone(parts[8])) {
          rawGrNo = parts[0] || '';
          rawAdmissionDate = parts[1] || '';
          fullName = parts[2] || '';
          mobile = parts[3] || '';
          emergencyContact = parts[4] || '';
          address = parts[5] || '';
          rawCourse = parts[6] || '';
          rawBatchTime = parts[7] || '';
          rawTotalFees = parts[8] || '0';
          rawDiscount = parts[9] || '0';
          rawPaidFees = parts[10] || '0';
          fatherOrHusbandName = parts[11] || '';
          fatherOrHusbandProfession = parts[12] || '';
          rawDob = parts[13] || '';
          qualification = parts[14] || '';
          aadharCardNo = parts[15] || '';
        } else {
          rawGrNo = parts[0] || '';
          rawAdmissionDate = parts[1] || '';
          fullName = parts[2] || '';
          fatherOrHusbandName = parts[3] || '';
          fatherOrHusbandProfession = parts[4] || '';
          rawDob = parts[5] || '';
          qualification = parts[6] || '';
          aadharCardNo = parts[7] || '';
          mobile = parts[8] || '';
          emergencyContact = parts[9] || '';
          address = parts[10] || '';
          rawCourse = parts[11] || '';
          rawBatchTime = parts[12] || '';
          rawTotalFees = parts[13] || '0';
          rawDiscount = parts[14] || '0';
          rawPaidFees = parts[15] || '0';
        }
      }
    }

    const finalGrNo = rawGrNo.trim() || `GR-${existingStudents.length + rows.length + 101}`;
    const admissionDate = normalizeDateString(rawAdmissionDate, true);
    const dateOfBirth = normalizeDateString(rawDob, false);
    const cleanedMobile = mobile.replace(/\s+/g, '');

    const multiCourse = parseMultiCoursesFromCell(rawCourse, courses);

    const matchedBatch = availableBatches.find(
      (b) =>
        b.batchId.toLowerCase() === rawBatchTime.toLowerCase() ||
        b.batchName.toLowerCase().includes(rawBatchTime.toLowerCase()) ||
        (b.startTime && rawBatchTime.toLowerCase().includes(b.startTime.toLowerCase()))
    );

    const parsedTotalFee = Math.max(
      0,
      Number(String(rawTotalFees || '0').replace(/[^0-9.]/g, '')) || 0
    );
    const discount = Math.max(0, Number(String(rawDiscount || '0').replace(/[^0-9.]/g, '')) || 0);
    const paidAmount = Math.max(0, Number(String(rawPaidFees || '0').replace(/[^0-9.]/g, '')) || 0);

    const isFeeAutoCalculated = parsedTotalFee <= 0;
    const finalTotalFee = parsedTotalFee > 0 ? parsedTotalFee : multiCourse.summedStandardFee;
    const netPayable = Math.max(0, finalTotalFee - discount);
    const outstandingBalance = Math.max(0, netPayable - paidAmount);

    const isDuplicate =
      existingGrNos.has(finalGrNo.toLowerCase()) ||
      (cleanedMobile !== '' && existingMobiles.has(cleanedMobile));

    rows.push({
      grNo: finalGrNo,
      admissionDate,
      fullName: fullName.trim() || 'Unknown Student',
      fatherOrHusbandName: fatherOrHusbandName.trim(),
      fatherOrHusbandProfession: fatherOrHusbandProfession.trim(),
      dateOfBirth,
      qualification: qualification.trim(),
      aadharCardNo: aadharCardNo.trim(),
      mobile: cleanedMobile,
      emergencyContact: emergencyContact.trim(),
      address: address.trim(),
      courseId: multiCourse.courseId,
      courseName: multiCourse.courseName,
      courseIds: multiCourse.courseIds,
      courseNames: multiCourse.courseNames,
      batchId:
        matchedBatch?.batchId ||
        (rawBatchTime ? `BATCH_${rawBatchTime}` : availableBatches[0]?.batchId || 'BATCH-01'),
      batchName:
        matchedBatch?.batchName ||
        rawBatchTime ||
        availableBatches[0]?.batchName ||
        'Batch 1 (08:00 AM - 09:00 AM)',
      totalCourseFee: finalTotalFee,
      discount,
      paidAmount,
      netPayable,
      outstandingBalance,
      isDuplicate,
      isFeeAutoCalculated,
    });
  }

  return rows;
}

export const GoogleIntegrations: React.FC = () => {
  const { students, courses, batches, addStudent } = useInstitute();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentCsvRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const availableBatches = batches.length >= 12 ? batches : STANDARD_12_HOURLY_BATCHES;

  // 12-column sample template (GR.No, Admission Date, Student full name, Date of birth, Qualification, Mobile number, Emergency contact number, Address, Course, Batch time, Discount, Paid fees)
  const sampleTemplate = `GR.No,Admission Date,Student full name,Date of birth,Qualification,Mobile number,Emergency contact number,Address,Course,Batch time,Discount,Paid fees
GR-101,2026-10-01,Aarav Patel,2004-05-14,B.Com,9825123456,9825199999,"Navrangpura, Ahmedabad","CCC + Tally Prime with GST",08:00 AM - 09:00 AM,500,4000
GR-102,2026-10-03,Diya Shah,2005-08-22,12th Commerce,9879012345,9879055555,"Naranpura, Ahmedabad",Advanced Excel & MIS,09:00 AM - 10:00 AM,500,3000
GR-103,2026-10-05,Keval Mehta,2003-11-09,BCA,9909234567,9909288888,"Vastrapur, Ahmedabad","Python + Full Stack Web Development",10:00 AM - 11:00 AM,1000,10000`;

  const handleDownloadSampleCsv = () => {
    const headers = [
      'GR.No',
      'Admission Date',
      'Student full name',
      'Date of birth',
      'Qualification',
      'Mobile number',
      'Emergency contact number',
      'Address',
      'Course',
      'Batch time',
      'Discount',
      'Paid fees',
    ];
    const sampleRows = [
      [
        'GR-101',
        getTodayDateString(),
        'Aarav Patel',
        '2004-05-14',
        'B.Com',
        '9825123456',
        '9825199999',
        'Navrangpura, Ahmedabad',
        'CCC + Tally Prime with GST',
        '08:00 AM - 09:00 AM',
        500,
        4000,
      ],
      [
        'GR-102',
        getTodayDateString(),
        'Diya Shah',
        '2005-08-22',
        '12th Commerce',
        '9879012345',
        '9879055555',
        'Naranpura, Ahmedabad',
        'Advanced Excel & MIS',
        '09:00 AM - 10:00 AM',
        500,
        3000,
      ],
    ];
    exportToCSV('TechVision_Student_Import_12Col_Template', headers, sampleRows);
    showToast('12-Column CSV Template (Auto Total Fees) downloaded!', 'success');
  };

  const parseRawText = (rawText: string) => {
    if (!rawText.trim()) {
      showToast('Please paste CSV / Google Sheet rows or upload a CSV file.', 'error');
      return;
    }

    try {
      const rows = parseStudentsCsvData(rawText, courses, availableBatches, students);
      if (rows.length === 0) {
        showToast('No valid student rows found in CSV. Check header and data rows.', 'error');
        return;
      }
      setParsedRows(rows);
      showToast(
        `Parsed ${rows.length} active student records! Total fees auto-calculated from Course Catalog.`,
        'success'
      );
    } catch {
      showToast('Error parsing CSV data. Please check column sequence.', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      setCsvText(content);
      parseRawText(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setIsImporting(true);
    let successCount = 0;

    try {
      for (const row of parsedRows) {
        await addStudent({
          studentId: row.grNo,
          grNo: row.grNo,
          fullName: row.fullName,
          fatherOrHusbandName: row.fatherOrHusbandName,
          fatherOrHusbandProfession: row.fatherOrHusbandProfession,
          dateOfBirth: row.dateOfBirth,
          qualification: row.qualification,
          aadharCardNo: row.aadharCardNo,
          mobile: row.mobile,
          emergencyContact: row.emergencyContact,
          address: row.address,
          courseId: row.courseId,
          courseName: row.courseName,
          courseIds: row.courseIds,
          courseNames: row.courseNames,
          batchId: row.batchId,
          batchName: row.batchName,
          admissionDate: row.admissionDate,
          startDate: row.admissionDate,
          totalCourseFee: row.totalCourseFee,
          discount: row.discount,
          netPayable: row.netPayable,
          paidAmount: row.paidAmount,
          courseCompleted: false,
          certificateIssued: false,
          status: 'active',
          internalNotes: 'Imported via CSV / Google Sheets',
        });
        successCount++;
      }
      showToast(
        `Successfully imported ${successCount} active students (Total Fees auto-applied from Course Catalog)!`,
        'success'
      );
      setParsedRows([]);
      setCsvText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Encountered an error while importing students.';
      showToast(msg, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Google Sheets & CSV Student Importer
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Bulk-import active students without typing Total Fees — course fees are automatically fetched from your Course Catalog.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadSampleCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-600" />
            Download 12-Column CSV Template
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-900/20 cursor-pointer"
          >
            <FileUp className="w-4 h-4" />
            Upload CSV File
          </button>
        </div>
      </div>

      {/* Exact 12-Column Sequence Reference Card (No Total Fees Needed) */}
      <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Verified 12-Column CSV Sequence (Total Fees Auto-Fetched from Course Catalog)
            </h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              Your CSV requires only these <strong>12 columns</strong>. Total fees are automatically fetched from the{' '}
              <strong>Course</strong> column (single or multiple courses separated by{' '}
              <code className="px-1 py-0.5 bg-white rounded border border-emerald-200">+</code>, e.g.{' '}
              <code>&quot;CCC + Tally Prime&quot;</code>).
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[11px] font-bold text-emerald-800 shrink-0">
            Total Fees = Auto from Course • Remaining = (Course Fee − Discount) − Paid
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
          {[
            '1. GR.No',
            '2. Admission Date',
            '3. Student full name',
            '4. Date of birth',
            '5. Qualification',
            '6. Mobile number',
            '7. Emergency contact number',
            '8. Address',
            '9. Course (Single/Multi)',
            '10. Batch time',
            '11. Discount',
            '12. Paid fees',
          ].map((col) => (
            <div
              key={col}
              className="px-2.5 py-2 rounded-xl bg-white border border-emerald-200/80 text-[11px] font-bold text-slate-800 shadow-2xs"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Live Course Fee Catalog Reference */}
        {courses.length > 0 && (
          <div className="pt-2 border-t border-emerald-200/70">
            <div className="text-[11px] font-extrabold text-emerald-950 uppercase tracking-wider mb-1.5">
              Active Course Fee Amounts Used Automatically During Import:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {courses.map((c) => (
                <span
                  key={c.courseId}
                  className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[11px] font-semibold text-slate-700"
                >
                  <strong className="text-slate-900">{c.courseName}</strong> ({c.courseId}):{' '}
                  <span className="font-black text-emerald-700">{formatINR(c.standardFee)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spreadsheet / CSV Importer Panel */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-600" />
              Paste Rows from Google Sheets or CSV
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Supports comma-separated CSV or direct copy-paste (tab-separated) from Google Sheets without needing a Total Fees column.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCsvText(sampleTemplate);
                parseRawText(sampleTemplate);
              }}
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer"
            >
              Load Sample 12-Column Data (Auto Total Fees)
            </button>
          </div>
        </div>

        <div>
          <textarea
            rows={6}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`GR.No, Admission Date, Student full name, Date of birth, Qualification, Mobile number, Emergency contact number, Address, Course, Batch time, Discount, Paid fees`}
            className="w-full p-3.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          {csvText && (
            <button
              type="button"
              onClick={() => {
                setCsvText('');
                setParsedRows([]);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => parseRawText(csvText)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Preview & Auto-Calculate Course Fees
          </button>
        </div>

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Import Preview ({parsedRows.length} Active Students Ready)
                </h4>
                <p className="text-xs text-slate-500">
                  Total Fees are automatically matched from your Course Catalog. Every student is set to Course Completed = No, Certificate Given = No, Status = Active.
                </p>
              </div>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-900/20 disabled:opacity-50 cursor-pointer"
              >
                {isImporting
                  ? 'Importing Students...'
                  : `Confirm Import (${parsedRows.length} Students)`}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">GR.No</th>
                    <th className="py-2.5 px-3">Admission Date</th>
                    <th className="py-2.5 px-3">Student Full Name</th>
                    <th className="py-2.5 px-3">DOB</th>
                    <th className="py-2.5 px-3">Qualification</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Emergency Contact</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">Course(s)</th>
                    <th className="py-2.5 px-3">Batch Time</th>
                    <th className="py-2.5 px-3">Total Fees (Auto)</th>
                    <th className="py-2.5 px-3">Discount</th>
                    <th className="py-2.5 px-3">Paid Fees</th>
                    <th className="py-2.5 px-3">Remaining Fees</th>
                    <th className="py-2.5 px-3">Defaults</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-800">{row.grNo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{row.admissionDate}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{row.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{row.dateOfBirth || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row.qualification || '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{row.mobile}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {row.emergencyContact || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate" title={row.address}>
                        {row.address || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-cyan-900">
                        {row.courseName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{row.batchName}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{formatINR(row.totalCourseFee)}</span>
                          {row.isFeeAutoCalculated && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-bold">
                              Auto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{formatINR(row.discount)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">
                        {formatINR(row.paidAmount)}
                      </td>
                      <td className="py-2.5 px-3 font-black text-rose-600">
                        {formatINR(row.outstandingBalance)}
                      </td>
                      <td className="py-2.5 px-3">
                        {row.isDuplicate ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            Duplicate GR.No/Mobile
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            Active • Running • No Cert
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Auto Course Fee Lookup</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            No need to enter Total Fees in your CSV — the importer automatically looks up and sums course fees from your Course Catalog.
          </p>
          <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            Smart Fee Calculation Active
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Google Drive Cloud Storage</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Exports to CSV can be saved locally or uploaded to Google Drive anytime.
          </p>
          <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
            Export via CSV
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Multi-Course & 12 Hourly Batches</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Supports single or multiple courses per student (e.g. CCC + Tally) and maps 1-hour batch slots automatically.
          </p>
          <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
            Multi-Course Ready
          </span>
        </div>
      </div>
    </div>
  );
};
