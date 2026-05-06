import type { Session } from '$lib/auth';

declare global {
  namespace App {
    interface Locals {
      user: Session['user'] | null;
      session: Session['session'] | null;
    }
  }

  // html-midi-player ships no types; we only consume its custom-element
  // registration side-effect, so a minimal element shim is all we need.
  namespace svelteHTML {
    interface IntrinsicElements {
      'midi-player': {
        src?: string;
        'sound-font'?: string;
        style?: string;
      };
      'midi-visualizer': {
        src?: string;
        type?: string;
        style?: string;
      };
    }
  }
}
