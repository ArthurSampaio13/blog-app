import fs from 'node:fs';
import markdown from '@wcj/markdown-to-html';

import Context from '../core/context.js';
import logger from '../core/logger.js';
import GroqClient from '../core/external-clients/groq.js';

const context = new Context();
const mode = process.argv[2];

async function transcribeAudio(avatarInputId: string) : Promise<void> {
    const avatarInput = await context.avatar.getInputById(avatarInputId);
    if (!avatarInput.avatar) { throw new Error('Algo deu errado..'); }

    try {
        const account = await context.account
            .getById(avatarInput.avatar.account_id);

        const groq = new GroqClient(account.ai_api_key);

        logger.info([
            `Transcribing: ${avatarInput.id} = ${avatarInput.filepath}`
        ].join('\n'));

        const audioTranscription = await groq.transcribeAudio(
            avatarInput.filepath
        );

        await fs.promises.unlink(avatarInput.filepath);
        await context.avatar.updateAvatarInputTranscriptionAndStatus(
            avatarInput.id,
            audioTranscription
        );

        logger.info(`Transcription: ${avatarInput.id} done!`);
        context.redis.publishNoWait(
            'avatar-input:transcribed',
            avatarInputId
        );
    } catch (ex) {
        if (ex instanceof Error) {
            await context.avatar.updateAvatarInputErrorMessage(
                avatarInputId,
                ex.message
            );

            logger.error(ex);
            return;
        }

        console.error(ex);
    }
}

async function createPost (avatarInputId: string) : Promise<void> {
    const avatarInput = await context.avatar.getInputById(avatarInputId);
    if (!avatarInput.avatar) { throw new Error('Algo deu errado..'); }

    try {
        const account = await context.account
            .getById(avatarInput.avatar.account_id);

        if (!avatarInput.avatar) {
            throw new Error(`Something went wrong!`);
        }

        const groq = new GroqClient(account.ai_api_key);
        logger.info(`Creating Post: ${avatarInput.id}`);

        const blogPostChoices = await groq.createCompletions([
            {
                role: 'system',
                content: `
                    Você é um escritor de blog habilidoso. 
                    Sua saída deve estar bem formatada em markdown, fazendo bom uso de espaços em branco e tipografia. 
                    Você está escrevendo uma postagem de blog e não deve mencionar o vídeo. 
                    Isso deve ser bem escrito no idioma-alvo, você é muito bom com as palavras para o seu público. 
                    Você deve escrever uma postagem detalhada no blog com base nos seus detalhes usando o texto de referência.
                `
            },

            {
                role: 'system',
                content: avatarInput.avatar.system_prompt
            },

            {
                role: 'user',
                content: `reference text:\n${avatarInput.transcription}`
            }
        ]);

        const firstChoice = blogPostChoices[0];
        if (!firstChoice || !firstChoice || !firstChoice.message) {
            throw new Error('Something went wrong!');
        }

        const postMarkdown = firstChoice.message.content as string;
        const blogTitleChoices = await groq.createCompletions([
            {
                role: 'system',
                content: `
                    Você é um escritor de blog habilidoso. 
                    Sua saída deve ser um título bem escrito, ele deve ter menos de 250 caracteres, e você NÃO deve descrever o porquê, deve apenas fornecer o título. 
                    Isso deve ser bem escrito no idioma-alvo, você é muito bom com as palavras para o seu público. 
                    Use o texto de referência para criar seu título.
                    Sua saída deve ser apenas um parágrafo.
                `
            },

            {
                role: 'system',
                content: avatarInput.avatar.system_prompt
            },

            {
                role: 'user',
                content: `reference text:\n${postMarkdown}`
            }
        ]);

        const blogSummarizeChoices = await groq.createCompletions([
            {
                role: 'system',
                content: `
                    Você é um escritor de blog habilidoso. 
                    Sua saída deve ser uma descrição curta bem escrita, ela deve ter menos de 500 caracteres, e você NÃO deve descrever o porquê, deve apenas fornecer a descrição curta. 
                    Isso deve ser bem escrito no idioma-alvo, você é muito bom com as palavras para o seu público. 
                    Use o texto de referência para resumir seu texto curto. 
                    Sua saída deve ser apenas um parágrafo.
                `
            },

            {
                role: 'system',
                content: avatarInput.avatar.system_prompt
            },

            {
                role: 'user',
                content: `reference text:\n${postMarkdown}`
            }
        ]);

        const firstChoiceBlogTitle = blogTitleChoices[0];
        const firstChoiceBlogSummarize = blogSummarizeChoices[0];

        let finalTitle = '';
        let finalShortDescription = '';

        if (firstChoiceBlogTitle) {
            finalTitle = firstChoiceBlogTitle.message.content as string;
        }

        if (firstChoiceBlogSummarize) {
            finalShortDescription = firstChoiceBlogSummarize.message.content as string;
        }

        await context.avatar.updateAvatarInputFullTextAndStatus(
            avatarInput.id,
            finalTitle,
            finalShortDescription,
            markdown(postMarkdown) as string
        );

        logger.info(`Create Post Done: ${avatarInput.id} done!`);
        context.redis.publishNoWait('avatar-input:done', avatarInputId);
    } catch (ex) {
        if (ex instanceof Error) {
            await context.avatar.updateAvatarInputErrorMessage(
                avatarInputId,
                ex.message
            );

            logger.error(ex);
            return;
        }

        console.error(ex);
    }
}

if (mode === '--transcribe') {
    context.redis.subscribe('avatar-input:downloaded', async (msg: string) => {
        try {
            await transcribeAudio(msg);
        } catch (ex) {
            if (ex instanceof Error) {
                logger.error(ex);
                return;
            }

            console.error(ex);
        }
    });
}

if (mode === '--create-post') {
    context.redis.subscribe('avatar-input:transcribed', async (msg: string) => {
        try {
            await createPost(msg);
        } catch (ex) {
            if (ex instanceof Error) {
                logger.error(ex);
                return;
            }

            console.error(ex);
        }
    });
}

logger.info(`Blog AI is ON! Mode: ${mode}`);
