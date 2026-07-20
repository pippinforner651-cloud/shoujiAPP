import type { FastifyPluginCallback, FastifyReply } from 'fastify';

export interface EventReadServiceContract {
  getProgress(eventId: string): Promise<unknown>;
  getRanking(eventId: string): Promise<unknown>;
  createContribution(input: { eventId: string; activityId: string }): Promise<unknown>;
}

function sendServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof Error) {
    const code = error.message.split(':')[0];
    if (code === 'EVENT_NOT_FOUND' || code === 'ACTIVITY_NOT_FOUND') {
      return reply.status(404).send({ error: code });
    }
    if (code === 'MEMBER_NOT_APPROVED') return reply.status(403).send({ error: code });
    if (code === 'EVENT_NOT_ACTIVE' || code === 'CONTRIBUTION_OWNERSHIP_MISMATCH') {
      return reply.status(409).send({ error: code });
    }
    if (code === 'ACTIVITY_NOT_ELIGIBLE' || code === 'ACTIVITY_OUTSIDE_EVENT') {
      return reply.status(422).send({ error: code });
    }
  }
  throw error;
}

export function createEventRoutesV2(service: EventReadServiceContract): FastifyPluginCallback {
  return (app, _options, done) => {
    app.get<{ Params: { eventId: string } }>('/:eventId/progress', async (request, reply) => {
      try {
        return reply.send(await service.getProgress(request.params.eventId));
      } catch (error) {
        return sendServiceError(error, reply);
      }
    });

    app.get<{ Params: { eventId: string } }>('/:eventId/ranking', async (request, reply) => {
      try {
        return reply.send(await service.getRanking(request.params.eventId));
      } catch (error) {
        return sendServiceError(error, reply);
      }
    });

    app.post<{
      Params: { eventId: string };
      Body: { activity_id?: string; user_id?: unknown; userId?: unknown };
    }>('/:eventId/contributions', async (request, reply) => {
      if (request.body?.user_id !== undefined || request.body?.userId !== undefined) {
        return reply.status(400).send({ error: 'CLIENT_USER_ID_FORBIDDEN' });
      }
      if (typeof request.body?.activity_id !== 'string' || request.body.activity_id.trim().length === 0) {
        return reply.status(400).send({ error: 'ACTIVITY_ID_REQUIRED' });
      }
      try {
        return reply.status(201).send(await service.createContribution({
          eventId: request.params.eventId,
          activityId: request.body.activity_id,
        }));
      } catch (error) {
        return sendServiceError(error, reply);
      }
    });

    done();
  };
}
