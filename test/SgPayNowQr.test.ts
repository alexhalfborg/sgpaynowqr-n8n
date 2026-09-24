import { describe, expect, it, vi } from 'vitest';
import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { SgPayNowQr } from '../nodes/SgPayNowQr/SgPayNowQr.node';
import {
	buildGenerateBody,
	describeApiError,
	qrFileName,
} from '../nodes/SgPayNowQr/GenericFunctions';

describe('buildGenerateBody', () => {
	it('maps a UEN payment to snake_case and cleans up input', () => {
		const body = buildGenerateBody({
			paymentType: 'uen',
			uen: ' 201234567k ',
			merchantName: '  ACME PTE LTD ',
			amount: 12.5,
			reference: 'INV 001',
			options: { expiry: '1h', qrColor: '#112233', qrSize: 400, includeImage: false },
		});

		expect(body).toEqual({
			payment_type: 'uen',
			uen: '201234567K',
			merchant_name: 'ACME PTE LTD',
			amount: 12.5,
			reference: 'INV001',
			expiry: '1h',
			qr_color: '112233',
			qr_size: 400,
			include_image: false,
		});
	});

	it('maps a mobile payment and omits empty optional fields', () => {
		const body = buildGenerateBody({
			paymentType: 'mobile',
			mobileNumber: '9123 4567',
			amount: 5,
			reference: '',
			options: {},
		});

		expect(body).toEqual({
			payment_type: 'mobile',
			mobile_number: '91234567',
			amount: 5,
			include_image: true,
		});
	});

	it('maps a VPA payment', () => {
		const body = buildGenerateBody({
			paymentType: 'vpa',
			vpa: '+6591234567#GRAB',
			amount: 1,
			options: {},
		});

		expect(body.vpa).toBe('+6591234567#GRAB');
		expect(body.uen).toBeUndefined();
		expect(body.mobile_number).toBeUndefined();
	});
});

describe('describeApiError', () => {
	it('explains a bad key', () => {
		expect(describeApiError(401, undefined).message).toMatch(/API key/);
	});

	it('explains an exhausted quota with an upgrade link', () => {
		const { message, description } = describeApiError(429, {
			success: false,
			error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Monthly usage limit exceeded' },
		});
		expect(message).toMatch(/quota/);
		expect(description).toContain('/billing');
	});

	it('passes validation messages through', () => {
		const { message } = describeApiError(400, {
			success: false,
			error: { code: 'VALIDATION_ERROR', message: 'Invalid mobile number format' },
		});
		expect(message).toBe('Invalid request: Invalid mobile number format');
	});
});

describe('qrFileName', () => {
	it('uses the reference when there is one', () => {
		expect(qrFileName('INV001')).toBe('paynow-INV001.png');
		expect(qrFileName(null)).toBe('paynow-qr.png');
	});
});

// --- execute() with a mocked n8n context ---

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function successResponse(overrides: IDataObject = {}) {
	return {
		statusCode: 200,
		body: {
			success: true,
			data: {
				qr_string: '000201010212...6304ABCD',
				payment_type: 'uen',
				amount: '12.50',
				currency: 'SGD',
				reference: 'INV001',
				expiry: '24h',
				qr_image_base64: PNG_BYTES.toString('base64'),
				image_mime_type: 'image/png',
				image_url: 'https://developers.sgpaynowqr.com/api/v1/qr-image?d=000201&size=300&color=7d1979&sig=abc',
				...overrides,
			},
			meta: {
				api_version: 'v1',
				request_id: 'req_abc',
				usage: { used: 3, limit: 50, period: '2026-09' },
			},
		},
	};
}

