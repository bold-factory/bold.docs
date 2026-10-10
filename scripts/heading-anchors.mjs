// Heading ids follow Mintlify's slugify and cleanHeadingId rules.
export function toHeadingText(heading) {
  const protectedText = [];
  const protectedHeading = heading.replace(/`([^`]*)`|<((?:https?:\/\/|mailto:)[^>\s]+|[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>/g, (_, code, link) => {
    protectedText.push(code ?? link.replace(/^mailto:/, ''));
    return `\u0000${protectedText.length - 1}\u0000`;
  });
  return protectedHeading
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|\s)[*_]([^*_\n]+)[*_]/g, '$1$2')
    .replace(/\u0000(\d+)\u0000/g, (_, index) => protectedText[Number(index)]);
}

export function createHeadingSlugger() {
  const occurrences = new Map();
  return heading => {
    const encoded = encodeURIComponent(toHeadingText(heading).toLowerCase().trim().replace(/\s+/g, '-'));
    const hasEncodedCharacters = /%[0-9A-F]{2}/.test(encoded);
    let slug = encoded.normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(hasEncodedCharacters ? /[^a-zA-Z\d%_]+/g : /[^a-z\d_]+/g, '-')
      .replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
    if (!hasEncodedCharacters) slug = slug.toLowerCase();
    const count = occurrences.get(slug) ?? 0;
    occurrences.set(slug, count + 1);
    if (count) slug = `${slug}-${count + 1}`;
    return decodeURIComponent(slug).replace(/[?,;:!'"()[\]{}]/g, '')
      .replace(/\p{Extended_Pictographic}|[‍︎️]/gu, '');
  };
}
