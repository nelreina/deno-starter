import { Kafka } from "npm:kafkajs";
import "jsr:@std/dotenv/load";

// Load the environment variables from the .env file
const SERVICE = Deno.env.get("SERVICE");
const BROKER = Deno.env.get("BROKER");

class KafkaConfig {
  constructor() {
    this.kafka = new Kafka({
      clientId: SERVICE,
      brokers: [BROKER],
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: SERVICE });
  }

  async connect() {
    console.info("Connecting to Kafka broker..." + BROKER);
    await this.consumer.connect();
    await this.producer.connect();
  }

  async disconnect() {
    await this.consumer.disconnect();
    await this.producer.disconnect();
  }

  async consume(topic, callback) {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: topic, fromBeginning: true });
      await this.consumer.run({
        eachMessage: async ({ message }) => {
          await callback(message);
        },
      });
    } catch (error) {
      console.error(error);
    }
  }

  async produce(topic, message) {
    // Check message contains headers
    if (!message.headers) {
      throw new Error("Message must contain headers");
    }
    // Add service name to message headers
    message.headers.service = SERVICE;
    // 
    try {
      await this.producer.connect();
      await this.producer.send({
        topic: topic,
        messages: [message],
      });
      console.log("Produced message to Kafka topic " + topic);
    } catch (error) {
      console.error(error);
    } finally {
      await this.producer.disconnect();
    }
  }


}

export default KafkaConfig;