function makeContext(
	params: IDataObject,
	response: unknown,
	opts: { continueOnFail?: boolean; items?: number } = {},
) {
	const request = vi.fn().mockResolvedValue(response);
	const prepareBinaryData = vi.fn(async (data: Buffer, fileName: string, mimeType: string) => ({
		data: data.toString('base64'),
		fileName,
		mimeType,
	}));

	const context = {
		getInputData: () => Array.from({ length: opts.items ?? 1 }, () => ({ json: {} })),
		getCredentials: async () => ({
			apiKey: 'sgpn_test',
			baseUrl: 'https://developers.sgpaynowqr.com/api/v1/',
		}),
		getNodeParameter: (name: string, _i: number, fallback?: unknown) => {
			if (name.startsWith('options.')) {
				const options = (params.options ?? {}) as IDataObject;
				return options[name.slice('options.'.length)] ?? fallback;
			}
			return params[name] ?? fallback;
		},
		getNode: () => ({
			id: 'node-1',
			name: 'SGPayNowQR',
			type: 'n8n-nodes-sgpaynowqr.sgPayNowQr',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		continueOnFail: () => opts.continueOnFail ?? false,
		helpers: { httpRequestWithAuthentication: request, prepareBinaryData },
	} as unknown as IExecuteFunctions;

	return { context, request, prepareBinaryData };
}

const uenParams: IDataObject = {
	resource: 'qrCode',
	operation: 'generate',
	paymentType: 'uen',
	uen: '201234567K',
	merchantName: 'ACME PTE LTD',
	amount: 12.5,
	reference: 'INV001',
	options: {},
};

describe('SgPayNowQr.execute', () => {
	const node = new SgPayNowQr();

	it('calls /generate and returns JSON plus a PNG binary', async () => {
		const { context, request, prepareBinaryData } = makeContext(uenParams, successResponse());

		const [[item]] = await node.execute.call(context);

		const [credentialName, options] = request.mock.calls[0] as [string, IHttpRequestOptions];
		expect(credentialName).toBe('sgPayNowQrApi');
		expect(options.method).toBe('POST');
		expect(options.url).toBe('https://developers.sgpaynowqr.com/api/v1/generate');
		expect(options.body).toMatchObject({ payment_type: 'uen', uen: '201234567K', amount: 12.5 });

		expect(item.json).toMatchObject({
			qr_string: '000201010212...6304ABCD',
			amount: '12.50',
			reference: 'INV001',
			image_url: expect.stringContaining('/api/v1/qr-image?'),
			request_id: 'req_abc',
			usage: { used: 3, limit: 50, period: '2026-09' },
		});
		expect(item.json).not.toHaveProperty('qr_image_base64');

		expect(prepareBinaryData).toHaveBeenCalledWith(PNG_BYTES, 'paynow-INV001.png', 'image/png');
		expect(item.binary?.data).toMatchObject({ fileName: 'paynow-INV001.png' });
		expect(item.pairedItem).toEqual({ item: 0 });
	});

	it('uses a custom binary field name and skips binary when there is no image', async () => {
		const withField = makeContext(
			{ ...uenParams, options: { binaryPropertyName: 'qr' } },
			successResponse(),
		);
		const [[item]] = await node.execute.call(withField.context);
		expect(Object.keys(item.binary ?? {})).toEqual(['qr']);

		const noImage = makeContext(
			{ ...uenParams, options: { includeImage: false } },
			successResponse({ qr_image_base64: undefined, image_mime_type: undefined }),
		);
		const [[plain]] = await node.execute.call(noImage.context);
		expect(plain.binary).toBeUndefined();
		expect(plain.json.image_url).toContain('/api/v1/qr-image?');
		expect(noImage.request.mock.calls[0][1].body).toMatchObject({ include_image: false });
	});

	it('throws a NodeApiError with a quota message on 429', async () => {
		const { context } = makeContext(uenParams, {
			statusCode: 429,
			body: {
				success: false,
				error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Monthly usage limit exceeded' },
			},
		});

		const run = node.execute.call(context);
		await expect(run).rejects.toBeInstanceOf(NodeApiError);
		await expect(run).rejects.toThrow(/quota/);
	});

	it('returns an error item per failing input when Continue On Fail is on', async () => {
		const { context } = makeContext(
			uenParams,
			{ statusCode: 401, body: { success: false, error: { code: 'UNAUTHORIZED' } } },
			{ continueOnFail: true, items: 2 },
		);

		const [items] = await node.execute.call(context);
		expect(items).toHaveLength(2);
		expect(items[0].json.error).toMatch(/API key/);
		expect(items[1].pairedItem).toEqual({ item: 1 });
	});
});
