---
name: pdf-vocab-json
description: Extract English vocabulary lists from class PDF files and convert them into the TELP vocabulary JSON schema. Use when the user provides a PDF containing vocabulary entries with English word, part of speech, Chinese meaning, supplemental notes, and example sentences, and asks to generate, clean, validate, or repair JSON vocabulary data.
---

# PDF Vocabulary JSON

## Goal

Convert a class vocabulary PDF into a JSON array of vocabulary objects. Preserve source information from the PDF, infer missing roots carefully, and generate one additional example sentence per word using other words from the same PDF whenever natural.

## Output Schema

Every item must contain exactly these keys:

```json
{
  "word": "repurposing",
  "pos": "n.",
  "meaning": "重新利用；改作他用",
  "homophone": "無",
  "roots": "re- 再一次 + purpose 目的 + -ing 活動",
  "ex1En": "Repurposing old bottles can reduce waste.",
  "ex1Zh": "重新利用舊瓶子可以減少浪費。",
  "ex2En": "Repurposing old clothes is a good idea.",
  "ex2Zh": "重新利用舊衣服是一個好主意。"
}
```

Use a top-level JSON array, not an object wrapper. Use valid JSON only: double quotes, no comments, no trailing commas.

## Workflow

1. Locate the source PDF and decide the output filename. Always write generated vocabulary JSON files under the project `static/data/` directory. If the user does not name an output file, use the PDF basename plus `.json`.
2. Extract text from the PDF. Prefer `scripts/extract_pdf_text.py`; if extraction is poor or empty, try OCR or ask the user for a clearer PDF/export.
3. Parse entries into `word`, `pos`, `meaning`, supplemental notes, and source examples. Class PDFs vary, so inspect page text before assuming a fixed layout.
4. Create the JSON array and fill fields using the rules below.
5. Validate the JSON with `scripts/validate_vocab_json.py`.
6. Re-open the finished JSON and spot-check several entries against the PDF text, especially the first, last, and any entries with unusual layout.
7. Synchronize the PWA data settings so the new chapter appears in the app and is available offline.

## Project Data And PWA Sync

- Write every generated vocabulary JSON file to `static/data/<filename>.json`.
- Update `static/data/list.json` to include the new JSON filename. Keep the list as a JSON array of filenames only, without `static/data/` prefixes.
- Update `service-worker.js` after adding or renaming a vocabulary JSON file:
  - Add `./static/data/<filename>.json` to `APP_SHELL` if it is not already present.
  - Keep `./static/data/list.json` in `APP_SHELL`.
  - Increment `APP_VERSION` by one so installed PWAs refresh their cache.
- Do not edit `manifest.webmanifest` for ordinary vocabulary additions unless the app identity, icon, theme color, start URL, or scope must change.
- After syncing, run the JSON validator on the new file and briefly mention which PWA files were updated in the final response.

## Field Rules

- `word`: Preserve the English vocabulary headword from the PDF. Use lowercase unless the word is a proper noun or the PDF intentionally capitalizes it.
- `pos`: Use the part of speech from the PDF, normalized to compact labels such as `n.`, `v.`, `adj.`, `adv.`, `phr.`, `prep.`, `conj.`. Preserve multiple labels when needed, e.g. `v./n.`.
- `meaning`: Use the Chinese meaning from the PDF. Separate multiple meanings with `；`.
- `homophone`: Put the PDF supplemental note content here. Despite the field name, this is for the PDF's "補充" content. Use `無` when the PDF has no supplement for that word.
- `roots`: Add the word root, prefix, suffix, or word formation explanation in Chinese. Use `無` only when a concise, reliable breakdown would be forced or misleading. Keep it short, e.g. `re- 再一次 + purpose 目的 + -ing 活動`.
- `ex1En`: Use the English example sentence from the PDF.
- `ex1Zh`: Use the PDF's Chinese translation of `ex1En`. If the PDF has only English, translate faithfully into natural Traditional Chinese.
- `ex2En`: Generate a new simple sentence. Prefer using one or more other vocabulary words from the same PDF when the sentence remains natural. Do not make the sentence awkward just to include another word.
- `ex2Zh`: Translate `ex2En` into natural Traditional Chinese.

## Quality Rules

- Use Traditional Chinese for all Chinese output.
- Do not invent PDF facts for `meaning`, `homophone`, `ex1En`, or `ex1Zh`; infer only when the PDF has the information but extraction formatting is messy.
- Keep examples classroom-friendly, concise, and grammatically natural.
- Avoid duplicate `word` entries unless the PDF intentionally lists different parts of speech separately.
- If a source example is missing, generate `ex1En`/`ex1Zh` and mention this in the final response.
- If extraction ambiguity affects more than a few entries, show the ambiguous text snippets to the user instead of silently guessing.

## Helper Scripts

Use these bundled scripts from the skill directory:

```bash
python3 scripts/extract_pdf_text.py input.pdf --out extracted.txt
python3 scripts/validate_vocab_json.py output.json
```

`extract_pdf_text.py` tries common local Python PDF libraries and falls back to system tools when available. `validate_vocab_json.py` checks that the output is a JSON array and every entry has the required string fields.
