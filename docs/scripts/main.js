const v=1.6
var data;
var version;
var trialsDay1 = [9,12,12,10,10,11];
var withFeat = ` (with Feat)`;
var nixieBlue = isNixieBlue();
var splatGhost = isSplatGhost();
var dmUni = isDMUni();

async function loadDataVersion() {
	var response = await fetch(`championDataVersion.json`)
		.then(response => response.text())
		.catch(err => console.log(err));
	return await JSON.parse(response);
}

async function loadLocalData() {
	var response = await fetch(`championData.json`)
		.then(response => response.text())
		.catch(err => console.log(err));
	if (localStorage.wikiData != undefined) {
		console.log("Removing old wikiData so the new stuff can go there.");
		await localStorage.removeItem(`wikiData`);
	}
	var compressed = await compress(response);
	await localStorage.setItem(`wikiData`, compressed);
}

async function init() {
	if (localStorage.spoilers != undefined) {
		localStorage.wikiSpoilers = localStorage.spoilers;
		console.log("Cleaning up old localStorage spoilers location.");
		localStorage.removeItem(`spoilers`);
	}
	if (localStorage.data != undefined) {
		console.log("Cleaning up old localStorage data location.");
		localStorage.removeItem(`data`);
	}
	
	// Init the data.
	if (!localStorage.wikiData)
		await loadLocalData();
	await parseJSON()
	
	var latestVersion = (await loadDataVersion()).sha256;
	if (version != latestVersion) {
		console.log(`localStorage version mismatch. Updating.\r\n\tlocalStorage: ${version}\r\n\t   on server: ${latestVersion}`);
		await loadLocalData();
		await parseJSON();
	}
	
	// Set spoiler checkbox to checked if spoilers are set.
	document.getElementById(`spoilerCheckbox`).checked = (localStorage.wikiSpoilers == 1 ? true : false);
	// Set unsticky champions checkbox to checked if unsticky champions is set.
	document.getElementById(`unstickyCheckbox`).checked = (localStorage.wikiUnstickyChamps == 1 ? true : false);
	setUnsticky();
	
	// Display the champions.
	displayChampions();
}

async function parseJSON() {
	var decompressed = decompress(localStorage.getItem(`wikiData`));
	try {
		data = JSON.parse(decompressed).data;
	} catch (err) {
		console.log(`Caught an error with localStorage data. Taking the nuclear option.`);
		localStorage.removeItem(`wikiData`);
		console.log(`Nuked the localStorage - downloading the data again.`);
		await loadLocalData();
		decompressed = decompress(localStorage.getItem(`wikiData`));
		data = JSON.parse(decompressed).data;
	}
	version = await sha256(decompressed);
}

function displayChampions() {
	for(let i=0;i<=12;i++){
		var seatTitle = `<div class="seatTitle">`+(i==0?`Spoilers`:`Seat ${i}`)+`</div>`;
		if (i==0 && (!localStorage.wikiSpoilers || localStorage.wikiSpoilers == 0))
			seatTitle = ``;
		document.getElementById(`seat${i}`).innerHTML = seatTitle;
	}
	for(let i=0;i<data.length;i++){
		var champ = data[i];
		if ( (localStorage.wikiSpoilers == 1 && champ.spoiler) || !champ.spoiler) {
			var currSeat = document.getElementById(`seat${champ.seat}`).innerHTML;
			currSeat += drawChampion(i,champ);
			document.getElementById(`seat${champ.seat}`).innerHTML = currSeat;
		}
	}
}

function drawChampion(i,champ) {
	var name = champ.name;
	var fName = champ.fName;
	var nameShort = champ.nameShort;
	nameShort = runNameEeggs(nameShort);
	var portrait = `images/unknown.png`;
	if (champ.portrait!=undefined&&champ.portrait)
		portrait = `images/${fName}/portraits/portrait.png`;
	if (fName == `nixie`)
		portrait = nixiePortrait();
	if (fName == `spurt`)
		portrait = splatPortrait();
	if (fName == `dungeonmaster`)
		portrait = dmPortrait();
	var draw = `<div class="championHolder" id="${fName}"><a onclick="displayWiki(${i})" id="link_${fName}" href="#"><div class="champion" style="background-image:url(${portrait}); background-size:61px; background-repeat: no-repeat;" id="div_${fName}"><div class="championName">${nameShort}</div></div></a></div>`;
	return draw;
}

