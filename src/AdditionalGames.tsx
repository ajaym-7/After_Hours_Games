import { useEffect, useMemo, useState } from 'react';
import Stepper, { Step } from './Stepper.jsx';
import type { Audience, Ceiling, DrinkMode, Language, Spice } from './types';

export type AdditionalGameId = 'truth-or-dare' | 'bollywood-charades' | 'most-likely';
type Copy = { en: string; hi: string };
type Settings = { audience: Audience; spice: Spice; ceiling: Ceiling; mode: DrinkMode; language: Language; players: number; turns: number; names: string[] };
type TDCard = { spice: Spice; personal?: boolean; explicit?: boolean; truth: Copy; dare: Copy };
type PromptCard = { spice: Spice; personal?: boolean; explicit?: boolean; en: string; hi: string };
type FilmCard = { spice: Spice; title: string; hintEn: string; hintHi: string };

const tdCards: TDCard[] = [
  { spice: 'chill', truth: { en: 'What is the silliest thing you believed as a kid?', hi: 'Bachpan mein tumne sabse silly baat kya sach maani thi?' }, dare: { en: 'Give a 45-second speech about why your favorite snack should win an award.', hi: 'Apne favorite snack ko award kyun milna chahiye, is par 45-second speech do.' } },
  { spice: 'chill', truth: { en: 'What is one song you know all the words to?', hi: 'Kaunsa gaana tumhe poora yaad hai?' }, dare: { en: 'Sing the chorus of any song like you are in a grand finale for 45 seconds.', hi: 'Kisi gaane ka chorus 45 seconds tak grand finale ki tarah gao.' } },
  { spice: 'chill', truth: { en: 'What is the funniest excuse you have used to be late?', hi: 'Late hone ke liye tumne sabse funny bahana kya diya?' }, dare: { en: 'Act like a news anchor reporting that the snacks have disappeared for 45 seconds.', hi: '45 seconds tak news anchor banke report karo ki snacks gayab ho gaye.' } },
  { spice: 'chill', truth: { en: 'What is a food you love that most people find strange?', hi: 'Kaunsa khana tumhe pasand hai par logon ko ajeeb lagta hai?' }, dare: { en: 'Pitch your favorite food as a luxury product for 45 seconds.', hi: 'Apne favorite khane ko 45 seconds tak luxury product ki tarah pitch karo.' } },
  { spice: 'chill', truth: { en: 'What is the last thing you searched for online?', hi: 'Tumne online aakhri baar kya search kiya tha?' }, dare: { en: 'Give a 45-second movie trailer for the last thing you ate.', hi: 'Jo aakhri cheez tumne khaayi, uska 45-second movie trailer banao.' } },
  { spice: 'chill', truth: { en: 'What is a small thing that always makes you happy?', hi: 'Kaunsi chhoti si cheez tumhe hamesha khush karti hai?' }, dare: { en: 'Do a 45-second dance as if the floor is made of hot sand.', hi: '45 seconds tak aise dance karo jaise floor garam ret ka ho.' } },
  { spice: 'chill', truth: { en: 'What is your most useless talent?', hi: 'Tumhara sabse bekaar talent kya hai?' }, dare: { en: 'Show your most useless talent, then teach it to someone for 45 seconds.', hi: 'Apna bekaar talent dikhao, phir 45 seconds tak kisi ko sikhao.' } },
  { spice: 'chill', truth: { en: 'What is the strangest dream you remember?', hi: 'Tumhe apna sabse ajeeb sapna kaunsa yaad hai?' }, dare: { en: 'Tell a 45-second bedtime story about a very confused ghost.', hi: 'Ek confused bhoot ki 45-second bedtime story sunao.' } },
  { spice: 'chill', truth: { en: 'Which app do you use more than you want to?', hi: 'Kaunsa app tum zaroorat se zyada use karte ho?' }, dare: { en: 'Give a 45-second apology to your phone for ignoring everyone.', hi: 'Sabko ignore karne ke liye apne phone se 45-second apology do.' } },
  { spice: 'chill', truth: { en: 'What is one thing you are surprisingly bad at?', hi: 'Kaunsi cheez mein tum surprisingly bure ho?' }, dare: { en: 'Pretend to teach the group that thing for 45 seconds, with total confidence.', hi: '45 seconds tak full confidence se group ko woh cheez sikhane ka act karo.' } },
  { spice: 'chill', truth: { en: 'What is the funniest mix-up you have had with a friend?', hi: 'Friend ke saath tumhari sabse funny confusion kya hui?' }, dare: { en: 'Act out that mix-up as a silent movie for 45 seconds.', hi: 'Us confusion ko 45 seconds tak silent movie ki tarah act karo.' } },
  { spice: 'chill', truth: { en: 'What is a popular movie you have never watched?', hi: 'Kaunsi popular movie tumne kabhi nahi dekhi?' }, dare: { en: 'Describe an imaginary movie sequel in a 45-second dramatic pitch.', hi: 'Ek imaginary movie sequel ko 45-second dramatic pitch mein batao.' } },
  { spice: 'spicy', personal: true, truth: { en: 'Who was your first crush, and what did you like about them?', hi: 'Tumhara pehla crush kaun tha, aur tumhe usmein kya pasand tha?' }, dare: { en: 'Deliver a 45-second love confession to an imaginary person; keep it funny.', hi: 'Kisi imaginary insaan ko 45-second love confession do; funny rakhna.' } },
  { spice: 'spicy', truth: { en: 'What is the boldest message you have sent?', hi: 'Tumne sabse bold message kya bheja hai?' }, dare: { en: 'Act out sending a risky text, then waiting for a reply for 45 seconds.', hi: 'Risky text bhejne aur reply ka wait karne ka 45-second act karo.' } },
  { spice: 'spicy', truth: { en: 'Have you ever liked someone your friend liked too?', hi: 'Kya tumhe kabhi wahi insaan pasand tha jo tumhare friend ko bhi pasand tha?' }, dare: { en: 'Make a 45-second dramatic speech asking an imaginary crush for a second chance.', hi: 'Imaginary crush se second chance maangte hue 45-second dramatic speech do.' } },
  { spice: 'spicy', personal: true, truth: { en: 'What is the most awkward date you have been on?', hi: 'Tumhari sabse awkward date kaunsi thi?' }, dare: { en: 'Reenact your most awkward date moment for 45 seconds; a made-up one counts.', hi: 'Apni sabse awkward date ka moment 45 seconds tak act karo; fake story bhi chalegi.' } },
  { spice: 'spicy', truth: { en: 'What is something you have pretended to enjoy to impress someone?', hi: 'Kisi ko impress karne ke liye tumne kya pasand karne ka natak kiya?' }, dare: { en: 'Sell the group on a hobby you secretly dislike for 45 seconds.', hi: '45 seconds tak group ko aisa hobby pasand karwao jo tumhe secretly pasand nahi.' } },
  { spice: 'spicy', personal: true, truth: { en: 'Have you ever sent a message and wished you could take it back?', hi: 'Kya tumne kabhi message bhejkar use wapas lene ka mann kiya?' }, dare: { en: 'Read an imaginary dramatic text you almost sent, like a stage actor, for 45 seconds.', hi: 'Jo dramatic text tum almost bhejte, use 45 seconds tak stage actor ki tarah padho.' } },
  { spice: 'spicy', truth: { en: 'What is the biggest lie you told to get out of a plan?', hi: 'Kisi plan se bachne ke liye tumne sabse bada jhooth kya bola?' }, dare: { en: 'Defend a silly made-up excuse in court for 45 seconds.', hi: 'Ek silly fake bahane ko 45 seconds tak court mein defend karo.' } },
  { spice: 'spicy', personal: true, truth: { en: 'Have you ever had a crush on a friend?', hi: 'Kya tumhe kabhi apne friend par crush hua?' }, dare: { en: 'Give an imaginary crush a 45-second award acceptance speech.', hi: 'Apne imaginary crush ko 45-second award acceptance speech do.' } },
  { spice: 'spicy', truth: { en: 'What is the most embarrassing thing in your search history?', hi: 'Tumhari search history mein sabse embarrassing cheez kya hai?' }, dare: { en: 'Act out your browser history as a 45-second courtroom confession.', hi: 'Apni browser history ko 45-second courtroom confession ki tarah act karo.' } },
  { spice: 'spicy', truth: { en: 'What is the strangest thing you have done to get someone’s attention?', hi: 'Kisi ka attention paane ke liye tumne sabse ajeeb kya kiya?' }, dare: { en: 'Get the group’s attention without speaking for 45 seconds.', hi: '45 seconds tak bina bole group ka attention paane ki koshish karo.' } },
  { spice: 'spicy', truth: { en: 'Which secret talent would surprise your friends?', hi: 'Kaunsa hidden talent tumhare friends ko surprise karega?' }, dare: { en: 'Perform a 45-second talent show with a talent you invent right now.', hi: 'Abhi ek talent invent karke 45-second talent show karo.' } },
  { spice: 'wild', personal: true, truth: { en: 'Have you ever flirted with someone and then panicked when they flirted back?', hi: 'Kya tumne kabhi flirt kiya aur saamne wale ke reply karte hi panic ho gaye?' }, dare: { en: 'Give a 60-second press conference about a fake dating rumor; answer two questions.', hi: 'Fake dating rumor par 60-second press conference do aur do sawaalon ka jawab do.' } },
  { spice: 'wild', truth: { en: 'What is the biggest secret you can share without naming anyone?', hi: 'Bina kisi ka naam liye tumhara sabse bada secret kya hai?' }, dare: { en: 'Tell a 60-second story about a harmless secret that got out of hand; fiction counts.', hi: 'Ek harmless secret ki 60-second story sunao jo badh gaya; fake story bhi chalegi.' } },
  { spice: 'wild', personal: true, truth: { en: 'Have you ever kissed someone and regretted it right away?', hi: 'Kya tumne kabhi kisi ko kiss karke turant regret kiya?' }, dare: { en: 'Act out a 60-second soap-opera goodbye to an imaginary ex.', hi: 'Imaginary ex ko 60-second soap-opera goodbye act karke dikhao.' } },
  { spice: 'wild', truth: { en: 'What is the most chaotic thing you have done to impress a date?', hi: 'Date ko impress karne ke liye tumne sabse chaotic kya kiya?' }, dare: { en: 'Pitch yourself as the lead in a fake dating show for 60 seconds.', hi: '60 seconds tak fake dating show ke lead ke liye apna pitch do.' } },
  { spice: 'wild', personal: true, explicit: true, truth: { en: 'What is a bold thought about dating you have never said out loud?', hi: 'Dating ke baare mein tumhara bold thought kya hai jo kabhi bola nahi?' }, dare: { en: 'Give a 60-second dramatic reading of a flirty note you make up now.', hi: 'Abhi ek flirty note banao aur 60 seconds tak dramatic reading karo.' } },
  { spice: 'wild', truth: { en: 'Have you ever had two people think you liked them at the same time?', hi: 'Kya kabhi do logon ko ek saath laga ki tum unhe pasand karte ho?' }, dare: { en: 'Act out a 60-second scene where you are caught in a harmless love triangle.', hi: 'Ek harmless love triangle mein pakde jaane ka 60-second scene act karo.' } },
  { spice: 'wild', truth: { en: 'What is the most dramatic way you have left a party?', hi: 'Party se nikalne ka tumhara sabse dramatic tareeka kya tha?' }, dare: { en: 'Make a 60-second exit speech like you are leaving a reality show.', hi: 'Reality show chhodte hue 60-second exit speech do.' } },
  { spice: 'wild', truth: { en: 'What is the most trouble a harmless lie has caused you?', hi: 'Ek harmless jhooth ki wajah se tumhe sabse zyada kya problem hui?' }, dare: { en: 'Defend a ridiculous fake scandal in a 60-second news interview.', hi: 'Ridiculous fake scandal ko 60-second news interview mein defend karo.' } },
  { spice: 'wild', truth: { en: 'Have you ever had a crush that your whole group noticed first?', hi: 'Kya tumhara koi crush aisa tha jo tumhare group ko tumse pehle pata chal gaya?' }, dare: { en: 'Give a 60-second apology speech for a silly thing you did to impress someone.', hi: 'Kisi ko impress karne ke liye kiye silly kaam par 60-second apology do.' } },
  { spice: 'wild', truth: { en: 'What is the most awkward truth someone has caught you hiding?', hi: 'Kaunsi awkward baat chhupate hue tum pakde gaye?' }, dare: { en: 'For 60 seconds, defend yourself against a made-up accusation from the group.', hi: 'Group ke fake accusation se 60 seconds tak apna defence karo.' } },
  { spice: 'wild', personal: true, explicit: true, truth: { en: 'Have you ever wanted to kiss someone you were told to see as just a friend?', hi: 'Kya tumne kabhi aise friend ko kiss karna chaha jise sirf friend samajhne ko kaha gaya?' }, dare: { en: 'Do a 60-second dramatic confession to a willing co-star; keep it playful.', hi: 'Ek willing co-star ko 60-second dramatic confession do; playful rakhna.' } },
  { spice: 'wild', truth: { en: 'What is the boldest thing you have done on a dare?', hi: 'Dare par tumne sabse bold kya kiya?' }, dare: { en: 'Create and perform a 60-second dramatic dare for yourself; keep it safe.', hi: 'Apne liye ek safe dramatic dare banao aur 60 seconds tak perform karo.' } },
];

