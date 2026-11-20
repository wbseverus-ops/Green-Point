# Security Specification — PulsePoint HR Firestore Rules

## 1. Data Invariants
1. Every document path ID (`workspaceId`, `employeeId`, `activityId`, `logId`, `rewardId`) MUST match `^[a-zA-Z0-9_-]+$` and be <= 128 chars.
2. Only verified authenticated users (`request.auth != null && request.auth.token.email_verified == true`) can access workspace data.
3. No blanket `allow list: if isSignedIn();` rules exist; every `list` rule evaluates `resource.data` directly (`isBootstrappedAdmin()`, `resource.data.ownerUid == request.auth.uid`, or `request.auth.token.email in resource.data.sharedEmails`) without calling `get()` or `exists()`.
4. Subcollection writes (`create`, `update`, `delete`) verify parent workspace membership via `get(/databases/$(database)/documents/workspaces/$(workspaceId))`.
5. `createdAt` and `ownerUid` are immutable on updates; `createdAt == request.time` on create and `updatedAt == request.time` on update.
6. Point balances (`availablePoints`, `lifetimePoints`, `activitiesCount`, `stock`, `redeemedCount`) are strictly validated as numbers within non-negative bounds (`availablePoints >= 0`).
7. `PointLog` entries are immutable once created (`allow update, delete: if false` except admin cleanup) to preserve audit trail integrity.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read/list on `/workspaces/she-main/employees`.
2. Unverified email user (`email_verified: false`) trying to write to `/workspaces/she-main/logs/log-x`.
3. Spoofed `ownerUid` on workspace create (`ownerUid != request.auth.uid`).
4. Shadow field injection (`{ ..., isSuperUser: true }`) on employee create/update.
5. Oversized string ID (> 128 chars) or invalid characters (`../bad`) in `employeeId`.
6. Oversized `fullName` (> 120 chars) or `description` (> 500 chars) denial-of-wallet payload.
7. Non-server timestamp (`createdAt: "2026-01-01"`) instead of `request.time`.
8. Modifying immutable `ownerUid` or `createdAt` during employee update.
9. Negative `availablePoints` (`-50`) written directly to `/employees/{employeeId}`.
10. Unbounded `sharedEmails` array (> 20 items) or non-string element `[123]`.
11. Unauthorized third-party user attempting to `list` another organization's `/employees`.
12. Invalid `status` value (`status: "hacked"`) outside `['active', 'closed']` on activity write.
