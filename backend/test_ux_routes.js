import { prisma } from './src/prisma.js';
import { aiService } from './src/ai/aiService.js';
import { getWorkspaceContext } from './src/services/workspaceContext.service.js';

async function run() {
  console.log('--- TESTING UX BACKEND CAPABILITIES ---');
  const user = await prisma.user.findFirst();
  const workspace = await prisma.workspace.findFirst();

  if (!workspace || !user) {
    console.error('Workspace or user missing');
    process.exit(1);
  }

  console.log(`Using workspace: ${workspace.id} (${workspace.name})`);
  const context = await getWorkspaceContext(workspace.id, user);

  // 1. Test UX Requirement Analysis
  console.log('Testing analyzeUXRequirement...');
  const sampleReq = 'Build an automated fraud detection operations portal with instant transaction triage, risk scoring, and rule configuration';
  const analysis = await aiService.analyzeUXRequirement(context, sampleReq);
  console.log('Analysis domain:', analysis.domain);
  console.log('Analysis primary users:', analysis.primaryUsers);
  console.log('Analysis recommendations count:', analysis.designRecommendations?.length);
  if (!analysis.domain || !analysis.designRecommendations?.length) {
    throw new Error('UX Requirement Analysis failed');
  }

  // 2. Test generateUX with options
  console.log('Testing generateUX with Fintech options...');
  const generated = await aiService.generateUX(context, context.solution, {
    requirement: sampleReq,
    selectedTheme: 'fintech-violet',
    understanding: analysis
  });
  console.log('Generated title:', generated.title);
  console.log('Generated screens count:', generated.screens.length);
  console.log('Generated activeThemeId:', generated.activeThemeId);
  console.log('Generated userJourney steps:', generated.userJourney.length);
  console.log('Generated requirement coverage count:', generated.requirementCoverage.length);

  if (generated.screens.length < 3 || generated.activeThemeId !== 'fintech-violet') {
    throw new Error('generateUX failed validation');
  }

  // 3. Test editUXWithPrompt
  console.log('Testing editUXWithPrompt...');
  const edited = await aiService.editUXWithPrompt(
    context,
    generated,
    'Add interactive schedule calendar to the first screen and reduce padding for a minimal layout',
    generated.screens[0].id
  );
  console.log('Edited first screen layout:', edited.screens[0].layout);
  console.log('Edited first screen components count:', edited.screens[0].components.length);
  const hasCalendar = edited.screens[0].components.some(c => c.type === 'calendar_view');
  console.log('Has calendar component added:', hasCalendar);
  if (!hasCalendar) {
    throw new Error('editUXWithPrompt did not add calendar component');
  }

  console.log('ALL BACKEND UX TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

run().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
