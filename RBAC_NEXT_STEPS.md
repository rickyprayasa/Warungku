# RBAC Implementation - Next Steps Roadmap

## 🎉 Issue Resolution Summary

**Previous Blocking Issue**: Admin users couldn't access CMS Admin panel due to stale Supabase Auth session containing a User ID that no longer existed in the database.

**Resolution**: Session clearing and re-authentication successfully restored admin access. The User ID now correctly matches the database record.

## ✅ Immediate Actions (Post-Fix Verification)

### 1. Verify Admin Access is Working
- [ ] Login as `admin@rsquareidea.my.id` and confirm redirect to `/admin`
- [ ] Verify all admin features are accessible:
  - [ ] User management page
  - [ ] Store management
  - [ ] Billing/subscription management
  - [ ] Analytics dashboard
- [ ] Check console logs show correct User ID from database
- [ ] Verify PermissionService returns `role: 'super_admin'`

### 2. Clean Up Debug Files
- [ ] Remove or archive `debug-auth.html` (no longer needed)
- [ ] Remove excessive debug logging from PermissionService (keep essential logs)
- [ ] Document the fix for future reference

### 3. Create Admin Onboarding Documentation
- [ ] Document how to create new admin users
- [ ] Document how to assign super_admin role
- [ ] Add troubleshooting section for auth issues

---

## 📋 Short-Term Improvements (Week 1-2)

### 1. Enhance PermissionService
**File**: `src/core/services/auth/PermissionService.ts`

```typescript
// Add these improvements:
- Reduce logging verbosity (only log in DEV mode)
- Add retry logic for failed RPC calls
- Implement request deduplication to prevent duplicate queries
- Add metrics/monitoring for permission checks
```

**Tasks**:
- [ ] Add environment-aware logging (only detailed logs in DEV)
- [ ] Implement query deduplication for concurrent permission checks
- [ ] Add error recovery fallback mechanisms

### 2. Improve Session Management
**Files**: `src/contexts/AuthContext.tsx`, `src/contexts/AdminContext.tsx`

**Tasks**:
- [ ] Add automatic session validation on role changes
- [ ] Implement session refresh after role updates
- [ ] Add visual feedback when role/permissions change
- [ ] Store last verified role timestamp to detect stale data

### 3. Add Server-Side Validation
**File**: `src/pages/api/*` (if using API routes) or validate in RPC functions

**Tasks**:
- [ ] Add Zod schemas for role assignment validation
- [ ] Implement server-side permission checks in RPC functions
- [ ] Add audit logging for all role changes
- [ ] Validate admin permissions on server-side operations

### 4. Fix RLS Policies (if still needed)
**File**: New migration file

**Tasks**:
- [ ] Verify all RLS policies work correctly with new role system
- [ ] Test policies for: stores, products, sales, categories, expenses
- [ ] Ensure super_admin can bypass all RLS restrictions
- [ ] Add integration tests for RLS policies

---

## 🔧 Medium-Term Enhancements (Month 1)

### 1. Role Management UI
Create a dedicated admin page for managing user roles.

**New File**: `src/pages/admin/AdminRolesPage.tsx`

**Features**:
- [ ] List all users with their current roles
- [ ] Inline role editing with dropdown
- [ ] Bulk role updates
- [ ] Role change history/audit log
- [ ] Search and filter users
- [ ] Show last sign-in time
- [ ] Indicate active/inactive users

**Related Files**:
- Update `src/main.tsx` to add `/admin/roles` route
- Update `src/components/admin/AdminSidebar.tsx` to add navigation link

### 2. Enhanced Audit Logging
**File**: `src/lib/audit-logger.ts` (enhance existing)

**Tasks**:
- [ ] Log all permission checks (successful and denied)
- [ ] Log role changes with before/after values
- [ ] Log admin access to sensitive operations
- [ ] Create audit log viewer for admins
- [ ] Export audit logs as CSV
- [ ] Add filters for date range, user, action type

