using System.Text;
using EdTechApi.API.Controllers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;

namespace EdTechApi.Tests
{
    // Yükleme dosyanın ilk baytlarına bakar: uzantısı veya MIME türü yalan söyleyen dosya kaydedilmez
    public class UploadTests : IDisposable
    {
        private static readonly byte[] Png = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 1, 2, 3 };
        private readonly string _root = Path.Combine(Path.GetTempPath(), "upload-tests-" + Guid.NewGuid());
        private readonly UploadsController _uploads;

        public UploadTests() => _uploads = new UploadsController(new Env(_root));

        public void Dispose()
        {
            if (Directory.Exists(_root)) Directory.Delete(_root, true);
        }

        private static IFormFile File(byte[] bytes, string name, string contentType) =>
            new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", name)
            { Headers = new HeaderDictionary(), ContentType = contentType };

        private int SavedFiles() => Directory.Exists(_root) ? Directory.GetFiles(_root, "*", SearchOption.AllDirectories).Length : 0;

        [Fact]
        public async Task A_real_png_is_saved_under_a_random_name()
        {
            var result = Assert.IsType<OkObjectResult>(await _uploads.UploadProfilePicture(File(Png, "../../me.png", "image/png")));
            Assert.Matches("^/uploads/profile-pictures/[0-9a-f-]{36}\\.png$", result.Value!.GetType().GetProperty("url")!.GetValue(result.Value)!.ToString());
            Assert.Equal(1, SavedFiles());
        }

        [Theory]
        [InlineData("page.png", "image/png", "<html><script>alert(1)</script>")] // HTML renamed to .png
        [InlineData("photo.jpg", "image/jpeg", "PNG")]                          // PNG bytes, jpg extension
        [InlineData("photo.png", "text/html", "PNG")]                           // declared type disagrees
        [InlineData("photo.svg", "image/svg+xml", "<svg onload=alert(1)>")]     // extension not allowed
        [InlineData("poly.png", "image/png", "PNG+<script>")]                   // valid header, script inside
        public async Task A_file_whose_bytes_type_or_name_disagree_is_refused(string name, string contentType, string content)
        {
            var bytes = content.StartsWith("PNG")
                ? Png.Concat(Encoding.ASCII.GetBytes(content[3..])).ToArray()
                : Encoding.ASCII.GetBytes(content);
            Assert.IsType<BadRequestObjectResult>(await _uploads.UploadProfilePicture(File(bytes, name, contentType)));
            Assert.Equal(0, SavedFiles());
        }

        [Fact]
        public async Task A_video_needs_a_video_signature()
        {
            var mp4 = new byte[] { 0, 0, 0, 0x18 }.Concat(Encoding.ASCII.GetBytes("ftypisom")).Concat(new byte[8]).ToArray();
            Assert.IsType<OkObjectResult>(await _uploads.UploadVideo(File(mp4, "lesson.mp4", "video/mp4")));
            Assert.IsType<BadRequestObjectResult>(await _uploads.UploadVideo(File(Png, "lesson.mp4", "video/mp4")));
            Assert.Equal(1, SavedFiles());
        }

        private sealed class Env(string root) : IWebHostEnvironment
        {
            public string EnvironmentName { get; set; } = "Test";
            public string ApplicationName { get; set; } = "test";
            public string WebRootPath { get; set; } = Path.Combine(root, "wwwroot");
            public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
            public string ContentRootPath { get; set; } = root;
            public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        }
    }
}
