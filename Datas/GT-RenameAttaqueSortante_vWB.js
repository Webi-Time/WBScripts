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
const WEBITIME_RENAME_VERSION = '1.14'; // CSS/UI partagés via WebiTime_GT_Common.js
const WEBITIME_RENAME_STYLE_ID = 'webiTimeRenameAttackStyle';
const WEBITIME_SOURCE_URL = 'https://github.com/Webi-Time/WBScripts/tree/GT/Datas';
const WEBITIME_COMMON_URL = 'https://webi-time.github.io/WBScripts/Datas/WebiTime_GT_Common.js';
const WEBITIME_COMMON_FALLBACK_URL = 'https://cdn.jsdelivr.net/gh/Webi-Time/WBScripts@GT/Datas/WebiTime_GT_Common.js';
const WEBITIME_RENAME_SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';

let WEBITIME_UI = null;
let WEBITIME_RENAME_GITHUB_ISSUES_URL = '';
let webiTimeCommonLoading = null;

// Charge automatiquement le composant commun si le raccourci ne l'a pas déjà fait.
// Essaie d'abord le même dossier que ce script, puis GitHub Pages, puis jsDelivr sur la branche GT.
function ensureWebiTimeCommon() {
    if (window.WebiTimeGT) {
        WEBITIME_UI = window.WebiTimeGT;
        WEBITIME_UI.injectStyles();
        WEBITIME_RENAME_GITHUB_ISSUES_URL = WEBITIME_UI.buildIssueUrl('GT-RenameAttaqueSortante', WEBITIME_SOURCE_URL);
        return Promise.resolve(WEBITIME_UI);
    }

    if (webiTimeCommonLoading) return webiTimeCommonLoading;

    webiTimeCommonLoading = (async function () {
        const candidates = [];

        // 1) Même dossier que le script courant : évite les problèmes de branche / chemin Pages.
        try {
            if (WEBITIME_RENAME_SCRIPT_SRC) {
                const relativeUrl = new URL('WebiTime_GT_Common.js', WEBITIME_RENAME_SCRIPT_SRC);
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
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Chargement impossible : ' + url));
                    (document.head || document.documentElement).appendChild(script);
                });

                if (window.WebiTimeGT) {
                    WEBITIME_UI = window.WebiTimeGT;
                    WEBITIME_UI.injectStyles();
                    WEBITIME_RENAME_GITHUB_ISSUES_URL = WEBITIME_UI.buildIssueUrl('GT-RenameAttaqueSortante', WEBITIME_SOURCE_URL);
                    return WEBITIME_UI;
                }
            } catch (error) {
                console.warn('[Webi-Time Rename Attaques] Echec du chargement commun :', url, error);
            }
        }

        throw new Error('Impossible de charger WebiTime_GT_Common.js');
    })();

    return webiTimeCommonLoading;
}

