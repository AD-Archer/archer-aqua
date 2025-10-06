package dto

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

type LoginRequest struct {
	Email         string  `json:"email"`
	Password      string  `json:"password"`
	TwoFactorCode *string `json:"twoFactorCode,omitempty"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type SetPasswordRequest struct {
	NewPassword string `json:"newPassword"`
}

type VerifyEmailRequest struct {
	Token string `json:"token"`
}

type ResendVerificationRequest struct {
	Email string `json:"email"`
}

type Enable2FARequest struct {
	Password string `json:"password"`
}

type Verify2FARequest struct {
	Code string `json:"code"`
}

type Disable2FARequest struct {
	Password string `json:"password"`
	Code     string `json:"code"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

type AuthResponse struct {
	Token      string       `json:"token"`
	User       UserResponse `json:"user"`
	HasProfile bool         `json:"hasProfile"`
}

type AuthStateResponse struct {
	User       UserResponse `json:"user"`
	HasProfile bool         `json:"hasProfile"`
}

type TwoFactorSetupResponse struct {
	QRCodeURL   string   `json:"qrCodeUrl"`
	Secret      string   `json:"secret"`
	BackupCodes []string `json:"backupCodes"`
}

type EmailVerificationResponse struct {
	Message string `json:"message"`
	Sent    bool   `json:"sent"`
}
