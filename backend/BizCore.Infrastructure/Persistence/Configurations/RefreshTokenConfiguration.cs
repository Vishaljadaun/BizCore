using BizCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Infrastructure.Persistence.Configurations
{
    public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
    {
        public void Configure(EntityTypeBuilder<RefreshToken> builder)
        {
            builder.ToTable("refresh_tokens", "shared");

            builder.HasKey(r => r.Id);
            builder.Property(r => r.Id)
                .HasDefaultValueSql("gen_random_uuid()");

            builder.Property(r => r.Token)
                .IsRequired()
                .HasMaxLength(500);

            // Index for fast token lookup during refresh
            // When frontend sends refresh token, we search by this column
            builder.HasIndex(r => r.Token)
                .HasDatabaseName("ix_refresh_tokens_token");
            // Without index: scan millions of tokens to find one
            // With index: microsecond lookup

            builder.Property(r => r.ExpiresAt)
                .IsRequired();

            builder.Property(r => r.IsRevoked)
                .HasDefaultValue(false);

            builder.Property(r => r.IsUsed)
                .HasDefaultValue(false);

            builder.Property(r => r.CreatedAt)
                .HasDefaultValueSql("NOW()");

            builder.HasOne(r => r.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