const mostLikelyCards: PromptCard[] = [
  ...[
    ['forget why they entered a room', 'room mein aane ka reason bhoolna'], ['laugh at their own joke first', 'apne joke par sabse pehle khud hansna'], ['bring snacks for everyone', 'sabke liye snacks lana'], ['get lost even with a map', 'map ke baad bhi raasta bhatakna'], ['start dancing when their song plays', 'apna gaana bajte hi dance shuru karna'], ['fall asleep during a movie', 'movie ke beech so jaana'], ['send a text to the wrong chat', 'galat chat mein message bhejna'], ['become friends with a stranger in a queue', 'line mein stranger se dosti karna'], ['take the longest to choose food', 'khana choose karne mein sabse zyada time lena'], ['make a plan and change it five minutes later', 'plan bana ke paanch minute mein badal dena'], ['tell a story with too many details', 'story mein bahut zyada details dena'], ['win a silly argument with full confidence', 'silly argument full confidence se jeetna'],
  ].map(([en, hi]) => ({ spice: 'chill' as Spice, en: `Who is most likely to ${en}?`, hi: `Sabse zyada chances kiske hain ki woh ${hi}?` })),
  ...[
    ['send a risky text and regret it', 'risky text bhejkar regret karna'], ['have a secret crush', 'secret crush rakhna'], ['flirt their way out of trouble', 'flirt karke trouble se bachna'], ['pretend they did not see a message', 'message dekhkar bhi na dekhne ka act karna'], ['make a dramatic exit from a party', 'party se dramatic exit lena'], ['fall for someone after saying they would not', 'mana karne ke baad bhi kisi ko pasand kar lena'], ['show up where their crush is by coincidence', 'crush ki jagah par coincidence se pahunchna'], ['tell a funny story about a bad date', 'bad date ki funny story sunana'],
  ].map(([en, hi]) => ({ spice: 'spicy' as Spice, personal: true, en: `Who is most likely to ${en}?`, hi: `Sabse zyada chances kiske hain ki woh ${hi}?` })),
  ...[
    ['become famous for a ridiculous reason', 'ridiculous reason se famous hona'], ['get caught in a lie they forgot they told', 'apne hi bhule hue jhooth mein pakde jaana'], ['turn a small problem into a big story', 'chhoti problem ko badi story banana'], ['start a dance battle with a stranger', 'stranger ke saath dance battle shuru karna'], ['be the star of a dating show', 'dating show ka star banna'], ['keep a party going until sunrise', 'party ko sunrise tak chalana'], ['make a bold move and panic right after', 'bold move karke turant panic karna'], ['accidentally reveal their own secret', 'galti se apna secret bata dena'], ['be spotted with a secret crush', 'secret crush ke saath pakde jaana'], ['leave a party with a wild story', 'party se wild story ke saath nikalna'], ['get into a harmless love triangle', 'harmless love triangle mein phansna'], ['win an argument they started by mistake', 'galti se shuru ki argument jeetna'],
  ].map(([en, hi]) => ({ spice: 'wild' as Spice, en: `Who is most likely to ${en}?`, hi: `Sabse zyada chances kiske hain ki woh ${hi}?` })),
];

