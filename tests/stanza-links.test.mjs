import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lyricStanzaLinks } from '../src/lib/stanza-links.ts';
import { readingIsMagnified } from '../src/lib/verse-fit.ts';
import { originalLanguageLabel } from '../src/lib/language-labels.ts';

test('stanza share anchors preserve original identity across numbering and Roman edits', () => {
  const source = 'افتتاح\nدوسری سطر\n\n۱\nاصل لفظ\nاصل سطر';
  const roman = 'Opening\nSecond line\n\n1\nAsl lafz\nAsl satr';
  const before = lyricStanzaLinks(source, roman);
  const after = lyricStanzaLinks(source.replace('۱', '۲'), roman.replace('1', '2').replace('Asl lafz', 'Asal lafz'));
  assert.equal(before.paired, true);
  assert.equal(before.original[1].key, after.original[1].key);
  assert.equal(before.original[1].key, before.roman[1].key);
  assert.equal(before.roman[1].id, before.original[1].id + '-roman');
});

test('mismatched edition structures never offer a guessed paired stanza', () => {
  const links = lyricStanzaLinks('۱\nاصل\nمتن\n\n۲\nدوسرا\nشعر', '1\nAsl\nMatn');
  assert.equal(links.paired, false);
  assert.ok(links.roman.every((roman) => !links.original.some((source) => source.key === roman.key)));
});

test('repeated openings receive unique DOM IDs and unnumbered passages remain shareable', () => {
  const links = lyricStanzaLinks('Same opening\nSame second line\n\nSame opening\nSame second line');
  assert.equal(new Set(links.original.map((link) => link.id)).size, 2);
  assert.equal(links.original[0].label, 'Opening');
  assert.equal(links.original[1].label, 'Passage 2');
});

test('wide desktop and mobile pinch zoom both preserve the magnified reading floor', () => {
  assert.equal(readingIsMagnified(1280, 2560), true);
  assert.equal(readingIsMagnified(1440, 1440), false);
  assert.equal(readingIsMagnified(390, 390, 2), true);
  assert.equal(readingIsMagnified(0, 1440), false);
});

test('reader labels follow the original language instead of assuming Urdu', () => {
  assert.equal(originalLanguageLabel('pa-Arab'), 'Panjabi');
  assert.equal(originalLanguageLabel('skr-Arab'), 'Saraiki');
  assert.equal(originalLanguageLabel('bft-Arab'), 'Balti');
  assert.equal(originalLanguageLabel('en'), 'English');
  assert.equal(originalLanguageLabel('unknown'), 'Original');
});