function setSpoilers() {
	var spoilerCheckbox = document.getElementById(`spoilerCheckbox`);
	if (spoilerCheckbox.checked)
		localStorage.setItem(`wikiSpoilers`, 1);
	else
		localStorage.setItem(`wikiSpoilers`, 0);
	displayChampions();
	if (document.getElementById(`currChamp`).innerHTML>0)
		displayWiki(document.getElementById(`currChamp`).innerHTML);
}

function setUnsticky() {
	var unstickyCheckbox = document.getElementById(`unstickyCheckbox`);
	if (unstickyCheckbox.checked)
		localStorage.setItem(`wikiUnstickyChamps`, 1);
	else
		localStorage.setItem(`wikiUnstickyChamps`, 0);
	let eles = document.getElementsByClassName(`championsList`);
	for (let ele of eles) {
		ele.style.position = (unstickyCheckbox.checked ? `unset` : ``);
	}
}

function displayWiki(i) {
	document.getElementById(`currChamp`).innerHTML = i;
	var champ = data[i];
	var name = champ.name;
	var fName = champ.fName;
	var unknown=`Unknown.`;
	var portrait = `images/${fName}/portraits/portrait.png`;
	if (fName == `nixie`)
		portrait = nixiePortrait();
	if (fName == `spurt`)
		portrait = splatPortrait();
	if (fName == `dungeonmaster`)
		portrait = dmPortrait();
	var portraitExists = champ.portrait;
	var content=(portraitExists?`<p><br /><img src="${portrait}" alt="${name} Portrait"></p>`:``);
	content+=`<h1 id="${fName}">${champ.nameFull}</h1>`;
	content+=`<p>${champ.backstory}</p>`;
	content+=`<h1 id="basic-information">Basic Information</h1>`;
	if (champ.spoiler)
		content+=`<p>${name} will be the new champion in the ${champ.eventName} event on ${champ.eventDate}.</p>`;
	if (champ.stats != undefined)
		content+=createFullStatsTable(champ);
	else
		content+=createSmallStatsTable(champ);
	var formationURL = `images/${fName}/formation/formation.png`;
	var formationExists = champ.formation;
	if (formationExists) {
		content+=`<h1 id="formation">Formation</h1><p><span class="formationBorder"><img src="${formationURL}" alt="Formation Layout" /></span></p>`;
	}
	
	content+=`<h1 id="attacks">Attacks</h1>`;
	if (champ.attacks!=undefined) {
		if (champ.attacks!=undefined) {
			if (champ.attacks.base!=undefined&&champ.attacks.base.length>0) {
				for (let i=0;i<champ.attacks.base.length;i++) {
					var attack = champ.attacks.base[i];
					content+=addAttackData(champ,attack,false);
				}
			}
			if (champ.attacks.ult!=undefined&&champ.attacks.ult.length>0) {
				for (let i=0;i<champ.attacks.ult.length;i++) {
					var attack = champ.attacks.ult[i];
					content+=addAttackData(champ,attack,true);
				}
			}
		}
	} else {
		content+=unknown;
	}
	content+=`<h1 id="abilities">Abilities</h1>`;
	if (champ.abilities!=undefined) {
		if (champ.abilities!=undefined&&champ.abilities.length>0) {
			for (let i=0;i<champ.abilities.length;i++) {
				var ability = champ.abilities[i];
				content+=addAbilityData(champ,ability);
			}
		}
	} else {
		content+=unknown;
	}
	
	content+=`<h1 id="specialisations">Specialisations</h1>`;
	if (champ.specs!=undefined&&champ.specs.length>0) {
		for (let i=0;i<champ.specs.length;i++) {
			var spec = champ.specs[i];
			content+=addAbilityData(champ,spec);
		}
	} else {
		content+=unknown;
	}
	
	content+=`<h1 id="items">Items</h1>`;
	if (champ.items!=undefined&&champ.items.length>0)
		content+=addItemData(champ,champ.items);
	else
		content+=unknown;
	
	content+=`<h1 id="feats">Feats</h1>`;
	if (champ.feats!=undefined&&champ.feats.normal!=undefined)
		content+=addFeatData(champ,champ.feats.normal,false);
	else
		content+=unknown;
	
	if (localStorage.wikiSpoilers==1&&champ.feats!=undefined&&champ.feats.spoilers!=undefined&&champ.feats.spoilers.length>0) {
		content+=`<h1 id="spoilerfeats">Spoiler Feats</h1>`;
		content+=`<p>These are feats that have yet to be released.</p>`;
		content+=addFeatData(champ,champ.feats.spoilers,true);
	}
	
	content+=`<h1 id="legendaries">Legendaries</h1>`;
	if (champ.legs!=undefined) {
		if (champ.legs.effects==undefined||champ.legs.effects.length==0) {
			content+=unknown;
		} else {
			content+=`<ul>`;
			for (let i=0;i<champ.legs.effects.length;i++)
				content+=`<li>${champ.legs.effects[i]}</li>`;
			content+=`</ul>`;
			content+=addLegendaryDropdown(`DPS`,champ.legs.dps);
			content+=addLegendaryDropdown(`Non-DPS`,champ.legs.nondps);
		}
	} else {
		content+=unknown;
	}
	
	content+=`<h1 id="championimages">Champion Images</h1>`;
	if (champ.console||champ.chests!=undefined)
		content+=addChampionImagesData(champ);
	else
		content+=unknown;
	
	content+=`<h1 id="skins">Skin Portraits</h1>`;
	content+=addSkinImages(champ,champ.skins);
	
	content+=`<p><br/><br/><br/><br/><br/><br/></p>`;
	
	document.getElementById(`wikicontent`).innerHTML = content;
}

