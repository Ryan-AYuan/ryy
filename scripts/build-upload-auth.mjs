#!/usr/bin/env node
/**
 * Encrypt GITHUB_PUSH_TOKEN with family aliases and write upload-auth.js.
 * Usage: node scripts/build-upload-auth.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
const outPath = path.join(root, 'upload-auth.js');

function loadEnv(file) {
    const env = {};
    if (!fs.existsSync(file)) return env;
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#') || !line.includes('=')) continue;
        const idx = line.indexOf('=');
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        env[key] = value;
    }
    return env;
}

function encryptWithPin(pin, plaintext) {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    return {
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        data: encrypted.toString('base64'),
    };
}

const env = loadEnv(envPath);
const token = (env.GITHUB_PUSH_TOKEN || env.GITHUB_TOKEN || '').trim();
if (!token) {
    console.error('Missing GITHUB_PUSH_TOKEN in .env');
    process.exit(1);
}

const aliases = (env.UPLOAD_ALIASES || '9777,2347')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

if (aliases.length === 0) {
    console.error('UPLOAD_ALIASES is empty');
    process.exit(1);
}

const vault = {};
for (const alias of aliases) {
    vault[alias] = encryptWithPin(alias, token);
}

const source = `window.UPLOAD_AUTH = ${JSON.stringify({ v: 1, vault }, null, 2)};\n`;
fs.writeFileSync(outPath, source);
console.log(`Wrote ${path.relative(root, outPath)} for ${aliases.length} aliases`);
