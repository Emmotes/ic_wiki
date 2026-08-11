const v=2.002; // prettier-ignore
const LSKEY_data = `wikiData`;
const LSKEY_spoilers = `wikiSpoilers`;
const LSKEY_unsticky = `wikiUnstickyChamps`;
const trialsDay1 = [9, 12, 12, 10, 10, 11];
const withFeat = ` (with Feat)`;
const nixieBlue = isNixieBlue();
const splatGhost = isSplatGhost();
const dmUni = isDMUni();
const numForm = new Intl.NumberFormat(undefined, {
	useGrouping: true,
	maximumFractionDigits: 2,
});
const sciNoteForm = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 2,
	minimumFractionDigits: 2,
	notation: "scientific",
});
let data;
let version;

async function loadDataVersion() {
	const response = await fetch(`championDataVersion.json`)
		.then((response) => response.text())
		.catch((err) => console.log(err));
	return await JSON.parse(response);
}

async function loadLocalData() {
	const response = await fetch(`championData.json`)
		.then((response) => response.text())
		.catch((err) => console.log(err));
	if (ls_get(LSKEY_data, null) != null) {
		console.log("Removing old wikiData so the new stuff can go there.");
		ls_remove(LSKEY_data);
	}
	const compressed = await compress(response);
	await ls_set_string(LSKEY_data, compressed, null);
}

async function init() {
	// Migrate old localStorage data to new keys.
	// Unsticky never had old keys.
	if (ls_get(`spoilers`, null)) {
		console.log("Cleaning up old localStorage spoilers location.");
		ls_remove(`spoilers`);
	}
	if (ls_get(`data`, null)) {
		console.log("Cleaning up old localStorage data location.");
		ls_remove(`data`);
	}

	// Init the data.
	if (!ls_get(LSKEY_data, null)) await loadLocalData();
	await parseJSON();

	const latestVersion = (await loadDataVersion()).sha256;
	if (version !== latestVersion) {
		console.log(
			`localStorage version mismatch. Updating.\r\n\tlocalStorage: ${version}\r\n\t   on server: ${latestVersion}`,
		);
		await loadLocalData();
		await parseJSON();
	}

	// Set spoiler checkbox to checked if spoilers are set.
	document.getElementById(`spoilerCheckbox`).checked = getSpoilersSetting();
	updateSpoilers();
	// Set unsticky champions checkbox to checked if unsticky champions is set.
	document.getElementById(`unstickyCheckbox`).checked = getUnstickySetting();
	updateUnsticky();

	// Display the champions.
	displayChampions();
}

async function parseJSON() {
	let decompressed = decompress(ls_get(LSKEY_data, null));
	try {
		data = JSON.parse(decompressed).data;
	} catch (_) {
		console.log(
			`Caught an error with localStorage data. Taking the nuclear option.`,
		);
		ls_remove(LSKEY_data);
		console.log(`Nuked the localStorage - downloading the data again.`);
		await loadLocalData();
		decompressed = decompress(ls_get(LSKEY_data, null));
		data = JSON.parse(decompressed).data;
	}
	version = await sha256(decompressed);
}

function displayChampions() {
	const spoilers = getSpoilersSetting();
	for (let i = 0; i <= 12; i++) {
		let seatTitle =
			`<div class="seatTitle">` +
			(i === 0 ? `Spoilers` : `Seat ${i}`) +
			`</div>`;
		if (i === 0 && !spoilers) seatTitle = ``;
		document.getElementById(`seat${i}`).innerHTML = seatTitle;
	}
	for (let i = 0; i < data.length; i++) {
		const champ = data[i];
		if ((spoilers && champ.spoiler) || !champ.spoiler) {
			let currSeat = document.getElementById(
				`seat${champ.seat}`,
			).innerHTML;
			currSeat += drawChampion(i, champ);
			document.getElementById(`seat${champ.seat}`).innerHTML = currSeat;
		}
	}
}

function drawChampion(i, champ) {
	const fName = champ.fName;
	let nameShort = champ.nameShort;
	nameShort = runNameEeggs(nameShort);
	let portrait = `images/unknown.png`;
	if (champ.portrait != null && champ.portrait)
		portrait = `images/${fName}/portraits/portrait.png`;
	if (fName === `nixie`) portrait = nixiePortrait();
	if (fName === `spurt`) portrait = splatPortrait();
	if (fName === `dungeonmaster`) portrait = dmPortrait();
	const draw = `<div class="championHolder" id="${fName}"><a onclick="displayWiki(${i})" id="link_${fName}" href="#"><div class="champion" style="background-image:url(${portrait}); background-size:61px; background-repeat: no-repeat;" id="div_${fName}"><div class="championName">${nameShort}</div></div></a></div>`;
	return draw;
}