function createFullStatsTable(champ) {
	return `<p><span class="champStatsTableColumn"><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Seat</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">`+(champ.spoiler?champ.seatSpoiler:champ.seat)+`</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Stat</strong></span></span><span class="champStatsTableStatsHeader"><span style="margin-left:8px;"><strong>Value</strong></span></span><span class="champStatsTableTrialsHeader"><span style="margin-left:8px;"><strong>Day 1 Trials</strong></span></span><span class="champStatsTablePatronsHeader"><span style="margin-left:8px;"><strong>Patrons</strong></span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Species</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.species}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Strength</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:`+calcChampPadding(0,champ)+`px;">${champ.stats[0]}`+(champ.statsFeats[0]>champ.stats[0]?` (${champ.statsFeats[0]} with feat)`:``)+`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">`+calcDay1Trials(0,champ)+`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.patrons[0]}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Class</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.classes}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Dexterity</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:`+calcChampPadding(1,champ)+`px;">${champ.stats[1]}`+(champ.statsFeats[1]>champ.stats[1]?` (${champ.statsFeats[1]} with feat)`:``)+`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">`+calcDay1Trials(1,champ)+`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.patrons[1]}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Roles</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.roles}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Constitution</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:`+calcChampPadding(2,champ)+`px;">${champ.stats[2]}`+(champ.statsFeats[2]>champ.stats[2]?` (${champ.statsFeats[2]} with feat)`:``)+`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">`+calcDay1Trials(2,champ)+`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.patrons[2]}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Age</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.age}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Intelligence</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:`+calcChampPadding(3,champ)+`px;">${champ.stats[3]}`+(champ.statsFeats[3]>champ.stats[3]?` (${champ.statsFeats[3]} with feat)`:``)+`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">`+calcDay1Trials(3,champ)+`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.patrons[3]}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Gender</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">`+(champ.gender==``?`Nonbinary`:champ.gender)+`</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Wisdom</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:`+calcChampPadding(4,champ)+`px;">${champ.stats[4]}`+(champ.statsFeats[4]>champ.stats[4]?` (${champ.statsFeats[4]} with feat)`:``)+`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">`+calcDay1Trials(4,champ)+`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.patrons[4]}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Alignment</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.alignment}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Charisma</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:`+calcChampPadding(5,champ)+`px;">${champ.stats[5]}`+(champ.statsFeats[5]>champ.stats[5]?` (${champ.statsFeats[5]} with feat)`:``)+`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">`+calcDay1Trials(5,champ)+`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;"> </span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Affiliation</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.affiliations}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Total</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:8px;">${champ.totalStats}</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">Champion ID:</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.id}</span></span></span></span></p>`;
}

