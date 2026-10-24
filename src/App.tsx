import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Audience, Ceiling, DrinkMode, Language, SavedSession, SessionCard, SessionPack, SessionSettings, Spice } from './types';
import Stepper, { Step } from './Stepper.jsx';
import InfiniteMenu from './InfiniteMenu.jsx';
import ConfirmDialog from './ConfirmDialog';
import NeverHaveIEver from './NeverHaveIEver';
import AdditionalGames, { type AdditionalGameId } from './AdditionalGames';
import BackToGamesButton from './BackToGamesButton';
import { playCelebration } from './sounds';

const STORAGE_KEY = 'drunk-or-drama-session-v1';
const AGE_KEY = 'drunk-or-drama-adult-confirmed';
const GAME_PICKER_TUTORIAL_KEY = 'after-hours-game-picker-tutorial-seen-v1';

function readStorage(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* The game remains playable without persistence. */ }
}

function removeStorage(key: string) {
  try { window.localStorage.removeItem(key); } catch { /* The game remains playable without persistence. */ }
}

const audiences: { id: Audience; title: string }[] = [
  { id: 'close-friends', title: 'Close friends' },
  { id: 'mixed-group', title: 'Mixed group' },
  { id: 'new-people', title: 'New people' },
];
const spices: { id: Spice; title: string; description: string }[] = [
  { id: 'chill', title: 'Chill', description: 'Light and playful' },
  { id: 'spicy', title: 'Spicy', description: 'Bolder and personal' },
  { id: 'wild', title: 'Wild', description: 'Chaotic and daring' },
];
const typeCopy: Record<SessionCard['type'], { en: string; hi: string; icon: string }> = {
  confession: { en: 'Confession', hi: 'Confession', icon: '◉' },
  story: { en: 'Story time', hi: 'Story time', icon: '▤' },
  act: { en: 'Act it out', hi: 'Act it out', icon: '✺' },
  dare: { en: 'Dare', hi: 'Dare', icon: '↗' },
  drink: { en: 'Take a sip', hi: 'Sip lo', icon: '◌' },
  'group-challenge': { en: 'Group challenge', hi: 'Group challenge', icon: '⌁' },
};

