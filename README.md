# mail-guard

Holds the Gmail connector's three actually-sending actions — `send_message`,
`reply`, `forward` — and asks before any of them go out, with two buttons:
**Send** / **Reject**.

- **Send** → goes through normally.
- **Reject** → nothing is sent; a matching Gmail draft is created instead
  (recipients, subject, body carried over), so the work isn't lost. If the
  draft can't be created, it still blocks the send and says nothing went out.

## Install

```
/plugin install mail-guard --marketplace stalinraja-afm/mail-guard
```
