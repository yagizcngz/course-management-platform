using System.Text;

namespace EdTechApi.API.Helpers
{
    // Yüklenen dosyanın gerçek türü: uzantı ve istemcinin bildirdiği MIME türü ilk baytlarla (imza) aynı türü söylemeli.
    // Uzantıya güvenmek .jpg adlı bir HTML/betik dosyasının kabul edilmesine yol açar.
    public static class FileSignature
    {
        public static readonly IReadOnlyDictionary<string, string> Images = new Dictionary<string, string>
        {
            [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".png"] = "image/png", [".gif"] = "image/gif", [".webp"] = "image/webp"
        };

        public static readonly IReadOnlyDictionary<string, string> Videos = new Dictionary<string, string>
        {
            [".mp4"] = "video/mp4", [".webm"] = "video/webm"
        };

        public const int HeaderLength = 12;

        public static bool HeaderMatches(string extension, ReadOnlySpan<byte> head) => extension switch
        {
            ".jpg" or ".jpeg" => head.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF }),
            ".png" => head.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            ".gif" => Ascii(head, 0, "GIF87a") || Ascii(head, 0, "GIF89a"),
            ".webp" => Ascii(head, 0, "RIFF") && Ascii(head, 8, "WEBP"),
            ".mp4" => Ascii(head, 4, "ftyp"),
            ".webm" => head.StartsWith(new byte[] { 0x1A, 0x45, 0xDF, 0xA3 }), // EBML
            _ => false
        };

        // Görsel içine gömülmüş HTML/betik (polyglot): tarayıcı veya başka bir araç dosyayı belge olarak yorumlarsa çalışır
        private static readonly string[] Markup = { "<script", "<html", "<svg", "<iframe", "<?php", "<!doctype", "javascript:" };

        public static bool ContainsMarkup(ReadOnlySpan<byte> data)
        {
            var text = Encoding.Latin1.GetString(data); // bayt başına bir karakter; büyük/küçük harf duyarsız arama için
            return Markup.Any(m => text.Contains(m, StringComparison.OrdinalIgnoreCase));
        }

        private static bool Ascii(ReadOnlySpan<byte> head, int offset, string value) =>
            head.Length >= offset + value.Length && head.Slice(offset, value.Length).SequenceEqual(Encoding.ASCII.GetBytes(value));
    }
}
