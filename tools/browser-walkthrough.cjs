// Run against npm run dev or npm run preview. Pass the installed playwright module
// path as argv[2] when using a temporary Playwright installation.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const status = page.getByRole('status');
  const waitStatus = (text) =>
    page.waitForFunction(
      (value) =>
        document.querySelector('[role=status]')?.textContent.includes(value),
      text,
      { timeout: 15000 }
    );
  try {
    await page.goto(process.argv[3] || 'http://localhost:4200');
    await waitStatus('Ready');
    await page.getByLabel('rounds:').fill('0');
    assert.equal(await page.getByRole('alert').count(), 1);
    assert.equal(
      await page
        .getByRole('button', { name: 'Start', exact: true })
        .isDisabled(),
      true
    );
    await page.getByLabel('exercise time ms:').fill('');
    await page.getByLabel('rounds:').fill('2');
    assert.equal(await page.getByRole('alert').count(), 1);
    await page.getByLabel('exercise time ms:').fill('700');
    await page.getByLabel('rest time ms:').fill('500');
    assert.equal(await page.getByRole('alert').count(), 0);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await waitStatus('Preparation');
    for (const label of ['rounds:', 'exercise time ms:', 'rest time ms:']) {
      assert.equal(await page.getByLabel(label).isDisabled(), true);
    }
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await waitStatus('Paused');
    const paused = await status.textContent();
    await page.waitForTimeout(400);
    assert.equal(await status.textContent(), paused);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await waitStatus('Round 1 of 2: exercise');
    await waitStatus('Round 1 of 2: rest');
    await waitStatus('Round 2 of 2: exercise');
    await waitStatus('Completed');
    assert.equal(await page.getByLabel('rounds:').inputValue(), '2');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await waitStatus('Ready');
    assert.equal(
      await page.getByLabel('exercise time ms:').inputValue(),
      '700'
    );
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    // Block this actual page's event loop across preparation and first exercise.
    await page.evaluate(() => {
      const until = performance.now() + 3800;
      while (performance.now() < until) {
        /* deliberate delayed callback */
      }
    });
    await waitStatus('Round 1 of 2: rest');
    await waitStatus('Completed');
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          browser: await browser.version(),
          passed: [
            'invalid and incomplete drafts',
            'settings lock',
            'preparation',
            'paused progress',
            'resume',
            'ordinal exercise/rest rounds',
            'completion versus stop',
            'preserved settings',
            'delayed callback catch-up',
          ],
          pageErrors: errors,
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