function readSavedSession(): SavedSession | null {
  try {
    const raw = readStorage(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSession;
    const settings = parsed?.settings;
    const cards = parsed?.pack?.cards;
    if (!settings || !Array.isArray(cards) || cards.length < 2) return null;
    if (!['playing', 'vote', 'result'].includes(parsed.screen)) return null;
    if (!['close-friends', 'mixed-group', 'new-people'].includes(settings.audience)) return null;
    if (!['chill', 'spicy', 'wild'].includes(settings.spice)) return null;
    if (!['drink', 'no-drink'].includes(settings.drinkMode) || !['suggestive', 'explicit'].includes(settings.ceiling)) return null;
    if (!Number.isInteger(settings.playerCount) || settings.playerCount < 2 || settings.playerCount > 12) return null;
    const turnsPerPlayer = settings.turnsPerPlayer ?? 1;
    if (![1, 2, 3].includes(turnsPerPlayer) || cards.length !== settings.playerCount * turnsPerPlayer) return null;
    if (parsed.pack.mode && parsed.pack.mode !== settings.drinkMode) return null;
    if (!['en', 'hi'].includes(parsed.language)) return null;
    if (!Number.isInteger(parsed.turn) || parsed.turn < 0 || parsed.turn >= cards.length) return null;
    if (parsed.screen !== 'playing' && parsed.turn !== cards.length - 1) return null;
    if (!Array.isArray(settings.playerNames) || (settings.playerNames.length !== 0 && settings.playerNames.length !== settings.playerCount)) return null;
    if (settings.playerNames.some((name) => typeof name !== 'string' || name.length > 24)) return null;
    if (![parsed.completed, parsed.skipped].every((flags) => Array.isArray(flags) && flags.length === cards.length && flags.every((flag) => typeof flag === 'boolean'))) return null;
    if (parsed.favoriteIndex !== null && (!Number.isInteger(parsed.favoriteIndex) || parsed.favoriteIndex < 0 || parsed.favoriteIndex >= cards.length)) return null;
    if (parsed.screen === 'result' && parsed.favoriteIndex === null) return null;
    const validTypes = ['confession', 'story', 'act', 'dare', 'drink', 'group-challenge'];
    if (!cards.every((card) => card && validTypes.includes(card.type)
      && (['promptEn', 'promptHi', 'skipPenaltyEn', 'skipPenaltyHi'] as const).every((field) => typeof card[field] === 'string' && card[field].trim())
      && (card.type === 'dare' ? Number.isInteger(card.durationSeconds) && card.durationSeconds >= 45 && card.durationSeconds <= 60 : card.durationSeconds === 0))) return null;
    return { ...parsed, settings: { ...settings, turnsPerPlayer } };
  } catch {
    return null;
  }
}

function playerLabel(session: SavedSession, index: number): string {
  const playerIndex = index % session.settings.playerCount;
  return session.settings.playerNames[playerIndex] || `Player ${playerIndex + 1}`;
}

function App() {
  const [session, setSession] = useState<SavedSession | null>(readSavedSession);
  const [ageConfirmed, setAgeConfirmed] = useState(() => readStorage(AGE_KEY) === 'yes');
  const [settings, setSettings] = useState<SessionSettings>({
    audience: 'close-friends', spice: 'wild', drinkMode: 'drink', ceiling: 'suggestive', playerCount: 5, turnsPerPlayer: 1, playerNames: [],
  });
  const [nameText, setNameText] = useState('');
  const [language, setLanguage] = useState<Language>(() => session?.language || 'en');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [selectedFavorite, setSelectedFavorite] = useState<number | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [selectedGame, setSelectedGame] = useState<'drunk-or-drama' | 'never-have-i-ever' | AdditionalGameId | null>(null);
  const sessionRef = useRef(session);
  const selectedGameRef = useRef(selectedGame);
  const gameBackActionRef = useRef<(() => void) | null>(null);
  sessionRef.current = session;
  selectedGameRef.current = selectedGame;
  const registerGameBackAction = useCallback((action: (() => void) | null) => {
    gameBackActionRef.current = action;
  }, []);

  useEffect(() => {
    window.history.replaceState({ app: 'after-hours', screen: 'home' }, '');
    if (sessionRef.current) window.history.pushState({ app: 'after-hours', screen: 'game', game: 'drunk-or-drama' }, '');
    const handlePopState = (event: PopStateEvent) => {
      const backEvent = new Event('after-hours:browser-back', { cancelable: true });
      window.dispatchEvent(backEvent);

      const activeSession = sessionRef.current;
      const currentGame = selectedGameRef.current;
      if (backEvent.defaultPrevented || activeSession) {
        if (activeSession) setConfirmExit(true);
        const game = currentGame || (activeSession ? 'drunk-or-drama' : null);
        if (game) window.history.pushState({ app: 'after-hours', screen: 'game', game }, '');
        return;
      }

      const target = event.state as { app?: string; screen?: string; game?: GameSelection } | null;
      setSelectedGame(target?.app === 'after-hours' && target.screen === 'game' ? target.game ?? null : null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (session) writeStorage(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const parsedNames = useMemo(() => nameText.split('\n').map((name) => name.trim()).filter(Boolean), [nameText]);
  const namesInvalid = parsedNames.length > 0 && parsedNames.length !== settings.playerCount;

  function updateSetting<K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) {
    setSettings((old) => ({ ...old, [key]: value }));
    setGenerationError('');
  }

  async function startSession() {
    if (namesInvalid) {
      setGenerationError(`Add exactly ${settings.playerCount} names, or clear the names field.`);
      return;
    }
    setGenerating(true);
    setGenerationError('');
    const input = { ...settings, playerNames: parsedNames };
    try {
      const generationInput = { ...input, playerNames: [] };
      const response = await fetch('/api/generate-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(generationInput),
      });
      const payload = await response.json().catch(() => ({})) as SessionPack & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'The card generator could not prepare this session.');
      const totalTurns = settings.playerCount * settings.turnsPerPlayer;
      if (!Array.isArray(payload.cards) || payload.cards.length !== totalTurns) throw new Error('The generator returned an incomplete session. Try again.');
      const next: SavedSession = {
        settings: input, pack: payload, turn: 0, language, completed: Array(totalTurns).fill(false),
        skipped: Array(totalTurns).fill(false), favoriteIndex: null, screen: 'playing',
      };
      setSession(next);
      setSelectedFavorite(null);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'The session could not be generated. Check the connection and try again.');
    } finally {
      setGenerating(false);
    }
  }

  function setSessionLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setSession((old) => old ? { ...old, language: nextLanguage } : old);
  }

  function markSkipped() {
    if (!session) return;
    setSession({ ...session, skipped: session.skipped.map((value, index) => index === session.turn ? true : value) });
  }

  function finishTurn() {
    if (!session) return;
    const completed = session.completed.map((value, index) => index === session.turn ? true : value);
    const lastTurn = session.turn >= session.pack.cards.length - 1;
    setSession({ ...session, completed, screen: lastTurn ? 'vote' : 'playing', turn: lastTurn ? session.turn : session.turn + 1 });
  }

  function revealFavorite() {
    if (!session || selectedFavorite === null) return;
    playCelebration();
    setSession({ ...session, favoriteIndex: selectedFavorite, screen: 'result' });
  }

  function newSession() {
    removeStorage(STORAGE_KEY);
    setSession(null);
    setSelectedGame(null);
    setGenerationError('');
    setSelectedFavorite(null);
    window.history.replaceState({ app: 'after-hours', screen: 'home' }, '');
  }

  function openGame(game: GameSelection) {
    window.history.pushState({ app: 'after-hours', screen: 'game', game }, '');
    setSelectedGame(game);
  }

  function goToGameLibrary() {
    if (session) {
      setConfirmExit(true);
      return;
    }
    setSelectedGame(null);
    window.history.replaceState({ app: 'after-hours', screen: 'home' }, '');
  }

  function handleTopbarBack() {
    if (session || selectedGame === 'drunk-or-drama') {
      goToGameLibrary();
      return;
    }
    gameBackActionRef.current?.();
  }

  function confirmAge() {
    writeStorage(AGE_KEY, 'yes');
    setAgeConfirmed(true);
  }

  if (!ageConfirmed) {
    return <AgeGate onConfirm={confirmAge} />;
  }

  const themeClass = session || selectedGame === 'drunk-or-drama'
    ? 'dod-theme'
    : selectedGame === 'never-have-i-ever' ? 'nhie-theme'
      : selectedGame === 'bollywood-charades' ? 'bollywood-theme'
        : selectedGame === 'truth-or-dare' ? 'truth-dare-theme'
          : selectedGame === 'most-likely' ? 'most-likely-theme' : 'home-theme';

  return (
    <main className={`app-shell ${themeClass}`}>
      <header className={`topbar ${session || selectedGame !== null ? 'topbar-game' : ''}`}>
        {(session || selectedGame !== null) ? <BackToGamesButton onClick={handleTopbarBack} /> : <span className="topbar-back-placeholder" aria-hidden="true" />}
        <button className="brand" aria-label="After Hours games" onClick={handleTopbarBack} disabled={Boolean(session)}>
          <span className="brand-name">After Hours</span>
        </button>
        <div className="topbar-actions">
          {(session || selectedGame !== null) && <button className="topbar-language" aria-label={`Language: ${language === 'en' ? 'English' : 'Hinglish'}. Switch language`} onClick={() => setSessionLanguage(language === 'en' ? 'hi' : 'en')}>
            <svg className="topbar-language-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
            <span className="topbar-button-label">{language === 'en' ? 'HINGLISH' : 'ENGLISH'}</span>
          </button>}
        </div>
      </header>

      {!session && selectedGame === null && <GameLibrary onSelect={openGame} />}

      {!session && selectedGame === 'drunk-or-drama' && <SetupScreen
        settings={settings} updateSetting={updateSetting} nameText={nameText} setNameText={setNameText}
        parsedNames={parsedNames} namesInvalid={namesInvalid} generationError={generationError}
        generating={generating} startSession={startSession} language={language} setLanguage={setSessionLanguage}
      />}

      {!session && selectedGame === 'never-have-i-ever' && <NeverHaveIEver onBack={goToGameLibrary} language={language} setLanguage={setSessionLanguage} registerBackAction={registerGameBackAction} />}
      {!session && selectedGame && selectedGame !== 'drunk-or-drama' && selectedGame !== 'never-have-i-ever' && <AdditionalGames game={selectedGame} onBack={goToGameLibrary} language={language} setLanguage={setSessionLanguage} registerBackAction={registerGameBackAction} />}

      {session?.screen === 'playing' && <PlayScreen
        session={session} language={language} markSkipped={markSkipped} finishTurn={finishTurn}
      />}
      {session?.screen === 'vote' && <VoteScreen
        session={session} language={language} selected={selectedFavorite}
        setSelected={setSelectedFavorite} onReveal={revealFavorite}
      />}
      {session?.screen === 'result' && <ResultScreen session={session} language={language} onAgain={newSession} />}
      {feedbackOpen && <FeedbackDialog onClose={() => setFeedbackOpen(false)} />}
      {confirmExit && <ConfirmDialog
        title="Leave this game?"
        message="Your current session will end and its progress will be lost."
        confirmLabel="Leave game"
        cancelLabel="Keep playing"
        onCancel={() => setConfirmExit(false)}
        onConfirm={() => { setConfirmExit(false); newSession(); }}
      />}
    </main>
  );
}

type GameSelection = 'drunk-or-drama' | 'never-have-i-ever' | AdditionalGameId;

type GameMenuItem = {
  id: GameSelection;
  image: string;
  title: string;
  description: string;
};

const GAME_MENU_ITEMS: GameMenuItem[] = [
  { id: 'truth-or-dare', image: '/game-art/truth-or-dare.svg', title: 'Truth or Dare', description: 'Answer honestly, or take a 45-second dare.' },
  { id: 'never-have-i-ever', image: '/game-art/never-have-i-ever.svg', title: 'Never Have I Ever', description: 'One statement. A room full of receipts.' },
  { id: 'bollywood-charades', image: '/game-art/bollywood-charades.svg', title: 'Bollywood Charades', description: 'Act the movie. Let the group guess.' },
  { id: 'most-likely', image: '/game-art/most-likely.svg', title: 'Who’s Most Likely To…', description: 'Vote for the friend who fits the prompt.' },
  { id: 'drunk-or-drama', image: '/game-art/drunk-or-drama.svg', title: 'Drunk or Drama', description: 'Confessions, dares, and stories worth retelling.' },
];

function GameLibrary({ onSelect }: { onSelect: (game: GameSelection) => void }) {
  const [showTutorial, setShowTutorial] = useState(() => readStorage(GAME_PICKER_TUTORIAL_KEY) !== 'yes');
  const dismissTutorial = () => {
    setShowTutorial(false);
    writeStorage(GAME_PICKER_TUTORIAL_KEY, 'yes');
  };

  return <section className="game-library-screen" aria-label="Choose a game">
    <div className="game-library-heading">
      <h1>Pick your <em>game.</em></h1>
      <p>Choose a game for your group.</p>
    </div>
    <div className="game-library-menu">
      {showTutorial && <div className="game-picker-tutorial" role="status">
        <span className="game-picker-tutorial-icon" aria-hidden="true">↔</span>
        <p><strong>Drag to browse</strong><span>When your game is centered, select it to play.</span></p>
        <button type="button" aria-label="Dismiss game browsing tip" onClick={dismissTutorial}>×</button>
      </div>}
      <InfiniteMenu
        items={GAME_MENU_ITEMS}
        count={72}
        tileSize={0.72}
        roundness={0.12}
        zoom={1.65}
        pullBack={0.8}
        stretch={0.45}
        inertia={0.6}
        autoplay={3}
        grayscale={false}
        dim={0.2}
        intro
        showInfo
        theme="dark"
        accentColor="#a9d2a0"
        onItemClick={(item) => { dismissTutorial(); onSelect(item.id as GameSelection); }}
        onUserInteract={dismissTutorial}
        renderInfo={(item, _index, moving) => <div className={`game-menu-info${moving ? ' is-moving' : ''}`}>
          <div className="game-menu-copy">
            <span className="game-menu-kicker">GAME {String(GAME_MENU_ITEMS.findIndex((entry) => entry.id === item.id) + 1).padStart(2, '0')} / 05</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <button className="game-menu-select" type="button" onClick={() => { dismissTutorial(); onSelect(item.id as GameSelection); }}>Play this game</button>
          </div>
        </div>}
      />
    </div>
  </section>;
}

function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const [declined, setDeclined] = useState(false);
  const leave = () => {
    window.close();
    setDeclined(true);
  };

  return (
    <main className="age-gate">
      <div className="age-card">
        <h1>{declined ? 'You can close this tab.' : 'Are you 18 or older?'}</h1>
        <p className="muted age-copy">{declined ? 'This experience is only for adults 18 and older.' : 'This experience is for adults 18 and older.'}</p>
        {!declined && <div className="age-actions">
          <button className="primary-button" onClick={onConfirm}>Enter</button>
          <button className="secondary-button" onClick={leave}>Leave</button>
        </div>}
      </div>
    </main>
  );
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState('idea');
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, rating, message }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not send feedback. Try again.');
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send feedback. Try again.');
    } finally {
      setSending(false);
    }
  }

  return <div className="feedback-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <button className="feedback-close" onClick={onClose} aria-label="Close feedback">×</button>
      {sent ? <div className="feedback-success">
        <span>✦</span>
        <h2 id="feedback-title">Thanks for the feedback.</h2>
        <button className="primary-button wide-button" onClick={onClose}>Done</button>
      </div> : <>
        <p className="eyebrow">HELP US MAKE IT BETTER</p>
        <h2 id="feedback-title">How was your night?</h2>
        <form onSubmit={submit}>
          <label className="feedback-label" htmlFor="feedback-category">What’s this about?</label>
          <select id="feedback-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="idea">An idea</option>
            <option value="bug">Something broke</option>
            <option value="card">A card or prompt</option>
          </select>
          <fieldset className="rating-field">
            <legend className="feedback-label">Rate the experience</legend>
            <div className="rating-options">
              {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={rating === value ? 'selected' : ''} aria-pressed={rating === value} aria-label={`${value} out of 5`} onClick={() => setRating(value)}>{value}</button>)}
            </div>
          </fieldset>
          <label className="feedback-label" htmlFor="feedback-message">Your feedback</label>
          <textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} minLength={5} required placeholder="What should we know?" rows={4} />
          <p className="feedback-privacy">No name or email needed. Please leave out private details.</p>
          {error && <p className="feedback-error" role="alert">{error}</p>}
          <button className="primary-button wide-button" type="submit" disabled={sending || message.trim().length < 5}>
            {sending ? 'Sending…' : 'Send feedback'}
          </button>
        </form>
      </>}
    </section>
  </div>;
}

