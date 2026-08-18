const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

const USERNAME =
  process.env.SUPPORT_AGENT_USERNAME || "Rivan";

const PASSWORD =
  process.env.SUPPORT_AGENT_PASSWORD;

test.describe.configure({ mode: "serial" });

test.skip(
  !PASSWORD,
  "Set SUPPORT_AGENT_PASSWORD before running tests."
);


// =====================================================
// LOGIN HELPER
// =====================================================

async function login(page) {

  await page.goto(BASE_URL);

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.reload();

  await expect(
    page.locator("#loginScreen")
  ).toBeVisible();

  await page.locator("#usernameInput")
    .fill(USERNAME);

  await page.locator("#passwordInput")
    .fill(PASSWORD);

  await page.locator("#loginBtn")
    .click();

  await expect(
    page.locator("#app")
  ).toBeVisible({
    timeout: 15000
  });
}


// =====================================================
// 1 — PAGE LOAD
// =====================================================

test("01 - Page loads", async ({ page }) => {

  await page.goto(BASE_URL);

  await expect(page)
    .toHaveTitle("AI Support Operations");

  await expect(
    page.getByRole("heading", {
      name: "Support Agent"
    })
  ).toBeVisible();
});


// =====================================================
// 2 — LOGIN
// =====================================================

test("02 - Login works", async ({ page }) => {

  await login(page);

  await expect(
    page.getByText("System online")
  ).toBeVisible();
});


// =====================================================
// 3 — DASHBOARD
// =====================================================

test("03 - Dashboard loads", async ({ page }) => {

  await login(page);

  await expect(
    page.locator("#ticketInput")
  ).toBeVisible();

  await expect(
    page.locator("#analyzeBtn")
  ).toBeVisible();

  await expect(
    page.locator("#ticketHistory")
  ).toBeVisible();
});


// =====================================================
// 4 — CHARACTER COUNTER
// =====================================================

test("04 - Character counter works", async ({ page }) => {

  await login(page);

  const input =
    page.locator("#ticketInput");

  await input.fill("Test ticket");

  await expect(
    page.locator("#charCount")
  ).toHaveText("11 / 5000");
});


// =====================================================
// 5 — ANALYZE TICKET
// =====================================================

test("05 - Analyze ticket", async ({ page }) => {

  await login(page);

  await page.locator("#ticketInput").fill(
    "I cannot log in to my account."
  );

  await page.locator("#analyzeBtn").click();

  await expect(
    page.locator("#result")
  ).toBeVisible({
    timeout: 15000
  });
});


// =====================================================
// 6 — AI RESULT
// =====================================================

test("06 - AI result contains data", async ({ page }) => {

  await login(page);

  await page.locator("#ticketInput").fill(
    "I cannot log in to my account."
  );

  await page.locator("#analyzeBtn").click();

  await expect(
    page.locator("#category")
  ).not.toHaveText("—");

  await expect(
    page.locator("#confidence")
  ).not.toHaveText("—");

  await expect(
    page.locator("#risk")
  ).not.toHaveText("—");

  await expect(
    page.locator("#answer")
  ).not.toBeEmpty();

  await expect(
    page.locator("#ticketId")
  ).not.toHaveText("—");
});


// =====================================================
// 7 — METRICS
// =====================================================

test("07 - Metrics display", async ({ page }) => {

  await login(page);

  await expect(
    page.locator("#ticketsProcessed")
  ).toHaveText(/\d+/);

  await expect(
    page.locator("#automated")
  ).toHaveText(/\d+/);

  await expect(
    page.locator("#escalated")
  ).toHaveText(/\d+/);

  await expect(
    page.locator("#automationRate")
  ).toHaveText(/\d+%/);
});


// =====================================================
// 8 — ANALYTICS
// =====================================================

test("08 - Analytics display", async ({ page }) => {

  await login(page);

  await expect(
    page.locator("#resolutionRate")
  ).toHaveText(/\d+%/);

  await expect(
    page.locator("#escalationRate")
  ).toHaveText(/\d+%/);

  await expect(
    page.locator("#pendingCount")
  ).toHaveText(/\d+/);

  await expect(
    page.locator("#categoryChart")
  ).toBeVisible();
});


