export interface AuthResponseDto {
    isSuccess: boolean;
    userId?: string;
    message?: string;
    token?: string;
    refreshToken?: string;
    expiration?: string | Date;
    
    // Profile info from Login/Get
    fullName?: string;
    email?: string;
    avtUrl?: string;
    address?: string;
    phoneNumber?: string;
    isActive?: boolean;
    
    roles?: string[];
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    fullName: string;
    email: string;
    password: string;
}

export interface TokenModel {
    accessToken: string;
    refreshToken: string;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}

export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    email: string;
    token: string;
    newPassword: string;
}