const films: FilmCard[] = [
  ...['Dilwale Dulhania Le Jayenge', '3 Idiots', 'Sholay', 'Lagaan', 'Kabhi Khushi Kabhie Gham', 'Dil Chahta Hai', 'Munna Bhai M.B.B.S.', 'Zindagi Na Milegi Dobara', 'Chak De! India', 'Queen', 'Hera Pheri', 'Jab We Met'].map((title) => ({ spice: 'chill' as Spice, title, hintEn: 'Easy · act the title without speaking.', hintHi: 'Easy · bina bole title act karo.' })),
  ...['Kahaani', 'Andhadhun', 'Om Shanti Om', 'Chennai Express', 'Bajrangi Bhaijaan', 'Drishyam', 'Gully Boy', 'Barfi!', 'Jab Tak Hai Jaan', 'Don', 'Bhool Bhulaiyaa', 'Welcome'].map((title) => ({ spice: 'spicy' as Spice, title, hintEn: 'Medium · act a key scene or idea.', hintHi: 'Medium · koi scene ya idea act karo.' })),
  ...['Tumbbad', 'Gangs of Wasseypur', 'Detective Byomkesh Bakshy!', 'Jagga Jasoos', 'Rocket Singh: Salesman of the Year', 'Matru Ki Bijlee Ka Mandola', 'Sandeep Aur Pinky Faraar', 'Khosla Ka Ghosla!', 'Jaane Bhi Do Yaaro', 'Oye Lucky! Lucky Oye!', 'Black Friday', 'Luv Shuv Tey Chicken Khurana'].map((title) => ({ spice: 'wild' as Spice, title, hintEn: 'Hard · no words, sounds, or drawing.', hintHi: 'Hard · words, sounds ya drawing nahi.' })),
];