function createSmallStatsTable(champ) {
	return `<p><span class="champStatsTableColumn"><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Seat</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.seatSpoiler}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Species</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.species}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Class</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.classes}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Roles</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.roles}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Age</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.age}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Gender</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.gender}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Alignment</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.alignment}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Affiliation</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.affiliations}</span></span></span></span></p>`;
}

function addAttackData(champ,attack,ult) {
	var type = ult ? `Ultimate` : `Base`;
	var shortCDtxt = `<p><span style="font-size:1.2em;">ⓘ</span> <em>Note: Very short ultimate cooldowns are almost always for testing purposes and are likely to be increased later.</em></p>`
	var shortCD = ``;
	if (attack.cooldown <= 15 && champ.spoiler && type == `Ultimate`)
		shortCD = shortCDtxt;
	return `<div class="abilityBorder"><div class="abilityBorderInner"><p class="abilityBorderName">`+addAttackImages(champ,attack)+` <strong>${type} Attack: ${attack.name}</strong>`+(attack.damage_types.length>0?`(`+slashSeparate(attack.damage_types,true)+`)`:``)+`</p><blockquote><p>`+(attack.long_description!=undefined&&attack.long_description!=``?attack.long_description:attack.description)+`<br>Cooldown: ${attack.cooldown}s (Cap `+(attack.cooldown*0.25)+`s)</p></blockquote>${shortCD}<details><summary><em>Raw Data</em></summary><p><pre>`+JSON.stringify(attack, null, 4)+`</pre></p></details></div></div>`;
}

function addAbilityData(champ,ability) {
	var prestackPrefix = `<p><span style="font-size:1.2em;">ⓘ</span> <em>Note: This ability `;
	var prestackSuffix = ` prestack.</em></p>`
	var content=`<div class="abilityBorder"><div class="abilityBorderInner"><p class="abilityBorderName">`+addAbilityImages(champ,ability)+` <strong>${ability.name}</strong>`;
	var reqLevel=-1;
	for (let i=0; i<ability.raw.length;i++) {
		if (ability.raw[i].required_level!=undefined) {
			reqLevel=ability.raw[i].required_level;
			break;
		}
	}
	var raw=JSON.stringify(ability.raw, null, 4);
	let prestackText = ``;
	if (ability.prestack!=undefined&&ability.prestack!=``) {
		prestackText += prestackPrefix;
		if (ability.prestack==true)
			prestackText += `is`;
		else if (ability.prestack==`maybe`)
			prestackText += `might be`;
		prestackText += prestackSuffix;
	}
	var desc=ability.desc.replaceAll(`>`,`<br>`);
	content+=(reqLevel>=0?`(Level: ${reqLevel})`:``)+`</p><blockquote><p>${desc}</p></blockquote>${prestackText}<details><summary><em>Raw Data</em></summary><p><pre>`;
	for (let i=0;i<ability.raw.length;i++) {
		content+=JSON.stringify(ability.raw[i], null, 4);
		if (i<ability.raw.length-1)
			content+=`,<br/>`;
	}
	content+=`</pre></p></details></div></div>`;
	return content;
}

