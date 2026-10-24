import { useMemo, useState } from 'react';
import Stepper, { Step } from './Stepper.jsx';
import type { Audience, Ceiling, DrinkMode, Language, Spice } from './types';

type Prompt = { en: string; hi: string; spice: Spice; explicit?: boolean; personal?: boolean; intimate?: boolean };
type Settings = { audience: Audience; spice: Spice; ceiling: Ceiling; drinkMode: DrinkMode; language: Language; playerCount: number; turnsPerPlayer: number; names: string[] };

const prompts: Prompt[] = [
  { spice: 'chill', en: 'Never have I ever waved at someone who was waving to the person behind me.', hi: 'Maine kabhi kisi ko wave nahi kiya jab woh mere peeche wale ko bula raha tha.' },
  { spice: 'chill', en: 'Never have I ever opened the fridge and forgotten what I wanted.', hi: 'Maine kabhi fridge kholkar nahi bhoola ki mujhe kya chahiye tha.' },
  { spice: 'chill', en: 'Never have I ever practiced what to say, then said the wrong thing anyway.', hi: 'Maine kabhi bolne ki practice karke bhi galat baat nahi boli.' },
  { spice: 'chill', en: 'Never have I ever laughed at a joke before I understood it.', hi: 'Maine kabhi joke samajhne se pehle uspe nahi hansa.' },
  { spice: 'chill', en: 'Never have I ever sung the wrong words to a song with full confidence.', hi: 'Maine kabhi gaane ke galat words full confidence se nahi gaaye.' },
  { spice: 'chill', en: 'Never have I ever replayed my voice note and disliked how I sounded.', hi: 'Maine kabhi apna voice note sunke apni awaaz pasand nahi ki.' },
  { spice: 'chill', en: 'Never have I ever taken a screenshot to remember something, then forgotten it.', hi: 'Maine kabhi kuch yaad rakhne ke liye screenshot liya aur phir bhool gaya.' },
  { spice: 'chill', en: 'Never have I ever made an excuse to leave, then used it too soon.', hi: 'Maine kabhi jaane ka bahana banaya aur use bahut jaldi bol diya.' },
  { spice: 'chill', en: 'Never have I ever walked into the wrong room like I belonged there.', hi: 'Maine kabhi galat room mein aise entry nahi maari jaise wahi mera room ho.' },
  { spice: 'chill', en: 'Never have I ever looked for my phone while holding it.', hi: 'Maine kabhi phone haath mein lekar hi usse nahi dhoondha.' },
  { spice: 'chill', en: 'Never have I ever told a story and then realized I was the one at fault.', hi: 'Maine kabhi story sunate hue yeh realize nahi kiya ki galti meri thi.' },
  { spice: 'chill', en: 'Never have I ever said my late reply was on purpose when I had just forgotten.', hi: 'Maine kabhi reply bhoolne ke baad bola nahi ki maine jaan-boojhkar late reply kiya.' },
  { spice: 'spicy', personal: true, en: 'Never have I ever flirted to see if someone liked me back.', hi: 'Maine kabhi yeh dekhne ke liye flirt nahi kiya ki saamne wala mujhe pasand karta hai ya nahi.' },
  { spice: 'spicy', en: 'Never have I ever read a text again and again, trying to guess what it meant.', hi: 'Maine kabhi ek text baar-baar padhkar uska matlab samajhne ki koshish nahi ki.' },
  { spice: 'spicy', personal: true, en: 'Never have I ever liked someone I knew I should avoid.', hi: 'Maine kabhi aise insaan ko pasand nahi kiya jisse mujhe door rehna chahiye tha.' },
  { spice: 'spicy', personal: true, en: 'Never have I ever made an excuse to be near my crush.', hi: 'Maine kabhi apne crush ke paas jaane ke liye bahana nahi banaya.' },
  { spice: 'spicy', en: 'Never have I ever sent a risky text and then put my phone face down.', hi: 'Maine kabhi risky text bhejkar phone ulta rakhke reply ka wait nahi kiya.' },
  { spice: 'spicy', personal: true, en: 'Never have I ever looked through someone’s old posts and nearly liked one.', hi: 'Maine kabhi kisi ke purane posts dekhte hue galti se like karne wala nahi tha.' },
  { spice: 'spicy', en: 'Never have I ever checked who saw my story while acting like I did not care.', hi: 'Maine kabhi care na karne ka act karke yeh check nahi kiya ki meri story kisne dekhi.' },
  { spice: 'spicy', en: 'Never have I ever gone on a date because I thought the story would be fun to tell.', hi: 'Maine kabhi sirf ek mazedaar story ke liye date par jaane ka decision nahi liya.' },
  { spice: 'spicy', en: 'Never have I ever asked a friend to help me leave an awkward date.', hi: 'Maine kabhi awkward date se nikalne ke liye friend se help nahi maangi.' },
  { spice: 'spicy', en: 'Never have I ever thought a chat meant more than the other person did.', hi: 'Maine kabhi kisi chat ko saamne wale se zyada serious nahi samjha.' },
  { spice: 'spicy', en: 'Never have I ever planned a cool reply and then just texted “haha yeah.”', hi: 'Maine kabhi cool reply socha aur phir sirf “haha yeah” text nahi kiya.' },
  { spice: 'spicy', en: 'Never have I ever introduced two people and wished I had not.', hi: 'Maine kabhi do logon ko milwaya aur baad mein socha kaash nahi milwaya hota.' },
  { spice: 'spicy', en: 'Never have I ever started liking someone after saying it was just casual.', hi: 'Maine kabhi casual bolne ke baad kisi ko pasand karna start nahi kiya.' },
  { spice: 'wild', en: 'Never have I ever made a big exit, then come back for something I forgot.', hi: 'Maine kabhi dramatic exit karke bhooli hui cheez lene wapas nahi aaya.' },
  { spice: 'wild', en: 'Never have I ever told a small lie that needed more lies to explain it.', hi: 'Maine kabhi chhota jhooth bola jise chhupane ke liye aur jhooth nahi bolne pade.' },
  { spice: 'wild', en: 'Never have I ever made eye contact while doing something embarrassing.', hi: 'Maine kabhi embarrassing kaam karte waqt kisi se eye contact nahi kiya.' },
  { spice: 'wild', en: 'Never have I ever sent a screenshot to the person in the screenshot.', hi: 'Maine kabhi screenshot usi insaan ko nahi bheja jo usmein tha.' },
  { spice: 'wild', en: 'Never have I ever acted like an expert, then got a question I could not answer.', hi: 'Maine kabhi expert banne ka act karke aisa question nahi suna jiska jawab mujhe nahi pata tha.' },
  { spice: 'wild', en: 'Never have I ever spoiled a date, party, or trip by making a wrong guess.', hi: 'Maine kabhi galat guess karke date, party ya trip kharab nahi ki.' },
  { spice: 'wild', en: 'Never have I ever tried to explain a mix-up and made it sound worse.', hi: 'Maine kabhi confusion samjhate hue baat ko aur kharab nahi kiya.' },
  { spice: 'wild', en: 'Never have I ever kept a silly secret for so long that friends thought it was normal.', hi: 'Maine kabhi silly secret itna time nahi chhupaya ki friends ko woh normal lagne laga.' },
  { spice: 'wild', en: 'Never have I ever made a bold move, panicked, then pretended it was planned.', hi: 'Maine kabhi bold move karke panic nahi kiya aur phir bola nahi ki sab planned tha.' },
  { spice: 'wild', en: 'Never have I ever been caught in a lie by the person helping me lie.', hi: 'Maine kabhi jhooth mein usi ke saamne pakda nahi gaya jisne jhooth mein help ki thi.' },
  { spice: 'wild', en: 'Never have I ever liked someone and failed to notice that my friends already knew.', hi: 'Mujhe kabhi kisi par crush nahi hua jiska pata mere doston ko mujhse pehle chal gaya.' },
  { spice: 'wild', en: 'Never have I ever tried to clear up a group chat and made it more confusing.', hi: 'Maine kabhi group chat ko clear karne ki koshish mein aur confuse nahi kiya.' },
  { spice: 'wild', explicit: true, en: 'Never have I ever had a sexy dream about someone I know.', hi: 'Maine kabhi kisi jaan-pehchaan wale ke baare mein sexy sapna nahi dekha.' },
  { spice: 'wild', explicit: true, personal: true, en: 'Never have I ever wanted to kiss someone in this room.', hi: 'Maine kabhi is room mein kisi ko kiss karne ka mann nahi banaya.' },
  { spice: 'wild', explicit: true, personal: true, intimate: true, en: 'Never have I ever had a private fantasy I would only share with close friends.', hi: 'Maine kabhi aisi private fantasy nahi rakhi jo sirf close friends ko bataunga.' },
  { spice: 'wild', explicit: true, en: 'Never have I ever sent a flirty photo and worried about it later.', hi: 'Maine kabhi flirty photo bhejkar baad mein uski tension nahi li.' },
  { spice: 'wild', explicit: true, en: 'Never have I ever liked someone at a really bad time.', hi: 'Maine kabhi bahut galat time par kisi ko pasand nahi kiya.' },
  { spice: 'wild', explicit: true, en: 'Never have I ever kept a secret relationship from my closest friends.', hi: 'Maine kabhi apna relationship closest friends se chhupaya nahi.' },
];

