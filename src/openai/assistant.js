import { openai } from '../config/openAI.js';
import {
  getConsulta,
  getUser,
  addRoutineForUser,
  updateUserPersonalData,
  getLocalTimeForUser,
  getUserRoutines,
  updateUserRoutine,
} from './functions.js';

// Crear hilo en caso de necesitarse ✅
export async function createThread() {
  try {
    const thread = await openai.beta.threads.create();
    return thread.id;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

// Eliminar un hilo
export async function deleteThread(threadId) {
  try {
    await openai.beta.threads.del(threadId);
    console.log('Hilo eliminado');
    return true;
  } catch (error) {
    if (
      error.status === 404 ||
      error.message.includes('No thread found with id')
    ) {
      console.warn(
        `El hilo con ID ${threadId} no existe o ya ha sido eliminado.`,
      );
      return false;
    }
    console.error('Error deleting thread:', error);
    throw error;
  }
}

// Obtener al asistente ✅
export async function getAssistant(assistantId) {
  console.log(assistantId);
  try {
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    return assistant;
  } catch (error) {
    console.error('Error getting assistant:', error);
    throw error;
  }
}

// Agregar mensaje al hilo ✅
async function addMessageToThread(threadId, message) {
  try {
    const messageResponse = await openai.beta.threads.messages.create(
      threadId,
      {
        role: 'user',
        content: message,
      },
    );
    return messageResponse;
  } catch (error) {
    if (
      error.status === 400 &&
      error.message.includes("Can't add messages to thread") &&
      error.message.includes('while a run is active')
    ) {
      console.warn('Active run detected. Waiting for it to complete...');
      // Esperar y reintentar
      await new Promise(resolve => setTimeout(resolve, 5000));
      return await addMessageToThread(threadId, message);
    }
    console.error('Error adding message to thread:', error);
    throw error;
  }
}

export async function runId(threadId, assistantId) {
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  });
  return run.id;
}

export async function runAssistant(
  threadId,
  messageUser,
  phoneID,
  assistantId,
) {
  const assistant_Id = assistantId || process.env.ASSISTANT_ID;
  const combinedMessage = `${messageUser}`;

  return new Promise(async (resolve, reject) => {
    try {
      if (!threadId) {
        console.log('threadId es nulo o indefinido, creando nuevo hilo...');
        threadId = await createThread();
      }

      try {
        await addMessageToThread(threadId, combinedMessage);
      } catch (error) {
        reject(error);
        return;
      }

      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistant_Id,
      });

      try {
        while (true) {
          const runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id,
          );

          if (runStatus.status === 'completed') {
            const messages = await openai.beta.threads.messages.list(threadId);
            const messageAssistant = messages.data[0].content[0].text.value;
            resolve(messageAssistant);
            break;
          } else if (runStatus.status === 'requires_action') {
            const requiredActions =
              runStatus.required_action.submit_tool_outputs.tool_calls;

            let toolsOutput = [];

            for (const action of requiredActions) {
              const funcName = action.function.name;
              const functionArguments = JSON.parse(action.function.arguments);

              try {
                let output;
                if (funcName === 'get_consulta') {
                  output = await getConsulta(phoneID);
                } else if (funcName === 'get_user') {
                  output = await getUser(phoneID);
                } else if (funcName === 'add_routine_for_user') {
                  const routine = functionArguments.routine;
                  output = await addRoutineForUser(phoneID, routine);
                } else if (funcName === 'get_datetime') {
                  output = await getLocalTimeForUser(phoneID);
                } else if (funcName === 'update_user_data') {
                  const userData = functionArguments;
                  output = await updateUserPersonalData(phoneID, userData);
                } else if (funcName === 'update_user_routine') {
                  const { routineName, updatedRoutine } = functionArguments;
                  output = await updateUserRoutine(
                    phoneID,
                    routineName,
                    updatedRoutine,
                  );
                } else if (funcName === 'get_user_routines') {
                  output = await getUserRoutines(phoneID);
                } else {
                  console.log('Function not found');
                  continue;
                }
                toolsOutput.push({
                  tool_call_id: action.id,
                  output: JSON.stringify(output),
                });
              } catch (funcError) {
                console.error(`Error in function ${funcName}:`, funcError);
                toolsOutput.push({
                  tool_call_id: action.id,
                  output: JSON.stringify({ error: funcError.message }),
                });
              }
            }

            // Submit the tool outputs to Assistant API
            await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
              tool_outputs: toolsOutput,
            });
          } else if (runStatus.status === 'expired') {
            console.error('Run has expired.');
            reject(new Error('Run has expired.'));
            break;
          } else {
            console.log('Run is not completed yet.');
          }

          console.log('waiting...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error during run status check:', error);
        reject(error);
      }
    } catch (error) {
      console.error('Error running assistant:', error);
      reject(error);
    }
  });
}
