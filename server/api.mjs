import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AUDIENCES = new Set(['close-friends', 'mixed-group', 'new-people']);
const SPICE_LEVELS = new Set(['chill', 'spicy', 'wild']);
const MODES = new Set(['drink', 'no-drink']);
const CEILINGS = new Set(['suggestive', 'explicit']);
const CARD_TYPES = new Set(['confession', 'story', 'act', 'dare', 'drink', 'group-challenge']);
const generationWindows = new Map();
const inFlightGenerations = new Map();
const feedbackWindows = new Map();
const feedbackFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/feedback.ndjson');
const EN_DRINK_WORDS = /\b(drink|drinking|sip|shots?|alcohol|beer|wine|whisky|whiskey|vodka|booze|cocktail|rum|gin|tequila|beverage|liquor)\b/i;
const HI_DRINK_WORDS = /\b(daaru|sharab|sharaab|sip|drink|peena|pee lo|pi lo|piyo|peeyo|gho?ont|nasha|nashe|madira|shot|beer|wine|vodka|whisky|whiskey|alcohol|booze|cocktail|rum|gin|tequila|liquor|beverage)\b/i;

function parseGeneratedJson(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (Array.isArray(value)) value = value.map((part) => typeof part === 'string' ? part : part?.text || '').join('');
  if (typeof value !== 'string') throw new Error('The generator returned no card text.');

  const text = value.replace(/^\uFEFF/, '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const candidates = [text];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.unshift(fenced[1].trim());

  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch { /* Try the next JSON representation. */ }
    const start = candidate.indexOf('{');
    if (start < 0) continue;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let index = start; index < candidate.length; index++) {
      const character = candidate[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') quoted = false;
        continue;
      }
      if (character === '"') quoted = true;
      else if (character === '{') depth++;
      else if (character === '}' && --depth === 0) {
        try { return JSON.parse(candidate.slice(start, index + 1)); } catch { break; }
      }
    }
  }
  throw new Error('The generator response was not valid JSON.');
}

function hasSipInstruction(card) {
  return /\bsip\b/i.test(card?.promptEn || '') || /\b(?:sip\s+lo|sip\s+lena|sip\s+aur)\b/i.test(card?.promptHi || '');
}

