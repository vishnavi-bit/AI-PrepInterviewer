// Entry point for `npm run dev`: starts the API on PORT (default 3000) and reports startup errors.
import { start } from './http/server';

start()
  .then((server) => {
    const { port } = server.address() as { port: number };
    console.log(`API listening on http://localhost:${port}`);
  })
  .catch((err: NodeJS.ErrnoException) => {
    console.error(`API failed to start: ${err.code ?? 'error'}: ${err.message}`);
    process.exit(1);
  });
