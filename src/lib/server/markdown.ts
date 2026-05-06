import GitHubSlugger from 'github-slugger';
import { marked } from 'marked';

/**
 * Render a markdown string to HTML, attaching a GitHub-style slug `id` to every
 * heading so deep links (e.g., `/privacy#11-user-rights-under-gdpr`) work and
 * the prose plugin's heading-anchor styles activate.
 */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { gfm: true, async: false });
  const slugger = new GitHubSlugger();
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_match, level, inner) => {
    const text = inner.replace(/<[^>]+>/g, '');
    const id = slugger.slug(text);
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}
