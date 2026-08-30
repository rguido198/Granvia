import { describe, it, expect, afterEach, vi } from "vitest";

// site-session.ts reads SITE_PASSWORD/SITE_SESSION_SECRET into top-level
// consts at import time, so each scenario needs its own fresh module
// instance — vi.resetModules() + a dynamic import, not a static one.
async function loadSiteSession(env: { password?: string; secret?: string }) {
  vi.resetModules();
  if (env.password === undefined) Reflect.deleteProperty(process.env, "SITE_PASSWORD");
  else process.env.SITE_PASSWORD = env.password;
  if (env.secret === undefined) Reflect.deleteProperty(process.env, "SITE_SESSION_SECRET");
  else process.env.SITE_SESSION_SECRET = env.secret;
  return import("./site-session");
}

describe("site-session", () => {
  afterEach(() => {
    Reflect.deleteProperty(process.env, "SITE_PASSWORD");
    Reflect.deleteProperty(process.env, "SITE_SESSION_SECRET");
  });

  it("fails closed when SITE_PASSWORD/SITE_SESSION_SECRET are unset — no fallback password", async () => {
    const mod = await loadSiteSession({});
    expect(mod.siteAuthConfigured()).toBe(false);
    expect(await mod.signSiteAccessCookie()).toBeNull();
    expect(await mod.verifySiteAccessCookie("granted.9999999999.abc.def")).toBe(false);
  });

  it("signs and verifies a fresh cookie", async () => {
    const mod = await loadSiteSession({ password: "test-pw", secret: "test-secret" });
    const cookie = await mod.signSiteAccessCookie();
    expect(cookie).not.toBeNull();
    expect(await mod.verifySiteAccessCookie(cookie ?? undefined)).toBe(true);
  });

  it("rejects an already-expired cookie", async () => {
    const mod = await loadSiteSession({ password: "test-pw", secret: "test-secret" });
    const cookie = await mod.signSiteAccessCookie(-10); // maxAgeSeconds in the past
    expect(cookie).not.toBeNull();
    expect(await mod.verifySiteAccessCookie(cookie ?? undefined)).toBe(false);
  });

  it("rejects a cookie with its expiry hand-edited forward — the signature covers it", async () => {
    const mod = await loadSiteSession({ password: "test-pw", secret: "test-secret" });
    const cookie = (await mod.signSiteAccessCookie(-10)) ?? "";
    const [marker, , fingerprint, signature] = cookie.split(".");
    const forged = [marker, String(Math.floor(Date.now() / 1000) + 999_999), fingerprint, signature].join(".");
    expect(await mod.verifySiteAccessCookie(forged)).toBe(false);
  });

  it("invalidates every previously-issued cookie when SITE_PASSWORD rotates, without touching SITE_SESSION_SECRET", async () => {
    const modOld = await loadSiteSession({ password: "old-pw", secret: "shared-secret" });
    const cookie = await modOld.signSiteAccessCookie();

    const modNew = await loadSiteSession({ password: "new-pw", secret: "shared-secret" });
    expect(await modNew.verifySiteAccessCookie(cookie ?? undefined)).toBe(false);
  });

  it("still verifies across independent module loads given the same password and secret", async () => {
    const modA = await loadSiteSession({ password: "same-pw", secret: "same-secret" });
    const cookie = await modA.signSiteAccessCookie();

    const modB = await loadSiteSession({ password: "same-pw", secret: "same-secret" });
    expect(await modB.verifySiteAccessCookie(cookie ?? undefined)).toBe(true);
  });

  it("rejects a cookie signed under a different SITE_SESSION_SECRET", async () => {
    const modOld = await loadSiteSession({ password: "pw", secret: "secret-a" });
    const cookie = await modOld.signSiteAccessCookie();

    const modNew = await loadSiteSession({ password: "pw", secret: "secret-b" });
    expect(await modNew.verifySiteAccessCookie(cookie ?? undefined)).toBe(false);
  });

  it("rejects a malformed or missing cookie value", async () => {
    const mod = await loadSiteSession({ password: "pw", secret: "secret" });
    expect(await mod.verifySiteAccessCookie("not-a-valid-cookie")).toBe(false);
    expect(await mod.verifySiteAccessCookie(undefined)).toBe(false);
    expect(await mod.verifySiteAccessCookie("")).toBe(false);
  });

  it("checkSitePassword trims and compares against the configured password only", async () => {
    const mod = await loadSiteSession({ password: "correct-horse", secret: "s" });
    expect(mod.checkSitePassword("correct-horse")).toBe(true);
    expect(mod.checkSitePassword("  correct-horse  ")).toBe(true);
    expect(mod.checkSitePassword("wrong")).toBe(false);
  });
});
