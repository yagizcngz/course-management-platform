namespace EdTechApi.Core.Constants
{
    // Kullanıcının kaydettiği görsel/video adresi: yalnızca https, sitenin kendi yüklemeleri (verilen önekler) veya
    // eski satırlardaki gömülü görsel. javascript:, http: ve başka şemalar başka kullanıcıların tarayıcısına gitmez.
    public static class SafeUrl
    {
        public const string Error = "Geçersiz bağlantı adresi.";

        public static bool IsAllowed(string? url, params string[] localPrefixes)
        {
            if (string.IsNullOrEmpty(url)) return true;
            if (url.Length > 2048 && !url.StartsWith("data:image/")) return false;
            if (url.StartsWith("data:image/")) return true;
            if (localPrefixes.Any(p => url.StartsWith(p)) && !url.Contains("..") && !url.Contains("//")) return true;
            return Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps;
        }
    }
}
