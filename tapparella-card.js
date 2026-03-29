/**
 * Tapparella Card — Custom card per Home Assistant
 * Versione: 1.0.0
 * Compatibile con HACS
 */

// ─── EDITOR VISIVO ───────────────────────────────────────────────────────────
class TapparellaCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._built = false;
  }

  setConfig(config) {
    this._config = { ...config };
    if (this._built) {
      this._syncValues();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) {
      this._build();
    }
    // Propaga hass agli entity-picker ogni volta
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(p => {
      p.hass = hass;
    });
  }

  _build() {
    this._built = true;
    const root = this.shadowRoot;

    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; }
      .form { display: flex; flex-direction: column; gap: 16px; padding: 4px 0; }
      .section-title {
        font-size: 11px; font-weight: 700; color: #9ca3af;
        text-transform: uppercase; letter-spacing: 0.1em;
        border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;
        margin-top: 4px;
      }
      label {
        font-size: 12px; font-weight: 600; color: #6b7280;
        text-transform: uppercase; letter-spacing: 0.05em;
        margin-bottom: 4px; display: block;
      }
      ha-entity-picker, ha-textfield { display: block; width: 100%; }
      .color-row { display: flex; align-items: center; gap: 12px; }
      .color-row input[type=color] {
        width: 44px; height: 44px; border-radius: 12px;
        border: 2px solid #e5e7eb; cursor: pointer;
        padding: 2px; background: none;
      }
      .color-hint { font-size: 12px; color: #9ca3af; }
    `;
    root.appendChild(style);

    const form = document.createElement('div');
    form.className = 'form';

    // ── Sezione Entità ──
    const secEntita = document.createElement('div');
    secEntita.className = 'section-title';
    secEntita.textContent = 'Entità';
    form.appendChild(secEntita);

    // Cover picker
    form.appendChild(this._makePickerField(
      'Cover (obbligatoria)', 'entity', ['cover']
    ));

    // Energia picker
    form.appendChild(this._makePickerField(
      'Sensore Energia (opzionale)', 'energy_entity', ['sensor']
    ));

    // ── Sezione Aspetto ──
    const secAspetto = document.createElement('div');
    secAspetto.className = 'section-title';
    secAspetto.textContent = 'Aspetto';
    form.appendChild(secAspetto);

    // Nome stanza
    const nomeWrap = document.createElement('div');
    const nomeLabel = document.createElement('label');
    nomeLabel.textContent = 'Nome stanza';
    const nomeField = document.createElement('ha-textfield');
    nomeField.setAttribute('placeholder', 'Es. Soggiorno');
    nomeField.style.width = '100%';
    nomeField.addEventListener('input', e => this._changed('name', e.target.value));
    nomeField.addEventListener('change', e => this._changed('name', e.target.value));
    this._nomeField = nomeField;
    nomeWrap.appendChild(nomeLabel);
    nomeWrap.appendChild(nomeField);
    form.appendChild(nomeWrap);

    // Colore
    const colorWrap = document.createElement('div');
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Colore tema';
    const colorRow = document.createElement('div');
    colorRow.className = 'color-row';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.addEventListener('input', e => this._changed('color', e.target.value));
    const colorHint = document.createElement('span');
    colorHint.className = 'color-hint';
    colorHint.textContent = 'Colore principale bottoni e icone';
    colorRow.appendChild(colorInput);
    colorRow.appendChild(colorHint);
    this._colorInput = colorInput;
    colorWrap.appendChild(colorLabel);
    colorWrap.appendChild(colorRow);
    form.appendChild(colorWrap);

    root.appendChild(form);
    this._syncValues();
  }

  _makePickerField(labelText, key, domains) {
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = labelText;

    const picker = document.createElement('ha-entity-picker');
    picker.setAttribute('allow-custom-entity', '');
    picker.includeDomains = domains;
    if (this._hass) picker.hass = this._hass;

    picker.addEventListener('value-changed', e => {
      this._changed(key, e.detail.value);
    });

    // Salva riferimento per sync
    if (key === 'entity')        this._entityPicker = picker;
    if (key === 'energy_entity') this._energyPicker = picker;

    wrap.appendChild(label);
    wrap.appendChild(picker);
    return wrap;
  }

  _syncValues() {
    const c = this._config || {};
    if (this._entityPicker) this._entityPicker.value = c.entity || '';
    if (this._energyPicker) this._energyPicker.value = c.energy_entity || '';
    if (this._nomeField)    this._nomeField.value    = c.name  || '';
    if (this._colorInput)   this._colorInput.value   = c.color || '#6366f1';
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
      entity: 'cover.tapparella',
      energy_entity: '',
      name: 'Tapparella',
      color: '#6366f1',
    };
  }

  setConfig(config) {
    if (!config.entity) throw new Error('Specifica una cover entity.');
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateState();
  }

  // ── helpers colore ──
  _hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '99,102,241';
  }
  _lighten(hex, amt = 0.85) {
    const [r,g,b] = (hex.replace('#','').match(/.{2}/g)||[]).map(x=>parseInt(x,16));
    const mix = v => Math.round(v + (255 - v) * amt);
    return `#${[mix(r),mix(g),mix(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}`;
  }

  // ── SVG tapparella ──
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

        /* ── Header ── */
        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px 10px;
        }
        .icon-wrap {
          width: 40px; height: 40px; border-radius: 12px;
          background: ${light};
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .icon-wrap ha-icon { --mdc-icon-size: 22px; color: ${accent}; }
        .header-text { flex: 1; min-width: 0; }
        .room-name { font-size: 18px; font-weight: 600; color: #111827; line-height: 1.2; }
        .energy {
          font-size: 12px; color: ${accent}; font-weight: 500; margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Visual panel ── */
        .visual-panel {
          background: ${light};
          border-radius: 20px;
          margin: 0 4px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          overflow: hidden;
        }
        .pos-block { flex: 1; text-align: right; min-width: 0; padding-left: 12px; }
        .pos-number {
          font-size: 54px; font-weight: 300; color: ${accent};
          line-height: 1; letter-spacing: -2px; white-space: nowrap;
        }
        .pos-label { font-size: 11px; color: #7b8094; margin-top: 4px; }
        .status-badge {
          display: inline-flex; align-items: center; margin-top: 10px;
          padding: 4px 14px; border-radius: 12px;
          background: rgba(${rgb},0.18); color: ${accent};
          font-size: 11px; font-weight: 700; white-space: nowrap;
        }

        /* ── Slider ── */
        .slider-wrap {
          padding: 12px 16px 4px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .slider-wrap ha-icon { --mdc-icon-size: 18px; color: ${accent}; flex-shrink: 0; }
        input[type=range] {
          flex: 1;
          -webkit-appearance: none;
          height: 6px;
          border-radius: 3px;
          background: ${light};
          outline: none;
          cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: ${accent};
          box-shadow: 0 2px 6px rgba(${rgb},0.4);
          cursor: pointer;
          transition: transform 0.15s;
        }
        input[type=range]::-webkit-slider-thumb:active { transform: scale(1.2); }

        /* ── Pulsanti ── */
        .buttons {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
          padding: 8px;
        }
        .btn {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 5px;
          padding: 14px 4px;
          border-radius: 16px;
          border: 1.5px solid transparent;
          cursor: pointer;
          font-size: 11px; font-weight: 600;
          transition: background 0.18s, box-shadow 0.18s, color 0.18s;
          user-select: none;
        }
        .btn ha-icon { --mdc-icon-size: 20px; transition: color 0.18s; }

        .btn-open  { background: #d1fae5; color: #10b981; border-color: #a7f3d0; }
        .btn-stop  { background: #fef3c7; color: #f59e0b; border-color: #fde68a; }
        .btn-close { background: ${light}; color: ${accent}; border-color: rgba(${rgb},0.3); }

        .btn-open:hover  { background: #10b981; color: white; box-shadow: 0 4px 14px rgba(16,185,129,0.35); border-color: transparent; }
        .btn-stop:hover  { background: #f59e0b; color: white; box-shadow: 0 4px 14px rgba(245,158,11,0.35);  border-color: transparent; }
        .btn-close:hover { background: ${accent}; color: white; box-shadow: 0 4px 14px rgba(${rgb},0.35);    border-color: transparent; }

        .btn-open:hover  ha-icon, .btn-open:hover  span { color: white; }
        .btn-stop:hover  ha-icon, .btn-stop:hover  span { color: white; }
        .btn-close:hover ha-icon, .btn-close:hover span { color: white; }
      </style>

      <ha-card>
        <!-- Header -->
        <div class="header">
          <div class="icon-wrap">
            <ha-icon icon="mdi:window-shutter"></ha-icon>
          </div>
          <div class="header-text">
            <div class="room-name" id="room-name">${c.name || 'Tapparella'}</div>
            <div class="energy" id="energy-text">${c.energy_entity ? 'Energia: --' : ''}</div>
          </div>
        </div>

        <!-- Pannello visivo -->
        <div class="visual-panel">
          <div id="svg-container"></div>
          <div class="pos-block">
            <div class="pos-number" id="pos-number">--</div>
            <div class="pos-label">Posizione</div>
            <div class="status-badge" id="status-badge">--</div>
          </div>
        </div>

        <!-- Slider -->
        <div class="slider-wrap">
          <ha-icon icon="mdi:arrow-up-thin"></ha-icon>
          <input type="range" min="0" max="100" step="1" id="pos-slider" value="0"/>
          <ha-icon icon="mdi:arrow-down-thin"></ha-icon>
        </div>

        <!-- Pulsanti -->
        <div class="buttons">
          <div class="btn btn-open" id="btn-open">
            <ha-icon icon="mdi:arrow-up-bold"></ha-icon>
            <span>Apri</span>
          </div>
          <div class="btn btn-stop" id="btn-stop">
            <ha-icon icon="mdi:stop"></ha-icon>
            <span>Stop</span>
          </div>
          <div class="btn btn-close" id="btn-close">
            <ha-icon icon="mdi:arrow-down-bold"></ha-icon>
            <span>Chiudi</span>
          </div>
        </div>
      </ha-card>
    `;

    this._bindEvents(accent, light);
  }

  _bindEvents(accent, light) {
    const root = this.shadowRoot;

    // Pulsanti
    root.getElementById('btn-open')?.addEventListener('click', () => {
      this._callService('cover', 'open_cover');
    });
    root.getElementById('btn-stop')?.addEventListener('click', () => {
      this._callService('cover', 'stop_cover');
    });
    root.getElementById('btn-close')?.addEventListener('click', () => {
      this._callService('cover', 'close_cover');
    });

    // Slider: aggiorna posizione al rilascio
    const slider = root.getElementById('pos-slider');
    let dragging = false;
    slider?.addEventListener('mousedown', () => dragging = true);
    slider?.addEventListener('touchstart', () => dragging = true);
    slider?.addEventListener('mouseup', () => {
      dragging = false;
      this._callService('cover', 'set_cover_position', { position: parseInt(slider.value) });
    });
    slider?.addEventListener('touchend', () => {
      dragging = false;
      this._callService('cover', 'set_cover_position', { position: parseInt(slider.value) });
    });
    // Aggiorna numero live mentre si trascina
    slider?.addEventListener('input', () => {
      if (dragging) {
        const pos = parseInt(slider.value);
        const n = root.getElementById('pos-number');
        if (n) n.textContent = pos + '%';
        const svg = root.getElementById('svg-container');
        if (svg) svg.innerHTML = this._buildSvg(pos, accent, light);
      }
    });
  }

  _updateState() {
    if (!this._hass || !this._config?.entity) return;
    const root = this.shadowRoot;
    if (!root.getElementById('pos-number')) return; // non ancora renderizzato

    const accent = this._config.color || '#6366f1';
    const light  = this._lighten(accent);

    // Cover
    const coverState = this._hass.states[this._config.entity];
    const pos = coverState?.attributes?.current_position;
    const posText = pos !== undefined ? pos + '%' : '--';
    const stato   = pos === 100 ? 'Aperta' : pos === 0 ? 'Chiusa' : pos !== undefined ? 'Parziale' : '--';

    const posEl = root.getElementById('pos-number');
    if (posEl) posEl.textContent = posText;

    const badgeEl = root.getElementById('status-badge');
    if (badgeEl) badgeEl.textContent = stato;

    const svgEl = root.getElementById('svg-container');
    if (svgEl) svgEl.innerHTML = this._buildSvg(pos, accent, light);

    const slider = root.getElementById('pos-slider');
    if (slider && pos !== undefined && !this._sliderDragging) {
      slider.value = pos;
    }

    // Energia
    if (this._config.energy_entity) {
      const eState = this._hass.states[this._config.energy_entity];
      const eVal   = eState?.state ?? '--';
      const eUnit  = eState?.attributes?.unit_of_measurement ?? 'kWh';
      const eEl    = root.getElementById('energy-text');
      if (eEl) eEl.textContent = `Energia: ${eVal} ${eUnit}`;
    }

    // Nome (aggiornato live in caso di cambio config)
    const nameEl = root.getElementById('room-name');
    if (nameEl) nameEl.textContent = this._config.name || 'Tapparella';
  }

  _callService(domain, service, data = {}) {
    if (!this._hass || !this._config?.entity) return;
    this._hass.callService(domain, service, {
      entity_id: this._config.entity,
      ...data,
    });
  }

  getCardSize() { return 4; }
}

customElements.define('tapparella-card', TapparellaCard);

// Registrazione per HACS / HA dashboard picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'tapparella-card',
  name: 'Tapparella Card',
  description: 'Card per il controllo delle tapparelle con grafica animata, slider e pulsanti.',
  preview: true,
  documentationURL: 'https://github.com/TUO_USERNAME/tapparella-card',
});
