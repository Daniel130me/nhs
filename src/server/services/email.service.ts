import { logger } from "../utils/logger";

export interface EmailService {
  sendInvitation(email: string, token: string, role: string, invitedBy: string): Promise<void>;
  sendPasswordReset(email: string, token: string): Promise<void>;
  sendEmailVerification(email: string, token: string): Promise<void>;
  sendAccountApproved(email: string, firstName: string): Promise<void>;
  sendClassEnrolment(email: string, firstName: string, className: string): Promise<void>;
}

export class ConsoleEmailService implements EmailService {
  private getBaseUrl(): string {
    return process.env.APP_URL || "http://localhost:3000";
  }

  async sendInvitation(email: string, token: string, role: string, invitedBy: string): Promise<void> {
    const isProd = process.env.NODE_ENV === "production";
    const maskedToken = isProd ? "[REDACTED_PASSWORD_PROD]" : token;

    logger.info(`[EmailService] Sending account credentials email to ${email}`);
    logger.info(`[EmailService] Role: ${role}, Created By: ${invitedBy}`);
    logger.info(`[EmailService] Auto-generated Password: ${maskedToken}`);
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const isProd = process.env.NODE_ENV === "production";
    const maskedToken = isProd ? "[REDACTED_TOKEN_PROD]" : token;
    const url = `${baseUrl}/reset-password?token=${maskedToken}`;

    logger.info(`[EmailService] Sending password reset email to ${email}`);
    logger.info(`[EmailService] Preview Link: ${url}`);
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const isProd = process.env.NODE_ENV === "production";
    const maskedToken = isProd ? "[REDACTED_TOKEN_PROD]" : token;
    const url = `${baseUrl}/verify-email?token=${maskedToken}`;

    logger.info(`[EmailService] Sending email verification to ${email}`);
    logger.info(`[EmailService] Preview Link: ${url}`);
  }

  async sendAccountApproved(email: string, firstName: string): Promise<void> {
    logger.info(`[EmailService] Sending account approval email to ${email} (Name: ${firstName})`);
  }

  async sendClassEnrolment(email: string, firstName: string, className: string): Promise<void> {
    logger.info(`[EmailService] Sending class enrolment email to ${email} (Name: ${firstName}, Class: ${className})`);
  }
}

// Singleton export
export const emailService: EmailService = new ConsoleEmailService();
