using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Vikreta.Api.Domain;
using Vikreta.Api.DTOs;
using Vikreta.Api.Infrastructure;

namespace Vikreta.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Resolve tenant
        var tenant = await _db.Tenants.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Slug == request.TenantSlug.ToLowerInvariant() && t.IsActive);

        if (tenant == null)
            return Unauthorized(new { error = "Invalid tenant or credentials." });

        // Find user
        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u =>
                u.TenantId == tenant.Id &&
                u.Email == request.Email.ToLowerInvariant() &&
                u.IsActive);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid tenant or credentials." });

        var accessToken = GenerateAccessToken(user, tenant);
        var refreshToken = Guid.NewGuid().ToString("N"); // simplified — store in DB for production

        var userDto = new UserDto(user.Id, user.Email, user.FirstName, user.LastName,
            user.Role.ToString(), user.LocationId);

        return Ok(new LoginResponse(accessToken, refreshToken, userDto));
    }

    [HttpPost("refresh")]
    public IActionResult Refresh([FromBody] RefreshRequest request)
    {
        // Simplified: in production, validate refresh token against DB
        // For now return 501 to indicate not implemented
        return StatusCode(501, new { error = "Refresh token validation not yet implemented." });
    }

    [HttpGet("me")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return Unauthorized();

        return Ok(new UserDto(user.Id, user.Email, user.FirstName, user.LastName,
            user.Role.ToString(), user.LocationId));
    }

    private string GenerateAccessToken(User user, Tenant tenant)
    {
        var jwtKey = _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("tenantId", tenant.Id.ToString()),
            new("tenantSlug", tenant.Slug),
        };

        if (user.LocationId.HasValue)
            claims.Add(new("locationId", user.LocationId.Value.ToString()));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(60),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
