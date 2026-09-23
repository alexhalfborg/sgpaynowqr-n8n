import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SgPayNowQrApi implements ICredentialType {
	name = 'sgPayNowQrApi';

	displayName = 'SGPayNowQR API';

	icon: Icon = {
		light: 'file:../nodes/SgPayNowQr/sgpaynowqr.svg',
		dark: 'file:../nodes/SgPayNowQr/sgpaynowqr.dark.svg',
	};

	documentationUrl = 'https://developers.sgpaynowqr.com/docs/guides/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'sgpn_...',
			description:
				'Your SGPayNowQR API key. Create one at https://developers.sgpaynowqr.com/api-keys.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://developers.sgpaynowqr.com/api/v1',
			description: 'Only change this if you were given a different API endpoint',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	// /usage checks the key without counting toward the monthly quota
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/usage',
			method: 'GET',
		},
	};
}
