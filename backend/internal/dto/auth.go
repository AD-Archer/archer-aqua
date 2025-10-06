package dto

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
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
