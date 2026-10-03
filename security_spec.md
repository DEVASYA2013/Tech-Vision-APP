# Security Specification & Threat Model — Tech Vision Computer Class

## 1. Data Invariants
1. **Identity & RBAC Invariant**: A user document in `/users/{userId}` can only be created by an authenticated user if no admin exists yet (first administrator bootstrap) or by an authorized admin. Roles ('admin', 'staff') cannot be self-elevated.
2. **PII Protection Invariant**: Student records contain phone numbers and addresses; only authenticated staff and admins can access student records. Public unauthenticated access is strictly forbidden.
3. **Financial Invariant**: Fee payments cannot be deleted. Any adjustment or reversal must be recorded with `isReversal: true`, recordedBy staff UID, and a timestamp. Non-admin staff cannot delete payment records.
4. **Attendance Invariant**: Attendance cannot be recorded by unauthenticated users; each batch session cannot be duplicated.
5. **Seat Exclusivity Invariant**: A seat cannot be occupied by two active students simultaneously without updating status.
6. **Audit Trail Invariant**: Audit log entries are strictly append-only; deletion or modification of audit logs is forbidden for all roles.
7. **Temporal Integrity**: All mutation operations require valid timestamps.
8. **Size & Input Guards**: All text fields have maximum byte limits to prevent denial-of-wallet resource attacks.

## 2. The Dirty Dozen Payloads (Designed to Break Identity, Integrity, and State)
1. **Payload 1 (Ghost Role Self-Elevation)**: An unauthenticated or newly signed-in user writes `{ uid: "attacker", role: "admin", email: "hacker@evil.com" }` to `/users/attacker`.
2. **Payload 2 (Student Fee Erasure)**: A staff user tries to delete all documents in `/feePayments`.
3. **Payload 3 (Arbitrary Fee Discount Overwrite)**: A malicious actor attempts to overwrite `outstandingBalance: 0` on `/students/{id}` without creating a payment record.
4. **Payload 4 (Orphan Attendance Record)**: Writing attendance for a non-existent batch or with malicious script injection.
5. **Payload 5 (Audit Log Poisoning/Deletion)**: Attempting to `delete` an entry from `/auditLogs/{logId}` to hide embezzlement or unauthorized edits.
6. **Payload 6 (Seat Denial of Service)**: Setting 1000 dummy seats or injecting a 2MB string in seat notes.
7. **Payload 7 (Unauthenticated Student Data Scraping)**: Running `getDocs(collection(db, 'students'))` with unauthenticated client.
8. **Payload 8 (Settings Tampering)**: Modifying institute bank account details or name without admin role.
9. **Payload 9 (Terminal State Bypass)**: Re-activating an archived or deleted payment transaction.
10. **Payload 10 (Impersonation of Payment Officer)**: Setting `recordedByStaffId` to the administrator's UID when logged in as another user.
11. **Payload 11 (Oversized Payload Wallet Drain)**: Sending a 500KB JSON array in course sessionsCount or student notes.
12. **Payload 12 (Path Poisoning Attack)**: Injecting path traversal characters like `../../admin` into document IDs.

## 3. Test Runner Invariant
All payloads above must fail with `PERMISSION_DENIED` at the Firestore security rule evaluation stage.
