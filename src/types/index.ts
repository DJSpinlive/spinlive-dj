// User type
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  address?: string;
  phone?: string;
  country_code?: string;
  dob?: string;
  is_onboarded?: boolean;
  is_kyc_verified?: boolean;
}
