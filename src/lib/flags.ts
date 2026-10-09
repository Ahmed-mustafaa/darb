/** Test helpers (the crew app's drive simulator). Turn off once real trips start. */
export const testTools = () => process.env.SHOW_TEST_TOOLS === 'true' || process.env.OTP_TEST_MODE === 'true';
