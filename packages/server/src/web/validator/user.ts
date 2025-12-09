import { validator } from 'hono/validator';
import { z } from 'zod';

import { validateSchema } from './validator.js';

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(20),
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
	password: z.string().min(8).max(20),
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
	email: z.string().email(),
});

const emailVerificationValidator = validator('json', (value, c) => {
	return validateSchema(c, emailVerificationSchema, value);
});

const registerTokenSchema = z.object({
	token: z.number(),
	id: z.number(),
});

const registerTokenValidator = validator('json', (value, c) => {
	return validateSchema(c, registerTokenSchema, value);
});

const requestResetPasswordSchema = z.object({
	email: z.string().email(),
});

const requestResetPasswordValidator = validator('json', (value, c) => {
	return validateSchema(c, requestResetPasswordSchema, value);
});

const resetPasswordSchema = z.object({
	token: z.number(),
	email: z.string().email(),
	password: z.string().min(8).max(20),
});

const resetPasswordValidator = validator('json', (value, c) => {
	return validateSchema(c, resetPasswordSchema, value);
});

const updateUserDetailsSchema = z.object({
	first_name: z.string().min(2).max(40),
	last_name: z.string().min(2).max(40),
	email: z.string().email(),
	dial_code: z.string(),
	phone: z.string(),
});

const updateUserDetailsValidator = validator('json', (value, c) => {
	return validateSchema(c, updateUserDetailsSchema, value);
});

type LoginBody = z.infer<typeof loginSchema>;
type RegistrationBody = z.infer<typeof registrationSchema>;
type EmailVerificationBody = z.infer<typeof emailVerificationSchema>;
type RegisterTokenBody = z.infer<typeof registerTokenSchema>;
type RequestResetPasswordBody = z.infer<typeof requestResetPasswordSchema>;
type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
type StartAccountRecoveryBody = z.infer<typeof startAccountRecoverySchema>;
type ClaimYourAccountBody = z.infer<typeof claimYourAccountSchema>;
type UpdateUserDetailsBody = z.infer<typeof updateUserDetailsSchema>;

export {
	type ClaimYourAccountBody,
	claimYourAccountValidator,
	type EmailVerificationBody,
	emailVerificationValidator,
	type LoginBody,
	loginValidator,
	type RegisterTokenBody,
	registerTokenValidator,
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
};
