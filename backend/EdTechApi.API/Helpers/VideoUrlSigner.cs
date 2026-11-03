using System.Security.Cryptography;
using System.Text;

namespace EdTechApi.API.Helpers
{
    // Yüklenen ders videoları wwwroot dışında durur ("vid:{dosya}" olarak saklanır) ve yalnızca
    // erişimi olan kullanıcıya verilen süreli, imzalı bir adresle izlenebilir (<video> başlık gönderemediği için).
    public static class VideoUrlSigner
    {
        public const string Prefix = "vid:";
        private static readonly TimeSpan Lifetime = TimeSpan.FromHours(6);

        public static string FolderPath(IWebHostEnvironment env) => Path.Combine(env.ContentRootPath, "App_Data", "videos");

        public static string Sign(string storedUrl, string key)
        {
            var file = storedUrl[Prefix.Length..];
            var exp = DateTimeOffset.UtcNow.Add(Lifetime).ToUnixTimeSeconds();
            return $"/api/lessons/stream/{Uri.EscapeDataString(file)}?exp={exp}&sig={Signature(file, exp, key)}";
        }

        public static bool IsValid(string file, long exp, string sig, string key) =>
            exp > DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            && CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Signature(file, exp, key)), Encoding.ASCII.GetBytes(sig ?? ""));

        private static string Signature(string file, long exp, string key)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
            return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes($"{file}|{exp}")));
        }
    }
}