function injectWebiTimeRenameStyles() {
    if (!WEBITIME_UI) return;
    WEBITIME_UI.injectStyles();
    WEBITIME_UI.injectRenameStyles(WEBITIME_RENAME_STYLE_ID);
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
            '<input id="nameNuke' + index + '" value="' + escapeWebiAttr(name) + '" class="nameInput wt-input" type="text" placeholder="' + escapeWebiAttr(translator('attackName')) + '" />' +
            '<input id="minNb' + index + '" value="' + escapeWebiAttr(min) + '" class="valueInput wt-input" type="text" placeholder="' + escapeWebiAttr(translator('minNumber')) + '"' + disabledAttr + ' />' +
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

ensureWebiTimeCommon()
    .then(run)
    .catch(function (error) {
        console.error('[Webi-Time Rename Attaques] Impossible de charger WebiTime_GT_Common.js.', error);
        if (typeof UI !== 'undefined' && UI.ErrorMessage) {
            UI.ErrorMessage('Impossible de charger le composant Webi-Time commun.');
        }
    });


/**
 * Function to add buttons in the top of attacks order to choose "Rename" or "custom"
 */
function drawStep1()
{
    injectWebiTimeRenameStyles();
    $('#openDiv').remove();

    const html = `
        <div id="openDiv" class="wt-panel">
            <div class="wt-hero">
                <div class="wt-brand">
                    <div class="wt-logo" aria-hidden="true">🐼</div>
                    <div>
                        <div class="wt-title">
                            <span class="wt-title-brand">Webi-Time</span><span class="wt-title-tool"> Rename Attaques</span>
                        </div>
                        <div class="wt-byline">par <b>${WEBITIME_RENAME_AUTHOR}</b> &nbsp;•&nbsp; gestion des attaques sortantes</div>
                        <div class="wt-tagline">Des ordres propres. Des timings lisibles. Une vue plus efficace.</div>
                    </div>
                </div>
                <div class="wt-hero-motto">
                    IDENTIFIER<br>
                    CLASSER<br>
                    RENOMMER<br>
                    GARDER LE CONTRÔLE
                </div>
            </div>

            <div class="wt-body">
                <div class="wt-card wtra-intro">
                    <b>${translator('renameOrder')}</b><br>
                    <span>${translator('explanation')}</span>
                </div>
                <div class="wtra-actions">
                    <button class="btn wt-btn wt-btn-primary" id="process">⚡ ${translator('rename')}</button>
                    <button name="setup" id="showParameters" class="btn wt-btn wt-btn-secondary">⚙ ${translator('attackPerso')}</button>
                </div>
                <div class="wt-footer">
                    <span class="wt-footer-left">
                        ${WEBITIME_UI.buildSettingsMarkup('wtra_clear_saved_data', 'wtra_report_bug')}
                        <span>Version ${WEBITIME_RENAME_VERSION}</span>
                    </span>
                    <span class="wt-footer-center">Intelligence &nbsp;■&nbsp; Organisation &nbsp;■&nbsp; Supériorité</span>
                    <span class="wt-footer-right">🐼 <b>Webi-Time</b> &nbsp;|&nbsp; réalisé par ${WEBITIME_RENAME_AUTHOR}</span>
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
            '<button id="addAttackType" type="button" onclick="addTypeAttack()" class="btn wt-btn wtra-add">+ Ajouter un type</button>' +
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
        '<div class="wt-section-title">Configuration du renommage</div>' +
        '<div class="wt-option-grid">' +
            '<label class="wt-option">' +
                '<input onclick="handleRenamePlayer()" type="checkbox" id="renamePlayer">' +
                '<span>Inclure le nom du joueur cible</span>' +
            '</label>' +
            '<label class="wt-option">' +
                '<input onclick="handleRenameVillage()" type="checkbox" id="renameVillage">' +
                '<span>Inclure le nom du village cible</span>' +
            '</label>' +
            '<label class="wt-option">' +
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
                    '<div class="wt-hero">' +
                        '<div class="wt-brand">' +
                            '<div class="wt-logo" aria-hidden="true">🐼</div>' +
                            '<div>' +
                                '<div class="wt-title"><span class="wt-title-brand">Webi-Time</span><span class="wt-title-tool"> Rename Attaques</span></div>' +
                                '<div class="wt-byline">par <b>' + WEBITIME_RENAME_AUTHOR + '</b> &nbsp;•&nbsp; paramètres de renommage</div>' +
                                '<div class="wt-tagline">Personnalise le nom des attaques sans perdre la lisibilité.</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="wt-hero-motto">CONFIGURER<br>CLASSER<br>SAUVEGARDER</div>' +
                    '</div>' +
                    '<div id="popupcontainer" class="wtra-popup-body"></div>' +
                    '<div class="wtra-modal-footer">' +
                        '<div class="wtra-modal-footer-note"><b style="color:#37dcff;">Webi-Time</b> • configuration mémorisée pour les prochaines utilisations</div>' +
                        '<button id="close_popup" class="btn wt-btn wt-btn-primary wtra-save">✓ ' + escapeWebiAttr(translator('save')) + '</button>' +
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
