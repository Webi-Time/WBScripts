/*
 * Webi-Time GT Common UI
 * Styles et composants partagés par les scripts Guerre Tribale Webi-Time.
 * Réalisé par NoLife4Ever / Webi-Time
 * UI revision: minimal-2026
 */
(function (window) {
    'use strict';

    if (window.WebiTimeGT) return;
    if (typeof window.jQuery === 'undefined') {
        throw new Error('[Webi-Time GT Common] jQuery est requis.');
    }

    const $ = window.jQuery;

function createWebiTimeSharedUi() {
        const STYLE_ID = 'webiTimeSharedUiStyle';
        const SETTINGS_CLOSE_DELAY_MS = 800;

        const theme = Object.freeze({
            colors: Object.freeze({
                bg: '#0b1016',
                bgSoft: '#111820',
                panel: 'rgba(13, 20, 28, .96)',
                panel2: 'rgba(17, 26, 36, .94)',
                line: 'rgba(148, 163, 184, .18)',
                cyan: '#5fd3ea',
                cyan2: '#38b9d6',
                magenta: '#b68cff',
                orange: '#f0a45d',
                green: '#55d6a6',
                red: '#f07486',
                yellow: '#e9c46a',
                text: '#e7edf4',
                muted: '#91a0b2'
            }),
            fonts: Object.freeze({
                title: '22px',
                body: '14px',
                small: '13px',
                compact: '12px',
                footer: '11px',
                modalTitle: '18px'
            })
        });

        function injectStyles() {
            if (document.getElementById(STYLE_ID)) return;

            const style = document.createElement('style');
            style.id = STYLE_ID;
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
                    --webi-radius: 10px;
                    --webi-radius-sm: 7px;
                    --webi-surface: rgba(8, 25, 40, .88);
                    --webi-surface-soft: rgba(10, 31, 49, .72);
                    --webi-separator: rgba(55, 220, 255, .13);
                    --webi-border: rgba(55, 220, 255, .24);
                }

                .wt-modal-root {
                    position: fixed;
                    inset: 0;
                    z-index: 25000;
                    font-family: "Segoe UI", Arial, sans-serif;
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
                    border: 1px solid rgba(55,220,255,.68);
                    border-radius: 12px;
                    background:
                        radial-gradient(circle at 8% -20%, rgba(0,196,255,.19), transparent 38%),
                        radial-gradient(circle at 96% 0%, rgba(255,66,200,.13), transparent 34%),
                        linear-gradient(180deg, #081725 0%, #06111d 100%);
                    box-shadow: 0 0 30px rgba(0,177,238,.16), 0 18px 55px rgba(0,0,0,.52);
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
                        linear-gradient(rgba(55,220,255,.035) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(55,220,255,.035) 1px, transparent 1px);
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
                    border: 1px solid rgba(55,220,255,.18);
                    border-radius: 8px;
                    background: rgba(8,27,43,.72);
                    color: #d7edf7;
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
                    border: 1px solid rgba(55,220,255,.18);
                    border-radius: 8px;
                    background: rgba(7,24,38,.78);
                    color: #bfdce9;
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
                    border: 1px solid rgba(55,220,255,.58);
                    border-radius: 7px;
                    background: linear-gradient(180deg, rgba(10,56,78,.96), rgba(6,36,53,.96));
                    color: #eafaff;
                    box-shadow: 0 0 11px rgba(55,220,255,.10), 0 1px 0 rgba(255,255,255,.06) inset;
                    font: 750 var(--webi-font-body) "Segoe UI", Arial, sans-serif;
                    cursor: pointer;
                }

                .wt-modal-btn:hover {
                    border-color: var(--webi-cyan);
                    background: linear-gradient(180deg, rgba(12,73,99,.98), rgba(7,46,66,.98));
                    box-shadow: 0 0 16px rgba(55,220,255,.18);
                }

                .wt-modal-btn.secondary {
                    border-color: rgba(255,66,200,.50);
                    background: linear-gradient(180deg, rgba(63,20,64,.92), rgba(34,13,47,.96));
                }

                .wt-modal-btn.secondary:hover {
                    border-color: var(--webi-magenta);
                    box-shadow: 0 0 16px rgba(255,66,200,.16);
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
                    border: 1px solid rgba(55,220,255,.54);
                    border-radius: 50%;
                    outline: none;
                    background: rgba(5,24,38,.92);
                    color: var(--webi-cyan);
                    box-shadow: 0 0 7px rgba(55,220,255,.10);
                    font-family: "Segoe UI Symbol", "Segoe UI", Arial, sans-serif;
                    font-size: var(--webi-font-small);
                    font-weight: 700;
                    line-height: 1;
                    cursor: pointer;
                }

                .wt-settings-btn:hover,
                .wt-settings-btn:focus {
                    border-color: var(--webi-cyan);
                    background: rgba(8,43,61,.98);
                    color: #eaffff;
                    box-shadow: 0 0 14px rgba(55,220,255,.28);
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
                    border: 1px solid rgba(55,220,255,.34);
                    border-radius: 8px;
                    background:
                        radial-gradient(circle at 90% 0%, rgba(255,66,200,.10), transparent 35%),
                        linear-gradient(180deg, rgba(8,27,43,.99), rgba(4,16,27,.99));
                    box-shadow: 0 10px 24px rgba(0,0,0,.40), 0 0 15px rgba(55,220,255,.10);
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
                    font: 750 var(--webi-font-compact) "Segoe UI", Arial, sans-serif;
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
                    border: 1px solid rgba(55,220,255,.44);
                    background: rgba(12,62,83,.46);
                    color: #8eeeff;
                }

                .wt-settings-bug:hover {
                    border-color: var(--webi-cyan);
                    background: rgba(14,82,108,.60);
                    color: #ecfdff;
                    box-shadow: 0 0 10px rgba(55,220,255,.12);
                }

                .wt-settings-delete.is-cleared {
                    border-color: rgba(67,231,163,.42);
                    background: rgba(17,83,61,.42);
                    color: var(--webi-green);
                    cursor: default;
                }

                @media (max-width: 560px) {
                    .wt-modal-actions { grid-template-columns: 1fr; }
                }

                /* Webi-Time 2026 — composants communs sobres */
                .wt-modal-root,.wt-modal,.wt-settings-popover,.wt-settings-btn,.wt-settings-action {
                    font-family:"Segoe UI Variable","Segoe UI",system-ui,-apple-system,sans-serif;
                }
                .wt-modal-overlay { background:rgba(3,7,12,.66); backdrop-filter:blur(5px); }
                .wt-modal {
                    border:1px solid rgba(148,163,184,.22); border-radius:14px;
                    background:#101720; box-shadow:0 20px 55px rgba(0,0,0,.42);
                }
                .wt-modal::before { display:none; }
                .wt-modal-content { padding:20px; }
                .wt-modal-title { color:var(--webi-text); font-weight:700; letter-spacing:-.2px; }
                .wt-modal-text,.wt-modal-option {
                    border-color:rgba(148,163,184,.14); background:#0d141c; color:#cbd5e1; box-shadow:none;
                }
                .wt-modal-btn {
                    border-color:rgba(95,211,234,.34); background:#15313d; color:#e8f7fa;
                    box-shadow:none; font-weight:650; transition:.15s ease;
                }
                .wt-modal-btn:hover { border-color:rgba(95,211,234,.68); background:#1a3b49; box-shadow:none; transform:translateY(-1px); }
                .wt-modal-btn.secondary { border-color:rgba(148,163,184,.18); background:#151b24; color:#cbd5e1; }
                .wt-modal-btn.secondary:hover { border-color:rgba(182,140,255,.46); background:#1b202b; box-shadow:none; }
                .wt-settings-btn { border-color:rgba(148,163,184,.22); background:#111923; color:#aab7c5; box-shadow:none; }
                .wt-settings-btn:hover,.wt-settings-btn:focus { border-color:rgba(95,211,234,.48); background:#17222d; color:#dce8ef; box-shadow:none; }
                .wt-settings-popover { border-color:rgba(148,163,184,.20); background:#111820; box-shadow:0 14px 34px rgba(0,0,0,.36); }
                .wt-settings-action { border-radius:7px; box-shadow:none !important; font-weight:650; }

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
                #${BOX_ID} {
                    --wt-bg: var(--webi-bg);
                    --wt-bg-soft: var(--webi-bg-soft);
                    --wt-panel: var(--webi-panel);
                    --wt-panel-2: var(--webi-panel-2);
                    --wt-line: var(--webi-line);
                    --wt-cyan: var(--webi-cyan);
                    --wt-cyan-2: var(--webi-cyan-2);
                    --wt-magenta: var(--webi-magenta);
                    --wt-orange: var(--webi-orange);
                    --wt-green: var(--webi-green);
                    --wt-red: var(--webi-red);
                    --wt-yellow: var(--webi-yellow);
                    --wt-text: var(--webi-text);
                    --wt-muted: var(--webi-muted);

                    position: relative;
                    margin: 12px 0 16px 0;
                    overflow: hidden;
                    border: 1px solid rgba(55, 220, 255, .48);
                    border-radius: 12px;
                    background:
                        radial-gradient(circle at 10% -20%, rgba(0, 196, 255, .22), transparent 34%),
                        radial-gradient(circle at 86% 0%, rgba(255, 66, 200, .16), transparent 28%),
                        radial-gradient(circle at 95% 115%, rgba(255, 122, 44, .14), transparent 30%),
                        linear-gradient(180deg, #07111d 0%, #081725 52%, #06101a 100%);
                    box-shadow:
                        0 0 0 1px rgba(0, 0, 0, .48) inset,
                        0 10px 26px rgba(0, 0, 0, .30),
                        0 0 18px rgba(0, 177, 238, .10);
                    color: var(--wt-text);
                    font-family: "Segoe UI", Arial, sans-serif;
                }

                #${BOX_ID}::before {
                    content: "";
                    position: absolute;
                    z-index: 0;
                    inset: 0;
                    pointer-events: none;
                    opacity: .30;
                    background-image:
                        linear-gradient(rgba(55,220,255,.035) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(55,220,255,.035) 1px, transparent 1px);
                    background-size: 26px 26px;
                }

                #${BOX_ID} > * {
                    position: relative;
                    z-index: 1;
                }

                #${BOX_ID} .gtiv-hero {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    min-height: 86px;
                    padding: 14px 16px;
                    overflow: hidden;
                    border-bottom: 1px solid rgba(55, 220, 255, .28);
                    background:
                        linear-gradient(115deg, rgba(5,17,29,.96) 0%, rgba(7,32,51,.92) 54%, rgba(34,9,43,.88) 100%);
                }

                #${BOX_ID} .gtiv-hero::after {
                    content: "";
                    position: absolute;
                    width: 390px;
                    height: 180px;
                    right: -80px;
                    top: -70px;
                    transform: rotate(-9deg);
                    background:
                        radial-gradient(circle at 35% 50%, rgba(255,66,200,.24), transparent 32%),
                        radial-gradient(circle at 65% 45%, rgba(55,220,255,.21), transparent 35%);
                    filter: blur(4px);
                    pointer-events: none;
                }

                #${BOX_ID} .gtiv-brand {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    min-width: 0;
                }

                #${BOX_ID} .gtiv-logo {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: 0 0 62px;
                    width: 62px;
                    height: 62px;
                    border: 1px solid rgba(55,220,255,.65);
                    border-radius: 16px;
                    background:
                        radial-gradient(circle at 50% 35%, rgba(55,220,255,.20), transparent 44%),
                        linear-gradient(145deg, rgba(6,22,37,.96), rgba(13,8,27,.96));
                    box-shadow:
                        0 0 17px rgba(55,220,255,.22),
                        0 0 28px rgba(255,66,200,.10) inset;
                    font-size: 36px;
                    line-height: 1;
                }

                #${BOX_ID} .gtiv-logo::after {
                    content: "";
                    position: absolute;
                    left: 8px;
                    right: 8px;
                    bottom: 5px;
                    height: 2px;
                    border-radius: 2px;
                    background: linear-gradient(90deg, transparent, var(--wt-cyan), var(--wt-magenta), transparent);
                    box-shadow: 0 0 8px rgba(55,220,255,.7);
                }

                #${BOX_ID} .gtiv-title {
                    margin: 0;
                    font-size: var(--webi-font-title);
                    font-weight: 800;
                    line-height: 1.05;
                    letter-spacing: .1px;
                    text-shadow: 0 0 12px rgba(55,220,255,.22);
                }

                #${BOX_ID} .gtiv-title-webi {
                    color: var(--wt-cyan);
                }

                #${BOX_ID} .gtiv-title-intel {
                    color: var(--wt-magenta);
                }

                #${BOX_ID} .gtiv-byline {
                    margin-top: 5px;
                    color: #d8eef8;
                    font-size: var(--webi-font-small);
                }

                #${BOX_ID} .gtiv-byline b {
                    color: var(--wt-cyan);
                }

                #${BOX_ID} .gtiv-tagline {
                    margin-top: 5px;
                    color: var(--wt-muted);
                    font-size: var(--webi-font-small);
                    letter-spacing: .15px;
                }

                #${BOX_ID} .gtiv-hero-motto {
                    position: relative;
                    z-index: 2;
                    flex: 0 0 auto;
                    padding-left: 15px;
                    border-left: 1px solid rgba(55,220,255,.35);
                    text-align: right;
                    color: #82dfff;
                    font-size: var(--webi-font-footer);
                    line-height: 1.7;
                    letter-spacing: 1.15px;
                    text-transform: uppercase;
                }

                #${BOX_ID} .gtiv-body {
                    padding: 12px;
                    background: linear-gradient(180deg, rgba(4,16,27,.18), rgba(2,11,19,.34));
                }

                #${BOX_ID} .gtiv-controls {
                    display: grid;
                    grid-template-columns: minmax(170px, 1.05fr) minmax(170px, 1.05fr) minmax(260px, 1.45fr) minmax(170px, .85fr);
                    gap: 1px;
                    align-items: stretch;
                    overflow: hidden;
                    padding: 1px;
                    border: 1px solid var(--webi-border);
                    border-radius: var(--webi-radius);
                    background: var(--webi-separator);
                    box-shadow: 0 6px 18px rgba(0,0,0,.16);
                }

                #${BOX_ID} .gtiv-card,
                #${BOX_ID} .gtiv-action {
                    min-width: 0;
                    box-sizing: border-box;
                    border: 0;
                    border-radius: 0;
                    background: linear-gradient(180deg, rgba(12,34,52,.88), rgba(7,21,35,.94));
                    box-shadow: none;
                }

                #${BOX_ID} .gtiv-card {
                    padding: 10px 11px;
                }

                #${BOX_ID} .gtiv-card-title {
                    display: block;
                    margin: 0 0 6px 0;
                    color: #b9d7e6;
                    font-size: var(--webi-font-compact);
                    font-weight: 700;
                    letter-spacing: .5px;
                    text-transform: uppercase;
                }

                #${BOX_ID} select.input-nicer {
                    width: 100% !important;
                    max-width: none !important;
                    height: 31px !important;
                    box-sizing: border-box !important;
                    border: 1px solid rgba(55,220,255,.40) !important;
                    border-radius: 6px !important;
                    outline: none !important;
                    background: #091a2a !important;
                    color: #e9f9ff !important;
                    box-shadow: 0 0 0 1px rgba(0,0,0,.22) inset !important;
                    padding: 3px 8px !important;
                    font-size: var(--webi-font-small) !important;
                }

                #${BOX_ID} select.input-nicer:focus {
                    border-color: var(--wt-cyan) !important;
                    box-shadow: 0 0 10px rgba(55,220,255,.18) !important;
                }

                #${BOX_ID} select.input-nicer option {
                    color: #e9f9ff;
                    background: #091a2a;
                }

                #${BOX_ID} .gtiv-options {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 7px;
                }

                #${BOX_ID} .gtiv-check {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    min-height: 20px;
                    margin: 0;
                    color: #cfe7f3;
                    font-size: var(--webi-font-small);
                    font-weight: 400;
                    cursor: pointer;
                }

                #${BOX_ID} .gtiv-check input {
                    width: 15px;
                    height: 15px;
                    margin: 0;
                    accent-color: #26d7ff;
                }

                #${BOX_ID} .gtiv-action {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 9px;
                    background:
                        radial-gradient(circle at 50% 0%, rgba(55,220,255,.08), transparent 62%),
                        linear-gradient(180deg, rgba(9,28,44,.94), rgba(5,17,29,.97));
                }

                #${BOX_ID} .gtiv-run.btn {
                    width: 100%;
                    min-height: 42px;
                    margin: 0;
                    border: 1px solid rgba(55,220,255,.92) !important;
                    border-radius: 7px !important;
                    background: linear-gradient(135deg, rgba(0,165,219,.24), rgba(18,61,86,.24)) !important;
                    box-shadow:
                        0 0 12px rgba(55,220,255,.28),
                        0 0 20px rgba(55,220,255,.10) inset !important;
                    color: #80eaff !important;
                    text-shadow: 0 0 7px rgba(55,220,255,.55);
                    font-size: var(--webi-font-body) !important;
                    font-weight: 800 !important;
                    letter-spacing: .15px;
                    cursor: pointer;
                }

                #${BOX_ID} .gtiv-run.btn:hover:not(:disabled) {
                    background: linear-gradient(135deg, rgba(0,188,244,.34), rgba(255,66,200,.10)) !important;
                    color: #e9fbff !important;
                    box-shadow: 0 0 18px rgba(55,220,255,.42) !important;
                }

                #${BOX_ID} .gtiv-run.btn:disabled {
                    opacity: .58;
                    cursor: wait;
                }

                #${BOX_ID} .gtiv-progress {
                    margin-top: 8px;
                    padding: 8px 10px;
                    border: 1px solid rgba(55,220,255,.20);
                    border-radius: 8px;
                    background: rgba(5,19,31,.78);
                }

                #${BOX_ID} .gtiv-progress-title {
                    display: flex;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 6px;
                    color: #b9dbe8;
                    font-size: var(--webi-font-compact);
                }

                #${BOX_ID} .gtiv-progress-track {
                    height: 7px;
                    overflow: hidden;
                    border: 1px solid rgba(55,220,255,.28);
                    border-radius: 99px;
                    background: rgba(0,0,0,.34);
                }

                #${BOX_ID} #${PREFIX}ProgressBar {
                    height: 100%;
                    width: 0%;
                    border-radius: inherit;
                    background: linear-gradient(90deg, var(--wt-cyan-2), var(--wt-cyan), var(--wt-magenta));
                    box-shadow: 0 0 12px rgba(55,220,255,.45);
                    transition: width .18s ease;
                }

                #${BOX_ID} .gtiv-stats {
                    display: grid;
                    grid-template-columns: repeat(7, minmax(90px, 1fr));
                    gap: 1px;
                    margin-top: 8px;
                    overflow: hidden;
                    padding: 1px;
                    border: 1px solid rgba(55,220,255,.18);
                    border-radius: var(--webi-radius);
                    background: var(--webi-separator);
                }

                #${BOX_ID} .gtiv-stat {
                    position: relative;
                    min-width: 0;
                    padding: 9px 7px 8px;
                    overflow: hidden;
                    border: 0;
                    border-radius: 0;
                    background: linear-gradient(180deg, rgba(11,32,49,.86), rgba(6,19,32,.94));
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

                #${BOX_ID} .gtiv-stat-value {
                    display: block;
                    color: inherit;
                    font-size: 20px;
                    font-weight: 800;
                    line-height: 1.05;
                    text-shadow: none;
                }

                #${BOX_ID} .gtiv-stat-label {
                    display: block;
                    margin-top: 4px;
                    overflow: hidden;
                    color: #91afbf;
                    font-size: var(--webi-font-footer);
                    line-height: 1.15;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                #${BOX_ID} .gtiv-stat.cyan { color: var(--wt-cyan); }
                #${BOX_ID} .gtiv-stat.green { color: var(--wt-green); }
                #${BOX_ID} .gtiv-stat.red { color: var(--wt-red); }
                #${BOX_ID} .gtiv-stat.blue { color: #78aaff; }
                #${BOX_ID} .gtiv-stat.yellow { color: var(--wt-yellow); }
                #${BOX_ID} .gtiv-stat.magenta { color: var(--wt-magenta); }

                #${BOX_ID} #${PREFIX}Summary:not(:empty) {
                    margin-top: 9px;
                    padding: 7px 10px;
                    border: 1px solid rgba(55,220,255,.19);
                    border-left: 3px solid var(--wt-cyan);
                    border-radius: 6px;
                    background: rgba(8,28,44,.72);
                    color: #cce9f5;
                    font-size: var(--webi-font-small);
                }

                #${BOX_ID} .gtiv-log-section {
                    margin-top: 8px;
                    overflow: hidden;
                    border: 1px solid rgba(55,220,255,.20);
                    border-radius: 8px;
                    background: rgba(3,13,22,.76);
                }

                #${BOX_ID} .gtiv-log-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 7px 9px;
                    border-bottom: 1px solid rgba(55,220,255,.15);
                    background: rgba(9,29,45,.74);
                }

                #${BOX_ID} .gtiv-log-title {
                    color: #d9f4ff;
                    font-size: var(--webi-font-small);
                    font-weight: 700;
                }

                #${BOX_ID} .gtiv-clear-log {
                    padding: 3px 7px;
                    border: 1px solid rgba(142,181,201,.28);
                    border-radius: 5px;
                    background: rgba(255,255,255,.025);
                    color: #8eb5c9;
                    font-size: var(--webi-font-footer);
                    cursor: pointer;
                }

                #${BOX_ID} .gtiv-clear-log:hover {
                    border-color: rgba(55,220,255,.44);
                    color: var(--wt-cyan);
                }

                #${BOX_ID} #${PREFIX}Log {
                    min-height: 66px;
                    max-height: 285px;
                    overflow: auto;
                    padding: 8px 10px;
                    color: #a9cada;
                    font-family: Consolas, "Courier New", monospace;
                    font-size: var(--webi-font-compact);
                    line-height: 1.55;
                    scrollbar-color: #1e6c8a #07111d;
                    scrollbar-width: thin;
                }

                #${BOX_ID} .gtiv-log-line {
                    display: grid;
                    grid-template-columns: 62px minmax(0, 1fr);
                    align-items: start;
                    column-gap: 7px;
                    padding: 3px 0;
                    white-space: normal;
                    word-break: break-word;
                }

                #${BOX_ID} .gtiv-log-time {
                    color: #607f91;
                    white-space: nowrap;
                }

                #${BOX_ID} .gtiv-log-content {
                    min-width: 0;
                }

                #${BOX_ID} .gtiv-log-main {
                    min-width: 0;
                }

                #${BOX_ID} .gtiv-log-detail {
                    margin-top: 2px;
                    padding-left: 14px;
                    color: currentColor;
                    opacity: .82;
                    position: relative;
                }

                #${BOX_ID} .gtiv-log-detail::before {
                    content: '↳';
                    position: absolute;
                    left: 0;
                    color: #4d91ae;
                    opacity: .9;
                }

                #${BOX_ID} .gtiv-log-ok { color: #68e8b4; }
                #${BOX_ID} .gtiv-log-error { color: #ff7186; }
                #${BOX_ID} .gtiv-log-warn { color: #ffcb67; }
                #${BOX_ID} .gtiv-log-skip { color: #9aafbc; }
                #${BOX_ID} .gtiv-log-info { color: #8edff7; }
                #${BOX_ID} #${PREFIX}Log a { color: var(--wt-cyan); }

                #${BOX_ID} .gtiv-footer {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    align-items: center;
                    gap: 10px;
                    margin: 10px -12px -12px;
                    padding: 9px 12px 10px;
                    border-top: 1px solid rgba(55,220,255,.14);
                    background: rgba(3,14,24,.54);
                    color: #65879a;
                    font-size: var(--webi-font-footer);
                }

                #${BOX_ID} .gtiv-footer-center {
                    color: #76a8bd;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    white-space: nowrap;
                }

                #${BOX_ID} .gtiv-footer-right {
                    text-align: right;
                    color: #9ebdca;
                }

                #${BOX_ID} .gtiv-footer-right b {
                    color: var(--wt-cyan);
                }

                @media (max-width: 1050px) {
                    #${BOX_ID} .gtiv-controls {
                        grid-template-columns: repeat(2, minmax(180px, 1fr));
                    }
                    #${BOX_ID} .gtiv-stats {
                        grid-template-columns: repeat(4, minmax(90px, 1fr));
                    }
                }

                @media (max-width: 680px) {
                    #${BOX_ID} .gtiv-hero-motto { display: none; }
                    #${BOX_ID} .gtiv-title { font-size: 20px; }
                    #${BOX_ID} .gtiv-controls { grid-template-columns: 1fr; }
                    #${BOX_ID} .gtiv-stats { grid-template-columns: repeat(2, 1fr); }
                    #${BOX_ID} .gtiv-footer { grid-template-columns: 1fr; text-align: center; }
                    #${BOX_ID} .gtiv-footer-right { text-align: center; }
                }

                /* Intel Villages — Webi-Time 2026 minimal */
                #${BOX_ID} {
                    margin:12px 0 16px; border:1px solid rgba(148,163,184,.20); border-radius:14px;
                    background:#0d141c; box-shadow:0 12px 30px rgba(0,0,0,.20); color:var(--webi-text);
                    font-family:"Segoe UI Variable","Segoe UI",system-ui,-apple-system,sans-serif;
                }
                #${BOX_ID}::before,#${BOX_ID} .gtiv-hero::after,#${BOX_ID} .gtiv-logo::after { display:none; }
                #${BOX_ID} .gtiv-hero { min-height:68px; padding:13px 16px; border-bottom:1px solid rgba(148,163,184,.14); background:#101821; }
                #${BOX_ID} .gtiv-brand { gap:11px; }
                #${BOX_ID} .gtiv-logo { flex-basis:44px; width:44px; height:44px; border:1px solid rgba(148,163,184,.18); border-radius:11px; background:#0b1219; box-shadow:none; font-size:27px; }
                #${BOX_ID} .gtiv-title { font-size:var(--webi-font-title); font-weight:700; letter-spacing:-.35px; text-shadow:none; }
                #${BOX_ID} .gtiv-title-webi { color:#dce7ef; }
                #${BOX_ID} .gtiv-title-intel { color:var(--webi-cyan); }
                #${BOX_ID} .gtiv-byline,#${BOX_ID} .gtiv-tagline { margin-top:3px; color:#8292a5; font-size:var(--webi-font-small); }
                #${BOX_ID} .gtiv-byline b { color:#b7c8d5; }
                #${BOX_ID} .gtiv-hero-motto { padding-left:14px; border-left:1px solid rgba(148,163,184,.14); color:#68798b; font-size:10px; line-height:1.55; letter-spacing:.85px; }
                #${BOX_ID} .gtiv-body { padding:12px; }
                #${BOX_ID} .gtiv-controls { gap:0; overflow:hidden; border:1px solid rgba(148,163,184,.15); border-radius:10px; background:#101821; }
                #${BOX_ID} .gtiv-card,#${BOX_ID} .gtiv-action { border:0; border-right:1px solid rgba(148,163,184,.12); border-radius:0; background:transparent; box-shadow:none; }
                #${BOX_ID} .gtiv-controls>:last-child { border-right:0; }
                #${BOX_ID} .gtiv-card { padding:10px 11px; }
                #${BOX_ID} .gtiv-card-title { color:#78899c; font-size:11px; font-weight:650; letter-spacing:.45px; }
                #${BOX_ID} select.input-nicer { height:34px !important; border-color:rgba(148,163,184,.18) !important; border-radius:7px !important; background:#0b1219 !important; color:#dce5ec !important; box-shadow:none !important; }
                #${BOX_ID} select.input-nicer:focus { border-color:rgba(95,211,234,.58) !important; box-shadow:0 0 0 2px rgba(95,211,234,.08) !important; }
                #${BOX_ID} .gtiv-check { color:#b6c3cf; }
                #${BOX_ID} .gtiv-action { padding:10px; }
                #${BOX_ID} .gtiv-run.btn { min-height:38px; border:1px solid rgba(95,211,234,.34) !important; border-radius:8px !important; background:#15313d !important; color:#dff8fc !important; box-shadow:none !important; text-shadow:none; font-weight:650 !important; }
                #${BOX_ID} .gtiv-run.btn:hover:not(:disabled) { border-color:rgba(95,211,234,.65) !important; background:#1b3d4a !important; box-shadow:none !important; transform:translateY(-1px); }
                #${BOX_ID} .gtiv-progress { border-color:rgba(148,163,184,.14); border-radius:9px; background:#101821; }
                #${BOX_ID} .gtiv-progress-track { height:5px; border:0; background:#070c11; }
                #${BOX_ID} #${PREFIX}ProgressBar { background:linear-gradient(90deg,#38b9d6,#5fd3ea); box-shadow:none; }
                #${BOX_ID} .gtiv-stats { gap:0; overflow:hidden; border:1px solid rgba(148,163,184,.14); border-radius:10px; background:#101821; }
                #${BOX_ID} .gtiv-stat { padding:10px 7px; border:0; border-right:1px solid rgba(148,163,184,.10); border-radius:0; background:transparent; }
                #${BOX_ID} .gtiv-stat:last-child { border-right:0; }
                #${BOX_ID} .gtiv-stat::before { display:none; }
                #${BOX_ID} .gtiv-stat-icon { width:15px; height:15px; opacity:.55; font-size:14px; }
                #${BOX_ID} .gtiv-stat-value { font-size:19px; font-weight:700; }
                #${BOX_ID} .gtiv-stat-label { color:#718295; font-size:10.5px; }
                #${BOX_ID} #${PREFIX}Summary:not(:empty) { border-color:rgba(148,163,184,.14); border-left:2px solid rgba(95,211,234,.55); background:#101821; color:#b9c7d2; }
                #${BOX_ID} .gtiv-log-section { border-color:rgba(148,163,184,.14); border-radius:10px; background:#0a1118; }
                #${BOX_ID} .gtiv-log-head { border-bottom-color:rgba(148,163,184,.11); background:#101821; }
                #${BOX_ID} .gtiv-log-title { color:#c7d3dc; font-weight:650; }
                #${BOX_ID} .gtiv-clear-log { border-color:rgba(148,163,184,.16); background:transparent; color:#7f90a1; }
                #${BOX_ID} #${PREFIX}Log { color:#9aabba; background:#0a1118; }
                #${BOX_ID} .gtiv-footer { margin:10px 0 0; padding:8px 2px 0; border-top:1px solid rgba(148,163,184,.10); background:transparent; color:#607183; }
                #${BOX_ID} .gtiv-footer-center { color:#66788a; letter-spacing:1.35px; }
                #${BOX_ID} .gtiv-footer-right { color:#77899a; }
                #${BOX_ID} .gtiv-footer-right b { color:#a7bac8; }

            `);
        }

        function injectRenameStyles(styleId = 'webiTimeRenameAttackStyle') {
            injectStyleTag(styleId, `
        :root {
            --wtra-bg: var(--webi-bg);
            --wtra-bg-soft: var(--webi-bg-soft);
            --wtra-panel: var(--webi-panel);
            --wtra-panel-2: var(--webi-panel-2);
            --wtra-line: var(--webi-line);
            --wtra-cyan: var(--webi-cyan);
            --wtra-cyan-2: var(--webi-cyan-2);
            --wtra-magenta: var(--webi-magenta);
            --wtra-orange: var(--webi-orange);
            --wtra-green: var(--webi-green);
            --wtra-red: var(--webi-red);
            --wtra-yellow: var(--webi-yellow);
            --wtra-text: var(--webi-text);
            --wtra-muted: var(--webi-muted);
        }

        #openDiv.wtra-panel {
            position: relative;
            margin: 12px 0 18px 0 !important;
            overflow: hidden;
            border: 1px solid rgba(55, 220, 255, .48);
            border-radius: 12px;
            background:
                radial-gradient(circle at 10% -20%, rgba(0, 196, 255, .22), transparent 34%),
                radial-gradient(circle at 86% 0%, rgba(255, 66, 200, .16), transparent 28%),
                radial-gradient(circle at 95% 115%, rgba(255, 122, 44, .14), transparent 30%),
                linear-gradient(180deg, #07111d 0%, #081725 52%, #06101a 100%);
            box-shadow:
                0 0 0 1px rgba(0, 0, 0, .48) inset,
                0 10px 26px rgba(0, 0, 0, .30),
                0 0 18px rgba(0, 177, 238, .10);
            color: var(--wtra-text);
            font-family: "Segoe UI", Arial, sans-serif;
            text-align: left !important;
        }

        #openDiv.wtra-panel::before,
        .wtra-modal::before {
            content: "";
            position: absolute;
            z-index: 0;
            inset: 0;
            pointer-events: none;
            opacity: .30;
            background-image:
                linear-gradient(rgba(55,220,255,.035) 1px, transparent 1px),
                linear-gradient(90deg, rgba(55,220,255,.035) 1px, transparent 1px);
            background-size: 26px 26px;
        }

        #openDiv.wtra-panel > *,
        .wtra-modal > * {
            position: relative;
            z-index: 1;
        }

        .wtra-hero {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            min-height: 86px;
            padding: 14px 16px;
            overflow: hidden;
            border-bottom: 1px solid rgba(55, 220, 255, .28);
            background: linear-gradient(115deg, rgba(5,17,29,.96) 0%, rgba(7,32,51,.92) 54%, rgba(34,9,43,.88) 100%);
        }

        .wtra-hero::after {
            content: "";
            position: absolute;
            width: 390px;
            height: 180px;
            right: -80px;
            top: -70px;
            transform: rotate(-9deg);
            background:
                radial-gradient(circle at 35% 50%, rgba(255,66,200,.24), transparent 32%),
                radial-gradient(circle at 65% 45%, rgba(55,220,255,.21), transparent 35%);
            filter: blur(4px);
            pointer-events: none;
        }

        .wtra-brand {
            display: flex;
            align-items: center;
            gap: 13px;
            min-width: 0;
        }

        .wtra-logo {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 62px;
            width: 62px;
            height: 62px;
            border: 1px solid rgba(55,220,255,.65);
            border-radius: 16px;
            background:
                radial-gradient(circle at 50% 35%, rgba(55,220,255,.20), transparent 44%),
                linear-gradient(145deg, rgba(6,22,37,.96), rgba(13,8,27,.96));
            box-shadow: 0 0 17px rgba(55,220,255,.22), 0 0 28px rgba(255,66,200,.10) inset;
            font-size: 36px;
            line-height: 1;
        }

        .wtra-logo::after {
            content: "";
            position: absolute;
            left: 8px;
            right: 8px;
            bottom: 5px;
            height: 2px;
            border-radius: 2px;
            background: linear-gradient(90deg, transparent, var(--wtra-cyan), var(--wtra-magenta), transparent);
            box-shadow: 0 0 8px rgba(55,220,255,.7);
        }

        .wtra-title {
            margin: 0;
            color: var(--wtra-text);
            font-size: var(--webi-font-title);
            font-weight: 800;
            line-height: 1.05;
            letter-spacing: .1px;
        }

        .wtra-title-webi { color: var(--wtra-cyan); }
        .wtra-title-tool { color: var(--wtra-magenta); }

        .wtra-byline {
            margin-top: 5px;
            color: #d8eef8;
            font-size: var(--webi-font-small);
        }

        .wtra-byline b { color: var(--wtra-cyan); }

        .wtra-tagline {
            margin-top: 5px;
            color: var(--wtra-muted);
            font-size: var(--webi-font-small);
            letter-spacing: .15px;
        }

        .wtra-hero-motto {
            position: relative;
            z-index: 2;
            flex: 0 0 auto;
            padding-left: 15px;
            border-left: 1px solid rgba(55,220,255,.35);
            text-align: right;
            color: #82dfff;
            font-size: var(--webi-font-footer);
            line-height: 1.7;
            letter-spacing: 1.15px;
            text-transform: uppercase;
        }

        .wtra-body {
            padding: 12px;
            background: linear-gradient(180deg, rgba(4,16,27,.18), rgba(2,11,19,.34));
        }

        .wtra-intro {
            padding: 12px 13px;
            border: 1px solid var(--webi-border);
            border-bottom-color: var(--webi-separator);
            border-radius: var(--webi-radius) var(--webi-radius) 0 0;
            background: linear-gradient(180deg, rgba(12,34,52,.88), rgba(8,25,40,.90));
            color: #cfe7f3;
            font-size: var(--webi-font-body);
            line-height: 1.5;
        }

        .wtra-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(180px, 1fr));
            gap: 9px;
            margin-top: 0;
            padding: 10px;
            border: 1px solid var(--webi-border);
            border-top: 0;
            border-radius: 0 0 var(--webi-radius) var(--webi-radius);
            background: rgba(5,19,31,.86);
            box-shadow: 0 6px 18px rgba(0,0,0,.14);
        }

        .wtra-btn.btn,
        .wtra-btn {
            min-height: 38px !important;
            padding: 7px 12px !important;
            border: 1px solid rgba(55,220,255,.58) !important;
            border-radius: 7px !important;
            background: linear-gradient(180deg, rgba(10,56,78,.96), rgba(6,36,53,.96)) !important;
            color: #eafaff !important;
            box-shadow: 0 0 11px rgba(55,220,255,.10), 0 1px 0 rgba(255,255,255,.06) inset !important;
            font-family: "Segoe UI", Arial, sans-serif !important;
            font-size: var(--webi-font-body) !important;
            font-weight: 750 !important;
            text-shadow: none !important;
            cursor: pointer !important;
        }

        .wtra-btn.btn:hover,
        .wtra-btn:hover {
            border-color: var(--wtra-cyan) !important;
            background: linear-gradient(180deg, rgba(12,73,99,.98), rgba(7,46,66,.98)) !important;
            box-shadow: 0 0 16px rgba(55,220,255,.18) !important;
        }

        .wtra-btn-secondary.btn {
            border-color: rgba(255,66,200,.50) !important;
            background: linear-gradient(180deg, rgba(63,20,64,.92), rgba(34,13,47,.96)) !important;
        }

        .wtra-btn-secondary.btn:hover {
            border-color: var(--wtra-magenta) !important;
            box-shadow: 0 0 16px rgba(255,66,200,.16) !important;
        }

        .wtra-footer {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            gap: 10px;
            margin: 10px -12px -12px;
            padding: 9px 12px 10px;
            border-top: 1px solid rgba(55,220,255,.14);
            background: rgba(3,14,24,.54);
            color: #65879a;
            font-size: var(--webi-font-footer);
        }

        .wtra-footer-center {
            color: #76a8bd;
            letter-spacing: 2px;
            text-transform: uppercase;
            white-space: nowrap;
        }

        .wtra-footer-right {
            text-align: right;
            color: #9ebdca;
        }

        .wtra-footer-right b {
            color: var(--wtra-cyan);
        }


        .wtra-footer-left {
            display: flex;
            align-items: center;
            gap: 7px;
            min-width: 0;
        }


        .wtra-overlay {
            position: fixed;
            inset: 0;
            z-index: 905;
            background: rgba(1, 7, 13, .76);
            backdrop-filter: blur(2px);
        }

        .wtra-modal-wrap {
            position: fixed;
            z-index: 910;
            inset: 0;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 70px 18px 28px;
            box-sizing: border-box;
            pointer-events: none;
        }

        .wtra-modal {
            position: relative;
            width: min(820px, calc(100vw - 36px));
            max-height: calc(100vh - 100px);
            overflow: hidden;
            border: 1px solid rgba(55,220,255,.68);
            border-radius: 14px;
            background:
                radial-gradient(circle at 5% -10%, rgba(0,196,255,.19), transparent 32%),
                radial-gradient(circle at 92% 0%, rgba(255,66,200,.14), transparent 28%),
                linear-gradient(180deg, #07111d 0%, #081725 54%, #06101a 100%);
            box-shadow: 0 0 34px rgba(0, 177, 238, .18), 0 22px 65px rgba(0,0,0,.48);
            color: var(--wtra-text);
            font-family: "Segoe UI", Arial, sans-serif;
            pointer-events: auto;
        }

        .wtra-modal .wtra-hero { min-height: 72px; padding: 12px 15px; }
        .wtra-modal .wtra-logo { flex-basis: 52px; width: 52px; height: 52px; font-size: 30px; border-radius: 13px; }
        .wtra-modal .wtra-title { font-size: 21px; }

        #popupcontainer.wtra-popup-body {
            max-height: calc(100vh - 265px);
            overflow-y: auto;
            padding: 14px 15px 6px;
            box-sizing: border-box;
            background: transparent !important;
            scrollbar-color: #1e6c8a #07111d;
            scrollbar-width: thin;
        }

        .wtra-section-title {
            margin-bottom: 9px;
            color: #dff7ff;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: .25px;
        }

        .wtra-option-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1px;
            margin-bottom: 12px;
            overflow: hidden;
            padding: 1px;
            border: 1px solid var(--webi-border);
            border-radius: var(--webi-radius);
            background: var(--webi-separator);
        }

        .wtra-option {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 48px;
            padding: 9px 10px;
            box-sizing: border-box;
            border: 0;
            border-radius: 0;
            background: linear-gradient(180deg, rgba(12,34,52,.88), rgba(7,21,35,.94));
            color: #cfe7f3;
            font-size: var(--webi-font-small);
            line-height: 1.3;
            cursor: pointer;
        }

        .wtra-option:hover { border-color: rgba(55,220,255,.46); }
        .wtra-option input { width: 16px; height: 16px; accent-color: var(--wtra-cyan); }

        .wtra-types-card {
            overflow: hidden;
            border: 1px solid rgba(55,220,255,.20);
            border-radius: 9px;
            background: rgba(3,13,22,.65);
        }

        .wtra-types-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 10px;
            border-bottom: 1px solid rgba(55,220,255,.16);
            background: rgba(9,29,45,.74);
        }

        .wtra-types-toolbar-title {
            color: #d9f4ff;
            font-size: var(--webi-font-body);
            font-weight: 800;
        }

        .wtra-add.btn {
            min-height: 32px !important;
            padding: 5px 10px !important;
            font-size: var(--webi-font-compact) !important;
        }

        .wtra-types-head,
        .wtra-attack-row {
            display: grid;
            grid-template-columns: minmax(0, 1.4fr) minmax(150px, .8fr) 34px;
            gap: 9px;
            align-items: center;
        }

        .wtra-types-head {
            padding: 8px 11px 4px;
            color: #7ea5b8;
            font-size: var(--webi-font-footer);
            font-weight: 750;
            letter-spacing: .55px;
            text-transform: uppercase;
        }

        #div_command.wtra-types-list { padding-bottom: 8px; }

        .wtra-attack-row {
            margin: 0 8px;
            padding: 8px;
            border: 0;
            border-bottom: 1px solid rgba(55,220,255,.10);
            border-radius: 0;
            background: transparent;
        }

        .wtra-attack-row:last-child { border-bottom: 0; }
        .wtra-attack-row:hover { background: rgba(55,220,255,.035); }

        .wtra-input {
            width: 100% !important;
            height: 34px !important;
            margin: 0 !important;
            padding: 5px 9px !important;
            box-sizing: border-box !important;
            border: 1px solid rgba(55,220,255,.34) !important;
            border-radius: 6px !important;
            outline: none !important;
            background: #091a2a !important;
            color: #e9f9ff !important;
            box-shadow: 0 0 0 1px rgba(0,0,0,.22) inset !important;
            font-family: "Segoe UI", Arial, sans-serif !important;
            font-size: var(--webi-font-small) !important;
        }

        .wtra-input:focus {
            border-color: var(--wtra-cyan) !important;
            box-shadow: 0 0 10px rgba(55,220,255,.14) !important;
        }

        .wtra-input:disabled {
            color: #708fa0 !important;
            background: #07131f !important;
            opacity: .82;
        }

        .wtra-remove {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            padding: 0;
            border: 1px solid rgba(255,91,114,.40);
            border-radius: 7px;
            background: rgba(85,17,31,.42);
            color: #ff7186;
            font-size: 18px;
            font-weight: 800;
            line-height: 1;
            cursor: pointer;
        }

        .wtra-remove:hover {
            border-color: var(--wtra-red);
            background: rgba(116,21,39,.55);
        }

        .wtra-modal-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 10px 14px 13px;
            border-top: 1px solid rgba(55,220,255,.15);
            background: rgba(4,15,25,.76);
        }

        .wtra-modal-footer-note {
            color: #7194a6;
            font-size: var(--webi-font-footer);
        }

        #close_popup.wtra-save.btn {
            min-width: 145px;
            margin: 0 !important;
        }


        @media (max-width: 720px) {
            .wtra-hero-motto { display: none; }
            .wtra-title { font-size: 20px; }
            .wtra-actions { grid-template-columns: 1fr; }
            .wtra-option-grid { grid-template-columns: 1fr; }
            .wtra-types-head,
            .wtra-attack-row { grid-template-columns: 1fr 1fr 32px; }
            .wtra-footer { grid-template-columns: 1fr; text-align: center; }
            .wtra-footer-right { text-align: center; }
            .wtra-modal-wrap { padding: 25px 8px 14px; }
            .wtra-modal { width: calc(100vw - 16px); max-height: calc(100vh - 40px); }
            #popupcontainer.wtra-popup-body { max-height: calc(100vh - 210px); }
        }

        /* Rename Attaques — Webi-Time 2026 minimal */
        #openDiv.wtra-panel { margin:12px 0 18px !important; border:1px solid rgba(148,163,184,.20); border-radius:14px; background:#0d141c; box-shadow:0 12px 30px rgba(0,0,0,.20); color:var(--webi-text); font-family:"Segoe UI Variable","Segoe UI",system-ui,-apple-system,sans-serif; }
        #openDiv.wtra-panel::before,.wtra-hero::after,.wtra-logo::after { display:none; }
        .wtra-hero { min-height:68px; padding:13px 16px; border-bottom:1px solid rgba(148,163,184,.14); background:#101821; }
        .wtra-brand { gap:11px; }
        .wtra-logo { flex-basis:44px; width:44px; height:44px; border:1px solid rgba(148,163,184,.18); border-radius:11px; background:#0b1219; box-shadow:none; font-size:27px; }
        .wtra-title { font-size:var(--webi-font-title); font-weight:700; letter-spacing:-.35px; text-shadow:none; }
        .wtra-title-webi { color:#dce7ef; } .wtra-title-tool { color:var(--webi-cyan); }
        .wtra-byline,.wtra-tagline { margin-top:3px; color:#8292a5; font-size:var(--webi-font-small); }
        .wtra-byline b { color:#b7c8d5; }
        .wtra-hero-motto { padding-left:14px; border-left:1px solid rgba(148,163,184,.14); color:#68798b; font-size:10px; line-height:1.55; letter-spacing:.85px; }
        .wtra-body { padding:12px; }
        .wtra-intro { padding:11px 12px; border:1px solid rgba(148,163,184,.14); border-radius:10px 10px 0 0; background:#101821; color:#b9c6d0; box-shadow:none; }
        .wtra-actions { gap:1px; margin-top:0; padding:1px; border:1px solid rgba(148,163,184,.14); border-top:0; border-radius:0 0 10px 10px; background:rgba(148,163,184,.10); overflow:hidden; }
        .wtra-btn.btn,.wtra-btn { min-height:39px !important; border:0 !important; border-radius:0 !important; background:#111b24 !important; color:#d7e1e9 !important; box-shadow:none !important; font-weight:650 !important; }
        .wtra-btn.btn:hover,.wtra-btn:hover { background:#172630 !important; color:#eef7fb !important; box-shadow:none !important; }
        .wtra-btn-secondary.btn { border:0 !important; background:#141923 !important; color:#c6d0d9 !important; }
        .wtra-btn-secondary.btn:hover { background:#1c202b !important; box-shadow:none !important; }
        .wtra-footer { margin:10px 0 0; padding:8px 2px 0; border-top:1px solid rgba(148,163,184,.10); background:transparent; color:#607183; }
        .wtra-footer-center { color:#66788a; letter-spacing:1.35px; } .wtra-footer-right { color:#77899a; } .wtra-footer-right b { color:#a7bac8; }
        .wtra-modal { border-color:rgba(148,163,184,.20); border-radius:14px; background:#0d141c; box-shadow:0 20px 55px rgba(0,0,0,.42); }
        .wtra-modal::before { display:none; }
        .wtra-modal .wtra-hero { min-height:62px; padding:11px 14px; }
        #popupcontainer.wtra-popup-body { background:#0d141c !important; }
        .wtra-section-title { color:#cdd9e2; font-size:var(--webi-font-body); font-weight:700; }
        .wtra-option-grid { gap:1px; padding:1px; border-color:rgba(148,163,184,.14); border-radius:10px; background:rgba(148,163,184,.10); }
        .wtra-option { min-height:46px; border:0; background:#101821; color:#b9c6d0; }
        .wtra-option:hover { background:#14202a; }
        .wtra-types-card { border-color:rgba(148,163,184,.14); border-radius:10px; background:#0a1118; }
        .wtra-types-toolbar { border-bottom-color:rgba(148,163,184,.11); background:#101821; }
        .wtra-types-toolbar-title { color:#c7d3dc; font-weight:700; }
        .wtra-types-head { color:#68798b; }
        .wtra-attack-row { border-bottom-color:rgba(148,163,184,.09); }
        .wtra-attack-row:hover { background:rgba(148,163,184,.035); }
        .wtra-input { border-color:rgba(148,163,184,.18) !important; border-radius:7px !important; background:#0b1219 !important; color:#dce5ec !important; box-shadow:none !important; }
        .wtra-input:focus { border-color:rgba(95,211,234,.58) !important; box-shadow:0 0 0 2px rgba(95,211,234,.08) !important; }
        .wtra-remove { border-color:rgba(240,116,134,.28); border-radius:7px; background:transparent; color:#c97986; }
        .wtra-remove:hover { border-color:rgba(240,116,134,.52); background:rgba(240,116,134,.08); }
        .wtra-modal-footer { border-top-color:rgba(148,163,184,.10); background:#0a1118; }

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
            buildSettingsMarkup,
            bindSettingsPopover,
            injectIntelStyles,
            injectRenameStyles
        });
    }

    window.WebiTimeGT = createWebiTimeSharedUi();
    window.WebiTimeGT.injectStyles();

    console.log('[Webi-Time GT Common] chargé');
})(window);
