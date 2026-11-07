using EdTechApi.Core.Entities;

namespace EdTechApi.Business.Interfaces
{
    public interface IWalletService
    {
        Task<IEnumerable<WalletTransaction>> GetTransactionsAsync(int userId, int take = 100);
        Task<decimal> TopUpAsync(int userId, decimal amount);
        Task<decimal> PurchaseCourseAsync(User buyer, int courseId);
        Task<decimal> RefundCourseAsync(User buyer, int courseId);
        Task<bool> HasActivePurchaseAsync(int userId, int courseId);
        Task<List<int>> GetActivePurchaseCourseIdsAsync(int userId);
        Task<List<int>> GetOwnedCourseIdsAsync(int userId);
        Task<bool> OwnsCourseAsync(int userId, int courseId);
        Task<List<int>> GetRefundableCourseIdsAsync(int userId);
        Task<List<EdTechApi.Business.Services.ActivePurchase>> GetActivePurchasesAsync(int userId);
    }
}
