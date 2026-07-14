// Environment variable loader with comprehensive logging
// This utility helps debug missing environment variables

type EnvVarConfig = {
  name: string;
  required: boolean;
  description: string;
};

const ENV_VARS: EnvVarConfig[] = [
  // Supabase
  { name: "NEXT_PUBLIC_SUPABASE_URL", required: true, description: "Supabase project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true, description: "Supabase anonymous key" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", required: false, description: "Supabase service role key" },
  
  // AI APIs
  { name: "ANTHROPIC_API_KEY", required: false, description: "Anthropic API key for Claude" },
  { name: "MISTRAL_API_KEY", required: false, description: "Mistral AI API key" },
  
  // Stripe
  { name: "STRIPE_SECRET_KEY", required: false, description: "Stripe secret key" },
  { name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", required: false, description: "Stripe publishable key" },
  { name: "STRIPE_PRICE_PRO", required: false, description: "Stripe price ID for pro plan" },
  { name: "STRIPE_WEBHOOK_SECRET", required: false, description: "Stripe webhook secret" },
  
  // Demo
  { name: "DEMO_APPROVER_USERNAME", required: false, description: "Demo approver username" },
  { name: "DEMO_APPROVER_PASSWORD", required: false, description: "Demo approver password" },
  
  // Admin
  { name: "ADMIN_PROFILE_USERNAME", required: false, description: "Admin profile username" },
  { name: "ADMIN_GITHUB_USERNAME", required: false, description: "Admin GitHub username" },
];

export interface EnvValidationResult {
  isValid: boolean;
  missing: string[];
  present: string[];
  warnings: string[];
}

export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const present: string[] = [];
  const warnings: string[] = [];

  console.log("🔍 Validating environment variables...\n");

  for (const config of ENV_VARS) {
    const value = process.env[config.name];
    const isSet = value !== undefined && value !== "" && value !== "your-" + config.name.toLowerCase().replace(/_/g, "-") + "-here";

    if (isSet) {
      present.push(config.name);
      // Log sensitive values partially masked
      if (config.name.toLowerCase().includes("key") || config.name.toLowerCase().includes("secret")) {
        const masked = value.substring(0, 8) + "..." + value.substring(Math.max(0, value.length - 4));
        console.log(`✅ ${config.name}: ${masked}`);
      } else {
        console.log(`✅ ${config.name}: ${value}`);
      }
    } else {
      if (config.required) {
        missing.push(config.name);
        console.error(`❌ ${config.name}: MISSING (required) - ${config.description}`);
      } else {
        warnings.push(config.name);
        console.warn(`⚠️  ${config.name}: not set (optional) - ${config.description}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Environment validation complete:`);
  console.log(`  ✅ Present: ${present.length}`);
  console.log(`  ❌ Missing required: ${missing.length}`);
  console.log(`  ⚠️  Missing optional: ${warnings.length}`);
  console.log("=".repeat(60) + "\n");

  if (missing.length > 0) {
    console.error("❌ Critical: Required environment variables are missing!");
    console.error("Please set these in your .env.local file:");
    missing.forEach(name => console.error(`  - ${name}`));
    console.error("\nCopy .env.example to .env.local and fill in the values.\n");
  }

  return {
    isValid: missing.length === 0,
    missing,
    present,
    warnings,
  };
}

export function getEnvVar(name: string): string | undefined {
  const value = process.env[name];
  
  if (!value || value === "" || value.startsWith("your-")) {
    console.warn(`⚠️  Environment variable '${name}' is not properly set`);
    return undefined;
  }
  
  return value;
}

export function getRequiredEnvVar(name: string): string {
  const value = getEnvVar(name);
  
  if (!value) {
    throw new Error(`Required environment variable '${name}' is missing or empty`);
  }
  
  return value;
}

// Auto-validate on module load (in development)
if (typeof window === "undefined" && process.env.NODE_ENV === "development") {
  validateEnv();
}
