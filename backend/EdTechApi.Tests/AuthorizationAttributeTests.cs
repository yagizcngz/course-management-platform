using System.Reflection;
using EdTechApi.API.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EdTechApi.Tests
{
    // Yetki öznitelikleri derleme anında denetlenmez: [AllowAnonymous] yanlış eyleme düşerse o eylem herkese açılır,
    // asıl açık olması gereken eylem kilitlenir. Bu testler öznitelikleri yansıma ile okur.
    public class AuthorizationAttributeTests
    {
        private static IEnumerable<MethodInfo> Actions() =>
            typeof(TeachersController).Assembly.GetTypes()
                .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract)
                .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
                .Where(m => !m.IsSpecialName && m.GetCustomAttribute<NonActionAttribute>() == null);

        [Fact]
        public void No_action_is_both_anonymous_and_restricted()
        {
            // [AllowAnonymous] wins over [Authorize] on the same action, so both together is always a mistake
            var both = Actions()
                .Where(m => m.GetCustomAttribute<AllowAnonymousAttribute>() != null && m.GetCustomAttribute<AuthorizeAttribute>() != null)
                .Select(m => $"{m.DeclaringType!.Name}.{m.Name}")
                .ToList();
            Assert.Empty(both);
        }

        [Theory]
        [InlineData(typeof(TeachersController), nameof(TeachersController.GetPublic))]
        [InlineData(typeof(LessonsController), nameof(LessonsController.Outline))]
        [InlineData(typeof(CoursesController), nameof(CoursesController.GetStats))]
        [InlineData(typeof(CoursesController), nameof(CoursesController.GetRating))]
        public void Public_pages_reach_their_endpoints_without_signing_in(Type controller, string action)
        {
            var m = controller.GetMethod(action)!;
            var controllerLocked = controller.GetCustomAttribute<AuthorizeAttribute>() != null;
            Assert.True(m.GetCustomAttribute<AllowAnonymousAttribute>() != null
                || (!controllerLocked && m.GetCustomAttribute<AuthorizeAttribute>() == null));
        }

        [Theory]
        [InlineData(nameof(TeachersController.GetMyAnalytics))]
        [InlineData(nameof(TeachersController.GetMyCourseStudents))]
        [InlineData(nameof(TeachersController.GetBranchRequests))]
        [InlineData(nameof(TeachersController.ApproveBranchRequest))]
        public void Teacher_and_admin_endpoints_need_a_role(string action)
        {
            var m = typeof(TeachersController).GetMethod(action)!;
            Assert.Null(m.GetCustomAttribute<AllowAnonymousAttribute>());
            Assert.False(string.IsNullOrEmpty(m.GetCustomAttribute<AuthorizeAttribute>()?.Roles));
        }
    }
}
