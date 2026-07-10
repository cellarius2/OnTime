using System.ComponentModel.DataAnnotations;

namespace OnTime.API.Models;

public class Schedule
{
    public Guid Id { get; set; }

    [Required, StringLength(100)]
    public string Days { get; set; } = string.Empty;

    [Required, RegularExpression("^([01]\\d|2[0-3]):[0-5]\\d$")]
    public string Time { get; set; } = string.Empty;

    [StringLength(1000)]
    public string Message { get; set; } = string.Empty;

    [Required, StringLength(120)]
    public string Title { get; set; } = string.Empty;

    [StringLength(500)]
    public string Description { get; set; } = string.Empty;

    public bool Active { get; set; } = true;

    [Url]
    public string DiscordWebhookUrl { get; set; } = string.Empty;

    [Url]
    public string GoogleChatWebhookUrl { get; set; } = string.Empty;

    [RegularExpression("discord|googleChat|both")]
    public string NotificationService { get; set; } = "discord";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
