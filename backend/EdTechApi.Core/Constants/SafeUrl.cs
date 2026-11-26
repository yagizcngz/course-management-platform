namespace EdTechApi.Core.Constants
{
    // Kullanıcının kaydettiği görsel/video adresi: yalnızca https, sitenin kendi yüklemeleri (verilen önekler) veya
    // eski satırlardaki gömülü görsel. javascript:, http: ve başka şemalar başka kullanıcıların tarayıcısına gitmez.
    public static class SafeUrl
    {
        public const string Error = "Geçersiz bağlantı adresi.";
        // eski satırların gömülü fotoğrafları (~1,5 MB görsel) geçer; her profil/kurs listesine gömülen dev metin geçmez
        public const int MaxDataImageLength = 2_000_000;

        public static bool IsAllowed(string? url, params string[] localPrefixes)
        {
            if (string.IsNullOrEmpty(url)) return true;
            if (url.StartsWith("data:image/")) return url.Length <= MaxDataImageLength;
            if (url.Length > 2048) return false;
            if (localPrefixes.Any(p => url.StartsWith(p)) && !url.Contains("..") && !url.Contains("//")) return true;
            return Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps;
        }
    }
}