const spiceRank: Record<Spice, number> = { chill: 0, spicy: 1, wild: 2 };
const shuffle = <T,>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};
const eligiblePrompts = (settings: Settings) => prompts.filter((prompt) => spiceRank[prompt.spice] <= spiceRank[settings.spice]
  && (settings.ceiling === 'explicit' || !prompt.explicit)
  && (settings.audience === 'close-friends' || (settings.audience === 'mixed-group' ? !prompt.intimate : !prompt.personal)));
const countFor = (playerCount: number, turns: number) => playerCount * turns;

export default function NeverHaveIEver({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>({ audience: 'close-friends', spice: 'wild', ceiling: 'suggestive', drinkMode: 'no-drink', language: 'en', playerCount: 5, turnsPerPlayer: 1, names: [] });
  const [stage, setStage] = useState<'setup' | 'play' | 'vote' | 'result'>('setup');
  const [step, setStep] = useState(1);
  const [deck, setDeck] = useState<Prompt[]>([]);
  const [hits, setHits] = useState<number[]>([]);
  const [turn, setTurn] = useState(0);
  const [showPenalty, setShowPenalty] = useState(false);
  const [favorite, setFavorite] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const pool = useMemo(() => eligiblePrompts(settings), [settings]);
  const maxTurns = Math.max(1, Math.min(3, Math.floor(pool.length / settings.playerCount)));
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((old) => {
    const next = { ...old, [key]: value };
    const availableTurns = Math.max(1, Math.min(3, Math.floor(eligiblePrompts(next).length / next.playerCount)));
    return { ...next, turnsPerPlayer: Math.min(next.turnsPerPlayer, availableTurns) };
  });
  const changePlayers = (count: number) => setSettings((old) => ({ ...old, playerCount: count, turnsPerPlayer: Math.min(old.turnsPerPlayer, Math.max(1, Math.min(3, Math.floor(eligiblePrompts(old).length / count)))) }));

  const start = () => {
    const cards = shuffle(pool).slice(0, countFor(settings.playerCount, settings.turnsPerPlayer));
    setDeck(cards);
    setHits(Array(cards.length).fill(0));
    setTurn(0);
    setShowPenalty(false);
    setFavorite(null);
    setLanguage(settings.language);
    setStage('play');
  };
  const reader = (index: number) => settings.names[index % settings.playerCount]?.trim() || `Player ${index % settings.playerCount + 1}`;
  const finishPrompt = () => {
    if (turn === deck.length - 1) setStage('vote');
    else { setTurn((old) => old + 1); setShowPenalty(false); }
  };
  const changeHits = (amount: number) => setHits((old) => old.map((value, index) => index === turn ? Math.max(0, Math.min(settings.playerCount, value + amount)) : value));
  const text = (prompt: Prompt) => language === 'en' ? prompt.en : prompt.hi;
  const voteCandidates = deck.map((prompt, index) => ({ prompt, index })).sort((a, b) => hits[b.index] - hits[a.index]).slice(0, 6);

  return <div className="nhie-shell">
    <div className="nhie-top"><button className="nhie-back" onClick={stage === 'setup' ? onBack : () => setStage('setup')}>← {stage === 'setup' ? 'All games' : 'Setup'}</button><span className="nhie-brand">NEVER HAVE I EVER</span><button className="nhie-lang" onClick={() => setLanguage((old) => old === 'en' ? 'hi' : 'en')}>{language === 'en' ? 'HINGLISH' : 'ENGLISH'}</button></div>
    {stage === 'setup' && <section className="nhie-setup">
      <div className="nhie-intro"><p className="eyebrow">AFTER HOURS · GAME 02</p><h1>Never have<br /><em>I ever.</em></h1><p>One statement. A room full of receipts.</p></div>
      <div className="setup-card nhie-setup-card"><Stepper step={step} initialStep={1} onStepChange={setStep} onFinalStepCompleted={start} indicator="bars" transition="slide" linear backButtonText="Back" nextButtonText="Continue" completeButtonText="Deal the cards" backButtonProps={{ className: 'setup-stepper-back' }} nextButtonProps={{ className: 'primary-button setup-stepper-next' }} theme="dark" accentColor="#83aaff" frame={false} radius={16} width="100%" className="settings-stepper">
        <Step title="Players"><div className="setup-step-content"><h2 className="settings-step-heading">Who’s playing?</h2><div className="player-count-row"><div><strong>{settings.playerCount}</strong><span>players</span></div><div className="player-count-controls"><button aria-label="Remove a player" disabled={settings.playerCount <= 2} onClick={() => changePlayers(Math.max(2, settings.playerCount - 1))}>−</button><button aria-label="Add a player" disabled={settings.playerCount >= 12} onClick={() => changePlayers(Math.min(12, settings.playerCount + 1))}>+</button></div></div><div className="player-name-grid">{Array.from({ length: settings.playerCount }, (_, index) => <label className="player-name-field" key={index}><span>Player {index + 1}</span><input maxLength={24} value={settings.names[index] || ''} placeholder="Enter name (optional)" onChange={(event) => update('names', Array.from({ length: settings.playerCount }, (_, slot) => slot === index ? event.target.value : settings.names[slot] || ''))} /></label>)}</div></div></Step>
        <Step title="Group"><div className="setup-step-content"><h2 className="settings-step-heading">Who’s in the room?</h2><p className="nhie-hint">{settings.audience === 'new-people' ? 'Keep it easy: passing is always fine, and made-up answers count.' : settings.audience === 'mixed-group' ? 'A mix of close and new friends; keep details optional.' : 'You know each other well. Share the story, or keep it mysterious.'}</p><div className="choice-grid audience-grid">{audiences().map(([id, title]) => <button key={id} className={`choice-tile ${settings.audience === id ? 'selected' : ''}`} onClick={() => update('audience', id)}><span className="choice-radio" /><b>{title}</b></button>)}</div></div></Step>
        <Step title="Energy"><div className="setup-step-content"><h2 className="settings-step-heading">Pick your energy</h2><div className="choice-grid spice-grid">{([['chill', 'Chill', 'Light and playful'], ['spicy', 'Spicy', 'Bolder and personal'], ['wild', 'Wild', 'Chaotic and daring']] as [Spice, string, string][]).map(([id, title, description]) => <button key={id} className={`choice-tile spice-tile ${settings.spice === id ? 'selected' : ''}`} onClick={() => update('spice', id)}><span className="spice-icon">✦</span><b>{title}</b><small>{description}</small></button>)}</div></div></Step>
        <Step title="Rules"><div className="setup-step-content rules-step"><h2 className="settings-step-heading">Set the rules</h2><Field label="Mode">{(['drink', 'no-drink'] as DrinkMode[]).map((value) => <button key={value} className={settings.drinkMode === value ? 'active' : ''} onClick={() => update('drinkMode', value)}>{value === 'drink' ? 'Drink' : 'No Drink'}</button>)}</Field><Field label="Content">{(['suggestive', 'explicit'] as Ceiling[]).map((value) => <button key={value} className={settings.ceiling === value ? 'active' : ''} onClick={() => update('ceiling', value)}>{value === 'suggestive' ? 'Suggestive' : 'Explicit'}</button>)}</Field><Field label="Turns per player">{[1, 2, 3].map((value) => <button key={value} className={settings.turnsPerPlayer === value ? 'active' : ''} disabled={value > maxTurns} onClick={() => update('turnsPerPlayer', value)}>{value}×</button>)}</Field><Field label="Language">{(['en', 'hi'] as Language[]).map((value) => <button key={value} className={settings.language === value ? 'active' : ''} onClick={() => update('language', value)}>{value === 'en' ? 'English' : 'Hinglish'}</button>)}</Field><p className="nhie-hint nhie-capacity">{pool.length} cards fit this vibe · up to {maxTurns} turn{maxTurns === 1 ? '' : 's'} per player</p></div></Step>
      </Stepper></div>
    </section>}
    {stage === 'play' && deck[turn] && <section className="nhie-play"><div className="game-topline"><div><p className="eyebrow">{reader(turn)} READS THIS</p><h1>Never have I ever…</h1></div><LanguageToggle language={language} setLanguage={setLanguage} /></div><div className="progress-row"><div className="progress-track">{deck.map((_, index) => <span key={index} className={index < turn ? 'complete' : index === turn ? 'current' : ''} />)}</div></div><article className={`playing-card nhie-prompt-card ${showPenalty ? 'penalty-card' : ''}`} key={`${turn}-${showPenalty}`}><div className="playing-card-edge"/><div className="card-meta"><span className="type-pill">◉ &nbsp;{showPenalty ? 'SKIP FORFEIT' : 'STATEMENT'}</span><span className="card-count">{turn + 1} / {deck.length}</span></div><div className="card-center"><div className="card-spark">{showPenalty ? '↗' : '✳'}</div><h2>{showPenalty ? language === 'en' ? 'Give the group a 30-second dramatic defense of your most harmless hot take.' : 'Apne sabse harmless hot take ka 30-second dramatic defense group ko do.' : text(deck[turn])}</h2></div></article><div className="nhie-reveal"><p>{showPenalty ? 'Skip consequence · do this, then pass the phone.' : settings.drinkMode === 'drink' ? 'If this is you, take a sip. Sharing the story is optional.' : 'If this is you, raise a finger. Sharing the story is optional.'}</p>{!showPenalty && <div className="nhie-counter"><button aria-label="One fewer has done this" onClick={() => changeHits(-1)}>−</button><strong>{hits[turn]}</strong><span>of {settings.playerCount} have</span><button aria-label="One more has done this" onClick={() => changeHits(1)}>+</button></div>}</div><div className="game-actions">{!showPenalty && <button className="secondary-button" onClick={() => setShowPenalty(true)}>Skip statement <span>↗</span></button>}<button className={`primary-button ${showPenalty ? 'continue-button' : ''}`} onClick={finishPrompt}>{showPenalty ? 'Forfeit done' : turn === deck.length - 1 ? 'Choose the moment' : 'Next statement'} <span>→</span></button></div></section>}
    {stage === 'vote' && <section className="nhie-vote"><p className="eyebrow">FINAL ROUND</p><h1>Which reveal<br />owned the room?</h1><div className="nhie-vote-grid">{voteCandidates.map(({ prompt, index }) => <button key={index} className={`moment-card ${favorite === index ? 'selected' : ''}`} onClick={() => setFavorite(index)}><span className="moment-number">CARD {String(index + 1).padStart(2, '0')}</span><strong>{reader(index)}</strong><span className="moment-preview">{text(prompt)}</span><span className="moment-type">{hits[index]} {hits[index] === 1 ? 'person had' : 'people had'} done it</span></button>)}</div><button className="primary-button" disabled={favorite === null} onClick={() => setStage('result')}>Reveal the night <span>↗</span></button></section>}
    {stage === 'result' && favorite !== null && <section className="nhie-result"><span className="live-pill"><span className="live-dot"/> SESSION COMPLETE</span><p className="eyebrow">MOST RELATABLE MOMENT</p><h1>Never have<br /><em>I ever.</em></h1><article className="winner-card"><strong>{reader(favorite)}</strong><p>{text(deck[favorite])}</p><span className="winner-type">{hits[favorite]} {hits[favorite] === 1 ? 'person had' : 'people had'} done it</span></article><button className="primary-button wide-button" onClick={onBack}>Choose another game <span>↗</span></button><button className="nhie-replay" onClick={() => setStage('setup')}>Play again</button></section>}
  </div>;
}

function audiences(): [Audience, string][] { return [['close-friends', 'Close friends'], ['mixed-group', 'Mixed group'], ['new-people', 'New people']]; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field-block compact-field"><div className="field-heading"><label>{label}</label></div><div className="segmented-control">{children}</div></div>; }
function LanguageToggle({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) { return <div className="session-language" aria-label="Card language"><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button><button className={language === 'hi' ? 'active' : ''} onClick={() => setLanguage('hi')}>HINGLISH</button></div>; }