function promptFingerprint(card) {
  return `${card.promptEn} ${card.promptHi}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function fallbackCard(input, index) {
  const round = Math.floor(index / input.playerCount) + 1;
  const seat = (index % input.playerCount) + 1;
  const titleEn = ` Give it the title “Round ${round}, seat ${seat}.”`;
  const titleHi = ` Isse “Round ${round}, seat ${seat}” title do.`;
  const variants = {
    chill: [
      { type: 'story', en: 'Tell the group about a tiny plan that turned into a surprisingly chaotic story; a made-up version is welcome.', hi: 'Group ko ek chhote plan ki surprisingly chaotic story sunao; chaaho toh fictional version bana lo.' },
      { type: 'act', en: 'Give a 45-second movie-trailer voice-over for an ordinary mistake you made, building up to its ridiculous ending.', hi: 'Apni kisi ordinary mistake ka 45-second movie-trailer voice-over do aur uske ridiculous ending tak suspense banao.' },
    ],
    spicy: [
      { type: 'confession', en: 'Confess the boldest harmless excuse you have used to dodge an awkward plan, or invent one and defend it like sworn testimony.', hi: 'Kisi awkward plan se bachne ke liye apna boldest harmless bahana confess karo—or fictional bahana bana ke sworn testimony jaisa defend karo.' },
      { type: 'story', en: 'Tell the story of a confident move that went sideways, ending at the exact moment you realized it; fictional stories count.', hi: 'Ek confident move ki story sunao jo ulta pad gaya, bilkul us moment par end karo jab tumhe samajh aaya; fictional stories bhi chalengi.' },
    ],
    wild: [
      { type: 'dare', en: 'Deliver a 45-second emergency press conference about a harmless mistake; stay in character through two questions.', hi: 'Ek harmless mistake par 45-second emergency press conference do; do questions tak character mein raho.' },
      { type: 'group-challenge', en: 'With a willing co-star, act out a scandalous misunderstanding as a 45-second silent movie; let the group guess the twist.', hi: 'Ek willing co-star ke saath scandalous misunderstanding ko 45-second silent movie mein act karo; group twist guess karega.' },
    ],
  };
  const choice = variants[input.spice][index % variants[input.spice].length];
  return {
    type: choice.type,
    promptEn: `${choice.en}${titleEn}`,
    promptHi: `${choice.hi}${titleHi}`,
    skipPenaltyEn: 'Skip it and give a 30-second courtroom defense of an absurd accusation.',
    skipPenaltyHi: 'Skip karke ek absurd accusation par 30-second courtroom defense do.',
    durationSeconds: choice.type === 'dare' ? 45 : 0,
  };
}

function repairIncompleteCards(pack, input) {
  const cardCount = input.playerCount * (input.turnsPerPlayer ?? 1);
  if (!Array.isArray(pack?.cards) || pack.cards.length !== cardCount) return { cards: pack?.cards, repairedCount: 0 };

  const fingerprints = new Set();
  let repairedCount = 0;
  const cards = pack.cards.map((card, index) => {
    const fieldsComplete = card && CARD_TYPES.has(card.type)
      && ['promptEn', 'promptHi', 'skipPenaltyEn', 'skipPenaltyHi'].every((field) => typeof card[field] === 'string' && card[field].trim().length >= 8 && card[field].length <= 700)
      && (card.type === 'dare' ? Number.isInteger(card.durationSeconds) && card.durationSeconds >= 45 && card.durationSeconds <= 60 : card.durationSeconds === 0);
    const violatesMode = input.drinkMode === 'no-drink'
      ? card?.type === 'drink' || EN_DRINK_WORDS.test(`${card?.promptEn || ''} ${card?.skipPenaltyEn || ''}`) || HI_DRINK_WORDS.test(`${card?.promptHi || ''} ${card?.skipPenaltyHi || ''}`)
      : card?.type === 'drink' && !hasSipInstruction(card);
    let candidate = fieldsComplete && !violatesMode ? card : null;
    if (candidate && fingerprints.has(promptFingerprint(candidate))) candidate = null;
    if (!candidate) {
      repairedCount++;
      candidate = fallbackCard(input, index);
    }
    fingerprints.add(promptFingerprint(candidate));
    return candidate;
  });

  const repairLimit = Math.max(1, Math.ceil(cardCount * 0.25));
  if (repairedCount > repairLimit) throw new Error(`Too many incomplete cards (${repairedCount}).`);
  return { cards, repairedCount };
}

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
  const turnsPerPlayer = Number(input.turnsPerPlayer ?? 1);
  if (!Number.isInteger(turnsPerPlayer) || turnsPerPlayer < 1 || turnsPerPlayer > 3) {
    throw new Error('Choose between 1 and 3 turns per player.');
  }
  const names = Array.isArray(input.playerNames) ? input.playerNames : [];
  if (names.length && names.length !== playerCount) throw new Error('Add a name for every player, or clear the names field.');
  if (names.some((name) => typeof name !== 'string' || name.trim().length > 24)) throw new Error('Player names must be 24 characters or fewer.');
  return { ...input, playerCount, turnsPerPlayer, playerNames: names.map((name) => name.trim()) };
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
  const turnsPerPlayer = input.turnsPerPlayer ?? 1;
  const cardCount = input.playerCount * turnsPerPlayer;
  const group = {
    'close-friends': 'close adult friends: allow candid, personal, high-trust prompts while leaving names and identifying details optional',
    'mixed-group': 'a mixed adult group: keep prompts bold and funny without assuming intimacy, relationship status, or shared history',
    'new-people': 'adults who have just met: make prompts immediately playable and socially daring, but never demand private details or physical contact',
  }[input.audience];
  const ceiling = input.ceiling === 'explicit'
    ? 'Sexual topics and fantasies may be direct and adult; do not require graphic descriptions, and let the player choose their level of detail.'
    : 'Keep sexual content suggestive and non-graphic.';
  const drinking = input.drinkMode === 'drink'
    ? 'This is Drink mode. Include at least one card whose type is exactly "drink" and whose prompt clearly says “Take a sip”. Do not specify quantity, shots, or chugging. Other cards should not mention drinking unless their card type is drink.'
    : 'This is No Drink mode. No generated prompt or skip penalty may mention drinking, alcohol, beverages, sips, shots, beer, wine, whisky, vodka, or their Hindi/Hinglish equivalents. Use bold non-drinking forfeits instead.';

  return `Create exactly ${cardCount} original, high-energy party cards for the standalone adult game Drunk or Drama. There are ${input.playerCount} players and ${turnsPerPlayer} turns per player. Order cards in rounds, one card per player each round. Mix confessions, stories, acting, dares, and (only in Drink mode) drink prompts. The drama is the memorable party moment.

Group fit: ${group}.
Spice: ${input.spice}. Chill still needs a playful hook; spicy should be candid and awkward; wild should feel like a season-finale reveal, outrageous improv, bold social stakes, or a story with a twist. Avoid bland prompts that only ask “what is your favorite” or “tell a funny story.”
Content ceiling: ${ceiling}
${drinking}

Quality rules:
- Return both English and natural Romanized Hinglish for every card. Hinglish should sound like how adults text and speak, not a literal translation.
- Keep each prompt to one vivid sentence per language (25 words max each) and each skip penalty to one short sentence (12 words max each). Do not add explanations or headings inside card text.
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
  const cardCount = input.playerCount * (input.turnsPerPlayer ?? 1);
  if (!pack || !Array.isArray(pack.cards) || pack.cards.length !== cardCount) throw new Error('The generator returned the wrong number of cards. Try again.');
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
  if (input.drinkMode === 'drink' && pack.cards.some((card) => card.type === 'drink' && !hasSipInstruction(card))) {
    throw new Error('A Drink card must include a sip prompt. Try again.');
  }
  return pack.cards;
}

