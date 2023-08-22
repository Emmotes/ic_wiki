var data;
var version;
var trialsDay1 = [9,12,12,10,10,11];
var withFeat = " (with Feat)";
var nixieBlue = isNixieBlue();

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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function init() {
	// Init the data.
	if (!localStorage.data) {
		await loadLocalData();
	}
	await parseJSON()
	
	var latestVersion = (await loadDataVersion()).version;
	if (version != latestVersion) {
		console.log("localStorage version mismatch. Updating.");
		await loadLocalData();
		await parseJSON();
	}
	
	// Set spoiler checkbox to checked if spoilers are set.
	document.getElementById("spoilerCheckbox").checked = (localStorage.spoilers == 1 ? true : false);
	
	// Display the champions.
	displayChampions();
}

function parseJSON() {
	json = JSON.parse(localStorage.getItem("data"));
	data = json.data;
	version = json.version;
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
	var draw = "<div class=\"championHolder\" id=\""+fName+"\">";
	draw+="<a onclick=\"displayWiki("+i+")\" id=\"link_"+fName+"\" href=\"#\">";
	draw+="<div class=\"champion\" style=\"background-image:url("+portrait+"); background-size:68px; background-repeat: no-repeat;\" id=\"div_"+fName+"\">";
	draw+="<div class=\"championName\">"+nameShort+"</div>";
	draw+="</div>";
	draw+="</a>";
	draw+="</div>";
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
}

