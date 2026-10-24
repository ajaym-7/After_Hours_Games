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
    assert.match(requestBody.messages[0].content, /close adult friends/);
    assert.match(requestBody.messages[0].content, /wild/);
    assert.match(requestBody.messages[0].content, /Romanized Hinglish/);
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
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(pack.cards.length, 2);
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