function guaranteeDrinkCard(cards, input) {
  if (!Array.isArray(cards) || input.drinkMode !== 'drink') return cards;
  const normalized = cards.map((card) => card?.type === 'drink' && !hasSipInstruction(card) ? { ...card, type: 'story' } : card);
  if (normalized.some((card) => card?.type === 'drink' && hasSipInstruction(card))) return normalized;

  const prompt = input.spice === 'wild'
    ? {
        en: 'Take a sip if you have ever made a confident move that instantly became a spectacular mess. Give the group a 30-second director’s cut, ending at the exact “oh no” moment; names are optional.',
        hi: 'Agar tumne kabhi confidence mein koi move kiya jo turant full mess ban gaya, ek sip lo. 30-second director’s cut sunao aur bilkul us “oh no” moment par end karo; naam batana optional hai.',
      }
    : input.spice === 'spicy'
      ? {
          en: 'Take a sip if you have ever sent a risky text and immediately regretted it. Tell the group what happened—or invent the most believable version if you want to keep your lore private.',
          hi: 'Agar kabhi risky text bhej ke turant regret hua ho, ek sip lo. Phir kya hua batao—or privacy rakhni ho toh sabse believable version bana do.',
        }
      : {
          en: 'Take a sip if you have ever acted like you had a plan while completely winging it. Tell a 30-second story about how you kept the act going.',
          hi: 'Agar tumne kabhi bina plan ke bhi aise act kiya jaise sab sorted ho, ek sip lo. 30-second story mein batao ki tumne woh act kaise chalaaya.',
        };

  const replacement = {
    type: 'drink',
    promptEn: prompt.en,
    promptHi: prompt.hi,
    skipPenaltyEn: 'Skip the sip and give a 30-second courtroom defense of your most harmless chaotic decision.',
    skipPenaltyHi: 'Sip skip karke apne kisi harmless chaotic decision ki 30-second courtroom defense do.',
    durationSeconds: 0,
  };
  return [...normalized.slice(0, -1), replacement];
}

