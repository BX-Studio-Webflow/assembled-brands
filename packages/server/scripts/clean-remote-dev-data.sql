PRAGMA foreign_keys=OFF;

DELETE FROM financial_documents;
DELETE FROM financial_overview;
DELETE FROM financial_step_folders;
DELETE FROM onboarding_applications;
DELETE FROM financial_wizard_applications;
DELETE FROM businesses;
DELETE FROM deal_applications;
DELETE FROM hubspot_deal_webhook_events;
DELETE FROM hubspot_contact_webhook_events;
DELETE FROM team_invitations;
DELETE FROM team_members;
DELETE FROM notifications;
DELETE FROM emails;
DELETE FROM assets;
DELETE FROM subscription;
DELETE FROM user;
DELETE FROM teams;

DELETE FROM sqlite_sequence;

PRAGMA foreign_keys=ON;
