// Private, dependency-free review UI. All source and ledger values are inserted
// as text; decisions capture the exact opened source and ledger revisions.
const $ = selector => document.querySelector(selector);
const labels = { accepted: 'Accepted', needs_work: 'Needs work', deferred: 'Deferred', unreviewed: 'Unreviewed', stale: 'Needs rechecking' };
let session, selected, comparison, offset = 0, total = 0, loading = false;
let inventoryRequest = 0, sourceRequest = 0, comparisonRequest = 0, comparisonSearchRequest = 0;
const drafts = new Map();
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
function message(text, error = false) {
  const box = $('#message'); box.textContent = text; box.classList.toggle('error', error); box.hidden = !text;
  box.setAttribute('role', error ? 'alert' : 'status');
}
async function api(path, payload) {
  const response = await fetch(path, payload === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editorial-CSRF': session.csrfToken }, body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) { const error = Error(data.error || 'The local request failed'); error.code = data.code; throw error; }
  return data;
}
const taskLabel = task => session.tasks.find(item => item.id === task)?.label || task;
function renderSession() {
  const names = { total: 'Candidates', published: 'Published sources', unpublished: 'Unpublished sources', validation: 'Structural findings', identity: 'Identity queue', decisions: 'Decision history' };
  $('#counts').replaceChildren(...Object.entries(names).map(([key, label]) => {
    const card = el('div', undefined, 'count'); card.append(el('strong', session.counts[key].toLocaleString()), el('span', label)); return card;
  }));
  $('#repository').textContent = session.repository + ' · ' + session.gitHead + ' · Refreshed ' + new Date(session.refreshedAt).toLocaleString();
  const language = $('#language').value;
  $('#language').replaceChildren(new Option('All languages', ''), ...session.languages.map(item => new Option(item, item)));
  $('#language').value = language;
  $('#coverage').replaceChildren(...Object.entries(session.coverage).map(([key, count]) => el('span', key + ': ' + count.toLocaleString() + ' / ' + session.counts.total.toLocaleString())));
  $('#read-errors').replaceChildren(...session.readErrors.map(item => el('li', item.path + ': ' + item.message)));
}
function saveNoteDraft() {
  if (selected && $('#task').value) drafts.set(selected.candidateId + ':' + $('#task').value, $('#notes').value);
}
function busy(value) {
  loading = value;
  for (const button of document.querySelectorAll('[data-decision],#refresh')) button.disabled = value;
}
async function loadInventory() {
  const request = ++inventoryRequest;
  const params = new URLSearchParams({ q: $('#query').value, queue: $('#queue').value,
    language: $('#language').value, publication: $('#publication').value, offset: String(offset), limit: '60' });
  const result = await api('/api/inventory?' + params);
  if (request !== inventoryRequest) return;
  session.revision = result.revision; total = result.total;
  $('#results-label').textContent = total ? `${offset + 1}–${Math.min(offset + result.items.length, total)} of ${total.toLocaleString()} candidates` : 'No matching candidates';
  $('#results').replaceChildren(...result.items.map(item => {
    const li = el('li'), button = el('button', undefined, 'result'); button.type = 'button';
    button.dataset.candidateId = item.candidateId;
    button.classList.toggle('selected', item.candidateId === selected?.candidateId);
    button.setAttribute('aria-pressed', String(item.candidateId === selected?.candidateId));
    const title = el('span', item.title, 'result-title'); title.dir = 'auto';
    button.append(title, el('span', item.alternateTitle, 'result-alternate'),
      el('span', [item.language, item.published ? 'Published' : 'Unpublished', labels[item.overall]].filter(Boolean).join(' · '), 'result-status'));
    button.addEventListener('click', () => openSource(item.candidateId).catch(error => message(error.message, true)));
    li.append(button); return li;
  }));
  $('#previous').disabled = offset === 0; $('#next').disabled = offset + 60 >= total;
}
function renderEditions(target, record) {
  const original = el('section', undefined, 'edition');
  original.dir = record.metadata.direction === 'rtl' ? 'rtl' : 'ltr';
  original.lang = record.metadata.lang || 'und';
  original.append(el('h4', record.language || 'Original'),
    record.original.trim() ? el('pre', record.original) : el('p', 'No original-language body', 'edition-empty'));
  const roman = el('section', undefined, 'edition'); roman.dir = 'ltr';
  roman.append(el('h4', record.language === 'English' ? 'Roman · Not applicable' : 'Roman transcription'),
    record.roman.trim() ? el('pre', record.roman) : el('p', record.language === 'English' ? 'English is the original reading.' : 'No Roman transcription', 'edition-empty'));
  target.replaceChildren(original, roman);
}
function renderTask() {
  if (!selected) return;
  const task = $('#task').value, pass = selected.passes[task];
  $('#decision-state').textContent = labels[pass.status]; $('#decision-state').className = 'badge ' + pass.status;
  $('#decision-context').textContent = pass.reasons?.length ? pass.reasons.join('. ') + '. Earlier notes remain in history.' :
    pass.decision ? 'Last decision: ' + new Date(pass.decision.at).toLocaleString() :
      task === 'publication' ? 'Accept the other applicable passes and resolve structural/identity errors first.' : 'Inspect this pass and leave a concrete note.';
  $('#notes').value = drafts.get(selected.candidateId + ':' + task) ?? pass.decision?.notes ?? '';
  $('#pass-list').replaceChildren(...Object.entries(selected.passes).map(([id, value]) => {
    const button = el('button', taskLabel(id) + ' · ' + labels[value.status]); button.type = 'button';
    button.classList.toggle('current', id === task);
    button.addEventListener('click', () => { saveNoteDraft(); $('#task').value = id; renderTask(); }); return button;
  }));
}
function renderSelected() {
  $('#empty-review').hidden = true; $('#selected-review').hidden = false;
  $('#source-state').textContent = (selected.published ? 'Published source' : 'Unpublished source') + ' · ' + (selected.language || 'Language needs review');
  $('#source-title').textContent = selected.title; $('#source-alternate').textContent = selected.alternateTitle;
  $('#source-path').textContent = selected.path;
  $('#source-identity').textContent = selected.permanentId ? 'Permanent work ID: ' + selected.permanentId : 'Local candidate identity · assign a permanent source ID before publication acceptance';
  $('#source-moves').textContent = selected.previousPaths.length ? 'Previous paths: ' + selected.previousPaths.join(', ') : '';
  const oldTask = $('#task').value;
  $('#task').replaceChildren(...Object.keys(selected.passes).map(task => new Option(taskLabel(task), task)));
  if (selected.passes[oldTask]) $('#task').value = oldTask;
  renderTask();
  $('#findings-summary').textContent = selected.findings.length + ' source findings';
  $('#findings-list').replaceChildren(...selected.findings.map(finding => {
    const li = el('li', undefined, finding.severity); li.append(el('span', finding.code, 'finding-code'), document.createTextNode(finding.detail)); return li;
  }));
  if (!selected.findings.length) $('#findings-list').append(el('li', 'No mechanical findings. Review the reading and metadata directly.'));
  renderEditions($('#source-editions'), selected);
  $('#metadata').replaceChildren(...Object.entries(selected.metadata).filter(([key]) => key !== 'romanLyrics').flatMap(([key, value]) =>
    [el('dt', key), el('dd', typeof value === 'string' ? value : JSON.stringify(value))]));
  $('#raw-source').textContent = selected.raw;
  $('#history').replaceChildren(...selected.history.map(item => {
    const li = el('li'); li.append(el('strong', taskLabel(item.task) + ' · ' + labels[item.status]),
      el('div', new Date(item.at).toLocaleString() + ' · ' + item.pathAtReview, 'path'), el('p', item.notes)); return li;
  }));
  if (!selected.history.length) $('#history').append(el('li', 'No human decisions recorded in this workspace.'));
}
async function openSource(id) {
  saveNoteDraft(); const request = ++sourceRequest;
  const record = await api('/api/source?id=' + encodeURIComponent(id));
  if (request !== sourceRequest) return;
  selected = record;
  // Keep the revision from the opened record for conflict detection even when
  // another tab later refreshes the inventory and advances the global revision.
  if (comparison?.candidateId === id) clearComparison();
  renderSelected(); message('');
  for (const button of document.querySelectorAll('.result')) {
    const active = button.dataset.candidateId === selected.candidateId;
    button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
  }
}
async function chooseComparison(id) {
  if (id === selected.candidateId) return;
  const request = ++comparisonRequest;
  const result = await api('/api/source?id=' + encodeURIComponent(id));
  if (request !== comparisonRequest) return;
  comparison = result;
  $('#comparison-title').textContent = result.title;
  $('#comparison-path').textContent = result.path;
  renderEditions($('#comparison-editions'), result);
  $('#comparison-panel').hidden = false; $('#work-readers').classList.add('comparing');
  $('#comparison-evidence-label').hidden = false; $('#comparison-evidence').checked = true;
  $('#compare-clear').hidden = false; $('#compare-results').replaceChildren();
}
function clearComparison() {
  comparisonRequest++; comparisonSearchRequest++; comparison = null;
  $('#comparison-panel').hidden = true; $('#work-readers').classList.remove('comparing');
  $('#comparison-evidence-label').hidden = true; $('#compare-clear').hidden = true;
}
async function findComparison() {
  const request = ++comparisonSearchRequest;
  const result = await api('/api/inventory?' + new URLSearchParams({ q: $('#compare-query').value, limit: '12' }));
  if (request !== comparisonSearchRequest) return;
  $('#compare-results').replaceChildren(...result.items.filter(item => item.candidateId !== selected?.candidateId).map(item => {
    const li = el('li'), button = el('button', item.title + (item.alternateTitle ? ' · ' + item.alternateTitle : ''));
    button.type = 'button'; button.dir = 'auto'; button.addEventListener('click', () => chooseComparison(item.candidateId).catch(error => message(error.message, true)));
    li.append(button); return li;
  }));
  if (!$('#compare-results').children.length) $('#compare-results').append(el('li', 'No other matching candidates.'));
}
async function saveDecision(status) {
  if (!selected || loading) return;
  const target = selected, task = $('#task').value, notes = $('#notes').value;
  saveNoteDraft(); busy(true); message('Saving this human decision…');
  try {
    const result = await api('/api/decisions', {
      candidateId: target.candidateId, task, status, notes,
      expectedRevision: target.revision, expectedContentHash: target.rawHash, rulesVersion: target.rulesVersion,
      comparisons: comparison && $('#comparison-evidence').checked ? [{ candidateId: comparison.candidateId, fingerprint: comparison.fingerprint }] : [],
    });
    // The editor remains usable while the ledger write is pending. Clear only
    // the submitted draft; a newer note typed during that request must survive.
    const draftKey = target.candidateId + ':' + task;
    if (drafts.get(draftKey) === notes) drafts.delete(draftKey);
    if (selected?.candidateId === target.candidateId) { selected = result.source; renderSelected(); }
    const token = session.csrfToken; session = { ...await api('/api/session'), csrfToken: token }; renderSession();
    await loadInventory(); message(taskLabel(task) + ': ' + labels[status] + '. Decision saved; source and publication are unchanged.');
  } catch (error) { message(error.message + ' Your note is still here.', true); }
  finally { busy(false); }
}
async function refreshCorpus() {
  if (loading) return;
  saveNoteDraft(); busy(true); message('Refreshing source files and checking previous decisions…');
  try {
    const token = session.csrfToken; session = { ...await api('/api/refresh', {}), csrfToken: token };
    renderSession(); offset = 0; await loadInventory();
    if (selected) await openSource(selected.candidateId);
    if (comparison) await chooseComparison(comparison.candidateId);
    message('Corpus refreshed. Changed content or editorial rules require a new decision.');
  } catch (error) { message(error.message, true); }
  finally { busy(false); }
}
let searchTimer;
$('#filters').addEventListener('submit', event => event.preventDefault());
$('#query').addEventListener('input', () => {
  clearTimeout(searchTimer); searchTimer = setTimeout(() => { offset = 0; loadInventory().catch(error => message(error.message, true)); }, 220);
});
for (const id of ['queue', 'language', 'publication']) $('#' + id).addEventListener('change', () => { offset = 0; loadInventory().catch(error => message(error.message, true)); });
$('#previous').addEventListener('click', () => { offset = Math.max(0, offset - 60); loadInventory().catch(error => message(error.message, true)); });
$('#next').addEventListener('click', () => { offset += 60; loadInventory().catch(error => message(error.message, true)); });
$('#task').addEventListener('change', renderTask);
$('#notes').addEventListener('input', saveNoteDraft);
for (const button of document.querySelectorAll('[data-decision]')) button.addEventListener('click', () => saveDecision(button.dataset.decision));
$('#compare-search').addEventListener('click', () => findComparison().catch(error => message(error.message, true)));
$('#compare-query').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); findComparison().catch(error => message(error.message, true)); } });
$('#compare-clear').addEventListener('click', clearComparison);
$('#refresh').addEventListener('click', refreshCorpus);
$('#rules-open').addEventListener('click', async () => {
  try { const rules = await api('/api/rules'); $('#rules-content').textContent = rules.content; $('#rules-dialog').showModal(); }
  catch (error) { message(error.message, true); }
});
$('#rules-close').addEventListener('click', () => $('#rules-dialog').close());
try { session = await api('/api/session'); renderSession(); await loadInventory(); }
catch (error) { message(error.message, true); }
