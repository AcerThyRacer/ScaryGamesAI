#!/usr/bin/env node
'use strict';

// Minimal "fast start" MP4 fixer (like qtfaststart):
// Moves the top-level `moov` box before `mdat` and patches `stco`/`co64` chunk offsets.
// This is required for instant playback/streaming; otherwise many browsers must download most of the file first.

const fs = require('fs');
const path = require('path');

function readU32BE(buf, off) {
  return buf.readUInt32BE(off);
}

function readU64BE(buf, off) {
  const hi = buf.readUInt32BE(off);
  const lo = buf.readUInt32BE(off + 4);
  // Safe for our file sizes (< 2^53)
  return hi * 2 ** 32 + lo;
}

function writeU32BE(buf, off, val) {
  buf.writeUInt32BE(val >>> 0, off);
}

function writeU64BE(buf, off, val) {
  const hi = Math.floor(val / 2 ** 32) >>> 0;
  const lo = (val >>> 0);
  buf.writeUInt32BE(hi, off);
  buf.writeUInt32BE(lo, off + 4);
}

function parseBoxHeader(buf, off) {
  if (off + 8 > buf.length) return null;
  let size = readU32BE(buf, off);
  const type = buf.toString('ascii', off + 4, off + 8);
  let headerSize = 8;
  if (size === 1) {
    if (off + 16 > buf.length) return null;
    size = readU64BE(buf, off + 8);
    headerSize = 16;
  } else if (size === 0) {
    size = buf.length - off; // to EOF
  }
  if (size < headerSize) return null;
  return { size, type, headerSize };
}

function parseTopLevelBoxes(buf) {
  const boxes = [];
  let off = 0;
  while (off + 8 <= buf.length) {
    const h = parseBoxHeader(buf, off);
    if (!h) break;
    boxes.push({ ...h, start: off, end: off + h.size });
    off += h.size;
  }
  return boxes;
}

function isContainerBox(type) {
  // Enough to reach stco/co64 inside moov.
  return new Set([
    'moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'udta',
    'mvex', 'moof', 'traf', 'mfra', 'tref', 'ipro', 'sinf', 'schi',
    'meta', 'ilst',
  ]).has(type);
}

function patchChunkOffsetsInMoov(moovBuf, delta) {
  // Work on a copy so we can rewrite in-place.
  const out = Buffer.from(moovBuf);

  // Stack of { start, end } ranges to parse as box lists.
  const stack = [];

  // Parse children of moov (skip moov header).
  const moovHeader = parseBoxHeader(out, 0);
  if (!moovHeader || moovHeader.type !== 'moov') return out;
  stack.push({ start: moovHeader.headerSize, end: moovHeader.size });

  while (stack.length) {
    const range = stack.pop();
    let off = range.start;
    while (off + 8 <= range.end && off + 8 <= out.length) {
      const h = parseBoxHeader(out, off);
      if (!h) break;
      const boxStart = off;
      const boxEnd = off + h.size;
      if (boxEnd > range.end || boxEnd > out.length) break;

      if (h.type === 'stco') {
        // Full box: version(1) + flags(3) + entry_count(4) + offsets(4*n)
        const payload = boxStart + h.headerSize;
        const countOff = payload + 4; // version+flags
        if (countOff + 4 <= boxEnd) {
          const entryCount = readU32BE(out, countOff);
          let cur = countOff + 4;
          for (let i = 0; i < entryCount; i++) {
            if (cur + 4 > boxEnd) break;
            const v = readU32BE(out, cur);
            writeU32BE(out, cur, v + delta);
            cur += 4;
          }
        }
      } else if (h.type === 'co64') {
        // Full box: version+flags + entry_count + offsets(8*n)
        const payload = boxStart + h.headerSize;
        const countOff = payload + 4;
        if (countOff + 4 <= boxEnd) {
          const entryCount = readU32BE(out, countOff);
          let cur = countOff + 4;
          for (let i = 0; i < entryCount; i++) {
            if (cur + 8 > boxEnd) break;
            const v = readU64BE(out, cur);
            writeU64BE(out, cur, v + delta);
            cur += 8;
          }
        }
      } else if (isContainerBox(h.type)) {
        // Special-case: meta is a FullBox, so children start after version+flags.
        let childStart = boxStart + h.headerSize;
        if (h.type === 'meta') childStart += 4;
        if (childStart < boxEnd) {
          stack.push({ start: childStart, end: boxEnd });
        }
      }

      off = boxEnd;
    }
  }

  return out;
}

function faststartFile(inPath) {
  const buf = fs.readFileSync(inPath);
  const boxes = parseTopLevelBoxes(buf);
  const moov = boxes.find(b => b.type === 'moov');
  const mdat = boxes.find(b => b.type === 'mdat');
  if (!moov || !mdat) {
    console.warn(`[faststart] skipping (missing moov/mdat): ${inPath}`);
    return false;
  }
  if (moov.start < mdat.start) {
    console.log(`[faststart] already faststart: ${inPath}`);
    return false;
  }

  const delta = moov.size; // inserted before mdat
  const moovBuf = buf.subarray(moov.start, moov.end);
  const patchedMoov = patchChunkOffsetsInMoov(moovBuf, delta);

  const beforeMdat = buf.subarray(0, mdat.start);
  const fromMdatToMoov = buf.subarray(mdat.start, moov.start);
  const afterMoov = buf.subarray(moov.end);

  const outBuf = Buffer.concat([beforeMdat, patchedMoov, fromMdatToMoov, afterMoov]);
  const tmp = `${inPath}.faststart.tmp`;
  fs.writeFileSync(tmp, outBuf);
  fs.renameSync(tmp, inPath);
  console.log(`[faststart] rewritten: ${inPath}`);
  return true;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/faststart-mp4.js <file1.mp4> <file2.mp4> ...');
    process.exit(2);
  }

  let changed = 0;
  for (const p of args) {
    const inPath = path.resolve(p);
    if (!fs.existsSync(inPath)) {
      console.warn(`[faststart] missing: ${inPath}`);
      continue;
    }
    try {
      if (faststartFile(inPath)) changed++;
    } catch (e) {
      console.error(`[faststart] failed: ${inPath}: ${e && e.message ? e.message : e}`);
    }
  }
  process.exit(0);
}

main();

