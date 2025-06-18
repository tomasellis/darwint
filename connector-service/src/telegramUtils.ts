import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE_URL = 'https://api.telegram.org/bot';

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
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
  params?: Record<string, any>
): Promise<T> {
  const url = `${TELEGRAM_API_BASE_URL}${TELEGRAM_BOT_TOKEN}/${method}`;
  
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (params) {
    options.body = JSON.stringify(params);
  }

  try {
    console.log(`Making request to: ${method}`);
    console.log('Request params:', params);
    
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${responseText}`);
    
    let data: TelegramApiResponse<T>;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Failed to parse response as JSON: ${responseText}`);
    }
    
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
  parse_mode?: 'Markdown' | 'HTML',
  disable_web_page_preview?: boolean,
  disable_notification?: boolean,
  reply_to_message_id?: number,
  reply_markup?: any
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

  return makeTelegramRequest<SendMessageResponse>('sendMessage', params);
}

/**
 * Get information about the bot
 */
export async function getMe(): Promise<TelegramUser> {
  return makeTelegramRequest<TelegramUser>('getMe');
}