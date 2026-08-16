/**
 * Headless visual check for the Pass & Play handoff overlay.
 * Uses the system Edge (Chromium) via playwright-core.
 *
 * Run: node scripts/visual-handoff-check.mjs
 * Requires: `npm run dev` running on :3000.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const EDGE =
  process.env.EDGE_PATH ||
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:3000';
const OUT = 'scripts/.shots';
mkdirSync(OUT, { recursive: true });

let failures = 0;
const log = (ok, label) => {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL:'} ${label}`);
  if (!ok) failures += 1;
};

// A playing game state seeded into zustand persist storage.
function seedState() {
  return JSON.stringify({
    state: {
      gamePhase: 'playing',
      players: [
        { id: 'p1', name: 'Alice', token: '🚗', cash: 1500, position: 5, inJail: false, jailTurns: 0, isBankrupt: false, properties: [], getOutOfJailCards: 0 },
        { id: 'p2', name: 'Bob', token: '🎩', cash: 1250, position: 20, inJail: false, jailTurns: 0, isBankrupt: false, properties: [1], getOutOfJailCards: 1 },
      ],
      currentPlayerIndex: 0,
      dice: [3, 4],
      isRolling: false,
      isMoving: false,
      movingPlayerId: null,
      movingStep: 0,
      hasRolled: true, // End Turn button visible
      consecutiveDoubles: 0,
      message: "Alice's turn. Roll the dice!",
      properties: { 1: { owner: 'p2', houses: 0, isMortgaged: false } },
      transactionPopup: null,
      winner: null,
      showDebtResolution: false,
      debtAmount: 0,
      debtOwedTo: null,
      chanceDeck: [],
      communityChestDeck: [],
      pendingCard: null,
      freeParkingPot: 150,
      trade: null,
      auction: null,
      handoff: null,
    },
    version: 0,
  });
}

async function runViewport(browser, name, width, height, shotTag) {
  console.log(`\n=== ${name} (${width}x${height}) ===`);
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  // Seed the persisted game before any script runs.
  await page.addInitScript((state) => {
    localStorage.setItem('monopoly-game-storage', state);
  }, seedState());

  await page.goto(`${BASE}/game`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Game Control');

  log(true, 'game page loaded');

  // --- Before handoff: HUD cash is visible ---
  const cashVisibleBefore = await page
    .locator('text=$1500')
    .first()
    .isVisible()
    .catch(() => false);
  log(cashVisibleBefore, 'HUD cash visible before handoff');

  // --- Click End Turn ---
  await page.getByRole('button', { name: 'End Turn' }).first().click();
  await page.waitForSelector("text=I'm Ready");
  log(true, 'handoff overlay appeared after End Turn');

  // Overlay must cover the entire viewport.
  const rect = await page.evaluate(() => {
    const el = document.querySelector('.fixed.inset-0');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.x, y: r.y, w: r.width, h: r.height,
      iw: window.innerWidth, ih: window.innerHeight,
    };
  });
  log(
    rect && Math.round(rect.x) === 0 && Math.round(rect.y) === 0 &&
      Math.round(rect.w) >= Math.round(rect.iw) && Math.round(rect.h) >= Math.round(rect.ih),
    `overlay covers viewport (${rect?.w}x${rect?.h} vs ${rect?.iw}x${rect?.ih})`
  );

  // Overlay background must be opaque (hides the board behind it).
  // Tailwind v4 reports colors as oklab(.../0.95) — parse the alpha slot.
  const { color, alpha } = await page.evaluate(() => {
    const el = document.querySelector('.fixed.inset-0');
    if (!el) return { color: '', alpha: -1 };
    const bg = getComputedStyle(el).backgroundColor;
    const m = bg.match(/\/\s*([\d.]+)\s*\)\s*$/);
    const a = m ? parseFloat(m[1]) : bg.startsWith('rgba(') ? parseFloat(bg.split(',')[3]) : 1;
    return { color: bg, alpha: a };
  });
  log(alpha >= 0.9, `overlay background opaque (alpha ${alpha}, ${color})`);

  // The board/HUD must NOT be the topmost element while the overlay shows:
  // whatever is under the sample point must belong to the overlay itself.
  const hudCovered = await page.evaluate(() => {
    const overlay = document.querySelector('.fixed.inset-0');
    if (!overlay) return false;
    const el = document.elementFromPoint(window.innerWidth - 120, 260);
    return el ? overlay.contains(el) : false;
  });
  log(hudCovered, 'board/HUD content covered by the overlay');

  // No horizontal overflow while overlay is up.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  log(overflow <= 0, `no horizontal overflow (scrollWidth diff ${overflow})`);

  // Button must fit inside the viewport.
  const btnBox = await page
    .getByRole('button', { name: "I'm Ready" })
    .boundingBox();
  log(
    btnBox && btnBox.x >= 0 && btnBox.y >= 0 &&
      btnBox.x + btnBox.width <= width && btnBox.y + btnBox.height <= height,
    'Start Turn button fits in viewport'
  );

  await page.screenshot({ path: `${OUT}/${shotTag}-handoff.png` });
  log(true, `screenshot saved: ${OUT}/${shotTag}-handoff.png`);

  // --- Dismiss the handoff ---
  await page.getByRole('button', { name: "I'm Ready" }).click();
  await page.waitForTimeout(400);
  const gone = await page.locator("text=I'm Ready").count();
  log(gone === 0, 'handoff dismissed after tapping Start Turn');
  const cashVisibleAfter = await page
    .locator('text=$1500')
    .first()
    .isVisible()
    .catch(() => false);
  log(cashVisibleAfter, 'HUD cash visible again after handoff');
  await page.screenshot({ path: `${OUT}/${shotTag}-after.png` });

  await context.close();
}

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
try {
  await runViewport(browser, 'Desktop', 1280, 800, 'desktop');
  await runViewport(browser, 'iPad Portrait', 768, 1024, 'ipad-portrait');
  await runViewport(browser, 'iPad Landscape', 1024, 768, 'ipad-landscape');
} finally {
  await browser.close();
}

console.log(
  failures === 0 ? '\nAll visual checks passed ✅' : `\n${failures} visual check(s) FAILED ❌`
);
process.exit(failures === 0 ? 0 : 1);
