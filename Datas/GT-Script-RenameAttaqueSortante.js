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
const UNIT_NAMES = {
    0: "Lancier",
    1: "Épéiste",
    2: "Hache",
    3: "Scoot",
    4: "Léger",
    5: "Lourd",
    6: "Bélier",
    7: "Catapulte",
    8: "Noble"
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
function suggestRedirect(options) {
    let { message, screen, screenName, uriParams, skippableId } = options;
    message = message || "{{Un génie a oublié d'écrire un message ici}}";
    screenName = screenName || "{{Nom de l'écran ici}}";
    uriParams = uriParams || {};
    if (!screen) {
        throw Error('Un écran doit être spécifié !');
    }

    if (skippableId && userConfig.get(skipKey(skippableId), false)) {
        window.UI.InfoMessage(`Redirection vers <strong>${screenName}</strong>...`);
        setTimeout(() => window.TribalWars.redirect(screen, uriParams), 200);        
        return;
    }    

    let buttonConfirm = {
        text: 'Emmène-moi là-bas !',
        callback: () => {
            if (skippableId) {
                let skipNextTime = $('#twcheese-suggest-redirect-skip').prop('checked');
                userConfig.set(skipKey(skippableId), skipNextTime);
            }
            window.TribalWars.redirect(screen, uriParams);
        },
        confirm: true
    };
    let buttonCancel = {
        text: 'Laisse tomber...',
        callback: () => {}
    };
    window.UI.ConfirmationBox(buildContent(message, options), [buttonConfirm, buttonCancel], 'twcheese_suggest_redirect', true, true);
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
            <p style="font-size:14px;">Pour l'utiliser, tu dois être sur l'interface des ordres.</p>
            <p style="font-size:12px;">Choisis l'onglet des troupes de retour, car seules ces unités peuvent ramener des ressources. :)</p>`,
        screen: 'overview_villages',
        screenName: 'Commands Overview',
        uriParams: {
            mode: 'commands'
        },
        skippableId: 'Tool:OverviewHauls'
    });
}

function atCommandsOverview() {
    let here = document.location.href;
    return here.includes('screen=overview_villages') && here.includes('mode=commands');
}

let userConfig = new Config_Config('twcheese.userConfig');
//-------------------------------------------------- Fin - Pour le changement de page --------------------------------------------------



function run(){
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
    let html =  '<style> h1 {color : #7d6946 ;}</style>' +
        '<div id="openDiv" style="text-align: center;margin-bottom: 2rem;">' +
        `<h3 style="margin-bottom: 0.3rem;">${translator('renameOrder')}</h3>` +
        `<p style="font-style: italic;">${translator('explanation')}</p>` +
        `<button class="btn"  id="process" style="margin-right: 3rem;">${translator('rename')}</button>` +
        `<button name="setup" id="showParameters" style="" class="btn">${translator('attackPerso')}</button>` +
        '</div>'    ;

    $('#paged_view_content').prepend(html);
    handleShowParamBtn();
    handleProcessBtn();
}

function putPopupInPage(popup_html, popup_container_html)
{
    if (!popCreated){
        $('body').append(popup_html);
        popCreated = true;
    } else {
        $('body').show(popup_html);
    }
    $('#popupcontainer').append(popup_container_html);
    handleClosePopup();
}


/**
 * Function to create html of the step 1 pop-up
 */
