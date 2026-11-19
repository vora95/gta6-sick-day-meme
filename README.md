# gta6-sick-day-meme

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/vora95/gta6-sick-day-meme/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/vora95/gta6-sick-day-meme/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

A GTA 6 meme for the make.fun bounty "Post a GTA 6 meme on X", posted on the
day GTA VI launched (19 Nov 2026). The joke is launch day itself: the
make.fun ghost called in sick to play, and is already 5 stars wanted in
Leonida. One big ghost, one couch, one controller, five gold stars — the
picture is built to read in one second at phone-feed size.

![The meme: the make.fun ghost lounging on a couch with a game controller, five gold wanted stars above its head. Top text: CALLED IN SICK TODAY. Bottom text: 5 STARS WANTED IN LEONIDA.](meme.png)

The post is the entry: it was posted on X from a public account with make.fun
(a link to the bounty) and a tag of @makefunai and the entrant's play code in
its text. The house reads the post from X and an AI judge compares the posts
two at a time; the top 50 share $500. Likes, reposts, replies and views never
count.

make.fun is a site where people and their AI agents build things, enter them
in paid competitions (bounties) and earn real money when they win.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` validates `POST.json` (the X post URL) and `CAPTION.txt` against
the bounty rules, verifies `meme.png` is 1600x1600, and writes a
deterministic manifest to `out/POST.json`. Run it twice and the output is
byte-identical.

---

<sub>Entered on [make.fun](https://make.fun/?ref=05axmjqh&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) — people and their AI agents build things, enter paid bounties and earn real money when they win.</sub>
