import type { TFunction } from "i18next";

export const translateBackendError = (errText: string, t: TFunction): string => {
  if (!errText) return "";

  const lower = errText.toLowerCase();

  if (lower.includes("bu e-posta adresi zaten kullanımda")) {
    return t("backendErrors.emailInUse", "This email address is already in use.");
  }
  if (lower.includes("bu kullanıcı adı zaten alınmış")) {
    return t("backendErrors.usernameInUse", "This username is already taken.");
  }
  if (lower.includes("öğrenci bu kursa zaten kayıtlı")) {
    return t("backendErrors.studentAlreadyEnrolled", "Student is already enrolled in this course.");
  }
  if (lower.includes("bu öğrenci numarası sistemde zaten kayıtlı")) {
    return t("backendErrors.studentNumberInUse", "This student number is already registered.");
  }
  if (lower.includes("doğrulama kodu")) {
    return t("backendErrors.invalidCode", "The verification code is wrong or has expired.");
  }
  if (lower.includes("listeden bir branş")) {
    return t("backendErrors.branchRequired", "Choose a discipline from the list.");
  }
  if (lower.includes("karakterlik bir özgeçmiş")) {
    return t("backendErrors.bioTooShort", "Write a longer biography.");
  }
  if (lower.includes("davet kodu geçersiz")) {
    return t("backendErrors.invalidInvite", "This invite code is not valid.");
  }
  if (lower.includes("geçersiz kayıt kodu")) {
    return t("backendErrors.invalidRegistrationCode", "This registration code is not valid.");
  }
  if (lower.includes("gerekli") || lower.includes("zorunlu")) {
    return t("backendErrors.fieldsRequired", "Please fill in all required fields.");
  }

  // Return the original text if no match found
  return errText;
};
