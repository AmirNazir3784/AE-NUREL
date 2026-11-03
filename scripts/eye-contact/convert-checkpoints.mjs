// FLX architecture adapted from Chih-Fan Hsu's published gaze_correction.
// Copyright 2019 Chih-Fan Hsu. BSD-3-Clause; full terms are preserved in
// public/models/eye-contact/LICENSE-FLX.txt. This conversion is modified work.
// Reproduce the published FLX inference graph in ONNX using the existing
// onnxruntime-web protobuf schema. Run against downloaded upstream checkpoints;
// never deserialize or execute upstream Python code.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import schema from '../../node_modules/onnxruntime-web/lib/onnxjs/ort-schema/protobuf/onnx.js';
const { onnx } = schema;
function varint(b, cursor) {
  let value = 0, shift = 0;
  for (;;) { const n = b[cursor.p++]; if (n === undefined || shift > 49) throw Error('Invalid varint'); value += (n & 127) * 2 ** shift; if (!(n & 128)) return value; shift += 7; }
}
function proto(b) {
  const result = {}, c = { p: 0 };
  while (c.p < b.length) {
    const tag = varint(b, c), field = tag >> 3, wire = tag & 7;
    let value;
    if (wire === 0) value = varint(b, c);
    else if (wire === 2) { const length = varint(b, c); value = b.subarray(c.p, c.p + length); c.p += length; }
    else if (wire === 5) { value = b.readUInt32LE(c.p); c.p += 4; }
    else throw Error('Unsupported checkpoint wire type');
    (result[field] ??= []).push(value);
  }
  return result;
}
function block(b, offset, length) {
  if (b[offset + length] !== 0) throw Error('Compressed checkpoint index is unsupported');
  const data = b.subarray(offset, offset + length), end = length - 4 * (data.readUInt32LE(length - 4) + 1), cursor = { p: 0 }, entries = [];
  let key = Buffer.alloc(0);
  while (cursor.p < end) {
    const shared = varint(data, cursor), added = varint(data, cursor), size = varint(data, cursor);
    key = Buffer.concat([key.subarray(0, shared), data.subarray(cursor.p, cursor.p + added)]); cursor.p += added;
    entries.push([key.toString(), data.subarray(cursor.p, cursor.p + size)]); cursor.p += size;
  }
  return entries;
}
function checkpoint(prefix) {
  const b = fs.readFileSync(prefix + '.index'), raw = fs.readFileSync(prefix + '.data-00000-of-00001'), footer = { p: b.length - 48 };
  varint(b, footer); varint(b, footer);
  const indexOffset = varint(b, footer), indexSize = varint(b, footer), tensors = new Map();
  for (const [, handle] of block(b, indexOffset, indexSize)) {
    const c = { p: 0 }, offset = varint(handle, c), size = varint(handle, c);
    for (const [name, value] of block(b, offset, size)) {
      if (!name.startsWith('warping_model/') || /Adam/.test(name)) continue;
      const entry = proto(value), shape = (proto(entry[2][0])[2] ?? []).map(dim => proto(dim)[1][0]);
      if (entry[1][0] !== 1 || (entry[3]?.[0] ?? 0) !== 0) throw Error('Expected single-shard float weights');
      const start = entry[4]?.[0] ?? 0, bytes = entry[5][0];
      if (bytes !== shape.reduce((a, n) => a * n, 1) * 4 || start + bytes > raw.length) throw Error('Invalid tensor bounds');
      const copy = Uint8Array.from(raw.subarray(start, start + bytes));
      tensors.set(name, { shape, values: new Float32Array(copy.buffer) });
    }
  }
  return tensors;
}
function convert(weights) {
  const nodes = [], initializers = []; let count = 0;
  const tensor = (name, dims, values, type = 1) => { initializers.push({ name, dims, dataType: type, ...(type === 1 ? { floatData: Array.from(values) } : { int64Data: values }) }); return name; };
  const attr = (name, value) => typeof value === 'string' ? { name, type: 3, s: Buffer.from(value) } : Array.isArray(value) ? { name, type: 7, ints: value } : Number.isInteger(value) ? { name, type: 2, i: value } : { name, type: 1, f: value };
  const op = (type, inputs, attrs = {}, output) => { const out = output ?? `v${count++}`; nodes.push({ opType: type, input: inputs, output: [out], attribute: Object.entries(attrs).map(([k, v]) => attr(k, v)) }); return out; };
  const weight = (name, convolution = false) => {
    const w = weights.get('warping_model/' + name); if (!w) throw Error('Missing ' + name);
    let dims = w.shape, values = w.values;
    if (convolution) {
      const [h, width, input, output] = dims, reordered = new Float32Array(values.length);
      for (let o = 0; o < output; o++) for (let i = 0; i < input; i++) for (let y = 0; y < h; y++) for (let x = 0; x < width; x++) reordered[((o * input + i) * h + y) * width + x] = values[((y * width + x) * input + i) * output + o];
      dims = [output, input, h, width]; values = reordered;
    }
    return tensor(name, dims, values);
  };
  const conv = (input, scope, last = false) => {
    let v = op('Conv', [input, weight(scope + (last ? '/kernel' : '/cnn/kernel'), true)], { auto_pad: 'SAME_UPPER' });
    if (!last) { v = op('Relu', [v]); v = op('BatchNormalization', [v, ...['gamma', 'beta', 'moving_mean', 'moving_variance'].map(n => weight(scope + '/bn_layer/' + n))], { epsilon: 0.00001 }); }
    return v;
  };
  const concat = inputs => op('Concat', inputs, { axis: 1 });
  const trans = (input, scope) => {
    const a = conv(input, scope + '/cnn_blk_0'), b = conv(a, scope + '/cnn_blk_1'), c = conv(concat([a, b]), scope + '/cnn_blk_2'), d = conv(concat([a, b, c]), scope + '/cnn_blk_3');
    return conv(d, scope + '/cnn_4', true);
  };
  let angle = 'angle';
  for (let i = 0; i < 3; i++) { const p = `encoder/dnn_blk_${i}/dnn`; angle = op('Relu', [op('Add', [op('MatMul', [angle, weight(p + '/kernel')]), weight(p + '/bias')])]); }
  angle = op('Reshape', [angle, tensor('angle_shape', [4], [1, 16, 1, 1], 7)]);
  angle = op('Expand', [angle, tensor('angle_extent', [4], [1, 16, 48, 64], 7)]);
  const inputs = concat(['image', 'anchors', angle]);
  let coarse = op('AveragePool', [inputs], { kernel_shape: [2, 2], strides: [2, 2] });
  coarse = op('Tanh', [trans(coarse, 'warping_module/coarse_level')]);
  coarse = op('Resize', [coarse, '', tensor('resize_scales', [4], [1, 1, 2, 2])], { mode: 'nearest', coordinate_transformation_mode: 'asymmetric', nearest_mode: 'floor' });
  coarse = op('AveragePool', [coarse], { kernel_shape: [2, 2], strides: [1, 1], pads: [0, 0, 1, 1], count_include_pad: 0 });
  const fine = trans(concat([inputs, coarse]), 'warping_module/fine_level');
  const slice = (start, end) => op('Slice', [fine, tensor(`start${start}`, [1], [start], 7), tensor(`end${end}`, [1], [end], 7), tensor(`axis${start}`, [1], [1], 7)]);
  op('Tanh', [slice(0, 2)], {}, 'flow');
  const light0 = conv(slice(2, 4), 'lcm_module/cnn_blk_0'), light1 = conv(light0, 'lcm_module/cnn_blk_1'), light2 = conv(light1, 'lcm_module/cnn_2', true);
  op('Softmax', [light2], { axis: 1 }, 'light');
  const info = (name, dims) => ({ name, type: { tensorType: { elemType: 1, shape: { dim: dims.map(dimValue => ({ dimValue })) } } } });
  const model = { irVersion: 8, producerName: 'AENural FLX checkpoint converter', opsetImport: [{ domain: '', version: 13 }], graph: { name: 'FLX gaze redirection', node: nodes, initializer: initializers, input: [info('image', [1, 3, 48, 64]), info('anchors', [1, 12, 48, 64]), info('angle', [1, 2])], output: [info('flow', [1, 2, 48, 64]), info('light', [1, 2, 48, 64])] } };
  const error = onnx.ModelProto.verify(model); if (error) throw Error(error);
  return onnx.ModelProto.encode(model).finish();
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const source = process.argv[2] ?? 'artifacts/eye-contact', destination = process.argv[3] ?? 'artifacts/eye-contact/converted';
  fs.mkdirSync(destination, { recursive: true });
  for (const eye of ['L', 'R']) {
    const weights = checkpoint(path.join(source, eye)), data = convert(weights);
    fs.writeFileSync(path.join(destination, eye + '.onnx'), data);
    console.log(eye, weights.size, data.length, crypto.createHash('sha256').update(data).digest('hex'));
  }
}
export { checkpoint, convert };
