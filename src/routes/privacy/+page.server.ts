import { renderMarkdown } from '$lib/server/markdown';
import privacyMd from '../../../docs/legal/PRIVACY.md?raw';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ html: renderMarkdown(privacyMd) });
