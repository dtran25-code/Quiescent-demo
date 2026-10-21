// Seeded library articles, written for this prototype. Same lightweight markup
// as pasted articles: "# " H1, "## " H2, "> " quote, "- " list item.
// Sources are example domains; none of this is copied from a real publication.

export interface SampleArticle {
  id: string
  url: string
  text: string
}

export const sampleArticles: SampleArticle[] = [
  {
    id: 'seed-hashing',
    url: 'https://blog.example.dev/posts/consistent-hashing-slowly',
    text: `# Consistent Hashing, Explained Slowly

Every system that spreads data across several machines has to answer one question again and again: which machine holds this key? The obvious answer is a hash and a remainder. Hash the key, divide by the number of machines, and use what is left over. It works well until the number of machines changes.

## The problem with remainders

Suppose you have four cache servers and you place each key on server hash(key) mod 4. Add a fifth server and almost every key now maps somewhere else. For a cache this means a sudden flood of misses: the data is still there, but nobody can find it.

What we want is a scheme where adding or removing a machine moves only the keys that have to move, roughly one share out of every n.

## Placing machines on a ring

Consistent hashing imagines the output of the hash function as a circle. Each machine is hashed onto a point on that circle. Each key is hashed too, and it belongs to the first machine you meet walking clockwise from the key's position.

When a new machine joins, it takes over only the keys between itself and the previous machine on the ring. Every other key stays where it was. When a machine leaves, its keys pass to the next machine clockwise, and again nothing else moves.

> The ring does not make the work smaller. It makes the change smaller.

## Virtual nodes

With only a handful of machines, the points land unevenly and one server may own a much larger arc than the others. The usual fix is to give each physical machine many points on the ring, often a hundred or more, called virtual nodes. The arcs average out, and a more powerful machine can simply be given more points.

## Where you will meet it

- Distributed caches that need to grow without a cold start
- Key-value stores that replicate each key to the next few machines on the ring
- Load balancers that want the same client to reach the same backend

The idea is old and simple, which is exactly why it keeps appearing in interview questions. If you can draw the ring and explain what moves when a machine joins, you understand the important part.`,
  },
  {
    id: 'seed-productivity',
    url: 'https://medium.com/@econ-notes/why-productivity-growth-stalled-3f2a',
    text: `# Why Productivity Growth Stalled

For most of the twentieth century, the output of an hour of work in rich countries rose by around two percent a year. Since the mid-2000s, that number has roughly halved. The slowdown is one of the most discussed puzzles in economics, and no single explanation has won.

## Measurement

One camp argues that we are mismeasuring. Free digital services such as search, maps and messaging create value that never shows up in output statistics, because nobody pays for them directly. Careful estimates suggest this explains some of the gap, but not most of it: the slowdown appears in industries with little digital output too.

## Diffusion

A second explanation is that new technology is spreading more slowly. The most productive firms keep pulling ahead, while the rest adopt their methods late or not at all. If the frontier is moving but the average is not, the problem is not invention but diffusion.

## Investment

A third points to weak investment after the 2008 financial crisis. Firms that expect slow demand buy fewer machines and train fewer workers, which lowers future productivity, which keeps demand slow. The loop is easy to enter and hard to leave.

> A slowdown with several causes is harder to fix than one with a single cause, because no single policy reaches all of them.

## What would change the picture

Economists disagree about whether recent advances in software and automation will reverse the trend. History offers a caution: electricity took decades to raise measured productivity, because factories had to be redesigned around it before the gains appeared.`,
  },
  {
    id: 'seed-tri-hoan',
    url: 'https://tapchi.example.vn/kinh-te-hoc-hanh-vi/vi-sao-ta-tri-hoan',
    text: `# Kinh tế học hành vi: Vì sao ta trì hoãn?

Ai cũng từng hứa với bản thân sẽ bắt đầu ôn thi từ đầu tháng, rồi đến tuần cuối mới mở sách. Kinh tế học truyền thống giả định con người lựa chọn nhất quán theo thời gian. Kinh tế học hành vi cho rằng điều đó hiếm khi đúng.

## Chiết khấu hiện tại

Chúng ta đánh giá phần thưởng ngay lúc này cao hơn nhiều so với phần thưởng trong tương lai, kể cả khi chênh lệch thời gian là rất nhỏ. Hôm nay, một buổi tối nghỉ ngơi có vẻ quý hơn một điểm số tốt vào cuối kỳ. Nhưng khi kỳ thi đến gần, cán cân đảo ngược, và ta hối tiếc.

Các nhà kinh tế gọi hiện tượng này là thiên lệch hiện tại. Nó giải thích vì sao kế hoạch dài hạn thường hợp lý trên giấy nhưng thất bại khi thực hiện.

## Cam kết trước

Một cách đối phó là tự ràng buộc mình từ trước. Đặt lịch học chung với bạn, nộp tiền cọc cho một khóa học, hay chia bài đọc dài thành nhiều phần nhỏ có hạn chót riêng. Những cam kết này làm cho việc trì hoãn trở nên tốn kém hơn ngay lúc ta muốn trì hoãn.

> Ý chí là nguồn lực có hạn. Thiết kế môi trường thường hiệu quả hơn cố gắng.

## Áp dụng khi đọc tài liệu khó

- Chọn trước đoạn sẽ đọc trong hôm nay, không phải cả chương
- Ghi một câu ghi chú ngay khi gặp chỗ khó hiểu
- Quay lại đúng chỗ đã dừng, thay vì đọc lại từ đầu`,
  },
  {
    id: 'seed-prd',
    url: 'https://pmletters.example.substack.com/p/prds-engineers-read',
    text: `# Writing a PRD Engineers Actually Read

Most product requirement documents are written to be approved, not to be built from. They open with vision, spend pages on market context, and leave the questions engineers actually have for a meeting nobody scheduled.

## Start with the states

Engineers build states and transitions. A useful PRD lists every screen and every state of that screen, including the boring ones: empty, loading, error, offline, already done. If a state is missing from the document, it will be designed by whoever happens to hit it first.

## Write the exact words

Copy is part of the spec. When the document says "show an error", the engineer invents a sentence, the designer invents another, and the support team learns a third. Put the exact strings in a table and treat changes to them like changes to code.

## Separate decisions from questions

Readers need to know which parts are settled. Mark open questions with an owner and a date, and keep them out of the requirements themselves. A requirement that contains a question is not a requirement.

> If an engineer has to guess, the PRD has already failed, even if the guess is right.

## Tie every metric to an event

A metric without an event is a wish. For each success measure, name the event that feeds it and the properties it needs. This is also where privacy decisions get made, so make them on purpose.`,
  },
  {
    id: 'seed-dull-tools',
    url: 'https://notes.example.org/2026/choose-dull-tools',
    text: `# Choose Dull Tools

Every team has a budget for novelty, whether or not anyone writes it down. Each new database, framework or language spends some of it: on learning, on failures nobody has seen before, and on the hours spent searching for answers that do not exist yet.

## Known failure modes

A tool that has been in production for ten years has failed in most of the ways it can fail, and those failures are documented. A new tool will fail too, but in ways you will discover yourself, usually at night.

## Spend novelty where it matters

The point is not to avoid new tools forever. It is to spend novelty on the part of the system that makes the product different, and to keep everything else as ordinary as possible.

> Boring is a property of a tool in a context, not of the tool itself.

## A simple test

Before adopting something new, ask what problem it solves that the current tools cannot, and who will be paged when it breaks. If both answers are vague, wait.`,
  },
  {
    id: 'seed-spaced',
    url: 'https://learning.example.com/notes-on-spaced-repetition',
    text: `# Notes on Spaced Repetition

Forgetting follows a predictable curve: steep at first, then flatter. Reviewing something just as you are about to forget it resets the curve and makes the next drop slower. Spaced repetition is the practice of timing reviews to take advantage of this.

## Why spacing works

Retrieval is effortful, and the effort is the point. Recalling an idea after a gap strengthens the memory more than rereading it while it is still fresh. Rereading feels productive because the material is familiar, but familiarity is not the same as recall.

## What to review

Short, specific prompts work better than broad ones. "What does the ring in consistent hashing solve?" is easier to answer honestly than "Explain distributed systems."

> The best time to review is when it feels slightly too late.

## Reading and review

The highlights and notes you make while reading are natural material for review, but only if you return to them. A note that is never reopened has done its job once, at the moment of writing, and no more.`,
  },
  {
    id: 'seed-slow-reading',
    url: 'https://essays.example.net/a-slow-way-to-read-hard-books',
    text: `# A Slow Way to Read Hard Books

Hard books punish speed. Skimming a dense chapter feels efficient until you reach the end and realize you could not explain any of it.

## Read for the argument

Before reading closely, find the claim. What does the author want you to believe by the end of the chapter? Once you know the destination, each paragraph becomes a step you can check rather than a wall of text.

## Stop at confusion

When a sentence stops making sense, stop there. Write one line about what confused you. Most confusion comes from a single unfamiliar term or a step the author skipped, and naming it is usually enough to find it.

## Write in your own words

At the end of each section, write two or three sentences without looking back. If you cannot, the section has not landed yet.

> Understanding is what remains when you close the book.

## Come back

The first reading builds a map. The second, a week later, is where the ideas connect to each other and to what you already know.`,
  },
]
