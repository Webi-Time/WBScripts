/*
 * Webi-Time - GT Balance Entrepot
 * Version : 1.1.3
 * Auteur  : NoLife4Ever / Webi-Time
 *
 * Base fonctionnelle inspiree du "Warehouse balancer" de Sophie "Shinko to Kuma".
 * Refonte :
 * - interface Webi-Time/vWB compacte et integree a la page ;
 * - analyse sans onglets supplementaires ;
 * - prise en compte des ressources deja entrantes ;
 * - priorite aux petits villages ;
 * - reserves reduites sur villages termines ;
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
        version: '1.1.3',
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
        premiumFillPercentage: 0.95,
        priorityWeight: 2.5,
        normalWeight: 1,
        finishedWeight: 0.35
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
        out.priorityWeight = clampFloat(out.priorityWeight, 1, 10, DEFAULT_SETTINGS.priorityWeight);
        out.normalWeight = clampFloat(out.normalWeight, 0.1, 10, DEFAULT_SETTINGS.normalWeight);
        out.finishedWeight = clampFloat(out.finishedWeight, 0.05, 10, DEFAULT_SETTINGS.finishedWeight);
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
                const m = href.match(/[?&](?:id|village)=(\d+)/);
                if (m) targetId = m[1];
            } catch (_) {}

            if (!targetId) {
                const candidates = [...row.querySelectorAll('a[href]')];
                for (const a of candidates.reverse()) {
                    const m = a.href.match(/[?&](?:id|village)=(\d+)/);
                    if (m) {
                        targetId = m[1];
                        break;
                    }
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
        if (village.points < s.lowPoints) return 'priority';
        if (s.highPoints > 0 && village.points >= s.highPoints) return 'finished';
        return 'normal';
    }

    function villageWeight(village) {
        const type = classifyVillage(village);
        const s = state.settings;
        if (type === 'priority') {
            const pointFactor = s.lowPoints > 0
                ? Math.max(0, Math.min(1, (s.lowPoints - village.points) / s.lowPoints))
                : 0;
            return s.priorityWeight * (1 + pointFactor * 0.5);
        }
        if (type === 'finished') return s.finishedWeight;
        return s.normalWeight;
    }

    function targetLimit(village) {
        const type = classifyVillage(village);
        const s = state.settings;

        if (type === 'priority') {
            return Math.max(0, village.warehouseCapacity * s.needsMorePercentage);
        }
        if (type === 'finished') {
            return Math.max(0, village.warehouseCapacity * s.builtOutPercentage);
        }

        // Marge fixe de securite sur les villages standards pour ne jamais
        // construire un plan qui les colle artificiellement a 100 %.
        return Math.max(0, village.warehouseCapacity * 0.95);
    }

    function weightedAllocation(total, villages) {
        const entries = villages.map(v => ({
            id: v.id,
            limit: Math.max(0, targetLimit(v)),
            weight: Math.max(0.01, villageWeight(v)),
            allocated: 0
        }));

        let remaining = Math.max(0, total);
        let active = entries.filter(e => e.limit > 0);
        let guard = 0;

        while (remaining >= 1 && active.length && guard++ < 1000) {
            const sumWeight = active.reduce((sum, e) => sum + e.weight, 0);
            if (sumWeight <= 0) break;

            let spent = 0;
            const capped = [];

            for (const e of active) {
                const room = e.limit - e.allocated;
                if (room <= 0) {
                    capped.push(e.id);
                    continue;
                }

                const ideal = remaining * (e.weight / sumWeight);
                const add = Math.min(room, ideal);
                e.allocated += add;
                spent += add;

                if (room - add < 1) capped.push(e.id);
            }

            if (spent < 1) break;
            remaining -= spent;
            active = active.filter(e => !capped.includes(e.id));
        }

        const result = new Map();
        for (const e of entries) result.set(e.id, round1000(e.allocated));
        return result;
    }

    function enforceFinishedReserve(targets, villages) {
        // La valeur "Entrepôt conservé — terminé" est une réserve minimale
        // par ressource, pas un simple poids d'allocation.
        //
        // Exemple : entrepôt 400 000 + réglage 10 % => cible minimale
        // 40 000 bois / 40 000 argile / 40 000 fer.
        //
        // Les cibles globales peuvent donc dépasser les ressources réellement
        // disponibles : le plan laissera alors un déficit non satisfait au lieu
        // d'autoriser un village terminé à descendre sous sa réserve.
        const resources = ['wood', 'stone', 'iron'];

        for (const village of villages) {
            if (classifyVillage(village) !== 'finished') continue;

            const reserve = round1000(targetLimit(village));
            const target = targets.get(village.id) || { wood: 0, stone: 0, iron: 0 };

            for (const resource of resources) {
                target[resource] = Math.max(Number(target[resource]) || 0, reserve);
            }

            targets.set(village.id, target);
        }

        return targets;
    }

    function computeTargets(villages, totals) {
        const targets = new Map();
        const s = state.settings;
        const resources = ['wood', 'stone', 'iron'];

        for (const v of villages) {
            targets.set(v.id, { wood: 0, stone: 0, iron: 0 });
        }

        // MIX : repartition entre les villages + meme quantite B/A/F dans chaque village.
        if (s.balanceMode === 'mix') {
            const balancedPool = Math.min(totals.wood, totals.stone, totals.iron);
            const allocation = weightedAllocation(balancedPool, villages);

            for (const v of villages) {
                const amount = allocation.get(v.id) || 0;
                targets.set(v.id, { wood: amount, stone: amount, iron: amount });
            }
            return enforceFinishedReserve(targets, villages);
        }

        // EQUILIBRE INTERNE : chaque village conserve approximativement son volume
        // global de ressources, mais on vise 1/3 bois, 1/3 argile, 1/3 fer.
        // Les plafonds prioritaire / termine restent appliques.
        if (s.balanceMode === 'internal') {
            for (const v of villages) {
                const p = projectedResources(v);
                const localThird = (p.wood + p.stone + p.iron) / 3;
                const amount = round1000(Math.min(localThird, targetLimit(v)));
                targets.set(v.id, { wood: amount, stone: amount, iron: amount });
            }
            return enforceFinishedReserve(targets, villages);
        }

        // REMPLISSAGE : les villages prioritaires sont reserves dans l'ordre
        // croissant des points jusqu'au pourcentage demande. Le reliquat est
        // ensuite reparti entre les autres villages.
        if (s.balanceMode === 'fill') {
            const priorities = villages
                .filter(v => classifyVillage(v) === 'priority')
                .sort((a, b) => a.points - b.points);
            const others = villages.filter(v => classifyVillage(v) !== 'priority');

            for (const resource of resources) {
                let remaining = Math.max(0, totals[resource]);

                for (const v of priorities) {
                    const desired = round1000(Math.min(targetLimit(v), remaining));
                    targets.get(v.id)[resource] = desired;
                    remaining -= desired;
                }

                if (remaining > 0 && others.length) {
                    const allocation = weightedAllocation(remaining, others);
                    for (const v of others) {
                        targets.get(v.id)[resource] = allocation.get(v.id) || 0;
                    }
                }
            }
            return enforceFinishedReserve(targets, villages);
        }

        // EQUILIBRE EXTERNE : chaque ressource est repartie independamment.
        for (const resource of resources) {
            const allocation = weightedAllocation(totals[resource], villages);
            for (const v of villages) {
                targets.get(v.id)[resource] = allocation.get(v.id) || 0;
            }
        }

        return enforceFinishedReserve(targets, villages);
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

    function buildBasePlan(villages, targets) {
        const s = state.settings;
        const resources = ['wood', 'stone', 'iron'];
        const work = new Map();

        for (const v of villages) {
            const projected = projectedResources(v);
            const target = targets.get(v.id) || { wood: 0, stone: 0, iron: 0 };

            const node = {
                id: v.id,
                village: v,
                projected: { ...projected },
                target: { ...target },
                deficit: {},
                excess: {},
                currentAvailable: {
                    wood: v.wood,
                    stone: v.stone,
                    iron: v.iron
                },
                merchantsLeft: Math.max(0, v.availableMerchants)
            };

            for (const r of resources) {
                node.deficit[r] = round1000(Math.max(0, target[r] - projected[r]));
                // Un surplus entrant n'est pas forcement disponible maintenant.
                node.excess[r] = round1000(Math.min(
                    Math.max(0, projected[r] - target[r]),
                    node.currentAvailable[r]
                ));
            }
            work.set(v.id, node);
        }

        const links = new Map();

        // Les cibles les plus petites / prioritaires sont traitees en premier.
        const targetsOrder = [...villages].sort((a, b) => {
            const classRank = { priority: 0, normal: 1, finished: 2 };
            const ca = classRank[classifyVillage(a)];
            const cb = classRank[classifyVillage(b)];
            if (ca !== cb) return ca - cb;
            return a.points - b.points;
        });

        for (const targetVillage of targetsOrder) {
            const targetNode = work.get(targetVillage.id);

            for (const resource of resources) {
                while (targetNode.deficit[resource] >= s.minTransfer) {
                    const candidates = [...work.values()]
                        .filter(source =>
                            source.id !== targetNode.id &&
                            source.excess[resource] >= s.minTransfer &&
                            source.merchantsLeft >= 1
                        )
                        .map(source => ({
                            source,
                            dist: distance(source.village, targetVillage)
                        }))
                        .filter(x => s.maxDistance <= 0 || x.dist <= s.maxDistance)
                        .sort((a, b) => {
                            if (a.dist !== b.dist) return a.dist - b.dist;
                            return b.source.merchantsLeft - a.source.merchantsLeft;
                        });

                    if (!candidates.length) break;

                    let progressed = false;

                    for (const candidate of candidates) {
                        if (targetNode.deficit[resource] < s.minTransfer) break;

                        const source = candidate.source;
                        const merchantCapacity = source.merchantsLeft * 1000;
                        let amount = Math.min(
                            targetNode.deficit[resource],
                            source.excess[resource],
                            merchantCapacity
                        );
                        amount = round1000(amount);

                        if (amount < s.minTransfer) continue;

                        mergeLink(links, {
                            kind: 'balance',
                            source: source.id,
                            target: targetNode.id,
                            [resource]: amount,
                            distance: candidate.dist
                        });

                        source.excess[resource] -= amount;
                        source.currentAvailable[resource] -= amount;
                        source.merchantsLeft -= amount / 1000;
                        source.projected[resource] -= amount;

                        targetNode.deficit[resource] -= amount;
                        targetNode.projected[resource] += amount;
                        progressed = true;
                    }

                    if (!progressed) break;
                }
            }
        }

        return { work, links: [...links.values()] };
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

            state.targets = computeTargets(state.villages, projectedTotals);
            const baseResult = buildBasePlan(state.villages, state.targets);
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
            mix: 'Équilibre les villages entre eux tout en visant une quantité proche de bois, argile et fer dans chaque village.',
            external: 'Répartit chaque ressource entre les villages selon les seuils de points et les pourcentages d’entrepôt.',
            internal: 'Cherche surtout à rapprocher bois, argile et fer au sein de chaque village, sans chercher à uniformiser leur volume global.',
            fill: 'Remplit les villages prioritaires du plus petit au plus grand jusqu’au pourcentage défini, puis répartit le reliquat.'
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
                    <label>Entrepôt conservé — terminé (%)</label>
                    <input id="${SCRIPT.prefix}BuiltOutPct" class="${SCRIPT.prefix}-input" type="number" min="1" max="100" value="${Math.round(s.builtOutPercentage * 100)}">
                </div>
                <div class="${SCRIPT.prefix}-field">
                    <label>Entrepôt cible — prioritaire (%)</label>
                    <input id="${SCRIPT.prefix}NeedsMorePct" class="${SCRIPT.prefix}-input" type="number" min="1" max="100" value="${Math.round(s.needsMorePercentage * 100)}">
                </div>
            </div>
            <div class="${SCRIPT.prefix}-mode-help">${escapeHtml(modeHelp)}</div>
            <div class="${SCRIPT.prefix}-mode-help"><b>Village terminé :</b> le pourcentage configuré est une réserve minimale par ressource. Un village déjà sous ce seuil ne donnera pas davantage de cette ressource.</div>

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

        return `
            <div class="${SCRIPT.prefix}-stats">
                <div class="${SCRIPT.prefix}-stat"><strong>${s.villages}</strong><span>villages</span></div>
                <div class="${SCRIPT.prefix}-stat"><strong>${s.priorityCount}</strong><span>prioritaires</span></div>
                <div class="${SCRIPT.prefix}-stat"><strong>${s.finishedCount}</strong><span>terminés</span></div>
                <div class="${SCRIPT.prefix}-stat"><strong>${s.availableMerchants}/${s.merchants}</strong><span>marchands libres</span></div>
                <div class="${SCRIPT.prefix}-stat"><strong>${state.links.length}</strong><span>transports proposés</span></div>
            </div>
            <div class="${SCRIPT.prefix}-notice">
                Total projeté (entrants inclus) :
                <span class="icon header wood"></span>${fmt(s.totals.wood + s.incomingTotals.wood)} ·
                <span class="icon header stone"></span>${fmt(s.totals.stone + s.incomingTotals.stone)} ·
                <span class="icon header iron"></span>${fmt(s.totals.iron + s.incomingTotals.iron)}
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
                                <tr><th>Village</th><th>Statut</th><th>Points</th><th>Cible <span class="icon header wood"></span>/<span class="icon header stone"></span>/<span class="icon header iron"></span></th><th>Après plan <span class="icon header wood"></span>/<span class="icon header stone"></span>/<span class="icon header iron"></span></th><th>Marchands</th><th>Entrepôt</th></tr>
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
