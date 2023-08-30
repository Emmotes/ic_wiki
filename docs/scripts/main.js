var data;
var version;
var trialsDay1 = [9,12,12,10,10,11];
var withFeat = " (with Feat)";
var nixieBlue = isNixieBlue();
var splatGhost = isSplatGhost();

async function loadDataVersion() {
	var response = await fetch("championDataVersion.json")
		.then(response => response.text())
		.catch(err => console.log(err));
	return await JSON.parse(response);
}

async function loadLocalData() {
	var response = await fetch("championData.json")
		.then(response => response.text())
		.catch(err => console.log(err));
	await localStorage.removeItem("data");
	await localStorage.setItem("data", response);
}

async function init() {
	// Init the data.
	if (!localStorage.data) {
		await loadLocalData();
	}
	await parseJSON()
	
	var latestVersion = (await loadDataVersion()).sha256;
	if (version != latestVersion) {
		console.log("localStorage version mismatch. Updating.\r\n\tlocalStorage: "+version+"\r\n\t   on server: "+latestVersion);
		await loadLocalData();
		await parseJSON();
	}
	
	// Set spoiler checkbox to checked if spoilers are set.
	document.getElementById("spoilerCheckbox").checked = (localStorage.spoilers == 1 ? true : false);
	
	// Display the champions.
	displayChampions();
}

async function parseJSON() {
	var localStore = localStorage.getItem("data");
	json = JSON.parse(localStore);
	data = json.data;
	version = await sha256(localStore);
}

function displayChampions() {
	for(let i=0;i<=12;i++){
		var seatTitle = "<div class=\"seatTitle\">"+(i==0?"Spoilers":"Seat "+i)+"</div>";
		if (i==0 && (!localStorage.spoilers || localStorage.spoilers == 0)) {
			seatTitle = "";
		}
		document.getElementById("seat"+i).innerHTML = seatTitle;
	}
	for(let i=0;i<data.length;i++){
		var champ = data[i];
		if ( (localStorage.spoilers == 1 && champ.spoiler) || !champ.spoiler) {
			var currSeat = document.getElementById("seat"+champ.seat).innerHTML;
			currSeat += drawChampion(i,champ);
			document.getElementById("seat"+champ.seat).innerHTML = currSeat;
		}
	}
}

function drawChampion(i,champ) {
	var name = champ.name;
	var fName = champ.fName;
	var nameShort = champ.nameShort;
	nameShort = runNameEegs(fName,nameShort);
	var portrait = "images/unknown.png";
	if (champ.portrait!=undefined&&champ.portrait) {
		portrait = "images/"+fName+"/portraits/portrait.png";
	}
	if (fName == "nixie") {
		portrait = nixiePortrait();
	}
	if (fName == "spurt") {
		portrait = splatPortrait();
	}
	var draw = "<div class=\"championHolder\" id=\""+fName+"\"><a onclick=\"displayWiki("+i+")\" id=\"link_"+fName+"\" href=\"#\"><div class=\"champion\" style=\"background-image:url("+portrait+"); background-size:68px; background-repeat: no-repeat;\" id=\"div_"+fName+"\"><div class=\"championName\">"+nameShort+"</div></div></a></div>";
	return draw;
}

function setSpoilers() {
	var spoilerCheckbox = document.getElementById("spoilerCheckbox");
	if (spoilerCheckbox.checked == true) {
		localStorage.setItem("spoilers", 1)
	} else {
		localStorage.setItem("spoilers", 0);
	}
	displayChampions();
	if (document.getElementById("currChamp").innerHTML>0) {
		displayWiki(document.getElementById("currChamp").innerHTML);
	}
}

