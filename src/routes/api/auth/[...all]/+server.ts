import { auth } from '$lib/auth';
import type { RequestHandler } from './$types';

const handle: RequestHandler = ({ request }) => auth.handler(request);
export const GET = handle;
export const POST = handle;
