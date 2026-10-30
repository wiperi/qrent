# Paired rental guides

These ten articles were exported from the owner's publicly published Notion pages
on 2026-10-31. `manifest.json` retains each original source ID, publication date,
source edit time and SHA-256 of its complete Chinese Markdown body. `reviewedAt`
records this paired website publication, which supplies the page modification
date; it does not make historical market figures current.

`zh/<slug>.json` and `en/<slug>.json` hold the full reviewed bodies. All original
tables, numbers and external links remain. The English `sourceHash` must match the
Chinese body hash. Three incorrect copied excerpts and duplicate route names are
corrected in this publication. The reader omits only a repeated document header;
the complete original header and body remain in these files.

To publish a change, edit both languages, keep their common slug/source identity,
update the source hash and review timestamp, and run `test:seo`. Add both imports
to `lib/paired-guides.ts` for a new article. The regression checks compare each
served body and title to its own language file and reject missing/unreviewed
translations. Both languages publish in one GitHub release; new Notion edits no
longer appear independently. No provider or automatic translation API is called.
