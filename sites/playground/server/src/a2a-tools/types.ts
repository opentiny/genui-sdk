export type PlaygroundAgentConfig = {
  name: string;
  agentCardUrl: string;
  description?: string;
  enabled?: boolean;

  version?: string;
  api?: {
    type?: string;
    url?: string;
    version?: string;
  };
  auth?: {
    type?: string;
    instructions?: string;
  };
  authentication?: { schemes?: string[] };
  securitySchemes?: Record<string, { httpAuthSecurityScheme?: { scheme?: string } }>;
  capabilities?: string[];
};
