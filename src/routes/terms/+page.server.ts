import { renderMarkdown } from '$lib/server/markdown';
import termsMd from '../../../docs/legal/TERMS.md?raw';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ html: renderMarkdown(termsMd) });
