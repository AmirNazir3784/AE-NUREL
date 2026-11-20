// Fake SMTP server for AENural membership SMTP integration tests.
//
// A small, scriptable, raw-TCP SMTP server — enough for Nodemailer
// (EHLO/AUTH/MAIL/RCPT/DATA/QUIT) and for the failure modes the suite
// must prove the app handles. It is NOT a general SMTP server: no
// pipelining, no relaying, no queueing. Every message it accepts is
// kept in memory (server.messages) for the tests to assert on.
//
// Why a fake server as well as Mailpit: Mailpit is a real, independent
// SMTP implementation (used for the happy-path cross-check), but it
// cannot be told to fail in scripted ways — 535 on AUTH, 550 on RCPT,
// 554 after DATA, a greeting that never arrives, a DATA that never
// answers, "succeed the first connection, fail the second" (the exact
// shape of a send failing AFTER the transport pre-check). The fake
// server can do all of those, deterministically, on loopback.
//
// TLS: the app's transport requires TLS (implicit TLS on port 465, or
// STARTTLS when SMTP_SECURE=false). A plaintext server is therefore
// unusable by the app — the suite proves that too, with a second
// instance started WITHOUT a certificate. When a certificate is
// supplied ({ tlsCert, tlsKey }), the server advertises STARTTLS and
// upgrades the connection; the certificate must chain to a CA the
// test process trusts (see smtp-test-ca.mjs — the suite re-execs
// itself once with NODE_EXTRA_CA_CERTS pointed at the test CA).
//
// Behaviours (setBehavior):
//   'ok'             accept everything, record messages.
//   'auth-fail'      535 on AUTH (bad credentials / SMTP auth failure).
//   'reject-mail-from' 550 on MAIL FROM.
//   'reject-rcpt'    550 on RCPT TO (pre-check still passes: verify()
//                    never sends RCPT — this is a send-time failure).
//   'reject-data'    554 after the DATA terminator.
//   'blackhole'      accept the TCP connection, never send a greeting
//                    (greetingTimeout path).
//   'hang-after-data' accept DATA, never answer it (socketTimeout path).
//   'drop-after-ehlo' close the connection right after EHLO.
//   { mode: 'fail-after-n-ok', okConnections, failStage }
//                    the first `okConnections` connections behave as
//                    'ok'; later connections fail at `failStage`
//                    ('greeting' | 'auth' | 'mail-from' | 'rcpt' |
//                    'data' | 'hang-data'). Nodemailer verify() uses
//                    one connection and sendMail() a new one, so
//                    okConnections: 1 + failStage 'data' is exactly
//                    "pre-check passes, send fails" — the Better Auth
//                    1.7.14 swallow case.
//
// Only Node built-ins are used, so the pure tests in
// tests/membership-smtp.test.mjs run with no node_modules installed.

import net from 'node:net';
import tls from 'node:tls';
import { readFileSync } from 'node:fs';

const CRLF = '\r\n';

