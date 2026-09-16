namespace HUIT_RoMan.Application.Common.Interfaces
{
    public interface ICurrentUserService
    {
        int? UserId { get; }
        string? Role { get; }
        int? DepartmentId { get; }
        bool IsAdmin { get; }
    }
}
