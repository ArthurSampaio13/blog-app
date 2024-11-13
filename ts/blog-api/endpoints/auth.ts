import type { Response } from 'express';

import express from 'express';

import type { ApiRequest  } from '../utils.js';
import { buildHandler } from '../utils.js';

const router = express.Router();

async function handleCreateAccount(
    req: ApiRequest,
    res: Response
) : Promise<void> {
    const { account, user, avatar } = req.body;

    avatar.name = avatar.avatar_name;
    avatar.system_prompt = avatar.avatar_description;

    const blogResponse = await req.ctx?.blog.create(user, account, avatar);

    if (!blogResponse) {
        throw new Error('Erro ao buscar resposta!');
    }

    res.status(200).json({
        accountId: blogResponse.account.id,
        userId: blogResponse.user.id,
        avatarId: blogResponse.avatar.id,
        ok: true
    });
}

router.post('/create-account', buildHandler(handleCreateAccount));