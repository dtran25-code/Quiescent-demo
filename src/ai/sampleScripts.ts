// Hand-written mock answers for the two sample items, so the demo feels specific
// rather than generic. Keyed by sample item id and chapter id.

export interface SampleScript {
  /** One sentence per chapter: the section's main point. */
  takeaways: Record<string, string>
  /** "Summarize what I just read", per chapter. */
  summaries: Record<string, string>
  /** "Explain this": picked by keywords found in the selected passage. */
  explain: { keys: string[]; text: string }[]
  /** "Expand this idea", per chapter, with a fallback under 'default'. */
  expand: Record<string, string>
}

const feeExpand =
  '**Connections**\n- John Bogle, founder of Vanguard, called this "the tyranny of compounding costs." It\'s the core argument for low-cost index funds.\n- The same math applies to taxes on frequent trading and to inflation.\n\n**Counterpoint**\n- Some fees buy real value. Advice that stops you from panic-selling in a crash may be worth more than 1%.\n\n**Questions to explore**\n- What is the total annual cost across my accounts?\n- How much value would an adviser need to add each year to justify a 1% fee?'

const compounding: SampleScript = {
  takeaways: {
    'ch-1': 'Knowing the compound-interest formula is easy; developing a feel for its consequences is the hard part.',
    'ch-2': 'Growth on growth starts too small to notice, so most of the visible gains arrive at the end.',
    'ch-3': 'Divide 72 by the rate to count doublings, and each doubling outweighs all the ones before it.',
    'ch-4': 'Years invested matter more than dollars invested, which makes waiting on the sidelines expensive.',
    'ch-5': 'Costs compound just as faithfully as returns, even when they are quoted as small percentages.',
    'ch-6': 'A "1%" annual fee can cost about a quarter of your final balance over thirty years.',
    'ch-7': 'Knowledge, skills and habits compound too, and forgetting acts like a fee on learning.',
    'ch-8': 'Start early, protect the rate, and leave it alone: compounding rewards patience over brilliance.',
  },
  summaries: {
    'ch-1':
      "The essay opens with a gap: most people can define compound interest, but few have a *feel* for it. The author sets out to close that gap by covering four things:\n- what compounding actually does\n- why time matters more than timing\n- where it quietly works against you\n- why the same math shows up outside finance",
    'ch-2':
      'Simple interest pays only on what you put in; compound interest also pays on what you have already earned.\n- $10,000 at 7% earns $700 in year one, then $749 in year two. The extra $49 is too small to notice.\n- After 30 years the balance is about **$76,000**, and **$66,000** of it is growth, mostly growth on growth.\n\n**Key idea:** the early years look flat, and most of the visible gains arrive at the end.',
    'ch-3':
      'The rule of 72 is a mental shortcut: divide 72 by the annual rate to estimate how many years it takes to double.\n- 7% → about 10 years\n- 3% → about 24 years\n- 10% → a little over 7 years\n\nThirty years at 7% is roughly three doublings (1 → 2 → 4 → 8), and each doubling adds more than all the earlier ones combined.',
    'ch-4':
      'Because the curve bends upward late, **years invested matter more than amounts invested.**\n- Early saver: $5,000 a year from age 25 to 34 ($50,000 total) → about **$525,000** at 65.\n- Late saver: $5,000 a year from 35 to 64 ($150,000 total) → about **$472,000** at 65.\n\nThe same logic makes market timing costly: every year spent waiting on the sidelines removes a year from the steep end of the curve.',
    'ch-5':
      'Compounding works in both directions. It amplifies costs as faithfully as returns, and costs are usually quoted as small percentages, which makes them sound harmless.',
    'ch-6':
      '$100,000 over thirty years:\n- at 7% → about **$761,000**\n- at 6% (after a 1% fee) → about **$574,000**\n\nThe "1%" fee costs roughly **a quarter of the final balance**, about $187,000. The same logic applies to inflation, taxes from frequent trading, and high-interest debt: a 22% credit card compounds against you far faster than savings grow.',
    'ch-7':
      "Anything that builds on its own previous level compounds: knowledge, skills, reputation, relationships, habits.\n- Learning is the clearest case. Each idea gives the next one somewhere to attach, which is why taking and revisiting notes pays off.\n- The failure mode compounds too: forgetting most of what you read within a week acts like a fee.",
    'ch-8':
      'Three habits follow from the math:\n1. **Start early, even small.** The early years get multiplied the most.\n2. **Protect the rate.** One percentage point a year is worth far more than it looks.\n3. **Leave it alone.** Compounding needs uninterrupted time.\n\nThe closing thought: compounding rewards patience over brilliance. The hard part is continuing through the long, flat stretch.',
  },
  explain: [
    {
      keys: ['index card', 'formula', 'intuition', 'feel for it'],
      text: "The author is pointing at a gap between *knowing* and *feeling*.\n\nThe formula, A = P(1 + r)ⁿ, is short, but our intuition is linear: we expect results to grow in proportion to time and effort. Compounding breaks that expectation, because each year's growth is proportional to everything accumulated so far.\n\nSo you can recite the definition and still be surprised by the outcome. The rest of the essay tries to turn the formula into a felt sense.",
    },
    {
      keys: ['749', '$49', '10,700', 'too small to notice'],
      text: 'This is the smallest possible example of "interest on interest."\n\nIn year two you earn 7% on **$10,700**, not $10,000: $700 on your original money plus **$49** on last year\'s interest. That $49 is the compounding effect.\n\nIts smallness is the point. It is easy to ignore, but it grows every year because the amount it is calculated on keeps growing.',
    },
    {
      keys: ['76,000', '66,000', 'growth on growth', 'look flat'],
      text: 'After 30 years at 7%, $10,000 becomes about **$76,000** (10,000 × 1.07³⁰ ≈ 76,123).\n\nOnly $10,000 is money you put in; the other ~$66,000 is growth. "Growth on growth" means most of that $66,000 was earned on earlier gains, not on the original deposit.\n\nThe last point is about shape: the balance barely moves at first, and most of the visible increase lands in the final decade.',
    },
    {
      keys: ['slope', 'curve'],
      text: "A slope is a straight line: the same gain every year. Compounding is a curve that bends upward, but for a long stretch it bends so gently that it *looks* straight.\n\nThe line is a warning. If you judge compounding by its early years, you'll conclude it's linear and underwhelming, and you may give up right before the curve steepens.",
    },
    {
      keys: ['72', 'double', 'doubling'],
      text: 'The rule of 72 estimates doubling time: **72 ÷ annual rate**.\n\nAt 7%, 72 ÷ 7 ≈ 10.3 years (the exact figure is about 10.2). It works because the true doubling time, ln 2 ÷ ln(1 + r), comes out close to 72 ÷ r for everyday rates.\n\nThe practical value is that it turns a percentage into a picture you can count: thirty years at 7% is three doublings, so $1 becomes about $8.',
    },
    {
      keys: ['early saver', 'late saver', '525,000', '472,000', 'three times as much'],
      text: "The early saver puts in **$50,000** and ends with about **$525,000**. The late saver puts in **$150,000** and ends with about **$472,000**.\n\nThe early saver wins because of time. By 35 their $50,000 has grown to roughly $69,000, and that pot then compounds for 30 more years. The late saver's contributions arrive later, and the last ones barely compound at all.\n\n**Lesson:** years in the market beat dollars contributed.",
    },
    {
      keys: ['time the market', 'timing', 'sidelines', 'entry point'],
      text: "Waiting for a better moment to invest feels careful, but the essay argues it's expensive.\n\nThe biggest gains sit at the far end of the compounding curve. A year spent waiting doesn't just delay growth; it cuts a year off the end of the curve, which is the steepest part. Even a well-timed entry rarely makes up for the years of compounding it cost.",
    },
    {
      keys: ['fee', '1%', 'quarter', '187,000', '574,000', '761,000'],
      text: 'The fee *sounds* like 1% because it is charged as 1% a year. But it lowers the growth rate every year, from 7% to 6%, and that difference compounds.\n\n- 1.07³⁰ ≈ 7.61 → about $761,000\n- 1.06³⁰ ≈ 5.74 → about $574,000\n\nSo the ending balance is about **25% smaller**. A small annual cut to the rate becomes a large cut to the result.',
    },
    {
      keys: ['credit card', '22%', 'debt', 'other direction'],
      text: 'Compound interest also works against you on debt. At **22%** a year, an unpaid balance roughly doubles in about 3.3 years (72 ÷ 22).\n\nThat is why high-interest debt is so damaging: it compounds about three times as fast as a typical investment grows. Paying it off is effectively a guaranteed 22% return.',
    },
    {
      keys: ['learning', 'knowledge', 'notes', 'attach', 'forgetting', 'revisits'],
      text: "The author applies compounding to learning. What you already know is the \"principal,\" and new ideas are easier to absorb when they have something to attach to.\n\nTaking notes and revisiting them keeps that base from shrinking. Forgetting works like a fee: if you lose most of what you read within a week, your rate drops and the long-term gains shrink with it.",
    },
    {
      keys: ['patience', 'brilliance', 'flat stretch', 'interruptions', 'leave it alone'],
      text: 'The conclusion: compounding rewards **consistency over cleverness**. A modest rate held for decades beats a brilliant move made once.\n\nThe "long, flat stretch" is the early part of the curve, when effort seems to produce little. That\'s where most people quit, so the real skill is keeping going through it.',
    },
  ],
  expand: {
    default:
      '**Connections**\n- Exponential growth appears in populations, epidemics and technology (Moore\'s law), with the same "flat, then sudden" shape.\n- Behavioral economists call our tendency to underestimate it *exponential growth bias*.\n\n**Counterpoint**\n- Real returns aren\'t a smooth 7%. Volatility and the order of good and bad years matter: a crash near the end can erase years of gains.\n\n**Questions to explore**\n- What rate is realistic after inflation and fees?\n- Where in my own life am I in the "flat" part of a curve?',
    'ch-3':
      "**Connections**\n- Economists use a close cousin, the *rule of 70*, to estimate how fast GDP or populations double.\n- It works for inflation too: at 3% inflation, prices double in about 24 years.\n\n**Counterpoint**\n- The rule gets less accurate at high rates. At 36%, it predicts 2 years, but the true doubling time is about 2.25.\n\n**Questions to explore**\n- How many doublings do I have left before retirement?\n- What does a 24-year doubling of prices mean for cash sitting in a savings account?",
    'ch-4':
      "**Connections**\n- Studies of investor behavior (e.g. Morningstar's *Mind the Gap* reports) find that investors often earn less than the funds they own, because of badly timed buying and selling.\n- Automatic monthly investing turns timing into a non-decision.\n\n**Counterpoint**\n- Starting early isn't possible for everyone (student debt, low income). The example also assumes a steady 7% and no withdrawals.\n\n**Questions to explore**\n- What does waiting one more year cost me in future dollars?\n- How could I automate saving so timing never comes up?",
    'ch-5': feeExpand,
    'ch-6': feeExpand,
    'ch-7':
      "**Connections**\n- Sociologist Robert Merton's *Matthew effect*: early advantages in reputation or citations attract more advantages.\n- Ebbinghaus's *forgetting curve* is the \"fee\" on learning; spaced review counters it.\n\n**Counterpoint**\n- Not everything compounds. Many skills plateau, and returns can diminish rather than accelerate.\n\n**Questions to explore**\n- Which of my habits actually build on themselves?\n- How often should I revisit my notes so they keep compounding?",
    'ch-8':
      "**Connections**\n- \"Time in the market beats timing the market,\" the practical form of this essay.\n- Warren Buffett's snowball image (and Alice Schroeder's biography *The Snowball*) makes the same point.\n\n**Counterpoint**\n- \"Leave it alone\" can turn into neglect. Occasional rebalancing and fee checks still matter.\n\n**Questions to explore**\n- What is most likely to interrupt my compounding?\n- What's my biggest \"protect the rate\" lever right now?",
  },
}

