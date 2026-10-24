import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleFeedbackRequest, handleGenerateRequest } from './server/api.mjs';

function sessionApi(): Plugin {
  return {
    name: 'session-generation-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const route = request.url?.split('?')[0];
        if (route === '/api/generate-session') void handleGenerateRequest(request, response);
        else if (route === '/api/feedback') void handleFeedbackRequest(request, response);
        else next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), sessionApi()],
  server: { host: '0.0.0.0' },
});
