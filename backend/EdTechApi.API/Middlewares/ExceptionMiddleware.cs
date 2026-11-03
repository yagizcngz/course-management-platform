using Microsoft.AspNetCore.Http;
using System;
using System.Text.Json;
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
                // Bir hata fırlatıldığında burası devreye girer
                context.Response.ContentType = "application/json";
                
                // Bizim fırlattığımız iş kuralı hatalarıysa 400, sistem hatasıysa 500 dön
                context.Response.StatusCode = ex switch
                {
                    ArgumentException => StatusCodes.Status400BadRequest,
                    _ => StatusCodes.Status500InternalServerError
                };

                // 500'lerde iç hata ayrıntısını istemciye sızdırma; sadece logla
                if (context.Response.StatusCode == StatusCodes.Status500InternalServerError)
                    Console.Error.WriteLine(ex);
                var response = new { error = ex is ArgumentException ? ex.Message : "Beklenmeyen bir hata oluştu." };
                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            }
        }
    }
}