function addItemData(champ,slots) {
	var small=(slots[0].effect==undefined);
	var content=`<p><span class="itemTableColumn"><span class="itemTableRowHeader"><span class="itemTableIcon" style="justify-content:flex-start"><span style="margin-left:8px;"><strong>Icons</strong></span></span>`;
	if (small) {
		content+=`<span class="itemTableNameSmall"><span><strong>Name</strong></span></span>`;
	} else {
		content+=`<span class="itemTableSlot"><span><strong>Slot</strong></span></span><span class="itemTableName"><span><strong>Epic Name</strong></span></span><span class="itemTableEffect"><span style="padding:0 8px"><strong>Effect</strong></span></span>`;
	}
	content+=`</span>`;
	var longName = 0;
	for (let i=0;i<slots.length;i++) {
		var slot=slots[i];
		content+=`<span class="itemTableRow"><span class="itemTableIcon">`;
		for (let k=0;k<slot.items.length;k++) {
			var item=slot.items[k];
			var tt=addItemTooltipData(item,slot.ge);
			content+=`<span class="itemTableIcon`+(k+1)+`"><img src="images/${champ.fName}/items/${item.graphicId}.png" alt="${item.name} Icon"/>${tt}</span>`;
			if (item.name.length>longName)
				longName=item.name.length;
		}
		content += `<span class="itemTableGE"${slot.ge?'':' style="background-color:unset"'}>&nbsp;</span>`;
		content+=`</span>`;
		if (small) {
			content+=`<span class="itemTableNameSmall"><span>${item.name}</span></span>`;
		} else {
			var effect=slot.effect;
			if (slot.caps!=undefined&&slot.caps.length==3)
				effect+=`<br/><span style="font-size:0.8em;color:var(--mid1)">Cap: `+(slot.caps[0]+1)+` dull / `+(slot.caps[1]+1)+` shiny / `+(slot.caps[2]+1)+` golden.</span>`;
			content+=`<span class="itemTableSlot"><span>`+(i+1)+`</span></span><span class="itemTableName"><span>${item.name}</span></span><span class="itemTableEffect"><span>${effect}</span></span>`;
		}
		content+=`</span>`;
	}
	content+=`</p>`;
	if (!small) {
		longName+=2;
		content+=`<details><summary><em>Item Names and Descriptions</em></summary><p><pre>`;
		for (let i=0;i<slots.length;i++) {
			var slot=slots[i];
			if (i>0)
				content+=`<br/>`;
			content+=`Slot: `+(i+1)+`<br/>`;
			for (let k=0;k<slot.items.length;k++) {
				var item=slot.items[k];
				content+=splitItemDescription((`${item.name}:`).padStart(longName-1),item.description,longName);
				content+=`<br/>`;
			}
		}
	}
	content+=`</pre></p></details>`;
	return content;
}

function addItemTooltipData(item,ge) {
	let tt=`<span class="itemTooltipContents">ID: ${item.id}<strong>${item.name}</strong>${item.description}`;
	if (item.effects!=undefined&&item.effects.length>0) {
		tt+=`<code>`;
		for (let i=0;i<item.effects.length;i++) {
			if (i>0)
				tt+=`<br>`;
			tt+=item.effects[i];
		}
		tt+=`<br>allow_ge:${ge==undefined?false:(ge?true:false)}`;
		tt+=`</code>`;
	}
	tt+=`</span>`;
	return tt;
}

function addFeatData(champ,feats,spoils) {
	var content=`<p><span class="featTableColumn">`;
	content+=`<span class="featTableRowHeader"><span class="featTableIcon1"><span class="featTableInner"><strong>Feat</strong></span></span><span class="featTableEffect"><span class="featTableInner"><strong>Effect</strong></span></span><span class="featTableSource"><span class="featTableInner"><strong>Source</strong></span></span>`+(spoils?`<span class="featTableDate"><span class="featTableInner"><strong>Date</strong></span></span>`:``)+`</span>`;
	for (let i=0;i<feats.length;i++) {
		var feat=feats[i];
		var tt=addFeatTooltipData(feat);
		content+=`<span class="featTableRow"><span class="featTableIcon${feat.rarity}"><img src="images/feats/${feat.graphicId}.png" alt="${feat.name} Icon" />${tt}${feat.name}</span><span class="featTableEffect"><span class="featTableInner">${feat.effect}</span></span><span class="featTableSource"><span class="featTableInner">${feat.source}</span></span>`+(spoils?`<span class="featTableDate"><span class="featTableInner"><strong>`+(feat.date!=undefined?feat.date:`???`)+`</strong></span></span>`:``)+`</span>`;
	}
	content+=`</span></p>`;
	return content;
}

function addFeatTooltipData(feat) {
	let tt=`<span class="featTooltipContents"><strong>${feat.name}</strong>${feat.desc}`;
	if (feat.effects!=undefined&&feat.effects.length>0) {
		tt+=`<code>`;
		for (let i=0;i<feat.effects.length;i++) {
			if (i>0)
				tt+=`<br>`;
			tt+=feat.effects[i];
		}
		tt+=`</code>`;
	}
	tt+=`</span>`;
	return tt;
}