function displayWiki(i) {
	document.getElementById("currChamp").innerHTML = i;
	var champ = data[i];
	var name = champ.name;
	var fName = champ.fName;
	var unknown="Unknown.";
	var portrait = "images/"+fName+"/portraits/portrait.png";
	if (fName == "nixie") {
		portrait = nixiePortrait();
	}
	if (fName == "spurt") {
		portrait = splatPortrait();
	}
	var portraitExists = champ.portrait;
	var content=(portraitExists?"<p><br /><img src=\""+portrait+"\" alt=\""+name+" Portrait\"></p>":"");
	content+="<h1 id=\""+fName+"\">"+champ.nameFull+"</h1>";
	content+="<p>"+champ.backstory+"</p>";
	content+="<h1 id=\"basic-information\">Basic Information</h1>";
	if (champ.spoiler) {
		content+="<p>"+name+" will be the new champion in the "+champ.event+" event on "+champ.date+".</p>";
	}
	if (champ.stats != undefined) {
		content+=createFullStatsTable(champ);
	} else {
		content+=createSmallStatsTable(champ);
	}
	var formationURL = "images/"+fName+"/formation/formation.png";
	var formationExists = champ.formation;
	if (formationExists) {
		content+="<h1 id=\"formation\">Formation</h1><p><span class=\"formationBorder\"><img src=\""+formationURL+"\" alt=\"Formation Layout\" /></span></p>";
	}
	
	content+="<h1 id=\"abilities\">Abilities</h1>";
	if (champ.attacks!=undefined || champ.abilities!=undefined) {
		if (champ.attacks!=undefined) {
			if (champ.attacks.base!=undefined) {
				var attack = champ.attacks.base;
				content+=addAttackData(champ,attack);
			}
			if (champ.attacks.ult!=undefined) {
				var attack = champ.attacks.ult;
				content+=addAttackData(champ,attack);
			}
		}
		if (champ.abilities!=undefined&&champ.abilities.length>0) {
			for (let i=0;i<champ.abilities.length;i++) {
				var ability = champ.abilities[i];
				content+=addAbilityData(champ,ability);
			}
		}
	} else {
		content+=unknown;
	}
	
	content+="<h1 id=\"specialisations\">Specialisations</h1>";
	if (champ.specs!=undefined&&champ.specs.length>0) {
		for (let i=0;i<champ.specs.length;i++) {
			var spec = champ.specs[i];
			content+=addAbilityData(champ,spec);
		}
	} else {
		content+=unknown;
	}
	
	content+="<h1 id=\"items\">Items</h1>";
	if (champ.items!=undefined&&champ.items.length>0) {
		content+=addItemData(champ,champ.items);
	} else {
		content+=unknown;
	}
	
	content+="<h1 id=\"feats\">Feats</h1>";
	if (champ.feats!=undefined&&champ.feats.normal!=undefined) {
		content+=addFeatData(champ,champ.feats.normal,false);
	} else {
		content+=unknown;
	}
	
	if (localStorage.spoilers==1&&champ.feats!=undefined&&champ.feats.spoilers!=undefined&&champ.feats.spoilers.length>0) {
		content+="<h1 id=\"spoilerfeats\">Spoiler Feats</h1>";
		content+="<p>These are feats that have yet to be released.</p>";
		content+=addFeatData(champ,champ.feats.spoilers,true);
	}
	
	content+="<h1 id=\"legendaries\">Legendaries</h1>";
	if (champ.legs!=undefined) {
		if (champ.legs.effects==undefined||champ.legs.effects.length==0) {
			content+=unknown;
		} else {
			content+="<ul>";
			for (let i=0;i<champ.legs.effects.length;i++) {
				content+="<li>"+champ.legs.effects[i]+"</li>";
			}
			content+="</ul>";
			content+=addLegendaryDropdown("DPS",champ.legs.dps);
			content+=addLegendaryDropdown("Non-DPS",champ.legs.nondps);
		}
	} else {
		content+=unknown;
	}
	
	content+="<h1 id=\"championimages\">Champion Images</h1>";
	if (champ.console||champ.chests!=undefined) {
		content+=addChampionImagesData(champ);
	} else {
		content+=unknown;
	}
	
	content+="<p><br/><br/><br/><br/><br/><br/></p>";
	
	document.getElementById("wikicontent").innerHTML = content;
}

