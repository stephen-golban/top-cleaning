import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import {
  clampEscapedHtml,
  createTelegramDelivery,
  escapeTelegramHtml,
  formatQuoteText,
  formatTelegramMessage,
  resolveQuoteDelivery,
  type QuoteSubmission,
} from "./delivery.ts";

/**
 * These tests never touch Telegram. Provider selection is pure and is checked
 * directly; the wire behaviour is checked against a stub HTTP server on
 * localhost that speaks the shapes Telegram actually returns, so the success
 * path, the 4xx path and the "200 but ok:false" path are all exercised by the
 * same `fetch` production uses.
 */

const BOT_TOKEN = "8123456789:AAH-ThisIsNotARealBotTokenJustAFixture0123";
const CHAT_ID = "-1002233445566";

function submission(overrides: Partial<QuoteSubmission> = {}): QuoteSubmission {
  return {
    phone: "079 022 023",
    phoneE164: "+37379022023",
    service: "general",
    serviceName: "Curățenie generală",
    details: "Apartament cu 2 camere, după reparație.",
    locale: "ro",
    submittedAt: new Date("2026-09-01T09:30:00.000Z"),
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* Provider selection                                                         */
/* -------------------------------------------------------------------------- */

const TELEGRAM_ENV = { TELEGRAM_BOT_TOKEN: BOT_TOKEN, TELEGRAM_CHAT_ID: CHAT_ID };
const RESEND_ENV = {
  RESEND_API_KEY: "re_test_key",
  QUOTE_NOTIFY_EMAIL: "owner@example.com",
};

test("neither provider configured reports every missing variable", () => {
  const resolution = resolveQuoteDelivery({});

  assert.equal(resolution.configured, false);
  assert.deepEqual(
    [...(resolution.configured ? [] : resolution.missing)],
    ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "RESEND_API_KEY", "QUOTE_NOTIFY_EMAIL"],
  );
});

test("Telegram alone is used", () => {
  const resolution = resolveQuoteDelivery({ ...TELEGRAM_ENV });

  assert.equal(resolution.configured, true);
  assert.equal(resolution.configured && resolution.delivery.name, "telegram");
});

test("Resend alone is used", () => {
  const resolution = resolveQuoteDelivery({ ...RESEND_ENV });

  assert.equal(resolution.configured, true);
  assert.equal(resolution.configured && resolution.delivery.name, "resend");
});

test("both configured prefers Telegram", () => {
  const resolution = resolveQuoteDelivery({ ...TELEGRAM_ENV, ...RESEND_ENV });

  assert.equal(resolution.configured, true);
  assert.equal(resolution.configured && resolution.delivery.name, "telegram");
});

test("a half-configured Telegram falls back to Resend rather than failing", () => {
  const resolution = resolveQuoteDelivery({
    TELEGRAM_BOT_TOKEN: BOT_TOKEN,
    ...RESEND_ENV,
  });

  assert.equal(resolution.configured, true);
  assert.equal(resolution.configured && resolution.delivery.name, "resend");
});

test("a half-configured Telegram and no Resend is unconfigured, naming the gap", () => {
  const resolution = resolveQuoteDelivery({ TELEGRAM_CHAT_ID: CHAT_ID });

  assert.equal(resolution.configured, false);
  assert.ok(
    !resolution.configured && resolution.missing.includes("TELEGRAM_BOT_TOKEN"),
  );
  assert.ok(!resolution.configured && !resolution.missing.includes("TELEGRAM_CHAT_ID"));
});

test("whitespace-only secrets count as absent", () => {
  const resolution = resolveQuoteDelivery({
    TELEGRAM_BOT_TOKEN: "   ",
    TELEGRAM_CHAT_ID: "\n",
    RESEND_API_KEY: " ",
    QUOTE_NOTIFY_EMAIL: "  ",
  });

  assert.equal(resolution.configured, false);
});

test("the unconfigured branch still hands the caller the whole submission to log", () => {
  const resolution = resolveQuoteDelivery({});
  assert.equal(resolution.configured, false);

  // This is what the action writes after `[quote] UNDELIVERED …`. Nothing the
  // visitor typed may be missing from it — the log is the only copy.
  const logged = formatQuoteText(submission());
  assert.match(logged, /079 022 023/);
  assert.match(logged, /\+37379022023/);
  assert.match(logged, /Curățenie generală/);
  assert.match(logged, /Apartament cu 2 camere/);
  assert.match(logged, /Limba:\s+ro/);
});

/* -------------------------------------------------------------------------- */
/* Escaping                                                                   */
/* -------------------------------------------------------------------------- */

/** Every `&` in the text must open one of the four entities Telegram parses. */
function entitiesAreWellFormed(text: string): boolean {
  return text
    .split("&")
    .slice(1)
    .every((tail) => /^(amp|lt|gt|quot);/.test(tail));
}

/** The part of the message that is verbatim visitor input. */
function detailsSection(message: string): string {
  const marker = "<b>Detalii:</b>\n";
  const index = message.indexOf(marker);
  assert.notEqual(index, -1, "message is missing its details section");
  return message.slice(index + marker.length);
}

test("escapeTelegramHtml escapes exactly the three characters HTML mode needs", () => {
  assert.equal(escapeTelegramHtml("a & b < c > d"), "a &amp; b &lt; c &gt; d");
  // Quotes are left alone on purpose: Telegram would render `&quot;` literally
  // outside a tag attribute, and there are no attributes in this message.
  assert.equal(escapeTelegramHtml(`he said "hi" & 'bye'`), `he said "hi" &amp; 'bye'`);
  assert.equal(escapeTelegramHtml("&amp;"), "&amp;amp;");
});

test("markdown metacharacters survive untouched — HTML mode does not care", () => {
  const hostile = "*bold* _em_ `code` [x](y) ~s~ 1. list #tag +5 = 3-2 |a| {b} .!";
  const message = formatTelegramMessage(submission({ details: hostile }));

  assert.equal(detailsSection(message), hostile);
  assert.ok(entitiesAreWellFormed(message));
});

test("HTML injection in the details cannot open a tag or an entity", () => {
  const hostile =
    '</b><a href="https://evil.example/">click</a><script>alert(1)</script> & &amp; &lt;';
  const message = formatTelegramMessage(submission({ details: hostile }));
  const section = detailsSection(message);

  assert.ok(!section.includes("<"), "an unescaped < reached the message");
  assert.ok(!section.includes(">"), "an unescaped > reached the message");
  assert.ok(entitiesAreWellFormed(message));
  assert.ok(section.includes("&lt;script&gt;"));
});

test("HTML injection in the service name and the typed phone is escaped too", () => {
  const message = formatTelegramMessage(
    submission({
      serviceName: "<b>Fake</b> & co",
      phone: "07<9>022023",
    }),
  );

  assert.ok(message.includes("&lt;b&gt;Fake&lt;/b&gt; &amp; co"));
  assert.ok(message.includes("07&lt;9&gt;022023"));
  assert.ok(entitiesAreWellFormed(message));
});

test("newlines in the details are preserved, not collapsed or escaped", () => {
  const details = "Linia 1\nLinia 2\n\nLinia 4";
  const message = formatTelegramMessage(submission({ details }));

  assert.equal(detailsSection(message), details);
});

test("clampEscapedHtml never splits an entity", () => {
  assert.equal(clampEscapedHtml("abc", 10), "abc");
  assert.equal(clampEscapedHtml("ab&amp;cd", 5), "ab");
  assert.equal(clampEscapedHtml("ab&amp;cd", 7), "ab&amp;");
  assert.equal(clampEscapedHtml("&amp;", 3), "");
  assert.equal(clampEscapedHtml("abcdef", 0), "");
});

test("a very long hostile submission stays inside Telegram's 4096 limit", () => {
  // 2000 is the form's own maximum; every character escapes to five, which is
  // 10,000 — two and a half times what Telegram accepts.
  const message = formatTelegramMessage(submission({ details: "&".repeat(2000) }));

  assert.ok(
    message.length <= 4096,
    `message was ${message.length} code units, over Telegram's limit`,
  );
  assert.ok(entitiesAreWellFormed(message), "truncation split an HTML entity");
  assert.ok(message.endsWith("[…text scurtat]"));
});

test("a long but harmless submission is not truncated", () => {
  const details = "a".repeat(2000);
  const message = formatTelegramMessage(submission({ details }));

  assert.equal(detailsSection(message), details);
  assert.ok(message.length <= 4096);
});

/* -------------------------------------------------------------------------- */
/* Message content                                                            */
/* -------------------------------------------------------------------------- */

test("the message carries service, details, typed phone and locale", () => {
  const message = formatTelegramMessage(submission({ locale: "ru" }));

  assert.ok(message.includes("Curățenie generală"));
  assert.ok(message.includes("Apartament cu 2 camere, după reparație."));
  assert.ok(message.includes("079 022 023"));
  assert.ok(message.includes("<b>Limba formularului:</b> ru"));
});

test("the visitor's number appears bare and alone, so Telegram makes it callable", () => {
  const message = formatTelegramMessage(submission());
  const line = message
    .split("\n")
    .find((candidate) => candidate.startsWith("<b>Telefon:</b>"));

  assert.equal(line, "<b>Telefon:</b> +37379022023");
  // A `tel:` anchor would be rejected by Telegram's URL scheme allowlist.
  assert.ok(!message.includes("tel:"));
});

test("a skipped service reads as an em dash, not as empty or 'null'", () => {
  const message = formatTelegramMessage(
    submission({ service: null, serviceName: null }),
  );

  assert.ok(message.includes("<b>Serviciu:</b> —"));
  assert.ok(!message.includes("null"));
});

/* -------------------------------------------------------------------------- */
/* The wire, against a stub Telegram                                          */
/* -------------------------------------------------------------------------- */

type Recorded = { url: string; body: string };

type Stub = {
  base: string;
  requests: Recorded[];
  close(): Promise<void>;
};

/** A local server that answers `POST /bot<token>/sendMessage` however we say. */
async function startStub(
  respond: (recorded: Recorded) => { status: number; body: string },
): Promise<Stub> {
  const requests: Recorded[] = [];

  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const recorded = {
        url: request.url ?? "",
        body: Buffer.concat(chunks).toString("utf8"),
      };
      requests.push(recorded);
      const { status, body } = respond(recorded);
      response.writeHead(status, { "content-type": "application/json" });
      response.end(body);
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  return {
    base: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

test("a 2xx from Telegram resolves, and sends what Telegram expects", async () => {
  const stub = await startStub(() => ({
    status: 200,
    body: JSON.stringify({ ok: true, result: { message_id: 7 } }),
  }));

  try {
    const delivery = createTelegramDelivery(BOT_TOKEN, CHAT_ID, stub.base);
    await delivery.send(submission());

    assert.equal(stub.requests.length, 1);
    assert.equal(stub.requests[0]!.url, `/bot${BOT_TOKEN}/sendMessage`);

    const sent = JSON.parse(stub.requests[0]!.body) as Record<string, unknown>;
    assert.equal(sent.chat_id, CHAT_ID);
    assert.equal(sent.parse_mode, "HTML");
    assert.deepEqual(sent.link_preview_options, { is_disabled: true });
    assert.match(String(sent.text), /\+37379022023/);
  } finally {
    await stub.close();
  }
});

test("a non-2xx from Telegram throws, so the caller logs UNDELIVERED", async () => {
  const stub = await startStub(() => ({
    status: 400,
    body: JSON.stringify({
      ok: false,
      error_code: 400,
      description: "Bad Request: chat not found",
    }),
  }));

  try {
    const delivery = createTelegramDelivery(BOT_TOKEN, CHAT_ID, stub.base);
    await assert.rejects(
      () => delivery.send(submission()),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /telegram responded 400/);
        assert.match(error.message, /chat not found/);
        return true;
      },
    );
  } finally {
    await stub.close();
  }
});

test("a 200 carrying ok:false is a failure, never a false success", async () => {
  const stub = await startStub(() => ({
    status: 200,
    body: JSON.stringify({ ok: false, description: "nope" }),
  }));

  try {
    const delivery = createTelegramDelivery(BOT_TOKEN, CHAT_ID, stub.base);
    await assert.rejects(() => delivery.send(submission()), /ok:false/);
  } finally {
    await stub.close();
  }
});

test("an unreachable Telegram throws rather than reporting success", async () => {
  const stub = await startStub(() => ({ status: 200, body: "{}" }));
  const base = stub.base;
  await stub.close();

  const delivery = createTelegramDelivery(BOT_TOKEN, CHAT_ID, base);
  await assert.rejects(() => delivery.send(submission()), /telegram request failed/);
});

/* -------------------------------------------------------------------------- */
/* The token never leaks                                                      */
/* -------------------------------------------------------------------------- */

test("an error that quotes the request URL has the token redacted out of it", async () => {
  // Telegram would not echo the path, but a proxy, a WAF or a misconfigured
  // gateway in front of it might — and the token lives in the path.
  const stub = await startStub((recorded) => ({
    status: 404,
    body: JSON.stringify({ ok: false, description: `no route for ${recorded.url}` }),
  }));

  try {
    const delivery = createTelegramDelivery(BOT_TOKEN, CHAT_ID, stub.base);
    await assert.rejects(
      () => delivery.send(submission()),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(
          !error.message.includes(BOT_TOKEN),
          "the bot token appeared in an error message",
        );
        assert.ok(!String(error.stack).includes(BOT_TOKEN));
        assert.match(error.message, /<redacted>/);
        return true;
      },
    );
  } finally {
    await stub.close();
  }
});

test("the token is in nothing the provider exposes about itself", () => {
  const delivery = createTelegramDelivery(BOT_TOKEN, CHAT_ID);

  // `name` is the only field the action reads, and it goes into the log line.
  assert.equal(delivery.name, "telegram");
  assert.ok(!JSON.stringify(Object.keys(delivery)).includes(BOT_TOKEN));
  assert.ok(!JSON.stringify(delivery).includes(BOT_TOKEN));
});

test("the token is in nothing the message body carries", () => {
  const message = formatTelegramMessage(submission());

  assert.ok(!message.includes(BOT_TOKEN));
  assert.ok(!message.includes(CHAT_ID));
});

test("a network-level failure message is redacted too", async () => {
  // A DNS failure for a hostname built from the token would otherwise put the
  // token straight into the thrown message.
  const delivery = createTelegramDelivery(
    BOT_TOKEN,
    CHAT_ID,
    "http://127.0.0.1:1/unreachable",
  );

  await assert.rejects(
    () => delivery.send(submission()),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes(BOT_TOKEN));
      return true;
    },
  );
});
