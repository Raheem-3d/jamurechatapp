// lib/kafka.ts
let kafkaProducer: any = null;
let kafkaConnected = false;
let isInitializing = false;
let fallbackLogged = false;

const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "jamurechat-app";
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");

function safeRequire(moduleName: string) {
  try {
    const req = eval("require");
    return req(moduleName);
  } catch (e) {
    return null;
  }
}

export async function initKafkaProducer() {
  if (kafkaProducer) return { producer: kafkaProducer, isConnected: kafkaConnected };
  if (isInitializing || fallbackLogged) return { producer: null, isConnected: false };

  isInitializing = true;
  try {
    const kafkaModule = safeRequire("kafkajs");
    if (!kafkaModule) {
      if (!fallbackLogged) {
        console.log("> [Kafka] kafkajs module not installed. Operating in fallback mode.");
        fallbackLogged = true;
      }
      return { producer: null, isConnected: false };
    }

    const { Kafka, logLevel } = kafkaModule;
    const kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: KAFKA_BROKERS,
      logLevel: logLevel.NOTHING,
      connectionTimeout: 3000,
      retry: {
        retries: 2,
      },
    });

    kafkaProducer = kafka.producer();
    await kafkaProducer.connect();
    kafkaConnected = true;
    console.log(`> [Kafka] Connected successfully to brokers: ${KAFKA_BROKERS.join(", ")}`);
  } catch (error: any) {
    kafkaConnected = false;
    kafkaProducer = null;
    if (!fallbackLogged) {
      console.log("> [Kafka] Kafka broker unavailable. Operating in in-memory fallback mode.");
      fallbackLogged = true;
    }
  } finally {
    isInitializing = false;
  }

  return { producer: kafkaProducer, isConnected: kafkaConnected };
}

export async function produceKafkaEvent(topic: string, data: any): Promise<boolean> {
  try {
    if (!kafkaProducer && !isInitializing && !fallbackLogged) {
      await initKafkaProducer();
    }

    if (kafkaProducer && kafkaConnected) {
      await kafkaProducer.send({
        topic,
        messages: [
          {
            key: data.id || data.userId || String(Date.now()),
            value: JSON.stringify(data),
            timestamp: String(Date.now()),
          },
        ],
      });
      return true;
    }
  } catch (error: any) {
    kafkaConnected = false;
    console.warn(`> [Kafka] Error producing event to ${topic}: ${error.message}`);
  }
  return false;
}

export function isKafkaConnected(): boolean {
  return kafkaConnected;
}