function displayWiki(i) {
	var champ = data[i];
	var name = champ.name;
	var fName = champ.fName;
	var unknown="Unknown.";
	var portrait = "images/"+fName+"/portraits/portrait.png";
	if (fName == "nixie") {
		portrait = nixiePortrait();
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
		content+="<h1 id=\"formation\">Formation</h1>";
		content+="<p><span class=\"formationBorder\"><img src=\""+formationURL+"\" alt=\"Formation Layout\" /></span></p>";
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
	
	content+="<h1 id=\"legendaries\">Legendaries</h1>";
	if (champ.legs!=undefined) {
		if (champ.legs.effects==undefined||champ.legs.effects.length==0) {
			content+="Unknown.";
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
	return "<div class=\"abilityBorder\"><div class=\"abilityBorderInner\"><p class=\"abilityBorderName\">"+addAttackImages(champ,attack)+" <strong>"+type+" Attack: "+attack.name+"</strong>"+(attack.damage_types.length>0?"("+slashSeparate(attack.damage_types,true)+")":"")+"</p><blockquote><p>"+(attack.long_description!=undefined&&attack.long_description!=""?attack.long_description:attack.description)+"</p></blockquote><details><summary><em>Raw Data</em></summary><p><pre>"+JSON.stringify(attack, null, 4)+"</pre></p></details></div></div>";
}

function addAbilityData(champ,ability) {
	var content="<div class=\"abilityBorder\"><div class=\"abilityBorderInner\"><p class=\"abilityBorderName\">"+addAbilityImages(champ,ability)+" <strong>";
	var name = "";
	for (let i=0;i<ability.length;i++) {
		if (ability[i].name!=undefined && ability[i].name!="") {
			name=ability[i].name;
			break;
		}
	}
	content+=name+"</strong>";
	var reqLevel=-1;
	for (let i=0; i<ability.length;i++) {
		if (ability[i].required_level!=undefined) {
			reqLevel=ability[i].required_level;
			break;
		}
	}
	content+=(reqLevel>=0?"(Level: "+reqLevel+")":"")+"</p><blockquote><p>";
	var desc="";
	for (let i=0;i<ability.length;i++) {
		var a=ability[i];
		if (a.hasOwnProperty("description")) {
			var ad=a.description;
			if (useableDesc(ad)) {
				desc=ad;
				break;
			}
			if (ad.hasOwnProperty("pre")) {
				var adp=ad.pre;
				if (useableDesc(adp)) {
					desc=adp;
					break;
				}
			}
			if (ad.hasOwnProperty("desc")) {
				var add=ad.desc;
				if (useableDesc(add)) {
					desc=add;
					break;
				}
			}
			if (ad.hasOwnProperty("conditions")) {
				var adc=ad.conditions;
				if (useableDesc(adc)) {
					desc=adc;
					break;
				}
				if (adc.hasOwnProperty("length")) {
					for (let k=0;k<adc.length;k++) {
						var adci=adc[i];
						if (adci.hasOwnProperty("desc") && !adci.hasOwnProperty("condition")) {
							var adcid=adci.desc;
							if (useableDesc(adcid)) {
								desc=adcid;
								break;
							}
						}
					}
				}
			}
		}
		if (a.hasOwnProperty("tip_text")) {
			desc=a.tip_text;
			// Don't break because this is a last resort.
		}
		if (a.hasOwnProperty("specialization_description")) {
			desc=a.specialization_description;
			// Don't break because this is a last resort.
		}
	}
	content+=fixDesc(desc,champ,ability)+"</p></blockquote><details><summary><em>Raw Data</em></summary><p><pre>"+JSON.stringify(ability, null, 4)+"</pre></p></details></div></div>";
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
			content+applicables[0];
		}
		content+=" / 6";
		if (typeof(applicables)!="string"&&typeof(applicables)!="number") {
			content+= " (Possibly "+applicables[1]+" / 6)";
		}
		content+="<br/>";
	}
	content+="</pre></p></details>";
	return content;
}

function useableDesc(thing) {
	if (thing!=undefined && typeof(thing)=="string" && thing!="") {
		return true;
	}
	return false;
}

function fixDesc(desc,champ,ability) {
	var effects=parseEffects(ability);
	var regex=new RegExp("\\$\\({0,1}([A-Za-z0-9 _]+)\\){0,1}[^ ]","g");
	var regex2=new RegExp("([^$\(\)%]+)","g");
	var result=desc.match(regex);
	if (result==null || result==undefined || result.length==undefined) {
		result=[];
	}
	for (let i=0;i<result.length;i++) {
		var match=result[i];
		var match1=match.match(regex2);
		var index=0;
		var changed=false;
		if (match1.includes("___")) {
			index=match1.split("___")[1]-1;
		}
		for (let k=0;k<effects.length;k++) {
			var sEffect=effects[k];
			var sEffectSplit=sEffect.split(",");
			if (match.includes("source_hero")) {
				//console.log("Replacing `"+match+"` with `"+champ.name+"`.");
				desc=desc.replace(match,champ.name);
			} else if (match.includes("source")) {
				//console.log("Replacing `source` or `$source` with `"+champ.name+"`.");
				desc=desc.replace("$source",champ.name);
				desc=desc.replace("source",champ.name);
			} else if (match.includes("not_buffed amount")) {
				//console.log("Replacing `"+match+"` with `"+sEffectSplit[1]+"`.");
				desc=desc.replace(match,sEffectSplit[1]);
			} else {
				//console.log("Just surrounding `"+match+"` with code block.");
				if (!changed) {
					desc=desc.replace(match,"<code class=\"language-plaintext highlighter-rouge\">"+match+"</code>");
					changed=true;
				}
			}
		}
	}
	desc=desc.replaceAll("\^","<br><br>");
	return desc;
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
	var prefix = "images/"+champ.fName+"/attacks/";
	if (attack.graphic_id != undefined && attack.graphic_id > 0) {
		return "<img src=\""+prefix+attack.id+".png\" alt=\""+attack.name+" Icon\">";
	}
	var images = "";
	for (let i=0;i<attack.damage_types.length;i++) {
		let dmg = attack.damage_types[i];
		images+="<img src=\"images/"+dmg+".png\" alt=\""+capitalise(dmg)+" Damage Icon\">";
	}
	return images;
}

function addAbilityImages(champ,ability) {
	var prefix="images/"+champ.fName+"/abilities/";
	var graphicId = -3;
	for (let i=0;i<ability.length;i++) {
		if (graphicId<0 && ability[i].graphic_id!=undefined && ability[i].graphic_id>0) {
			graphicId = ability[i].graphic_id;
		}
		if (graphicId<0 && ability[i].specialization_graphic_id!=undefined && ability[i].specialization_graphic_id>0) {
			graphicId = ability[i].specialization_graphic_id;
		}
	}
	if (ability.length==2 && graphicId>0 && ability[0].required_level>0) {
		return "<img src=\""+prefix+ability[0].id+".png\" alt=\""+ability[0].name+" Icon\">";
	}
	return "";
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

function runNameEegs(fName,nameShort) {
	if (fName == "dhani") {
		var dhaniEegg = "Dhani";
		dhaniEegg = ins(dhaniEegg, randInt(1,4), "'");
		return dhaniEegg;
	}
	if (fName == "corazon") {
		if (randInt(1,4) == 4) {
			return "Côrăzón";
		}
	}
	return nameShort;
}

function isNixieBlue() {
	if (randInt(1,4) == 4) {
		return true;
	}
	return false;
}

function nixiePortrait() {
	var prefix = "images/nixie/portraits/portrait";
    if (nixieBlue) {
        return prefix+"Blue.png";
    }
	return prefix+".png";
}