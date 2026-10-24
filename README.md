# After Hours Games

A responsive, installable party-game PWA. **Drunk or Drama** is the first standalone game; each game has its own session setup, generated card pack, play flow, and ending.

## Run locally

1. Install Node.js 20.18 or newer.
2. Run `npm install`.
3. For local generation, make sure Ollama is running and the Gemma 4 model is installed (`ollama run gemma4`).
4. Copy `.env.example` to `.env`. The default provider is Ollama at `http://127.0.0.1:11434` with `gemma4:latest`.
5. Run `npm run dev` and open the local URL Vite prints.

The live session endpoint sends schema-constrained generation requests to either Ollama or OpenRouter. To use OpenRouter instead, set `GENERATION_PROVIDER=openrouter` and add your key to `OPENROUTER_API_KEY` in `.env`. The default model is `openrouter/free`; set `OPENROUTER_MODEL` to use another model. Keep the key server-side and never add it to a `VITE_` variable.

Generation is sized to the requested number of cards, and identical requests already in progress share one model call. Successful sessions are not cached, so a new session can still be fresh. Ollama keeps the model warm for 15 minutes by default (`OLLAMA_KEEP_ALIVE`) and receives a context size matched to the deck. OpenRouter's default free route prioritizes throughput; set `OPENROUTER_PROVIDER_SORT` to `latency` or `throughput` to tune routing.

## Build and serve

- `npm test` runs the server-side validation and generation tests.
- `npm run build` type-checks and creates the production PWA in `dist/`.
- `npm start` serves `dist/` and the generation endpoint. Run the build first.

Feedback submitted in the app is appended to `data/feedback.ndjson` on the server. The form does not ask for a name or email.

New sessions require the selected generation provider to be available. Ollama runs locally; OpenRouter requires an internet connection and API key. The app caches its shell and the active session locally, so an already-generated session can finish if the connection drops.

## Session rules

- Adult confirmation is required to enter.
- Group presets: close friends, mixed group, new people.
- Spice: chill, spicy, wild. The host chooses a suggestive or explicit ceiling.
- Drink and No Drink are separate generation modes. No Drink cards and their skip penalties must contain no drinking language.
- Names are optional; the group size is 2–12. Hosts can choose 1–3 turns per player.
- Dares are 45–60 seconds. A skipped card reveals its own penalty.
- The group chooses the favorite moment; there is no point tally.
