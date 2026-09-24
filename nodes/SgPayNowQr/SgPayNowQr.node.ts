import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { qrCodeFields, qrCodeOperations } from './QrCodeDescription';
import {
	buildGenerateBody,
	DEFAULT_BASE_URL,
	describeApiError,
	qrFileName,
	type ApiErrorBody,
	type ApiMeta,
	type GenerateInput,
	type GenerateResponseData,
	type PaymentType,
} from './GenericFunctions';

// Plain 'main' rather than NodeConnectionTypes.Main: n8n resolves n8n-workflow from
// ~/.n8n/nodes/node_modules when a copy is there, and copies older than 1.90 left by
// other community packages don't export NodeConnectionTypes, so the class can't load.
const MAIN: NodeConnectionType = 'main';

// Programmatic rather than declarative: the API returns the QR image as base64
// inside JSON, and the node turns it into n8n binary data so it can go straight
// into email, chat and storage nodes.
export class SgPayNowQr implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SGPayNowQR',
		name: 'sgPayNowQr',
		icon: { light: 'file:sgpaynowqr.svg', dark: 'file:sgpaynowqr.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Generate Singapore PayNow QR codes with a fixed amount and reference',
		defaults: {
			name: 'SGPayNowQR',
		},
		usableAsTool: true,
		inputs: [MAIN],
		outputs: [MAIN],
		credentials: [
			{
				name: 'sgPayNowQrApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'QR Code',
						value: 'qrCode',
					},
				],
				default: 'qrCode',
			},
			...qrCodeOperations,
			...qrCodeFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('sgPayNowQrApi');
		const baseUrl = ((credentials.baseUrl as string) || DEFAULT_BASE_URL).replace(/\/+$/, '');

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				if (resource !== 'qrCode' || operation !== 'generate') {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}" for resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				const paymentType = this.getNodeParameter('paymentType', i) as PaymentType;
				const input: GenerateInput = {
					paymentType,
					amount: this.getNodeParameter('amount', i) as number,
					reference: this.getNodeParameter('reference', i, '') as string,
					options: this.getNodeParameter('options', i, {}) as GenerateInput['options'],
				};
				if (paymentType === 'uen') {
					input.uen = this.getNodeParameter('uen', i) as string;
					input.merchantName = this.getNodeParameter('merchantName', i) as string;
				} else if (paymentType === 'mobile') {
					input.mobileNumber = this.getNodeParameter('mobileNumber', i) as string;
				} else {
					input.vpa = this.getNodeParameter('vpa', i) as string;
				}

				const binaryPropertyName = this.getNodeParameter(
					'options.binaryPropertyName',
					i,
					'data',
				) as string;

				const requestOptions: IHttpRequestOptions = {
					method: 'POST',
					url: `${baseUrl}/generate`,
					headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
					body: buildGenerateBody(input),
					json: true,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
				};

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'sgPayNowQrApi',
					requestOptions,
				)) as { statusCode: number; body: unknown };

				const status = response.statusCode;
				const responseBody = response.body as
					| { success: true; data: GenerateResponseData; meta?: ApiMeta }
					| ApiErrorBody;

				if (status < 200 || status >= 300 || !responseBody?.success) {
					const { message, description } = describeApiError(
						status,
						responseBody as ApiErrorBody,
					);
					throw new NodeApiError(this.getNode(), (responseBody ?? {}) as unknown as JsonObject, {
						message,
						description,
						httpCode: String(status),
						itemIndex: i,
					});
				}

				const { qr_image_base64: imageBase64, ...data } = responseBody.data;
				const json: IDataObject = {
					...data,
					request_id: responseBody.meta?.request_id,
					usage: responseBody.meta?.usage as IDataObject | undefined,
				};

				const executionItem: INodeExecutionData = { json, pairedItem: { item: i } };

				if (imageBase64) {
					executionItem.binary = {
						[binaryPropertyName]: await this.helpers.prepareBinaryData(
							Buffer.from(imageBase64, 'base64'),
							qrFileName(data.reference),
							data.image_mime_type ?? 'image/png',
						),
					};
				}

				returnData.push(executionItem);
			} catch (error) {
				const nodeError =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });

				if (this.continueOnFail()) {
					returnData.push({
						json: { error: nodeError.message, description: nodeError.description ?? undefined },
						pairedItem: { item: i },
					});
					continue;
				}
				throw nodeError;
			}
		}

		return [returnData];
	}
}