function onSpoilersChange(checked) {
	setSpoilersSetting(checked);
	updateSpoilers();
}

function updateSpoilers() {
	const spoilerCheckbox = document.getElementById(`spoilerCheckbox`);
	if (!spoilerCheckbox) return;
	displayChampions();
	if (document.getElementById(`currChamp`).innerHTML > 0)
		displayWiki(document.getElementById(`currChamp`).innerHTML);
}

function onUnstickyChange(checked) {
	setUnstickySetting(checked);
	updateUnsticky();
}

function updateUnsticky() {
	const unstickyCheckbox = document.getElementById(`unstickyCheckbox`);
	if (!unstickyCheckbox) return;
	const eles = document.getElementsByClassName(`championsList`);
	for (const ele of eles)
		ele.style.position = unstickyCheckbox.checked ? `unset` : ``;
}

function displayWiki(i) {
	document.getElementById(`currChamp`).innerHTML = i;
	const champ = data[i];
	const name = champ.name;
	const fName = champ.fName;
	const unknown = `Unknown.`;
	let portrait = `images/${fName}/portraits/portrait.png`;
	if (fName === `nixie`) portrait = nixiePortrait();
	if (fName === `spurt`) portrait = splatPortrait();
	if (fName === `dungeonmaster`) portrait = dmPortrait();
	const portraitExists = champ.portrait;
	let content =
		portraitExists ?
			`<p><br /><img src="${portrait}" alt="${name} Portrait"></p>`
		:	``;
	content += `<h1 id="${fName}">${champ.nameFull}</h1>`;
	content += `<p>${champ.backstory.replace(/\[([^\]]+)\]\(([^)]+)\)/gm, '<br><br><a href="$2" target="_blank">$1</a>')}</p>`;
	content += `<h1 id="basic-information">Basic Information</h1>`;
	if (champ.spoiler)
		content += `<p>${name} will be the new champion in the ${champ.eventName} event on ${champ.eventDate}.</p>`;
	if (champ.stats != null) content += createFullStatsTable(champ);
	else content += createSmallStatsTable(champ);
	const formationURL = `images/${fName}/formation/formation.png`;
	const formationExists = champ.formation;
	if (formationExists) {
		content += `<h1 id="formation">Formation</h1><p><span class="formationBorder"><img src="${formationURL}" alt="Formation Layout" /></span></p>`;
	}

	content += `<h1 id="attacks">Attacks</h1>`;
	if (champ.attacks != null) {
		if (champ.attacks != null) {
			if (champ.attacks.base != null && champ.attacks.base.length > 0) {
				for (let i = 0; i < champ.attacks.base.length; i++) {
					const attack = champ.attacks.base[i];
					content += addAttackData(champ, attack, false);
				}
			}
			if (champ.attacks.ult != null && champ.attacks.ult.length > 0) {
				for (let i = 0; i < champ.attacks.ult.length; i++) {
					const attack = champ.attacks.ult[i];
					content += addAttackData(champ, attack, true);
				}
			}
		}
	} else {
		content += unknown;
	}
	content += `<h1 id="abilities">Abilities</h1>`;
	if (champ.abilities != null) {
		if (champ.abilities != null && champ.abilities.length > 0) {
			for (let i = 0; i < champ.abilities.length; i++) {
				const ability = champ.abilities[i];
				content += addAbilityData(champ, ability);
			}
		}
	} else {
		content += unknown;
	}

	content += `<h1 id="specialisations">Specialisations</h1>`;
	if (champ.specs != null && champ.specs.length > 0) {
		for (let i = 0; i < champ.specs.length; i++) {
			const spec = champ.specs[i];
			content += addAbilityData(champ, spec);
		}
	} else {
		content += unknown;
	}

	content += `<h1 id="items">Items</h1>`;
	if (champ.items != null && champ.items.length > 0)
		content += addItemData(champ, champ.items);
	else content += unknown;

	content += `<h1 id="feats">Feats</h1>`;
	if (champ.feats != null && champ.feats.normal != null)
		content += addFeatData(champ, champ.feats.normal, false);
	else content += unknown;

	if (
		getSpoilersSetting() &&
		champ.feats != null &&
		champ.feats.spoilers != null &&
		champ.feats.spoilers.length > 0
	) {
		content += `<h1 id="spoilerfeats">Spoiler Feats</h1>`;
		content += `<p>These are feats that have yet to be released.</p>`;
		content += addFeatData(champ, champ.feats.spoilers, true);
	}

	content += `<h1 id="legendaries">Legendaries</h1>`;
	if (champ.legs != null) {
		if (champ.legs.effects == null || champ.legs.effects.length === 0) {
			content += unknown;
		} else {
			content += `<ul>`;
			for (let i = 0; i < champ.legs.effects.length; i++)
				content += `<li>${champ.legs.effects[i]}</li>`;
			content += `</ul>`;
			content += addLegendaryDropdown(`DPS`, champ.legs.dps);
			content += addLegendaryDropdown(`Non-DPS`, champ.legs.nondps);
		}
	} else {
		content += unknown;
	}

	content += `<h1 id="championimages">Champion Images</h1>`;
	if (champ.console || champ.chests != null)
		content += addChampionImagesData(champ);
	else content += unknown;

	content += `<h1 id="skins">Skin Portraits</h1>`;
	content += addSkinImages(champ, champ.skins);

	content += `<p><br/><br/><br/><br/><br/><br/></p>`;

	document.getElementById(`wikicontent`).innerHTML = content;
}