function addLegendaryDropdown(legsType,legsApplic) {
	if (legsApplic==undefined)
		return ``;
	var content=`<details><summary><em>${legsType} Applicable</em></summary><p><pre>`;
	legsApplic=sortArray(legsApplic);
	var names = Object.keys(legsApplic);
	var longName = 0;
	for (let i=0;i<names.length;i++)
		if (names[i].length > longName)
			longName=names[i].length;
	for (let i=0;i<names.length;i++) {
		content+=names[i].padStart(longName)+`: `;
		var applicables=legsApplic[names[i]];
		if (typeof(applicables)==`string`||typeof(applicables)==`number`)
			content+=applicables;
		else
			content+=applicables[0];
		content+=` / 6`;
		if (typeof(applicables)!=`string`&&typeof(applicables)!=`number`)
			content+= ` (Potentially ${applicables[1]} / 6)`;
		content+=`<br/>`;
	}
	content+=`</pre></p></details>`;
	return content;
}

function addChampionImagesData(champ) {
	var content=`<p><span class="championImagesColumn">`;
	if (champ.console)
		content+=`<span class="championImagesRow"><span class="championImagesPortrait"><img src="images/${champ.fName}/portraits/console.png" alt="${champ.name} Console Portrait" />Console Portait</span></span>`;
	if (champ.chests!=undefined) {
		content+=`<span class="championImagesRow">`
		if (champ.chests.gold)
			content+=`<span class="championImagesChests"><img src="images/${champ.fName}/chests/gold.png" alt="${champ.name} Gold Chest Icon" />Gold Chest Icon</span>`;
		if (champ.chests.silver)
			content+=`<span class="championImagesChests"><img src="images/${champ.fName}/chests/silver.png" alt="${champ.name} Silver Chest Icon" />Silver Chest Icon</span>`;
		content+=`</span>`;
	}
	content+=`</span></p>`;
	return content;
}

function addSkinImages(champ,skins) {
	var content=`<p><span class="skinsPortraitsRow">`;
	var spoiler=content;
	var addedspoiler=false;
	content+=`<span class="skinsPortraitsImage"><img src="images/${champ.fName}/portraits/portrait.png" alt="${champ.name} No Skin Portrait" />No Skin</span>`;
	for (let i=0; i<skins.length; i++) {
		var skin=skins[i];
		var crayon=addCrayonEegg(champ,skin);
		var crossedOut=(crayon==``?``:` crossedOut`);
		var skintxt=`<span class="skinsPortraitsImage${crossedOut}"><img src="images/${champ.fName}/skins/${skin.id}.png" alt="${champ.name} ${skin.name} Portrait" />${skin.name}${crayon}</span>`;
		if (skin.spoiler!=undefined&&skin.spoiler) {
			spoiler+=skintxt;
			if (!addedspoiler) addedspoiler=true;
		} else {
			content+=skintxt;
		}
	}
	if (addedspoiler&&localStorage.wikiSpoilers==1) {
		content+=`</span></p><h1 id="skinsSpoilers">Spoiler Skin Portraits</h1>`;
		content+=spoiler;
	}
	content+=`</span></p>`;
	return content;
}

function addCrayonEegg(champ,skin) {
	let pref=`<span class="crayon">`;
	let suff=`</span>`;
	if (champ.name==`Catti-brie`&&skin.name==`Dwarf Glitch`)
		return `${pref}Cattastro-brie${suff}`;
	return ``;
}

function useableDesc(thing) {
	if (thing!=undefined && typeof(thing)==`string` && thing!=``)
		return true;
	return false;
}

function parseEffects(abilities) {
	var es=`effect_string`;
	var effects=[];
	customFilter(abilities,effects);
	return effects;
}

function customFilter(object, result){
	if(object==null)
		return;
	
    if(object.hasOwnProperty(`effect_string`))
		result.push(object.effect_string);

    for(var i=0;i<Object.keys(object).length;i++)
        if(typeof object[Object.keys(object)[i]] == `object`)
            customFilter(object[Object.keys(object)[i]], result);
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
	if (champ.special!=undefined&&champ.special.forced!=undefined&&champ.special.forced)
		return `Yes (Forced)`;
	if (champ.special!=undefined&&champ.special.forceIfOthers!=undefined&&champ.special.forceIfOthers.trials!=undefined)
		return champ.special.forceIfOthers.trials[stat];
	var restr = trialsDay1[stat];
	var statNorm = champ.stats[stat];
	var statFeat = champ.statsFeats[stat];
	if (statFeat >= restr) {
		var result = `Yes`;
		if (statNorm < restr)
			return result+withFeat;
		return result;
	}
	return `-`;
}