type SetupProps = {
  settings: SessionSettings; updateSetting: <K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) => void;
  nameText: string; setNameText: (value: string) => void; parsedNames: string[]; namesInvalid: boolean;
  generationError: string; generating: boolean; startSession: () => void; language: Language; setLanguage: (language: Language) => void;
};

function SetupScreen(props: SetupProps) {
  const { settings, updateSetting, nameText, setNameText, namesInvalid, generationError, generating, startSession, language, setLanguage } = props;
  const [step, setStep] = useState(1);
  const nameSlots = nameText.split('\n');
  const updatePlayerName = (index: number, value: string) => {
    const nextNames = Array.from({ length: settings.playerCount }, (_, slot) => nameSlots[slot]?.trim() || '');
    nextNames[index] = value;
    setNameText(nextNames.some((name) => name.length > 0) ? nextNames.join('\n') : '');
  };
  return (
    <section className="setup-layout" id="top">
      <div className="intro-column">
        <h1 className="hero-title">Drunk <span className="hero-or">or</span><br /><em>Drama?</em></h1>
        <p className="hero-copy">After Hours</p>
      </div>

      <div className="setup-card">
        <Stepper
          step={step}
          initialStep={1}
          onStepChange={setStep}
          onFinalStepCompleted={startSession}
          indicator="bars"
          transition="slide"
          linear
          backButtonText="Back"
          nextButtonText="Continue"
          completeButtonText={generating ? 'Building your session…' : 'Start game'}
          backButtonProps={{ className: 'setup-stepper-back' }}
          nextButtonProps={{ className: 'primary-button setup-stepper-next', disabled: generating || (step === 1 && namesInvalid) }}
          theme="dark"
          accentColor="#c77b93"
          frame={false}
          radius={16}
          width="100%"
          className="settings-stepper"
        >
          <Step title="Players">
            <div className="setup-step-content">
              <h2 className="settings-step-heading">Who’s playing?</h2>
              <div className="player-count-row">
                <div><strong>{settings.playerCount}</strong><span>players</span></div>
                <div className="player-count-controls" aria-label="Player count">
                  <button aria-label="Remove a player" onClick={() => updateSetting('playerCount', Math.max(2, settings.playerCount - 1))} disabled={settings.playerCount <= 2}>−</button>
                  <button aria-label="Add a player" onClick={() => updateSetting('playerCount', Math.min(12, settings.playerCount + 1))} disabled={settings.playerCount >= 12}>+</button>
                </div>
              </div>
              <div className="player-name-grid">
                {Array.from({ length: settings.playerCount }, (_, index) => <label className="player-name-field" key={index}>
                  <span>Player {index + 1}</span>
                  <input aria-label={`Player ${index + 1} name`} autoComplete="off" value={nameSlots[index] || ''} onChange={(event) => updatePlayerName(index, event.target.value)} placeholder="Enter name" />
                </label>)}
              </div>
              {namesInvalid && <p className="field-error">Fill every name box, or leave them all blank.</p>}
            </div>
          </Step>
          <Step title="Group">
            <div className="setup-step-content">
              <h2 className="settings-step-heading">Who’s in the room?</h2>
              <div className="choice-grid audience-grid">
                {audiences.map((item) => <button key={item.id} className={`choice-tile ${settings.audience === item.id ? 'selected' : ''}`} onClick={() => updateSetting('audience', item.id)}><span className="choice-radio" /><b>{item.title}</b></button>)}
              </div>
            </div>
          </Step>
          <Step title="Energy">
            <div className="setup-step-content">
              <h2 className="settings-step-heading">Pick your energy</h2>
              <div className="choice-grid spice-grid">
                {spices.map((item) => <button key={item.id} className={`choice-tile spice-tile ${settings.spice === item.id ? 'selected' : ''}`} onClick={() => updateSetting('spice', item.id)}><b>{item.title}</b><small>{item.description}</small></button>)}
              </div>
            </div>
          </Step>
          <Step title="Rules">
            <div className="setup-step-content rules-step">
              <h2 className="settings-step-heading">Set the rules</h2>
              <div className="field-block compact-field">
                <div className="field-heading"><label>Mode</label></div>
                <div className="segmented-control">
                  <button className={settings.drinkMode === 'drink' ? 'active' : ''} onClick={() => updateSetting('drinkMode', 'drink')}>Drink</button>
                  <button className={settings.drinkMode === 'no-drink' ? 'active' : ''} onClick={() => updateSetting('drinkMode', 'no-drink')}>No Drink</button>
                </div>
              </div>
              <div className="field-block compact-field">
                <div className="field-heading"><label>Content</label></div>
                <div className="segmented-control">
                  <button className={settings.ceiling === 'suggestive' ? 'active' : ''} onClick={() => updateSetting('ceiling', 'suggestive')}>Suggestive</button>
                  <button className={settings.ceiling === 'explicit' ? 'active' : ''} onClick={() => updateSetting('ceiling', 'explicit')}>Explicit</button>
                </div>
              </div>
              <div className="field-block compact-field">
                <div className="field-heading"><label>Turns per player</label></div>
                <div className="segmented-control" aria-label="Turns per player">
                  {[1, 2, 3].map((turns) => <button key={turns} className={settings.turnsPerPlayer === turns ? 'active' : ''} aria-pressed={settings.turnsPerPlayer === turns} onClick={() => updateSetting('turnsPerPlayer', turns)}>{turns}×</button>)}
                </div>
              </div>
              <div className="field-block compact-field">
                <div className="field-heading"><label>Language</label></div>
                <div className="segmented-control">
                  <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>English</button>
                  <button className={language === 'hi' ? 'active' : ''} onClick={() => setLanguage('hi')}>Hinglish</button>
                </div>
              </div>
              {generationError && <div className="error-banner" role="alert"><span>!</span>{generationError}</div>}
            </div>
          </Step>
        </Stepper>
      </div>
    </section>
  );
}
type SessionProps = { session: SavedSession; language: Language };

