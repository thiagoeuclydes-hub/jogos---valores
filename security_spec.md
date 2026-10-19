# Security Specification for Controle de Adereços

## Data Invariants
- A Participant must always be linked to a valid Series.
- `paidAmount` cannot be negative.
- `accessoryValue` in Series cannot be negative.
- `amount` in Expense cannot be negative.
- Document IDs must follow standard format.

## The "Dirty Dozen" Payloads (Unauthorized Attempts)
1. Create a Series without being logged in.
2. Create a Series with a negative `accessoryValue`.
3. Update a Participant's `paidAmount` to a negative number.
4. Delete a Series that still has Participants (Logical invariant, though Firestore doesn't enforce cascading natively, we should be careful).
5. Create a Participant with a spoofed `seriesId` that doesn't exist.
6. Update a Participant's name to a 1MB string (Denial of Wallet).
7. Create an Expense with a negative amount.
8. Read someone else's series data (if we had multi-tenancy, but for now we assume global access for the user).
9. Spoof `updatedAt` with a client-side timestamp instead of server timestamp.
10. Add a "Ghost Field" like `isAdmin: true` to a participant document.
11. Batch insert participants with invalid characters in their names.
12. Delete an expense document without authorization.

## Proposed Rules Structure
- Global default deny.
- Auth required for all reads/writes.
- Validation helpers for each entity.
- Strict key checks (hasOnly/hasAll).
