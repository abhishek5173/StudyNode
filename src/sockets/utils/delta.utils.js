const Delta = require("quill-delta");

function applyDeltaToDoc(currentDelta, incomingDelta) {
  // currentDelta and incomingDelta are plain objects like { ops: [...] }
  const a = new Delta(currentDelta.ops || []);
  const b = new Delta(incomingDelta.ops || []);
  const result = a.compose(b); // apply b onto a
  return { ops: result.ops };
}

module.exports = { applyDeltaToDoc };