function PlayScreen({ session, language, markSkipped, finishTurn }: SessionProps & { markSkipped: () => void; finishTurn: () => void }) {
  const card = session.pack.cards[session.turn];
  const label = typeCopy[card.type];
  const prompt = language === 'en' ? card.promptEn : card.promptHi;
  const penalty = language === 'en' ? card.skipPenaltyEn : card.skipPenaltyHi;
  const skipped = session.skipped[session.turn];
  return (
    <section className="game-layout">
      <div className="game-topline"><div><h1>{playerLabel(session, session.turn)}’s turn</h1></div></div>
      {session.pack.source === 'fallback' && <p className="fallback-notice" role="status">{language === 'en' ? session.pack.fallbackMessage?.en || 'Fresh cards could not load, so this session is using a ready-to-play backup deck.' : session.pack.fallbackMessage?.hi || 'Naye cards load nahi ho paaye, isliye yeh session ready-to-play backup deck use kar raha hai.'}</p>}
      <div className="progress-row"><div className="progress-track">{session.pack.cards.map((_, index) => <span key={index} className={index < session.turn ? 'complete' : index === session.turn ? 'current' : ''} />)}</div></div>
      <div className={`playing-card ${skipped ? 'penalty-card' : ''}`} key={`${session.turn}-${skipped ? 'penalty' : 'prompt'}`}>
        <div className="playing-card-edge" />
        <div className="card-meta"><span className="type-pill"><i>{label.icon}</i>{language === 'en' ? label.en : label.hi}</span><span className="card-count">Turn {session.turn + 1} of {session.pack.cards.length}</span></div>
        <div className="card-center">
          {!skipped ? <>
            <div className="card-spark">✳</div>
            <h2>{prompt}</h2>
            {card.type === 'dare' && <DareTimer seconds={card.durationSeconds} />}
          </> : <>
            <div className="card-spark penalty-spark">↗</div>
            <p className="turn-for">SKIP CONSEQUENCE</p>
            <h2>{penalty}</h2>
          </>}
        </div>
      </div>
      <div className="game-actions">
        {!skipped ? <>
          <button className="secondary-button" onClick={markSkipped}>Skip this card</button>
          <button className="primary-button" onClick={finishTurn}>Done, pass it</button>
        </> : <button className="primary-button continue-button" onClick={finishTurn}>Consequence done</button>}
      </div>
    </section>
  );
}

