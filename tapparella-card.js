/**
 * Tapparella Card — Custom card per Home Assistant
 * Versione: 1.1.0
 * Compatibile con HACS
 */

// ─── EDITOR VISIVO ───────────────────────────────────────────────────────────
// Usa ha-selector (componente nativo HA) invece di ha-entity-picker.
// ha-selector riceve hass e selector come proprietà JS, non attributi HTML,
// quindi vanno assegnati imperativamente dopo la creazione del nodo.
class TapparellaCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...config };
    this._refresh();
  }

  set hass(hass) {
    this._hass = hass;
    this._refresh();
  }

  _refresh() {
    if (!this._hass || !this._config) return;

    const c = this._config;
    const root = this.shadowRoot;

    // Costruisce il DOM solo la prima volta
    if (!root.querySelector('.form')) {
      root.innerHTML = `
        <style>
          :host { display: block; }
          .form { display: flex; flex-direction: column; gap: 20px; padding: 4px 0; }
          .section-title {
            font-size: 11px; font-weight: 700; color: #9ca3af;
            text-transform: uppercase; letter-spacing: 0.1em;
            border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;
          }
          ha-selector { display: block; }
          .color-wrap { display: flex; flex-direction: column; gap: 8px; }
          .color-label { font-size: 12px; font-weight: 600; color: #374151; }
          .color-row { display: flex; align-items: center; gap: 12px; }
          input[type=color] {
            width: 44px; height: 44px; border-radius: 12px;
            border: 2px solid #e5e7eb; cursor: pointer;
            padding: 2px; background: none;
          }
          .color-hint { font-size: 12px; color: #9ca3af; }
        </style>
        <div class="form">
          <div class="section-title">Entità</div>
          <ha-selector id="sel-entity"></ha-selector>
          <ha-selector id="sel-energy"></ha-selector>
          <div class="section-title">Aspetto</div>
          <ha-selector id="sel-name"></ha-selector>
          <div class="color-wrap">
            <span class="color-label">Colore tema</span>
            <div class="color-row">
              <input type="color" id="color-input">
              <span class="color-hint">Colore principale bottoni e icone</span>
            </div>
          </div>
        </div>
      `;

      root.getElementById('sel-entity').addEventListener('value-changed', e => {
        e.stopPropagation();
        this._changed('entity', e.detail.value);
      });
      root.getElementById('sel-energy').addEventListener('value-changed', e => {
        e.stopPropagation();
        this._changed('energy_entity', e.detail.value);
      });
      root.getElementById('sel-name').addEventListener('value-changed', e => {
        e.stopPropagation();
        this._changed('name', e.detail.value);
      });
      root.getElementById('color-input').addEventListener('input', e => {
        this._changed('color', e.target.value);
      });
    }

    // Aggiorna le proprietà JS ad ogni refresh
    const selEntity = root.getElementById('sel-entity');
    selEntity.hass     = this._hass;
    selEntity.selector = { entity: { domain: 'cover' } };
    selEntity.value    = c.entity || '';
    selEntity.label    = 'Cover (obbligatoria)';
    selEntity.required = true;

    const selEnergy = root.getElementById('sel-energy');
    selEnergy.hass     = this._hass;
    selEnergy.selector = { entity: { domain: 'sensor' } };
    selEnergy.value    = c.energy_entity || '';
    selEnergy.label    = 'Sensore Energia (opzionale)';

    const selName = root.getElementById('sel-name');
    selName.hass     = this._hass;
    selName.selector = { text: {} };
    selName.value    = c.name || '';
    selName.label    = 'Nome stanza';

    const colorInput = root.getElementById('color-input');
    if (colorInput && document.activeElement !== colorInput) {
      colorInput.value = c.color || '#6366f1';
    }
  }

  _changed(key, value) {
    if (!this._config) return;
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('tapparella-card-editor', TapparellaCardEditor);


// ─── CARD PRINCIPALE ─────────────────────────────────────────────────────────
class TapparellaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  static getConfigElement() {
    return document.createElement('tapparella-card-editor');
  }

  static getStubConfig() {
    return {
      entity: '',
      energy_entity: '',
      name: 'Tapparella',
      color: '#6366f1',
    };
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateState();
  }

  _hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '99,102,241';
  }
  _lighten(hex, amt = 0.85) {
    const [r,g,b] = (hex.replace('#','').match(/.{2}/g)||[]).map(x=>parseInt(x,16));
    const mix = v => Math.round(v + (255 - v) * amt);
    return `#${[mix(r),mix(g),mix(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}`;
  }

  _buildSvg(pos, accent, light) {
    const numSlats = pos !== undefined ? Math.round((100 - pos) / 14) : 7;
    let slats = '';
    for (let i = 0; i < numSlats; i++) {
      const op = Math.max(0.15, 0.8 - i * 0.08).toFixed(2);
      slats += `<rect x="14" y="${14 + i * 8}" width="62" height="5" rx="2" fill="${accent}" opacity="${op}"/>`;
    }
    const sky = pos > 0
      ? `<rect x="14" y="14" width="62" height="${Math.round(pos * 0.6)}" rx="4" fill="#e0f2fe" opacity="0.9"/>`
      : '';
    const sun = pos === 100
      ? `<circle cx="65" cy="28" r="8" fill="#fef08a" opacity="0.8"/>`
      : '';
    return `
      <svg width="100" height="100" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
        <rect x="8" y="8" width="74" height="74" rx="8" fill="white" stroke="${light}" stroke-width="2"/>
        ${sky}${sun}${slats}
        <rect x="8" y="74" width="74" height="8" rx="4" fill="${light}"/>
      </svg>`;
  }

  _render() {
    const c = this._config;
    const accent = c.color || '#6366f1';
    const light  = this._lighten(accent);
    const rgb    = this._hexToRgb(accent);

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          border-radius: 28px;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08);
          padding: 4px;
          overflow: hidden;
          font-family: var(--primary-font-family, sans-serif);
        }
        .header { display: flex; align-items: center; gap: 12px; padding: 14px 16px 10px; }
        .icon-wrap {
          width: 40px; height: 40px; border-radius: 12px;
          background: ${light};
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .icon-wrap ha-icon { --mdc-icon-size: 22px; color: ${accent}; }
        .header-text { flex: 1; min-width: 0; }
        .room-name { font-size: 18px; font-weight: 600; color: #111827; line-height: 1.2; }
        .energy { font-size: 12px; color: ${accent}; font-weight: 500; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .visual-panel {
          background: ${light}; border-radius: 20px; margin: 0 4px; padding: 16px;
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          min-height: 130px; overflow: visible;
        }
        #svg-container { flex-shrink: 0; display: flex; align-items: center; }
        .pos-block { flex: 1; text-align: right; min-width: 0; padding-left: 12px; }
        .pos-number { font-size: 54px; font-weight: 300; color: ${accent}; line-height: 1; letter-spacing: -2px; white-space: nowrap; }
        .pos-label { font-size: 11px; color: #7b8094; margin-top: 4px; }
        .status-badge {
          display: inline-flex; align-items: center; margin-top: 10px;
          padding: 4px 14px; border-radius: 12px;
          background: rgba(${rgb},0.18); color: ${accent};
          font-size: 11px; font-weight: 700; white-space: nowrap;
        }
        .slider-wrap { padding: 12px 16px 4px; display: flex; align-items: center; gap: 10px; }
        .slider-wrap ha-icon { --mdc-icon-size: 18px; color: ${accent}; flex-shrink: 0; }
        input[type=range] {
          flex: 1; -webkit-appearance: none; height: 6px; border-radius: 3px;
          background: ${light}; outline: none; cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: ${accent}; box-shadow: 0 2px 6px rgba(${rgb},0.4);
          cursor: pointer; transition: transform 0.15s;
        }
        input[type=range]::-webkit-slider-thumb:active { transform: scale(1.2); }
        .buttons { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; padding: 8px; }
        .btn {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 5px; padding: 14px 4px; border-radius: 16px;
          border: 1.5px solid transparent; cursor: pointer; font-size: 11px; font-weight: 600;
          transition: background 0.18s, box-shadow 0.18s, color 0.18s; user-select: none;
        }
        .btn ha-icon { --mdc-icon-size: 20px; transition: color 0.18s; }
        .btn-open  { background: #d1fae5; color: #10b981; border-color: #a7f3d0; }
        .btn-stop  { background: #fef3c7; color: #f59e0b; border-color: #fde68a; }
        .btn-close { background: ${light}; color: ${accent}; border-color: rgba(${rgb},0.3); }
        .btn-open:hover  { background: #10b981; color: white; box-shadow: 0 4px 14px rgba(16,185,129,0.35); border-color: transparent; }
        .btn-stop:hover  { background: #f59e0b; color: white; box-shadow: 0 4px 14px rgba(245,158,11,0.35); border-color: transparent; }
        .btn-close:hover { background: ${accent}; color: white; box-shadow: 0 4px 14px rgba(${rgb},0.35); border-color: transparent; }
      </style>
      <ha-card>
        <div class="header">
          <div class="icon-wrap"><ha-icon icon="mdi:window-shutter"></ha-icon></div>
          <div class="header-text">
            <div class="room-name" id="room-name">${c.name || 'Tapparella'}</div>
            <div class="energy" id="energy-text">${c.energy_entity ? 'Energia: --' : (!c.entity ? 'Seleziona una cover entity' : '')}</div>
          </div>
        </div>
        <div class="visual-panel">
          <div id="svg-container"></div>
          <div class="pos-block">
            <div class="pos-number" id="pos-number">--</div>
            <div class="pos-label">Posizione</div>
            <div class="status-badge" id="status-badge">--</div>
          </div>
        </div>
        <div class="slider-wrap">
          <ha-icon icon="mdi:arrow-up-thin"></ha-icon>
          <input type="range" min="0" max="100" step="1" id="pos-slider" value="0"/>
          <ha-icon icon="mdi:arrow-down-thin"></ha-icon>
        </div>
        <div class="buttons">
          <div class="btn btn-open" id="btn-open"><ha-icon icon="mdi:arrow-up-bold"></ha-icon><span>Apri</span></div>
          <div class="btn btn-stop" id="btn-stop"><ha-icon icon="mdi:stop"></ha-icon><span>Stop</span></div>
          <div class="btn btn-close" id="btn-close"><ha-icon icon="mdi:arrow-down-bold"></ha-icon><span>Chiudi</span></div>
        </div>
      </ha-card>
    `;

    this._bindEvents(accent, light);
  }

  _bindEvents(accent, light) {
    const root = this.shadowRoot;
    root.getElementById('btn-open')?.addEventListener('click', () => this._callService('cover', 'open_cover'));
    root.getElementById('btn-stop')?.addEventListener('click', () => this._callService('cover', 'stop_cover'));
    root.getElementById('btn-close')?.addEventListener('click', () => this._callService('cover', 'close_cover'));

    const slider = root.getElementById('pos-slider');
    let dragging = false;
    slider?.addEventListener('mousedown',  () => dragging = true);
    slider?.addEventListener('touchstart', () => dragging = true, { passive: true });
    slider?.addEventListener('mouseup',  () => { dragging = false; this._callService('cover', 'set_cover_position', { position: parseInt(slider.value) }); });
    slider?.addEventListener('touchend', () => { dragging = false; this._callService('cover', 'set_cover_position', { position: parseInt(slider.value) }); });
    slider?.addEventListener('input', () => {
      if (!dragging) return;
      const pos = parseInt(slider.value);
      const n = root.getElementById('pos-number');
      if (n) n.textContent = pos + '%';
      const svg = root.getElementById('svg-container');
      if (svg) svg.innerHTML = this._buildSvg(pos, accent, light);
    });
  }

  _updateState() {
    if (!this._hass || !this._config) return;
    const root = this.shadowRoot;
    if (!root.getElementById("pos-number")) return;
    // Nessuna entity: mostra placeholder statico
    if (!this._config.entity) {
      const accent = this._config.color || "#6366f1";
      const light  = this._lighten(accent);
      const svgEl = root.getElementById("svg-container");
      if (svgEl && !svgEl.innerHTML) svgEl.innerHTML = this._buildSvg(50, accent, light);
      const posEl = root.getElementById("pos-number");
      if (posEl) posEl.textContent = "--";
      const badgeEl = root.getElementById("status-badge");
      if (badgeEl) badgeEl.textContent = "···";
      return;
    }

    const accent = this._config.color || '#6366f1';
    const light  = this._lighten(accent);
    const coverState = this._hass.states[this._config.entity];
    const pos    = coverState?.attributes?.current_position;
    const posText = pos !== undefined ? pos + '%' : '--';
    const stato   = pos === 100 ? 'Aperta' : pos === 0 ? 'Chiusa' : pos !== undefined ? 'Parziale' : '--';

    const posEl = root.getElementById('pos-number');
    if (posEl) posEl.textContent = posText;
    const badgeEl = root.getElementById('status-badge');
    if (badgeEl) badgeEl.textContent = stato;
    const svgEl = root.getElementById('svg-container');
    if (svgEl) svgEl.innerHTML = this._buildSvg(pos, accent, light);
    const slider = root.getElementById('pos-slider');
    if (slider && pos !== undefined) slider.value = pos;

    if (this._config.energy_entity) {
      const eState = this._hass.states[this._config.energy_entity];
      const eVal   = eState?.state ?? '--';
      const eUnit  = eState?.attributes?.unit_of_measurement ?? 'kWh';
      const eEl    = root.getElementById('energy-text');
      if (eEl) eEl.textContent = `Energia: ${eVal} ${eUnit}`;
    }

    const nameEl = root.getElementById('room-name');
    if (nameEl) nameEl.textContent = this._config.name || 'Tapparella';
  }

  _callService(domain, service, data = {}) {
    if (!this._hass || !this._config?.entity) return;
    this._hass.callService(domain, service, { entity_id: this._config.entity, ...data });
  }

  getCardSize() { return 4; }
}

customElements.define('tapparella-card', TapparellaCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'tapparella-card',
  name: 'Tapparella Card',
  description: 'Card per il controllo delle tapparelle con grafica animata, slider e pulsanti.',
  preview: true,
  documentationURL: 'https://github.com/TUO_USERNAME/tapparella-card',
});
