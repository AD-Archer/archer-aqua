package services

import (
	"bytes"
	"crypto/rand"
	"encoding/base32"
	"fmt"
	"html/template"
	"net/smtp"

	"github.com/AD-Archer/archer-aqua/backend/internal/config"
)

type EmailService struct {
	cfg config.Config
}

func NewEmailService(cfg config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

func (s *EmailService) IsEnabled() bool {
	return s.cfg.SMTPEnabled
}

func (s *EmailService) SendVerificationEmail(email, displayName, token string) error {
	if !s.IsEnabled() {
		return fmt.Errorf("email service is not configured")
	}

	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", s.cfg.FrontendURL, token)

	subject := "Verify your email address"
	htmlBody := s.generateVerificationEmailHTML(displayName, verificationURL)
	textBody := s.generateVerificationEmailText(displayName, verificationURL)

	return s.sendEmail(email, subject, htmlBody, textBody)
}

func (s *EmailService) SendPasswordResetEmail(email, displayName, token string) error {
	if !s.IsEnabled() {
		return fmt.Errorf("email service is not configured")
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.cfg.FrontendURL, token)

	subject := "Reset your password"
	htmlBody := s.generatePasswordResetEmailHTML(displayName, resetURL)
	textBody := s.generatePasswordResetEmailText(displayName, resetURL)

	return s.sendEmail(email, subject, htmlBody, textBody)
}

func (s *EmailService) SendTwoFactorBackupCodes(email, displayName string, backupCodes []string) error {
	if !s.IsEnabled() {
		return fmt.Errorf("email service is not configured")
	}

	subject := "Your two-factor authentication backup codes"
	htmlBody := s.generateBackupCodesEmailHTML(displayName, backupCodes)
	textBody := s.generateBackupCodesEmailText(displayName, backupCodes)

	return s.sendEmail(email, subject, htmlBody, textBody)
}

func (s *EmailService) sendEmail(to, subject, htmlBody, textBody string) error {
	auth := smtp.PlainAuth("", s.cfg.SMTPUsername, s.cfg.SMTPPassword, s.cfg.SMTPHost)

	from := fmt.Sprintf("%s <%s>", s.cfg.SMTPFromName, s.cfg.SMTPFromEmail)

	// Create message with both HTML and text parts
	msg := []byte(fmt.Sprintf(`From: %s
To: %s
Subject: %s
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="boundary"

--boundary
Content-Type: text/plain; charset="UTF-8"

%s

--boundary
Content-Type: text/html; charset="UTF-8"

%s
--boundary--
`, from, to, subject, textBody, htmlBody))

	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)
	return smtp.SendMail(addr, auth, s.cfg.SMTPFromEmail, []string{to}, msg)
}

func (s *EmailService) generateVerificationEmailHTML(displayName, verificationURL string) string {
	tmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
        <h1 style="margin: 0;">🌊 Archer Aqua</h1>
        <p style="margin: 10px 0 0 0;">Stay Hydrated, Stay Healthy</p>
    </div>
    
    <div style="padding: 30px 0;">
        <h2>Hi {{.DisplayName}}!</h2>
        <p>Welcome to Archer Aqua! Please verify your email address to complete your account setup.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.VerificationURL}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea;">{{.VerificationURL}}</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 14px; color: #666;">
            If you didn't create an account with Archer Aqua, you can safely ignore this email.
        </p>
    </div>
</body>
</html>`

	t, _ := template.New("email").Parse(tmpl)
	var buf bytes.Buffer
	t.Execute(&buf, map[string]string{
		"DisplayName":     displayName,
		"VerificationURL": verificationURL,
	})
	return buf.String()
}

func (s *EmailService) generateVerificationEmailText(displayName, verificationURL string) string {
	return fmt.Sprintf(`Hi %s!

Welcome to Archer Aqua! Please verify your email address to complete your account setup.

Click this link to verify your email: %s

If you didn't create an account with Archer Aqua, you can safely ignore this email.

Best regards,
The Archer Aqua Team`, displayName, verificationURL)
}

func (s *EmailService) generatePasswordResetEmailHTML(displayName, resetURL string) string {
	tmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
        <h1 style="margin: 0;">🌊 Archer Aqua</h1>
        <p style="margin: 10px 0 0 0;">Stay Hydrated, Stay Healthy</p>
    </div>
    
    <div style="padding: 30px 0;">
        <h2>Hi {{.DisplayName}}!</h2>
        <p>We received a request to reset your password for your Archer Aqua account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.ResetURL}}" style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #dc3545;">{{.ResetURL}}</p>
        
        <p style="font-weight: bold; color: #dc3545;">This link will expire in 1 hour.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 14px; color: #666;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
        </p>
    </div>
</body>
</html>`

	t, _ := template.New("email").Parse(tmpl)
	var buf bytes.Buffer
	t.Execute(&buf, map[string]string{
		"DisplayName": displayName,
		"ResetURL":    resetURL,
	})
	return buf.String()
}

func (s *EmailService) generatePasswordResetEmailText(displayName, resetURL string) string {
	return fmt.Sprintf(`Hi %s!

We received a request to reset your password for your Archer Aqua account.

Click this link to reset your password: %s

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

Best regards,
The Archer Aqua Team`, displayName, resetURL)
}

func (s *EmailService) generateBackupCodesEmailHTML(displayName string, backupCodes []string) string {
	codesHTML := ""
	for _, code := range backupCodes {
		codesHTML += fmt.Sprintf(`<li style="font-family: monospace; font-size: 16px; padding: 5px 0;">%s</li>`, code)
	}

	tmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Two-Factor Authentication Backup Codes</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
        <h1 style="margin: 0;">🌊 Archer Aqua</h1>
        <p style="margin: 10px 0 0 0;">Stay Hydrated, Stay Healthy</p>
    </div>
    
    <div style="padding: 30px 0;">
        <h2>Hi {{.DisplayName}}!</h2>
        <p>You've successfully enabled two-factor authentication for your Archer Aqua account. Here are your backup codes:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">🔐 Backup Codes</h3>
            <ul style="list-style: none; padding: 0;">
                {{.BackupCodes}}
            </ul>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ Important:</p>
            <ul style="margin: 10px 0 0 20px; color: #856404;">
                <li>Save these codes in a secure location</li>
                <li>Each code can only be used once</li>
                <li>Use these codes if you lose access to your authenticator app</li>
                <li>Keep them confidential and never share them</li>
            </ul>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 14px; color: #666;">
            Your account security is important to us. If you have any questions, please contact our support team.
        </p>
    </div>
</body>
</html>`

	t, _ := template.New("email").Parse(tmpl)
	var buf bytes.Buffer
	t.Execute(&buf, map[string]string{
		"DisplayName": displayName,
		"BackupCodes": codesHTML,
	})
	return buf.String()
}

func (s *EmailService) generateBackupCodesEmailText(displayName string, backupCodes []string) string {
	codesText := ""
	for _, code := range backupCodes {
		codesText += fmt.Sprintf("  - %s\n", code)
	}

	return fmt.Sprintf(`Hi %s!

You've successfully enabled two-factor authentication for your Archer Aqua account. Here are your backup codes:

%s

IMPORTANT:
- Save these codes in a secure location
- Each code can only be used once
- Use these codes if you lose access to your authenticator app
- Keep them confidential and never share them

Your account security is important to us. If you have any questions, please contact our support team.

Best regards,
The Archer Aqua Team`, displayName, codesText)
}

// GenerateSecureToken generates a cryptographically secure random token
func GenerateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(bytes)[:length], nil
}
