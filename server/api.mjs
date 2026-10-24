const AUDIENCES = new Set(['close-friends', 'mixed-group', 'new-people']);
const SPICE_LEVELS = new Set(['chill', 'spicy', 'wild']);
const MODES = new Set(['drink', 'no-drink']);
const CEILINGS = new Set(['suggestive', 'explicit']);
const CARD_TYPES = new Set(['confession', 'story', 'act', 'dare', 'drink', 'group-challenge']);
const generationWindows = new Map();
const EN_DRINK_WORDS = /\b(drink|drinking|sip|shots?|alcohol|beer|wine|whisky|whiskey|vodka|booze|cocktail|rum|gin|tequila|beverage)\b/i;
const HI_DRINK_WORDS = /\b(daaru|sharab|sharaab|sip|drink|peena|pee lo|pi lo|shot|beer|wine|vodka|whisky|whiskey)\b/i;

export function validateSessionInput(input) {
  if (!input || typeof input !== 'object') throw new Error('Choose your session settings first.');
  if (!AUDIENCES.has(input.audience)) throw new Error('Choose a valid group preset.');
  if (!SPICE_LEVELS.has(input.spice)) throw new Error('Choose a valid spice level.');
  if (!MODES.has(input.drinkMode)) throw new Error('Choose Drink or No Drink mode.');
  if (!CEILINGS.has(input.ceiling)) throw new Error('Choose a content ceiling.');
  const playerCount = Number(input.playerCount);
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 12) {
    throw new Error('Choose between 2 and 12 players.');
  }
  const names = Array.isArray(input.playerNames) ? input.playerNames : [];
  if (names.length && names.length !== playerCount) throw new Error('Add a name for every player, or clear the names field.');
  if (names.some((name) => typeof name !== 'string' || name.trim().length > 24)) throw new Error('Player names must be 24 characters or fewer.');
  return { ...input, playerCount, playerNames: names.map((name) => name.trim()) };
}

function schemaFor(input) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'promptEn', 'promptHi', 'skipPenaltyEn', 'skipPenaltyHi', 'durationSeconds'],
          properties: {
            type: { type: 'string', enum: ['confession', 'story', 'act', 'dare', 'drink', 'group-challenge'] },
            promptEn: { type: 'string' },
            promptHi: { type: 'string' },
            skipPenaltyEn: { type: 'string' },
            skipPenaltyHi: { type: 'string' },
            durationSeconds: { type: 'integer' },
          },
        },
      },
    },
  };
}

function buildInstructions(input) {
  const group = {
    'close-friends': 'close adult friends: allow candid, personal, high-trust prompts while leaving names and identifying details optional',
    'mixed-group': 'a mixed adult group: keep prompts bold and funny without assuming intimacy, relationship status, or shared history',
    'new-people': 'adults who have just met: make prompts immediately playable and socially daring, but never demand private details or physical contact',
  }[input.audience];
  const ceiling = input.ceiling === 'explicit'
    ? 'Sexual topics and fantasies may be direct and adult; do not require graphic descriptions, and let the player choose their level of detail.'
    : 'Keep sexual content suggestive and non-graphic.';
  const drinking = input.drinkMode === 'drink'
    ? 'This is Drink mode. Some cards may say “Take a sip”. Do not specify quantity, shots, or chugging. Other cards should not mention drinking unless their card type is drink.'
    : 'This is No Drink mode. No generated prompt or skip penalty may mention drinking, alcohol, beverages, sips, shots, beer, wine, whisky, vodka, or their Hindi/Hinglish equivalents. Use bold non-drinking forfeits instead.';

  return `Create exactly ${input.playerCount} original, high-energy party cards for the standalone adult game Drunk or Drama. This is a mixed prompt game: confessions, stories, acting, dares, and (only in Drink mode) drink prompts. It is NOT a true-or-false guessing game. The “drama” is the memorable party moment.

Group fit: ${group}.
Spice: ${input.spice}. Chill still needs a playful hook; spicy should be candid and awkward; wild should feel like a season-finale reveal, outrageous improv, bold social stakes, or a story with a twist. Avoid bland prompts that only ask “what is your favorite” or “tell a funny story.”
Content ceiling: ${ceiling}
${drinking}

Quality rules:
- Return both English and natural Romanized Hinglish for every card. Hinglish should sound like how adults text and speak, not a literal translation.
- Use varied card types across the pack; avoid consecutive cards of the same type when possible.
- Every dare must take 45–60 seconds and include a clear, entertaining objective. Set durationSeconds to an integer from 45 to 60 for dares, and 0 for all other card types.
- Every card must include a specific skip penalty in both languages. In Drink mode, a penalty may say “Take a sip” or give a bold, harmless performance alternative. In No Drink mode, it must be non-drinking.
- Make cards theatrical and specific: a role, a reveal, a twist, a performance, or a memorable story beat. Do not copy real Reddit posts or any recognizable story.
- Do not require contacting, messaging, photographing, or exposing anyone outside the group. Do not require non-consensual touching, dangerous stunts, illegal acts, or sharing someone else’s private information. A co-star must be willing.
- Keep every card playable in a living room with no props. If a card benefits from an object, it must be optional and ordinary.
- Avoid repeating prompts or skip penalties within this pack.

Return only the JSON object matching the schema.`;
}