// =====================================================
// 9 — TICKET HISTORY
// =====================================================

test("09 - Ticket history loads", async ({ page }) => {

  await login(page);

  await expect(
    page.locator("#ticketHistory")
  ).toBeVisible();

  await expect(
    page.locator(".history-table")
  ).toBeVisible();
});


// =====================================================
// 10 — SEARCH
// =====================================================

test("10 - Ticket search works", async ({ page }) => {

  await login(page);

  await page.locator("#historySearch")
    .fill("login");

  await expect(
    page.locator("#ticketHistory")
  ).toBeVisible();

  await page.locator("#historySearch")
    .fill("");
});


// =====================================================
// 11 — STATUS FILTER
// =====================================================

test("11 - Status filter works", async ({ page }) => {

  await login(page);

  await page.locator("#statusFilter")
    .selectOption("Resolved");

  await expect(
    page.locator("#ticketHistory")
  ).toBeVisible();

  await page.locator("#statusFilter")
    .selectOption("all");
});


// =====================================================
// 12 — CATEGORY FILTER
// =====================================================

test("12 - Category filter works", async ({ page }) => {

  await login(page);

  const filter =
    page.locator("#categoryFilter");

  const optionCount =
    await filter.locator("option").count();

  expect(optionCount)
    .toBeGreaterThanOrEqual(1);

  await filter.selectOption("all");
});


// =====================================================
// 13 — DARK MODE
// =====================================================

test("13 - Dark mode works", async ({ page }) => {

  await login(page);

  const toggle =
    page.locator("#themeToggle");

  await expect(toggle)
    .toBeVisible();

  await toggle.click();

  await expect(
    page.locator("body")
  ).toHaveClass(/dark-mode/);
});


// =====================================================
// 14 — LIGHT MODE
// =====================================================

test("14 - Light mode works", async ({ page }) => {

  await login(page);

  const toggle =
    page.locator("#themeToggle");

  await page.evaluate(() => {
    document.body.classList.add("dark-mode");
  });

  await toggle.click();

  await expect(
    page.locator("body")
  ).not.toHaveClass(/dark-mode/);
});


// =====================================================
// 15 — KEYBOARD SHORTCUTS
// =====================================================

test("15 - Keyboard shortcuts work", async ({ page }) => {

  await login(page);

  await page.keyboard.press("?");

  const overlay =
    page.locator("#shortcutOverlay");

  if (await overlay.count()) {

    await expect(overlay)
      .not.toHaveClass(/hidden/);

    await page.keyboard.press("Escape");

    await expect(overlay)
      .toHaveClass(/hidden/);
  }
});


// =====================================================
// 16 — NEW TICKET SHORTCUT
// =====================================================

test("16 - N focuses ticket input", async ({ page }) => {

  await login(page);

  await page.keyboard.press("n");

  await expect(
    page.locator("#ticketInput")
  ).toBeFocused();
});


// =====================================================
// 17 — REFRESH
// =====================================================

test("17 - Dashboard refresh works", async ({ page }) => {

  await login(page);

  await page.locator("#refreshTicketsBtn")
    .click();

  await expect(
    page.locator("#app")
  ).toBeVisible();

  await expect(
    page.locator("#ticketHistory")
  ).toBeVisible();
});


// =====================================================
// 18 — CSV EXPORT
// =====================================================

test("18 - CSV export works", async ({ page }) => {

  await login(page);

  const downloadPromise =
    page.waitForEvent("download");

  await page.locator("#exportBtn")
    .click();

  const download =
    await downloadPromise;

  expect(
    download.suggestedFilename()
  ).toBe("support-tickets.csv");
});


// =====================================================
// 19 — REVIEW MODAL
// =====================================================

