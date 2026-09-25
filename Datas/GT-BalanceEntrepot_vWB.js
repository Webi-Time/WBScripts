/*
 * Webi-Time - GT Balance Entrepot
 * Version : 1.3.1
 * Auteur  : NoLife4Ever / Webi-Time
 *
 * Base fonctionnelle inspiree du "Warehouse balancer" de Sophie "Shinko to Kuma".
 * Refonte :
 * - interface Webi-Time/vWB compacte et integree a la page ;
 * - analyse sans onglets supplementaires ;
 * - prise en compte des ressources deja entrantes ;
 * - plafond de réception pour les villages prioritaires ;
 * - réserve minimale d'envoi pour les villages terminés ;
 * - modes Mix / externe / interne / remplissage prioritaire ;
 * - gestion stricte des marchands et des capacites d'entrepot ;
 * - consolidation optionnelle des surplus vers un village pour l'echange Premium ;
 * - compatible desktop/mobile avec plusieurs fallbacks de parsing.
 *
 * Les transports peuvent etre envoyes ligne par ligne ou via "Tout envoyer".
 * L'envoi global reste sequentiel afin de limiter les requetes simultanees.
 */

(async function WebiTimeWarehouseBalancerBootstrap() {
    'use strict';

    const SCRIPT = Object.freeze({
        name: 'GT Balance Entrepôt',
        version: '1.3.1',
        prefix: 'wtwb'
    });

    const STORAGE_KEY = 'webitime.gt.warehouseBalancer.settings.v1';
    const COMMON_URL = 'https://webi-time.github.io/WBScripts/Datas/WebiTime_GT_Common.js';
    const COMMON_FALLBACK_URL = 'https://cdn.jsdelivr.net/gh/Webi-Time/WBScripts@GT/Datas/WebiTime_GT_Common.js';
    const SOURCE_URL = 'https://github.com/Webi-Time/WBScripts/tree/GT/Datas';

    if (!window.game_data || !window.jQuery) {
        console.error(`[${SCRIPT.name}] game_data ou jQuery indisponible.`);
        return;
    }

    if (window.WebiTimeWarehouseBalancer &&
        typeof window.WebiTimeWarehouseBalancer.open === 'function') {
        window.WebiTimeWarehouseBalancer.open();
        return;
    }

    const $ = window.jQuery;

    const DEFAULT_SETTINGS = Object.freeze({
        // mix | external | internal | fill
        balanceMode: 'mix',
        lowPoints: 3000,
        highPoints: 8000,
        builtOutPercentage: 0.25,
        needsMorePercentage: 0.60,
        includeIncoming: true,
        minTransfer: 1000,
        maxDistance: 0,                       // 0 = aucune limite
        premiumConsolidation: false,
        premiumCollectorId: '',               // vide = automatique
        premiumFillPercentage: 0.95
    });

    const state = {
        settings: loadSettings(),
        villages: [],
        villageById: new Map(),
        incoming: {},
        links: [],
        baseLinks: [],
        premiumLinks: [],
        targets: new Map(),
        summary: null,
        loading: false,
        open: false,
        collectorId: '',
        errors: []
    };

    async function ensureWebiTimeCommon() {
        if (window.WebiTimeGT && typeof window.WebiTimeGT.injectStyles === 'function') {
            return window.WebiTimeGT;
        }

        const urls = [];
        try {
            const currentSrc = document.currentScript && document.currentScript.src;
            if (currentSrc) {
                const u = new URL('WebiTime_GT_Common.js', currentSrc);
                u.searchParams.set('_wt', Date.now());
                urls.push(u.href);
            }
        } catch (_) {}

        urls.push(COMMON_URL + '?_wt=' + Date.now());
        urls.push(COMMON_FALLBACK_URL + '?_wt=' + Date.now());

        for (const url of [...new Set(urls)]) {
            try {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = url;
                    s.async = true;
                    s.onload = resolve;
                    s.onerror = () => reject(new Error('Chargement impossible : ' + url));
                    (document.head || document.documentElement).appendChild(s);
                });
                if (window.WebiTimeGT) return window.WebiTimeGT;
            } catch (error) {
                console.warn(`[${SCRIPT.name}] Common indisponible`, url, error);
            }
        }
        return null;
    }

    const WT = await ensureWebiTimeCommon();
    if (WT && typeof WT.injectStyles === 'function') WT.injectStyles();

    function loadSettings() {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return normalizeSettings(raw);
        } catch (_) {
            return normalizeSettings({});
        }
    }

    function normalizeSettings(input) {
        const out = { ...DEFAULT_SETTINGS, ...(input || {}) };

        // Migration des versions 1.0.x.
        if (out.balanceMode === 'balanced') out.balanceMode = 'mix';
        if (out.balanceMode === 'classic') out.balanceMode = 'external';
        if (!['mix', 'external', 'internal', 'fill'].includes(out.balanceMode)) {
            out.balanceMode = DEFAULT_SETTINGS.balanceMode;
        }
        delete out.highFarm;

        out.lowPoints = clampInt(out.lowPoints, 0, 100000, DEFAULT_SETTINGS.lowPoints);
        out.highPoints = clampInt(out.highPoints, 0, 100000, DEFAULT_SETTINGS.highPoints);
        out.builtOutPercentage = clampFloat(out.builtOutPercentage, 0.01, 1, DEFAULT_SETTINGS.builtOutPercentage);
        out.needsMorePercentage = clampFloat(out.needsMorePercentage, 0.01, 1, DEFAULT_SETTINGS.needsMorePercentage);
        out.includeIncoming = out.includeIncoming !== false;
        out.minTransfer = Math.max(1000, round1000(clampInt(out.minTransfer, 1000, 1000000, 1000)));
        out.maxDistance = clampFloat(out.maxDistance, 0, 1000, 0);
        out.premiumConsolidation = !!out.premiumConsolidation;
        out.premiumCollectorId = String(out.premiumCollectorId || '');
        out.premiumFillPercentage = clampFloat(out.premiumFillPercentage, 0.10, 1, DEFAULT_SETTINGS.premiumFillPercentage);
        return out;
    }

    function saveSettings() {
        state.settings = readSettingsFromUi();
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
        } catch (_) {}
    }

    function clampInt(value, min, max, fallback) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    }

    function clampFloat(value, min, max, fallback) {
        const n = parseFloat(value);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    }

    function parseNumber(value) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        const s = String(value == null ? '' : value)
            .replace(/\u00a0/g, ' ')
            .replace(/[^\d\-]/g, '');
        const n = parseInt(s, 10);
        return Number.isFinite(n) ? n : 0;
    }

    function round1000(value) {
        return Math.floor(Math.max(0, Number(value) || 0) / 1000) * 1000;
    }

    function fmt(value) {
        return Math.round(Number(value) || 0).toLocaleString('fr-FR');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function coordsFromName(name) {
        const m = String(name || '').match(/(\d{3})\|(\d{3})/);
        return m ? { x: Number(m[1]), y: Number(m[2]) } : { x: 0, y: 0 };
    }

    function distance(a, b) {
        if (!a || !b) return Infinity;
        return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
    }

    function notify(type, message, duration) {
        const fn = window.UI && UI[type + 'Message'];
        if (typeof fn === 'function') fn(message, duration || 3500);
        else console.log(`[${SCRIPT.name}] ${message}`);
    }

    function buildUrl(mode, extra = {}) {
        const url = new URL('game.php', location.href);
        url.search = '';
        url.searchParams.set('screen', 'overview_villages');
        url.searchParams.set('mode', mode);
        url.searchParams.set('page', '-1');

        if (game_data.player && Number(game_data.player.sitter) > 0) {
            url.searchParams.set('t', String(game_data.player.id));
        }

        Object.entries(extra).forEach(([key, value]) => {
            if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
        });
        return url.href;
    }

    async function fetchText(url) {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(html, 'text/html');
    }

    function numericFromCandidates(root, selectors) {
        for (const selector of selectors) {
            const nodes = [...root.querySelectorAll(selector)];
            for (const node of nodes) {
                const n = parseNumber(node.textContent);
                if (n > 0 || /\b0\b/.test(node.textContent || '')) return n;
            }
        }
        return 0;
    }

    function extractTransportTargetId(href) {
        if (!href) return '';
        try {
            const url = new URL(href, window.location.origin);

            // Sur GT, un lien vers un village peut contenir simultanément :
            //   village=<village actuellement sélectionné>
            //   id=<village réellement affiché / destinataire>
            // Pour les transports entrants, `id` est donc prioritaire.
            const explicitId = url.searchParams.get('id') ||
                               url.searchParams.get('target_id') ||
                               url.searchParams.get('target');
            if (explicitId && /^\d+$/.test(explicitId)) return explicitId;

            const villageId = url.searchParams.get('village');
            if (villageId && /^\d+$/.test(villageId)) return villageId;
        } catch (_) {
            const idMatch = String(href).match(/[?&](?:id|target_id|target)=(\d+)/);
            if (idMatch) return idMatch[1];
            const villageMatch = String(href).match(/[?&]village=(\d+)/);
            if (villageMatch) return villageMatch[1];
        }
        return '';
    }

    function parseIncomingResources(html) {
        const doc = parseHtml(html);
        const result = {};
        const table = doc.querySelector('#trades_table');
        if (!table) return result;

        const rows = [...table.querySelectorAll('tr')];
        for (const row of rows) {
            if (!row.querySelector('td')) continue;

            let targetId = '';

            // Fallbacks reprenant les deux structures observees par Sophie.
            try {
                const cells = row.children;
                const mobileCandidate = cells[3] && cells[3].children[2] && cells[3].children[2].href;
                const desktopCandidate = cells[4] && cells[4].children[0] && cells[4].children[0].href;
                const href = desktopCandidate || mobileCandidate || '';
                targetId = extractTransportTargetId(href);
            } catch (_) {}

            if (!targetId) {
                const candidates = [...row.querySelectorAll('a[href]')];

                // Premier passage : rechercher un identifiant explicite `id=`.
                // Cela évite de confondre la destination avec le paramètre
                // `village=` ajouté par GT à presque tous les liens de la page.
                for (const a of candidates) {
                    try {
                        const url = new URL(a.href, window.location.origin);
                        const explicitId = url.searchParams.get('id') ||
                                           url.searchParams.get('target_id') ||
                                           url.searchParams.get('target');
                        if (explicitId && /^\d+$/.test(explicitId)) {
                            targetId = explicitId;
                            break;
                        }
                    } catch (_) {}
                }

                // Fallback seulement si la structure ne fournit réellement aucun `id=`.
                if (!targetId) {
                    const currentVillageId = String(window.game_data?.village?.id || '');
                    const fallbackIds = candidates
                        .map(a => extractTransportTargetId(a.href))
                        .filter(Boolean);

                    // Si plusieurs IDs existent, éviter autant que possible l'ID du
                    // village courant : c'est souvent simplement le contexte de navigation.
                    targetId = fallbackIds.find(id => id !== currentVillageId) || fallbackIds[0] || '';
                }
            }

            if (!targetId) continue;

            const resource = { wood: 0, stone: 0, iron: 0 };

            const classMap = {
                wood: ['.wood', '.mwood'],
                stone: ['.stone', '.mstone'],
                iron: ['.iron', '.miron']
            };

            for (const [type, selectors] of Object.entries(classMap)) {
                let best = 0;
                for (const selector of selectors) {
                    for (const node of row.querySelectorAll(selector)) {
                        // Desktop : le nombre peut être porté par l'élément .wood/.stone/.iron.
                        // Mobile : la classe ressource est souvent sur l'icône, le nombre est sur son parent.
                        const candidates = [
                            node.textContent,
                            node.parentElement && node.parentElement.textContent
                        ];
                        for (const text of candidates) {
                            const n = parseNumber(text);
                            if (n > best) best = n;
                        }
                    }
                }
                resource[type] = best;
            }

            if (!resource.wood && !resource.stone && !resource.iron) continue;

            if (!result[targetId]) result[targetId] = { wood: 0, stone: 0, iron: 0 };
            result[targetId].wood += resource.wood;
            result[targetId].stone += resource.stone;
            result[targetId].iron += resource.iron;
        }

        return result;
    }

    function parseProductionDesktop(doc) {
        const villages = [];
        const rows = [...doc.querySelectorAll('.quickedit-vn')];

        for (const villageNode of rows) {
            const row = villageNode.closest('tr');
            if (!row) continue;

            const woodEl = row.querySelector('.res.wood,.warn_90.wood,.warn.wood');
            const stoneEl = row.querySelector('.res.stone,.warn_90.stone,.warn.stone');
            const ironEl = row.querySelector('.res.iron,.warn_90.iron,.warn.iron');
            if (!woodEl || !stoneEl || !ironEl) continue;

            const id = String(villageNode.dataset.id || '');
            if (!id) continue;

            const name = villageNode.textContent.trim();
            const coords = coordsFromName(name);
            const anchor = villageNode.querySelector('a[href]');

            let warehouse = 0;
            let available = 0;
            let total = 0;
            let farmUsed = 0;
            let farmTotal = 0;
            let points = 0;

            // Structure desktop d'origine.
            try {
                const resourceCell = ironEl.parentElement;
                const warehouseCell = resourceCell && resourceCell.nextElementSibling;
                const merchantCell = warehouseCell && warehouseCell.nextElementSibling;
                const farmCell = merchantCell && merchantCell.nextElementSibling;
                const pointsCell = woodEl.parentElement && woodEl.parentElement.previousElementSibling;

                warehouse = parseNumber(warehouseCell && warehouseCell.textContent);
                const merchantMatch = String(merchantCell && merchantCell.textContent || '').match(/([\d.\s]+)\s*\/\s*([\d.\s]+)/);
                if (merchantMatch) {
                    available = parseNumber(merchantMatch[1]);
                    total = parseNumber(merchantMatch[2]);
                }
                const farmMatch = String(farmCell && farmCell.textContent || '').match(/([\d.\s]+)\s*\/\s*([\d.\s]+)/);
                if (farmMatch) {
                    farmUsed = parseNumber(farmMatch[1]);
                    farmTotal = parseNumber(farmMatch[2]);
                }
                points = parseNumber(pointsCell && pointsCell.textContent);
            } catch (_) {}

            // Fallbacks par classes.
            if (!warehouse) {
                warehouse = numericFromCandidates(row, [
                    '.storage', '.warehouse', '.mheader.ressources'
                ]);
            }

            if (!available && !total) {
                const merchantText = [...row.querySelectorAll('.trader_img')]
                    .map(x => x.parentElement && x.parentElement.textContent)
                    .filter(Boolean)
                    .join(' ');
                const m = merchantText.match(/([\d.\s]+)\s*\/\s*([\d.\s]+)/);
                if (m) {
                    available = parseNumber(m[1]);
                    total = parseNumber(m[2]);
                }
            }

            if (!points) {
                const pointNode = row.querySelector('.points-header,.points');
                points = parseNumber(pointNode && pointNode.textContent);
            }

            if (!warehouse) continue;

            villages.push({
                id,
                name,
                url: anchor ? anchor.href : '',
                x: coords.x,
                y: coords.y,
                points,
                wood: parseNumber(woodEl.textContent),
                stone: parseNumber(stoneEl.textContent),
                iron: parseNumber(ironEl.textContent),
                warehouseCapacity: warehouse,
                availableMerchants: available,
                totalMerchants: total || available,
                farmSpaceUsed: farmUsed,
                farmSpaceTotal: farmTotal
            });
        }

        return villages;
    }

    function parseProductionMobile(doc) {
        const villages = [];

        for (const v of [...doc.querySelectorAll('.quickedit-vn')]) {
            const row = v.closest('tr');
            if (!row) continue;

            const wood = row.querySelector('.res.mwood,.warn_90.mwood,.warn.mwood');
            const stone = row.querySelector('.res.mstone,.warn_90.mstone,.warn.mstone');
            const iron = row.querySelector('.res.miron,.warn_90.miron,.warn.miron');
            if (!wood || !stone || !iron) continue;

            const id = String(v.dataset.id || '');
            if (!id) continue;

            const name = v.textContent.trim();
            const coords = coordsFromName(name);
            const anchor = v.querySelector('a[href]');

            let warehouse = 0;
            const warehouseHeader = row.querySelector('.mheader.ressources');
            if (warehouseHeader && warehouseHeader.parentElement) {
                warehouse = parseNumber(warehouseHeader.parentElement.textContent);
            }

            let available = 0;
            let total = 0;
            const traderImg = row.querySelector('.trader_img');
            const merchantText = String(traderImg && traderImg.parentElement && traderImg.parentElement.textContent || '');
            const mm = merchantText.match(/([\d.\s]+)\s*\/\s*([\d.\s]+)/);
            if (mm) {
                available = parseNumber(mm[1]);
                total = parseNumber(mm[2]);
            } else {
                available = parseNumber(merchantText);
                total = available;
            }

            let farmUsed = 0;
            let farmTotal = 0;
            const farmHeader = row.querySelector('.header.population');
            const farmText = String(farmHeader && farmHeader.parentElement && farmHeader.parentElement.textContent || '');
            const fm = farmText.match(/([\d.\s]+)\s*\/\s*([\d.\s]+)/);
            if (fm) {
                farmUsed = parseNumber(fm[1]);
                farmTotal = parseNumber(fm[2]);
            }

            let points = 0;
            const pointsNode = row.querySelector('.points-header');
            if (pointsNode) {
                const children = [...pointsNode.children];
                points = parseNumber(children.length
                    ? children[children.length - 1].textContent
                    : pointsNode.textContent);
            }

            if (!warehouse) {
                warehouse = numericFromCandidates(row, ['.storage', '.warehouse']);
            }

            if (!warehouse) continue;

            villages.push({
                id,
                name,
                url: anchor ? anchor.href : '',
                x: coords.x,
                y: coords.y,
                points,
                wood: parseNumber(wood.textContent),
                stone: parseNumber(stone.textContent),
                iron: parseNumber(iron.textContent),
                warehouseCapacity: warehouse,
                availableMerchants: available,
                totalMerchants: total || available,
                farmSpaceUsed: farmUsed,
                farmSpaceTotal: farmTotal
            });
        }

        return villages;
    }

    function parseProduction(html) {
        const doc = parseHtml(html);
        let villages = parseProductionDesktop(doc);

        if (!villages.length) villages = parseProductionMobile(doc);

        // Deduplication securisee par ID.
        const map = new Map();
        for (const village of villages) {
            if (!map.has(village.id)) map.set(village.id, village);
        }
        return [...map.values()];
    }

    function classifyVillage(village) {
        const s = state.settings;
        // Le seuil "terminé" prime si les deux plages se chevauchent.
        if (s.highPoints > 0 && village.points >= s.highPoints) return 'finished';
        if (village.points < s.lowPoints) return 'priority';
        return 'normal';
    }

    function incomingFor(village) {
        return state.settings.includeIncoming
            ? (state.incoming[village.id] || { wood: 0, stone: 0, iron: 0 })
            : { wood: 0, stone: 0, iron: 0 };
    }

    function finishedReserve(village) {
        if (classifyVillage(village) !== 'finished') return 0;
        return Math.max(0, village.warehouseCapacity * state.settings.builtOutPercentage);
    }

    function priorityReceiveCap(village) {
        if (classifyVillage(village) !== 'priority') return village.warehouseCapacity;
        return Math.max(0, village.warehouseCapacity * state.settings.needsMorePercentage);
    }

    function projectedResources(village) {
        const inc = state.settings.includeIncoming
            ? (state.incoming[village.id] || { wood: 0, stone: 0, iron: 0 })
            : { wood: 0, stone: 0, iron: 0 };

        return {
            wood: village.wood + inc.wood,
            stone: village.stone + inc.stone,
            iron: village.iron + inc.iron
        };
    }

    function mergeLink(map, link) {
        const key = `${link.kind || 'balance'}:${link.source}:${link.target}`;
        if (!map.has(key)) {
            map.set(key, {
                kind: link.kind || 'balance',
                source: String(link.source),
                target: String(link.target),
                wood: 0,
                stone: 0,
                iron: 0,
                distance: Number(link.distance) || 0
            });
        }
        const row = map.get(key);
        row.wood += Number(link.wood) || 0;
        row.stone += Number(link.stone) || 0;
        row.iron += Number(link.iron) || 0;
        row.distance = Number(link.distance) || row.distance || 0;
    }

    function createPlanningWork(villages) {
        const work = new Map();
        for (const v of villages) {
            const projected = projectedResources(v);
            work.set(v.id, {
                id: v.id,
                village: v,
                projected: { ...projected },
                target: { ...projected },
                deficit: { wood: 0, stone: 0, iron: 0 },
                excess: { wood: 0, stone: 0, iron: 0 },
                currentAvailable: {
                    wood: Math.max(0, v.wood),
                    stone: Math.max(0, v.stone),
                    iron: Math.max(0, v.iron)
                },
                merchantsLeft: Math.max(0, v.availableMerchants)
            });
        }
        return work;
    }

    function emptyTargets(villages) {
        return new Map(villages.map(v => [v.id, projectedResources(v)]));
    }

    function localMinimum(node) {
        return Math.min(node.projected.wood, node.projected.stone, node.projected.iron);
    }

    function localMaximum(node) {
        return Math.max(node.projected.wood, node.projected.stone, node.projected.iron);
    }

    function finishedSendable(node, resource) {
        if (classifyVillage(node.village) !== 'finished') return 0;
        const reserve = finishedReserve(node.village);
        // Le Min protège le stock réellement présent. Une ressource entrante
        // n'est jamais considérée comme immédiatement renvoyable.
        return round1000(Math.max(0, Math.min(
            node.currentAvailable[resource] - reserve,
            node.merchantsLeft * 1000
        )));
    }

    function targetExcessSendable(node, resource, targetValue) {
        return round1000(Math.max(0, Math.min(
            node.projected[resource] - targetValue,
            node.currentAvailable[resource],
            node.merchantsLeft * 1000
        )));
    }

    function internalExcessSendable(node, resource) {
        const floor = localMinimum(node);
        return round1000(Math.max(0, Math.min(
            node.projected[resource] - floor,
            node.currentAvailable[resource],
            node.merchantsLeft * 1000
        )));
    }

    function applyTransfer(links, source, target, resource, amount, kind = 'balance') {
        amount = round1000(amount);
        if (amount < state.settings.minTransfer) return 0;
        if (source.merchantsLeft * 1000 < amount) return 0;
        if (source.currentAvailable[resource] < amount) return 0;

        const dist = distance(source.village, target.village);
        if (state.settings.maxDistance > 0 && dist > state.settings.maxDistance) return 0;

        mergeLink(links, {
            kind,
            source: source.id,
            target: target.id,
            [resource]: amount,
            distance: dist
        });

        source.projected[resource] -= amount;
        source.currentAvailable[resource] -= amount;
        source.merchantsLeft -= amount / 1000;
        target.projected[resource] += amount;
        return amount;
    }

    function solveEqualLevel(entries, total) {
        if (!entries.length) return 0;
        const upperSum = entries.reduce((sum, e) => sum + e.max, 0);
        const budget = Math.max(0, Math.min(Number(total) || 0, upperSum));
        let lo = 0;
        let hi = Math.max(...entries.map(e => e.max), 0);

        for (let i = 0; i < 70; i++) {
            const mid = (lo + hi) / 2;
            const used = entries.reduce((sum, e) => sum + Math.min(e.max, mid), 0);
            if (used <= budget) lo = mid;
            else hi = mid;
        }
        return lo;
    }

    function externalTargetsForResource(priorityNodes, finishedNodes, resource) {
        const entries = priorityNodes.map(node => ({
            node,
            max: priorityReceiveCap(node.village)
        }));

        const priorityStock = priorityNodes.reduce((sum, node) => sum + node.projected[resource], 0);
        const finishedSupply = finishedNodes.reduce((sum, node) => {
            const reserve = finishedReserve(node.village);
            return sum + Math.max(0, node.currentAvailable[resource] - reserve);
        }, 0);

        const level = solveEqualLevel(entries, priorityStock + finishedSupply);
        const targets = new Map();
        for (const entry of entries) {
            targets.set(entry.node.id, Math.round(Math.min(entry.max, level)));
        }
        return { level, targets };
    }

    function sourceCandidatesForTarget(work, targetNode, resource, targetMap, allowFinished) {
        return [...work.values()]
            .filter(source => source.id !== targetNode.id && source.merchantsLeft >= 1)
            .map(source => {
                const type = classifyVillage(source.village);
                let available = 0;
                let rank = 99;

                if (type === 'priority' && targetMap && targetMap.has(source.id)) {
                    available = targetExcessSendable(source, resource, targetMap.get(source.id));
                    rank = 0; // on redistribue d'abord l'excédent des prioritaires
                } else if (allowFinished && type === 'finished') {
                    available = finishedSendable(source, resource);
                    rank = 1;
                }

                return {
                    source,
                    available,
                    rank,
                    dist: distance(source.village, targetNode.village)
                };
            })
            .filter(x =>
                x.available >= state.settings.minTransfer &&
                (state.settings.maxDistance <= 0 || x.dist <= state.settings.maxDistance)
            )
            .sort((a, b) => {
                if (a.rank !== b.rank) return a.rank - b.rank;
                if (a.dist !== b.dist) return a.dist - b.dist;
                return b.source.merchantsLeft - a.source.merchantsLeft;
            });
    }

    function sendTowardTarget(work, links, targetNode, resource, targetValue, targetMap, allowFinished) {
        let deficit = round1000(Math.max(0, targetValue - targetNode.projected[resource]));
        let sent = 0;

        while (deficit >= state.settings.minTransfer) {
            const candidates = sourceCandidatesForTarget(
                work, targetNode, resource, targetMap, allowFinished
            );
            if (!candidates.length) break;

            let progressed = false;
            for (const candidate of candidates) {
                if (deficit < state.settings.minTransfer) break;
                const amount = round1000(Math.min(deficit, candidate.available));
                if (amount < state.settings.minTransfer) continue;
                const actual = applyTransfer(
                    links, candidate.source, targetNode, resource, amount, 'balance'
                );
                if (!actual) continue;
                deficit -= actual;
                sent += actual;
                progressed = true;
            }
            if (!progressed) break;
        }
        return sent;
    }

    function finalizeFillExcess(work, targets) {
        for (const node of work.values()) {
            const type = classifyVillage(node.village);
            for (const r of ['wood', 'stone', 'iron']) {
                if (type === 'finished') {
                    node.excess[r] = finishedSendable(node, r);
                } else {
                    node.excess[r] = 0;
                }
                const target = targets.get(node.id)[r];
                node.deficit[r] = round1000(Math.max(0, target - node.projected[r]));
            }
        }
    }

    function buildFillPlan(villages) {
        const resources = ['wood', 'stone', 'iron'];
        const work = createPlanningWork(villages);
        const targets = emptyTargets(villages);
        const links = new Map();
        const priorities = [...work.values()]
            .filter(node => classifyVillage(node.village) === 'priority')
            .sort((a, b) => {
                if (a.village.warehouseCapacity !== b.village.warehouseCapacity) {
                    return a.village.warehouseCapacity - b.village.warehouseCapacity;
                }
                return a.village.points - b.village.points;
            });
        const finished = [...work.values()]
            .filter(node => classifyVillage(node.village) === 'finished');

        for (const node of finished) {
            const reserve = finishedReserve(node.village);
            targets.set(node.id, { wood: reserve, stone: reserve, iron: reserve });
            node.target = { wood: reserve, stone: reserve, iron: reserve };
        }

        let blocked = false;
        for (const targetNode of priorities) {
            if (blocked) break;
            const cap = priorityReceiveCap(targetNode.village);
            const target = { wood: cap, stone: cap, iron: cap };
            targets.set(targetNode.id, target);
            targetNode.target = { ...target };

            for (const resource of resources) {
                let deficit = round1000(Math.max(0, cap - targetNode.projected[resource]));
                while (deficit >= state.settings.minTransfer) {
                    const candidates = finished
                        .filter(source =>
                            source.id !== targetNode.id &&
                            finishedSendable(source, resource) >= state.settings.minTransfer
                        )
                        .map(source => ({
                            source,
                            dist: distance(source.village, targetNode.village)
                        }))
                        .filter(x => state.settings.maxDistance <= 0 || x.dist <= state.settings.maxDistance)
                        .sort((a, b) => {
                            if (a.dist !== b.dist) return a.dist - b.dist;
                            return b.source.merchantsLeft - a.source.merchantsLeft;
                        });

                    if (!candidates.length) break;
                    let progressed = false;
                    for (const candidate of candidates) {
                        if (deficit < state.settings.minTransfer) break;
                        const available = finishedSendable(candidate.source, resource);
                        const amount = round1000(Math.min(deficit, available));
                        if (amount < state.settings.minTransfer) continue;
                        const actual = applyTransfer(
                            links, candidate.source, targetNode, resource, amount, 'balance'
                        );
                        if (!actual) continue;
                        deficit -= actual;
                        progressed = true;
                    }
                    if (!progressed) break;
                }
            }

            // Tant que le village courant n'est pas rempli au Max (à la granularité
            // transportable), aucun village prioritaire suivant n'est commencé.
            blocked = resources.some(resource =>
                round1000(Math.max(0, cap - targetNode.projected[resource])) >= state.settings.minTransfer
            );
        }

        finalizeFillExcess(work, targets);
        return { work, targets, links: [...links.values()] };
    }

    function buildExternalPlan(villages, mixMode = false) {
        const resources = ['wood', 'stone', 'iron'];
        const work = createPlanningWork(villages);
        const targets = emptyTargets(villages);
        const links = new Map();
        const priorities = [...work.values()]
            .filter(node => classifyVillage(node.village) === 'priority');
        const finished = [...work.values()]
            .filter(node => classifyVillage(node.village) === 'finished');

        // Les villages terminés ont une réserve Min, pas une cible de réception.
        for (const node of finished) {
            const reserve = finishedReserve(node.village);
            targets.set(node.id, { wood: reserve, stone: reserve, iron: reserve });
            node.target = { wood: reserve, stone: reserve, iron: reserve };
        }

        const resourceTargetMaps = {};
        for (const resource of resources) {
            const result = externalTargetsForResource(priorities, finished, resource);
            resourceTargetMaps[resource] = result.targets;
            for (const node of priorities) {
                targets.get(node.id)[resource] = result.targets.get(node.id) || 0;
            }
        }
        for (const node of priorities) node.target = { ...targets.get(node.id) };

        if (!mixMode) {
            // Externe : chaque ressource est traitée indépendamment. Les villages
            // les plus bas pour cette ressource sont servis en premier.
            for (const resource of resources) {
                const targetMap = resourceTargetMaps[resource];
                const ordered = [...priorities].sort((a, b) =>
                    a.projected[resource] - b.projected[resource]
                );
                for (const targetNode of ordered) {
                    sendTowardTarget(
                        work,
                        links,
                        targetNode,
                        resource,
                        targetMap.get(targetNode.id) || 0,
                        targetMap,
                        true
                    );
                }
            }
        } else {
            // Mix : l'objectif externe reste prioritaire. Parmi les déficits
            // possibles, on sert d'abord la ressource qui réduit le plus l'écart
            // B/A/F du village destinataire.
            let guard = 0;
            while (guard++ < 10000) {
                const needs = [];
                for (const node of priorities) {
                    const localMax = localMaximum(node);
                    for (const resource of resources) {
                        const targetValue = resourceTargetMaps[resource].get(node.id) || 0;
                        const deficit = round1000(Math.max(0, targetValue - node.projected[resource]));
                        if (deficit < state.settings.minTransfer) continue;
                        needs.push({
                            node,
                            resource,
                            targetValue,
                            deficit,
                            internalGap: Math.max(0, localMax - node.projected[resource])
                        });
                    }
                }
                if (!needs.length) break;

                needs.sort((a, b) => {
                    // L'écart externe reste le critère principal.
                    if (b.deficit !== a.deficit) return b.deficit - a.deficit;
                    if (b.internalGap !== a.internalGap) return b.internalGap - a.internalGap;
                    return a.node.village.points - b.node.village.points;
                });

                let progressed = false;
                for (const need of needs) {
                    const candidates = sourceCandidatesForTarget(
                        work,
                        need.node,
                        need.resource,
                        resourceTargetMaps[need.resource],
                        true
                    );
                    if (!candidates.length) continue;

                    const candidate = candidates[0];
                    let amount = Math.min(need.deficit, candidate.available);

                    // Pour favoriser l'équilibre interne, on évite de dépasser
                    // inutilement le niveau de la ressource immédiatement supérieure.
                    const values = resources
                        .filter(r => r !== need.resource)
                        .map(r => need.node.projected[r])
                        .sort((a, b) => a - b);
                    const nextLocal = values.find(v => v > need.node.projected[need.resource]);
                    if (Number.isFinite(nextLocal)) {
                        const localRoom = Math.max(
                            state.settings.minTransfer,
                            Math.ceil((nextLocal - need.node.projected[need.resource]) / 1000) * 1000
                        );
                        amount = Math.min(amount, localRoom);
                    }

                    amount = round1000(amount);
                    if (amount < state.settings.minTransfer) continue;
                    if (applyTransfer(links, candidate.source, need.node, need.resource, amount, 'balance')) {
                        progressed = true;
                        break; // recalcul complet des écarts après chaque transport
                    }
                }
                if (!progressed) break;
            }
        }

        // Déficits et surplus résiduels après la redistribution.
        for (const node of work.values()) {
            const type = classifyVillage(node.village);
            for (const resource of resources) {
                if (type === 'priority') {
                    const targetValue = targets.get(node.id)[resource];
                    node.deficit[resource] = round1000(Math.max(0, targetValue - node.projected[resource]));
                    node.excess[resource] = targetExcessSendable(node, resource, targetValue);
                } else if (type === 'finished') {
                    node.deficit[resource] = 0;
                    node.excess[resource] = finishedSendable(node, resource);
                } else {
                    node.deficit[resource] = 0;
                    node.excess[resource] = 0;
                }
            }
        }

        return { work, targets, links: [...links.values()] };
    }

    function planInternalStep(work, targetNode) {
        const resources = ['wood', 'stone', 'iron'];
        const minValue = localMinimum(targetNode);
        const maxValue = localMaximum(targetNode);
        if (maxValue - minValue < state.settings.minTransfer) return null;

        const lows = resources.filter(r => targetNode.projected[r] === minValue);
        if (!lows.length) return null;

        // Si une seule ressource est basse, on cherche à la faire rejoindre la
        // suivante. Si plusieurs sont à égalité, elles doivent toutes monter :
        // sinon le niveau d'équilibre du village ne progresserait pas.
        let desiredPerResource = state.settings.minTransfer;
        if (lows.length === 1) {
            const higher = resources
                .map(r => targetNode.projected[r])
                .filter(v => v > minValue)
                .sort((a, b) => a - b)[0];
            if (Number.isFinite(higher)) {
                desiredPerResource = Math.max(
                    state.settings.minTransfer,
                    Math.ceil((higher - minValue) / 1000) * 1000
                );
            }
        }

        const reservations = new Map();
        const allocations = [];

        for (const resource of lows) {
            let remaining = desiredPerResource;
            const candidates = [...work.values()]
                .filter(source => source.id !== targetNode.id)
                .map(source => ({
                    source,
                    available: internalExcessSendable(source, resource),
                    dist: distance(source.village, targetNode.village)
                }))
                .filter(x =>
                    x.available >= state.settings.minTransfer &&
                    (state.settings.maxDistance <= 0 || x.dist <= state.settings.maxDistance)
                )
                .sort((a, b) => {
                    if (a.dist !== b.dist) return a.dist - b.dist;
                    return b.available - a.available;
                });

            for (const candidate of candidates) {
                if (remaining < state.settings.minTransfer) break;
                const alreadyReserved = reservations.get(candidate.source.id) || 0;
                const merchantRoom = Math.max(
                    0,
                    (candidate.source.merchantsLeft * 1000) - alreadyReserved
                );
                let available = Math.min(candidate.available, merchantRoom);
                available = round1000(available);
                if (available < state.settings.minTransfer) continue;

                const amount = round1000(Math.min(remaining, available));
                if (amount < state.settings.minTransfer) continue;
                allocations.push({
                    source: candidate.source,
                    resource,
                    amount,
                    dist: candidate.dist
                });
                reservations.set(candidate.source.id, alreadyReserved + amount);
                remaining -= amount;
            }

            // Avec une seule ressource basse, tout apport transportable améliore
            // déjà l'équilibre, même s'il ne rejoint pas complètement la suivante.
            // Avec plusieurs ressources au même minimum, elles doivent toutes être
            // servies : sinon le minimum global du village ne progresserait pas.
            const allocated = desiredPerResource - remaining;
            if (lows.length === 1) {
                if (allocated < state.settings.minTransfer) return null;
            } else if (remaining >= state.settings.minTransfer) {
                return null;
            }
        }

        return { target: targetNode, allocations };
    }

    function buildInternalPlan(villages) {
        const resources = ['wood', 'stone', 'iron'];
        const work = createPlanningWork(villages);
        const targets = emptyTargets(villages);
        const links = new Map();

        let guard = 0;
        while (guard++ < 10000) {
            const ordered = [...work.values()]
                .sort((a, b) => {
                    const minDiff = localMinimum(a) - localMinimum(b);
                    if (minDiff !== 0) return minDiff;
                    const spreadA = localMaximum(a) - localMinimum(a);
                    const spreadB = localMaximum(b) - localMinimum(b);
                    if (spreadB !== spreadA) return spreadB - spreadA;
                    return a.village.points - b.village.points;
                });

            let step = null;
            for (const targetNode of ordered) {
                step = planInternalStep(work, targetNode);
                if (step) break;
            }
            if (!step) break;

            let committed = true;
            for (const allocation of step.allocations) {
                const actual = applyTransfer(
                    links,
                    allocation.source,
                    step.target,
                    allocation.resource,
                    allocation.amount,
                    'balance'
                );
                if (!actual) {
                    committed = false;
                    break;
                }
            }
            if (!committed) break;
        }

        // La cible interne finale est le niveau commun réellement atteignable
        // dans chaque village après les échanges utiles.
        for (const node of work.values()) {
            const level = localMinimum(node);
            const target = { wood: level, stone: level, iron: level };
            targets.set(node.id, target);
            node.target = { ...target };
            for (const resource of resources) {
                node.deficit[resource] = 0;
                node.excess[resource] = internalExcessSendable(node, resource);
            }
        }

        return { work, targets, links: [...links.values()] };
    }

    function buildModePlan(villages) {
        switch (state.settings.balanceMode) {
            case 'fill':
                return buildFillPlan(villages);
            case 'internal':
                return buildInternalPlan(villages);
            case 'external':
                return buildExternalPlan(villages, false);
            case 'mix':
            default:
                return buildExternalPlan(villages, true);
        }
    }

    function choosePremiumCollector(work) {
        const s = state.settings;

        if (s.premiumCollectorId && work.has(s.premiumCollectorId)) {
            return work.get(s.premiumCollectorId);
        }

        return [...work.values()]
            .sort((a, b) => {
                if (b.merchantsLeft !== a.merchantsLeft) {
                    return b.merchantsLeft - a.merchantsLeft;
                }
                return b.village.warehouseCapacity - a.village.warehouseCapacity;
            })[0] || null;
    }

    function buildPremiumPlan(baseWork) {
        const s = state.settings;
        if (!s.premiumConsolidation) {
            return { links: [], collector: null, leftover: { wood: 0, stone: 0, iron: 0 } };
        }

        const resources = ['wood', 'stone', 'iron'];
        const collector = choosePremiumCollector(baseWork);
        if (!collector) {
            return { links: [], collector: null, leftover: { wood: 0, stone: 0, iron: 0 } };
        }

        const links = new Map();

        for (const resource of resources) {
            let headroom = round1000(Math.max(
                0,
                collector.village.warehouseCapacity * s.premiumFillPercentage -
                collector.projected[resource]
            ));

            if (headroom < s.minTransfer) continue;

            const sources = [...baseWork.values()]
                .filter(source =>
                    source.id !== collector.id &&
                    source.excess[resource] >= s.minTransfer &&
                    source.merchantsLeft >= 1
                )
                .map(source => ({
                    source,
                    dist: distance(source.village, collector.village)
                }))
                .filter(x => s.maxDistance <= 0 || x.dist <= s.maxDistance)
                .sort((a, b) => {
                    // Pour le Premium on prefere d'abord les trajets courts,
                    // puis les sources possedant le plus de surplus.
                    if (a.dist !== b.dist) return a.dist - b.dist;
                    return b.source.excess[resource] - a.source.excess[resource];
                });

            for (const candidate of sources) {
                if (headroom < s.minTransfer) break;

                const source = candidate.source;
                const merchantCapacity = source.merchantsLeft * 1000;
                let amount = Math.min(
                    headroom,
                    source.excess[resource],
                    merchantCapacity
                );
                amount = round1000(amount);

                if (amount < s.minTransfer) continue;

                mergeLink(links, {
                    kind: 'premium',
                    source: source.id,
                    target: collector.id,
                    [resource]: amount,
                    distance: candidate.dist
                });

                source.excess[resource] -= amount;
                source.currentAvailable[resource] -= amount;
                source.merchantsLeft -= amount / 1000;
                source.projected[resource] -= amount;

                collector.projected[resource] += amount;
                headroom -= amount;
            }
        }

        const leftover = { wood: 0, stone: 0, iron: 0 };
        for (const node of baseWork.values()) {
            for (const r of resources) leftover[r] += node.excess[r];
        }

        return { links: [...links.values()], collector, leftover };
    }

    function computeSummary(villages, targets, baseResult, premiumResult) {
        const resources = ['wood', 'stone', 'iron'];
        const totals = { wood: 0, stone: 0, iron: 0 };
        const incomingTotals = { wood: 0, stone: 0, iron: 0 };
        const deficits = { wood: 0, stone: 0, iron: 0 };
        const excess = { wood: 0, stone: 0, iron: 0 };
        let merchants = 0;
        let availableMerchants = 0;
        let priorityCount = 0;
        let finishedCount = 0;

        for (const v of villages) {
            totals.wood += v.wood;
            totals.stone += v.stone;
            totals.iron += v.iron;
            merchants += v.totalMerchants;
            availableMerchants += v.availableMerchants;

            const inc = state.incoming[v.id] || { wood: 0, stone: 0, iron: 0 };
            incomingTotals.wood += inc.wood;
            incomingTotals.stone += inc.stone;
            incomingTotals.iron += inc.iron;

            const type = classifyVillage(v);
            if (type === 'priority') priorityCount++;
            if (type === 'finished') finishedCount++;
        }

        for (const node of baseResult.work.values()) {
            for (const r of resources) {
                deficits[r] += node.deficit[r];
                excess[r] += node.excess[r];
            }
        }

        const sent = { wood: 0, stone: 0, iron: 0 };
        for (const link of [...baseResult.links, ...premiumResult.links]) {
            for (const r of resources) sent[r] += link[r] || 0;
        }

        return {
            totals,
            incomingTotals,
            deficits,
            excess,
            sent,
            merchants,
            availableMerchants,
            priorityCount,
            finishedCount,
            villages: villages.length
        };
    }

    async function analyze() {
        if (state.loading) return;
        state.loading = true;
        state.errors = [];
        setLoading(true, 'Analyse des villages et des transports…');

        try {
            const incomingUrl = buildUrl('trader', { type: 'inc' });
            const productionUrl = buildUrl('prod');

            const [incomingHtml, productionHtml] = await Promise.all([
                fetchText(incomingUrl),
                fetchText(productionUrl)
            ]);

            state.incoming = parseIncomingResources(incomingHtml);
            state.villages = parseProduction(productionHtml)
                .sort((a, b) => a.points - b.points);

            state.villageById = new Map(state.villages.map(v => [v.id, v]));

            // Ne conserver que les transports entrants rattachés à un village
            // réellement présent dans le groupe analysé.
            state.incoming = Object.fromEntries(
                Object.entries(state.incoming).filter(([id]) => state.villageById.has(String(id)))
            );

            if (!state.villages.length) {
                throw new Error("Aucun village n'a pu être analysé dans l'aperçu de production.");
            }

            const projectedTotals = { wood: 0, stone: 0, iron: 0 };
            for (const v of state.villages) {
                const p = projectedResources(v);
                projectedTotals.wood += p.wood;
                projectedTotals.stone += p.stone;
                projectedTotals.iron += p.iron;
            }

            const baseResult = buildModePlan(state.villages);
            state.targets = baseResult.targets;
            const premiumResult = buildPremiumPlan(baseResult.work);

            state.baseLinks = baseResult.links;
            state.premiumLinks = premiumResult.links;
            state.links = [...state.baseLinks, ...state.premiumLinks]
                .sort((a, b) => {
                    if (a.kind !== b.kind) return a.kind === 'balance' ? -1 : 1;
                    return a.distance - b.distance;
                });

            state.collectorId = premiumResult.collector ? premiumResult.collector.id : '';
            state.summary = computeSummary(
                state.villages,
                state.targets,
                baseResult,
                premiumResult
            );

            renderPanel();
            notify('Success', `${state.villages.length} villages analysés, ${state.links.length} transports proposés.`);
        } catch (error) {
            console.error(`[${SCRIPT.name}]`, error);
            state.errors.push(error.message || String(error));
            renderPanel();
            notify('Error', `Erreur : ${error.message || error}`);
        } finally {
            state.loading = false;
            setLoading(false);
        }
    }

    function getFinalEstimate(villageId) {
        const v = state.villageById.get(String(villageId));
        if (!v) return null;

        const result = projectedResources(v);
        let merchantsLeft = v.availableMerchants;

        for (const link of state.links) {
            for (const r of ['wood', 'stone', 'iron']) {
                const amount = link[r] || 0;
                if (String(link.target) === String(villageId)) result[r] += amount;
                if (String(link.source) === String(villageId)) result[r] -= amount;
            }
            if (String(link.source) === String(villageId)) {
                merchantsLeft -= ((link.wood || 0) + (link.stone || 0) + (link.iron || 0)) / 1000;
            }
        }

        return { ...result, merchantsLeft };
    }

    function readSettingsFromUi() {
        const root = document.getElementById(`${SCRIPT.prefix}Panel`);
        if (!root) return state.settings;

        const val = id => root.querySelector(`#${id}`)?.value;
        const checked = id => !!root.querySelector(`#${id}`)?.checked;

        return normalizeSettings({
            ...state.settings,
            balanceMode: val(`${SCRIPT.prefix}BalanceMode`),
            lowPoints: val(`${SCRIPT.prefix}LowPoints`),
            highPoints: val(`${SCRIPT.prefix}HighPoints`),
            builtOutPercentage: Number(val(`${SCRIPT.prefix}BuiltOutPct`)) / 100,
            needsMorePercentage: Number(val(`${SCRIPT.prefix}NeedsMorePct`)) / 100,
            includeIncoming: checked(`${SCRIPT.prefix}Incoming`),
            minTransfer: val(`${SCRIPT.prefix}MinTransfer`),
            maxDistance: val(`${SCRIPT.prefix}MaxDistance`),
            premiumConsolidation: checked(`${SCRIPT.prefix}Premium`),
            premiumCollectorId: val(`${SCRIPT.prefix}Collector`),
            premiumFillPercentage: Number(val(`${SCRIPT.prefix}PremiumFill`)) / 100
        });
    }

    function modeLabel(mode = state.settings.balanceMode) {
        return ({
            mix: 'Mix',
            external: 'Équilibre externe',
            internal: 'Équilibre interne',
            fill: 'Remplissage'
        })[mode] || 'Mix';
    }

    function injectStyles() {
        const id = `${SCRIPT.prefix}Style`;
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
            #${SCRIPT.prefix}Wrap{
                width:100%;margin:0 0 10px 0;
                font-family:"Segoe UI",Arial,sans-serif;
            }
            #${SCRIPT.prefix}Panel{
                --wt-orange:#ff9800;--wt-orange-soft:#ffb347;--wt-bg:#171717;--wt-bg2:#202020;
                --wt-card:#222;--wt-border:#3d3d3d;--wt-text:#e6e6e6;--wt-muted:#999;
                color:var(--wt-text);border:1px solid #3b3b3b;border-radius:6px;background:#181818;
                overflow:hidden;
            }
            #${SCRIPT.prefix}Panel *{box-sizing:border-box}
            .${SCRIPT.prefix}-hero{
                display:flex;align-items:center;gap:8px;padding:7px 9px;border-bottom:1px solid #353535;
                background:#202020;user-select:none;
            }
            .${SCRIPT.prefix}-brand{font-size:18px;line-height:1}
            .${SCRIPT.prefix}-hero-main{min-width:0;flex:1;display:flex;align-items:baseline;gap:8px}
            .${SCRIPT.prefix}-title{font-size:14px;font-weight:800;color:#fff}
            .${SCRIPT.prefix}-subtitle{font-size:10px;color:#888}
            .${SCRIPT.prefix}-version{color:var(--wt-orange-soft);font-size:9px;font-weight:700}
            .${SCRIPT.prefix}-hero-actions{display:flex;gap:5px}
            .${SCRIPT.prefix}-body{padding:8px}
            .${SCRIPT.prefix}-card{
                margin-bottom:7px;padding:8px;border:1px solid #353535;border-radius:5px;background:#1e1e1e;
            }
            .${SCRIPT.prefix}-card:last-child{margin-bottom:0}
            .${SCRIPT.prefix}-card-title{
                display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;
                color:var(--wt-orange);font-size:10px;font-weight:800;text-transform:uppercase;
            }
            .${SCRIPT.prefix}-grid{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:6px}
            .${SCRIPT.prefix}-grid-main{grid-template-columns:minmax(180px,1.25fr) repeat(4,minmax(125px,1fr))}
            .${SCRIPT.prefix}-field label{display:block;margin-bottom:3px;color:#999;font-size:9px;font-weight:700}
            .${SCRIPT.prefix}-input,.${SCRIPT.prefix}-select{
                width:100%;height:28px;padding:3px 6px;border:1px solid #444;border-radius:4px;outline:none;
                background:#121212;color:#e8e8e8;font-size:10px;
            }
            .${SCRIPT.prefix}-input:focus,.${SCRIPT.prefix}-select:focus{border-color:var(--wt-orange)}
            .${SCRIPT.prefix}-check{
                display:flex;align-items:center;gap:6px;min-height:28px;padding:4px 6px;border:1px solid #383838;
                border-radius:4px;background:#171717;color:#bbb;font-size:10px;
            }
            .${SCRIPT.prefix}-check input{accent-color:var(--wt-orange)}
            .${SCRIPT.prefix}-btn{
                min-height:28px;padding:4px 8px;border:1px solid #5c4b34;border-radius:4px;
                background:#2d2419;color:#ffd49a;font:700 10px "Segoe UI",Arial,sans-serif;cursor:pointer;
            }
            .${SCRIPT.prefix}-btn:hover{border-color:var(--wt-orange);color:#fff;background:#3d2b17}
            .${SCRIPT.prefix}-btn.primary{border-color:#945d12;background:#724300;color:#fff}
            .${SCRIPT.prefix}-btn.danger{border-color:#684040;background:#321f1f;color:#ffaaaa}
            .${SCRIPT.prefix}-btn:disabled{opacity:.45;cursor:not-allowed}
            .${SCRIPT.prefix}-advanced{margin-top:7px;border-top:1px solid #333;padding-top:6px}
            .${SCRIPT.prefix}-advanced summary{cursor:pointer;color:#a98a61;font-size:9px;font-weight:700;user-select:none}
            .${SCRIPT.prefix}-advanced-body{margin-top:6px}
            .${SCRIPT.prefix}-mode-help{margin-top:6px;color:#8f8f8f;font-size:9px;line-height:1.35}
            .${SCRIPT.prefix}-stats{display:grid;grid-template-columns:repeat(5,minmax(90px,1fr));gap:5px}
            .${SCRIPT.prefix}-stat{padding:6px;border:1px solid #353535;border-radius:4px;background:#171717;text-align:center}
            .${SCRIPT.prefix}-stat strong{display:block;color:#fff;font-size:12px}
            .${SCRIPT.prefix}-stat span{display:block;margin-top:1px;color:#888;font-size:8px}
            .${SCRIPT.prefix}-notice{margin-top:6px;padding:6px 7px;border-left:2px solid var(--wt-orange);background:#191714;color:#aaa;font-size:9px;line-height:1.35}
            .${SCRIPT.prefix}-notice.warn{border-color:#d6a100;background:#211d11}
            .${SCRIPT.prefix}-notice.error{border-color:#d84d4d;background:#241414;color:#ffb7b7}
            .${SCRIPT.prefix}-table-wrap{overflow:auto;border:1px solid #343434;border-radius:5px}
            .${SCRIPT.prefix}-table{width:100%;border-collapse:collapse;min-width:740px;font-size:9px}
            .${SCRIPT.prefix}-table th{position:sticky;top:0;z-index:1;padding:6px;background-color:unset!important;background-image:linear-gradient(#111,#111)!important;color:var(--wt-orange)!important;border-bottom:1px solid #7a4a08;text-align:center;white-space:nowrap}
            .${SCRIPT.prefix}-table td{padding:5px;border-bottom:1px solid #2d2d2d;text-align:center}
            .${SCRIPT.prefix}-table tbody tr:nth-child(even) td{background:#1c1c1c}
            .${SCRIPT.prefix}-table tbody tr:hover td{background:#26221d}
            .${SCRIPT.prefix}-village{max-width:230px;text-align:left!important}
            .${SCRIPT.prefix}-village a{color:#ddd;text-decoration:none}.${SCRIPT.prefix}-village a:hover{color:var(--wt-orange-soft)}
            .${SCRIPT.prefix}-res{font-variant-numeric:tabular-nums;white-space:nowrap}
            .${SCRIPT.prefix}-res .icon,.${SCRIPT.prefix}-table th .icon,.${SCRIPT.prefix}-notice .icon{display:inline-block;vertical-align:-2px;margin-right:3px}
            .${SCRIPT.prefix}-kind{display:inline-block;padding:2px 5px;border-radius:99px;font-size:8px;font-weight:800;text-transform:uppercase}
            .${SCRIPT.prefix}-kind.balance{background:#213226;color:#7de1a1}.${SCRIPT.prefix}-kind.premium{background:#342615;color:#ffba5b}
            .${SCRIPT.prefix}-transfers-actions{display:flex;justify-content:flex-end;gap:6px;margin-bottom:6px}.${SCRIPT.prefix}-empty{padding:14px;text-align:center;color:#777}
            .${SCRIPT.prefix}-footer{display:flex;justify-content:space-between;gap:8px;padding:5px 8px;border-top:1px solid #303030;background:#121212;color:#666;font-size:8px}
            .${SCRIPT.prefix}-footer-center{color:#8d642f}.${SCRIPT.prefix}-footer-right{text-align:right}
            .${SCRIPT.prefix}-settings summary{cursor:pointer;color:#b99768;font-size:9px;font-weight:700;user-select:none}.${SCRIPT.prefix}-settings-body{margin-top:6px}
            .${SCRIPT.prefix}-collector-info{color:#ffbc64;font-weight:700}
            .${SCRIPT.prefix}-loading{display:none;align-items:center;gap:7px;margin-bottom:6px;padding:6px 7px;border:1px solid #50422e;border-radius:4px;background:#211a12;color:#ffd59d;font-size:9px}
            .${SCRIPT.prefix}-loading.show{display:flex}.${SCRIPT.prefix}-spinner{width:11px;height:11px;border:2px solid #5d4a31;border-top-color:var(--wt-orange);border-radius:50%;animation:${SCRIPT.prefix}Spin .7s linear infinite}
            @keyframes ${SCRIPT.prefix}Spin{to{transform:rotate(360deg)}}
            @media(max-width:900px){.${SCRIPT.prefix}-grid,.${SCRIPT.prefix}-grid-main{grid-template-columns:repeat(2,minmax(130px,1fr))}.${SCRIPT.prefix}-stats{grid-template-columns:repeat(3,1fr)}}
            @media(max-width:520px){.${SCRIPT.prefix}-grid,.${SCRIPT.prefix}-grid-main{grid-template-columns:1fr}.${SCRIPT.prefix}-stats{grid-template-columns:1fr 1fr}.${SCRIPT.prefix}-subtitle{display:none}}
        `;
        document.head.appendChild(style);
    }

    function buildCollectorOptions() {
        const current = String(state.settings.premiumCollectorId || '');
        const villages = state.villages.length
            ? state.villages
            : [];

        let html = `<option value="">Automatique — + de marchands libres</option>`;
        for (const v of [...villages].sort((a, b) => b.availableMerchants - a.availableMerchants)) {
            const selected = current === String(v.id) ? ' selected' : '';
            html += `<option value="${escapeHtml(v.id)}"${selected}>${escapeHtml(v.name)} — ${v.availableMerchants} marchands</option>`;
        }
        return html;
    }

    function buildSettingsHtml() {
        const s = state.settings;
        const modeHelp = {
            mix: 'Combine l’équilibre externe et interne : égalité entre prioritaires d’abord, puis préférence aux transferts qui réduisent aussi l’écart bois / argile / fer.',
            external: 'Égalise chaque ressource entre les villages prioritaires. Les terminés complètent la réserve sans descendre sous le Min ; le Max reste un plafond.',
            internal: 'Égalise bois / argile / fer dans chaque village par échanges d’excédents locaux. Les pourcentages Min / Max ne participent pas à ce calcul.',
            fill: 'Remplit les prioritaires du plus petit entrepôt au plus gros (puis par points), uniquement depuis les terminés. Le suivant n’est servi qu’après le précédent.'
        }[s.balanceMode] || '';

        return `
            <div class="${SCRIPT.prefix}-grid ${SCRIPT.prefix}-grid-main">
                <div class="${SCRIPT.prefix}-field">
                    <label>Mode</label>
                    <select id="${SCRIPT.prefix}BalanceMode" class="${SCRIPT.prefix}-select">
                        <option value="mix"${s.balanceMode === 'mix' ? ' selected' : ''}>Mix — interne + externe</option>
                        <option value="external"${s.balanceMode === 'external' ? ' selected' : ''}>Équilibre externe</option>
                        <option value="internal"${s.balanceMode === 'internal' ? ' selected' : ''}>Équilibre interne</option>
                        <option value="fill"${s.balanceMode === 'fill' ? ' selected' : ''}>Remplissage</option>
                    </select>
                </div>
                <div class="${SCRIPT.prefix}-field">
                    <label>Prioriser sous (points)</label>
                    <input id="${SCRIPT.prefix}LowPoints" class="${SCRIPT.prefix}-input" type="number" min="0" value="${s.lowPoints}">
                </div>
                <div class="${SCRIPT.prefix}-field">
                    <label>Village terminé dès (points)</label>
                    <input id="${SCRIPT.prefix}HighPoints" class="${SCRIPT.prefix}-input" type="number" min="0" value="${s.highPoints}">
                </div>
                <div class="${SCRIPT.prefix}-field">
                    <label>Min — terminé (% entrepôt)</label>
                    <input id="${SCRIPT.prefix}BuiltOutPct" class="${SCRIPT.prefix}-input" type="number" min="1" max="100" value="${Math.round(s.builtOutPercentage * 100)}">
                </div>
                <div class="${SCRIPT.prefix}-field">
                    <label>Max — prioritaire (% entrepôt)</label>
                    <input id="${SCRIPT.prefix}NeedsMorePct" class="${SCRIPT.prefix}-input" type="number" min="1" max="100" value="${Math.round(s.needsMorePercentage * 100)}">
                </div>
            </div>
            <div class="${SCRIPT.prefix}-mode-help">${escapeHtml(modeHelp)}</div>
            <div class="${SCRIPT.prefix}-mode-help"><b>Min / Max :</b> utilisés par Remplissage, Externe et Mix. Le mode Interne travaille uniquement avec les quantités réelles et les excédents locaux.</div>

            <details class="${SCRIPT.prefix}-advanced">
                <summary>Options avancées</summary>
                <div class="${SCRIPT.prefix}-advanced-body">
                    <div class="${SCRIPT.prefix}-grid">
                        <label class="${SCRIPT.prefix}-check">
                            <input id="${SCRIPT.prefix}Incoming" type="checkbox"${s.includeIncoming ? ' checked' : ''}>
                            Compter les ressources entrantes
                        </label>
                        <div class="${SCRIPT.prefix}-field">
                            <label>Transport minimum</label>
                            <input id="${SCRIPT.prefix}MinTransfer" class="${SCRIPT.prefix}-input" type="number" min="1000" step="1000" value="${s.minTransfer}">
                        </div>
                        <div class="${SCRIPT.prefix}-field">
                            <label>Distance max. (0 = illimitée)</label>
                            <input id="${SCRIPT.prefix}MaxDistance" class="${SCRIPT.prefix}-input" type="number" min="0" step="1" value="${s.maxDistance}">
                        </div>
                        <label class="${SCRIPT.prefix}-check">
                            <input id="${SCRIPT.prefix}Premium" type="checkbox"${s.premiumConsolidation ? ' checked' : ''}>
                            Rapatrier le surplus pour l’échange Premium
                        </label>
                        <div class="${SCRIPT.prefix}-field">
                            <label>Collecteur Premium</label>
                            <select id="${SCRIPT.prefix}Collector" class="${SCRIPT.prefix}-select">${buildCollectorOptions()}</select>
                        </div>
                        <div class="${SCRIPT.prefix}-field">
                            <label>Remplissage max. collecteur (%)</label>
                            <input id="${SCRIPT.prefix}PremiumFill" class="${SCRIPT.prefix}-input" type="number" min="10" max="100" value="${Math.round(s.premiumFillPercentage * 100)}">
                        </div>
                    </div>
                </div>
            </details>

            <div style="display:flex;gap:5px;margin-top:7px">
                <button id="${SCRIPT.prefix}Apply" class="${SCRIPT.prefix}-btn primary">Appliquer & recalculer</button>
                <button id="${SCRIPT.prefix}Reset" class="${SCRIPT.prefix}-btn danger">Réinitialiser</button>
            </div>
        `;
    }

    function buildSummaryHtml() {
        const s = state.summary;
        if (!s) return '';

        const collector = state.collectorId ? state.villageById.get(state.collectorId) : null;
        const premiumTotal = state.premiumLinks.reduce((sum, l) =>
            sum + (l.wood || 0) + (l.stone || 0) + (l.iron || 0), 0);

        const includeIncoming = !!state.settings.includeIncoming;
        const projectedTotals = {
            wood: s.totals.wood + (includeIncoming ? s.incomingTotals.wood : 0),
            stone: s.totals.stone + (includeIncoming ? s.incomingTotals.stone : 0),
            iron: s.totals.iron + (includeIncoming ? s.incomingTotals.iron : 0)
        };
        const totalLabel = includeIncoming
            ? 'Total projeté (entrants inclus)'
            : 'Total projeté (entrants exclus)';

        return `
            <div class="${SCRIPT.prefix}-stats">
                <div class="${SCRIPT.prefix}-stat"><strong>${s.villages}</strong><span>villages</span></div>
                <div class="${SCRIPT.prefix}-stat"><strong>${s.priorityCount}</strong><span>prioritaires</span></div>
                <div class="${SCRIPT.prefix}-stat"><strong>${s.finishedCount}</strong><span>terminés</span></div>
                <div class="${SCRIPT.prefix}-stat"><strong>${s.availableMerchants}/${s.merchants}</strong><span>marchands libres</span></div>
                <div class="${SCRIPT.prefix}-stat"><strong>${state.links.length}</strong><span>transports proposés</span></div>
            </div>
            <div class="${SCRIPT.prefix}-notice">
                ${totalLabel} :
                <span class="icon header wood"></span>${fmt(projectedTotals.wood)} ·
                <span class="icon header stone"></span>${fmt(projectedTotals.stone)} ·
                <span class="icon header iron"></span>${fmt(projectedTotals.iron)}
                ${collector ? `<br>Collecteur Premium : <span class="${SCRIPT.prefix}-collector-info">${escapeHtml(collector.name)}</span>
                — ${fmt(premiumTotal)} ressources à rapatrier.` : ''}
            </div>
        `;
    }

    function buildTransfersHtml() {
        if (!state.links.length) {
            return `<div class="${SCRIPT.prefix}-empty">Aucun transport nécessaire avec les paramètres actuels.</div>`;
        }

        const rows = state.links.map((link, index) => {
            const source = state.villageById.get(String(link.source));
            const target = state.villageById.get(String(link.target));
            if (!source || !target) return '';

            const total = (link.wood || 0) + (link.stone || 0) + (link.iron || 0);
            const merchants = Math.ceil(total / 1000);
            const kindLabel = link.kind === 'premium' ? 'Premium' : 'Équilibre';

            return `
                <tr id="${SCRIPT.prefix}Row${index}" data-index="${index}">
                    <td><span class="${SCRIPT.prefix}-kind ${link.kind}">${kindLabel}</span></td>
                    <td class="${SCRIPT.prefix}-village"><a href="${escapeHtml(source.url)}">${escapeHtml(source.name)}</a></td>
                    <td class="${SCRIPT.prefix}-village"><a href="${escapeHtml(target.url)}">${escapeHtml(target.name)}</a></td>
                    <td>${link.distance.toFixed(1)}</td>
                    <td class="${SCRIPT.prefix}-res">${link.wood ? '<span class="icon header wood"></span>' + fmt(link.wood) : '—'}</td>
                    <td class="${SCRIPT.prefix}-res">${link.stone ? '<span class="icon header stone"></span>' + fmt(link.stone) : '—'}</td>
                    <td class="${SCRIPT.prefix}-res">${link.iron ? '<span class="icon header iron"></span>' + fmt(link.iron) : '—'}</td>
                    <td>${merchants}</td>
                    <td><button class="${SCRIPT.prefix}-btn ${SCRIPT.prefix}-send" data-index="${index}">Envoyer</button></td>
                </tr>
            `;
        }).join('');

        return `
            <div class="${SCRIPT.prefix}-transfers-actions">
                <button id="${SCRIPT.prefix}SendAll" class="${SCRIPT.prefix}-btn primary">Tout envoyer</button>
            </div>
            <div class="${SCRIPT.prefix}-table-wrap">
                <table class="${SCRIPT.prefix}-table">
                    <thead>
                        <tr>
                            <th>Type</th><th>Origine</th><th>Destination</th><th>Dist.</th>
                            <th><span class="icon header wood"></span>Bois</th><th><span class="icon header stone"></span>Argile</th><th><span class="icon header iron"></span>Fer</th><th>March.</th><th></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="${SCRIPT.prefix}-notice">
                Clique sur <b>Envoyer</b>. Après chaque transport réussi, le bouton suivant reçoit le focus :
                tu peux donc maintenir/appuyer sur <b>Entrée</b> comme sur le script de Sophie, sans ouvrir d'onglets.
            </div>
        `;
    }

    function buildVillageResultHtml() {
        if (!state.villages.length || !state.targets.size) return '';

        const rows = state.villages.map(v => {
            const current = projectedResources(v);
            const target = state.targets.get(v.id) || { wood: 0, stone: 0, iron: 0 };
            const final = getFinalEstimate(v.id) || { wood: 0, stone: 0, iron: 0, merchantsLeft: 0 };
            const type = classifyVillage(v);
            const typeLabel = type === 'priority' ? 'Prioritaire' : (type === 'finished' ? 'Terminé' : 'Normal');

            const overflow = final.wood > v.warehouseCapacity ||
                             final.stone > v.warehouseCapacity ||
                             final.iron > v.warehouseCapacity;

            return `
                <tr>
                    <td class="${SCRIPT.prefix}-village">${escapeHtml(v.name)}</td>
                    <td>${typeLabel}</td>
                    <td>${fmt(v.points)}</td>
                    <td class="${SCRIPT.prefix}-res" title="Ressources actuelles prises en compte${state.settings.includeIncoming ? ' (entrants inclus)' : ''}"><span class="icon header wood"></span>${fmt(current.wood)} / <span class="icon header stone"></span>${fmt(current.stone)} / <span class="icon header iron"></span>${fmt(current.iron)}</td>
                    <td class="${SCRIPT.prefix}-res"><span class="icon header wood"></span>${fmt(target.wood)} / <span class="icon header stone"></span>${fmt(target.stone)} / <span class="icon header iron"></span>${fmt(target.iron)}</td>
                    <td class="${SCRIPT.prefix}-res"><span class="icon header wood"></span>${fmt(final.wood)} / <span class="icon header stone"></span>${fmt(final.stone)} / <span class="icon header iron"></span>${fmt(final.iron)}</td>
                    <td>${Math.max(0, Math.floor(final.merchantsLeft))}/${v.totalMerchants}</td>
                    <td>${fmt(v.warehouseCapacity)}${overflow ? ' ⚠️' : ''}</td>
                </tr>
            `;
        }).join('');

        return `
            <details class="${SCRIPT.prefix}-settings">
                <summary>Résultat estimé par village</summary>
                <div class="${SCRIPT.prefix}-settings-body">
                    <div class="${SCRIPT.prefix}-table-wrap">
                        <table class="${SCRIPT.prefix}-table">
                            <thead>
                                <tr><th>Village</th><th>Statut</th><th>Points</th><th title="Ressources prises en compte avant le plan${state.settings.includeIncoming ? ' (entrants inclus)' : ''}">Actuel <span class="icon header wood"></span>/<span class="icon header stone"></span>/<span class="icon header iron"></span></th><th title="Objectif calculé par le mode choisi. En Interne, il représente le niveau B/A/F équilibrable du village ; dans les autres modes, Min/Max encadrent les sources et destinations.">Cible <span class="icon header wood"></span>/<span class="icon header stone"></span>/<span class="icon header iron"></span></th><th>Après plan <span class="icon header wood"></span>/<span class="icon header stone"></span>/<span class="icon header iron"></span></th><th>Marchands</th><th>Entrepôt</th></tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </details>
        `;
    }

    function getIntegrationHost() {
        return document.querySelector('#content_value') ||
               document.querySelector('.content-border') ||
               document.querySelector('#contentContainer') ||
               document.querySelector('#mobileHeader') ||
               document.body;
    }

    function renderPanel() {
        injectStyles();

        let wrap = document.getElementById(`${SCRIPT.prefix}Wrap`);
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = `${SCRIPT.prefix}Wrap`;
            const host = getIntegrationHost();
            host.insertBefore(wrap, host.firstChild || null);
        }

        wrap.innerHTML = `
            <div id="${SCRIPT.prefix}Panel">
                <div class="${SCRIPT.prefix}-hero">
                    <div class="${SCRIPT.prefix}-brand">🐼</div>
                    <div class="${SCRIPT.prefix}-hero-main">
                        <div class="${SCRIPT.prefix}-title">Balance Entrepôt</div>
                        <div class="${SCRIPT.prefix}-subtitle">${modeLabel()} · groupe de villages courant</div>
                    </div>
                    <div class="${SCRIPT.prefix}-version">v${SCRIPT.version}</div>
                    <div class="${SCRIPT.prefix}-hero-actions">
                        <button id="${SCRIPT.prefix}Refresh" class="${SCRIPT.prefix}-btn">↻ Recalculer</button>
                    </div>
                </div>

                <div class="${SCRIPT.prefix}-body">
                    <div id="${SCRIPT.prefix}Loading" class="${SCRIPT.prefix}-loading${state.loading ? ' show' : ''}">
                        <span class="${SCRIPT.prefix}-spinner"></span>
                        <span id="${SCRIPT.prefix}LoadingText">Analyse en cours…</span>
                    </div>

                    ${state.errors.length ? `<div class="${SCRIPT.prefix}-notice error">${state.errors.map(escapeHtml).join('<br>')}</div>` : ''}

                    <div class="${SCRIPT.prefix}-card">
                        ${buildSettingsHtml()}
                    </div>

                    ${state.summary ? `
                        <div class="${SCRIPT.prefix}-card">
                            <div class="${SCRIPT.prefix}-card-title"><span>Synthèse</span><span>${modeLabel()}</span></div>
                            ${buildSummaryHtml()}
                        </div>
                        <div class="${SCRIPT.prefix}-card">
                            <div class="${SCRIPT.prefix}-card-title"><span>Transports proposés</span><span>${state.links.length} ligne(s)</span></div>
                            ${buildTransfersHtml()}
                        </div>
                        <div class="${SCRIPT.prefix}-card">
                            ${buildVillageResultHtml()}
                        </div>
                    ` : ''}
                </div>

                <div class="${SCRIPT.prefix}-footer">
                    <span>Base : Sophie “Shinko to Kuma”</span>
                    <span class="${SCRIPT.prefix}-footer-center">WEBI-TIME / vWB</span>
                    <span class="${SCRIPT.prefix}-footer-right">NoLife4Ever</span>
                </div>
            </div>
        `;

        state.open = true;
        bindUi();
        setTimeout(focusFirstSendButton, 50);
    }

    function bindUi() {
        $(`#${SCRIPT.prefix}Refresh`).off('.wtwb').on('click.wtwb', async () => {
            saveSettings();
            await analyze();
        });
        $(`#${SCRIPT.prefix}Apply`).off('.wtwb').on('click.wtwb', async () => {
            saveSettings();
            await analyze();
        });
        $(`#${SCRIPT.prefix}Reset`).off('.wtwb').on('click.wtwb', async () => {
            state.settings = normalizeSettings({});
            try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
            await analyze();
        });

        $(`.${SCRIPT.prefix}-send`).off('.wtwb').on('click.wtwb', async function () {
            const index = Number(this.dataset.index);
            await sendLink(index, this);
        });

        $(`#${SCRIPT.prefix}SendAll`).off('.wtwb').on('click.wtwb', async function () {
            await sendAllLinks(this);
        });

        // Le changement du mode Premium active visuellement le select.
        const refreshPremiumState = () => {
            const enabled = $(`#${SCRIPT.prefix}Premium`).prop('checked');
            $(`#${SCRIPT.prefix}Collector,#${SCRIPT.prefix}PremiumFill`).prop('disabled', !enabled);
        };
        $(`#${SCRIPT.prefix}Premium`).off('.wtwb').on('change.wtwb', refreshPremiumState);
        refreshPremiumState();
    }

    async function sendLink(index, button) {
        const link = state.links[index];
        if (!link || !button || button.disabled) return false;

        const total = (link.wood || 0) + (link.stone || 0) + (link.iron || 0);
        if (total < state.settings.minTransfer) {
            notify('Error', 'Transport inférieur au minimum configuré.');
            return false;
        }

        button.disabled = true;
        button.textContent = 'Envoi…';

        const payload = {
            target_id: String(link.target),
            wood: Number(link.wood) || 0,
            stone: Number(link.stone) || 0,
            iron: Number(link.iron) || 0
        };

        try {
            await new Promise((resolve, reject) => {
                if (!window.TribalWars || typeof TribalWars.post !== 'function') {
                    reject(new Error('TribalWars.post indisponible.'));
                    return;
                }

                TribalWars.post(
                    'market',
                    { ajaxaction: 'map_send', village: String(link.source) },
                    payload,
                    response => resolve(response),
                    error => reject(error || new Error('Envoi refusé.'))
                );
            });

            const row = document.getElementById(`${SCRIPT.prefix}Row${index}`);
            if (row) row.remove();

            notify('Success', `Ressources envoyées vers ${state.villageById.get(String(link.target))?.name || link.target}.`, 1800);
            setTimeout(focusFirstSendButton, 80);
            return true;
        } catch (error) {
            console.error(`[${SCRIPT.name}] Envoi`, error);
            button.disabled = false;
            button.textContent = 'Réessayer';
            notify('Error', `Échec de l'envoi : ${error.message || error}`);
            return false;
        }
    }

    async function sendAllLinks(masterButton) {
        if (!masterButton || masterButton.disabled) return;

        const indexes = [...document.querySelectorAll(`#${SCRIPT.prefix}Panel .${SCRIPT.prefix}-send:not(:disabled)`)]
            .map(btn => Number(btn.dataset.index))
            .filter(Number.isFinite);

        if (!indexes.length) {
            notify('Error', 'Aucun transport restant à envoyer.');
            return;
        }

        masterButton.disabled = true;
        const originalText = masterButton.textContent;

        let sent = 0;
        for (let pos = 0; pos < indexes.length; pos++) {
            const index = indexes[pos];
            const button = document.querySelector(`#${SCRIPT.prefix}Row${index} .${SCRIPT.prefix}-send`);
            if (!button) continue;

            masterButton.textContent = `Envoi ${pos + 1}/${indexes.length}…`;
            const ok = await sendLink(index, button);
            if (!ok) {
                masterButton.textContent = `Reprendre (${sent}/${indexes.length})`;
                masterButton.disabled = false;
                return;
            }
            sent++;
            await new Promise(resolve => setTimeout(resolve, 180));
        }

        masterButton.textContent = 'Tout envoyé ✓';
        notify('Success', `${sent} transport(s) envoyé(s).`, 2500);
    }

    function focusFirstSendButton() {
        const btn = document.querySelector(`#${SCRIPT.prefix}Panel .${SCRIPT.prefix}-send:not(:disabled)`);
        if (btn) btn.focus();
    }

    function setLoading(enabled, text) {
        state.loading = !!enabled;
        const el = document.getElementById(`${SCRIPT.prefix}Loading`);
        if (el) el.classList.toggle('show', !!enabled);
        const label = document.getElementById(`${SCRIPT.prefix}LoadingText`);
        if (label && text) label.textContent = text;
    }

    function closePanel() {
        const wrap = document.getElementById(`${SCRIPT.prefix}Wrap`);
        if (wrap) wrap.style.display = 'none';
        state.open = false;
    }

    function openPanel() {
        let wrap = document.getElementById(`${SCRIPT.prefix}Wrap`);
        if (!wrap) {
            renderPanel();
            wrap = document.getElementById(`${SCRIPT.prefix}Wrap`);
        }
        if (wrap) {
            wrap.style.display = 'block';
            wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        state.open = true;
    }

    window.WebiTimeWarehouseBalancer = Object.freeze({
        open: openPanel,
        close: closePanel,
        analyze,
        getState: () => state
    });

    renderPanel();
    await analyze();

    console.log(`[${SCRIPT.name}] v${SCRIPT.version} chargé`);
})();