export function generateSessionPack(rawInput, env = process.env) {
  const input = validateSessionInput(rawInput);
  const provider = (env.GENERATION_PROVIDER || 'ollama').toLowerCase();
  const model = provider === 'openrouter' ? (env.OPENROUTER_MODEL || 'openrouter/free') : (env.OLLAMA_MODEL || 'gemma4:latest');
  const route = provider === 'ollama'
    ? [env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434', env.OLLAMA_KEEP_ALIVE || '15m']
    : [env.OPENROUTER_PROVIDER_SORT || (model === 'openrouter/free' ? 'throughput' : '')];
  const key = JSON.stringify([provider, model, route, input.audience, input.spice, input.drinkMode, input.ceiling, input.playerCount, input.turnsPerPlayer]);
  const current = inFlightGenerations.get(key);
  if (current) return current;

  const task = generateValidatedPack(input, env, provider, model);
  inFlightGenerations.set(key, task);
  void task.finally(() => {
    if (inFlightGenerations.get(key) === task) inFlightGenerations.delete(key);
  }).catch(() => {});
  return task;
}

async function generateValidatedPack(input, env, provider, model) {
  const cardCount = input.playerCount * input.turnsPerPlayer;
  const maxOutputTokens = provider === 'openrouter' ? 8000 : 16000;
  const outputBudget = Math.min(maxOutputTokens, Math.max(2048, cardCount * (provider === 'openrouter' ? 256 : 300) + 1024));
  let url;
  let headers = { 'Content-Type': 'application/json' };
  let body;
  if (provider === 'ollama') {
    const baseUrl = (env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    url = `${baseUrl}/api/chat`;
    const estimatedPromptTokens = Math.ceil(buildInstructions(input).length / 3.5);
    const requestedContext = outputBudget + estimatedPromptTokens + 512;
    const contextSize = Math.min(32768, Math.max(4096, 2 ** Math.ceil(Math.log2(requestedContext))));
    body = {
      model,
      stream: false,
      keep_alive: env.OLLAMA_KEEP_ALIVE || '15m',
      format: schemaFor(input),
      messages: [
        { role: 'system', content: buildInstructions(input) },
        { role: 'user', content: 'Generate the session pack now.' },
      ],
      options: { num_predict: outputBudget, num_ctx: contextSize },
    };
  } else if (provider === 'openrouter') {
    if (!env.OPENROUTER_API_KEY) {
      const error = new Error('OpenRouter is selected but no key is configured. Add OPENROUTER_API_KEY to your server .env file, then restart the app.');
      error.statusCode = 503;
      throw error;
    }
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
      max_tokens: outputBudget,
    };
    const providerSort = env.OPENROUTER_PROVIDER_SORT || (model === 'openrouter/free' ? 'throughput' : '');
    if (providerSort) body.provider = { sort: providerSort, allow_fallbacks: true };
  } else {
    const error = new Error('Unknown generation provider. Set GENERATION_PROVIDER to ollama or openrouter.');
    error.statusCode = 503;
    throw error;
  }

  const requestGeneration = async () => {
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
    return { response, payload: await response.json().catch(() => ({})) };
  };

  const wasCutShort = (result) => result.done === false || result.done_reason === 'length' || result.choices?.[0]?.finish_reason === 'length';
  let lastError;
  const startedAt = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    const { response, payload } = await requestGeneration();
    if (!response.ok) {
      const detail = typeof payload.error === 'string' ? payload.error : payload.error?.message;
      const error = new Error(detail || `${provider === 'ollama' ? 'Ollama' : 'OpenRouter'} returned ${response.status}.`);
      error.statusCode = response.status === 429 ? 429 : response.status === 404 ? 503 : 502;
      throw error;
    }

    try {
      if (wasCutShort(payload)) throw new Error('The card pack was cut short.');
      const generatedText = provider === 'openrouter'
        ? payload.choices?.[0]?.message?.content
        : payload.message?.content;
      const parsed = parseGeneratedJson(generatedText);
      const repaired = repairIncompleteCards(parsed, input);
      const cards = validateGeneratedPack({ ...parsed, cards: guaranteeDrinkCard(repaired.cards, input) }, input);
      const elapsedMs = Date.now() - startedAt;
      const stats = provider === 'ollama'
        ? { modelLoadMs: Math.round((payload.load_duration || 0) / 1e6), outputTokens: payload.eval_count || null }
        : { inputTokens: payload.usage?.prompt_tokens ?? null, outputTokens: payload.usage?.completion_tokens ?? null };
      console.info('[session-generation]', JSON.stringify({ provider, model, cardCount: cards.length, repairedCards: repaired.repairedCount, elapsedMs, ...stats }));
      return { cards, generatedAt: new Date().toISOString(), mode: input.drinkMode };
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        const retryBudget = Math.min(maxOutputTokens, Math.max(outputBudget + 1024, outputBudget * 2));
        if (provider === 'ollama') body.options.num_predict = retryBudget;
        else body.max_tokens = retryBudget;
        body.messages[1].content = `Regenerate the complete session. Make every card complete, concise, bilingual, and unique. Previous attempt failed validation: ${lastError.message}. Return only one valid JSON object matching the schema; no markdown or commentary.`;
      }
    }
  }

  const error = new Error(`Could not build a valid session pack: ${lastError?.message || 'the response was incomplete'}`);
  error.statusCode = 502;
  throw error;
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

