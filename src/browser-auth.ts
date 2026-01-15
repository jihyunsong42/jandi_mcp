import puppeteer from "puppeteer";

const LOGIN_URL = "https://www.jandi.com/signin";
const TOKEN_URL = "https://www.jandi.com/version/useragent/web";

interface LoginResult {
  refreshToken: string;
}

/**
 * Login to Jandi using email/password and extract refresh token from cookies
 */
export async function loginAndGetRefreshToken(
  email: string,
  password: string,
): Promise<LoginResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // Navigate to login page
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });

    // Wait for login form to be rendered
    await page.waitForSelector('input[type="email"][name="email"]', {
      timeout: 10000,
    });

    // Fill in email
    await page.type('input[type="email"][name="email"]', email, { delay: 50 });

    // Fill in password
    await page.type('input[type="password"][name="nocheck"]', password, {
      delay: 50,
    });

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });

    // Navigate to the token URL to get refresh token cookie
    await page.goto(TOKEN_URL, { waitUntil: "networkidle2" });

    // Get all cookies
    const cookies = await page.cookies();

    // Find refresh token cookie
    const refreshTokenCookie = cookies.find(
      (cookie) => cookie.name === "_jd_.refresh_token",
    );

    if (!refreshTokenCookie) {
      throw new Error(
        "Failed to get refresh token. Login may have failed or cookie not found.",
      );
    }

    return {
      refreshToken: refreshTokenCookie.value,
    };
  } finally {
    await browser.close();
  }
}
