/*
 * Webi-Time GT Common UI
 * Styles et composants partagés par les scripts Guerre Tribale Webi-Time.
 * Réalisé par NoLife4Ever / Webi-Time
 */
(function (window) {
    'use strict';

    if (window.WebiTimeGT && typeof window.WebiTimeGT.injectMapPlannerStyles === 'function') return;
    if (typeof window.jQuery === 'undefined') {
        throw new Error('[Webi-Time GT Common] jQuery est requis.');
    }

    const $ = window.jQuery;

function createWebiTimeSharedUi() {
        const STYLE_ID = 'webiTimeSharedUiStyle';
        const STYLE_REVISION = '2.1-orange-ui';
        const SETTINGS_CLOSE_DELAY_MS = 800;

        const theme = Object.freeze({
            colors: Object.freeze({
                bg: '#171717',
                bgSoft: '#202020',
                panel: 'rgba(37, 37, 37, .94)',
                panel2: 'rgba(44, 44, 44, .90)',
                line: 'rgba(255, 152, 0, .34)',

                // Alias historiques conservés pour compatibilité avec les scripts.
                // L'identité principale est désormais sombre + orange.
                cyan: '#ff9800',
                cyan2: '#d67b00',
                magenta: '#ffb347',
                orange: '#ff9800',

                green: '#65c18c',
                red: '#e47777',
                yellow: '#dfb85a',
                text: '#e6e6e6',
                muted: '#a8a8a8'
            }),
            fonts: Object.freeze({
                title: '25px',
                body: '16px',
                small: '15px',
                compact: '14px',
                footer: '13px',
                modalTitle: '20px'
            })
        });

        function injectStyles() {
            const existing = document.getElementById(STYLE_ID);
            if (existing && existing.dataset.webiRevision === STYLE_REVISION) return;
            if (existing) existing.remove();

            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.dataset.webiRevision = STYLE_REVISION;
            style.textContent = `
                :root {
                    --webi-bg: ${theme.colors.bg};
                    --webi-bg-soft: ${theme.colors.bgSoft};
                    --webi-panel: ${theme.colors.panel};
                    --webi-panel-2: ${theme.colors.panel2};
                    --webi-line: ${theme.colors.line};
                    --webi-cyan: ${theme.colors.cyan};
                    --webi-cyan-2: ${theme.colors.cyan2};
                    --webi-magenta: ${theme.colors.magenta};
                    --webi-orange: ${theme.colors.orange};
                    --webi-green: ${theme.colors.green};
                    --webi-red: ${theme.colors.red};
                    --webi-yellow: ${theme.colors.yellow};
                    --webi-text: ${theme.colors.text};
                    --webi-muted: ${theme.colors.muted};
                    --webi-font-title: ${theme.fonts.title};
                    --webi-font-body: ${theme.fonts.body};
                    --webi-font-small: ${theme.fonts.small};
                    --webi-font-compact: ${theme.fonts.compact};
                    --webi-font-footer: ${theme.fonts.footer};
                    --webi-font-modal-title: ${theme.fonts.modalTitle};

                    --wt-orange: ${theme.colors.orange};
                    --wt-orange-soft: #ffb347;
                    --wt-bg: ${theme.colors.bg};
                    --wt-bg-2: ${theme.colors.bgSoft};
                    --wt-card: #252525;
                    --wt-card-2: #2c2c2c;
                    --wt-border: #444;
                    --wt-text: ${theme.colors.text};
                    --wt-muted: ${theme.colors.muted};
                }


                /* =========================================================
                 * Webi-Time shared UI primitives
                 * Toutes les IHM utilisent ces classes. Les préfixes de
                 * scripts (gtiv/wtri/wtra/gtmp) sont réservés aux variantes.
                 * ========================================================= */
                .wt-panel {
                    position: relative;
                    margin: 12px 0 16px;
                    overflow: hidden;
                    border: 1px solid rgba(255,152,0,.68);
                    border-radius: 13px;
                    background:
                        radial-gradient(circle at 10% -20%, rgba(255,152,0,.22), transparent 34%),
                        radial-gradient(circle at 86% 0%, rgba(255,179,71,.16), transparent 28%),
                        radial-gradient(circle at 95% 115%, rgba(255,152,0,.14), transparent 30%),
                        linear-gradient(180deg, #171717 0%, #202020 52%, #111111 100%);
                    box-shadow:
                        0 0 0 1px rgba(0,0,0,.55) inset,
                        0 0 24px rgba(255,152,0,.16),
                        0 7px 18px rgba(15,12,25,.30);
                    color: var(--webi-text);
                    font-family: Arial, Helvetica, sans-serif;
                }

                .wt-panel::before {
                    content: "";
                    position: absolute;
                    z-index: 0;
                    inset: 0;
                    border-radius: inherit;
                    pointer-events: none;
                    opacity: .30;
                    background-image:
                        linear-gradient(rgba(255,152,0,.035) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,152,0,.035) 1px, transparent 1px);
                    background-size: 26px 26px;
                }

                .wt-panel > * { position: relative; z-index: 1; }

                .wt-hero {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    min-height: 88px;
                    padding: 15px 18px;
                    overflow: hidden;
                    border-bottom: 1px solid rgba(255,152,0,.42);
                    background: linear-gradient(115deg, rgba(5,17,29,.96) 0%, rgba(7,32,51,.92) 54%, rgba(34,9,43,.88) 100%);
                }

                .wt-hero::after {
                    content: "";
                    position: absolute;
                    width: 390px;
                    height: 180px;
                    right: -80px;
                    top: -70px;
                    transform: rotate(-9deg);
                    background:
                        radial-gradient(circle at 35% 50%, rgba(255,179,71,.24), transparent 32%),
                        radial-gradient(circle at 65% 45%, rgba(255,152,0,.21), transparent 35%);
                    filter: blur(4px);
                    pointer-events: none;
                }

                .wt-brand {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    min-width: 0;
                }

                .wt-logo {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: 0 0 62px;
                    width: 62px;
                    height: 62px;
                    border: 1px solid rgba(255,152,0,.65);
                    border-radius: 16px;
                    background:
                        radial-gradient(circle at 50% 35%, rgba(255,152,0,.20), transparent 44%),
                        linear-gradient(145deg, rgba(6,22,37,.96), rgba(13,8,27,.96));
                    box-shadow: 0 0 17px rgba(255,152,0,.22), 0 0 28px rgba(255,179,71,.10) inset;
                    font-size: 36px;
                    line-height: 1;
                }

                .wt-logo::after {
                    content: "";
                    position: absolute;
                    left: 8px;
                    right: 8px;
                    bottom: 5px;
                    height: 2px;
                    border-radius: 2px;
                    background: linear-gradient(90deg, transparent, var(--webi-cyan), var(--webi-magenta), transparent);
                    box-shadow: 0 0 8px rgba(255,152,0,.7);
                }

                .wt-title {
                    margin: 0;
                    color: var(--webi-text);
                    font-size: var(--webi-font-title);
                    font-weight: 800;
                    line-height: 1.05;
                    letter-spacing: .1px;
                    text-shadow: 0 0 12px rgba(255,152,0,.22);
                }

                .wt-title-brand { color: var(--webi-cyan); }
                .wt-title-tool { color: var(--webi-magenta); }

                .wt-byline {
                    margin-top: 5px;
                    color: #d2d2d2;
                    font-size: var(--webi-font-small);
                }

                .wt-byline b { color: var(--webi-cyan); }

                .wt-tagline {
                    margin-top: 5px;
                    color: var(--webi-muted);
                    font-size: var(--webi-font-small);
                    letter-spacing: .15px;
                }

                .wt-hero-motto {
                    position: relative;
                    z-index: 2;
                    flex: 0 0 auto;
                    padding-left: 15px;
                    border-left: 1px solid rgba(255,152,0,.35);
                    text-align: right;
                    color: #777777;
                    font-size: var(--webi-font-footer);
                    line-height: 1.7;
                    letter-spacing: 1.15px;
                    text-transform: uppercase;
                }

                .wt-body { padding: 13px; }

                .wt-card {
                    min-width: 0;
                    padding: 9px 10px;
                    box-sizing: border-box;
                    border: 1px solid rgba(255,152,0,.20);
                    border-radius: 8px;
                    background: linear-gradient(180deg, rgba(13,34,52,.84), rgba(7,21,35,.90));
                    box-shadow: 0 1px 0 rgba(255,255,255,.025) inset;
                }

                .wt-card-title,
                .wt-section-title {
                    display: block;
                    margin: 0 0 7px;
                    color: #cfcfcf;
                    font-size: var(--webi-font-compact);
                    font-weight: 750;
                    letter-spacing: .5px;
                    text-transform: uppercase;
                }

                .wt-section-title {
                    color: #f0f0f0;
                    font-size: 15px;
                    font-weight: 800;
                    letter-spacing: .25px;
                    text-transform: none;
                }

                .wt-input {
                    width: 100% !important;
                    max-width: none !important;
                    min-height: 31px !important;
                    box-sizing: border-box !important;
                    border: 1px solid rgba(255,152,0,.40) !important;
                    border-radius: 6px !important;
                    outline: none !important;
                    background: #111111 !important;
                    color: #eeeeee !important;
                    box-shadow: 0 0 0 1px rgba(0,0,0,.22) inset !important;
                    padding: 4px 8px !important;
                    font: 400 var(--webi-font-small) Arial, Helvetica, sans-serif !important;
                }

                .wt-input:focus {
                    border-color: var(--webi-cyan) !important;
                    box-shadow: 0 0 10px rgba(255,152,0,.18) !important;
                }

                .wt-input:disabled {
                    color: #777777 !important;
                    background: #151515 !important;
                    opacity: .82;
                }

                .wt-input option { color: #eeeeee; background: #111111; }

                .wt-btn {
                    min-height: 34px !important;
                    padding: 6px 10px !important;
                    border: 1px solid rgba(255,152,0,.58) !important;
                    border-radius: 7px !important;
                    outline: none !important;
                    background: linear-gradient(180deg, rgba(10,56,78,.96), rgba(6,36,53,.96)) !important;
                    color: #eeeeee !important;
                    box-shadow: 0 0 11px rgba(255,152,0,.10), 0 1px 0 rgba(255,255,255,.06) inset !important;
                    text-shadow: none !important;
                    font: 750 var(--webi-font-small) Arial, Helvetica, sans-serif !important;
                    cursor: pointer !important;
                }

                .wt-btn:hover:not(:disabled),
                .wt-btn:focus:not(:disabled) {
                    border-color: var(--webi-cyan) !important;
                    background: linear-gradient(180deg, rgba(12,73,99,.98), rgba(7,46,66,.98)) !important;
                    box-shadow: 0 0 16px rgba(255,152,0,.18) !important;
                }

                .wt-btn:disabled { opacity: .58; cursor: wait !important; }

                .wt-btn-primary {
                    border-color: rgba(255,152,0,.92) !important;
                    background: linear-gradient(135deg, rgba(0,165,219,.26), rgba(18,61,86,.32)) !important;
                    color: #ffb347 !important;
                }

                .wt-btn-secondary {
                    border-color: rgba(255,179,71,.50) !important;
                    background: linear-gradient(180deg, rgba(63,20,64,.92), rgba(34,13,47,.96)) !important;
                }

                .wt-btn-secondary:hover:not(:disabled) {
                    border-color: var(--webi-magenta) !important;
                    box-shadow: 0 0 16px rgba(255,179,71,.16) !important;
                }

                .wt-btn-danger {
                    border-color: rgba(255,91,114,.44) !important;
                    background: rgba(91,19,34,.55) !important;
                    color: #ffb2bf !important;
                }

                .wt-btn-danger:hover:not(:disabled) {
                    border-color: var(--webi-red) !important;
                    background: rgba(124,24,44,.68) !important;
                    color: #ffe0e5 !important;
                }

                .wt-check {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    min-height: 20px;
                    margin: 0;
                    color: #dddddd;
                    font-size: var(--webi-font-small);
                    font-weight: 400;
                    cursor: pointer;
                }

                .wt-check input {
                    width: 15px;
                    height: 15px;
                    margin: 0;
                    accent-color: var(--webi-cyan);
                    flex: 0 0 auto;
                }

                .wt-option {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-height: 44px;
                    padding: 8px 10px;
                    box-sizing: border-box;
                    border: 1px solid rgba(255,152,0,.20);
                    border-radius: 8px;
                    background: linear-gradient(180deg, rgba(13,34,52,.84), rgba(7,21,35,.90));
                    color: #dddddd;
                    font-size: var(--webi-font-small);
                    line-height: 1.3;
                    cursor: pointer;
                }

                .wt-option:hover { border-color: rgba(255,152,0,.46); }
                .wt-option input { width: 16px; height: 16px; accent-color: var(--webi-cyan); }

                .wt-small { color: var(--webi-muted); font-size: var(--webi-font-footer); line-height: 1.4; }

                .wt-status {
                    padding: 7px 9px;
                    border: 1px solid rgba(255,152,0,.18);
                    border-radius: 7px;
                    background: #1d1d1d;
                    color: #aaaaaa;
                    font-size: var(--webi-font-footer);
                    line-height: 1.4;
                }

                .wt-footer {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    align-items: center;
                    gap: 10px;
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 1px solid rgba(255,152,0,.16);
                    color: #888888;
                    font-size: var(--webi-font-footer);
                }

                .wt-footer-left { display: flex; align-items: center; gap: 7px; min-width: 0; }
                .wt-footer-center { color: #70522d; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; }
                .wt-footer-right { text-align: right; color: #999999; }
                .wt-footer-right b { color: var(--webi-cyan); }

                @media (max-width: 680px) {
                    .wt-hero-motto { display: none; }
                    .wt-title { font-size: 20px; }
                    .wt-footer { grid-template-columns: 1fr; text-align: center; }
                    .wt-footer-right { text-align: center; }
                    .wt-footer-left { justify-content: center; }
                }

                .wt-modal-root {
                    position: fixed;
                    inset: 0;
                    z-index: 25000;
                    font-family: Arial, Helvetica, sans-serif;
                }

                .wt-modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 25000;
                    background: rgba(1, 7, 13, .76);
                    backdrop-filter: blur(2px);
                }

                .wt-modal-wrap {
                    position: fixed;
                    inset: 0;
                    z-index: 25001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 18px;
                    box-sizing: border-box;
                    pointer-events: none;
                }

                .wt-modal {
                    position: relative;
                    width: min(540px, calc(100vw - 36px));
                    overflow: hidden;
                    border: 1px solid rgba(255,152,0,.68);
                    border-radius: 12px;
                    background:
                        radial-gradient(circle at 8% -20%, rgba(255,152,0,.19), transparent 38%),
                        radial-gradient(circle at 96% 0%, rgba(255,179,71,.13), transparent 34%),
                        linear-gradient(180deg, #202020 0%, #151515 100%);
                    box-shadow: 0 0 30px rgba(255,152,0,.16), 0 18px 55px rgba(0,0,0,.52);
                    color: var(--webi-text);
                    pointer-events: auto;
                }

                .wt-modal::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    opacity: .23;
                    background-image:
                        linear-gradient(rgba(255,152,0,.035) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,152,0,.035) 1px, transparent 1px);
                    background-size: 26px 26px;
                }

                .wt-modal-content {
                    position: relative;
                    z-index: 1;
                    padding: 18px;
                }

                .wt-modal-title {
                    margin: 0 0 10px;
                    color: var(--webi-cyan);
                    font-size: var(--webi-font-modal-title);
                    font-weight: 800;
                    line-height: 1.2;
                }

                .wt-modal-text {
                    padding: 12px 13px;
                    border: 1px solid rgba(255,152,0,.18);
                    border-radius: 8px;
                    background: rgba(8,27,43,.72);
                    color: #d8d8d8;
                    font-size: var(--webi-font-body);
                    line-height: 1.5;
                }

                .wt-modal-text p {
                    margin: 0 0 8px;
                    font-size: var(--webi-font-body) !important;
                }

                .wt-modal-text p:last-child { margin-bottom: 0; }

                .wt-modal-option {
                    display: flex;
                    align-items: flex-start;
                    gap: 9px;
                    margin-top: 10px;
                    padding: 10px 11px;
                    border: 1px solid rgba(255,152,0,.18);
                    border-radius: 8px;
                    background: rgba(7,24,38,.78);
                    color: #c8c8c8;
                    font-size: var(--webi-font-small);
                    line-height: 1.35;
                    cursor: pointer;
                }

                .wt-modal-option input {
                    width: 16px;
                    height: 16px;
                    margin: 1px 0 0;
                    accent-color: var(--webi-cyan);
                    flex: 0 0 auto;
                }

                .wt-modal-actions {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 9px;
                    margin-top: 13px;
                }

                .wt-modal-btn {
                    min-height: 38px;
                    padding: 7px 12px;
                    border: 1px solid rgba(255,152,0,.58);
                    border-radius: 7px;
                    background: linear-gradient(180deg, rgba(10,56,78,.96), rgba(6,36,53,.96));
                    color: #eeeeee;
                    box-shadow: 0 0 11px rgba(255,152,0,.10), 0 1px 0 rgba(255,255,255,.06) inset;
                    font: 750 var(--webi-font-body) Arial, Helvetica, sans-serif;
                    cursor: pointer;
                }

                .wt-modal-btn:hover {
                    border-color: var(--webi-cyan);
                    background: linear-gradient(180deg, rgba(12,73,99,.98), rgba(7,46,66,.98));
                    box-shadow: 0 0 16px rgba(255,152,0,.18);
                }

                .wt-modal-btn.secondary {
                    border-color: rgba(255,179,71,.50);
                    background: linear-gradient(180deg, rgba(63,20,64,.92), rgba(34,13,47,.96));
                }

                .wt-modal-btn.secondary:hover {
                    border-color: var(--webi-magenta);
                    box-shadow: 0 0 16px rgba(255,179,71,.16);
                }

                .wt-settings-wrap {
                    position: relative !important;
                    display: inline-flex;
                    align-items: center;
                    flex: 0 0 auto;
                    margin: 0 !important;
                    z-index: 20 !important;
                }

                .wt-settings-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 22px;
                    height: 22px;
                    padding: 0;
                    border: 1px solid rgba(255,152,0,.54);
                    border-radius: 50%;
                    outline: none;
                    background: rgba(5,24,38,.92);
                    color: var(--webi-cyan);
                    box-shadow: 0 0 7px rgba(255,152,0,.10);
                    font-family: "Segoe UI Symbol", Arial, Helvetica, sans-serif;
                    font-size: var(--webi-font-small);
                    font-weight: 700;
                    line-height: 1;
                    cursor: pointer;
                }

                .wt-settings-btn:hover,
                .wt-settings-btn:focus {
                    border-color: var(--webi-cyan);
                    background: rgba(8,43,61,.98);
                    color: #ffffff;
                    box-shadow: 0 0 14px rgba(255,152,0,.28);
                }

                .wt-settings-popover {
                    position: absolute;
                    bottom: 29px;
                    left: 0;
                    width: 235px;
                    padding: 8px;
                    box-sizing: border-box;
                    visibility: hidden;
                    opacity: 0;
                    transform: translateY(-4px);
                    pointer-events: none;
                    border: 1px solid rgba(255,152,0,.34);
                    border-radius: 8px;
                    background:
                        radial-gradient(circle at 90% 0%, rgba(255,179,71,.10), transparent 35%),
                        linear-gradient(180deg, rgba(8,27,43,.99), rgba(4,16,27,.99));
                    box-shadow: 0 10px 24px rgba(0,0,0,.40), 0 0 15px rgba(255,152,0,.10);
                    transition: opacity .12s ease, transform .12s ease, visibility .12s ease;
                }

                .wt-settings-wrap:hover .wt-settings-popover,
                .wt-settings-wrap:focus-within .wt-settings-popover,
                .wt-settings-wrap.is-open .wt-settings-popover {
                    visibility: visible;
                    opacity: 1;
                    transform: translateY(0);
                    pointer-events: auto;
                }

                .wt-settings-action {
                    width: 100%;
                    min-height: 31px;
                    padding: 5px 8px;
                    border-radius: 6px;
                    font: 750 var(--webi-font-compact) Arial, Helvetica, sans-serif;
                    cursor: pointer;
                }

                .wt-settings-delete {
                    border: 1px solid rgba(255,91,114,.44);
                    background: rgba(91,19,34,.46);
                    color: #ff91a2;
                }

                .wt-settings-delete:hover {
                    border-color: var(--webi-red);
                    background: rgba(124,24,44,.60);
                    color: #ffd8de;
                }

                .wt-settings-bug {
                    margin-top: 7px;
                    border: 1px solid rgba(255,152,0,.44);
                    background: rgba(12,62,83,.46);
                    color: #ffb347;
                }

                .wt-settings-bug:hover {
                    border-color: var(--webi-cyan);
                    background: rgba(14,82,108,.60);
                    color: #ecfdff;
                    box-shadow: 0 0 10px rgba(255,152,0,.12);
                }

                .wt-settings-delete.is-cleared {
                    border-color: rgba(67,231,163,.42);
                    background: rgba(17,83,61,.42);
                    color: var(--webi-green);
                    cursor: default;
                }

                .wt-modal-actions-single {
                    grid-template-columns: 1fr;
                }

                .wt-progress-modal {
                    width: min(520px, calc(100vw - 36px));
                }

                .wt-progress-meta {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin: 14px 1px 6px;
                    color: #c7c7c7;
                    font-size: var(--webi-font-compact);
                }

                .wt-progress-count {
                    color: var(--webi-cyan);
                    font-variant-numeric: tabular-nums;
                }

                .wt-progress-track {
                    height: 8px;
                    overflow: hidden;
                    border: 1px solid rgba(255,152,0,.28);
                    border-radius: 99px;
                    background: rgba(0,0,0,.34);
                }

                .wt-progress-bar {
                    width: 0;
                    height: 100%;
                    border-radius: inherit;
                    background: linear-gradient(90deg, var(--webi-cyan-2), var(--webi-cyan), var(--webi-magenta));
                    box-shadow: 0 0 12px rgba(255,152,0,.35);
                    transition: width .18s ease;
                }


                /* =========================================================
                 * Webi-Time vWB - thème commun sombre / orange
                 * Typographie conservée depuis la première version :
                 * 24 / 14 / 13 / 12 / 11 px.
                 * ========================================================= */

                .wt-panel {
                    border: 1px solid #3d3d3d;
                    border-radius: 10px;
                    background: var(--webi-bg);
                    box-shadow: 0 10px 34px rgba(0,0,0,.48);
                    color: var(--webi-text);
                    font-family: Arial, Helvetica, sans-serif;
                }

                .wt-panel::before {
                    display: none;
                }

                .wt-hero {
                    min-height: 88px;
                    padding: 15px 18px;
                    gap: 16px;
                    align-items: center;
                    border-bottom: 2px solid var(--webi-orange);
                    background: linear-gradient(135deg,#151515 0%,#242424 72%,#31200b 100%);
                }

                .wt-hero::after {
                    right: -85px;
                    top: -90px;
                    width: 300px;
                    height: 190px;
                    transform: none;
                    filter: none;
                    background: radial-gradient(circle,rgba(255,152,0,.10),transparent 67%);
                }

                .wt-logo {
                    border: 1px solid #555;
                    border-radius: 16px;
                    background: #0f0f0f;
                    box-shadow:
                        inset 0 0 0 1px rgba(255,152,0,.18),
                        0 3px 12px rgba(0,0,0,.40);
                }

                .wt-logo::after {
                    background: linear-gradient(90deg,transparent,var(--webi-orange),var(--webi-orange-soft, #ffb347),transparent);
                    box-shadow: 0 0 8px rgba(255,152,0,.35);
                }

                .wt-title {
                    color: #f1f1f1;
                    font-size: var(--webi-font-title);
                    text-shadow: none;
                }

                .wt-title-brand { color: var(--webi-orange); }
                .wt-title-tool { color: #f1f1f1; }

                .wt-byline {
                    color: #a9a9a9;
                    font-size: var(--webi-font-small);
                }

                .wt-byline b { color: #d8d8d8; }

                .wt-tagline {
                    color: #d2d2d2;
                    font-size: var(--webi-font-small);
                }

                .wt-hero-motto {
                    padding-left: 15px;
                    border-left: 1px solid #3d3d3d;
                    color: #777;
                    font-size: var(--webi-font-footer);
                }

                .wt-body {
                    padding: 13px;
                    background: #181818;
                }

                .wt-card {
                    border: 1px solid #444;
                    border-radius: 8px;
                    background: linear-gradient(180deg,#252525 0%,#202020 100%);
                    box-shadow: 0 2px 8px rgba(0,0,0,.20);
                }

                .wt-card-title,
                .wt-section-title {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    color: #f0f0f0;
                    font-size: var(--webi-font-compact);
                }

                .wt-card-title::before,
                .wt-section-title::before {
                    content: "";
                    width: 4px;
                    height: 15px;
                    flex: 0 0 4px;
                    border-radius: 4px;
                    background: var(--webi-orange);
                    box-shadow: 0 0 8px rgba(255,152,0,.30);
                }

                .wt-section-title {
                    font-size: 15px;
                    text-transform: none;
                }

                .wt-input {
                    border-color: #555 !important;
                    background: #111 !important;
                    color: #eee !important;
                    box-shadow: none !important;
                    font: 400 var(--webi-font-small) Arial, Helvetica, sans-serif !important;
                }

                .wt-input:focus {
                    border-color: var(--webi-orange) !important;
                    box-shadow: 0 0 0 2px rgba(255,152,0,.12) !important;
                }

                .wt-input:disabled {
                    color: #777 !important;
                    background: #181818 !important;
                }

                .wt-input option {
                    color: #eee;
                    background: #171717;
                }

                .wt-btn {
                    border-color: #5c5c5c !important;
                    background: #333 !important;
                    color: #eee !important;
                    box-shadow: none !important;
                    font: 750 var(--webi-font-small) Arial, Helvetica, sans-serif !important;
                }

                .wt-btn:hover,
                .wt-btn:focus {
                    border-color: #777 !important;
                    background: #414141 !important;
                    color: #fff !important;
                    box-shadow: none !important;
                }

                .wt-btn-primary {
                    border-color: #e58a0b !important;
                    background: #b96b00 !important;
                    color: #fff !important;
                }

                .wt-btn-primary:hover,
                .wt-btn-primary:focus {
                    border-color: #ffab32 !important;
                    background: #d67b00 !important;
                    box-shadow: 0 0 0 2px rgba(255,152,0,.10) !important;
                }

                .wt-btn-secondary {
                    border-color: #675231 !important;
                    background: #3d3326 !important;
                    color: #f2dfc2 !important;
                }

                .wt-btn-secondary:hover,
                .wt-btn-secondary:focus {
                    border-color: #a8752c !important;
                    background: #4b3b27 !important;
                    color: #fff1d8 !important;
                }

                .wt-btn-danger {
                    border-color: #744141 !important;
                    background: #4b2929 !important;
                    color: #ffd8d8 !important;
                }

                .wt-btn-danger:hover,
                .wt-btn-danger:focus {
                    border-color: #985050 !important;
                    background: #603131 !important;
                }

                .wt-check {
                    color: #ddd;
                    font-size: var(--webi-font-small);
                    font-weight: 600;
                }

                .wt-check input,
                .wt-option input {
                    accent-color: var(--webi-orange);
                }

                .wt-option {
                    border-color: #444;
                    background: linear-gradient(180deg,#282828,#212121);
                    color: #ddd;
                    font-size: var(--webi-font-small);
                }

                .wt-option:hover {
                    border-color: #666;
                    background: linear-gradient(180deg,#303030,#252525);
                }

                .wt-small {
                    color: var(--webi-muted);
                    font-size: var(--webi-font-footer);
                }

                .wt-status {
                    border-color: #383838;
                    background: #191919;
                    color: #aaa;
                    font-size: var(--webi-font-footer);
                }

                .wt-footer {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    align-items: center;
                    gap: 10px;
                    margin-top: 10px;
                    padding: 8px 12px;
                    border-top: 1px solid #3b3b3b;
                    background: #111;
                    color: #888;
                    font-size: var(--webi-font-footer);
                }

                .wt-footer-center {
                    color: #70522d;
                    letter-spacing: .25px;
                    text-transform: none;
                }

                .wt-footer-right {
                    color: #999;
                }

                .wt-footer-right b {
                    color: #cfcfcf;
                }

                .wt-settings-btn {
                    border-color: #555;
                    background: #1b1b1b;
                    color: #ffb347;
                    box-shadow: none;
                }

                .wt-settings-btn:hover,
                .wt-settings-btn:focus {
                    border-color: var(--webi-orange);
                    background: #252019;
                    color: #fff;
                    box-shadow: 0 0 0 2px rgba(255,152,0,.10);
                }

                .wt-settings-popover {
                    border-color: #444;
                    background: linear-gradient(180deg,#252525,#171717);
                    box-shadow: 0 10px 24px rgba(0,0,0,.48);
                }

                .wt-settings-bug {
                    border-color: #72521e;
                    background: #3b2b13;
                    color: #ffca7a;
                }

                .wt-settings-bug:hover {
                    border-color: var(--webi-orange);
                    background: #4b3515;
                    color: #fff0d8;
                    box-shadow: none;
                }

                .wt-modal-overlay {
                    background: rgba(0,0,0,.72);
                }

                .wt-modal {
                    border-color: #444;
                    border-radius: 10px;
                    background: linear-gradient(180deg,#252525,#171717);
                    box-shadow: 0 18px 55px rgba(0,0,0,.55);
                    color: var(--webi-text);
                }

                .wt-modal::before {
                    display: none;
                }

                .wt-modal-title {
                    color: var(--webi-orange);
                }

                .wt-modal-text,
                .wt-modal-option {
                    border-color: #444;
                    background: #1d1d1d;
                    color: #ddd;
                }

                .wt-modal-option input {
                    accent-color: var(--webi-orange);
                }

                .wt-modal-btn {
                    border-color: #e58a0b;
                    background: #b96b00;
                    color: #fff;
                    box-shadow: none;
                }

                .wt-modal-btn:hover {
                    border-color: #ffab32;
                    background: #d67b00;
                    box-shadow: 0 0 0 2px rgba(255,152,0,.10);
                }

                .wt-modal-btn.secondary {
                    border-color: #5c5c5c;
                    background: #333;
                    color: #eee;
                }

                .wt-modal-btn.secondary:hover {
                    border-color: #777;
                    background: #414141;
                    box-shadow: none;
                }

                .wt-progress-count {
                    color: var(--webi-orange);
                }

                .wt-progress-track {
                    border-color: #444;
                    background: #111;
                }

                .wt-progress-bar {
                    background: linear-gradient(90deg,#b96b00,var(--webi-orange),#ffb347);
                    box-shadow: 0 0 12px rgba(255,152,0,.24);
                }

                @media (max-width: 560px) {
                    .wt-modal-actions { grid-template-columns: 1fr; }
                }
            `;
            document.head.appendChild(style);
        }

        function buildIssueUrl(scriptName, sourceUrl) {
            const title = `[${scriptName}] Bug`;
            const body = [
                `Script : ${scriptName}`,
                `Source : ${sourceUrl}`,
                '',
                'Description du bug :',
                '',
                'Étapes pour reproduire :',
                '1. ',
                '2. ',
                '3. ',
                '',
                'Résultat attendu :',
                '',
                'Résultat obtenu :',
                ''
            ].join('\\n');

            return 'https://github.com/Webi-Time/WBScripts/issues/new?title=' +
                encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
        }

        function getStoredFlag(key) {
            try {
                return localStorage.getItem(key) === '1';
            } catch (_) {
                return false;
            }
        }

        function setStoredFlag(key, enabled) {
            try {
                if (enabled) localStorage.setItem(key, '1');
                else localStorage.removeItem(key);
            } catch (_) {}
        }

        function redirectToScreen(screen, uriParams = {}, removeParams = []) {
            if (window.TribalWars && typeof window.TribalWars.redirect === 'function') {
                window.TribalWars.redirect(screen, uriParams);
                return;
            }

            const url = new URL(location.href);
            url.searchParams.set('screen', screen);
            removeParams.forEach(param => url.searchParams.delete(param));
            Object.entries(uriParams).forEach(([key, value]) => {
                if (value === null || typeof value === 'undefined') url.searchParams.delete(key);
                else url.searchParams.set(key, String(value));
            });
            location.href = url.href;
        }

        function closeRedirectDialog(rootId, eventNamespace) {
            $('#' + rootId).remove();
            $(document).off('keydown.' + eventNamespace);
        }

        function showRedirectDialog(options) {
            injectStyles();

            const rootId = options.rootId || 'webiTimeRedirectModalRoot';
            const eventNamespace = options.eventNamespace || 'webiTimeRedirect';
            const getPreference = options.getPreference || (() => false);
            const setPreference = options.setPreference || (() => {});
            const redirect = options.redirect || (() => {});

            if (getPreference()) {
                if (typeof UI !== 'undefined' && UI.InfoMessage && options.infoMessage) {
                    UI.InfoMessage(options.infoMessage);
                }
                setTimeout(redirect, 200);
                return;
            }

            closeRedirectDialog(rootId, eventNamespace);

            const modal = `
                <div id="${rootId}" class="wt-modal-root">
                    <div class="wt-modal-overlay"></div>
                    <div class="wt-modal-wrap">
                        <div class="wt-modal" role="dialog" aria-modal="true">
                            <div class="wt-modal-content">
                                <div class="wt-modal-title">${options.title || 'Redirection'}</div>
                                <div class="wt-modal-text">${options.message || ''}</div>
                                <label class="wt-modal-option">
                                    <input type="checkbox" class="wt-modal-skip">
                                    <span>Ne plus me demander et rediriger automatiquement la prochaine fois</span>
                                </label>
                                <div class="wt-modal-actions">
                                    <button type="button" class="wt-modal-btn wt-modal-confirm">Emmène-moi là-bas !</button>
                                    <button type="button" class="wt-modal-btn secondary wt-modal-cancel">Laisse tomber...</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;

            $('body').append(modal);
            const $root = $('#' + rootId);

            $root.find('.wt-modal-confirm').on('click', function () {
                setPreference($root.find('.wt-modal-skip').prop('checked'));
                closeRedirectDialog(rootId, eventNamespace);
                redirect();
            });

            $root.find('.wt-modal-cancel, .wt-modal-overlay').on('click', function () {
                closeRedirectDialog(rootId, eventNamespace);
                if (typeof options.onCancel === 'function') options.onCancel();
            });

            $(document).on('keydown.' + eventNamespace, function (event) {
                if (event.key === 'Escape') {
                    closeRedirectDialog(rootId, eventNamespace);
                    if (typeof options.onCancel === 'function') options.onCancel();
                }
            });
        }

        function showMessageDialog(options = {}) {
            injectStyles();

            const rootId = options.rootId || 'webiTimeMessageModalRoot';
            const eventNamespace = options.eventNamespace || 'webiTimeMessage';
            const title = options.title || 'Information';
            const message = options.message || '';
            const buttonText = options.buttonText || 'Fermer';

            closeRedirectDialog(rootId, eventNamespace);

            return new Promise(resolve => {
                const modal = `
                    <div id="${rootId}" class="wt-modal-root">
                        <div class="wt-modal-overlay"></div>
                        <div class="wt-modal-wrap">
                            <div class="wt-modal" role="dialog" aria-modal="true">
                                <div class="wt-modal-content">
                                    <div class="wt-modal-title">${title}</div>
                                    <div class="wt-modal-text">${message}</div>
                                    <div class="wt-modal-actions wt-modal-actions-single">
                                        <button type="button" class="wt-modal-btn wt-modal-ack">${buttonText}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;

                $('body').append(modal);
                const $root = $('#' + rootId);

                const close = () => {
                    closeRedirectDialog(rootId, eventNamespace);
                    resolve();
                };

                $root.find('.wt-modal-ack, .wt-modal-overlay').on('click', close);
                $(document).on('keydown.' + eventNamespace, event => {
                    if (event.key === 'Escape') close();
                });
            });
        }

        function showProgressDialog(options = {}) {
            injectStyles();

            const rootId = options.rootId || 'webiTimeProgressModalRoot';
            const eventNamespace = options.eventNamespace || 'webiTimeProgress';
            const title = options.title || 'Chargement';
            const message = options.message || 'Traitement en cours...';

            closeRedirectDialog(rootId, eventNamespace);

            const modal = `
                <div id="${rootId}" class="wt-modal-root">
                    <div class="wt-modal-overlay"></div>
                    <div class="wt-modal-wrap">
                        <div class="wt-modal wt-progress-modal" role="dialog" aria-modal="true" aria-live="polite">
                            <div class="wt-modal-content">
                                <div class="wt-modal-title">${title}</div>
                                <div class="wt-modal-text wt-progress-message">${message}</div>
                                <div class="wt-progress-meta">
                                    <span class="wt-progress-label">Préparation...</span>
                                    <span class="wt-progress-count">0/0</span>
                                </div>
                                <div class="wt-progress-track">
                                    <div class="wt-progress-bar"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;

            $('body').append(modal);
            const $root = $('#' + rootId);

        return Object.freeze({
                update(current, total, label) {
                    const safeCurrent = Number.isFinite(Number(current)) ? Number(current) : 0;
                    const safeTotal = Number.isFinite(Number(total)) ? Number(total) : 0;
                    const pct = safeTotal > 0 ? Math.max(0, Math.min(100, Math.round((safeCurrent / safeTotal) * 100))) : 0;
                    $root.find('.wt-progress-bar').css('width', pct + '%');
                    $root.find('.wt-progress-count').text(`${safeCurrent}/${safeTotal}`);
                    if (label) $root.find('.wt-progress-label').text(label);
                },
                setMessage(html) {
                    $root.find('.wt-progress-message').html(html || '');
                },
                close() {
                    closeRedirectDialog(rootId, eventNamespace);
                }
            });
        }

        function buildSettingsMarkup(clearButtonId, bugButtonId) {
            return `
                <span class="wt-settings-wrap">
                    <button type="button" class="wt-settings-btn" aria-label="Paramètres" title="Paramètres">⚙</button>
                    <span class="wt-settings-popover" role="dialog" aria-label="Paramètres du script">
                        <button type="button" id="${clearButtonId}" class="wt-settings-action wt-settings-delete">Supprimer les données enregistrées</button>
                        <button type="button" id="${bugButtonId}" class="wt-settings-action wt-settings-bug">Signaler un bug</button>
                    </span>
                </span>`;
        }

        function bindSettingsPopover(options) {
            injectStyles();

            const $container = $(options.containerSelector);
            const $wrap = $container.find('.wt-settings-wrap');
            const $popover = $wrap.find('.wt-settings-popover');
            const $button = $wrap.find('.wt-settings-btn');
            let closeTimer = null;

            function cancelClose() {
                if (closeTimer !== null) {
                    clearTimeout(closeTimer);
                    closeTimer = null;
                }
            }

            function openPopover() {
                cancelClose();
                $wrap.addClass('is-open');
            }

            function scheduleClose() {
                cancelClose();
                closeTimer = setTimeout(function () {
                    $wrap.removeClass('is-open');
                    closeTimer = null;
                }, SETTINGS_CLOSE_DELAY_MS);
            }

            $wrap
                .off('.webiTimeSettings')
                .on('mouseenter.webiTimeSettings', openPopover)
                .on('mouseleave.webiTimeSettings', scheduleClose);

            $popover
                .off('.webiTimeSettings')
                .on('mouseenter.webiTimeSettings', openPopover)
                .on('mouseleave.webiTimeSettings', scheduleClose);

            $button
                .off('.webiTimeSettings')
                .on('focus.webiTimeSettings click.webiTimeSettings', openPopover)
                .on('blur.webiTimeSettings', scheduleClose);

            $(options.bugButtonSelector).off('click.webiTimeSettings').on('click.webiTimeSettings', function (event) {
                event.preventDefault();
                event.stopPropagation();
                cancelClose();
                openPopover();
                window.open(options.bugUrl, '_blank', 'noopener,noreferrer');
            });

            $(options.clearButtonSelector).off('click.webiTimeSettings').on('click.webiTimeSettings', function (event) {
                event.preventDefault();
                event.stopPropagation();
                cancelClose();
                openPopover();

                if (typeof options.onClear === 'function') options.onClear();

                $(this)
                    .addClass('is-cleared')
                    .prop('disabled', true)
                    .text('✓ Données supprimées');

                if (typeof UI !== 'undefined' && UI.SuccessMessage) {
                    UI.SuccessMessage(options.successMessage || 'Données enregistrées supprimées.');
                }
            });
        }


        function injectStyleTag(styleId, cssText) {
            injectStyles();
            if (document.getElementById(styleId)) return;
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = cssText;
            document.head.appendChild(style);
        }

        function injectIntelStyles(prefix, boxId) {
            const PREFIX = prefix;
            const BOX_ID = boxId;
            injectStyleTag(PREFIX + 'Style', `
                #${BOX_ID} .gtiv-controls {
                    display: grid;
                    grid-template-columns: minmax(170px, 1.05fr) minmax(170px, 1.05fr) minmax(260px, 1.45fr) minmax(170px, .85fr);
                    gap: 9px;
                    align-items: stretch;
                }

                #${BOX_ID} .gtiv-options {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 7px;
                }

                #${BOX_ID} .gtiv-action {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 8px;
                    background: linear-gradient(180deg,#252525,#202020);
                }

                #${BOX_ID} .gtiv-run {
                    width: 100%;
                    min-height: 42px !important;
                    font-size: var(--webi-font-body) !important;
                    font-weight: 800 !important;
                }

                #${BOX_ID} .gtiv-progress {
                    margin-top: 10px;
                    padding: 8px 10px;
                    border: 1px solid rgba(255,152,0,.20);
                    border-radius: 8px;
                    background: #1d1d1d;
                }

                #${BOX_ID} .gtiv-progress-title {
                    display: flex;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 6px;
                    color: #c7c7c7;
                    font-size: var(--webi-font-compact);
                }

                #${BOX_ID} .gtiv-progress-track {
                    height: 7px;
                    overflow: hidden;
                    border: 1px solid rgba(255,152,0,.28);
                    border-radius: 99px;
                    background: rgba(0,0,0,.34);
                }

                #${BOX_ID} #${PREFIX}ProgressBar {
                    height: 100%;
                    width: 0%;
                    border-radius: inherit;
                    background: linear-gradient(90deg, var(--webi-cyan-2), var(--webi-cyan), var(--webi-magenta));
                    box-shadow: 0 0 12px rgba(255,152,0,.45);
                    transition: width .18s ease;
                }

                #${BOX_ID} .gtiv-stats {
                    display: grid;
                    grid-template-columns: repeat(7, minmax(90px, 1fr));
                    gap: 7px;
                    margin-top: 10px;
                }

                #${BOX_ID} .gtiv-stat {
                    position: relative;
                    min-width: 0;
                    padding: 9px 7px 8px;
                    overflow: hidden;
                    border: 1px solid rgba(255,152,0,.17);
                    border-radius: 8px;
                    background: linear-gradient(180deg,#252525,#1e1e1e);
                    text-align: center;
                }

                #${BOX_ID} .gtiv-stat::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 22%;
                    right: 22%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, currentColor, transparent);
                    opacity: .65;
                }

                #${BOX_ID} .gtiv-stat-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 18px;
                    height: 18px;
                    margin-bottom: 2px;
                    color: inherit;
                    font-size: 17px;
                    font-weight: 900;
                }

                #${BOX_ID} .gtiv-stat-value { display:block; color:inherit; font-size:20px; font-weight:800; line-height:1.05; }
                #${BOX_ID} .gtiv-stat-label { display:block; margin-top:4px; overflow:hidden; color:#999999; font-size:var(--webi-font-footer); line-height:1.15; text-overflow:ellipsis; white-space:nowrap; }
                #${BOX_ID} .gtiv-stat.cyan { color:var(--webi-cyan); }
                #${BOX_ID} .gtiv-stat.green { color:var(--webi-green); }
                #${BOX_ID} .gtiv-stat.red { color:var(--webi-red); }
                #${BOX_ID} .gtiv-stat.blue { color:#78aaff; }
                #${BOX_ID} .gtiv-stat.yellow { color:var(--webi-yellow); }
                #${BOX_ID} .gtiv-stat.magenta { color:var(--webi-magenta); }

                #${BOX_ID} #${PREFIX}Summary:not(:empty) {
                    margin-top: 9px;
                    padding: 7px 10px;
                    border: 1px solid rgba(255,152,0,.19);
                    border-left: 3px solid var(--webi-cyan);
                    border-radius: 6px;
                    background: rgba(8,28,44,.72);
                    color: #cce9f5;
                    font-size: var(--webi-font-small);
                }

                #${BOX_ID} .gtiv-log-section { margin-top:10px; overflow:hidden; border:1px solid rgba(255,152,0,.20); border-radius:8px; background:rgba(3,13,22,.76); }
                #${BOX_ID} .gtiv-log-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:7px 9px; border-bottom:1px solid rgba(255,152,0,.15); background:rgba(9,29,45,.74); }
                #${BOX_ID} .gtiv-log-title { color:#d9f4ff; font-size:var(--webi-font-small); font-weight:700; }
                #${BOX_ID} .gtiv-clear-log { padding:3px 7px; border:1px solid rgba(142,181,201,.28); border-radius:5px; background:rgba(255,255,255,.025); color:#a8a8a8; font-size:var(--webi-font-footer); cursor:pointer; }
                #${BOX_ID} .gtiv-clear-log:hover { border-color:rgba(255,152,0,.44); color:var(--webi-cyan); }
                #${BOX_ID} #${PREFIX}Log { min-height:66px; max-height:285px; overflow:auto; padding:8px 10px; color:#aaaaaa; font-family:Consolas,"Courier New",monospace; font-size:var(--webi-font-compact); line-height:1.55; scrollbar-color:#1e6c8a #171717; scrollbar-width:thin; }
                #${BOX_ID} .gtiv-log-line { display:grid; grid-template-columns:62px minmax(0,1fr); align-items:start; column-gap:7px; padding:3px 0; white-space:normal; word-break:break-word; }
                #${BOX_ID} .gtiv-log-time { color:#666666; white-space:nowrap; }
                #${BOX_ID} .gtiv-log-content, #${BOX_ID} .gtiv-log-main { min-width:0; }
                #${BOX_ID} .gtiv-log-detail { margin-top:2px; padding-left:14px; color:currentColor; opacity:.82; position:relative; }
                #${BOX_ID} .gtiv-log-detail::before { content:'↳'; position:absolute; left:0; color:#8a6a3a; opacity:.9; }
                #${BOX_ID} .gtiv-log-ok { color:#68e8b4; }
                #${BOX_ID} .gtiv-log-error { color:#ff7186; }
                #${BOX_ID} .gtiv-log-warn { color:#ffcb67; }
                #${BOX_ID} .gtiv-log-skip { color:#9aafbc; }
                #${BOX_ID} .gtiv-log-info { color:#c7c7c7; }
                #${BOX_ID} #${PREFIX}Log a { color:var(--webi-cyan); }

                @media (max-width:1050px) {
                    #${BOX_ID} .gtiv-controls { grid-template-columns:repeat(2,minmax(180px,1fr)); }
                    #${BOX_ID} .gtiv-stats { grid-template-columns:repeat(4,minmax(90px,1fr)); }
                }
                @media (max-width:680px) {
                    #${BOX_ID} .gtiv-controls { grid-template-columns:1fr; }
                    #${BOX_ID} .gtiv-stats { grid-template-columns:repeat(2,1fr); }
                }
            `);
        }

        function injectRenameStyles(styleId = 'webiTimeRenameAttackStyle') {
            injectStyleTag(styleId, `
                #openDiv.wt-panel { margin:12px 0 18px 0 !important; text-align:left !important; }

                .wtra-actions { display:grid; grid-template-columns:repeat(2,minmax(180px,1fr)); gap:10px; margin-top:11px; }
                .wtra-intro { color:#dddddd; font-size:var(--webi-font-body); line-height:1.5; }

                .wtra-overlay { position:fixed; inset:0; z-index:25000; background:rgba(1,7,13,.76); backdrop-filter:blur(2px); }
                .wtra-modal-wrap { position:fixed; z-index:25001; inset:0; display:flex; align-items:flex-start; justify-content:center; padding:70px 18px 28px; box-sizing:border-box; pointer-events:none; }
                .wtra-modal { position:relative; width:min(820px,calc(100vw - 36px)); max-height:calc(100vh - 100px); overflow:hidden; border:1px solid rgba(255,152,0,.68); border-radius:14px; background:radial-gradient(circle at 5% -10%,rgba(255,152,0,.19),transparent 32%),radial-gradient(circle at 92% 0%,rgba(255,179,71,.14),transparent 28%),linear-gradient(180deg,#171717 0%,#202020 54%,#111111 100%); box-shadow:0 0 34px rgba(255,152,0,.18),0 22px 65px rgba(0,0,0,.48); color:var(--webi-text); font-family:Arial,Helvetica,sans-serif; pointer-events:auto; }
                .wtra-modal::before { content:""; position:absolute; z-index:0; inset:0; pointer-events:none; opacity:.30; background-image:linear-gradient(rgba(255,152,0,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,152,0,.035) 1px,transparent 1px); background-size:26px 26px; }
                .wtra-modal > * { position:relative; z-index:1; }
                .wtra-modal .wt-hero { min-height:72px; padding:12px 15px; }
                .wtra-modal .wt-logo { flex-basis:52px; width:52px; height:52px; font-size:30px; border-radius:13px; }
                .wtra-modal .wt-title { font-size:21px; }

                #popupcontainer.wtra-popup-body { max-height:calc(100vh - 265px); overflow-y:auto; padding:14px 15px 6px; box-sizing:border-box; background:transparent !important; scrollbar-color:#1e6c8a #171717; scrollbar-width:thin; }
                .wtra-option-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; }
                .wtra-types-card { overflow:hidden; border:1px solid rgba(255,152,0,.20); border-radius:9px; background:rgba(3,13,22,.65); }
                .wtra-types-toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px; border-bottom:1px solid rgba(255,152,0,.16); background:rgba(9,29,45,.74); }
                .wtra-types-toolbar-title { color:#d9f4ff; font-size:var(--webi-font-body); font-weight:800; }
                .wtra-add { min-height:32px !important; padding:5px 10px !important; font-size:var(--webi-font-compact) !important; }
                .wtra-types-head, .wtra-attack-row { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(150px,.8fr) 34px; gap:9px; align-items:center; }
                .wtra-types-head { padding:8px 11px 4px; color:#888888; font-size:var(--webi-font-footer); font-weight:750; letter-spacing:.55px; text-transform:uppercase; }
                #div_command.wtra-types-list { padding-bottom:8px; }
                .wtra-attack-row { margin:5px 8px; padding:7px 8px; border:1px solid rgba(255,152,0,.13); border-radius:7px; background:rgba(10,28,43,.70); }
                .wtra-attack-row:hover { border-color:rgba(255,152,0,.31); }
                .wtra-remove { display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0; border:1px solid rgba(255,91,114,.40); border-radius:7px; background:rgba(85,17,31,.42); color:#ff7186; font-size:18px; font-weight:800; line-height:1; cursor:pointer; }
                .wtra-remove:hover { border-color:var(--webi-red); background:rgba(116,21,39,.55); }
                .wtra-modal-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 14px 13px; border-top:1px solid rgba(255,152,0,.15); background:rgba(4,15,25,.76); }
                .wtra-modal-footer-note { color:#888888; font-size:var(--webi-font-footer); }
                #close_popup.wtra-save { min-width:145px; margin:0 !important; }

                @media (max-width:720px) {
                    .wtra-actions, .wtra-option-grid { grid-template-columns:1fr; }
                    .wtra-types-head, .wtra-attack-row { grid-template-columns:1fr 1fr 32px; }
                    .wtra-modal-wrap { padding:25px 8px 14px; }
                    .wtra-modal { width:calc(100vw - 16px); max-height:calc(100vh - 40px); }
                    #popupcontainer.wtra-popup-body { max-height:calc(100vh - 210px); }
                }
            `);
        }

        function injectResourceStyles(styleId = 'webiTimeIncomingResourcesStyle') {
            injectStyleTag(styleId, `
                #twcheese_pillaging_stats .wtri-summary { display:grid; grid-template-columns:minmax(260px,.9fr) minmax(360px,1.6fr); gap:10px; align-items:stretch; }
                #twcheese_pillaging_stats .wtri-range { display:grid; grid-template-columns:auto minmax(110px,1fr) auto minmax(110px,1fr); align-items:center; gap:7px; color:#aaaaaa; font-size:var(--webi-font-small); }
                #twcheese_pillaging_stats .wtri-results { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:9px 15px; min-height:42px; color:#e6e6e6; font-size:var(--webi-font-body); font-variant-numeric:tabular-nums; }
                #twcheese_pillaging_stats .wtri-result-item { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; }
                #twcheese_pillaging_stats .wtri-result-item img, #twcheese_pillaging_stats .wtri-table img { width:18px; height:18px; vertical-align:middle; }
                #twcheese_pillaging_stats .wtri-result-performance { color:#bdbdbd; white-space:nowrap; }

                #twcheese_pillaging_stats .wtri-table-card { margin-top:10px; overflow:hidden; border:1px solid rgba(255,152,0,.20); border-radius:8px; background:rgba(3,13,22,.76); }
                #twcheese_pillaging_stats .wtri-table-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 10px; border-bottom:1px solid rgba(255,152,0,.15); background:rgba(9,29,45,.74); }
                #twcheese_pillaging_stats .wtri-table-title { color:#d9f4ff; font-size:var(--webi-font-small); font-weight:700; }
                #twcheese_pillaging_stats .wtri-collapse { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; padding:0; border:1px solid rgba(255,152,0,.34); border-radius:6px; background:rgba(5,24,38,.92); cursor:pointer; }
                #twcheese_pillaging_stats .wtri-collapse:hover { border-color:var(--webi-cyan); box-shadow:0 0 10px rgba(255,152,0,.16); }
                #twcheese_pillaging_stats .wtri-collapse img { width:12px; height:12px; }
                #twcheese_pillaging_stats .wtri-table-wrap { max-height:360px; overflow:auto; scrollbar-color:#1e6c8a #171717; scrollbar-width:thin; }
                #twcheese_pillaging_stats .wtri-table { width:100%; border-collapse:collapse; color:#dddddd; font-size:var(--webi-font-small); font-variant-numeric:tabular-nums; }
                #twcheese_pillaging_stats .wtri-table th { position:sticky; top:0; z-index:1; padding:8px 9px; border-bottom:1px solid rgba(255,152,0,.18); background:#202020 !important; color:#cfcfcf !important; font-family:Arial,Helvetica,sans-serif !important; font-size:var(--webi-font-small) !important; font-weight:700 !important; line-height:1.3 !important; text-align:center !important; vertical-align:middle !important; }
                #twcheese_pillaging_stats .wtri-table td { padding:7px 9px; border-bottom:1px solid rgba(255,152,0,.08); background:rgba(7,21,35,.54); text-align:center; }
                #twcheese_pillaging_stats .wtri-table tbody tr:nth-child(even) td { background:rgba(12,34,52,.54) !important; }
                #twcheese_pillaging_stats .wtri-table tbody tr:hover td { background:rgba(16,49,70,.72) !important; }

                @media (max-width:900px) { #twcheese_pillaging_stats .wtri-summary { grid-template-columns:1fr; } }
                @media (max-width:680px) {
                    #twcheese_pillaging_stats .wtri-range { grid-template-columns:1fr; }
                    #twcheese_pillaging_stats .wtri-range-label { display:none; }
                }
            `);
        }

        function injectMapPlannerStyles(styleId = 'webiTimeMapPlannerStyle') {
            injectStyleTag(styleId, `
                #gt-map-planner-ui.gtmp-panel {
                    position:fixed;
                    top:96px;
                    right:18px;
                    z-index:99999;
                    width:420px;
                    height:760px;
                    max-height:calc(100vh - 118px);
                    margin:0;
                    display:flex;
                    flex-direction:column;
                }

                #gtmp-title { cursor:move; user-select:none; flex:0 0 auto; }
                #gt-map-planner-ui .wt-hero { min-height:auto; padding:12px 14px; }
                #gt-map-planner-ui .wt-logo { flex-basis:42px; width:42px; height:42px; border-radius:11px; font-size:25px; }
                #gt-map-planner-ui .wt-title { font-size:17px; }
                #gt-map-planner-ui .wt-byline, #gt-map-planner-ui .wt-tagline { font-size:10px; }
                #gt-map-planner-ui .wt-hero-motto { font-size:12px; line-height:1.38; letter-spacing:1.2px; padding-right:18px; }
                

                #gtmp-close { position:absolute; z-index:5; right:8px; top:7px; width:22px; height:22px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#aaaaaa; font-size:18px; line-height:22px; border-radius:6px; }
                #gtmp-close:hover { background:rgba(255,91,114,.16); color:#ffb3bf; }

                #gtmp-body { padding:10px; overflow:auto; min-height:0; flex:1 1 auto; background:rgba(3,13,22,.30); scrollbar-color:#1e6c8a #171717; scrollbar-width:thin; }
                #gt-map-planner-ui .wt-card { margin-bottom:9px; }
                #gt-map-planner-ui .wt-card:last-child { margin-bottom:0; }
                #gt-map-planner-ui .wt-footer { flex:0 0 auto; margin:0; padding:8px 12px; background:rgba(4,15,25,.88); grid-template-columns:1fr auto 1fr; font-size:9px; }
                #gt-map-planner-ui .wt-footer-center { letter-spacing:.25px; }

                .gtmp-section-toggle { display:flex; align-items:center; gap:7px; cursor:pointer; user-select:none; padding:3px 2px; border-radius:5px; }
                .gtmp-section-toggle:hover { background:rgba(255,152,0,.06); color:#fff; }
                .gtmp-section-toggle:focus { outline:none; box-shadow:0 0 0 2px rgba(255,152,0,.14); }
                .gtmp-section-chevron, .gtmp-bonus-chevron { margin-left:auto; display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; background:#151515; border:1px solid rgba(255,152,0,.28); color:var(--webi-cyan); font-size:11px; line-height:1; transition:transform .18s ease,background .12s,border-color .12s; }
                .gtmp-section-content { display:block; }
                .gtmp-section-card.collapsed .gtmp-section-content { display:none; }
                .gtmp-section-card.collapsed .gtmp-section-toggle { margin-bottom:0; }
                .gtmp-section-card.collapsed .gtmp-section-chevron { transform:rotate(-90deg); }

                .gtmp-filter-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
                .gtmp-filter { color:#dddddd; background:rgba(9,29,45,.75); border:1px solid rgba(255,152,0,.23); border-radius:15px; padding:6px 8px; cursor:pointer; transition:.12s; }
                .gtmp-filter[data-filter="all"], .gtmp-filter[data-filter="myVillage"] { grid-column:1 / -1; }
                .gtmp-filter:hover { background:rgba(14,50,70,.82); border-color:rgba(255,152,0,.48); }
                .gtmp-filter.active { background:#151515; border-color:var(--webi-cyan); color:#fff; font-weight:800; box-shadow:0 0 0 1px rgba(255,152,0,.14),inset 0 0 14px rgba(255,152,0,.06); }

                .gtmp-bonus-filter-wrap { margin-top:9px; padding-top:8px; border-top:1px solid rgba(255,152,0,.13); }
                .gtmp-bonus-filter-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; padding:5px 7px; color:#d2d2d2; background:#1d1d1d; border:1px solid rgba(255,152,0,.18); border-radius:6px; cursor:pointer; user-select:none; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.35px; }
                .gtmp-bonus-filter-title:hover { background:rgba(10,42,60,.82); border-color:rgba(255,152,0,.40); color:#fff; }
                .gtmp-bonus-filter-title:focus { outline:none; border-color:var(--webi-cyan); box-shadow:0 0 0 2px rgba(255,152,0,.12); }
                .gtmp-bonus-filter-title-main { display:flex; align-items:center; gap:6px; }
                .gtmp-bonus-filter-title-main:before { content:'◆'; color:var(--webi-orange); font-size:8px; text-shadow:0 0 6px rgba(255,152,0,.35); }
                .gtmp-bonus-filter-meta { display:flex; align-items:center; gap:7px; }
                .gtmp-bonus-multi { color:#888888; font-size:9px; font-weight:600; text-transform:none; letter-spacing:0; }
                .gtmp-bonus-filter-content { max-height:260px; opacity:1; overflow:hidden; transition:max-height .22s ease,opacity .16s ease,margin .22s ease; }
                .gtmp-bonus-filter-wrap.collapsed .gtmp-bonus-filter-title { margin-bottom:0; }
                .gtmp-bonus-filter-wrap.collapsed .gtmp-bonus-filter-content { max-height:0; opacity:0; margin:0; pointer-events:none; }
                .gtmp-bonus-filter-wrap.collapsed .gtmp-bonus-chevron { transform:rotate(-90deg); }
                .gtmp-bonus-filter-grid { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
                .gtmp-bonus-filter { min-height:31px; display:flex; align-items:center; gap:6px; padding:4px 7px; overflow:hidden; color:#dddddd; background:#242424; border:1px solid rgba(255,152,0,.18); border-radius:6px; cursor:pointer; text-align:left; font-size:10px; font-weight:700; }
                .gtmp-bonus-filter[data-bonus-filter="all"] { grid-column:1 / -1; justify-content:center; }
                .gtmp-bonus-filter:hover { background:#303030; border-color:rgba(255,152,0,.42); }
                .gtmp-bonus-filter.active { background:#151515; border-color:var(--webi-cyan); color:#fff; box-shadow:0 0 0 1px rgba(255,152,0,.12),inset 0 0 12px rgba(255,152,0,.06); }
                .gtmp-bonus-filter img { width:18px; height:18px; flex:0 0 18px; padding:2px; box-sizing:border-box; border-radius:50%; background:#151515; border:1px solid rgba(255,152,0,.35); filter:brightness(1.22) saturate(1.3) drop-shadow(0 1px 1px #000); }
                .gtmp-bonus-filter.active img { border-color:var(--webi-orange); box-shadow:0 0 6px rgba(255,152,0,.30); }

                .gtmp-toggle-row { display:flex; align-items:center; justify-content:space-between; gap:8px; margin:6px 0; padding:5px 7px; background:#1d1d1d; border:1px solid rgba(255,152,0,.15); border-radius:6px; }
                .gtmp-field-label { display:block; margin:7px 0 4px; color:#dddddd; font-size:10px; font-weight:700; }
                .gtmp-label-row { display:grid; grid-template-columns:1fr; gap:5px; margin-top:7px; }
                .gtmp-btn-picker { white-space:nowrap; }
                .gtmp-btn-picker.active { border-color:var(--webi-orange) !important; color:#ffd3a5 !important; box-shadow:0 0 0 2px rgba(255,152,0,.14) !important; }
                .gtmp-form-grid { display:grid; grid-template-columns:1.1fr .72fr; gap:6px; }
                .gtmp-form-coord { display:grid; grid-template-columns:minmax(115px,1fr) auto auto; gap:6px; margin-top:6px; }
                .gtmp-zone-list { margin-top:8px; max-height:164px; overflow:auto; border:1px solid rgba(255,152,0,.18); border-radius:6px; background:#191919; }
                .gtmp-zone-item { display:grid; grid-template-columns:1fr auto; gap:6px; padding:7px 8px; border-bottom:1px solid rgba(255,152,0,.10); align-items:center; }
                .gtmp-zone-item:last-child { border-bottom:0; }
                .gtmp-zone-delete { width:24px; height:24px; min-height:24px !important; padding:0 !important; }
                .gtmp-picker-status { display:none; margin-top:6px; padding:7px 8px; border-radius:6px; background:rgba(84,53,8,.35); border:1px solid rgba(255,200,87,.45); color:#ffd18a; font-size:10px; font-weight:700; }
                .gtmp-picker-status.active { display:block; }
                .gtmp-picking-coord #map_wrap, .gtmp-picking-coord #map, .gtmp-picking-coord [id^="map_"] { cursor:crosshair !important; }

                body.gtmp-hide-map-attacks #map img[src*="attack_small"],
                body.gtmp-hide-map-attacks #map_wrap img[src*="attack_small"],
                body.gtmp-hide-map-attacks #map_container img[src*="attack_small"],
                body.gtmp-hide-map-attacks #map img[src*="commands_outgoing"],
                body.gtmp-hide-map-attacks #map_wrap img[src*="commands_outgoing"],
                body.gtmp-hide-map-attacks #map_container img[src*="commands_outgoing"],
                body.gtmp-hide-map-attacks #map img[src*="/return_"],
                body.gtmp-hide-map-attacks #map_wrap img[src*="/return_"],
                body.gtmp-hide-map-attacks #map_container img[src*="/return_"],
                body.gtmp-hide-map-attacks #map img[src$="/back.png"],
                body.gtmp-hide-map-attacks #map_wrap img[src$="/back.png"],
                body.gtmp-hide-map-attacks #map_container img[src$="/back.png"],
                body.gtmp-hide-map-attacks #map img[src$="/other_back.png"],
                body.gtmp-hide-map-attacks #map_wrap img[src$="/other_back.png"],
                body.gtmp-hide-map-attacks #map_container img[src$="/other_back.png"],
                body.gtmp-hide-map-attacks #map img[src$="/farm.png"]:not(.gtmp-bonus-icon),
                body.gtmp-hide-map-attacks #map_wrap img[src$="/farm.png"]:not(.gtmp-bonus-icon),
                body.gtmp-hide-map-attacks #map_container img[src$="/farm.png"]:not(.gtmp-bonus-icon),
                body.gtmp-hide-map-attacks #map img[src$="/support.png"],
                body.gtmp-hide-map-attacks #map_wrap img[src$="/support.png"],
                body.gtmp-hide-map-attacks #map_container img[src$="/support.png"],
                body.gtmp-hide-map-attacks #map img[src*="/graphic/unit/"],
                body.gtmp-hide-map-attacks #map_wrap img[src*="/graphic/unit/"],
                body.gtmp-hide-map-attacks #map_container img[src*="/graphic/unit/"],
                body.gtmp-hide-map-attacks #map img[src*="/unit/unit_"],
                body.gtmp-hide-map-attacks #map_wrap img[src*="/unit/unit_"],
                body.gtmp-hide-map-attacks #map_container img[src*="/unit/unit_"],
                body.gtmp-hide-map-attacks #map [style*="/graphic/unit/"],
                body.gtmp-hide-map-attacks #map_wrap [style*="/graphic/unit/"],
                body.gtmp-hide-map-attacks #map_container [style*="/graphic/unit/"] { display:none !important; }

                .gtmp-zone-overlay { pointer-events:none; position:absolute; border-radius:50%; box-sizing:border-box; }
                .gtmp-zone-center { pointer-events:none; position:absolute; width:8px; height:8px; margin-left:-4px; margin-top:-4px; border:2px solid #111; border-radius:50%; box-sizing:border-box; z-index:6; }
                .gtmp-zone-tag { pointer-events:none; position:absolute; z-index:7; padding:1px 4px; border-radius:3px; color:#fff; font:bold 9px Arial,sans-serif; text-shadow:0 1px 2px #000; white-space:nowrap; }
                .gtmp-village-label { pointer-events:none; position:absolute; z-index:9; color:#fff; text-align:center; font:bold 10px Arial,sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border:1px solid rgba(0,0,0,.85); border-radius:3px; text-shadow:0 1px 2px #000; box-shadow:0 1px 2px rgba(0,0,0,.45); opacity:.94; padding:0 3px; box-sizing:border-box; }
                .gtmp-bonus-badge { pointer-events:none; position:absolute; z-index:20; display:flex; align-items:center; justify-content:center; box-sizing:border-box; border:2px solid var(--webi-orange); border-radius:50%; background:rgba(12,12,12,.88); box-shadow:0 0 0 1px rgba(0,0,0,.9),0 0 8px rgba(255,152,0,.45),0 3px 7px rgba(0,0,0,.72); }
                .gtmp-bonus-icon { display:block !important; max-width:none !important; max-height:none !important; object-fit:contain; filter:brightness(1.28) contrast(1.12) saturate(1.45) drop-shadow(0 1px 1px rgba(0,0,0,.95)); }
                .gtmp-bonus-badge[data-bonus-id="4"] .gtmp-bonus-icon { display:block !important; background:transparent !important; transform:scale(1.16); transform-origin:center center; filter:brightness(1.22) contrast(1.14) saturate(1.30) drop-shadow(0 1px 1px rgba(0,0,0,.95)); }
                .gtmp-bonus-filter[data-bonus-filter="4"] img { background:#151515 !important; transform:none; filter:brightness(1.22) contrast(1.14) saturate(1.30) drop-shadow(0 1px 1px rgba(0,0,0,.95)); }

                @media (max-width:680px) {
                    #gt-map-planner-ui.gtmp-panel { width:min(420px,calc(100vw - 20px)); right:10px; top:72px; height:calc(100vh - 92px); }
                    #gt-map-planner-ui .wt-footer { grid-template-columns:1fr; text-align:center; }
                    #gt-map-planner-ui .wt-footer-right { text-align:center; }
                }
            `);
        }

        return Object.freeze({
            theme,
            injectStyles,
            buildIssueUrl,
            getStoredFlag,
            setStoredFlag,
            redirectToScreen,
            showRedirectDialog,
            showMessageDialog,
            showProgressDialog,
            buildSettingsMarkup,
            bindSettingsPopover,
            injectIntelStyles,
            injectRenameStyles,
            injectResourceStyles,
            injectMapPlannerStyles
        });
    }

    window.WebiTimeGT = createWebiTimeSharedUi();
    window.WebiTimeGT.injectStyles();

    console.log('[Webi-Time GT Common] chargé');
})(window);
