const SLACK_CHAT_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';

export interface SlackPostMessageResult {
	ts: string;
	channel: string;
}

interface SlackApiResponse {
	ok: boolean;
	error?: string;
	ts?: string;
	channel?: string;
}

export async function postSlackMessage(params: {
	botToken: string;
	channelId: string;
	text: string;
	threadTs?: string;
}): Promise<SlackPostMessageResult> {
	const body: Record<string, string> = {
		channel: params.channelId,
		text: params.text,
	};
	if (params.threadTs) {
		body.thread_ts = params.threadTs;
	}

	const response = await fetch(SLACK_CHAT_POST_MESSAGE_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${params.botToken}`,
		},
		body: JSON.stringify(body),
	});

	const data = (await response.json()) as SlackApiResponse;
	if (!data.ok || !data.ts) {
		throw new Error(`Slack chat.postMessage failed: ${data.error ?? 'unknown error'}`);
	}

	return { ts: data.ts, channel: data.channel ?? params.channelId };
}
