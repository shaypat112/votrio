// Server-side initialization - runs before any API routes
import { validateEnv } from "./env-loader";

// Validate environment variables on server startup
if (typeof window === "undefined") {
  const validation = validateEnv();
  
  if (!validation.isValid) {
    console.error("⚠️  Server starting with missing required environment variables");
    console.error("Some features may not work correctly");
  }
  
  // Log current mode
  console.log(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode`);
  console.log(`📦 Next.js version: ${process.env.NEXT_VERSION || "unknown"}`);
}