function VoteScreen({ session, language, selected, setSelected, onReveal }: SessionProps & { selected: number | null; setSelected: (index: number) => void; onReveal: () => void }) {
  return (
    <section className="vote-layout">
      <div className="game-topline"><div><h1>Pick the moment</h1></div></div>
      <p className="vote-instructions">Choose the moment the group will remember.</p>
      <div className="moment-grid">{session.pack.cards.map((card, index) => {
        const copy = typeCopy[card.type];
        return <button key={index} className={`moment-card ${selected === index ? 'selected' : ''}`} onClick={() => setSelected(index)}>
          <span className="moment-number">TURN {String(index + 1).padStart(2, '0')}</span><span className="moment-type">{copy.icon} {language === 'en' ? copy.en : copy.hi}</span>
          <strong>{playerLabel(session, index)}</strong><span className="moment-check">{selected === index ? '✓' : '+'}</span>
          <span className="moment-preview">{(language === 'en' ? card.promptEn : card.promptHi).slice(0, 94)}{(language === 'en' ? card.promptEn : card.promptHi).length > 94 ? '…' : ''}</span>
        </button>;
      })}</div>
      <button className="primary-button reveal-button" disabled={selected === null} onClick={onReveal}>Reveal the Drama of the Night</button>
    </section>
  );
}

function DareTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, remaining]);
  useEffect(() => { if (remaining === 0) setRunning(false); }, [remaining]);
  const minute = Math.floor(remaining / 60);
  const second = String(remaining % 60).padStart(2, '0');
  return <div className="dare-timer">
    <span className="timer-chip">◷ &nbsp;{minute}:{second} / {seconds} SEC</span>
    <button onClick={() => remaining === 0 ? (setRemaining(seconds), setRunning(true)) : setRunning((value) => !value)}>
      {remaining === 0 ? 'Run it again' : running ? 'Pause timer' : remaining === seconds ? 'Start 45–60 sec timer' : 'Resume timer'}
    </button>
  </div>;
}

function ResultScreen({ session, language, onAgain }: SessionProps & { onAgain: () => void }) {
  const winner = session.favoriteIndex ?? 0;
  const card = session.pack.cards[winner];
  return (
    <section className="result-layout">
      <div className="result-confetti" aria-hidden="true"><span>✦</span><span>✳</span><span>✦</span><span>✺</span><span>✦</span></div>
      <div className="result-top"><span className="live-pill"><span className="live-dot" /> SESSION COMPLETE</span></div>
      <h1>Drama of<br />the <em>Night.</em></h1>
      <div className="winner-card"><span className="winner-star">✦</span><strong>{playerLabel(session, winner)}</strong><p>{language === 'en' ? card.promptEn : card.promptHi}</p><span className="winner-type">{typeCopy[card.type].icon} &nbsp;{language === 'en' ? typeCopy[card.type].en : typeCopy[card.type].hi}</span></div>
      <button className="primary-button replay-button" onClick={onAgain}>Make another memory</button>
    </section>
  );
}

export default App;
