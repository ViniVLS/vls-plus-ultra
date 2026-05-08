# VLS Plus Versioning Rule

## Description
This rule ensures that the application version is synchronized across all critical points of the VLS Plus player.

## Single Source of Truth
- **File**: `src/app/version.ts`
- **Variable**: `APP_VERSION` (e.g., '0.0.1')

## Synchronization Checklist
Whenever the version is updated, the following 4 locations MUST be synchronized:

1. **`src/app/version.ts`**: Update the constant.
2. **`package.json`**: Update the `"version"` field.
3. **UI - Login**: Visible at the bottom of the login card.
4. **UI - Navbar**: Visible in the authenticated header next to the profile.
5. **Console**: A log must be emitted during initialization showing the version.

## Versioning Pattern
- Use Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`.
- Display format in UI: `V{VERSION}` (e.g., V0.0.1).