### 3. Permission Caching Strategy
**Current**: 5-minute TTL cache in PermissionService

**Improvements**:
- [ ] Implement cache invalidation on role change events
- [ ] Use Supabase Realtime for instant permission updates
- [ ] Add version-based cache invalidation
- [ ] Consider using Redis for distributed caching (if using Cloudflare Workers)

### 4. Testing & Quality Assurance
**New Files**:
- `src/__tests__/services/PermissionService.test.ts`
- `src/__tests__/contexts/AdminContext.test.ts`
- `src/__tests__/integration/rbac.test.ts`

**Test Coverage**:
- [ ] Unit tests for PermissionService methods
- [ ] Integration tests for admin access flows
- [ ] E2E tests for role changes
- [ ] RLS policy compliance tests
- [ ] Test with multiple concurrent admin sessions

---

## 🏗️ Medium-Term Architecture (Month 2-3)

### 1. Centralize Authorization Logic
**New File**: `src/core/auth/authorization.ts`

**Purpose**: Single source of truth for all authorization logic

```typescript
// Example structure:
export const authorization = {
  can: {
    manageUsers: (userId: string) => checkPermission(userId, 'manage_users'),
    deleteStore: (userId: string, storeId: string) => checkStoreAccess(userId, storeId, 'delete'),
    viewAnalytics: (userId: string) => checkPermission(userId, 'view_analytics'),
    // ... more permissions
  },
  // Helper functions
};
```

**Benefits**:
- Consistent permission checking across the app
- Easier to audit and maintain
- Single place to update permission logic

### 2. Implement Role Hierarchy
**File**: `src/core/domain/entities/Role.ts`

**Enhancement**: Add role inheritance

```typescript
// Role hierarchy:
SUPER_ADMIN > STORE_OWNER > STORE_MEMBER > CASHIER

// Each role inherits permissions from roles below
STORE_OWNER has all permissions of STORE_MEMBER and CASHIER
SUPER_ADMIN has all permissions
```

**Tasks**:
- [ ] Define role hierarchy in code
- [ ] Update permission checking to respect hierarchy
- [ ] Document which permissions each role inherits
- [ ] Add visual indicator in UI for role hierarchy

### 3. Add Custom Roles (Optional)
**File**: `src/core/domain/entities/CustomRole.ts`

**Future Enhancement**: Allow creating custom roles with specific permissions

**Features**:
- [ ] Define custom roles with permission sets
- [ ] Assign custom roles to users
- [ ] UI for managing custom roles
- [ ] Permission templates for common use cases

### 4. Enhance Security Headers
**File**: `worker/index.ts` or middleware

**Tasks**:
- [ ] Add CSRF protection
- [ ] Implement rate limiting per role (stricter for non-admins)
- [ ] Add security headers for admin routes
- [ ] Implement IP whitelisting for super admin access (optional)

---

## 🚀 Long-Term Vision (Quarter 2+)

### 1. Multi-Tenant Admin System
Allow different organizations to have their own admins.

**Considerations**:
- [ ] Platform-level super admins vs organization-level admins
- [ ] Cross-organization access controls
- [ ] Organization hierarchy
- [ ] Delegated administration

### 2. Advanced Permission System
Move beyond simple role-based access to attribute-based access control (ABAC).

**Features**:
- [ ] Resource-specific permissions (e.g., can edit specific products but not others)
- [ ] Time-based permissions (temporary admin access)
- [ ] Location-based permissions
- [ ] Conditional permissions (e.g., require MFA for sensitive operations)

### 3. Compliance & Governance
For enterprise customers and regulatory compliance.

**Features**:
- [ ] SOC 2 compliance logging
- [ ] GDPR right to access (user can see their permissions)
- [ ] Role certification (periodic review of admin access)
- [ ] Automated deprovisioning of inactive admins

