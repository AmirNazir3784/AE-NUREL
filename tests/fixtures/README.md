# Test-only TLS fixtures for the SMTP sink (NOT real credentials)

`smtp-sink-cert.pem` / `smtp-sink-key.pem` are a self-signed test certificate
for the local SMTP sink used by `tests/membership-mysql.test.mjs`. The
certificate is valid only for `127.0.0.1` / `localhost` and can never
authenticate any real service. `smtp-sink-ca.pem` is a copy of the
certificate itself (it is self-signed, so it is its own CA).

The app verifies SMTP TLS (`rejectUnauthorized: true` in
`server/membership/auth.mjs`), so Node must trust this CA when the suite
runs:

```
NODE_EXTRA_CA_CERTS=tests/fixtures/smtp-sink-ca.pem node --test tests/membership-mysql.test.mjs
```

Regenerate with:

```
openssl req -x509 -newkey rsa:2048 -keyout smtp-sink-key.pem \
  -out smtp-sink-cert.pem -days 3650 -nodes -subj "/CN=127.0.0.1" \
  -addext "subjectAltName=IP:127.0.0.1,DNS:localhost"
cp smtp-sink-cert.pem smtp-sink-ca.pem
```
