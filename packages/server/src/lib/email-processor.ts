import { env } from 'process';

import { logger } from '../lib/logger.ts';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
const sendTransactionalEmail = async (
	email: string,
	name: string,
	templateId: number,
	params: {
		subject: string;
		title: string;
		subtitle: string;
		body: string;
		buttonText: string;
		buttonLink: string;
		busname?: string;
	},
) => {
	try {
		const response = await fetch(SENDGRID_API_URL, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
			},
			body: JSON.stringify({
				templateId: templateId,
				to: [
					{
						email: email,
						name: name,
					},
				],
				params: params,
			}),
		});

		if (!response.ok) {
			const error = await response.json();

			logger.info(error);
			throw new Error(error as string);
		}

		logger.info(`Email sent to ${email} using template ${templateId}`);
		return;
	} catch (error) {
		logger.error(error);
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
			const error = await response.json();

			logger.info(error);
			throw new Error(error as string);
		}

		logger.info(`Email sent to ${email} using template ${templateId}`);
		return;
	} catch (error) {
		logger.error(error);
	}
};

export { sendTemplateEmail, sendTransactionalEmail };
