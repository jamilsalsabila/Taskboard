import amqp from 'amqplib';
import { env } from '../config/env.js';

export class RabbitMqPublisher {
  #connection = null;
  #channel = null;

  async connect() {
    this.#connection = await amqp.connect(env.rabbitmqUrl);
    this.#channel = await this.#connection.createChannel();
    await this.#channel.assertExchange(env.rabbitmqExchange, 'topic', { durable: true });
  }

  async publish(routingKey, payload) {
    if (!this.#channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    const message = Buffer.from(JSON.stringify(payload));
    this.#channel.publish(env.rabbitmqExchange, routingKey, message, {
      contentType: 'application/json',
      persistent: true
    });
  }

  async close() {
    if (this.#channel) {
      await this.#channel.close();
    }
    if (this.#connection) {
      await this.#connection.close();
    }
  }
}
