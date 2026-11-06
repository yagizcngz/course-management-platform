namespace EdTechApi.Core.Entities
{
    // Herkese açık forum: konu kanalı (ForumTopics) altında başlıklar, başlık altında mesajlar.
    // Yazar silinip kalıcı temizlendiğinde AuthorId null olur; mesaj "silinmiş hesap" olarak kalır.
    public class ForumThread
    {
        public int Id { get; set; }
        public string Topic { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int? AuthorId { get; set; }
        public User? Author { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
        public ICollection<ForumPost> Posts { get; set; } = new List<ForumPost>();
    }

    public class ForumPost
    {
        public int Id { get; set; }
        public int ThreadId { get; set; }
        public ForumThread? Thread { get; set; }
        public int? AuthorId { get; set; }
        public User? Author { get; set; }
        public string Body { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<ForumPostLike> Likes { get; set; } = new List<ForumPostLike>();
    }

    public class ForumPostLike
    {
        public int PostId { get; set; }
        public int UserId { get; set; }
    }

    // Arkadaşlık isteği: Pending iken alıcı kabul eder (Accepted) ya da reddeder (satır silinir)
    public class Friendship
    {
        public int Id { get; set; }
        public int RequesterId { get; set; }
        public User? Requester { get; set; }
        public int AddresseeId { get; set; }
        public User? Addressee { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class DirectMessage
    {
        public int Id { get; set; }
        public int SenderId { get; set; }
        public int RecipientId { get; set; }
        public string Body { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReadAt { get; set; }
    }
}