function createFullStatsTable(champ) {
	return (
		`<p><span class="champStatsTableColumn"><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Seat</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">` +
		(champ.spoiler ? champ.seatSpoiler : champ.seat) +
		`</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Stat</strong></span></span><span class="champStatsTableStatsHeader"><span style="margin-left:8px;"><strong>Value</strong></span></span><span class="champStatsTableTrialsHeader"><span style="margin-left:8px;"><strong>Day 1 Trials</strong></span></span><span class="champStatsTablePatronsHeader"><span style="margin-left:8px;"><strong>Patrons</strong></span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Species</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.species}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Strength</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:` +
		calcChampPadding(0, champ) +
		`px;">${champ.stats[0]}` +
		(champ.statsFeats[0] > champ.stats[0] ?
			` (${champ.statsFeats[0]} with feat)`
		:	``) +
		`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">` +
		calcDay1Trials(0, champ) +
		`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.patrons[0]}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Class</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.classes}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Dexterity</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:` +
		calcChampPadding(1, champ) +
		`px;">${champ.stats[1]}` +
		(champ.statsFeats[1] > champ.stats[1] ?
			` (${champ.statsFeats[1]} with feat)`
		:	``) +
		`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">` +
		calcDay1Trials(1, champ) +
		`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.patrons[1]}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Roles</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.roles}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Constitution</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:` +
		calcChampPadding(2, champ) +
		`px;">${champ.stats[2]}` +
		(champ.statsFeats[2] > champ.stats[2] ?
			` (${champ.statsFeats[2]} with feat)`
		:	``) +
		`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">` +
		calcDay1Trials(2, champ) +
		`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.patrons[2]}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Age</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.age}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Intelligence</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:` +
		calcChampPadding(3, champ) +
		`px;">${champ.stats[3]}` +
		(champ.statsFeats[3] > champ.stats[3] ?
			` (${champ.statsFeats[3]} with feat)`
		:	``) +
		`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">` +
		calcDay1Trials(3, champ) +
		`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.patrons[3]}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Gender</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">` +
		(champ.gender === `` ? `Nonbinary` : champ.gender) +
		`</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Wisdom</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:` +
		calcChampPadding(4, champ) +
		`px;">${champ.stats[4]}` +
		(champ.statsFeats[4] > champ.stats[4] ?
			` (${champ.statsFeats[4]} with feat)`
		:	``) +
		`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">` +
		calcDay1Trials(4, champ) +
		`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.patrons[4]}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Alignment</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.alignment}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Charisma</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:` +
		calcChampPadding(5, champ) +
		`px;">${champ.stats[5]}` +
		(champ.statsFeats[5] > champ.stats[5] ?
			` (${champ.statsFeats[5]} with feat)`
		:	``) +
		`</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">` +
		calcDay1Trials(5, champ) +
		`</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;"> </span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Affiliation</strong>:</span></span><span class="champStatsTableInfo"><span style="margin-left:8px;">${champ.affiliations}</span></span><span class="champStatsTableStatHeader"><span style="margin-right:4px;"><strong>Total</strong>:</span></span><span class="champStatsTableStats"><span style="margin-left:8px;">${champ.totalStats}</span></span><span class="champStatsTableTrials"><span style="margin-left:8px;">Champion ID:</span></span><span class="champStatsTablePatrons"><span style="margin-left:8px;">${champ.id}</span></span></span></span></p>`
	);
}