const rank: Record<Spice, number> = { chill: 0, spicy: 1, wild: 2 };
const shuffle = <T,>(items: T[]) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};
const getLabel = (settings: Settings, index: number) => settings.names[index % settings.players]?.trim() || `Player ${index % settings.players + 1}`;

export default function AdditionalGames({ game, onBack }: { game: AdditionalGameId; onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>({ audience: 'mixed-group', spice: 'spicy', ceiling: 'suggestive', mode: 'no-drink', language: 'en', players: 5, turns: 1, names: [] });
  const [step, setStep] = useState(1);
  const [stage, setStage] = useState<'setup' | 'play' | 'result'>('setup');
  const [deck, setDeck] = useState<(TDCard | PromptCard | FilmCard)[]>([]);
  const [turn, setTurn] = useState(0);
  const [choice, setChoice] = useState<'truth' | 'dare' | null>(null);
  const [forfeit, setForfeit] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [phase, setPhase] = useState<'prompt' | 'voting' | 'revealed' | 'show-title' | 'acting' | 'guessed' | 'missed' | 'forfeit'>('prompt');
  const [votes, setVotes] = useState<number[]>([]);
  const [voter, setVoter] = useState(0);
  const [totals, setTotals] = useState<number[]>([]);
  const [remaining, setRemaining] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);

  const source = game === 'truth-or-dare' ? tdCards : game === 'most-likely' ? mostLikelyCards : films;
  const pool = useMemo(() => source.filter((card) => rank[card.spice] <= rank[settings.spice]
    && (settings.ceiling === 'explicit' || !('explicit' in card && card.explicit))
    && (settings.audience === 'close-friends' || !('personal' in card && card.personal))), [source, settings.spice, settings.ceiling, settings.audience]);
  const maxTurns = Math.max(1, Math.min(3, Math.floor(pool.length / settings.players)));
  const strings = language === 'en' ? {
    back: '← Games', players: 'Who’s playing?', room: 'Who’s in the room?', energy: 'Pick your energy', rules: 'Set the rules',
    player: 'Player', optional: 'Enter name (optional)', start: 'Deal the cards', next: 'Next card', skip: 'Skip this card', done: 'Done, pass it',
    truth: 'Truth', dare: 'Dare', pass: 'Pass the phone', takeSip: 'If you choose to skip, take a sip.', noDrink: 'If you choose to skip, do a 30-second silly performance.',
    title: 'Bollywood Dumb Charades', guesses: 'Did the group guess it?', guessed: 'Got it!', noGuess: 'Not this time', reveal: 'Reveal the movie', hide: 'Hide title & start timer', act: 'Act it out—no talking or sounds.',
    vote: 'Vote for one person', tally: 'votes', revealVotes: 'Reveal votes', final: 'Session complete', playAgain: 'Play again', games: 'Choose another game',
  } : {
    back: '← Games', players: 'Kaun khel raha hai?', room: 'Group kaisa hai?', energy: 'Energy chuno', rules: 'Rules set karo',
    player: 'Player', optional: 'Naam likho (optional)', start: 'Cards baanto', next: 'Agla card', skip: 'Card skip karo', done: 'Done, phone pass karo',
    truth: 'Sach', dare: 'Dare', pass: 'Phone pass karo', takeSip: 'Skip karoge toh ek sip lo.', noDrink: 'Skip karoge toh 30-second ka silly act karo.',
    title: 'Bollywood Dumb Charades', guesses: 'Group ne guess kiya?', guessed: 'Sahi guess!', noGuess: 'Is baar nahi', reveal: 'Movie dekho', hide: 'Title chhupao aur timer chalao', act: 'Bina bole aur awaaz kiye act karo.',
    vote: 'Ek player ko vote do', tally: 'votes', revealVotes: 'Votes dekho', final: 'Game khatam', playAgain: 'Phir khelo', games: 'Doosra game chuno',
  };

  useEffect(() => {
    const isDareTimer = game === 'truth-or-dare' && stage === 'play' && choice === 'dare' && !forfeit && timerRunning;
    const isCharadesTimer = game === 'bollywood-charades' && stage === 'play' && phase === 'acting';
    if (!isDareTimer && !isCharadesTimer) return;
    const timer = window.setInterval(() => setRemaining((value) => {
      if (value <= 1) {
        window.clearInterval(timer);
        if (isCharadesTimer) setPhase('missed');
        if (isDareTimer) setTimerRunning(false);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [game, stage, phase, turn, choice, forfeit, timerRunning]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((old) => {
    const next = { ...old, [key]: value };
    const available = next.players ? Math.max(1, Math.min(3, Math.floor(source.filter((card) => rank[card.spice] <= rank[next.spice] && (next.ceiling === 'explicit' || !('explicit' in card && card.explicit)) && (next.audience === 'close-friends' || !('personal' in card && card.personal))).length / next.players))) : 1;
    return { ...next, turns: Math.min(next.turns, available) };
  });
  const start = () => {
    const deckCount = Math.min(pool.length, settings.players * settings.turns);
    setDeck(shuffle(pool).slice(0, deckCount));
    setTurn(0); setChoice(null); setForfeit(false); setTimerRunning(false); setPhase(game === 'bollywood-charades' ? 'show-title' : 'prompt');
    setVotes(Array(settings.players).fill(-1)); setVoter(0); setTotals(Array(settings.players).fill(0)); setRemaining(60);
    setLanguage(settings.language); setStage('play');
  };
  const next = () => {
    if (turn + 1 >= deck.length) { setStage('result'); return; }
    setTurn((value) => value + 1); setChoice(null); setForfeit(false); setTimerRunning(false);
    setPhase(game === 'bollywood-charades' ? 'show-title' : 'prompt');
    setVotes(Array(settings.players).fill(-1)); setVoter(0); setRemaining(60);
  };
  const leave = () => {
    if (stage !== 'setup' && !window.confirm(language === 'en' ? 'Leave this game and return to the game list?' : 'Game chhodkar games list par jaana hai?')) return;
    onBack();
  };
  const typeLabel = game === 'truth-or-dare' ? 'TRUTH OR DARE' : game === 'most-likely' ? 'WHO’S MOST LIKELY' : 'BOLLYWOOD CHARADES';
  const reader = getLabel(settings, turn);
  const active = deck[turn];
  const voteCounts = Array.from({ length: settings.players }, (_, index) => votes.filter((vote) => vote === index).length);
  const currentVoteLeader = voteCounts.indexOf(Math.max(0, ...voteCounts));
  const displayPrompt = (copy: Copy) => language === 'en' ? copy.en : copy.hi;
  const chooseDare = () => { setChoice('dare'); setRemaining((active as TDCard).spice === 'wild' ? 60 : 45); setTimerRunning(false); };
  const timerText = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  return <section className="additional-game">
    <div className="additional-topbar"><button className="additional-back" onClick={leave}>{strings.back}</button><span>{typeLabel}</span><button className="additional-language" onClick={() => setLanguage((value) => value === 'en' ? 'hi' : 'en')}>{language === 'en' ? 'HINGLISH' : 'ENGLISH'}</button></div>
    {stage === 'setup' && <div className="additional-setup">
      <div className="additional-intro"><p className="eyebrow">AFTER HOURS · {typeLabel}</p><h1>{game === 'truth-or-dare' ? <>Truth<br /><em>or Dare?</em></> : game === 'most-likely' ? <>Who’s most<br /><em>likely to…</em></> : <>Bollywood<br /><em>Charades.</em></>}</h1><p>{game === 'bollywood-charades' ? (language === 'en' ? 'Act the title. Let the group guess.' : 'Title act karo. Group ko guess karne do.') : game === 'most-likely' ? (language === 'en' ? 'Read the prompt. Point to the friend who fits.' : 'Prompt padho. Us friend ko vote do jo fit baithta hai.') : (language === 'en' ? 'Pick your truth. Or make the room laugh.' : 'Sach chuno. Ya group ko hasaao.')}</p></div>
      <div className="setup-card additional-setup-card"><Stepper step={step} initialStep={1} onStepChange={setStep} onFinalStepCompleted={start} indicator="bars" transition="slide" linear backButtonText="Back" nextButtonText="Continue" completeButtonText={strings.start} backButtonProps={{ className: 'setup-stepper-back' }} nextButtonProps={{ className: 'primary-button setup-stepper-next' }} theme="dark" accentColor={game === 'bollywood-charades' ? '#ff8b4c' : game === 'most-likely' ? '#b7a1ee' : '#e8b967'} frame={false} radius={16} width="100%" className="settings-stepper">
        <Step title="Players"><div className="setup-step-content"><h2 className="settings-step-heading">{strings.players}</h2><div className="player-count-row"><div><strong>{settings.players}</strong><span>players</span></div><div className="player-count-controls"><button aria-label="Remove a player" disabled={settings.players <= 2} onClick={() => update('players', Math.max(2, settings.players - 1))}>−</button><button aria-label="Add a player" disabled={settings.players >= 12} onClick={() => update('players', Math.min(12, settings.players + 1))}>+</button></div></div><div className="player-name-grid">{Array.from({ length: settings.players }, (_, i) => <label className="player-name-field" key={i}><span>{strings.player} {i + 1}</span><input maxLength={24} value={settings.names[i] || ''} placeholder={strings.optional} onChange={(event) => update('names', Array.from({ length: settings.players }, (_, slot) => slot === i ? event.target.value : settings.names[slot] || ''))}/></label>)}</div></div></Step>
        <Step title="Energy"><div className="setup-step-content"><h2 className="settings-step-heading">{strings.energy}</h2><div className="choice-grid spice-grid">{([['chill', 'Chill', 'Light and playful'], ['spicy', 'Spicy', 'Bolder and personal'], ['wild', 'Wild', 'Chaotic and daring']] as [Spice, string, string][]).map(([id, title, description]) => <button key={id} className={`choice-tile spice-tile ${settings.spice === id ? 'selected' : ''}`} onClick={() => update('spice', id)}><span className="spice-icon">✦</span><b>{title}</b><small>{description}</small></button>)}</div><div className="field-block compact-field"><div className="field-heading"><label>{strings.room}</label></div><div className="choice-grid audience-grid">{([['close-friends', 'Close friends'], ['mixed-group', 'Mixed group'], ['new-people', 'New people']] as [Audience, string][]).map(([id, title]) => <button key={id} className={`choice-tile ${settings.audience === id ? 'selected' : ''}`} onClick={() => update('audience', id)}><b>{title}</b></button>)}</div></div></div></Step>
        <Step title="Rules"><div className="setup-step-content rules-step"><h2 className="settings-step-heading">{strings.rules}</h2>{game !== 'bollywood-charades' && <Field label="Content">{(['suggestive', 'explicit'] as Ceiling[]).map((value) => <button key={value} className={settings.ceiling === value ? 'active' : ''} onClick={() => update('ceiling', value)}>{value === 'suggestive' ? 'Suggestive' : 'Explicit'}</button>)}</Field>}{game !== 'bollywood-charades' && <Field label="Mode">{(['drink', 'no-drink'] as DrinkMode[]).map((value) => <button key={value} className={settings.mode === value ? 'active' : ''} onClick={() => update('mode', value)}>{value === 'drink' ? 'Drink' : 'No Drink'}</button>)}</Field>}<Field label="Turns per player">{[1, 2, 3].map((value) => <button key={value} className={settings.turns === value ? 'active' : ''} disabled={value > maxTurns} onClick={() => update('turns', value)}>{value}×</button>)}</Field><Field label="Language"><button className={settings.language === 'en' ? 'active' : ''} onClick={() => update('language', 'en')}>English</button><button className={settings.language === 'hi' ? 'active' : ''} onClick={() => update('language', 'hi')}>Hinglish</button></Field><p className="additional-capacity">{pool.length} cards fit these settings · up to {maxTurns} turn{maxTurns === 1 ? '' : 's'} per player</p></div></Step>
      </Stepper></div>
    </div>}

    {stage === 'play' && active && <div className="additional-play"><div className="game-topline"><div><p className="eyebrow">{reader} {game === 'most-likely' ? 'READS THIS' : '’S TURN'}</p><h1>{game === 'truth-or-dare' ? 'Choose your card.' : game === 'most-likely' ? 'Who fits the story?' : 'Act it out.'}</h1></div><LanguageToggle language={language} setLanguage={setLanguage}/></div><div className="progress-row"><div className="progress-track">{deck.map((_, i) => <span key={i} className={i < turn ? 'complete' : i === turn ? 'current' : ''}/>)}</div></div>
      <article className={`playing-card additional-card ${forfeit ? 'penalty-card' : ''}`} key={`${turn}-${forfeit}-${phase}`}><div className="playing-card-edge"/><div className="card-meta"><span className="type-pill">{game === 'truth-or-dare' ? choice?.toUpperCase() || 'TRUTH OR DARE' : game === 'most-likely' ? phase === 'revealed' ? 'VOTE RESULT' : 'GROUP VOTE' : 'MOVIE CARD'}</span><span className="card-count">{turn + 1} / {deck.length}</span></div><div className="card-center">
        {game === 'truth-or-dare' && <>{!choice && !forfeit ? <><div className="card-spark">✳</div><h2>Choose truth or dare.</h2></> : forfeit ? <><div className="card-spark">↗</div><h2>{settings.mode === 'drink' ? (language === 'en' ? 'Take a sip, or do a 30-second silly performance.' : 'Ek sip lo, ya 30-second ka silly act karo.') : (language === 'en' ? 'Do a 30-second silly performance, then pass the phone.' : '30-second ka silly act karo, phir phone pass karo.')}</h2></> : <><div className="card-spark">{choice === 'truth' ? '◉' : '↗'}</div><h2>{displayPrompt((active as TDCard)[choice || 'truth'])}</h2>{choice === 'dare' && <span className="timer-chip">45–60 SECONDS</span>}</>}</>}
        {game === 'most-likely' && <><div className="card-spark">{forfeit ? '↗' : '✳'}</div><h2>{forfeit ? (language === 'en' ? (settings.mode === 'drink' ? 'Take a sip, or do a 30-second silly performance.' : 'Do a 30-second silly performance, then pass the phone.') : (settings.mode === 'drink' ? 'Ek sip lo, ya 30-second ka silly act karo.' : '30-second ka silly act karo, phir phone pass karo.')) : phase === 'revealed' ? `Most votes: ${getLabel(settings, currentVoteLeader)}` : displayPrompt(active as PromptCard)}</h2><p className="additional-subcopy">{forfeit ? 'SKIP FORFEIT' : phase === 'voting' ? `${getLabel(settings, voter)}: ${strings.vote}` : phase === 'revealed' ? `${voteCounts[currentVoteLeader] || 0} ${strings.tally}` : strings.pass}</p></>}
        {game === 'bollywood-charades' && <><div className="card-spark">✦</div>{phase === 'forfeit' ? <><p className="additional-subcopy">SKIP FORFEIT</p><h2>{language === 'en' ? 'Do a 30-second dramatic movie-star entrance.' : '30-second dramatic movie-star entry karo.'}</h2></> : phase === 'show-title' ? <><p className="additional-subcopy">{language === 'en' ? 'Show only the actor this title.' : 'Yeh title sirf actor ko dikhao.'}</p><h2>{(active as FilmCard).title}</h2></> : phase === 'acting' ? <><p className="additional-subcopy">{strings.act}</p><h2 className="charades-time">{`0:${String(remaining).padStart(2, '0')}`}</h2></> : phase === 'guessed' || phase === 'missed' ? <><p className="additional-subcopy">{phase === 'guessed' ? strings.guessed : strings.noGuess}</p><h2>{(active as FilmCard).title}</h2></> : <><p className="additional-subcopy">{(active as FilmCard)[language === 'en' ? 'hintEn' : 'hintHi']}</p><h2>{strings.title}</h2></>}</>}
      </div></article>
      {game === 'truth-or-dare' && choice === 'dare' && !forfeit && <div className="additional-dare-timer"><span className="timer-chip">◷ &nbsp;{timerText} / {(active as TDCard).spice === 'wild' ? 60 : 45} SEC</span><button className="secondary-button" onClick={() => remaining === 0 ? (setRemaining((active as TDCard).spice === 'wild' ? 60 : 45), setTimerRunning(true)) : setTimerRunning((value) => !value)}>{remaining === 0 ? 'Run again' : timerRunning ? 'Pause timer' : 'Start timer'}</button></div>}
      {game === 'truth-or-dare' && !choice && !forfeit && <div className="additional-choose"><button className="secondary-button" onClick={() => setChoice('truth')}>{strings.truth}</button><button className="primary-button" onClick={chooseDare}>{strings.dare}</button></div>}
      {game === 'most-likely' && phase === 'prompt' && !forfeit && <button className="primary-button additional-wide" onClick={() => { setPhase('voting'); setVoter(0); setVotes(Array(settings.players).fill(-1)); }}>{language === 'en' ? 'Start voting' : 'Vote shuru karo'} <span>→</span></button>}
      {game === 'most-likely' && phase === 'prompt' && forfeit && <button className="primary-button additional-wide" onClick={next}>{strings.done}<span>→</span></button>}
      {game === 'most-likely' && phase === 'voting' && <div className="additional-vote-list">{Array.from({ length: settings.players }, (_, index) => <button key={index} className="secondary-button" onClick={() => { const nextVotes = [...votes]; nextVotes[voter] = index; setVotes(nextVotes); if (voter + 1 >= settings.players) { setTotals((old) => old.map((value, i) => value + nextVotes.filter((vote) => vote === i).length)); setPhase('revealed'); } else setVoter(voter + 1); }}>{settings.names[index]?.trim() || `Player ${index + 1}`}<span>←</span></button>)}</div>}
      {game === 'most-likely' && phase === 'revealed' && <button className="primary-button additional-wide" onClick={next}>{turn + 1 >= deck.length ? strings.final : strings.next}<span>→</span></button>}
      {game === 'bollywood-charades' && <div className="additional-play-actions">{phase === 'show-title' && <button className="primary-button additional-wide" onClick={() => { setPhase('acting'); setRemaining(60); }}>{strings.hide}<span>→</span></button>}{phase === 'acting' && <button className="primary-button" onClick={() => { setPhase('guessed'); setTotals((old) => old.map((score, index) => index === turn % settings.players ? score + 1 : score)); }}>{strings.guessed}<span>✓</span></button>}{phase === 'acting' && <button className="secondary-button" onClick={() => setPhase('missed')}>{strings.noGuess}<span>→</span></button>}{phase === 'missed' && <button className="primary-button additional-wide" onClick={next}>{turn + 1 >= deck.length ? strings.final : strings.next}<span>→</span></button>}{phase === 'guessed' && <button className="primary-button additional-wide" onClick={next}>{turn + 1 >= deck.length ? strings.final : strings.next}<span>→</span></button>}{phase === 'show-title' && <button className="secondary-button additional-wide" onClick={() => { setForfeit(true); setPhase('forfeit'); }}>{strings.skip}<span>↗</span></button>}{phase === 'forfeit' && <button className="primary-button additional-wide" onClick={next}>{strings.done}<span>→</span></button>}</div>}
      {game !== 'bollywood-charades' && <div className="additional-play-actions">{!(forfeit && (game === 'truth-or-dare' || game === 'most-likely')) && <button className="secondary-button" onClick={() => setForfeit(true)}>{strings.skip}<span>↗</span></button>}{(game === 'truth-or-dare' && choice || game === 'truth-or-dare' && forfeit) && <button className={`primary-button ${forfeit ? 'additional-wide' : ''}`} onClick={next}>{turn + 1 >= deck.length ? strings.final : strings.done}<span>→</span></button>}</div>}
    </div>}
    {stage === 'result' && <div className="additional-result"><span className="live-pill"><span className="live-dot"/>{strings.final}</span><p className="eyebrow">{typeLabel}</p><h1>{game === 'truth-or-dare' ? (language === 'en' ? 'That was a<br/>good one.' : 'Maza aa gaya.') : game === 'most-likely' ? (language === 'en' ? 'Most likely<br/>to win.' : 'Sabse zyada<br/>votes.') : (language === 'en' ? 'Scene<br/>complete.' : 'Scene<br/>khatam.')}</h1>{game === 'most-likely' && <article className="winner-card"><strong>{getLabel(settings, totals.indexOf(Math.max(...totals)))}</strong><p>{Math.max(...totals)} total votes</p></article>}{game === 'bollywood-charades' && <article className="winner-card"><strong>{totals.reduce((sum, value) => sum + value, 0)} / {deck.length}</strong><p>{language === 'en' ? 'movies guessed by the group' : 'movies group ne guess ki'}</p></article>}<button className="primary-button wide-button" onClick={start}>{strings.playAgain}<span>↗</span></button><button className="secondary-button wide-button" onClick={onBack}>{strings.games}<span>↗</span></button></div>}
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field-block compact-field"><div className="field-heading"><label>{label}</label></div><div className="segmented-control">{children}</div></div>; }
function LanguageToggle({ language, setLanguage }: { language: Language; setLanguage: (value: Language) => void }) { return <div className="session-language"><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button><button className={language === 'hi' ? 'active' : ''} onClick={() => setLanguage('hi')}>HINGLISH</button></div>; }
