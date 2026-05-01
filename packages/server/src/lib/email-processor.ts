import { env } from 'process';

import { logger } from '../lib/logger.ts';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

const formatErrorMessage = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

const sendTemplateEmail = async (
	email: string,
	name: string,
	templateId: string,
	params: Record<string, string>,
	attachments?: {
		content: string;
		type: string;
		filename: string;
		disposition: string;
	}[],
) => {
	try {
		const body = {
			personalizations: [
				{
					to: [{ email: email }],
					dynamic_template_data: params,
				},
			],
			from: { email: 'support@assembledbrands.com', name: 'Assembled Brands' },
			template_id: templateId,
			attachments: attachments,
		};

		const response = await fetch(SENDGRID_API_URL, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorBody = await response.json();
			logger.error({ error: errorBody, email }, 'SendGrid API error');
			throw new Error(`SendGrid API error: ${formatErrorMessage(errorBody)}`);
		}

		logger.info(`Email sent to ${email} using template ${templateId}`);
		return;
	} catch (error) {
		logger.error({ error, email }, 'Failed to send template email');
		throw error instanceof Error ? error : new Error(formatErrorMessage(error));
	}
};

export { sendTemplateEmail };
