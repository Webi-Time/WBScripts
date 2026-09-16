(async function () {
    'use strict';

    const SCRIPT_VERSION = '4.20';

    // Signature runtime volontairement répartie en plusieurs fragments.
    // Le nom reste lisible dans l'en-tête documentaire ci-dessous, mais
    // l'affichage web ne dépend pas d'une simple chaîne unique à rechercher.
    const _sigA = () => String.fromCharCode(78, 111, 76, 105);
    const _sigB = 'ZmU0RQ==';
    const _sigC = 'rev';
    const SCRIPT_AUTHOR = () => _sigA() + atob(_sigB) + _sigC.split('').reverse().join('');
    const SCRIPT_NAME = 'Webi-Time Intel Villages';

    console.log('[' + SCRIPT_NAME + '] v' + SCRIPT_VERSION + ' - ' + SCRIPT_AUTHOR());

    // ========================================================================
    // GT Intel Villages - analyse et consolidation des renseignements villages
    // Réalisé par NoLife4Ever
    //
    // Fonctions :
    // - Rapports coches / tous ceux de la page / tous les non-lus
    // - Cible Auto / Attaquant / Defenseur
    // - Dedoublonnage par village ET par type d'intel (DEFF / OFF)
    // - Peut conserver simultanement une information DEFF et une information OFF
    // - La DEFF est affichee en premier dans la note
    // - Attaquant  : Quantite - Pertes
    // - Defenseur  : Quantite - Pertes + Unites hors du village (si visibles)
    // - Si un village observe en defense contient 0 unite : "Village vide"
    // - Supprime les unites a 0
    // - <1500 = Debut / 1500-5999 = Demi / >=6000 = Full
    // - Detection OFF / DEFF par composition
    // - Chaque type d'intel n'est remplace que par une information plus recente
    // - Protege par defaut les notes manuelles sans date reconnue
    // - Suit les niveaux QG / Forge / Ferme / Entrepot / Muraille quand le village est defenseur
    // - Met a jour les batiments independamment via espionnage, catapultes et beliers
    // - v4.3 : parse uniquement les vraies lignes de degats / vrais tableaux d espionnage
    // - v4.4 : conserve les degats de siege meme si les troupes du defenseur sont masquees
    // - v4.5 : si un espionnage batiments est present et que la Muraille est absente, elle est consideree niveau 0
    // - v4.6 : nouvelle interface intégrée + signature auteur + version visible en pied de panneau
    // - v4.7 : applique les rapports un par un, dans l'ordre chronologique, afin de cumuler les dégâts de bâtiments
    // - v4.8 : consolide tous les rapports localement puis ne lit/ecrit la note qu'une seule fois par village
    // - v4.9 : parsing des unites par leur identifiant HTML, independant du nombre/type d'unites du monde (archers, archers montes, milice...)
    // - v4.10 : dates GT robustes aux mois abreges (sept., janv., fevr., etc.) et aux deux ordres jour/mois
    // - v4.11 : detection de la date independante de la structure HTML exacte du rapport (Monde 105 et variantes)
    // - v4.12 : refonte complete de l IHM aux couleurs Webi-Time (cyan / magenta / orange, tableau de bord et journal)
    // - v4.13 : journal structure sur plusieurs lignes pour les details OFF/DEFF/batiments
    // - v4.14 : suppression de la lueur autour des compteurs pour une meilleure lisibilite
    // - v4.16 : fenêtre de redirection Webi-Time + bouton Paramètres (données enregistrées / signalement de bug)
    // - v4.18 : CSS et composants UI communs externalisés dans WebiTime_GT_Common.js
    // - v4.20 : chargeur autonome du composant commun avec fallback GitHub Pages / jsDelivr
    // - v4.17 : composants Webi-Time communs avec Rename Attaques + tailles de police harmonisées
    //
    // Base technique inspiree de Set/Get Village Notes (RedAlert/JawJaw) :
    // recuperation des villageId depuis attack_info_att/def et POST edit_notes.
    // ========================================================================

    const CONFIG = {
        requestDelayMs: 350,
        protectManualNotes: true,
        transmittedAutoTarget: 'DEFENDER', // AUTO si ni attaquant ni defenseur = joueur courant
        debug: false,
    };

    const PREFIX = 'gtBatchVillageNotes';
    const BOX_ID = PREFIX + 'Box';
    const REDIRECT_PREF_KEY = 'webitime.gtIntelVillages.skipRedirect';
    const WEBITIME_SOURCE_URL = 'https://github.com/Webi-Time/WBScripts/tree/GT/Datas';
    const WEBITIME_COMMON_URL = 'https://webi-time.github.io/WBScripts/Datas/WebiTime_GT_Common.js';
    const WEBITIME_COMMON_FALLBACK_URL = 'https://cdn.jsdelivr.net/gh/Webi-Time/WBScripts@GT/Datas/WebiTime_GT_Common.js';

    async function ensureWebiTimeCommon() {
        if (window.WebiTimeGT) return window.WebiTimeGT;

        const candidates = [];

        // 1) Même dossier que le script courant : évite les problèmes de branche / chemin Pages.
        try {
            const currentSrc = document.currentScript && document.currentScript.src;
            if (currentSrc) {
                const relativeUrl = new URL('WebiTime_GT_Common.js', currentSrc);
                relativeUrl.searchParams.set('_wt', Date.now());
                candidates.push(relativeUrl.href);
            }
        } catch (_) {}

        // 2) URL GitHub Pages habituelle.
        candidates.push(WEBITIME_COMMON_URL + '?_wt=' + Date.now());

        // 3) Fallback CDN directement sur la branche GT.
        candidates.push(WEBITIME_COMMON_FALLBACK_URL + '?_wt=' + Date.now());

        const tried = new Set();
        for (const url of candidates) {
            if (!url || tried.has(url)) continue;
            tried.add(url);

            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = url;
                    script.async = true;
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Chargement impossible : ' + url));
                    (document.head || document.documentElement).appendChild(script);
                });

                if (window.WebiTimeGT) {
                    return window.WebiTimeGT;
                }
            } catch (error) {
                console.warn('[Webi-Time Intel Villages] Echec du chargement commun :', url, error);
            }
        }

        return null;
    }

    const WEBITIME_UI = await ensureWebiTimeCommon();
    if (!WEBITIME_UI) {
        console.error('[Webi-Time Intel Villages] Impossible de charger WebiTime_GT_Common.js.');
        if (typeof UI !== 'undefined' && UI.ErrorMessage) {
            UI.ErrorMessage('Impossible de charger le composant Webi-Time commun.');
        }
        return;
    }
    WEBITIME_UI.injectStyles();
    const GITHUB_ISSUE_URL = WEBITIME_UI.buildIssueUrl('GT-IntelVillages', WEBITIME_SOURCE_URL);

    // Ordre canonique interne. On garde toutes les unites standard, meme si elles
    // ne sont pas actives sur le monde : les unites absentes restent simplement a 0.
    // Cela evite de dependre de game_data.units, notamment pour la milice qui peut
    // apparaitre uniquement cote defenseur dans les rapports.
    const UNIT_ORDER = [
        'spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher',
        'heavy', 'ram', 'catapult', 'knight', 'snob', 'militia'
    ];
    const UNIT_INDEX = new Map(UNIT_ORDER.map((unit, index) => [unit, index]));

    // Batiments prioritaires a suivre dans les notes.
    const TRACKED_BUILDINGS = {
        main:    { label: 'QG',       aliases: ['quartier general'] },
        smith:   { label: 'Forge',    aliases: ['forge'] },
        farm:    { label: 'Ferme',    aliases: ['ferme'] },
        storage: { label: 'Entrepôt', aliases: ['entrepot'] },
        wall:    { label: 'Muraille', aliases: ['muraille'] },
    };

    const BUILDING_ORDER = ['main', 'smith', 'farm', 'storage', 'wall'];
    const BUILDING_SOURCE_PRIORITY = { ESP: 1, CATA: 2, BELIER: 2 };

    // ========================================================================
    // Fenetres Webi-Time / redirection / parametres
    // ========================================================================

    function clearSavedIntelData() {
        WEBITIME_UI.setStoredFlag(REDIRECT_PREF_KEY, false);
    }

    function redirectToReportList() {
        WEBITIME_UI.redirectToScreen('report', {}, ['view', 'mode', 'page']);
    }

    function showReportRedirect(message) {
        WEBITIME_UI.showRedirectDialog({
            rootId: 'webiTimeRedirectModalRoot',
            eventNamespace: 'webiTimeRedirect',
            title: 'Redirection vers Rapports',
            message,
            infoMessage: 'Redirection vers <strong>Rapports</strong>...',
            getPreference: () => WEBITIME_UI.getStoredFlag(REDIRECT_PREF_KEY),
            setPreference: enabled => WEBITIME_UI.setStoredFlag(REDIRECT_PREF_KEY, enabled),
            redirect: redirectToReportList
        });
    }

    function bindSettingsPopover() {
        WEBITIME_UI.bindSettingsPopover({
            containerSelector: '#' + BOX_ID,
            clearButtonSelector: '#' + PREFIX + 'ClearSaved',
            bugButtonSelector: '#' + PREFIX + 'ReportBug',
            bugUrl: GITHUB_ISSUE_URL,
            onClear: clearSavedIntelData,
            successMessage: 'Données enregistrées supprimées.'
        });
    }

    // ========================================================================
    // Verification de contexte
    // ========================================================================

    if (typeof game_data === 'undefined' || game_data.screen !== 'report') {
        showReportRedirect(
            '<p>Pour utiliser <b>Webi-Time Intel Villages</b>, tu dois être sur la liste des rapports.</p>' +
            '<p>Le script va te rediriger vers l’interface <b>Rapports</b>.</p>'
        );
        return;
    }

    // Si on est sur un rapport individuel, revenir a la liste n'est pas automatique.
    // Le script batch attend une page contenant plusieurs liens view=...
    const initialReportLinks = findReportLinks(document, 'PAGE');
    if (!initialReportLinks.length && new URL(location.href).searchParams.get('view')) {
        showReportRedirect(
            '<p>Le batch doit être lancé depuis la <b>liste des rapports</b>, pas depuis un rapport individuel.</p>' +
            '<p>Je peux te ramener directement à la liste.</p>'
        );
        return;
    }

    // ========================================================================
    // Helpers generiques
    // ========================================================================

    function logDebug(...args) {
        if (CONFIG.debug) console.log('[' + SCRIPT_NAME + ' / ' + SCRIPT_AUTHOR() + ']', ...args);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function normalizeText(text) {
        return (text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function htmlEscape(text) {
        return $('<div>').text(String(text ?? '')).html();
    }

    function absoluteUrl(href, base = location.href) {
        try {
            return new URL(href, base).href;
        } catch (_) {
            return null;
        }
    }

    function getReportIdFromUrl(url) {
        try {
            return new URL(url, location.href).searchParams.get('view');
        } catch (_) {
            return null;
        }
    }

    function parseUnitCell(text) {
        text = (text || '').trim();
        if (!text || text === '?' || text === '-' || text === '---') return null;

        const cleaned = text.replace(/[.\s]/g, '');
        if (!/^\d+$/.test(cleaned)) return null;

        return parseInt(cleaned, 10);
    }

    function zeroTroops() {
        return UNIT_ORDER.map(() => 0);
    }

    function addTroops(a, b) {
        return a.map((value, index) => value + (b[index] || 0));
    }

    function subtractTroops(quantity, losses) {
        return quantity.map((value, index) => Math.max(0, value - (losses[index] || 0)));
    }

    function parseDdMmYyyyDateTime(text) {
        const m = String(text || '').match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (!m) return null;

        const date = new Date(
            Number(m[3]),
            Number(m[2]) - 1,
            Number(m[1]),
            Number(m[4]),
            Number(m[5]),
            Number(m[6]),
            0
        );

        return Number.isNaN(date.getTime()) ? null : date;
    }

    function parseFrenchReportDateTime(rawText) {
        // GT peut afficher les mois en toutes lettres ou abreviations selon le monde /
        // la version de l'interface : "septembre", "sept.", "janv.", etc.
        // normalizeText retire les accents ; on retire aussi les points des abreviations.
        const clean = normalizeText(rawText)
            .replace(/\./g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const months = {
            janvier: 1, janv: 1, jan: 1,
            fevrier: 2, fevr: 2, fev: 2,
            mars: 3,
            avril: 4, avr: 4,
            mai: 5,
            juin: 6,
            juillet: 7, juil: 7,
            aout: 8,
            septembre: 9, sept: 9, sep: 9,
            octobre: 10, oct: 10,
            novembre: 11, nov: 11,
            decembre: 12, dec: 12,
        };

        function makeDate(year, month, day, hour, minute, second) {
            const date = new Date(
                Number(year),
                Number(month) - 1,
                Number(day),
                Number(hour),
                Number(minute),
                Number(second),
                0
            );
            return Number.isNaN(date.getTime()) ? null : date;
        }

        // Format actuellement rencontre sur GT FR : "sept. 16, 2026 09:04:00:351"
        // et variantes avec mois complet. Les millisecondes sont volontairement ignorees.
        let m = clean.match(
            /([a-z]+)\s+(\d{1,2}),\s*(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?::\d{1,3})?/
        );

        if (m && months[m[1]]) {
            const date = makeDate(m[3], months[m[1]], m[2], m[4], m[5], m[6]);
            if (date) return date;
        }

        // Variante francaise possible : "16 sept. 2026 09:04:00".
        m = clean.match(
            /(\d{1,2})\s+([a-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?::\d{1,3})?/
        );

        if (m && months[m[2]]) {
            const date = makeDate(m[3], months[m[2]], m[1], m[4], m[5], m[6]);
            if (date) return date;
        }

        // Fallback si l'interface renvoie deja dd/mm/yyyy.
        m = String(rawText || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?::\d{1,3})?/);
        if (m) {
            const date = makeDate(m[3], m[2], m[1], m[4], m[5], m[6]);
            if (date) return date;
        }

        return null;
    }

    function formatDateTime(date) {
        const p = n => String(n).padStart(2, '0');
        return (
            p(date.getDate()) + '/' +
            p(date.getMonth() + 1) + '/' +
            date.getFullYear() + ' ' +
            p(date.getHours()) + ':' +
            p(date.getMinutes()) + ':' +
            p(date.getSeconds())
        );
    }

    // ========================================================================
    // UI
    // ========================================================================

    function renderUi() {
        // Nettoie d'abord une éventuelle ancienne interface/style, puis réinjecte le CSS.
        // v4.18 supprimait le style juste après l'avoir injecté.
        $('#' + BOX_ID).remove();
        $('#' + PREFIX + 'Style').remove();
        WEBITIME_UI.injectStyles();
        WEBITIME_UI.injectIntelStyles(PREFIX, BOX_ID);

        const author = SCRIPT_AUTHOR();

        const html = `


            <div id="${BOX_ID}" class="vis">
                <div class="gtiv-hero">
                    <div class="gtiv-brand">
                        <div class="gtiv-logo" aria-hidden="true">🐼</div>
                        <div>
                            <div class="gtiv-title">
                                <span class="gtiv-title-webi">Webi-Time</span><span class="gtiv-title-intel"> Intel Villages</span>
                            </div>
                            <div class="gtiv-byline">Par <b>${author}</b> &nbsp;•&nbsp; Renseignement DEFF / OFF / bâtiments</div>
                            <div class="gtiv-tagline">Des rapports aux infos. Des infos aux victoires.</div>
                        </div>
                    </div>
                    <div class="gtiv-hero-motto">
                        ANALYSER<br>
                        COMPRENDRE<br>
                        NOTER<br>
                        PRENDRE L'AVANTAGE
                    </div>
                </div>

                <div class="gtiv-body">
                    <div class="gtiv-controls">
                        <div class="gtiv-card">
                            <span class="gtiv-card-title">Rapports</span>
                            <select id="${PREFIX}Source" class="input-nicer">
                                <option value="SELECTED">Cochés</option>
                                <option value="PAGE">Tous ceux de cette page</option>
                                <option value="UNREAD_ALL">Tous les non lus (toutes les pages)</option>
                            </select>
                        </div>

                        <div class="gtiv-card">
                            <span class="gtiv-card-title">Village à noter</span>
                            <select id="${PREFIX}Target" class="input-nicer">
                                <option value="AUTO">Auto</option>
                                <option value="ATTACKER">Attaquant</option>
                                <option value="DEFENDER">Défenseur</option>
                            </select>
                        </div>

                        <div class="gtiv-card gtiv-options">
                            <label class="gtiv-check">
                                <input type="checkbox" id="${PREFIX}Protect" checked>
                                <span>Ne pas écraser une note manuelle</span>
                            </label>
                            <label class="gtiv-check">
                                <input type="checkbox" id="${PREFIX}DebugOpen">
                                <span>Debug : ouvrir les rapports retenus</span>
                            </label>
                        </div>

                        <div class="gtiv-action">
                            <button id="${PREFIX}Run" class="btn gtiv-run">⌕&nbsp; Analyser + noter</button>
                        </div>
                    </div>

                    <div id="${PREFIX}ProgressWrap" class="gtiv-progress" style="display:none;">
                        <div class="gtiv-progress-title">
                            <span id="${PREFIX}ProgressText">Préparation...</span>
                            <span id="${PREFIX}ProgressPct">0%</span>
                        </div>
                        <div class="gtiv-progress-track">
                            <div id="${PREFIX}ProgressBar"></div>
                        </div>
                    </div>

                    <div class="gtiv-stats">
                        <div class="gtiv-stat cyan">
                            <span class="gtiv-stat-icon">▤</span>
                            <span class="gtiv-stat-value" id="${PREFIX}MetricFound">0</span>
                            <span class="gtiv-stat-label">Rapports trouvés</span>
                        </div>
                        <div class="gtiv-stat green">
                            <span class="gtiv-stat-icon">▶</span>
                            <span class="gtiv-stat-value" id="${PREFIX}MetricParsed">0</span>
                            <span class="gtiv-stat-label">Exploitables</span>
                        </div>
                        <div class="gtiv-stat red">
                            <span class="gtiv-stat-icon">×</span>
                            <span class="gtiv-stat-value" id="${PREFIX}MetricIgnored">0</span>
                            <span class="gtiv-stat-label">Ignorés</span>
                        </div>
                        <div class="gtiv-stat blue">
                            <span class="gtiv-stat-icon">⌂</span>
                            <span class="gtiv-stat-value" id="${PREFIX}MetricVillages">0</span>
                            <span class="gtiv-stat-label">Villages uniques</span>
                        </div>
                        <div class="gtiv-stat green">
                            <span class="gtiv-stat-icon">↑</span>
                            <span class="gtiv-stat-value" id="${PREFIX}MetricUpdated">0</span>
                            <span class="gtiv-stat-label">Notes mises à jour</span>
                        </div>
                        <div class="gtiv-stat yellow">
                            <span class="gtiv-stat-icon">↻</span>
                            <span class="gtiv-stat-value" id="${PREFIX}MetricSkipped">0</span>
                            <span class="gtiv-stat-label">Conservées</span>
                        </div>
                        <div class="gtiv-stat red">
                            <span class="gtiv-stat-icon">!</span>
                            <span class="gtiv-stat-value" id="${PREFIX}MetricErrors">0</span>
                            <span class="gtiv-stat-label">Erreurs</span>
                        </div>
                    </div>

                    <div id="${PREFIX}Summary"></div>

                    <div class="gtiv-log-section">
                        <div class="gtiv-log-head">
                            <div class="gtiv-log-title">⌁ &nbsp;Journal d'exécution</div>
                            <button type="button" id="${PREFIX}ClearLog" class="gtiv-clear-log">Effacer le log</button>
                        </div>
                        <div id="${PREFIX}Log"></div>
                    </div>

                    <div class="gtiv-footer">
                        <span class="gtiv-footer-left">
                            ${WEBITIME_UI.buildSettingsMarkup(PREFIX + 'ClearSaved', PREFIX + 'ReportBug')}
                            <span>Version ${SCRIPT_VERSION}</span>
                        </span>
                        <span class="gtiv-footer-center">Intelligence &nbsp;■&nbsp; Organisation &nbsp;■&nbsp; Supériorité</span>
                        <span class="gtiv-footer-right">🐼 <b>Webi-Time</b> &nbsp;|&nbsp; réalisé par ${author}</span>
                    </div>
                </div>
            </div>
        `;

        const $target = $('#content_value').length ? $('#content_value') : $('#contentContainer');
        $target.prepend(html);

        $('#' + PREFIX + 'Run').on('click', runBatch);
        $('#' + PREFIX + 'ClearLog').on('click', function () {
            $('#' + PREFIX + 'Log').empty();
        });
        bindSettingsPopover();
    }

    function setMetric(name, value) {
        $('#' + PREFIX + 'Metric' + name).text(value);
    }

    function resetMetrics() {
        ['Found', 'Parsed', 'Ignored', 'Villages', 'Updated', 'Skipped', 'Errors']
            .forEach(name => setMetric(name, 0));
    }

    function setBusy(isBusy) {
        const $run = $('#' + PREFIX + 'Run');
        $run.prop('disabled', isBusy);
        $run.html(isBusy ? '⌁&nbsp; Analyse en cours...' : '⌕&nbsp; Analyser + noter');
        $('#' + PREFIX + 'Source').prop('disabled', isBusy);
        $('#' + PREFIX + 'Target').prop('disabled', isBusy);
        $('#' + PREFIX + 'Protect').prop('disabled', isBusy);
        $('#' + PREFIX + 'DebugOpen').prop('disabled', isBusy);
        $('#' + PREFIX + 'ProgressWrap').toggle(isBusy);
    }

    function updateProgress(current, total, text) {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        $('#' + PREFIX + 'ProgressBar').css('width', pct + '%');
        $('#' + PREFIX + 'ProgressText').text(text || `${current}/${total}`);
        $('#' + PREFIX + 'ProgressPct').text(pct + '%');
    }

    function getLogTime() {
        const d = new Date();
        const p = n => String(n).padStart(2, '0');
        return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }

    function appendLog(status, message) {
        const symbols = {
            ok: '✓',
            skip: '−',
            warn: '!',
            error: '✗',
            info: '·',
        };
        const symbol = symbols[status] || '·';
        const cls = ['ok', 'skip', 'warn', 'error', 'info'].includes(status) ? status : 'info';

        // Le journal accepte maintenant soit une chaine avec des retours a la ligne,
        // soit directement un tableau de lignes. La premiere ligne porte le statut ;
        // les suivantes sont affichees comme des sous-lignes indentees.
        const lines = (Array.isArray(message) ? message : String(message ?? '').split(/\r?\n/))
            .map(line => String(line).trim())
            .filter(Boolean);

        const main = lines.length ? lines[0] : '';
        const details = lines.slice(1);

        const detailsHtml = details
            .map(line => `<div class="gtiv-log-detail">${htmlEscape(line)}</div>`)
            .join('');

        $('#' + PREFIX + 'Log').append(
            `<div class="gtiv-log-line gtiv-log-${cls}">` +
                `<span class="gtiv-log-time">[${getLogTime()}]</span>` +
                `<div class="gtiv-log-content">` +
                    `<div class="gtiv-log-main">${htmlEscape(symbol + ' ' + main)}</div>` +
                    detailsHtml +
                `</div>` +
            `</div>`
        );
        const el = $('#' + PREFIX + 'Log')[0];
        if (el) el.scrollTop = el.scrollHeight;
    }

    function appendLogLink(status, label, url) {
        const symbols = {
            ok: '✓',
            skip: '−',
            warn: '!',
            error: '✗',
            info: '·',
        };
        const symbol = symbols[status] || '·';
        const cls = ['ok', 'skip', 'warn', 'error', 'info'].includes(status) ? status : 'info';
        const safeUrl = htmlEscape(url);
        const safeLabel = htmlEscape(label);
        $('#' + PREFIX + 'Log').append(
            `<div class="gtiv-log-line gtiv-log-${cls}">` +
                `<span class="gtiv-log-time">[${getLogTime()}]</span>` +
                `<div class="gtiv-log-content"><div class="gtiv-log-main">` +
                    `${htmlEscape(symbol + ' DEBUG ')}<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>` +
                `</div></div>` +
            `</div>`
        );
        const el = $('#' + PREFIX + 'Log')[0];
        if (el) el.scrollTop = el.scrollHeight;
    }

    // ========================================================================
    // Liste des rapports
    // ========================================================================

    function isReportDetailUrl(href) {
        try {
            const u = new URL(href, location.href);
            return u.searchParams.get('screen') === 'report' && !!u.searchParams.get('view');
        } catch (_) {
            return false;
        }
    }

    function rowIsUnread($row) {
        const text = normalizeText($row.text());
        if (text.includes('(nouveau)') || /\bnouveau\b/.test(text)) return true;

        // Fallbacks frequents : rapport non lu souvent en gras / classe specifique
        if ($row.find('.report-new, .new_report, .unread, strong').length) {
            // Evite de classer toute ligne avec texte en gras comme non lue si elle ne contient pas de lien rapport
            return $row.find('a[href*="view="]').length > 0 && text.includes('nouveau');
        }

        return false;
    }

    function findReportLinks(doc, sourceMode) {
        const result = [];
        const seen = new Set();
        const $doc = $(doc);

        function addReportFromRow($row) {
            if (!$row || !$row.length) return;

            // IMPORTANT : on ne parcourt pas tous les <tr> parents de la page.
            // Les tableaux GT sont imbriques : un <tr> de mise en page peut contenir
            // toute la liste des rapports + une case cochee, ce qui faisait remonter
            // par erreur le premier rapport de la liste en plus du rapport selectionne.
            const $link = $row.find('a[href]').filter(function () {
                return isReportDetailUrl($(this).attr('href'));
            }).first();

            if (!$link.length) return;

            if (sourceMode === 'UNREAD_ALL' && !rowIsUnread($row)) return;

            const href = absoluteUrl($link.attr('href'), location.href);
            const reportId = getReportIdFromUrl(href);

            if (href && reportId && !seen.has(reportId)) {
                seen.add(reportId);
                result.push({ reportId, url: href });
            }
        }

        if (sourceMode === 'SELECTED') {
            // IMPORTANT : on part des VRAIES LIGNES DE RAPPORT et non de toutes
            // les checkbox cochees de la page. Cela evite de ramasser une checkbox
            // d'un autre formulaire ou d'un tableau parent imbrique.
            const processedRows = new Set();

            $doc.find('a[href]').filter(function () {
                return isReportDetailUrl($(this).attr('href'));
            }).each(function () {
                const $row = $(this).closest('tr');
                if (!$row.length) return;

                const rowElement = $row[0];
                if (processedRows.has(rowElement)) return;
                processedRows.add(rowElement);

                // La checkbox doit appartenir DIRECTEMENT a cette ligne de rapport.
                // On regarde prioritairement la premiere cellule, comme dans la liste GT.
                let $checkbox = $row.children('td').first().find('input[type="checkbox"]:checked');

                // Fallback si le theme/serveur place la case dans une autre cellule,
                // mais toujours uniquement dans les cellules DIRECTES de cette ligne.
                if (!$checkbox.length) {
                    $checkbox = $row.children('td').find('input[type="checkbox"]:checked');
                }

                if (!$checkbox.length) return;

                addReportFromRow($row);
            });

            return result;
        }

        // PAGE / UNREAD_ALL : on part des vrais liens de rapports, puis on prend
        // uniquement leur ligne directe. Cela evite aussi les <tr> parents.
        $doc.find('a[href]').filter(function () {
            return isReportDetailUrl($(this).attr('href'));
        }).each(function () {
            addReportFromRow($(this).closest('tr'));
        });

        return result;
    }

    async function getReportLinks(sourceMode) {
        if (sourceMode === 'SELECTED' || sourceMode === 'PAGE') {
            return findReportLinks(document, sourceMode);
        }

        // Tous les non lus : on demande la vue "toutes les pages" via page=-1.
        // C'est le mecanisme utilise par l'interface GT lorsqu'elle propose l'affichage global.
        const allUrl = new URL(location.href);
        allUrl.searchParams.delete('view');
        allUrl.searchParams.set('page', '-1');

        appendLog('info', 'Chargement de la liste complete des rapports non lus...');

        try {
            const html = await $.ajax({
                url: allUrl.href,
                method: 'GET',
                timeout: 30000,
            });

            const doc = new DOMParser().parseFromString(html, 'text/html');
            const links = findReportLinks(doc, 'UNREAD_ALL');

            if (links.length) return links;

            appendLog('warn', 'page=-1 n a retourne aucun rapport non lu, fallback sur la page courante.');
            return findReportLinks(document, 'UNREAD_ALL');
        } catch (e) {
            appendLog('warn', 'Impossible de charger toutes les pages, fallback sur la page courante.');
            return findReportLinks(document, 'UNREAD_ALL');
        }
    }

    // ========================================================================
    // Parsing d'un rapport
    // ========================================================================

    function getPlayerName($doc, side) {
        const table = $doc.find('#attack_info_' + side)[0];
        if (!table || !table.rows || !table.rows[0] || !table.rows[0].cells[1]) return '';
        return $(table.rows[0].cells[1]).text().trim();
    }

    function getVillageId($doc, side) {
        const table = $doc.find('#attack_info_' + side)[0];
        if (!table || !table.rows || !table.rows[1] || !table.rows[1].cells[1]) return null;

        const $cell = $(table.rows[1].cells[1]);
        const $span = $cell.find('span[data-id]').first();
        if ($span.length) return String($span.attr('data-id'));

        const href = $cell.find('a[href]').first().attr('href');
        if (href) {
            try {
                return new URL(href, location.href).searchParams.get('id');
            } catch (_) {}
        }

        return null;
    }

    function getVillageText($doc, side) {
        const table = $doc.find('#attack_info_' + side)[0];
        if (!table || !table.rows || !table.rows[1] || !table.rows[1].cells[1]) return '';
        return $(table.rows[1].cells[1]).text().replace(/\s+/g, ' ').trim();
    }

    function getUnitNameFromNode(node) {
        if (!node) return null;

        const $node = $(node);

        // Certains themes/versions exposent directement l'unite dans un attribut.
        const direct = String($node.attr('data-unit') || '').trim().toLowerCase();
        if (UNIT_INDEX.has(direct)) return direct;

        // Autre format frequent : class="unit-item unit-item-spear".
        const classes = String($node.attr('class') || '').split(/\s+/);
        for (const cls of classes) {
            const m = cls.match(/^unit-item-([a-z_]+)$/i);
            if (m && UNIT_INDEX.has(m[1].toLowerCase())) return m[1].toLowerCase();
        }

        // Fallback le plus robuste : nom de l'image unit_spear.webp / png / gif.
        let src = '';
        if ($node.is('img')) {
            src = $node.attr('src') || '';
        } else {
            src = $node.find('img[src*="unit_"]').first().attr('src') || '';
        }

        const imageMatch = src.match(/unit_([a-z_]+)\.(?:png|gif|webp)/i);
        if (imageMatch && UNIT_INDEX.has(imageMatch[1].toLowerCase())) {
            return imageMatch[1].toLowerCase();
        }

        return null;
    }

    function getUnitNamesForTable($table) {
        let names = [];

        $table.find('tr').each(function () {
            const $cells = $(this).children('th.unit-item, td.unit-item');
            if (!$cells.length) return;

            const candidate = [];
            let recognized = 0;

            $cells.each(function () {
                const unit = getUnitNameFromNode(this);
                candidate.push(unit);
                if (unit) recognized++;
            });

            // Une vraie ligne d'en-tete contient les icones/noms d'unites.
            if (recognized > 0) {
                names = candidate;
                return false;
            }
        });

        return names;
    }

    function parseTroopCells($cells, unitNames = []) {
        if (!$cells || !$cells.length) return null;

        const result = zeroTroops();
        let recognized = 0;
        let invalid = false;

        $cells.each(function (index) {
            const value = parseUnitCell($(this).text());
            if (value === null) {
                invalid = true;
                return false;
            }

            const unit = getUnitNameFromNode(this) || unitNames[index] || null;
            if (!unit || !UNIT_INDEX.has(unit)) return;

            result[UNIT_INDEX.get(unit)] = value;
            recognized++;
        });

        if (invalid || recognized === 0) return null;
        return result;
    }

    function getTroopRow($doc, side, rowIndex) {
        const $table = $doc.find(`#attack_info_${side}_units`).first();
        if (!$table.length) return null;

        const $cells = $table.find(`tr:eq(${rowIndex})`).children('td.unit-item');
        if (!$cells.length) return null;

        const unitNames = getUnitNamesForTable($table);
        return parseTroopCells($cells, unitNames);
    }

    function getOutsideTroops($doc) {
        const empty = zeroTroops();
        const root = $doc.find('#content_value').length ? $doc.find('#content_value')[0] : $doc[0];
        if (!root) return empty;

        const markerCandidates = $doc
            .find('th, td, h3, h4, strong, b, div')
            .filter(function () {
                return normalizeText($(this).text()).includes('unites hors du village');
            })
            .toArray()
            .sort((a, b) => $(a).text().length - $(b).text().length);

        if (!markerCandidates.length) return empty;
        const marker = markerCandidates[0];

        const rows = $doc.find('tr').toArray();
        for (const row of rows) {
            const relation = marker.compareDocumentPosition(row);
            if (!(relation & Node.DOCUMENT_POSITION_FOLLOWING)) continue;

            const $row = $(row);
            const $cells = $row.children('td').filter('.unit-item');
            if (!$cells.length) continue;

            const $table = $row.closest('table');
            const unitNames = getUnitNamesForTable($table);
            const values = parseTroopCells($cells, unitNames);

            if (values) return values;
        }

        return empty;
    }

    function getTrackedBuildingKey(name) {
        const normalized = normalizeText(name).replace(/\s+/g, ' ').trim();

        for (const key of BUILDING_ORDER) {
            const config = TRACKED_BUILDINGS[key];
            if (config.aliases.some(alias => normalized === alias || normalized.startsWith(alias + ' '))) {
                return key;
            }
        }

        return null;
    }

    function setBuildingIntel(result, key, level, date, source, beforeLevel = null) {
        if (!key || !Number.isFinite(level) || !date) return;

        const candidate = {
            key,
            label: TRACKED_BUILDINGS[key].label,
            level,
            date,
            source,
            beforeLevel,
        };

        const previous = result[key];
        if (!previous) {
            result[key] = candidate;
            return;
        }

        const candidateTime = candidate.date.getTime();
        const previousTime = previous.date.getTime();

        if (candidateTime > previousTime) {
            result[key] = candidate;
            return;
        }

        if (candidateTime === previousTime) {
            const candidatePriority = BUILDING_SOURCE_PRIORITY[candidate.source] || 0;
            const previousPriority = BUILDING_SOURCE_PRIORITY[previous.source] || 0;

            // A date identique, une information explicite de degats (CATA/BELIER)
            // est plus fiable que le tableau d'espionnage pour le niveau post-combat.
            if (candidatePriority > previousPriority) {
                result[key] = candidate;
            }
        }
    }

    function getTrackedBuildingIntel($doc, combatDate, target) {
        const result = {};

        // Les batiments du village cible n'ont de sens que lorsque le village
        // que nous sommes en train de noter est le DEFENSEUR du rapport.
        if (target !== 'DEFENDER') return result;

        // --------------------------------------------------------------------
        // 1) Tableau d'espionnage : uniquement les VRAIS tableaux
        //    "Batiment / Niveau".
        //
        // IMPORTANT v4.3 : on ne parcourt plus aveuglement tous les <tr> du
        // rapport. Les tableaux de GT sont imbriques et un <tr> parent peut
        // contenir le texte de plusieurs sous-tableaux, ce qui pouvait faire
        // passer des lignes sans espionnage pour des informations batiments.
        // --------------------------------------------------------------------
        const scoutTables = new Set();

        $doc.find('tr').each(function () {
            const $cells = $(this).children('th,td');
            if ($cells.length < 2) return;

            const first = normalizeText($cells.eq(0).text()).replace(/\s+/g, ' ').trim();
            const second = normalizeText($cells.eq(1).text()).replace(/\s+/g, ' ').trim();
            const compact = (first + second).replace(/\s+/g, '');

            const isBuildingHeader =
                (first === 'batiment' && second === 'niveau') ||
                compact === 'batimentniveau';

            if (!isBuildingHeader) return;

            const table = $(this).closest('table')[0];
            if (table) scoutTables.add(table);
        });

        scoutTables.forEach(table => {
            $(table).find('tr').each(function () {
                const $cells = $(this).children('th,td');
                if ($cells.length < 2) return;

                const buildingName = $cells.eq(0).text().replace(/\s+/g, ' ').trim();
                const key = getTrackedBuildingKey(buildingName);
                if (!key) return;

                const levelText = $cells.eq(1).text().replace(/[.\s]/g, '').trim();
                if (!/^\d+$/.test(levelText)) return;

                setBuildingIntel(
                    result,
                    key,
                    parseInt(levelText, 10),
                    combatDate,
                    'ESP'
                );
            });
        });

        // Sur Guerre Tribale, lors d'un espionnage des batiments, une muraille
        // de niveau 0 n'apparait pas dans le tableau. Son absence est donc une
        // information exploitable UNIQUEMENT si un vrai tableau d'espionnage
        // des batiments a bien ete detecte.
        //
        // On n'applique pas cette regle aux autres batiments : pour l'instant,
        // seule l'absence de la muraille est interpretee explicitement comme niv.0.
        if (scoutTables.size > 0 && !result.wall) {
            setBuildingIntel(
                result,
                'wall',
                0,
                combatDate,
                'ESP'
            );
        }

        // --------------------------------------------------------------------
        // 2) Degats explicites : beliers / catapultes.
        //
        // On lit UNIQUEMENT une ligne dont la premiere cellule directe est
        // exactement le libelle "Degats par beliers/catapultes" puis on parse
        // la seconde cellule directe. Cela evite le bug des <tr> parents.
        // --------------------------------------------------------------------
        $doc.find('tr').each(function () {
            const $cells = $(this).children('th,td');
            if ($cells.length < 2) return;

            const label = normalizeText($cells.eq(0).text()).replace(/\s+/g, ' ').trim();

            let source = null;
            if (/^degats par beliers\s*:?$/.test(label)) source = 'BELIER';
            else if (/^degats par catapultes\s*:?$/.test(label)) source = 'CATA';
            if (!source) return;

            const detail = normalizeText($cells.eq(1).text()).replace(/\s+/g, ' ').trim();
            if (!detail) return;

            for (const key of BUILDING_ORDER) {
                const config = TRACKED_BUILDINGS[key];

                for (const alias of config.aliases) {
                    // Les alias actuels ne contiennent pas de caracteres regex
                    // speciaux, mais on les echappe pour garder le parseur robuste.
                    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(
                        escapedAlias + '.*?niveau\\s+(\\d+)\\s+au\\s+niveau\\s+(\\d+)',
                        'i'
                    );
                    const match = detail.match(regex);

                    if (match) {
                        setBuildingIntel(
                            result,
                            key,
                            parseInt(match[2], 10),
                            combatDate,
                            source,
                            parseInt(match[1], 10)
                        );
                        break;
                    }
                }
            }
        });

        return result;
    }

    function getReportCombatDate($doc) {
        // La structure HTML des rapports varie suivant les mondes / versions de GT.
        // On ne depend donc plus d'un seul chemin DOM. Plusieurs strategies sont
        // tentees, de la plus precise a la plus permissive.
        const candidates = [];

        function tryCandidate(value, source) {
            const raw = String(value || '')
                .replace(/\u00a0/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (!raw) return null;

            candidates.push({ source, raw });
            const date = parseFrenchReportDateTime(raw);
            return date ? { date, raw, source } : null;
        }

        // 1) Ancien chemin historique, conserve pour compatibilite.
        try {
            const def = $doc.find('table#attack_info_def')[0];
            if (def && def.parentNode && def.parentNode.parentNode && def.parentNode.parentNode.parentNode) {
                const wrapper = def.parentNode.parentNode.parentNode;
                if (wrapper.rows && wrapper.rows[1] && wrapper.rows[1].cells && wrapper.rows[1].cells[1]) {
                    const found = tryCandidate(wrapper.rows[1].cells[1].textContent, 'legacy-dom');
                    if (found) return found;
                }
            }
        } catch (_) {}

        // 2) Cherche une vraie ligne de tableau dont une cellule DIRECTE porte
        //    le libelle "Heure du combat". L'utilisation de children() evite les
        //    faux positifs provenant des tableaux imbriques de GT.
        let found = null;
        $doc.find('tr').each(function () {
            if (found) return false;

            const $cells = $(this).children('th,td');
            if (!$cells.length) return;

            for (let i = 0; i < $cells.length; i++) {
                const label = normalizeText($cells.eq(i).text()).replace(/\s+/g, ' ').trim();
                if (!label.includes('heure du combat')) continue;

                // Cas classique : libelle dans une cellule, valeur dans la suivante.
                if (i + 1 < $cells.length) {
                    found = tryCandidate($cells.eq(i + 1).text(), 'direct-row-next-cell');
                    if (found) return false;
                }

                // Certains themes mettent libelle + date dans la meme cellule.
                found = tryCandidate($cells.eq(i).text(), 'direct-row-same-cell');
                if (found) return false;
            }
        });
        if (found) return found;

        // 3) Recherche du libelle dans n'importe quelle cellule puis inspection
        //    des cellules voisines / du parent. Utile si le theme ajoute un wrapper.
        const markerCells = $doc.find('th,td').filter(function () {
            return normalizeText($(this).text()).replace(/\s+/g, ' ').includes('heure du combat');
        }).toArray();

        // Les cellules les plus courtes sont les plus susceptibles d'etre le vrai libelle.
        markerCells.sort((a, b) => $(a).text().length - $(b).text().length);

        for (const cell of markerCells) {
            const $cell = $(cell);
            const $next = $cell.next('th,td');

            if ($next.length) {
                const nextFound = tryCandidate($next.text(), 'marker-next-cell');
                if (nextFound) return nextFound;
            }

            const selfFound = tryCandidate($cell.text(), 'marker-cell');
            if (selfFound) return selfFound;

            const $row = $cell.closest('tr');
            if ($row.length) {
                const rowFound = tryCandidate($row.text(), 'marker-row');
                if (rowFound) return rowFound;
            }
        }

        // 4) Dernier recours : on extrait le texte qui suit "Heure du combat"
        //    dans tout le contenu du rapport. Cela rend le parseur independant
        //    du balisage exact tout en restant ancre sur le bon libelle.
        const $root = $doc.find('#content_value').length ? $doc.find('#content_value') : $doc;
        const fullText = normalizeText($root.text())
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const markerIndex = fullText.indexOf('heure du combat');
        if (markerIndex !== -1) {
            // 180 caracteres suffisent largement pour englober la date avant
            // le champ suivant (Acheminé le, attaquant, etc.).
            const afterMarker = fullText.slice(markerIndex, markerIndex + 180);
            const textFound = tryCandidate(afterMarker, 'full-text-after-marker');
            if (textFound) return textFound;
        }

        if (CONFIG.debug) {
            console.warn(
                '[' + SCRIPT_NAME + '] Date du combat introuvable. Candidats testes :',
                candidates
            );
        }

        return null;
    }

    function chooseTarget(attackerName, defenderName, targetMode) {
        if (targetMode === 'ATTACKER') return 'ATTACKER';
        if (targetMode === 'DEFENDER') return 'DEFENDER';

        if (defenderName === game_data.player.name) return 'ATTACKER';
        if (attackerName === game_data.player.name) return 'DEFENDER';

        // Rapport transmis : par defaut, on privilegie le village defenseur.
        // C'est la cible la plus pertinente pour les scouts et degats de siege.
        return CONFIG.transmittedAutoTarget;
    }

    function classifyArmy(troops, target) {
        const totalUnits = troops.reduce((sum, n) => sum + n, 0);

        // IMPORTANT :
        // 0 troupe sur un DEFENSEUR observe = village vide au moment du rapport.
        // 0 survivant chez un ATTAQUANT ne prouve pas que son village est vide :
        // cela signifie seulement que l'armee envoyee a ete detruite.
        if (totalUnits === 0) {
            if (target === 'DEFENDER') {
                return {
                    totalUnits: 0,
                    size: 'Village vide',
                    type: 'EMPTY',
                    intelKey: 'DEF',
                    isEmpty: true,
                    offScore: 0,
                    defScore: 0,
                };
            }

            return {
                totalUnits: 0,
                size: '0 survivant',
                type: 'OFF',
                intelKey: 'OFF',
                isEmpty: false,
                offScore: 0,
                defScore: 0,
            };
        }

        let size;
        if (totalUnits < 1500) size = 'Début';
        else if (totalUnits < 6000) size = 'Demi';
        else size = 'Full';

        const farmSpace = {
            spear: 1,
            sword: 1,
            axe: 1,
            archer: 1,
            spy: 2,
            light: 4,
            marcher: 5,
            heavy: 6,
            ram: 5,
            catapult: 8,
            knight: 10,
            snob: 100,
            // La milice ne consomme pas de population, mais un poids minimal de 1
            // permet de la reconnaitre comme information defensive dans le classement.
            militia: 1,
        };

        const offUnits = new Set(['axe', 'light', 'marcher', 'ram', 'catapult']);
        const defUnits = new Set(['spear', 'sword', 'archer', 'heavy', 'militia']);

        let offScore = 0;
        let defScore = 0;

        UNIT_ORDER.forEach((unit, index) => {
            const amount = troops[index] || 0;
            const pop = farmSpace[unit] || 1;
            if (offUnits.has(unit)) offScore += amount * pop;
            if (defUnits.has(unit)) defScore += amount * pop;
        });

        const type = offScore > defScore ? 'OFF' : 'DEFF';

        return {
            totalUnits,
            size,
            type,
            intelKey: type === 'DEFF' ? 'DEF' : 'OFF',
            isEmpty: false,
            offScore,
            defScore,
        };
    }

    function buildIntelBlock(date, classification, troops) {
        const formattedDate = formatDateTime(date);

        if (classification.isEmpty) {
            return (
                '[b]DEFF[/b] | ' + formattedDate + '\n' +
                'Village vide'
            );
        }

        // Pour une attaque dont toutes les troupes sont mortes, on ne pretend
        // pas que le village source est vide.
        if (classification.totalUnits === 0 && classification.intelKey === 'OFF') {
            return (
                '[b]OFF[/b] | ' + formattedDate + '\n' +
                '0 survivant de cette attaque'
            );
        }

        const unitParts = [];

        UNIT_ORDER.forEach((unit, index) => {
            const amount = troops[index] || 0;
            if (amount > 0) {
                unitParts.push(`${amount}[unit]${unit}[/unit]`);
            }
        });

        const label = classification.intelKey === 'DEF' ? 'DEFF' : 'OFF';

        return (
            `[b]${label}[/b] | ${formattedDate}\n` +
            classification.size + ' ' + classification.type + '\n' +
            unitParts.join(' ')
        );
    }

    function parseReportHtml(html, url, targetMode) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const $doc = $(doc);

        if (!$doc.find('#attack_info_att').length || !$doc.find('#attack_info_def').length) {
            return { ok: false, reason: 'Rapport sans combat exploitable' };
        }

        const attackerName = getPlayerName($doc, 'att');
        const defenderName = getPlayerName($doc, 'def');
        const target = chooseTarget(attackerName, defenderName, targetMode);
        const side = target === 'ATTACKER' ? 'att' : 'def';

        const villageId = getVillageId($doc, side);
        const villageText = getVillageText($doc, side);
        const quantity = getTroopRow($doc, side, 1);
        const losses = getTroopRow($doc, side, 2);
        const combatDate = getReportCombatDate($doc);

        if (!villageId) return { ok: false, reason: 'ID village introuvable' };
        if (!combatDate) return { ok: false, reason: 'Date du combat introuvable' };

        const buildings = getTrackedBuildingIntel($doc, combatDate.date, target);
        const hasBuildingIntel = Object.keys(buildings).length > 0;

        // v4.4 : un rapport peut masquer totalement les troupes du defenseur
        // tout en revelant un resultat de siege (ex. Muraille 16 -> 14).
        // Dans ce cas on conserve le rapport comme source BATIMENTS uniquement,
        // sans inventer de DEFF / Village vide.
        if (!quantity || !losses) {
            if (!hasBuildingIntel) {
                return { ok: false, reason: 'Troupes masquees ou format non reconnu' };
            }

            return {
                ok: true,
                reportId: getReportIdFromUrl(url),
                url,
                target,
                attackerName,
                defenderName,
                villageId,
                villageText,
                quantity: null,
                losses: null,
                outside: zeroTroops(),
                troops: null,
                combatDate: combatDate.date,
                formattedDate: formatDateTime(combatDate.date),
                classification: null,
                intelKey: null,
                intelBlock: null,
                troopIntelAvailable: false,
                buildings,
            };
        }

        let troops = subtractTroops(quantity, losses);
        let outside = zeroTroops();

        if (target === 'DEFENDER') {
            outside = getOutsideTroops($doc);
            troops = addTroops(troops, outside);
        }

        const classification = classifyArmy(troops, target);
        const intelBlock = buildIntelBlock(combatDate.date, classification, troops);

        return {
            ok: true,
            reportId: getReportIdFromUrl(url),
            url,
            target,
            attackerName,
            defenderName,
            villageId,
            villageText,
            quantity,
            losses,
            outside,
            troops,
            combatDate: combatDate.date,
            formattedDate: formatDateTime(combatDate.date),
            classification,
            intelKey: classification.intelKey,
            intelBlock,
            troopIntelAvailable: true,
            buildings,
        };
    }

    async function fetchAndParseReport(item, targetMode) {
        try {
            const html = await $.ajax({
                url: item.url,
                method: 'GET',
                timeout: 30000,
            });

            return parseReportHtml(html, item.url, targetMode);
        } catch (e) {
            return { ok: false, reason: 'Erreur HTTP rapport ' + item.reportId };
        }
    }

    // ========================================================================
    // Note existante / ecriture
    // ========================================================================

    function villageInfoUrl(villageId) {
        const u = new URL(game_data.link_base_pure + 'info_village', location.origin);
        u.searchParams.set('id', villageId);
        if (game_data.player && game_data.player.sitter > 0) {
            u.searchParams.set('t', game_data.player.id);
        }
        return u.href;
    }

    function htmlNodeToBbcode(node) {
        if (!node) return '';

        if (node.nodeType === Node.TEXT_NODE) {
            return node.nodeValue || '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const tag = node.tagName.toLowerCase();

        if (tag === 'br') return '\n';

        if (tag === 'img') {
            const src = node.getAttribute('src') || '';
            const match = src.match(/unit_([a-z_]+)\.(?:png|gif|webp)/i);
            return match ? `[unit]${match[1]}[/unit]` : '';
        }

        let content = '';
        Array.from(node.childNodes).forEach(child => {
            content += htmlNodeToBbcode(child);
        });

        if (tag === 'b' || tag === 'strong') {
            return `[b]${content}[/b]`;
        }

        if (tag === 'i' || tag === 'em') {
            return `[i]${content}[/i]`;
        }

        if (tag === 'u') {
            return `[u]${content}[/u]`;
        }

        if (tag === 'a') {
            const href = node.getAttribute('href');
            if (href && content.trim()) {
                return `[url=${href}]${content}[/url]`;
            }
            return content;
        }

        if (tag === 'div' || tag === 'p' || tag === 'li') {
            return content + '\n';
        }

        return content;
    }

    function cleanBbcodeText(text) {
        return String(text || '')
            .replace(/\r/g, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    function getBuildingKeyFromNoteLabel(label) {
        const normalized = normalizeText(label).replace(/[:\s]+/g, ' ').trim();

        if (normalized === 'qg' || normalized === 'quartier general') return 'main';
        if (normalized === 'forge') return 'smith';
        if (normalized === 'ferme') return 'farm';
        if (normalized === 'entrepot') return 'storage';
        if (normalized === 'muraille' || normalized === 'mur') return 'wall';

        return null;
    }

    function parseExistingIntel(existing) {
        const result = {
            recognized: false,
            manualText: '',
            blocks: new Map(),
            buildings: new Map(),
        };

        if (!existing || !existing.exists) return result;

        const raw = cleanBbcodeText(existing.bbcode || existing.text || '');
        const lines = raw.split('\n');

        // --------------------------------------------------------------------
        // Bloc BATIMENTS v4, place en fin de note.
        // [b]BATIMENTS[/b]
        // QG: 24 | 18/08/2026 14:32:00 | ESP
        // Ferme: 19 | 18/08/2026 14:35:00 | CATA
        // --------------------------------------------------------------------
        const buildingHeaderIndex = lines.findIndex(line => {
            const plainLine = normalizeText(line.replace(/\[\/?b\]/gi, ''));
            return plainLine === 'batiments';
        });

        if (buildingHeaderIndex >= 0) {
            result.recognized = true;

            lines.slice(buildingHeaderIndex + 1).forEach(line => {
                const plainLine = line.replace(/\[\/?b\]/gi, '').trim();
                const m = plainLine.match(
                    /^([^:|]+)\s*:\s*(\d+)\s*\|\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})(?:\s*\|\s*(ESP|CATA|BELIER))?/i
                );

                if (!m) return;

                const key = getBuildingKeyFromNoteLabel(m[1]);
                const date = parseDdMmYyyyDateTime(m[3]);
                if (!key || !date) return;

                result.buildings.set(key, {
                    key,
                    label: TRACKED_BUILDINGS[key].label,
                    level: parseInt(m[2], 10),
                    date,
                    source: (m[4] || 'ESP').toUpperCase(),
                });
            });
        }

        // Tout ce qui precede BATIMENTS contient les blocs DEFF/OFF et
        // eventuellement du texte manuel.
        const intelLines = buildingHeaderIndex >= 0
            ? lines.slice(0, buildingHeaderIndex)
            : lines;

        const intelRaw = cleanBbcodeText(intelLines.join('\n'));
        const intelPlain = cleanBbcodeText(
            intelRaw.replace(/\[[^\]]+\]/g, '')
        );

        // --------------------------------------------------------------------
        // Format v3/v4 :
        // [b]DEFF[/b] | 18/08/2026 10:50:53
        // ...
        // [b]OFF[/b] | 18/08/2026 12:00:00
        // ...
        // --------------------------------------------------------------------
        const headers = [];

        intelLines.forEach((line, index) => {
            const headerPlain = line
                .replace(/\[\/?b\]/gi, '')
                .trim();

            const m = headerPlain.match(
                /^(DEFF|OFF|VIDE)\s*\|\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i
            );

            if (m) {
                const date = parseDdMmYyyyDateTime(m[2]);
                if (date) {
                    headers.push({
                        index,
                        key: m[1].toUpperCase() === 'OFF' ? 'OFF' : 'DEF',
                        date,
                    });
                }
            }
        });

        if (headers.length) {
            result.recognized = true;

            if (headers[0].index > 0) {
                result.manualText = cleanBbcodeText(
                    intelLines.slice(0, headers[0].index).join('\n')
                );
            }

            headers.forEach((header, i) => {
                const end = i + 1 < headers.length
                    ? headers[i + 1].index
                    : intelLines.length;

                const bbcode = cleanBbcodeText(
                    intelLines.slice(header.index, end).join('\n')
                );

                const previous = result.blocks.get(header.key);
                if (!previous || header.date.getTime() > previous.date.getTime()) {
                    result.blocks.set(header.key, {
                        key: header.key,
                        date: header.date,
                        bbcode,
                    });
                }
            });

            return result;
        }

        // --------------------------------------------------------------------
        // Ancien format v1/v2 :
        // 18/08/2026 10:50:53 -
        // Full OFF
        // ...
        // --------------------------------------------------------------------
        const legacyDate = parseDdMmYyyyDateTime(intelPlain);

        if (legacyDate) {
            let key = null;

            if (/\bVillage vide\b/i.test(intelPlain) || /\bDEFF\b/i.test(intelPlain)) {
                key = 'DEF';
            } else if (/\bOFF\b/i.test(intelPlain)) {
                key = 'OFF';
            }

            if (key) {
                result.recognized = true;
                result.blocks.set(key, {
                    key,
                    date: legacyDate,
                    bbcode: intelRaw,
                });
                return result;
            }
        }

        // Si un bloc BATIMENTS a ete reconnu, le texte qui le precede est
        // conserve comme texte manuel. Sinon toute la note est manuelle.
        result.manualText = intelRaw;
        return result;
    }

    async function getExistingNoteInfo(villageId) {
        try {
            const html = await $.ajax({
                url: villageInfoUrl(villageId),
                method: 'GET',
                timeout: 30000,
            });

            const doc = new DOMParser().parseFromString(html, 'text/html');
            const $note = $(doc).find('#own_village_note .village-note').first();

            if (!$note.length) {
                return { exists: false, text: '', bbcode: '' };
            }

            // Le script de reference utilise children[1] comme contenu de la note.
            const noteElement = $note[0];
            const contentNode =
                noteElement.children && noteElement.children.length > 1
                    ? noteElement.children[1]
                    : noteElement;

            const text = $(contentNode)
                .text()
                .replace(/\u00a0/g, ' ')
                .trim();

            const bbcode = cleanBbcodeText(htmlNodeToBbcode(contentNode));

            if (!text && !bbcode) {
                return { exists: false, text: '', bbcode: '' };
            }

            return {
                exists: true,
                text,
                bbcode,
            };
        } catch (e) {
            return {
                exists: false,
                text: '',
                bbcode: '',
                readError: true,
            };
        }
    }

    function saveVillageNote(villageId, note) {
        return new Promise(resolve => {
            let finished = false;

            const done = result => {
                if (finished) return;
                finished = true;
                resolve(result);
            };

            const timer = setTimeout(() => {
                done({ ok: false, reason: 'Timeout ecriture note' });
            }, 15000);

            try {
                TribalWars.post(
                    'info_village',
                    {
                        ajaxaction: 'edit_notes',
                        id: villageId,
                    },
                    {
                        note,
                    },
                    function () {
                        clearTimeout(timer);
                        done({ ok: true });
                    },
                    function () {
                        clearTimeout(timer);
                        done({ ok: false, reason: 'Erreur POST note' });
                    }
                );
            } catch (e) {
                clearTimeout(timer);
                done({ ok: false, reason: 'Exception POST note' });
            }
        });
    }

    function buildBuildingBlock(buildings) {
        const lines = ['[b]BATIMENTS[/b]'];

        BUILDING_ORDER.forEach(key => {
            const info = buildings.get(key);
            if (!info) return;

            lines.push(
                `${TRACKED_BUILDINGS[key].label}: ${info.level} | ${formatDateTime(info.date)} | ${info.source || 'ESP'}`
            );
        });

        return lines.length > 1 ? lines.join('\n') : '';
    }

    function shouldReplaceBuilding(previous, candidate) {
        if (!previous) return true;

        const previousTime = previous.date.getTime();
        const candidateTime = candidate.date.getTime();

        if (candidateTime > previousTime) return true;
        if (candidateTime < previousTime) return false;

        const previousPriority = BUILDING_SOURCE_PRIORITY[previous.source] || 0;
        const candidatePriority = BUILDING_SOURCE_PRIORITY[candidate.source] || 0;

        if (candidatePriority > previousPriority) return true;
        if (candidatePriority < previousPriority) return false;

        // Meme combat/date et meme niveau de confiance : une information de
        // degats relue directement dans le rapport doit pouvoir corriger une
        // valeur v4.2 erronee deja ecrite dans la note.
        if (
            (candidate.source === 'CATA' || candidate.source === 'BELIER') &&
            (candidate.level !== previous.level || candidate.source !== previous.source)
        ) {
            return true;
        }

        return false;
    }

    function cleanupLegacyV42FalseBuildingDamage(buildings, group, decisions) {
        // La v4.2 pouvait attribuer plusieurs batiments au meme rapport de
        // catapultage a cause d'un <tr> parent imbrique. Une attaque ne peut
        // normalement fournir qu'un degat CATA cible + eventuellement la
        // muraille via BELIER. Si une ancienne note contient >= 3 batiments
        // CATA/BELIER au meme timestamp et que le rapport relu n'en confirme
        // qu'un ou deux, on supprime uniquement les entrees non confirmees.
        const candidatesByTime = new Map();

        BUILDING_ORDER.forEach(key => {
            const c = group.buildings ? group.buildings[key] : null;
            if (!c || (c.source !== 'CATA' && c.source !== 'BELIER')) return;
            const t = c.date.getTime();
            if (!candidatesByTime.has(t)) candidatesByTime.set(t, new Set());
            candidatesByTime.get(t).add(key);
        });

        candidatesByTime.forEach((confirmedKeys, timestamp) => {
            const legacyAtSameTime = [];

            buildings.forEach((info, key) => {
                if (!info || info.date.getTime() !== timestamp) return;
                if (info.source !== 'CATA' && info.source !== 'BELIER') return;
                legacyAtSameTime.push({ key, info });
            });

            // Signature du bug v4.2 : trop de batiments de siege pour un meme combat.
            if (legacyAtSameTime.length < 3) return;
            if (confirmedKeys.size > 2) return;

            legacyAtSameTime.forEach(({ key, info }) => {
                if (confirmedKeys.has(key)) return;
                buildings.delete(key);
                decisions.push({
                    kind: 'building',
                    key,
                    action: 'cleanup-v42',
                    previous: info,
                });
            });
        });
    }

    function buildMergedNote(parsedExisting, group) {
        const blocks = new Map(parsedExisting.blocks);
        const buildings = new Map(parsedExisting.buildings || []);
        const decisions = [];
        let changed = false;

        const beforeCleanupSize = buildings.size;
        cleanupLegacyV42FalseBuildingDamage(buildings, group, decisions);
        if (buildings.size !== beforeCleanupSize) changed = true;

        ['DEF', 'OFF'].forEach(key => {
            const candidate = group.byType[key];
            if (!candidate) return;

            const previous = blocks.get(key);

            if (!previous || candidate.combatDate.getTime() > previous.date.getTime()) {
                blocks.set(key, {
                    key,
                    date: candidate.combatDate,
                    bbcode: candidate.intelBlock,
                });

                changed = true;
                decisions.push({
                    kind: 'troops',
                    key,
                    action: 'update',
                    candidate,
                    previous,
                });
            } else {
                decisions.push({
                    kind: 'troops',
                    key,
                    action: 'keep',
                    candidate,
                    previous,
                });
            }
        });

        BUILDING_ORDER.forEach(key => {
            const candidate = group.buildings ? group.buildings[key] : null;
            if (!candidate) return;

            const previous = buildings.get(key);

            if (shouldReplaceBuilding(previous, candidate)) {
                buildings.set(key, candidate);
                changed = true;
                decisions.push({
                    kind: 'building',
                    key,
                    action: 'update',
                    candidate,
                    previous,
                });
            } else {
                decisions.push({
                    kind: 'building',
                    key,
                    action: 'keep',
                    candidate,
                    previous,
                });
            }
        });

        const parts = [];

        // Une eventuelle note manuelle reconnue avant nos blocs est conservee.
        if (parsedExisting.manualText) {
            parts.push(parsedExisting.manualText);
        }

        // Priorite visuelle a la DEFF.
        if (blocks.has('DEF')) parts.push(blocks.get('DEF').bbcode);
        if (blocks.has('OFF')) parts.push(blocks.get('OFF').bbcode);

        const buildingBlock = buildBuildingBlock(buildings);
        if (buildingBlock) parts.push(buildingBlock);

        return {
            changed,
            decisions,
            note: cleanBbcodeText(parts.join('\n\n')),
        };
    }

    async function updateVillageFromGroup(group, protectManualNotes) {
        const existing = await getExistingNoteInfo(group.villageId);
        const parsedExisting = parseExistingIntel(existing);

        if (
            existing.exists &&
            !parsedExisting.recognized &&
            parsedExisting.manualText &&
            protectManualNotes
        ) {
            return {
                status: 'skip',
                reason: 'note existante sans bloc GT reconnu (protegee)',
            };
        }

        const merged = buildMergedNote(parsedExisting, group);

        if (!merged.changed) {
            const kept = merged.decisions
                .filter(d => d.action === 'keep')
                .map(d => {
                    if (d.kind === 'building') {
                        const label = TRACKED_BUILDINGS[d.key].label;
                        return `${label} : niv.${d.previous.level} — deja plus recent ou identique — ${formatDateTime(d.previous.date)}`;
                    }

                    const label = d.key === 'DEF' ? 'DEFF' : 'OFF';
                    return `${label} : deja plus recente ou identique — ${formatDateTime(d.previous.date)}`;
                });

            return {
                status: 'skip',
                reason: kept.length ? kept.join('\n') : 'aucune information plus recente',
            };
        }

        const post = await saveVillageNote(group.villageId, merged.note);
        if (!post.ok) {
            return { status: 'error', reason: post.reason || 'Erreur ecriture' };
        }

        return {
            status: 'ok',
            decisions: merged.decisions,
            note: merged.note,
        };
    }

    // ========================================================================
    // Batch principal    // ========================================================================
    // Batch principal
    // ========================================================================

    async function runBatch() {
        const sourceMode = $('#' + PREFIX + 'Source').val();
        const targetMode = $('#' + PREFIX + 'Target').val();
        const protectManualNotes = $('#' + PREFIX + 'Protect').is(':checked');
        const debugOpenReports = $('#' + PREFIX + 'DebugOpen').is(':checked');

        $('#' + PREFIX + 'Log').empty();
        $('#' + PREFIX + 'Summary').empty();
        resetMetrics();
        setBusy(true);
        updateProgress(0, 1, 'Recherche des rapports...');

        try {
            const reportLinks = await getReportLinks(sourceMode);

            if (!reportLinks.length) {
                UI.ErrorMessage(
                    sourceMode === 'SELECTED'
                        ? 'Aucun rapport coche.'
                        : 'Aucun rapport exploitable trouve.'
                );
                return;
            }

            setMetric('Found', reportLinks.length);
            appendLog('info', `${reportLinks.length} rapport(s) trouve(s).`);

            // ----------------------------------------------------------------
            // DEBUG VISUEL OPTIONNEL
            // ----------------------------------------------------------------
            if (debugOpenReports) {
                appendLog('info', 'DEBUG : ouverture des rapports retenus dans de nouveaux onglets...');

                for (const item of reportLinks) {
                    appendLogLink('info', `Rapport ${item.reportId}`, item.url);

                    try {
                        const tab = window.open(item.url, '_blank');
                        if (tab) {
                            try { tab.opener = null; } catch (_) {}
                        } else {
                            appendLog('warn', `Rapport ${item.reportId} : ouverture bloquee par le navigateur, clique sur le lien ci-dessus.`);
                        }
                    } catch (e) {
                        appendLog('warn', `Rapport ${item.reportId} : impossible d ouvrir automatiquement l onglet.`);
                    }
                }

                await sleep(250);
            }

            // ----------------------------------------------------------------
            // Etape 1 : lecture / parsing de tous les rapports
            //
            // v4.8 : chaque rapport est charge une seule fois, puis toutes les
            // informations sont consolidees LOCALement en memoire. Aucune note
            // n'est relue ou reecrite pendant cette phase.
            // ----------------------------------------------------------------
            const parsedReports = [];
            let parsedCount = 0;
            let ignoredCount = 0;

            for (let i = 0; i < reportLinks.length; i++) {
                const item = reportLinks[i];
                updateProgress(i, reportLinks.length, `Lecture des rapports : ${i + 1}/${reportLinks.length}`);

                const parsed = await fetchAndParseReport(item, targetMode);

                if (!parsed.ok) {
                    ignoredCount++;
                    appendLog('skip', `Rapport ${item.reportId} : ${parsed.reason}`);
                } else {
                    parsedCount++;
                    parsedReports.push(parsed);

                    if (!parsed.intelKey) {
                        const buildingLabels = Object.keys(parsed.buildings || {})
                            .map(k => `${TRACKED_BUILDINGS[k].label} ${parsed.buildings[k].level}`);

                        appendLog(
                            'info',
                            `${parsed.villageText} : rapport ${parsed.reportId}, troupes masquees, intel batiments uniquement${buildingLabels.length ? ' (' + buildingLabels.join(', ') + ')' : ''}`
                        );
                    }
                }

                setMetric('Parsed', parsedCount);
                setMetric('Ignored', ignoredCount);

                await sleep(CONFIG.requestDelayMs);
            }

            if (!parsedReports.length) {
                UI.ErrorMessage('Aucun rapport ne contient d information exploitable (troupes ou batiments).');
                return;
            }

            // ----------------------------------------------------------------
            // Etape 2 : consolidation LOCALE, du plus ancien au plus recent
            // ----------------------------------------------------------------
            parsedReports.sort((a, b) => {
                const dateDiff = a.combatDate.getTime() - b.combatDate.getTime();
                if (dateDiff !== 0) return dateDiff;

                const aId = Number(a.reportId) || 0;
                const bId = Number(b.reportId) || 0;
                return aId - bId;
            });

            const groupsByVillage = new Map();

            for (const parsed of parsedReports) {
                let group = groupsByVillage.get(parsed.villageId);

                if (!group) {
                    group = {
                        villageId: parsed.villageId,
                        villageText: parsed.villageText,
                        byType: {
                            DEF: null,
                            OFF: null,
                        },
                        buildings: {},
                        reportIds: [],
                    };
                    groupsByVillage.set(parsed.villageId, group);
                }

                group.reportIds.push(parsed.reportId);

                // DEFF et OFF sont independantes. Comme les rapports sont tries
                // chronologiquement, le dernier rapport pertinent devient l'etat
                // final local pour ce type d'intel.
                if (parsed.intelKey) {
                    const key = parsed.intelKey;
                    const previous = group.byType[key];

                    if (
                        !previous ||
                        parsed.combatDate.getTime() > previous.combatDate.getTime() ||
                        (
                            parsed.combatDate.getTime() === previous.combatDate.getTime() &&
                            (Number(parsed.reportId) || 0) >= (Number(previous.reportId) || 0)
                        )
                    ) {
                        group.byType[key] = parsed;
                    }
                }

                // Chaque batiment evolue independamment. Exemple : cinq frappes
                // catapultes sur cinq batiments differents donnent cinq niveaux
                // conserves dans le meme etat local. Une frappe plus recente sur
                // le meme batiment remplace uniquement ce batiment.
                Object.entries(parsed.buildings || {}).forEach(([buildingKey, buildingInfo]) => {
                    const previousBuilding = group.buildings[buildingKey];
                    if (shouldReplaceBuilding(previousBuilding, buildingInfo)) {
                        group.buildings[buildingKey] = buildingInfo;
                    }
                });
            }

            const candidates = Array.from(groupsByVillage.values()).sort((a, b) => {
                const aTimes = ['DEF', 'OFF']
                    .map(k => a.byType[k] ? a.byType[k].combatDate.getTime() : 0)
                    .concat(BUILDING_ORDER.map(k => a.buildings[k] ? a.buildings[k].date.getTime() : 0));
                const bTimes = ['DEF', 'OFF']
                    .map(k => b.byType[k] ? b.byType[k].combatDate.getTime() : 0)
                    .concat(BUILDING_ORDER.map(k => b.buildings[k] ? b.buildings[k].date.getTime() : 0));

                return Math.max(...aTimes) - Math.max(...bTimes);
            });

            const uniqueVillageCount = candidates.length;
            setMetric('Villages', uniqueVillageCount);

            appendLog(
                'info',
                `${parsedCount} rapport(s) analyse(s), ${uniqueVillageCount} village(s) unique(s). Consolidation locale terminee : une lecture + au maximum une ecriture de note par village.`
            );

            // ----------------------------------------------------------------
            // Etape 3 : une seule fusion avec la note existante par village
            // ----------------------------------------------------------------
            let updated = 0;
            let skipped = 0;
            let errors = 0;

            for (let i = 0; i < candidates.length; i++) {
                const group = candidates[i];
                updateProgress(
                    i,
                    candidates.length,
                    `Mise a jour des villages : ${i + 1}/${candidates.length}`
                );

                // updateVillageFromGroup effectue ici seulement :
                // 1 GET de la note existante, fusion avec l'etat local consolide,
                // puis 1 POST uniquement si quelque chose doit vraiment changer.
                const result = await updateVillageFromGroup(group, protectManualNotes);

                if (result.status === 'ok') {
                    updated++;
                    const details = [];

                    if (group.byType.DEF && group.byType.DEF.classification) {
                        const c = group.byType.DEF.classification;
                        details.push(
                            c.isEmpty
                                ? 'DEFF: Village vide'
                                : `DEFF: ${c.size} ${c.type}, ${c.totalUnits} unites`
                        );
                    }

                    if (group.byType.OFF && group.byType.OFF.classification) {
                        const c = group.byType.OFF.classification;
                        details.push(
                            c.totalUnits === 0
                                ? 'OFF: 0 survivant'
                                : `OFF: ${c.size} ${c.type}, ${c.totalUnits} unites`
                        );
                    }

                    const buildingSummary = BUILDING_ORDER
                        .filter(k => group.buildings[k])
                        .map(k => `${TRACKED_BUILDINGS[k].label} ${group.buildings[k].level}`);

                    if (buildingSummary.length) {
                        details.push(`BAT: ${buildingSummary.join(', ')}`);
                    }

                    appendLog(
                        'ok',
                        [
                            `${group.villageText} • ${group.reportIds.length} rapport(s) consolide(s) localement`,
                            ...details,
                        ]
                    );
                } else if (result.status === 'skip') {
                    skipped++;
                    appendLog(
                        'skip',
                        [
                            `${group.villageText} • ${group.reportIds.length} rapport(s) consolide(s) — aucune mise a jour`,
                            ...String(result.reason || '').split(/\r?\n/),
                        ]
                    );
                } else {
                    errors++;
                    appendLog(
                        'error',
                        [
                            `${group.villageText} • ${group.reportIds.length} rapport(s) consolide(s) — erreur`,
                            result.reason || 'Erreur inconnue',
                        ]
                    );
                }

                setMetric('Updated', updated);
                setMetric('Skipped', skipped);
                setMetric('Errors', errors);

                await sleep(CONFIG.requestDelayMs);
            }

            updateProgress(candidates.length, candidates.length, 'Terminé');

            const summary = `
                <b>Analyse terminée.</b> ${parsedCount} rapport(s) exploitable(s) consolidé(s) sur ${uniqueVillageCount} village(s).
                ${updated} note(s) mise(s) à jour, ${skipped} conservée(s), ${errors} erreur(s).
            `;
            $('#' + PREFIX + 'Summary').html(summary);

            if (errors > 0) {
                UI.ErrorMessage(`Traitement termine avec ${errors} erreur(s). ${updated} note(s) village mise(s) a jour.`);
            } else {
                UI.SuccessMessage(`${updated} note(s) village mise(s) a jour apres consolidation locale.`);
            }
        } catch (e) {
            console.error(e);
            appendLog('error', e && e.message ? e.message : String(e));
            UI.ErrorMessage('Erreur pendant le traitement batch. Regarde la console et le journal du script.');
        } finally {
            setBusy(false);
        }
    }

    if (typeof saveVillageNote !== 'function') {
        console.error('[' + SCRIPT_NAME + '] ERREUR INTERNE v' + SCRIPT_VERSION + ' : saveVillageNote absent');
        UI.ErrorMessage('Erreur interne du script v' + SCRIPT_VERSION + ' : fonction de sauvegarde absente.');
        return;
    }

    renderUi();
})();
