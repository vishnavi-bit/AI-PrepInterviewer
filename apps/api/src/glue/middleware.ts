// Middleware glue. Global middleware runs before every route, so it must not block public routes.
// The multi-tenant module's guard and the response cache were removed from this list on purpose:
//   - multi-tenant answered 401 to every request without a tenant, including login and registration;
//   - the response cache could show a dashboard that is up to 30 seconds old after an interview finished.
// Authentication runs per route through lib/session.ts.
import { authenticate } from '../auth/authMiddleware'; // knm:module jwt-auth
import { auditMiddleware } from '../audit/auditMiddleware'; // knm:module audit-trail

export const middleware = [
  { id: 'jwt-auth', handler: authenticate },
  { id: 'audit-trail', handler: auditMiddleware },
];
