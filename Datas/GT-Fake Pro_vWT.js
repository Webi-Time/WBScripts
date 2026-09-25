/*
 * Webi-Time - GT Fake Intelligent
 * Version : 1.29.0
 * Auteur  : NoLife4Ever / Webi-Time
 *
 * Principes repris et ameliores a partir de plusieurs scripts de fake GT :
 * - limite de fake dynamique selon les points DU VILLAGE SOURCE ;
 * - recherche Joueur / Tribu depuis les donnees monde ;
 * - evitement d'une plage de bonus de nuit selon l'heure d'arrivee reelle ;
 * - generation automatique des troupes selon population / temps de construction ;
 * - playlist circulaire : chaque cible envoyee repart automatiquement en fin de file.
 *
 * UI : WebiTime_GT_Common.js (theme sombre / accent orange).
 */

(async function WebiTimeFakeIntelligentBootstrap() {
    'use strict';

    const SCRIPT = Object.freeze({
        name: 'GT Fake Intelligent',
        version: '1.29.0',
        prefix: 'wtfi'
    });

    const STORAGE_KEY = 'webitime.gt.fakeIntelligent.settings.v1';
    const HISTORY_KEY = 'webitime.gt.fakeIntelligent.history.v1';
    const PENDING_KEY = 'webitime.gt.fakeIntelligent.pending.v1';
    const SWITCH_HISTORY_KEY = 'webitime.gt.fakeIntelligent.switchHistory.v1';
    const NEXT_TARGET_KEY = 'webitime.gt.fakeIntelligent.nextTarget.v1';
    const TARGET_QUEUE_KEY = 'webitime.gt.fakeIntelligent.targetQueue.v1';
    const COMMON_URL = 'https://webi-time.github.io/WBScripts/Datas/WebiTime_GT_Common.js';
    const COMMON_FALLBACK_URL = 'https://cdn.jsdelivr.net/gh/Webi-Time/WBScripts@GT/Datas/WebiTime_GT_Common.js';

    // Si le script est deja charge, chaque nouvel appel avance d'une etape :
    // cible presente -> attaquer ; aucune cible -> preparer la suivante ; aucune config -> ouvrir les parametres.
    if (window.WebiTimeFakeIntelligent && typeof window.WebiTimeFakeIntelligent.handleInvocation === 'function') {
        await window.WebiTimeFakeIntelligent.handleInvocation();
        return;
    }

    if (!window.game_data || !window.jQuery) {
        console.error(`[${SCRIPT.name}] game_data ou jQuery indisponible.`);
        return;
    }

    const $ = window.jQuery;

    async function ensureWebiTimeCommon() {
        if (window.WebiTimeGT) return window.WebiTimeGT;

        const candidates = [];
        try {
            const currentSrc = document.currentScript && document.currentScript.src;
            if (currentSrc) {
                const relative = new URL('WebiTime_GT_Common.js', currentSrc);
                relative.searchParams.set('_wt', Date.now());
                candidates.push(relative.href);
            }
        } catch (_) {}

        candidates.push(COMMON_URL + '?_wt=' + Date.now());
        candidates.push(COMMON_FALLBACK_URL + '?_wt=' + Date.now());

        for (const url of [...new Set(candidates)]) {
            try {
                await new Promise((resolve, reject) => {
                    const tag = document.createElement('script');
                    tag.src = url;
                    tag.async = true;
                    tag.onload = resolve;
                    tag.onerror = () => reject(new Error('Chargement impossible : ' + url));
                    (document.head || document.documentElement).appendChild(tag);
                });
                if (window.WebiTimeGT) return window.WebiTimeGT;
            } catch (error) {
                console.warn(`[${SCRIPT.name}] Common indisponible`, url, error);
            }
        }
        return null;
    }

    const WT = await ensureWebiTimeCommon();
    if (!WT) {
        if (window.UI && UI.ErrorMessage) UI.ErrorMessage('Impossible de charger WebiTime_GT_Common.js.');
        return;
    }
    if (typeof WT.injectStyles === 'function') WT.injectStyles();

    const DEFAULT_SETTINGS = Object.freeze({
        manualCoords: '',
        tribeIds: [],
        playerIds: [],
        excludedCoords: [],
        nightEnabled: true,
        nightStart: '00:00',
        nightEnd: '07:00',
        settingsRevision: 8,
        hideNightInPlaylist: false,
        fakeMode: 'auto_balanced',
        autoSwitchVillage: true,
        autoUnits: {},
        autoMaxUnits: { light: 20, heavy: 20 },
        autoMinUnits: { ram: 0, catapult: 0 },
        siegeLocks: { ram: true, catapult: true },
        manualUnits: {},
        sectionState: {
            targets: true,
            coords: true,
            tribes: true,
            players: true,
            settings: true,
            playlist: true
        }
    });

    const state = {
        ready: false,
        loading: false,
        settings: loadSettings(),
        world: {
            villages: [],
            players: [],
            tribes: [],
            villageByCoord: new Map(),
            playerById: new Map(),
            tribeById: new Map()
        },
        config: {
            fakeLimit: 0,
            worldSpeed: 1,
            unitSpeed: 1
        },
        units: {},
        panelOpen: false,
        outgoingAttackCounts: new Map(),
        outgoingAttackCountsLoaded: false,
        outgoingAttackCountsAt: 0,
        outgoingAttackCountsPromise: null
    };

    function loadSettings() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            return normalizeSettings(parsed || {});
        } catch (_) {
            return normalizeSettings({});
        }
    }

    function normalizeSettings(input) {
        const base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        const revision = Number(input.settingsRevision || 0);
        const migrateAutoSwitch = revision < 2;
        const migrateHeavyMax = revision < 5;
        const savedLocks = input.siegeLocks && typeof input.siegeLocks === 'object' ? input.siegeLocks : {};
        const savedSections = input.sectionState && typeof input.sectionState === 'object' ? input.sectionState : {};
        return {
            ...base,
            ...input,
            settingsRevision: 8,
            hideNightInPlaylist: input.hideNightInPlaylist === undefined ? false : !!input.hideNightInPlaylist,
            autoSwitchVillage: migrateAutoSwitch ? true : (input.autoSwitchVillage === undefined ? true : !!input.autoSwitchVillage),
            tribeIds: Array.isArray(input.tribeIds) ? input.tribeIds.map(Number).filter(Number.isFinite) : [],
            playerIds: Array.isArray(input.playerIds) ? input.playerIds.map(Number).filter(Number.isFinite) : [],
            excludedCoords: Array.isArray(input.excludedCoords) ? [...new Set(input.excludedCoords.map(String).filter(Boolean))] : [],
            autoUnits: (() => {
                const saved = input.autoUnits && typeof input.autoUnits === 'object' ? input.autoUnits : null;
                const result = {};
                getPlayableFakeUnits().forEach(unit => {
                    result[unit] = saved && Object.prototype.hasOwnProperty.call(saved, unit) ? !!saved[unit] : true;
                });
                return result;
            })(),
            autoMaxUnits: (() => {
                const saved = input.autoMaxUnits && typeof input.autoMaxUnits === 'object' ? input.autoMaxUnits : null;
                const result = {};
                getPlayableFakeUnits().forEach(unit => {
                    const fallback = (unit === 'light' || unit === 'heavy') ? 20 : 0;
                    let raw = saved && Object.prototype.hasOwnProperty.call(saved, unit) ? Number(saved[unit]) : fallback;
                    if (unit === 'heavy' && migrateHeavyMax && (!Number.isFinite(raw) || raw <= 0)) raw = 20;
                    result[unit] = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : fallback;
                });
                return result;
            })(),
            autoMinUnits: (() => {
                const saved = input.autoMinUnits && typeof input.autoMinUnits === 'object' ? input.autoMinUnits : null;
                const readMin = unit => {
                    let raw = saved && Object.prototype.hasOwnProperty.call(saved, unit) ? Number(saved[unit]) : 0;
                    // v1.17 imposait artificiellement Min=1. Lors de la migration,
                    // un ancien 1 est remis à 0 ; les valeurs >1 saisies volontairement sont conservées.
                    if (revision < 7 && raw === 1) raw = 0;
                    return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
                };
                return {
                    ram: readMin('ram'),
                    catapult: readMin('catapult')
                };
            })(),
            siegeLocks: {
                ram: Object.prototype.hasOwnProperty.call(savedLocks, 'ram') ? !!savedLocks.ram : true,
                catapult: Object.prototype.hasOwnProperty.call(savedLocks, 'catapult') ? !!savedLocks.catapult : true
            },
            manualUnits: input.manualUnits && typeof input.manualUnits === 'object' ? input.manualUnits : {},
            sectionState: {
                targets: Object.prototype.hasOwnProperty.call(savedSections, 'targets') ? !!savedSections.targets : true,
                coords: Object.prototype.hasOwnProperty.call(savedSections, 'coords') ? !!savedSections.coords : true,
                tribes: Object.prototype.hasOwnProperty.call(savedSections, 'tribes') ? !!savedSections.tribes : true,
                players: Object.prototype.hasOwnProperty.call(savedSections, 'players') ? !!savedSections.players : true,
                settings: Object.prototype.hasOwnProperty.call(savedSections, 'settings') ? !!savedSections.settings : true,
                playlist: Object.prototype.hasOwnProperty.call(savedSections, 'playlist') ? !!savedSections.playlist : true
            }
        };
    }

    function saveSettingsObject(settings) {
        state.settings = normalizeSettings(settings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    }

    function notify(type, message, duration) {
        const fn = window.UI && UI[type + 'Message'];
        if (typeof fn === 'function') fn(message, duration || 3500);
        else console.log(`[${SCRIPT.name}] ${message}`);
    }

    function injectScriptLayout() {
        const id = SCRIPT.prefix + 'LayoutStyle';
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
            #${SCRIPT.prefix}Launcher {
                position: absolute;
                top: 4px;
                left: 4px;
                z-index: 13999;
                width: 40px !important;
                height: 40px !important;
                min-height: 40px !important;
                padding: 0 !important;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px !important;
            }
            #${SCRIPT.prefix}PanelWrap {
                position: fixed;
                top: 58px;
                left: 12px;
                z-index: 24000;
                width: min(560px, calc(100vw - 24px));
                max-height: calc(100vh - 76px);
            }
            #${SCRIPT.prefix}Panel {
                margin: 0;
                max-height: calc(100vh - 76px);
                display: flex;
                flex-direction: column;
            }
            #${SCRIPT.prefix}Panel > .wt-hero { flex: 0 0 auto; cursor: move; }
            #${SCRIPT.prefix}Body { overflow: auto; min-height: 0; }
            #${SCRIPT.prefix}Panel > .wt-footer { flex: 0 0 auto; margin-top: 0; }
            .${SCRIPT.prefix}-section { margin-bottom: 9px; }
            .${SCRIPT.prefix}-section > summary { cursor: pointer; user-select: none; list-style: none; }
            .${SCRIPT.prefix}-title-summary { display:flex; align-items:center; gap:6px; }
            .${SCRIPT.prefix}-title-summary > .${SCRIPT.prefix}-summary-text { min-width:0; }
            .${SCRIPT.prefix}-summary-actions { margin-left:auto; display:inline-flex; align-items:center; justify-content:flex-end; gap:2px; height:20px; }
            .${SCRIPT.prefix}-summary-share-btn {
                appearance:none !important;
                -webkit-appearance:none !important;
                display:inline-flex !important;
                align-items:center !important;
                justify-content:center !important;
                width:20px !important;
                min-width:20px !important;
                height:20px !important;
                min-height:20px !important;
                margin:0 !important;
                padding:0 !important;
                border:0 !important;
                border-radius:0 !important;
                background:transparent !important;
                background-image:none !important;
                box-shadow:none !important;
                text-shadow:none !important;
                font-size:15px !important;
                line-height:1 !important;
                font-weight:400 !important;
                cursor:pointer;
                vertical-align:middle;
                opacity:.92;
            }
            .${SCRIPT.prefix}-summary-share-btn:hover { opacity:1; transform:scale(1.08); }
            .${SCRIPT.prefix}-summary-share-btn:focus { outline:1px solid currentColor; outline-offset:1px; }
            .${SCRIPT.prefix}-summary-import { color:#46d369 !important; }
            .${SCRIPT.prefix}-summary-export { color:#ff5b5b !important; }
            .${SCRIPT.prefix}-title-summary::after { margin-left:2px !important; }
            .${SCRIPT.prefix}-section > summary::-webkit-details-marker { display: none; }
            .${SCRIPT.prefix}-section > summary::after { content: '▾'; margin-left: auto; color: var(--wt-orange-soft, #ffb347); }
            .${SCRIPT.prefix}-section:not([open]) > summary::after { content: '▸'; }
            .${SCRIPT.prefix}-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .${SCRIPT.prefix}-target-search-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; }
            .${SCRIPT.prefix}-night-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; align-items:center; }
            .${SCRIPT.prefix}-night-times { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
            .${SCRIPT.prefix}-label-line { display:flex; align-items:center; gap:6px; }
            .${SCRIPT.prefix}-help-btn { width:20px !important; height:20px !important; min-height:20px !important; padding:0 !important; border-radius:50% !important; font-weight:800 !important; line-height:18px !important; }
            .${SCRIPT.prefix}-help { margin-top:6px; padding:7px 8px; border-left:2px solid var(--wt-orange,#ff9800); }
            .${SCRIPT.prefix}-mode-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:6px; align-items:center; margin-top:4px; }
            .${SCRIPT.prefix}-try-btn { white-space:nowrap; min-width:72px; }
            .${SCRIPT.prefix}-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
            .${SCRIPT.prefix}-field label { display:block; margin:0 0 4px; font-size:10px; font-weight:700; color:var(--wt-muted,#aaa); }
            .${SCRIPT.prefix}-search-results { display: grid; gap: 4px; max-height: 168px; margin-top: 6px; overflow: auto; }
            .${SCRIPT.prefix}-result { width:100%; text-align:left !important; display:grid !important; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; }
            .${SCRIPT.prefix}-result-left { min-width:0; }
            .${SCRIPT.prefix}-result-main { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .${SCRIPT.prefix}-result-sub { display:block; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.68; font-size:9px; font-weight:500; }
            .${SCRIPT.prefix}-result-meta { flex:0 0 auto; opacity:.8; font-size:10px; font-weight:700; text-align:right; }
            .${SCRIPT.prefix}-chips { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
            .${SCRIPT.prefix}-chip { min-height:24px !important; padding:2px 6px !important; }
            .${SCRIPT.prefix}-units { display:grid; grid-template-columns:repeat(5,minmax(76px,1fr)); gap:6px; }
            .${SCRIPT.prefix}-unit { position:relative; padding:6px !important; text-align:center; }
            .${SCRIPT.prefix}-unit img { width:24px; height:24px; display:block; margin:0 auto 4px; }
            .${SCRIPT.prefix}-unit .wt-input { text-align:center !important; }
            .${SCRIPT.prefix}-unit-check { display:flex; align-items:center; justify-content:center; gap:5px; min-height:22px; }
            .${SCRIPT.prefix}-unit-max, .${SCRIPT.prefix}-unit-min { display:flex; align-items:center; justify-content:center; gap:4px; margin-top:4px; font-size:9px; color:var(--wt-muted,#aaa); }
            .${SCRIPT.prefix}-unit-max input, .${SCRIPT.prefix}-unit-min input { width:46px !important; min-width:46px !important; padding:2px 3px !important; text-align:center !important; }
            .${SCRIPT.prefix}-unit-max.${SCRIPT.prefix}-hidden { display:none !important; }
            .${SCRIPT.prefix}-unit-lock { position:absolute; top:4px; right:4px; display:flex; justify-content:center; margin:0; z-index:2; }
            .${SCRIPT.prefix}-lock-btn { width:24px !important; height:22px !important; min-height:22px !important; padding:0 !important; font-size:12px !important; line-height:20px !important; }
            .${SCRIPT.prefix}-auto-unit:disabled { cursor:not-allowed; }
            .${SCRIPT.prefix}-setting-block { margin-top:10px; padding-top:10px; border-top:1px solid var(--wt-border,#444); }
            .${SCRIPT.prefix}-setting-block:first-of-type { margin-top:6px; padding-top:0; border-top:0; }
            .${SCRIPT.prefix}-bottom-actions { margin-top:10px; padding-top:10px; border-top:1px solid var(--wt-border,#444); }
            .${SCRIPT.prefix}-actions { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin-top:9px; }
            .${SCRIPT.prefix}-playlist { display:grid; gap:5px; margin-top:7px; max-height:230px; overflow:auto; }
            .${SCRIPT.prefix}-playlist-toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; }
            .${SCRIPT.prefix}-playlist-toolbar > .wt-small { min-width:0; flex:1 1 auto; }
            .${SCRIPT.prefix}-night-toggle { display:inline-flex; align-items:center; gap:6px; flex:0 0 auto; cursor:pointer; user-select:none; font-size:9px; white-space:nowrap; opacity:.9; }
            .${SCRIPT.prefix}-night-toggle input { position:absolute; opacity:0; pointer-events:none; }
            .${SCRIPT.prefix}-night-toggle-track { position:relative; display:inline-block; width:34px; height:18px; border:1px solid var(--wt-border,#444); border-radius:999px; background:var(--wt-card-2,#2c2c2c); box-sizing:border-box; transition:.15s ease; }
            .${SCRIPT.prefix}-night-toggle-knob { position:absolute; top:2px; left:2px; width:12px; height:12px; border-radius:50%; background:#aaa; transition:.15s ease; }
            .${SCRIPT.prefix}-night-toggle input:checked + .${SCRIPT.prefix}-night-toggle-track { border-color:var(--wt-orange,#ff9800); background:rgba(255,152,0,.18); }
            .${SCRIPT.prefix}-night-toggle input:checked + .${SCRIPT.prefix}-night-toggle-track .${SCRIPT.prefix}-night-toggle-knob { transform:translateX(16px); background:var(--wt-orange-soft,#ffb347); }
            .${SCRIPT.prefix}-playlist-item { display:grid; grid-template-columns:auto minmax(0,1fr) auto auto auto; gap:6px; align-items:center; padding:6px 8px !important; }
            .${SCRIPT.prefix}-playlist-next, .${SCRIPT.prefix}-playlist-remove { height:24px !important; min-height:24px !important; padding:0 !important; font-weight:900 !important; }
            .${SCRIPT.prefix}-playlist-next { width:52px !important; min-width:52px !important; color:var(--wt-orange-soft,#ffb347) !important; font-size:9px !important; }
            .${SCRIPT.prefix}-playlist-remove { width:24px !important; min-width:24px !important; }
            .${SCRIPT.prefix}-playlist-next-active { color:#7fd67f !important; border-color:#4f9f4f !important; }
            .${SCRIPT.prefix}-playlist-remove { color:#ff6b6b !important; }
            .${SCRIPT.prefix}-playlist-index { min-width:22px; text-align:right; color:var(--wt-orange-soft,#ffb347); font-weight:800; }
            .${SCRIPT.prefix}-playlist-main { min-width:0; }
            .${SCRIPT.prefix}-playlist-title { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; }
            .${SCRIPT.prefix}-playlist-sub { display:block; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.7; font-size:9px; }
            .${SCRIPT.prefix}-playlist-meta { text-align:right; font-size:9px; opacity:.8; white-space:nowrap; }
            .${SCRIPT.prefix}-playlist-current { border-color:var(--wt-orange,#ff9800) !important; }
            .${SCRIPT.prefix}-share-box textarea { width:100%; min-height:150px; resize:vertical; box-sizing:border-box; }
            .${SCRIPT.prefix}-status { margin-bottom:9px; }
            .${SCRIPT.prefix}-toolbar { display:flex; justify-content:flex-end; gap:6px; margin-bottom:8px; }
            .${SCRIPT.prefix}-toolbar .wt-btn { min-height:26px !important; padding:3px 8px !important; font-size:10px !important; }
            .${SCRIPT.prefix}-hidden { display:none !important; }
            @media (max-width: 620px) {
                .${SCRIPT.prefix}-grid2, .${SCRIPT.prefix}-grid3, .${SCRIPT.prefix}-actions { grid-template-columns:1fr; }
                .${SCRIPT.prefix}-target-search-grid { grid-template-columns:1fr; }
                .${SCRIPT.prefix}-night-row { grid-template-columns:1fr; }
                .${SCRIPT.prefix}-units { grid-template-columns:repeat(3,1fr); }
                #${SCRIPT.prefix}PanelWrap { left:6px; width:calc(100vw - 12px); }
            }
        `;
        document.head.appendChild(style);
    }

    injectScriptLayout();

    function createLauncher() {
        if ($('#' + SCRIPT.prefix + 'Launcher').length) return;
        $('body').append(`
            <button id="${SCRIPT.prefix}Launcher" type="button" class="wt-btn wt-btn-primary" title="Paramètres - ${SCRIPT.name}">⚙</button>
        `);
        $('#' + SCRIPT.prefix + 'Launcher').on('click', async () => {
            const $panel = $('#' + SCRIPT.prefix + 'PanelWrap');
            if ($panel.length && $panel.is(':visible')) {
                $panel.hide();
                state.panelOpen = false;
            } else {
                openPanel();
                if (!state.ready) await loadData();
            }
        });
    }

    function buildPanelMarkup() {
        return `
            <div id="${SCRIPT.prefix}PanelWrap">
                <div id="${SCRIPT.prefix}Panel" class="wt-panel">
                    <div class="wt-hero">
                        <div class="wt-brand">
                            <div class="wt-logo">🐼</div>
                            <div>
                                <div class="wt-title"><span class="wt-title-brand">Webi-Time</span><span class="wt-title-tool"> Fake Intelligent</span></div>
                                <div class="wt-byline">par <b>NoLife4Ever</b> &nbsp;•&nbsp; fake dynamique et filtrage horaire</div>
                                <div class="wt-tagline">Choisir les cibles, calculer le fake, éviter la nuit.</div>
                            </div>
                        </div>
                        <div class="wt-hero-motto">CIBLER<br>CALCULER<br>ÉVITER<br>FAKER</div>
                    </div>

                    <div id="${SCRIPT.prefix}Body" class="wt-body">
                        <div id="${SCRIPT.prefix}Status" class="wt-status ${SCRIPT.prefix}-status">Chargement des données du monde...</div>

                        <div class="${SCRIPT.prefix}-toolbar">
                            <button id="${SCRIPT.prefix}ExpandAll" type="button" class="wt-btn wt-btn-secondary">▾ Tout déplier</button>
                            <button id="${SCRIPT.prefix}CollapseAll" type="button" class="wt-btn wt-btn-secondary">▸ Tout replier</button>
                        </div>

                        <details class="wt-card ${SCRIPT.prefix}-section" data-section-key="targets" open>
                            <summary class="wt-card-title ${SCRIPT.prefix}-title-summary"><span class="${SCRIPT.prefix}-summary-text">Villages cible</span><span class="${SCRIPT.prefix}-summary-actions"><button id="${SCRIPT.prefix}ImportTargets" type="button" class="${SCRIPT.prefix}-summary-share-btn ${SCRIPT.prefix}-summary-import" title="Importer les cibles" aria-label="Importer les cibles">⚙</button><button id="${SCRIPT.prefix}ExportTargets" type="button" class="${SCRIPT.prefix}-summary-share-btn ${SCRIPT.prefix}-summary-export" title="Exporter les cibles" aria-label="Exporter les cibles">⚙</button></span></summary>
                            <div class="wt-small">Les sources sont cumulées et les doublons supprimés automatiquement.</div>

                            <details class="wt-card ${SCRIPT.prefix}-section" data-section-key="coords" style="margin-top:8px;" open>
                                <summary class="wt-card-title">Par coordonnées</summary>
                                <textarea id="${SCRIPT.prefix}ManualCoords" class="wt-input" rows="5" placeholder="479|546 480|546 478|550"></textarea>
                                <div id="${SCRIPT.prefix}ManualCount" class="wt-small" style="margin-top:4px;">0 coordonnée</div>
                            </details>

                            <div class="${SCRIPT.prefix}-target-search-grid">
                                <details class="wt-card ${SCRIPT.prefix}-section" data-section-key="tribes" open>
                                    <summary class="wt-card-title">Par tribu</summary>
                                    <div class="${SCRIPT.prefix}-field">
                                        <label for="${SCRIPT.prefix}TribeSearch">Recherche — classées par points</label>
                                        <input id="${SCRIPT.prefix}TribeSearch" class="wt-input" type="text" placeholder="Rechercher un tag ou un nom...">
                                        <div id="${SCRIPT.prefix}TribeResults" class="${SCRIPT.prefix}-search-results"></div>
                                        <div id="${SCRIPT.prefix}TribeChips" class="${SCRIPT.prefix}-chips"></div>
                                    </div>
                                </details>

                                <details class="wt-card ${SCRIPT.prefix}-section" data-section-key="players" open>
                                    <summary class="wt-card-title">Par joueur</summary>
                                    <div class="${SCRIPT.prefix}-field">
                                        <label for="${SCRIPT.prefix}PlayerSearch">Recherche — classés par points</label>
                                        <input id="${SCRIPT.prefix}PlayerSearch" class="wt-input" type="text" placeholder="Rechercher un joueur ou une tribu...">
                                        <div id="${SCRIPT.prefix}PlayerResults" class="${SCRIPT.prefix}-search-results"></div>
                                        <div id="${SCRIPT.prefix}PlayerChips" class="${SCRIPT.prefix}-chips"></div>
                                    </div>
                                </details>
                            </div>

                            <div id="${SCRIPT.prefix}TargetCount" class="wt-status" style="margin-top:8px;">0 cible sélectionnée</div>
                        </details>

                        <details class="wt-card ${SCRIPT.prefix}-section" data-section-key="settings" open>
                            <summary class="wt-card-title ${SCRIPT.prefix}-title-summary"><span class="${SCRIPT.prefix}-summary-text">Paramétrage</span><span class="${SCRIPT.prefix}-summary-actions"><button id="${SCRIPT.prefix}ImportSettings" type="button" class="${SCRIPT.prefix}-summary-share-btn ${SCRIPT.prefix}-summary-import" title="Importer les paramètres" aria-label="Importer les paramètres">⚙</button><button id="${SCRIPT.prefix}ExportSettings" type="button" class="${SCRIPT.prefix}-summary-share-btn ${SCRIPT.prefix}-summary-export" title="Exporter les paramètres" aria-label="Exporter les paramètres">⚙</button></span></summary>

                            <div class="${SCRIPT.prefix}-setting-block">
                                <div class="${SCRIPT.prefix}-night-row">
                                    <label class="wt-check">
                                        <input id="${SCRIPT.prefix}NightEnabled" type="checkbox">
                                        Ne pas attaquer en Bonus de nuit
                                    </label>
                                    <div class="${SCRIPT.prefix}-night-times">
                                        <div class="${SCRIPT.prefix}-field">
                                            <label for="${SCRIPT.prefix}NightStart">Début</label>
                                            <input id="${SCRIPT.prefix}NightStart" class="wt-input ${SCRIPT.prefix}-time-input" type="time" step="60">
                                        </div>
                                        <div class="${SCRIPT.prefix}-field">
                                            <label for="${SCRIPT.prefix}NightEnd">Fin</label>
                                            <input id="${SCRIPT.prefix}NightEnd" class="wt-input ${SCRIPT.prefix}-time-input" type="time" step="60">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="${SCRIPT.prefix}-setting-block">
                                <label class="wt-check">
                                    <input id="${SCRIPT.prefix}AutoSwitchVillage" type="checkbox">
                                    Changer de village si aucun bélier/cata
                                </label>
                            </div>

                            <div class="${SCRIPT.prefix}-setting-block">
                                <div class="${SCRIPT.prefix}-field">
                                    <div class="${SCRIPT.prefix}-label-line">
                                        <label for="${SCRIPT.prefix}FakeMode" style="margin-bottom:0;">Unités à envoyer</label>
                                        <button id="${SCRIPT.prefix}ModeHelpBtn" type="button" class="wt-btn wt-btn-secondary ${SCRIPT.prefix}-help-btn" title="Aide sur les modes AUTO">?</button>
                                    </div>
                                    <div class="${SCRIPT.prefix}-mode-row">
                                        <select id="${SCRIPT.prefix}FakeMode" class="wt-input">
                                            <option value="auto_balanced">AUTO — équilibré</option>
                                            <option value="auto_fair">AUTO — équitable</option>
                                            <option value="auto_population">AUTO — priorité population</option>
                                            <option value="manual">MANUEL — unités fixes</option>
                                        </select>
                                        <button id="${SCRIPT.prefix}TryMode" type="button" class="wt-btn wt-btn-secondary ${SCRIPT.prefix}-try-btn" title="Recalculer les troupes à partir du village source">Essayer</button>
                                    </div>
                                    <div id="${SCRIPT.prefix}ModeHelp" class="wt-small ${SCRIPT.prefix}-help ${SCRIPT.prefix}-hidden">
                                        <b>AUTO — équilibré :</b> se base uniquement sur les temps de recrutement réellement affichés dans le village et équilibre la charge entre les files disponibles.<br>
                                        <b>AUTO — équitable :</b> OFF = 2 haches pour 1 léger ; DEF = 1 lance pour 1 épée, répété jusqu'à atteindre la population minimale requise.<br>
                                        <b>AUTO — priorité population :</b> privilégie les unités à forte population du profil du village (OFF/DEF), puis complète si nécessaire. Les champs « Max » sous les unités limitent leur consommation ; 0 = illimité.<br>
                                        
                                        <b>Bélier / Cata :</b> verrouillés sur « Utiliser » par défaut ; déverrouille le cadenas pour pouvoir les désactiver.
                                    </div>
                                </div>

                                <div id="${SCRIPT.prefix}AutoUnitsWrap" style="margin-top:8px;">
                                    <div class="wt-small" style="margin-bottom:6px;">Unités autorisées pour le calcul AUTO</div>
                                    <div id="${SCRIPT.prefix}AutoUnits" class="${SCRIPT.prefix}-units"></div>
                                </div>

                                <div id="${SCRIPT.prefix}ManualUnitsWrap" class="${SCRIPT.prefix}-hidden" style="margin-top:8px;">
                                    <div class="wt-small" style="margin-bottom:6px;">Quantités exactes à envoyer</div>
                                    <div id="${SCRIPT.prefix}ManualUnits" class="${SCRIPT.prefix}-units"></div>
                                </div>
                            </div>
                        </details>

                        <details class="wt-card ${SCRIPT.prefix}-section" data-section-key="playlist" open>
                            <summary class="wt-card-title">Playlist d'attaque</summary>
                            <div class="${SCRIPT.prefix}-playlist-toolbar">
                                <div id="${SCRIPT.prefix}PlaylistStatus" class="wt-small">Chargement de la playlist...</div>
                                <label class="${SCRIPT.prefix}-night-toggle" for="${SCRIPT.prefix}HideNightInPlaylist" title="Masquer ou afficher les villages dont l'arrivée tombe dans le bonus de nuit. Ils restent dans la playlist.">
                                    <span>Masquer NUIT</span>
                                    <input id="${SCRIPT.prefix}HideNightInPlaylist" type="checkbox">
                                    <span class="${SCRIPT.prefix}-night-toggle-track"><span class="${SCRIPT.prefix}-night-toggle-knob"></span></span>
                                </label>
                            </div>
                            <div id="${SCRIPT.prefix}Playlist" class="${SCRIPT.prefix}-playlist"></div>
                        </details>

                        <div class="${SCRIPT.prefix}-bottom-actions">
                            <div class="${SCRIPT.prefix}-actions">
                                <button id="${SCRIPT.prefix}DeleteData" type="button" class="wt-btn wt-btn-secondary">Supprimer les données</button>
                                <button id="${SCRIPT.prefix}Save" type="button" class="wt-btn wt-btn-primary">Sauvegarder</button>
                                <button id="${SCRIPT.prefix}GoPlace" type="button" class="wt-btn">Go Point ralliement</button>
                            </div>
                        </div>
                    </div>

                    <div class="wt-footer">
                        <span class="wt-footer-left"><span>${SCRIPT.name} v${SCRIPT.version}</span></span>
                        <span class="wt-footer-center">CIBLER ■ CALCULER ■ ÉVITER</span>
                        <span class="wt-footer-right">🐼 <b>Webi-Time</b> &nbsp;|&nbsp; NoLife4Ever</span>
                    </div>
                </div>
            </div>
        `;
    }

    function openPanel() {
        if ($('#' + SCRIPT.prefix + 'PanelWrap').length) {
            $('#' + SCRIPT.prefix + 'PanelWrap').show();
            state.panelOpen = true;
            renderAll();
            return;
        }

        $('body').append(buildPanelMarkup());
        state.panelOpen = true;

        if ($.fn.draggable) {
            $('#' + SCRIPT.prefix + 'PanelWrap').draggable({
                handle: '.wt-hero',
                cancel: 'input, textarea, select, button, summary, a'
            });
        }

        bindPanelEvents();
        buildUnitsUI();
        renderAll();
    }

    function bindPanelEvents() {
        $('#' + SCRIPT.prefix + 'ManualCoords').on('input', updateTargetCount);
        $('#' + SCRIPT.prefix + 'TribeSearch').on('input focus', renderTribeResults);
        $('#' + SCRIPT.prefix + 'PlayerSearch').on('input focus', renderPlayerResults);
        $('#' + SCRIPT.prefix + 'FakeMode').on('change', function () {
            updateModeVisibility();
            // Le mode est un choix d'utilisation récurrent : on le mémorise immédiatement
            // pour qu'un nouvel appel / rendu ne le remette pas à AUTO équilibré.
            state.settings.fakeMode = String($(this).val() || 'auto_balanced');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(state.settings)));
        });

        $('#' + SCRIPT.prefix + 'HideNightInPlaylist').on('change', function () {
            state.settings.hideNightInPlaylist = !!this.checked;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(state.settings)));
            renderAttackPlaylist();
        });

        // L'événement natif "toggle" des <details> ne remonte pas : liaison directe.
        $('#' + SCRIPT.prefix + 'Body details[data-section-key]').on('toggle', function () {
            const key = String($(this).attr('data-section-key') || '');
            if (!key) return;
            state.settings.sectionState = state.settings.sectionState || {};
            state.settings.sectionState[key] = !!this.open;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(state.settings)));
        });
        $('#' + SCRIPT.prefix + 'ModeHelpBtn').on('click', () => {
            $('#' + SCRIPT.prefix + 'ModeHelp').toggleClass(SCRIPT.prefix + '-hidden');
        });
        // Sélecteur horaire natif Chrome : comportement historique (pré-v1.10).
        $('.' + SCRIPT.prefix + '-time-input').on('click focus', function () {
            if (typeof this.showPicker === 'function') {
                try { this.showPicker(); } catch (_) {}
            }
        });

        $('#' + SCRIPT.prefix + 'ExpandAll').on('click', () => {
            const $details = $('#' + SCRIPT.prefix + 'Body details[data-section-key]');
            $details.prop('open', true);
            state.settings.sectionState = state.settings.sectionState || {};
            $details.each(function () {
                state.settings.sectionState[String($(this).attr('data-section-key'))] = true;
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(state.settings)));
        });
        $('#' + SCRIPT.prefix + 'CollapseAll').on('click', () => {
            const $details = $('#' + SCRIPT.prefix + 'Body details[data-section-key]');
            $details.prop('open', false);
            state.settings.sectionState = state.settings.sectionState || {};
            $details.each(function () {
                state.settings.sectionState[String($(this).attr('data-section-key'))] = false;
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(state.settings)));
        });

        $('#' + SCRIPT.prefix + 'AutoUnits').on('click', '.' + SCRIPT.prefix + '-siege-lock', function (event) {
            event.preventDefault();
            event.stopPropagation();
            const unit = String($(this).data('unit'));
            const currentlyLocked = String($(this).attr('data-locked')) === '1';
            const nextLocked = !currentlyLocked;
            $(this)
                .attr('data-locked', nextLocked ? '1' : '0')
                .attr('title', nextLocked ? 'Déverrouiller Utiliser' : 'Verrouiller Utiliser')
                .text(nextLocked ? '🔒' : '🔓');
            const $check = $('#' + SCRIPT.prefix + 'Auto_' + unit);
            $check.prop('disabled', nextLocked);
            if (nextLocked) $check.prop('checked', true);
        });

        $('#' + SCRIPT.prefix + 'DeleteData').on('click', () => {
            if (!window.confirm(
                'Supprimer les cibles et paramètres sauvegardés ?\n\n' +
                'L\'historique des fakes déjà envoyés sera conservé.'
            )) return;
            localStorage.removeItem(STORAGE_KEY);
            // Ne pas effacer HISTORY_KEY : le compteur et la progression globale doivent survivre.
            sessionStorage.removeItem(PENDING_KEY);
            sessionStorage.removeItem(SWITCH_HISTORY_KEY);
            sessionStorage.removeItem(NEXT_TARGET_KEY);
            sessionStorage.removeItem(TARGET_QUEUE_KEY);
            state.settings = normalizeSettings({});
            renderAll();
            notify('Success', `Données supprimées • ${formatNumber(countTotalSent())} fake${countTotalSent() > 1 ? 's' : ''} envoyé${countTotalSent() > 1 ? 's' : ''} conservé${countTotalSent() > 1 ? 's' : ''}.`);
        });

        $('#' + SCRIPT.prefix + 'Save').on('click', () => {
            const settings = collectSettingsFromUI();
            if (settings.fakeMode === 'manual') {
                const ram = Number(settings.manualUnits.ram || 0);
                const catapult = Number(settings.manualUnits.catapult || 0);
                if (ram <= 0 && catapult <= 0) {
                    const confirmed = window.confirm(
                        'Le mode MANUEL ne contient ni bélier ni catapulte.\n\n' +
                        'Le fake pourra donc être envoyé sans unité d’atelier. Sauvegarder quand même ?'
                    );
                    if (!confirmed) return;
                }
            }
            saveSettingsObject(settings);
            renderAll();
            notify('Success', 'Paramètres du Fake Intelligent sauvegardés.');
        });

        $('#' + SCRIPT.prefix + 'TryMode').on('click', async () => {
            const settings = collectSettingsFromUI();
            await tryModeOnCurrentTarget(settings);
        });

        $('#' + SCRIPT.prefix + 'GoPlace').on('click', () => {
            const settings = collectSettingsFromUI();
            saveSettingsObject(settings);
            goToRallyPoint();
        });

        $('#' + SCRIPT.prefix + 'ImportTargets').on('click', event => { event.preventDefault(); event.stopPropagation(); openImportDialog('targets'); });
        $('#' + SCRIPT.prefix + 'ExportTargets').on('click', event => { event.preventDefault(); event.stopPropagation(); openExportDialog('targets'); });
        $('#' + SCRIPT.prefix + 'ImportSettings').on('click', event => { event.preventDefault(); event.stopPropagation(); openImportDialog('settings'); });
        $('#' + SCRIPT.prefix + 'ExportSettings').on('click', event => { event.preventDefault(); event.stopPropagation(); openExportDialog('settings'); });

        $('#' + SCRIPT.prefix + 'Playlist').on('click', '.' + SCRIPT.prefix + '-playlist-remove', function (event) {
            event.preventDefault();
            event.stopPropagation();
            removeTargetFromPlaylist(String($(this).data('coord') || ''));
        });

        $('#' + SCRIPT.prefix + 'Playlist').on('click', '.' + SCRIPT.prefix + '-playlist-next', async function (event) {
            event.preventDefault();
            event.stopPropagation();
            await setNextTarget(String($(this).data('coord') || ''));
        });
    }

    function buildUnitsUI() {
        const $auto = $('#' + SCRIPT.prefix + 'AutoUnits');
        const $manual = $('#' + SCRIPT.prefix + 'ManualUnits');
        if (!$auto.length || !$manual.length) return;
        $auto.empty();
        $manual.empty();

        getPlayableFakeUnits().forEach(unit => {
            const enabled = state.settings.autoUnits[unit] !== false;
            const value = Number(state.settings.manualUnits[unit] || 0);
            const maxValue = Math.max(0, Number(state.settings.autoMaxUnits?.[unit] || 0));
            const minValue = Math.max(0, Number(state.settings.autoMinUnits?.[unit] || 0));

            const isSiege = unit === 'ram' || unit === 'catapult';
            const showMax = !['spy', 'ram', 'catapult'].includes(unit);
            const locked = isSiege ? state.settings.siegeLocks[unit] !== false : false;
            const effectiveEnabled = locked ? true : enabled;

            $auto.append(`
                <div class="wt-card ${SCRIPT.prefix}-unit" title="${unit}">
                    ${isSiege ? `<span class="${SCRIPT.prefix}-unit-lock"><button type="button" class="wt-btn wt-btn-secondary ${SCRIPT.prefix}-lock-btn ${SCRIPT.prefix}-siege-lock" data-unit="${unit}" data-locked="${locked ? '1' : '0'}" title="${locked ? 'Déverrouiller Utiliser' : 'Verrouiller Utiliser'}">${locked ? '🔒' : '🔓'}</button></span>` : ''}
                    <img src="/graphic/unit/unit_${unit}.webp" alt="${unit}">
                    <label class="${SCRIPT.prefix}-unit-check" for="${SCRIPT.prefix}Auto_${unit}">
                        <input id="${SCRIPT.prefix}Auto_${unit}" data-unit="${unit}" class="${SCRIPT.prefix}-auto-unit" type="checkbox" ${effectiveEnabled ? 'checked' : ''} ${locked ? 'disabled' : ''}>
                        <span>Utiliser</span>
                    </label>
                    ${isSiege ? `<label class="${SCRIPT.prefix}-unit-min" title="Nombre minimum de cette unité de siège à envoyer."><span>Min</span><input id="${SCRIPT.prefix}AutoMin_${unit}" data-unit="${unit}" class="wt-input ${SCRIPT.prefix}-auto-min-unit" type="number" min="0" step="1" value="${minValue}"></label>` : ''}
                    ${showMax ? `<label class="${SCRIPT.prefix}-unit-max" title="Limite utilisée par AUTO — priorité population. 0 = illimité."><span>Max</span><input id="${SCRIPT.prefix}AutoMax_${unit}" data-unit="${unit}" class="wt-input ${SCRIPT.prefix}-auto-max-unit" type="number" min="0" step="1" value="${maxValue}"></label>` : ''}
                </div>
            `);

            $manual.append(`
                <div class="wt-card ${SCRIPT.prefix}-unit">
                    <img src="/graphic/unit/unit_${unit}.webp" alt="${unit}" title="${unit}">
                    <input id="${SCRIPT.prefix}Manual_${unit}" data-unit="${unit}" class="wt-input ${SCRIPT.prefix}-manual-unit" type="number" min="0" step="1" value="${value}">
                </div>
            `);
        });
    }

    function renderSectionState() {
        const sections = state.settings.sectionState || {};
        $('#' + SCRIPT.prefix + 'Body details[data-section-key]').each(function () {
            const key = String($(this).attr('data-section-key') || '');
            if (!key) return;
            if (Object.prototype.hasOwnProperty.call(sections, key)) {
                $(this).prop('open', !!sections[key]);
            }
        });
    }

    function renderAll() {
        if (!state.panelOpen || !$('#' + SCRIPT.prefix + 'PanelWrap').length) return;

        $('#' + SCRIPT.prefix + 'ManualCoords').val(state.settings.manualCoords || '');
        $('#' + SCRIPT.prefix + 'NightEnabled').prop('checked', !!state.settings.nightEnabled);
        $('#' + SCRIPT.prefix + 'NightStart').val(state.settings.nightStart || '00:00');
        $('#' + SCRIPT.prefix + 'NightEnd').val(state.settings.nightEnd || '07:00');
        $('#' + SCRIPT.prefix + 'FakeMode').val(state.settings.fakeMode || 'auto_balanced');
        $('#' + SCRIPT.prefix + 'AutoSwitchVillage').prop('checked', !!state.settings.autoSwitchVillage);
        $('#' + SCRIPT.prefix + 'HideNightInPlaylist').prop('checked', !!state.settings.hideNightInPlaylist);
        renderSectionState();

        getPlayableFakeUnits().forEach(unit => {
            const isSiege = unit === 'ram' || unit === 'catapult';
            const locked = isSiege ? state.settings.siegeLocks[unit] !== false : false;
            const $check = $('#' + SCRIPT.prefix + 'Auto_' + unit);
            $check.prop('checked', locked ? true : state.settings.autoUnits[unit] !== false);
            $check.prop('disabled', locked);
            if (isSiege) {
                const $lock = $('#' + SCRIPT.prefix + 'AutoUnits .' + SCRIPT.prefix + '-siege-lock[data-unit="' + unit + '"]');
                $lock.attr('data-locked', locked ? '1' : '0')
                    .attr('title', locked ? 'Déverrouiller Utiliser' : 'Verrouiller Utiliser')
                    .text(locked ? '🔒' : '🔓');
            }
            $('#' + SCRIPT.prefix + 'Manual_' + unit).val(Number(state.settings.manualUnits[unit] || 0));
            $('#' + SCRIPT.prefix + 'AutoMax_' + unit).val(Math.max(0, Number(state.settings.autoMaxUnits?.[unit] || 0)));
            if (isSiege) $('#' + SCRIPT.prefix + 'AutoMin_' + unit).val(Math.max(0, Number(state.settings.autoMinUnits?.[unit] || 0)));
        });

        updateModeVisibility();
        renderTribeResults();
        renderPlayerResults();
        renderSelectionChips();
        updateTargetCount();
        renderAttackPlaylist();
        updateStatus();

    }

    function updateStatus() {
        const $status = $('#' + SCRIPT.prefix + 'Status');
        if (!$status.length) return;

        if (state.loading) {
            $status.text('Chargement des données du monde...');
            return;
        }
        if (!state.ready) {
            $status.text('Données non chargées.');
            return;
        }

        const fakeText = state.config.fakeLimit > 0
            ? `${state.config.fakeLimit}%`
            : 'désactivée / non définie';

        $status.text(
            `Monde ${game_data.world} • limite de fake : ${fakeText} • ${formatNumber(state.world.villages.length)} villages • ${formatNumber(state.world.players.length)} joueurs • ${formatNumber(state.world.tribes.length)} tribus`
        );
    }

    function updateModeVisibility() {
        const mode = $('#' + SCRIPT.prefix + 'FakeMode').val() || state.settings.fakeMode;
        const manual = mode === 'manual';
        const populationMode = mode === 'auto_population';
        $('#' + SCRIPT.prefix + 'ManualUnitsWrap').toggleClass(SCRIPT.prefix + '-hidden', !manual);
        $('#' + SCRIPT.prefix + 'AutoUnitsWrap').toggleClass(SCRIPT.prefix + '-hidden', manual);
        $('.' + SCRIPT.prefix + '-unit-max').toggleClass(SCRIPT.prefix + '-hidden', !populationMode);
    }

    function collectSettingsFromUI() {
        const autoUnits = {};
        $('.' + SCRIPT.prefix + '-auto-unit').each(function () {
            autoUnits[$(this).data('unit')] = $(this).prop('checked');
        });

        const autoMaxUnits = { ...(state.settings.autoMaxUnits || {}) };
        $('.' + SCRIPT.prefix + '-auto-max-unit').each(function () {
            const unit = String($(this).data('unit') || '');
            if (!unit) return;
            autoMaxUnits[unit] = Math.max(0, parseInt($(this).val(), 10) || 0);
        });

        const autoMinUnits = { ...(state.settings.autoMinUnits || {}) };
        $('.' + SCRIPT.prefix + '-auto-min-unit').each(function () {
            const unit = String($(this).data('unit') || '');
            if (!unit) return;
            autoMinUnits[unit] = Math.max(0, parseInt($(this).val(), 10) || 0);
        });

        const manualUnits = {};
        $('.' + SCRIPT.prefix + '-manual-unit').each(function () {
            const unit = $(this).data('unit');
            const value = Math.max(0, parseInt($(this).val(), 10) || 0);
            manualUnits[unit] = value;
        });

        const siegeLocks = { ram: true, catapult: true };
        $('#' + SCRIPT.prefix + 'AutoUnits .' + SCRIPT.prefix + '-siege-lock').each(function () {
            const unit = String($(this).data('unit'));
            siegeLocks[unit] = String($(this).attr('data-locked')) === '1';
            if (siegeLocks[unit]) autoUnits[unit] = true;
        });

        const sectionState = { ...(state.settings.sectionState || {}) };
        $('#' + SCRIPT.prefix + 'Body details[data-section-key]').each(function () {
            const key = String($(this).attr('data-section-key') || '');
            if (key) sectionState[key] = !!this.open;
        });

        return normalizeSettings({
            settingsRevision: 8,
            manualCoords: $('#' + SCRIPT.prefix + 'ManualCoords').val() || '',
            tribeIds: state.settings.tribeIds,
            playerIds: state.settings.playerIds,
            excludedCoords: state.settings.excludedCoords,
            nightEnabled: $('#' + SCRIPT.prefix + 'NightEnabled').prop('checked'),
            nightStart: $('#' + SCRIPT.prefix + 'NightStart').val() || '00:00',
            nightEnd: $('#' + SCRIPT.prefix + 'NightEnd').val() || '07:00',
            hideNightInPlaylist: $('#' + SCRIPT.prefix + 'HideNightInPlaylist').prop('checked'),
            fakeMode: $('#' + SCRIPT.prefix + 'FakeMode').val() || 'auto_balanced',
            autoSwitchVillage: $('#' + SCRIPT.prefix + 'AutoSwitchVillage').prop('checked'),
            autoUnits,
            autoMaxUnits,
            autoMinUnits,
            siegeLocks,
            manualUnits,
            sectionState
        });
    }

    function renderTribeResults() {
        const $box = $('#' + SCRIPT.prefix + 'TribeResults');
        if (!$box.length) return;
        $box.empty();
        if (!state.ready) return;

        const q = normalizeSearch($('#' + SCRIPT.prefix + 'TribeSearch').val());
        const selected = new Set(state.settings.tribeIds.map(Number));
        const items = state.world.tribes
            .filter(t => !selected.has(t.id))
            .filter(t => !q || normalizeSearch(t.tag).includes(q) || normalizeSearch(t.name).includes(q))
            .slice(0, 10);

        items.forEach(t => {
            const $btn = $(`
                <button type="button" class="wt-btn ${SCRIPT.prefix}-result">
                    <span class="${SCRIPT.prefix}-result-left">
                        <span class="${SCRIPT.prefix}-result-main">#${t.rank} ${escapeHtml(t.name)}</span>
                        <span class="${SCRIPT.prefix}-result-sub">[${escapeHtml(t.tag)}]</span>
                    </span>
                    <span class="${SCRIPT.prefix}-result-meta">${formatNumber(t.points)} pts</span>
                </button>
            `);
            $btn.on('click', () => {
                state.settings.tribeIds = [...new Set([...state.settings.tribeIds, t.id])];
                $('#' + SCRIPT.prefix + 'TribeSearch').val('');
                renderSelectionChips();
                renderTribeResults();
                updateTargetCount();
            });
            $box.append($btn);
        });
    }

    function renderPlayerResults() {
        const $box = $('#' + SCRIPT.prefix + 'PlayerResults');
        if (!$box.length) return;
        $box.empty();
        if (!state.ready) return;

        const q = normalizeSearch($('#' + SCRIPT.prefix + 'PlayerSearch').val());
        const selected = new Set(state.settings.playerIds.map(Number));
        const items = state.world.players
            .filter(p => !selected.has(p.id))
            .filter(p => {
                if (!q) return true;
                const tribe = state.world.tribeById.get(p.tribeId);
                return normalizeSearch(p.name).includes(q) || (tribe && normalizeSearch(tribe.tag).includes(q));
            })
            .slice(0, 10);

        items.forEach(p => {
            const tribe = state.world.tribeById.get(p.tribeId);
            const tag = tribe ? `[${tribe.tag}]` : 'Sans tribu';
            const $btn = $(`
                <button type="button" class="wt-btn ${SCRIPT.prefix}-result">
                    <span class="${SCRIPT.prefix}-result-left">
                        <span class="${SCRIPT.prefix}-result-main">#${p.rank} ${escapeHtml(p.name)}</span>
                        <span class="${SCRIPT.prefix}-result-sub">${escapeHtml(tag)}</span>
                    </span>
                    <span class="${SCRIPT.prefix}-result-meta">${formatNumber(p.points)} pts</span>
                </button>
            `);
            $btn.on('click', () => {
                state.settings.playerIds = [...new Set([...state.settings.playerIds, p.id])];
                $('#' + SCRIPT.prefix + 'PlayerSearch').val('');
                renderSelectionChips();
                renderPlayerResults();
                updateTargetCount();
            });
            $box.append($btn);
        });
    }

    function renderSelectionChips() {
        const $tribes = $('#' + SCRIPT.prefix + 'TribeChips').empty();
        const $players = $('#' + SCRIPT.prefix + 'PlayerChips').empty();

        state.settings.tribeIds.forEach(id => {
            const t = state.world.tribeById.get(Number(id));
            if (!t) return;
            const $chip = $(`<button type="button" class="wt-btn wt-btn-secondary ${SCRIPT.prefix}-chip">[${escapeHtml(t.tag)}] ×</button>`);
            $chip.on('click', () => {
                state.settings.tribeIds = state.settings.tribeIds.filter(x => Number(x) !== Number(id));
                renderSelectionChips();
                renderTribeResults();
                updateTargetCount();
            });
            $tribes.append($chip);
        });

        state.settings.playerIds.forEach(id => {
            const p = state.world.playerById.get(Number(id));
            if (!p) return;
            const $chip = $(`<button type="button" class="wt-btn wt-btn-secondary ${SCRIPT.prefix}-chip">${escapeHtml(p.name)} ×</button>`);
            $chip.on('click', () => {
                state.settings.playerIds = state.settings.playerIds.filter(x => Number(x) !== Number(id));
                renderSelectionChips();
                renderPlayerResults();
                updateTargetCount();
            });
            $players.append($chip);
        });
    }

    function updateTargetCount() {
        const manual = parseCoordinates($('#' + SCRIPT.prefix + 'ManualCoords').val() || state.settings.manualCoords || '');
        $('#' + SCRIPT.prefix + 'ManualCount').text(`${manual.length} coordonnée${manual.length > 1 ? 's' : ''}`);

        if (!state.ready) {
            $('#' + SCRIPT.prefix + 'TargetCount').text(`${manual.length} cible(s) manuelle(s) — données monde en chargement`);
            return;
        }

        const settings = collectSettingsFromUI();
        const targets = buildTargetCoordinates(settings);
        const sourceCounts = [];
        const tribeCount = Array.isArray(settings.tribeIds) ? settings.tribeIds.length : 0;
        const playerCount = Array.isArray(settings.playerIds) ? settings.playerIds.length : 0;
        const coordCount = manual.length;
        if (tribeCount > 0) sourceCounts.push(`${formatNumber(tribeCount)} tribu${tribeCount > 1 ? 's' : ''}`);
        if (playerCount > 0) sourceCounts.push(`${formatNumber(playerCount)} joueur${playerCount > 1 ? 's' : ''}`);
        if (coordCount > 0) sourceCounts.push(`${formatNumber(coordCount)} coordonnée${coordCount > 1 ? 's' : ''}`);
        const sourceSuffix = sourceCounts.length ? ` - ${sourceCounts.join(' - ')}` : '';
        $('#' + SCRIPT.prefix + 'TargetCount').text(`${formatNumber(targets.length)} cible${targets.length > 1 ? 's' : ''} unique${targets.length > 1 ? 's' : ''}${sourceSuffix}`);
        renderAttackPlaylist(settings);
    }

    function getOutgoingCommandsBaseUrl() {
        try {
            if (window.TribalWars && typeof TribalWars.buildURL === 'function') {
                return TribalWars.buildURL('GET', 'overview_villages', { mode: 'commands', type: 'attack' });
            }
        } catch (_) {}
        return game_data.link_base_pure + 'overview_villages&mode=commands&type=attack';
    }

    function withPageParameter(url, page) {
        const parsed = new URL(url, window.location.origin);
        parsed.searchParams.set('page', String(page));
        return parsed.href;
    }

    function getCommandsMaxPage($html) {
        let maxPage = 0;
        const inspect = value => {
            const raw = String(value || '');
            let match = raw.match(/[?&]page=(\d+)/);
            if (!match && /^\d+$/.test(raw.trim())) match = [raw, raw.trim()];
            if (match) maxPage = Math.max(maxPage, Number(match[1]) || 0);
        };
        $html.find('a.paged-nav-item[href*="page="], option').each(function () {
            inspect($(this).attr('href'));
            inspect($(this).val());
        });
        return maxPage;
    }

    function addOutgoingCommandRowsToCounts($html, counts) {
        const $rows = $html.find('#commands_table').find('tr.row_a, tr.row_ax, tr.row_b, tr.row_bx');
        $rows.each(function () {
            const $row = $(this);
            let coord = parseCoordinates($row.find('.quickedit-label').first().text())[0];
            if (!coord) {
                // Secours pour certaines variantes de l'aperçu : le premier lien village du libellé
                // correspond à la cible sur l'écran des commandes sortantes.
                coord = parseCoordinates($row.find('a[href*="screen=info_village"]').first().text())[0];
            }
            if (!coord) return;
            counts.set(coord, (counts.get(coord) || 0) + 1);
        });
        return $rows.length;
    }

    async function refreshOutgoingAttackCounts(force = false) {
        const maxAge = 15000;
        if (!force && state.outgoingAttackCountsLoaded && Date.now() - state.outgoingAttackCountsAt < maxAge) {
            return state.outgoingAttackCounts;
        }
        if (state.outgoingAttackCountsPromise) return state.outgoingAttackCountsPromise;

        state.outgoingAttackCountsPromise = (async () => {
            const counts = new Map();
            const baseUrl = getOutgoingCommandsBaseUrl();
            const firstHtml = await $.get(withPageParameter(baseUrl, -1));
            const $first = $(firstHtml);
            const firstRows = addOutgoingCommandRowsToCounts($first, counts);

            // page=-1 renvoie jusqu'à 1000 commandes. S'il y en a davantage,
            // on poursuit uniquement à partir de la première page non déjà incluse.
            if (firstRows >= 1000) {
                const pageSize = Math.max(1, parseInt($first.find('input[name="page_size"]').first().val(), 10) || 100);
                const maxPage = getCommandsMaxPage($first);
                let page = Math.floor(firstRows / pageSize);
                while (page <= maxPage && page < 250) {
                    const html = await $.get(withPageParameter(baseUrl, page));
                    addOutgoingCommandRowsToCounts($(html), counts);
                    page++;
                }
            }

            state.outgoingAttackCounts = counts;
            state.outgoingAttackCountsLoaded = true;
            state.outgoingAttackCountsAt = Date.now();
            return counts;
        })().catch(error => {
            console.warn(`[${SCRIPT.name}] Impossible de lire les attaques sortantes`, error);
            state.outgoingAttackCountsLoaded = false;
            return state.outgoingAttackCounts;
        }).finally(() => {
            state.outgoingAttackCountsPromise = null;
        });

        return state.outgoingAttackCountsPromise;
    }

    function getRealAttackCount(coord) {
        if (!state.outgoingAttackCountsLoaded) return null;
        return Number(state.outgoingAttackCounts.get(String(coord || '')) || 0);
    }

    // Trie par nombre réel d'attaques sortantes croissant.
    // En cas d'égalité, l'ordre de la file circulaire est conservé.
    function sortTargetsByRealAttackCount(targets) {
        const list = Array.isArray(targets) ? targets.slice() : [];
        if (!state.outgoingAttackCountsLoaded) return list;
        return list
            .map((coord, index) => ({ coord, index, count: getRealAttackCount(coord) ?? 0 }))
            .sort((a, b) => (a.count - b.count) || (a.index - b.index))
            .map(item => item.coord);
    }

    function renderAttackPlaylist(settingsOverride) {
        const $list = $('#' + SCRIPT.prefix + 'Playlist');
        const $status = $('#' + SCRIPT.prefix + 'PlaylistStatus');
        if (!$list.length || !$status.length) return;
        $list.empty();

        if (!state.ready) {
            $status.text('Données monde en chargement...');
            return;
        }

        const settings = settingsOverride || ($('#' + SCRIPT.prefix + 'PanelWrap').length ? collectSettingsFromUI() : state.settings);
        const sourceCoord = game_data.village && game_data.village.coord ? game_data.village.coord : '';
        const currentTarget = getCurrentRallyTarget();
        const nextTarget = getNextTarget(sourceCoord);
        const playerId = Number(game_data.player && game_data.player.id);
        const items = [];
        const available = getAvailableTroops();
        const playlistPlan = buildPlanForTarget(settings, null, available);
        const playlistSlowest = playlistPlan.ok ? slowestUnitInPlan(playlistPlan.plan) : null;
        const playlistNow = getServerDateTime();

        const orderedQueue = sortTargetsByRealAttackCount(getTargetQueue(settings));
        for (const coord of orderedQueue) {
            if (coord === sourceCoord) continue;
            const village = state.world.villageByCoord.get(coord);
            if (!village) continue;
            if (Number(village.playerId) === playerId) continue;
            let night = false;
            if (sourceCoord && playlistSlowest) {
                const arrival = new Date(playlistNow.getTime() + travelMilliseconds(sourceCoord, coord, playlistSlowest.unit));
                night = isNightArrival(arrival, settings);
            }
            items.push({
                coord,
                village,
                current: coord === currentTarget,
                next: coord === nextTarget,
                night,
                sentCount: countSentToTarget(coord),
                attackCount: getRealAttackCount(coord)
            });
        }

        const hideNight = !!settings.hideNightInPlaylist;
        const hiddenNightCount = hideNight ? items.filter(item => item.night && !item.current).length : 0;
        const visibleItems = hideNight ? items.filter(item => !item.night || item.current) : items;

        if (!items.length) {
            const totalSent = countTotalSent();
            $status.text(`Aucune cible dans la playlist${totalSent ? ` • ${formatNumber(totalSent)} fake${totalSent > 1 ? 's' : ''} envoyé${totalSent > 1 ? 's' : ''}` : ''}.`);
        } else {
            const totalSent = countTotalSent();
            const hiddenText = hiddenNightCount ? ` • ${formatNumber(hiddenNightCount)} NUIT masquée${hiddenNightCount > 1 ? 's' : ''}` : '';
            $status.text(`${formatNumber(items.length)} cible${items.length > 1 ? 's' : ''} en rotation • ${formatNumber(totalSent)} fake${totalSent > 1 ? 's' : ''} envoyé${totalSent > 1 ? 's' : ''}${hiddenText}`);
            visibleItems.slice(0, 100).forEach((item, index) => {
                const player = state.world.playerById.get(item.village.playerId);
                const tribe = player ? state.world.tribeById.get(player.tribeId) : null;
                const who = player ? player.name : 'Barbare';
                const tag = tribe ? ` [${tribe.tag}]` : '';
                const flags = [];
                if (item.current) flags.push('EN COURS');
                if (item.next) flags.push('SUIVANT');
                if (item.night && !item.current) flags.push('NUIT');
                const subParts = [who + tag, ...flags];
                const realFakeCount = item.attackCount;
                const fakeText = realFakeCount === null
                    ? '… fake'
                    : `${formatNumber(realFakeCount)} fake${realFakeCount > 1 ? 's' : ''}`;
                $list.append(`
                    <div class="wt-card ${SCRIPT.prefix}-playlist-item ${item.current ? SCRIPT.prefix + '-playlist-current' : ''}">
                        <span class="${SCRIPT.prefix}-playlist-index">${index + 1}.</span>
                        <span class="${SCRIPT.prefix}-playlist-main">
                            <span class="${SCRIPT.prefix}-playlist-title">${escapeHtml(item.coord)} - ${escapeHtml(item.village.name || '')}</span>
                            <span class="${SCRIPT.prefix}-playlist-sub">${escapeHtml(subParts.join(' • '))}</span>
                        </span>
                        <span class="${SCRIPT.prefix}-playlist-meta">${formatNumber(item.village.points)} pts<br>${escapeHtml(fakeText)}</span>
                        <button type="button" class="wt-btn wt-btn-secondary ${SCRIPT.prefix}-playlist-next ${item.next ? SCRIPT.prefix + '-playlist-next-active' : ''}" data-coord="${escapeHtml(item.coord)}" title="Définir comme prochain village" ${item.current ? 'disabled' : ''}>Suivant</button>
                        <button type="button" class="wt-btn wt-btn-secondary ${SCRIPT.prefix}-playlist-remove" data-coord="${escapeHtml(item.coord)}" title="Supprimer cette cible">×</button>
                    </div>
                `);
            });
            if (!visibleItems.length && hiddenNightCount) {
                $list.append(`<div class="wt-small">Toutes les cibles sont actuellement masquées car leur arrivée tombe dans le bonus de nuit.</div>`);
            }
            if (visibleItems.length > 100) {
                $list.append(`<div class="wt-small">… ${formatNumber(visibleItems.length - 100)} cible(s) supplémentaire(s)</div>`);
            }
        }

        // Le compteur affiche à droite le nombre réel d'attaques sortantes vers chaque cible.
        // Il est rafraîchi en arrière-plan et ne bloque pas l'ouverture de l'interface.
        const countsAreFresh = state.outgoingAttackCountsLoaded && Date.now() - state.outgoingAttackCountsAt < 15000;
        if (!countsAreFresh && !state.outgoingAttackCountsPromise) {
            refreshOutgoingAttackCounts().then(() => {
                if ($('#' + SCRIPT.prefix + 'Playlist').length) renderAttackPlaylist(settings);
            });
        }
    }

    function utf8ToBase64(value) {
        const bytes = new TextEncoder().encode(String(value));
        let binary = '';
        bytes.forEach(byte => { binary += String.fromCharCode(byte); });
        return btoa(binary);
    }

    function base64ToUtf8(value) {
        const binary = atob(String(value));
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    function getShareScopePayload(settings, scope) {
        const normalized = normalizeSettings(settings);
        if (scope === 'targets') {
            return {
                manualCoords: normalized.manualCoords,
                tribeIds: normalized.tribeIds,
                playerIds: normalized.playerIds,
                excludedCoords: normalized.excludedCoords
            };
        }
        return {
            nightEnabled: normalized.nightEnabled,
            nightStart: normalized.nightStart,
            nightEnd: normalized.nightEnd,
            fakeMode: normalized.fakeMode,
            autoSwitchVillage: normalized.autoSwitchVillage,
            autoUnits: normalized.autoUnits,
            autoMaxUnits: normalized.autoMaxUnits,
            autoMinUnits: normalized.autoMinUnits,
            siegeLocks: normalized.siegeLocks,
            manualUnits: normalized.manualUnits
        };
    }

    function buildShareCode(settings, scope) {
        const kind = scope === 'targets' ? 'targets' : 'settings';
        const payload = {
            type: 'WebiTime_GT_FakeIntelligent',
            format: 2,
            scope: kind,
            world: String(game_data.world || ''),
            version: SCRIPT.version,
            data: getShareScopePayload(settings, kind)
        };
        return (kind === 'targets' ? 'WTFI-T1:' : 'WTFI-P1:') + utf8ToBase64(JSON.stringify(payload));
    }

    function parseShareCode(raw, expectedScope) {
        const value = String(raw || '').trim();
        if (!value) throw new Error('Aucune donnée à importer.');

        let payload;
        if (value.startsWith('WTFI-T1:')) payload = JSON.parse(base64ToUtf8(value.slice(8)));
        else if (value.startsWith('WTFI-P1:')) payload = JSON.parse(base64ToUtf8(value.slice(8)));
        else if (value.startsWith('WTFI1:')) {
            // Compatibilité avec les exports complets v1.6.
            const legacy = JSON.parse(base64ToUtf8(value.slice(6)));
            payload = {
                type: legacy.type,
                format: 1,
                scope: expectedScope,
                world: legacy.world,
                data: getShareScopePayload(normalizeSettings(legacy.settings || {}), expectedScope)
            };
        } else {
            payload = JSON.parse(value);
        }

        if (!payload || payload.type !== 'WebiTime_GT_FakeIntelligent') {
            throw new Error('Format d’import non reconnu.');
        }
        if (payload.world && String(payload.world) !== String(game_data.world || '')) {
            throw new Error(`Ces données appartiennent au monde ${payload.world}, pas à ${game_data.world}.`);
        }

        const scope = payload.scope || expectedScope;
        if (scope !== expectedScope) {
            throw new Error(expectedScope === 'targets' ? 'Ce code contient des paramètres, pas des cibles.' : 'Ce code contient des cibles, pas des paramètres.');
        }
        return payload.data || {};
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve, reject) => {
            try {
                const area = document.createElement('textarea');
                area.value = text;
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.select();
                document.execCommand('copy');
                area.remove();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    function openExportDialog(scope) {
        const settings = $('#' + SCRIPT.prefix + 'PanelWrap').length ? collectSettingsFromUI() : state.settings;
        const isTargets = scope === 'targets';
        const code = buildShareCode(settings, scope);
        const label = isTargets ? 'Cibles' : 'Paramètres';
        const html = `
            <div class="${SCRIPT.prefix}-share-box" style="width:min(560px,80vw);">
                <div class="wt-small" style="margin-bottom:7px;">Copie ce texte pour partager uniquement les ${label.toLowerCase()}. L’historique d’attaque n’est jamais exporté.</div>
                <textarea id="${SCRIPT.prefix}ExportText" class="wt-input" readonly>${escapeHtml(code)}</textarea>
                <div style="margin-top:8px;text-align:center;"><button id="${SCRIPT.prefix}CopyExport" type="button" class="wt-btn wt-btn-primary">Copier</button></div>
            </div>
        `;
        if (window.Dialog && typeof Dialog.show === 'function') Dialog.show(SCRIPT.prefix + 'ExportDialog', html);
        else window.prompt(label + ' à partager', code);
        setTimeout(() => {
            $('#' + SCRIPT.prefix + 'CopyExport').off('click').on('click', async () => {
                try {
                    await copyText(code);
                    notify('Success', `${label} copiés dans le presse-papiers.`);
                } catch (_) {
                    notify('Error', 'Impossible de copier automatiquement.');
                }
            });
            $('#' + SCRIPT.prefix + 'ExportText').on('click', function () { this.select(); });
        }, 0);
    }

    function openImportDialog(scope) {
        const isTargets = scope === 'targets';
        const label = isTargets ? 'cibles' : 'paramètres';
        const placeholder = isTargets ? 'WTFI-T1:...' : 'WTFI-P1:...';
        const html = `
            <div class="${SCRIPT.prefix}-share-box" style="width:min(560px,80vw);">
                <div class="wt-small" style="margin-bottom:7px;">Colle ici le texte contenant les ${label} partagé par un autre membre du même monde.</div>
                <textarea id="${SCRIPT.prefix}ImportText" class="wt-input" placeholder="${placeholder}"></textarea>
                <div style="margin-top:8px;text-align:center;"><button id="${SCRIPT.prefix}ApplyImport" type="button" class="wt-btn wt-btn-primary">Importer les ${label}</button></div>
            </div>
        `;
        if (window.Dialog && typeof Dialog.show === 'function') Dialog.show(SCRIPT.prefix + 'ImportDialog', html);
        else {
            const value = window.prompt(`Colle les ${label} à importer`);
            if (value) applyImportedSettings(value, scope);
            return;
        }
        setTimeout(() => {
            $('#' + SCRIPT.prefix + 'ApplyImport').off('click').on('click', () => {
                applyImportedSettings($('#' + SCRIPT.prefix + 'ImportText').val(), scope);
            });
        }, 0);
    }

    function applyImportedSettings(raw, scope) {
        try {
            const imported = parseShareCode(raw, scope);
            const current = $('#' + SCRIPT.prefix + 'PanelWrap').length ? collectSettingsFromUI() : state.settings;
            const merged = normalizeSettings({ ...current, ...imported });
            saveSettingsObject(merged);
            buildUnitsUI();
            renderAll();
            if (window.Dialog && typeof Dialog.close === 'function') Dialog.close();
            notify('Success', scope === 'targets' ? 'Cibles importées et sauvegardées.' : 'Paramètres importés et sauvegardés.');
        } catch (error) {
            notify('Error', error && error.message ? error.message : 'Import impossible.', 6000);
        }
    }

    function clearRallyTarget() {
        if ($('#inputx').length) $('#inputx').val('');
        if ($('#inputy').length) $('#inputy').val('');
        if ($('#place_target input').length) $('#place_target input').val('');
        const namedTarget = $('#command-data-form input[name="target"], input[name="target"]').first();
        if (namedTarget.length) namedTarget.val('');
        if (document.forms[0]) {
            if (document.forms[0].x) document.forms[0].x.value = '';
            if (document.forms[0].y) document.forms[0].y.value = '';
        }
        clearCommandForm();
        clearPendingAttack();
    }

    function removeTargetFromPlaylist(coord) {
        const target = parseCoordinates(coord)[0];
        if (!target) return;

        const current = collectSettingsFromUI();
        current.excludedCoords = [...new Set([...(current.excludedCoords || []), target])];
        saveSettingsObject(current);
        getTargetQueue(current);

        if (getCurrentRallyTarget() === target) clearRallyTarget();
        if (getNextTarget(game_data.village && game_data.village.coord) === target) clearNextTarget(game_data.village && game_data.village.coord);
        renderAll();
        notify('Success', `Cible ${target} supprimée de la playlist.`);
    }

    // Le choix "Suivant" appartient à la playlist globale et non au village source.
    // Cela permet de conserver la prochaine cible lors d'un changement automatique de village.
    function getNextTarget(sourceCoord) {
        try {
            const raw = JSON.parse(sessionStorage.getItem(NEXT_TARGET_KEY) || '{}');
            if (!raw || typeof raw !== 'object') return null;

            // Format v1.23+
            const direct = parseCoordinates(raw.target)[0];
            if (direct) return direct;

            // Migration transparente du format v1.22 : { "sourceCoord": "targetCoord" }.
            const sourceValue = parseCoordinates(raw[String(sourceCoord || '')])[0];
            if (sourceValue) return sourceValue;
            for (const value of Object.values(raw)) {
                const migrated = parseCoordinates(value)[0];
                if (migrated) return migrated;
            }
            return null;
        } catch (_) {
            return null;
        }
    }

    async function setNextTarget(coord) {
        const target = parseCoordinates(coord)[0];
        if (!target) return false;

        // Le choix reste mémorisé si un changement de village intervient avant l'envoi.
        sessionStorage.setItem(NEXT_TARGET_KEY, JSON.stringify({ target }));

        // Depuis une autre page, on garde simplement la préférence puis on revient au ralliement.
        if (game_data.screen !== 'place') {
            notify('Info', `${target} défini comme prochaine cible. Ouverture du point de ralliement...`);
            goToRallyPoint();
            return true;
        }

        // Ne jamais modifier une commande déjà sur l'écran de confirmation.
        if ($('#troop_confirm_submit, #command-data-form input[name="confirm"], #command-data-form button[name="confirm"]').filter(':visible').length) {
            notify('Error', 'Reviens au point de ralliement avant de changer la cible.');
            renderAttackPlaylist();
            return false;
        }

        if (!state.ready) {
            await loadData();
            if (!state.ready) return false;
        }

        const settings = $('#' + SCRIPT.prefix + 'PanelWrap').length
            ? collectSettingsFromUI()
            : state.settings;
        const village = state.world.villageByCoord.get(target);
        if (!village) {
            notify('Error', `Village ${target} introuvable dans les données monde.`);
            return false;
        }
        if (Number(village.playerId) === Number(game_data.player.id)) {
            notify('Error', `Le village ${target} t'appartient.`);
            return false;
        }

        const available = getAvailableTroops();
        const planResult = buildPlanForTarget(settings, village, available);
        if (!planResult.ok) {
            notify('Error', `Impossible de préparer ${target} : ${planResult.reason || 'troupes insuffisantes.'}`, 6500);
            return false;
        }

        const slowest = slowestUnitInPlan(planResult.plan);
        if (!slowest) {
            notify('Error', `Impossible de déterminer l'unité la plus lente pour ${target}.`);
            return false;
        }

        const sourceCoord = game_data.village.coord;
        const arrival = new Date(getServerDateTime().getTime() + travelMilliseconds(sourceCoord, target, slowest.unit));
        if (isNightArrival(arrival, settings)) {
            notify('Error', `${target} arriverait en Bonus de nuit (${formatTime(arrival)}). Cible non préparée.`, 6500);
            renderAttackPlaylist(settings);
            return false;
        }

        // Comportement immédiat : même principe qu'Essayer, mais en changeant aussi la cible.
        fillTarget(target);
        fillPlan(planResult.plan);
        clearNextTarget(sourceCoord);
        renderAttackPlaylist(settings);
        notify(
            'Success',
            `Cible suivante appliquée : ${target} • ${planResult.actualPop}/${planResult.requiredPop || 0} pop • arrivée ${formatTime(arrival)}`,
            5000
        );
        return true;
    }

    function clearNextTarget(sourceCoord) {
        sessionStorage.removeItem(NEXT_TARGET_KEY);
    }

    function normalizeSearch(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function cleanMapString(value) {
        try {
            return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
        } catch (_) {
            return String(value || '').replace(/\+/g, ' ');
        }
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('fr-FR');
    }

    function parseCoordinates(text) {
        const matches = String(text || '').match(/\b\d{1,3}\|\d{1,3}\b/g) || [];
        return [...new Set(matches)];
    }

    function buildTargetCoordinates(settings) {
        const coords = new Set(parseCoordinates(settings.manualCoords));
        const playerIds = new Set(settings.playerIds.map(Number));
        const tribeIds = new Set(settings.tribeIds.map(Number));

        if (tribeIds.size) {
            state.world.players.forEach(p => {
                if (tribeIds.has(p.tribeId)) playerIds.add(p.id);
            });
        }

        if (playerIds.size) {
            state.world.villages.forEach(v => {
                if (playerIds.has(v.playerId)) coords.add(v.coord);
            });
        }

        const excluded = new Set((settings.excludedCoords || []).map(String));
        return [...coords].filter(coord => !excluded.has(coord));
    }

    function readTargetQueue() {
        try {
            const raw = JSON.parse(sessionStorage.getItem(TARGET_QUEUE_KEY) || '[]');
            return Array.isArray(raw) ? parseCoordinates(raw.join(' ')) : [];
        } catch (_) {
            return [];
        }
    }

    function writeTargetQueue(queue) {
        const clean = parseCoordinates((queue || []).join(' '));
        sessionStorage.setItem(TARGET_QUEUE_KEY, JSON.stringify(clean));
        return clean;
    }

    // Synchronise la file persistante avec les cibles actuellement configurees.
    // L'ordre deja acquis est conserve ; les nouvelles cibles sont ajoutees a la fin.
    function getTargetQueue(settings = state.settings) {
        const configured = buildTargetCoordinates(settings);
        const allowed = new Set(configured);
        const stored = readTargetQueue().filter(coord => allowed.has(coord));
        const seen = new Set(stored);
        for (const coord of configured) {
            if (!seen.has(coord)) {
                stored.push(coord);
                seen.add(coord);
            }
        }
        return writeTargetQueue(stored);
    }

    // Une cible envoyee n'est jamais retiree : elle repart a la fin de la playlist.
    function rotateTargetToEnd(targetCoord, settings = state.settings) {
        const target = parseCoordinates(targetCoord)[0];
        if (!target) return;
        const queue = getTargetQueue(settings).filter(coord => coord !== target);
        if (buildTargetCoordinates(settings).includes(target)) queue.push(target);
        writeTargetQueue(queue);
    }

    function getPlayableFakeUnits() {
        const excluded = new Set(['militia', 'knight', 'snob']);
        return (game_data.units || []).filter(unit => !excluded.has(unit));
    }

    async function loadData() {
        if (state.loading || state.ready) return;
        state.loading = true;
        updateStatus();

        try {
            const [configXml, unitsXml, villageText, playerText, tribeText] = await Promise.all([
                $.ajax('/interface.php?func=get_config'),
                $.ajax('/interface.php?func=get_unit_info'),
                $.ajax('/map/village.txt'),
                $.ajax('/map/player.txt'),
                $.ajax('/map/ally.txt')
            ]);

            parseWorldConfig(configXml);
            parseUnitConfig(unitsXml);
            parseWorldData(villageText, playerText, tribeText);

            // Le mode équilibré doit utiliser les temps réellement affichés dans CE village.
            // Cela prend en compte le niveau Caserne/Écurie/Atelier et les éventuels bonus locaux.
            try {
                const trainHtml = await $.ajax({
                    url: game_data.link_base_pure + 'train',
                    method: 'GET',
                    cache: false
                });
                parseRecruitTimesFromTrain(trainHtml);
            } catch (trainError) {
                console.warn(`[${SCRIPT.name}] Temps réels de recrutement indisponibles, utilisation du calcul de secours.`, trainError);
            }

            state.ready = true;
        } catch (error) {
            console.error(`[${SCRIPT.name}] Erreur de chargement`, error);
            notify('Error', 'Impossible de charger les données du monde.');
        } finally {
            state.loading = false;
            renderAll();
        }
    }

    function parseWorldConfig(xml) {
        const $xml = $(xml);
        state.config.fakeLimit = parseFloat($xml.find('fake_limit').first().text()) || 0;
        state.config.worldSpeed = parseFloat($xml.find('speed').first().text()) || 1;
        state.config.unitSpeed = parseFloat($xml.find('unit_speed').first().text()) || 1;
    }

    function parseUnitConfig(xml) {
        const $xml = $(xml);
        state.units = {};
        (game_data.units || []).forEach(unit => {
            const $node = $xml.find(unit).first();
            if (!$node.length) return;
            state.units[unit] = {
                speed: parseFloat($node.find('speed').first().text()) || 0,
                pop: parseFloat($node.find('pop').first().text()) || 0,
                buildTime: parseFloat($node.find('build_time').first().text()) || Number.MAX_SAFE_INTEGER
            };
        });
    }

    function parseDurationSeconds(value) {
        const parts = String(value || '').trim().split(':').map(Number);
        if (parts.length < 2 || parts.some(part => !Number.isFinite(part) || part < 0)) return null;
        return parts.reduce((total, part) => total * 60 + part, 0);
    }

    function parseRecruitTimesFromTrain(html) {
        let doc = null;
        if (html && html.nodeType === 9) {
            doc = html;
        } else {
            try {
                doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
            } catch (_) {
                return;
            }
        }

        (game_data.units || []).forEach(unit => {
            const el = doc.getElementById(`${unit}_0_cost_time`);
            if (!el || !state.units[unit]) return;
            const seconds = parseDurationSeconds(el.textContent);
            if (Number.isFinite(seconds) && seconds > 0) {
                state.units[unit].recruitTime = seconds;
            }
        });
    }

    function parseCsvLines(text) {
        return String(text || '')
            .split(/\r?\n/)
            .filter(Boolean)
            .map(line => line.split(','));
    }

    function parseWorldData(villageText, playerText, tribeText) {
        const tribes = parseCsvLines(tribeText).map(row => ({
            id: parseInt(row[0], 10),
            name: cleanMapString(row[1]),
            tag: cleanMapString(row[2]),
            members: parseInt(row[3], 10) || 0,
            villages: parseInt(row[4], 10) || 0,
            points: parseInt(row[5], 10) || 0,
            allPoints: parseInt(row[6], 10) || 0,
            rank: parseInt(row[7], 10) || 0
        })).filter(x => Number.isFinite(x.id));

        const players = parseCsvLines(playerText).map(row => ({
            id: parseInt(row[0], 10),
            name: cleanMapString(row[1]),
            tribeId: parseInt(row[2], 10) || 0,
            villages: parseInt(row[3], 10) || 0,
            points: parseInt(row[4], 10) || 0,
            rank: parseInt(row[5], 10) || 0
        })).filter(x => Number.isFinite(x.id));

        const villages = parseCsvLines(villageText).map(row => ({
            id: parseInt(row[0], 10),
            name: cleanMapString(row[1]),
            x: parseInt(row[2], 10),
            y: parseInt(row[3], 10),
            playerId: parseInt(row[4], 10) || 0,
            points: parseInt(row[5], 10) || 0,
            type: parseInt(row[6], 10) || 0,
            coord: `${row[2]}|${row[3]}`
        })).filter(x => Number.isFinite(x.id));

        tribes.sort((a, b) => b.points - a.points || a.rank - b.rank);
        players.sort((a, b) => b.points - a.points || a.rank - b.rank);

        state.world.tribes = tribes;
        state.world.players = players;
        state.world.villages = villages;
        state.world.tribeById = new Map(tribes.map(x => [x.id, x]));
        state.world.playerById = new Map(players.map(x => [x.id, x]));
        state.world.villageByCoord = new Map(villages.map(x => [x.coord, x]));
    }

    function getAvailableTroops() {
        const counts = {};
        getPlayableFakeUnits().forEach(unit => {
            let count = 0;
            const $input = $('#unit_input_' + unit);
            if ($input.length) {
                const attr = parseInt($input.attr('data-all-count'), 10);
                if (Number.isFinite(attr)) count = attr;
                if (!count) {
                    const text = ($input.next('a').text() || '') + ' ' + ($input.parent().text() || '');
                    const match = text.match(/\((\d+)\)/) || text.match(/\b(\d+)\b/);
                    if (match) count = parseInt(match[1], 10) || 0;
                }
            }
            counts[unit] = Math.max(0, count || 0);
        });
        return counts;
    }

    function getSourceFakePopulation() {
        const limit = Number(state.config.fakeLimit || 0);
        if (limit <= 0) return 0;

        // La limite de fake est calculée sur le village qui ENVOIE l'attaque.
        // game_data.village.points est prioritaire ; map/village.txt sert de repli.
        let sourcePoints = Number(game_data.village && game_data.village.points);
        if (!Number.isFinite(sourcePoints) || sourcePoints <= 0) {
            const source = state.world.villageByCoord.get(game_data.village.coord);
            sourcePoints = Number(source && source.points);
        }
        if (!Number.isFinite(sourcePoints) || sourcePoints <= 0) return null;
        return Math.ceil(sourcePoints * limit / 100);
    }

    function addUnit(plan, unit, amount, available) {
        amount = Math.max(0, Math.floor(amount || 0));
        if (!amount) return 0;
        const current = plan[unit] || 0;
        const canAdd = Math.max(0, Math.min(amount, (available[unit] || 0) - current));
        if (canAdd > 0) plan[unit] = current + canAdd;
        return canAdd;
    }

    function populationOfPlan(plan) {
        return Object.entries(plan).reduce((sum, [unit, amount]) => {
            return sum + (state.units[unit]?.pop || 0) * amount;
        }, 0);
    }

    function villageProfile(available) {
        const unitPop = unit => Math.max(0, Number(available[unit] || 0)) * Math.max(1, Number(state.units[unit]?.pop || 1));
        const offScore = unitPop('axe') + unitPop('light') + unitPop('marcher');
        const defScore = unitPop('spear') + unitPop('sword') + unitPop('archer') + unitPop('heavy');
        if (offScore === 0 && defScore === 0) return 'neutral';
        return offScore >= defScore ? 'off' : 'def';
    }

    function preferredCoreUnit(available, allowedUnits) {
        const profile = villageProfile(available);
        const preferred = profile === 'off' ? 'axe' : profile === 'def' ? 'spear' : null;
        if (!preferred || !allowedUnits.has(preferred) || (available[preferred] || 0) <= 0) return null;
        return preferred;
    }

    function seedPreferredCore(plan, requiredPop, available, allowedUnits) {
        const preferred = options.usePreferred === false ? null : preferredCoreUnit(available, allowedUnits);
        if (!preferred) return null;
        const remainingTarget = Math.max(0, requiredPop - populationOfPlan(plan));
        const pop = Math.max(1, Number(state.units[preferred]?.pop || 1));
        const targetPop = Math.ceil(remainingTarget * 0.40);
        const amount = Math.max(1, Math.ceil(targetPop / pop));
        addUnit(plan, preferred, amount, available);
        return preferred;
    }

    function chooseSiegeUnit(available, allowedUnits) {
        const options = ['ram', 'catapult']
            .filter(unit => allowedUnits.has(unit))
            .filter(unit => state.units[unit] && (available[unit] || 0) > 0)
            .sort((a, b) => {
                // Sans minimum explicite, utiliser l'unité de siège la moins coûteuse
                // en temps de recrutement ; le stock ne sert qu'à départager.
                const timeDiff = effectiveRecruitTime(a) - effectiveRecruitTime(b);
                if (timeDiff) return timeDiff;
                return (available[b] || 0) - (available[a] || 0);
            });
        return options[0] || null;
    }

    function seedAutoPlanBase(plan, available, allowedUnits, autoMinUnits = {}, autoMaxUnits = {}) {
        const siegeUnits = ['ram', 'catapult'];
        const siegeAllowed = siegeUnits.some(unit => allowedUnits.has(unit));
        const explicitSiege = siegeUnits.filter(unit => allowedUnits.has(unit) && Math.max(0, Number(autoMinUnits?.[unit] || 0)) > 0);

        if (explicitSiege.length) {
            for (const unit of explicitSiege) {
                const minimum = Math.max(0, Math.floor(Number(autoMinUnits?.[unit] || 0)));
                const stock = Math.max(0, Number(available[unit] || 0));
                if (stock < minimum) {
                    return { ok: false, reason: `Minimum ${unit} impossible : ${minimum} demandé(s), ${stock} disponible(s).` };
                }
                addUnit(plan, unit, minimum, available);
            }
        } else if (siegeAllowed) {
            const siege = chooseSiegeUnit(available, allowedUnits);
            if (!siege) return { ok: false, reason: 'Aucun bélier ou catapulte autorisé disponible.' };
            addUnit(plan, siege, 1, available);
        }

        if (allowedUnits.has('spy') && (available.spy || 0) > 0) addUnit(plan, 'spy', 1, available);

        const elevatedSiege = explicitSiege.some(unit => Math.max(0, Number(autoMinUnits?.[unit] || 0)) > 10);
        if (elevatedSiege) {
            const profile = villageProfile(available);
            const cavalryUnit = profile === 'def' ? 'heavy' : 'light';
            if (!allowedUnits.has(cavalryUnit)) {
                return { ok: false, reason: `${cavalryUnit} doit être autorisé avec ce minimum d’unités de siège.` };
            }
            const stock = Math.max(0, Number(available[cavalryUnit] || 0));
            if (stock <= 0) {
                return { ok: false, reason: `Aucun ${cavalryUnit} disponible avec ce minimum d’unités de siège.` };
            }
            const configuredMax = Math.max(0, Math.floor(Number(autoMaxUnits?.[cavalryUnit] || 0)));
            const amount = configuredMax > 0 ? Math.min(stock, configuredMax) : stock;
            if (amount > 0) addUnit(plan, cavalryUnit, amount, available);
        }

        return { ok: true, elevatedSiege };
    }

    function recruitmentBuildingForUnit(unit) {
        if (['spear', 'sword', 'axe', 'archer'].includes(unit)) return 'barracks';
        if (['spy', 'light', 'marcher', 'heavy'].includes(unit)) return 'stable';
        if (['ram', 'catapult'].includes(unit)) return 'garage';
        return null;
    }

    function effectiveRecruitTime(unit) {
        const info = state.units[unit];
        if (!info) return Number.MAX_SAFE_INTEGER;

        // Priorité absolue au temps réellement affiché dans l'écran Recruter du village courant.
        // C'est ce qui permet de respecter les bonus de village et tout autre modificateur local.
        const realTime = Number(info.recruitTime);
        if (Number.isFinite(realTime) && realTime > 0) return realTime;

        // Secours si la page Recruter n'a pas pu être lue.
        if (!Number.isFinite(Number(info.buildTime))) return Number.MAX_SAFE_INTEGER;
        const building = recruitmentBuildingForUnit(unit);
        const level = building ? Math.max(0, Number(game_data.village?.buildings?.[building] || 0)) : 0;
        const worldSpeed = Math.max(0.0001, Number(state.config.worldSpeed || 1));
        return Number(info.buildTime) * Math.pow(1.05, -level) / worldSpeed;
    }

    function combatCandidates(available, allowedUnits) {
        const excluded = new Set(['spy', 'ram', 'catapult', 'knight', 'snob', 'militia']);
        return getPlayableFakeUnits()
            .filter(unit => allowedUnits.has(unit))
            .filter(unit => !excluded.has(unit))
            .filter(unit => state.units[unit] && state.units[unit].pop > 0 && (available[unit] || 0) > 0)
            .map(unit => ({
                unit,
                pop: state.units[unit].pop,
                buildTime: effectiveRecruitTime(unit),
                group: recruitmentBuildingForUnit(unit) || (state.units[unit].pop <= 1 ? 'barracks' : 'stable')
            }));
    }

    function fineTuneAutoPlan(plan, requiredPop, available, allowedUnits, maxUnits = null, options = {}) {
        let currentPop = populationOfPlan(plan);
        if (currentPop <= requiredPop) return plan;

        let excess = currentPop - requiredPop;
        const protectedUnits = new Set(['ram', 'catapult', 'spy']);
        const preferred = options.usePreferred === false ? null : preferredCoreUnit(available, allowedUnits);

        function stockLimit(unit) {
            const stock = Math.max(0, Number(available[unit] || 0));
            if (!maxUnits) return stock;
            const configured = Math.max(0, Number(maxUnits?.[unit] || 0));
            return configured > 0 ? Math.min(stock, configured) : stock;
        }

        const onePopUnits = combatCandidates(available, allowedUnits)
            .filter(c => c.pop === 1 && !protectedUnits.has(c.unit))
            .sort((a, b) => {
                if (preferred && a.unit === preferred && b.unit !== preferred) return -1;
                if (preferred && b.unit === preferred && a.unit !== preferred) return 1;
                return a.buildTime - b.buildTime;
            });

        // 1) Ajustement le moins couteux : retirer directement des unites a 1 pop deja presentes.
        for (const candidate of onePopUnits) {
            if (excess <= 0) break;
            const present = Math.max(0, Number(plan[candidate.unit] || 0));
            if (!present) continue;
            const remove = Math.min(present, excess);
            if (remove > 0) {
                plan[candidate.unit] = present - remove;
                if (plan[candidate.unit] <= 0) delete plan[candidate.unit];
                excess -= remove;
            }
        }
        if (excess <= 0) return plan;

        // 2) Retirer des unites plus lourdes quand leur population correspond exactement
        //    au reliquat a supprimer.
        const removable = combatCandidates(available, allowedUnits)
            .filter(c => c.pop > 1 && !protectedUnits.has(c.unit) && (plan[c.unit] || 0) > 0)
            .sort((a, b) => b.pop - a.pop || a.buildTime - b.buildTime);

        for (const candidate of removable) {
            if (excess <= 0) break;
            const present = Math.max(0, Number(plan[candidate.unit] || 0));
            const qty = Math.min(present, Math.floor(excess / candidate.pop));
            if (qty > 0) {
                plan[candidate.unit] = present - qty;
                if (plan[candidate.unit] <= 0) delete plan[candidate.unit];
                excess -= qty * candidate.pop;
            }
        }
        if (excess <= 0) return plan;

        // 3) Si le reliquat est plus petit qu'une unite lourde, remplacer une seule unite
        //    par des unites a 1 pop. Exemple : -1 leger (4 pop) +1 hache pour corriger +3.
        const replaceable = combatCandidates(available, allowedUnits)
            .filter(c => c.pop > excess && !protectedUnits.has(c.unit) && (plan[c.unit] || 0) > 0)
            .sort((a, b) => a.pop - b.pop || a.buildTime - b.buildTime);

        for (const heavy of replaceable) {
            const deficit = heavy.pop - excess;
            if (deficit <= 0) continue;

            let spareOnePop = 0;
            for (const candidate of onePopUnits) {
                spareOnePop += Math.max(0, stockLimit(candidate.unit) - Number(plan[candidate.unit] || 0));
            }
            if (spareOnePop < deficit) continue;

            plan[heavy.unit] -= 1;
            if (plan[heavy.unit] <= 0) delete plan[heavy.unit];

            let toAdd = deficit;
            for (const candidate of onePopUnits) {
                if (toAdd <= 0) break;
                const spare = Math.max(0, stockLimit(candidate.unit) - Number(plan[candidate.unit] || 0));
                const add = Math.min(spare, toAdd);
                if (add > 0) {
                    plan[candidate.unit] = Number(plan[candidate.unit] || 0) + add;
                    toAdd -= add;
                }
            }
            return plan;
        }

        // Si aucune combinaison exacte n'est possible avec les unites autorisees/disponibles,
        // conserver le plus petit depassement obtenu par l'algorithme principal.
        return plan;
    }

    function buildAutoPlanBalanced(requiredPop, available, allowedUnits, autoMinUnits = {}, autoMaxUnits = {}) {
        const plan = {};
        const seeded = seedAutoPlanBase(plan, available, allowedUnits, autoMinUnits, autoMaxUnits);
        if (!seeded.ok) return seeded;

        if (requiredPop <= populationOfPlan(plan)) return { ok: true, plan };

        const candidates = combatCandidates(available, allowedUnits);
        if (!candidates.length) return { ok: false, reason: 'Aucune troupe de complément disponible.' };

        // AUTO équilibré : aucun biais OFF/DEF et aucun ratio arbitraire.
        // On compare le temps de recrutement EFFECTIF dans le village source (niveau du bâtiment
        // + vitesse du monde). Chaque file retient son unité autorisée la plus rapide, puis on
        // ajoute là où le prochain recrutement laisse la charge totale la plus faible.
        const fastestByGroup = new Map();
        for (const candidate of candidates) {
            const previous = fastestByGroup.get(candidate.group);
            if (!previous || candidate.buildTime < previous.buildTime ||
                (candidate.buildTime === previous.buildTime && candidate.unit < previous.unit)) {
                fastestByGroup.set(candidate.group, candidate);
            }
        }

        const queueTime = {};
        for (const group of fastestByGroup.keys()) queueTime[group] = 0;

        // Les unités déjà imposées par la base du fake comptent dans la charge de leur file.
        // Exemple : le scout consomme déjà du temps d'Écurie. L'atelier reste volontairement
        // hors arbitrage : son contenu est imposé et ne peut pas être compensé par Caserne/Écurie.
        for (const [unit, amount] of Object.entries(plan)) {
            const group = recruitmentBuildingForUnit(unit);
            if (!Object.prototype.hasOwnProperty.call(queueTime, group)) continue;
            queueTime[group] += effectiveRecruitTime(unit) * Math.max(0, Number(amount || 0));
        }

        function availableCandidateEntries() {
            return [...fastestByGroup.entries()]
                .filter(([, candidate]) => (available[candidate.unit] || 0) > (plan[candidate.unit] || 0));
        }

        let guard = 0;
        while (populationOfPlan(plan) < requiredPop && guard++ < 20000) {
            const entries = availableCandidateEntries();
            if (!entries.length) break;

            entries.sort((a, b) => {
                const [groupA, candA] = a;
                const [groupB, candB] = b;
                const nextA = Number(queueTime[groupA] || 0) + Number(candA.buildTime || 0);
                const nextB = Number(queueTime[groupB] || 0) + Number(candB.buildTime || 0);
                return nextA - nextB || candA.buildTime - candB.buildTime || candA.unit.localeCompare(candB.unit);
            });

            const [group, candidate] = entries[0];
            const added = addUnit(plan, candidate.unit, 1, available);
            if (!added) {
                fastestByGroup.delete(group);
                continue;
            }
            queueTime[group] = Number(queueTime[group] || 0) + Number(candidate.buildTime || 0);
        }

        if (populationOfPlan(plan) < requiredPop) {
            return { ok: false, reason: `Population disponible insuffisante pour atteindre ${requiredPop}.` };
        }

        // La finition doit elle aussi rester neutre : parmi les unités à 1 pop,
        // le temps de recrutement est le seul critère de choix.
        fineTuneAutoPlan(plan, requiredPop, available, allowedUnits, null, { usePreferred: false });
        return { ok: true, plan };
    }

    function buildAutoPlanFair(requiredPop, available, allowedUnits, autoMinUnits = {}, autoMaxUnits = {}) {
        const plan = {};
        const seeded = seedAutoPlanBase(plan, available, allowedUnits, autoMinUnits, autoMaxUnits);
        if (!seeded.ok) return seeded;

        if (requiredPop <= populationOfPlan(plan)) return { ok: true, plan };

        const profile = villageProfile(available);
        let ratio;
        let label;

        if (profile === 'def') {
            ratio = [
                { unit: 'spear', amount: 1 },
                { unit: 'sword', amount: 1 }
            ];
            label = 'DEF : 1 lance / 1 épée';
        } else {
            // OFF par défaut pour un profil neutre : c'est le ratio offensif attendu.
            ratio = [
                { unit: 'axe', amount: 2 },
                { unit: 'light', amount: 1 }
            ];
            label = 'OFF : 2 haches / 1 léger';
        }

        for (const item of ratio) {
            if (!allowedUnits.has(item.unit)) {
                return { ok: false, reason: `Mode équitable ${label} : ${item.unit} doit être autorisé.` };
            }
            if (!state.units[item.unit]) {
                return { ok: false, reason: `Mode équitable ${label} indisponible sur ce monde.` };
            }
        }

        const packPop = ratio.reduce((sum, item) => {
            return sum + item.amount * Number(state.units[item.unit]?.pop || 0);
        }, 0);
        if (packPop <= 0) return { ok: false, reason: `Mode équitable ${label} : population d'unité invalide.` };

        const missingPop = Math.max(0, requiredPop - populationOfPlan(plan));
        const packs = Math.max(1, Math.ceil(missingPop / packPop));

        for (const item of ratio) {
            const needed = packs * item.amount;
            const stock = Number(available[item.unit] || 0);
            if (stock < needed) {
                return {
                    ok: false,
                    reason: `Mode équitable ${label} : ${needed} ${item.unit} nécessaire(s), ${stock} disponible(s).`
                };
            }
        }

        ratio.forEach(item => addUnit(plan, item.unit, packs * item.amount, available));

        if (populationOfPlan(plan) < requiredPop) {
            return { ok: false, reason: `Population disponible insuffisante pour atteindre ${requiredPop}.` };
        }
        fineTuneAutoPlan(plan, requiredPop, available, allowedUnits);
        return { ok: true, plan };
    }

    function buildAutoPlanPopulation(requiredPop, available, allowedUnits, autoMaxUnits = {}, autoMinUnits = {}) {
        const plan = {};
        const seeded = seedAutoPlanBase(plan, available, allowedUnits, autoMinUnits, autoMaxUnits);
        if (!seeded.ok) return seeded;
        if (requiredPop <= populationOfPlan(plan)) return { ok: true, plan };

        const profile = villageProfile(available);
        const preferredCore = profile === 'off' ? 'axe' : profile === 'def' ? 'spear' : null;
        const profileUnits = profile === 'off'
            ? new Set(['axe', 'light', 'marcher'])
            : profile === 'def'
                ? new Set(['spear', 'sword', 'archer', 'heavy'])
                : new Set();
        const populationPriority = profile === 'off'
            ? ['light', 'marcher', 'axe']
            : profile === 'def'
                ? ['heavy', 'spear', 'sword', 'archer']
                : [];

        const candidates = combatCandidates(available, allowedUnits);
        if (!candidates.length) return { ok: false, reason: 'Aucune troupe de complément disponible.' };

        function maxFor(unit) {
            const stock = Math.max(0, Number(available[unit] || 0));
            const configured = Math.max(0, Number(autoMaxUnits?.[unit] || 0));
            return configured > 0 ? Math.min(stock, configured) : stock;
        }

        function remainingFor(unit) {
            return Math.max(0, maxFor(unit) - Number(plan[unit] || 0));
        }

        // En priorité population, ne pas pré-consommer l'unité coeur : sur une OFF,
        // les légers doivent réellement passer avant les haches (dans la limite Max configurée).

        let guard = 0;
        while (populationOfPlan(plan) < requiredPop && guard++ < 20000) {
            const missing = requiredPop - populationOfPlan(plan);
            const usable = candidates
                .filter(c => remainingFor(c.unit) > 0)
                .sort((a, b) => {
                    const profileA = profileUnits.has(a.unit) ? 1 : 0;
                    const profileB = profileUnits.has(b.unit) ? 1 : 0;
                    if (profileA !== profileB) return profileB - profileA;

                    // Ne jamais choisir une grosse unité si elle ferait dépasser la population
                    // alors qu'une unité plus fine peut terminer exactement le fake.
                    const fitsA = a.pop <= missing ? 1 : 0;
                    const fitsB = b.pop <= missing ? 1 : 0;
                    if (fitsA !== fitsB) return fitsB - fitsA;

                    if (profileA && profileB && populationPriority.length) {
                        const pa = populationPriority.indexOf(a.unit);
                        const pb = populationPriority.indexOf(b.unit);
                        const ia = pa === -1 ? 999 : pa;
                        const ib = pb === -1 ? 999 : pb;
                        // Tant que les deux rentrent, respecter la priorité métier :
                        // OFF = léger avant hache ; DEF = lourd avant infanterie.
                        if (fitsA && fitsB && ia !== ib) return ia - ib;
                    }

                    if (fitsA && fitsB && a.pop !== b.pop) return b.pop - a.pop;

                    const overA = Math.max(0, a.pop - missing);
                    const overB = Math.max(0, b.pop - missing);
                    if (overA !== overB) return overA - overB;

                    if (preferredCore && a.unit === preferredCore && b.unit !== preferredCore) return -1;
                    if (preferredCore && b.unit === preferredCore && a.unit !== preferredCore) return 1;
                    return a.buildTime - b.buildTime;
                });

            if (!usable.length) break;
            addUnit(plan, usable[0].unit, 1, available);
        }

        if (populationOfPlan(plan) < requiredPop) {
            const capped = candidates
                .filter(c => Math.max(0, Number(autoMaxUnits?.[c.unit] || 0)) > 0)
                .map(c => `${c.unit}≤${Math.max(0, Number(autoMaxUnits?.[c.unit] || 0))}`)
                .join(', ');
            return {
                ok: false,
                reason: `Population disponible insuffisante pour atteindre ${requiredPop}${capped ? ` avec les limites (${capped})` : ''}.`
            };
        }
        fineTuneAutoPlan(plan, requiredPop, available, allowedUnits, autoMaxUnits);
        return { ok: true, plan };
    }

    function buildManualPlan(settings, available, requiredPop) {
        const plan = {};
        for (const unit of getPlayableFakeUnits()) {
            const wanted = Math.max(0, parseInt(settings.manualUnits[unit], 10) || 0);
            if (!wanted) continue;
            if ((available[unit] || 0) < wanted) {
                return { ok: false, reason: `${unit} : ${wanted} demandé(s), ${available[unit] || 0} disponible(s).` };
            }
            plan[unit] = wanted;
        }

        if (!Object.keys(plan).length) return { ok: false, reason: 'Aucune unité configurée en mode MANUEL.' };

        const pop = populationOfPlan(plan);
        if (requiredPop > 0 && pop < requiredPop) {
            return { ok: false, reason: `Le fake manuel représente ${pop} population, sous la limite requise de ${requiredPop}.` };
        }
        return { ok: true, plan };
    }

    function buildPlanForTarget(settings, village, available) {
        const requiredPop = getSourceFakePopulation();
        if (requiredPop === null) return { ok: false, reason: 'Points du village source inconnus.' };

        let result;
        if (settings.fakeMode === 'manual') {
            result = buildManualPlan(settings, available, requiredPop);
        } else {
            const allowedUnits = new Set(getPlayableFakeUnits().filter(unit => settings.autoUnits[unit] !== false));
            if (!allowedUnits.size) return { ok: false, reason: 'Aucune unité autorisée en mode AUTO.' };
            if (settings.fakeMode === 'auto_population') {
                result = buildAutoPlanPopulation(requiredPop, available, allowedUnits, settings.autoMaxUnits || {}, settings.autoMinUnits || {});
            } else if (settings.fakeMode === 'auto_fair') {
                result = buildAutoPlanFair(requiredPop, available, allowedUnits, settings.autoMinUnits || {}, settings.autoMaxUnits || {});
            } else {
                result = buildAutoPlanBalanced(requiredPop, available, allowedUnits, settings.autoMinUnits || {}, settings.autoMaxUnits || {});
            }
        }

        if (!result.ok) return result;
        return {
            ...result,
            requiredPop,
            actualPop: populationOfPlan(result.plan),
            villageProfile: villageProfile(available)
        };
    }

    function slowestUnitInPlan(plan) {
        return Object.entries(plan)
            .filter(([, amount]) => amount > 0)
            .map(([unit]) => ({ unit, speed: state.units[unit]?.speed || 0 }))
            .filter(x => x.speed > 0)
            .sort((a, b) => b.speed - a.speed)[0] || null;
    }

    function coordDistance(a, b) {
        const [ax, ay] = a.split('|').map(Number);
        const [bx, by] = b.split('|').map(Number);
        return Math.hypot(ax - bx, ay - by);
    }

    function travelMilliseconds(sourceCoord, targetCoord, unit) {
        const unitMinutesPerField = state.units[unit]?.speed || 0;
        const distance = coordDistance(sourceCoord, targetCoord);
        const worldSpeed = state.config.worldSpeed || 1;
        const unitSpeed = state.config.unitSpeed || 1;
        const minutes = distance * unitMinutesPerField / worldSpeed / unitSpeed;
        return Math.round(minutes * 60 * 1000);
    }

    function getServerDateTime() {
        const dateText = ($('#serverDate').text() || '').trim();
        const timeText = ($('#serverTime').text() || '').trim();
        const d = dateText.match(/(\d{1,2})\D(\d{1,2})\D(\d{4})/);
        const t = timeText.match(/(\d{1,2}):(\d{2}):(\d{2})/);
        if (!d || !t) return new Date();
        return new Date(Number(d[3]), Number(d[2]) - 1, Number(d[1]), Number(t[1]), Number(t[2]), Number(t[3]), 0);
    }

    function timeToMinutes(value) {
        const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return 0;
        return Number(m[1]) * 60 + Number(m[2]);
    }

    function isNightArrival(date, settings) {
        if (!settings.nightEnabled) return false;
        const start = timeToMinutes(settings.nightStart);
        const end = timeToMinutes(settings.nightEnd);
        const current = date.getHours() * 60 + date.getMinutes();
        if (start === end) return false;
        if (start < end) return current >= start && current < end;
        return current >= start || current < end;
    }

    function getHistory() {
        try {
            const raw = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '{}');
            return raw && typeof raw === 'object' ? raw : {};
        } catch (_) {
            return {};
        }
    }

    function hasBeenSent(sourceCoord, targetCoord) {
        const history = getHistory();
        return Array.isArray(history[sourceCoord]) && history[sourceCoord].includes(targetCoord);
    }

    function hasBeenSentGlobally(targetCoord) {
        const target = String(targetCoord || '');
        if (!target) return false;
        const history = getHistory();
        return Object.values(history).some(list => Array.isArray(list) && list.includes(target));
    }

    function markAsSent(sourceCoord, targetCoord) {
        const history = getHistory();
        const list = Array.isArray(history[sourceCoord]) ? history[sourceCoord] : [];
        // Les doublons sont volontaires : une playlist circulaire peut fake plusieurs fois la meme cible.
        list.push(targetCoord);
        history[sourceCoord] = list;
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        rotateTargetToEnd(targetCoord, state.settings);

        // La commande vient d'être confirmée : incrément local immédiat pour que le tri
        // ne réutilise pas la même cible avant le prochain rafraîchissement de l'aperçu.
        if (state.outgoingAttackCountsLoaded) {
            const current = Number(state.outgoingAttackCounts.get(String(targetCoord)) || 0);
            state.outgoingAttackCounts.set(String(targetCoord), current + 1);
            state.outgoingAttackCountsAt = Date.now();
        }
    }

    function countSentToTarget(targetCoord) {
        const target = String(targetCoord || '');
        if (!target) return 0;
        const history = getHistory();
        return Object.values(history).reduce((total, list) => {
            if (!Array.isArray(list)) return total;
            return total + list.filter(coord => coord === target).length;
        }, 0);
    }

    function countTotalSent() {
        const history = getHistory();
        return Object.values(history).reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0);
    }

    function shuffle(array) {
        const a = array.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function hasConfiguredTargets(settings = state.settings) {
        if (!localStorage.getItem(STORAGE_KEY)) return false;
        return parseCoordinates(settings.manualCoords).length > 0
            || (Array.isArray(settings.tribeIds) && settings.tribeIds.length > 0)
            || (Array.isArray(settings.playerIds) && settings.playerIds.length > 0);
    }

    function getCurrentRallyTarget() {
        const values = [];
        const targetInput = $('#place_target input').first();
        if (targetInput.length) values.push(targetInput.val());
        const namedTarget = $('#command-data-form input[name="target"], input[name="target"]').first();
        if (namedTarget.length) values.push(namedTarget.val());

        const x = String($('#inputx').val() || (document.forms[0] && document.forms[0].x && document.forms[0].x.value) || '').trim();
        const y = String($('#inputy').val() || (document.forms[0] && document.forms[0].y && document.forms[0].y.value) || '').trim();
        if (/^\d{1,3}$/.test(x) && /^\d{1,3}$/.test(y)) values.push(`${x}|${y}`);

        for (const value of values) {
            const coord = parseCoordinates(value)[0];
            if (coord) return coord;
        }
        return null;
    }

    function setPendingAttack(sourceCoord, targetCoord) {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({
            sourceCoord,
            targetCoord,
            createdAt: Date.now()
        }));
    }

    function getPendingAttack() {
        try {
            const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
            return pending && pending.sourceCoord && pending.targetCoord ? pending : null;
        } catch (_) {
            return null;
        }
    }

    function clearPendingAttack() {
        sessionStorage.removeItem(PENDING_KEY);
    }

    function findVisibleButton(selectors) {
        for (const selector of selectors) {
            const $button = $(selector).filter(':visible').first();
            if ($button.length) return $button;
        }
        return $();
    }

    function launchCurrentAttack() {
        // Page de confirmation : ce clic envoie réellement la commande.
        const $confirm = findVisibleButton([
            '#troop_confirm_submit',
            '#command-data-form input[name="confirm"]',
            '#command-data-form button[name="confirm"]',
            'input[type="submit"][name="confirm"]'
        ]);

        if ($confirm.length) {
            const pending = getPendingAttack();
            if (pending) {
                markAsSent(pending.sourceCoord, pending.targetCoord);
                clearPendingAttack();
            }
            $confirm.trigger('click');
            return true;
        }

        const targetCoord = getCurrentRallyTarget();
        if (!targetCoord) return false;

        const $attack = findVisibleButton([
            '#target_attack',
            '#command-data-form input[name="attack"]',
            '#command-data-form button[name="attack"]',
            'input[type="submit"][name="attack"]',
            '.btn-attack'
        ]);

        if ($attack.length) {
            setPendingAttack(game_data.village.coord, targetCoord);
            $attack.trigger('click');
            return true;
        }

        if (document.forms[0] && document.forms[0].attack && typeof document.forms[0].attack.click === 'function') {
            setPendingAttack(game_data.village.coord, targetCoord);
            document.forms[0].attack.click();
            return true;
        }

        notify('Error', 'Bouton Attaquer introuvable sur le point de ralliement.');
        return false;
    }

    function clearCommandForm() {
        getPlayableFakeUnits().forEach(unit => {
            const $input = $('#unit_input_' + unit);
            if ($input.length) $input.val('');
            else if (document.forms[0] && document.forms[0][unit]) document.forms[0][unit].value = '';
        });
    }

    function fillTarget(coord) {
        const [x, y] = coord.split('|');
        if ($('#inputx').length) $('#inputx').val(x);
        if ($('#inputy').length) $('#inputy').val(y);
        if ($('#place_target input').length) $('#place_target input').val(coord);
        if (document.forms[0]) {
            if (document.forms[0].x) document.forms[0].x.value = x;
            if (document.forms[0].y) document.forms[0].y.value = y;
        }
    }

    function fillPlan(plan) {
        clearCommandForm();
        Object.entries(plan).forEach(([unit, amount]) => {
            const $input = $('#unit_input_' + unit);
            if ($input.length) {
                $input.val(amount).trigger('input').trigger('change');
            } else if (document.forms[0] && document.forms[0][unit]) {
                document.forms[0][unit].value = amount;
                try { document.forms[0][unit].dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                try { document.forms[0][unit].dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
            }
        });
        const first = Object.keys(plan).find(unit => Number(plan[unit]) > 0);
        if (first) $('#unit_input_' + first).trigger('focus');
    }

    function formatTime(date) {
        return [date.getHours(), date.getMinutes(), date.getSeconds()]
            .map(x => String(x).padStart(2, '0')).join(':');
    }

    function getOwnedVillages() {
        const playerId = Number(game_data.player && game_data.player.id);
        return state.world.villages
            .filter(v => Number(v.playerId) === playerId)
            .sort((a, b) => a.id - b.id);
    }

    function readSwitchHistory() {
        try {
            const value = JSON.parse(sessionStorage.getItem(SWITCH_HISTORY_KEY) || '[]');
            return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
        } catch (_) {
            return [];
        }
    }

    function writeSwitchHistory(ids) {
        sessionStorage.setItem(SWITCH_HISTORY_KEY, JSON.stringify([...new Set(ids.map(Number).filter(Number.isFinite))]));
    }

    function clearSwitchHistory() {
        sessionStorage.removeItem(SWITCH_HISTORY_KEY);
    }

    function goToVillage(village) {
        if (!village || !Number.isFinite(Number(village.id))) return false;
        const url = new URL(window.location.href);
        url.searchParams.set('village', String(village.id));
        url.searchParams.set('screen', 'place');
        url.searchParams.delete('try');
        url.searchParams.delete('target');
        window.location.href = url.toString();
        return true;
    }

    function tryAutoSwitchVillage(settings, available) {
        if (!settings.autoSwitchVillage) return false;

        let siegeUnits = ['ram', 'catapult'];
        if (settings.fakeMode === 'manual') {
            siegeUnits = siegeUnits.filter(unit => Number(settings.manualUnits[unit] || 0) > 0);
        } else {
            siegeUnits = siegeUnits.filter(unit => settings.autoUnits[unit] !== false);
        }

        // Si l'utilisateur a explicitement désactivé bélier ET catapulte,
        // le fake sans unité de siège est volontaire : ne pas changer de village.
        if (!siegeUnits.length) {
            clearSwitchHistory();
            return false;
        }

        const hasSiege = siegeUnits.some(unit => (available[unit] || 0) > 0);
        if (hasSiege) {
            clearSwitchHistory();
            return false;
        }

        const owned = getOwnedVillages();
        if (owned.length <= 1) return false;

        const currentId = Number(game_data.village && game_data.village.id);
        const history = new Set(readSwitchHistory());
        if (Number.isFinite(currentId)) history.add(currentId);

        let currentIndex = owned.findIndex(v => Number(v.id) === currentId);
        if (currentIndex < 0) currentIndex = 0;

        for (let step = 1; step <= owned.length; step++) {
            const candidate = owned[(currentIndex + step) % owned.length];
            if (!candidate || history.has(Number(candidate.id))) continue;
            history.add(Number(candidate.id));
            writeSwitchHistory([...history]);
            notify('Info', `Aucun bélier/cata à ${game_data.village.coord}. Passage automatique à ${candidate.coord}...`, 4000);
            return goToVillage(candidate);
        }

        clearSwitchHistory();
        notify('Error', 'Aucun autre village non testé : impossible de trouver automatiquement un village avec bélier ou catapulte.', 6500);
        openPanel();
        return false;
    }

    async function tryModeOnCurrentTarget(settings) {
        if (game_data.screen !== 'place') {
            notify('Error', 'Le bouton Essayer fonctionne depuis le point de ralliement.');
            return false;
        }

        // Ne jamais modifier une commande déjà sur l'écran de confirmation.
        if ($('#troop_confirm_submit, #command-data-form input[name="confirm"], #command-data-form button[name="confirm"]').filter(':visible').length) {
            notify('Error', 'Reviens au point de ralliement avant de tester une autre composition.');
            return false;
        }

        if (!state.ready) {
            await loadData();
            if (!state.ready) return false;
        }

        // Le calcul du fake dépend uniquement du village SOURCE : ses points,
        // ses troupes disponibles et les paramètres actuellement affichés.
        // Une cible n'est donc pas nécessaire pour utiliser « Essayer ».
        const currentTarget = getCurrentRallyTarget();
        const available = getAvailableTroops();
        const planResult = buildPlanForTarget(settings, null, available);
        if (!planResult.ok) {
            clearCommandForm();
            notify('Error', `Impossible de tester ce mode : ${planResult.reason || 'configuration incompatible.'}`, 7000);
            return false;
        }

        // Si une cible est déjà présente, elle est conservée ; seules les troupes sont remplacées.
        // Sans cible, les troupes sont quand même injectées pour permettre de comparer les modes.
        fillPlan(planResult.plan);

        const unitSummary = Object.entries(planResult.plan)
            .filter(([, amount]) => Number(amount) > 0)
            .map(([unit, amount]) => `${amount} ${unit}`)
            .join(' • ');

        const targetText = currentTarget ? ` • cible ${currentTarget}` : '';
        notify(
            'Success',
            `Test appliqué : ${planResult.actualPop}/${planResult.requiredPop || 0} pop${targetText}${unitSummary ? ` • ${unitSummary}` : ''}`,
            6000
        );
        return true;
    }

    async function prepareFake() {
        if (game_data.screen !== 'place') {
            notify('Error', 'Le fake doit être préparé depuis le point de ralliement.');
            openPanel();
            return false;
        }
        if (!state.ready) {
            await loadData();
            if (!state.ready) return false;
        }

        const settings = $('#' + SCRIPT.prefix + 'PanelWrap').length
            ? collectSettingsFromUI()
            : state.settings;
        saveSettingsObject(settings);

        let targets = getTargetQueue(settings);
        if (!targets.length) {
            notify('Error', 'Aucune cible configurée.');
            openPanel();
            return false;
        }

        // La priorité réelle de la playlist est le nombre d'attaques actuellement en route.
        // On rafraîchit avant chaque préparation afin de privilégier les villages à 0, puis 1, 2, etc.
        await refreshOutgoingAttackCounts(false);
        targets = sortTargetsByRealAttackCount(targets);

        const available = getAvailableTroops();

        if (tryAutoSwitchVillage(settings, available)) return true;

        const sourceCoord = game_data.village.coord;
        const preferredNext = getNextTarget(sourceCoord);
        if (preferredNext && targets.includes(preferredNext)) {
            targets = [preferredNext, ...targets.filter(coord => coord !== preferredNext)];
        }
        const now = getServerDateTime();
        const diagnostics = { unknown: 0, night: 0, troops: 0, self: 0 };

        for (const coord of targets) {
            if (coord === sourceCoord) {
                diagnostics.self++;
                continue;
            }
            const village = state.world.villageByCoord.get(coord);
            if (!village) {
                diagnostics.unknown++;
                continue;
            }
            if (Number(village.playerId) === Number(game_data.player.id)) {
                diagnostics.self++;
                continue;
            }

            const planResult = buildPlanForTarget(settings, village, available);
            if (!planResult.ok) {
                diagnostics.troops++;
                continue;
            }

            const slowest = slowestUnitInPlan(planResult.plan);
            if (!slowest) {
                diagnostics.troops++;
                continue;
            }

            const arrival = new Date(now.getTime() + travelMilliseconds(sourceCoord, coord, slowest.unit));
            if (isNightArrival(arrival, settings)) {
                diagnostics.night++;
                continue;
            }

            fillTarget(coord);
            fillPlan(planResult.plan);
            if (preferredNext === coord) clearNextTarget(sourceCoord);
            const player = state.world.playerById.get(village.playerId);
            const playerText = player ? ` • ${player.name}` : '';
            notify(
                'Success',
                `Fake prêt : ${coord}${playerText} • cible ${formatNumber(village.points)} pts • source ${formatNumber(game_data.village.points || state.world.villageByCoord.get(sourceCoord)?.points || 0)} pts • ${planResult.actualPop}/${planResult.requiredPop || 0} pop • arrivée ${formatTime(arrival)} • lent : ${slowest.unit}`,
                6000
            );
            return true;
        }

        const details = [
            diagnostics.night ? `${diagnostics.night} arrivée(s) de nuit` : '',
            diagnostics.troops ? `${diagnostics.troops} impossible(s) avec les troupes disponibles` : '',
            diagnostics.unknown ? `${diagnostics.unknown} coordonnée(s) inconnue(s)` : '',
            diagnostics.self ? `${diagnostics.self} village(s) à toi ignoré(s)` : ''
        ].filter(Boolean).join(' • ');

        notify('Error', `Aucune cible exploitable. ${details || 'Vérifie la configuration.'}`, 7000);
        return false;
    }

    async function handleInvocation() {
        // Sans configuration exploitable, le script sert d'abord d'interface de paramétrage.
        if (!hasConfiguredTargets(state.settings)) {
            openPanel();
            if (!state.ready) await loadData();
            return false;
        }

        // Si une confirmation d'attaque est déjà affichée, l'appel suivant confirme l'envoi.
        if ($('#troop_confirm_submit').length || $('#command-data-form input[name="confirm"]').length || $('#command-data-form button[name="confirm"]').length) {
            return launchCurrentAttack();
        }

        // Avec une configuration existante, un appel depuis une autre page ramène au point de ralliement.
        if (game_data.screen !== 'place') {
            goToRallyPoint();
            return true;
        }

        // Cible déjà renseignée : on passe à l'étape Attaquer.
        if (getCurrentRallyTarget()) {
            return launchCurrentAttack();
        }

        // Aucun village ciblé : calcul et remplissage du prochain fake exploitable.
        return await prepareFake();
    }

    function goToRallyPoint() {
        if (game_data.screen === 'place') {
            notify('Info', 'Tu es déjà au point de ralliement.');
            return;
        }
        if (WT && typeof WT.redirectToScreen === 'function') {
            WT.redirectToScreen('place');
            return;
        }
        window.location.href = game_data.link_base_pure + 'place';
    }

    // API volontairement petite pour permettre une nouvelle execution du raccourci.
    window.WebiTimeFakeIntelligent = Object.freeze({
        version: SCRIPT.version,
        openSettings: openPanel,
        handleInvocation,
        prepareFake,
        clearSessionHistory() {
            sessionStorage.removeItem(HISTORY_KEY);
            sessionStorage.removeItem(PENDING_KEY);
            sessionStorage.removeItem(SWITCH_HISTORY_KEY);
            sessionStorage.removeItem(NEXT_TARGET_KEY);
            notify('Success', 'Historique des fakes de la session effacé.');
        }
    });

    createLauncher();
    await handleInvocation();
})();
