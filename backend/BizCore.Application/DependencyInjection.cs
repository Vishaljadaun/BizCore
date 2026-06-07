using BizCore.Application.Common.Behaviors;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplicationServices(
            this IServiceCollection services)
        {
            // ── MediatR ───────────────────────────────────────
            // Version 12 mein syntax change hua hai
            // Purana: services.AddMediatR(Assembly.GetExecutingAssembly())
            // Naya:
            services.AddMediatR(cfg =>
            {
                cfg.RegisterServicesFromAssembly(
                    Assembly.GetExecutingAssembly());
            });

            // ── MediatR Pipeline Behavior ─────────────────────
            // Har command/query se pehle validation chalao
            services.AddTransient(
                typeof(IPipelineBehavior<,>),
                typeof(ValidationBehavior<,>));

            // ── FluentValidation ──────────────────────────────
            // AddValidatorsFromAssembly sirf tab milta hai jab
            // FluentValidation.DependencyInjectionExtensions
            // package install ho
            services.AddValidatorsFromAssembly(
                Assembly.GetExecutingAssembly());

            // ── AutoMapper ────────────────────────────────────
            // Version 13 mein AddAutoMapper ka syntax:
            services.AddAutoMapper(
                Assembly.GetExecutingAssembly());
            // Note: Assembly object directly pass karo
            // Action<IMapperConfigurationExpression> nahi

            return services;
        }
    }
}