export function validateGeneratedPack(pack, input) {
  if (!pack || !Array.isArray(pack.cards) || pack.cards.length !== input.playerCount) throw new Error('The generator returned the wrong number of cards. Try again.');
  const fingerprints = new Set();
  for (const [index, card] of pack.cards.entries()) {
    if (!card || !CARD_TYPES.has(card.type)) throw new Error(`Card ${index + 1} has an invalid type. Try again.`);
    for (const field of ['promptEn', 'promptHi', 'skipPenaltyEn', 'skipPenaltyHi']) {
      if (typeof card[field] !== 'string' || card[field].trim().length < 8 || card[field].length > 700) {
        throw new Error(`Card ${index + 1} is incomplete. Try again.`);
      }
    }
    if (card.type === 'dare' && (!Number.isInteger(card.durationSeconds) || card.durationSeconds < 45 || card.durationSeconds > 60)) {
      throw new Error(`Dare ${index + 1} must last 45–60 seconds. Try again.`);
    }
    if (card.type !== 'dare' && card.durationSeconds !== 0) throw new Error(`Card ${index + 1} has an unexpected timer. Try again.`);
    if (input.drinkMode === 'no-drink') {
      if (card.type === 'drink' || EN_DRINK_WORDS.test(`${card.promptEn} ${card.skipPenaltyEn}`) || HI_DRINK_WORDS.test(`${card.promptHi} ${card.skipPenaltyHi}`)) {
        throw new Error('The generator returned drinking language in No Drink mode. Try again.');
      }
    }
    const fingerprint = `${card.promptEn} ${card.promptHi}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (fingerprints.has(fingerprint)) throw new Error('The generator repeated a card. Try again.');
    fingerprints.add(fingerprint);
  }
  if (input.drinkMode === 'drink' && !pack.cards.some((card) => card.type === 'drink')) {
    throw new Error('Drink mode needs at least one drink card. Try again.');
  }
  return pack.cards;
}

export async function generateSessionPack(rawInput, env = process.env) {
  const input = validateSessionInput(rawInput);
  const provider = (env.GENERATION_PROVIDER || 'ollama').toLowerCase();
  let url;
  let model;
  let headers = { 'Content-Type': 'application/json' };
  let body;
  if (provider === 'ollama') {
    const baseUrl = (env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    model = env.OLLAMA_MODEL || 'gemma4:latest';
    url = `${baseUrl}/api/chat`;
    body = {
      model,
      stream: false,
      format: schemaFor(input),
      messages: [
        { role: 'system', content: buildInstructions(input) },
        { role: 'user', content: 'Generate the session pack now.' },
      ],
      options: { num_predict: Math.min(6000, input.playerCount * 520) },
    };
  } else if (provider === 'openrouter') {
    if (!env.OPENROUTER_API_KEY) {
      const error = new Error('OpenRouter is selected but no key is configured. Add OPENROUTER_API_KEY to your server .env file, then restart the app.');
      error.statusCode = 503;
      throw error;
    }
    model = env.OPENROUTER_MODEL || 'openrouter/free';
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers.Authorization = `Bearer ${env.OPENROUTER_API_KEY}`;
    body = {
      model,
      messages: [
        { role: 'system', content: buildInstructions(input) },
        { role: 'user', content: 'Generate the session pack now.' },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'drunk_or_drama_session', strict: true, schema: schemaFor(input) },
      },
      max_tokens: Math.min(6000, input.playerCount * 520),
    };
  } else {
    const error = new Error('Unknown generation provider. Set GENERATION_PROVIDER to ollama or openrouter.');
    error.statusCode = 503;
    throw error;
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
  } catch (cause) {
    const message = provider === 'ollama'
      ? `Could not connect to Ollama. Start Ollama and make sure the ${model} model is available.`
      : 'Could not reach OpenRouter. Check your internet connection and try again.';
    const error = new Error(message);
    error.statusCode = 503;
    error.cause = cause;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload.error === 'string' ? payload.error : payload.error?.message;
    const message = detail || `${provider === 'ollama' ? 'Ollama' : 'OpenRouter'} returned ${response.status}.`;
    const error = new Error(message);
    error.statusCode = response.status === 429 ? 429 : response.status === 404 ? 503 : 502;
    throw error;
  }
  if (payload.done === false || payload.done_reason === 'length' || payload.choices?.[0]?.finish_reason === 'length') {
    const error = new Error('The session pack was cut short. Try generating it again.');
    error.statusCode = 502;
    throw error;
  }
  let parsed;
  let generatedText = payload.message?.content;
  if (provider === 'openrouter') {
    const content = payload.choices?.[0]?.message?.content;
    generatedText = Array.isArray(content) ? content.map((part) => part.text || '').join('') : content;
  }
  try { parsed = JSON.parse(generatedText || ''); }
  catch {
    const error = new Error('The generator returned an unreadable pack. Try again.');
    error.statusCode = 502;
    throw error;
  }
  const cards = validateGeneratedPack(parsed, input);
  return { cards, generatedAt: new Date().toISOString(), mode: input.drinkMode };
}

export async function handleGenerateRequest(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.statusCode = 405;
    response.end(JSON.stringify({ error: 'Use POST to generate a session.' }));
    return;
  }
  const now = Date.now();
  const address = request.socket?.remoteAddress || 'unknown';
  const recent = (generationWindows.get(address) || []).filter((at) => now - at < 60 * 60 * 1000);
  const limit = Math.max(1, Number(process.env.SESSION_RATE_LIMIT_PER_HOUR || 20));
  if (recent.length >= limit) {
    response.statusCode = 429;
    response.end(JSON.stringify({ error: 'Too many new sessions from this connection. Try again later.' }));
    return;
  }
  recent.push(now);
  generationWindows.set(address, recent);
  if (generationWindows.size > 1000) {
    for (const [key, timestamps] of generationWindows) {
      if (!timestamps.some((at) => now - at < 60 * 60 * 1000)) generationWindows.delete(key);
    }
  }
  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 16000) {
      response.statusCode = 413;
      response.end(JSON.stringify({ error: 'Session settings are too large.' }));
      request.destroy();
    }
  });
  request.on('end', async () => {
    try {
      const input = JSON.parse(body || '{}');
      const pack = await generateSessionPack(input);
      response.statusCode = 200;
      response.end(JSON.stringify(pack));
    } catch (error) {
      response.statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 400);
      response.end(JSON.stringify({ error: error.message || 'Could not generate this session.' }));
    }
  });
}