function createSmallStatsTable(champ) {
	return `<p><span class="champStatsTableColumn"><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Seat</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.seatSpoiler}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Species</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.species}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Class</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.classes}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Roles</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.roles}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Age</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.age}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Gender</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.gender}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Alignment</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.alignment}</span></span></span><span class="champStatsTableRow"><span class="champStatsTableInfoHeader"><span style="margin-right:4px;"><strong>Affiliation</strong>:</span></span><span class="champStatsTableInfoSmall"><span style="margin-left:8px;">${champ.affiliations}</span></span></span></span></p>`;
}

function addAttackData(champ, attack, ult) {
	const type = ult ? `Ultimate` : `Base`;
	const shortCDtxt = `<p><span style="font-size:1.2em;">ⓘ</span> <em>Note: Very short ultimate cooldowns are almost always for testing purposes and are likely to be increased later.</em></p>`;
	let shortCD = ``;
	if (attack.cooldown <= 15 && champ.spoiler && type === `Ultimate`)
		shortCD = shortCDtxt;
	return (
		`<div class="abilityBorder"><div class="abilityBorderInner"><p class="abilityBorderName">` +
		addAttackImages(champ, attack) +
		` <strong>${type} Attack: ${attack.name}</strong>` +
		(attack.damage_types.length > 0 ?
			`(` + slashSeparate(attack.damage_types, true) + `)`
		:	``) +
		`</p><blockquote><p>` +
		(attack.long_description != null && attack.long_description !== `` ?
			attack.long_description
		:	attack.description) +
		`<br>Cooldown: ${attack.cooldown}s (Cap ` +
		attack.cooldown * 0.25 +
		`s)</p></blockquote>${shortCD}<details><summary><em>Raw Data</em></summary><p><pre>` +
		JSON.stringify(attack, null, 4) +
		`</pre></p></details></div></div>`
	);
}

function addAbilityData(champ, ability) {
	const prestackPrefix = `<p><span style="font-size:1.2em;">ⓘ</span> <em>Note: This ability `;
	const prestackSuffix = ` prestack.</em></p>`;
	let content =
		`<div class="abilityBorder"><div class="abilityBorderInner"><p class="abilityBorderName">` +
		addAbilityImages(champ, ability) +
		` <strong>${dealWithColours(ability.name)}</strong>`;
	let reqLevel = -1;
	for (let i = 0; i < ability.raw.length; i++) {
		if (ability.raw[i].required_level != null) {
			reqLevel = ability.raw[i].required_level;
			break;
		}
	}
	let prestackText = ``;
	if (ability.prestack != null && ability.prestack !== ``) {
		prestackText += prestackPrefix;
		if (ability.prestack === true) prestackText += `is`;
		else if (ability.prestack === `maybe`) prestackText += `might be`;
		prestackText += prestackSuffix;
	}
	let desc = ability.desc.replaceAll(`>`, `<br>`);
	desc = dealWithColours(desc);
	content +=
		(reqLevel >= 0 ? `(Level: ${reqLevel})` : ``) +
		`</p><blockquote><p>${desc}</p></blockquote>${prestackText}`;

	if (ability.upgrades != null) {
		let upgradeContents = ``;
		let longL = 5;
		let longE = 6;
		const upgrades = sortArray(ability.upgrades);
		for (const level in upgrades) {
			const lvlLen = nf(level).length;
			const effLen = nf(upgrades[level]).length;
			if (lvlLen > longL) longL = lvlLen;
			if (effLen > longE) longE = effLen;
		}
		longE += 1;
		upgradeContents += addUpgradeDataLine(
			`Level`,
			`Effect`,
			`Cumulative`,
			longL,
			longE,
		);
		let mult = 1;
		for (const level in upgrades) {
			const amount = Number(upgrades[level] ?? -1);
			if (amount <= 0) continue;
			const currMult = amount / 100 + 1;
			mult *= currMult;
			upgradeContents += addUpgradeDataLine(
				nf(level),
				`${nf(upgrades[level])}%`,
				mult,
				longL,
				longE,
			);
		}
		content += addDetailsBlock(`Upgrade Data`, upgradeContents);
	}

	let rawContents = ``;
	for (let i = 0; i < ability.raw.length; i++) {
		rawContents += JSON.stringify(ability.raw[i], null, 4);
		if (i < ability.raw.length - 1) rawContents += `,<br/>`;
	}

	content += addDetailsBlock(`Raw Data`, rawContents);
	content += `</div></div>`;
	return content;
}

