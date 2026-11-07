namespace EdTechApi.Core.Constants
{
    // Kursun anlatım ve altyazı dilleri (ISO 639-1). Katalog süzgeci ve kurs formu bu listeyi kullanır.
    public static class CourseLanguages
    {
        public static readonly string[] All = ["tr", "en", "de", "fr", "es", "ar"];

        public const string Default = "tr";

        public static string? Normalize(string? code)
        {
            var c = code?.Trim().ToLowerInvariant();
            return c != null && All.Contains(c) ? c : null;
        }

        // "en, de,xx" -> "en,de": bilinmeyen ve anlatım diliyle aynı olanlar düşer, sıra listeyi izler
        public static string? NormalizeList(string? csv, string language)
        {
            var picked = (csv ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Select(Normalize).Where(c => c != null && c != language).ToHashSet();
            var list = All.Where(picked.Contains).ToArray();
            return list.Length == 0 ? null : string.Join(',', list);
        }
    }
}
