import type { Register, ToolCallArgs } from 'claude-code'

// Matches the Gmail connector's three actions that actually send mail:
// mcp__<server>__send_message / __reply / __forward.
const MAIL_SEND = /__(send_message|reply|forward)$/

function draftArgs(tool: string, input: Record<string, unknown>): Record<string, unknown> | undefined {
  const name = tool.split('__').pop()

  if (name === 'send_message') {
    if (input.draftId) return undefined // already a draft; nothing new to save
    const { to, cc, bcc, subject, body, htmlBody, attachments, includeSignature, replyToMessageId } = input
    return { to, cc, bcc, subject, body, htmlBody, attachments, includeSignature, replyToMessageId }
  }
  if (name === 'reply') {
    const { to, cc, bcc, body, htmlBody, attachments, includeSignature, messageId } = input
    return { to, cc, bcc, body, htmlBody, attachments, includeSignature, replyToMessageId: messageId }
  }
  if (name === 'forward') {
    const { to, cc, bcc, forwardText, htmlBody, attachments, includeSignature } = input
    return { to, cc, bcc, body: forwardText, htmlBody, attachments, includeSignature, subject: 'Fwd:' }
  }
  return undefined
}

function summarize(input: Record<string, unknown>) {
  const to = Array.isArray(input.to) ? input.to.join(', ') : undefined
  const subject = typeof input.subject === 'string' ? input.subject : undefined
  const lines = [to && `To: ${to}`, subject && `Subject: ${subject}`].filter(Boolean)
  return lines.length ? lines.join('\n') : '(reply/forward of an existing message)'
}

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    if (!e.tool.startsWith('mcp__') || !MAIL_SEND.test(e.tool)) return next(e)

    const input = e as unknown as Record<string, unknown>

    const choice = await $.ui
      .ask(`Send this email?\n\n${summarize(input)}`, ['Send', 'Reject'])
      .catch(() => 'Reject')

    if (choice === 'Send') return next(e)

    const draftTool = e.tool.replace(MAIL_SEND, '__create_draft')
    const args = draftArgs(e.tool, input)

    if (!args) return { deny: `${$.plugin.name}: rejected — not sent.` }

    try {
      await $.tool.call({ tool: draftTool, ...args } as unknown as ToolCallArgs)
      return { deny: `${$.plugin.name}: rejected — saved as a draft instead of sending.` }
    } catch {
      return { deny: `${$.plugin.name}: rejected — could not save a draft automatically, nothing was sent.` }
    }
  })
}
