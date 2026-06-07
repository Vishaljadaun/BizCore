namespace BizCore.Application.Users.Queries;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.Users.DTOs;
using BizCore.Domain.Entities;
using BizCore.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record GetUserByIdQuery(Guid UserId)
    : IRequest<Result<UserResponse>>;

public class GetUserByIdQueryHandler
    : IRequestHandler<GetUserByIdQuery, Result<UserResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetUserByIdQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<UserResponse>> Handle(
        GetUserByIdQuery query,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUser.CompanyId;

        if (companyId == null)
            throw new ForbiddenAccessException(
                "Company context not found.");

        var user = await _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                u => u.Id == query.UserId &&
                     u.CompanyId == companyId.Value,
                // Explicit company check — cannot access
                // users from other companies via ID
                cancellationToken);

        if (user == null)
            throw new NotFoundException(
                nameof(User), query.UserId);

        // Extra check: non-SuperAdmin cannot view SuperAdmin
        var currentRole = _currentUser.UserRole;
        if (user.Role == UserRole.SuperAdmin &&
            currentRole != UserRole.SuperAdmin.ToString())
        {
            throw new ForbiddenAccessException(
                "Access denied.");
        }

        return Result<UserResponse>.Success(
            new UserResponse(
                user.Id,
                user.FirstName,
                user.LastName,
                user.FullName,
                user.Email,
                user.Role.ToString(),
                user.IsActive,
                user.CompanyId,
                user.CreatedAt,
                user.LastLogin,
                user.UpdatedAt
            ));
    }
}