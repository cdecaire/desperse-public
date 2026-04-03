export type EchoAttribute = {
	trait_type: string
	value: string | number
	display_type?: string
}

export type EchoMetadata = {
	name: string
	description: string
	image: string
	external_url: string
	attributes: EchoAttribute[]
	properties: {
		files: Array<{ uri: string; type: string }>
		category: string
	}
}

export const COLLECTION_METADATA = {
	"name": "Echoes",
	"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
	"image": "collection.png",
	"external_url": "",
	"attributes": [],
	"properties": {
		"files": [
			{
				"uri": "collection.png",
				"type": "image/png"
			}
		],
		"category": "image"
	}
}

export const ECHOES_METADATA: EchoMetadata[] = [
	{
		"name": "Echoes #0",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "0.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Ghost-Class Anomaly"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "Red Braid"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Stud Earrings"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 63,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 4,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "0.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #1",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "1.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Glowing"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "White Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Armband"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 11,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 37,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "1.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #2",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "2.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Surveillance Marksman"
			},
			{
				"trait_type": "Hair",
				"value": "Pink Long Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Natural"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Body Armor"
			},
			{
				"trait_type": "Headwear",
				"value": "Scouter"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 50,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 13,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "2.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #3",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "3.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Surveillance Marksman"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Braid"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Smirk"
			},
			{
				"trait_type": "Outfit",
				"value": "Armored Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Scouter"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 89,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "3.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #4",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "4.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Surveillance Marksman"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Armored Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Scouter"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 90,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "4.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #5",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "5.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "Black Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Stud Earrings"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 77,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "5.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #6",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "6.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Surveillance Marksman"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Armored Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "None"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 67,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 3,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "6.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #7",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "7.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Blazer"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Necktie"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 68,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 3,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "7.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #8",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "8.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Pixie Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Armored Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Glasses"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 7,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 38,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "8.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #9",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "9.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "Black Messy Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Yellow"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Stud Earrings"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 78,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "9.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #10",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "10.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Undercut"
			},
			{
				"trait_type": "Eyes",
				"value": "Grey"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
			},
			{
				"trait_type": "Accessory",
				"value": "Metal Collar"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 8,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 38,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "10.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #11",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "11.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Slicked Back Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Dark Uniform"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 69,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 3,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "11.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #12",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "12.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Ghost-Class Anomaly"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Multiple Earrings"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 14,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 29,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "12.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #13",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "13.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Security Director"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Formal Suit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 4,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 39,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "13.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #14",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "14.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Glitch Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Pink Spiked Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "Torn Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Multiple Earrings"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 5,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 39,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "14.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #15",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "15.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "White Hime Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 51,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 13,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "15.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #16",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "16.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
			},
			{
				"trait_type": "Hair",
				"value": "Black Messy Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Badge Lanyard"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 23,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 26,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "16.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #17",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "17.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Prototype Host"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Focused"
			},
			{
				"trait_type": "Outfit",
				"value": "Sleeveless Shirt"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Earpiece"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 58,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 12,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "17.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #18",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "18.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Checkpoint Officer"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Wired Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 32,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 17,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "18.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #19",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "19.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Surveillance Marksman"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Frown"
			},
			{
				"trait_type": "Outfit",
				"value": "Tactical Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Scouter"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 70,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 3,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "19.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #20",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "20.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Sleeveless Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "None"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 61,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 5,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "20.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #21",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "21.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Signal-Burned"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Prototype Host"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "White"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Sleeveless Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Metal Collar"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 62,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 5,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "21.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #22",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "22.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Net Diver"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Smirk"
			},
			{
				"trait_type": "Outfit",
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headphones"
			},
			{
				"trait_type": "Accessory",
				"value": "Metal Collar"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 52,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 13,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "22.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #23",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "23.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Glowing"
			},
			{
				"trait_type": "Demeanor",
				"value": "Focused"
			},
			{
				"trait_type": "Outfit",
				"value": "Formal Suit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Necktie"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 91,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "23.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #24",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "24.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Metal Collar"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 15,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 28,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "24.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #25",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "25.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Prototype Host"
			},
			{
				"trait_type": "Hair",
				"value": "Green Pixie Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Glowing"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Sleeveless Shirt"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Earpiece"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 24,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 26,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "25.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #26",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "26.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Checkpoint Officer"
			},
			{
				"trait_type": "Hair",
				"value": "Red Wavy Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Aqua"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Body Armor"
			},
			{
				"trait_type": "Headwear",
				"value": "Visor"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 71,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 3,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "26.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #27",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "27.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Glasses"
			},
			{
				"trait_type": "Accessory",
				"value": "Necktie"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 92,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "27.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #28",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "28.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Signal-Burned"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Glitch Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Black Asymmetrical Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "One Black Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 79,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "28.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #29",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "29.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Black Hair Over One Eye"
			},
			{
				"trait_type": "Eyes",
				"value": "Yellow"
			},
			{
				"trait_type": "Demeanor",
				"value": "Focused"
			},
			{
				"trait_type": "Outfit",
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 45,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 14,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "29.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #30",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "30.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Prototype Host"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Mohawk"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Torn Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Earpiece"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 80,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "30.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #31",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "31.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Wetware Mechanic"
			},
			{
				"trait_type": "Hair",
				"value": "Blue Undercut"
			},
			{
				"trait_type": "Eyes",
				"value": "White"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "Torn Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Badge Lanyard"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 93,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "31.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #32",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "32.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Precinct Commander"
			},
			{
				"trait_type": "Hair",
				"value": "Pink Asymmetrical Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Calm"
			},
			{
				"trait_type": "Outfit",
				"value": "Dark Uniform"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 16,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 28,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "32.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #33",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "33.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Signal-Burned"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Black Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Utility Jumpsuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Choker"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 46,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 14,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "33.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #34",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "34.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Dead Channel Prophet"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Messy Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "White Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mechanical Halo"
			},
			{
				"trait_type": "Accessory",
				"value": "Multiple Earrings"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 17,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 28,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "34.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #35",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "35.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Interface Disciple"
			},
			{
				"trait_type": "Hair",
				"value": "Blue Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "White Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Gold Choker"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 28,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 25,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "35.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #36",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "36.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Prototype Host"
			},
			{
				"trait_type": "Hair",
				"value": "Pink Curly Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Aqua"
			},
			{
				"trait_type": "Demeanor",
				"value": "Angry"
			},
			{
				"trait_type": "Outfit",
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Earpiece"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 9,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 38,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "36.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #37",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "37.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Infiltrator"
			},
			{
				"trait_type": "Hair",
				"value": "Black Ponytail"
			},
			{
				"trait_type": "Eyes",
				"value": "Natural"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Leather Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 37,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 15,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "37.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #38",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "38.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Black Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Calm"
			},
			{
				"trait_type": "Outfit",
				"value": "Leather Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 53,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 13,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "38.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #39",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "39.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Infiltrator"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 94,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "39.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #40",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "40.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Armored Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
			},
			{
				"trait_type": "Accessory",
				"value": "None"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 72,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 3,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "40.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #41",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "41.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "Blue Curly Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Aqua"
			},
			{
				"trait_type": "Demeanor",
				"value": "Smirk"
			},
			{
				"trait_type": "Outfit",
				"value": "Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Glasses"
			},
			{
				"trait_type": "Accessory",
				"value": "Necktie"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 81,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "41.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #42",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "42.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Ghost-Class Anomaly"
			},
			{
				"trait_type": "Rank",
				"value": "Legendary"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Hacker"
			},
			{
				"trait_type": "Hair",
				"value": "Red Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Glowing Circuit Lines On Face"
			},
			{
				"trait_type": "Outfit",
				"value": "Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Skull Print On Bandana One Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "Weapon On Back"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 1,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 54,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "42.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #43",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "43.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Frown"
			},
			{
				"trait_type": "Outfit",
				"value": "Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Glasses"
			},
			{
				"trait_type": "Accessory",
				"value": "Bowtie"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 12,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 37,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "43.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #44",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "44.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "Red Crew Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Grey"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Gas Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 100,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 0,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "44.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #45",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "45.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Archive Seer"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Glowing Forehead Sensor"
			},
			{
				"trait_type": "Accessory",
				"value": "None"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 38,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 15,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "45.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #46",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "46.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Black Spiked Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Yellow"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Leather Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 73,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 3,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "46.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #47",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "47.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Ghost-Class Anomaly"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Spiked Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Visor"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 31,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 18,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "47.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #48",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "48.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Surveillance Marksman"
			},
			{
				"trait_type": "Hair",
				"value": "Black Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Focused"
			},
			{
				"trait_type": "Outfit",
				"value": "Dark Uniform"
			},
			{
				"trait_type": "Headwear",
				"value": "Scouter"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 25,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 26,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "48.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #49",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "49.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "White Half Updo"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "White Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 39,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 15,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "49.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #50",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "50.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
			},
			{
				"trait_type": "Hair",
				"value": "Black Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Armored Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Glowing Led Headband"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 40,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 15,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "50.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #51",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "51.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Blue Braid"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Focused"
			},
			{
				"trait_type": "Outfit",
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 82,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "51.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #52",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "52.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Signal-Burned"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Black Clinic Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Crew Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Smirk"
			},
			{
				"trait_type": "Outfit",
				"value": "Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Silver Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 33,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 16,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "52.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #53",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "53.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Aqua"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 64,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 4,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "53.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #54",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "54.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Infiltrator"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 20,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 27,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "54.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #55",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "55.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Wetware Mechanic"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Very Short Hair, Buzz Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "White"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Badge Lanyard"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 74,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 3,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "55.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #56",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "56.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Archive Seer"
			},
			{
				"trait_type": "Hair",
				"value": "Black Shaved Head"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Gold Circlet"
			},
			{
				"trait_type": "Accessory",
				"value": "Choker"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 59,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 12,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "56.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #57",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "57.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Legendary"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "Red Half Updo"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Frown"
			},
			{
				"trait_type": "Outfit",
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Spiked Metal Headband"
			},
			{
				"trait_type": "Accessory",
				"value": "Ornate Shoulder Mantle"
			},
			{
				"trait_type": "Special",
				"value": "Floating Holographic Screen Near Face"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 3,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 49,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "57.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #58",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "58.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
			},
			{
				"trait_type": "Hair",
				"value": "Black Cornrows"
			},
			{
				"trait_type": "Eyes",
				"value": "Natural"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Body Armor"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Armband"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 75,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 3,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "58.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #59",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "59.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Ghost-Class Anomaly"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Systems Architect"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Heterochromia"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Metal Collar"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 34,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 16,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "59.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #60",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "60.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Glitch Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Slicked Back Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Street Hoodie"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Hoop Earrings"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 47,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 14,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "60.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #61",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "61.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Interface Disciple"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Grey"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Visor"
			},
			{
				"trait_type": "Accessory",
				"value": "Stud Earrings"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 83,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "61.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #62",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "62.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Precinct Commander"
			},
			{
				"trait_type": "Hair",
				"value": "White Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Visor"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 6,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 39,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "62.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #63",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "63.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Hacker"
			},
			{
				"trait_type": "Hair",
				"value": "Red Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Choker"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 26,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 26,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "63.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #64",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "64.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Broker"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "White"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Plain Baseball Cap"
			},
			{
				"trait_type": "Accessory",
				"value": "Silver Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 41,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 15,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "64.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #65",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "65.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "White Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Utility Jumpsuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Ear Piercing"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 76,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 3,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "65.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #66",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "66.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Braid"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Visor"
			},
			{
				"trait_type": "Accessory",
				"value": "Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 95,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "66.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #67",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "67.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Signal-Burned"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Black Clinic Broker"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Armored Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 13,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 30,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "67.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #68",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "68.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Systems Architect"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Glowing Forehead Sensor"
			},
			{
				"trait_type": "Accessory",
				"value": "None"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 42,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 15,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "68.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #69",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "69.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Executive"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Blazer"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Bowtie"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 18,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 28,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "69.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #70",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "70.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "White Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Focused"
			},
			{
				"trait_type": "Outfit",
				"value": "Turtleneck Blazer"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Necktie"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 84,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "70.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #71",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "71.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Security Director"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "Turtleneck Blazer"
			},
			{
				"trait_type": "Headwear",
				"value": "Sunglasses"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 54,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 13,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "71.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #72",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "72.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Slicked Back Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Glowing"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 96,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "72.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #73",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "73.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Checkpoint Officer"
			},
			{
				"trait_type": "Hair",
				"value": "White Crew Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Body Armor"
			},
			{
				"trait_type": "Headwear",
				"value": "Glowing Led Headband"
			},
			{
				"trait_type": "Accessory",
				"value": "Armband"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 97,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "73.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #74",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "74.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Executive"
			},
			{
				"trait_type": "Hair",
				"value": "Black Ponytail"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Smirk"
			},
			{
				"trait_type": "Outfit",
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Earpiece"
			},
			{
				"trait_type": "Accessory",
				"value": "Gold Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 29,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 24,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "74.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #75",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "75.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "White Twin Braids"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Necktie"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 98,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "75.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #76",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "76.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Net Diver"
			},
			{
				"trait_type": "Hair",
				"value": "Green Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headphones"
			},
			{
				"trait_type": "Accessory",
				"value": "Metal Collar"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 10,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 38,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "76.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #77",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "77.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
			},
			{
				"trait_type": "Demeanor",
				"value": "Frown"
			},
			{
				"trait_type": "Outfit",
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Earpiece"
			},
			{
				"trait_type": "Accessory",
				"value": "Bowtie"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 60,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 12,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "77.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #78",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "78.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Hacker"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Leather Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "One Black Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 85,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "78.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #79",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "79.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Crew Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Yellow"
			},
			{
				"trait_type": "Demeanor",
				"value": "Frown"
			},
			{
				"trait_type": "Outfit",
				"value": "Leather Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
			},
			{
				"trait_type": "Accessory",
				"value": "Metal Collar"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 30,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 24,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "79.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #80",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "80.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Aqua"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Armored Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "None"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 65,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 4,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "80.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #81",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "81.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "Red Long Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Frown"
			},
			{
				"trait_type": "Outfit",
				"value": "White Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 86,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "81.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #82",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "82.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "White Crew Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Calm"
			},
			{
				"trait_type": "Outfit",
				"value": "Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Pocket Square"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 48,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 14,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "82.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #83",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "83.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
			},
			{
				"trait_type": "Hair",
				"value": "White Pompadour"
			},
			{
				"trait_type": "Eyes",
				"value": "White"
			},
			{
				"trait_type": "Demeanor",
				"value": "Focused"
			},
			{
				"trait_type": "Outfit",
				"value": "Tactical Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 35,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 16,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "83.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #84",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "84.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Ghost-Class Anomaly"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "White Shaved Head"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Formal Suit"
			},
			{
				"trait_type": "Headwear",
				"value": "Glasses"
			},
			{
				"trait_type": "Accessory",
				"value": "Necktie"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 19,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 28,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "84.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #85",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "85.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Grey"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "One Red Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 43,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 15,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "85.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #86",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "86.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Hime Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "White Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Gas Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 87,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "86.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #87",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "87.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Wetware Mechanic"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Slicked Back Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Grey"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Sleeveless Shirt"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 66,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 4,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "87.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #88",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "88.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Checkpoint Officer"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Aqua"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 21,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 27,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "88.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #89",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "89.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
			},
			{
				"trait_type": "Hair",
				"value": "Red Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Angry"
			},
			{
				"trait_type": "Outfit",
				"value": "Body Armor"
			},
			{
				"trait_type": "Headwear",
				"value": "Helmet"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 55,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 13,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "89.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #90",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "90.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "White Dreadlocks"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "White Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mechanical Halo"
			},
			{
				"trait_type": "Accessory",
				"value": "Single Earring"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 88,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 2,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "90.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #91",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "91.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Bob Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Camo On Bandana One Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 27,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 26,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "91.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #92",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "92.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Tessera Wardens"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Surveillance Marksman"
			},
			{
				"trait_type": "Hair",
				"value": "White Crew Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Scouter"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 56,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 13,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "92.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #93",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "93.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Net Diver"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Cornrows"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headphones"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 49,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 14,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "93.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #94",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "94.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Legendary"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Dead Channel Prophet"
			},
			{
				"trait_type": "Hair",
				"value": "White Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Focused"
			},
			{
				"trait_type": "Outfit",
				"value": "White Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Ornate Golden Crown"
			},
			{
				"trait_type": "Accessory",
				"value": "Platinum Necklace"
			},
			{
				"trait_type": "Special",
				"value": "Katana On Back"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 2,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 50,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "94.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #95",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "95.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Security Director"
			},
			{
				"trait_type": "Hair",
				"value": "Black Messy Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Smirk"
			},
			{
				"trait_type": "Outfit",
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Scouter"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 57,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 13,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "95.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #96",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "96.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Synthetic"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Prototype Host"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Dress Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Earpiece"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 36,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 16,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "96.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #97",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "97.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Cyborg"
			},
			{
				"trait_type": "Signal",
				"value": "Corrupted"
			},
			{
				"trait_type": "Rank",
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "Pink Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "White Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Silver Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 44,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 15,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "97.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #98",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "98.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Witnesses"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "White Crew Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Grey"
			},
			{
				"trait_type": "Demeanor",
				"value": "Angry"
			},
			{
				"trait_type": "Outfit",
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Multiple Earrings"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 22,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 27,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "98.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #99",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "99.png",
		"external_url": "",
		"attributes": [
			{
				"trait_type": "Faction",
				"value": "The Siphon"
			},
			{
				"trait_type": "Substrate",
				"value": "Augmented"
			},
			{
				"trait_type": "Signal",
				"value": "Stable"
			},
			{
				"trait_type": "Rank",
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
			},
			{
				"trait_type": "Accessory",
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 99,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 1,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "99.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	}
]

/** Faction -> accent color */
export const FACTION_COLORS: Record<string, string> = {
	"Syre Group": "#3b82f6",
	"The Unwritten": "#a855f7",
	"The Siphon": "#ef4444",
	"The Witnesses": "#f59e0b",
	"Tessera Wardens": "#22c55e"
}

/** Rank -> accent color */
export const RANK_COLORS: Record<string, string> = {
	"Common": "#71717a",
	"Uncommon": "#22c55e",
	"Rare": "#3b82f6",
	"Elite": "#a855f7",
	"Legendary": "#eab308"
}

/** Ordered public trait types for filters / detail display */
export const TRAIT_TYPES = [
	"Faction",
	"Substrate",
	"Signal",
	"Rank",
	"Frame",
	"Role",
	"Hair",
	"Eyes",
	"Demeanor",
	"Outfit",
	"Headwear",
	"Accessory",
	"Special",
	"Rarity Rank",
	"Rarity Score"
] as const

const IMAGE_BASE = "/echoes-dev"

/** Variant count per echo index (default 2, exceptions listed) */
const VARIANT_EXCEPTIONS: Record<number, number> = {}

function getVariantCount(index: number): number {
	return VARIANT_EXCEPTIONS[index] ?? 2
}

/**
 * Resolve dev image paths for an echo.
 * Named `echoes_XXXX_0000N_.png` in the images folder.
 */
export function getDevImagePaths(item: EchoMetadata): string[] {
	const match = item.image.match(/echoes_(\d+)\.png/)
	if (!match) return [`${IMAGE_BASE}/${item.image}`]
	const idx = match[1]
	const num = Number.parseInt(idx, 10)
	const count = getVariantCount(num)
	return Array.from({ length: count }, (_, i) =>
		`${IMAGE_BASE}/echoes_${idx}_${String(i + 1).padStart(5, "0")}_.png`
	)
}
