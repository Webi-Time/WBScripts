(async function () {
    'use strict';

    /*
     * Webi-Time Map Planner v3.2.0
     * - Synchronisation Villages affichés <-> Types de bonus
     * - "Tous" réinitialise automatiquement "Tous les bonus"
     * - Moteur de masquage attaques/retours restauré depuis la v3.1.1 (version validée)
     * - Exclusion ciblée des badges bonus, dont Population +10 %
     * - Conservation des synchronisations filtres de la v3.1.4
     */

    const WEBITIME_RESOURCE_NAME = 'Webi-Time Map Planner';
    const WEBITIME_RESOURCE_AUTHOR = 'NoLife4Ever';
    const WEBITIME_RESOURCE_VERSION = '3.2.0';
    const WEBITIME_RESOURCE_STYLE_ID = 'webiTimeMapPlannerStyle';
    const WEBITIME_SOURCE_URL = 'https://github.com/Webi-Time/WBScripts/tree/GT/Datas';
    const WEBITIME_COMMON_URL = 'https://webi-time.github.io/WBScripts/Datas/WebiTime_GT_Common.js';
    const WEBITIME_COMMON_FALLBACK_URL = 'https://cdn.jsdelivr.net/gh/Webi-Time/WBScripts@GT/Datas/WebiTime_GT_Common.js';

    /*
     * IMPORTANT :
     * Sur la carte Guerre Tribale, le contexte utile peut être window.main.
     * On détermine donc win/doc AVANT de charger WebiTime_GT_Common.js pour
     * que le composant partagé soit exécuté dans la même fenêtre que TWMap.
     */
    var win = (window.frames.length > 0 && window.main) ? window.main : window;
    var doc = win.document;
    var $ = win.jQuery || window.jQuery;

    /*
     * document.currentScript n'est pas toujours renseigné avec $.getScript().
     * On l'utilise quand même comme optimisation, mais jamais comme dépendance.
     */
    const WEBITIME_RESOURCE_SCRIPT_SRC =
        (doc.currentScript && doc.currentScript.src) ||
        (document.currentScript && document.currentScript.src) ||
        '';

    function getExistingWebiTimeCommon() {
        if (win.WebiTimeGT && typeof win.WebiTimeGT.injectMapPlannerStyles === 'function') {
            return win.WebiTimeGT;
        }

        if (window.WebiTimeGT && typeof window.WebiTimeGT.injectMapPlannerStyles === 'function') {
            /*
             * Si le composant a déjà été chargé dans la fenêtre parente,
             * on peut le réutiliser directement.
             */
            try {
                win.WebiTimeGT = window.WebiTimeGT;
            } catch (_) {}
            return window.WebiTimeGT;
        }

        return null;
    }

    function loadCommonScript(url) {
        return new Promise((resolve, reject) => {
            const script = doc.createElement('script');
            script.type = 'text/javascript';
            script.src = url;
            script.async = true;

            script.onload = function () {
                const api = getExistingWebiTimeCommon();
                if (api) {
                    resolve(api);
                } else {
                    reject(new Error(
                        'Le fichier a été chargé mais window.WebiTimeGT est absent : ' + url
                    ));
                }
            };

            script.onerror = function () {
                reject(new Error('Chargement impossible : ' + url));
            };

            (doc.head || doc.documentElement).appendChild(script);
        });
    }

    async function ensureWebiTimeCommon() {
        const existing = getExistingWebiTimeCommon();
        if (existing) return existing;

        const candidates = [];

        /*
         * 1. Même dossier que le Map Planner lorsque currentScript est connu.
         */
        try {
            if (WEBITIME_RESOURCE_SCRIPT_SRC) {
                const relativeUrl = new URL(
                    'WebiTime_GT_Common.js',
                    WEBITIME_RESOURCE_SCRIPT_SRC
                );
                relativeUrl.searchParams.set('_wt', Date.now());
                candidates.push(relativeUrl.href);
            }
        } catch (error) {
            console.warn(
                '[Webi-Time Map Planner] URL relative du composant commun invalide.',
                error
            );
        }

        /*
         * 2. GitHub Pages officiel.
         * 3. jsDelivr sur la branche GT.
         */
        candidates.push(WEBITIME_COMMON_URL + '?_wt=' + Date.now());
        candidates.push(WEBITIME_COMMON_FALLBACK_URL + '?_wt=' + Date.now());

        const tried = new Set();

        for (const url of candidates) {
            if (!url || tried.has(url)) continue;
            tried.add(url);

            try {
                console.debug(
                    '[Webi-Time Map Planner] Chargement WebiTime_GT_Common.js :',
                    url
                );

                const api = await loadCommonScript(url);
                if (api) {
                    console.debug(
                        '[Webi-Time Map Planner] WebiTime_GT_Common.js chargé :',
                        url
                    );
                    return api;
                }
            } catch (error) {
                console.warn(
                    '[Webi-Time Map Planner] Échec du chargement commun :',
                    url,
                    error
                );
            }
        }

        /*
         * Dernière vérification : dans certains navigateurs le script a pu
         * terminer son initialisation juste après l'événement load.
         */
        await new Promise(resolve => win.setTimeout(resolve, 50));
        return getExistingWebiTimeCommon();
    }

    const WEBITIME_UI = await ensureWebiTimeCommon();

    if (!WEBITIME_UI) {
        console.error(
            '[Webi-Time Map Planner] Impossible de charger WebiTime_GT_Common.js.',
            {
                windowHasWebiTimeGT: !!window.WebiTimeGT,
                mainHasWebiTimeGT: !!(win && win.WebiTimeGT),
                hasJQueryTop: !!window.jQuery,
                hasJQueryMain: !!(win && win.jQuery),
                commonUrl: WEBITIME_COMMON_URL,
                fallbackUrl: WEBITIME_COMMON_FALLBACK_URL
            }
        );

        if (typeof win.UI !== 'undefined' && win.UI.ErrorMessage) {
            win.UI.ErrorMessage(
                'Impossible de charger le composant Webi-Time commun. Voir la console.'
            );
        } else if (typeof UI !== 'undefined' && UI.ErrorMessage) {
            UI.ErrorMessage(
                'Impossible de charger le composant Webi-Time commun. Voir la console.'
            );
        }

        return;
    }

    WEBITIME_UI.injectStyles();

    if (!win.game_data) {
        alert('Impossible de lire game_data. Recharge la page puis relance le script.');
        return;
    }

    if (win.game_data.screen !== 'map') {
        alert('Ce script doit être lancé depuis la carte. Redirection...');
        win.location.href = win.game_data.link_base_pure.replace(/screen=\w*/i, 'screen=map');
        return;
    }

    if (!$ || !win.TWMap) {
        alert('La carte Guerre Tribale n\'est pas encore chargée. Recharge la page puis relance le script.');
        return;
    }

    if (win.GTMapPlanner && typeof win.GTMapPlanner.destroy === 'function') {
        win.GTMapPlanner.destroy();
    }
    if (win.GTMapFilter && typeof win.GTMapFilter.destroy === 'function') {
        win.GTMapFilter.destroy();
    }

    var CHURCH_RADIUS = {
        1: 4,
        2: 6,
        3: 8
    };

    // La documentation InnoGames actuelle indique seulement que la première église
    // a une portée plus grande. La valeur historique de Guerre Tribale est 6 cases.
    var FIRST_CHURCH_RADIUS = 6;

    var WATCHTOWER_RADIUS = {
        1: 1.1,
        2: 1.3,
        3: 1.5,
        4: 1.7,
        5: 2.0,
        6: 2.3,
        7: 2.6,
        8: 3.0,
        9: 3.4,
        10: 3.9,
        11: 4.4,
        12: 5.1,
        13: 5.8,
        14: 6.7,
        15: 7.6,
        16: 8.7,
        17: 10.0,
        18: 11.5,
        19: 13.1,
        20: 15.0
    };

    // Types officiels des villages bonus. L'identifiant correspond à la 7e colonne
    // de map/village.txt sur les mondes où les villages bonus sont activés.
    var BONUS = {
        1: { name: 'Bois +100%', short: 'Bois', icon: 'wood.png' },
        2: { name: 'Argile +100%', short: 'Argile', icon: 'stone.png' },
        3: { name: 'Fer +100%', short: 'Fer', icon: 'iron.png' },
        4: { name: 'Population +10%', short: 'Population', icon: 'farm.png' },
        5: { name: 'Caserne -33%', short: 'Caserne', icon: 'barracks.png' },
        6: { name: 'Écurie -33%', short: 'Écurie', icon: 'stable.png' },
        7: { name: 'Atelier -50%', short: 'Atelier', icon: 'garage.png' },
        8: { name: 'Ressources +30%', short: '30% ressources', icon: 'all.png' },
        9: { name: 'Entrepôt & Marché +50%', short: 'Entrepôt & Marché', icon: 'storage.png' }
    };

    var COLORS = {
        player: '#2d6cdf',
        barb: '#b84435',
        bonus: '#d4a017',
        playerBonus: '#7a42c7',
        myVillage: '#1f9d62',
        churchReal: '#3958e8',
        churchPlan: '#66c7ff',
        watchReal: '#d97924',
        watchPlan: '#ffae42'
    };

    var GT = {
        version: WEBITIME_RESOURCE_VERSION,
        bonusByCoord: {},
        bonusReady: false,
        buildingsReady: false,
        selected: { all: true, player: false, barb: false, bonus: false, playerBonus: false, myVillage: false },
        // Filtre secondaire appliqué uniquement aux villages qui possèdent un bonus.
        // "all" est exclusif ; sinon plusieurs types de bonus peuvent être combinés.
        selectedBonus: { all: true, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false },
        bonusFiltersExpanded: true,
        sectionsExpanded: { villages: true, realZones: true, plannedZones: true },
        labelMode: 'auto',
        showRealChurch: true,
        showRealWatch: true,
        showPlannedChurch: true,
        showPlannedWatch: true,
        hideAttackMarkers: true,
        realZones: [],
        plannedZones: [],
        oldOnMove: null,
        moveHandler: null,
        renderTimer: null,
        modifiedElements: [],
        counts: { all: 0, player: 0, barb: 0, bonus: 0, playerBonus: 0, myVillage: 0 },
        lastBuildingError: null,
        pickingCoord: false,
        coordinateClickHandler: null,
        coordinateKeyHandler: null,
        oldMapOnClick: null,
        mapClickPicker: null,
        hiddenAttackMarkerElements: [],
        attackMarkerObserver: null,
        oldPopupHandleMouseMove: null,
        popupMouseMoveHandler: null
    };

    function worldKey() {
        return (win.game_data && win.game_data.world) ? win.game_data.world : win.location.host;
    }

    function playerKey() {
        return (win.game_data && win.game_data.player && win.game_data.player.id) ? win.game_data.player.id : 'unknown';
    }

    function plannedStorageKey() {
        return 'gt_map_planner_zones_' + worldKey() + '_' + playerKey();
    }

    function bonusStorageKey() {
        return 'gt_map_planner_bonus_' + worldKey();
    }

    function settingsStorageKey() {
        return 'gt_map_planner_settings_' + worldKey() + '_' + playerKey();
    }

    function saveSettings() {
        try {
            win.localStorage.setItem(settingsStorageKey(), JSON.stringify({
                selected: GT.selected,
                selectedBonus: GT.selectedBonus,
                bonusFiltersExpanded: GT.bonusFiltersExpanded,
                sectionsExpanded: GT.sectionsExpanded,
                labelMode: GT.labelMode,
                showRealChurch: GT.showRealChurch,
                showRealWatch: GT.showRealWatch,
                showPlannedChurch: GT.showPlannedChurch,
                showPlannedWatch: GT.showPlannedWatch,
                hideAttackMarkers: GT.hideAttackMarkers
            }));
        } catch (_) {}
    }

    function loadSettings() {
        try {
            var saved = JSON.parse(win.localStorage.getItem(settingsStorageKey()) || 'null');
            if (!saved || typeof saved !== 'object') return;
            if (saved.selected && typeof saved.selected === 'object') {
                GT.selected = {
                    all: !!saved.selected.all,
                    player: !!saved.selected.player,
                    barb: !!saved.selected.barb,
                    bonus: !!saved.selected.bonus,
                    playerBonus: !!saved.selected.playerBonus,
                    myVillage: !!saved.selected.myVillage
                };
                if (!GT.selected.all && !GT.selected.player && !GT.selected.barb && !GT.selected.bonus && !GT.selected.playerBonus && !GT.selected.myVillage) {
                    GT.selected.all = true;
                }
            }
            if (saved.selectedBonus && typeof saved.selectedBonus === 'object') {
                GT.selectedBonus = {
                    all: !!saved.selectedBonus.all,
                    1: !!saved.selectedBonus[1],
                    2: !!saved.selectedBonus[2],
                    3: !!saved.selectedBonus[3],
                    4: !!saved.selectedBonus[4],
                    5: !!saved.selectedBonus[5],
                    6: !!saved.selectedBonus[6],
                    7: !!saved.selectedBonus[7],
                    8: !!saved.selectedBonus[8],
                    9: !!saved.selectedBonus[9]
                };
                if (!GT.selectedBonus.all && !GT.selectedBonus[1] && !GT.selectedBonus[2] && !GT.selectedBonus[3] && !GT.selectedBonus[4] && !GT.selectedBonus[5] && !GT.selectedBonus[6] && !GT.selectedBonus[7] && !GT.selectedBonus[8] && !GT.selectedBonus[9]) {
                    GT.selectedBonus.all = true;
                }
            }
            if (typeof saved.bonusFiltersExpanded === 'boolean') GT.bonusFiltersExpanded = saved.bonusFiltersExpanded;
            if (saved.sectionsExpanded && typeof saved.sectionsExpanded === 'object') {
                GT.sectionsExpanded = {
                    villages: saved.sectionsExpanded.villages !== false,
                    realZones: saved.sectionsExpanded.realZones !== false,
                    plannedZones: saved.sectionsExpanded.plannedZones !== false
                };
            }
            if (['auto','village','player','points','coord','tribe','none'].indexOf(saved.labelMode) >= 0) GT.labelMode = saved.labelMode;
            if (typeof saved.showRealChurch === 'boolean') GT.showRealChurch = saved.showRealChurch;
            if (typeof saved.showRealWatch === 'boolean') GT.showRealWatch = saved.showRealWatch;
            if (typeof saved.showPlannedChurch === 'boolean') GT.showPlannedChurch = saved.showPlannedChurch;
            if (typeof saved.showPlannedWatch === 'boolean') GT.showPlannedWatch = saved.showPlannedWatch;
            if (typeof saved.hideAttackMarkers === 'boolean') GT.hideAttackMarkers = saved.hideAttackMarkers;
        } catch (_) {}
    }

    function injectStyle() {
        WEBITIME_UI.injectStyles();
        WEBITIME_UI.injectMapPlannerStyles(WEBITIME_RESOURCE_STYLE_ID);
    }

    function parseCoord(value) {
        var m = String(value || '').match(/(?:^|\D)(\d{1,3})\|(\d{1,3})(?:\D|$)/);
        if (!m) return null;
        var x = parseInt(m[1], 10);
        var y = parseInt(m[2], 10);
        if (isNaN(x) || isNaN(y) || x < 0 || x > 999 || y < 0 || y > 999) return null;
        return { x: x, y: y, coord: x + '|' + y };
    }

    function formatNumber(n) {
        return String(n).replace('.', ',');
    }

    function formatPoints(points) {
        var n = parseInt(String(points || '0').replace(/\./g, ''), 10) || 0;
        try { return n.toLocaleString('fr-FR') + ' pts'; } catch (e) { return n + ' pts'; }
    }

    function getBonusId(coord) {
        return parseInt(GT.bonusByCoord[coord] || 0, 10) || 0;
    }

    function classify(village, coord) {
        var ownerId = parseInt(village.owner || 0, 10) || 0;
        var bonusId = getBonusId(coord);
        var myId = parseInt(win.game_data && win.game_data.player && win.game_data.player.id || 0, 10) || 0;
        var isOwn = ownerId > 0 && myId > 0 && ownerId === myId;
        var category;
        if (isOwn) category = 'myVillage';
        else if (ownerId > 0 && bonusId > 0) category = 'playerBonus';
        else if (ownerId > 0) category = 'player';
        else if (bonusId > 0) category = 'bonus';
        else category = 'barb';

        return {
            ownerId: ownerId,
            bonusId: bonusId,
            category: category,
            isPlayer: ownerId > 0,
            isBonus: bonusId > 0,
            isOwn: isOwn
        };
    }

    function categoryMatches(type) {
        if (GT.selected.all) return true;
        return !!GT.selected[type.category];
    }

    function bonusMatches(type) {
        // Le filtre de bonus ne masque jamais un village non bonus : il ne sert
        // qu'à choisir quels TYPES de villages bonus doivent rester visibles.
        if (!type.isBonus) return true;
        if (GT.selectedBonus.all) return true;
        return !!GT.selectedBonus[type.bonusId];
    }

    function categoryColor(category) {
        return COLORS[category] || '#555';
    }

    function restoreVillageStyles() {
        for (var i = 0; i < GT.modifiedElements.length; i++) {
            var el = GT.modifiedElements[i];
            if (!el || !el.style || !el.dataset) continue;
            if (Object.prototype.hasOwnProperty.call(el.dataset, 'gtmpPrevOpacity')) {
                el.style.opacity = el.dataset.gtmpPrevOpacity;
                delete el.dataset.gtmpPrevOpacity;
            }
            if (Object.prototype.hasOwnProperty.call(el.dataset, 'gtmpPrevFilter')) {
                el.style.filter = el.dataset.gtmpPrevFilter;
                delete el.dataset.gtmpPrevFilter;
            }
        }
        GT.modifiedElements = [];
    }

    function clearOverlays() {
        $(doc).find('.gtmp-overlay').remove();
        restoreVillageStyles();
    }

    /*
     * Guerre Tribale utilise plusieurs pictogrammes selon le type et l'état
     * d'un ordre. Les retours ne doivent donc pas être détectés uniquement
     * via l'icône d'attaque.
     *
     * Deux traitements sont volontairement séparés :
     *  - les lignes .command-row des popups GT ;
     *  - les marqueurs directement dessinés dans les couches de la carte.
     *
     * farm.png est accepté dans les command-row (retour de pillage), mais les
     * icônes bonus générées par ce script sont toujours exclues.
     */
    var COMMAND_MARKER_TOKENS = [
        '/return_',
        '/back.png',
        '/other_back.png',
        '/return.png',
        '/farm.png',
        '/support.png',
        '/attack_small.png',
        '/attack.png',
        'icons/commands_outgoing',
        'map/attack',
        '/graphic/unit/',
        '/unit/unit_',
        'unit_axe',
        'unit_spear',
        'unit_sword',
        'unit_archer',
        'unit_spy',
        'unit_light',
        'unit_marcher',
        'unit_heavy',
        'unit_ram',
        'unit_catapult',
        'unit_knight',
        'unit_snob'
    ];

    var COMMAND_IMAGE_SELECTOR = COMMAND_MARKER_TOKENS.map(function (token) {
        return 'img[src*="' + token.replace(/"/g, '\\"') + '"]';
    }).join(',');

    function isInsideGameMap(el) {
        if (!el || !el.closest) return false;
        return !!el.closest('#map, #map_wrap, #map_container');
    }

    function isCommandRow(el) {
        if (!el || el.nodeType !== 1 || !el.matches) return false;
        return el.matches('tr.command-row, .command-row');
    }

    function textContainsCommandMarker(text) {
        text = String(text || '').toLowerCase();
        for (var i = 0; i < COMMAND_MARKER_TOKENS.length; i++) {
            if (text.indexOf(COMMAND_MARKER_TOKENS[i]) >= 0) return true;
        }
        return false;
    }

    function commandRowContainsMarker(row) {
        if (!row || !row.querySelectorAll) return false;
        var rowTokens = ['/return_', '/back.png', '/other_back.png', '/return.png', '/farm.png', '/support.png', '/attack_small.png', '/attack.png'];
        var imgs = row.querySelectorAll('img');
        for (var i = 0; i < imgs.length; i++) {
            var text = (String(imgs[i].getAttribute('src') || imgs[i].src || '') + ' ' + String(imgs[i].getAttribute('srcset') || '')).toLowerCase();
            for (var j = 0; j < rowTokens.length; j++) {
                if (text.indexOf(rowTokens[j]) >= 0) return true;
            }
        }
        return false;
    }

    function isAttackMarkerImage(el) {
        if (!el || el.nodeType !== 1) return false;

        /* IMPORTANT : on conserve le moteur de masquage éprouvé de la v3.1.1,
           mais on exclut explicitement les icônes de bonus créées par le planner.
           Le bonus Population +10 % utilise lui aussi farm.png. */
        if (el.classList && el.classList.contains('gtmp-bonus-icon')) return false;
        if (el.closest && el.closest('.gtmp-bonus-badge, .gtmp-bonus-filter')) return false;

        /* Les lignes de commande du popup de carte sont parfois montées hors de #map.
           On les traite donc avant le contrôle d'appartenance à la carte. */
        if (isCommandRow(el)) return commandRowContainsMarker(el);

        var row = el.closest ? el.closest('tr.command-row, .command-row') : null;
        if (row && commandRowContainsMarker(row)) return true;

        if (!isInsideGameMap(el)) return false;

        var src = String(el.getAttribute && el.getAttribute('src') || el.src || '').toLowerCase();
        var srcset = String(el.getAttribute && el.getAttribute('srcset') || '').toLowerCase();
        var style = String(el.getAttribute && el.getAttribute('style') || '').toLowerCase();
        var title = String(el.getAttribute && el.getAttribute('title') || '').toLowerCase();
        var alt = String(el.getAttribute && el.getAttribute('alt') || '').toLowerCase();
        var cls = String(el.className || '').toLowerCase();
        var id = String(el.id || '').toLowerCase();
        var computedBg = '';
        try { computedBg = String(win.getComputedStyle(el).backgroundImage || '').toLowerCase(); } catch (_) {}
        var haystack = [src, srcset, style, computedBg, title, alt, cls, id].join(' ');

        return textContainsCommandMarker(haystack) ||
               haystack.indexOf('command/attack') >= 0 ||
               haystack.indexOf('command/return') >= 0 ||
               haystack.indexOf('command/back') >= 0 ||
               haystack.indexOf('command/other_back') >= 0 ||
               haystack.indexOf('/graphic/unit/') >= 0 ||
               haystack.indexOf('/unit/unit_') >= 0 ||
               haystack.indexOf('unit_axe') >= 0 ||
               title === 'attaque' || title === 'attack' ||
               title.indexOf('retour') >= 0 || title.indexOf('return') >= 0 ||
               alt === 'attaque' || alt === 'attack' ||
               alt.indexOf('retour') >= 0 || alt.indexOf('return') >= 0;
    }

    function rememberAndHideAttackMarker(el) {
        if (!isAttackMarkerImage(el)) return;
        if (!el.dataset || !el.style) return;

        /* Si l'image appartient à une ligne de commande, on masque toute la ligne.
           Cela retire aussi l'icône d'unité affichée à côté du pictogramme de retour. */
        var row = el.closest ? el.closest('tr.command-row, .command-row') : null;
        if (row && commandRowContainsMarker(row)) el = row;

        if (!el.dataset || !el.style) return;
        if (!Object.prototype.hasOwnProperty.call(el.dataset, 'gtmpAttackPrevDisplay')) {
            el.dataset.gtmpAttackPrevDisplay = el.style.display || '';
            GT.hiddenAttackMarkerElements.push(el);
        }
        if (el.style.getPropertyValue('display') !== 'none' || el.style.getPropertyPriority('display') !== 'important') {
            el.style.setProperty('display', 'none', 'important');
        }
    }

    function scanAndHideAttackMarkers(root) {
        if (!GT.hideAttackMarkers) return;
        root = root || doc;

        if (root.nodeType === 1) rememberAndHideAttackMarker(root);
        if (!root.querySelectorAll) return;

        var candidates = root.querySelectorAll('tr.command-row, .command-row, img, span[style], div[style], [srcset], [class*="command"], [id*="command"]');
        for (var i = 0; i < candidates.length; i++) rememberAndHideAttackMarker(candidates[i]);
    }

    function restoreAttackMarkers() {
        for (var i = 0; i < GT.hiddenAttackMarkerElements.length; i++) {
            var el = GT.hiddenAttackMarkerElements[i];
            if (!el || !el.style || !el.dataset) continue;
            if (Object.prototype.hasOwnProperty.call(el.dataset, 'gtmpAttackPrevDisplay')) {
                el.style.removeProperty('display');
                if (el.dataset.gtmpAttackPrevDisplay) el.style.display = el.dataset.gtmpAttackPrevDisplay;
                delete el.dataset.gtmpAttackPrevDisplay;
            }
        }
        GT.hiddenAttackMarkerElements = [];
    }

    function ensureAttackMarkerObserver() {
        if (GT.attackMarkerObserver || !win.MutationObserver || !doc.body) return;
        GT.attackMarkerObserver = new win.MutationObserver(function (mutations) {
            if (!GT.hideAttackMarkers) return;
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].type === 'attributes') {
                    rememberAndHideAttackMarker(mutations[i].target);
                    var attrRow = mutations[i].target.closest ? mutations[i].target.closest('tr.command-row, .command-row') : null;
                    if (attrRow) rememberAndHideAttackMarker(attrRow);
                    continue;
                }
                var added = mutations[i].addedNodes || [];
                for (var j = 0; j < added.length; j++) scanAndHideAttackMarkers(added[j]);
            }
        });
        GT.attackMarkerObserver.observe(doc.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'srcset', 'style', 'class', 'title', 'alt']
        });
    }

    function ensurePopupCommandFilter() {
        if (GT.popupMouseMoveHandler || !win.TWMap || !win.TWMap.popup || typeof win.TWMap.popup.handleMouseMove !== 'function') return;
        GT.oldPopupHandleMouseMove = win.TWMap.popup.handleMouseMove;
        GT.popupMouseMoveHandler = function () {
            var result = GT.oldPopupHandleMouseMove.apply(this, arguments);
            if (GT.hideAttackMarkers) {
                /* Le popup reconstruit les command-row à chaque survol : on filtre juste après. */
                win.setTimeout(function () { scanAndHideAttackMarkers(doc); }, 0);
            }
            return result;
        };
        win.TWMap.popup.handleMouseMove = GT.popupMouseMoveHandler;
    }

    function applyAttackMarkerVisibility() {
        if (!doc.body) return;
        ensureAttackMarkerObserver();
        ensurePopupCommandFilter();

        if (GT.hideAttackMarkers) {
            doc.body.classList.add('gtmp-hide-map-attacks');
            scanAndHideAttackMarkers(doc);
        } else {
            doc.body.classList.remove('gtmp-hide-map-attacks');
            restoreAttackMarkers();
        }
    }

    function saveOriginalStyle(el) {
        if (!el.dataset) return;
        if (!Object.prototype.hasOwnProperty.call(el.dataset, 'gtmpPrevOpacity')) {
            el.dataset.gtmpPrevOpacity = el.style.opacity || '';
            el.dataset.gtmpPrevFilter = el.style.filter || '';
            GT.modifiedElements.push(el);
        }
    }

    function dimVillage(el) {
        saveOriginalStyle(el);
        el.style.opacity = '0.08';
        el.style.filter = 'grayscale(1)';
    }

    function addVillageLabel(tox, text, bgColor, title) {
        var css = tox.style;
        var h = 14;
        var div = doc.createElement('div');
        div.className = 'gtmp-overlay gtmp-village-label';
        div.style.left = css.left;
        div.style.top = (parseInt(css.top || '0', 10) + 22) + 'px';
        div.style.minWidth = Math.max(20, win.TWMap.tileSize[0] - 1) + 'px';
        div.style.maxWidth = Math.max(50, win.TWMap.tileSize[0] * 3.0) + 'px';
        div.style.height = h + 'px';
        div.style.lineHeight = h + 'px';
        div.style.backgroundColor = bgColor;
        div.textContent = text;
        div.title = title || text;
        tox.parentNode.appendChild(div);
    }

    function addBonusIcon(tox, bonusId, title) {
        var bonus = BONUS[bonusId];
        if (!bonus) return;
        var css = tox.style;
        var tile = win.TWMap.tileSize[0] || 32;
        var badgeSize = Math.max(21, Math.min(28, Math.round(tile * 0.76)));
        var iconSize = Math.max(15, badgeSize - 7);

        var badge = doc.createElement('div');
        badge.className = 'gtmp-overlay gtmp-bonus-badge';
        badge.setAttribute('data-bonus-id', String(bonusId));
        badge.title = title || ('Bonus : ' + bonus.name);
        badge.style.width = badgeSize + 'px';
        badge.style.height = badgeSize + 'px';
        badge.style.left = (parseInt(css.left || '0', 10) + Math.max(0, tile - badgeSize + 7)) + 'px';
        badge.style.top = (parseInt(css.top || '0', 10) - 7) + 'px';

        var img = doc.createElement('img');
        img.className = 'gtmp-bonus-icon';
        img.src = '/graphic/bonus/' + bonus.icon;
        img.alt = bonus.name;
        img.style.width = iconSize + 'px';
        img.style.height = iconSize + 'px';
        badge.appendChild(img);
        tox.parentNode.appendChild(badge);
    }

    function visibleVillageEntries() {
        var out = [];
        var rows = win.TWMap.size[1];
        var cols = win.TWMap.size[0];
        for (var row = 0; row < rows; row++) {
            for (var col = 0; col < cols; col++) {
                var coordArr = win.TWMap.map.coordByPixel(
                    win.TWMap.map.pos[0] + (win.TWMap.tileSize[0] * col),
                    win.TWMap.map.pos[1] + (win.TWMap.tileSize[1] * row)
                );
                if (!coordArr) continue;
                var village = win.TWMap.villages[(coordArr[0] * 1000) + coordArr[1]] || win.TWMap.villages[coordArr.join('')];
                if (!village) continue;
                var tox = doc.getElementById('map_village_' + village.id);
                if (!tox || !tox.parentNode) continue;
                out.push({ x: coordArr[0], y: coordArr[1], coord: coordArr.join('|'), village: village, el: tox });
            }
        }
        return out;
    }

    function getMapAnchor(entries) {
        for (var i = 0; i < entries.length; i++) {
            var el = entries[i].el;
            var left = parseFloat(el.style.left);
            var top = parseFloat(el.style.top);
            if (!isNaN(left) && !isNaN(top) && el.parentNode) {
                return {
                    x: entries[i].x,
                    y: entries[i].y,
                    left: left,
                    top: top,
                    parent: el.parentNode,
                    el: el
                };
            }
        }
        return null;
    }

    function getRadiusForZone(zone) {
        var level = parseInt(zone.level, 10) || 0;
        if (zone.type === 'church') return CHURCH_RADIUS[level] || 0;
        if (zone.type === 'church_f') return FIRST_CHURCH_RADIUS;
        if (zone.type === 'watchtower') return WATCHTOWER_RADIUS[level] || 0;
        return 0;
    }

    function zoneTitle(zone) {
        var radius = getRadiusForZone(zone);
        if (zone.type === 'church_f') return 'Première église — ' + zone.coord + ' — rayon ' + formatNumber(radius);
        if (zone.type === 'church') return 'Église N' + zone.level + ' — ' + zone.coord + ' — rayon ' + formatNumber(radius);
        return 'Tour de guet N' + zone.level + ' — ' + zone.coord + ' — rayon ' + formatNumber(radius);
    }

    function zoneEnabled(zone) {
        if (zone.planned) {
            if (zone.type === 'watchtower') return GT.showPlannedWatch;
            return GT.showPlannedChurch;
        }
        if (zone.type === 'watchtower') return GT.showRealWatch;
        return GT.showRealChurch;
    }

    function renderZone(zone, anchor) {
        if (!anchor || !zoneEnabled(zone)) return;
        var parsed = parseCoord(zone.coord);
        var radius = getRadiusForZone(zone);
        if (!parsed || !radius) return;

        var tileW = win.TWMap.tileSize[0];
        var tileH = win.TWMap.tileSize[1];
        var centerX = anchor.left + ((parsed.x - anchor.x) * tileW) + (tileW / 2);
        var centerY = anchor.top + ((parsed.y - anchor.y) * tileH) + (tileH / 2);
        var radiusX = radius * tileW;
        var radiusY = radius * tileH;

        // Ne crée pas de cercle totalement éloigné de la zone chargée.
        var maxW = win.TWMap.size[0] * tileW;
        var maxH = win.TWMap.size[1] * tileH;
        if (centerX + radiusX < -tileW || centerY + radiusY < -tileH || centerX - radiusX > maxW + tileW || centerY - radiusY > maxH + tileH) {
            return;
        }

        var isChurch = zone.type === 'church' || zone.type === 'church_f';
        var color = isChurch ? (zone.planned ? COLORS.churchPlan : COLORS.churchReal) : (zone.planned ? COLORS.watchPlan : COLORS.watchReal);

        var circle = doc.createElement('div');
        circle.className = 'gtmp-overlay gtmp-zone-overlay';
        circle.title = zoneTitle(zone);
        circle.style.left = (centerX - radiusX) + 'px';
        circle.style.top = (centerY - radiusY) + 'px';
        circle.style.width = (radiusX * 2) + 'px';
        circle.style.height = (radiusY * 2) + 'px';
        circle.style.zIndex = zone.planned ? '4' : '3';

        if (isChurch) {
            // Reprend le rendu visuel de la zone de croyance native :
            // contour bleu marqué + halo diffus, sans aplat bleu sur toute la zone.
            if (zone.planned) {
                circle.style.border = '3px dashed rgba(102,199,255,.92)';
                circle.style.background = 'rgba(70,160,255,.018)';
                circle.style.boxShadow = '0 0 0 3px rgba(64,170,255,.10), 0 0 11px 4px rgba(65,160,255,.24), inset 0 0 0 2px rgba(130,220,255,.10)';
            } else {
                circle.style.border = '2px solid rgba(55,82,232,.86)';
                circle.style.background = 'rgba(45,72,215,.012)';
                circle.style.boxShadow = '0 0 0 4px rgba(45,70,220,.18), 0 0 11px 6px rgba(46,69,220,.25), inset 0 0 0 4px rgba(83,104,245,.12)';
            }
        } else {
            var fill = zone.planned ? 'rgba(255,174,66,.08)' : 'rgba(217,121,36,.07)';
            circle.style.border = '2px ' + (zone.planned ? 'dashed' : 'solid') + ' ' + color;
            circle.style.background = fill;
            circle.style.boxShadow = '0 0 3px rgba(0,0,0,.35)';
        }
        anchor.parent.appendChild(circle);

        var center = doc.createElement('div');
        center.className = 'gtmp-overlay gtmp-zone-center';
        center.style.left = centerX + 'px';
        center.style.top = centerY + 'px';
        center.style.background = color;
        center.title = zoneTitle(zone);
        anchor.parent.appendChild(center);

        var tag = doc.createElement('div');
        tag.className = 'gtmp-overlay gtmp-zone-tag';
        tag.style.left = (centerX + 5) + 'px';
        tag.style.top = (centerY - 14) + 'px';
        tag.style.background = color;
        tag.textContent = (zone.type === 'watchtower' ? 'TG ' : (zone.type === 'church_f' ? '1re ÉG ' : 'ÉG ')) + (zone.type === 'church_f' ? '' : 'N' + zone.level) + (zone.planned ? ' ★' : '');
        tag.title = zoneTitle(zone);
        anchor.parent.appendChild(tag);
    }

    function renderZones(anchor) {
        var i;
        for (i = 0; i < GT.realZones.length; i++) renderZone(GT.realZones[i], anchor);
        for (i = 0; i < GT.plannedZones.length; i++) renderZone(GT.plannedZones[i], anchor);
    }

    function getVillageLabel(entry, type, player) {
        var village = entry.village;
        var mode = GT.labelMode || 'auto';
        if (mode === 'none') return '';
        if (mode === 'village') return String(village.name || entry.coord);
        if (mode === 'player') return player ? String(player.name || '') : 'Barbare';
        if (mode === 'points') return formatPoints(village.points);
        if (mode === 'coord') return entry.coord;
        if (mode === 'tribe') {
            if (!player) return 'Barbare';
            var ally = player.ally ? win.TWMap.allies[player.ally] : null;
            return ally ? String(ally.tag || ally.name || 'Tribu') : 'Sans tribu';
        }
        // Auto : nom du village pour mes villages, joueur pour les villages possédés,
        // points pour les villages neutres.
        if (type.isOwn) return String(village.name || formatPoints(village.points));
        if (player) return String(player.name || formatPoints(village.points));
        return formatPoints(village.points);
    }

    function renderVillages(entries) {
        var counts = { all: 0, player: 0, barb: 0, bonus: 0, playerBonus: 0, myVillage: 0 };
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var type = classify(entry.village, entry.coord);
            counts.all++;
            counts[type.category]++;

            if (!categoryMatches(type) || !bonusMatches(type)) {
                dimVillage(entry.el);
                continue;
            }

            var player = type.isPlayer ? win.TWMap.players[entry.village.owner] : null;
            var bonus = type.isBonus ? BONUS[type.bonusId] : null;
            var text = getVillageLabel(entry, type, player);
            var details = [];
            details.push(entry.coord);
            if (entry.village.name) details.push(entry.village.name);
            if (player && player.name) details.push(player.name);
            details.push(formatPoints(entry.village.points));
            if (bonus) details.push('Bonus : ' + bonus.name);
            var title = details.join(' — ');
            if (bonus) addBonusIcon(entry.el, type.bonusId, title);
            if (text) addVillageLabel(entry.el, text, categoryColor(type.category), title);
        }
        GT.counts = counts;
    }

    function render() {
        if (!GT.bonusReady || !win.TWMap || !win.TWMap.map) return;
        clearOverlays();
        var entries = visibleVillageEntries();
        var anchor = getMapAnchor(entries);
        renderZones(anchor);
        renderVillages(entries);
        updateUIState();
    }

    function scheduleRender() {
        if (GT.renderTimer) clearTimeout(GT.renderTimer);
        GT.renderTimer = setTimeout(render, 60);
    }

    function resetBonusFiltersToAll() {
        GT.selectedBonus = {
            all: true,
            1: false, 2: false, 3: false, 4: false, 5: false,
            6: false, 7: false, 8: false, 9: false
        };
    }

    function ensureBonusVillageFilterEnabled() {
        /*
         * Un filtre de TYPE de bonus n'a de sens que si la catégorie "Bonus"
         * est visible. Si "Tous" était actif, il devient donc "Bonus" seul.
         * Si d'autres catégories étaient déjà sélectionnées, on les conserve.
         */
        if (GT.selected.all) {
            GT.selected = {
                all: false,
                player: false,
                barb: false,
                bonus: true,
                playerBonus: false,
                myVillage: false
            };
            return;
        }

        GT.selected.bonus = true;
        GT.selected.all = false;
    }

    function setFilter(filter) {
        if (filter === 'all') {
            GT.selected = {
                all: true,
                player: false,
                barb: false,
                bonus: false,
                playerBonus: false,
                myVillage: false
            };

            /*
             * "Tous" dans Villages affichés signifie également qu'aucun
             * sous-filtre de bonus ne doit rester actif.
             */
            resetBonusFiltersToAll();
        } else {
            GT.selected.all = false;
            GT.selected[filter] = !GT.selected[filter];

            if (!GT.selected.player &&
                !GT.selected.barb &&
                !GT.selected.bonus &&
                !GT.selected.playerBonus &&
                !GT.selected.myVillage) {
                GT.selected.all = true;
                resetBonusFiltersToAll();
            }
        }

        saveSettings();
        updateUIState();
        render();
    }

    function setBonusFilter(filter) {
        if (filter === 'all') {
            resetBonusFiltersToAll();
        } else {
            var id = parseInt(filter, 10);
            if (!BONUS[id]) return;

            /*
             * Dès qu'un type précis est manipulé, la catégorie "Bonus"
             * est automatiquement rendue visible.
             */
            ensureBonusVillageFilterEnabled();

            GT.selectedBonus.all = false;
            GT.selectedBonus[id] = !GT.selectedBonus[id];

            if (!GT.selectedBonus[1] &&
                !GT.selectedBonus[2] &&
                !GT.selectedBonus[3] &&
                !GT.selectedBonus[4] &&
                !GT.selectedBonus[5] &&
                !GT.selectedBonus[6] &&
                !GT.selectedBonus[7] &&
                !GT.selectedBonus[8] &&
                !GT.selectedBonus[9]) {
                GT.selectedBonus.all = true;
            }
        }

        saveSettings();
        updateUIState();
        render();
    }

    function buttonClassState() {
        $(doc).find('.gtmp-filter').each(function () {
            var f = this.getAttribute('data-filter');
            if (GT.selected[f]) this.classList.add('active');
            else this.classList.remove('active');
        });
    }

    function bonusButtonClassState() {
        $(doc).find('.gtmp-bonus-filter').each(function () {
            var f = this.getAttribute('data-bonus-filter');
            var active = f === 'all' ? GT.selectedBonus.all : !!GT.selectedBonus[parseInt(f, 10)];
            if (active) this.classList.add('active');
            else this.classList.remove('active');
        });
    }

    function updateBonusFilterPanelState() {
        var wrap = doc.getElementById('gtmp-bonus-filter-wrap');
        var toggle = doc.getElementById('gtmp-bonus-filter-toggle');
        if (!wrap || !toggle) return;

        if (GT.bonusFiltersExpanded) wrap.classList.remove('collapsed');
        else wrap.classList.add('collapsed');

        toggle.setAttribute('aria-expanded', GT.bonusFiltersExpanded ? 'true' : 'false');
        toggle.title = GT.bonusFiltersExpanded
            ? 'Masquer les types de villages bonus'
            : 'Afficher les types de villages bonus';
    }

    function toggleBonusFilterPanel() {
        GT.bonusFiltersExpanded = !GT.bonusFiltersExpanded;
        saveSettings();
        updateBonusFilterPanelState();
    }

    function updateSectionPanelsState() {
        var sections = ['villages', 'realZones', 'plannedZones'];
        for (var i = 0; i < sections.length; i++) {
            var name = sections[i];
            var card = doc.getElementById('gtmp-section-' + name);
            var toggle = doc.querySelector('.gtmp-section-toggle[data-section="' + name + '"]');
            if (!card || !toggle) continue;
            var expanded = GT.sectionsExpanded[name] !== false;
            if (expanded) card.classList.remove('collapsed');
            else card.classList.add('collapsed');
            toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            toggle.title = expanded ? 'Rétracter cette section' : 'Développer cette section';
        }
    }

    function toggleSectionPanel(name) {
        if (!Object.prototype.hasOwnProperty.call(GT.sectionsExpanded, name)) return;
        GT.sectionsExpanded[name] = !GT.sectionsExpanded[name];
        saveSettings();
        updateSectionPanelsState();
    }

    function updateCounts() {
        var el = doc.getElementById('gtmp-counts');
        if (!el) return;
        el.innerHTML =
            'Carte chargée : <b>' + GT.counts.all + '</b> villages<br>' +
            'Joueur <b>' + GT.counts.player + '</b> · Barbare <b>' + GT.counts.barb + '</b> · Bonus <b>' + GT.counts.bonus + '</b><br>' +
            'Joueur Bonus <b>' + GT.counts.playerBonus + '</b> · Mes Villages <b>' + GT.counts.myVillage + '</b>';
    }

    function updateZoneStatus() {
        var el = doc.getElementById('gtmp-zone-status');
        if (!el) return;
        var church = 0, first = 0, watch = 0;
        for (var i = 0; i < GT.realZones.length; i++) {
            if (GT.realZones[i].type === 'church') church++;
            else if (GT.realZones[i].type === 'church_f') first++;
            else if (GT.realZones[i].type === 'watchtower') watch++;
        }
        var status = GT.buildingsReady ? 'Bâtiments détectés' : 'Chargement des bâtiments…';
        if (GT.lastBuildingError) status = 'Lecture complète impossible : données du village courant utilisées.';
        el.innerHTML = status + '<br>Églises : <b>' + church + '</b>' + (first ? ' + première église : <b>' + first + '</b>' : '') + ' · Tours de guet : <b>' + watch + '</b>';
    }

    function updateUIState() {
        buttonClassState();
        bonusButtonClassState();
        updateBonusFilterPanelState();
        updateSectionPanelsState();
        var a = doc.getElementById('gtmp-show-real-church');
        var b = doc.getElementById('gtmp-show-real-watch');
        var c = doc.getElementById('gtmp-show-plan-church');
        var d = doc.getElementById('gtmp-show-plan-watch');
        if (a) a.checked = GT.showRealChurch;
        if (b) b.checked = GT.showRealWatch;
        if (c) c.checked = GT.showPlannedChurch;
        if (d) d.checked = GT.showPlannedWatch;
        var h = doc.getElementById('gtmp-hide-attacks');
        var l = doc.getElementById('gtmp-label-mode');
        if (h) h.checked = GT.hideAttackMarkers;
        if (l) l.value = GT.labelMode;
        updateCounts();
        updateZoneStatus();
        renderPlannedList();
    }

    function createLevelOptions(type, selectedLevel) {
        var max = type === 'watchtower' ? 20 : 3;
        var out = '';
        for (var i = 1; i <= max; i++) {
            var radius = type === 'watchtower' ? WATCHTOWER_RADIUS[i] : CHURCH_RADIUS[i];
            out += '<option value="' + i + '"' + (String(i) === String(selectedLevel) ? ' selected' : '') + '>N' + i + ' — ' + formatNumber(radius) + ' cases</option>';
        }
        return out;
    }

    function refreshLevelSelector() {
        var type = doc.getElementById('gtmp-plan-type');
        var level = doc.getElementById('gtmp-plan-level');
        if (!type || !level) return;
        var previous = parseInt(level.value, 10) || 1;
        level.innerHTML = createLevelOptions(type.value, Math.min(previous, type.value === 'watchtower' ? 20 : 3));
    }

    function getCurrentMapCenterCoord() {
        var x = parseInt($('#inputx', doc).val(), 10);
        var y = parseInt($('#inputy', doc).val(), 10);
        if (!isNaN(x) && !isNaN(y)) return x + '|' + y;

        var px = win.TWMap.map.pos[0] + ((win.TWMap.size[0] * win.TWMap.tileSize[0]) / 2);
        var py = win.TWMap.map.pos[1] + ((win.TWMap.size[1] * win.TWMap.tileSize[1]) / 2);
        var c = win.TWMap.map.coordByPixel(px, py);
        return c ? c.join('|') : '';
    }

    function mapCoordFromClientPoint(clientX, clientY) {
        // Fallback uniquement : normalement le sélecteur utilise TWMap.map.handler.onClick(x, y, event).
        var entries = visibleVillageEntries();
        var anchor = getMapAnchor(entries);
        if (!anchor || !anchor.el) return null;

        var mapRoot = doc.getElementById('map_wrap') || doc.getElementById('map') || anchor.parent;
        if (mapRoot && mapRoot.getBoundingClientRect) {
            var mapRect = mapRoot.getBoundingClientRect();
            if (clientX < mapRect.left || clientX > mapRect.right || clientY < mapRect.top || clientY > mapRect.bottom) return null;
        }

        var rect = anchor.el.getBoundingClientRect();
        var stepX = win.TWMap.tileSize[0];
        var stepY = win.TWMap.tileSize[1];
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            if (!entry.el) continue;
            var er = entry.el.getBoundingClientRect();
            if (entry.x !== anchor.x) {
                var sx = (er.left - rect.left) / (entry.x - anchor.x);
                if (isFinite(sx) && Math.abs(sx) > 2) stepX = Math.abs(sx);
            }
            if (entry.y !== anchor.y) {
                var sy = (er.top - rect.top) / (entry.y - anchor.y);
                if (isFinite(sy) && Math.abs(sy) > 2) stepY = Math.abs(sy);
            }
            if (stepX !== win.TWMap.tileSize[0] && stepY !== win.TWMap.tileSize[1]) break;
        }

        var x = anchor.x + Math.floor((clientX - rect.left) / stepX);
        var y = anchor.y + Math.floor((clientY - rect.top) / stepY);
        if (x < 0 || x > 999 || y < 0 || y > 999) return null;
        return { x: x, y: y, coord: x + '|' + y };
    }

    function updateCoordinatePickerUI() {
        var btn = doc.getElementById('gtmp-pick-coord');
        var status = doc.getElementById('gtmp-picker-status');
        if (btn) {
            btn.classList.toggle('active', GT.pickingCoord);
            btn.textContent = GT.pickingCoord ? '✚ Clique sur la carte…' : '⌖ Sélectionner';
        }
        if (status) {
            status.classList.toggle('active', GT.pickingCoord);
            status.textContent = 'Sélection active : clique sur la case voulue de la carte. Échap pour annuler.';
        }
        if (doc.body) doc.body.classList.toggle('gtmp-picking-coord', GT.pickingCoord);
    }

    function applyPickedCoordinate(x, y, event) {
        x = parseInt(x, 10);
        y = parseInt(y, 10);
        if (isNaN(x) || isNaN(y) || x < 0 || x > 999 || y < 0 || y > 999) return false;

        if (event) {
            if (typeof event.preventDefault === 'function') event.preventDefault();
            if (typeof event.stopPropagation === 'function') event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        }

        var coord = x + '|' + y;
        var input = doc.getElementById('gtmp-plan-coord');
        if (input) input.value = coord;
        cancelCoordinatePicker();
        showMessage('Coordonnées sélectionnées : ' + coord, false);
        return true;
    }

    function cancelCoordinatePicker() {
        if (GT.coordinateClickHandler) {
            doc.removeEventListener('click', GT.coordinateClickHandler, true);
            GT.coordinateClickHandler = null;
        }
        if (GT.coordinateKeyHandler) {
            doc.removeEventListener('keydown', GT.coordinateKeyHandler, true);
            GT.coordinateKeyHandler = null;
        }

        if (GT.mapClickPicker && win.TWMap && win.TWMap.map && win.TWMap.map.handler && win.TWMap.map.handler.onClick === GT.mapClickPicker) {
            win.TWMap.map.handler.onClick = GT.oldMapOnClick;
        }
        GT.oldMapOnClick = null;
        GT.mapClickPicker = null;
        GT.pickingCoord = false;
        updateCoordinatePickerUI();
    }

    function startCoordinatePicker() {
        if (GT.pickingCoord) {
            cancelCoordinatePicker();
            return;
        }

        GT.pickingCoord = true;
        updateCoordinatePickerUI();

        // Méthode native de la carte : le jeu nous donne directement X et Y au clic.
        if (win.TWMap && win.TWMap.map && win.TWMap.map.handler && typeof win.TWMap.map.handler.onClick === 'function') {
            GT.oldMapOnClick = win.TWMap.map.handler.onClick;
            GT.mapClickPicker = function (x, y, event) {
                applyPickedCoordinate(x, y, event);
            };
            win.TWMap.map.handler.onClick = GT.mapClickPicker;
        } else {
            // Secours pour d'anciennes variantes de carte.
            GT.coordinateClickHandler = function (event) {
                var ui = doc.getElementById('gt-map-planner-ui');
                if (ui && ui.contains(event.target)) return;
                var parsed = mapCoordFromClientPoint(event.clientX, event.clientY);
                if (!parsed) return;
                applyPickedCoordinate(parsed.x, parsed.y, event);
            };
            doc.addEventListener('click', GT.coordinateClickHandler, true);
        }

        GT.coordinateKeyHandler = function (event) {
            if (event.key === 'Escape') cancelCoordinatePicker();
        };
        doc.addEventListener('keydown', GT.coordinateKeyHandler, true);
    }

    function addPlannedZone() {
        var typeEl = doc.getElementById('gtmp-plan-type');
        var levelEl = doc.getElementById('gtmp-plan-level');
        var coordEl = doc.getElementById('gtmp-plan-coord');
        if (!typeEl || !levelEl || !coordEl) return;

        var parsed = parseCoord(coordEl.value);
        if (!parsed) {
            showMessage('Coordonnées invalides. Format attendu : 500|500', true);
            return;
        }
        var type = typeEl.value;
        var level = parseInt(levelEl.value, 10) || 1;
        if (type === 'church') level = Math.max(1, Math.min(3, level));
        else level = Math.max(1, Math.min(20, level));

        GT.plannedZones.push({
            id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            type: type,
            coord: parsed.coord,
            level: level,
            planned: true
        });
        savePlannedZones();
        renderPlannedList();
        render();
        showMessage((type === 'church' ? 'Église' : 'Tour de guet') + ' fictive ajoutée en ' + parsed.coord + '.', false);
    }

    function removePlannedZone(id) {
        GT.plannedZones = GT.plannedZones.filter(function (z) { return z.id !== id; });
        savePlannedZones();
        renderPlannedList();
        render();
    }

    function clearPlannedZones() {
        GT.plannedZones = [];
        savePlannedZones();
        renderPlannedList();
        render();
    }

    function savePlannedZones() {
        try {
            win.localStorage.setItem(plannedStorageKey(), JSON.stringify(GT.plannedZones));
        } catch (e) {
            // Le script fonctionne même sans localStorage.
        }
    }

    function loadPlannedZones() {
        try {
            var arr = JSON.parse(win.localStorage.getItem(plannedStorageKey()) || '[]');
            if (Array.isArray(arr)) {
                GT.plannedZones = arr.filter(function (z) {
                    return z && (z.type === 'church' || z.type === 'watchtower') && parseCoord(z.coord);
                }).map(function (z) {
                    z.planned = true;
                    return z;
                });
            }
        } catch (e) {
            GT.plannedZones = [];
        }
    }

    function renderPlannedList() {
        var box = doc.getElementById('gtmp-planned-list');
        if (!box) return;
        if (!GT.plannedZones.length) {
            box.innerHTML = '<div class="wt-small" style="padding:7px;">Aucune zone fictive.</div>';
            return;
        }

        box.innerHTML = GT.plannedZones.map(function (z) {
            var label = z.type === 'church' ? 'Église' : 'Tour de guet';
            var radius = getRadiusForZone(z);
            return '<div class="gtmp-zone-item">' +
                '<div><b>' + label + ' N' + z.level + '</b> — ' + z.coord + '<div class="wt-small">Rayon : ' + formatNumber(radius) + ' cases</div></div>' +
                '<button class="gtmp-zone-delete" data-zone-id="' + z.id + '" title="Supprimer">×</button>' +
            '</div>';
        }).join('');

        $(box).find('.gtmp-zone-delete').off('click.gtmp').on('click.gtmp', function () {
            removePlannedZone(this.getAttribute('data-zone-id'));
        });
    }

    function showMessage(text, error) {
        if (win.UI && typeof win.UI[error ? 'ErrorMessage' : 'SuccessMessage'] === 'function') {
            win.UI[error ? 'ErrorMessage' : 'SuccessMessage'](text);
        }
    }

    function createUI() {
        $('#gt-map-planner-ui', doc).remove();
        injectStyle();

        var panel = doc.createElement('div');
        panel.id = 'gt-map-planner-ui';
        panel.className = 'wt-panel gtmp-panel';
        panel.innerHTML =
            '<div id="gtmp-title" class="wt-hero">' +
                '<div class="wt-brand">' +
                    '<div class="wt-logo" aria-hidden="true">🐼</div>' +
                    '<div>' +
                        '<div class="wt-title"><span class="wt-title-brand">Webi-Time</span><span class="wt-title-tool"> Map Planner</span></div>' +
                        '<div class="wt-byline">Adaptation par <b>' + WEBITIME_RESOURCE_AUTHOR + '</b> &nbsp;•&nbsp; Guerre Tribale</div>' +
                        '<div class="wt-tagline">Cartographier. Planifier. Couvrir. Garder le rythme.</div>' +
                    '</div>' +
                '</div>' +
                '<div class="wt-hero-motto">CARTOGRAPHIER<br>PLANIFIER<br>COUVRIR<br>OPTIMISER</div>' +
                '<span id="gtmp-close" title="Fermer">×</span>' +
            '</div>' +
            '<div id="gtmp-body" class="wt-body">' +
                '<div id="gtmp-section-villages" class="wt-card gtmp-section-card">' +
                    '<div class="wt-card-title gtmp-section-toggle" data-section="villages" role="button" tabindex="0" aria-expanded="true"><span>Villages affichés</span><span class="gtmp-section-chevron">▾</span></div>' +
                    '<div class="gtmp-section-content">' +
                    '<div class="gtmp-filter-grid">' +
                        '<button class="gtmp-filter active" data-filter="all">Tous</button>' +
                        '<button class="gtmp-filter" data-filter="player">Joueur</button>' +
                        '<button class="gtmp-filter" data-filter="barb">Barbare</button>' +
                        '<button class="gtmp-filter" data-filter="bonus">Bonus</button>' +
                        '<button class="gtmp-filter" data-filter="playerBonus">Joueur Bonus</button>' +
                        '<button class="gtmp-filter" data-filter="myVillage">Mes Villages</button>' +
                    '</div>' +
                    '<div id="gtmp-bonus-filter-wrap" class="gtmp-bonus-filter-wrap">' +
                        '<div id="gtmp-bonus-filter-toggle" class="gtmp-bonus-filter-title" role="button" tabindex="0" aria-expanded="true" title="Afficher / masquer les types de villages bonus">' +
                            '<span class="gtmp-bonus-filter-title-main">Types de villages bonus</span>' +
                            '<span class="gtmp-bonus-filter-meta"><span class="gtmp-bonus-multi">multi-sélection</span><span id="gtmp-bonus-chevron" class="gtmp-bonus-chevron">▾</span></span>' +
                        '</div>' +
                        '<div id="gtmp-bonus-filter-content" class="gtmp-bonus-filter-content">' +
                            '<div class="gtmp-bonus-filter-grid">' +
                                '<button class="gtmp-bonus-filter active" data-bonus-filter="all">Tous les bonus</button>' +
                                '<button class="gtmp-bonus-filter" data-bonus-filter="1"><img src="/graphic/bonus/wood.png" alt="">Bois +100%</button>' +
                                '<button class="gtmp-bonus-filter" data-bonus-filter="2"><img src="/graphic/bonus/stone.png" alt="">Argile +100%</button>' +
                                '<button class="gtmp-bonus-filter" data-bonus-filter="3"><img src="/graphic/bonus/iron.png" alt="">Fer +100%</button>' +
                                '<button class="gtmp-bonus-filter" data-bonus-filter="4"><img src="/graphic/bonus/farm.png" alt="">Population +10%</button>' +
                                '<button class="gtmp-bonus-filter" data-bonus-filter="5"><img src="/graphic/bonus/barracks.png" alt="">Caserne -33%</button>' +
                                '<button class="gtmp-bonus-filter" data-bonus-filter="6"><img src="/graphic/bonus/stable.png" alt="">Écurie -33%</button>' +
                                '<button class="gtmp-bonus-filter" data-bonus-filter="7"><img src="/graphic/bonus/garage.png" alt="">Atelier -50%</button>' +
                                '<button class="gtmp-bonus-filter" data-bonus-filter="8"><img src="/graphic/bonus/all.png" alt="">Ressources +30%</button>' +
                                '<button class="gtmp-bonus-filter" data-bonus-filter="9"><img src="/graphic/bonus/storage.png" alt="">Entrepôt &amp; Marché +50%</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="gtmp-label-row">' +
                        '<label class="gtmp-field-label" for="gtmp-label-mode">Libellé sous les villages</label>' +
                        '<select id="gtmp-label-mode" class="wt-input">' +
                            '<option value="auto">Auto (pertinent)</option>' +
                            '<option value="village">Nom du village</option>' +
                            '<option value="player">Nom du joueur</option>' +
                            '<option value="points">Points</option>' +
                            '<option value="coord">Coordonnées</option>' +
                            '<option value="tribe">Tribu</option>' +
                            '<option value="none">Aucun</option>' +
                        '</select>' +
                    '</div>' +
                    '<div id="gtmp-counts" class="wt-status">Chargement de la carte…</div>' +
                    '<div class="gtmp-toggle-row" style="margin-top:7px;"><label class="wt-check"><input id="gtmp-hide-attacks" type="checkbox"> Masquer attaques / retours</label><span style="color:#d6aa39;">⚔</span></div>' +
                    '</div>' +
                '</div>' +

                '<div id="gtmp-section-realZones" class="wt-card gtmp-section-card">' +
                    '<div class="wt-card-title gtmp-section-toggle" data-section="realZones" role="button" tabindex="0" aria-expanded="true"><span>Zones réelles</span><span class="gtmp-section-chevron">▾</span></div>' +
                    '<div class="gtmp-section-content">' +
                    '<div class="gtmp-toggle-row"><label class="wt-check"><input id="gtmp-show-real-church" type="checkbox" checked> Églises</label><span style="color:' + COLORS.churchReal + ';">●</span></div>' +
                    '<div class="gtmp-toggle-row"><label class="wt-check"><input id="gtmp-show-real-watch" type="checkbox" checked> Tours de guet</label><span style="color:' + COLORS.watchReal + ';">●</span></div>' +
                    '<button id="gtmp-refresh-buildings" class="wt-btn" style="width:100%;margin-top:4px;">↻ Relire mes bâtiments</button>' +
                    '<div id="gtmp-zone-status" class="wt-status">Chargement des bâtiments…</div>' +
                    '</div>' +
                '</div>' +

                '<div id="gtmp-section-plannedZones" class="wt-card gtmp-section-card">' +
                    '<div class="wt-card-title gtmp-section-toggle" data-section="plannedZones" role="button" tabindex="0" aria-expanded="true"><span>Zones fictives</span><span class="gtmp-section-chevron">▾</span></div>' +
                    '<div class="gtmp-section-content">' +
                    '<div class="gtmp-toggle-row"><label class="wt-check"><input id="gtmp-show-plan-church" type="checkbox" checked> Églises fictives</label><span style="color:' + COLORS.churchPlan + ';">◌</span></div>' +
                    '<div class="gtmp-toggle-row"><label class="wt-check"><input id="gtmp-show-plan-watch" type="checkbox" checked> Tours fictives</label><span style="color:' + COLORS.watchPlan + ';">◌</span></div>' +
                    '<div class="gtmp-form-grid" style="margin-top:8px;">' +
                        '<select id="gtmp-plan-type" class="wt-input"><option value="church">Église</option><option value="watchtower">Tour de guet</option></select>' +
                        '<select id="gtmp-plan-level" class="wt-input">' + createLevelOptions('church', 1) + '</select>' +
                    '</div>' +
                    '<div class="gtmp-form-coord">' +
                        '<input id="gtmp-plan-coord" class="wt-input" placeholder="Coordonnées 500|500" maxlength="7">' +
                        '<button id="gtmp-use-center" class="wt-btn" title="Utiliser le centre actuel de la carte">◎ Centre</button>' +
                        '<button id="gtmp-pick-coord" class="wt-btn gtmp-btn-picker" title="Cliquer ensuite directement sur une case de la carte">⌖ Sélectionner</button>' +
                    '</div>' +
                    '<div id="gtmp-picker-status" class="gtmp-picker-status"></div>' +
                    '<button id="gtmp-add-zone" class="wt-btn wt-btn-primary" style="width:100%;margin-top:7px;">+ Ajouter la zone fictive</button>' +
                    '<div class="wt-small" style="margin-top:6px;">Trait plein = réel · pointillé = fictif. Les zones fictives sont conservées pour ce monde.</div>' +
                    '<div id="gtmp-planned-list" class="gtmp-zone-list"></div>' +
                    '<button id="gtmp-clear-zones" class="wt-btn wt-btn-danger" style="width:100%;margin-top:6px;">Supprimer toutes les zones fictives</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="wt-footer">' +
                '<span class="wt-footer-left">Version ' + GT.version + '</span>' +
                '<span class="wt-footer-center">INTELLIGENCE &nbsp;■&nbsp; ORGANISATION &nbsp;■&nbsp; SUPÉRIORITÉ</span>' +
                '<span class="wt-footer-right">🐼 <b>Webi-Time</b></span>' +
            '</div>';

        doc.body.appendChild(panel);

        $(panel).find('.gtmp-filter').on('click', function () {
            setFilter(this.getAttribute('data-filter'));
        });
        $(panel).find('.gtmp-bonus-filter').on('click', function () {
            setBonusFilter(this.getAttribute('data-bonus-filter'));
        });

        var bonusToggle = doc.getElementById('gtmp-bonus-filter-toggle');
        if (bonusToggle) {
            bonusToggle.addEventListener('click', toggleBonusFilterPanel);
            bonusToggle.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleBonusFilterPanel();
                }
            });
        }

        $(panel).find('.gtmp-section-toggle').on('click', function () {
            toggleSectionPanel(this.getAttribute('data-section'));
        }).on('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleSectionPanel(this.getAttribute('data-section'));
            }
        });

        doc.getElementById('gtmp-hide-attacks').addEventListener('change', function () {
            GT.hideAttackMarkers = this.checked;
            saveSettings();
            applyAttackMarkerVisibility();
        });
        doc.getElementById('gtmp-label-mode').addEventListener('change', function () {
            GT.labelMode = this.value;
            saveSettings();
            render();
        });
        doc.getElementById('gtmp-show-real-church').addEventListener('change', function () { GT.showRealChurch = this.checked; saveSettings(); render(); });
        doc.getElementById('gtmp-show-real-watch').addEventListener('change', function () { GT.showRealWatch = this.checked; saveSettings(); render(); });
        doc.getElementById('gtmp-show-plan-church').addEventListener('change', function () { GT.showPlannedChurch = this.checked; saveSettings(); render(); });
        doc.getElementById('gtmp-show-plan-watch').addEventListener('change', function () { GT.showPlannedWatch = this.checked; saveSettings(); render(); });
        doc.getElementById('gtmp-plan-type').addEventListener('change', refreshLevelSelector);
        doc.getElementById('gtmp-add-zone').addEventListener('click', addPlannedZone);
        doc.getElementById('gtmp-use-center').addEventListener('click', function () {
            cancelCoordinatePicker();
            doc.getElementById('gtmp-plan-coord').value = getCurrentMapCenterCoord();
        });
        doc.getElementById('gtmp-pick-coord').addEventListener('click', startCoordinatePicker);
        doc.getElementById('gtmp-plan-coord').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') addPlannedZone();
        });
        doc.getElementById('gtmp-clear-zones').addEventListener('click', clearPlannedZones);
        doc.getElementById('gtmp-refresh-buildings').addEventListener('click', function () {
            loadOwnedBuildingZones(true);
        });
        doc.getElementById('gtmp-close').addEventListener('click', function () { GT.destroy(); });

        makeDraggable(panel, doc.getElementById('gtmp-title'));
        applyAttackMarkerVisibility();
        updateUIState();
        updateCoordinatePickerUI();
    }

    function makeDraggable(panel, handle) {
        var dragging = false;
        var offsetX = 0;
        var offsetY = 0;

        handle.addEventListener('mousedown', function (e) {
            if (e.target && e.target.id === 'gtmp-close') return;
            dragging = true;
            var rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            panel.style.right = 'auto';
            e.preventDefault();
        });

        doc.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            panel.style.left = Math.max(0, Math.min(win.innerWidth - panel.offsetWidth, e.clientX - offsetX)) + 'px';
            panel.style.top = Math.max(0, Math.min(win.innerHeight - 40, e.clientY - offsetY)) + 'px';
        });

        doc.addEventListener('mouseup', function () { dragging = false; });
    }

    function parseVillageData(data) {
        var map = {};
        var lines = String(data || '').split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            if (!lines[i]) continue;
            var row = lines[i].split(',');
            if (row.length < 7) continue;
            var bonusId = parseInt(row[6], 10) || 0;
            if (bonusId >= 1 && bonusId <= 9) map[row[2] + '|' + row[3]] = bonusId;
        }
        return map;
    }

    function loadBonusData(done) {
        var key = bonusStorageKey();
        var ttl = 24 * 60 * 60 * 1000;
        try {
            var cached = JSON.parse(win.localStorage.getItem(key) || 'null');
            if (cached && cached.ts && cached.data && (Date.now() - cached.ts < ttl)) {
                GT.bonusByCoord = cached.data;
                GT.bonusReady = true;
                done();
                return;
            }
        } catch (e) {}

        $.get('/map/village.txt').done(function (data) {
            GT.bonusByCoord = parseVillageData(data);
            GT.bonusReady = true;
            try { win.localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: GT.bonusByCoord })); } catch (e) {}
            done();
        }).fail(function () {
            GT.bonusByCoord = {};
            GT.bonusReady = true;
            showMessage('Impossible de charger map/village.txt : les villages bonus ne pourront pas être identifiés.', true);
            done();
        });
    }

    function detectBuildingColumns($table) {
        var columns = {};
        $table.find('tr').first().children('th,td').each(function (idx) {
            var $cell = $(this);
            var src = String($cell.find('img').first().attr('src') || '');
            var m = src.match(/\/buildings\/([a-z_]+)(?:\.|\d)/i);
            if (m) columns[m[1].toLowerCase()] = idx;

            var cls = String(this.className || '');
            var cm = cls.match(/(?:^|\s)b_([a-z_]+)(?:\s|$)/i);
            if (cm) columns[cm[1].toLowerCase()] = idx;
        });
        return columns;
    }

    function readBuildingLevel($row, key, columns) {
        var $cell = $row.find('.b_' + key).first();
        if (!$cell.length) $cell = $row.find('[data-building="' + key + '"]').first();
        if (!$cell.length && columns && Object.prototype.hasOwnProperty.call(columns, key)) {
            $cell = $row.children('td,th').eq(columns[key]);
        }
        if (!$cell.length) return 0;
        var text = String($cell.text() || '').replace(/\s+/g, ' ').trim();
        var m = text.match(/\d+/);
        return m ? (parseInt(m[0], 10) || 0) : 0;
    }

    function parseBuildingOverview(html) {
        var zones = [];
        var parsedDoc;
        try {
            parsedDoc = new win.DOMParser().parseFromString(String(html), 'text/html');
        } catch (e) {
            return zones;
        }
        var $root = $(parsedDoc);
        var $table = $root.find('#buildings_table').first();
        if (!$table.length) return zones;
        var columns = detectBuildingColumns($table);

        $table.find('tr').each(function () {
            var $row = $(this);
            var c = parseCoord($row.text());
            if (!c) return;

            var church = readBuildingLevel($row, 'church', columns);
            var churchF = readBuildingLevel($row, 'church_f', columns);
            var watch = readBuildingLevel($row, 'watchtower', columns);

            if (churchF > 0) zones.push({ type: 'church_f', coord: c.coord, level: 1, planned: false });
            if (church > 0) zones.push({ type: 'church', coord: c.coord, level: Math.max(1, Math.min(3, church)), planned: false });
            if (watch > 0) zones.push({ type: 'watchtower', coord: c.coord, level: Math.max(1, Math.min(20, watch)), planned: false });
        });
        return zones;
    }

    function currentVillageZones() {
        var out = [];
        var v = win.game_data && win.game_data.village;
        var b = v && v.buildings;
        var coord = v && (v.coord || (v.x + '|' + v.y));
        if (!b || !parseCoord(coord)) return out;

        var church = parseInt(b.church || 0, 10) || 0;
        var churchF = parseInt(b.church_f || 0, 10) || 0;
        var watch = parseInt(b.watchtower || 0, 10) || 0;
        if (churchF > 0) out.push({ type: 'church_f', coord: coord, level: 1, planned: false });
        if (church > 0) out.push({ type: 'church', coord: coord, level: Math.max(1, Math.min(3, church)), planned: false });
        if (watch > 0) out.push({ type: 'watchtower', coord: coord, level: Math.max(1, Math.min(20, watch)), planned: false });
        return out;
    }

    function dedupeZones(zones) {
        var seen = {};
        return zones.filter(function (z) {
            var key = z.type + ':' + z.coord;
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
    }

    function loadOwnedBuildingZones(notify) {
        GT.buildingsReady = false;
        GT.lastBuildingError = null;
        updateZoneStatus();

        var url = win.game_data.link_base_pure + 'overview_villages&mode=buildings&group=0&page=-1';
        $.ajax({ url: url, method: 'GET', dataType: 'html' })
            .done(function (html) {
                var zones = parseBuildingOverview(html);
                if (!zones.length) {
                    // Sur un monde sans ces bâtiments il est normal d'obtenir zéro zone.
                    // On ajoute néanmoins les données du village courant si elles existent.
                    zones = currentVillageZones();
                }
                GT.realZones = dedupeZones(zones);
                GT.buildingsReady = true;
                updateZoneStatus();
                render();
                if (notify) showMessage('Bâtiments relus : ' + GT.realZones.length + ' zone(s) détectée(s).', false);
            })
            .fail(function () {
                GT.realZones = dedupeZones(currentVillageZones());
                GT.buildingsReady = true;
                GT.lastBuildingError = 'ajax';
                updateZoneStatus();
                render();
                if (notify) showMessage('Impossible de lire l\'aperçu des bâtiments. Seul le village courant a pu être analysé.', true);
            });
    }

    GT.destroy = function () {
        cancelCoordinatePicker();
        if (GT.renderTimer) clearTimeout(GT.renderTimer);
        clearOverlays();
        if (doc.body) doc.body.classList.remove('gtmp-hide-map-attacks');
        restoreAttackMarkers();
        if (GT.attackMarkerObserver) {
            GT.attackMarkerObserver.disconnect();
            GT.attackMarkerObserver = null;
        }
        if (GT.oldPopupHandleMouseMove && win.TWMap && win.TWMap.popup && win.TWMap.popup.handleMouseMove === GT.popupMouseMoveHandler) {
            win.TWMap.popup.handleMouseMove = GT.oldPopupHandleMouseMove;
        }
        GT.oldPopupHandleMouseMove = null;
        GT.popupMouseMoveHandler = null;
        $('#gt-map-planner-ui,#gtmp-style', doc).remove();
        if (GT.oldOnMove && win.TWMap && win.TWMap.mapHandler && win.TWMap.mapHandler.onMove === GT.moveHandler) {
            win.TWMap.mapHandler.onMove = GT.oldOnMove;
        }
        if (win.GTMapPlanner === GT) delete win.GTMapPlanner;
    };

    GT.oldOnMove = win.TWMap.mapHandler.onMove;
    GT.moveHandler = function (x, y) {
        if (typeof GT.oldOnMove === 'function') GT.oldOnMove.call(this, x, y);
        scheduleRender();

        /* La v3.1.1 masquait correctement les retours avec une passe simple.
           On garde ce comportement et on refait une seule passe après le redraw. */
        if (GT.hideAttackMarkers) {
            win.setTimeout(function () {
                scanAndHideAttackMarkers(doc);
            }, 0);
        }
    };
    win.TWMap.mapHandler.onMove = GT.moveHandler;
    win.GTMapPlanner = GT;

    loadPlannedZones();
    loadSettings();
    createUI();
    loadBonusData(function () { render(); });
    loadOwnedBuildingZones(false);
})();
