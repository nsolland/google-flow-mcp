import { logger } from '../utils/logger.js';
import { get } from '../utils/config.js';
import { FlowError, ErrorCodes } from '../utils/errors.js';
import { takeScreenshot } from '../utils/screenshots.js';
import { getPage } from './connect.js';

const EXPECTED_ACCOUNT = get('expectedAccount', 'your-email@gmail.com');

export async function verifyAccount() {
  const page = getPage();
  const currentUrl = page.url();
  // Landing page is not the authenticated Flow editor.
  if (!EXPECTED_ACCOUNT || !EXPECTED_ACCOUNT.includes('@')
      || /flow\.google\.com\/about|accounts\.google\.com/i.test(currentUrl)) {
    return { verified: false, account: null, method: 'login_required' };
  }

  logger.info('Verifying Google account on Flow', { expectedAccount: EXPECTED_ACCOUNT });

  try {
    // Check the page for account indicators
    // Method 1: Look at Google account picker/chip
    const accountChip = await page.$('[data-account-email], [aria-label*="gmail"], [data-test-id*="account"]');
    if (accountChip) {
      const text = await accountChip.textContent();
      if (text && text.includes(EXPECTED_ACCOUNT)) {
        logger.info('Account verified via UI chip', { account: EXPECTED_ACCOUNT });
        return { verified: true, account: EXPECTED_ACCOUNT, method: 'ui-chip' };
      }
      if (text && text.includes('@gmail.com') && !text.includes(EXPECTED_ACCOUNT)) {
        await takeScreenshot(page, 'wrong-account');
        throw new FlowError(
          ErrorCodes.WRONG_GOOGLE_ACCOUNT,
          `Wrong Google account detected. Expected ${EXPECTED_ACCOUNT}, found account with: ${text.trim()}`
        );
      }
    }

    // Method 2: Check page title/header for account indicator
    const title = await page.title();
    if (title) {
      logger.debug('Page title', { title });
    }

    // Method 3: Try to find Google account selector
    const accountSelector = await page.$('[role="button"][aria-haspopup], .account-chooser, [jsname*="account"]');
    if (accountSelector) {
      const selText = await accountSelector.textContent();
      logger.debug('Account selector found', { text: selText?.substring(0, 50) });
    }

    // Method 4: Read localStorage / session for account info
    try {
      const gaiaInfo = await page.evaluate(() => {
        // Try to get account info from various sources
        const gaia = window.__GAIA__ || window.gapi || null;
        const flowData = document.getElementById('__NEXT_DATA__')?.textContent;
        if (flowData) {
          try {
            const parsed = JSON.parse(flowData);
            return parsed?.props?.pageProps?.user?.email || null;
          } catch { return null; }
        }
        return null;
      });
      if (gaiaInfo) {
        logger.debug('Account info from page context', { gaiaInfo });
      }
    } catch (e) {
      // Cross-origin restrictions may prevent this
      logger.debug('Could not read page internals for account', { error: e.message });
    }

    // Explicit verification is required before a credit-spending action.
    // Absence of evidence is not proof that the right account is signed in.
    logger.warn('Google account cannot be verified', {
      expectedAccount: EXPECTED_ACCOUNT,
      currentUrl: currentUrl?.substring(0, 80),
    });
    return { verified: false, account: null, method: 'unverified' };
  } catch (err) {
    if (err instanceof FlowError) throw err;
    throw new FlowError(
      ErrorCodes.PLAYWRIGHT_ERROR,
      `Failed to verify account: ${err.message}`
    );
  }
}