test("19 - Review modal opens", async ({ page }) => {

  await login(page);

  const count =
    await page.locator(".review-button").count();

  test.skip(
    count === 0,
    "No tickets currently waiting for review."
  );

  const reviewButton =
    page.locator(".review-button").first();

  await reviewButton.click();

  await expect(
    page.locator("#ticketReviewModal")
  ).toBeVisible();

  await expect(
    page.locator("#ticketReviewModal")
      .getByText("Ticket Details")
  ).toBeVisible();

  await expect(
    page.locator("#ticketReviewModal")
      .getByText("CUSTOMER TICKET")
  ).toBeVisible();

  await page.locator(".modal-close")
    .click();

  await expect(
    page.locator("#ticketReviewModal")
  ).not.toBeVisible();
});


// =====================================================
// 20 — LOGOUT
// =====================================================

test("20 - Logout works", async ({ page }) => {

  await login(page);

  await page.locator("#logoutBtn")
    .click();

  await expect(
    page.locator("#loginScreen")
  ).toBeVisible();

  await expect(
    page.locator("#app")
  ).toHaveClass(/hidden/);
});


// =====================================================
// 21 — MOBILE RESPONSIVE
// =====================================================

test("21 - Mobile responsive", async ({ page }) => {

  await page.setViewportSize({
    width: 390,
    height: 844
  });

  await login(page);

  await expect(
    page.locator("#ticketInput")
  ).toBeVisible();

  await expect(
    page.locator("#analyzeBtn")
  ).toBeVisible();

  const pageWidth =
    await page.evaluate(
      () => document.documentElement.scrollWidth
    );

  const viewportWidth =
    await page.evaluate(
      () => window.innerWidth
    );

  expect(pageWidth)
    .toBeLessThanOrEqual(viewportWidth + 1);
});


// =====================================================
// 22 — WRONG PASSWORD REJECTED
// =====================================================

test("22 - Wrong password is rejected", async ({ page }) => {

  await page.goto(BASE_URL);

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.reload();

  await expect(
    page.locator("#loginScreen")
  ).toBeVisible();

  await page.locator("#usernameInput")
    .fill(USERNAME);

  await page.locator("#passwordInput")
    .fill("DefinitelyWrongPassword123!");

  await page.locator("#loginBtn")
    .click();

  await expect(
    page.locator("#loginError")
  ).toBeVisible();

  await expect(
    page.locator("#app")
  ).toHaveClass(/hidden/);
});


// =====================================================
// 23 — PROTECTED API
// =====================================================

test("23 - Protected API rejects unauthorized request", async ({
  request
}) => {

  const response =
    await request.get(
      `${BASE_URL}/api/tickets`
    );

  expect(response.status())
    .toBe(401);
});


// =====================================================
// 24 — EMPTY TICKET
// =====================================================

test("24 - Empty ticket is rejected", async ({
  request
}) => {

  const loginResponse =
    await request.post(
      `${BASE_URL}/api/auth/login`,
      {
        data: {
          username: USERNAME,
          password: PASSWORD
        }
      }
    );

  expect(loginResponse.ok())
    .toBeTruthy();

  const loginData =
    await loginResponse.json();

  const token =
    loginData.token;

  const response =
    await request.post(
      `${BASE_URL}/api/analyze`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`
        },
        data: {
          ticket: ""
        }
      }
    );

  expect(response.ok())
    .toBeFalsy();

  expect([400, 422])
    .toContain(response.status());
});


// =====================================================
// 25 — RATE LIMIT PROTECTION
// =====================================================

test(
  "25 - Login rate limit rejects excessive failed attempts",
  async ({ request }) => {

    let rateLimited = false;

    for (let i = 0; i < 12; i++) {

      const response =
        await request.post(
          `${BASE_URL}/api/auth/login`,
          {
            data: {
              username: USERNAME,
              password:
                "WrongPasswordForTesting!"
            }
          }
        );

      if (response.status() === 429) {
        rateLimited = true;
        break;
      }
    }

    expect(rateLimited)
      .toBeTruthy();
  }
);