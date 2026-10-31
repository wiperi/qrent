export const CONTACT_EMAIL = 'yyzyfish5@gmail.com';

export function contactEmailDraft(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const subject = input.subject.replace(/[\r\n]/g, ' ').trim();
  const body = `Name: ${input.name}\nReply to: ${input.email}\n\n${input.message}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
