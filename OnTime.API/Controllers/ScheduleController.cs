using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnTime.API.Models;

namespace OnTime.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScheduleController(AppDbContext db, N8nService n8nService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var schedules = await db.Schedules.ToListAsync();
        return Ok(schedules);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Schedule schedule)
    {
        schedule.Id = Guid.NewGuid();
        schedule.CreatedAt = DateTime.UtcNow;
        schedule.Message = await n8nService.GenerateReminderMessageAsync(schedule);

        db.Schedules.Add(schedule);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = schedule.Id }, schedule);
    }

    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> Toggle(Guid id)
    {
        var schedule = await db.Schedules.FindAsync(id);
        if (schedule is null) return NotFound();

        schedule.Active = !schedule.Active;

        await db.SaveChangesAsync();
        return Ok(schedule);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var schedule = await db.Schedules.FindAsync(id);
        if (schedule is null) return NotFound();

        db.Schedules.Remove(schedule);
        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Schedule updated)
    {
        var schedule = await db.Schedules.FindAsync(id);
        if (schedule is null) return NotFound();

        schedule.Days = updated.Days;
        schedule.Time = updated.Time;
        schedule.Title = updated.Title;
        schedule.Description = updated.Description;
        schedule.Active = updated.Active;
        schedule.DiscordWebhookUrl = updated.DiscordWebhookUrl;
        schedule.GoogleChatWebhookUrl = updated.GoogleChatWebhookUrl;
        schedule.NotificationService = updated.NotificationService;

        schedule.Message = await n8nService.GenerateReminderMessageAsync(schedule);

        await db.SaveChangesAsync();
        return Ok(schedule);
    }
}