const wealth: SampleScript = {
  takeaways: {
    'ch-front': 'Book I argues that specialization, trade, market size and money together explain the wealth of nations.',
    'ch-1': 'Dividing work into specialized tasks is the main source of rising productivity.',
    'ch-2': 'Specialization grows out of our habit of trading, and trade runs on self-interest rather than kindness.',
    'ch-3': 'How far specialization can go is limited by the size of the market.',
    'ch-4': 'Money emerges to fix the problems of barter, starting with commodities and ending with coins.',
  },
  summaries: {
    'ch-front':
      'The title page: selections from Book I of Adam Smith\'s *The Wealth of Nations* (1776), abridged for this demo. The four chapters build one argument:\n1. Specialization drives prosperity.\n2. It grows out of our habit of trading.\n3. It is limited by the size of the market.\n4. Money develops to make trade easier.',
    'ch-1':
      'The division of labour is the main source of productivity.\n- **Pin factory:** 10 specialized workers make about 48,000 pins a day, compared with fewer than 20 each working alone.\n- **Three causes:** greater dexterity, no time lost switching tasks, and workers inventing labour-saving machines.\n\nThe result is "universal opulence" that reaches even the poorest members of a well-governed society.',
    'ch-2':
      "Specialization isn't planned. It grows out of a human tendency to \"truck, barter, and exchange,\" which Smith links to reason and speech.\n- People get what they need by appealing to others' **self-interest**, not their kindness (\"It is not from the benevolence of the butcher…\").\n- Being able to trade is what makes specializing worthwhile.\n- Differences in talent are more a **result** of specialization than its cause.",
    'ch-3':
      'How far specialization can go depends on the **size of the market**.\n- Small villages force people to do many jobs; big towns can support specialists such as porters.\n- Water transport opens far bigger markets than land transport (a ship carries about 50× what a waggon does in the same time), which is why coasts and rivers developed first.',
    'ch-4':
      'Once people specialize, everyone "lives by exchanging."\n- Barter breaks down when wants don\'t match, so societies adopt a common commodity: cattle, salt, shells, tobacco.\n- Metals win out because they last and divide cleanly; **coins** remove the need to weigh and test them.\n- Smith closes by separating **value in use** from **value in exchange** (water vs. diamonds).',
  },
  explain: [
    {
      keys: ['division of labour', 'productive powers', 'skill, dexterity'],
      text: "This is Smith's opening claim: the biggest source of economic progress isn't natural resources or money, but **splitting work into specialized tasks**.\n\n\"Productive powers of labour\" means output per worker. He argues that most gains in skill and efficiency come from people concentrating on narrow tasks, not from working harder.",
    },
    {
      keys: ['pin', 'forty-eight thousand', 'four thousand eight hundred', 'ten men', 'twenty'],
      text: "The pin factory is Smith's most famous example.\n\n- Ten workers, each doing one step (drawing wire, straightening, cutting, pointing, grinding, heading, whitening, packing), make **48,000 pins a day**, or 4,800 each.\n- Working alone, each might make **fewer than 20**, perhaps just one.\n\nThat's a productivity gain of at least 240×. He picked a \"trifling\" trade on purpose: in a small workshop you can see every step at once.",
    },
    {
      keys: ['dexterity', 'saunters', 'time commonly lost', 'machines', 'three different circumstances'],
      text: 'Smith gives three reasons specialization raises output:\n1. **Dexterity:** doing one simple task over and over makes you very fast at it.\n2. **No switching cost:** a worker "saunters" between tasks and takes time to get back into the work. Specialization removes that lost time.\n3. **Invention:** someone focused on one operation naturally looks for tools to make it easier. Many machines, he notes, were invented by ordinary workers.',
    },
    {
      keys: ['truck, barter', 'propensity', 'exchange one thing', 'dog', 'bone'],
      text: 'Smith says specialization was never designed by anyone. It grew out of a human tendency to **"truck, barter, and exchange."**\n\nThe dog example makes the point that animals don\'t trade: no dog deliberately swaps a bone with another dog. Exchange is uniquely human, likely tied to reason and speech, and because we trade, it makes sense to specialize.',
    },
    {
      keys: ['benevolence', 'butcher', 'brewer', 'baker', 'self-love', 'dinner'],
      text: "Smith's most-quoted line. We get dinner not from the butcher's kindness but from his **self-interest**: he sells meat because it benefits him.\n\nSmith isn't praising selfishness. His point is that in a large society you can't rely on the goodwill of the thousands of strangers you depend on. Exchange works because it lines up their interest with yours: \"Give me that which I want, and you shall have this which you want.\"",
    },
    {
      keys: ['philosopher', 'porter', 'natural talents', 'habit, custom'],
      text: 'Smith argues that differences between people in different jobs are mostly the **result** of specialization, not the cause.\n\nA philosopher and a street porter, he suggests, may have started out much alike; habit, custom and education made them different. It\'s a strikingly egalitarian claim for 1776.',
    },
    {
      keys: ['extent of the market', 'market is very small', 'village', 'highlands', 'porter'],
      text: "Specialization only pays when there are **enough buyers**.\n\nIn a tiny village, a full-time specialist couldn't find enough work, so people must be jacks-of-all-trades: the Highlands farmer is \"butcher, baker, and brewer\" for his own family. Bigger markets allow finer division of labour, which raises productivity further.",
    },
    {
      keys: ['water-carriage', 'waggon', 'ship', 'leith', 'two hundred ton', 'sea-coast'],
      text: "Smith compares transport costs to explain why ports and river towns grew rich first.\n\n- **Waggon:** 2 men and 8 horses carry about 4 tons between London and Edinburgh in six weeks.\n- **Ship:** 6–8 men carry about 200 tons in the same time.\n\nCheaper transport means a bigger market, and a bigger market allows more specialization.",
    },
    {
      keys: ['money', 'cattle', 'salt', 'shells', 'dried cod', 'tobacco', 'commodity'],
      text: "Barter has a **\"double coincidence of wants\"** problem: the butcher wants bread, but the baker may not want meat.\n\nSo prudent people start keeping some commodity that almost everyone will accept. Smith's historical examples: cattle, salt, shells, dried cod, tobacco, sugar. Money begins as whichever good is most widely accepted.",
    },
    {
      keys: ['metals', 'weighing', 'assaying', 'public stamp', 'coined'],
      text: 'Metals won because they don\'t spoil and can be divided and melted back together without loss.\n\nBut raw metal had to be **weighed** and **assayed** (tested for purity) at every trade. Coins solved this: a public stamp certified weight and fineness, which made exchange faster and more trustworthy.',
    },
    {
      keys: ['value in use', 'value in exchange', 'water', 'diamond'],
      text: "This is the **paradox of value**. Water is essential (high value in use) but cheap (low value in exchange); diamonds are the reverse.\n\nSmith states the paradox but doesn't fully resolve it. Economists later explained it with *marginal utility*: price reflects the value of one more unit, and because water is abundant, one more glass is worth little.",
    },
  ],
  expand: {
    default:
      "**Connections**\n- Smith's argument runs through the whole book: productivity comes from specialization, specialization needs trade, and trade needs markets and money.\n\n**Counterpoint**\n- Much of modern growth also comes from technology and institutions, not only from dividing labour.\n\n**Questions to explore**\n- Which of Smith's examples still hold up today, and which look dated?",
    'ch-1':
      '**Connections**\n- Ford\'s assembly line (1913) is the pin factory at industrial scale.\n- Leonard Read\'s essay *I, Pencil* shows how no single person knows how to make even a pencil. Division of labour now spans the globe.\n\n**Counterpoint**\n- Smith himself, later in the book (Book V), warns that endlessly repeating one simple task can dull a worker\'s mind, and argues for public education as a remedy.\n\n**Questions to explore**\n- Where is today\'s "pin factory"?\n- Does automation extend Smith\'s logic or break it?',
    'ch-2':
      "**Connections**\n- David Ricardo's *comparative advantage* (1817) extends this: both sides gain from trade even if one is better at everything.\n- The famous \"invisible hand\" phrase appears later, in Book IV.\n\n**Counterpoint**\n- Self-interest alone isn't enough. Markets rely on trust and rules. Smith's earlier book, *The Theory of Moral Sentiments* (1759), puts sympathy at the center of human behavior.\n\n**Questions to explore**\n- Where do markets depend on trust rather than self-interest?",
    'ch-3':
      '**Connections**\n- Shipping containers (from the 1950s) cut transport costs dramatically and globalized manufacturing: the same logic at scale.\n- The internet does it for niche specialists, who can now find buyers worldwide.\n\n**Counterpoint**\n- Bigger markets can also concentrate rewards among a few winners, and local generalists can be more resilient to shocks.\n\n**Questions to explore**\n- How big does a market need to be for my own role to exist?',
    'ch-4':
      "**Connections**\n- Cigarettes became currency in WWII prisoner-of-war camps (R. A. Radford, 1945), showing Smith's process happening from scratch.\n- Today's money is mostly digital, backed by trust rather than metal.\n\n**Counterpoint**\n- The \"barter came first\" story is disputed. Anthropologists such as David Graeber (*Debt: The First 5,000 Years*) argue that credit and IOUs came before barter.\n\n**Questions to explore**\n- What makes something acceptable as money today?",
  },
}

export const SAMPLE_SCRIPTS: Record<string, SampleScript> = {
  'sample-compounding': compounding,
  'sample-wealth': wealth,
}
