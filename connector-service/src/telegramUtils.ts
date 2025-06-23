import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { registerFont } from 'canvas';

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE_URL = process.env.TELEGRAM_API_BASE_URL;

if (!TELEGRAM_BOT_TOKEN) {
	throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

if (!TELEGRAM_API_BASE_URL) {
	throw new Error('TELEGRAM_API_BASE_URL is not set in environment variables');
}

registerFont(path.join(__dirname, 'fonts', 'DejaVuSans.ttf'), { family: 'DejaVu Sans' });

export type TelegramCallbackQueryData = 'remove' | 'accept'

export interface TelegramCallbackQuery {
	id: string;
	from: TelegramUser;
	message?: TelegramMessage;
	inline_message_id?: string;
	chat_instance: string;
	data?: TelegramCallbackQueryData;
}

export interface TelegramUpdate {
	update_id: number;
	message?: TelegramMessage;
	edited_message?: TelegramMessage;
	channel_post?: TelegramMessage;
	edited_channel_post?: TelegramMessage;
	inline_query?: any;
	chosen_inline_result?: any;
	callback_query?: any;
	shipping_query?: any;
	pre_checkout_query?: any;
	poll?: any;
	poll_answer?: any;
	my_chat_member?: any;
	chat_member?: any;
	chat_join_request?: any;
}

export interface TelegramMessage {
	message_id: number;
	from?: TelegramUser;
	chat: TelegramChat;
	date: number;
	text?: string;
	entities?: TelegramMessageEntity[];
	reply_to_message?: Omit<TelegramMessage, 'reply_to_message'>;
}

export interface TelegramUser {
	id: number;
	is_bot: boolean;
	first_name: string;
	last_name?: string;
	username?: string;
	language_code?: string;
}

export interface TelegramChat {
	id: number;
	type: 'private' | 'group' | 'supergroup' | 'channel';
	title?: string;
	username?: string;
	first_name?: string;
	last_name?: string;
}

export interface TelegramMessageEntity {
	type: string;
	offset: number;
	length: number;
	url?: string;
	user?: TelegramUser;
	language?: string;
}

export interface TelegramApiResponse<T> {
	ok: boolean;
	result: T;
	description?: string;
	error_code?: number;
}

export interface GetUpdatesResponse {
	update_id: number;
	message?: TelegramMessage;
	edited_message?: TelegramMessage;
	channel_post?: TelegramMessage;
	edited_channel_post?: TelegramMessage;
	inline_query?: any;
	chosen_inline_result?: any;
	callback_query?: any;
	shipping_query?: any;
	pre_checkout_query?: any;
	poll?: any;
	poll_answer?: any;
	my_chat_member?: any;
	chat_member?: any;
	chat_join_request?: any;
}

export interface SendMessageResponse {
	message_id: number;
	from: TelegramUser;
	chat: TelegramChat;
	date: number;
	text: string;
}

/**
 * Make a request to the Telegram API
 */
async function makeTelegramRequest<T>(
	method: string,
	params?: Record<string, any> | FormData
): Promise<T> {
	const url = `${TELEGRAM_API_BASE_URL}${TELEGRAM_BOT_TOKEN}/${method}`;

	const options: RequestInit = {
		method: 'POST',
	};

	if (params) {
		if (params instanceof FormData) {
			options.body = params;
		} else {
			options.headers = {
				'Content-Type': 'application/json',
			};
			options.body = JSON.stringify(params);
		}
	}

	try {
		console.log(`Making request to: ${method}`);
		if (!(params instanceof FormData)) {
			console.log('Request params:', params);
		}

		const response = await fetch(url, options);
		const data: TelegramApiResponse<T> = await response.json();

		console.log(`Response status: ${response.status}`);
		console.log(`Response body:`, { data });

		if (!data.ok) {
			throw new Error(`Telegram API error: ${data.description} (${data.error_code})`);
		}

		return data.result;
	} catch (error) {
		console.error(`Error making Telegram API request to ${method}:`, error);
		throw error;
	}
}

/**
 * Get updates from Telegram
 * @param offset - Identifier of the first update to be returned
 * @param limit - Limits the number of updates to be retrieved
 * @param timeout - Timeout in seconds for long polling
 * @param allowed_updates - List of update types to receive
 */
export async function getUpdates(
	offset?: number,
	limit?: number,
	timeout?: number,
	allowed_updates?: string[]
): Promise<TelegramUpdate[]> {
	const params: Record<string, any> = {};

	if (offset !== undefined) params.offset = offset;
	if (limit !== undefined) params.limit = limit;
	if (timeout !== undefined) params.timeout = timeout;
	if (allowed_updates !== undefined) params.allowed_updates = allowed_updates;

	return makeTelegramRequest<TelegramUpdate[]>('getUpdates', params);
}

/**
 * Send a message to a chat
 * @param chat_id - Unique identifier for the target chat
 * @param text - Text of the message to be sent
 * @param parse_mode - Send Markdown or HTML
 * @param disable_web_page_preview - Disables link previews for links in this message
 * @param disable_notification - Sends the message silently
 * @param reply_to_message_id - If the message is a reply, ID of the original message
 * @param reply_markup - Additional interface options
 */
export async function sendMessage(
	chat_id: number | string,
	text: string,
	reply_to_message_id?: number,
	reply_markup?: any,
	parse_mode?: 'Markdown' | 'HTML',
	disable_web_page_preview?: boolean,
	disable_notification?: boolean,
): Promise<SendMessageResponse> {
	const params: Record<string, any> = {
		chat_id,
		text,
	};

	if (parse_mode !== undefined) params.parse_mode = parse_mode;
	if (disable_web_page_preview !== undefined) params.disable_web_page_preview = disable_web_page_preview;
	if (disable_notification !== undefined) params.disable_notification = disable_notification;
	if (reply_to_message_id !== undefined) params.reply_to_message_id = reply_to_message_id;
	if (reply_markup !== undefined) params.reply_markup = reply_markup;

	console.log('using params for send message:', { params })

	return makeTelegramRequest<SendMessageResponse>('sendMessage', params);
}

/**
 * Get information about the bot
 */
export async function getMe(): Promise<TelegramUser> {
	return makeTelegramRequest<TelegramUser>('getMe');
}

/**
 * Deletes a message in a chat.
 * 
 * Calls the Telegram Bot API's `deleteMessage` method to remove a message from a chat.
 * 
 * @param chat_id - Unique identifier for the target chat or username of the target channel (in the format @channelusername)
 * @param message_id - Identifier of the message to delete
 * @returns A Promise that resolves when the message is deleted
 * @see https://core.telegram.org/bots/api#deletemessage
 */
export async function deleteMessage(
	chat_id: number | string,
	message_id: number
): Promise<void> {
	await makeTelegramRequest('deleteMessage', { chat_id, message_id });
}

/**
 * Answers a callback query sent from an inline keyboard button.
 * 
 * This notifies the user that their button press was received and can optionally display a popup notification.
 * 
 * @param callback_query_id - Unique identifier for the query to be answered
 * @param text - (Optional) Text of the notification to be shown as an alert to the user
 * @returns A Promise that resolves when the callback query is answered
 */
export async function answerCallbackQuery(
	callback_query_id: string,
	text?: string
): Promise<void> {
	await makeTelegramRequest('answerCallbackQuery', { callback_query_id, text });
}

/**
 * Generates a Telegram inline keyboard markup object for reply buttons.
 * @param buttons - An array of button definitions, each with text and callback_data.
 *   Example: [{ text: "Button 1", callback_data: "data1" }, ...]
 * @param rowWidth - Number of buttons per row (default: 1)
 * @returns An object with the `inline_keyboard` property.
 */
export function generateInlineKeyboardMarkup(
	buttons: { text: string; callback_data: TelegramCallbackQueryData }[],
	rowWidth: number = 1
): { inline_keyboard: { text: string; callback_data: string }[][] } {
	const inline_keyboard: { text: string; callback_data: string }[][] = [];
	for (let i = 0; i < buttons.length; i += rowWidth) {
		inline_keyboard.push(buttons.slice(i, i + rowWidth));
	}
	return { inline_keyboard };
}

export async function sendPhoto({
	chat_id,
	photoBuffer,
	caption,
	parse_mode,
	reply_markup,
	...otherParams
}: {
	chat_id: number | string,
	photoBuffer: Buffer,
	caption?: string,
	parse_mode?: string,
	reply_markup?: any,
	[key: string]: any
}) {
	const form = new FormData();
	form.append('chat_id', String(chat_id));
	form.append('photo', new Blob([photoBuffer]), 'photo.png');
	if (caption) form.append('caption', caption);
	if (parse_mode) form.append('parse_mode', parse_mode);
	if (reply_markup) form.append('reply_markup', JSON.stringify(reply_markup));
	for (const [key, value] of Object.entries(otherParams)) {
		if (value !== undefined) form.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
	}

	return makeTelegramRequest('sendPhoto', form);
}

const width = 700, height = 700;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

export async function generateExpensePieChart(labels: string[], data: number[], threshold: number = 8): Promise<Buffer> {
	const distinctColors = [
		'#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#00A86B', '#C0C0C0', '#FFD700', '#8B0000',
		'#008080', '#4682B4', '#FF7F50', '#228B22', '#B22222', '#20B2AA', '#D2691E', '#DC143C', '#7B68EE', '#00CED1',
	];
	const total = data.reduce((a, b) => a + b, 0);
	const config = {
		type: 'pie',
		data: {
			labels,
			datasets: [{
				data,
				backgroundColor: labels.map((_, i) => distinctColors[i % distinctColors.length]),
			}]
		},
		plugins: [ChartDataLabels],
		options: {
			layout: {
				padding: {
					top: 40,
					bottom: 40,
					left: 40,
					right: 40
				}
			},
			plugins: {
				title: {
					display: true,
					text: `Total: $${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
					font: {
						family: 'DejaVu Sans',
						size: 32,
						weight: 'bold'
					},
					color: '#222',
					padding: {
						top: 10,
						bottom: 10
					}
				},
				legend: {
					labels: {
						font: {
							family: 'DejaVu Sans',
							size: 22,
							weight: 'bold'
						},
						padding: 30
					}
				},
				tooltip: {
					bodyFont: {
						size: 22
					},
					titleFont: {
						size: 24
					}
				},
				datalabels: {
					display: (context: any) => {
						const value = context.dataset.data[context.dataIndex];
						const sum = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
						const percentage = sum ? (value / sum * 100) : 0;
						return percentage >= threshold;
					},
					formatter: (value: number, context: any) => {
						const sum = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
						const percentage = sum ? (value / sum * 100) : 0;
						if (!percentage) return '';
						const formattedValue = `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
						return [`${percentage.toFixed(1)}%`, formattedValue];
					},
					color: '#fff',
					align: 'center',
					anchor: 'center',
					textAlign: 'center',
					font: (context: any) => ({
						family: 'DejaVu Sans',
						weight: context.lineIndex === 0 ? 'bold' : 'normal',
						size: context.lineIndex === 0 ? 28 : 18
					})
				}
			}
		}
	};
	return await chartJSNodeCanvas.renderToBuffer(config as any);
}