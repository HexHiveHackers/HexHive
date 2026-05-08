// html-midi-player has no shipped types. We only use its side-effect import
// (which registers `<midi-player>` and `<midi-visualizer>` custom elements).
// Also expose a minimal structural type for the <midi-player> element so
// call sites can invoke its imperative methods (notably `stop()`) without
// suppressions.
declare module 'html-midi-player' {
  export interface MidiPlayerElement extends HTMLElement {
    start(): void;
    stop(): void;
    currentTime: number;
    duration: number;
  }
}
