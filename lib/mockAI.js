/**
 * Mock AI Fallback Layer for Deterministic Demo Mode and API Key Failures
 */

const DEFAULT_MOCK_RESPONSE = {
  severity: "HIGH",
  confidence: 90,
  category: "Medical",
  actions: [
    "Locate nearest physical responder",
    "Bring first-aid kit and AED",
    "Clear immediate vicinity"
  ],
  evacuation: "Keep immediate area clear; no full evacuation needed yet.",
  duplicate: false
};

const MOCK_SCENARIOS = {
  fire: {
    severity: "CRITICAL",
    confidence: 95,
    category: "Fire",
    actions: ["Sound alarm", "Call 911", "Evacuate Zone immediately"],
    evacuation: "Immediate evacuation of the floor and surrounding zones.",
    duplicate: false
  },
  security: {
    severity: "HIGH",
    confidence: 85,
    category: "Security",
    actions: ["Dispatch security personnel", "Monitor cameras", "Restrict zone access"],
    evacuation: "Instruct guests to lock down in safely secured areas if applicable.",
    duplicate: false
  }
};

/**
 * Parses description to determine a mock response if Anthropic/Gemini fails
 */
function getMockAIResponse(description) {
  const text = description.toLowerCase();
  if (text.includes("fire") || text.includes("smoke") || text.includes("burn")) {
    return MOCK_SCENARIOS.fire;
  }
  if (text.includes("gun") || text.includes("fight") || text.includes("intruder") || text.includes("theft")) {
    return MOCK_SCENARIOS.security;
  }
  return DEFAULT_MOCK_RESPONSE;
}

module.exports = {
  getMockAIResponse,
  DEFAULT_MOCK_RESPONSE,
  MOCK_SCENARIOS
};
