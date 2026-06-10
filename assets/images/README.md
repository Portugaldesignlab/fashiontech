# Hero artifact images

`artifact-0X.png` are the original campaign uploads (source of truth for
slot order). The page loads the web-optimized `artifact-0X.jpg` (900px,
~220KB) generated from them, and falls back to the hand-drawn
`artifact-0X.svg` interpretation if a JPG is ever missing.

| Slot | Image | Hero card |
|---|---|---|
| `artifact-01` | Cream knit boot with rose blooms, slate-blue chain leaves, gold buds | Branding · Heritage, Reimagined |
| `artifact-02` | Steel-blue crochet peep-toe with flat sixties flowers | Future Concepts · Retro-Future Bloom |
| `artifact-03` | Teal knit boot with red splash appliqués and crochet patches | R&D · Material Alchemy |
| `artifact-04` | Psychedelic concentric-circle knit sock boot | AI-Powered Creativity · Generative Pattern Study |
| `artifact-05` | Grey jersey boot embroidered with red, teal and marigold daisies | Product Design · Knit Couture 01 |

To swap artwork: replace the PNG, regenerate the JPG at the same name
(portrait crops; cards crop with `object-fit: cover`).
