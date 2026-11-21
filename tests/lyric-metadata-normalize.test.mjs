import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, slug, isProvenanceKey, isProvenanceComment } from '../scripts/normalize-lyric-metadata.mjs';

test('normalizes strings but preserves booleans, numbers, numbers in arrays and Roman literal', () => {
  const original = `---
title: بیبیاں رہ گئیں
alternateTitle: Bibiyaan Reh Gayin
language: Urdu
lang: ur
kalamType: [Noha, Salam]
reciter:
  - Nadeem Sarwar
published: false
stanzaLineExceptions:
  - 5
# source_id: tajpoints:123
# additional_source_url: https://example.test/
# Editorial: Check stanza 2 against source scan
romanLyrics: |-
  Line with: punctuation
  # literal, not provenance
# api_content_sha256: abc
---
مرثیہ
# additional_raw_sha256: abc`;
  const actual = normalize(original);
  assert.equal(actual.issues.length, 0);
  assert.match(actual.text, /title: "بیبیاں رہ گئیں"/u);
  assert.match(actual.text, /kalamType: \["Noha", "Salam"\]/u);
  assert.match(actual.text, /- "Nadeem Sarwar"/u);
  assert.match(actual.text, /published: false/u);
  assert.match(actual.text, /stanzaLineExceptions:\n  - 5/u);
  assert.match(actual.text, /romanLyrics: \|-\n  Line with: punctuation\n  # literal, not provenance/u);
  assert.match(actual.text, /# Editorial: Check stanza 2 against source scan/u);
  assert.doesNotMatch(actual.text, /source_id|source_url|content_sha256|raw_sha256/u);
  assert.equal(normalize(actual.text).text, actual.text);
});

test('English retains only source title and leaves poem untouched', () => {
  const original = `---
title: In your name
alternateTitle: Needlessly duplicated
language: English
lang: en
kalamType: Noha
published: true
romanLyrics: |-
  English body
---
The original English poem`;
  const result = normalize(original);
  assert.equal(result.alternate, undefined);
  assert.doesNotMatch(result.text, /^alternateTitle:/mu);
  assert.match(result.text, /title: "In your name"/u);
  assert.match(result.text, /The original English poem$/u);
});

test('does not invent non-English alternate titles or replace a genuine title with stanza one', () => {
  const original = `---
title: "عنوان"
language: "Urdu"
lang: "ur"
romanLyrics: |-
  An unrelated opening verse
---
پہلی سطر`;
  const result = normalize(original);
  assert.deepEqual(result.issues, ['missing Roman alternateTitle']);
  assert.doesNotMatch(result.text, /alternateTitle:/u);
  assert.match(result.text, /title: "عنوان"/u);
});

test('flags non-source-script title and non-Roman alternateTitle', () => {
  const result = normalize(`---\ntitle: "Roman source"\nalternateTitle: "رومن"\nlanguage: "Urdu"\n---\nمتن`);
  assert.equal(result.issues.length, 2);
});

test('removes nested provenance and preserves actionably labelled editorial comment', () => {
  const input = `---
title: "ایک مصرع"
alternateTitle: "Aik Misra"
language: "Urdu"
additional_source_metadata_path: snapshots/123.json
additional_additional_raw_sha256: deadbeef
original_html: |-
  <tag>something</tag>
# source_url: xxx
# TODO: Check word choice in stanza four
# scraped from a website
---
متن`;
  const result = normalize(input);
  assert.doesNotMatch(result.text, /source_metadata|raw_sha256|original_html|<tag>|scraped from|source_url/u);
  assert.match(result.text, /# TODO: Check word choice in stanza four/u);
  assert.equal(isProvenanceKey('additional_additional_original_html'), true);
  assert.equal(isProvenanceComment('# source_id: abc'), true);
});

test('slug titles deterministically and strips accents, not author names separately', () => {
  assert.equal(slug('Bībiyāṅ Reh Gayīṅ'), 'bibiyan-reh-gayin');
  assert.equal(slug('5/12/14 Ka Karam'), '5-12-14-ka-karam');
});