### 4. Developer Experience
Make it easy for other developers to use the permission system.

**Tasks**:
- [ ] Create permission hooks (`useCan()`, `useRole()`)
- [ ] Add TypeScript decorators for permission checks
- [ ] Create CLI tools for managing roles
- [ ] Generate permission documentation from code
- [ ] Add permission checking to API documentation

---

## 📊 Migration Guide (For Existing Users)

### Scenario 1: Existing Users Need Roles
**Problem**: Current users have `role` = NULL in database

**Solution**:
```sql
-- Set all existing users as store owners
UPDATE auth.users
SET role = 'store_owner'
WHERE role IS NULL
AND deleted_at IS NULL
AND email NOT ILIKE '%@admin%';
```

### Scenario 2: Promoting User to Admin
**Steps**:
1. User must be logged out
2. Run SQL to update role:
   ```sql
   UPDATE auth.users
   SET role = 'super_admin', is_super_admin = true
   WHERE email = 'user@example.com';
   ```
3. Clear permission cache in frontend
4. User logs back in

### Scenario 3: Demoting Admin
**Steps**:
1. Verify admin is not the last super admin
2. Run SQL:
   ```sql
   UPDATE auth.users
   SET role = 'store_member', is_super_admin = false
   WHERE email = 'admin@example.com';
   ```
3. Clear permission cache
4. User logs out and back in

---

## 🔍 Monitoring & Alerting

### Key Metrics to Track
1. **Permission Check Performance**
   - Average response time for `getUserRole()`
   - Cache hit rate
   - RPC function execution time

2. **Security Events**
   - Failed permission checks (potential security issues)
   - Role changes (audit trail)
   - Multiple failed admin login attempts

3. **User Activity**
   - Number of active super admins
   - Permission check errors
   - Session invalidation events

### Alerting Rules
- [ ] Alert if `getUserRole()` error rate > 5%
- [ ] Alert if RPC function response time > 1s
- [ ] Alert if number of super admins drops to 0
- [ ] Alert on multiple failed admin login attempts from same IP

---

## 📚 Documentation Updates Needed

### For Developers
- [ ] Update README with RBAC overview
- [ ] Add permission checking examples to documentation
- [ ] Document how to add new permissions
- [ ] Create troubleshooting guide for auth issues

### For Admin Users
- [ ] Create user guide for role management
- [ ] Document how to create new admins
- [ ] Explain role hierarchy and permissions
- [ ] Add screenshots for common admin tasks

### API Documentation
- [ ] Document all RPC functions for permissions
- [ ] Add examples for permission checking
- [ ] Document expected errors and how to handle them

---

## 🎯 Success Metrics

### Technical Metrics
- [ ] Permission check latency < 100ms (p95)
- [ ] 99.9% uptime for admin features
- [ ] Zero data leaks due to permission issues
- [ ] All tests passing with >80% code coverage

### User Experience Metrics
- [ ] Admin users can access features without errors
- [ ] Role changes take effect within 5 seconds
- [ ] Clear error messages for permission denied
- [ ] Intuitive role management UI

### Security Metrics
- [ ] All RLS policies enforced correctly
- [ ] Audit log captures all sensitive operations
- [ ] No unauthorized access to admin features
- [ ] Regular security audits pass

---

## 🔄 Maintenance Tasks

### Weekly
- [ ] Review permission check error logs
- [ ] Verify number of active admins
- [ ] Check RPC function performance

### Monthly
- [ ] Review and rotate admin access
- [ ] Audit role assignments
- [ ] Test backup and restore for auth.users

### Quarterly
- [ ] Security audit of permission system
- [ ] Review and update role definitions
- [ ] Load testing for permission checks
- [ ] Documentation updates

---

**Last Updated**: 2026-03-04
**Status**: ✅ Core RBAC Implementation Complete - Moving to Enhancements
**Next Milestone**: Complete Short-Term Improvements (Week 1-2)
