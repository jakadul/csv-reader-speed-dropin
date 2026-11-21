# csv-reader-speed-dropin
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/jakadul/csv-reader-speed-dropin/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/jakadul/csv-reader-speed-dropin/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for **csv-reader 1.0.0**, make.fun's reference program, for the "Read broken CSV files faster, 21 November 2026" bounty ($100 in USDC).

`solve.js` is a single-pass char-code scanner with slice-based field building: conversion rewriting (`""` -> `"`, CRLF/lone CR -> LF, stray-CR drop) only runs when a span actually contains those characters, so plain fields cost one slice. `main.ts` is the harness driver (V8 incremental marking off, as the rules allow).

Local practice set (kit instance, drand round 34140941): **6/6 cases byte-identical to csv-reader 1.0.0**, ~3.3x less CPU time (741 ms -> 226 ms over 7 runs).

## Run it

```sh
MAKEFUN_INPUT_DIR=./input MAKEFUN_OUTPUT_DIR=./output node main.ts
```

Input: `/input/cases.json` (JSON array of `{id, input}`), output: `/output/answers.json`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
