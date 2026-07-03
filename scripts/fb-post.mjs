#!/usr/bin/env node
/**
 * Facebook Page auto-post CLI (MVP).
 *
 * Usage:
 *   export FB_PAGE_ACCESS_TOKEN='EAAT...'
 *   export FB_PAGE_ID='153033261562809'
 *
 *   # text-only
 *   node scripts/fb-post.mjs --text "hello world"
 *
 *   # text + single image (path or URL)
 *   node scripts/fb-post.mjs --text "look at this" --image public/marketing/dashboard.png
 *   node scripts/fb-post.mjs --text "look" --image https://example.com/pic.jpg
 *
 *   # carousel (multiple images)
 *   node scripts/fb-post.mjs --text "5 tips" --images pic1.png,pic2.png,pic3.png
 *
 *   # video / clip (mp4, mov)
 *   node scripts/fb-post.mjs --text "quick demo" --video demo.mp4 --title "Lumenfi 30s"
 *   node scripts/fb-post.mjs --video https://cdn.example.com/clip.mp4
 *
 *   # dry-run (validate + preview, no publish)
 *   node scripts/fb-post.mjs --text "test" --dry-run
 *
 * Notes:
 * - Videos post to /{page}/videos and process ASYNC. `id` returned right away
 *   but the video may take 30s-few minutes to be publicly viewable.
 * - For Reels (vertical 9:16 short-form) use the /video_reels endpoint —
 *   different flow with upload session, not yet supported in this script.
 * - Max video size for single-request: 1GB. Larger needs Resumable Upload.
 */

import fs from 'node:fs';
import path from 'node:path';

const GRAPH = 'https://graph.facebook.com/v19.0';
const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FB_PAGE_ID;

if (!TOKEN) {
  console.error('❌ Missing FB_PAGE_ACCESS_TOKEN env');
  process.exit(1);
}
if (!PAGE_ID) {
  console.error('❌ Missing FB_PAGE_ID env');
  process.exit(1);
}

// ── CLI parsing ─────────────────────────────────────────────
const argv = process.argv.slice(2);
function getArg(name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : null;
}
const hasFlag = (name) => argv.includes(`--${name}`);

const text = getArg('text') ?? '';
const image = getArg('image');
const imagesCsv = getArg('images');
const video = getArg('video');
const videoTitle = getArg('title') ?? '';
const dryRun = hasFlag('dry-run');

if (!text && !image && !imagesCsv && !video) {
  console.error('❌ Need at least one of: --text, --image, --images, --video');
  process.exit(1);
}

const images = imagesCsv ? imagesCsv.split(',').map((s) => s.trim()).filter(Boolean) : [];
if (image && images.length === 0) images.push(image);

console.log('─────────────────────────────────────');
console.log('📘 Facebook post');
console.log('─────────────────────────────────────');
console.log('Page ID:', PAGE_ID);
console.log('Text:', JSON.stringify(text.slice(0, 80) + (text.length > 80 ? '…' : '')));
if (video) console.log('Video:', video.startsWith('http') ? 'URL' : path.basename(video), videoTitle ? `(title: "${videoTitle}")` : '');
else console.log('Images:', images.length, images.length ? `(${images.map((i) => (i.startsWith('http') ? 'URL' : path.basename(i))).join(', ')})` : '');
console.log('Mode:', dryRun ? 'DRY-RUN (no publish)' : 'LIVE');
console.log('─────────────────────────────────────');

if (dryRun) {
  console.log('✓ Validation OK. Remove --dry-run to publish.');
  process.exit(0);
}

// ── Upload a single image (returns photo id) ────────────────
async function uploadPhoto(source, { published = false } = {}) {
  const url = `${GRAPH}/${PAGE_ID}/photos`;
  const params = new URLSearchParams();
  params.set('access_token', TOKEN);
  params.set('published', String(published));

  // URL vs local file
  if (source.startsWith('http://') || source.startsWith('https://')) {
    params.set('url', source);
    const res = await fetch(url, { method: 'POST', body: params });
    const body = await res.json();
    if (!res.ok) throw new Error(`upload URL failed: ${JSON.stringify(body)}`);
    return body.id;
  }

  const filePath = path.resolve(source);
  if (!fs.existsSync(filePath)) throw new Error(`file not found: ${filePath}`);

  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.set('access_token', TOKEN);
  form.set('published', String(published));
  const blob = new Blob([buffer]);
  form.set('source', blob, path.basename(filePath));

  const res = await fetch(url, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok) throw new Error(`upload file failed: ${JSON.stringify(body)}`);
  return body.id;
}

