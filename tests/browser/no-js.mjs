// One isolated browser context per no-JavaScript journey.
export async function withoutJavaScript(browser, verify) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try { return await verify(await context.newPage()); }
  finally { await context.close(); }
}
