import type { FastifyInstance } from 'fastify';

export async function abilityGenerateRoutes(server: FastifyInstance) {
  // POST /api/abilities/generate — generate AbilityDocument from natural language
  server.post<{
    Body: { description: string };
  }>(
    '/api/abilities/generate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['description'],
          properties: {
            description: { type: 'string', maxLength: 5000 },
          },
        },
      },
    },
    async (_request, reply) => {
      // TODO: Wire to LLM provider system in a future iteration.
      // For now, return a template document based on the description.
      const { description } = _request.body;

      const slugId = description
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);

      const doc = {
        frontmatter: {
          id: slugId,
          name: description.slice(0, 60),
          version: '1.0.0',
          description,
          tags: [],
          author: '',
          enabled: true,
        },
        trigger: `- Explicitly invoked via [${slugId}]`,
        interface: { input: [], output: [] },
        config: {
          runtime: { executor: 'skill' as const },
        },
        instructions: `You are an AI assistant. ${description}`,
        examples: '',
        dependencies: [],
      };

      reply.code(200);
      return doc;
    },
  );
}
