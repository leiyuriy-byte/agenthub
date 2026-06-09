/**
 * Email Service - Handles all email notifications for AgentHub
 * 
 * Supported features:
 * - Transactional emails (welcome, password reset, email verification)
 * - Notification digests (daily/weekly summary)
 * - Comment/mention notifications
 * - Follow notifications
 * 
 * Uses Nodemailer with configurable SMTP settings
 */
import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

// Transporter singleton
let transporter: Transporter | null = null;

/**
 * Initialize the email transporter
 */
export function initializeEmailTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  // const fromName = process.env.SMTP_FROM_NAME || 'AgentHub';

  if (!host || !user || !pass || !from) {
    console.warn('[Email] SMTP not configured. Emails will not be sent.');
    console.warn('[Email] Required env vars: SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });

  console.log(`[Email] Transporter initialized: ${host}:${port}`);
  return transporter;
}

/**
 * Get the email transporter (or null if not configured)
 */
export function getEmailTransporter(): Transporter | null {
  return transporter;
}

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return transporter !== null;
}

/**
 * Send an email
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!transporter) {
    console.warn('[Email] Email not configured, skipping send to:', to);
    return { success: false, error: 'Email not configured' };
  }

  const fromName = process.env.SMTP_FROM_NAME || 'AgentHub';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const mailOptions: SendMailOptions = {
    from: `"${fromName}" <${from}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ============== Email Templates ==============

/**
 * Generate HTML for welcome email
 */
