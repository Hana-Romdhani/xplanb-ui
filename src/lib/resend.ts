import { api } from './api';

// Resend API key is stored in backend - frontend calls backend proxy endpoint
// This avoids CORS issues and keeps API key secure

interface MeetingInvitationData {
    title: string;
    startTime: string;
    createdBy: string;
    description?: string;
    joinUrl: string;
}

interface FolderShareData {
    folderName: string;
    accessLevel: 'view' | 'update';
    sharedBy: string;
    description?: string;
    joinUrl: string;
}

interface DocumentShareData {
    documentName: string;
    accessLevel: 'view' | 'update' | 'edit';
    sharedBy: string;
    description?: string;
    joinUrl: string;
}

export async function sendMeetingInvitation(to: string, meetingDetails: MeetingInvitationData) {
    const emailHtml = generateMeetingInvitationTemplate(meetingDetails);

    try {
        const response = await api.post('/email/send', {
            to: [to],
            subject: `Meeting Invitation: ${meetingDetails.title}`,
            html: emailHtml,
            text: `You've been invited to a meeting: ${meetingDetails.title}\n\nJoin at: ${meetingDetails.joinUrl}`
        });

        console.log('✅ Meeting invitation email sent successfully', response.data);
        return response.data;
    } catch (error: any) {
        console.error('❌ Resend error:', error);
        throw new Error('Failed to send email via Resend');
    }
}

