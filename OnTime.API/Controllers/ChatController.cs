using Microsoft.AspNetCore.Mvc;
using OnTime.API.Models;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class ChatController(N8nService n8n, AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        var raw = await n8n.SendChatMessageAsync(request);

        var text = ExtractString(raw.Text, "text") ?? raw.Text?.ToString() ?? "";
        var intent = ExtractString(raw.Text, "intent") ?? raw.Intent ?? "chat";
        var schedules = ExtractSchedules(raw.Text) ?? raw.Schedules;

        db.Conversations.Add(new Conversation
        {
            Message = request.Message,
            Response = text,
        });
        await db.SaveChangesAsync();

        return Ok(new { text, intent, schedules });
    }

    private static string? ExtractString(object? obj, string key)
    {
        if (obj is JsonElement el && el.ValueKind == JsonValueKind.Object)
            if (el.TryGetProperty(key, out var prop) && prop.ValueKind == JsonValueKind.String)
                return prop.GetString();
        return null;
    }

    private static List<ScheduleDto>? ExtractSchedules(object? obj)
    {
        if (obj is JsonElement el && el.ValueKind == JsonValueKind.Object)
            if (el.TryGetProperty("schedules", out var prop) && prop.ValueKind == JsonValueKind.Array)
                return JsonSerializer.Deserialize<List<ScheduleDto>>(
                    prop.GetRawText(),
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        return null;
    }
}
