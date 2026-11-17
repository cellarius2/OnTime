using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnTime.API.Models;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;

namespace OnTime.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScheduleController(AppDbContext db, JonasAiService jonas, IConfiguration config) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var schedules = await db.Schedules.ToListAsync(ct);
        return Ok(schedules);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Schedule schedule, CancellationToken ct)
    {
        schedule.Id = Guid.NewGuid();
        schedule.CreatedAt = DateTime.UtcNow;
        schedule.Message = await jonas.GenerateReminderMessageAsync(schedule, ct);

        db.Schedules.Add(schedule);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = schedule.Id }, schedule);
    }

    [HttpPost("{id:guid}/notification-message")]
    public async Task<IActionResult> NotificationMessage(
        Guid id, [FromBody] NotificationMessageRequest request, CancellationToken ct)
    {
        var token = config["JonasAi:DispatchToken"];
        if (string.IsNullOrWhiteSpace(token) || token.Length < 32
            || !string.Equals(config["JonasAi:Provider"], "Ollama", StringComparison.OrdinalIgnoreCase))
            return NotFound();

        var expected = SHA256.HashData(Encoding.UTF8.GetBytes($"Bearer {token}"));
        var supplied = SHA256.HashData(Encoding.UTF8.GetBytes(Request.Headers.Authorization.ToString()));
        if (!CryptographicOperations.FixedTimeEquals(expected, supplied))
            return Unauthorized();

        var schedule = await db.Schedules.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id && item.Active, ct);
        if (schedule is null)
            return NotFound();

        var text = await jonas.GenerateReminderMessageAsync(schedule, ct, request.PreviousMessage, dispatch: true);
        return Ok(new { text });
    }

    public sealed record NotificationMessageRequest([StringLength(1000)] string? PreviousMessage);

    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> Toggle(Guid id, CancellationToken ct)
    {
        var schedule = await db.Schedules.FindAsync([id], ct);
        if (schedule is null) return NotFound();

        schedule.Active = !schedule.Active;

        await db.SaveChangesAsync(ct);
        return Ok(schedule);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var schedule = await db.Schedules.FindAsync([id], ct);
        if (schedule is null) return NotFound();

        db.Schedules.Remove(schedule);
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Schedule updated, CancellationToken ct)
    {
        var schedule = await db.Schedules.FindAsync([id], ct);
        if (schedule is null) return NotFound();

        schedule.Days = updated.Days;
        schedule.Time = updated.Time;
        schedule.Title = updated.Title;
        schedule.Description = updated.Description;
        schedule.Active = updated.Active;
        schedule.DiscordWebhookUrl = updated.DiscordWebhookUrl;
        schedule.GoogleChatWebhookUrl = updated.GoogleChatWebhookUrl;
        schedule.NotificationService = updated.NotificationService;

        schedule.Message = await jonas.GenerateReminderMessageAsync(schedule, ct);

        await db.SaveChangesAsync(ct);
        return Ok(schedule);
    }
}
