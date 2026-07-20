import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const alphabet = "abcdefghijklmnopqrstuvwxyz234567";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest();
}

function base32NoPaddingLower(value) {
  let bits = 0;
  let accumulator = 0;
  let output = "";
  for (const byte of value) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += alphabet[(accumulator >>> bits) & 31];
    }
    accumulator &= (1 << bits) - 1;
  }
  if (bits > 0) output += alphabet[(accumulator << (5 - bits)) & 31];
  return output;
}

function uint64be(value) {
  const result = Buffer.alloc(8);
  result.writeBigUInt64BE(BigInt(value));
  return result;
}

function derive(acceptedDigest, ordinal, cellType, cellSourceText) {
  const sourceUtf8 = Buffer.from(cellSourceText, "utf8");
  const sourceDigest = sha256(sourceUtf8);
  const payload = Buffer.concat([
    Buffer.from("callysto-cell-id-v1\0", "utf8"),
    acceptedDigest,
    uint64be(ordinal),
    Buffer.from(`\0${cellType}\0`, "utf8"),
    sourceDigest,
  ]);
  const idDigest = sha256(payload);
  return {
    sourceUtf8,
    sourceDigest,
    payload,
    idDigest,
    cellId: `cly_${base32NoPaddingLower(idDigest)}`,
  };
}

const vectorUrl = new URL(
  "../../contracts/callysto-cell-id-v1-vectors.json",
  import.meta.url,
);
const document = JSON.parse(fs.readFileSync(vectorUrl, "utf8"));
assert.equal(document.algorithm, "callysto-cell-id-v1");

for (const vector of document.vectors) {
  const acceptedBytes = Buffer.from(vector.accepted_original_base64, "base64");
  assert.equal(
    acceptedBytes.length,
    vector.accepted_original_byte_length,
    vector.name,
  );
  const acceptedDigest = sha256(acceptedBytes);
  assert.equal(
    acceptedDigest.toString("hex"),
    vector.accepted_original_sha256_hex,
    vector.name,
  );
  const notebook = JSON.parse(acceptedBytes.toString("utf8"));
  const source = notebook.cells[vector.cell_ordinal].source;
  const logicalSource = Array.isArray(source) ? source.join("") : source;
  assert.equal(logicalSource, vector.cell_source_text, vector.name);
  const material = derive(
    acceptedDigest,
    vector.cell_ordinal,
    vector.cell_type,
    logicalSource,
  );
  assert.equal(
    material.sourceUtf8.toString("hex"),
    vector.cell_source_utf8_hex,
    vector.name,
  );
  assert.equal(
    material.sourceDigest.toString("hex"),
    vector.cell_source_sha256_hex,
    vector.name,
  );
  assert.equal(
    material.payload.toString("hex"),
    vector.payload_hex,
    vector.name,
  );
  assert.equal(
    material.idDigest.toString("hex"),
    vector.id_digest_hex,
    vector.name,
  );
  assert.equal(material.cellId, vector.cell_id, vector.name);
}

const parentName = document.derivation_variants.accepted_original_from_vector;
const parent = document.vectors.find((vector) => vector.name === parentName);
assert(parent);
const parentDigest = sha256(
  Buffer.from(parent.accepted_original_base64, "base64"),
);
for (const vector of document.derivation_variants.vectors) {
  const material = derive(
    parentDigest,
    vector.cell_ordinal,
    vector.cell_type,
    vector.cell_source_text,
  );
  assert.equal(
    material.payload.toString("hex"),
    vector.payload_hex,
    vector.name,
  );
  assert.equal(
    material.idDigest.toString("hex"),
    vector.id_digest_hex,
    vector.name,
  );
  assert.equal(material.cellId, vector.cell_id, vector.name);
}

const negative = document.negative_vectors[0];
const correct = document.vectors.find(
  (vector) => vector.name === negative.based_on_vector,
);
assert(correct);
assert.equal(correct.cell_id, negative.correct_cell_id);
assert.notEqual(correct.cell_id, negative.incorrect_cell_id);

console.log(
  `verified ${document.vectors.length} end-to-end and ${document.derivation_variants.vectors.length} primitive callysto-cell-id-v1 vectors`,
);
