using Microsoft.AspNetCore.Http;
using System;
using System.Threading.Tasks;

namespace EdTechApi.API.Middlewares
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;

        public ExceptionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context); // Her şey yolundaysa sisteme devam et
            }
            catch (Exception ex)
            {
                // yanıt yazılmaya başlandıysa durum kodu artık değişmez; bağlantıyı sunucu kessin
                if (context.Response.HasStarted) throw;
                // Bir hata fırlatıldığında burası devreye girer
                // Düz metin: diğer uç noktaların BadRequest("...") cevaplarıyla aynı biçim, frontend doğrudan gösterebilir
                context.Response.ContentType = "text/plain; charset=utf-8";

                // Bizim fırlattığımız iş kuralı hatalarıysa 400, sistem hatasıysa 500 dön
                context.Response.StatusCode = ex switch
                {
                    ArgumentException => StatusCodes.Status400BadRequest,
                    _ => StatusCodes.Status500InternalServerError
                };

                // 500'lerde iç hata ayrıntısını istemciye sızdırma; sadece logla
                if (context.Response.StatusCode == StatusCodes.Status500InternalServerError)
                    Console.Error.WriteLine(ex);
                // iş kuralı mesajları gösterilir; çerçevenin null/aralık hataları ("Value cannot be null. (Parameter 'key')") iç ayrıntıdır
                var message = ex switch
                {
                    ArgumentNullException or ArgumentOutOfRangeException => "Geçersiz istek.",
                    ArgumentException => ex.Message,
                    _ => "Beklenmeyen bir hata oluştu."
                };
                await context.Response.WriteAsync(message);
            }
        }
    }
}