function generateWelcomeEmailHTML(username: string, verifyUrl?: string): string {
  // const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  let verifySection = '';
  if (verifyUrl) {
    verifySection = `
      <div style="margin-top: 24px;">
        <p style="margin-bottom: 12px;">请验证您的邮箱地址:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          验证邮箱
        </a>
        <p style="margin-top: 12px; color: #6b7280; font-size: 13px;">
          如果按钮无法点击，请复制以下链接到浏览器:<br>
          ${verifyUrl}
        </p>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 12px; margin-bottom: 16px;"></div>
            <h1 style="margin: 0; font-size: 24px; color: #111827;">欢迎加入 AgentHub!</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            您好, <strong>${username}</strong>!
          </p>
          
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            感谢您注册 AgentHub - AI Agent 开发者交流社区。我们很高兴您加入我们的社区!
          </p>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px; font-size: 16px; color: #111827;">您可以:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
              <li>发布和发现 AI Agent 项目</li>
              <li>参与技术讨论和问答</li>
              <li>与其他开发者交流学习</li>
              <li>获取最新行业资讯</li>
            </ul>
          </div>
          
          ${verifySection}
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 13px;">
              如果您有任何问题,欢迎随时联系我们。
            </p>
            <p style="margin: 8px 0 0; color: #9ca3af; font-size: 13px;">
              — AgentHub 团队
            </p>
          </div>
        </div>
        
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
          © ${new Date().getFullYear()} AgentHub. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML for password reset email
 */
function generatePasswordResetEmailHTML(username: string, resetUrl: string): string {
  // const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 12px; margin-bottom: 16px;"></div>
            <h1 style="margin: 0; font-size: 24px; color: #111827;">重置密码</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            您好, <strong>${username}</strong>!
          </p>
          
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            我们收到了您的密码重置请求。请点击下方按钮重置您的密码:
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 16px;">
              重置密码
            </a>
          </div>
          
          <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
            链接有效期: 24 小时
          </p>
          
          <p style="margin-top: 16px; color: #9ca3af; font-size: 13px;">
            如果您没有请求重置密码,请忽略此邮件。您的账户安全不会受到影响。
          </p>
          
          <p style="margin-top: 16px; color: #6b7280; font-size: 13px;">
            如果按钮无法点击,请复制以下链接到浏览器:<br>
            <span style="color: #2563eb; word-break: break-all;">${resetUrl}</span>
          </p>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 13px;">
              — AgentHub 团队
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML for comment notification email
 */
function generateCommentNotificationEmailHTML(
  username: string,
  commenterName: string,
  postTitle: string,
  commentPreview: string,
  commentUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 12px; margin-bottom: 16px;"></div>
            <h1 style="margin: 0; font-size: 20px; color: #111827;">新评论通知</h1>
          </div>
          
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            <strong>${commenterName}</strong> 评论了您的帖子:
          </p>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px; font-weight: 500; color: #111827;">${postTitle}</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
              ${commentPreview.substring(0, 200)}${commentPreview.length > 200 ? '...' : ''}
            </p>
          </div>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="${commentUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
              查看评论
            </a>
          </div>
          
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              您可以在设置中关闭邮件通知。
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML for follow notification email
 */
function generateFollowNotificationEmailHTML(
  username: string,
  followerName: string,
  followerUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 12px; margin-bottom: 16px;"></div>
            <h1 style="margin: 0; font-size: 20px; color: #111827;">新粉丝通知</h1>
          </div>
          
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            <strong>${followerName}</strong> 开始关注您了!
          </p>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="${followerUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
              查看主页
            </a>
          </div>
          
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              您可以在设置中关闭邮件通知。
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML for like notification email
 */
function generateLikeNotificationEmailHTML(
  username: string,
  likerName: string,
  itemTitle: string,
  itemUrl: string,
  itemType: 'post' | 'comment' | 'agent'
): string {
  const itemTypeText = itemType === 'post' ? '帖子' : itemType === 'comment' ? '评论' : 'Agent';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 12px; margin-bottom: 16px;"></div>
            <h1 style="margin: 0; font-size: 20px; color: #111827;">赞的通知</h1>
          </div>
          
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            <strong>${likerName}</strong> 赞了您的${itemTypeText}!
          </p>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #111827; font-weight: 500;">${itemTitle}</p>
          </div>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="${itemUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
              查看详情
            </a>
          </div>
          
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              您可以在设置中关闭邮件通知。
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============== Email Sending Functions ==============

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  email: string,
  username: string,
  verifyUrl?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = '欢迎加入 AgentHub!';
  const html = generateWelcomeEmailHTML(username, verifyUrl);
  
  return sendEmail(email, subject, html);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  resetToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
  
  const subject = '重置您的 AgentHub 密码';
  const html = generatePasswordResetEmailHTML(username, resetUrl);
  
  return sendEmail(email, subject, html);
}

/**
 * Send email verification email
 */
export async function sendEmailVerificationEmail(
  email: string,
  username: string,
  verifyToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;
  
  const subject = '验证您的 AgentHub 邮箱';
  const html = generateWelcomeEmailHTML(username, verifyUrl);
  
  return sendEmail(email, subject, html);
}

/**
 * Send comment notification email
 */
export async function sendCommentNotificationEmail(
  toEmail: string,
  username: string,
  commenterName: string,
  postTitle: string,
  commentPreview: string,
  commentUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = `${commenterName} 评论了您的帖子`;
  const html = generateCommentNotificationEmailHTML(
    username,
    commenterName,
    postTitle,
    commentPreview,
    commentUrl
  );
  
  return sendEmail(toEmail, subject, html);
}

/**
 * Send follow notification email
 */
export async function sendFollowNotificationEmail(
  toEmail: string,
  username: string,
  followerName: string,
  followerUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = `${followerName} 开始关注您`;
  const html = generateFollowNotificationEmailHTML(username, followerName, followerUrl);
  
  return sendEmail(toEmail, subject, html);
}

/**
 * Send like notification email
 */
export async function sendLikeNotificationEmail(
  toEmail: string,
  username: string,
  likerName: string,
  itemTitle: string,
  itemUrl: string,
  itemType: 'post' | 'comment' | 'agent'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = `${likerName} 赞了您的${itemType === 'post' ? '帖子' : itemType === 'comment' ? '评论' : 'Agent'}`;
  const html = generateLikeNotificationEmailHTML(
    username,
    likerName,
    itemTitle,
    itemUrl,
    itemType
  );
  
  return sendEmail(toEmail, subject, html);
}

// Export the service
export const emailService = {
  initialize: initializeEmailTransporter,
  getTransporter: getEmailTransporter,
  isConfigured: isEmailConfigured,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendCommentNotificationEmail,
  sendFollowNotificationEmail,
  sendLikeNotificationEmail,
};

export default emailService;
