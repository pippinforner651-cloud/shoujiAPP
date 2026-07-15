import type { FastifyPluginCallback, FastifyReply } from 'fastify';

export interface EventReadServiceContract {
  getProgress(eventId: string): Promise<unknown>;
  getRanking(eventId: string): Promise<unknown>;
}

function sendReadError(error: unknown, reply: FastifyReply) {
  if (error instanceof Error && error.message === 'EVENT_NOT_FOUND') {
    return reply.status(404).send({ error: 'EVENT_NOT_FOUND' });
  }
  throw error;
}

export function createEventRoutesV2(service: EventReadServiceContract): FastifyPluginCallback {
  return (app, _options, done) => {
    app.get<{ Params: { eventId: string } }>('/:eventId/progress', async (request, reply) => {
      try {
        return reply.send(await service.getProgress(request.params.eventId));
      } catch (error) {
        return sendReadError(error, reply);
      }
    });

    app.get<{ Params: { eventId: string } }>('/:eventId/ranking', async (request, reply) => {
      try {
        return reply.send(await service.getRanking(request.params.eventId));
      } catch (error) {
        return sendReadError(error, reply);
      }
    });

    done();
  };
}
