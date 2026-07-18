# Multi-Pov — Agent rules

## Progress log (standing habit)

**Always keep `PROGRESS.md` up to date.** It is the historical record of application progress (features, user prompts, fixes).

After meaningful work in a session:

1. **Append a Changelog entry** at the **top** of the Changelog section in `PROGRESS.md` (newest first).
2. Use the template already defined in that file (`Type`, `Prompt / request`, `Status`, `Changes`, `Files touched`, `Notes`).
3. **Update related sections when they change:**
   - **Project snapshot / feature map** — status of major systems
   - **Prompt index** — one-line row for the user request
   - **Open ideas / backlog** — check off finished items; add new ideas only if the user asked or clearly implied them
4. Prefer **one entry per user request** or logical ship unit (not every tiny edit).
5. Capture the **user’s request** (quote or short paraphrase) so the *why* is preserved.
6. Do **not** delete old Changelog entries. Correct factual errors in place if needed.
7. Skip a log entry only for pure Q&A, exploration with no repo changes, or trivial typos—if in doubt, log it.

### When to log

| Situation | Log? |
|-----------|------|
| New feature or system | Yes |
| Bug fix | Yes |
| User prompt that drove multi-step work | Yes |
| Docs/chore that affect how the project is run | Yes |
| Answer-only / no file changes | No |

### Order of work

Implement the request → verify (build/test as appropriate) → **update `PROGRESS.md` before finishing** the response.

## Product direction (brief)

- Browser COD Zombies–style prototype: React + Three.js (R3F), simple shaded geometry.
- Living docs: `PROGRESS.md` (history), `README.md` (quick start).
