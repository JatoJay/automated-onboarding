import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';
    this.isConfigured = !!apiKey;

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service configured with Resend');
    } else {
      this.logger.warn('RESEND_API_KEY not configured - emails will be logged only');
    }
  }

  async sendInviteEmail(data: {
    to: string;
    firstName: string;
    lastName: string;
    inviteLink: string;
    organizationName: string;
    department: string;
    jobTitle: string;
    startDate: Date;
  }) {
    const subject = `Welcome to ${data.organizationName} - Complete Your Onboarding`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to ${data.organizationName}!</h1>
        <p>Hi ${data.firstName},</p>
        <p>We're excited to have you join our team as a <strong>${data.jobTitle}</strong> in the <strong>${data.department}</strong> department.</p>
        <p>Your start date is: <strong>${data.startDate.toLocaleDateString()}</strong></p>
        <p>Please click the button below to set up your account and begin your onboarding:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.inviteLink}" style="background-color: #0070f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Complete Your Registration
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 7 days.</p>
        <p>If you have any questions, please reach out to HR.</p>
        <p>Best regards,<br/>The ${data.organizationName} Team</p>
      </div>
    `;

    return this.send({ to: data.to, subject, html });
  }

  async sendHelpRequestNotification(data: {
    to: string;
    employeeName: string;
    subject: string;
    category: string;
    requestUrl: string;
  }) {
    const emailSubject = `New Help Request: ${data.subject}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Help Request</h2>
        <p><strong>${data.employeeName}</strong> has submitted a help request.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Subject:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Category:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.category}</td>
          </tr>
        </table>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.requestUrl}" style="background-color: #0070f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Request
          </a>
        </div>
      </div>
    `;

    return this.send({ to: data.to, subject: emailSubject, html });
  }

  async sendHelpRequestReplyNotification(data: {
    to: string;
    employeeName: string;
    replierName: string;
    subject: string;
    replyPreview: string;
    requestUrl: string;
  }) {
    const emailSubject = `New Reply: ${data.subject}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Reply to Your Help Request</h2>
        <p>Hi ${data.employeeName},</p>
        <p><strong>${data.replierName}</strong> has replied to your help request: <em>${data.subject}</em></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #333;">"${data.replyPreview}"</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.requestUrl}" style="background-color: #0070f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Full Conversation
          </a>
        </div>
      </div>
    `;

    return this.send({ to: data.to, subject: emailSubject, html });
  }

  async sendTaskReminderEmail(data: {
    to: string;
    firstName: string;
    taskTitle: string;
    dueDate: Date;
    taskUrl: string;
  }) {
    const subject = `Reminder: Task "${data.taskTitle}" is due soon`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Task Reminder</h2>
        <p>Hi ${data.firstName},</p>
        <p>This is a reminder that the following task is due soon:</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>${data.taskTitle}</strong></p>
          <p style="margin: 5px 0 0 0; color: #666;">Due: ${data.dueDate.toLocaleDateString()}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.taskUrl}" style="background-color: #0070f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Task
          </a>
        </div>
      </div>
    `;

    return this.send({ to: data.to, subject, html });
  }

  private async send(data: { to: string; subject: string; html: string }) {
    if (!this.isConfigured) {
      this.logger.log(`[EMAIL LOG] To: ${data.to}, Subject: ${data.subject}`);
      return { success: true, logged: true };
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });
      this.logger.log(`Email sent to ${data.to}: ${data.subject}`);
      return { success: true, id: result.data?.id };
    } catch (error) {
      this.logger.error(`Failed to send email to ${data.to}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
