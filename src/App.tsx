import { useEffect, useMemo, useState } from 'react';
import type { Audience, Ceiling, DrinkMode, Language, SavedSession, SessionCard, SessionPack, SessionSettings, Spice } from './types';

const STORAGE_KEY = 'drunk-or-drama-session-v1';
const AGE_KEY = 'drunk-or-drama-adult-confirmed';

const audiences: { id: Audience; title: string; detail: string }[] = [
  { id: 'close-friends', title: 'Close friends', detail: 'No filter, full lore' },
  { id: 'mixed-group', title: 'Mixed group', detail: 'Bold, room-reading energy' },
  { id: 'new-people', title: 'New people', detail: 'Break the ice dramatically' },
];
const spices: { id: Spice; title: string; detail: string; icon: string }[] = [
  { id: 'chill', title: 'Chill', detail: 'Funny, never flat', icon: '✳' },
  { id: 'spicy', title: 'Spicy', detail: 'A little too honest', icon: '♨' },
  { id: 'wild', title: 'Wild', detail: 'Main-character chaos', icon: '✦' },
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSession;
    if (!parsed.pack?.cards?.length || parsed.pack.cards.length !== parsed.settings.playerCount) return null;
    if (!['playing', 'vote', 'result'].includes(parsed.screen)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function playerLabel(session: SavedSession, index: number): string {
  return session.settings.playerNames[index] || `Player ${index + 1}`;
}

function App() {
  const [session, setSession] = useState<SavedSession | null>(readSavedSession);
  const [ageConfirmed, setAgeConfirmed] = useState(() => localStorage.getItem(AGE_KEY) === 'yes');
  const [settings, setSettings] = useState<SessionSettings>({
    audience: 'close-friends', spice: 'wild', drinkMode: 'drink', ceiling: 'suggestive', playerCount: 5, playerNames: [],
  });
  const [nameText, setNameText] = useState('');
  const [language, setLanguage] = useState<Language>(() => session?.language || 'en');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [selectedFavorite, setSelectedFavorite] = useState<number | null>(null);

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const parsedNames = useMemo(() => nameText.split(/[\n,]+/).map((name) => name.trim()).filter(Boolean), [nameText]);
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
      if (!Array.isArray(payload.cards) || payload.cards.length !== settings.playerCount) throw new Error('The generator returned an incomplete session. Try again.');
      const next: SavedSession = {
        settings: input, pack: payload, turn: 0, language, completed: Array(settings.playerCount).fill(false),
        skipped: Array(settings.playerCount).fill(false), favoriteIndex: null, screen: 'playing',
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
    setSession({ ...session, favoriteIndex: selectedFavorite, screen: 'result' });
  }

  function newSession() {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setGenerationError('');
    setSelectedFavorite(null);
  }

  function confirmAge() {
    localStorage.setItem(AGE_KEY, 'yes');
    setAgeConfirmed(true);
  }

  if (!ageConfirmed) {
    return <AgeGate onConfirm={confirmAge} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Drunk or Drama">
          <span className="brand-mark"><span>✦</span></span>
          <span className="brand-name">AFTER<span>HOURS</span></span>
        </div>
        <div className="topbar-right">
          <span className="adult-tag">18+ · PLAY TOGETHER</span>
        </div>
      </header>

      {!session && <SetupScreen
        settings={settings} updateSetting={updateSetting} nameText={nameText} setNameText={setNameText}
        parsedNames={parsedNames} namesInvalid={namesInvalid} generationError={generationError}
        generating={generating} startSession={startSession} language={language} setLanguage={setSessionLanguage}
      />}

      {session?.screen === 'playing' && <PlayScreen
        session={session} language={language} setLanguage={setSessionLanguage} markSkipped={markSkipped} finishTurn={finishTurn}
      />}
      {session?.screen === 'vote' && <VoteScreen
        session={session} language={language} setLanguage={setSessionLanguage} selected={selectedFavorite}
        setSelected={setSelectedFavorite} onReveal={revealFavorite}
      />}
      {session?.screen === 'result' && <ResultScreen session={session} language={language} setLanguage={setSessionLanguage} onAgain={newSession} />}
      <footer className="site-footer"><span>ONE PHONE. MANY STORIES.</span><span>MAKE IT A NIGHT.</span></footer>
    </main>
  );
}

function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  return (
    <main className="age-gate">
      <div className="age-card">
        <div className="age-symbol">18<span>+</span></div>
        <p className="eyebrow">AFTER HOURS / PRIVATE PARTY</p>
        <h1>Good stories<br />start with a <em>yes.</em></h1>
        <p className="muted age-copy">Drunk or Drama is designed for adult groups. Confirm you’re 18 or older to enter.</p>
        <button className="primary-button wide-button" onClick={onConfirm}>I’m 18 or older <span>↗</span></button>
        <p className="fine-print">No accounts. One shared screen. Your group sets the vibe.</p>
      </div>
    </main>
  );
}

type SetupProps = {
  settings: SessionSettings; updateSetting: <K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) => void;
  nameText: string; setNameText: (value: string) => void; parsedNames: string[]; namesInvalid: boolean;
  generationError: string; generating: boolean; startSession: () => void; language: Language; setLanguage: (language: Language) => void;
};

