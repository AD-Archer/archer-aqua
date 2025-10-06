package services

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

type TwoFactorService struct {
	issuer string
}

func NewTwoFactorService(issuer string) *TwoFactorService {
	return &TwoFactorService{
		issuer: issuer,
	}
}

// GenerateSecret creates a new 2FA secret for a user
func (s *TwoFactorService) GenerateSecret(userEmail string) (*otp.Key, error) {
	return totp.Generate(totp.GenerateOpts{
		Issuer:      s.issuer,
		AccountName: userEmail,
		SecretSize:  32,
	})
}

// GetTOTPURL returns the TOTP URL for QR code generation
func (s *TwoFactorService) GetTOTPURL(key *otp.Key) string {
	return key.URL()
}

// ValidateCode validates a TOTP code against a secret
func (s *TwoFactorService) ValidateCode(secret, code string) bool {
	return totp.Validate(code, secret)
}

// GenerateBackupCodes generates backup codes for 2FA
func (s *TwoFactorService) GenerateBackupCodes(count int) ([]string, error) {
	codes := make([]string, count)
	for i := 0; i < count; i++ {
		code, err := s.generateBackupCode()
		if err != nil {
			return nil, err
		}
		codes[i] = code
	}
	return codes, nil
}

// generateBackupCode generates a single backup code
func (s *TwoFactorService) generateBackupCode() (string, error) {
	// Generate 8 random bytes
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	// Encode as base32 and format as XXXX-XXXX
	encoded := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(bytes)
	if len(encoded) < 8 {
		return "", fmt.Errorf("generated code too short")
	}

	// Take first 8 characters and format as XXXX-XXXX
	code := encoded[:8]
	return fmt.Sprintf("%s-%s", code[:4], code[4:]), nil
}

// ValidateBackupCode validates a backup code against stored backup codes
func (s *TwoFactorService) ValidateBackupCode(storedCodesJSON, inputCode string) (bool, []string, error) {
	if storedCodesJSON == "" {
		return false, nil, nil
	}

	var storedCodes []string
	if err := json.Unmarshal([]byte(storedCodesJSON), &storedCodes); err != nil {
		return false, nil, err
	}

	// Normalize input code (remove spaces, convert to uppercase)
	normalizedInput := strings.ToUpper(strings.ReplaceAll(inputCode, " ", ""))

	// Check if the code exists and remove it if found
	for i, code := range storedCodes {
		normalizedStored := strings.ToUpper(strings.ReplaceAll(code, " ", ""))
		if normalizedStored == normalizedInput {
			// Remove the used code
			updatedCodes := append(storedCodes[:i], storedCodes[i+1:]...)
			return true, updatedCodes, nil
		}
	}

	return false, storedCodes, nil
}

// EncodeBackupCodes encodes backup codes as JSON
func (s *TwoFactorService) EncodeBackupCodes(codes []string) (string, error) {
	data, err := json.Marshal(codes)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
