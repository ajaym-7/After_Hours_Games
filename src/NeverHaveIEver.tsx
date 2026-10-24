import { useMemo, useState } from 'react';
import Stepper, { Step } from './Stepper.jsx';
import type { Audience, Ceiling, DrinkMode, Language, Spice } from './types';

type Prompt = { en: string; hi: string; spice: Spice; explicit?: boolean; personal?: boolean; intimate?: boolean };
type Settings = { audience: Audience; spice: Spice; ceiling: Ceiling; drinkMode: DrinkMode; language: Language; playerCount: number; turnsPerPlayer: number; names: string[] };

const prompts: Prompt[] = [
  { spice: 'chill', en: 'Never have I ever waved back at someone who was waving at the person behind me.', hi: 'Maine kabhi kisi ko wave back nahi kiya jab woh mere peeche wale ko wave kar raha tha.' },
  { spice: 'chill', en: 'Never have I ever opened the fridge, forgotten why, and closed it again.', hi: 'Maine kabhi fridge kholkar bhool nahi gaya ki kyun khola tha, phir band kar diya.' },
  { spice: 'chill', en: 'Never have I ever practiced a conversation in my head and still got it wrong.', hi: 'Maine kabhi dimaag mein conversation practice karke bhi real mein galat nahi bola.' },
  { spice: 'chill', en: 'Never have I ever laughed at a joke before I understood it.', hi: 'Maine kabhi joke samajhne se pehle hi uspe hansna start nahi kiya.' },
  { spice: 'chill', en: 'Never have I ever pretended to recognize a song and confidently sung the wrong words.', hi: 'Maine kabhi gaana pehchaanne ka act karke full confidence se galat lyrics nahi gaaye.' },
  { spice: 'chill', en: 'Never have I ever sent a voice note, replayed it, and immediately regretted my voice.', hi: 'Maine kabhi voice note bhejke replay nahi kiya aur apni awaaz sunke turant regret nahi kiya.' },
  { spice: 'chill', en: 'Never have I ever taken a screenshot to remember something and forgotten the screenshot.', hi: 'Maine kabhi kuch yaad rakhne ke liye screenshot lekar screenshot hi bhool nahi gaya.' },
  { spice: 'chill', en: 'Never have I ever made up a reason to leave a conversation and then used it too early.', hi: 'Maine kabhi conversation se nikalne ka bahana banake use bahut jaldi nahi kar diya.' },
  { spice: 'chill', en: 'Never have I ever confidently walked into the wrong room.', hi: 'Maine kabhi full confidence se galat room mein entry nahi maari.' },
  { spice: 'chill', en: 'Never have I ever searched for my phone while holding it.', hi: 'Maine kabhi phone haath mein pakadkar hi usse dhoondhna start nahi kiya.' },
  { spice: 'chill', en: 'Never have I ever told a story and realized halfway through that I was the problem.', hi: 'Maine kabhi story sunate waqt beech mein realize nahi kiya ki problem main hi tha.' },
  { spice: 'chill', en: 'Never have I ever pretended a delayed reply was intentional when I simply forgot.', hi: 'Maine kabhi reply late karke bhool jaane ko intentional timing ka naam nahi diya.' },
  { spice: 'spicy', personal: true, en: 'Never have I ever flirted just to see if I still had game.', hi: 'Maine kabhi sirf yeh check karne ke liye flirt nahi kiya ki mera game abhi bhi hai ya nahi.' },
  { spice: 'spicy', en: 'Never have I ever reread a text so many times that it stopped making sense.', hi: 'Maine kabhi ek text itni baar reread nahi kiya ki uska meaning hi change lagne laga.' },
  { spice: 'spicy', personal: true, en: 'Never have I ever had a crush on someone I absolutely should not have liked.', hi: 'Mujhe kabhi aise insaan par crush nahi hua jispe mujhe bilkul nahi hona chahiye tha.' },
  { spice: 'spicy', personal: true, en: 'Never have I ever invented a casual reason to be somewhere my crush would be.', hi: 'Maine kabhi apne crush ki jagah par casually pahunchne ka fake reason nahi banaya.' },
  { spice: 'spicy', en: 'Never have I ever sent a risky message and instantly put my phone face down.', hi: 'Maine kabhi risky message bhejkar turant phone ulta rakhke wait nahi kiya.' },
  { spice: 'spicy', personal: true, en: 'Never have I ever stalked someone’s profile so far back that I nearly liked an old post.', hi: 'Maine kabhi kisi ki profile itni neeche tak stalk nahi ki ki old post almost like ho jaata.' },
  { spice: 'spicy', en: 'Never have I ever pretended not to care while checking whether someone viewed my story.', hi: 'Maine kabhi care na karne ka act karte hue yeh check nahi kiya ki kisne story dekhi.' },
  { spice: 'spicy', en: 'Never have I ever gone on a date mainly because the story would be good.', hi: 'Maine kabhi mainly ek achhi story ke liye date par jaane ka decision nahi liya.' },
  { spice: 'spicy', en: 'Never have I ever used a friend as a live excuse to escape an awkward date.', hi: 'Maine kabhi awkward date se nikalne ke liye friend ko live bahana nahi banaya.' },
  { spice: 'spicy', en: 'Never have I ever had two people think a conversation meant more than it did.', hi: 'Maine kabhi aisi conversation nahi ki jiska meaning do logon ne alag-alag samjha.' },
  { spice: 'spicy', en: 'Never have I ever practiced a cool reply and then answered with “haha yeah.”', hi: 'Maine kabhi cool reply practice karke actual mein sirf “haha yeah” nahi bheja.' },
  { spice: 'spicy', en: 'Never have I ever regretted introducing two people who immediately hit it off.', hi: 'Maine kabhi do logon ko milwake regret nahi kiya jab dono instantly click kar gaye.' },
  { spice: 'spicy', en: 'Never have I ever caught feelings after saying I was keeping things casual.', hi: 'Maine kabhi casual bolne ke baad hi feelings catch nahi kar li.' },
  { spice: 'wild', en: 'Never have I ever made a dramatic exit and then had to come back for something I forgot.', hi: 'Maine kabhi dramatic exit karke bhooli hui cheez lene ke liye wapas entry nahi maari.' },
  { spice: 'wild', en: 'Never have I ever told a tiny lie that needed a full backstory by the end of the night.', hi: 'Maine kabhi ek chhota jhooth nahi bola jiske liye raat tak poori backstory banani padi.' },
  { spice: 'wild', en: 'Never have I ever made eye contact with someone while doing something deeply embarrassing.', hi: 'Maine kabhi deeply embarrassing kaam karte waqt kisi ke saath eye contact nahi kiya.' },
  { spice: 'wild', en: 'Never have I ever sent a screenshot to the person who was in the screenshot.', hi: 'Maine kabhi screenshot usi insaan ko send nahi kiya jo screenshot mein tha.' },
  { spice: 'wild', en: 'Never have I ever pretended to be an expert and then been asked a follow-up question.', hi: 'Maine kabhi expert banne ka act nahi kiya aur phir follow-up question mein pakda gaya.' },
  { spice: 'wild', en: 'Never have I ever had a date, party, or trip go sideways because of one confident assumption.', hi: 'Maine kabhi ek confident assumption ki wajah se date, party ya trip ko ulta padte nahi dekha.' },
  { spice: 'wild', en: 'Never have I ever had to explain a misunderstanding that sounded worse the more I explained.', hi: 'Maine kabhi aisi misunderstanding explain nahi ki jo har explanation ke saath aur suspicious lagne lagi.' },
  { spice: 'wild', en: 'Never have I ever kept a ridiculous secret for so long that it became part of my personality.', hi: 'Maine kabhi itna ridiculous secret itne time tak nahi rakha ki woh meri personality ban gaya.' },
  { spice: 'wild', en: 'Never have I ever made a bold move, immediately panicked, and acted like it was all part of the plan.', hi: 'Maine kabhi bold move karke turant panic nahi kiya aur phir act kiya ki sab plan tha.' },
  { spice: 'wild', en: 'Never have I ever been caught in a lie by someone who helped me keep it going.', hi: 'Maine kabhi usi insaan ke saamne jhooth mein pakda nahi gaya jisne jhooth continue karne mein help ki.' },
  { spice: 'wild', en: 'Never have I ever had a harmless crush become obvious to everyone except me.', hi: 'Maine kabhi harmless crush ko sabke liye obvious nahi banaya, bas mujhe hi pata nahi chala.' },
  { spice: 'wild', en: 'Never have I ever made a group chat situation worse by trying to clarify it.', hi: 'Maine kabhi group chat ki situation clarify karne ki koshish mein aur kharab nahi ki.' },
  { spice: 'wild', explicit: true, en: 'Never have I ever had a spicy dream about someone I see regularly.', hi: 'Maine kabhi kisi regular milne wale insaan ke baare mein spicy dream nahi dekha.' },
  { spice: 'wild', explicit: true, personal: true, en: 'Never have I ever wanted to kiss someone in this room.', hi: 'Maine kabhi is room mein kisi ko kiss karne ka mann nahi banaya.' },
  { spice: 'wild', explicit: true, personal: true, intimate: true, en: 'Never have I ever had a private fantasy I would only share with people I trust.', hi: 'Maine kabhi aisi private fantasy nahi rakhi jo sirf trusted logon ke saath share karunga.' },
  { spice: 'wild', explicit: true, en: 'Never have I ever sent a flirty photo and then worried about it afterward.', hi: 'Maine kabhi flirty photo bhejke baad mein uske baare mein overthink nahi kiya.' },
  { spice: 'wild', explicit: true, en: 'Never have I ever had chemistry with someone at the worst possible time.', hi: 'Maine kabhi sabse galat timing par kisi ke saath chemistry feel nahi ki.' },
  { spice: 'wild', explicit: true, en: 'Never have I ever kept a situationship secret from my closest friends.', hi: 'Maine kabhi apne closest friends se situationship secret nahi rakhi.' },
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
      <div className="setup-card nhie-setup-card"><Stepper step={step} initialStep={1} onStepChange={setStep} onFinalStepCompleted={start} indicator="bars" transition="slide" linear backButtonText="Back" nextButtonText="Continue" completeButtonText="Deal the cards" backButtonProps={{ className: 'setup-stepper-back' }} nextButtonProps={{ className: 'primary-button setup-stepper-next' }} theme="dark" accentColor="#b9f26c" frame={false} radius={16} width="100%" className="settings-stepper">
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
