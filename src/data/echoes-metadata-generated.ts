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
				"value": "Transmission Guard"
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
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "White Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
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
				"value": 171,
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
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
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
				"value": 11,
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Red Hime Cut"
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
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headphones"
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
				"value": 70,
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Braid"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Confident"
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
				"value": 193,
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Infiltrator"
			},
			{
				"trait_type": "Hair",
				"value": "White Hime Cut"
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
				"value": "Vest"
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
				"value": 125,
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
				"value": "Red Short Hair"
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
				"value": 242,
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
				"value": "Black Bob Cut"
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
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
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
				"value": 71,
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
				"value": "The Unwritten"
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
				"value": "Green"
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
				"value": "Goggles"
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
				"value": 151,
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
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Breach Unit"
			},
			{
				"trait_type": "Hair",
				"value": "Black Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Heterochromia"
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
				"value": "Helmet"
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
				"value": 194,
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
				"value": "Rare"
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
				"value": "Aqua"
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
				"value": 31,
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
				"value": "Red Medium Hair"
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
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Tech Headband"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 243,
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
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
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
				"value": "Aqua"
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
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Pearl Necklace"
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
				"value": 41,
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
				"value": "Tessera Wardens"
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
				"value": "Breach Unit"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
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
				"value": 34,
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
				"value": "Blue"
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
				"value": 172,
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
				"value": "White Shaved Head"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Frown"
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
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 214,
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
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Asymmetrical Hair"
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
				"value": "Utility Jumpsuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Black Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 195,
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
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Infiltrator"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Medium Hair"
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
				"value": "Street Hoodie"
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
				"value": 215,
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
				"value": "Feminine"
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
				"value": "White Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Circlet"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
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
				"value": 17,
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
				"value": "Hacker"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Shaved Head"
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
				"value": "Leather Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Black Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 196,
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
				"value": "White Shaved Head"
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
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Glasses"
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
				"value": 24,
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
				"value": "Smirk"
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
				"value": "Ear Piercing"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 244,
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
				"value": "Breach Unit"
			},
			{
				"trait_type": "Hair",
				"value": "White Medium Hair"
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
				"value": "Helmet"
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
				"value": 59,
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
				"value": "Black Messy Hair"
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
				"value": "Body Armor"
			},
			{
				"trait_type": "Headwear",
				"value": "Scouter"
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
				"value": 197,
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
				"value": "Black Undercut"
			},
			{
				"trait_type": "Eyes",
				"value": "Heterochromia"
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
				"value": 25,
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
				"value": "The Siphon"
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
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Hacker"
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
				"value": "Wired Bodysuit"
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
				"value": 77,
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
				"value": "Red Undercut"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Clenched Teeth"
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
				"value": 72,
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
				"value": "Wetware Mechanic"
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
				"value": 157,
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
				"value": "Elite"
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
				"value": "Brown Slicked Back Hair"
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
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Mechanical Halo"
			},
			{
				"trait_type": "Accessory",
				"value": "Diamond Earrings"
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
				"value": 39,
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
				"value": "Breach Unit"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Medium Hair"
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
				"value": "Helmet"
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
				"value": 15,
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
				"value": "Interface Disciple"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Bob Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Glowing"
			},
			{
				"trait_type": "Demeanor",
				"value": "Smirk"
			},
			{
				"trait_type": "Outfit",
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Plain Baseball Cap"
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
				"value": 105,
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
				"value": "Elite"
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
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Skull Print Bandana Around Neck"
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
				"value": 39,
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
				"value": "Brown Shaved Head"
			},
			{
				"trait_type": "Eyes",
				"value": "Aqua"
			},
			{
				"trait_type": "Demeanor",
				"value": "Frown"
			},
			{
				"trait_type": "Outfit",
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Helmet"
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
				"value": 216,
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
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Interface Disciple"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Ponytail"
			},
			{
				"trait_type": "Eyes",
				"value": "Glowing"
			},
			{
				"trait_type": "Demeanor",
				"value": "Slight Frown"
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
				"value": 198,
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
				"value": "Red"
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
				"value": 90,
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
				"value": "Syre Group"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
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
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "Black Shaved Head"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Confident"
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
				"value": "Bowtie"
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
				"value": 27,
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
				"value": "White Bob Cut"
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
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Helmet"
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
				"value": 217,
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
				"value": "Armored Jacket"
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
				"value": 80,
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
				"value": "Elite"
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
				"value": "Purple Short Hair"
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
				"value": "Utility Jumpsuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 26,
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
				"value": "Precinct Commander"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Short Hair"
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
				"value": "Dog Tags"
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
				"value": 39,
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
				"value": "Rare"
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
				"value": "Black Curly Hair"
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
				"value": "Torn Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Camo Bandana Around Neck"
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
				"value": 27,
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
				"value": "Black Clinic Broker"
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
				"value": "Sleeveless Shirt"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 60,
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
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "White Messy Hair"
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
				"value": "Leather Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
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
				"value": 199,
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
				"value": "Riot Enforcer"
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
				"value": 81,
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
				"value": "Grey Shaved Head"
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
				"value": "Circlet"
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
				"value": 25,
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
				"value": "Aqua Messy Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Glowing"
			},
			{
				"trait_type": "Demeanor",
				"value": "Frown"
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
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 200,
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
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Breach Unit"
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
				"value": "Armored Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Dual Radio Antenna"
			},
			{
				"trait_type": "Accessory",
				"value": "Neck Cable"
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
				"value": 40,
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
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "High Collar Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Dual Radio Antenna"
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
				"value": 173,
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
				"value": "Checkpoint Officer"
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
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 201,
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
				"value": "Armored Bodysuit"
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
				"value": 152,
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
				"value": "Archive Seer"
			},
			{
				"trait_type": "Hair",
				"value": "Orange Bob Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
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
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 126,
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
				"value": "Red Messy Hair"
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
				"value": 218,
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
				"value": "Brown Medium Hair"
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
				"value": 245,
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
				"value": "Green Ponytail"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Clenched Teeth"
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
				"value": "Dog Tags"
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
				"value": 26,
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Strategist"
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
				"value": "Turtleneck Jacket"
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
				"value": 174,
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Black Clinic Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Undercut"
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
				"value": "Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Earpiece"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
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
				"value": 15,
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
				"value": "Hacker"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Messy Hair"
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
				"value": 106,
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
				"value": "Checkpoint Officer"
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
				"value": "Body Armor"
			},
			{
				"trait_type": "Headwear",
				"value": "Plain Baseball Cap"
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
				"value": 107,
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
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Blue Asymmetrical Hair"
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
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
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
				"value": 219,
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
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
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
				"value": "Red"
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
				"value": "Metal Collar"
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
				"value": 27,
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
				"value": "Uncommon"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
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
				"value": "Purple"
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
				"value": 146,
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
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
			},
			{
				"trait_type": "Demeanor",
				"value": "Angry"
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
				"value": 50,
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
				"value": "Brown Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Yellow"
			},
			{
				"trait_type": "Demeanor",
				"value": "Smirk"
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
				"value": 220,
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
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Crew Cut"
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
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Red Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 108,
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
				"value": "Uncommon"
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
				"value": "Grey Mohawk"
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
				"value": "Torn Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 109,
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
				"value": "Feminine"
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
				"value": "Blazer"
			},
			{
				"trait_type": "Headwear",
				"value": "Plain Baseball Cap"
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
				"value": 92,
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
				"value": "Brown Medium Hair"
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
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 127,
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Breach Unit"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Braid"
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
				"value": "Helmet"
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
				"value": 202,
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
				"value": "Yellow"
			},
			{
				"trait_type": "Demeanor",
				"value": "Calm"
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
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 203,
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
				"value": "Jacket"
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
				"value": 175,
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
				"value": "Data Analyst"
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
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Sunglasses"
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
				"value": 93,
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
				"value": "Blonde Mohawk"
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
				"value": "Mask"
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
				"value": 176,
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
				"value": "Brown Hair Over One Eye"
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
				"value": "Turtleneck Blazer"
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
				"value": 221,
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
				"value": "Blue Hime Cut"
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
				"value": "Glowing Led Headband"
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
				"value": 94,
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
				"value": "Black Short Hair"
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
				"value": "Armored Bodysuit"
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
				"value": 110,
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
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Cornrows"
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
				"value": "Vest"
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
				"value": 62,
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
				"value": "Pink Messy Hair"
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
				"value": "Utility Jumpsuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Red Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 128,
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Short Hair"
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
				"value": "Street Hoodie"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Black Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 204,
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
				"value": "Systems Architect"
			},
			{
				"trait_type": "Hair",
				"value": "Black Medium Hair"
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
				"value": "Earpiece"
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
				"value": 63,
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Net Diver"
			},
			{
				"trait_type": "Hair",
				"value": "Black Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "White"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Headphones"
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
				"value": 177,
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
				"value": "Rare"
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
				"value": "Orange Pixie Cut"
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
				"value": "Mechanical Halo"
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
				"value": 42,
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
				"value": "The Unwritten"
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
				"value": "Glitch Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Green Asymmetrical Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Heterochromia"
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
				"value": "Goggles"
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
				"value": 95,
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
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Glowing"
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
				"value": "Hood Up"
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
				"value": 111,
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
				"value": "Surveillance Marksman"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Orange"
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
				"value": 96,
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
				"value": "The Unwritten"
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
				"value": "Glitch Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Double Bun"
			},
			{
				"trait_type": "Eyes",
				"value": "Multicolored"
			},
			{
				"trait_type": "Demeanor",
				"value": "Clenched Teeth"
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
				"value": "Ear Piercing"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 205,
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
				"value": "Rare"
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
				"value": "Black Short Hair"
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
				"value": "Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 51,
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
				"value": "Glitch Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Black Undercut"
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
				"value": "Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 158,
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
				"value": "Brown Shaved Head"
			},
			{
				"trait_type": "Eyes",
				"value": "Natural"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
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
				"value": 159,
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Curly Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Confident"
			},
			{
				"trait_type": "Outfit",
				"value": "Street Hoodie"
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
				"value": 112,
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
				"value": "White Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Blue"
			},
			{
				"trait_type": "Demeanor",
				"value": "Grin"
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
				"value": "Badge Lanyard"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 178,
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
				"value": "Black Medium Hair"
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
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
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
				"value": 43,
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
				"value": "The Unwritten"
			},
			{
				"trait_type": "Substrate",
				"value": "Human"
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Asymmetrical Hair"
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
				"value": "Torn Jacket"
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
				"value": 52,
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Net Diver"
			},
			{
				"trait_type": "Hair",
				"value": "Orange Slicked Back Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Clenched Teeth"
			},
			{
				"trait_type": "Outfit",
				"value": "Leather Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headphones"
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
				"value": 64,
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
				"value": "Checkpoint Officer"
			},
			{
				"trait_type": "Hair",
				"value": "Black Slicked Back Hair"
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
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
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
				"value": 113,
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Archive Seer"
			},
			{
				"trait_type": "Hair",
				"value": "White Undercut"
			},
			{
				"trait_type": "Eyes",
				"value": "Yellow"
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
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Diamond Earrings"
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
				"value": 38,
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
				"value": "Checkpoint Officer"
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
				"value": "Frown"
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
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 114,
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
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
				"value": "Armored Jacket"
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
				"value": 97,
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
				"value": "Interface Disciple"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Undercut"
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
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Visor"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 222,
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Dead Channel Prophet"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Cornrows"
			},
			{
				"trait_type": "Eyes",
				"value": "Grey"
			},
			{
				"trait_type": "Demeanor",
				"value": "Fangs"
			},
			{
				"trait_type": "Outfit",
				"value": "White Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Mechanical Halo"
			},
			{
				"trait_type": "Accessory",
				"value": "Diamond Necklace"
			},
			{
				"trait_type": "Special",
				"value": "Mechanical Wings On Back"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 5,
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Black Clinic Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Curly Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Natural"
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
				"value": "Choker"
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
				"value": 15,
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
				"value": "Security Director"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Pompadour"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
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
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 147,
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
					"uri": "99.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #100",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "100.png",
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
				"value": "Brown Messy Hair"
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
				"value": "Turtleneck Blazer"
			},
			{
				"trait_type": "Headwear",
				"value": "Glasses"
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
				"value": 223,
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
					"uri": "100.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #101",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "101.png",
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
				"value": "Systems Architect"
			},
			{
				"trait_type": "Hair",
				"value": "Red Medium Hair"
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
				"value": "Turtleneck Blazer"
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
				"value": 129,
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
					"uri": "101.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #102",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "102.png",
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
				"value": "Elite"
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
				"value": "Black Short Hair"
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
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Pearl Necklace"
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
				"value": 40,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "102.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #103",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "103.png",
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
				"value": "Aqua Spiked Hair"
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
				"value": "Long Coat"
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
				"value": 82,
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
					"uri": "103.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #104",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "104.png",
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
				"value": "Infiltrator"
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
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 115,
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
					"uri": "104.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #105",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "105.png",
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
				"value": "Black Clinic Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Short Hair"
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
				"value": "Sleeveless Shirt"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 224,
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
					"uri": "105.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #106",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "106.png",
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
				"value": "Pink Undercut"
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
				"value": "Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Glasses"
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
				"value": 246,
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
					"uri": "106.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #107",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "107.png",
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
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "Red Braid"
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
				"value": "Blouse"
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
				"value": 130,
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
					"uri": "107.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #108",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "108.png",
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
				"value": "Glitch Runner"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
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
				"value": "Goggles"
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
				"value": 160,
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
					"uri": "108.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #109",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "109.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "Green Asymmetrical Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Natural"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Circlet"
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
				"value": 225,
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
					"uri": "109.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #110",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "110.png",
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
				"value": "Blue"
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
				"value": "Neck Cable"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 161,
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
					"uri": "110.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #111",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "111.png",
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
				"value": "Feminine"
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
				"value": 179,
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
					"uri": "111.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #112",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "112.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Interface Disciple"
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
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Mechanical Halo"
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
				"value": 83,
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
					"uri": "112.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #113",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "113.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Precinct Commander"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Ponytail"
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
				"value": "Body Armor"
			},
			{
				"trait_type": "Headwear",
				"value": "Earpiece"
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
				"value": 18,
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
					"uri": "113.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #114",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "114.png",
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
				"value": "Brown Long Hair"
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
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 116,
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
					"uri": "114.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #115",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "115.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Breach Unit"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Spiked Hair"
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
				"value": "Tactical Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 226,
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
					"uri": "115.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #116",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "116.png",
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
				"value": "Grey Short Hair"
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
				"value": "Street Hoodie"
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
				"value": 15,
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
					"uri": "116.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #117",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "117.png",
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
				"value": "Grey Crew Cut"
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
				"value": "Long Coat"
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
				"value": 28,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 36,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "117.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #118",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "118.png",
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
				"value": "Blonde Ponytail"
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
				"value": 227,
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
					"uri": "118.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #119",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "119.png",
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
				"value": "White Hime Cut"
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
				"value": 228,
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
					"uri": "119.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #120",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "120.png",
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
				"value": 84,
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
					"uri": "120.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #121",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "121.png",
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
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Heterochromia"
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
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
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
				"value": 15,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "121.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #122",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "122.png",
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
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Black Messy Hair"
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
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Skull Print Bandana Around Neck"
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
				"value": 38,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "122.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #123",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "123.png",
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
				"value": "Breach Unit"
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
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 131,
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
					"uri": "123.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #124",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "124.png",
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
				"value": "Glitch Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Pink Ponytail"
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
				"value": "Street Hoodie"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Black Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 180,
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
					"uri": "124.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #125",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "125.png",
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
				"value": "Aqua Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Confident"
			},
			{
				"trait_type": "Outfit",
				"value": "Blouse"
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
				"value": 229,
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
					"uri": "125.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #126",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "126.png",
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
				"value": "Checkpoint Officer"
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
				"value": "Shoulder Armor"
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
				"value": 15,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "126.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #127",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "127.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "Pink Messy Hair"
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
				"value": "Mask"
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
				"value": 206,
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
					"uri": "127.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #128",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "128.png",
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
				"value": "Net Diver"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Vest"
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
				"value": 207,
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
					"uri": "128.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #129",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "129.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
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
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Armored Bodysuit"
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
				"value": 230,
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
					"uri": "129.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #130",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "130.png",
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
				"value": "Transmission Guard"
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
				"value": "White Coat"
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
				"value": 153,
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
					"uri": "130.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #131",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "131.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
			},
			{
				"trait_type": "Hair",
				"value": "Green Pixie Cut"
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
				"value": "Tactical Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Gas Mask"
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
				"value": 181,
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
					"uri": "131.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #132",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "132.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "Green Bob Cut"
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
				"value": 65,
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
					"uri": "132.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #133",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "133.png",
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
				"value": "Common"
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
				"value": "Pink Messy Hair"
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
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Headphones"
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
				"value": 182,
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
					"uri": "133.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #134",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "134.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Wetware Mechanic"
			},
			{
				"trait_type": "Hair",
				"value": "Green Half Updo"
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
				"value": "Sleeveless Shirt"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 85,
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
					"uri": "134.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #135",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "135.png",
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
				"value": "White"
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
				"value": 86,
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
					"uri": "135.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #136",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "136.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Checkpoint Officer"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Ponytail"
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
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 208,
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
					"uri": "136.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #137",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "137.png",
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
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Slicked Back Hair"
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
				"value": "Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Black Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 231,
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
					"uri": "137.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #138",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "138.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Net Diver"
			},
			{
				"trait_type": "Hair",
				"value": "Red Curly Hair"
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
				"value": "Street Hoodie"
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
				"value": "Neon Glow"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 132,
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
					"uri": "138.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #139",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "139.png",
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
				"value": "Blue Asymmetrical Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
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
				"value": "Small Gold Demon Horns"
			},
			{
				"trait_type": "Accessory",
				"value": "Gold Choker"
			},
			{
				"trait_type": "Special",
				"value": "Weapon On Back"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 6,
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
					"uri": "139.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #140",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "140.png",
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
				"value": "Infiltrator"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Short Hair"
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
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 53,
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
					"uri": "140.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #141",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "141.png",
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
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 162,
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
					"uri": "141.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #142",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "142.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Wetware Mechanic"
			},
			{
				"trait_type": "Hair",
				"value": "White Shaved Head"
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
				"value": "Street Hoodie"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 183,
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
					"uri": "142.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #143",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "143.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
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
				"value": "Grin"
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
				"value": "Silver Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 117,
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
					"uri": "143.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #144",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "144.png",
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
				"value": "Strategist"
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
				"value": "Turtleneck Jacket"
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
				"value": 163,
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
					"uri": "144.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #145",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "145.png",
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
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "Pink Dreadlocks"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Slight Frown"
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
				"value": "Pocket Square"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 133,
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
					"uri": "145.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #146",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "146.png",
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
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Breach Unit"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Short Hair"
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
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "Backpack"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 73,
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
					"uri": "146.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #147",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "147.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Black Clinic Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Asymmetrical Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Torn Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Helmet"
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
				"value": 209,
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
					"uri": "147.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #148",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "148.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Executive"
			},
			{
				"trait_type": "Hair",
				"value": "Blue Messy Hair"
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
				"value": "Vest"
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
				"value": 27,
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
					"uri": "148.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #149",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "149.png",
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
				"value": "Brown Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Natural"
			},
			{
				"trait_type": "Demeanor",
				"value": "Closed Mouth"
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
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "Backpack"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 54,
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
					"uri": "149.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #150",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "150.png",
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
				"value": "Grey Very Short Hair, Buzz Cut"
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
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Helmet"
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
				"value": 32,
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
					"uri": "150.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #151",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "151.png",
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
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Systems Architect"
			},
			{
				"trait_type": "Hair",
				"value": "White Messy Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Angry"
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
				"value": "Earpiece"
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
				"value": 25,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "151.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #152",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "152.png",
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
				"value": "Prototype Host"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Ponytail"
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
				"value": "Torn Jacket"
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
				"value": 232,
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
					"uri": "152.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #153",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "153.png",
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
				"value": "Black Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Heterochromia"
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
				"value": "Headset"
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
				"value": 184,
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
					"uri": "153.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #154",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "154.png",
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
				"value": "Rare"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Breach Unit"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Undercut"
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
				"value": "Helmet"
			},
			{
				"trait_type": "Accessory",
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "Repair Tape"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 44,
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
					"uri": "154.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #155",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "155.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Breach Unit"
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
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 210,
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
					"uri": "155.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #156",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "156.png",
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
				"value": "Masculine"
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
				"value": "White"
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
				"value": 154,
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
					"uri": "156.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #157",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "157.png",
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
				"value": "Black Clinic Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Short Hair"
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
				"value": "Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 185,
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
					"uri": "157.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #158",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "158.png",
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
				"value": "Blue Short Hair"
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
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Glasses"
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
				"value": 211,
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
					"uri": "158.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #159",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "159.png",
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
				"value": "Net Diver"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Crew Cut"
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
				"value": "Long Coat"
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
				"value": 134,
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
					"uri": "159.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #160",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "160.png",
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
				"value": "Elite"
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
				"value": "Black Short Hair"
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
				"value": "Torn Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 20,
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
					"uri": "160.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #161",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "161.png",
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
				"value": "Interface Disciple"
			},
			{
				"trait_type": "Hair",
				"value": "Black Cornrows"
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
				"value": "Visor"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 135,
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
					"uri": "161.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #162",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "162.png",
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
				"value": "Armored Vest"
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
				"value": 164,
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
					"uri": "162.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #163",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "163.png",
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
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
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
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "Backpack"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 16,
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
					"uri": "163.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #164",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "164.png",
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
				"value": "Elite"
			},
			{
				"trait_type": "Frame",
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Infiltrator"
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
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 38,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "164.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #165",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "165.png",
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
				"value": "Black Messy Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "White"
			},
			{
				"trait_type": "Demeanor",
				"value": "Smirk"
			},
			{
				"trait_type": "Outfit",
				"value": "Harness Hoodie"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
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
				"value": 136,
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
					"uri": "165.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #166",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "166.png",
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
				"value": "Glitch Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Messy Hair"
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
				"value": 118,
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
					"uri": "166.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #167",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "167.png",
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
				"value": "Checkpoint Officer"
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
				"value": "Armored Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Helmet"
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
				"value": 119,
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
					"uri": "167.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #168",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "168.png",
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
				"value": "Blonde Messy Hair"
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
				"value": 55,
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
					"uri": "168.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #169",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "169.png",
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
				"value": "Surveillance Marksman"
			},
			{
				"trait_type": "Hair",
				"value": "Black Short Hair"
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
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 165,
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
					"uri": "169.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #170",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "170.png",
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
				"value": "Grey Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
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
				"value": 74,
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
					"uri": "170.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #171",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "171.png",
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
				"value": "Broker"
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
				"value": "Neck Cable"
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
				"value": 28,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "171.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #172",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "172.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Riot Enforcer"
			},
			{
				"trait_type": "Hair",
				"value": "Blue Medium Hair"
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
				"value": "Armored Bodysuit"
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
				"value": 67,
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
					"uri": "172.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #173",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "173.png",
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
				"value": "Long Coat"
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
				"value": 36,
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
					"uri": "173.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #174",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "174.png",
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
				"value": "Dead Channel Prophet"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Braid"
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
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Mechanical Halo"
			},
			{
				"trait_type": "Accessory",
				"value": "Platinum Necklace"
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
				"value": 36,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "174.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #175",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "175.png",
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
				"value": "Wetware Mechanic"
			},
			{
				"trait_type": "Hair",
				"value": "Pink Short Hair"
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
				"value": "Utility Jumpsuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 186,
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
					"uri": "175.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #176",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "176.png",
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
				"value": "Red Short Hair"
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
				"value": "Structured Coat"
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
				"value": "Floating Holographic Screen Near Face"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 56,
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
					"uri": "176.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #177",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "177.png",
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
				"value": "Prototype Host"
			},
			{
				"trait_type": "Hair",
				"value": "White Messy Hair"
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
				"value": "Torn Jacket"
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
				"value": 233,
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
					"uri": "177.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #178",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "178.png",
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
				"value": "Red Medium Hair"
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
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
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
				"value": 101,
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
					"uri": "178.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #179",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "179.png",
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
				"value": "Legendary"
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
				"value": "Brown Side Ponytail"
			},
			{
				"trait_type": "Eyes",
				"value": "Aqua"
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
				"value": "None"
			},
			{
				"trait_type": "Accessory",
				"value": "Ornate Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "Katana On Back"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 3,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 51,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "179.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #180",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "180.png",
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
				"value": "Strategist"
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
				"value": "Closed Mouth"
			},
			{
				"trait_type": "Outfit",
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Sunglasses"
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
				"value": 137,
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
					"uri": "180.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #181",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "181.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Dead Channel Prophet"
			},
			{
				"trait_type": "Hair",
				"value": "Red Short Hair"
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
				"value": "White Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mechanical Halo"
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
				"value": 68,
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
					"uri": "181.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #182",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "182.png",
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
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Slicked Back Hair"
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
				"value": "Turtleneck Blazer"
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
				"value": 234,
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
					"uri": "182.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #183",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "183.png",
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
				"value": "Interface Disciple"
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
				"value": "Grin"
			},
			{
				"trait_type": "Outfit",
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
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
				"value": 247,
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
					"uri": "183.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #184",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "184.png",
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
				"value": "Systems Architect"
			},
			{
				"trait_type": "Hair",
				"value": "Red Wavy Hair"
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
				"value": "Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Small Gold Demon Horns"
			},
			{
				"trait_type": "Accessory",
				"value": "Glowing Metal Collar"
			},
			{
				"trait_type": "Special",
				"value": "Katana On Back"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 7,
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
					"uri": "184.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #185",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "185.png",
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
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Dreadlocks"
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
				"value": "White Bodysuit"
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
				"value": 187,
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
					"uri": "185.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #186",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "186.png",
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
				"value": "Blonde Cornrows"
			},
			{
				"trait_type": "Eyes",
				"value": "Grey"
			},
			{
				"trait_type": "Demeanor",
				"value": "Clenched Teeth"
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
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 120,
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
					"uri": "186.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #187",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "187.png",
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
				"value": "Prototype Host"
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
				"value": "Armored Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Neck Cable"
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
				"value": 17,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "187.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #188",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "188.png",
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
				"value": "Common"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Interface Disciple"
			},
			{
				"trait_type": "Hair",
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
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
				"value": "Gold Circlet"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 166,
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
					"uri": "188.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #189",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "189.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Checkpoint Officer"
			},
			{
				"trait_type": "Hair",
				"value": "White Wavy Hair"
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
				"value": "Armored Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
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
				"value": 248,
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
					"uri": "189.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #190",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "190.png",
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
				"value": "Elite"
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
				"value": "Pink Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Heterochromia"
			},
			{
				"trait_type": "Demeanor",
				"value": "Frown"
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
				"value": "Shoulder Armor"
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
				"value": 36,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "190.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #191",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "191.png",
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
				"value": "Blue Dreadlocks"
			},
			{
				"trait_type": "Eyes",
				"value": "Brown"
			},
			{
				"trait_type": "Demeanor",
				"value": "Confident"
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
				"value": "Shoulder Armor"
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
				"value": 38,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "191.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #192",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "192.png",
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
				"value": "Strategist"
			},
			{
				"trait_type": "Hair",
				"value": "Red Undercut"
			},
			{
				"trait_type": "Eyes",
				"value": "Orange"
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
				"value": "Glasses"
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
				"value": 235,
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
					"uri": "192.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #193",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "193.png",
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
				"value": "Blue Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Plain Baseball Cap"
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
				"value": 138,
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
					"uri": "193.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #194",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "194.png",
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
				"value": "Signal Smuggler"
			},
			{
				"trait_type": "Hair",
				"value": "Black Asymmetrical Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Heterochromia"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Torn Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Skull Print Bandana Around Neck"
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
				"value": 38,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "194.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #195",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "195.png",
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
				"value": "Signal Evangelist"
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
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 249,
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
					"uri": "195.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #196",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "196.png",
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
				"value": "Rare"
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
				"value": "Brown Messy Hair"
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
				"value": "Torn Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 37,
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
					"uri": "196.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #197",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "197.png",
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
				"value": "Blonde Short Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
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
				"value": "Earpiece"
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
				"value": 188,
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
					"uri": "197.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #198",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "198.png",
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
				"value": "Hacker"
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
				"value": "Armored Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
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
				"value": 189,
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
					"uri": "198.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #199",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "199.png",
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
				"value": "Breach Unit"
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
				"value": "Frown"
			},
			{
				"trait_type": "Outfit",
				"value": "Dark Uniform"
			},
			{
				"trait_type": "Headwear",
				"value": "Earpiece"
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
				"value": 190,
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
					"uri": "199.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #200",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "200.png",
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
				"value": "Legendary"
			},
			{
				"trait_type": "Frame",
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Interface Disciple"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Bob Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
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
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Ornate Shoulder Mantle"
			},
			{
				"trait_type": "Special",
				"value": "Katana On Back"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 4,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 51,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "200.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #201",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "201.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Breach Unit"
			},
			{
				"trait_type": "Hair",
				"value": "Red Bob Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Orange"
			},
			{
				"trait_type": "Demeanor",
				"value": "Clenched Teeth"
			},
			{
				"trait_type": "Outfit",
				"value": "Armored Bodysuit"
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
				"value": 121,
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
					"uri": "201.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #202",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "202.png",
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
				"value": "Jacket"
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
				"value": 87,
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
					"uri": "202.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #203",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "203.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "Blue Short Hair"
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
				"value": "Long Coat"
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
				"value": 148,
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
					"uri": "203.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #204",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "204.png",
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
				"value": "Rare"
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
				"value": "Aqua"
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
				"value": 45,
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
					"uri": "204.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #205",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "205.png",
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
				"value": "White Jacket"
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
				"value": 236,
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
					"uri": "205.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #206",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "206.png",
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
				"value": "Riot Enforcer"
			},
			{
				"trait_type": "Hair",
				"value": "White Long Hair"
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
				"value": "Tactical Vest"
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
				"value": 237,
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
					"uri": "206.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #207",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "207.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "Orange Slicked Back Hair"
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
				"value": "White Coat"
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
				"value": 122,
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
					"uri": "207.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #208",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "208.png",
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
				"value": "Blonde Short Hair"
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
				"value": 167,
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
					"uri": "208.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #209",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "209.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "White Braid"
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
				"value": 139,
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
					"uri": "209.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #210",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "210.png",
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
				"value": "Uncommon"
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
				"value": "Pink Undercut"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
			},
			{
				"trait_type": "Demeanor",
				"value": "Confident"
			},
			{
				"trait_type": "Outfit",
				"value": "Street Hoodie"
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
				"value": 102,
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
					"uri": "210.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #211",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "211.png",
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
				"value": "Prototype Host"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Short Hair"
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
				"value": "Sleeveless Shirt"
			},
			{
				"trait_type": "Headwear",
				"value": "Earpiece"
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
				"value": 123,
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
					"uri": "211.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #212",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "212.png",
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
				"value": "Black Braid"
			},
			{
				"trait_type": "Eyes",
				"value": "Yellow"
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
				"value": "Gas Mask"
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
				"value": 140,
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
					"uri": "212.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #213",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "213.png",
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
				"value": "Purple Asymmetrical Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
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
				"value": 168,
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
					"uri": "213.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #214",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "214.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Systems Architect"
			},
			{
				"trait_type": "Hair",
				"value": "Purple Short Hair"
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
				"value": "Structured Coat"
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
				"value": 149,
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
					"uri": "214.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #215",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "215.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Breach Unit"
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
				"value": "Armored Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Radio Antenna"
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
				"value": 169,
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
					"uri": "215.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #216",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "216.png",
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
				"value": "Systems Architect"
			},
			{
				"trait_type": "Hair",
				"value": "Black Braid"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Clenched Teeth"
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
				"value": "Id Badge"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 141,
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
					"uri": "216.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #217",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "217.png",
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
				"value": "Brown Short Hair"
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
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Black Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 155,
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
					"uri": "217.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #218",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "218.png",
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
				"value": "Security Director"
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
				"value": "Neutral"
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
				"value": "Shoulder Armor"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 103,
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
					"uri": "218.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #219",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "219.png",
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
				"value": "Black Very Short Hair, Buzz Cut"
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
				"value": 250,
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
					"uri": "219.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #220",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "220.png",
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
				"value": "Feminine"
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
				"value": "Aqua"
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
				"value": 79,
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
					"uri": "220.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #221",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "221.png",
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
				"value": "Interface Disciple"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Messy Hair"
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
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Gold Circlet"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 191,
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
					"uri": "221.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #222",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "222.png",
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
				"value": "Black Clinic Broker"
			},
			{
				"trait_type": "Hair",
				"value": "Blue Short Hair"
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
				"value": "Long Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Visor"
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
				"value": 104,
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
					"uri": "222.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #223",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "223.png",
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
				"value": "Hacker"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Asymmetrical Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Green"
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
				"value": 142,
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
					"uri": "223.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #224",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "224.png",
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
				"value": "Rare"
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
				"value": "None"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
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
				"value": "Gold Necklace"
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
				"value": 27,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "224.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #225",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "225.png",
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
				"value": "Uncommon"
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
				"value": "Aqua Undercut"
			},
			{
				"trait_type": "Eyes",
				"value": "Grey"
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
				"value": "Goggles"
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
				"value": 143,
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
					"uri": "225.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #226",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "226.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Precinct Commander"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Medium Hair"
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
				"value": "Tactical Vest"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 38,
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
					"uri": "226.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #227",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "227.png",
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
				"value": "Uncommon"
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
				"value": "Blue Long Hair"
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
				"value": "Long Coat"
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
				"value": 144,
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
					"uri": "227.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #228",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "228.png",
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
				"value": "Legendary"
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
				"value": "Blue"
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
				"value": "Spiked Metal Headband"
			},
			{
				"trait_type": "Accessory",
				"value": "Diamond Necklace"
			},
			{
				"trait_type": "Special",
				"value": "Weapon On Back"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 2,
				"display_type": "number"
			},
			{
				"trait_type": "Rarity Score",
				"value": 52,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "228.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #229",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "229.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Interface Disciple"
			},
			{
				"trait_type": "Hair",
				"value": "Blonde Dreadlocks"
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
				"value": "White Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
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
				"value": 16,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "229.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #230",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "230.png",
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
				"value": "Data Analyst"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Braid"
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
				"value": "Blouse"
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
				"value": 145,
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
					"uri": "230.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #231",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "231.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Hacker"
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
				"value": "Armored Vest"
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
				"value": 156,
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
					"uri": "231.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #232",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "232.png",
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
				"value": "Legendary"
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
				"value": "Brown Shaved Head"
			},
			{
				"trait_type": "Eyes",
				"value": "Yellow"
			},
			{
				"trait_type": "Demeanor",
				"value": "Neutral"
			},
			{
				"trait_type": "Outfit",
				"value": "Street Hoodie"
			},
			{
				"trait_type": "Headwear",
				"value": "Visor"
			},
			{
				"trait_type": "Accessory",
				"value": "Ornate Shoulder Mantle"
			},
			{
				"trait_type": "Special",
				"value": "Mechanical Wings On Back"
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
					"uri": "232.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #233",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "233.png",
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
				"value": "Brown Short Hair"
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
				"value": "Street Hoodie"
			},
			{
				"trait_type": "Headwear",
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Camo Bandana Around Neck"
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
				"value": 27,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "233.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #234",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "234.png",
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
				"value": "Brown Slicked Back Hair"
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
				"value": "White Jacket"
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
				"value": 238,
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
					"uri": "234.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #235",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "235.png",
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
				"value": "Black Medium Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Yellow"
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
				"value": 170,
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
					"uri": "235.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #236",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "236.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Signal Evangelist"
			},
			{
				"trait_type": "Hair",
				"value": "Aqua Messy Hair"
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
				"value": 192,
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
					"uri": "236.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #237",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "237.png",
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
				"value": "Masculine"
			},
			{
				"trait_type": "Role",
				"value": "Checkpoint Officer"
			},
			{
				"trait_type": "Hair",
				"value": "Red Crew Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Purple"
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
				"value": 239,
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
					"uri": "237.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #238",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "238.png",
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
				"value": "Feminine"
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
				"value": "White"
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
				"value": "Gold Circlet"
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
				"value": 33,
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
					"uri": "238.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #239",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "239.png",
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
				"value": "Blue Messy Hair"
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
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 48,
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
					"uri": "239.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #240",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "240.png",
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
				"value": "Signal Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Brown Messy Hair"
			},
			{
				"trait_type": "Eyes",
				"value": "Red"
			},
			{
				"trait_type": "Demeanor",
				"value": "Smirk"
			},
			{
				"trait_type": "Outfit",
				"value": "Long Coat"
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
				"value": 212,
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
					"uri": "240.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #241",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "241.png",
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
				"value": "Hacker"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Undercut"
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
				"value": "Hood Up"
			},
			{
				"trait_type": "Accessory",
				"value": "Camo Bandana Around Neck"
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
				"value": 24,
				"display_type": "number"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "241.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #242",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "242.png",
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
				"value": "Dead Channel Prophet"
			},
			{
				"trait_type": "Hair",
				"value": "Blue Very Short Hair, Buzz Cut"
			},
			{
				"trait_type": "Eyes",
				"value": "Heterochromia"
			},
			{
				"trait_type": "Demeanor",
				"value": "Clenched Teeth"
			},
			{
				"trait_type": "Outfit",
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Mechanical Halo"
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
				"value": 57,
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
					"uri": "242.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #243",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "243.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Glitch Runner"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Braid"
			},
			{
				"trait_type": "Eyes",
				"value": "Heterochromia"
			},
			{
				"trait_type": "Demeanor",
				"value": "Serious"
			},
			{
				"trait_type": "Outfit",
				"value": "Bodysuit"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Black Bandana Around Neck"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 240,
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
					"uri": "243.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #244",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "244.png",
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
				"value": "Rare"
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
				"value": "Blonde Curly Hair"
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
				"value": "Structured Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Headset"
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
				"value": 69,
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
					"uri": "244.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #245",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "245.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Checkpoint Officer"
			},
			{
				"trait_type": "Hair",
				"value": "Grey Slicked Back Hair"
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
				"value": "Body Armor"
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
				"value": 213,
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
					"uri": "245.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #246",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "246.png",
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
				"value": "Grey Hair Over One Eye"
			},
			{
				"trait_type": "Eyes",
				"value": "Orange"
			},
			{
				"trait_type": "Demeanor",
				"value": "Slight Frown"
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
				"value": "Dog Tags"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 124,
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
					"uri": "246.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #247",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "247.png",
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
				"value": "Pink Medium Hair"
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
				"value": 150,
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
					"uri": "247.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #248",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "248.png",
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
				"value": "Green Undercut"
			},
			{
				"trait_type": "Eyes",
				"value": "White"
			},
			{
				"trait_type": "Demeanor",
				"value": "Clenched Teeth"
			},
			{
				"trait_type": "Outfit",
				"value": "Bomber Jacket"
			},
			{
				"trait_type": "Headwear",
				"value": "Goggles"
			},
			{
				"trait_type": "Accessory",
				"value": "Pendant Necklace"
			},
			{
				"trait_type": "Special",
				"value": "None"
			},
			{
				"trait_type": "Rarity Rank",
				"value": 241,
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
					"uri": "248.png",
					"type": "image/png"
				}
			],
			"category": "image"
		}
	},
	{
		"name": "Echoes #249",
		"description": "Recovered from the DSPRS event, Echoes are dispersed identities shaped by control, mutation, belief, and survival in the fractured megacity of Tessera.",
		"image": "249.png",
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
				"value": "Feminine"
			},
			{
				"trait_type": "Role",
				"value": "Transmission Guard"
			},
			{
				"trait_type": "Hair",
				"value": "Green Medium Hair"
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
				"value": "White Coat"
			},
			{
				"trait_type": "Headwear",
				"value": "Mask"
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
				"value": 58,
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
					"uri": "249.png",
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

/** Variant count per echo index (default 1, exceptions listed) */
const VARIANT_EXCEPTIONS: Record<number, number> = {}

function getVariantCount(index: number): number {
	return VARIANT_EXCEPTIONS[index] ?? 1
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
