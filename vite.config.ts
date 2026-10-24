import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleGenerateRequest } from './server/api.mjs';

function sessionApi(): Plugin {
  return {
    name: 'session-generation-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/api/generate-session') return next();
        void handleGenerateRequest(request, response);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), sessionApi()],
  server: { host: '0.0.0.0' },
});
