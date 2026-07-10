using Microsoft.EntityFrameworkCore;
using OnTime.API.Models;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<OnTime.API.Models.Schedule> Schedules { get; set; }
    public DbSet<Conversation> Conversations => Set<Conversation>();
}