function addUpgradeDataLine(level, effect, cumulative, longLevel, longEffect) {
	return (
		level.padStart(longLevel) +
		`    ` +
		effect.padStart(longEffect) +
		`    ` +
		(typeof cumulative === "number" ?
			sn((cumulative - 1) * 100) + "%"
		:	cumulative).padStart(10) +
		`<br/>`
	);
}

function addDetailsBlock(title, contents) {
	return `<details><summary><em>${title}</em></summary><p><pre>${contents}</pre></p></details>`;
}

function addItemData(champ, slots) {
	const small = slots[0].effect == null;
	let content = `<p><span class="itemTableColumn"><span class="itemTableRowHeader"><span class="itemTableIcon" style="justify-content:flex-start"><span style="margin-left:8px;"><strong>Icons</strong></span></span>`;
	if (small)
		content += `<span class="itemTableNameSmall"><span><strong>Name</strong></span></span>`;
	else
		content += `<span class="itemTableSlot"><span><strong>Slot</strong></span></span><span class="itemTableName"><span><strong>Epic Name</strong></span></span><span class="itemTableEffect"><span style="padding:0 8px"><strong>Effect</strong></span></span>`;
	content += `</span>`;
	let longName = 0;
	for (let i = 0; i < slots.length; i++) {
		const slot = slots[i];
		content += `<span class="itemTableRow"><span class="itemTableIcon">`;
		for (let k = 0; k < slot.items.length; k++) {
			const item = slot.items[k];
			const tt = addItemTooltipData(item, slot.ge);
			content +=
				`<span class="itemTableIcon` +
				(k + 1) +
				`"><img src="images/${champ.fName}/items/${item.graphicId}.png" alt="${item.name} Icon"/>${tt}</span>`;
			if (item.name.length > longName) longName = item.name.length;
		}
		content += `<span class="itemTableGE"${slot.ge ? "" : ' style="background-color:unset"'}>&nbsp;</span>`;
		content += `</span>`;

		const lastItem = slot.items[slot.items.length - 1];
		if (small) {
			content += `<span class="itemTableNameSmall"><span>${lastItem.name}</span></span>`;
		} else {
			let effect = slot.effect;
			if (slot.caps && slot.caps.length === 3)
				effect +=
					`<br/><span style="font-size:0.8em;color:var(--mid1)">Cap: ` +
					(slot.caps[0] + 1) +
					` dull / ` +
					(slot.caps[1] + 1) +
					` shiny / ` +
					(slot.caps[2] + 1) +
					` golden.</span>`;
			content +=
				`<span class="itemTableSlot"><span>` +
				(i + 1) +
				`</span></span><span class="itemTableName"><span>${lastItem.name}</span></span><span class="itemTableEffect"><span>${effect}</span></span>`;
		}
		content += `</span>`;
	}
	content += `</p>`;
	if (!small) {
		longName += 2;
		let rawContents = ``;
		for (let i = 0; i < slots.length; i++) {
			const slot = slots[i];
			if (i > 0) rawContents += `<br/>`;
			rawContents += `Slot: ` + (i + 1) + `<br/>`;
			for (let k = 0; k < slot.items.length; k++) {
				const item = slot.items[k];
				rawContents += splitItemDescription(
					`${item.name}:`.padStart(longName - 1),
					item.description,
					longName,
				);
				rawContents += `<br/>`;
			}
		}
		content += addDetailsBlock(`Item Names and Descriptions`, rawContents);
	}
	return content;
}

function addItemTooltipData(item, ge) {
	let tt = `<span class="itemTooltipContents">ID: ${item.id}<strong>${item.name}</strong>${item.description}`;
	if (item.effects != null && item.effects.length > 0) {
		tt += `<code>`;
		for (let i = 0; i < item.effects.length; i++) {
			if (i > 0) tt += `<br>`;
			tt += item.effects[i];
		}
		tt += `<br>allow_ge:${
			ge == null ? false
			: ge ? true
			: false
		}`;
		tt += `</code>`;
	}
	tt += `</span>`;
	return tt;
}