function SetupScreen(props: SetupProps) {
  const { settings, updateSetting, nameText, setNameText, namesInvalid, generationError, generating, startSession, language, setLanguage } = props;
  return (
    <section className="setup-layout" id="top">
      <div className="intro-column">
        <div className="live-pill"><span className="live-dot" /> LIVE-GENERATED PARTY GAME</div>
        <h1 className="hero-title">Drunk <span className="hero-or">or</span><br /><em>Drama?</em></h1>
        <p className="hero-copy">Confessions. Plot twists. Main-character behaviour. One card at a time, make a memory they’ll bring up forever.</p>
        <div className="hero-stats"><span><b>01</b> CARD PER PLAYER</span><i /> <span><b>∞</b> STORIES AFTER</span></div>
        <div className="sample-card-mini" aria-hidden="true">
          <div className="mini-top"><span>WILD CARD / 04</span><span>✳</span></div>
          <p>Give the most convincing<br />apology for a scandal<br />the group invents.</p>
          <div className="mini-bottom"><span>DRAMA LOADING</span><span>↗</span></div>
        </div>
      </div>

      <div className="setup-card">
        <div className="setup-card-head">
          <div><p className="eyebrow">SET THE SCENE</p><h2>Your group, your rules.</h2></div>
          <span className="setup-number">01 / 01</span>
        </div>

        <div className="field-block">
          <div className="field-heading"><span>01</span><label>Who’s playing?</label></div>
          <div className="player-count-row">
            <div><strong>{settings.playerCount}</strong><span>players</span></div>
            <div className="stepper" aria-label="Player count">
              <button aria-label="Remove a player" onClick={() => updateSetting('playerCount', Math.max(2, settings.playerCount - 1))} disabled={settings.playerCount <= 2}>−</button>
              <button aria-label="Add a player" onClick={() => updateSetting('playerCount', Math.min(12, settings.playerCount + 1))} disabled={settings.playerCount >= 12}>+</button>
            </div>
          </div>
          <label className="input-label" htmlFor="players">Names <span>OPTIONAL · ONE PER LINE</span></label>
          <textarea id="players" value={nameText} onChange={(event) => setNameText(event.target.value)} placeholder={'Asha\nKabir\nMeera\nRohan\nTara'} rows={2} />
          {namesInvalid && <p className="field-error">Add exactly {settings.playerCount} names or leave this blank.</p>}
        </div>

        <div className="field-block">
          <div className="field-heading"><span>02</span><label>Know the room</label></div>
          <div className="choice-grid audience-grid">
            {audiences.map((item) => <button key={item.id} className={`choice-tile ${settings.audience === item.id ? 'selected' : ''}`} onClick={() => updateSetting('audience', item.id)}>
              <span className="choice-radio" /><b>{item.title}</b><small>{item.detail}</small>
            </button>)}
          </div>
        </div>

        <div className="field-block">
          <div className="field-heading"><span>03</span><label>Pick your chaos</label></div>
          <div className="choice-grid spice-grid">
            {spices.map((item) => <button key={item.id} className={`choice-tile spice-tile ${settings.spice === item.id ? 'selected' : ''}`} onClick={() => updateSetting('spice', item.id)}>
              <span className="spice-icon">{item.icon}</span><b>{item.title}</b><small>{item.detail}</small>
            </button>)}
          </div>
        </div>

        <div className="two-column-fields">
          <div className="field-block compact-field">
            <div className="field-heading"><span>04</span><label>Party mode</label></div>
            <div className="segmented-control">
              <button className={settings.drinkMode === 'drink' ? 'active' : ''} onClick={() => updateSetting('drinkMode', 'drink')}>Drink</button>
              <button className={settings.drinkMode === 'no-drink' ? 'active' : ''} onClick={() => updateSetting('drinkMode', 'no-drink')}>No Drink</button>
            </div>
          </div>
          <div className="field-block compact-field">
            <div className="field-heading"><span>05</span><label>Content ceiling</label></div>
            <div className="segmented-control">
              <button className={settings.ceiling === 'suggestive' ? 'active' : ''} onClick={() => updateSetting('ceiling', 'suggestive')}>Suggestive</button>
              <button className={settings.ceiling === 'explicit' ? 'active' : ''} onClick={() => updateSetting('ceiling', 'explicit')}>Explicit</button>
            </div>
          </div>
        </div>

        <div className="setup-bottom">
          <div className="lang-control" aria-label="Card language">
            <span>CARDS IN</span><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>ENGLISH</button><button className={language === 'hi' ? 'active' : ''} onClick={() => setLanguage('hi')}>HINGLISH</button>
          </div>
          <p className="setup-note">One card per player. New cards are generated for these settings.</p>
        </div>
        {generationError && <div className="error-banner" role="alert"><span>!</span>{generationError}</div>}
        <button className="primary-button generate-button" onClick={startSession} disabled={generating || namesInvalid}>
          {generating ? <><span className="spinner" /> Building your session...</> : <>Generate session <span>↗</span></>}
        </button>
        <p className="privacy-note"><span>◈</span> New session generation needs internet. Once generated, the group can finish offline.</p>
      </div>
    </section>
  );
}