function createFullStatsTable(champ) {
	return "<p><span class=\"champStatsTableColumn\"><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Seat</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+(champ.spoiler?champ.seatSpoiler:champ.seat)+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Stat</strong></span></span><span class=\"champStatsTableStatsHeader\"><span style=\"margin-left:8px;\"><strong>Value</strong></span></span><span class=\"champStatsTableTrialsHeader\"><span style=\"margin-left:8px;\"><strong>Day 1 Trials</strong></span></span><span class=\"champStatsTablePatronsHeader\"><span style=\"margin-left:8px;\"><strong>Patrons</strong></span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Race</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.race+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Strength</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(0,champ)+"px;\">"+champ.stats[0]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(0,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\">"+calcMirt(champ)+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Class</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.classes+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Dexterity</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(1,champ)+"px;\">"+champ.stats[1]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(1,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\">"+calcVajra(champ)+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Roles</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.roles+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Constitution</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(2,champ)+"px;\">"+champ.stats[2]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(2,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\">"+calcStrahd(champ)+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Age</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.age+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Intelligence</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(3,champ)+"px;\">"+champ.stats[3]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(3,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\">"+calcZariel(champ)+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Gender</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+(champ.gender==""?"Nonbinary":champ.gender)+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Wisdom</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(4,champ)+"px;\">"+champ.stats[4]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(4,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\"> </span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Alignment</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.alignment+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Charisma</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(5,champ)+"px;\">"+champ.stats[5]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(5,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\"> </span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Affiliation</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.affiliations+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Total</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:8px;\">"+champ.totalStats+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\"> </span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\"> </span></span></span></span></p>";
}

function createSmallStatsTable(champ) {
	return "<p><span class=\"champStatsTableColumn\"><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Seat</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.seatSpoiler+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Race</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.race+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Class</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.classes+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Roles</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.roles+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Age</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.age+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Gender</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.gender+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Alignment</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.alignment+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Affiliation</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.affiliations+"</span></span></span></span></p>";
}

function addAttackData(champ,attack) {
	var type = "Base";
	if (attack.tags.includes("ultimate")) {
		type = "Ultimate";
	}
	var shortCDtxt = "<p><span style=\"font-size:1.2em;\">ⓘ</span> <em>Note: Very short ultimate cooldowns are almost always for testing purposes and are likely to be increased later.</em></p>"
	var shortCD = "";
	if (attack.cooldown <= 15 && champ.spoiler && type == "Ultimate") {
		shortCD = shortCDtxt;
	}
	return "<div class=\"abilityBorder\"><div class=\"abilityBorderInner\"><p class=\"abilityBorderName\">"+addAttackImages(champ,attack)+" <strong>"+type+" Attack: "+attack.name+"</strong>"+(attack.damage_types.length>0?"("+slashSeparate(attack.damage_types,true)+")":"")+"</p><blockquote><p>"+(attack.long_description!=undefined&&attack.long_description!=""?attack.long_description:attack.description)+"<br>Cooldown: "+attack.cooldown+"s (Cap "+(attack.cooldown*0.25)+"s)</p></blockquote>"+shortCD+"<details><summary><em>Raw Data</em></summary><p><pre>"+JSON.stringify(attack, null, 4)+"</pre></p></details></div></div>";
}

function addAbilityData(champ,ability) {
	var prestack = "<p><span style=\"font-size:1.2em;\">ⓘ</span> <em>Note: This ability might be prestack.</em></p>"
	var content="<div class=\"abilityBorder\"><div class=\"abilityBorderInner\"><p class=\"abilityBorderName\">"+addAbilityImages(champ,ability)+" <strong>"+ability.name+"</strong>";
	var reqLevel=-1;
	for (let i=0; i<ability.raw.length;i++) {
		if (ability.raw[i].required_level!=undefined) {
			reqLevel=ability.raw[i].required_level;
			break;
		}
	}
	var raw=JSON.stringify(ability.raw, null, 4);
	var maybePrestack=false;
	if (raw.includes("pre_stack") || raw.includes("pre-stack") || raw.includes("prestack")) {
		maybePrestack = true;
	}
	content+=(reqLevel>=0?"(Level: "+reqLevel+")":"")+"</p><blockquote><p>"+ability.desc+"</p></blockquote>"+(maybePrestack?prestack:"")+"<details><summary><em>Raw Data</em></summary><p><pre>";
	for (let i=0;i<ability.raw.length;i++) {
		content+=JSON.stringify(ability.raw[i], null, 4);
		if (i<ability.raw.length-1) {
			content+=",<br/>";
		}
	}
	content+="</pre></p></details></div></div>";
	return content;
}

function addItemData(champ,slots) {
	var small=(slots[0].effect==undefined);
	var content="<p><span class=\"itemTableColumn\"><span class=\"itemTableRowHeader\"><span class=\"itemTableIcon\" style=\"align-items:center;\"><span style=\"margin-left:8px;\"><strong>Icons</strong></span></span>";
	if (small) {
		content+="<span class=\"itemTableNameSmall\"><span style=\"margin-left: 8px;\"><strong>Name</strong></span></span>";
	} else {
		content+="<span class=\"itemTableSlot\"><span><strong>Slot</strong></span></span><span class=\"itemTableName\"><span style=\"margin-left: 8px;\"><strong>Epic Name</strong></span></span><span class=\"itemTableEffect\"><span style=\"margin-left: 8px;\"><strong>Effect</strong></span></span>";
	}
	content+="</span>";
	var longName = 0;
	for (let i=0;i<slots.length;i++) {
		var slot=slots[i];
		content+="<span class=\"itemTableRow\"><span class=\"itemTableIcon\">";
		for (let k=0;k<slot.items.length;k++) {
			var item=slot.items[k];
			content+="<span class=\"itemTableIcon"+(k+1)+"\"><img src=\"images/"+champ.fName+"/items/"+item.graphicId+".png\" alt=\""+item.name+" Icon\"/></span>";
			if (item.name.length>longName) {
				longName=item.name.length;
			}
		}
		content+="</span>";
		if (small) {
			content+="<span class=\"itemTableNameSmall\"><span style=\"margin-left: 8px;\">"+item.name+"</span></span>";
		} else {
			content+="<span class=\"itemTableSlot\"><span>"+(i+1)+"</span></span><span class=\"itemTableName\"><span style=\"margin-left: 8px;\">"+item.name+"</span></span><span class=\"itemTableEffect\"><span style=\"margin-left: 8px;\">"+slot.effect+"</span></span>";
		}
		content+="</span>";
	}
	content+="</p>";
	if (!small) {
		longName+=2;
		content+="<details><summary><em>Item Names and Descriptions</em></summary><p><pre>";
		for (let i=0;i<slots.length;i++) {
			var slot=slots[i];
			if (i>0) {
				content+="<br/>";
			}
			content+="Slot: "+(i+1)+"<br/>";
			for (let k=0;k<slot.items.length;k++) {
				var item=slot.items[k];
				content+=splitItemDescription((item.name+":").padStart(longName-1),item.description,longName);
				content+="<br/>";
			}
		}
	}
	content+="</pre></p></details>";
	return content;
}

function addFeatData(champ,feats,spoils) {
	var content="<p><span class=\"featTableColumn\">";
	content+="<span class=\"featTableRowHeader\"><span class=\"featTableIcon1\"><span style=\"margin-left:8px;\"><strong>Feat</strong></span></span><span class=\"featTableEffect\"><span style=\"margin-left:8px;margin-right:8px;\"><strong>Effect</strong></span></span><span class=\"featTableSource\"><span style=\"margin-left:8px;\"><strong>Source</strong></span></span>"+(spoils?"<span class=\"featTableDate\"><span style=\"margin-right:8px;\"><strong>Date</strong></span></span>":"")+"</span>";
	for (let i=0;i<feats.length;i++) {
		var feat = feats[i];
		content+="<span class=\"featTableRow\"><span class=\"featTableIcon"+feat.rarity+"\"><img src=\"images/feats/"+feat.graphicId+".png\" alt=\""+feat.name+" Icon\" />"+feat.name+"</span><span class=\"featTableEffect\"><span style=\"margin-left:8px;margin-right:8px;\">"+feat.effect+"</span></span><span class=\"featTableSource\"><span style=\"margin-left:8px;\">"+feat.source+"</span></span>"+(spoils?"<span class=\"featTableDate\"><span style=\"margin-right:8px;\"><strong>"+(feat.date!=undefined?feat.date:"???")+"</strong></span></span>":"")+"</span>";
	}
	content+="</span></p>";
	return content;
}

function addLegendaryDropdown(legsType,legsApplic) {
	if (legsApplic==undefined) {
		return "";
	}
	var content="<details><summary><em>"+legsType+" Applicable</em></summary><p><pre>";
	legsApplic=sortArray(legsApplic);
	var names = Object.keys(legsApplic);
	var longName = 0;
	for (let i=0;i<names.length;i++) {
		if (names[i].length > longName) {
			longName=names[i].length;
		}
	}
	for (let i=0;i<names.length;i++) {
		content+=names[i].padStart(longName)+": ";
		var applicables=legsApplic[names[i]];
		if (typeof(applicables)=="string"||typeof(applicables)=="number") {
			content+=applicables;
		} else {
			content+=applicables[0];
		}
		content+=" / 6";
		if (typeof(applicables)!="string"&&typeof(applicables)!="number") {
			content+= " (Potentially "+applicables[1]+" / 6)";
		}
		content+="<br/>";
	}
	content+="</pre></p></details>";
	return content;
}

function addChampionImagesData(champ) {
	var content="<p><span class=\"championImagesColumn\">";
	if (champ.console) {
		content+="<span class=\"championImagesRow\"><span class=\"championImagesPortrait\"><img src=\"images/"+champ.fName+"/portraits/console.png\" alt=\""+champ.name+" Console Portrait\" />Console Portait</span></span>";
	}
	if (champ.chests!=undefined) {
		content+="<span class=\"championImagesRow\">"
		if (champ.chests.gold) {
			content+="<span class=\"championImagesChests\"><img src=\"images/"+champ.fName+"/chests/gold.png\" alt=\""+champ.name+" Gold Chest Icon\" />Gold Chest Icon</span>";
		}
		if (champ.chests.silver) {
			content+="<span class=\"championImagesChests\"><img src=\"images/"+champ.fName+"/chests/silver.png\" alt=\""+champ.name+" Silver Chest Icon\" />Silver Chest Icon</span>";
		}
		content+="</span>";
	}
	content+="</span></p>";
	return content;
}

function useableDesc(thing) {
	if (thing!=undefined && typeof(thing)=="string" && thing!="") {
		return true;
	}
	return false;
}

function parseEffects(abilities) {
	var es="effect_string";
	var effects=[];
	customFilter(abilities,effects);
	return effects;
}

function customFilter(object, result){
	if(object==null)
		return;
	
    if(object.hasOwnProperty("effect_string"))
		result.push(object.effect_string);

    for(var i=0;i<Object.keys(object).length;i++){
        if(typeof object[Object.keys(object)[i]] == "object"){
            customFilter(object[Object.keys(object)[i]], result);
        }
    }
}

function sortArray(unordered) {
	var ordered = Object.keys(unordered).sort().reduce(
		(obj, key) => { 
			obj[key] = unordered[key]; 
			return obj;
		}, 
		{}
	);
	return ordered;
}

function calcDay1Trials(stat, champ) {
	var restr = trialsDay1[stat];
	var statNorm = champ.stats[stat];
	var statFeat = champ.statsFeats[stat];
	if (statFeat >= restr) {
		var result = "Yes";
		if (statNorm < restr) {
			return result+withFeat;
		}
		return result;
	}
	return "-";
}

function calcMirt(champ) {
	var align = champ.alignment;
	if (align.includes("Good") || align.includes("Evil")) {
		return "Mirt"
	}
	return "-";
}

function calcVajra(champ) {
	var stat = 2; /* con */
	var restr = 14;
	var statNorm = champ.stats[stat];
	var statFeat = champ.statsFeats[stat];
	if (statFeat >= restr) {
		var result = "Vajra";
		if (statNorm < restr) {
			return result+withFeat;
		}
		return result;
	}
	return "-";
}

function calcStrahd(champ) {
	var stat = 3; /* int */
	var restr = 13;
	var statNorm = champ.stats[stat];
	var statFeat = champ.statsFeats[stat];
	if (statFeat >= restr) {
		var result = "Strahd";
		if (statNorm < restr) {
			return result+withFeat;
		}
		return result;
	}
	return "-";
}

function calcZariel(champ) {
	var statA = 0; /* str */
	var statB = 5; /* cha */
	var restrA = 10;
	var restrB = 13;
	var statANorm = champ.stats[statA];
	var statAFeat = champ.statsFeats[statA];
	var statBNorm = champ.stats[statB];
	var statBFeat = champ.statsFeats[statB];
	if (statAFeat >= restrA && statBFeat >= restrB) {
		var result = "Zariel";
		if (statANorm < restrA || statBNorm < restrB) {
			return result+withFeat;
		}
		return result;
	}
	return "-";
}

function calcChampPadding(stat, champ) {
	var statVal = champ.stats[stat];
	if (statVal < 10) {
		return 16;
	}
	return 8;
}

function addFormation(fName) {
	var content = "";
	var image = "images/"+fName+"/formation.png";
	var http = new XMLHttpRequest();
	http.open('HEAD', image, false);
	http.send();
	if (http.status === 200) {
		content+="<h1 id=\"formation\">Formation</h1>";
		content+="<p><img src=\""+image+"\" alt=\"Formation Layout\" /></p>";
	}
	return content;
}

function addAttackImages(champ,attack) {
	if (attack.graphic_id != undefined && attack.graphic_id > 0) {
		return "<img src=\"images/"+champ.fName+"/attacks/"+attack.id+".png\" alt=\""+attack.name+" Icon\">";
	}
	var images = "";
	for (let i=0;i<attack.damage_types.length;i++) {
		let dmg = attack.damage_types[i];
		images+="<img src=\"images/"+dmg+".png\" alt=\""+capitalise(dmg)+" Damage Icon\">";
	}
	return images;
}

function addAbilityImages(champ,ability) {
	var graphicId = ability.graphicId;
	var reqLevel = -3;
	for (let i=0;i<ability.raw.length;i++) {
		if (ability.raw[i].required_level!=undefined) {
			reqLevel = ability.raw[i].required_level;
		}
	}
	if (ability.raw.length==2 && ability.graphicId>0 && reqLevel>0) {
		return "<img src=\"images/"+champ.fName+"/abilities/"+ability.id+".png\" alt=\""+ability.name+" Icon\">";
	}
	return "";
}

function splitItemDescription(start,description,longName) {
	var limit=95;
	var spacing="".padStart(longName);
	var desc=description.split(" ");
	var retVal="";
	var line=start;
	var i=0;
	var first=true;
	while (i<desc.length) {
		if (line.length+1+desc[i].length<=limit) {
			line+=(line!=""?" ":"")+desc[i];
		} else {
			retVal+=(retVal!=""?"<br/>":"")+line;
			line=spacing+desc[i];
		}
		first=false;
		i++;
	}
	retVal+=(retVal!=""?"<br/>":"")+line;
	return retVal;
}

function ins(str, index, value) {
    return str.substr(0, index) + value + str.substr(index);
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function capitalise(input) {
    return input.charAt(0).toUpperCase()+input.slice(1);
}

function slashSeparate(inputArr,capsFirstLetter) {
	var output = "";
	for (let i=0;i<inputArr.length;i++) {
		if (i > 0) {
			output += " / ";
		}
		if (capsFirstLetter) {
			output+=capitalise(inputArr[i]);
		} else {
			output+=inputArr[i];
		}
	}
	return output;
}

async function sha256(source) {
    var sourceBytes = new TextEncoder().encode(source);
    var digest = await crypto.subtle.digest("SHA-256", sourceBytes);
    var resultBytes = [...new Uint8Array(digest)];
    return resultBytes.map(x => x.toString(16).padStart(2, '0')).join("");
}

function runNameEegs(fName,nameShort) {
	if (fName == "dhani") {
		var dhaniEegg = "Dhani";
		dhaniEegg = ins(dhaniEegg, randInt(1,4), "'");
		return dhaniEegg;
	}
	if (fName == "laezel") {
		var laezelEegg = "Laezel";
		laezelEegg = ins(laezelEegg, randInt(1,5), "'");
		return laezelEegg;
	}
	if (fName == "kthriss") {
		var kthrissEegg = "Kthriss";
		kthrissEegg = ins(kthrissEegg, randInt(1,6), "'");
		return kthrissEegg;
	}
	if (fName == "corazon") {
		if (randInt(1,4) == 3) {
			return "Côrăžón";
		}
	}
	if (fName == "torogar") {
		if (randInt(1,8) == 7) {
			return "Totoro";
		}
	}
	return nameShort;
}

function isNixieBlue() {
	if (randInt(1,4) == 2) {
		return true;
	}
	return false;
}

function nixiePortrait() {
	var prefix = "images/nixie/portraits/portrait";
	if (nixieBlue) {
		prefix+="Blue";
	}
	return prefix+".png";
}

function isSplatGhost() {
	if (randInt(1,4) == 3) {
		return true;
	}
	return false;
}

function splatPortrait() {
	var prefix = "images/spurt/portraits/portrait";
	if (splatGhost) {
		prefix+="Ghost3";
	}
	return prefix+".png";
}