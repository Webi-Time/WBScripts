/*This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. */

let attack_rows = $('#commands_table')[0];
let typeAttackTable = 2; // numÃ©ro de type d'attaque de la table type attaque
let inputTable = [];
let popCreated = false
let undefinedUnits = false; //true or false --> if user decide to rename with default parameters or not
let debug = false;
let DebugNameAttaque = false;
let DebugCookies = false;
var playerName = '';
var forceRename = true;


const WEBITIME_RENAME_NAME = 'Webi-Time Rename Attaques';
const WEBITIME_RENAME_AUTHOR = 'NoLife4Ever';
const WEBITIME_RENAME_VERSION = '1.10';
const WEBITIME_RENAME_STYLE_ID = 'webiTimeRenameAttackStyle';
const WEBITIME_SOURCE_URL = 'https://github.com/Webi-Time/WBScripts/tree/GT/Datas';

function createWebiTimeSharedUi() {
    const STYLE_ID = 'webiTimeSharedUiStyle';
    const SETTINGS_CLOSE_DELAY_MS = 800;

    const theme = Object.freeze({
        colors: Object.freeze({
            bg: '#07111d',
            bgSoft: '#0b1a2a',
            panel: 'rgba(8, 24, 39, .92)',
            panel2: 'rgba(10, 31, 50, .86)',
            line: 'rgba(55, 220, 255, .34)',
            cyan: '#37dcff',
            cyan2: '#00b9f5',
            magenta: '#ff42c8',
            orange: '#ff7a2c',
            green: '#43e7a3',
            red: '#ff5b72',
            yellow: '#ffc857',
            text: '#eaf8ff',
            muted: '#8eb5c9'
        }),
        fonts: Object.freeze({
            title: '24px',
            body: '14px',
            small: '13px',
            compact: '12px',
            footer: '11px',
            modalTitle: '19px'
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

    return Object.freeze({
        theme,
        injectStyles,
        buildIssueUrl,
        getStoredFlag,
        setStoredFlag,
        redirectToScreen,
        showRedirectDialog,
        buildSettingsMarkup,
        bindSettingsPopover
    });
}

const WEBITIME_UI = createWebiTimeSharedUi();
const WEBITIME_RENAME_GITHUB_ISSUES_URL = WEBITIME_UI.buildIssueUrl('GT-RenameAttaqueSortante', WEBITIME_SOURCE_URL);

function injectWebiTimeRenameStyles() {
    WEBITIME_UI.injectStyles();
    if (document.getElementById(WEBITIME_RENAME_STYLE_ID)) return;

    const css = `
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
            border: 1px solid rgba(55, 220, 255, .68);
            border-radius: 13px;
            background:
                radial-gradient(circle at 10% -20%, rgba(0, 196, 255, .22), transparent 34%),
                radial-gradient(circle at 86% 0%, rgba(255, 66, 200, .16), transparent 28%),
                radial-gradient(circle at 95% 115%, rgba(255, 122, 44, .14), transparent 30%),
                linear-gradient(180deg, #07111d 0%, #081725 52%, #06101a 100%);
            box-shadow:
                0 0 0 1px rgba(0, 0, 0, .55) inset,
                0 0 24px rgba(0, 177, 238, .16),
                0 7px 18px rgba(15, 12, 25, .30);
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
            min-height: 88px;
            padding: 15px 18px;
            overflow: hidden;
            border-bottom: 1px solid rgba(55, 220, 255, .42);
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
            padding: 14px;
        }

        .wtra-intro {
            padding: 11px 13px;
            border: 1px solid rgba(55,220,255,.20);
            border-radius: 8px;
            background: linear-gradient(180deg, rgba(13,34,52,.84), rgba(7,21,35,.90));
            color: #cfe7f3;
            font-size: var(--webi-font-body);
            line-height: 1.5;
        }

        .wtra-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(180px, 1fr));
            gap: 10px;
            margin-top: 11px;
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
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid rgba(55,220,255,.16);
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
            gap: 8px;
            margin-bottom: 12px;
        }

        .wtra-option {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 48px;
            padding: 9px 10px;
            box-sizing: border-box;
            border: 1px solid rgba(55,220,255,.20);
            border-radius: 8px;
            background: linear-gradient(180deg, rgba(13,34,52,.84), rgba(7,21,35,.90));
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
            margin: 5px 8px;
            padding: 7px 8px;
            border: 1px solid rgba(55,220,255,.13);
            border-radius: 7px;
            background: rgba(10,28,43,.70);
        }

        .wtra-attack-row:hover { border-color: rgba(55,220,255,.31); }

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
    `;

    $('<style>', { id: WEBITIME_RENAME_STYLE_ID, text: css }).appendTo('head');
}

function escapeWebiAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function buildAttackTypeRow(index, name, min, disabled, removable) {
    const rowId = removable ? ' id="BtnAdd' + index + '"' : '';
    const disabledAttr = disabled ? ' disabled="disabled"' : '';
    const removeButton = removable
        ? '<button type="button" class="wtra-remove" onclick="RemoveTypeAttaqueLine(' + index + ')" title="Supprimer ce type">×</button>'
        : '<span></span>';

    return (
        '<div class="btn_group wtra-attack-row"' + rowId + '>' +
            '<input id="nameNuke' + index + '" value="' + escapeWebiAttr(name) + '" class="nameInput wtra-input" type="text" placeholder="' + escapeWebiAttr(translator('attackName')) + '" />' +
            '<input id="minNb' + index + '" value="' + escapeWebiAttr(min) + '" class="valueInput wtra-input" type="text" placeholder="' + escapeWebiAttr(translator('minNumber')) + '"' + disabledAttr + ' />' +
            removeButton +
        '</div>'
    );
}
const UNIT_NAMES = {
    0: "Lance",
    1: "PE",
    2: "Hache",
    3: "Archet",
    4: "Scoot",
    5: "Cav",
    6: "AM",
    7: "Lourd",
    8: "Bélier",
    9: "Cata",
    10: "Palouf",
    11: "Noble"
};
//-------------------------------------------------- Debut - Pour le changement de page --------------------------------------------------
class Config_Config {
     constructor(id) {
         this.id = id;
         this.props = {};
         this._loadCachedData();
     }
 
     get(prop, defaultValue) {
         return getProp(this.props, prop, defaultValue);
     }
 
     set(prop, value) {
         setProp(this.props, prop, value);
         this._save();
     }
 
     initProps(props) {
         this.props = props;
     }
 
     /**
      * @protected
      * @return {object|null}
      */
     _loadCachedData() {
         let saved = window.localStorage.getItem(this.id);
         if (saved) {
             let data = JSON.parse(saved);
 
             // should ideally be data.props
             // But for backwards compatibility, the data could be the props too.
             this.props = data.props || data;
             return data;
         }
         return null;
     }
 
     /**
      * @final
      * @protected
      */
     _save() {
         this._beforeSave();
         window.localStorage.setItem(this.id, JSON.stringify(this._getCacheableData()));
     }
 
     /**
      * @protected
      */
     _beforeSave() {
         
     }
 
     /**
      * @protected
      * @return {object}
      */
     _getCacheableData() {
         return {
             props: this.props
         };
     }
 
}
class RemoteConfig_RemoteConfig extends Config_Config {
 
     /**
      * @param {string} url 
      */
     setUrl(url) {
         this.url = url;
         return this;
     }
 
     /**
      * @param {number} seconds 
      */
     setTtl(seconds) {
         this.ttl = seconds * 1000;
         return this;
     }
 
     async ensureUpdated() {
         if (this.needsUpdate()) {
             await this.update();
         }    
     }
 
     needsUpdate() {
         let now = new Date().getTime();
         let ttl = this.ttl || 86400;
         return !this.timeUpdated || ttl < now - this.timeUpdated;
     }
 
     async update() {
         let xmlDoc = await requestXml(this.url);
         this._processXml(xmlDoc);
         this._save();
     }
 
     /**
      * @protected
      * @param {XMLDocument} xmlDoc 
      */
     _processXml(xmlDoc) {
         this.props = parseXmlNode(xmlDoc).config;
     }
 
     /**
      * @protected
      * @return {object|null}
      */
     _loadCachedData() {
         let data = super._loadCachedData();
         if (data) {
             this.timeUpdated = data.timeUpdated;
         }
     }
 
     /**
      * @protected
      */
     _beforeSave() {
         this.timeUpdated = new Date().getTime();
     }
 
     /**
      * @protected
      * @return {object}
      */
     _getCacheableData() {
         return Object.assign({}, super._getCacheableData(), {
             timeUpdated: this.timeUpdated
         });
     }
 
 }

// Redirection commune Webi-Time : même composant et même comportement que GT Intel Villages.
function suggestRedirect(options) {
    let { message, screen, screenName, uriParams, skippableId } = options;
    message = message || "{{Un génie a oublié d'écrire un message ici}}";
    screenName = screenName || "{{Nom de l'écran ici}}";
    uriParams = uriParams || {};

    if (!screen) throw Error('Un écran doit être spécifié !');

    WEBITIME_UI.showRedirectDialog({
        rootId: 'webiTimeRedirectModalRoot',
        eventNamespace: 'webiTimeRedirect',
        title: 'Redirection vers ' + screenName,
        message,
        infoMessage: `Redirection vers <strong>${screenName}</strong>...`,
        getPreference: () => skippableId ? userConfig.get(skipKey(skippableId), false) : false,
        setPreference: enabled => {
            if (skippableId) userConfig.set(skipKey(skippableId), enabled);
        },
        redirect: () => WEBITIME_UI.redirectToScreen(screen, uriParams)
    });
}

function skipKey(skippableId) {
    return 'suggestRedirect.skip.' + skippableId;
}

function getProp(object, propPath, defaultValue) {
    let tokens = propPath.split('.');
    for (let i = 0; i < tokens.length - 1; i++) {
        let token = tokens[i];
        if (typeof object[token] !== 'object' || token === null) {
            return defaultValue;
        }
        object = object[token];
    }
    let value = object[tokens[tokens.length - 1]];
    return (typeof value === 'undefined') ? defaultValue : value;
}

function setProp(object, propPath, value) {
    let tokens = propPath.split('.');
    for (let i = 0; i < tokens.length - 1; i++) {
        let token = tokens[i];
        if (typeof object[token] !== 'object' || token === null) {
            object[token] = {};
        }
        object = object[token];
    }
    object[tokens[tokens.length - 1]] = value;
}

function suggestRedirectToCommandsOverview() {
    suggestRedirect({
        message: `
            <p>Pour l'utiliser, tu dois être sur l'interface des ordres.</p>
            <p>Le script doit être lancé depuis l'onglet <strong>Attaques sortantes</strong>.</p>`,
        screen: 'overview_villages',
        screenName: 'Ordres - Attaques sortantes',
        uriParams: {
            mode: 'commands',
            type: 'attack'
        },
        // Clé propre à ce script. La préférence est stockée dans localStorage
        // sous twcheese.userConfig > suggestRedirect.skip.Tool:RenameAttaqueSortante.
        skippableId: 'Tool:RenameAttaqueSortante'
    });
}

function atCommandsOverview() {
    try {
        const url = new URL(window.location.href);
        return url.searchParams.get('screen') === 'overview_villages' &&
               url.searchParams.get('mode') === 'commands' &&
               url.searchParams.get('type') === 'attack';
    } catch (_) {
        const here = document.location.href;
        return here.includes('screen=overview_villages') &&
               here.includes('mode=commands') &&
               here.includes('type=attack');
    }
}

let userConfig = new Config_Config('twcheese.userConfig');
//-------------------------------------------------- Fin - Pour le changement de page --------------------------------------------------



function run(){
    injectWebiTimeRenameStyles();
    //-------------------------------------------------- Debut - Pour le changement de page --------------------------------------------------
    if (!atCommandsOverview()) {
            suggestRedirectToCommandsOverview();
            return;
    }
    //-------------------------------------------------- Fin - Pour le changement de page --------------------------------------------------
    $.getScript( "https://media.innogamescdn.com/com_DS_FR/Scripts/vendor/translation.js" )
        .done(function( script, textStatus ) {
            drawStep1()
        })
        .fail(function( jqxhr, settings, exception ) {
            console.error("Impossible de charger vendor/utils.js")
        });

}
run();


/**
 * Function to add buttons in the top of attacks order to choose "Rename" or "custom"
 */
function drawStep1()
{
    injectWebiTimeRenameStyles();
    $('#openDiv').remove();

    const html = `
        <div id="openDiv" class="wtra-panel">
            <div class="wtra-hero">
                <div class="wtra-brand">
                    <div class="wtra-logo" aria-hidden="true">🐼</div>
                    <div>
                        <div class="wtra-title">
                            <span class="wtra-title-webi">Webi-Time</span><span class="wtra-title-tool"> Rename Attaques</span>
                        </div>
                        <div class="wtra-byline">par <b>${WEBITIME_RENAME_AUTHOR}</b> &nbsp;•&nbsp; gestion des attaques sortantes</div>
                        <div class="wtra-tagline">Des ordres propres. Des timings lisibles. Une vue plus efficace.</div>
                    </div>
                </div>
                <div class="wtra-hero-motto">
                    IDENTIFIER<br>
                    CLASSER<br>
                    RENOMMER<br>
                    GARDER LE CONTRÔLE
                </div>
            </div>

            <div class="wtra-body">
                <div class="wtra-intro">
                    <b>${translator('renameOrder')}</b><br>
                    <span>${translator('explanation')}</span>
                </div>
                <div class="wtra-actions">
                    <button class="btn wtra-btn" id="process">⚡ ${translator('rename')}</button>
                    <button name="setup" id="showParameters" class="btn wtra-btn wtra-btn-secondary">⚙ ${translator('attackPerso')}</button>
                </div>
                <div class="wtra-footer">
                    <span class="wtra-footer-left">
                        ${WEBITIME_UI.buildSettingsMarkup('wtra_clear_saved_data', 'wtra_report_bug')}
                        <span>Version ${WEBITIME_RENAME_VERSION}</span>
                    </span>
                    <span class="wtra-footer-center">Intelligence &nbsp;■&nbsp; Organisation &nbsp;■&nbsp; Supériorité</span>
                    <span class="wtra-footer-right">🐼 <b>Webi-Time</b> &nbsp;|&nbsp; réalisé par ${WEBITIME_RENAME_AUTHOR}</span>
                </div>
            </div>
        </div>`;

    $('#paged_view_content').prepend(html);
    handleShowParamBtn();
    handleProcessBtn();
    handleInformationButton();
}

function clearSavedRenameData() {
    // Configuration des types d'attaque et options de renommage.
    document.cookie = 'twAttackConfig=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

    // Préférence de redirection : on ne supprime que la donnée de CE script,
    // car twcheese.userConfig peut être partagé avec d'autres scripts.
    try {
        if (userConfig && userConfig.props) {
            const redirect = userConfig.props.suggestRedirect;
            const skip = redirect && redirect.skip;

            if (skip && Object.prototype.hasOwnProperty.call(skip, 'Tool:RenameAttaqueSortante')) {
                delete skip['Tool:RenameAttaqueSortante'];
            }
            if (skip && Object.keys(skip).length === 0) delete redirect.skip;
            if (redirect && Object.keys(redirect).length === 0) delete userConfig.props.suggestRedirect;

            userConfig._save();
        }
    } catch (error) {
        console.warn('[Webi-Time Rename Attaques] Impossible de nettoyer la préférence de redirection.', error);
    }

    inputTable = [];
    typeAttackTable = 2;
    undefinedUnits = false;
}

function handleInformationButton() {
    WEBITIME_UI.bindSettingsPopover({
        containerSelector: '#openDiv',
        clearButtonSelector: '#wtra_clear_saved_data',
        bugButtonSelector: '#wtra_report_bug',
        bugUrl: WEBITIME_RENAME_GITHUB_ISSUES_URL,
        onClear: clearSavedRenameData,
        successMessage: 'Données enregistrées supprimées.'
    });
}

function putPopupInPage(popup_html, popup_container_html)
{
    if (!popCreated){
        $('body').append(popup_html);
        popCreated = true;
    } else {
        $('body').show(popup_html);
    }
    $('#popupcontainer').empty().append(popup_container_html);
    handleClosePopup();
}


/**
 * Function to create html of the step 1 pop-up
 */
function AddButtonType() {
    return (
        '<div class="wtra-types-toolbar">' +
            '<div class="wtra-types-toolbar-title">Types d\'attaque</div>' +
            '<button id="addAttackType" type="button" onclick="addTypeAttack()" class="btn wtra-btn wtra-add">+ Ajouter un type</button>' +
        '</div>' +
        '<div class="wtra-types-head">' +
            '<span>' + escapeWebiAttr(translator('attaqueName')) + '</span>' +
            '<span>' + escapeWebiAttr(translator('minimalTroopsForm')) + '</span>' +
            '<span></span>' +
        '</div>'
    );
}
function drawPopupStep1()
{
    injectWebiTimeRenameStyles();

    const step1_html =
        '<div class="wtra-section-title">Configuration du renommage</div>' +
        '<div class="wtra-option-grid">' +
            '<label class="wtra-option">' +
                '<input onclick="handleRenamePlayer()" type="checkbox" id="renamePlayer">' +
                '<span>Inclure le nom du joueur cible</span>' +
            '</label>' +
            '<label class="wtra-option">' +
                '<input onclick="handleRenameVillage()" type="checkbox" id="renameVillage">' +
                '<span>Inclure le nom du village cible</span>' +
            '</label>' +
            '<label class="wtra-option">' +
                '<input onclick="handleRenameTroupes()" type="checkbox" id="renameTroupes">' +
                '<span>Inclure le détail des troupes</span>' +
            '</label>' +
        '</div>' +
        '<div class="wtra-types-card">' +
            '<div id="div_command" class="wtra-types-list">' +
                AddButtonType() +
                buildAttackTypeRow(0, 'Fake', 0, true, false) +
                buildAttackTypeRow(1, 'Kinder', 1000, false, false) +
                buildAttackTypeRow(2, 'OFF', 6000, false, false) +
            '</div>' +
        '</div>';

    const popup_step1 = drawSkeletonPopup('select_troop_counter');
    if (!popCreated) {
        putPopupInPage(popup_step1, step1_html);
        handleValueInput();
    }

    $('#select_troop_counter').fadeIn(140);
    restoreAttackConfig();
    current_opened_popup_id = 'select_troop_counter';
}
/*
Add type attack on popup
 */

function RemoveTypeAttaqueLine(index) {
    $("#BtnAdd" + index).remove();
    saveAttackConfig();
    inputFormat();
    restoreAttackConfig();
}

function addTypeAttack(){
    typeAttackTable ++;
    if (debug) console.log ('--- Bouton [Ajouter attaque] appuyer');

    $('#div_command').append(
        buildAttackTypeRow(typeAttackTable, '', '', false, true)
    );

    handleValueInput();
    handleNameInput();
    inputFormat();
    saveAttackConfig();
}

/*
get the size of the attack
 */

function getSizeOfAttack(attack_row_index) {

    let changeRow = attack_rows.rows[attack_row_index];
    let units = $(changeRow).find('.unit-item');
    let sum = [];
    let total = 0;

    for (let unitColumn = 0; unitColumn < units.length; unitColumn++) {
        let value = parseInt(units[unitColumn].textContent, 10) || 0;

        total += value;
        let name = UNIT_NAMES[unitColumn] || `NA`;
        if (value != 0) {
            sum.push({
                unitColumn,
                unitName: name,
                NBUnit: value
            });
        }
        
    }

    return {
        Units: sum,
        TotalUnits: total
    };
}

/*
get the URL target for each attack
 */
function getUrlTarget(rowAttack){
    return window.location.origin + $(rowAttack).find('a').attr('href');
    if (debug) console.log("getting URL of each attack")
}
/*
get the name's player target in the attack page
 */
function getAttackTargetInfo(urlTarget) {
    return $.ajax({
        url: urlTarget,
        method: 'POST'
    }).then(function (data) {
        const page = $(data);
        const pageText = page.text();

        // Recherche prioritaire dans une ligne explicitement liée à la cible.
        // Le fallback conserve le dernier lien info_village de la table de commande.
        let villageName = '';
        page.find('.vis tr').each(function () {
            const rowText = $(this).text().trim().toLowerCase();
            const isTargetRow = rowText.includes('cible') || rowText.includes('destination');

            if (isTargetRow) {
                const targetLink = $(this).find('a').filter(function () {
                    return ($(this).attr('href') || '').includes('screen=info_village');
                }).last();

                if (targetLink.length) {
                    villageName = targetLink.text().trim();
                    return false;
                }
            }
        });

        if (!villageName) {
            const villageLinks = page.find('.vis a').filter(function () {
                return ($(this).attr('href') || '').includes('screen=info_village');
            });
            villageName = villageLinks.last().text().trim();
        }

        villageName = villageName || 'Village inconnu';

        // Recherche du propriétaire via son lien, avec conservation d'un fallback
        // compatible avec l'ancienne méthode du script.
        let playerName = page.find('.vis a').filter(function () {
            return ($(this).attr('href') || '').includes('screen=info_player');
        }).last().text().trim();

        if (!playerName) {
            playerName = page.find('.vis').find('tr').find('a')[3]?.textContent?.trim() || '';
        }

        if (!playerName || pageText.includes('Village barbare')) playerName = 'Village Barbare';
        else if (pageText.includes('Village bonus')) playerName = 'Village Bonus';

        if (DebugNameAttaque) {
            console.log('SUM - villageName = ' + villageName);
            console.log('SUM - playerName = ' + playerName);
        }

        return {
            villageName: villageName,
            playerName: playerName
        };
    });
}

function getNameOfAttackAccordingToPlayerName(urlTarget) {
    return getAttackTargetInfo(urlTarget).then(function (targetInfo) {
        return targetInfo.playerName;
    });
}

function getNameOfAttackAccordingToVillageName(urlTarget) {
    return getAttackTargetInfo(urlTarget).then(function (targetInfo) {
        return targetInfo.villageName;
    });
}



function getNameOfAttackAccordingToPlayerTroupes(sum) {

        let Units = sum.Units;
        let texte = "";

        for (let index = 0; index < Units.length; index++) {
            if (index==0) {texte += ' - ' + Units[index].NBUnit + ' ' + Units[index].unitName ; }
            else {texte += ' | ' + Units[index].NBUnit + ' ' + Units[index].unitName ; }
        }   
        if (DebugNameAttaque) console.log("SUM - Getting the Player Troupes : " + texte);
        return texte;
        

}

/*
Entry the size and the fonction return the name of the attack
 */
function getNameOfAttackAccordingToSize(sizeAttack){
if (debug) console.log ('BAME--- sizeAttack =' + sizeAttack);
if (debug) console.log ('inputTable =' + inputTable.length);
if (debug) inputTable;

    if (undefinedUnits){
        for(let i = 0 ; i<inputTable.length; i++){
            if (inputTable[i+1] !== undefined){
                if (sizeAttack > inputTable[i] && sizeAttack <= inputTable[i+1]){
                    name = $('#nameNuke'+i).val()
                    if (DebugNameAttaque) console.log("SUM - Getting the Size Name : " + name + "entre " + inputTable[i] + " et " + inputTable[(i+1)])
                    break;

                }
            } 
            if (inputTable[i+1] === undefined){
                if (DebugNameAttaque) console.log("SUM - Getting the Size name of the last input : " + $('#nameNuke'+i-1).val())
                name = $('#nameNuke'+i).val();
                break;
            }
        }
    } if(!undefinedUnits) {
        if (DebugNameAttaque) console.log("SUM - Getting the Size Name of the attack by default");
        if (sizeAttack > 0 && sizeAttack < 1000){
            name = 'fake'
        } if (sizeAttack >= 1000 && sizeAttack <= 6000){
            name = 'kinder'
        } if (sizeAttack >= 6000){
            name = 'OFF'
        }
    }
    return name;
}



function saveAttackConfig() {

    let config = [];

    for (let i = 0; i <= typeAttackTable; i++) {

        const name = $('#nameNuke' + i).val();
        const min = $('#minNb' + i).val();

        if (name !== undefined && min !== undefined) {

            config.push({
                name: name,
                min: min
            });
        }
    }
  
    const renameTroupes = $('#renameTroupes').is(':checked');
    const renamePlayer = $('#renamePlayer').is(':checked');
    const renameVillage = $('#renameVillage').is(':checked');

    if (renameTroupes) {
        config.push({
            renameTroupes: renameTroupes
        });
    }
    if (renamePlayer) {
        config.push({
            renamePlayer: renamePlayer
        });
    }
    if (renameVillage) {
        config.push({
            renameVillage: renameVillage
        });
    }
    if (debug) console.log('[Sauvegarde] Save config dans les cookies');
    if (DebugCookies) console.log(config);
    const expireDate = new Date();
    expireDate.setFullYear(expireDate.getFullYear() + 1);

    document.cookie =
        'twAttackConfig=' +
        encodeURIComponent(JSON.stringify(config)) +
        '; expires=' + expireDate.toUTCString() +
        '; path=/';
}
function loadAttackConfig() {

    const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('twAttackConfig='));

    if (!cookie) {
        return null;
    }

    try {

        return JSON.parse(
            decodeURIComponent(cookie.split('=')[1])
        );

    } catch (e) {

        console.error('Erreur lecture cookie', e);
        return null;
    }
}
function restoreAttackConfig() {

    const config = loadAttackConfig();

    if (!config || !config.length) {
        return;
    }
    if(DebugCookies){console.log('Cookies :');config;}
    
    $('#div_command').html('');

    let html_typeAdd = AddButtonType();
    $('#div_command').append(html_typeAdd);

    

    const attackTypes = config.filter(function (entry) {
        return entry && Object.prototype.hasOwnProperty.call(entry, 'name');
    });
    typeAttackTable = Math.max(attackTypes.length - 1, 0);

    config.forEach(function (entry) {
        if (entry && Object.prototype.hasOwnProperty.call(entry, 'renameTroupes')) {
            $('#renameTroupes').prop('checked', entry.renameTroupes);
        }
        if (entry && Object.prototype.hasOwnProperty.call(entry, 'renamePlayer')) {
            $('#renamePlayer').prop('checked', entry.renamePlayer);
        }
        if (entry && Object.prototype.hasOwnProperty.call(entry, 'renameVillage')) {
            $('#renameVillage').prop('checked', entry.renameVillage);
        }
    });

    attackTypes.forEach((entry, index) => {
        if (!entry || !Object.prototype.hasOwnProperty.call(entry, 'name')) return;
        $('#div_command').append(
            buildAttackTypeRow(
                index,
                entry.name,
                entry.min,
                index === 0,
                index > 2
            )
        );
    });

    handleValueInput();
    handleNameInput();
}


/*
Format the diferents input into a table
*/
function inputFormat(){
    inputTable=[];
    for (let i = 0; i <= typeAttackTable ; i++){
        if ($('#minNb'+i).val() !== "" && $('#nameNuke'+i).val() !== "") {
            inputTable.push($('#minNb' + i).val())
        }
    }
    if (DebugCookies) console.log("Sauvegarde des Min Troupes : " + inputTable)
}

/*
Process the changeName of each attack. It's the main function in the script who call the others functions
*/
function changeName(row_counter){
    setTimeout(function(){
        row_counter++;
        let changeRow = attack_rows.rows[row_counter];

        if (!changeRow) {
            return;
        }

        let textRow = ($(changeRow).find('.quickedit-label')).text();
        // filtrage : ne commence PAS par Attaque ou Retour
        if (textRow.includes('Attaque') || textRow.includes('Retour') || forceRename) {
            let changeButton = $(changeRow).find('.rename-icon');
            changeButton.click();

            let changeValue = $(changeRow).find('.quickedit-edit input[type="text"]');
            let sum = getSizeOfAttack(row_counter);
            let sizeName = getNameOfAttackAccordingToSize(sum.TotalUnits);
            let troopsName = getNameOfAttackAccordingToPlayerTroupes(sum);

            const includePlayer = $('#renamePlayer').is(':checked');
            const includeVillage = $('#renameVillage').is(':checked');
            const includeTroops = $('#renameTroupes').is(':checked');

            function submitName(targetInfo) {
                const nameParts = [sizeName];

                if (includeVillage && targetInfo && targetInfo.villageName) {
                    nameParts.push(targetInfo.villageName);
                }
                if (includePlayer && targetInfo && targetInfo.playerName) {
                    nameParts.push(targetInfo.playerName);
                }

                let finalName = nameParts.join(' - ');
                if (includeTroops) {
                    finalName += troopsName;
                }

                changeValue.val(finalName);
                let submitButton = $(changeRow).find('.quickedit-edit input[type="button"]');
                submitButton.click();
            }

            if (includePlayer || includeVillage) {
                getAttackTargetInfo(getUrlTarget(changeRow))
                    .then(submitName)
                    .catch(function (error) {
                        console.error('Impossible de récupérer les informations du village cible', error);
                        submitName(null);
                    });
            } else {
                submitName(null);
            }
        }

        if (debug === true && row_counter === 10) return;
        if (row_counter <= attack_rows.rows.length - 2) {
            changeName(row_counter);
        }
    }, 250);
}




// UTILS

function translator(string){
    let gameLocale = game_data.locale;
    if (translation[gameLocale] !== undefined){
        return translation[gameLocale][string];
    } else {
        return console.error('game_data. local not found, please set the translation in the var translation at the top of the project')
    }
}
function drawSkeletonPopup(popup_id){
    injectWebiTimeRenameStyles();

    return (
        '<div id="' + popup_id + '" style="position:fixed;inset:0;z-index:900;">' +
            '<div id="close_popup_div" class="wtra-overlay"></div>' +
            '<div class="wtra-modal-wrap">' +
                '<div class="wtra-modal">' +
                    '<div class="wtra-hero">' +
                        '<div class="wtra-brand">' +
                            '<div class="wtra-logo" aria-hidden="true">🐼</div>' +
                            '<div>' +
                                '<div class="wtra-title"><span class="wtra-title-webi">Webi-Time</span><span class="wtra-title-tool"> Rename Attaques</span></div>' +
                                '<div class="wtra-byline">par <b>' + WEBITIME_RENAME_AUTHOR + '</b> &nbsp;•&nbsp; paramètres de renommage</div>' +
                                '<div class="wtra-tagline">Personnalise le nom des attaques sans perdre la lisibilité.</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="wtra-hero-motto">CONFIGURER<br>CLASSER<br>SAUVEGARDER</div>' +
                    '</div>' +
                    '<div id="popupcontainer" class="wtra-popup-body"></div>' +
                    '<div class="wtra-modal-footer">' +
                        '<div class="wtra-modal-footer-note"><b style="color:#37dcff;">Webi-Time</b> • configuration mémorisée pour les prochaines utilisations</div>' +
                        '<button id="close_popup" class="btn wtra-btn wtra-save">✓ ' + escapeWebiAttr(translator('save')) + '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>'
    );
}
function handleClosePopup(){

    $('#close_popup').click(function(){
        if (debug) console.log ('--- Bouton [Sauvegarder] appuyer');

        inputFormat();
        $('#'+current_opened_popup_id).hide();        
        saveAttackConfig();
    });

    $('#close_popup_div').click(function(){
        if (debug) console.log ('--- Bouton [Sauvegarder] appuyer - Clique en dehors du cadre');
        inputFormat();
        $('#'+current_opened_popup_id).hide();
        saveAttackConfig();
    });
}
function handleProcessBtn(){
    $('#process').click(function(){
        if (debug) console.log ('--- Bouton [Renommer] appuyer');
        drawPopupStep1();
        inputFormat(); 
        restoreAttackConfig();
        current_opened_popup_id = 'select_troop_counter';
        handleClosePopup();
        $('#'+current_opened_popup_id).hide();
        changeName(0);
    });
}
function handleAddAttackTypeBtn(){
    $('#addAttackType').click(function(){
        if (debug) console.log ('--- Bouton [Ajouter Attaque] appuyer');
        addTypeAttack();
    });
}
function handleShowParamBtn(){
    $('#showParameters').click(function(){
        if (debug) console.log ('--- Bouton [Personnaliser] appuyer');
        drawPopupStep1();
    });
}

function handleRenamePlayer(){
    if (debug) console.log ('--- Case [Joueur] appuyé');
    saveAttackConfig();
    inputFormat();
    restoreAttackConfig();
}
function handleRenameVillage(){
    if (debug) console.log ('--- Case [Village cible] appuyé');
    saveAttackConfig();
    inputFormat();
    restoreAttackConfig();
}
function handleRenameTroupes(){
    if (debug) console.log ('--- Case [Troupes] appuyé');
    saveAttackConfig();
    inputFormat();
    restoreAttackConfig();
}

function handleValueInput(){
    undefinedUnits = true;
    $('.valueInput').change(function(){
        idInput = this.id;
        idNbrInput = parseInt(idInput.substr(5))
        beforeIdNbrInput = idNbrInput-1;
        if (parseInt($('#'+this.id).val()) < parseInt($('#minNb'+beforeIdNbrInput).val())){
            $('#'+this.id).css("border", "2px solid red");
        } else {
            $('#'+this.id).css("border", "0px solid white");
        }
    })
}
function handleNameInput(){
    undefinedUnits = true;
}
