/* Copyright (c) 2026 geniuskey and SchoolBooks contributors. MIT (see ../../LICENSE-MIT). Drawings: CC BY 4.0.
   세 권의 표지 그림(잉크 선 + 빛나는 색). [data-cover="elementary|middle|high"] 자리에 넣는다.
   색은 모두 CSS 변수라 다크 모드에서 종이·잉크가 함께 바뀐다. */
(function () {
  "use strict";
  const ink = 'filter="url(#sb-ink)"';
  const C = {
    elementary: `
      <rect class="wash-warm" x="0" y="0" width="240" height="300" rx="10"/>
      <circle class="glow-halo cv-pulse" cx="178" cy="66" r="44"/>
      <circle class="glow" cx="178" cy="66" r="19"/>
      <g ${ink}>
        <circle class="fill-card" cx="108" cy="128" r="66"/>
        <circle class="ink" cx="108" cy="128" r="66"/>
        <circle class="ink-thin" cx="108" cy="128" r="58"/>
        ${Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180, r1 = i % 3 ? 52 : 47; return `<path class="${i % 3 ? "ink-thin" : "ink"}" d="M${(108 + Math.sin(a) * r1).toFixed(1)} ${(128 - Math.cos(a) * r1).toFixed(1)} L${(108 + Math.sin(a) * 57).toFixed(1)} ${(128 - Math.cos(a) * 57).toFixed(1)}"/>`; }).join("")}
        <path class="ink" d="M108 128 L92 156" stroke-width="4"/>
        <path class="ink cv-minute" d="M108 128 L108 80" stroke-width="2.6"/>
        <circle class="fill-ink" cx="108" cy="128" r="4.5"/>
        <path class="ink" d="M10 236 H230"/>
        <path class="wash-cool" d="M10 237 H230 V292 H10 Z"/>
        <path class="fill-card" d="M138 236 C134 206 146 186 168 186 C192 186 202 208 198 236 Z"/>
        <path class="ink" d="M138 236 C134 206 146 186 168 186 C192 186 202 208 198 236 M146 196 L149 174 L161 187 M175 187 L187 174 L190 196"/>
        <path class="ink-thin" d="M153 204 q4 -4 8 0 M172 204 q4 -4 8 0 M165 211 l2.5 2.5 l2.5 -2.5"/>
        <path class="ink" d="M198 230 C214 230 220 218 214 208"/>
        <path class="wash-warm" d="M44 232 V210 C34 208 34 190 48 190 C54 178 84 178 90 190 C104 190 104 208 94 210 V232 Z"/>
        <path class="ink" d="M44 232 V210 C34 208 34 190 48 190 C54 178 84 178 90 190 C104 190 104 208 94 210 V232 Z"/>
        <path class="ink-thin" d="M52 206 C52 196 86 196 86 206 V226 H52 Z"/>
        <path class="ink" d="M28 234 C40 240 100 240 112 234"/>
      </g>`,
    middle: `
      <rect class="wash-cool" x="0" y="0" width="240" height="300" rx="10"/>
      ${[[30, 34], [76, 22], [124, 46], [200, 30], [168, 80], [46, 92], [218, 104]].map(([x, y], i) => `<circle class="glow cv-twinkle" style="animation-delay:${i * 0.4}s" cx="${x}" cy="${y}" r="2.4"/>`).join("")}
      <circle class="glow-halo" cx="182" cy="52" r="20"/>
      <path class="fill-card" d="M174 38 a18 18 0 1 0 18 26 a14 14 0 1 1 -18 -26 z"/>
      <g ${ink}>
        <path class="wash-green" d="M0 186 L70 120 L118 160 L168 110 L240 170 V300 H0 Z"/>
        <path class="ink" d="M0 186 L70 120 L118 160 L168 110 L240 170"/>
        <path class="ink-soft" d="M118 160 H168 V110"/>
        <path class="wash-warm" d="M0 236 H240 V300 H0 Z"/>
        <path class="ink" d="M0 236 H240"/>
        <path class="fill-card" d="M30 236 L84 160 L138 236 Z"/>
        <path class="ink" d="M30 236 L84 160 L138 236 Z M84 160 L84 236 M84 172 L70 236 M78 150 L84 160 L90 150"/>
        <path class="ink" d="M150 244 L196 230 M152 230 L198 244"/>
      </g>
      <circle class="heat-halo cv-flicker" cx="174" cy="214" r="30"/>
      <path class="heat cv-flicker" d="M174 232 C160 222 166 206 172 196 C174 208 180 206 180 198 C190 210 188 226 174 232 Z"/>
      <path class="glow" d="M174 232 C168 226 170 218 174 212 C178 218 180 226 174 232 Z"/>
      ${[0, 1, 2].map((i) => `<circle class="glow cv-spark" style="animation-delay:${i * 0.7}s" cx="${170 + i * 5}" cy="196" r="1.8"/>`).join("")}`,
    high: `
      <rect class="wash-pink" x="0" y="0" width="240" height="300" rx="10"/>
      <g ${ink}>
        <path class="fill-card" d="M28 52 L196 40 L210 246 L42 258 Z"/>
        <path class="ink" d="M28 52 L196 40 L210 246 L42 258 Z"/>
        <path class="ink" d="M44 76 L184 66" stroke-width="5"/>
        <path class="ink" d="M46 94 L150 87" stroke-width="3"/>
        <path class="ink-thin" d="M48 112 L110 108 M49 124 L111 120 M50 136 L112 132 M51 148 L113 144 M52 160 L114 156 M53 172 L115 168 M54 184 L116 180"/>
        <path class="ink-thin" d="M124 108 L188 104 L194 186 L130 190 Z"/>
        <path class="ink-thin" d="M132 182 L190 178 M132 182 L127 112"/>
        <path class="ink cv-curve accent" d="M134 178 C152 176 166 170 174 156 C180 144 184 128 186 112" style="stroke:var(--accent)" stroke-width="2.6"/>
        <path class="ink-thin" d="M56 204 L196 194 M57 218 L197 208 M58 232 L150 226"/>
        <path class="fill-card" d="M150 262 C150 236 154 222 156 222 H210 C212 222 216 236 216 262 C216 280 196 288 183 288 C170 288 150 280 150 262 Z"/>
        <path class="ink" d="M150 262 C150 236 154 222 156 222 H210 C212 222 216 236 216 262 C216 280 196 288 183 288 C170 288 150 280 150 262 Z M216 238 C232 236 234 262 214 266"/>
      </g>
      <path class="ink-thin cv-steam" d="M170 214 C164 204 176 196 170 184 M186 214 C180 204 192 196 186 184 M202 214 C196 204 208 196 202 184"/>`
  };
  function fill(root) {
    (root || document).querySelectorAll("[data-cover]").forEach((el) => {
      const k = el.dataset.cover;
      if (!C[k] || el.querySelector("svg")) return;
      el.innerHTML = `<svg class="drawing cover-art" viewBox="0 0 240 300" role="img" aria-label="${el.dataset.label || ""}">${C[k]}</svg>`;
    });
  }
  window.SB_COVERS = { svg: C, fill };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => fill()); else fill();
})();