function addFeatData(champ, feats, spoils) {
	let content = `<p><span class="featTableColumn">`;
	content +=
		`<span class="featTableRowHeader"><span class="featTableIcon1"><span class="featTableInner"><strong>Feat</strong></span></span><span class="featTableEffect"><span class="featTableInner"><strong>Effect</strong></span></span><span class="featTableSource"><span class="featTableInner"><strong>Source</strong></span></span>` +
		(spoils ?
			`<span class="featTableDate"><span class="featTableInner"><strong>Date</strong></span></span>`
		:	``) +
		`</span>`;
	for (let i = 0; i < feats.length; i++) {
		const feat = feats[i];
		const tt = addFeatTooltipData(feat);
		content +=
			`<span class="featTableRow"><span class="featTableIcon${feat.rarity}"><img src="images/feats/${feat.graphicId}.png" alt="${feat.name} Icon" />${tt}${feat.name}</span><span class="featTableEffect"><span class="featTableInner">${feat.effect}</span></span><span class="featTableSource"><span class="featTableInner">${feat.source}</span></span>` +
			(spoils ?
				`<span class="featTableDate"><span class="featTableInner"><strong>` +
				(feat.date != null ? feat.date : `???`) +
				`</strong></span></span>`
			:	``) +
			`</span>`;
	}
	content += `</span></p>`;
	return content;
}

function addFeatTooltipData(feat) {
	const id = feat.id != null ? `ID: ${feat.id}` : ``;
	let tt = `<span class="featTooltipContents">${id}<strong>${feat.name}</strong>${feat.desc}`;
	if (feat.effects != null && feat.effects.length > 0) {
		tt += `<code>`;
		for (let i = 0; i < feat.effects.length; i++) {
			if (i > 0) tt += `<br>`;
			tt += feat.effects[i];
		}
		tt += `</code>`;
	}
	tt += `</span>`;
	return tt;
}

function addLegendaryDropdown(legsType, legsApplic) {
	if (legsApplic == null) return ``;
	legsApplic = sortArray(legsApplic);
	const names = Object.keys(legsApplic);
	let longName = 0;
	let rawContent = ``;
	for (let i = 0; i < names.length; i++)
		if (names[i].length > longName) longName = names[i].length;
	for (let i = 0; i < names.length; i++) {
		rawContent += names[i].padStart(longName) + `: `;
		const applicables = legsApplic[names[i]];
		if (typeof applicables === `string` || typeof applicables === `number`)
			rawContent += applicables;
		else rawContent += applicables[0];
		rawContent += ` / 6`;
		if (typeof applicables !== `string` && typeof applicables !== `number`)
			rawContent += ` (Potentially ${applicables[1]} / 6)`;
		rawContent += `<br/>`;
	}
	return addDetailsBlock(`${legsType} Applicable`, rawContent);
}

function addChampionImagesData(champ) {
	let content = `<p><span class="championImagesColumn">`;
	if (champ.console)
		content += `<span class="championImagesRow"><span class="championImagesPortrait"><img src="images/${champ.fName}/portraits/console.png" alt="${champ.name} Console Portrait" />Console Portait</span></span>`;
	if (champ.chests != null) {
		content += `<span class="championImagesRow">`;
		if (champ.chests.gold)
			content += `<span class="championImagesChests"><img src="images/${champ.fName}/chests/gold.png" alt="${champ.name} Gold Chest Icon" />Gold Chest Icon</span>`;
		if (champ.chests.silver)
			content += `<span class="championImagesChests"><img src="images/${champ.fName}/chests/silver.png" alt="${champ.name} Silver Chest Icon" />Silver Chest Icon</span>`;
		content += `</span>`;
	}
	content += `</span></p>`;
	return content;
}

function addSkinImages(champ, skins) {
	let content = `<p><span class="skinsPortraitsRow">`;
	let spoiler = content;
	let addedspoiler = false;
	content += `<span class="skinsPortraitsImage"><img src="images/${champ.fName}/portraits/portrait.png" alt="${champ.name} No Skin Portrait" />No Skin</span>`;
	for (let i = 0; i < skins.length; i++) {
		const skin = skins[i];
		const crayon = addCrayonEegg(champ, skin);
		const crossedOut = crayon === `` ? `` : ` crossedOut`;
		const skintxt = `<span class="skinsPortraitsImage${crossedOut}"><img src="images/${champ.fName}/skins/${skin.id}.png" alt="${champ.name} ${skin.name} Portrait" />${skin.name}${crayon}</span>`;
		if (skin.spoiler != null && skin.spoiler) {
			spoiler += skintxt;
			if (!addedspoiler) addedspoiler = true;
		} else {
			content += skintxt;
		}
	}
	if (addedspoiler && getSpoilersSetting()) {
		content += `</span></p><h1 id="skinsSpoilers">Spoiler Skin Portraits</h1>`;
		content += spoiler;
	}
	content += `</span></p>`;
	return content;
}