function calcChampPadding(stat, champ) {
	var statVal = champ.stats[stat];
	if (statVal < 10)
		return 16;
	return 8;
}

function addFormation(fName) {
	var content = ``;
	var image = `images/${fName}/formation.png`;
	var http = new XMLHttpRequest();
	http.open('HEAD', image, false);
	http.send();
	if (http.status === 200) {
		content+=`<h1 id="formation">Formation</h1>`;
		content+=`<p><img src="${image}" alt="Formation Layout" /></p>`;
	}
	return content;
}

function addAttackImages(champ,attack) {
	if (attack.graphic_id != undefined && attack.graphic_id > 0)
		return `<img src="images/${champ.fName}/attacks/${attack.id}.png" alt="${attack.name} Icon">`;
	var images = ``;
	for (let i=0;i<attack.damage_types.length;i++) {
		let dmg = attack.damage_types[i];
		images+=`<img src="images/${dmg}.png" alt="`+capitalise(dmg)+` Damage Icon">`;
	}
	return images;
}

function addAbilityImages(champ,ability) {
	var graphicId = ability.graphicId;
	var reqLevel = -3;
	for (let i=0;i<ability.raw.length;i++)
		if (ability.raw[i].required_level!=undefined)
			reqLevel = ability.raw[i].required_level;
	if (ability.raw.length==2 && ability.graphicId>0 && reqLevel>0)
		return `<img src="images/${champ.fName}/abilities/${ability.id}.png" alt="${ability.name} Icon">`;
	return ``;
}

function splitItemDescription(start,description,longName) {
	var limit=95;
	var spacing=``.padStart(longName);
	var desc=description.split(` `);
	var retVal=``;
	var line=start;
	var i=0;
	var first=true;
	while (i<desc.length) {
		if (line.length+1+desc[i].length<=limit) {
			line+=(line!=``?` `:``)+desc[i];
		} else {
			retVal+=(retVal!=``?`<br/>`:``)+line;
			line=spacing+desc[i];
		}
		first=false;
		i++;
	}
	retVal+=(retVal!=``?`<br/>`:``)+line;
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
	var output = ``;
	for (let i=0;i<inputArr.length;i++) {
		if (i > 0)
			output += ` / `;
		if (capsFirstLetter)
			output+=capitalise(inputArr[i]);
		else
			output+=inputArr[i];
	}
	return output;
}

async function sha256(source) {
    var sourceBytes = new TextEncoder().encode(source);
    var digest = await crypto.subtle.digest(`SHA-256`, sourceBytes);
    var resultBytes = [...new Uint8Array(digest)];
    return resultBytes.map(x => x.toString(16).padStart(2, '0')).join(``);
}

function runNameEeggs(nameShort) {
	var apo = `'`;
	if (nameShort.includes(apo)) {
		nameShort = nameShort.replaceAll(apo,``);
		nameShort = ins(nameShort,randInt(1,nameShort.length-1),apo);
	}
	if (nameShort == `Corazón` || nameShort == `Côrăžón`)
		nameShort = randInt(1,4) == 3 ? `Côrăžón` : `Corazón`;
	if (nameShort == `Torogar` || nameShort == `Totoro`)
		nameShort = randInt(1,8) == 7 ? `Totoro` : `Torogar`;
	return nameShort;
}

function isNixieBlue() {
	if (randInt(1,4) == 2)
		return true;
	return false;
}

function nixiePortrait() {
	var prefix = `images/nixie/portraits/portrait`;
	if (nixieBlue)
		prefix+=`Blue`;
	return `${prefix}.png`;
}

function isSplatGhost() {
	if (randInt(1,4) == 3)
		return true;
	return false;
}

function splatPortrait() {
	var prefix = `images/spurt/portraits/portrait`;
	if (splatGhost)
		prefix+=`Ghost3`;
	return `${prefix}.png`;
}

function isDMUni() {
	if (randInt(1,4) == 4)
		return true;
	return false;
}

function dmPortrait() {
	var prefix = `images/dm/portraits/portrait`;
	if (dmUni)
		prefix+=`Uni`;
	return `${prefix}.png`;
}

function compress(input) {
	return LZString.compress(input);
}

function decompress(input) {
	return LZString.decompress(input);
}