// ── Text-only feed post ─────────────────────────────────────
async function postText() {
  const url = `${GRAPH}/${PAGE_ID}/feed`;
  const params = new URLSearchParams();
  params.set('access_token', TOKEN);
  params.set('message', text);
  const res = await fetch(url, { method: 'POST', body: params });
  const body = await res.json();
  if (!res.ok) throw new Error(`feed post failed: ${JSON.stringify(body)}`);
  return body.id;
}

// ── Single image post (published inline) ────────────────────
async function postSingleImage() {
  const url = `${GRAPH}/${PAGE_ID}/photos`;
  const source = images[0];
  const params = new URLSearchParams();
  params.set('access_token', TOKEN);
  if (text) params.set('caption', text);

  if (source.startsWith('http')) {
    params.set('url', source);
    const res = await fetch(url, { method: 'POST', body: params });
    const body = await res.json();
    if (!res.ok) throw new Error(`single image post failed: ${JSON.stringify(body)}`);
    return body.post_id || body.id;
  }

  const filePath = path.resolve(source);
  if (!fs.existsSync(filePath)) throw new Error(`file not found: ${filePath}`);
  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.set('access_token', TOKEN);
  if (text) form.set('caption', text);
  form.set('source', new Blob([buffer]), path.basename(filePath));
  const res = await fetch(url, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok) throw new Error(`single image post failed: ${JSON.stringify(body)}`);
  return body.post_id || body.id;
}

// ── Carousel: upload each unpublished, then attach to /feed ─
async function postCarousel() {
  const photoIds = [];
  for (const src of images) {
    const id = await uploadPhoto(src, { published: false });
    photoIds.push(id);
    console.log('  ✓ uploaded', src, '→', id);
  }

  const url = `${GRAPH}/${PAGE_ID}/feed`;
  const params = new URLSearchParams();
  params.set('access_token', TOKEN);
  if (text) params.set('message', text);
  photoIds.forEach((id, i) => {
    params.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }));
  });

  const res = await fetch(url, { method: 'POST', body: params });
  const body = await res.json();
  if (!res.ok) throw new Error(`carousel post failed: ${JSON.stringify(body)}`);
  return body.id;
}

// ── Video post — /{page}/videos endpoint ────────────────────
async function postVideo() {
  const url = `${GRAPH}/${PAGE_ID}/videos`;
  const source = video;

  // URL upload path — FB fetches the video
  if (source.startsWith('http')) {
    const params = new URLSearchParams();
    params.set('access_token', TOKEN);
    params.set('file_url', source);
    if (text) params.set('description', text);
    if (videoTitle) params.set('title', videoTitle);
    const res = await fetch(url, { method: 'POST', body: params });
    const body = await res.json();
    if (!res.ok) throw new Error(`video post (URL) failed: ${JSON.stringify(body)}`);
    return body.id;
  }

  // Local file upload — multipart
  const filePath = path.resolve(source);
  if (!fs.existsSync(filePath)) throw new Error(`file not found: ${filePath}`);
  const stat = fs.statSync(filePath);
  console.log(`  📼 uploading ${(stat.size / 1024 / 1024).toFixed(1)}MB…`);
  if (stat.size > 1024 * 1024 * 1024) {
    throw new Error('File > 1GB — needs Resumable Upload API (not implemented in this MVP)');
  }

  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.set('access_token', TOKEN);
  if (text) form.set('description', text);
  if (videoTitle) form.set('title', videoTitle);
  form.set('source', new Blob([buffer]), path.basename(filePath));

  const res = await fetch(url, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok) throw new Error(`video post failed: ${JSON.stringify(body)}`);
  return body.id;
}

// ── Main ─────────────────────────────────────────────────────
try {
  let postId;
  if (video) {
    postId = await postVideo();
    console.log('✅ Video queued for processing:', postId);
    console.log('   (may take 30s–few min to be publicly viewable)');
    console.log('🔗 https://facebook.com/' + PAGE_ID + '/videos/' + postId);
  } else if (images.length === 0) {
    postId = await postText();
    console.log('✅ Published:', postId);
    console.log('🔗 https://facebook.com/' + postId);
  } else if (images.length === 1) {
    postId = await postSingleImage();
    console.log('✅ Published:', postId);
    console.log('🔗 https://facebook.com/' + postId);
  } else {
    postId = await postCarousel();
    console.log('✅ Published:', postId);
    console.log('🔗 https://facebook.com/' + postId);
  }
} catch (err) {
  console.error('❌', err.message);
  process.exit(1);
}