type SessionProps = { session: SavedSession; language: Language; setLanguage: (language: Language) => void };

function LanguageToggle({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) {
  return <div className="session-language" aria-label="Card language">
    <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
    <button className={language === 'hi' ? 'active' : ''} onClick={() => setLanguage('hi')}>HINGLISH</button>
  </div>;
}

function PlayScreen({ session, language, setLanguage, markSkipped, finishTurn }: SessionProps & { markSkipped: () => void; finishTurn: () => void }) {
  const card = session.pack.cards[session.turn];
  const label = typeCopy[card.type];
  const prompt = language === 'en' ? card.promptEn : card.promptHi;
  const penalty = language === 'en' ? card.skipPenaltyEn : card.skipPenaltyHi;
  const skipped = session.skipped[session.turn];
  return (
    <section className="game-layout">
      <div className="game-topline"><div><span className="eyebrow">THE FLOOR IS YOURS</span><h1>Make it <em>dramatic.</em></h1></div><LanguageToggle language={language} setLanguage={setLanguage} /></div>
      <div className="progress-row"><div className="progress-label"><span>TURN {String(session.turn + 1).padStart(2, '0')}</span><span>{String(session.pack.cards.length).padStart(2, '0')} TOTAL</span></div><div className="progress-track">{session.pack.cards.map((_, index) => <span key={index} className={index < session.turn ? 'complete' : index === session.turn ? 'current' : ''} />)}</div></div>
      <div className={`playing-card ${skipped ? 'penalty-card' : ''}`} key={`${session.turn}-${skipped ? 'penalty' : 'prompt'}`}>
        <div className="playing-card-edge" />
        <div className="card-meta"><span className="type-pill"><i>{label.icon}</i>{language === 'en' ? label.en : label.hi}</span><span className="card-count">CARD {String(session.turn + 1).padStart(2, '0')} <b>/ {String(session.pack.cards.length).padStart(2, '0')}</b></span></div>
        <div className="card-center">
          {!skipped ? <>
            <div className="card-spark">✳</div>
            <p className="turn-for">{playerLabel(session, session.turn)}’S MOMENT</p>
            <h2>{prompt}</h2>
            {card.type === 'dare' && <DareTimer seconds={card.durationSeconds} />}
          </> : <>
            <div className="card-spark penalty-spark">↗</div>
            <p className="turn-for">CARD-SPECIFIC CONSEQUENCE</p>
            <h2>{penalty}</h2>
            <p className="penalty-subtext">Do the consequence, then pass the phone.</p>
          </>}
        </div>
        <div className="card-bottom"><span>DRUNK OR DRAMA</span><span>✦</span></div>
      </div>
      <div className="game-actions">
        {!skipped ? <>
          <button className="secondary-button" onClick={markSkipped}>Skip this card <span>↗</span></button>
          <button className="primary-button" onClick={finishTurn}>Done, pass it <span>→</span></button>
        </> : <button className="primary-button continue-button" onClick={finishTurn}>Consequence done <span>→</span></button>}
      </div>
      <p className="game-hint">One turn each. No scores. The group picks the moment that becomes lore.</p>
    </section>
  );
}

function VoteScreen({ session, language, setLanguage, selected, setSelected, onReveal }: SessionProps & { selected: number | null; setSelected: (index: number) => void; onReveal: () => void }) {
  return (
    <section className="vote-layout">
      <div className="game-topline"><div><span className="eyebrow">THE FINAL VOTE</span><h1>Which moment<br />made the <em>night?</em></h1></div><LanguageToggle language={language} setLanguage={setLanguage} /></div>
      <p className="vote-instructions">Talk it out, then choose one player’s moment. This is the one everyone will bring up tomorrow.</p>
      <div className="moment-grid">{session.pack.cards.map((card, index) => {
        const copy = typeCopy[card.type];
        return <button key={index} className={`moment-card ${selected === index ? 'selected' : ''}`} onClick={() => setSelected(index)}>
          <span className="moment-number">0{index + 1}</span><span className="moment-type">{copy.icon} {language === 'en' ? copy.en : copy.hi}</span>
          <strong>{playerLabel(session, index)}</strong><span className="moment-check">{selected === index ? '✓' : '+'}</span>
          <span className="moment-preview">{(language === 'en' ? card.promptEn : card.promptHi).slice(0, 94)}{(language === 'en' ? card.promptEn : card.promptHi).length > 94 ? '…' : ''}</span>
        </button>;
      })}</div>
      <button className="primary-button reveal-button" disabled={selected === null} onClick={onReveal}>Reveal the Drama of the Night <span>↗</span></button>
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

function ResultScreen({ session, language, setLanguage, onAgain }: SessionProps & { onAgain: () => void }) {
  const winner = session.favoriteIndex ?? 0;
  const card = session.pack.cards[winner];
  return (
    <section className="result-layout">
      <div className="result-confetti" aria-hidden="true"><span>✦</span><span>✳</span><span>✦</span><span>✺</span><span>✦</span></div>
      <div className="result-top"><span className="live-pill"><span className="live-dot" /> SESSION COMPLETE</span><LanguageToggle language={language} setLanguage={setLanguage} /></div>
      <p className="eyebrow result-eyebrow">THE GROUP HAS SPOKEN</p>
      <h1>Drama of<br />the <em>Night.</em></h1>
      <div className="winner-card"><span className="winner-star">✦</span><span className="winner-label">MOST ICONIC MOMENT</span><strong>{playerLabel(session, winner)}</strong><p>{language === 'en' ? card.promptEn : card.promptHi}</p><span className="winner-type">{typeCopy[card.type].icon} &nbsp;{language === 'en' ? typeCopy[card.type].en : typeCopy[card.type].hi}</span></div>
      <button className="primary-button replay-button" onClick={onAgain}>Make another memory <span>↗</span></button>
      <p className="result-note">This session stays on this phone until you start another.</p>
    </section>
  );
}

export default App;
