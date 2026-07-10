using System.ComponentModel.DataAnnotations;

namespace OnTime.API.Models;

public class ChatRequest
{
    [Required]
    [StringLength(2000, MinimumLength = 1)]
    public string Message { get; set; } = string.Empty;

    public List<ChatHistoryItem> History { get; set; } = [];
}

public class ChatHistoryItem
{
    [Required]
    [RegularExpression("user|assistant")]
    public string Role { get; set; } = string.Empty;

    [Required]
    [StringLength(4000)]
    public string Content { get; set; } = string.Empty;
}

public class ChatResponse
{
    public object? Text { get; set; }
    public string? Intent { get; set; }
    public List<ScheduleDto>? Schedules { get; set; }
}

public class ScheduleDto
{
    public string[] Days { get; set; } = [];
    public string Time { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
