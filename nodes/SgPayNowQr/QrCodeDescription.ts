import type { INodeProperties } from 'n8n-workflow';

const showForGenerate = {
	resource: ['qrCode'],
	operation: ['generate'],
};

export const qrCodeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['qrCode'] } },
		options: [
			{
				name: 'Generate',
				value: 'generate',
				description: 'Generate a PayNow QR code for a fixed amount',
				action: 'Generate a pay now QR code',
			},
		],
		default: 'generate',
	},
];

export const qrCodeFields: INodeProperties[] = [
	{
		displayName: 'Pay To',
		name: 'paymentType',
		type: 'options',
		required: true,
		displayOptions: { show: showForGenerate },
		options: [
			{
				name: 'UEN (Business)',
				value: 'uen',
				description: "Pay to a business's Unique Entity Number",
			},
			{
				name: 'Mobile Number',
				value: 'mobile',
				description: 'Pay to a Singapore mobile number registered with PayNow',
			},
			{
				name: 'VPA',
				value: 'vpa',
				description: 'Pay to a Virtual Payment Address, e.g. +6591234567#GRAB',
			},
		],
		default: 'uen',
	},
	{
		displayName: 'UEN',
		name: 'uen',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showForGenerate, paymentType: ['uen'] } },
		default: '',
		placeholder: '201234567K',
		description: 'Unique Entity Number of the business receiving the payment (max 25 characters)',
	},
	{
		displayName: 'Merchant Name',
		name: 'merchantName',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showForGenerate, paymentType: ['uen'] } },
		default: '',
		placeholder: 'ACME PTE LTD',
		description: "Business name shown in the payer's banking app (max 25 characters)",
	},
	{
		displayName: 'Mobile Number',
		name: 'mobileNumber',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showForGenerate, paymentType: ['mobile'] } },
		default: '',
		placeholder: '91234567',
		description: 'Singapore mobile number starting with 8 or 9, with or without +65',
	},
	{
		displayName: 'VPA',
		name: 'vpa',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showForGenerate, paymentType: ['vpa'] } },
		default: '',
		placeholder: '+6591234567#GRAB',
		description: 'Virtual Payment Address in the format +65XXXXXXXX#PROVIDER or UENXXXX#PROVIDER',
	},
	{
		displayName: 'Amount (SGD)',
		name: 'amount',
		type: 'number',
		required: true,
		displayOptions: { show: showForGenerate },
		typeOptions: {
			minValue: 0.01,
			maxValue: 999999.99,
			numberPrecision: 2,
		},
		default: 0,
		description: 'Amount the payer must pay. The payer cannot change it in their banking app.',
	},
	{
		displayName: 'Reference',
		name: 'reference',
		type: 'string',
		displayOptions: { show: showForGenerate },
		default: '',
		placeholder: 'INV001',
		description:
			'Reference shown on the payment, such as an order or invoice number. Letters and numbers only, max 25 characters. Use it to match incoming payments to orders.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: { show: showForGenerate },
		default: {},
		options: [
			{
				displayName: 'Expiry',
				name: 'expiry',
				type: 'options',
				options: [
					{ name: '01 Hour', value: '1h' },
					{ name: '02 Hours', value: '2h' },
					{ name: '06 Hours', value: '6h' },
					{ name: '12 Hours', value: '12h' },
					{ name: '24 Hours', value: '24h' },
					{ name: 'Never', value: 'none' },
				],
				default: '24h',
				description: 'How long the QR code can be paid before it expires',
			},
			{
				displayName: 'Include Image',
				name: 'includeImage',
				type: 'boolean',
				default: true,
				description:
					'Whether to return the QR code as a PNG image in the binary output. Turn off to only return the QR string.',
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'The name of the binary field to put the QR code image in',
			},
			{
				displayName: 'QR Color',
				name: 'qrColor',
				type: 'color',
				default: '#7d1979',
				description: 'Colour of the QR code modules. Defaults to PayNow purple.',
			},
			{
				displayName: 'QR Size',
				name: 'qrSize',
				type: 'options',
				options: [
					{ name: '200 Px', value: 200 },
					{ name: '300 Px', value: 300 },
					{ name: '400 Px', value: 400 },
				],
				default: 300,
				description: 'Width and height of the QR code image',
			},
		],
	},
];
