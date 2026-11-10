export function quoteContent(text: string, bookTitle: string, author?: string): string {
  return `“${text.trim()}”\n— ${author ? author + ', ' : ''}${bookTitle}`;
}
export async function copyQuote(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const ok = document.execCommand('copy');
  field.remove();
  if (!ok) throw new Error('Copy unavailable in this browser');
}
export function shareTelegram(text: string): void {
  window.open(`https://t.me/share/url?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}
