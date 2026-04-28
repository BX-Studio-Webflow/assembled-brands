import { validator } from 'hono/validator';
import { z } from 'zod';

import { validateSchema } from './validator.js';

const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(8).max(40),
});

const loginValidator = validator('json', (value, c) => {
	return validateSchema(c, loginSchema, value);
});

const registrationSchema = z.object({
	work_email: z.email(),
});

const startAccountRecoverySchema = z.object({
	email: z.email(),
});

const claimYourAccountSchema = z.object({
	work_email: z.email(),
	first_name: z.string().min(2).max(40),
	last_name: z.string().min(2).max(40),
	password: z.string().min(8).max(40),
	loan_urgency: z.enum(['yesterday', 'this-month', '3-months', 'this-year']),
});

const claimYourAccountValidator = validator('json', (value, c) => {
	return validateSchema(c, claimYourAccountSchema, value);
});

const startAccountRecoveryValidator = validator('json', (value, c) => {
	return validateSchema(c, startAccountRecoverySchema, value);
});

const registrationValidator = validator('json', (value, c) => {
	return validateSchema(c, registrationSchema, value);
});

const emailVerificationSchema = z.object({
	email: z.email(),
});

const emailVerificationValidator = validator('json', (value, c) => {
	return validateSchema(c, emailVerificationSchema, value);
});

const verifyEmailAndSetPasswordSchema = z.object({
	token: z.number(),
	id: z.number(),
	password: z.string().min(8).max(40),
});

const verifyEmailAndSetPasswordValidator = validator('json', (value, c) => {
	return validateSchema(c, verifyEmailAndSetPasswordSchema, value);
});

const requestResetPasswordSchema = z.object({
	email: z.email(),
});

const requestResetPasswordValidator = validator('json', (value, c) => {
	return validateSchema(c, requestResetPasswordSchema, value);
});

const resetPasswordSchema = z.object({
	token: z.number(),
	email: z.email(),
	password: z.string().min(8).max(40),
});

const resetPasswordValidator = validator('json', (value, c) => {
	return validateSchema(c, resetPasswordSchema, value);
});

const updateUserDetailsSchema = z.object({
	first_name: z.string().min(2).max(40),
	last_name: z.string().min(2).max(40),
	email: z.email(),
	dial_code: z.string(),
	phone: z.string(),
});

const updateUserDetailsValidator = validator('json', (value, c) => {
	return validateSchema(c, updateUserDetailsSchema, value);
});
/**
 * Shared envelope for HubSpot CRM subscription webhooks (contacts, deals, etc.).
 * HubSpot POSTs a JSON array of events. Example deal webhook item:
 * `{ "subscriptionType": "deal.creation", "objectId": 123, ... }`
 */
const hubspotCrmWebhookEventSchema = z.object({
	appId: z.number(),
	eventId: z.number(),
	subscriptionId: z.number(),
	portalId: z.number(),
	occurredAt: z.number(),
	subscriptionType: z.string(),
	attemptNumber: z.number(),
	objectId: z.number(),
	changeSource: z.string(),
	changeFlag: z.string(),
});

const hubspotNewLeadSchema = z.array(hubspotCrmWebhookEventSchema);
const hubspotNewDealSchema = z.array(hubspotCrmWebhookEventSchema);

type LoginBody = z.infer<typeof loginSchema>;
type RegistrationBody = z.infer<typeof registrationSchema>;
type EmailVerificationBody = z.infer<typeof emailVerificationSchema>;
type VerifyEmailAndSetPasswordBody = z.infer<typeof verifyEmailAndSetPasswordSchema>;
type RequestResetPasswordBody = z.infer<typeof requestResetPasswordSchema>;
type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
type StartAccountRecoveryBody = z.infer<typeof startAccountRecoverySchema>;
type ClaimYourAccountBody = z.infer<typeof claimYourAccountSchema>;
type UpdateUserDetailsBody = z.infer<typeof updateUserDetailsSchema>;

type HubspotNewLeadBody = z.infer<typeof hubspotNewLeadSchema>;
type HubspotNewDealBody = z.infer<typeof hubspotNewDealSchema>;
type HubspotCrmWebhookEvent = z.infer<typeof hubspotCrmWebhookEventSchema>;

export {
	type ClaimYourAccountBody,
	claimYourAccountValidator,
	type EmailVerificationBody,
	emailVerificationValidator,
	type HubspotCrmWebhookEvent,
	hubspotCrmWebhookEventSchema,
	type HubspotNewDealBody,
	hubspotNewDealSchema,
	type HubspotNewLeadBody,
	hubspotNewLeadSchema,
	type LoginBody,
	loginValidator,
	type RegistrationBody,
	registrationValidator,
	type RequestResetPasswordBody,
	requestResetPasswordValidator,
	type ResetPasswordBody,
	resetPasswordValidator,
	type StartAccountRecoveryBody,
	startAccountRecoveryValidator,
	type UpdateUserDetailsBody,
	updateUserDetailsValidator,
	type VerifyEmailAndSetPasswordBody,
	verifyEmailAndSetPasswordValidator,
};
