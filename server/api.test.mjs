import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSessionPack, validateGeneratedPack, validateSessionInput } from './api.mjs';

const input = (overrides = {}) => ({
  audience: 'close-friends', spice: 'wild', drinkMode: 'no-drink', ceiling: 'suggestive', playerCount: 2, playerNames: [], ...overrides,
});
const card = (overrides = {}) => ({
  type: 'confession', promptEn: 'Tell the group your most chaotic excuse.', promptHi: 'Group ko apna sabse chaotic bahana sunao.',
  skipPenaltyEn: 'Give a 45-second dramatic apology.', skipPenaltyHi: '45-second ka dramatic apology do.', durationSeconds: 0, ...overrides,
});

test('accepts valid session settings and normalizes player names', () => {
  const result = validateSessionInput(input({ playerNames: [' Asha ', 'Kabir'] }));
  assert.equal(result.playerCount, 2);
  assert.deepEqual(result.playerNames, ['Asha', 'Kabir']);
});

test('rejects out-of-range player counts and partial name lists', () => {
  assert.throws(() => validateSessionInput(input({ playerCount: 1 })), /between 2 and 12/);
  assert.throws(() => validateSessionInput(input({ playerNames: ['Asha'] })), /name for every player/);
});

test('accepts a bilingual no-drink session pack', () => {
  const pack = validateGeneratedPack({ cards: [card(), card({ type: 'group-challenge', promptEn: 'Improvise a dramatic apology.', promptHi: 'Ek dramatic apology improvise karo.' })] }, input());
  assert.equal(pack.length, 2);
});

test('rejects drinking language in no-drink mode', () => {
  assert.throws(() => validateGeneratedPack({ cards: [card({ promptEn: 'Take a sip and tell the story.' }), card()] }, input()), /drinking language/);
  assert.throws(() => validateGeneratedPack({ cards: [card({ skipPenaltyHi: 'Ek sip lo aur pose do.' }), card()] }, input()), /drinking language/);
  assert.throws(() => validateGeneratedPack({ cards: [card({ promptHi: 'Ek cocktail ka dramatic review do.' }), card()] }, input()), /drinking language/);
});

test('requires dare timers between 45 and 60 seconds', () => {
  assert.throws(() => validateGeneratedPack({ cards: [card({ type: 'dare', durationSeconds: 15 }), card()] }, input()), /45–60 seconds/);
  assert.equal(validateGeneratedPack({ cards: [card({ type: 'dare', promptEn: 'Perform the dramatic reveal.', promptHi: 'Dramatic reveal perform karo.', durationSeconds: 60 }), card()] }, input()).length, 2);
});

test('requires exactly one card per player', () => {
  assert.throws(() => validateGeneratedPack({ cards: [card()] }, input()), /wrong number of cards/);
});

test('requires a drink prompt in Drink mode', () => {
  const drinkInput = input({ drinkMode: 'drink' });
  assert.throws(() => validateGeneratedPack({ cards: [card(), card({ promptEn: 'Tell a wild story.', promptHi: 'Ek wild story sunao.' })] }, drinkInput), /at least one drink card/);
});

