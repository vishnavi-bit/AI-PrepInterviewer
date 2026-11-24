// Mounts every API route group. Each group checks the session cookie itself, so public routes stay public.
import cookieParser from 'cookie-parser';
import { Router } from 'express';
import { mountAuth } from './auth';
import { mountDashboard } from './dashboard';
import { mountInterview } from './interview';
import { mountProfile } from './profile';
import { mountResume } from './resume';
import { mountRoles } from './roles';

export const mountApiRoutes = (router: Router): void => {
  router.use(cookieParser());
  mountAuth(router);
  mountProfile(router);
  mountResume(router);
  mountRoles(router);
  mountInterview(router);
  mountDashboard(router);
};
