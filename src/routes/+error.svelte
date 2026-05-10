<script lang="ts">
  import { page } from '$app/state';

  const status = $derived(page.status);
  const message = $derived(page.error?.message ?? 'route not found');
  const title = $derived(status === 404 ? 'wild missingno. appeared' : 'a glitch in the cartridge');

  const portals = [
    { href: '/romhacks', label: 'ROM HACKS', accent: 'emerald', glyph: 'RH' },
    { href: '/sprites', label: 'SPRITES', accent: 'fuchsia', glyph: 'SP' },
    { href: '/sounds', label: 'SOUNDS', accent: 'amber', glyph: 'SD' },
    { href: '/scripts', label: 'SCRIPTS', accent: 'sky', glyph: 'SC' },
    { href: '/tools', label: 'TOOLS', accent: 'violet', glyph: 'TL' },
    { href: '/midi-lab', label: 'MIDI LAB', accent: 'rose', glyph: 'ML' },
  ] as const;
</script>

<svelte:head>
  <title>{status} — {title} · HexHive</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="error-shell relative isolate flex flex-1 items-center justify-center overflow-hidden px-6 py-20">
  <!-- hex void backdrop -->
  <div class="hex-void" aria-hidden="true"></div>
  <div class="scanlines" aria-hidden="true"></div>
  <div class="vignette" aria-hidden="true"></div>

  <!-- floating glitch bars -->
  <div class="glitch-bar glitch-bar--a" aria-hidden="true"></div>
  <div class="glitch-bar glitch-bar--b" aria-hidden="true"></div>
  <div class="glitch-bar glitch-bar--c" aria-hidden="true"></div>

  <div class="relative z-10 mx-auto w-full max-w-3xl text-center">
    <!-- eyebrow -->
    <p class="font-display text-[10px] tracking-[0.4em] text-white/40 uppercase animate-fade-down" style="animation-delay: 80ms">
      <span class="inline-block size-1.5 -translate-y-0.5 mr-2 bg-emerald-400 animate-blink"></span>
      ENC. {String(status)} · LOG CORRUPTED
    </p>

    <!-- glitch numerals -->
    <h1
      class="glitch font-display mt-10 select-none text-[18vw] leading-[0.82] tracking-tighter text-white sm:text-[156px]"
      data-text={String(status)}
      aria-label={String(status)}
    >
      {status}
    </h1>

    <!-- missingno sprite block -->
    <div class="mx-auto mt-12 flex items-center justify-center gap-3 animate-fade-down" style="animation-delay: 320ms">
      <div class="missingno" aria-hidden="true">
        {#each Array(70) as _, i}
          <span style="--i: {i}"></span>
        {/each}
      </div>
    </div>

    <!-- title -->
    <h2 class="font-display mt-10 text-sm uppercase tracking-[0.32em] text-white/90 sm:text-base animate-fade-down" style="animation-delay: 420ms">
      {title}
    </h2>

    <!-- terminal line -->
    <p class="mt-6 font-mono text-[13px] leading-relaxed text-white/55 animate-fade-down" style="animation-delay: 520ms">
      <span class="text-emerald-400/80">trainer@hexhive</span><span class="text-white/30">:</span><span class="text-fuchsia-300/80">{page.url.pathname}</span><span class="text-white/30">$</span>
      <span class="text-white/70"> {message}</span>
      <span class="caret"></span>
    </p>

    <!-- portals -->
    <nav class="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {#each portals as p, i}
        <a
          href={p.href}
          class="portal animate-fade-up group"
          data-accent={p.accent}
          style="animation-delay: {620 + i * 90}ms"
        >
          <span class="portal__glyph font-display">{p.glyph}</span>
          <span class="portal__label font-display">{p.label}</span>
          <span class="portal__hex" aria-hidden="true"></span>
        </a>
      {/each}
    </nav>

  </div>
</main>

<style>
  .error-shell {
    background:
      radial-gradient(1100px 600px at 50% -10%, rgba(16, 185, 129, 0.08), transparent 60%),
      radial-gradient(900px 500px at 90% 110%, rgba(217, 70, 239, 0.07), transparent 60%),
      #07080b;
    min-height: calc(100svh - 4rem);
  }

  /* honeycomb grid */
  .hex-void {
    position: absolute;
    inset: -10%;
    background-image:
      linear-gradient(60deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px),
      linear-gradient(-60deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px),
      linear-gradient(0deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    background-size: 28px 48px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    animation: drift 26s linear infinite;
  }
  @keyframes drift {
    to {
      transform: translate3d(28px, 48px, 0);
    }
  }

  .scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.035) 0,
      rgba(255, 255, 255, 0.035) 1px,
      transparent 1px,
      transparent 3px
    );
    mix-blend-mode: overlay;
    pointer-events: none;
  }

  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.7) 100%);
    pointer-events: none;
  }

  /* glitch bars sliding through */
  .glitch-bar {
    position: absolute;
    left: -10%;
    width: 120%;
    height: 14px;
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: 0.55;
  }
  .glitch-bar--a {
    top: 22%;
    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.28), transparent);
    animation: shear 5.4s ease-in-out infinite;
  }
  .glitch-bar--b {
    top: 58%;
    height: 4px;
    background: linear-gradient(90deg, transparent, rgba(217, 70, 239, 0.55), transparent);
    animation: shear 7.1s ease-in-out -2.2s infinite reverse;
  }
  .glitch-bar--c {
    top: 78%;
    height: 22px;
    background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.18), transparent);
    animation: shear 9s ease-in-out -1s infinite;
  }
  @keyframes shear {
    0%, 100% { transform: translateX(-15%) skewX(0deg); opacity: 0; }
    8% { opacity: 0.7; }
    50% { transform: translateX(8%) skewX(-12deg); opacity: 0.5; }
    92% { opacity: 0.6; }
  }

  /* glitch numerals — RGB split + jitter */
  .glitch {
    position: relative;
    display: inline-block;
    text-shadow:
      0 0 30px rgba(16, 185, 129, 0.25),
      0 0 80px rgba(217, 70, 239, 0.18);
    animation: fade-down 0.7s ease-out both;
    animation-delay: 160ms;
  }
  .glitch::before,
  .glitch::after {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .glitch::before {
    color: #10b981;
    transform: translate(-3px, 0);
    mix-blend-mode: screen;
    clip-path: polygon(0 0, 100% 0, 100% 38%, 0 38%);
    animation: glitch-a 3.6s steps(1) infinite;
  }
  .glitch::after {
    color: #d946ef;
    transform: translate(3px, 0);
    mix-blend-mode: screen;
    clip-path: polygon(0 60%, 100% 60%, 100% 100%, 0 100%);
    animation: glitch-b 4.2s steps(1) infinite;
  }
  @keyframes glitch-a {
    0%, 92%, 100% { transform: translate(-3px, 0); clip-path: polygon(0 0, 100% 0, 100% 38%, 0 38%); }
    93% { transform: translate(-7px, 1px); clip-path: polygon(0 12%, 100% 12%, 100% 22%, 0 22%); }
    96% { transform: translate(-2px, -2px); clip-path: polygon(0 70%, 100% 70%, 100% 80%, 0 80%); }
  }
  @keyframes glitch-b {
    0%, 88%, 100% { transform: translate(3px, 0); clip-path: polygon(0 60%, 100% 60%, 100% 100%, 0 100%); }
    89% { transform: translate(8px, -1px); clip-path: polygon(0 40%, 100% 40%, 100% 50%, 0 50%); }
    94% { transform: translate(2px, 2px); clip-path: polygon(0 84%, 100% 84%, 100% 96%, 0 96%); }
  }

  /* missingno sprite — 10x7 corrupted block */
  .missingno {
    --cell: 10px;
    display: grid;
    grid-template-columns: repeat(10, var(--cell));
    grid-template-rows: repeat(7, var(--cell));
    gap: 1px;
    padding: 6px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.6),
      0 0 40px rgba(16, 185, 129, 0.15);
  }
  .missingno span {
    background: rgba(255, 255, 255, 0.85);
    animation: pix 1.6s steps(2) infinite;
    animation-delay: calc(var(--i) * 23ms);
  }
  .missingno span:nth-child(3n) { background: #10b981; }
  .missingno span:nth-child(5n) { background: #d946ef; }
  .missingno span:nth-child(7n) { background: #f59e0b; }
  .missingno span:nth-child(11n) { background: #38bdf8; }
  .missingno span:nth-child(2n+1) { animation-duration: 2.3s; }
  @keyframes pix {
    0%, 70% { opacity: 1; transform: scale(1); }
    72% { opacity: 0; }
    74% { opacity: 1; transform: scale(0.7); }
    100% { opacity: 1; transform: scale(1); }
  }

  /* portals */
  .portal {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 18px 16px 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0));
    overflow: hidden;
    transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease;
  }
  .portal::before {
    content: '';
    position: absolute;
    left: 0; top: 0;
    width: 4px; height: 100%;
    background: var(--portal-color);
    transform: scaleY(0.3);
    transform-origin: top;
    transition: transform 0.35s ease;
  }
  .portal:hover {
    transform: translateY(-3px);
    border-color: color-mix(in oklch, var(--portal-color) 55%, transparent);
    background: linear-gradient(180deg, color-mix(in oklch, var(--portal-color) 12%, transparent), transparent);
  }
  .portal:hover::before { transform: scaleY(1); }

  .portal[data-accent='emerald'] { --portal-color: #10b981; }
  .portal[data-accent='fuchsia'] { --portal-color: #d946ef; }
  .portal[data-accent='amber']   { --portal-color: #f59e0b; }
  .portal[data-accent='sky']     { --portal-color: #38bdf8; }
  .portal[data-accent='violet']  { --portal-color: #a78bfa; }
  .portal[data-accent='rose']    { --portal-color: #fb7185; }

  .portal__glyph {
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--portal-color);
    padding: 4px 6px;
    border: 1px solid color-mix(in oklch, var(--portal-color) 40%, transparent);
    background: color-mix(in oklch, var(--portal-color) 10%, transparent);
  }
  .portal__label {
    font-size: 10px;
    letter-spacing: 0.18em;
    color: rgba(255, 255, 255, 0.85);
  }
  .portal__hex {
    position: absolute;
    right: -14px; bottom: -14px;
    width: 56px; height: 56px;
    background: var(--portal-color);
    opacity: 0.07;
    clip-path: polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%);
    transition: opacity 0.3s ease, transform 0.4s ease;
  }
  .portal:hover .portal__hex {
    opacity: 0.18;
    transform: rotate(30deg) scale(1.1);
  }

  /* terminal caret */
  .caret {
    display: inline-block;
    width: 8px;
    height: 14px;
    margin-left: 4px;
    background: rgba(255, 255, 255, 0.7);
    transform: translateY(2px);
    animation: blink 1.05s steps(2) infinite;
  }
  .animate-blink { animation: blink 1s steps(2) infinite; }
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  /* entrance animations */
  .animate-fade-down { animation: fade-down 0.6s ease-out both; }
  .animate-fade-up { animation: fade-up 0.55s ease-out both; }
  @keyframes fade-down {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .glitch::before, .glitch::after,
    .glitch-bar--a, .glitch-bar--b, .glitch-bar--c,
    .missingno span, .hex-void, .caret, .animate-blink,
    .animate-fade-down, .animate-fade-up {
      animation-duration: 0.001ms;
      animation-iteration-count: 1;
    }
  }
</style>
