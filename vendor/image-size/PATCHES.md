# Revopush security fork of `image-size`

This directory is a vendored copy of [`image-size@1.2.1`](https://www.npmjs.com/package/image-size)
(the version required by `metro`, a transitive dependency of `expo`), with local
security patches applied. It is wired in through the `overrides` (npm) and
`resolutions` (yarn) fields of the root `package.json`.

## Why a vendored fork?

The upstream [image-size repository](https://github.com/image-size/image-size)
was **archived in June 2026** and no patched release exists for the advisories
below — every published version (`<= 2.0.2`) is inside the vulnerable range,
and `metro` (which requires `image-size@^1.0.2`) has declined to replace the
dependency (facebook/metro#1607, #1762). A version bump is therefore
impossible; patching locally is the only available remediation.

The fork is versioned **2.0.3** — the next version after the top of the
vulnerable range `<= 2.0.2` — so dependency scanners correctly recognize the
installed copy as outside the affected range. The API is that of the 1.x line,
which is what `metro` consumes.

## Patches applied on top of 1.2.1

### CVE-2025-71330 / GHSA-w3rx-r6r6-pgpr — ICNS infinite loop

`dist/types/icns.js`: the ICNS parser advanced its offset by the entry's
length field without validating it. A crafted buffer with a zero entry length
kept the offset unchanged, and the `while (imageOffset < fileLength ...)` loop
spun forever, permanently blocking the Node.js event loop. The parser now
throws `TypeError('Invalid ICNS, entry size is too small')` for any entry
length smaller than the 8-byte entry header (such a length can never be valid
per the ICNS format).

### CVE-2025-71329 / GHSA-5p2g-fcmc-qvqq — JXL/HEIF infinite loop

`dist/types/jxl.js`: `extractPartialStreams` set
`offset = box.offset + box.size` after each `jxlp` box. For a crafted box with
a zero size field the offset never advanced, `findBox` kept returning the same
box, and the loop never terminated. The offset now always advances by at least
the 8-byte box header. (The related `findBox` helper in `dist/types/utils.js`
already contained the equivalent guard as of 1.2.1; the HEIF parser only
iterates through `findBox`, so it is covered by that existing guard.)

Both fixes are verified by `test/security-patches.test.js` in this directory,
which feeds the crafted ICNS/JXL buffers from the advisories to the parsers
and asserts they terminate.