function AddButtonType() {
    let step2_html = 
      `<button id="addAttackType" onclick="addTypeAttack()" class="btn">Ajouter un type d'attaque</button>` +
      '<div  style="width : 750px; display:flex; align-items : center ;justify-content:space-around;">'+
          `<p>${translator('attaqueName')}</p>`+
          `<p>${translator('minimalTroopsForm')}</p>`+
    '</div>'
    ;
    return step2_html;
}
function drawPopupStep1()
{
    let step1_html =
        '<div style="color:#4a2f2f;font-size:20px;font-weight:700;text-align:center;margin-bottom:10px;">Configuration du renommage</div>'+
        '<div style="margin:10px 20px;padding:16px;border-radius:16px;background:linear-gradient(180deg,#f7f2e7,#efe3c8);border:1px solid rgba(0,0,0,0.08);box-shadow:0 10px 25px rgba(0,0,0,0.08);">'+
        '   <div style="display:flex;justify-content:center;margin-bottom:14px;">'+
        '       <div style="font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#5a4630;background:rgba(255,255,255,0.55);padding:5px 14px;border-radius:999px;">Options</div>'+
        '   </div>'+
        '   <label style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:12px;background:#ffffffcc;border:1px solid rgba(0,0,0,0.06);margin-bottom:10px;cursor:pointer;">'+
        '       <input onclick="handleRenamePlayer()" type="checkbox" id="renamePlayer" style="transform:scale(1.1);">'+
        '       <span style="font-size:14px;color:#2f2a26;">Renommer avec le nom du joueur</span>'+
        '   </label>'+
        '   <label style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:12px;background:#ffffffcc;border:1px solid rgba(0,0,0,0.06);cursor:pointer;">'+
        '       <input onclick="handleRenameTroupes()" type="checkbox" id="renameTroupes" style="transform:scale(1.1);">'+
        '       <span style="font-size:14px;color:#2f2a26;">Renommer avec les troupes</span>'+
        '   </label>'+
        '</div>'+

        '<div id="div_command" style="display : flex; flex-direction : column; align-items: center; justify-content : center; ">' +
            '<div class="text-center mb-4 btn btn-dark">'+
                          '<button onclick="addTypeAttack()" class="btn btn-dark">Ajouter un type</button>'+
            '</div>'+
            `<button id="addAttackType" onclick="addTypeAttack()" class="btn">Ajouter un type d'attaque</button>` +
            '<div  style="width : 750px; display:flex; align-items : center ;justify-content:space-around;">'+
                `<p>${translator('attaqueName')}</p>`+
                `<p>${translator('minimalTroopsForm')}</p>`+
            '</div>'+
            '<div class="btn_group" >' +
                '<input id="nameNuke'+0+`" value = "Fake" class="nameInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text" placeholder="${translator('attackName')}"/>` +
                '<input id="minNb'+0+`"value = "0" class="valueInput" disabled = "disabled" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text" placeholder="${translator('minNumber')}" />`+
            '</div>'+
            '<div class="btn_group" >' +
                '<input id="nameNuke'+1+`" value = "Kinder" class="nameInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text" placeholder="${translator('attackName')}"/>` +
                '<input id="minNb'+1+`" value="1000" class  = "valueInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text" placeholder="${translator('minNumber')}" />`+
            '</div>'+
            '<div class="btn_group" >' +
                '<input id="nameNuke'+2+`" value = "OFF" class="nameInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text" placeholder="${translator('attackName')}"/>` +
                '<input id="minNb'+2+`" value = "6000" class  = "valueInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text" placeholder="${translator('minNumber')}" />`+
            '</div>'+
        '</div>'
    ;
    let popup_step1 = drawSkeletonPopup('select_troop_counter');
    if (!popCreated) {
        handleAddAttackTypeBtn();
        handleValueInput();
    }
    if (!popCreated){
        putPopupInPage(popup_step1,step1_html);
    }
    
    $('#select_troop_counter').fadeIn();
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
    let html_typeAttack =
        '<div class="btn_group" style="margin-left:25px;" id="BtnAdd' + typeAttackTable + '" >' +
                '<input id="nameNuke'+typeAttackTable+'" class="nameInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text"/>' +
                '<input id="minNb'+typeAttackTable+'" class="valueInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text"/>' +
                '<button onclick="RemoveTypeAttaqueLine(' + typeAttackTable + ')" style="margin-left: auto; width: 25px; height: 25px; border-radius: 50%; background: #ddcca5; color: #f10000; font-size: 15px; cursor: pointer;">'+
                    '×'+
                '</button>'+
        '</div>';

    $('#div_command').append(html_typeAttack);
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
function getNameOfAttackAccordingToPlayerName(urlTarget) {
    return $.ajax({
        url: urlTarget,
        method: 'POST'
    }).then(function (data) {
        let playerName = $(data)
            .find('.vis')
            .find('tr')
            .find('a')[3]?.textContent;

        if (DebugNameAttaque) console.log('SUM - playerName = ' + playerName);

        if (!playerName || playerName.includes("Village barbare")) return "Village Barbare";
        if (!playerName || playerName.includes("Village bonus")) return "Village Bonus";
        return playerName;
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
  
    const renameTroupes =($('#renameTroupes').is(':checked')) 
    const renamePlayer =($('#renamePlayer').is(':checked'))
    if ($('#renameTroupes').is(':checked')) {
        config.push({
            renameTroupes: renameTroupes
        });
    }
    if ($('#renamePlayer').is(':checked')) {
        config.push({
            renamePlayer: renamePlayer
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

    

    typeAttackTable = config.length - 1 ;

    let renameTroupesState = false;
    let renamePlayerState = false;
    config.forEach((entry, index) => {
        if(entry && Object.prototype.hasOwnProperty.call(entry, "renameTroupes")){
            $('#renameTroupes').prop("checked", entry.renameTroupes);
            renameTroupesState = entry.renameTroupes;
        }
        if(entry && Object.prototype.hasOwnProperty.call(entry, "renamePlayer")){
            $('#renamePlayer').prop("checked", entry.renamePlayer);
            renamePlayerState = entry.renamePlayer;
        }
    });

    config.forEach((entry, index) => {
        let html_typeAttack = "";    
        if(entry && Object.prototype.hasOwnProperty.call(entry, "name")) {
            if (index == 0) {
                html_typeAttack =
                    '<div class="btn_group">' +
                    '<input id="nameNuke' + index + '" value="' + entry.name + '" class="nameInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text"/>' +
                    '<input id="minNb' + index + '" value="' + entry.min + '" class="valueInput" disabled = "disabled" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text"/>' +
                    '</div>';
                
            }
            else {
                if (index <= 2){
                    html_typeAttack =
                        '<div class="btn_group" >' +
                            '<input id="nameNuke' + index + '" value="' + entry.name + '" class="nameInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text"/>' +
                            '<input id="minNb' + index + '" value="' + entry.min + '" class="valueInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text"/>' +
                        '</div>';
                } 
                else {
                    html_typeAttack =
                        '<div class="btn_group" style="margin-left:25px;" id="BtnAdd' + index + '" >' +
                            '<input id="nameNuke' + index + '" value="' + entry.name + '" class="nameInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text"/>' +
                            '<input id="minNb' + index + '" value="' + entry.min + '" class="valueInput" style="width : 250px;height: 19px;margin: 7px 15px;border-radius: 9px;padding-left: 0.5rem;padding-right: 0.5rem;border: none;" type="text"/>' +
                            '<button onclick="RemoveTypeAttaqueLine(' + index + ')" style="margin-left: auto; width: 25px; height: 25px; border-radius: 50%; background: #ddcca5; color: #f10000; font-size: 15px; cursor: pointer;">'+
                                '×'+
                            '</button>'+
                        '</div>';
                }
                
            }
        }

        
        $('#div_command').append(html_typeAttack);
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
        row_counter ++
        let doing = false;
        let changeRow = attack_rows.rows[row_counter];
        let textRow = ($(changeRow).find('.quickedit-label')).text();
        // filtrage : ne commence PAS par Attaque ou Retour
        if (textRow.includes("Attaque") || textRow.includes("Retour") || forceRename) {
            
            let changeButton = $(changeRow).find('.rename-icon');
            changeButton.click();

            let changeValue = $(changeRow).find('.quickedit-edit input[type="text"]')
            let sum = getSizeOfAttack(row_counter);
            
            let SizeSum = "";
            
            let PlayerSum = "";
            let PlayertroupeSum = "";
            SizeSum = getNameOfAttackAccordingToSize(sum.TotalUnits);
            PlayertroupeSum = getNameOfAttackAccordingToPlayerTroupes(sum);


            if (!($('#renamePlayer').is(':checked')) && !($('#renameTroupes').is(':checked'))) {
                changeValue.val(SizeSum);
                let submitButton = $(changeRow).find('.quickedit-edit input[type="button"]');
                submitButton.click();
                doing = true;
            } 

            if (($('#renamePlayer').is(':checked')) && ($('#renameTroupes').is(':checked')))  {                
                getNameOfAttackAccordingToPlayerName(getUrlTarget(changeRow)).then(function(name) {
                        let texte = SizeSum + " - " + name + PlayertroupeSum;
                        changeValue.val(texte);
                        let submitButton = $(changeRow).find('.quickedit-edit input[type="button"]');
                        submitButton.click();
                });
                doing = true;
            } 

            if (($('#renamePlayer').is(':checked')) && doing == false) {   
                getNameOfAttackAccordingToPlayerName(getUrlTarget(changeRow)).then(function(name) {
                        changeValue.val( SizeSum + " - " + name);
                        let submitButton = $(changeRow).find('.quickedit-edit input[type="button"]');
                        submitButton.click();
                });
                doing = true;
            } 
            
            if (($('#renameTroupes').is(':checked')) && doing == false) {
                changeValue.val(SizeSum + PlayertroupeSum);
                let submitButton = $(changeRow).find('.quickedit-edit input[type="button"]');
                submitButton.click();
                doing = true;
            }
            
        }
        if (debug == true) {if (row_counter == 10) return;}
        if (row_counter <= attack_rows.rows.length-2){
            doing = false;
            changeName(row_counter)
        }
    },250)

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
    let html =
        '<div id="'+popup_id+'" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:900;">' +
        '<div id = "close_popup_div" style="background:url(/graphic/background/bg-tile.jpg);opacity:0.8;position:fixed;top:0;left:0;width:100%;height:100%;z-index:5;"></div>' + // Background
        '<div style="position:relative;margin:auto;padding:0;top:120px;width:702px;z-index:10;">' +
        '<div style="width:702px;height:22px;background:url(/graphic/index/sprites.png) no-repeat 0 -79px"></div>' + // popup header
        '<div id="popupcontainer" style="padding:10px 20px;height:110%;min-height:80px;background:url(/graphic/index/news_background.png) repeat-y">'+
        '</div>' + // Header container
        '<div style="width: 702px; height: 20px; background:url(/graphic/index/sprites.png) no-repeat 0 -101px;">'+
        `<button id = "close_popup" class="btn" style="position: relative; margin-left: 270px; bottom : 10px">${translator('save')}</Button>`+
        '</div>' +
        '</div>' +
        '</div>'
    ;
    return html;
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
