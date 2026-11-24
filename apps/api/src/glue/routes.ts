// Route glue: every API route group is mounted here. The API routes check the session themselves.
import { mountApiRoutes } from '../routes';

export const routes = [
  { id: 'api-routes', mount: mountApiRoutes },
];