export async function handleFeedbackRequest(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.statusCode = 405;
    response.end(JSON.stringify({ error: 'Use POST to submit feedback.' }));
    return;
  }

  const now = Date.now();
  const address = request.socket?.remoteAddress || 'unknown';
  const recent = (feedbackWindows.get(address) || []).filter((at) => now - at < 60 * 60 * 1000);
  if (recent.length >= 5) {
    response.statusCode = 429;
    response.end(JSON.stringify({ error: 'Feedback limit reached. Try again later.' }));
    return;
  }
  recent.push(now);
  feedbackWindows.set(address, recent);

  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 6000) {
      response.statusCode = 413;
      response.end(JSON.stringify({ error: 'Feedback must be under 2,000 characters.' }));
      request.destroy();
    }
  });
  request.on('end', async () => {
    try {
      const input = JSON.parse(body || '{}');
      const categories = new Set(['idea', 'bug', 'card']);
      const category = categories.has(input.category) ? input.category : null;
      const message = typeof input.message === 'string' ? input.message.trim() : '';
      const rating = Number(input.rating);
      if (!category) throw new Error('Choose a feedback type.');
      if (message.length < 5 || message.length > 2000) throw new Error('Feedback must be 5–2,000 characters.');
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Choose a rating from 1 to 5.');

      const entry = { submittedAt: new Date().toISOString(), category, rating, message };
      await mkdir(path.dirname(feedbackFile), { recursive: true });
      await appendFile(feedbackFile, `${JSON.stringify(entry)}\n`, 'utf8');
      response.statusCode = 201;
      response.end(JSON.stringify({ ok: true }));
    } catch (error) {
      response.statusCode = error instanceof SyntaxError ? 400 : error.message?.startsWith('Feedback') || error.message?.startsWith('Choose') ? 400 : 500;
      response.end(JSON.stringify({ error: error.message || 'Could not save feedback.' }));
    }
  });
}
