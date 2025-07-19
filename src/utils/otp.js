export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isOTPValid = (otp, expiresAt) => {
  return new Date() < new Date(expiresAt);
};