export function createFakeSmtpServer({ tlsCert, tlsKey } = {}) {
  const tlsOptions =
    tlsCert && tlsKey
      ? { cert: readFileSync(tlsCert), key: readFileSync(tlsKey) }
      : null;

  const server = {
    messages: [],
    connections: 0,
    authAttempts: 0,
    behavior: 'ok',
    port: 0,
    host: '127.0.0.1',
  };
  let netServer = null;
  const sockets = new Set();

  server.setBehavior = (behavior) => {
    server.behavior = behavior;
  };
  server.reset = () => {
    server.messages = [];
    server.connections = 0;
    server.authAttempts = 0;
  };

  function behaviorFor(connectionIndex) {
    const b = server.behavior;
    if (typeof b === 'string') return { mode: b };
    if (b && b.mode === 'fail-after-n-ok') {
      if (connectionIndex <= b.okConnections) return { mode: 'ok' };
      // Map the fail stage onto the matching string behaviour so the
      // failure fires at exactly the command the stage names.
      const stageModes = {
        greeting: 'greeting',
        auth: 'auth-fail',
        'mail-from': 'reject-mail-from',
        rcpt: 'reject-rcpt',
        data: 'reject-data',
        'hang-data': 'hang-after-data',
      };
      return { mode: stageModes[b.failStage] || 'reject-data' };
    }
    return { mode: 'ok' };
  }

  function handleConnection(socket) {
    const connectionIndex = ++server.connections;
    const behavior = behaviorFor(connectionIndex);
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));

    let stream = socket;
    let buffer = '';
    let inData = false;
    let dataLines = [];
    let envelope = { from: null, to: [] };
    let authStep = 0; // 0 idle, 1 waiting username (LOGIN), 2 waiting password
    let greeted = false;

    function write(line) {
      try {
        stream.write(line + CRLF);
      } catch {
        // The peer went away; nothing to do.
      }
    }
    function sendCapabilities() {
      write('250-localhost');
      if (tlsOptions) write('250-STARTTLS');
      write('250-AUTH PLAIN LOGIN');
      write('250 8BITMIME');
    }
    function failAt(stage, respond) {
      // Returns true when this connection's behaviour fails at `stage`.
      if (behavior.mode === stage) {
        respond();
        return true;
      }
      return false;
    }

    function onLine(rawLine) {
      const line = rawLine.replace(/\r$/, '');
      if (inData) {
        if (line === '.') {
          inData = false;
          const raw = dataLines.join('\n');
          dataLines = [];
          if (behavior.mode === 'reject-data') {
            write('554 5.7.1 Message rejected');
            return;
          }
          server.messages.push({ from: envelope.from, to: [...envelope.to], raw });
          write('250 2.0.0 Ok: queued');
          return;
        }
        // Dot-unstuffing (RFC 5321 §4.5.2).
        dataLines.push(line.startsWith('..') ? line.slice(1) : line);
        return;
      }
      const [verbRaw, ...rest] = line.split(' ');
      const verb = (verbRaw || '').toUpperCase();
      const arg = rest.join(' ');

      if (authStep === 1) {
        authStep = 2;
        write('334 UGFzc3dvcmQ6');
        return;
      }
      if (authStep === 2) {
        authStep = 0;
        server.authAttempts += 1;
        if (behavior.mode === 'auth-fail') write('535 5.7.8 Authentication credentials invalid');
        else write('235 2.7.0 Authentication successful');
        return;
      }

      switch (verb) {
        case 'EHLO':
        case 'HELO':
          sendCapabilities();
          if (behavior.mode === 'drop-after-ehlo') stream.destroy();
          return;
        case 'STARTTLS': {
          if (!tlsOptions) {
            write('502 5.5.1 Command not implemented');
            return;
          }
          write('220 2.0.0 Ready to start TLS');
          const secure = new tls.TLSSocket(socket, {
            isServer: true,
            ...tlsOptions,
          });
          secure.on('error', () => {});
          socket.removeAllListeners('data');
          stream = secure;
          buffer = '';
          secure.on('data', (chunk) => onData(chunk));
          return;
        }
        case 'AUTH': {
          server.authAttempts += 1;
          if (failAt('auth-fail', () => write('535 5.7.8 Authentication credentials invalid'))) return;
          if (/^LOGIN$/i.test(arg)) {
            authStep = 1;
            write('334 VXNlcm5hbWU6');
            return;
          }
          // AUTH PLAIN [initial-response] — accept any credentials.
          write('235 2.7.0 Authentication successful');
          return;
        }
        case 'MAIL': {
          if (failAt('reject-mail-from', () => write('550 5.1.0 Sender rejected'))) return;
          const match = arg.match(/FROM:\s*<([^>]*)>/i);
          envelope = { from: match ? match[1] : arg, to: [] };
          write('250 2.1.0 Ok');
          return;
        }
        case 'RCPT': {
          if (failAt('reject-rcpt', () => write('550 5.1.1 Recipient rejected'))) return;
          const match = arg.match(/TO:\s*<([^>]*)>/i);
          envelope.to.push(match ? match[1] : arg);
          write('250 2.1.5 Ok');
          return;
        }
        case 'DATA':
          if (behavior.mode === 'hang-after-data') {
            write('354 End data with <CR><LF>.<CR><LF>');
            inData = true;
            dataLines = [];
            // Deliberately never answer: the client must time out.
            // Swallow the terminator without responding by switching
            // this connection into the swallowed mode (handled in
            // onData above).
            behavior.mode = 'hang-after-data-swallowed';
            return;
          }
          write('354 End data with <CR><LF>.<CR><LF>');
          inData = true;
          dataLines = [];
          return;
        case 'RSET':
          envelope = { from: null, to: [] };
          write('250 2.0.0 Ok');
          return;
        case 'NOOP':
          write('250 2.0.0 Ok');
          return;
        case 'QUIT':
          write('221 2.0.0 Bye');
          stream.end();
          return;
        default:
          write('502 5.5.1 Command not implemented');
      }
    }

    function onData(chunk) {
      buffer += chunk.toString('utf8');
      let index;
      while ((index = buffer.indexOf('\n')) !== -1) {
        const rawLine = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        // In hang-after-data-swallowed mode the DATA terminator is
        // consumed silently (no 250, no 554) — the send must time out.
        if (behavior.mode === 'hang-after-data-swallowed') {
          if (inData && rawLine.replace(/\r$/, '') === '.') inData = false;
          continue;
        }
        onLine(rawLine);
      }
    }

    socket.on('data', onData);
    if (behavior.mode === 'blackhole' || behavior.mode === 'greeting') {
      // Accept the connection and say nothing: the client's
      // greetingTimeout is the failure.
      return;
    }
    greeted = true;
    write('220 localhost FakeSMTP Service ready');
    void greeted;
  }

  server.listen = (port = 0, host = '127.0.0.1') =>
    new Promise((resolve, reject) => {
      netServer = net.createServer(handleConnection);
      netServer.on('error', reject);
      netServer.listen(port, host, () => {
        server.port = netServer.address().port;
        server.host = host;
        resolve(server);
      });
    });

  server.close = () =>
    new Promise((resolve) => {
      for (const socket of sockets) {
        try {
          socket.destroy();
        } catch {
          // Already gone.
        }
      }
      sockets.clear();
      if (!netServer) return resolve();
      netServer.close(() => resolve());
    });

  return server;
}

// Minimal raw SMTP client (plain TCP, no TLS) used by the pure tests so
// they need no node_modules. Sends each command only after the previous
// reply is complete (SMTP replies end at a line starting with a
// 3-digit code followed by a space; continuations use '-'), so
// multi-line EHLO replies cannot desynchronise the exchange. Returns
// every response line seen.
export async function smtpProbe({ host, port, commands = [], timeoutMs = 3000 }) {
  const lines = [];
  const queue = [...commands];
  await new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let buffer = '';
    let settled = false;
    const timer = setTimeout(done, timeoutMs);
    function done() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {
        // Already gone.
      }
      resolve();
    }
    function sendNext() {
      const next = queue.shift();
      if (next === undefined) {
        done();
        return;
      }
      try {
        socket.write(next + CRLF);
      } catch {
        done();
      }
    }
    socket.on('error', done);
    socket.on('close', done);
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let index;
      while ((index = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        lines.push(line);
        // A reply is complete at a final line: code + space. (A lone
        // greeting, a 235, a 250 and the last line of a multi-line
        // EHLO reply all match; continuation lines use '-'.)
        if (/^\d{3} /.test(line)) {
          sendNext();
        }
      }
    });
  });
  return lines;
}
