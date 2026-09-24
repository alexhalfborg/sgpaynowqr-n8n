import type { IDataObject } from 'n8n-workflow';

export const DEFAULT_BASE_URL = 'https://developers.sgpaynowqr.com/api/v1';
export const PORTAL_URL = 'https://developers.sgpaynowqr.com';

export type PaymentType = 'uen' | 'mobile' | 'vpa';

export interface GenerateInput {
	paymentType: PaymentType;
	uen?: string;
	merchantName?: string;
	mobileNumber?: string;
	vpa?: string;
	amount: number;
	reference?: string;
	options: {
		expiry?: string;
		qrColor?: string;
		qrSize?: number;
		includeImage?: boolean;
	};
}

export interface GenerateRequestBody extends IDataObject {
	payment_type: PaymentType;
	amount: number;
	uen?: string;
	merchant_name?: string;
	mobile_number?: string;
	vpa?: string;
	reference?: string;
	expiry?: string;
	qr_color?: string;
	qr_size?: number;
	include_image: boolean;
}

export interface GenerateResponseData {
	qr_string: string;
	payment_type: PaymentType;
	amount: string;
	currency: 'SGD';
	reference: string | null;
	expiry: string;
	qr_image_base64?: string;
	image_mime_type?: string;
	/** Signed link to the QR code PNG. Missing from API versions before it was added. */
	image_url?: string;
}

export interface ApiMeta {
	api_version?: string;
	request_id?: string;
	usage?: { used: number; limit: number; period: string };
}

export interface ApiErrorBody {
	success: false;
	error?: { code?: string; message?: string };
	meta?: ApiMeta;
}

/** Strips all whitespace, e.g. "9123 4567" -> "91234567". */
function compact(value: string | undefined): string {
	return (value ?? '').replace(/\s+/g, '');
}

/** Maps the node's camelCase parameters to the API's snake_case request body. */
export function buildGenerateBody(input: GenerateInput): GenerateRequestBody {
	const body: GenerateRequestBody = {
		payment_type: input.paymentType,
		amount: input.amount,
		include_image: input.options.includeImage ?? true,
	};

	if (input.paymentType === 'uen') {
		body.uen = compact(input.uen).toUpperCase();
		body.merchant_name = (input.merchantName ?? '').trim();
	} else if (input.paymentType === 'mobile') {
		body.mobile_number = compact(input.mobileNumber);
	} else {
		body.vpa = compact(input.vpa);
	}

	const reference = compact(input.reference);
	if (reference) body.reference = reference;

	const { expiry, qrColor, qrSize } = input.options;
	if (expiry) body.expiry = expiry;
	if (qrColor) body.qr_color = qrColor.replace(/^#/, '');
	if (qrSize) body.qr_size = Number(qrSize);

	return body;
}

/** Turns an API error response into a message and hint for the n8n UI. */
export function describeApiError(
	status: number,
	body: ApiErrorBody | undefined,
): { message: string; description: string } {
	const apiMessage = body?.error?.message ?? `Request failed with status ${status}`;
	const code = body?.error?.code;

	if (status === 401 || code === 'UNAUTHORIZED') {
		return {
			message: 'Invalid or missing SGPayNowQR API key',
			description: `Check the API key in your SGPayNowQR credential. You can create a new key at ${PORTAL_URL}/api-keys.`,
		};
	}

	if (status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
		return {
			message: 'Monthly SGPayNowQR quota used up',
			description: `Your plan's monthly request limit has been reached. It resets on the 1st of the month (Singapore time), or you can upgrade at ${PORTAL_URL}/billing.`,
		};
	}

	if (status === 400) {
		return {
			message: `Invalid request: ${apiMessage}`,
			description:
				'Check the payment details. UEN payments need a UEN and merchant name, mobile numbers must be Singapore numbers starting with 8 or 9, and the reference may only contain letters and numbers.',
		};
	}

	return {
		message: apiMessage,
		description: body?.meta?.request_id
			? `Request ID: ${body.meta.request_id}`
			: 'The SGPayNowQR API returned an unexpected error. Please try again.',
	};
}

/** File name for the QR image, e.g. "paynow-INV001.png". */
export function qrFileName(reference: string | null | undefined): string {
	return `paynow-${reference || 'qr'}.png`;
}