function addCrayonEegg(champ, skin) {
	const pref = `<span class="crayon">`;
	const suff = `</span>`;
	if (champ.name === `Catti-brie` && skin.name === `Dwarf Glitch`)
		return `${pref}Cattastro-brie${suff}`;
	return ``;
}

function useableDesc(thing) {
	if (thing != null && typeof thing === `string` && thing !== ``) return true;
	return false;
}

function parseEffects(abilities) {
	const es = `effect_string`;
	const effects = [];
	customFilter(abilities, effects);
	return effects;
}

function customFilter(object, result) {
	if (object === null) return;

	if (Object.prototype.hasOwnProperty.call(object, `effect_string`))
		result.push(object.effect_string);

	for (let i = 0; i < Object.keys(object).length; i++)
		if (typeof object[Object.keys(object)[i]] === `object`)
			customFilter(object[Object.keys(object)[i]], result);
}

function sortArray(unordered) {
	const ordered = Object.keys(unordered)
		.sort()
		.reduce((obj, key) => {
			obj[key] = unordered[key];
			return obj;
		}, {});
	return ordered;
}

function calcDay1Trials(stat, champ) {
	if (
		champ.special != null &&
		champ.special.forced != null &&
		champ.special.forced
	)
		return `Yes (Forced)`;
	if (
		champ.special != null &&
		champ.special.forceIfOthers != null &&
		champ.special.forceIfOthers.trials != null
	)
		return champ.special.forceIfOthers.trials[stat];
	const restr = trialsDay1[stat];
	const statNorm = champ.stats[stat];
	const statFeat = champ.statsFeats[stat];
	if (statFeat >= restr) {
		const result = `Yes`;
		if (statNorm < restr) return result + withFeat;
		return result;
	}
	return `-`;
}

function calcChampPadding(stat, champ) {
	const statVal = champ.stats[stat];
	if (statVal < 10) return 16;
	return 8;
}

function addFormation(fName) {
	let content = ``;
	const image = `images/${fName}/formation.png`;
	const http = new XMLHttpRequest();
	http.open("HEAD", image, false);
	http.send();
	if (http.status === 200) {
		content += `<h1 id="formation">Formation</h1>`;
		content += `<p><img src="${image}" alt="Formation Layout" /></p>`;
	}
	return content;
}

function addAttackImages(champ, attack) {
	if (attack.graphic_id != null && attack.graphic_id > 0)
		return `<img src="images/${champ.fName}/attacks/${attack.id}.png" alt="${attack.name} Icon">`;
	let images = ``;
	for (let i = 0; i < attack.damage_types.length; i++) {
		const dmg = attack.damage_types[i];
		images +=
			`<img src="images/${dmg}.png" alt="` +
			capitalise(dmg) +
			` Damage Icon">`;
	}
	return images;
}

function addAbilityImages(champ, ability) {
	const graphicId = ability.graphicId;
	let reqLevel = -3;
	for (let i = 0; i < ability.raw.length; i++)
		if (ability.raw[i].required_level != null)
			reqLevel = ability.raw[i].required_level;
	if (ability.raw.length === 2 && ability.graphicId > 0 && reqLevel > 0)
		return `<img src="images/${champ.fName}/abilities/${ability.id}.png" alt="${ability.name} Icon">`;
	return ``;
}

function splitItemDescription(start, description, longName) {
	const limit = 95;
	const spacing = ``.padStart(longName);
	const desc = description.split(` `);
	let retVal = ``;
	let line = start;
	let i = 0;
	let first = true;
	while (i < desc.length) {
		if (line.length + 1 + desc[i].length <= limit) {
			line += (line !== `` ? ` ` : ``) + desc[i];
		} else {
			retVal += (retVal !== `` ? `<br/>` : ``) + line;
			line = spacing + desc[i];
		}
		first = false;
		i++;
	}
	retVal += (retVal !== `` ? `<br/>` : ``) + line;
	return retVal;
}

function ins(str, index, value) {
	return str.substr(0, index) + value + str.substr(index);
}

function randInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function capitalise(input) {
	return input.charAt(0).toUpperCase() + input.slice(1);
}

