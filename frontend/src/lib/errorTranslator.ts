import type { TFunction } from "i18next";
import i18n from "../i18n";

type Params = Record<string, string>;
// [pattern of the backend message, key under backendErrors, values pulled from the message]
type Rule = [RegExp, string, ((m: RegExpMatchArray, t: TFunction) => Params)?];

const field = (name: string, t: TFunction) => {
  const n = name.trim();
  return i18n.exists(`dynamic.categories.${n}`) ? t(`dynamic.categories.${n}`) : n;
};
const fields = (list: string, t: TFunction) =>
  list
    .split(",")
    .map((b) => field(b, t))
    .join(", ");

// Every message the API returns (controllers, services, validators, middleware). The API speaks
// Turkish (and a few English) sentences; these turn them into the UI language.
const RULES: Rule[] = [
  // parameterised first, so their fixed parts do not match a shorter rule
  [
    /Bu kursa ders verme isteği atamazsınız\. (.+?) branşına sahip değilsiniz/i,
    "missingBranchForCourse",
    (m, t) => ({ branch: field(m[1], t) }),
  ],
  [
    /Şu branşta verdiğiniz kurslar var: (.+?)\. Önce/i,
    "branchHasCourses",
    (m, t) => ({ branches: fields(m[1], t) }),
  ],
  [
    /branşı değiştirilemez: '(.+?)' branşındaki şu kurs\(lar\)a hâlâ atanmış: (.+?)\. Önce/i,
    "branchLocked",
    (m, t) => ({ branch: fields(m[1], t), courses: m[2] }),
  ],
  [/şifre en az (\d+) karakter/i, "passwordTooShort", (m) => ({ count: m[1] })],
  [/en az (\d+) karakterlik bir özgeçmiş/i, "bioTooShort", (m) => ({ count: m[1] })],
  [/Özgeçmiş en fazla (\d+) karakter/i, "bioTooLong", (m) => ({ count: m[1] })],
  [/Yükleme tutarı 0 ile ([\d.,]+) TL/i, "topUpRange", (m) => ({ max: m[1] })],
  [/İade süresi \((\d+) gün\) doldu/i, "refundWindowPassed", (m) => ({ days: m[1] })],
  [/^Geçersiz kategori/i, "invalidCategory"],
  [/^Geçersiz branş/i, "invalidBranch"],
  [/^Geçersiz seviye/i, "invalidLevel"],

  // auth and account
  [/Bu e-posta adresi zaten kullanımda/i, "emailInUse"],
  [/Bu kullanıcı adı zaten alınmış/i, "usernameInUse"],
  [/Geçerli bir e-posta adresi/i, "invalidEmail"],
  [/Geçerli bir kullanıcı adı/i, "invalidUsername"],
  [/Kullanıcı adı zorunludur/i, "usernameRequired"],
  [/(geçersiz|hatalı).*doğrulama kodu|doğrulama kodu.*(hatalı|geçersiz)/i, "invalidCode"],
  [/listeden bir branş/i, "branchRequired"],
  [/Çok fazla hatalı giriş/i, "tooManyAttempts"],
  [/Geçersiz kullanıcı adı veya şifre/i, "invalidCredentials"],
  [/Mevcut şifre hatalı/i, "wrongCurrentPassword"],
  [/Yönetici hesapları buradan silinemez/i, "adminCannotDelete"],
  [/Bu hesaba karşılık gelen bir kayıt/i, "accountRecordNotFound"],
  [/Kullanıcı bulunamadı/i, "userNotFound"],
  [/^Geçersiz rol/i, "invalidRole"],
  [/^Ad ve soyad zorunludur/i, "nameRequired"],
  [/En fazla (\d+) rozet/i, "tooManyBadges", (m) => ({ count: m[1] })],
  [/^Geçersiz rozet/i, "invalidBadge"],
  [/videonun en az %(\d+)/i, "watchMoreToComplete", (m) => ({ percent: m[1] })],

  // community
  [/^Başlık (\d+)-(\d+) karakter/i, "titleLength", (m) => ({ min: m[1], max: m[2] })],
  [/^Mesaj (\d+)-(\d+) karakter/i, "messageLength", (m) => ({ min: m[1], max: m[2] })],
  [/^Başlık bulunamadı/i, "threadNotFound"],
  [/Bu mesajı silemezsiniz/i, "cannotDeletePost"],
  [/Kendinize arkadaşlık isteği/i, "cannotFriendSelf"],
  [/zaten bir arkadaşlık isteği var/i, "friendRequestExists"],
  [/^İstek bulunamadı/i, "requestNotFound"],
  [/Yalnızca arkadaşlarınıza mesaj/i, "friendsOnlyMessages"],

  // permissions
  [/yetkiniz yok|Admin access required|^Forbidden$/i, "noPermission"],
  [
    /Only participants can|Sadece katılımcılar (kurs satın alabilir|önerilen|cüzdan kullanabilir)/i,
    "participantsOnly",
  ],
  [/Only teachers can/i, "teachersOnly"],
  [/Sadece kendi kurslarınızı düzenleyebilirsiniz/i, "ownCoursesEditOnly"],
  [/Sadece kendi kurslarınızı silebilirsiniz/i, "ownCoursesDeleteOnly"],
  [/Bu kursun derslerini düzenleyemezsiniz/i, "cannotEditLessons"],

  // courses, lessons, teachers, categories
  [/^Kurs bulunamadı|^Course not found/i, "courseNotFound"],
  [/Kurs veya öğretmen artık mevcut değil/i, "courseOrTeacherGone"],
  [/Öğretmen profili bulunamadı|Teacher profile not found/i, "teacherProfileNotFound"],
  [/öğretmen bulunamadı/i, "teacherNotFound"],
  [/Lütfen bir eğitmen seçin/i, "teacherRequired"],
  [/Ders başlığı zorunludur/i, "lessonTitleRequired"],
  [/Ders bulunamadı/i, "lessonNotFound"],
  [/Video bağlantısının süresi dolmuş/i, "videoLinkExpired"],
  [/Kategori bulunamadı/i, "categoryNotFound"],
  [/Kategori adı boş olamaz/i, "categoryNameRequired"],
  [/Bu kategori adı zaten mevcut/i, "categoryExists"],
  [/ID eşleşmiyor/i, "idMismatch"],
  [/Kurs başlığı boş bırakılamaz/i, "courseTitleRequired"],
  [/Kurs kapasitesi 0'dan büyük/i, "capacityPositive"],
  [/Kurs ücreti negatif olamaz/i, "priceNotNegative"],
  [/Kurs kategorisi seçilmelidir/i, "categoryRequired"],

  // enrolment, wallet
  [/Öğrenci bu kursa zaten kayıtlı/i, "studentAlreadyEnrolled"],
  [/Kurs kapasitesi tamamen dolu/i, "courseFull"],
  [/Kendi kursunuza katılamazsınız/i, "ownCourseJoin"],
  [/Kendi kursunuzu satın alamazsınız/i, "ownCoursePurchase"],
  [/Bu kurs ücretli/i, "paidCourse"],
  [/Bu kurs ücretsiz/i, "freeCourse"],
  [/Bu kursa zaten sahipsiniz/i, "alreadyPurchased"],
  [/Bu kursa zaten kayıtlısınız/i, "alreadyEnrolled"],
  [/daha önce iade edildi; ikinci kez iade edilemez/i, "refundedBefore"],
  [/Yetersiz bakiye/i, "insufficientBalance"],
  [/iade edilebilir bir satın alma yok/i, "nothingToRefund"],
  [/Bu kursa kayıtlı değilsiniz/i, "notEnrolled"],
  [/Katılımcı profili bulunamadı/i, "participantProfileNotFound"],
  [/^Kayıt bulunamadı/i, "enrollmentNotFound"],

  // students
  [/Bu öğrenci numarası sistemde zaten kayıtlı/i, "studentNumberInUse"],
  [/Öğrenci numarası tam 9 haneli/i, "studentNumberLength"],
  [/Öğrenci numarası boş/i, "studentNumberRequired"],
  [/Öğrenci adı boş/i, "firstNameRequired"],
  [/Öğrenci soyadı boş/i, "lastNameRequired"],
  [/Öğrenci bulunamadı/i, "studentNotFound"],
  [/Silinecek (öğrenci|öğretmen) seçilmedi/i, "nothingSelected"],

  // requests, announcements
  [/You are already teaching this course/i, "alreadyTeaching"],
  [/already have a pending request/i, "pendingRequestExists"],
  [/Profilinize kayıtlı hiçbir branş yok/i, "noBranches"],
  [/Başvuru zaten sonuçlandırılmış|Request is not pending/i, "requestNotPending"],
  [/Only pending requests can be deleted/i, "onlyPendingDeletable"],
  [/(Support request|Request) not found/i, "requestNotFound"],
  [/Name and Email are required/i, "guestFieldsRequired"],
  [/Title and Content are required/i, "announcementFieldsRequired"],
  [/Duyuru bulunamadı/i, "announcementNotFound"],

  // uploads, server
  [/Dosya seçilmedi/i, "noFile"],
  [/Sadece jpg, png, gif veya webp/i, "imageTypeOnly"],
  [/Sadece mp4 veya webm/i, "videoTypeOnly"],
  [/Beklenmeyen bir hata/i, "unexpected"],
];

/** The API's error message in the UI language; unknown messages come back unchanged. */
export const translateBackendError = (errText: string, t: TFunction = i18n.t): string => {
  if (!errText) return "";
  for (const [pattern, key, params] of RULES) {
    const m = errText.match(pattern);
    if (m) return t(`backendErrors.${key}`, params ? params(m, t) : undefined) as string;
  }
  return errText;
};