function generateMeetingInvitationTemplate(meetingDetails: MeetingInvitationData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">📹 Meeting Invitation</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                                ${meetingDetails.title}
                            </h2>
                            
                            <p style="color: #666666; margin: 0 0 10px 0; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #333333;">📅 Date & Time:</strong><br>
                                ${new Date(meetingDetails.startTime).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}
                            </p>
                            
                            <p style="color: #666666; margin: 20px 0 10px 0; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #333333;">👤 Organizer:</strong><br>
                                ${meetingDetails.createdBy}
                            </p>
                            
                            ${meetingDetails.description ? `
                            <p style="color: #666666; margin: 20px 0 10px 0; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #333333;">📝 Description:</strong><br>
                                ${meetingDetails.description}
                            </p>
                            ` : ''}
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${meetingDetails.joinUrl}" 
                                           style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                                            Join Meeting
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Link -->
                            <p style="color: #999999; margin: 30px 0 0 0; font-size: 14px; text-align: center;">
                                Or copy this link: <br>
                                <a href="${meetingDetails.joinUrl}" style="color: #667eea; word-break: break-all;">
                                    ${meetingDetails.joinUrl}
                                </a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="color: #999999; margin: 0; font-size: 12px;">
                                Powered by <strong style="color: #667eea;">XPlanB</strong> - Your collaborative workspace
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

export async function sendDocumentShareInvitation(to: string, documentShareData: DocumentShareData) {
    const emailHtml = generateDocumentShareTemplate(documentShareData);

    try {
        const response = await api.post('/email/send', {
            to: [to],
            subject: `Document Shared: ${documentShareData.documentName}`,
            html: emailHtml,
            text: `You've been granted access to the document "${documentShareData.documentName}". Access level: ${documentShareData.accessLevel}\n\nOpen document: ${documentShareData.joinUrl}`
        });

        console.log('✅ Document share email sent successfully', response.data);
        return response.data;
    } catch (error: any) {
        console.error('❌ Resend error:', error);
        throw new Error('Failed to send email via Resend');
    }
}

function generateDocumentShareTemplate(documentShareData: DocumentShareData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Shared</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">📄 Document Shared</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                                ${documentShareData.documentName}
                            </h2>
                            
                            <p style="color: #666666; margin: 0 0 10px 0; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #333333;">👤 Shared by:</strong><br>
                                ${documentShareData.sharedBy}
                            </p>
                            
                            <p style="color: #666666; margin: 20px 0 10px 0; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #333333;">🔐 Access Level:</strong><br>
                                ${documentShareData.accessLevel === 'edit' ? '✏️ Can Edit' : documentShareData.accessLevel === 'update' ? '✏️ Can Update' : '👁️ View Only'}
                            </p>
                            
                            ${documentShareData.description ? `
                            <p style="color: #666666; margin: 20px 0 10px 0; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #333333;">📝 Note:</strong><br>
                                ${documentShareData.description}
                            </p>
                            ` : ''}
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${documentShareData.joinUrl}" 
                                           style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                                            Open Document
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Link -->
                            <p style="color: #999999; margin: 30px 0 0 0; font-size: 14px; text-align: center;">
                                Or copy this link: <br>
                                <a href="${documentShareData.joinUrl}" style="color: #667eea; word-break: break-all;">
                                    ${documentShareData.joinUrl}
                                </a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="color: #999999; margin: 0; font-size: 12px;">
                                Powered by <strong style="color: #667eea;">XPlanB</strong> - Your collaborative workspace
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

export async function sendFolderShareInvitation(to: string, folderShareData: FolderShareData) {
    const emailHtml = generateFolderShareTemplate(folderShareData);

    try {
        const response = await api.post('/email/send', {
            to: [to],
            subject: `Folder Shared: ${folderShareData.folderName}`,
            html: emailHtml,
            text: `You've been granted access to the folder "${folderShareData.folderName}". Access level: ${folderShareData.accessLevel}\n\nOpen folder: ${folderShareData.joinUrl}`
        });

        console.log('✅ Folder share email sent successfully', response.data);
        return response.data;
    } catch (error: any) {
        console.error('❌ Resend error:', error);
        throw new Error('Failed to send email via Resend');
    }
}

function generateFolderShareTemplate(folderShareData: FolderShareData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Folder Shared</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">📁 Folder Shared</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                                ${folderShareData.folderName}
                            </h2>
                            
                            <p style="color: #666666; margin: 0 0 10px 0; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #333333;">👤 Shared by:</strong><br>
                                ${folderShareData.sharedBy}
                            </p>
                            
                            <p style="color: #666666; margin: 20px 0 10px 0; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #333333;">🔐 Access Level:</strong><br>
                                ${folderShareData.accessLevel === 'update' ? '✏️ Can Edit' : '👁️ View Only'}
                            </p>
                            
                            ${folderShareData.description ? `
                            <p style="color: #666666; margin: 20px 0 10px 0; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #333333;">📝 Note:</strong><br>
                                ${folderShareData.description}
                            </p>
                            ` : ''}
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${folderShareData.joinUrl}" 
                                           style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                                            Open Folder
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Link -->
                            <p style="color: #999999; margin: 30px 0 0 0; font-size: 14px; text-align: center;">
                                Or copy this link: <br>
                                <a href="${folderShareData.joinUrl}" style="color: #667eea; word-break: break-all;">
                                    ${folderShareData.joinUrl}
                                </a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="color: #999999; margin: 0; font-size: 12px;">
                                Powered by <strong style="color: #667eea;">XPlanB</strong> - Your collaborative workspace
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

interface PasswordResetData {
    resetUrl: string;
    userName?: string;
    expiresIn?: string;
}

export async function sendPasswordResetEmail(to: string, resetData: PasswordResetData) {
    const emailHtml = generatePasswordResetTemplate(resetData);

    try {
        console.log('📧 Sending password reset email to:', to);
        const response = await api.post('/email/send', {
            to: [to],
            subject: 'Reset Your Password - XPlanB',
            html: emailHtml,
            text: `You requested to reset your password. Click here: ${resetData.resetUrl}\n\nThis link expires in ${resetData.expiresIn || '1 hour'}.`
        });

        console.log('✅ Password reset email sent successfully', response.data);
        return response.data;
    } catch (error: any) {
        console.error('❌ Resend error details:', error);
        console.error('❌ Response data:', error?.response?.data);
        console.error('❌ Response status:', error?.response?.status);
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to send email via Resend';
        throw new Error(errorMessage);
    }
}

function generatePasswordResetTemplate(resetData: PasswordResetData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🔐 Password Reset</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                                ${resetData.userName ? `Hello ${resetData.userName},` : 'Hello,'}
                            </h2>
                            
                            <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                                We received a request to reset your password for your XPlanB account. Click the button below to create a new password:
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetData.resetUrl}" 
                                           style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Link -->
                            <p style="color: #999999; margin: 30px 0 0 0; font-size: 14px; text-align: center;">
                                Or copy this link: <br>
                                <a href="${resetData.resetUrl}" style="color: #667eea; word-break: break-all;">
                                    ${resetData.resetUrl}
                                </a>
                            </p>
                            
                            <p style="color: #666666; margin: 30px 0 10px 0; font-size: 14px; line-height: 1.6;">
                                <strong style="color: #333333;">⏰ Important:</strong> This link will expire in ${resetData.expiresIn || '1 hour'}. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                            </p>
                            
                            <p style="color: #666666; margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
                                For security reasons, we recommend choosing a strong password that you haven't used before.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="color: #999999; margin: 0; font-size: 12px;">
                                Powered by <strong style="color: #667eea;">XPlanB</strong> - Your collaborative workspace
                            </p>
                            <p style="color: #999999; margin: 10px 0 0 0; font-size: 11px;">
                                This is an automated email. Please do not reply to this message.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