function slashSeparate(inputArr, capsFirstLetter) {
	let output = ``;
	for (let i = 0; i < inputArr.length; i++) {
		if (i > 0) output += ` / `;
		if (capsFirstLetter) output += capitalise(inputArr[i]);
		else output += inputArr[i];
	}
	return output;
}

async function sha256(source) {
	const sourceBytes = new TextEncoder().encode(source);
	const digest = await crypto.subtle.digest(`SHA-256`, sourceBytes);
	const resultBytes = [...new Uint8Array(digest)];
	return resultBytes.map((x) => x.toString(16).padStart(2, "0")).join(``);
}

function runNameEeggs(nameShort) {
	const apo = `'`;
	if (nameShort.includes(apo)) {
		nameShort = nameShort.replaceAll(apo, ``);
		nameShort = ins(nameShort, randInt(1, nameShort.length - 1), apo);
	}
	if (nameShort === `Corazón` || nameShort === `Côrăžón`)
		nameShort = randInt(1, 4) === 3 ? `Côrăžón` : `Corazón`;
	if (nameShort === `Torogar` || nameShort === `Totoro`)
		nameShort = randInt(1, 8) === 7 ? `Totoro` : `Torogar`;
	return nameShort;
}

function isNixieBlue() {
	if (randInt(1, 4) === 2) return true;
	return false;
}

function nixiePortrait() {
	let prefix = `images/nixie/portraits/portrait`;
	if (nixieBlue) prefix += `Blue`;
	return `${prefix}.png`;
}

function isSplatGhost() {
	if (randInt(1, 4) === 3) return true;
	return false;
}

function splatPortrait() {
	let prefix = `images/spurt/portraits/portrait`;
	if (splatGhost) prefix += `Ghost3`;
	return `${prefix}.png`;
}

function isDMUni() {
	if (randInt(1, 4) === 4) return true;
	return false;
}

function dmPortrait() {
	let prefix = `images/dungeonmaster/portraits/portrait`;
	if (dmUni) prefix += `Uni`;
	return `${prefix}.png`;
}

function compress(input) {
	return LZString.compress(input);
}

function decompress(input) {
	return LZString.decompress(input);
}

function dealWithColours(str) {
	return str.replaceAll(
		/\{([^}]+)\}(#(?:[A-Za-z0-9]{6}|[A-Za-z0-9]{3}))/g,
		`<span style="color:$2">$1</span>`,
	);
}

function nf(number) {
	return numForm.format(number);
}

function sn(number) {
	return sciNoteForm.format(number).toLocaleLowerCase();
}

function stringifyReplacer(key, value) {
	if (value instanceof Map)
		return {
			dataType: "Map",
			value: Array.from(value.entries()),
		};
	if (value instanceof Set)
		return {
			dataType: "Set",
			value: [...value],
		};
	return value;
}

function parseReviver(key, value) {
	if (value !== null && typeof value === "object")
		if (value.dataType === "Map") return new Map(value.value);
	if (value != null && Array.isArray(value))
		if (value.dataType === "Set") return new Set(value);
	return value;
}

function ls_remove(key) {
	try {
		localStorage.removeItem(key);
	} catch {
		// Do nothing.
	}
}

function ls_get(key, defaultValue) {
	try {
		const raw = localStorage.getItem(key);
		if (raw == null) return defaultValue;
		return JSON.parse(raw, parseReviver);
	} catch {
		return defaultValue;
	}
}

function ls_set(key, value, isEmptyFn) {
	const isEmpty = isEmptyFn ? isEmptyFn(value) : value == null;

	if (isEmpty) ls_remove(key);
	else {
		try {
			localStorage.setItem(key, JSON.stringify(value, stringifyReplacer));
		} catch {
			// Do nothing.
		}
	}
}

function ls_set_string(key, value, defaultValue) {
	ls_set(
		key,
		value,
		(v) =>
			!v || typeof v !== `string` || v.length === 0 || v === defaultValue,
	);
}

function ls_set_bool(key, value, defaultValue) {
	const num = value ? 1 : 0;
	const def = defaultValue ? 1 : 0;

	ls_set(key, num, (v) => v === def);
}

function getSpoilersSetting() {
	return ls_get(LSKEY_spoilers, 0) === 1;
}

function setSpoilersSetting(value) {
	ls_set_bool(LSKEY_spoilers, value, false);
}

function getUnstickySetting() {
	return ls_get(LSKEY_unsticky, 0) === 1;
}

function setUnstickySetting(value) {
	ls_set_bool(LSKEY_unsticky, value, false);
}
