#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');

program
  .requiredOption('-i, --input <path>', 'path to input file')
  .option('-o, --output <path>', 'path to output file')
  .option('-d, --display', 'display result in console')
  .option('-c, --cylinders', 'display number of cylinders (field cyl)')
  .option('-m, --mpg <value>', 'display only cars with mpg lower than specified', parseFloat);

program.parse(process.argv);
const options = program.opts();

function errorAndExit(msg) {
  console.error(msg);
  process.exit(1);
}

if (!options.input) {
  errorAndExit('Please, specify input file');
}

const inputPath = path.resolve(process.cwd(), options.input);
if (!fs.existsSync(inputPath)) {
  errorAndExit('Cannot find input file');
}

let raw;
try {
  raw = fs.readFileSync(inputPath, 'utf8');
} catch (e) {
  errorAndExit('Cannot find input file');
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  errorAndExit('Invalid JSON in input file');
}

if (!Array.isArray(data)) {
  if (typeof data === 'object' && data !== null) {
    data = Object.entries(data).map(([k, v]) => {
      if (typeof v === 'object' && v !== null) return Object.assign({ model: k }, v);
      return { model: k, value: v };
    });
  } else {
    data = [];
  }
}

function pickField(obj, names) {
  for (const n of names) {
    if (Object.prototype.hasOwnProperty.call(obj, n)) return obj[n];
  }
  return undefined;
}

let filtered = data;
if (typeof options.mpg === 'number' && !Number.isNaN(options.mpg)) {
  const threshold = options.mpg;
  filtered = filtered.filter(item => {
    const mpg = parseFloat(pickField(item, ['mpg', 'MPG', 'Miles_per_Gallon', 'miles_per_gallon']));
    return !Number.isNaN(mpg) && mpg < threshold;
  });
}

const lines = filtered.map(item => {
  const model = pickField(item, ['model', 'Model', 'name', 'car']) || '';
  const mpgRaw = pickField(item, ['mpg', 'MPG', 'Miles_per_Gallon', 'miles_per_gallon']);
  const mpg = (typeof mpgRaw !== 'undefined') ? mpgRaw : '';
  const cylRaw = pickField(item, ['cyl', 'Cyl', 'cylinders']);
  const cyl = (typeof cylRaw !== 'undefined') ? cylRaw : '';

  if (options.cylinders) {
    return `${model} ${cyl} ${mpg}`;
  } else {
    return `${model} ${mpg}`;
  }
});

if (!options.display && !options.output) process.exit(0);

if (options.display) {
  for (const l of lines) console.log(l);
}

if (options.output) {
  try {
    fs.writeFileSync(path.resolve(process.cwd(), options.output), lines.join('\n'), 'utf8');
  } catch (e) {
    console.error('Error writing output file:', e.message);
    process.exit(1);
  }
}
