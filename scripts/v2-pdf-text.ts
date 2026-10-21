// Text for the v2 sample PDFs. Written for this prototype (fictional authors),
// so the seeded library has realistic PDFs across all three statuses.
// PDFs use pdf-lib's standard fonts, which only cover Latin text, so these are
// English; the Vietnamese sample is an article.

export interface SampleBook {
  file: string
  title: string
  subtitle: string
  author: string
  chapters: { title: string; paragraphs: string[] }[]
}

export const v2Books: SampleBook[] = [
  {
    file: 'switching-costs.pdf',
    title: 'The Hidden Cost of Switching',
    subtitle: 'Working paper on attention, interruption and reading comprehension',
    author: 'L. Hartmann and P. Osei (working paper, 2025)',
    chapters: [
      {
        title: '1. Introduction',
        paragraphs: [
          'Readers rarely move through a difficult text in one sitting. They pause to look up a term, check a message, or open a second source, and each pause seems small. This paper asks what those pauses cost, measured not in minutes but in how much of the text the reader can later recall and use.',
          'Earlier work on task switching measured the delay in starting a new task. We focus on the return trip: what happens to comprehension when a reader comes back to a paragraph they left half-understood.',
          'Our central claim is that the cost of an interruption depends less on its length than on whether the reader leaves the page. A thirty-second definition shown beside the text costs little. The same definition found in another tab costs far more, because the reader must rebuild their place in the argument.',
        ],
      },
      {
        title: '2. Method',
        paragraphs: [
          'We recruited 120 graduate students and asked each to read two passages of about 2,500 words from introductory economics and distributed systems texts. Each passage contained six terms that most participants would not know.',
          'In the in-place condition, a definition appeared in a side panel when the reader selected a term. In the switch condition, readers searched for the term in a separate browser tab. Reading time, the number of re-read sentences, and a recall test 48 hours later were recorded.',
          'Re-reading was measured from scroll position: a sentence counted as re-read when it returned to the middle third of the screen after having left it for more than five seconds.',
        ],
      },
      {
        title: '3. Results',
        paragraphs: [
          'Readers in the switch condition re-read 2.4 times as many sentences after each lookup. Total reading time rose by 19 percent, most of it spent finding their place rather than reading new material.',
          'Recall after 48 hours was 14 percent lower in the switch condition. The effect was largest for questions that required connecting two paragraphs, and smallest for questions about isolated facts.',
          'Participants underestimated the cost. Asked afterwards, most said the lookups had taken "a few seconds" and had not affected their understanding.',
        ],
      },
      {
        title: '4. Discussion',
        paragraphs: [
          'The results suggest a design principle for reading tools: help should arrive where the reader already is. Any feature that sends the reader elsewhere pays a re-entry cost that readers do not notice and do not report.',
          'A second implication concerns notes. Readers who wrote a one-line note at the moment of confusion recovered their place faster, even when they did not return to the note later. The act of writing appears to mark the spot in memory as well as on the page.',
          'Limitations: the passages were short, and the 48-hour test cannot tell us whether the effect lasts. A longer study with real reading lists is under way.',
        ],
      },
    ],
  },
  {
    file: 'raft-lecture-notes.pdf',
    title: 'Raft, Slowly',
    subtitle: 'Lecture notes for a distributed systems reading group',
    author: 'Distributed Systems Reading Group, week 6',
    chapters: [
      {
        title: 'Why consensus is hard',
        paragraphs: [
          'A replicated service keeps copies of the same data on several machines so that it survives when one of them fails. The hard part is not copying data; it is agreeing on the order of changes when messages can be delayed, duplicated or lost, and when any machine can stop without warning.',
          'Consensus algorithms solve this by electing one machine to decide the order and by refusing to treat a change as final until a majority of machines have stored it. A majority matters because any two majorities overlap in at least one machine, so knowledge of a committed change can never be lost entirely.',
        ],
      },
      {
        title: 'Leader election',
        paragraphs: [
          'Raft divides time into terms, numbered upward. Each term begins with an election. A follower that hears nothing from a leader for a randomized timeout becomes a candidate, increases the term, votes for itself and asks the others for their votes.',
          'A server grants at most one vote per term, and only to a candidate whose log is at least as up to date as its own. The candidate that collects a majority becomes leader and starts sending heartbeats to stop new elections.',
          'Randomized timeouts are the quiet trick here. Because followers time out at different moments, one candidate usually starts first and wins before the others wake up, so split votes are rare and short.',
        ],
      },
      {
        title: 'Log replication',
        paragraphs: [
          'The leader appends each client request to its log and sends the new entry to followers. When a majority have stored it, the entry is committed, the leader applies it to its state machine, and later messages tell followers to apply it too.',
          'Each entry records the term in which it was created. Followers check that the entry before the new one matches what the leader has; if it does not, they reject it, and the leader steps back until their logs agree. This consistency check is what keeps logs identical without any separate repair process.',
        ],
      },
      {
        title: 'Questions for discussion',
        paragraphs: [
          'Why must a candidate have an up-to-date log to win, and what could go wrong if this rule were dropped?',
          'What happens to requests the old leader accepted but never committed when it loses leadership?',
          'How would you explain the overlap of majorities to someone without a computer science background?',
        ],
      },
    ],
  },
  {
    // The "online PDF" page in /demo-browser saves this file.
    file: 'interest-rates-report.pdf',
    title: 'Interest Rates, Plainly',
    subtitle: 'A short public report on how policy rates reach households',
    author: 'Example Policy Institute (2026)',
    chapters: [
      {
        title: 'Summary',
        paragraphs: [
          'This report follows one change in the policy rate from the moment it is announced to the moment it shows up in a family budget. The path is longer and slower than most people expect.',
          'Within days, rates on short-term loans between banks adjust. Within weeks, new variable-rate loans and savings accounts follow. Fixed-rate mortgages respond only when they are renewed, which can take years.',
        ],
      },
      {
        title: 'How the change travels',
        paragraphs: [
          'Banks fund themselves partly by borrowing from each other overnight. When that rate rises, their cost of money rises, and they pass the increase on to new borrowers. Savers see higher rates more slowly, because banks compete less hard for deposits than for loans.',
          'Households with variable-rate debt feel the change first. Renters feel it later, through landlords who refinance. Households with savings and no debt may come out ahead.',
          'Firms respond mainly through investment. A project that looked profitable at a four percent borrowing cost may not at six. The effect on hiring arrives months after the effect on investment.',
        ],
      },
      {
        title: 'What to watch',
        paragraphs: [
          'The best early signal is the rate on new loans, not the stock of existing ones. The second is credit growth: if banks lend less, the policy is working its way through.',
          'Expectations matter throughout. A change that markets already expected has much of its effect before it is announced.',
        ],
      },
    ],
  },
  {
    file: 'monetary-policy-basics.pdf',
    title: 'Monetary Policy Basics',
    subtitle: 'Course reader, Introductory Macroeconomics, unit 4',
    author: 'Department of Economics course reader (2026)',
    chapters: [
      {
        title: 'Unit 4.1 What a central bank controls',
        paragraphs: [
          'A central bank does not set the interest rate on your mortgage or your savings account directly. It sets a short-term policy rate, the rate at which banks lend reserves to one another overnight, and influences the rest of the economy through that one price.',
          'When the policy rate rises, borrowing becomes more expensive throughout the system. Banks raise the rates they charge on loans, firms delay investment, households borrow less, and spending slows. When it falls, the opposite happens, with a delay that is often estimated at a year or more.',
        ],
      },
      {
        title: 'Unit 4.2 The trade-off between inflation and employment',
        paragraphs: [
          'Most central banks are asked to keep inflation low and stable, and many are also asked to support employment. In the short run these goals can pull in different directions: slowing spending to reduce inflation can also reduce hiring.',
          'Because policy works with long and variable lags, central banks act on forecasts rather than on current data. A bank that waits until inflation is visibly high has usually waited too long; one that acts on a mistaken forecast may slow the economy for no reason.',
        ],
      },
      {
        title: 'Unit 4.3 Credibility and expectations',
        paragraphs: [
          'Expectations matter as much as the rate itself. If workers and firms believe inflation will stay near its target, they set wages and prices accordingly, and the target becomes easier to meet.',
          'This is why central banks publish targets, explain their decisions and try to act predictably. Credibility, once lost, is expensive to rebuild: the bank may need higher rates for longer to convince people it is serious.',
          'Review questions: Why does a central bank act on forecasts? What is the role of expectations in keeping inflation near its target?',
        ],
      },
    ],
  },
]
