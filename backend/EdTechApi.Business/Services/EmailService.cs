using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using EdTechApi.Business.Interfaces;
using Microsoft.Extensions.Configuration;

namespace EdTechApi.Business.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var host = _configuration["Smtp:Host"];
            var portString = _configuration["Smtp:Port"];
            var enableSslString = _configuration["Smtp:EnableSsl"];
            var email = _configuration["Smtp:Email"];
            var password = _configuration["Smtp:Password"];

            // SMTP ayarlanmamışsa (boş veya appsettings.example.json'daki örnek değerler) gerçek gönderim yerine konsola yaz
            var notConfigured = string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)
                || password.StartsWith("YOUR_") || password == "BURAYA_UYGULAMA_SIFRESI_GELECEK" || email == "your-email@gmail.com";
            if (notConfigured)
            {
                Console.WriteLine($"[SIMULATED EMAIL] To: {toEmail}\nSubject: {subject}\nBody: {body}");
                return; // Simulate success
            }

            int port = int.TryParse(portString, out var p) ? p : 587;
            bool enableSsl = bool.TryParse(enableSslString, out var e) ? e : true;

            using (var client = new SmtpClient(host, port))
            {
                client.Credentials = new NetworkCredential(email, password);
                client.EnableSsl = enableSsl;

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(email!, "EdTech E-Kurs Sistemi"), // notConfigured above returned on a blank address
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };

                mailMessage.To.Add(toEmail);

                await client.SendMailAsync(mailMessage);
            }
        }
    }
}
