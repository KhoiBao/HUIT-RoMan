using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", service = "HUIT-RoMan.API" });
}
