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
		var seat = data[i].seat;
		var spoiler = data[i].spoiler;
		if ( (localStorage.spoilers == 1 && spoiler) || !spoiler) {
			var currSeat = document.getElementById("seat"+seat).innerHTML;
			currSeat += drawChampion(i);
			document.getElementById("seat"+seat).innerHTML = currSeat;
		}
	}
}

function drawChampion(i) {
	var name = data[i].name;
	var fName = data[i].fName;
	var nameShort = data[i].nameShort;
	nameShort = runNameEegs(fName,nameShort);
	var portrait = "images/"+fName+"/portraits/portrait.png";
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
	var portrait = "images/"+fName+"/portraits/portrait.png";
	if (fName == "nixie") {
		portrait = nixiePortrait();
	}
	var portraitExists = champ.portrait;
	var content=(portraitExists?"<p><br /><img src=\""+portrait+"\" alt=\""+name+" Portrait\"></p>":"");
	content+="<h1 id=\""+fName+"\">"+name+"</h1>";
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
	
	document.getElementById("wikicontent").innerHTML = content;
}

function createFullStatsTable(champ) {
	return "<p><span class=\"champStatsTableColumn\"><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Seat</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+(champ.spoiler?champ.seatSpoiler:champ.seat)+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Stat</strong></span></span><span class=\"champStatsTableStatsHeader\"><span style=\"margin-left:8px;\"><strong>Value</strong></span></span><span class=\"champStatsTableTrialsHeader\"><span style=\"margin-left:8px;\"><strong>Day 1 Trials</strong></span></span><span class=\"champStatsTablePatronsHeader\"><span style=\"margin-left:8px;\"><strong>Patrons</strong></span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Race</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.race+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Strength</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(0,champ)+"px;\">"+champ.stats[0]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(0,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\">"+calcMirt(champ)+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Class</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.classes+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Dexterity</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(1,champ)+"px;\">"+champ.stats[1]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(1,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\">"+calcVajra(champ)+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Roles</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.roles+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Constitution</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(2,champ)+"px;\">"+champ.stats[2]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(2,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\">"+calcStrahd(champ)+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Age</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.age+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Intelligence</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(3,champ)+"px;\">"+champ.stats[3]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(3,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\">"+calcZariel(champ)+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Gender</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.gender+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Wisdom</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(4,champ)+"px;\">"+champ.stats[4]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(4,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\"> </span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Alignment</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.alignment+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Charisma</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:"+calcChampPadding(5,champ)+"px;\">"+champ.stats[5]+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\">"+calcDay1Trials(5,champ)+"</span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\"> </span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Affiliation</strong>:</span></span><span class=\"champStatsTableInfo\"><span style=\"margin-left:8px;\">"+champ.affiliations+"</span></span><span class=\"champStatsTableStatHeader\"><span style=\"margin-right:4px;\"><strong>Total</strong>:</span></span><span class=\"champStatsTableStats\"><span style=\"margin-left:8px;\">"+champ.totalStats+"</span></span><span class=\"champStatsTableTrials\"><span style=\"margin-left:8px;\"> </span></span><span class=\"champStatsTablePatrons\"><span style=\"margin-left:8px;\"> </span></span></span></span></p>";
}

function createSmallStatsTable(champ) {
	return "<p><span class=\"champStatsTableColumn\"><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Seat</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.seatSpoiler+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Race</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.race+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Class</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.classes+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Roles</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.roles+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Age</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.age+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Gender</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.gender+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Alignment</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.alignment+"</span></span></span><span class=\"champStatsTableRow\"><span class=\"champStatsTableInfoHeader\"><span style=\"margin-right:4px;\"><strong>Affiliation</strong>:</span></span><span class=\"champStatsTableInfoSmall\"><span style=\"margin-left:8px;\">"+champ.affiliations+"</span></span></span></span></p>";
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

function ins(str, index, value) {
    return str.substr(0, index) + value + str.substr(index);
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function runNameEegs(fName,nameShort) {
	if (fName == "dhani") {
		var dhaniEegg = "Dhani";
		dhaniEegg = ins(dhaniEegg, randInt(1,4), "'");
		return dhaniEegg;
	}
	if (fName == "corazon") {
		return "Côråzón";
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