test('generates a bilingual pack through the configured local Ollama model', async () => {
  const originalFetch = globalThis.fetch;
  const expected = { cards: [
    card({ type: 'drink', promptEn: 'Take a sip if you have ever left a date early.', promptHi: 'Agar tum kabhi date se jaldi nikle ho, ek sip lo.' }),
    card({ type: 'dare', promptEn: 'Perform the dramatic reveal for the group.', promptHi: 'Group ke liye dramatic reveal perform karo.', durationSeconds: 60 }),
  ] };
  let requestBody;
  let requestUrl;
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ message: { content: JSON.stringify(expected) }, done: true }), { status: 200 });
  };
  try {
    const pack = await generateSessionPack(input({ drinkMode: 'drink' }), { OLLAMA_BASE_URL: 'http://ollama.test:11434/', OLLAMA_MODEL: 'gemma4:latest' });
    assert.equal(pack.cards.length, 2);
    assert.equal(pack.mode, 'drink');
    assert.equal(requestUrl, 'http://ollama.test:11434/api/chat');
    assert.equal(requestBody.model, 'gemma4:latest');
    assert.equal(requestBody.format.type, 'object');
    assert.equal(requestBody.keep_alive, '15m');
    assert.ok(requestBody.options.num_ctx >= requestBody.options.num_predict);
    assert.ok(requestBody.options.num_predict < 5000);
    assert.match(requestBody.messages[0].content, /close adult friends/);
    assert.match(requestBody.messages[0].content, /wild/);
    assert.match(requestBody.messages[0].content, /Romanized Hinglish/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('repairs a Drink mode pack when the model omits every drink card', async () => {
  const originalFetch = globalThis.fetch;
  const expected = { cards: [
    card(),
    card({ type: 'story', promptEn: 'Tell the group your most chaotic story.', promptHi: 'Group ko apni sabse chaotic story sunao.' }),
  ] };
  globalThis.fetch = async () => new Response(JSON.stringify({ message: { content: JSON.stringify(expected) }, done: true }), { status: 200 });
  try {
    const pack = await generateSessionPack(input({ drinkMode: 'drink' }), { OLLAMA_BASE_URL: 'http://ollama.test:11434/' });
    assert.equal(pack.cards.length, 2);
    assert.equal(pack.cards.filter((entry) => entry.type === 'drink').length, 1);
    assert.match(pack.cards[1].promptEn, /Take a sip/);
    assert.match(pack.cards[1].promptHi, /sip lo/);
    assert.match(pack.cards[1].skipPenaltyEn, /courtroom defense/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('repairs a card mislabeled as Drink when its prompt has no sip action', async () => {
  const originalFetch = globalThis.fetch;
  const expected = { cards: [
    card({ type: 'drink', promptEn: 'Tell a story about a chaotic night.', promptHi: 'Ek chaotic night ki story sunao.' }),
    card({ type: 'story', promptEn: 'Tell the group your most chaotic story.', promptHi: 'Group ko apni sabse chaotic story sunao.' }),
  ] };
  globalThis.fetch = async () => new Response(JSON.stringify({ message: { content: JSON.stringify(expected) }, done: true }), { status: 200 });
  try {
    const pack = await generateSessionPack(input({ drinkMode: 'drink' }), { OLLAMA_BASE_URL: 'http://ollama.test:11434/' });
    assert.equal(pack.cards.filter((entry) => entry.type === 'drink').length, 1);
    const drinkCard = pack.cards.find((entry) => entry.type === 'drink');
    assert.match(drinkCard.promptEn, /sip/);
    assert.match(drinkCard.promptHi, /sip/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('repairs one incomplete generated card without discarding the rest of the pack', async () => {
  const originalFetch = globalThis.fetch;
  const expected = { cards: [
    card({ promptEn: '', skipPenaltyHi: '' }),
    card({ type: 'story', promptEn: 'Tell the group your most chaotic story.', promptHi: 'Group ko apni sabse chaotic story sunao.' }),
  ] };
  globalThis.fetch = async () => new Response(JSON.stringify({ message: { content: JSON.stringify(expected) }, done: true }), { status: 200 });
  try {
    const pack = await generateSessionPack(input(), { OLLAMA_BASE_URL: 'http://ollama.test:11434/' });
    assert.equal(pack.cards.length, 2);
    assert.equal(pack.cards[0].type, 'dare');
    assert.equal(pack.cards[0].durationSeconds, 45);
    assert.ok(pack.cards[0].promptEn.length > 8);
    assert.ok(pack.cards[0].promptHi.length > 8);
    assert.ok(pack.cards[0].skipPenaltyEn.length > 8);
    assert.ok(pack.cards[0].skipPenaltyHi.length > 8);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('repairs a repeated card in-place to keep every turn distinct', async () => {
  const originalFetch = globalThis.fetch;
  const repeated = card();
  globalThis.fetch = async () => new Response(JSON.stringify({ message: { content: JSON.stringify({ cards: [repeated, repeated] }) }, done: true }), { status: 200 });
  try {
    const pack = await generateSessionPack(input(), { OLLAMA_BASE_URL: 'http://ollama.test:11434/' });
    assert.notEqual(pack.cards[0].promptEn, pack.cards[1].promptEn);
    assert.equal(pack.cards.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('retries when too much of a pack is malformed, then accepts the repaired response', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    const cards = calls === 1
      ? [card({ promptEn: '' }), card({ promptHi: '' })]
      : [card(), card({ type: 'story', promptEn: 'Tell your most chaotic story.', promptHi: 'Apni sabse chaotic story sunao.' })];
    return new Response(JSON.stringify({ message: { content: JSON.stringify({ cards }) }, done: true }), { status: 200 });
  };
  try {
    const pack = await generateSessionPack(input(), { OLLAMA_BASE_URL: 'http://ollama.test:11434/' });
    assert.equal(calls, 2);
    assert.equal(pack.cards.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('generates the maximum 36-turn session and still guarantees a Drink card', async () => {
  const originalFetch = globalThis.fetch;
  const cards = Array.from({ length: 36 }, (_, index) => card({
    promptEn: `Tell the group story number ${index + 1} and its surprising ending.`,
    promptHi: `Group ko story number ${index + 1} aur uska surprising ending sunao.`,
  }));
  globalThis.fetch = async (_url, options) => {
    const requestBody = JSON.parse(options.body);
    assert.match(requestBody.messages[0].content, /exactly 36 original/);
    return new Response(JSON.stringify({ message: { content: JSON.stringify({ cards }) }, done: true }), { status: 200 });
  };
  try {
    const pack = await generateSessionPack(input({ playerCount: 12, turnsPerPlayer: 3, drinkMode: 'drink' }), { OLLAMA_BASE_URL: 'http://ollama.test:11434/' });
    assert.equal(pack.cards.length, 36);
    assert.equal(pack.cards.filter((entry) => entry.type === 'drink').length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses local Ollama defaults without requiring an API key', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  globalThis.fetch = async (url) => {
    requestUrl = url;
    return new Response(JSON.stringify({ message: { content: JSON.stringify({ cards: [card(), card({ type: 'story', promptEn: 'Tell your most chaotic story.', promptHi: 'Apni sabse chaotic story sunao.' })] }) }, done: true }), { status: 200 });
  };
  try {
    await generateSessionPack(input(), {});
    assert.equal(requestUrl, 'http://127.0.0.1:11434/api/chat');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('generates with OpenRouter using a server-side key and free-model router', async () => {
  const originalFetch = globalThis.fetch;
  const expected = { cards: [card(), card({ type: 'story', promptEn: 'Tell your most chaotic story.', promptHi: 'Apni sabse chaotic story sunao.' })] };
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(expected) }, finish_reason: 'stop' }] }), { status: 200 });
  };
  try {
    const pack = await generateSessionPack(input(), { GENERATION_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'test-key' });
    assert.equal(requestUrl, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(requestOptions.headers.Authorization, 'Bearer test-key');
    const body = JSON.parse(requestOptions.body);
    assert.equal(body.model, 'openrouter/free');
    assert.deepEqual(body.provider, { sort: 'throughput', allow_fallbacks: true });
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(pack.cards.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('coalesces identical concurrent requests into one model generation', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 15));
    return new Response(JSON.stringify({ message: { content: JSON.stringify({ cards: [card(), card({ promptEn: 'Tell your most chaotic story.', promptHi: 'Apni sabse chaotic story sunao.' })] }) }, done: true }), { status: 200 });
  };
  try {
    const settings = input();
    const [first, second] = await Promise.all([
      generateSessionPack(settings, { OLLAMA_BASE_URL: 'http://ollama.test:11434/' }),
      generateSessionPack(settings, { OLLAMA_BASE_URL: 'http://ollama.test:11434/' }),
    ]);
    assert.equal(calls, 1);
    assert.strictEqual(first, second);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requires a server-side OpenRouter key when OpenRouter is selected', async () => {
  await assert.rejects(
    generateSessionPack(input(), { GENERATION_PROVIDER: 'openrouter' }),
    (error) => error.statusCode === 503 && /OPENROUTER_API_KEY/.test(error.message),
  );
});
