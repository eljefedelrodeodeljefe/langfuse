import { Request, Response } from 'express'
import logger from "../../../logger";
import { WebhooksQueueManager } from '../../../webhooks'

export default function (req: Request, res: Response) {
  const { body } = req;

  logger.debug(body, 'bridge has received event');

  WebhooksQueueManager.instance.addEvent(body)

  res.json({
    status: "success",
  });
}