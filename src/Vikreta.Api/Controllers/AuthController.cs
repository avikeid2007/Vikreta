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
        var refreshToken = GenerateRefreshToken(user, tenant);

        var userDto = new UserDto(user.Id, user.Email, user.FirstName, user.LastName,
            user.Role.ToString(), user.LocationId);

        return Ok(new LoginResponse(accessToken, refreshToken, userDto));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest(new { error = "Refresh token is required." });

        try
        {
            var jwtKey = _config["Jwt:Key"] ?? "vikreta-super-secret-key-change-in-production-32chars!!";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var handler = new JwtSecurityTokenHandler();

            var principal = handler.ValidateToken(request.RefreshToken, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _config["Jwt:Issuer"] ?? "vikreta-api",
                ValidAudience = _config["Jwt:Audience"] ?? "vikreta-web",
                IssuerSigningKey = key
            }, out var validatedToken);

            var tokenType = principal.FindFirst("tokenType")?.Value;
            if (tokenType != "refresh")
                return Unauthorized(new { error = "Invalid token type." });

            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var tenantIdClaim = principal.FindFirst("tenantId")?.Value;

            if (userIdClaim == null || tenantIdClaim == null)
                return Unauthorized(new { error = "Invalid token claims." });

            var userId = Guid.Parse(userIdClaim);
            var tenantId = Guid.Parse(tenantIdClaim);

            var user = await _db.Users.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId && u.IsActive);

            var tenant = await _db.Tenants.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == tenantId && t.IsActive);

            if (user == null || tenant == null)
                return Unauthorized(new { error = "User or tenant no longer active." });

            var newAccessToken = GenerateAccessToken(user, tenant);
            var newRefreshToken = GenerateRefreshToken(user, tenant);

            var userDto = new UserDto(user.Id, user.Email, user.FirstName, user.LastName,
                user.Role.ToString(), user.LocationId);

            return Ok(new LoginResponse(newAccessToken, newRefreshToken, userDto));
        }
        catch (SecurityTokenException)
        {
            return Unauthorized(new { error = "Expired or invalid refresh token." });
        }
        catch (Exception)
        {
            return Unauthorized(new { error = "Could not validate refresh token." });
        }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.TenantSlug))
            return BadRequest(new { error = "Tenant slug and email are required." });

        var tenant = await _db.Tenants.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Slug == request.TenantSlug.ToLowerInvariant() && t.IsActive);

        if (tenant == null)
            return Ok(new { message = "If the account exists, instructions have been sent." });

        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.Email == request.Email.ToLowerInvariant() && u.IsActive);

        if (user == null)
            return Ok(new { message = "If the account exists, instructions have been sent." });

        var resetToken = GenerateResetToken(user, tenant);
        return Ok(new
        {
            message = "Password reset token generated successfully.",
            resetToken = resetToken
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { error = "Token and new password are required." });

        if (request.NewPassword.Length < 6)
            return BadRequest(new { error = "Password must be at least 6 characters." });

        try
        {
            var jwtKey = _config["Jwt:Key"] ?? "vikreta-super-secret-key-change-in-production-32chars!!";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var handler = new JwtSecurityTokenHandler();

            var principal = handler.ValidateToken(request.Token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _config["Jwt:Issuer"] ?? "vikreta-api",
                ValidAudience = _config["Jwt:Audience"] ?? "vikreta-web",
                IssuerSigningKey = key
            }, out var validatedToken);

            var purpose = principal.FindFirst("purpose")?.Value;
            if (purpose != "reset-password")
                return BadRequest(new { error = "Invalid reset token." });

            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return BadRequest(new { error = "Invalid token claims." });

            var user = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == Guid.Parse(userIdClaim));
            if (user == null || !user.IsActive) return BadRequest(new { error = "User not found." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Password has been successfully reset. You may now log in." });
        }
        catch (SecurityTokenException)
        {
            return BadRequest(new { error = "Reset token has expired or is invalid." });
        }
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

    private string GenerateRefreshToken(User user, Tenant tenant)
    {
        var jwtKey = _config["Jwt:Key"] ?? "vikreta-super-secret-key-change-in-production-32chars!!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new("tenantId", tenant.Id.ToString()),
            new("tokenType", "refresh")
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "vikreta-api",
            audience: _config["Jwt:Audience"] ?? "vikreta-web",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateResetToken(User user, Tenant tenant)
    {
        var jwtKey = _config["Jwt:Key"] ?? "vikreta-super-secret-key-change-in-production-32chars!!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new("tenantId", tenant.Id.ToString()),
            new("purpose", "reset-password")
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "vikreta-api",
            audience: _config["Jwt:Audience"] ?? "vikreta-web",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
