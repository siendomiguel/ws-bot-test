import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import { db } from './database/firebase.js';
import { typing } from './utils/presence.js';
import { createThread, runAssistant } from './openai/assistant.js';
import { getUsers, createUser, updateUser } from './database/getData.js';
//import './utils/notifications.js';

const PORT = process.env.PORT ?? 3008;
const ASSISTANT_ID = process.env?.ASSISTANT_ID ?? '';

const welcomeFlow = addKeyword(EVENTS.WELCOME).addAction(async (ctx, { flowDynamic, state, provider }) => {
  try {
    await typing(ctx, provider);
    const user = await getUsers(ctx.from);
    console.log('hasData: ', user.hasData);
    let response;

    if (user.hasData === false) {
      console.log('nuevo usuario detectado');
      const threadId = await createThread();
      await createUser(ctx.from, ctx.name, threadId);
      response = await runAssistant(threadId, ctx.body, ctx.from, ASSISTANT_ID);
    } else {
      if (!user.data[0].thread_id) {
        console.log('usuario sin thread_id');
        const threadId = await createThread();
        await updateUser(ctx.from, threadId);
      }
      console.log('usuario con datos completos');
      const getUser = await getUsers(ctx.from);
      const threadID = getUser.data[0].thread_id;
      response = await runAssistant(threadID, ctx.body, ctx.from, ASSISTANT_ID);
    }

    // Divide la respuesta en chunks y envíalos usando flowDynamic
    const chunks = response.split(/\n\n+/);
    for (const chunk of chunks) {
      await flowDynamic([{ body: chunk.trim() }]);
    }
  } catch (error) {
    console.error('Error in welcomeFlow:', error);
    // Manejar el error adecuadamente, puedes enviar un mensaje de error al usuario si es necesario
    await flowDynamic([
      {
        body: 'Hubo un error procesando tu solicitud. Por favor, intenta nuevamente más tarde.',
      },
    ]);
  }
});

// Necesitarás crear un adaptador personalizado para Firestore si el bot espera un formato específico para la base de datos.
class FirestoreAdapter {
  constructor(db) {
    this.db = db;
    this.collection = 'history';
  }

  async getPrevByNumber(from) {
    const querySnapshot = await this.db
      .collection(this.collection)
      .orderBy('number')
      .endBefore(from)
      .limitToLast(1)
      .get();

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    } else {
      return null;
    }
  }

  async save(ctx) {
    const filteredCtx = this.filterUndefinedValues(ctx);
    await this.db.collection(this.collection).add(filteredCtx);
  }

  filterUndefinedValues(obj) {
    if (Array.isArray(obj)) {
      return obj
        .map(value => (value && typeof value === 'object' ? this.filterUndefinedValues(value) : value))
        .filter(value => value !== undefined);
    } else if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .map(([key, value]) => [key, value && typeof value === 'object' ? this.filterUndefinedValues(value) : value])
          .filter(([, value]) => value !== undefined),
      );
    }
    return obj;
  }

  async createTable() {
    await this.db.collection(this.collection).add({
      ref: '',
      keyword: '',
      answer: '',
      refSerialize: '',
      from: '',
      options: null,
    });
  }

  async checkTableExists() {
    const querySnapshot = await this.db.collection(this.collection).limit(1).get();
    if (querySnapshot.empty) {
      await this.createTable();
    }
    return true;
  }
}

const main = async () => {
  const adapterFlow = createFlow([welcomeFlow]);
  const adapterProvider = createProvider(Provider);
  const adapterDB = new FirestoreAdapter(db);

  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  adapterProvider.server.post(
    '/v1/messages',
    handleCtx(async (bot, req, res) => {
      const { number, message, urlMedia } = req.body;
      await bot.sendMessage(number, message, { media: urlMedia ?? null });
      return res.end('sended');
    }),
  );

  adapterProvider.server.post(
    '/v1/register',
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch('REGISTER_FLOW', { from: number, name });
      return res.end('trigger');
    }),
  );

  adapterProvider.server.post(
    '/v1/samples',
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch('SAMPLES', { from: number, name });
      return res.end('trigger');
    }),
  );

  adapterProvider.server.post(
    '/v1/blacklist',
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body;
      if (intent === 'remove') bot.blacklist.remove(number);
      if (intent === 'add') bot.blacklist.add(number);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', number, intent }));
    }),
  );

  httpServer(+PORT);
};

main();
